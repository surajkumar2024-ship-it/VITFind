import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { resolve } from "node:path";
import type { Plugin } from "vite";
import { buildVisionWorker } from "./build-vision-worker.mjs";

// Only these public model/runtime files are served; no arbitrary filesystem paths.
export function localVisionAssets():Plugin {
  return {name:"vitfind-local-vision-assets",apply:"serve",async handleHotUpdate(context){
    if(/lib[\\/]vision(?:\.worker|-config)\.ts$/.test(context.file)){
      await buildVisionWorker();context.server.ws.send({type:"full-reload"});
    }
  },configureServer(server){
    server.middlewares.use(async(req,res,next)=>{
      const url=req.url?.split("?")[0]??"";
      let filename:string|undefined;
      const modelPrefix="/vision-models/Xenova/clip-vit-base-patch32/";
      const models=["config.json","preprocessor_config.json","onnx/vision_model_quantized.onnx"];
      const runtimes=["ort-wasm-simd-threaded.mjs","ort-wasm-simd-threaded.wasm","ort-wasm-simd-threaded.jsep.mjs","ort-wasm-simd-threaded.jsep.wasm","ort-wasm-simd-threaded.asyncify.mjs","ort-wasm-simd-threaded.asyncify.wasm","ort-wasm-simd-threaded.jspi.mjs","ort-wasm-simd-threaded.jspi.wasm"];
      if(url.startsWith(modelPrefix)&&models.includes(url.slice(modelPrefix.length)))filename=resolve(".sites-runtime/vision-cache/Xenova/clip-vit-base-patch32",url.slice(modelPrefix.length));
      else if(url.startsWith("/vision-runtime/")&&runtimes.includes(url.slice("/vision-runtime/".length))){
        const name=url.slice("/vision-runtime/".length);
        filename=resolve(name==="ort-wasm-simd-threaded.jsep.mjs"?"node_modules/@huggingface/transformers/dist":"node_modules/onnxruntime-web/dist",name);
      }else if(!url.startsWith("/vision-models/")&&!url.startsWith("/vision-runtime/"))return next();
      if(!filename){res.statusCode=404;res.end();return;}
      try{
        const info=await stat(filename);
        res.setHeader("Content-Length",info.size);
        res.setHeader("Content-Type",filename.endsWith(".json")?"application/json":filename.endsWith(".wasm")?"application/wasm":filename.endsWith(".mjs")?"text/javascript":"application/octet-stream");
        res.setHeader("Cache-Control","public, max-age=3600");
        if(req.method==="HEAD"){res.end();return;}
        createReadStream(filename).on("error",()=>res.destroy()).pipe(res);
      }catch{res.statusCode=404;res.end();}
    });
  }};
}
