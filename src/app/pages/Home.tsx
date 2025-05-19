"use client";

import type { Cause } from "effect/Cause";
import { useActionState } from "react";
import type {
  Invitation,
  InvitationError,
} from "@/domain/tenant/invitations/models";
import type { OrgDbError } from "@/domain/tenant/organization/model";
import { inviteUserAction } from "../invitation/create";
import type { User } from "@/domain/global/user/model";
import type { RequestInfo } from "@redwoodjs/sdk/worker";

export type InviteUserState =
  | {
    success: false;
    message: string;
    errors: Cause<InvitationError | OrgDbError> | null;
    user: User;
  }
  | {
    success: true;
    message: string;
    errors: null;
    invitation: Invitation; // Replace with actual type if known
    token: string;
    user: User;
  };


export default function SendInvitation(props: RequestInfo) {
  const initialState: InviteUserState = {
    success: false,
    message: "",
    errors: null,
    user: props.ctx.user,
  };

  console.log("ctx", props.ctx);
  const [state, formAction, pending] = useActionState(
    inviteUserAction,
    initialState,
  );

  console.log(state);

  return (
    <div>
      <h1>Send Invitation</h1>
      <form action={formAction}>
        <input type="email" name="email" placeholder="Email" />
        <input
          type="hidden"
          name="organizationSlug"
          value={props.params.organizationSlug}
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}
