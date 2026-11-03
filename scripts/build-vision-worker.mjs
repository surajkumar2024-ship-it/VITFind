import { build } from "rolldown";
import { resolve } from "node:path";
export async function buildVisionWorker(){
  const root=process.cwd();
  await build({
    // The browser resolver works without enumerating the Windows drive root.
    // Keep WASM URLs external: Vite library mode would inline large ONNX files.
    input:resolve(root,"lib/vision.worker.ts"),platform:"browser",
    resolve:{conditionNames:["browser"]},
    transform:{target:"es2022",define:{"process.env.NODE_ENV":'"production"'}},
    output:{file:resolve(root,"public/vision-worker.js"),format:"es",codeSplitting:false,minify:true,sourcemap:false},
  });
}
