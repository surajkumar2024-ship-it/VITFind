import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFile } from "node:fs/promises";
import ts from "typescript";
const { outputText } = ts.transpileModule(await readFile(new URL("../lib/auth-recovery.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
});
const { orphanCleanupSQL } = await import("data:text/javascript;base64," + Buffer.from(outputText).toString("base64"));
test("incomplete-signup recovery cannot delete established or unrelated accounts", async () => {
  const database = new DatabaseSync(":memory:");
  try {
    for (const name of ["0000_bored_gateway.sql", "0001_cold_terrax.sql", "0002_absent_black_cat.sql", "0003_exotic_shotgun.sql"])
      database.exec(await readFile(new URL("../drizzle/" + name, import.meta.url), "utf8"));
    const add = database.prepare("INSERT INTO auth_user(id,name,email,emailVerified,createdAt,updatedAt) VALUES(?,?,?,1,0,0)");
    for (const id of ["orphan", "account", "session", "profile", "unrelated"]) add.run(id, id, id + "@example.test");
    database.exec("INSERT INTO auth_account(id,accountId,providerId,userId,createdAt,updatedAt) VALUES('a','g','google','account',0,0)");
    database.exec("INSERT INTO auth_session(id,token,userId,expiresAt,createdAt,updatedAt) VALUES('s','token','session',9999999999999,0,0)");
    database.exec("INSERT INTO profiles(id,name,createdAt,updatedAt) VALUES('google:profile','Profile',0,0)");
    for (const id of ["orphan", "account", "session", "profile"]) database.prepare(orphanCleanupSQL).run(id);
    assert.deepEqual(database.prepare("SELECT id FROM auth_user ORDER BY id").all().map(row => row.id),
      ["account", "profile", "session", "unrelated"]);
    add.run("retry", "Retry", "orphan@example.test");
    assert.equal(database.prepare("SELECT count(*) AS n FROM auth_user WHERE email='orphan@example.test'").get().n, 1);
  } finally { database.close(); }
});
