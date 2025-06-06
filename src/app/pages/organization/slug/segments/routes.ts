import { route } from "rwsdk/router";
import { sessionHandler } from "@/infrastructure/auth/middleware";
import { Layout } from "./Layout";
import { SegmentCreatePage } from "./SegmentCreatePage";
import SegmentDetailPage from "./[segmentId]/SegmentDetailPage";

export const routes = [
  route("/", [sessionHandler, Layout]),
  route("/create", [sessionHandler, SegmentCreatePage]),
  route("/:segmentId", [sessionHandler, SegmentDetailPage]),
];
