import {
  identity,
  checkOrigin,
  rows,
  ok,
  failure,
  AppError,
} from "@/lib/server";
import { readPhotoBody, savePhoto } from "@/lib/media-storage";
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const { scope, actor } = await identity(request);
    const data = await readPhotoBody(request);
    const recent = await rows(
      "SELECT id FROM uploads WHERE scope=? AND actor=? AND createdAt>? LIMIT 31",
      scope,
      actor,
      Date.now() - 3600000,
    );
    if (recent.length >= 30)
      throw new AppError("Photo limit reached. Please try again later.", 429);
    const id = crypto.randomUUID();
    await savePhoto(scope, actor, id, data);
    return ok({ url: "/api/media/" + id });
  } catch (e) {
    return failure(e);
  }
}
