import { identity, seed, rows, one, ok, failure } from "@/lib/server";
import type { Report, Claim, Message, Notice, Audit } from "@/lib/domain";
export async function GET(request: Request) {
  try {
    const { scope, actor } = await identity(request);
    await seed(scope);
    const [reports, claims, saved, notifications, audit, stats] =
      await Promise.all([
        rows<Report>(
          "SELECT id,owner,type,title,description,category,location,color,date,image,status,createdAt FROM reports WHERE scope=? AND (status != 'hidden' OR owner=? OR ?='staff') ORDER BY createdAt DESC LIMIT 200",
          scope,
          actor,
          actor,
        ),
        rows<Claim>(
          "SELECT c.id,c.reportId,c.claimant,c.proof,c.status,c.createdAt,CASE WHEN c.claimant=? THEN c.code ELSE '' END as code FROM claims c JOIN reports r ON r.scope=c.scope AND r.id=c.reportId WHERE c.scope=? AND (c.claimant=? OR r.owner=? OR ?='staff') ORDER BY c.createdAt DESC LIMIT 100",
          actor,
          scope,
          actor,
          actor,
          actor,
        ),
        rows<{
          reportId: string;
        }>(
          "SELECT reportId FROM saved WHERE scope=? AND actor=?",
          scope,
          actor,
        ),
        rows<Notice>(
          "SELECT id,recipient,text,reportId,read,createdAt FROM notifications WHERE scope=? AND recipient=? ORDER BY createdAt DESC LIMIT 60",
          scope,
          actor,
        ),
        actor === "staff"
          ? rows<Audit>(
              "SELECT id,actor,action,reportId,createdAt FROM audit WHERE scope=? ORDER BY createdAt DESC LIMIT 60",
              scope,
            )
          : Promise.resolve([]),
        one<{
          open: number;
          returned: number;
          claims: number;
        }>(
          "SELECT SUM(status='open') as open,SUM(status='returned') as returned,(SELECT COUNT(*) FROM claims WHERE scope=?) as claims FROM reports WHERE scope=?",
          scope,
          scope,
        ),
      ]);
    const ids = claims.map((c) => c.id);
    const messages = ids.length
      ? await rows<Message>(
          `SELECT id,claimId,sender,text,createdAt FROM (SELECT id,claimId,sender,text,createdAt FROM messages WHERE scope=? AND claimId IN (${ids.map(() => "?").join(",")}) ORDER BY createdAt DESC LIMIT 300) ORDER BY createdAt ASC`,
          scope,
          ...ids,
        )
      : [];
    return ok({
      persona: actor,
      reports,
      claims,
      messages,
      saved: saved.map((s) => s.reportId),
      notifications,
      audit,
      stats: stats ?? { open: 0, returned: 0, claims: 0 },
    });
  } catch (e) {
    return failure(e);
  }
}
