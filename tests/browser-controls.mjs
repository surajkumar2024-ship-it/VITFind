import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'C:/Users/suraj/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const origin=process.env.VITFIND_TEST_ORIGIN||'http://127.0.0.1:5173';
assert.ok(['127.0.0.1','localhost'].includes(new URL(origin).hostname));
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1000}});
const page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('response',r=>{if(r.status()>=400&&/\.(?:js|tsx?|mjs)(?:\?|$)|virtual:/.test(r.url()))errors.push(`${r.status()} ${r.url()}`);});
page.setDefaultTimeout(30000);
const id=crypto.randomUUID(),title='QA button controls '+id;
let created=false;
const close=async()=>{await page.getByRole('dialog').getByRole('button',{name:'Close',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});};
try {
  assert.equal((await page.goto(origin)).status(),200);
  await page.getByRole('button',{name:'Enter local app',exact:true}).click();
  await page.getByRole('button',{name:'My profile',exact:true}).waitFor();
  const state=await (await page.request.get(origin+'/api/state')).json();
  const sample=state.reports[0];assert.ok(sample);
  const response=await page.request.post(origin+'/api/actions',{headers:{Origin:origin},data:{action:'report',report:{...sample,id,title,description:'Temporary browser button verification, not a real lost item.',image:'',latitude:null,longitude:null,locationNote:'',type:'lost'}}});
  assert.equal(response.status(),200);created=true;
  await page.reload();
  await page.getByRole('button',{name:'Filters',exact:true}).click();
  await page.getByRole('combobox',{name:'Filter by status'}).click();
  await page.getByRole('option',{name:'All statuses',exact:true}).click();
  await page.getByRole('button',{name:'Reset filters',exact:true}).click();
  await page.getByRole('combobox',{name:'Sort items'}).click();
  await page.getByRole('option',{name:'Oldest first',exact:true}).click();
  await page.getByRole('combobox',{name:'Sort items'}).click();
  await page.getByRole('option',{name:'Newest first',exact:true}).click();
  await page.getByRole('textbox',{name:'Search items'}).fill(title);
  await page.getByRole('button',{name:'Save '+title,exact:true}).click();
  await page.getByRole('button',{name:'Unsave '+title,exact:true}).waitFor();
  assert.ok((await (await page.request.get(origin+'/api/state')).json()).saved.includes(id));
  await page.getByRole('button',{name:'Clear search',exact:true}).click();
  for(const [button,heading] of [['Saved items','Keep an eye on these.'],['My reports','Your items, their journey.'],['Matches','A familiar find?'],['Messages','A conversation closer.'],['Incoming claims','Incoming claims.'],['Explore','Lost it? Let’s find it.']]) {
    await page.getByRole('button',{name:button,exact:true}).first().click();
    await page.getByRole('heading',{name:heading,exact:true}).waitFor();
  }
  await page.getByRole('button',{name:'View '+title,exact:true}).click();
  await page.getByRole('heading',{name:'Item details',exact:true}).waitFor();
  await close();
  await page.getByRole('button',{name:'How it works',exact:false}).first().click();
  await page.getByRole('heading',{name:'A small act. A happy reunion.',exact:true}).waitFor();
  await close();
  await page.getByRole('button',{name:'Notifications',exact:true}).click();
  await page.getByRole('button',{name:'Refresh notifications',exact:true}).click();
  await close();
  await page.getByRole('button',{name:'My profile',exact:true}).click();
  assert.equal(await page.getByRole('textbox',{name:'Display name',exact:true}).inputValue(),state.user.name);
  await page.getByRole('button',{name:'Save profile',exact:true}).click();
  await page.getByRole('dialog').waitFor({state:'hidden'});
  await page.setViewportSize({width:390,height:844});
  for(const [button,heading] of [['My items','Your items, their journey.'],['Messages','A conversation closer.'],['Explore','Lost it? Let’s find it.']]) {
    await page.getByRole('navigation',{name:'Mobile navigation'}).getByRole('button',{name:button,exact:true}).click();
    await page.getByRole('heading',{name:heading,exact:true}).waitFor();
  }
  await page.getByRole('navigation',{name:'Mobile navigation'}).getByRole('button',{name:'Account',exact:true}).click();
  await page.getByRole('button',{name:'Log out',exact:true}).click();
  await page.getByRole('button',{name:'Enter local app',exact:true}).waitFor();
  assert.equal((await page.request.get(origin+'/api/state')).status(),401);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({passed:true,origin,navigation:true,search:true,filters:true,sorting:true,save:true,details:true,help:true,notifications:true,profile:true,mobileNavigation:true,logout:true}));
} catch(error) {
  console.error((await page.locator('body').innerText()).slice(0,3000),errors);throw error;
} finally {
  await context.close();await browser.close();
  if(created){
    const sql=`DELETE FROM saved WHERE scope='vitfind-local-demo-v1' AND reportId='${id}'; DELETE FROM reports WHERE scope='vitfind-local-demo-v1' AND owner='local-demo:student' AND title LIKE 'QA button controls %' AND id='${id}'; DELETE FROM audit WHERE scope='vitfind-local-demo-v1' AND reportId='${id}';`;
    const result=spawnSync(process.execPath,['--import','./scripts/sites-env.mjs','./node_modules/wrangler/bin/wrangler.js','d1','execute','DB','--local','--config','wrangler.jsonc','--command',sql],{cwd:resolve(import.meta.dirname,'..'),encoding:'utf8',windowsHide:true});
    assert.equal(result.status,0,'Temporary QA cleanup must complete.');
  }
}
