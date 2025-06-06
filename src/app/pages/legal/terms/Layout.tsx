"use server";

export async function Layout() {
  return (
    <div style={{ maxWidth: "56rem", margin: "0 auto", padding: "2rem 1.5rem" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
        <div>
          <h1 style={{ fontSize: "2.25rem", fontWeight: "bold", color: "#1a1a1a", marginBottom: "1rem", margin: "0 0 1rem 0" }}>
            Terms of Service
          </h1>
          <p style={{ color: "#6b7280", fontSize: "0.875rem", margin: "0" }}>
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#1a1a1a", marginBottom: "0.75rem", margin: "0 0 0.75rem 0" }}>
              1. Acceptance of Terms
            </h2>
            <p style={{ margin: "0", color: "#374151", lineHeight: "1.6" }}>
              By accessing and using Nimblers ("the Service"), you accept and agree to be bound by the terms
              and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#1a1a1a", marginBottom: "0.75rem", margin: "0 0 0.75rem 0" }}>
              2. Description of Service
            </h2>
            <p style={{ marginBottom: "1rem", margin: "0 0 1rem 0", color: "#374151", lineHeight: "1.6" }}>
              Nimblers provides a customer engagement platform that enables businesses to communicate with
              their customers through various messaging channels, including WhatsApp Business API, SMS, and email.
            </p>
            <p style={{ margin: "0 0 0.5rem 0", color: "#374151", lineHeight: "1.6" }}>
              Our services include but are not limited to:
            </p>
            <ul style={{ paddingLeft: "1.5rem", marginTop: "0.5rem", margin: "0.5rem 0 0 0", color: "#374151", lineHeight: "1.6" }}>
              <li>Customer segmentation and targeting</li>
              <li>Multi-channel messaging campaigns</li>
              <li>Customer conversation management</li>
              <li>Integration with e-commerce platforms like Shopify</li>
              <li>Analytics and reporting tools</li>
            </ul>
          </div>

          <div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#1a1a1a", marginBottom: "0.75rem", margin: "0 0 0.75rem 0" }}>
              3. User Accounts and Responsibilities
            </h2>
            <p style={{ marginBottom: "1rem", margin: "0 0 1rem 0", color: "#374151", lineHeight: "1.6" }}>
              To use our Service, you must create an account and provide accurate, complete information.
              You are responsible for:
            </p>
            <ul style={{ paddingLeft: "1.5rem", margin: "0", color: "#374151", lineHeight: "1.6" }}>
              <li>Maintaining the confidentiality of your account credentials</li>
              <li>All activities that occur under your account</li>
              <li>Ensuring your use complies with applicable laws and regulations</li>
              <li>Obtaining proper consent from customers before messaging them</li>
              <li>Maintaining accurate customer contact information</li>
            </ul>
          </div>

          <div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#1a1a1a", marginBottom: "0.75rem", margin: "0 0 0.75rem 0" }}>
              4. Acceptable Use Policy
            </h2>
            <p style={{ marginBottom: "1rem", margin: "0 0 1rem 0", color: "#374151", lineHeight: "1.6" }}>
              You agree not to use the Service for any unlawful purpose or in any way that:
            </p>
            <ul style={{ paddingLeft: "1.5rem", margin: "0", color: "#374151", lineHeight: "1.6" }}>
              <li>Violates any applicable local, state, national, or international law</li>
              <li>Sends spam, unsolicited, or unauthorized messages</li>
              <li>Transmits harmful, threatening, abusive, or harassing content</li>
              <li>Infringes on intellectual property rights</li>
              <li>Attempts to gain unauthorized access to our systems</li>
              <li>Violates WhatsApp Business Policy or other platform policies</li>
            </ul>
          </div>

          <div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#1a1a1a", marginBottom: "0.75rem", margin: "0 0 0.75rem 0" }}>
              5. WhatsApp Business Compliance
            </h2>
            <p style={{ marginBottom: "1rem", margin: "0 0 1rem 0", color: "#374151", lineHeight: "1.6" }}>
              When using our WhatsApp Business integration, you must comply with:
            </p>
            <ul style={{ paddingLeft: "1.5rem", margin: "0", color: "#374151", lineHeight: "1.6" }}>
              <li>WhatsApp Business Messaging Policy</li>
              <li>Meta's Commerce Policy</li>
              <li>All applicable data protection regulations</li>
              <li>Opt-in requirements for customer communications</li>
              <li>Proper business verification and profile maintenance</li>
            </ul>
          </div>

          <div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#1a1a1a", marginBottom: "0.75rem", margin: "0 0 0.75rem 0" }}>
              6. Privacy and Data Protection
            </h2>
            <p style={{ marginBottom: "1rem", margin: "0 0 1rem 0", color: "#374151", lineHeight: "1.6" }}>
              Your privacy is important to us. Our Privacy Policy explains how we collect, use, and protect
              your information when you use our Service. By using our Service, you agree to the collection
              and use of information in accordance with our Privacy Policy.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#1a1a1a", marginBottom: "0.75rem", margin: "0 0 0.75rem 0" }}>
              7. Payment Terms
            </h2>
            <p style={{ marginBottom: "1rem", margin: "0 0 1rem 0", color: "#374151", lineHeight: "1.6" }}>
              If you purchase paid services:
            </p>
            <ul style={{ paddingLeft: "1.5rem", margin: "0", color: "#374151", lineHeight: "1.6" }}>
              <li>Payment is due according to your chosen billing cycle</li>
              <li>All fees are non-refundable unless otherwise specified</li>
              <li>We may suspend service for overdue payments</li>
              <li>Prices may change with 30 days written notice</li>
            </ul>
          </div>

          <div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#1a1a1a", marginBottom: "0.75rem", margin: "0 0 0.75rem 0" }}>
              8. Intellectual Property
            </h2>
            <p style={{ marginBottom: "1rem", margin: "0 0 1rem 0", color: "#374151", lineHeight: "1.6" }}>
              The Service and its original content, features, and functionality are owned by Nimblers, Inc.
              and are protected by international copyright, trademark, patent, trade secret, and other
              intellectual property laws.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#1a1a1a", marginBottom: "0.75rem", margin: "0 0 0.75rem 0" }}>
              9. Service Availability and Modifications
            </h2>
            <p style={{ marginBottom: "1rem", margin: "0 0 1rem 0", color: "#374151", lineHeight: "1.6" }}>
              We strive to provide reliable service but:
            </p>
            <ul style={{ paddingLeft: "1.5rem", margin: "0", color: "#374151", lineHeight: "1.6" }}>
              <li>Service may be temporarily unavailable for maintenance</li>
              <li>We may modify or discontinue features with notice</li>
              <li>We are not liable for service interruptions</li>
              <li>Third-party integrations may affect service availability</li>
            </ul>
          </div>

          <div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#1a1a1a", marginBottom: "0.75rem", margin: "0 0 0.75rem 0" }}>
              10. Limitation of Liability
            </h2>
            <p style={{ marginBottom: "1rem", margin: "0 0 1rem 0", color: "#374151", lineHeight: "1.6" }}>
              To the maximum extent permitted by law, Nimblers shall not be liable for any indirect,
              incidental, special, consequential, or punitive damages, including without limitation,
              loss of profits, data, use, goodwill, or other intangible losses.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#1a1a1a", marginBottom: "0.75rem", margin: "0 0 0.75rem 0" }}>
              11. Termination
            </h2>
            <p style={{ marginBottom: "1rem", margin: "0 0 1rem 0", color: "#374151", lineHeight: "1.6" }}>
              We may terminate or suspend your account immediately, without prior notice:
            </p>
            <ul style={{ paddingLeft: "1.5rem", margin: "0", color: "#374151", lineHeight: "1.6" }}>
              <li>For breach of these Terms</li>
              <li>For violation of platform policies</li>
              <li>For non-payment of fees</li>
              <li>At our sole discretion</li>
            </ul>
          </div>

          <div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#1a1a1a", marginBottom: "0.75rem", margin: "0 0 0.75rem 0" }}>
              12. Governing Law
            </h2>
            <p style={{ marginBottom: "1rem", margin: "0 0 1rem 0", color: "#374151", lineHeight: "1.6" }}>
              These Terms shall be governed by and construed in accordance with the laws of [Your Jurisdiction],
              without regard to its conflict of law provisions.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#1a1a1a", marginBottom: "0.75rem", margin: "0 0 0.75rem 0" }}>
              13. Changes to Terms
            </h2>
            <p style={{ marginBottom: "1rem", margin: "0 0 1rem 0", color: "#374151", lineHeight: "1.6" }}>
              We reserve the right to modify these terms at any time. We will notify users of any material
              changes via email or through the Service. Continued use after changes constitutes acceptance.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#1a1a1a", marginBottom: "0.75rem", margin: "0 0 0.75rem 0" }}>
              14. Contact Information
            </h2>
            <p style={{ margin: "0 0 0.75rem 0", color: "#374151", lineHeight: "1.6" }}>
              If you have any questions about these Terms, please contact us:
            </p>
            <div style={{ marginTop: "0.75rem", padding: "1rem", backgroundColor: "#f9fafb", borderRadius: "0.375rem", border: "1px solid #e5e7eb" }}>
              <p style={{ margin: "0 0 0.5rem 0", color: "#374151" }}><strong>Email:</strong> legal@nimblers.com</p>
              <p style={{ margin: "0 0 0.5rem 0", color: "#374151" }}><strong>Address:</strong> Nimblers, Inc.</p>
              <p style={{ margin: "0 0 0.5rem 0", color: "#374151" }}>Legal Department</p>
              <p style={{ margin: "0", color: "#374151" }}>[Your Business Address]</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
