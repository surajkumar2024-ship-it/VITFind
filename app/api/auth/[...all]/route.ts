import { getAuth } from "@/lib/auth";
import { env } from "cloudflare:workers";
import { cleanupIncompleteSignup } from "@/lib/auth-recovery";
export const dynamic = "force-dynamic";

async function handle(request: Request) {
  const newUserIds = new Set<string>();
  const auth = getAuth(newUserIds);
  if (!auth) return Response.json({ message: "Google sign-in is not configured yet. Please contact the site owner." },
    { status: 503, headers: { "Cache-Control": "no-store" } });
  try {
    const handled = await auth.handler(request);
    const response = new Response(handled.body, handled);
    response.headers.set("Cache-Control", "no-store");
    return response;
  } finally {
    if (env.DB) await cleanupIncompleteSignup(env.DB, newUserIds);
  }
}
export const GET = handle;
export const POST = handle;
