import { Data, Schema as S } from "effect";

// === Request Validation Errors ===
export class MissingOrganizationError extends Data.TaggedError(
  "MissingOrganizationError"
)<{ message?: string }> {
  constructor(options: { message?: string } = {}) {
    super({
      message: options.message ?? "Organization parameter is required",
    });
  }
}

export class MissingShopParameterError extends Data.TaggedError(
  "MissingShopParameterError"
)<{ message?: string }> {
  constructor(options: { message?: string } = {}) {
    super({
      message: options.message ?? "Shop parameter is required",
    });
  }
}

export class EffectExecutionError extends Data.TaggedError(
  "EffectExecutionError"
)<{
  message?: string;
  cause?: unknown;
}> {
  constructor(options: { message?: string; cause?: unknown } = {}) {
    super({
      message: options.message ?? "Failed to execute Effect program",
      cause: options.cause,
    });
  }
}

export class InvalidStateParameterError extends Data.TaggedError(
  "InvalidStateParameterError"
)<{ message?: string; state?: string }> {
  constructor(options: { message?: string; state?: string } = {}) {
    super({
      message: options.message ?? "Invalid OAuth state parameter",
      state: options.state,
    });
  }
}

// === Validation Types ===
export type ShopifyValidationError =
  | MissingOrganizationError
  | MissingShopParameterError
  | EffectExecutionError
  | InvalidStateParameterError;

// === Validation Input Schemas ===
export const UrlValidationInputSchema = S.Struct({
  url: S.String,
});

export const StateExtractionInputSchema = S.Struct({
  state: S.String,
});

export type UrlValidationInput = S.Schema.Type<typeof UrlValidationInputSchema>;
export type StateExtractionInput = S.Schema.Type<
  typeof StateExtractionInputSchema
>;
