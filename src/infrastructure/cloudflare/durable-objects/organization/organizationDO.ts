// src/infrastructure/cloudflare/durable-objects/organization/organizationDO.ts
import { EffectDurableObjectBase } from "../base/EffectDurableObjectBase";
import { getOrgHandler } from "./api/handlers";

export class OrganizationDurableObject extends EffectDurableObjectBase {
  async fetch(request: Request): Promise<Response> {
    console.log("Organization fetch", request);
    const { handler } = getOrgHandler(this.state);
    return handler(request);
  }
}
