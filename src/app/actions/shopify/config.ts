"use server";

import { env } from "cloudflare:workers";

export async function getShopifyConfig() {
  return {
    clientId: env.SHOPIFY_CLIENT_ID,
    // Don't expose client secret to the client
  };
}
