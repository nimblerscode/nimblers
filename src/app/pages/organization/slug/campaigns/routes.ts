import { route } from "rwsdk/router";
import { sessionHandler } from "@/infrastructure/auth/middleware";
import { CampaignCreatePage } from "./CampaignCreatePage";
import { CampaignsListPage } from "./CampaignsListPage";

export const routes = [
  route("/", [sessionHandler, CampaignsListPage]),
  route("/create", [sessionHandler, CampaignCreatePage]),
];
