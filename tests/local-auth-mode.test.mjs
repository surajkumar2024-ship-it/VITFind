import test from "node:test";
import assert from "node:assert/strict";
import { hasLocalGoogleCredentials, useLocalPracticeAccounts } from "../scripts/local-auth-mode.mjs";
const configured = 'GOOGLE_CLIENT_ID="test-client"\nGOOGLE_CLIENT_SECRET="test-secret"\nBETTER_AUTH_SECRET="' + 'a'.repeat(48) + '"\n';
test("local practice mode switches off when Google credentials are configured", () => {
  assert.equal(hasLocalGoogleCredentials(configured), true);
  assert.equal(useLocalPracticeAccounts("serve", "1", undefined, ""), true);
  assert.equal(useLocalPracticeAccounts("serve", "1", undefined, configured), false);
  assert.equal(useLocalPracticeAccounts("serve", "1", "1", configured), true);
});
test("a production build cannot compile in local practice login", () => {
  assert.equal(useLocalPracticeAccounts("build", "1", "1", ""), false);
  assert.equal(useLocalPracticeAccounts("build", "1", "1", configured), false);
  assert.equal(useLocalPracticeAccounts("serve", undefined, "1", configured), false);
});
