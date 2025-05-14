// src/infrastructure/cloudflare/durable-objects/organization/organizationDO.ts
import { EffectDurableObjectBase } from "../base/EffectDurableObjectBase";
import { getOrgHandler } from "./api/handlers";

export class OrganizationDurableObject extends EffectDurableObjectBase {
  async fetch(request: Request): Promise<Response> {
    const { handler } = getOrgHandler(this.state, this.env.DB);
    return handler(request);
  }
}
