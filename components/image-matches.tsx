"use client";
import { useEffect, useRef, useState } from "react";
import { Image, LoaderCircle, MapPin, ArrowUpRight, ScanSearch } from "lucide-react";
import { cosineSimilarity, distanceMetres, type Report } from "@/lib/domain";
import { VISUAL_MATCH_THRESHOLD } from "@/lib/vision-config";
import { imageFeatures, loadStoredFeatures } from "@/lib/vision-client";

type Match={report:Report;similarity:number};
export default function ImageMatches({reports,actor,source:fixedSource,onOpen,onReport}:{reports:Report[];actor:string;source?:Report;onOpen:(id:string)=>void;onReport?:()=>void}){
  const sources=fixedSource?[fixedSource]:reports.filter(r=>r.owner===actor&&r.type==="lost"&&r.status==="open");
  const [sourceId,setSourceId]=useState(sources[0]?.id??""),[busy,setBusy]=useState(false),[status,setStatus]=useState(""),[error,setError]=useState(""),[results,setResults]=useState<Match[]>([]),[compared,setCompared]=useState(0);
  const cancelled=useRef(false), active=useRef(false);
  const source=fixedSource??sources.find(r=>r.id===sourceId)??sources[0];
  const candidates=source?reports.filter(r=>r.type!==source.type&&r.status==="open"&&r.id!==source.id&&r.image).sort((a,b)=>Number(b.category===source.category)-Number(a.category===source.category)||b.createdAt-a.createdAt):[];
  useEffect(()=>{cancelled.current=false;return()=>{cancelled.current=true;};},[]);
  useEffect(()=>{setResults([]);setCompared(0);setError("");setStatus("");},[source?.id,source?.image]);
  async function compare(){
    if(!source?.image||active.current)return;
    active.current=true;setBusy(true);setError("");
    const batch=candidates.slice(compared,compared+24);let done=0,failed=0;
    try{
      await loadStoredFeatures([source.image,...batch.map(r=>r.image)],actor);
      const embedding=await imageFeatures(source.image,actor,message=>{if(!cancelled.current)setStatus(message);},source.owner===actor);
      const found:Match[]=[];
      for(const candidate of batch){
        if(cancelled.current)break;
        setStatus(`Comparing photo ${done+1} of ${batch.length}…`);
        try{
          const features=await imageFeatures(candidate.image,actor,()=>{},candidate.owner===actor);
          const similarity=cosineSimilarity(embedding,features);
          if(similarity!==null&&similarity>=VISUAL_MATCH_THRESHOLD)found.push({report:candidate,similarity});
        }catch{failed++;}
        done++;
      }
      if(!cancelled.current){setResults(old=>[...old,...found].sort((a,b)=>b.similarity-a.similarity));setCompared(old=>old+done);setStatus(`Compared ${compared+done} of ${candidates.length} available photos.`);if(failed)setError(`${failed} photo${failed===1?" was":"s were"} unavailable. Other photos were compared.`);}
    }catch(e){if(!cancelled.current)setError(e instanceof Error?e.message:"Comparison failed. Please retry.");}
    finally{active.current=false;if(!cancelled.current)setBusy(false);}
  }
  if(!source)return <div className="vision-empty"><ScanSearch size={28}/><h3>Find it by its photo.</h3><p>Add a lost report with a clear item photo to compare it with found items.</p>{onReport&&<button className="primary" onClick={onReport}>Report a lost item</button>}</div>;
  return <section className="image-matching" aria-label="Image recognition matching">
    <div className="vision-intro"><ScanSearch size={23}/><div><h3>Compare the actual photos</h3><p>CLIP image recognition compares shape and visual appearance. A similarity score is a lead, not proof of ownership.</p></div></div>
    {!fixedSource&&<label className="field">Your lost item<select aria-label="Lost item to compare" value={source.id} disabled={busy} onChange={e=>setSourceId(e.target.value)}>{sources.map(r=><option key={r.id} value={r.id}>{r.title}</option>)}</select></label>}
    {source.image?<div className="vision-source"><img src={source.image} alt={`Photo of ${source.title}`}/><div><strong>{source.title}</strong><p>{source.location}</p></div></div>:<p className="map-help">This report has no photo. Edit it and upload a photo to use image comparison.</p>}
    <p className="vision-download">First use downloads the vision model (about 90 MB), then caches it in this browser. Photos are processed on your device. Compare up to 24 photos per batch.</p>
    <button className="primary" type="button" disabled={busy||!source.image||!candidates.length||(compared>=candidates.length&&compared>0)} onClick={()=>void compare()}>{busy?<LoaderCircle className="spin" size={18}/>:<Image size={18}/>} {busy?"Comparing photos…":compared>0&&compared<candidates.length?"Compare next photos":"Compare photos"}</button>
    {!candidates.length&&<p className="map-help">No opposite-type reports with photos are available yet.</p>}
    {status&&<p className="vision-status" role="status" aria-live="polite">{status}</p>}
    {error&&<p className="field-error" role="alert">{error}</p>}
    {compared>0&&!results.length&&!busy&&<p className="vision-empty">No close visual matches in the photos compared so far. Try a clearer photo or compare the next batch.</p>}
    <div className="vision-results">{results.map(({report,similarity})=>{const distance=distanceMetres(source,report);return <button key={report.id} className="vision-result" onClick={()=>onOpen(report.id)}><img src={report.image} alt={report.title}/><div><span className="visual-score">Visual similarity {Math.round(similarity*100)}%</span><h3>{report.title}</h3><p><MapPin size={14}/>{report.location}{distance!==null&&` · ${distance<1000?Math.round(distance)+" m":(distance/1000).toFixed(1)+" km"} apart`}</p></div><ArrowUpRight size={19}/></button>;})}</div>
  </section>;
}
