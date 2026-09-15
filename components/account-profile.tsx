"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Camera, LoaderCircle, LogOut, ShieldCheck, UserRound } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { initialsOf, type Profile } from "@/lib/domain";

export default function AccountProfile({open,onOpenChange,profile,busy,save,signOutPath}: {
  open:boolean; onOpenChange:(open:boolean)=>void; profile:Profile & {email:string}; busy:boolean;
  save:(profile:Pick<Profile,"name"|"avatar"|"course"|"year"|"bio">)=>Promise<boolean>; signOutPath:string;
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
      const bitmap=await createImageBitmap(file,{imageOrientation:"from-image"});
      const scale=Math.min(1,640/Math.max(bitmap.width,bitmap.height));
      const canvas=document.createElement("canvas");canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
      canvas.getContext("2d")!.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
      const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error("Could not read this photo.")),"image/jpeg",0.85));
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
          <label className="field">Sign-in email<input type="email" value={profile.email} readOnly/><small>Private. Managed by your sign-in account.</small></label>
          <div className="form-grid"><label className="field">Course / department<input maxLength={80} placeholder="e.g. B.Tech Computer Science" value={draft.course} onChange={e=>field("course",e.target.value)}/></label>
            <div className="field"><label id="profile-year-label">Year</label><Select value={draft.year||"none"} onValueChange={v=>field("year",v==="none"?"":v)}><SelectTrigger aria-labelledby="profile-year-label"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="none">Not specified</SelectItem>{["1","2","3","4","5","6","Alumni"].map(y=><SelectItem key={y} value={y}>{y==="Alumni"?y:"Year "+y}</SelectItem>)}</SelectContent></Select></div></div>
          <label className="field">About me<textarea rows={3} maxLength={240} placeholder="A short introduction (optional)" value={draft.bio} onChange={e=>field("bio",e.target.value)}/><small>{draft.bio.length}/240 characters</small></label>
          <div className="account-note"><ShieldCheck size={18}/><p>VIT Vellore · {profile.role==="moderator"?"Moderator":"Member"}<small>Signed in with ChatGPT. This does not verify university enrollment. Only your name and photo appear on reports.</small></p></div>
          <button className="primary full" disabled={busy||uploading||draft.name.trim().length<2}>{busy||uploading?<LoaderCircle className="spin" size={17}/>:<UserRound size={17}/>} {busy?"Saving…":uploading?"Uploading photo…":"Save profile"}</button>
        </fieldset>
      </form>
      <a className="signout-link" href={signOutPath} target="_top"><LogOut size={17}/> Log out</a>
    </DialogContent>
  </Dialog>;
}
