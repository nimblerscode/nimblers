"use server";

export async function Layout() {
  return (
    <div style={{ maxWidth: "56rem", margin: "0 auto", padding: "2rem 1.5rem" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
        <div>
          <h1 style={{ fontSize: "2.25rem", fontWeight: "bold", color: "#1a1a1a", marginBottom: "1rem", margin: "0 0 1rem 0" }}>
            Contact Us
          </h1>
          <p style={{ color: "#6b7280", margin: "0" }}>
            Get in touch with our team. We're here to help with any questions about our services.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#1a1a1a", marginBottom: "1rem", margin: "0 0 1rem 0" }}>
              Customer Support
            </h2>
            <p style={{ marginBottom: "1.5rem", margin: "0 0 1.5rem 0", color: "#374151", lineHeight: "1.6" }}>
              For product support, billing questions, or technical assistance:
            </p>

            <div style={{ padding: "1.5rem", marginBottom: "1rem", border: "1px solid #e5e7eb", borderRadius: "0.375rem", backgroundColor: "#ffffff" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <p style={{ margin: "0", color: "#374151" }}><strong>Email:</strong> support@nimblers.com</p>
                <p style={{ margin: "0", color: "#374151" }}><strong>Phone:</strong> +1 (555) 123-4567</p>
                <p style={{ margin: "0", color: "#374151" }}><strong>Hours:</strong> Monday-Friday, 9:00 AM - 6:00 PM EST</p>
                <p style={{ margin: "0", color: "#374151" }}><strong>Response Time:</strong> Within 24 hours</p>
              </div>
            </div>
          </div>

          <div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#1a1a1a", marginBottom: "1rem", margin: "0 0 1rem 0" }}>
              Business Information
            </h2>
            <p style={{ marginBottom: "1.5rem", margin: "0 0 1.5rem 0", color: "#374151", lineHeight: "1.6" }}>
              Official business details and registration information:
            </p>

            <div style={{ padding: "1.5rem", marginBottom: "1rem", border: "1px solid #e5e7eb", borderRadius: "0.375rem", backgroundColor: "#ffffff" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <p style={{ margin: "0", color: "#374151" }}><strong>Company Name:</strong> Nimblers, Inc.</p>
                <p style={{ margin: "0", color: "#374151" }}><strong>Business Registration:</strong> [Registration Number]</p>
                <p style={{ margin: "0", color: "#374151" }}><strong>Tax ID:</strong> [Tax Identification Number]</p>
                <p style={{ margin: "0", color: "#374151" }}>
                  <strong>Business Address:</strong><br />
                  [Your Business Address]<br />
                  [City, State ZIP Code]<br />
                  [Country]
                </p>
              </div>
            </div>
          </div>

          <div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#1a1a1a", marginBottom: "1rem", margin: "0 0 1rem 0" }}>
              Legal & Compliance
            </h2>
            <p style={{ marginBottom: "1.5rem", margin: "0 0 1.5rem 0", color: "#374151", lineHeight: "1.6" }}>
              For legal matters, privacy concerns, or compliance questions:
            </p>

            <div style={{ padding: "1.5rem", marginBottom: "1rem", border: "1px solid #e5e7eb", borderRadius: "0.375rem", backgroundColor: "#ffffff" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <p style={{ margin: "0", color: "#374151" }}><strong>Legal Email:</strong> legal@nimblers.com</p>
                <p style={{ margin: "0", color: "#374151" }}><strong>Privacy Email:</strong> privacy@nimblers.com</p>
                <p style={{ margin: "0", color: "#374151" }}><strong>Compliance Email:</strong> compliance@nimblers.com</p>
                <p style={{ margin: "0", color: "#374151" }}><strong>Data Protection Officer:</strong> dpo@nimblers.com</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
