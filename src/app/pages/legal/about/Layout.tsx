"use server";

export async function Layout() {
  return (
    <div style={{ maxWidth: "56rem", margin: "0 auto", padding: "2rem 1.5rem" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
        <div>
          <h1 style={{ fontSize: "2.25rem", fontWeight: "bold", color: "#1a1a1a", marginBottom: "1rem", margin: "0 0 1rem 0" }}>
            About Nimblers
          </h1>
          <p style={{ color: "#6b7280", fontSize: "1.125rem", margin: "0" }}>
            Empowering businesses to build meaningful customer relationships through intelligent messaging
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#1a1a1a", marginBottom: "1rem", margin: "0 0 1rem 0" }}>
              Our Mission
            </h2>
            <p style={{ marginBottom: "1rem", margin: "0 0 1rem 0", color: "#374151", lineHeight: "1.6" }}>
              At Nimblers, we believe that every customer interaction should be personal, timely, and valuable.
              Our mission is to help businesses create exceptional customer experiences through intelligent,
              multi-channel messaging that drives engagement and builds lasting relationships.
            </p>
            <p style={{ margin: "0", color: "#374151", lineHeight: "1.6" }}>
              We're transforming how businesses communicate with their customers by providing a unified
              platform that combines the power of WhatsApp Business, SMS, email, and other messaging
              channels with advanced segmentation and automation capabilities.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#1a1a1a", marginBottom: "1rem", margin: "0 0 1rem 0" }}>
              What We Do
            </h2>
            <p style={{ marginBottom: "1.5rem", margin: "0 0 1.5rem 0", color: "#374151", lineHeight: "1.6" }}>
              Nimblers is a comprehensive customer engagement platform that helps businesses:
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <div style={{ padding: "1.5rem", backgroundColor: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "0.375rem" }}>
                <h3 style={{ fontSize: "1.25rem", fontWeight: "bold", color: "#1a1a1a", marginBottom: "0.5rem", margin: "0 0 0.5rem 0" }}>
                  🚀 Launch Targeted Campaigns
                </h3>
                <p style={{ margin: "0", color: "#374151", lineHeight: "1.6" }}>
                  Create and execute personalized messaging campaigns across WhatsApp, SMS, and email
                  with intelligent customer segmentation and behavioral targeting.
                </p>
              </div>

              <div style={{ padding: "1.5rem", backgroundColor: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "0.375rem" }}>
                <h3 style={{ fontSize: "1.25rem", fontWeight: "bold", color: "#1a1a1a", marginBottom: "0.5rem", margin: "0 0 0.5rem 0" }}>
                  💬 Manage Customer Conversations
                </h3>
                <p style={{ margin: "0", color: "#374151", lineHeight: "1.6" }}>
                  Centralize all customer communications in one place with our unified inbox that
                  supports WhatsApp Business API, SMS, and other messaging channels.
                </p>
              </div>

              <div style={{ padding: "1.5rem", backgroundColor: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "0.375rem" }}>
                <h3 style={{ fontSize: "1.25rem", fontWeight: "bold", color: "#1a1a1a", marginBottom: "0.5rem", margin: "0 0 0.5rem 0" }}>
                  🛍️ Integrate with E-commerce
                </h3>
                <p style={{ margin: "0", color: "#374151", lineHeight: "1.6" }}>
                  Seamlessly connect with Shopify and other e-commerce platforms to sync customer
                  data, order information, and product catalogs for personalized messaging.
                </p>
              </div>

              <div style={{ padding: "1.5rem", backgroundColor: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "0.375rem" }}>
                <h3 style={{ fontSize: "1.25rem", fontWeight: "bold", color: "#1a1a1a", marginBottom: "0.5rem", margin: "0 0 0.5rem 0" }}>
                  📊 Analyze Performance
                </h3>
                <p style={{ margin: "0", color: "#374151", lineHeight: "1.6" }}>
                  Track engagement metrics, conversion rates, and campaign performance with detailed
                  analytics and reporting tools to optimize your customer communication strategy.
                </p>
              </div>
            </div>
          </div>

          <div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#1a1a1a", marginBottom: "1rem", margin: "0 0 1rem 0" }}>
              Our Values
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <h3 style={{ fontSize: "1.25rem", fontWeight: "bold", color: "#1a1a1a", marginBottom: "0.5rem", margin: "0 0 0.5rem 0" }}>
                  🔐 Privacy & Compliance First
                </h3>
                <p style={{ margin: "0", color: "#374151", lineHeight: "1.6" }}>
                  We prioritize customer data protection and maintain strict compliance with
                  GDPR, WhatsApp Business Policy, and other privacy regulations.
                </p>
              </div>

              <div>
                <h3 style={{ fontSize: "1.25rem", fontWeight: "bold", color: "#1a1a1a", marginBottom: "0.5rem", margin: "0 0 0.5rem 0" }}>
                  🤝 Customer Success
                </h3>
                <p style={{ margin: "0", color: "#374151", lineHeight: "1.6" }}>
                  Your success is our success. We're committed to providing exceptional support
                  and continuously improving our platform based on customer feedback.
                </p>
              </div>

              <div>
                <h3 style={{ fontSize: "1.25rem", fontWeight: "bold", color: "#1a1a1a", marginBottom: "0.5rem", margin: "0 0 0.5rem 0" }}>
                  🌟 Innovation
                </h3>
                <p style={{ margin: "0", color: "#374151", lineHeight: "1.6" }}>
                  We continuously evolve our platform with the latest messaging technologies
                  and best practices to keep our customers ahead of the curve.
                </p>
              </div>

              <div>
                <h3 style={{ fontSize: "1.25rem", fontWeight: "bold", color: "#1a1a1a", marginBottom: "0.5rem", margin: "0 0 0.5rem 0" }}>
                  🌍 Global Reach
                </h3>
                <p style={{ margin: "0", color: "#374151", lineHeight: "1.6" }}>
                  Supporting businesses worldwide with localized features, multi-language
                  support, and compliance with regional regulations.
                </p>
              </div>
            </div>
          </div>

          <div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#1a1a1a", marginBottom: "1rem", margin: "0 0 1rem 0" }}>
              Industry Expertise
            </h2>
            <p style={{ marginBottom: "1rem", margin: "0 0 1rem 0", color: "#374151", lineHeight: "1.6" }}>
              Our platform serves businesses across various industries:
            </p>

            <ul style={{ paddingLeft: "1.5rem", margin: "0", color: "#374151", lineHeight: "1.6" }}>
              <li><strong>E-commerce & Retail:</strong> Product recommendations, order updates, cart abandonment recovery</li>
              <li><strong>Healthcare:</strong> Appointment reminders, health tips, patient communication (HIPAA compliant)</li>
              <li><strong>Education:</strong> Course updates, enrollment notifications, student engagement</li>
              <li><strong>Financial Services:</strong> Account alerts, payment reminders, financial education</li>
              <li><strong>Travel & Hospitality:</strong> Booking confirmations, travel updates, customer service</li>
              <li><strong>Professional Services:</strong> Client communication, appointment scheduling, service updates</li>
            </ul>
          </div>

          <div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#1a1a1a", marginBottom: "1rem", margin: "0 0 1rem 0" }}>
              Technology & Security
            </h2>
            <p style={{ marginBottom: "1rem", margin: "0 0 1rem 0", color: "#374151", lineHeight: "1.6" }}>
              Built on modern, secure infrastructure:
            </p>

            <ul style={{ paddingLeft: "1.5rem", margin: "0", color: "#374151", lineHeight: "1.6" }}>
              <li>Cloud-native architecture on Cloudflare Workers for global performance</li>
              <li>End-to-end encryption for all customer communications</li>
              <li>SOC 2 Type II compliance and regular security audits</li>
              <li>99.9% uptime SLA with redundant systems and failover protection</li>
              <li>GDPR, CCPA, and WhatsApp Business Policy compliant</li>
              <li>Real-time data synchronization and backup systems</li>
            </ul>
          </div>

          <div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#1a1a1a", marginBottom: "1rem", margin: "0 0 1rem 0" }}>
              Company Information
            </h2>

            <div style={{ padding: "1.5rem", backgroundColor: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "0.375rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <p style={{ margin: "0", color: "#374151" }}><strong>Legal Name:</strong> Nimblers, Inc.</p>
                <p style={{ margin: "0", color: "#374151" }}><strong>Founded:</strong> 2024</p>
                <p style={{ margin: "0", color: "#374151" }}><strong>Headquarters:</strong> [Your Business Address]</p>
                <p style={{ margin: "0", color: "#374151" }}><strong>Business Registration:</strong> [Registration Number]</p>
                <p style={{ margin: "0", color: "#374151" }}><strong>Industry:</strong> Business Communication Software (SaaS)</p>
                <p style={{ margin: "0", color: "#374151" }}><strong>Employees:</strong> [Number of Employees]</p>
                <p style={{ margin: "0", color: "#374151" }}><strong>Certifications:</strong> WhatsApp Business Solution Provider, ISO 27001 (in progress)</p>
              </div>
            </div>
          </div>

          <div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#1a1a1a", marginBottom: "1rem", margin: "0 0 1rem 0" }}>
              Leadership Team
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ padding: "1.5rem", backgroundColor: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "0.375rem" }}>
                <h3 style={{ fontSize: "1.25rem", fontWeight: "bold", color: "#1a1a1a", marginBottom: "0.5rem", margin: "0 0 0.5rem 0" }}>
                  [CEO Name], Chief Executive Officer
                </h3>
                <p style={{ margin: "0", color: "#374151", lineHeight: "1.6" }}>
                  [Brief bio about CEO's background in technology/business communications]
                </p>
              </div>

              <div style={{ padding: "1.5rem", backgroundColor: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "0.375rem" }}>
                <h3 style={{ fontSize: "1.25rem", fontWeight: "bold", color: "#1a1a1a", marginBottom: "0.5rem", margin: "0 0 0.5rem 0" }}>
                  [CTO Name], Chief Technology Officer
                </h3>
                <p style={{ margin: "0", color: "#374151", lineHeight: "1.6" }}>
                  [Brief bio about CTO's technical background and experience]
                </p>
              </div>
            </div>
          </div>

          <div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#1a1a1a", marginBottom: "1rem", margin: "0 0 1rem 0" }}>
              Contact & Support
            </h2>
            <p style={{ marginBottom: "1rem", margin: "0 0 1rem 0", color: "#374151", lineHeight: "1.6" }}>
              We're here to help your business succeed:
            </p>

            <ul style={{ paddingLeft: "1.5rem", margin: "0", color: "#374151", lineHeight: "1.6" }}>
              <li><strong>General Inquiries:</strong> hello@nimblers.com</li>
              <li><strong>Customer Support:</strong> support@nimblers.com</li>
              <li><strong>Sales:</strong> sales@nimblers.com</li>
              <li><strong>Partnerships:</strong> partnerships@nimblers.com</li>
              <li><strong>Phone:</strong> +1 (555) 123-4567</li>
              <li><strong>Support Hours:</strong> Monday-Friday, 9:00 AM - 6:00 PM EST</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
} 
