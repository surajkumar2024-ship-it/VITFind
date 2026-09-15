import { env } from "cloudflare:workers";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import type { Profile } from "./domain";
export class AppError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export const db = () => {
  if (!env.DB)
    throw new AppError(
      "The campus board is temporarily unavailable. Please try again.",
      503,
    );
  return env.DB;
};
export const bucket = () => {
  if (!env.BUCKET)
    throw new AppError("Photo storage is temporarily unavailable.", 503);
  return env.BUCKET;
};
export const stmt = (sql: string, ...args: unknown[]) =>
  db()
    .prepare(sql)
    .bind(...args);
export const rows = async <T>(sql: string, ...args: unknown[]) =>
  (await stmt(sql, ...args).all<T>()).results;
export const one = async <T>(sql: string, ...args: unknown[]) =>
  stmt(sql, ...args).first<T>();
export async function identity(_request: Request) {
  const user = await getChatGPTUser();
  if (!user)
    throw new AppError("Sign in to continue to VITFind.", 401);
  // The dispatcher verifies identity and the Site's viewer access policy.
  // Old per-user demo scopes are deliberately not copied into this shared board.
  const scope = "vitfind-campus-live-v1";
  let profile = await one<Profile>("SELECT id,name,avatar,course,year,bio,role FROM profiles WHERE id=?", user.userId);
  if (!profile) {
    await stmt("INSERT OR IGNORE INTO profiles (id,name,createdAt,updatedAt) VALUES (?,?,?,?)", user.userId, (user.fullName?.trim() || "Campus member").slice(0,60), Date.now(), Date.now()).run();
    profile = await one<Profile>("SELECT id,name,avatar,course,year,bio,role FROM profiles WHERE id=?", user.userId);
  }
  if (!profile) throw new AppError("Your account could not be loaded. Please retry.", 503);
  return { scope, actor: user.userId, profile: { ...profile, email: user.email }, isModerator: profile.role === "moderator" };
}
export function checkOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    throw new AppError("This request could not be verified.", 403);
}
export function failure(error: unknown) {
  if (error instanceof AppError)
    return Response.json(
      { error: error.message },
      { status: error.status, headers: { "Cache-Control": "no-store" } },
    );
  console.error(
    "VITFind request failed",
    error instanceof Error ? error.message : "Unknown error",
  );
  return Response.json(
    { error: "We couldn’t save that change. Please try again." },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
}
export const ok = (data: unknown) =>
  Response.json(data, { headers: { "Cache-Control": "no-store" } });
export const log = (
  scope: string,
  actor: string,
  action: string,
  reportId: string,
  id: string = crypto.randomUUID(),
  gate?: { claimId: string; token: string },
) =>
  stmt(
    "INSERT OR IGNORE INTO audit (scope,id,actor,action,reportId,createdAt) SELECT ?,?,?,?,?,?" + (gate ? " WHERE EXISTS (SELECT 1 FROM claims WHERE scope=? AND id=? AND transitionToken=?)" : ""),
    scope,
    id,
    actor,
    action,
    reportId,
    Date.now(),
    ...(gate ? [scope, gate.claimId, gate.token] : []),
  );
export const notice = (
  scope: string,
  recipient: string,
  text: string,
  reportId: string,
  id: string = crypto.randomUUID(),
  gate?: { claimId: string; token: string },
) =>
  stmt(
    "INSERT OR IGNORE INTO notifications (scope,id,recipient,text,reportId,read,createdAt) SELECT ?,?,?,?,?,0,?" + (gate ? " WHERE EXISTS (SELECT 1 FROM claims WHERE scope=? AND id=? AND transitionToken=?)" : ""),
    scope,
    id,
    recipient,
    text,
    reportId,
    Date.now(),
    ...(gate ? [scope, gate.claimId, gate.token] : []),
  );
