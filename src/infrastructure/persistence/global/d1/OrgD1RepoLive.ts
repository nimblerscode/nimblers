import { OrgD1Service } from "@/domain/global/organization/service";
import { Effect, Layer } from "effect";
import { makeOrgD1DrizzleAdapter } from "./OrgD1DrizzleAdapter";
import { makeOrgD1EffectAdapter } from "./OrgD1EffectAdapter";
import { DrizzleD1Client } from "./drizzle";

export const OrgRepoD1Layer = Layer.effect(
  OrgD1Service,
  Effect.map(DrizzleD1Client, (db) =>
    makeOrgD1EffectAdapter(makeOrgD1DrizzleAdapter(db)),
  ),
);
