import { UserRepo } from "@/core/user/service";
import { Effect, Layer } from "effect";
import { DrizzleD1Client, type schema } from "../drizzle/drizzle";
import { user as userTable } from "../schemas/schema";
import { makeUserDrizzleAdapter } from "./adapters/UserDrizzleAdapter";
import { makeUserEffectAdapter } from "./effect/UserEffectAdapter";

export const UserRepoLive = Layer.effect(
  UserRepo,
  Effect.map(DrizzleD1Client, (db) =>
    makeUserEffectAdapter(makeUserDrizzleAdapter(db, userTable)),
  ),
);
