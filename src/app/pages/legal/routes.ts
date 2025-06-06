import { route } from "rwsdk/router";
import { Layout as PrivacyLayout } from "./privacy/Layout";
import { Layout as TermsLayout } from "./terms/Layout";
import { Layout as ContactLayout } from "./contact/Layout";
import { Layout as AboutLayout } from "./about/Layout";

export const routes = [
  route("/privacy", PrivacyLayout),
  route("/terms", TermsLayout),
  route("/contact", ContactLayout),
  route("/about", AboutLayout),
];
