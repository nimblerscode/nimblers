import { route } from "rwsdk/router";
import { sessionHandler } from "@/infrastructure/auth/middleware";
import CustomerPage from "./page";

export const routes = [route("/", [sessionHandler, CustomerPage])];
