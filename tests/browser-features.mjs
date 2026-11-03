import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'C:/Users/suraj/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const root=resolve(import.meta.dirname,'..'), output=resolve(root,process.env.VITFIND_TEST_OUTPUT||'.sites-runtime/feature-qa');
await mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1000}});
const page=await context.newPage(), errors=[];
page.on('pageerror',error=>errors.push(error.message));
page.on('console',message=>{if(message.type()==='error'){console.error('Browser:',message.text());if(/Encountered two children|React does not recognize/.test(message.text()))errors.push(message.text());}});
page.on('requestfailed',request=>{if(/vision|huggingface|jsdelivr/.test(request.url()))console.error('Vision request failed:',request.url(),request.failure()?.errorText);});
page.setDefaultTimeout(60000);
const origin=process.env.VITFIND_TEST_ORIGIN||'http://127.0.0.1:5173';
assert.ok(['127.0.0.1','localhost'].includes(new URL(origin).hostname),'Browser QA must use a local server.');
let reportId='',pairedId='',uploadedImage='';
const freeStorage=process.env.VITFIND_TEST_CONFIG==='wrangler.free.jsonc';
try{
  const landing=await page.goto(origin,{waitUntil:'domcontentloaded',timeout:120000});
  assert.equal(landing.status(),200,'The app page must load successfully.');
  await page.getByRole('button',{name:'Enter local app',exact:true}).click();
  await page.getByRole('button',{name:'Report an item',exact:true}).first().click();
  const title='QA visual comparison '+Date.now();
  await page.getByRole('textbox',{name:'What is the item?'}).fill(title);
  await page.getByRole('textbox',{name:'Description',exact:true}).fill('Local feature test photo; this is not a real lost item.');
  const uploadResponse=page.waitForResponse(response=>response.url()===origin+'/api/media'&&response.request().method()==='POST');
  await page.getByLabel('Upload item photo').setInputFiles(resolve(root,'public/images/bottle.jpg'));
  const uploaded=await uploadResponse;
  assert.equal(uploaded.status(),200,'The photo upload must succeed.');
  uploadedImage=(await uploaded.json()).url;
  if(freeStorage){
    const photo=await page.request.get(origin+uploadedImage);
    assert.equal(photo.status(),200);
    assert.equal(photo.headers()['content-type'],'image/jpeg');
    assert.ok((await photo.body()).length<=450*1024,'Photo compression must fit the free storage limit.');
    const oversized=Buffer.alloc(512*1024+1);oversized.set([255,216,255,217]);
    const rejected=await page.request.post(origin+'/api/media',{headers:{Origin:origin,'Content-Type':'image/jpeg'},data:oversized});
    assert.equal(rejected.status(),413,'Oversized free-mode uploads must be rejected.');
    const other=await browser.newContext();
    try{
      assert.equal((await other.request.post(origin+'/api/local-session',{headers:{Origin:origin},data:{action:'signin',account:'second'}})).status(),200);
      assert.equal((await other.request.get(origin+uploadedImage)).status(),403,'Unpublished photos must remain private to their owner.');
    }finally{await other.close();}
    console.log('Free D1 photo upload, binary read, size limit and draft privacy passed.');
  }
  await page.locator('.upload-zone img').waitFor();
  await page.getByLabel('Location latitude').fill('12.971234');
  await page.getByLabel('Location longitude').fill('79.160123');
  await page.getByRole('textbox',{name:'Location details (optional)'}).fill('QA test pin near the campus library');
  await page.locator('.leaflet-container').waitFor();
  await page.screenshot({path:resolve(output,'desktop-map-form.png'),fullPage:true});
  await page.getByRole('button',{name:'Prepare visual matching',exact:true}).click();
  console.log('Checking browser image recognition…');
  await page.waitForFunction(()=>{const text=document.querySelector('.photo-analysis small')?.textContent||'';return text&& !/Optional:|Preparing|Downloading|Loading|Comparing/.test(text);},null,{timeout:120000});
  assert.equal(await page.locator('.photo-analysis small').textContent(),'Photo indexed for visual matching.');
  console.log('Browser image indexing passed.');
  await page.getByRole('button',{name:'Publish report',exact:true}).click();
  await page.getByRole('dialog').waitFor({state:'hidden'});
  const stateResponse=await page.request.get(origin+'/api/state');assert.equal(stateResponse.status(),200);
  const state=await stateResponse.json(), report=state.reports.find(r=>r.title===title);assert.ok(report);
  reportId=report.id;
  pairedId=crypto.randomUUID();
  const pairResponse=await page.request.post(origin+'/api/actions',{headers:{Origin:origin},data:{action:'report',report:{...report,id:pairedId,type:'found',title:'QA paired image comparison'}}});assert.equal(pairResponse.status(),200);
  assert.equal(report.latitude,12.971234);assert.equal(report.longitude,79.160123);assert.equal(report.locationNote,'QA test pin near the campus library');
  const invalid=await page.request.post(origin+'/api/actions',{headers:{Origin:origin},data:{action:'edit',report:{...report,latitude:91}}});assert.equal(invalid.status(),400);
  const forged=await page.request.post(origin+'/api/image-features',{headers:{Origin:origin},data:{action:'write',image:'/api/media/00000000-0000-4000-8000-000000000000',embedding:Array.from({length:512},(_,i)=>i===0?1:0)}});assert.equal(forged.status(),403);
  await page.goto(origin+'/?view=matches');
  await page.getByLabel('Lost item to compare').selectOption(reportId);
  await page.getByRole('button',{name:'Compare photos',exact:true}).click();
  await page.locator('.vision-status').filter({hasText:/Compared \d+ of/}).waitFor({timeout:300000});
  console.log('Browser visual comparison completed.');
  assert.ok(await page.locator('.vision-result').count()>0,'Expected a visual match for the bottle photo');
  await page.screenshot({path:resolve(output,'desktop-image-matches.png'),fullPage:true});
  await page.goto(origin+'/?item='+reportId);
  await page.getByRole('heading',{name:'Item details',exact:true}).waitFor();
  await page.locator('.detail-sheet .leaflet-marker-icon').waitFor();
  assert.ok(await page.locator('.detail-sheet .large-photo').evaluate(element=>element.getBoundingClientRect().height>=239),'Detail photo must not collapse beside the new map.');
  await page.locator('.detail-sheet .location-map').scrollIntoViewIfNeeded();
  await page.screenshot({path:resolve(output,'desktop-location-detail.png'),fullPage:true});
  await page.setViewportSize({width:390,height:844});
  await page.locator('.detail-sheet .location-map').scrollIntoViewIfNeeded();
  await page.screenshot({path:resolve(output,'mobile-location-detail.png'),fullPage:true});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),'Mobile page overflow');
  await page.goto(origin+'/?view=matches');
  await page.getByLabel('Lost item to compare').waitFor();
  await page.getByLabel('Lost item to compare').selectOption(reportId);
  await page.getByRole('button',{name:'Compare photos',exact:true}).click();
  await page.locator('.vision-status').filter({hasText:/Compared \d+ of/}).waitFor({timeout:120000});
  assert.ok(await page.locator('.vision-result').count()>0);
  await page.screenshot({path:resolve(output,'mobile-image-matches.png'),fullPage:true});
  await page.request.post(origin+'/api/local-session',{headers:{Origin:origin},data:{action:'signout'}});
  assert.equal((await page.request.get(origin+'/api/state')).status(),401);
  assert.equal((await page.request.get(origin+uploadedImage)).status(),401,'Photo reads must require a session.');
  assert.equal((await page.request.post(origin+'/api/image-features',{headers:{Origin:origin},data:{action:'read',images:[]}})).status(),401);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({passed:true,reportId,mapPersistence:true,visualMatching:true,mobileOverflow:false,authorization:true,screenshots:output},null,2));
}catch(error){
  await page.screenshot({path:resolve(output,'failure.png'),fullPage:true}).catch(()=>{});
  console.error(JSON.stringify({reportId,url:page.url(),errors,visibleText:(await page.locator('body').innerText().catch(()=>'' )).slice(0,5000)},null,2));
  throw error;
}finally{
  await writeFile(resolve(output,'test-report.json'),JSON.stringify({reportId},null,2));
  await context.close();await browser.close();
  const ids=[reportId,pairedId].filter(id=>/^[a-f0-9-]{36}$/.test(id));
  if(ids.length){
    const quoted=ids.map(id=>"'"+id+"'").join(',');
    const photoId=uploadedImage.split('/').pop();
    const photoCleanup=freeStorage&&/^[a-f0-9-]{36}$/.test(photoId||'')?` DELETE FROM photo_blobs WHERE scope='vitfind-local-demo-v1' AND id='${photoId}' AND EXISTS(SELECT 1 FROM uploads WHERE scope='vitfind-local-demo-v1' AND id='${photoId}' AND actor='local-demo:student'); DELETE FROM image_features WHERE scope='vitfind-local-demo-v1' AND image='/api/media/${photoId}' AND actor='local-demo:student'; DELETE FROM uploads WHERE scope='vitfind-local-demo-v1' AND id='${photoId}' AND actor='local-demo:student';`:'';
    const sql=`DELETE FROM reports WHERE scope='vitfind-local-demo-v1' AND owner='local-demo:student' AND title LIKE 'QA %' AND id IN (${quoted}); DELETE FROM audit WHERE scope='vitfind-local-demo-v1' AND reportId IN (${quoted});${photoCleanup}`;
    const cleanup=spawnSync(process.execPath,['--import','./scripts/sites-env.mjs','./node_modules/wrangler/bin/wrangler.js','d1','execute','DB','--local','--config',process.env.VITFIND_TEST_CONFIG||'wrangler.jsonc','--command',sql],{cwd:root,encoding:'utf8',windowsHide:true});
    if(cleanup.status!==0)console.error('QA report cleanup needs attention:',ids.join(', '));
  }
}
