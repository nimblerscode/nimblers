import { Effect, Layer } from "effect";
import { OrgD1Service } from "@/domain/global/organization/service";
import { DrizzleD1Client } from "./drizzle";
import { makeOrgD1DrizzleAdapter } from "./OrgD1DrizzleAdapter";
import { makeOrgD1EffectAdapter } from "./OrgD1EffectAdapter";

export const OrgRepoD1LayerLive = Layer.effect(
  OrgD1Service,
  Effect.map(DrizzleD1Client, (db) =>
    makeOrgD1EffectAdapter(makeOrgD1DrizzleAdapter(db)),
  ),
);
