import { createRequire } from 'node:module';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/suraj/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const config=JSON.parse(await readFile(new URL('../wrangler.free.jsonc',import.meta.url),'utf8'));
const origin=config.vars.BETTER_AUTH_URL;
assert.equal(new URL(origin).hostname,'vitfind-campus.vitfind-campus.workers.dev');
const directory=new URL('../.sites-runtime/deployment-qa/',import.meta.url);
await mkdir(directory,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const context=await browser.newContext({viewport:{width:1365,height:900}});
const page=await context.newPage(),errors=[];
page.on('pageerror',error=>errors.push(error.message));
page.setDefaultTimeout(30000);
const report={origin};
try{
  const response=await page.goto(origin,{waitUntil:'domcontentloaded',timeout:60000});
  assert.equal(response.status(),200);
  const button=page.getByRole('button',{name:'Continue with Google',exact:true});
  await button.waitFor();
  assert.ok(await button.isEnabled());
  assert.equal(await page.getByRole('button',{name:'Enter local app',exact:true}).count(),0);
  assert.equal((await page.request.get(origin+'/api/state')).status(),401);
  assert.equal((await page.request.post(origin+'/api/local-session',{headers:{Origin:origin},data:{action:'signin',account:'student'}})).status(),404);
  await page.screenshot({path:new URL('desktop-login.png',directory).pathname.replace(/^\/([A-Z]:)/,'$1')});
  await page.setViewportSize({width:390,height:844});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.screenshot({path:new URL('mobile-login.png',directory).pathname.replace(/^\/([A-Z]:)/,'$1')});
  Object.assign(report,{appLoaded:true,googleButtonEnabled:true,publicDummyLoginDisabled:true,privateApiProtected:true,mobileOverflow:false});
  let authorization;
  page.on('request',request=>{
    const url=new URL(request.url());
    if(url.hostname==='accounts.google.com'&&url.searchParams.has('redirect_uri'))
      authorization={callback:url.searchParams.get('redirect_uri'),scopes:url.searchParams.get('scope')?.split(' ').sort()};
  });
  await button.click();
  await page.waitForURL(url=>url.hostname==='accounts.google.com',{timeout:60000});
  await page.waitForLoadState('domcontentloaded');
  assert.equal(authorization?.callback,origin+'/api/auth/callback/google');
  assert.deepEqual(authorization.scopes,['email','openid','profile']);
  const text=await page.locator('body').innerText();
  const googleError=text.match(/redirect_uri_mismatch|invalid_client|invalid_request|access_denied/)?.[0];
  Object.assign(report,{authorization,googleResponse:googleError||(/Sign in|Choose an account/i.test(text)?'account sign-in page':'unrecognized provider page'),authenticatedCallback:'requires the user to complete Google sign-in',errors});
  console.log(JSON.stringify(report,null,2));
  await writeFile(new URL('report.json',directory),JSON.stringify(report,null,2));
}catch(error){
  console.error(JSON.stringify({...report,errors,body:(await page.locator('body').innerText().catch(()=>'' )).slice(0,1800)},null,2));
  throw error;
}finally{await context.close();await browser.close();}
