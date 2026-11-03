import { env } from "cloudflare:workers";
import { AppError, bucket, db, one, stmt } from "./server";
import { photoByteLimit } from "./media-policy";

export async function readPhotoBody(request: Request) {
  const limit = photoByteLimit(env.MEDIA_STORAGE);
  const message = env.MEDIA_STORAGE === "d1" ? "Choose a photo smaller than 512 KB." : "Choose a photo smaller than 3 MB.";
  if (Number(request.headers.get("content-length") ?? 0) > limit) throw new AppError(message, 413);
  const reader = request.body?.getReader();
  if (!reader) throw new AppError("Choose a valid JPEG photo.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) { await reader.cancel(); throw new AppError(message, 413); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  if (size < 4 || bytes[0] !== 255 || bytes[1] !== 216 || bytes[2] !== 255)
    throw new AppError("Please upload a JPEG image.");
  return bytes.buffer;
}

export async function savePhoto(scope: string, actor: string, id: string, data: ArrayBuffer) {
  const createdAt = Date.now();
  const metadata = stmt("INSERT INTO uploads (scope,id,actor,contentType,createdAt) VALUES (?,?,?,'image/jpeg',?)", scope, id, actor, createdAt);
  if (env.MEDIA_STORAGE === "d1") {
    try {
      // D1 batches are transactional. The quota trigger also serializes
      // simultaneous uploads, so failures cannot leave orphan upload metadata.
      await db().batch([
        metadata,
        stmt("INSERT INTO photo_blobs (scope,id,data,byteLength,createdAt) VALUES (?,?,?,?,?)", scope, id, data, data.byteLength, createdAt),
      ]);
    } catch (error) {
      if (error instanceof Error && error.message.includes("PHOTO_STORAGE_FULL"))
        throw new AppError("Photo storage is full. You can still publish a report without a photo.", 507);
      throw error;
    }
    return;
  }
  await bucket().put(scope + "/" + id, data, { httpMetadata: { contentType: "image/jpeg" } });
  try { await metadata.run(); }
  catch (error) { await bucket().delete(scope + "/" + id); throw error; }
}

export async function readPhoto(scope: string, id: string) {
  if (env.MEDIA_STORAGE === "d1") {
    const image = await one<{ data: number[] | ArrayBuffer }>("SELECT data FROM photo_blobs WHERE scope=? AND id=?", scope, id);
    if (!image) return null;
    return image.data instanceof ArrayBuffer ? image.data : new Uint8Array(image.data).buffer;
  }
  return (await bucket().get(scope + "/" + id))?.body ?? null;
}
