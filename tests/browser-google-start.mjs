import { createRequire } from "node:module";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "C:/Users/suraj/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const origin = process.env.VITFIND_TEST_ORIGIN || "http://localhost:5174";
assert.equal(new URL(origin).hostname, "localhost");
const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
const context = await browser.newContext();
const page = await context.newPage(), errors = [];
page.setDefaultTimeout(60000);
page.on("pageerror", error => errors.push(error.message));
try {
  assert.equal((await page.goto(origin, { timeout: 120000 })).status(), 200);
  const button = page.getByRole("button", { name: "Continue with Google", exact: true });
  await button.waitFor();
  assert.equal(await button.isEnabled(), true, "Real Google sign-in must be enabled.");
  assert.equal(await page.getByRole("button", { name: "Enter local app", exact: true }).count(), 0);
  assert.equal((await page.request.post(origin + "/api/local-session", { headers: { Origin: origin }, data: { action: "signin", account: "student" } })).status(), 404, "Dummy login must be disabled.");
  assert.equal((await page.request.get(origin + "/api/state")).status(), 401);
  let authorization;
  page.on("request", request => {
    const url = new URL(request.url());
    if (url.hostname === "accounts.google.com" && url.searchParams.has("redirect_uri")) {
      authorization = { callback: url.searchParams.get("redirect_uri"), scopes: url.searchParams.get("scope").split(" ").sort() };
    }
  });
  await button.click();
  await page.waitForURL(url => url.hostname === "accounts.google.com", { timeout: 60000 });
  await page.waitForLoadState("domcontentloaded");
  assert.ok(authorization, "The app must send a real Google authorization request.");
  assert.equal(authorization.callback, origin + "/api/auth/callback/google");
  assert.deepEqual(authorization.scopes, ["email", "openid", "profile"]);
  const body = await page.locator("body").innerText();
  assert.ok(!/redirect_uri_mismatch|invalid_client|Error 400|Error 401|invalid_request/.test(body), "Google must not reject the client configuration.");
  assert.ok(/Sign in|Choose an account/i.test(body), "Google's account sign-in page must be visible.");
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed: true, origin, googleButton: true, dummyLoginDisabled: true, callback: authorization.callback, scopes: authorization.scopes, googleSignInPage: true, authenticatedCallback: "requires user sign-in" }));
} finally {
  await context.close();
  await browser.close();
}
