import { z } from "zod";
import {
  identity,
  checkOrigin,
  stmt,
  one,
  rows,
  db,
  log,
  notice,
  ok,
  failure,
  AppError,
} from "@/lib/server";
import {
  categories,
  locations,
  personas,
  type Report,
  type Claim,
} from "@/lib/domain";
const reportSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{1,80}$/),
  type: z.enum(["lost", "found"]),
  title: z.string().trim().min(4).max(100),
  description: z.string().trim().min(15).max(1500),
  category: z.string().refine((v) => categories.slice(1).includes(v)),
  location: z.string().refine((v) => locations.includes(v)),
  color: z.string().trim().max(40),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine(
      (v) =>
        Number.isFinite(Date.parse(v)) &&
        v <= new Date().toISOString().slice(0, 10),
    ),
  image: z.string().max(200).default(""),
});
const str = (v: unknown, min = 1, max = 100) =>
  z.string().trim().min(min).max(max).parse(v);
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const { scope, actor } = await identity(request);
    if (Number(request.headers.get("content-length") ?? 0) > 16000)
      throw new AppError("Request too large.", 413);
    const body = z.record(z.unknown()).parse(await request.json());
    const action = str(body.action);
    if (action === "persona") {
      const id = str(body.persona);
      if (!personas.some((p) => p.id === id))
        throw new AppError("Unknown demo account.");
      return Response.json(
        { ok: true },
        {
          headers: {
            "Set-Cookie": `vitfind-persona=${id}; Path=/; SameSite=Lax; HttpOnly; Max-Age=604800${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`,
            "Cache-Control": "no-store",
          },
        },
      );
    }
    if (action === "report" || action === "edit") {
      const r = reportSchema.parse(body.report);
      if (
        r.image &&
        !/^\/api\/media\/[a-f0-9-]{36}$/.test(r.image) &&
        !/^\/images\/[a-z-]+\.jpg$/.test(r.image)
      )
        throw new AppError("Choose a photo using the upload field.");
      if (r.image.startsWith("/api/media/")) {
        const upload = await one(
          "SELECT id FROM uploads WHERE scope=? AND id=? AND actor=?",
          scope,
          r.image.split("/").pop(),
          actor,
        );
        if (!upload) throw new AppError("Upload this photo again.", 403);
      }
      if (action === "edit") {
        const previous = await one<Report>(
          "SELECT * FROM reports WHERE scope=? AND id=?",
          scope,
          r.id,
        );
        if (!previous || previous.owner !== actor || previous.status !== "open")
          throw new AppError("Only your open reports can be edited.", 403);
        if (
          await one(
            "SELECT id FROM claims WHERE scope=? AND reportId=?",
            scope,
            r.id,
          )
        )
          throw new AppError(
            "A report with claims cannot be edited. Contact the help desk.",
          );
        const result = await db().batch([
          stmt(
            "UPDATE reports SET title=?,description=?,category=?,location=?,color=?,date=?,image=? WHERE scope=? AND id=? AND owner=? AND status='open' AND NOT EXISTS (SELECT 1 FROM claims WHERE scope=? AND reportId=?)",
            r.title,
            r.description,
            r.category,
            r.location,
            r.color,
            r.date,
            r.image,
            scope,
            r.id,
            actor,
            scope,
            r.id,
          ),
          log(scope, actor, "Updated report", r.id),
        ]);
        if (!result[0].meta.changes) throw new AppError("This report changed. Refresh before editing.", 409);
      } else {
        const count = await one<{
          n: number;
        }>("SELECT COUNT(*) n FROM reports WHERE scope=?", scope);
        if ((count?.n ?? 0) >= 200)
          throw new AppError("This demo board has reached its 200-item limit.");
        await db().batch([
          stmt(
            "INSERT OR IGNORE INTO reports (scope,id,owner,type,title,description,category,location,color,date,image,status,createdAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,'open',?)",
            scope,
            r.id,
            actor,
            r.type,
            r.title,
            r.description,
            r.category,
            r.location,
            r.color,
            r.date,
            r.image,
            Date.now(),
          ),
          log(scope, actor, "Created " + r.type + " report", r.id, r.id + "-created"),
        ]);
      }
      return ok({ id: r.id });
    }
    if (action === "read-notifications") {
      await stmt(
        "UPDATE notifications SET read=1 WHERE scope=? AND recipient=?",
        scope,
        actor,
      ).run();
      return ok({ ok: true });
    }
    if (action === "save") {
      const id = str(body.reportId);
      if (
        !(await one(
          "SELECT id FROM reports WHERE scope=? AND id=? AND status!='hidden'",
          scope,
          id,
        ))
      )
        throw new AppError("Item unavailable.", 404);
      if (body.saved === true)
        await stmt(
          "INSERT OR IGNORE INTO saved (scope,actor,reportId) VALUES (?,?,?)",
          scope,
          actor,
          id,
        ).run();
      else
        await stmt(
          "DELETE FROM saved WHERE scope=? AND actor=? AND reportId=?",
          scope,
          actor,
          id,
        ).run();
      return ok({ ok: true });
    }
    if (action === "claim") {
      const reportId = str(body.reportId),
        proof = str(body.proof, 15, 1500),
        id = z.string().uuid().parse(body.id);
      const r = await one<Report>(
        "SELECT * FROM reports WHERE scope=? AND id=?",
        scope,
        reportId,
      );
      if (!r || r.status !== "open" || r.type !== "found")
        throw new AppError("This item is not available to claim.");
      if (r.owner === actor || actor === "staff")
        throw new AppError(
          "Use the owner’s student account to claim this item.",
        );
      if (
        await one(
          "SELECT id FROM claims WHERE scope=? AND reportId=? AND claimant=?",
          scope,
          reportId,
          actor,
        )
      )
        throw new AppError("You already have a claim for this item.", 409);
      const gate = { claimId: id, token: id };
      const result = await db().batch([
        stmt(
          "INSERT OR IGNORE INTO claims (scope,id,reportId,claimant,proof,status,code,createdAt,transitionToken) SELECT ?,?,?,?,?,'pending','',?,? FROM reports WHERE scope=? AND id=? AND status='open' AND type='found' AND owner!=? AND NOT EXISTS (SELECT 1 FROM claims WHERE scope=? AND reportId=? AND status IN ('approved','completed'))",
          scope,
          id,
          reportId,
          actor,
          proof,
          Date.now(),
          id,
          scope,
          reportId,
          actor,
          scope,
          reportId,
        ),
        notice(
          scope,
          r.owner,
          "Someone submitted a claim for " + r.title,
          reportId,
          id + "-finder",
          gate,
        ),
        notice(scope, "staff", "Ownership review needed: " + r.title, reportId, id + "-staff", gate),
        log(scope, actor, "Submitted ownership claim", reportId, id + "-claim", gate),
      ]);
      if (!result[0].meta.changes) throw new AppError("This item was just claimed or closed. Refresh the board.", 409);
      return ok({ id });
    }
    if (action === "message") {
      const claimId = str(body.claimId),
        text = str(body.text, 1, 2000),
        id = z.string().uuid().parse(body.id);
      const c = await one<
        Claim & {
          owner: string;
        }
      >(
        "SELECT c.*,r.owner FROM claims c JOIN reports r ON r.scope=c.scope AND r.id=c.reportId WHERE c.scope=? AND c.id=?",
        scope,
        claimId,
      );
      if (!c || ![c.claimant, c.owner, "staff"].includes(actor))
        throw new AppError("Conversation unavailable.", 403);
      if (c.status === "rejected" || c.status === "completed")
        throw new AppError("This conversation is closed.");
      await db().batch([
        stmt(
          "INSERT OR IGNORE INTO messages (scope,id,claimId,sender,text,createdAt) SELECT ?,?,?,?,?,? FROM claims WHERE scope=? AND id=? AND status IN ('pending','approved')",
          scope,
          id,
          claimId,
          actor,
          text,
          Date.now(),
          scope,
          claimId,
        ),
        stmt(
          "INSERT OR IGNORE INTO notifications (scope,id,recipient,text,reportId,read,createdAt) SELECT ?,?,?,?,?,0,? WHERE EXISTS (SELECT 1 FROM messages WHERE scope=? AND id=?)",
          scope,
          id + "-message",
          actor === c.claimant ? c.owner : c.claimant,
          "New message about your item",
          c.reportId,
          Date.now(),
          scope,
          id,
        ),
      ]);
      return ok({ id });
    }
    if (action === "approve" || action === "reject" || action === "handover") {
      if (actor !== "staff")
        throw new AppError("This action belongs to the help desk.", 403);
      const id = str(body.claimId);
      const c = await one<Claim>(
        "SELECT * FROM claims WHERE scope=? AND id=?",
        scope,
        id,
      );
      if (!c) throw new AppError("Claim unavailable.", 404);
      const r = await one<Report>(
        "SELECT * FROM reports WHERE scope=? AND id=?",
        scope,
        c.reportId,
      );
      if (!r || r.status !== "open")
        throw new AppError("This item has already been closed.", 409);
      const token = crypto.randomUUID();
      const gate = { claimId: id, token };
      if (action === "handover") {
        const code = str(body.code, 6, 6);
        if (c.status !== "approved" || c.code !== code)
          throw new AppError(
            "Ask the claimant for their correct six-digit collection code.",
          );
        const result = await db().batch([
          stmt(
            "UPDATE claims SET status='completed',transitionToken=? WHERE scope=? AND id=? AND status='approved' AND code=? AND EXISTS (SELECT 1 FROM reports WHERE scope=? AND id=? AND status='open')",
            token,
            scope,
            id,
            code,
            scope,
            c.reportId,
          ),
          stmt(
            "UPDATE reports SET status='returned' WHERE scope=? AND id=? AND EXISTS (SELECT 1 FROM claims WHERE scope=? AND id=? AND transitionToken=?)",
            scope,
            c.reportId,
            scope,
            id,
            token,
          ),
          stmt(
            "UPDATE claims SET status='rejected' WHERE scope=? AND reportId=? AND id!=? AND status='pending' AND EXISTS (SELECT 1 FROM claims WHERE scope=? AND id=? AND transitionToken=?)",
            scope,
            c.reportId,
            id,
            scope,
            id,
            token,
          ),
          notice(
            scope,
            c.claimant,
            "Reunited! Your item has been returned.",
            c.reportId,
            id + "-returned-owner",
            gate,
          ),
          notice(
            scope,
            r.owner,
            "Thank you! The item reached its owner.",
            c.reportId,
            id + "-returned-finder",
            gate,
          ),
          log(scope, actor, "Confirmed handover", c.reportId, id + "-handover", gate),
        ]);
        if (!result[0].meta.changes)
          throw new AppError("This handover was already processed.", 409);
      } else {
        if (c.status !== "pending")
          throw new AppError("This claim was already reviewed.", 409);
        const code = String(
          100000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 900000),
        );
        try {
          const result = await db().batch([
            stmt(
              "UPDATE claims SET status=?,code=?,transitionToken=? WHERE scope=? AND id=? AND status='pending' AND EXISTS (SELECT 1 FROM reports WHERE scope=? AND id=? AND status='open')",
              action === "approve" ? "approved" : "rejected",
              action === "approve" ? code : "",
              token,
              scope,
              id,
              scope,
              c.reportId,
            ),
            notice(
              scope,
              c.claimant,
              action === "approve"
                ? "Claim approved! Your collection code is ready."
                : "Your claim was not approved. Contact the help desk for support.",
              c.reportId,
              id + "-review",
              gate,
            ),
            log(
              scope,
              actor,
              action === "approve" ? "Approved claim" : "Rejected claim",
              c.reportId,
              id + "-review",
              gate,
            ),
          ]);
          if (!result[0].meta.changes)
            throw new AppError("This claim was already reviewed.", 409);
        } catch (e) {
          if (e instanceof AppError) throw e;
          if (!(e instanceof Error) || !/UNIQUE constraint/i.test(e.message)) throw e;
          throw new AppError(
            "Another claim is already approved for this item.",
            409,
          );
        }
      }
      return ok({ ok: true });
    }
    if (action === "flag") {
      const id = str(body.reportId),
        reason = str(body.reason, 10, 500);
      if (
        !(await one("SELECT id FROM reports WHERE scope=? AND id=?", scope, id))
      )
        throw new AppError("Item unavailable.", 404);
      await db().batch([
        notice(scope, "staff", "Report flagged: " + reason, id),
        log(scope, actor, "Flagged report: " + reason, id),
      ]);
      return ok({ ok: true });
    }
    if (action === "hide" || action === "restore") {
      if (actor !== "staff")
        throw new AppError("Only the help desk can moderate reports.", 403);
      const id = str(body.reportId);
      await db().batch([
        stmt(
          "UPDATE reports SET status=? WHERE scope=? AND id=? AND status=?",
          action === "hide" ? "hidden" : "open",
          scope,
          id,
          action === "hide" ? "open" : "hidden",
        ),
        log(
          scope,
          actor,
          action === "hide" ? "Hid report" : "Restored report",
          id,
        ),
      ]);
      return ok({ ok: true });
    }
    throw new AppError("Unknown action.");
  } catch (e) {
    if (e instanceof z.ZodError)
      return failure(
        new AppError(e.issues[0]?.message ?? "Check the form fields."),
      );
    return failure(e);
  }
}
