"use server";

export async function Layout() {
  return (
    <div style={{ maxWidth: "56rem", margin: "0 auto", padding: "2rem 1.5rem" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
        <div>
          <h1 style={{ fontSize: "2.25rem", fontWeight: "bold", color: "#1a1a1a", marginBottom: "1rem", margin: "0 0 1rem 0" }}>
            Privacy Policy
          </h1>
          <p style={{ color: "#6b7280", fontSize: "0.875rem", margin: "0" }}>
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#1a1a1a", marginBottom: "0.75rem", margin: "0 0 0.75rem 0" }}>
              1. Information We Collect
            </h2>
            <p style={{ marginBottom: "1rem", margin: "0 0 1rem 0", color: "#374151", lineHeight: "1.6" }}>
              We collect information you provide directly to us, such as when you create an account,
              use our services, or contact us for support.
            </p>
            <p style={{ margin: "0", color: "#374151", lineHeight: "1.6" }}>
              <strong>Personal Information:</strong> Name, email address, phone number, company information,
              and any other information you choose to provide.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#1a1a1a", marginBottom: "0.75rem", margin: "0 0 0.75rem 0" }}>
              2. How We Use Your Information
            </h2>
            <p style={{ marginBottom: "0.75rem", margin: "0 0 0.75rem 0", color: "#374151", lineHeight: "1.6" }}>We use the information we collect to:</p>
            <ul style={{ paddingLeft: "1.5rem", marginBottom: "1rem", margin: "0 0 1rem 0", color: "#374151", lineHeight: "1.6" }}>
              <li>Provide, maintain, and improve our services</li>
              <li>Process transactions and send related information</li>
              <li>Send technical notices and support messages</li>
              <li>Respond to your comments and questions</li>
              <li>Protect against fraud and abuse</li>
            </ul>
          </div>

          <div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#1a1a1a", marginBottom: "0.75rem", margin: "0 0 0.75rem 0" }}>
              3. Information Sharing and Disclosure
            </h2>
            <p style={{ marginBottom: "1rem", margin: "0 0 1rem 0", color: "#374151", lineHeight: "1.6" }}>
              We do not sell, trade, or otherwise transfer your personal information to third parties
              without your consent, except as described in this policy.
            </p>
            <p style={{ margin: "0", color: "#374151", lineHeight: "1.6" }}>
              We may share your information in the following circumstances:
            </p>
            <ul style={{ paddingLeft: "1.5rem", marginTop: "0.5rem", margin: "0.5rem 0 0 0", color: "#374151", lineHeight: "1.6" }}>
              <li>With your consent</li>
              <li>To comply with legal obligations</li>
              <li>To protect our rights and prevent fraud</li>
              <li>With service providers who assist us in operations</li>
            </ul>
          </div>

          <div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#1a1a1a", marginBottom: "0.75rem", margin: "0 0 0.75rem 0" }}>
              4. Data Security
            </h2>
            <p style={{ margin: "0", color: "#374151", lineHeight: "1.6" }}>
              We implement appropriate security measures to protect your personal information against
              unauthorized access, alteration, disclosure, or destruction. However, no method of
              transmission over the internet is 100% secure.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#1a1a1a", marginBottom: "0.75rem", margin: "0 0 0.75rem 0" }}>
              5. Data Retention
            </h2>
            <p style={{ margin: "0", color: "#374151", lineHeight: "1.6" }}>
              We retain your personal information for as long as necessary to provide our services
              and fulfill the purposes described in this policy, unless a longer retention period
              is required by law.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#1a1a1a", marginBottom: "0.75rem", margin: "0 0 0.75rem 0" }}>
              6. Your Rights
            </h2>
            <p style={{ marginBottom: "0.75rem", margin: "0 0 0.75rem 0", color: "#374151", lineHeight: "1.6" }}>You have the right to:</p>
            <ul style={{ paddingLeft: "1.5rem", margin: "0", color: "#374151", lineHeight: "1.6" }}>
              <li>Access your personal information</li>
              <li>Correct inaccurate information</li>
              <li>Delete your information</li>
              <li>Object to or restrict processing</li>
              <li>Data portability</li>
            </ul>
          </div>

          <div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#1a1a1a", marginBottom: "0.75rem", margin: "0 0 0.75rem 0" }}>
              7. Cookies and Tracking
            </h2>
            <p style={{ margin: "0", color: "#374151", lineHeight: "1.6" }}>
              We use cookies and similar tracking technologies to improve your experience on our website.
              You can control cookies through your browser settings.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#1a1a1a", marginBottom: "0.75rem", margin: "0 0 0.75rem 0" }}>
              8. Third-Party Services
            </h2>
            <p style={{ marginBottom: "0.75rem", margin: "0 0 0.75rem 0", color: "#374151", lineHeight: "1.6" }}>
              Our service may integrate with third-party services, including:
            </p>
            <ul style={{ paddingLeft: "1.5rem", margin: "0", color: "#374151", lineHeight: "1.6" }}>
              <li>WhatsApp Business API</li>
              <li>Shopify Integration</li>
              <li>Analytics providers</li>
              <li>Email service providers</li>
            </ul>
          </div>

          <div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#1a1a1a", marginBottom: "0.75rem", margin: "0 0 0.75rem 0" }}>
              9. International Data Transfers
            </h2>
            <p style={{ margin: "0", color: "#374151", lineHeight: "1.6" }}>
              Your information may be transferred to and processed in countries other than your own.
              We ensure appropriate safeguards are in place to protect your information.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#1a1a1a", marginBottom: "0.75rem", margin: "0 0 0.75rem 0" }}>
              10. Updates to This Policy
            </h2>
            <p style={{ margin: "0", color: "#374151", lineHeight: "1.6" }}>
              We may update this privacy policy from time to time. We will notify you of any changes
              by posting the new policy on this page with an updated date.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#1a1a1a", marginBottom: "0.75rem", margin: "0 0 0.75rem 0" }}>
              11. Contact Us
            </h2>
            <p style={{ margin: "0 0 0.75rem 0", color: "#374151", lineHeight: "1.6" }}>
              If you have any questions about this privacy policy, please contact us at:
            </p>
            <div style={{ marginTop: "0.75rem", padding: "1rem", backgroundColor: "#f9fafb", borderRadius: "0.375rem", border: "1px solid #e5e7eb" }}>
              <p style={{ margin: "0 0 0.5rem 0", color: "#374151" }}><strong>Email:</strong> privacy@nimblers.com</p>
              <p style={{ margin: "0 0 0.5rem 0", color: "#374151" }}><strong>Address:</strong> Nimblers, Inc.</p>
              <p style={{ margin: "0 0 0.5rem 0", color: "#374151" }}>Privacy Officer</p>
              <p style={{ margin: "0", color: "#374151" }}>[Your Business Address]</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
