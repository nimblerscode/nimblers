import { Data } from "effect";

export class EmailServiceError extends Data.TaggedError("EmailServiceError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {}
