import { describe, expect, it } from "@effect/vitest"; // Use @effect/vitest
import { Schema as S } from "effect";
import {
  type Invitation,
  InvitationSchema,
  type OrgCreateInput,
  OrgCreateInputSchema,
  type Organization,
  OrganizationSchema,
} from "../../../src/core/organization/model"; // Adjusted relative path

describe("Core Organization Models", () => {
  describe("OrganizationSchema", () => {
    it("should encode and decode a valid Organization", () => {
      const orgData: Organization = {
        id: "org_123",
        name: "Test Org",
        slug: "test-org",
        logo: "logo.png",
        metadata: '{"key":"value"}',
      };

      // Test encoding
      const encodedData = S.encodeSync(OrganizationSchema)(orgData);

      // Test decoding
      const decodedData = S.decodeSync(OrganizationSchema)(encodedData);
      expect(decodedData).toEqual(orgData);
    });

    it("should allow optional fields to be absent", () => {
      const orgData = {
        id: "org_456",
        name: "Minimal Org",
        slug: "minimal-org",
      };
      const decoded: Organization = S.decodeSync(OrganizationSchema)(orgData);
      expect(decoded.id).toBe("org_456");
      expect(decoded.logo).toBeUndefined();
      expect(decoded.metadata).toBeUndefined();
    });

    it("should fail decoding with missing required fields", () => {
      const invalidData = { id: "org_789" };
      expect(() =>
        S.decodeSync(OrganizationSchema)(
          invalidData as unknown as Organization,
        ),
      ).toThrow();
    });
  });

  describe("InvitationSchema", () => {
    it("should encode and decode a valid Invitation", () => {
      const invData: Invitation = {
        id: "inv_123",
        email: "test@example.com",
        organizationId: "org_123",
        inviterId: "user_abc",
        role: "member",
        status: "pending",
        expiresAt: new Date(Date.now() + 86400000),
      };
      // Test encoding
      const encodedData = S.encodeSync(InvitationSchema)(invData);

      // Test decoding
      const decodedData = S.decodeSync(InvitationSchema)(encodedData);
      expect(decodedData).toEqual(invData);
    });

    it("should fail decoding with missing required fields", () => {
      const invalidData = { id: "inv_456" };
      expect(() =>
        S.decodeSync(InvitationSchema)(invalidData as unknown as Invitation),
      ).toThrow();
    });
  });

  describe("OrgCreateInputSchema", () => {
    it("should decode valid input", () => {
      const validInput = {
        name: "My New Org",
        slug: "my-new-org-123",
        logo: "https://example.com/logo.png",
      };
      const decoded: OrgCreateInput =
        S.decodeSync(OrgCreateInputSchema)(validInput);
      expect(decoded).toEqual(validInput);
    });

    it("should decode valid input without optional logo", () => {
      const validInput = {
        name: "Another Org",
        slug: "another-org",
      };
      const decoded: OrgCreateInput =
        S.decodeSync(OrgCreateInputSchema)(validInput);
      expect(decoded).toEqual({ ...validInput, logo: undefined });
      expect(decoded.logo).toBeUndefined();
    });

    it("should fail decoding with invalid slug format", () => {
      const invalidInput = { name: "Invalid", slug: "Invalid_Slug!" };
      expect(() => S.decodeSync(OrgCreateInputSchema)(invalidInput)).toThrow();
    });

    it("should fail decoding with short slug", () => {
      const invalidInput = { name: "Short Slug", slug: "s" };
      expect(() => S.decodeSync(OrgCreateInputSchema)(invalidInput)).toThrow();
    });

    it("should fail decoding with empty name", () => {
      const invalidInput = { name: "", slug: "valid-slug" };
      expect(() => S.decodeSync(OrgCreateInputSchema)(invalidInput)).toThrow();
    });

    it("should fail decoding with missing name", () => {
      const invalidInput = { slug: "valid-slug" };
      expect(() =>
        S.decodeSync(OrgCreateInputSchema)(
          invalidInput as unknown as OrgCreateInput /* For test */,
        ),
      ).toThrow();
    });

    it("should fail decoding with missing slug", () => {
      const invalidInput = { name: "Valid Name" };
      expect(() =>
        S.decodeSync(OrgCreateInputSchema)(
          invalidInput as unknown as OrgCreateInput /* For test */,
        ),
      ).toThrow();
    });
  });
});
