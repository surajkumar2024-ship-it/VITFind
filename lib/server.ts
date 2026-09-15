import { env } from "cloudflare:workers";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { seedReports } from "./seed";
import { personas } from "./domain";
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
export async function identity(request: Request) {
  const user = await getChatGPTUser();
  if (!user)
    throw new AppError("Sign in to open your private hackathon demo.", 401);
  const requested =
    request.headers
      .get("cookie")
      ?.match(/(?:^|;\s*)vitfind-persona=([^;]+)/)?.[1] ?? "aarav";
  const actor = personas.some((p) => p.id === requested) ? requested : "aarav";
  return { scope: user.userId, actor };
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
export async function seed(scope: string) {
  if (await one("SELECT scope FROM spaces WHERE scope = ?", scope)) return;
  const insert = seedReports().map((r) =>
    stmt(
      "INSERT OR IGNORE INTO reports (scope,id,owner,type,title,description,category,location,color,date,image,status,createdAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
      scope,
      r.id,
      r.owner,
      r.type,
      r.title,
      r.description,
      r.category,
      r.location,
      r.color,
      r.date,
      r.image,
      r.status,
      r.createdAt,
    ),
  );
  await db().batch([
    ...insert,
    stmt(
      "INSERT OR IGNORE INTO spaces (scope,createdAt) VALUES (?,?)",
      scope,
      Date.now(),
    ),
  ]);
}
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
