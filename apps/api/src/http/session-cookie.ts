import { appConfig } from "../config.js";

export const sessionCookieOptions = {
  path: "/",
  httpOnly: true,
  sameSite: "lax" as const,
  secure: appConfig.isProduction,
  maxAge: appConfig.sessionMaxAgeSeconds,
};
