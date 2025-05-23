// src/infrastructure/cloudflare/durable-objects/organization/organizationDO.ts
import { EffectDurableObjectBase } from "../base/EffectDurableObjectBase";
import { getOrgHandler } from "./api/handlers";

export class OrganizationDurableObject extends EffectDurableObjectBase {
  async fetch(request: Request): Promise<Response> {
    console.log("Organization fetch", request);
    const { handler } = getOrgHandler(this.state);
    const x = handler(request).then((response) => {
      console.log("Organization fetch response", response);
      return response;
    });

    return x;
  }
}

// // src/infrastructure/cloudflare/durable-objects/organization/organizationDO.ts
// import { EffectDurableObjectBase } from "../base/EffectDurableObjectBase";
// import { getOrgHandler } from "./api/handlers";

// export class OrganizationDurableObject extends EffectDurableObjectBase {
//   async fetch(request: Request): Promise<Response> {
//     console.log("Organization fetch", request);
//     const { handler } = getOrgHandler(this.state);
//     const x = handler(request).then(async (response) => {
//       console.log("Organization fetch response", response);
//       const x = await response.json();
//       console.log("XXX", x);
//       return response;
//     });

//     return x;
//   }
// }
