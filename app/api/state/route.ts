import { identity, rows, one, ok, failure } from "@/lib/server";
import type { Report, Claim, Message, Notice, Audit, Profile } from "@/lib/domain";
export async function GET(request: Request) {
  try {
    const { scope, actor, profile, isModerator } = await identity(request);
    const moderator = isModerator ? 1 : 0;
    const [reports, claims, saved, notifications, audit, stats] = await Promise.all([
      rows<Report>("SELECT id,owner,type,title,description,category,location,latitude,longitude,locationNote,color,date,image,status,createdAt FROM reports WHERE scope=? AND (status!='hidden' OR owner=? OR ?=1) ORDER BY createdAt DESC LIMIT 200", scope, actor, moderator),
      rows<Claim>("SELECT c.id,c.reportId,c.claimant,c.proof,c.status,c.createdAt,CASE WHEN c.claimant=? THEN c.code ELSE '' END as code FROM claims c JOIN reports r ON r.scope=c.scope AND r.id=c.reportId WHERE c.scope=? AND (c.claimant=? OR r.owner=? OR ?=1) ORDER BY c.createdAt DESC LIMIT 100", actor, scope, actor, actor, moderator),
      rows<{reportId:string}>("SELECT reportId FROM saved WHERE scope=? AND actor=?", scope, actor),
      rows<Notice>("SELECT id,recipient,text,reportId,read,createdAt FROM notifications WHERE scope=? AND (recipient=? OR (?=1 AND recipient='::moderators')) ORDER BY createdAt DESC LIMIT 60", scope, actor, moderator),
      isModerator ? rows<Audit>("SELECT id,actor,action,reportId,createdAt FROM audit WHERE scope=? ORDER BY createdAt DESC LIMIT 60", scope) : Promise.resolve([]),
      one<{open:number;returned:number;claims:number}>("SELECT COALESCE(SUM(status='open'),0) as open,COALESCE(SUM(status='returned'),0) as returned,(SELECT COUNT(*) FROM claims c JOIN reports r ON r.scope=c.scope AND r.id=c.reportId WHERE c.scope=? AND (r.owner=? OR ?=1)) as claims FROM reports WHERE scope=?", scope, actor, moderator, scope),
    ]);
    // Personal records must not vanish when discovery advances past the latest 200.
    const personal = await rows<Report>("SELECT id,owner,type,title,description,category,location,latitude,longitude,locationNote,color,date,image,status,createdAt FROM reports r WHERE r.scope=? AND (r.status!='hidden' OR r.owner=? OR ?=1) AND (r.owner=? OR EXISTS (SELECT 1 FROM saved s WHERE s.scope=r.scope AND s.reportId=r.id AND s.actor=?) OR EXISTS (SELECT 1 FROM claims c WHERE c.scope=r.scope AND c.reportId=r.id AND c.claimant=?))",scope,actor,moderator,actor,actor,actor);
    const seen=new Set(reports.map(r=>r.id)); for(const r of personal) if(!seen.has(r.id)){reports.push(r);seen.add(r.id);}
    const ids = claims.map(c => c.id);
    // A moderator's accessible claim can reference an older discovery record.
    for(let i=0;i<claims.length;i+=80){
      const missing=claims.slice(i,i+80).map(c=>c.reportId).filter(id=>!seen.has(id));
      if(missing.length) for(const r of await rows<Report>(`SELECT id,owner,type,title,description,category,location,latitude,longitude,locationNote,color,date,image,status,createdAt FROM reports WHERE scope=? AND id IN (${missing.map(()=>"?").join(",")}) AND (status!='hidden' OR owner=? OR ?=1)`,scope,...missing,actor,moderator)) if(!seen.has(r.id)){reports.push(r);seen.add(r.id);}
    }
    reports.sort((a,b)=>b.createdAt-a.createdAt);
    const messages:Message[]=[];
    for(let i=0;i<ids.length;i+=80) {
      const batch=ids.slice(i,i+80);
      messages.push(...await rows<Message>(`SELECT id,claimId,sender,text,createdAt FROM messages WHERE scope=? AND claimId IN (${batch.map(()=>"?").join(",")}) ORDER BY createdAt DESC LIMIT 300`,scope,...batch));
    }
    messages.sort((a,b)=>a.createdAt-b.createdAt);
    if(messages.length>300) messages.splice(0,messages.length-300);
    // Return only public display fields for participants. Emails stay private.
    const memberIds = [...new Set([actor,...reports.map(r=>r.owner),...claims.map(c=>c.claimant),...messages.map(m=>m.sender),...audit.map(a=>a.actor)])];
    const members: Pick<Profile,"id"|"name"|"avatar">[] = [];
    // D1 limits bound variables per query; chunk participant lookups.
    for (let i=0;i<memberIds.length;i+=80) {
      const batch=memberIds.slice(i,i+80);
      members.push(...await rows<Pick<Profile,"id"|"name"|"avatar">>(`SELECT id,name,avatar FROM profiles WHERE id IN (${batch.map(()=>"?").join(",")})`, ...batch));
    }
    return ok({ user: profile, members, reports, claims, messages, saved:saved.map(s=>s.reportId), notifications, audit, stats });
  } catch (e) { return failure(e); }
}
