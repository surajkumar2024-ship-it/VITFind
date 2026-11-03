import { createRequire } from "node:module";
import assert from "node:assert/strict";
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||"C:/Users/suraj/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const origin="http://localhost:5174";
const browser=await chromium.launch({executablePath:"C:/Program Files/Google/Chrome/Application/chrome.exe",headless:true});
const context=await browser.newContext();
async function begin(){
  const response=await context.request.post(origin+"/api/auth/sign-in/social",{headers:{Origin:origin},data:{provider:"google",callbackURL:"/",errorCallbackURL:"/?auth_error=1",disableRedirect:true}});
  assert.equal(response.status(),200);
  const data=await response.json();return new URL(data.url).searchParams.get("state");
}
try{
  const state=await begin();
  const cookie=(await context.cookies()).find(c=>c.name.endsWith(".state"));
  assert.ok(cookie);assert.equal(cookie.httpOnly,true);assert.equal(cookie.sameSite,"Lax");assert.equal(cookie.domain,"localhost");
  const rejected=await context.request.get(origin+"/api/auth/callback/google?"+new URLSearchParams({state,code:"vitfind-invalid-code-test"}),{maxRedirects:0});
  const error=new URL(rejected.headers().location,origin).searchParams.get("error");
  assert.equal(error,"invalid_code");
  const deniedState=await begin();
  const denied=await context.request.get(origin+"/api/auth/callback/google?"+new URLSearchParams({state:deniedState,error:"access_denied"}),{maxRedirects:0});
  assert.equal(new URL(denied.headers().location,origin).searchParams.get("error"),"access_denied");
  assert.equal((await context.request.get(origin+"/api/state")).status(),401);
  console.log(JSON.stringify({passed:true,stateCookiePersists:true,sameSite:cookie.sameSite,invalidCodeRejected:true,cancelledConsentHandled:true,noUnauthorizedSession:true}));
}finally{await context.close();await browser.close();}
