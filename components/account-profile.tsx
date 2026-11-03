"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Camera, LoaderCircle, ShieldCheck, UserRound } from "lucide-react";
import { GoogleSignOut } from "./google-account";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { initialsOf, type Profile } from "@/lib/domain";
import { compressPhoto } from "@/lib/compress-photo";

export default function AccountProfile({open,onOpenChange,profile,busy,save,localDemo=false}: {
  open:boolean; onOpenChange:(open:boolean)=>void; profile:Profile & {email:string}; busy:boolean;
  save:(profile:Pick<Profile,"name"|"avatar"|"course"|"year"|"bio">)=>Promise<boolean>;
  localDemo?: boolean;
}) {
  const [draft,setDraft]=useState({name:"",avatar:"",course:"",year:"",bio:""});
  const [uploading,setUploading]=useState(false), [error,setError]=useState("");
  const input=useRef<HTMLInputElement>(null);
  useEffect(()=>{if(open){setDraft({name:profile.name,avatar:profile.avatar,course:profile.course,year:profile.year,bio:profile.bio});setError("");}},[open,profile.id]);
  function field(key:keyof typeof draft,value:string){setDraft(d=>({...d,[key]:value}));}
  async function photo(file:File){
    setError("");
    if(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>12*1024*1024){setError("Choose a JPG, PNG or WebP smaller than 12 MB.");return;}
    setUploading(true);
    try {
      const blob=await compressPhoto(file,640);
      const response=await fetch("/api/media",{method:"POST",headers:{"Content-Type":"image/jpeg"},body:blob});
      const result=await response.json() as {url:string;error:string};
      if(!response.ok) throw Error(result.error);
      field("avatar",result.url);
    } catch(e){setError(e instanceof Error?e.message:"Photo upload failed. Please retry.");}
    finally {setUploading(false);if(input.current) input.current.value="";}
  }
  async function submit(e:FormEvent){e.preventDefault();if(await save(draft))onOpenChange(false);}
  return <Dialog open={open} onOpenChange={o=>{if(!busy&&!uploading)onOpenChange(o);}}>
    <DialogContent className="app-dialog account-dialog">
      <DialogHeader><DialogTitle>My profile</DialogTitle><DialogDescription>Your account, your campus connections.</DialogDescription></DialogHeader>
      <form onSubmit={submit}>
        <fieldset disabled={busy||uploading}>
          <div className="profile-editor-header">
            <span className="avatar profile-photo">{draft.avatar?<img src={draft.avatar} alt="Your profile photo"/>:initialsOf(draft.name)}</span>
            <div><button type="button" className="secondary compact" onClick={()=>input.current?.click()}>{uploading?<LoaderCircle className="spin" size={16}/>:<Camera size={16}/>} Change photo</button>
              {draft.avatar&&<button type="button" className="text-action" onClick={()=>field("avatar","")}>Remove photo</button>}
              <small>JPG, PNG or WebP · up to 12 MB</small>
            </div>
            <input ref={input} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" aria-label="Upload profile photo" onChange={e=>{if(e.target.files?.[0])void photo(e.target.files[0]);}}/>
          </div>
          {error&&<p className="profile-error" role="alert">{error}</p>}
          <label className="field">Display name<input required minLength={2} maxLength={60} autoComplete="name" value={draft.name} onChange={e=>field("name",e.target.value)}/></label>
          <label className="field">{localDemo ? "Dummy email" : "Sign-in email"}<input type="email" value={profile.email} readOnly/><small>{localDemo ? "Example address only. No email is sent." : "Private. Managed by your sign-in account."}</small></label>
          <div className="form-grid"><label className="field">Course / department<input maxLength={80} placeholder="e.g. B.Tech Computer Science" value={draft.course} onChange={e=>field("course",e.target.value)}/></label>
            <div className="field"><label id="profile-year-label">Year</label><Select value={draft.year||"none"} onValueChange={v=>field("year",v==="none"?"":v)}><SelectTrigger aria-labelledby="profile-year-label"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="none">Not specified</SelectItem>{["1","2","3","4","5","6","Alumni"].map(y=><SelectItem key={y} value={y}>{y==="Alumni"?y:"Year "+y}</SelectItem>)}</SelectContent></Select></div></div>
          <label className="field">About me<textarea rows={3} maxLength={240} placeholder="A short introduction (optional)" value={draft.bio} onChange={e=>field("bio",e.target.value)}/><small>{draft.bio.length}/240 characters</small></label>
          <div className="account-note"><ShieldCheck size={18}/><p>VIT Vellore · {profile.role==="moderator"?"Moderator":"Member"}<small>{localDemo ? "Local dummy account, not a verified student. Profile changes are saved on this computer." : "Signed in with Google. This does not verify university enrollment. Only your name and photo appear on reports."}</small></p></div>
          <button className="primary full" disabled={busy||uploading||draft.name.trim().length<2}>{busy||uploading?<LoaderCircle className="spin" size={17}/>:<UserRound size={17}/>} {busy?"Saving…":uploading?"Uploading photo…":"Save profile"}</button>
        </fieldset>
      </form>
      <GoogleSignOut disabled={busy||uploading} localDemo={localDemo}/>
    </DialogContent>
  </Dialog>;
}
