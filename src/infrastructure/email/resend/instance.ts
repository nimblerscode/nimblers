import { env } from "cloudflare:workers";
import { Resend } from "resend";

export const email = new Resend(env.RESEND_API_KEY);
