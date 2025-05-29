import type { RequestInfo } from "rwsdk/worker";
import { ShopifyWrapper } from "./Wrapper";

interface ShopifyConnection {
  connected: boolean;
  shop?: string;
  accessToken?: string;
  scope?: string;
  lastConnected?: string;
  error?: string;
  errorDetails?: string;
}

export function ShopifyDashboard({ request }: RequestInfo) {
  // Extract connection info from request URL (server-side)
  const url = new URL(request.url);
  const shopParam = url.searchParams.get("shop");
  const success = url.searchParams.get("success");
  const error = url.searchParams.get("error");
  const errorDetails = url.searchParams.get("details");

  let connection: ShopifyConnection | undefined;

  if (error) {
    // Handle OAuth errors
    connection = {
      connected: false,
      shop: shopParam || undefined,
      error,
      errorDetails: errorDetails || undefined,
    };
  } else if (shopParam && success === "true") {
    // Handle successful connection
    connection = {
      connected: true,
      shop: shopParam,
      accessToken: "***hidden***",
      scope: "read_products,write_products",
      lastConnected: new Date().toISOString(),
    };
  }

  return <ShopifyWrapper connection={connection} />;
}
