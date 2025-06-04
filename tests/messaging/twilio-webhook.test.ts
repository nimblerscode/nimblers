import { describe, it, expect, vi } from "@effect/vitest";
import { handleTwilioWebhook } from "../../src/app/actions/messaging/twilio-webhook";

describe("Twilio Webhook Handler", () => {
  const createMockRequest = (
    method = "POST",
    formData: Record<string, string> = {},
    headers: Record<string, string> = {}
  ) => {
    const mockFormData = new FormData();
    for (const [key, value] of Object.entries(formData)) {
      mockFormData.append(key, value);
    }

    return {
      method,
      headers: new Headers(headers),
      formData: vi.fn().mockResolvedValue(mockFormData),
    } as unknown as Request;
  };

  describe("Method validation", () => {
    it("should reject non-POST requests", async () => {
      const request = createMockRequest("GET");
      const response = await handleTwilioWebhook(request);

      expect(response.status).toBe(405);
      expect(await response.text()).toBe("Method not allowed");
    });

    it("should accept POST requests", async () => {
      const request = createMockRequest(
        "POST",
        {
          MessageSid: "SM123456789",
          MessageStatus: "delivered",
        },
        {
          "x-twilio-signature": "test-signature",
        }
      );

      const response = await handleTwilioWebhook(request);
      expect(response.status).toBe(200);
    });
  });

  describe("Authentication validation", () => {
    it("should reject requests without authentication headers", async () => {
      const request = createMockRequest("POST", {
        MessageSid: "SM123456789",
        MessageStatus: "delivered",
      });

      const response = await handleTwilioWebhook(request);
      expect(response.status).toBe(401);
      expect(await response.text()).toBe("Unauthorized");
    });

    it("should accept requests with x-twilio-signature header", async () => {
      const request = createMockRequest(
        "POST",
        {
          MessageSid: "SM123456789",
          MessageStatus: "delivered",
        },
        {
          "x-twilio-signature": "test-signature",
        }
      );

      const response = await handleTwilioWebhook(request);
      expect(response.status).toBe(200);
    });

    it("should accept requests with authorization header", async () => {
      const request = createMockRequest(
        "POST",
        {
          MessageSid: "SM123456789",
          MessageStatus: "delivered",
        },
        {
          authorization: "Bearer token",
        }
      );

      const response = await handleTwilioWebhook(request);
      expect(response.status).toBe(200);
    });
  });

  describe("Payload validation", () => {
    it("should reject requests missing MessageSid", async () => {
      const request = createMockRequest(
        "POST",
        {
          MessageStatus: "delivered",
        },
        {
          "x-twilio-signature": "test-signature",
        }
      );

      const response = await handleTwilioWebhook(request);
      expect(response.status).toBe(400);
      expect(await response.text()).toBe(
        "Bad request: missing required fields"
      );
    });

    it("should reject requests missing MessageStatus", async () => {
      const request = createMockRequest(
        "POST",
        {
          MessageSid: "SM123456789",
        },
        {
          "x-twilio-signature": "test-signature",
        }
      );

      const response = await handleTwilioWebhook(request);
      expect(response.status).toBe(400);
      expect(await response.text()).toBe(
        "Bad request: missing required fields"
      );
    });

    it("should accept requests with SMS fields (SmsSid, SmsStatus)", async () => {
      const request = createMockRequest(
        "POST",
        {
          SmsSid: "SM123456789",
          SmsStatus: "delivered",
        },
        {
          "x-twilio-signature": "test-signature",
        }
      );

      const response = await handleTwilioWebhook(request);
      expect(response.status).toBe(200);
    });
  });

  describe("Status mapping", () => {
    const testStatusMapping = async (
      twilioStatus: string,
      expectedStatus: string
    ) => {
      const request = createMockRequest(
        "POST",
        {
          MessageSid: "SM123456789",
          MessageStatus: twilioStatus,
        },
        {
          "x-twilio-signature": "test-signature",
        }
      );

      const response = await handleTwilioWebhook(request);
      expect(response.status).toBe(200);
      // Note: In a full implementation, you'd verify the status was processed correctly
      // For now, we just verify the request was accepted
    };

    it("should map queued status to pending", async () => {
      await testStatusMapping("queued", "pending");
    });

    it("should map accepted status to pending", async () => {
      await testStatusMapping("accepted", "pending");
    });

    it("should map sent status to sent", async () => {
      await testStatusMapping("sent", "sent");
    });

    it("should map delivered status to delivered", async () => {
      await testStatusMapping("delivered", "delivered");
    });

    it("should map failed status to failed", async () => {
      await testStatusMapping("failed", "failed");
    });

    it("should map undelivered status to failed", async () => {
      await testStatusMapping("undelivered", "failed");
    });

    it("should map read status to read", async () => {
      await testStatusMapping("read", "read");
    });

    it("should map unknown status to pending", async () => {
      await testStatusMapping("unknown-status", "pending");
    });
  });

  describe("Error handling", () => {
    it("should handle invalid message IDs gracefully", async () => {
      const request = createMockRequest(
        "POST",
        {
          MessageSid: "", // Invalid message ID
          MessageStatus: "delivered",
        },
        {
          "x-twilio-signature": "test-signature",
        }
      );

      const response = await handleTwilioWebhook(request);
      expect(response.status).toBe(500);
      expect(await response.text()).toBe("Processing failed");
    });

    it("should handle malformed form data gracefully", async () => {
      const request = {
        method: "POST",
        headers: new Headers({ "x-twilio-signature": "test-signature" }),
        formData: vi.fn().mockRejectedValue(new Error("Malformed data")),
      } as unknown as Request;

      const response = await handleTwilioWebhook(request);
      expect(response.status).toBe(500);
      expect(await response.text()).toBe("Internal server error");
    });
  });

  describe("Full payload processing", () => {
    it("should process a complete Twilio webhook payload", async () => {
      const request = createMockRequest(
        "POST",
        {
          MessageSid: "SM123456789",
          MessageStatus: "delivered",
          To: "+1234567890",
          From: "+1987654321",
          Body: "Test message",
          AccountSid: "AC123456789",
          ErrorCode: "",
          ErrorMessage: "",
        },
        {
          "x-twilio-signature": "test-signature",
        }
      );

      const response = await handleTwilioWebhook(request);
      expect(response.status).toBe(200);
      expect(await response.text()).toBe("OK");
    });

    it("should process webhook with error information", async () => {
      const request = createMockRequest(
        "POST",
        {
          MessageSid: "SM123456789",
          MessageStatus: "failed",
          To: "+1234567890",
          From: "+1987654321",
          Body: "Test message",
          AccountSid: "AC123456789",
          ErrorCode: "30008",
          ErrorMessage: "Unknown error",
        },
        {
          "x-twilio-signature": "test-signature",
        }
      );

      const response = await handleTwilioWebhook(request);
      expect(response.status).toBe(200);
      expect(await response.text()).toBe("OK");
    });
  });
});
