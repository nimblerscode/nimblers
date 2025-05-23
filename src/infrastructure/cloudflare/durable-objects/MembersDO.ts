import { Effect, Layer } from "effect";
import { MemberDOService } from "@/domain/tenant/member/service";
import { Headers } from "@effect/platform";
import { OrganizationDONamespace } from "./OrganizationDONameSpace";
import { type Member, MemberDOError } from "@/domain/tenant/member/model";

export const MembersDOServiceLive = Layer.effect(
  MemberDOService,
  Effect.gen(function* () {
    const orgDONamespace = yield* OrganizationDONamespace;

    const get = (slug: string) => {
      return Effect.gen(function* () {
        const doId = orgDONamespace.idFromName(slug);
        const stub = orgDONamespace.get(doId);

        const response = yield* Effect.tryPromise({
          try: async () => {
            return stub.fetch(`http://internal/members/${slug}`, {
              method: "GET",
              headers: Headers.unsafeFromRecord({
                "Content-Type": "application/json",
              }),
            });
          },
          catch: (error) => {
            throw new MemberDOError({ cause: error });
          },
        });

        if (!response.ok) {
          throw new MemberDOError({ cause: response });
        }

        const members = yield* Effect.tryPromise({
          try: async () => {
            return response.json() as unknown as Member[];
          },
          catch: (error) => {
            throw new MemberDOError({ cause: error });
          },
        });

        return members;
      });
    };

    return {
      get,
    };
  })
);
