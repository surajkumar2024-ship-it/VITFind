import {
  identity,
  checkOrigin,
  bucket,
  stmt,
  rows,
  ok,
  failure,
  AppError,
} from "@/lib/server";
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const { scope, actor } = await identity(request);
    if (Number(request.headers.get("content-length") ?? 0) > 3145728)
      throw new AppError("Choose a photo smaller than 3 MB.", 413);
    const data = await request.arrayBuffer();
    if (data.byteLength > 3145728 || data.byteLength < 4)
      throw new AppError("Choose a valid photo smaller than 3 MB.", 413);
    const bytes = new Uint8Array(data);
    if (!(bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255))
      throw new AppError("Please upload a JPEG image.");
    const recent = await rows(
      "SELECT id FROM uploads WHERE scope=? AND actor=? AND createdAt>? LIMIT 31",
      scope,
      actor,
      Date.now() - 3600000,
    );
    if (recent.length >= 30)
      throw new AppError("Photo limit reached. Please try again later.", 429);
    const id = crypto.randomUUID();
    await bucket().put(scope + "/" + id, data, {
      httpMetadata: { contentType: "image/jpeg" },
    });
    try {
      await stmt(
        "INSERT INTO uploads (scope,id,actor,contentType,createdAt) VALUES (?,?,?,'image/jpeg',?)",
        scope,
        id,
        actor,
        Date.now(),
      ).run();
    } catch (e) {
      await bucket().delete(scope + "/" + id);
      throw e;
    }
    return ok({ url: "/api/media/" + id });
  } catch (e) {
    return failure(e);
  }
}
