/// <reference types="vite/client" />
"use client";
import { VISION_KEY } from "./vision-config";

type Update = (message:string)=>void;
type Pending = {resolve:(embedding:number[])=>void;reject:(error:Error)=>void;update:Update;timer:ReturnType<typeof setTimeout>};
let worker: Worker|null=null, sequence=0;
const pending=new Map<number,Pending>(), cache=new Map<string,number[]>(), running=new Map<string,Promise<number[]>>();
function getWorker(){
  if(worker)return worker;
  worker=new Worker("/vision-worker.js?v="+VISION_KEY,{type:"module"});
  worker.onmessage=({data})=>{
    const request=pending.get(data.id);if(!request)return;
    if(data.status==="progress"){request.update(data.message);return;}
    clearTimeout(request.timer);pending.delete(data.id);
    if(data.status==="complete")request.resolve(data.embedding);
    else request.reject(Error(data.message||"Image recognition failed. Please retry."));
  };
  worker.onerror=()=>resetVision("Image recognition could not start. Please retry in a supported browser.");
  return worker;
}
export function resetVision(message="Image comparison stopped."){
  worker?.terminate();worker=null;
  for(const p of pending.values()){clearTimeout(p.timer);p.reject(Error(message));}
  pending.clear();running.clear();cache.clear();
}
export async function loadStoredFeatures(images:string[],scope:string){
  for(let i=0;i<images.length;i+=24){
    const response=await fetch("/api/image-features",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"read",images:images.slice(i,i+24)})});
    if(!response.ok)continue;
    const {features}=await response.json() as {features:Record<string,number[]>};
    for(const [image,embedding] of Object.entries(features))if(embedding.length===512)cache.set(scope+":"+VISION_KEY+":"+image,embedding);
  }
}
export async function imageFeatures(image:string|Blob,scope:string,update:Update=()=>{},persist=false):Promise<number[]>{
  const key=typeof image==="string"?scope+":"+VISION_KEY+":"+image:"";
  if(key&&cache.has(key)){
    const embedding=cache.get(key)!;
    if(persist&&typeof image==="string")await saveFeatures(image,embedding);
    return embedding;
  }
  if(key&&running.has(key)){
    const embedding=await running.get(key)!;
    if(persist&&typeof image==="string")await saveFeatures(image,embedding);
    return embedding;
  }
  const job=(async()=>{
    update("Preparing photo…");
    const blob=typeof image==="string"?await fetchPhoto(image):image;
    const bitmap=await createImageBitmap(blob,{imageOrientation:"from-image"});
    const scale=Math.min(1,448/Math.max(bitmap.width,bitmap.height));
    const canvas=document.createElement("canvas");canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
    const context=canvas.getContext("2d");if(!context){bitmap.close();throw Error("This browser cannot prepare photos.");}
    context.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
    const pixels=context.getImageData(0,0,canvas.width,canvas.height).data;
    const w=getWorker(),id=++sequence;
    const embedding=await new Promise<number[]>((resolve,reject)=>{
      const timer=setTimeout(()=>{pending.delete(id);reject(Error("Vision model download timed out. Check your connection and retry."));resetVision();},240000);
      pending.set(id,{resolve,reject,update,timer});
      w.postMessage({id,pixels,width:canvas.width,height:canvas.height},[pixels.buffer]);
    });
    if(key)cache.set(key,embedding);
    if(persist&&typeof image==="string"){
      await saveFeatures(image,embedding);
    }
    return embedding;
  })();
  if(key)running.set(key,job);
  try{return await job;}finally{if(key)running.delete(key);}
}
async function saveFeatures(image:string,embedding:number[]){
  const response=await fetch("/api/image-features",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"write",image,embedding})});
  if(!response.ok)throw Error("Photo analysed, but its features could not be saved. Please retry.");
}
async function fetchPhoto(image:string){
  if(!/^\/(?:api\/media\/[a-f0-9-]{36}|images\/[a-z-]+\.jpg)$/.test(image))throw Error("Choose an uploaded item photo.");
  const response=await fetch(image,{cache:"no-store"});if(!response.ok)throw Error("This photo is no longer available.");
  return response.blob();
}
