"use server";
import { env } from "cloudflare:workers";
import { Effect } from "effect";
import { InvitationDOService } from "@/application/tenant/invitations/service";
import { InvitationDOLive } from "@/config/layers";
import type { Email } from "@/domain/global/email/model";
import type { UserId } from "@/domain/global/user/model";
import type { InviteUserState } from "../pages/Home";

export async function inviteUserAction(
  prevState: InviteUserState,
  formData: FormData,
) {
  const email = formData.get("email") as string;

  const invitationProgram = InvitationDOService.pipe(
    Effect.flatMap((service) =>
      service.create(
        {
          inviterId: prevState.user.id as UserId,
          inviteeEmail: email as Email,
          role: "admin",
        },
        "jjj",
      ),
    ),
  );

  const fullLayer = InvitationDOLive({
    ORG_DO: env.ORG_DO,
  });

  const invitation = await Effect.runPromise(
    invitationProgram.pipe(Effect.provide(fullLayer)),
  );

  return invitation;
}
