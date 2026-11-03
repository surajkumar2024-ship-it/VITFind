import { env } from "cloudflare:workers";
import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "@/db/auth-schema";
import { admittedGoogleEmail, readAuthSettings } from "./auth-settings";

export function authReady() {
  return Boolean(env.DB && readAuthSettings(env));
}
export function authOrigin() { return readAuthSettings(env)?.baseURL ?? null; }

// Never accept platform identity headers on a publicly reachable Worker.
// Better Auth verifies OAuth responses and stores/revokes server-side sessions.
export function getAuth(newUserIds?: Set<string>) {
  const settings = readAuthSettings(env);
  if (!settings || !env.DB) return null;
  return betterAuth({
    appName: "VITFind",
    baseURL: settings.baseURL,
    secret: settings.secret,
    trustedOrigins: [settings.baseURL],
    database: drizzleAdapter(drizzle(env.DB), { provider: "sqlite", schema }),
    emailAndPassword: { enabled: false },
    socialProviders: {
      google: {
        clientId: settings.clientId, clientSecret: settings.clientSecret,
        prompt: "select_account", accessType: "online",
        disableDefaultScope: true, scope: ["openid", "email", "profile"],
      },
    },
    account: { accountLinking: { enabled: false }, encryptOAuthTokens: true },
    databaseHooks: { user: { create: { before: async (user) => {
      if (!newUserIds) return { data: user };
      const id = crypto.randomUUID();
      newUserIds.add(id);
      return { data: { ...user, id } };
    } } } },
    user: { validateUserInfo: async ({ user, source }) => {
      if (source.oauth?.providerId !== "google" || typeof user.email !== "string" ||
          !admittedGoogleEmail(user.email, user.emailVerified === true, settings.policy))
        throw new APIError("FORBIDDEN", { message: "Use a verified Google account allowed by this campus board." });
    } },
    session: {
      expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24,
      cookieCache: { enabled: false },
    },
    advanced: {
      cookiePrefix: "vitfind", useSecureCookies: settings.baseURL.startsWith("https:"),
      ipAddress: { ipAddressHeaders: ["cf-connecting-ip"] },
    },
    rateLimit: { enabled: true, storage: "database", window: 60, max: 100 },
  });
}
