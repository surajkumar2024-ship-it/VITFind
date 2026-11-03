import { readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve, relative, extname } from 'node:path';
import { createRequire } from 'node:module';
import { randomBytes } from 'node:crypto';

// Use the same content hash and asset protocol as the pinned Wrangler runtime.
const require = createRequire(new URL('../node_modules/wrangler/package.json',import.meta.url));
const { hash } = require('blake3-wasm');
const mime = {
  '.js':'application/javascript','.mjs':'application/javascript','.css':'text/css',
  '.html':'text/html','.json':'application/json','.png':'image/png','.jpg':'image/jpeg',
  '.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.ico':'image/x-icon',
  '.woff':'font/woff','.woff2':'font/woff2','.txt':'text/plain','.wasm':'application/wasm',
};
async function files(directory) {
  const result=[];
  for (const entry of await readdir(directory,{withFileTypes:true})) {
    if (entry.isSymbolicLink()) continue;
    const filename=resolve(directory,entry.name);
    if(entry.isDirectory()) result.push(...await files(filename));
    else if(entry.isFile()) result.push(filename);
  }
  return result;
}

export async function uploadFreeWorker(config, built, googleSecret) {
  const auth=await readFile('.sites-runtime/cloudflare-config/.wrangler/config/default.toml','utf8');
  const token=process.env.CLOUDFLARE_API_TOKEN || auth.match(/^oauth_token\s*=\s*"([^"]+)"/m)?.[1];
  if(!token) throw Error('Cloudflare login is required.');
  const account=config.account_id, worker=config.name;
  const newAuthSecret=randomBytes(48).toString('base64url');
  function redacted(message) {
    return [token,googleSecret,newAuthSecret].reduce((value,secret)=>value.replaceAll(secret,'[redacted]'),String(message));
  }
  async function api(resource,{method='GET',body,bearer=token,allowMissing=false}={}) {
    const response=await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/${resource}`,{
      method,headers:{Authorization:`Bearer ${bearer}`,...(body&&!(body instanceof FormData)?{'Content-Type':'application/json'}:{})},
      body:body instanceof FormData?body:body?JSON.stringify(body):undefined,
      signal:AbortSignal.timeout(60000),
    });
    const value=await response.json();
    if(allowMissing&&response.status===404)return null;
    if(!value.success)throw Error(redacted(`Cloudflare ${response.status}: ${value.errors?.map(e=>`${e.code}: ${e.message}`).join('; ')}`).slice(0,1800));
    return value.result;
  }
  const clientDirectory=resolve('dist/client');
  const serverDirectory=resolve('dist/server');
  const ignore=(await readFile(resolve(clientDirectory,'.assetsignore'),'utf8')).split(/\r?\n/).map(v=>v.trim()).filter(v=>v&&!v.startsWith('#'));
  if(ignore.some(v=>/[*!?]/.test(v)))throw Error('The asset ignore file needs explicit parsing before upload.');
  const localSecrets=(await readFile('.dev.vars','utf8')).split(/\r?\n/).filter(v=>/^(GOOGLE_CLIENT_SECRET|BETTER_AUTH_SECRET)=/.test(v)).map(v=>v.slice(v.indexOf('=')+1).trim().replace(/^["']|["']$/g,''));
  const manifest={}, byHash=new Map();
  for(const filename of await files(clientDirectory)) {
    const name=relative(clientDirectory,filename).replaceAll('\\','/');
    if(name.split('/').some(part=>part.startsWith('.'))||ignore.some(rule=>name===rule||name.startsWith(rule+'/')))continue;
    const content=await readFile(filename);
    if(content.length>25*1024*1024)throw Error('A static asset exceeds the Cloudflare limit.');
    if(localSecrets.some(secret=>secret&&content.includes(Buffer.from(secret))))throw Error('A secret was found in a public asset. Upload blocked.');
    const extension=extname(filename).slice(1);
    const key=hash(content.toString('base64')+extension).toString('hex').slice(0,32);
    manifest['/'+name]={hash:key,size:content.length};
    byHash.set(key,{content,type:mime[extname(filename)]||'application/octet-stream'});
  }
  console.log(`Preparing ${Object.keys(manifest).length} public assets.`);
  const session=await api(`workers/scripts/${worker}/assets-upload-session`,{method:'POST',body:{manifest}});
  let completion=session.buckets.flat().length===0?session.jwt:null;
  for(const bucket of session.buckets) {
    if(!bucket.length)continue;
    const form=new FormData();
    for(const key of bucket) {
      const asset=byHash.get(key);
      if(!asset)throw Error('Cloudflare requested an asset outside the verified manifest.');
      form.append(key,new File([asset.content.toString('base64')],key,{type:asset.type}),key);
    }
    const uploaded=await api('workers/assets/upload?base64=true',{method:'POST',body:form,bearer:session.jwt});
    completion=uploaded.jwt||completion;
    console.log(`Uploaded ${bucket.length} static assets.`);
  }
  if(!completion)throw Error('Cloudflare has not confirmed the static assets upload.');
  const previous=await api(`workers/scripts/${worker}/settings`,{allowMissing:true});
  const bindings=Object.entries(config.vars).map(([name,text])=>({name,type:'plain_text',text}));
  for(const database of config.d1_databases)
    bindings.push({name:database.binding,type:'d1',id:database.database_id});
  bindings.push({name:'ASSETS',type:'assets'});
  bindings.push({name:'GOOGLE_CLIENT_SECRET',type:'secret_text',text:googleSecret});
  if(!previous?.bindings?.some(binding=>binding.name==='BETTER_AUTH_SECRET'&&binding.type==='secret_text'))
    bindings.push({name:'BETTER_AUTH_SECRET',type:'secret_text',text:newAuthSecret});
  const metadata={
    main_module:built.main,compatibility_date:config.compatibility_date,
    compatibility_flags:config.compatibility_flags,bindings,keep_bindings:['secret_text','secret_key'],
    assets:{jwt:completion,config:{html_handling:'none',not_found_handling:'none',run_worker_first:false}},
  };
  const form=new FormData();
  form.set('metadata',JSON.stringify(metadata));
  let moduleCount=0;
  for(const filename of await files(serverDirectory)) {
    if(!/\.m?js$/.test(filename))continue;
    const name=relative(serverDirectory,filename).replaceAll('\\','/');
    if(name.split('/').some(part=>part.startsWith('.')))continue;
    const content=await readFile(filename);
    if(localSecrets.some(secret=>secret&&content.includes(Buffer.from(secret))))throw Error('A secret was found in compiled code. Upload blocked.');
    form.set(name,new File([content],name,{type:'application/javascript+module'}),name);
    moduleCount++;
  }
  console.log(`Uploading ${moduleCount} compiled Worker modules.`);
  const deployed=await api(`workers/scripts/${worker}`,{method:'PUT',body:form});
  await api(`workers/scripts/${worker}/subdomain`,{method:'POST',body:{enabled:true,previews_enabled:false}});
  const receipt={url:config.vars.BETTER_AUTH_URL,deploymentId:deployed.deployment_id,moduleCount,assetCount:Object.keys(manifest).length,startupTimeMs:deployed.startup_time_ms};
  await writeFile('.sites-runtime/free-deployment-receipt.json',JSON.stringify(receipt,null,2));
  console.log(JSON.stringify(receipt,null,2));
}
