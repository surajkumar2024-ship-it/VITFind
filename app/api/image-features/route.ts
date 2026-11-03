import { z } from "zod/v3";
import { identity, checkOrigin, rows, one, stmt, ok, failure, AppError } from "@/lib/server";
import { VISION_KEY } from "@/lib/vision-config";

const imagePath = z.string().regex(/^\/(?:api\/media\/[a-f0-9-]{36}|images\/[a-z-]+\.jpg)$/);
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const { scope, actor, isModerator } = await identity(request);
    const raw = await request.text();
    if (raw.length > 24000) throw new AppError("Image feature request is too large.", 413);
    const body = JSON.parse(raw);
    if (body.action === "read") {
      const images = z.array(imagePath).max(24).parse(body.images);
      if (!images.length) return ok({ features: {} });
      const records = await rows<{image:string;embedding:string}>(
        `SELECT f.image,f.embedding FROM image_features f WHERE f.scope=? AND f.model=? AND f.image IN (${images.map(()=>"?").join(",")}) AND (EXISTS (SELECT 1 FROM reports r WHERE r.scope=f.scope AND r.image=f.image AND (r.status!='hidden' OR r.owner=? OR ?=1)) OR EXISTS (SELECT 1 FROM uploads u WHERE u.scope=f.scope AND '/api/media/'||u.id=f.image AND u.actor=?))`,
        scope,VISION_KEY,...images,actor,isModerator?1:0,actor);
      return ok({features:Object.fromEntries(records.map(r=>[r.image,JSON.parse(r.embedding)]))});
    }
    if (body.action !== "write") throw new AppError("Unknown image feature action.");
    const image = imagePath.parse(body.image);
    const embedding = z.array(z.number().finite().min(-1).max(1)).length(512).parse(body.embedding);
    const norm = Math.hypot(...embedding);
    if (norm < 0.95 || norm > 1.05) throw new AppError("Image features must be normalized.");
    const upload = image.startsWith("/api/media/") && await one("SELECT id FROM uploads WHERE scope=? AND id=? AND actor=?",scope,image.split("/").pop(),actor);
    const ownedReport = await one("SELECT id FROM reports WHERE scope=? AND image=? AND owner=?",scope,image,actor);
    if (!upload && !ownedReport) throw new AppError("Only your own report photos can be indexed.",403);
    await stmt("INSERT INTO image_features(scope,image,model,embedding,actor,createdAt) VALUES(?,?,?,?,?,?) ON CONFLICT(scope,image,model) DO NOTHING",scope,image,VISION_KEY,JSON.stringify(embedding),actor,Date.now()).run();
    return ok({ok:true});
  } catch(error) {
    if(error instanceof z.ZodError || error instanceof SyntaxError) return failure(new AppError("Invalid image features."));
    return failure(error);
  }
}
