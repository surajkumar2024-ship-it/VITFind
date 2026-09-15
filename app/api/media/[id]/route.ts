import { identity, bucket, one, failure, AppError } from "@/lib/server";
export async function GET(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  try {
    const { scope, actor, isModerator } = await identity(request);
    const { id } = await params;
    if (!/^[a-f0-9-]{36}$/.test(id))
      throw new AppError("Photo unavailable.", 404);
    const upload = await one<{
      actor: string;
    }>("SELECT actor FROM uploads WHERE scope=? AND id=?", scope, id);
    if (!upload) throw new AppError("Photo unavailable.", 404);
    if (
      upload.actor !== actor &&
      !isModerator &&
      !(await one("SELECT id FROM profiles WHERE avatar=?", "/api/media/" + id)) &&
      !(await one(
        "SELECT id FROM reports WHERE scope=? AND image=? AND status!='hidden'",
        scope,
        "/api/media/" + id,
      ))
    )
      throw new AppError("Photo unavailable.", 403);
    const image = await bucket().get(scope + "/" + id);
    if (!image) throw new AppError("Photo unavailable.", 404);
    return new Response(image.body, {
      headers: {
        "Content-Type": "image/jpeg",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private,no-store",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  } catch (e) {
    return failure(e);
  }
}
