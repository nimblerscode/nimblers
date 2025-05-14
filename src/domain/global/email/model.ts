import { Data, Schema as S } from "effect";

// --- Email Error Definition ---
export class EmailError extends Data.TaggedError("EmailError")<{
  message: string;
  cause?: unknown; // For wrapping underlying errors
}> {}

// --- Email Brand ---_ts
export const EmailSchema = S.String.pipe(
  S.trimmed(),
  S.filter((value) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value), {
    message: (value) => `Invalid email format: ${value}`,
    identifier: "EmailFormat",
    jsonSchema: { type: "string", format: "email" },
  }),
  S.brand("Email"),
);
export type Email = S.Schema.Type<typeof EmailSchema>;
