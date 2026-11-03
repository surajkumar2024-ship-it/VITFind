import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
const { outputText } = ts.transpileModule(await readFile(new URL("../lib/auth-settings.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
});
const { readAuthSettings, admittedGoogleEmail } = await import("data:text/javascript;base64," + Buffer.from(outputText).toString("base64"));
const config = { BETTER_AUTH_URL: "https://campus.example", BETTER_AUTH_SECRET: "test-only-".repeat(8),
  GOOGLE_CLIENT_ID: "test-client", GOOGLE_CLIENT_SECRET: "test-secret" };
test("missing secrets never enable login", () => {
  assert.equal(readAuthSettings({}), null);
  for (const key of Object.keys(config)) assert.equal(readAuthSettings({ ...config, [key]: "" }), null);
  assert.equal(readAuthSettings({ ...config, BETTER_AUTH_SECRET: "short" }), null);
});
test("requires an explicit secure origin, allowing loopback development", () => {
  for (const value of ["http://campus.example", "https://campus.example/path", "https://evil@campus.example", "https://campus.example?x=1", "not a url"])
    assert.equal(readAuthSettings({ ...config, BETTER_AUTH_URL: value }), null);
  assert.equal(readAuthSettings(config).baseURL, "https://campus.example");
  assert.equal(readAuthSettings({ ...config, BETTER_AUTH_URL: "http://localhost:5173" }).baseURL, "http://localhost:5173");
});
test("Google accounts must be verified and Gmail restriction is exact", () => {
  assert.equal(admittedGoogleEmail("student@vit.ac.in", true, "any-google"), true);
  assert.equal(admittedGoogleEmail("student@gmail.com", false, "any-google"), false);
  assert.equal(admittedGoogleEmail("STUDENT@GMAIL.COM", true, "gmail-only"), true);
  for (const email of ["student@vit.ac.in", "student@gmail.com.evil", "student@@gmail.com"])
    assert.equal(admittedGoogleEmail(email, true, "gmail-only"), false);
  assert.equal(readAuthSettings({ ...config, GOOGLE_ACCOUNT_POLICY: "invalid" }), null);
});
