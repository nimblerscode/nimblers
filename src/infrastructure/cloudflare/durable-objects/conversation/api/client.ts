import { FetchHttpClient, HttpApiClient } from "@effect/platform";
import { Effect, Layer, Match } from "effect";
import { conversationApi } from "./handlers";

/**
 * Conversation DO Client using HttpApiClient.make()
 *
 * This follows the TypeOnce.dev pattern: export your API definition,
 * then use HttpApiClient.make() to automatically generate a type-safe client.
 *
 * All methods, parameters, responses, and errors are auto-generated
 * from the conversationApi definition in handlers.ts!
 */

/**
 * Creates a Conversation DO client using HttpApiClient.make()
 *
 * This is the core TypeOnce.dev pattern - the client is automatically generated
 * from the shared API definition with perfect type safety.
 *
 * Usage:
 * ```typescript
 * const doId = conversationDONamespace.idFromName(conversationId);
 * const stub = conversationDONamespace.get(doId);
 * const client = yield* createConversationDOClient(stub, conversationId);
 *
 * // Auto-generated methods with perfect type safety!
 * const conversation = yield* client.conversations.getConversation();
 *
 * const messages = yield* client.conversations.getMessages({
 *   urlParams: { limit: 20, cursor: "abc123" }
 * });
 *
 * const sentMessage = yield* client.conversations.sendMessage({
 *   payload: {
 *     content: "Hello, world!",
 *     messageType: "text"
 *   }
 * });
 *
 * const updatedConversation = yield* client.conversations.updateConversationStatus({
 *   payload: { status: "resolved" }
 * });
 *
 * const summary = yield* client.conversations.getConversationSummary();
 *
 * const webhookResult = yield* client.conversations.receiveMessage({
 *   payload: {
 *     MessageSid: "SM123",
 *     From: "+1234567890",
 *     To: "+0987654321",
 *     Body: "Customer message"
 *   }
 * });
 * ```
 */
export const createConversationDOClient = (
  stub: DurableObjectStub,
  conversationId?: string,
  shopifyStoreDomain?: string
) =>
  Effect.gen(function* () {
    // Custom fetcher that routes requests to the Durable Object
    const doFetcher = (input: RequestInfo | URL, init?: RequestInit) => {
      // Handle both URL and Request objects using Effect's pattern matching
      // Benefits: Type safety, exhaustiveness checking, functional style
      const url = Match.value(input).pipe(
        Match.when(Match.string, (str) => str),
        Match.when(
          (input): input is URL => input instanceof URL,
          (url) => url.toString()
        ),
        Match.when(
          (input): input is Request => input instanceof Request,
          (request) => request.url
        ),
        Match.exhaustive // Ensures all cases are handled at compile time
      );

      // Rewrite the URL to use the internal DO protocol
      const parsedUrl = new URL(url);
      const internalUrl = `http://internal${parsedUrl.pathname}${parsedUrl.search}`;

      // Add headers if provided (follows OrganizationDO pattern)
      const headers = new Headers(init?.headers);
      if (conversationId) {
        headers.set("X-Conversation-ID", conversationId);
      }
      if (shopifyStoreDomain) {
        headers.set("X-Shopify-Store-Domain", shopifyStoreDomain);
      }

      return stub.fetch(internalUrl, {
        ...init,
        headers,
      });
    };

    // Create the HTTP client using the shared API definition
    // This is the magic - HttpApiClient.make() auto-generates all methods!
    return yield* HttpApiClient.make(conversationApi, {
      baseUrl: "http://internal",
    }).pipe(
      // Provide our custom DO fetcher
      Effect.provide(Layer.succeed(FetchHttpClient.Fetch, doFetcher))
    );
  });

/**
 * Benefits of this approach (TypeOnce.dev pattern):
 *
 * ✅ **Zero Manual Client Code**: All methods auto-generated from API definition
 * ✅ **Perfect Type Safety**: Parameters, responses, and errors all typed automatically
 * ✅ **Full IDE Support**: Auto-complete for all endpoints and their parameters
 * ✅ **Single Source of Truth**: API definition shared between client and server
 * ✅ **Effect Platform Integration**: Uses standard Effect patterns (Match, Layer, etc.)
 * ✅ **Automatic Validation**: Request/response validation handled automatically
 * ✅ **Functional Programming**: Uses Effect's Match for type-safe pattern matching
 *
 * ❌ No more manual method definitions
 * ❌ No more type assertions
 * ❌ No more schema validation code
 * ❌ No more error mapping
 * ❌ No more client/server type mismatches
 * ❌ No more imperative if/else chains
 *
 * Everything is derived from the HttpApi definition in handlers.ts! 🎯
 *
 * When you change the API definition, the client automatically updates.
 * When you add new endpoints, they automatically appear in the client.
 * When you modify schemas, the types automatically update everywhere.
 *
 * Available methods (auto-generated):
 * - client.conversations.getConversation()
 * - client.conversations.getMessages({ urlParams })
 * - client.conversations.sendMessage({ payload })
 * - client.conversations.updateConversationStatus({ payload })
 * - client.conversations.getConversationSummary()
 * - client.conversations.receiveMessage({ payload })
 */
