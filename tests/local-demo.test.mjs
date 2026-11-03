import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
const { outputText } = ts.transpileModule(await readFile(new URL("../lib/local-demo-policy.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
});
const { localDemoAllowed, localDemoWriteAllowed, localDemoToken, tokenHash } = await import("data:text/javascript;base64," + Buffer.from(outputText).toString("base64"));
const origin = "http://127.0.0.1:5173";
const local = new Headers({host:"127.0.0.1:5173"});
test("dummy login requires development compilation AND explicit runtime setting", () => {
  assert.equal(localDemoAllowed(true, "true", origin, local), true);
  assert.equal(localDemoAllowed(true, "true", origin, new Headers({host:"127.0.0.1:5173", "x-forwarded-host":"127.0.0.1:5173"})), true);
  assert.equal(localDemoAllowed(false, "true", origin, local), false);
  assert.equal(localDemoAllowed(true, undefined, origin, local), false);
  assert.equal(localDemoAllowed(true, "false", origin, local), false);
});
test("dummy login refuses public, mismatched and forwarded hostnames", () => {
  for (const hostname of ["example.com", "localhost.evil.test", "192.168.1.20"])
    assert.equal(localDemoAllowed(true, "true", `http://${hostname}:5173`, new Headers({host:hostname+":5173"})), false);
  assert.equal(localDemoAllowed(true, "true", origin, new Headers({host:"localhost:5173"})), false);
  assert.equal(localDemoAllowed(true, "true", origin, new Headers({host:"127.0.0.1:5173", "x-forwarded-host":"evil.test"})), false);
});
test("demo session mutations require same-origin JSON POST", () => {
  const request = (headers, method="POST") => new Request(origin+"/api/local-session", {method,headers});
  assert.equal(localDemoWriteAllowed(request({origin,"content-type":"application/json"})), true);
  for (const suppliedOrigin of [undefined, "null", "https://evil.test"])
    assert.equal(localDemoWriteAllowed(request({...(suppliedOrigin ? {origin:suppliedOrigin} : {}),"content-type":"application/json"})), false);
  assert.equal(localDemoWriteAllowed(request({origin,"content-type":"text/plain"})), false);
  assert.equal(localDemoWriteAllowed(request({origin,"content-type":"application/json"},"GET")), false);
});
test("only opaque session tokens are accepted, and only their hash is stored", async () => {
  assert.equal(localDemoToken(new Headers({cookie:"vitfind_local_demo=student"})), null);
  assert.equal(localDemoToken(new Headers({cookie:"vitfind.session_token="+"a".repeat(64)})), null);
  assert.equal(localDemoToken(new Headers({cookie:"vitfind_local_demo="+"a".repeat(64)})), "a".repeat(64));
  const hash=await tokenHash("a".repeat(64));
  assert.match(hash,/^[a-f0-9]{64}$/);
  assert.notEqual(hash,"a".repeat(64));
});
