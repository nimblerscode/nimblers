import { checkShopConnection } from "@/app/actions/shopify/checkConnection";

export default async function TestShopConnectionPage() {
  const handleTest = async (formData: FormData) => {
    "use server";
    const shopDomain = formData.get("shopDomain") as string;
    const organizationId = formData.get("organizationId") as string;

    const result = await checkShopConnection(shopDomain, organizationId);
    // Result contains: { canConnect, isConnected, connectedToOrganization?, message? }
  };

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h1>Test Global Shop Connection</h1>
      <p>This page tests the global shop connection constraint.</p>

      <form action={handleTest}>
        <div style={{ marginBottom: "15px" }}>
          <label htmlFor="shopDomain">Shop Domain:</label>
          <br />
          <input
            type="text"
            id="shopDomain"
            name="shopDomain"
            defaultValue="nimblers-dev.myshopify.com"
            style={{ padding: "5px", width: "300px" }}
          />
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label htmlFor="organizationId">Organization ID:</label>
          <br />
          <input
            type="text"
            id="organizationId"
            name="organizationId"
            defaultValue="test"
            style={{ padding: "5px", width: "300px" }}
          />
        </div>

        <button type="submit" style={{ padding: "10px 20px", backgroundColor: "#007cba", color: "white", border: "none", borderRadius: "4px" }}>
          Test Connection
        </button>
      </form>

      <div style={{ marginTop: "20px", padding: "10px", backgroundColor: "#f0f0f0", borderRadius: "4px" }}>
        <h3>Instructions:</h3>
        <ol>
          <li>First, try connecting "nimblers-dev.myshopify.com" to organization "test"</li>
          <li>Then, try connecting the same shop to organization "test-2"</li>
          <li>The second attempt should fail with "already connected" error</li>
          <li>Now the constraint is enforced at the server action level before OAuth even starts</li>
        </ol>
      </div>
    </div>
  );
} 
