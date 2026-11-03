// D1 cannot wrap Better Auth's callback-style transaction in a SQL transaction.
// Compensate only for fresh users created by this exact request, not by email.
export const orphanCleanupSQL = `DELETE FROM auth_user WHERE id=?
  AND NOT EXISTS (SELECT 1 FROM auth_account WHERE userId=auth_user.id)
  AND NOT EXISTS (SELECT 1 FROM auth_session WHERE userId=auth_user.id)
  AND NOT EXISTS (SELECT 1 FROM profiles WHERE id='google:' || auth_user.id)`;

export async function cleanupIncompleteSignup(database: D1Database, newUserIds: Set<string>) {
  for (const id of newUserIds) {
    try { await database.prepare(orphanCleanupSQL).bind(id).run(); }
    catch { console.error("Incomplete Google signup may need operator recovery", { userId: id }); }
  }
}
