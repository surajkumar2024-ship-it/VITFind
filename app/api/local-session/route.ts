import { env } from "cloudflare:workers";
import { localDemoEnabled } from "@/lib/local-demo";
import { localDemoAccounts, localDemoCookie, localDemoToken, localDemoWriteAllowed, tokenHash } from "@/lib/local-demo-policy";
export const dynamic = "force-dynamic";
const json = (data: unknown, status = 200, cookie?: string) => Response.json(data, {
  status, headers: { "Cache-Control": "no-store", ...(cookie ? { "Set-Cookie": cookie } : {}) },
});

export async function POST(request: Request) {
  if (!localDemoEnabled(request.url, request.headers)) return json({ error: "Not found." }, 404);
  if (!localDemoWriteAllowed(request)) return json({ error: "Open the local app and try again." }, 403);
  if (!env.DB) return json({ error: "Local storage is unavailable. Restart the local launcher." }, 503);
  try {
    const raw = await request.text();
    if (raw.length > 256) return json({ error: "Request too large." }, 413);
    const body = JSON.parse(raw);
    if (!body || typeof body !== "object" || Array.isArray(body) ||
        Object.keys(body).some(key => !["action", "account"].includes(key)) ||
        !["signin", "signout"].includes(body.action)) return json({ error: "Choose a demo account." }, 400);
    if (body.action === "signin" && (typeof body.account !== "string" || !Object.hasOwn(localDemoAccounts, body.account)))
      return json({ error: "Choose a demo account." }, 400);
    const previous = localDemoToken(request.headers);
    await env.DB.prepare("DELETE FROM local_demo_sessions WHERE tokenHash=? OR expiresAt<=?")
      .bind(previous ? await tokenHash(previous) : "", Date.now()).run();
    const cookieOptions = "; Path=/; HttpOnly; SameSite=Strict";
    if (body.action === "signout") return json({ ok: true }, 200, `${localDemoCookie}=; Max-Age=0${cookieOptions}`);
    const token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(byte => byte.toString(16).padStart(2, "0")).join("");
    const maxAge = 7 * 24 * 60 * 60;
    await env.DB.prepare("INSERT INTO local_demo_sessions(tokenHash,account,expiresAt) VALUES(?,?,?)")
      .bind(await tokenHash(token), body.account, Date.now() + maxAge * 1000).run();
    return json({ ok: true }, 200, `${localDemoCookie}=${token}; Max-Age=${maxAge}${cookieOptions}`);
  } catch {
    return json({ error: "Local login could not complete. Restart the local launcher and try again." }, 503);
  }
}
