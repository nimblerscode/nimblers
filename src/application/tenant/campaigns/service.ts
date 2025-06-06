import { Effect, Layer, Option } from "effect";
import {
  CampaignUseCase,
  CampaignUseCaseError,
  CampaignRepo,
  CampaignRepositoryError,
} from "@/domain/tenant/campaigns/service";
import { CampaignConversationUseCase } from "@/domain/tenant/campaigns/conversation-service";
import { CampaignSegmentUseCase } from "@/domain/tenant/campaigns/segment-service";
import { SegmentCustomerUseCase } from "@/domain/tenant/segment-customers/service";
import { CustomerUseCase } from "@/domain/tenant/customers/service";
import type {
  CampaignId,
  CreateCampaignInput,
  UpdateCampaignInput,
  ExecuteCampaignInput,
  CampaignAnalytics,
} from "@/domain/tenant/campaigns/models";

export const CampaignUseCaseLive = () =>
  Layer.effect(
    CampaignUseCase,
    Effect.gen(function* () {
      const campaignRepo = yield* CampaignRepo;
      const campaignConversationUseCase = yield* CampaignConversationUseCase;
      const campaignSegmentUseCase = yield* CampaignSegmentUseCase;
      const segmentCustomerUseCase = yield* SegmentCustomerUseCase;
      const customerUseCase = yield* CustomerUseCase;

      // Helper function to map repository errors to use case errors
      const mapRepositoryError = (
        error: CampaignRepositoryError,
        operation: string,
        campaignId?: CampaignId
      ) =>
        new CampaignUseCaseError({
          message: error.message,
          campaignId,
          operation,
          cause: error,
        });

      return {
        getCampaign: (campaignId: CampaignId) =>
          Effect.gen(function* () {
            const campaignOption = yield* campaignRepo.get(campaignId);

            return yield* Option.match(campaignOption, {
              onNone: () =>
                Effect.fail(
                  new CampaignUseCaseError({
                    message: "Campaign not found",
                    campaignId,
                    operation: "getCampaign",
                  })
                ),
              onSome: (campaign) => Effect.succeed(campaign),
            });
          }).pipe(
            Effect.withSpan("CampaignUseCase.getCampaign"),
            Effect.mapError((error) =>
              error instanceof CampaignRepositoryError
                ? mapRepositoryError(error, "getCampaign", campaignId)
                : error
            )
          ),

        createCampaign: (data: CreateCampaignInput) =>
          Effect.gen(function* () {
            // Business rule: Validate segment IDs exist
            if (data.segmentIds.length === 0) {
              return yield* Effect.fail(
                new CampaignUseCaseError({
                  message: "At least one segment is required",
                  operation: "createCampaign",
                })
              );
            }

            // Business rule: Validate timezone format
            yield* Effect.try({
              try: () =>
                new Date().toLocaleString("en-US", { timeZone: data.timezone }),
              catch: () =>
                new CampaignUseCaseError({
                  message: "Invalid timezone provided",
                  operation: "createCampaign",
                }),
            });

            // Business rule: If scheduled, must be in the future
            if (data.scheduledAt && data.scheduledAt <= new Date()) {
              return yield* Effect.fail(
                new CampaignUseCaseError({
                  message: "Scheduled date must be in the future",
                  operation: "createCampaign",
                })
              );
            }

            // Create the campaign first
            const campaign = yield* campaignRepo.create(data);

            // Create campaign-segment relationships
            yield* campaignSegmentUseCase
              .createCampaignSegments(
                campaign.id,
                [...data.segmentIds] // Convert readonly array to mutable array
              )
              .pipe(
                Effect.mapError(
                  (segmentError) =>
                    new CampaignUseCaseError({
                      message: segmentError.message,
                      campaignId: campaign.id,
                      operation: "createCampaign",
                      cause: segmentError,
                    })
                )
              );

            // Get all customers from the selected segments and create conversations
            // Wrap this in a separate effect that catches all errors to avoid changing the interface
            const createConversationsEffect = Effect.gen(function* () {
              // Get all segment customers in parallel
              const segmentCustomerLists = yield* Effect.all(
                data.segmentIds.map((segmentId) =>
                  segmentCustomerUseCase.listSegmentCustomers({
                    segmentId,
                    limit: 1000, // TODO: Handle pagination for large segments
                  })
                ),
                { concurrency: 5 }
              );

              // Flatten the results and get unique customer IDs
              const allSegmentCustomers = segmentCustomerLists.flat();
              const uniqueCustomerIds = [
                ...new Set(allSegmentCustomers.map((sc) => sc.customerId)),
              ];

              if (uniqueCustomerIds.length > 0) {
                // Get customer details to get phone numbers
                const customers = yield* Effect.all(
                  uniqueCustomerIds.map((customerId) =>
                    customerUseCase.getCustomer(customerId as any).pipe(
                      Effect.catchAll(() => Effect.succeed(null)) // Skip customers that don't exist
                    )
                  ),
                  { concurrency: 10 }
                );

                // Filter out null customers and those without phone numbers
                const validCustomers = customers.filter(
                  (customer) => customer && customer.phone
                );
                const customerPhones = validCustomers.map(
                  (customer) => customer!.phone!
                );

                if (customerPhones.length > 0) {
                  // Create conversations for all customers
                  yield* campaignConversationUseCase.createConversationsForCustomers(
                    campaign.id,
                    customerPhones
                  );
                }
              }
            }).pipe(
              Effect.catchAll((conversationError) =>
                Effect.gen(function* () {
                  // Log the error but don't fail the campaign creation
                  yield* Effect.logWarning(
                    "Failed to create campaign conversations",
                    {
                      campaignId: campaign.id,
                      error: conversationError,
                    }
                  );
                })
              )
            );

            // Run the conversation creation effect without waiting for it to complete
            yield* Effect.fork(createConversationsEffect);

            return campaign;
          }).pipe(
            Effect.withSpan("CampaignUseCase.createCampaign"),
            Effect.mapError((error) =>
              error instanceof CampaignRepositoryError
                ? mapRepositoryError(error, "createCampaign")
                : error
            )
          ),

        updateCampaign: (campaignId: CampaignId, data: UpdateCampaignInput) =>
          Effect.gen(function* () {
            // First verify campaign exists
            const existingCampaignOption = yield* campaignRepo.get(campaignId);
            const existingCampaign = yield* Option.match(
              existingCampaignOption,
              {
                onNone: () =>
                  Effect.fail(
                    new CampaignUseCaseError({
                      message: "Campaign not found",
                      campaignId,
                      operation: "updateCampaign",
                    })
                  ),
                onSome: (campaign) => Effect.succeed(campaign),
              }
            );

            // Business rule: Cannot update completed campaigns
            if (existingCampaign.status === "completed") {
              return yield* Effect.fail(
                new CampaignUseCaseError({
                  message: "Cannot update completed campaigns",
                  campaignId,
                  operation: "updateCampaign",
                })
              );
            }

            // Business rule: If updating scheduled date, must be in the future
            if (data.scheduledAt && data.scheduledAt <= new Date()) {
              return yield* Effect.fail(
                new CampaignUseCaseError({
                  message: "Scheduled date must be in the future",
                  campaignId,
                  operation: "updateCampaign",
                })
              );
            }

            const updatedCampaign = yield* campaignRepo.update(
              campaignId,
              data
            );
            return updatedCampaign;
          }).pipe(
            Effect.withSpan("CampaignUseCase.updateCampaign"),
            Effect.mapError((error) =>
              error instanceof CampaignRepositoryError
                ? mapRepositoryError(error, "updateCampaign", campaignId)
                : error
            )
          ),

        deleteCampaign: (campaignId: CampaignId) =>
          Effect.gen(function* () {
            // First verify campaign exists
            const existingCampaignOption = yield* campaignRepo.get(campaignId);
            const existingCampaign = yield* Option.match(
              existingCampaignOption,
              {
                onNone: () =>
                  Effect.fail(
                    new CampaignUseCaseError({
                      message: "Campaign not found",
                      campaignId,
                      operation: "deleteCampaign",
                    })
                  ),
                onSome: (campaign) => Effect.succeed(campaign),
              }
            );

            // Business rule: Cannot delete active campaigns
            if (existingCampaign.status === "active") {
              return yield* Effect.fail(
                new CampaignUseCaseError({
                  message: "Cannot delete active campaigns. Pause first.",
                  campaignId,
                  operation: "deleteCampaign",
                })
              );
            }

            yield* campaignRepo.delete(campaignId);
          }).pipe(
            Effect.withSpan("CampaignUseCase.deleteCampaign"),
            Effect.mapError((error) =>
              error instanceof CampaignRepositoryError
                ? mapRepositoryError(error, "deleteCampaign", campaignId)
                : error
            )
          ),

        listCampaigns: (options) =>
          Effect.gen(function* () {
            const result = yield* campaignRepo.list(options);
            return result;
          }).pipe(
            Effect.withSpan("CampaignUseCase.listCampaigns"),
            Effect.mapError((error) =>
              error instanceof CampaignRepositoryError
                ? mapRepositoryError(error, "listCampaigns")
                : error
            )
          ),

        executeCampaign: (data: ExecuteCampaignInput) =>
          Effect.gen(function* () {
            const campaignOption = yield* campaignRepo.get(data.campaignId);
            const campaign = yield* Option.match(campaignOption, {
              onNone: () =>
                Effect.fail(
                  new CampaignUseCaseError({
                    message: "Campaign not found",
                    campaignId: data.campaignId,
                    operation: "executeCampaign",
                  })
                ),
              onSome: (campaign) => Effect.succeed(campaign),
            });

            // Business rule: Can only execute draft or scheduled campaigns
            if (!["draft", "scheduled"].includes(campaign.status)) {
              return yield* Effect.fail(
                new CampaignUseCaseError({
                  message: `Cannot execute campaign with status: ${campaign.status}`,
                  campaignId: data.campaignId,
                  operation: "executeCampaign",
                })
              );
            }

            // Update campaign status to active
            yield* campaignRepo.updateStatus(data.campaignId, "active");

            // TODO: Implement actual campaign execution logic
            // This would involve creating conversation DOs for each customer in segments
            const messagesSent = 0; // Placeholder

            return {
              success: true,
              messagesSent,
            };
          }).pipe(
            Effect.withSpan("CampaignUseCase.executeCampaign"),
            Effect.mapError((error) =>
              error instanceof CampaignRepositoryError
                ? mapRepositoryError(error, "executeCampaign", data.campaignId)
                : error
            )
          ),

        scheduleCampaign: (campaignId: CampaignId, scheduledAt: Date) =>
          Effect.gen(function* () {
            // Business rule: Scheduled date must be in the future
            if (scheduledAt <= new Date()) {
              return yield* Effect.fail(
                new CampaignUseCaseError({
                  message: "Scheduled date must be in the future",
                  campaignId,
                  operation: "scheduleCampaign",
                })
              );
            }

            const updatedCampaign = yield* campaignRepo.update(campaignId, {
              scheduledAt,
              status: "scheduled",
            });

            return updatedCampaign;
          }).pipe(
            Effect.withSpan("CampaignUseCase.scheduleCampaign"),
            Effect.mapError((error) =>
              error instanceof CampaignRepositoryError
                ? mapRepositoryError(error, "scheduleCampaign", campaignId)
                : error
            )
          ),

        pauseCampaign: (campaignId: CampaignId) =>
          Effect.gen(function* () {
            const campaignOption = yield* campaignRepo.get(campaignId);
            const campaign = yield* Option.match(campaignOption, {
              onNone: () =>
                Effect.fail(
                  new CampaignUseCaseError({
                    message: "Campaign not found",
                    campaignId,
                    operation: "pauseCampaign",
                  })
                ),
              onSome: (campaign) => Effect.succeed(campaign),
            });

            // Business rule: Can only pause active campaigns
            if (campaign.status !== "active") {
              return yield* Effect.fail(
                new CampaignUseCaseError({
                  message: `Cannot pause campaign with status: ${campaign.status}`,
                  campaignId,
                  operation: "pauseCampaign",
                })
              );
            }

            const updatedCampaign = yield* campaignRepo.updateStatus(
              campaignId,
              "paused"
            );
            return updatedCampaign;
          }).pipe(
            Effect.withSpan("CampaignUseCase.pauseCampaign"),
            Effect.mapError((error) =>
              error instanceof CampaignRepositoryError
                ? mapRepositoryError(error, "pauseCampaign", campaignId)
                : error
            )
          ),

        resumeCampaign: (campaignId: CampaignId) =>
          Effect.gen(function* () {
            const campaignOption = yield* campaignRepo.get(campaignId);
            const campaign = yield* Option.match(campaignOption, {
              onNone: () =>
                Effect.fail(
                  new CampaignUseCaseError({
                    message: "Campaign not found",
                    campaignId,
                    operation: "resumeCampaign",
                  })
                ),
              onSome: (campaign) => Effect.succeed(campaign),
            });

            // Business rule: Can only resume paused campaigns
            if (campaign.status !== "paused") {
              return yield* Effect.fail(
                new CampaignUseCaseError({
                  message: `Cannot resume campaign with status: ${campaign.status}`,
                  campaignId,
                  operation: "resumeCampaign",
                })
              );
            }

            const updatedCampaign = yield* campaignRepo.updateStatus(
              campaignId,
              "active"
            );
            return updatedCampaign;
          }).pipe(
            Effect.withSpan("CampaignUseCase.resumeCampaign"),
            Effect.mapError((error) =>
              error instanceof CampaignRepositoryError
                ? mapRepositoryError(error, "resumeCampaign", campaignId)
                : error
            )
          ),

        getCampaignAnalytics: (campaignId: CampaignId) =>
          Effect.gen(function* () {
            const campaignOption = yield* campaignRepo.get(campaignId);
            const campaign = yield* Option.match(campaignOption, {
              onNone: () =>
                Effect.fail(
                  new CampaignUseCaseError({
                    message: "Campaign not found",
                    campaignId,
                    operation: "getCampaignAnalytics",
                  })
                ),
              onSome: (campaign) => Effect.succeed(campaign),
            });

            // TODO: Calculate real analytics from conversation DOs
            const analytics: CampaignAnalytics = {
              campaignId,
              targetCustomerCount: 0, // Would calculate from segments
              conversationsCreated: 0, // Would query conversation DOs
              totalMessagesSent: 0, // Would aggregate from conversations
              lastCalculatedAt: new Date(),
            };

            return analytics;
          }).pipe(
            Effect.withSpan("CampaignUseCase.getCampaignAnalytics"),
            Effect.mapError((error) =>
              error instanceof CampaignRepositoryError
                ? mapRepositoryError(error, "getCampaignAnalytics", campaignId)
                : error
            )
          ),
      };
    })
  );
