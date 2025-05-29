import { and, eq, gt, lt, sql } from "drizzle-orm";
import type { DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";
import type {
  AccessToken,
  Scope,
  ShopDomain,
} from "@/domain/global/shopify/oauth/models";
import type { schema } from "./drizzle";
import { accessTokens, nonces } from "./schema";

export const makeShopifyOAuthDrizzleAdapter = (
  db: DrizzleSqliteDODatabase<typeof schema>,
) => ({
  // Nonce operations
  storeNonce: async (nonce: string, expiresAt: Date) => {
    const nonceData = {
      nonce,
      expiresAt,
      consumed: false,
    };

    const results = await db.insert(nonces).values(nonceData).returning();

    if (!results || results.length === 0) {
      throw new Error("Failed to store nonce");
    }

    return results[0];
  },

  verifyNonce: async (nonce: string) => {
    const now = new Date();
    const results = await db
      .select()
      .from(nonces)
      .where(
        and(
          eq(nonces.nonce, nonce),
          eq(nonces.consumed, false),
          gt(nonces.expiresAt, now),
        ),
      );

    return results.length > 0;
  },

  consumeNonce: async (nonce: string) => {
    const now = new Date();
    const results = await db
      .update(nonces)
      .set({
        consumed: true,
      })
      .where(
        and(
          eq(nonces.nonce, nonce),
          eq(nonces.consumed, false),
          gt(nonces.expiresAt, now),
        ),
      )
      .returning();

    if (!results || results.length === 0) {
      throw new Error("Invalid or expired nonce");
    }

    return results[0];
  },

  cleanupExpiredNonces: async () => {
    const now = new Date();
    await db.delete(nonces).where(lt(nonces.expiresAt, now));
  },

  // Access token operations
  storeAccessToken: async (
    shop: ShopDomain,
    accessToken: AccessToken,
    scope: Scope,
    tokenData?: {
      tokenType?: string;
      expiresIn?: number;
      associatedUserScope?: string;
      associatedUserId?: string;
    },
  ) => {
    const tokenRecord = {
      shop,
      accessToken,
      scope,
      tokenType: tokenData?.tokenType || "bearer",
      expiresIn: tokenData?.expiresIn ?? null,
      associatedUserScope: tokenData?.associatedUserScope ?? null,
      associatedUserId: tokenData?.associatedUserId ?? null,
    };

    const results = await db
      .insert(accessTokens)
      .values(tokenRecord)
      .onConflictDoUpdate({
        target: accessTokens.shop,
        set: {
          accessToken: sql`excluded.access_token`,
          scope: sql`excluded.scope`,
          tokenType: sql`excluded.token_type`,
          expiresIn: sql`excluded.expires_in`,
          associatedUserScope: sql`excluded.associated_user_scope`,
          associatedUserId: sql`excluded.associated_user_id`,
        },
      })
      .returning();

    if (!results || results.length === 0) {
      throw new Error("Failed to store access token");
    }

    return results[0];
  },

  retrieveAccessToken: async (shop: ShopDomain) => {
    const results = await db
      .select()
      .from(accessTokens)
      .where(eq(accessTokens.shop, shop));

    return results.length > 0 ? results[0] : null;
  },

  deleteAccessToken: async (shop: ShopDomain) => {
    const results = await db
      .delete(accessTokens)
      .where(eq(accessTokens.shop, shop))
      .returning();

    return results.length > 0;
  },
});
