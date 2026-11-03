import { AutoProcessor, CLIPVisionModelWithProjection, env, RawImage } from "@huggingface/transformers";
import { VISION_MODEL, VISION_REVISION } from "./vision-config";

const local=["localhost","127.0.0.1","[::1]"].includes(self.location.hostname);
env.allowLocalModels = local;
env.localModelPath = "/vision-models/";
if (env.backends.onnx.wasm) {
  env.backends.onnx.wasm.numThreads = 1;
  env.backends.onnx.wasm.wasmPaths=local ? new URL("/vision-runtime/",self.location.origin).href : "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.31.0-dev.20260914-8d85527a0/dist/";
}
// A dedicated worker keeps model loading and inference off the interface thread.
let extractor: Promise<[Awaited<ReturnType<typeof CLIPVisionModelWithProjection.from_pretrained>>,Awaited<ReturnType<typeof AutoProcessor.from_pretrained>>]> | undefined;
async function analyse(data: {id:number; pixels:Uint8ClampedArray; width:number; height:number}) {
  try {
    extractor ??= Promise.all([CLIPVisionModelWithProjection.from_pretrained(VISION_MODEL, {
      revision: VISION_REVISION, dtype:"q8", device:"wasm", model_file_name:"vision_model",
      progress_callback: (progress) => {
        if(progress.status === "progress") self.postMessage({id:data.id,status:"progress",message:`Downloading vision model: ${Math.round(progress.progress ?? 0)}%`});
      },
    }),AutoProcessor.from_pretrained(VISION_MODEL,{revision:VISION_REVISION})]).catch(error=>{extractor=undefined;throw error;});
    self.postMessage({id:data.id,status:"progress",message:"Loading image recognition…"});
    const [model,processor]=await extractor;
    self.postMessage({id:data.id,status:"progress",message:"Comparing visual features…"});
    const inputs=await processor(new RawImage(data.pixels,data.width,data.height,4));
    const result=(await model(inputs)).image_embeds;
    const embedding=Array.from(result.data, Number);
    if(embedding.length!==512 || embedding.some(v=>!Number.isFinite(v)))throw Error("Unexpected vision model output.");
    const norm=Math.hypot(...embedding);
    if(!norm)throw Error("This photo could not be analysed.");
    self.postMessage({id:data.id,status:"complete",embedding:embedding.map(v=>v/norm)});
  } catch(error) {
    self.postMessage({id:data.id,status:"error",message:error instanceof Error?error.message:"Image recognition failed."});
  }
}
let queue=Promise.resolve();
self.onmessage=(event:MessageEvent)=>{queue=queue.then(()=>analyse(event.data));};
