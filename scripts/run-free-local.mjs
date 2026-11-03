import './sites-env.mjs';
import { spawnSync } from 'node:child_process';
import { createServer } from 'node:net';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createServer as createViteServer } from 'vite';
const port = 5175;
await new Promise((resolve,reject) => {
  const probe = createServer(); probe.once('error',reject);
  probe.listen({host:'127.0.0.1',port}, () => probe.close(resolve));
});
const migrated = spawnSync(process.execPath, ['--import','./scripts/sites-env.mjs',
  './node_modules/wrangler/bin/wrangler.js','d1','migrations','apply','DB','--local','--config','wrangler.free.jsonc'],
  {stdio:['ignore','inherit','inherit'],windowsHide:true});
if (migrated.error) throw migrated.error;
if (migrated.status !== 0) process.exit(migrated.status || 1);
process.env.VITFIND_WRANGLER_CONFIG='wrangler.free.jsonc';
process.env.VITFIND_LOCAL_DEMO='1';
process.env.VITFIND_FORCE_LOCAL_DEMO='1';
process.env.VINEXT_NO_DEV_LOCK='1';
const preview=await createViteServer({server:{host:'127.0.0.1',port,strictPort:true}});
await preview.listen();
preview.printUrls();
// An owned preview can shut down through a checkout-local control file, without
// depending on Task Manager or desktop keyboard control. Also clean up after QA.
const deadline=Date.now()+20*60*1000;
const stopFile=resolve('.sites-runtime/free-preview.stop');
const timer=setInterval(async()=>{
  if(!existsSync(stopFile)&&Date.now()<deadline)return;
  clearInterval(timer);
  await preview.close();
  process.exit(0);
},1000);
