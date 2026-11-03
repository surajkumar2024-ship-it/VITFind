import { env } from "cloudflare:workers";
import { localDemoAllowed, localDemoAccounts, localDemoToken, tokenHash, type LocalDemoAccount } from "./local-demo-policy";

export function localDemoEnabled(url: string, headers: Headers) {
  return localDemoAllowed(__VITFIND_LOCAL_DEMO__, env.LOCAL_DEMO_ENABLED, url, headers);
}

export async function getLocalDemoUser(request: Request) {
  if (!localDemoEnabled(request.url, request.headers) || !env.DB) return null;
  const token = localDemoToken(request.headers);
  if (!token) return null;
  const session = await env.DB.prepare("SELECT account FROM local_demo_sessions WHERE tokenHash=? AND expiresAt>?")
    .bind(await tokenHash(token), Date.now()).first<{ account: string }>();
  return session && Object.hasOwn(localDemoAccounts, session.account)
    ? localDemoAccounts[session.account as LocalDemoAccount] : null;
}
