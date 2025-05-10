import { Schema as S } from "effect";

// Reusing definition, ensure consistency with schema.tenant.ts
const BaseSchema = S.Struct({
  id: S.String,
  // createdAt: S.String,
});

// Schema for Member based on schema.tenant.ts
export const MemberSchema = S.Struct({
  ...BaseSchema.fields,
  userId: S.String, // ID from the gateway's user table
  organizationId: S.String,
  role: S.String, // e.g., 'owner', 'admin', 'member'
});
export interface Member extends S.Schema.Type<typeof MemberSchema> {}
export const Member = MemberSchema;
