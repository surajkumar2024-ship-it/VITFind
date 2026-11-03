import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";

export const user = sqliteTable("auth_user", {
  id: text().primaryKey(), name: text().notNull(), email: text().notNull().unique(),
  emailVerified: integer({ mode: "boolean" }).notNull().default(false), image: text(),
  createdAt: integer({ mode: "timestamp_ms" }).notNull(),
  updatedAt: integer({ mode: "timestamp_ms" }).notNull(),
});
export const session = sqliteTable("auth_session", {
  id: text().primaryKey(), token: text().notNull().unique(),
  userId: text().notNull().references(() => user.id, { onDelete: "cascade" }),
  expiresAt: integer({ mode: "timestamp_ms" }).notNull(),
  createdAt: integer({ mode: "timestamp_ms" }).notNull(),
  updatedAt: integer({ mode: "timestamp_ms" }).notNull(),
  ipAddress: text(), userAgent: text(),
}, t => [index("auth_session_user").on(t.userId)]);
export const account = sqliteTable("auth_account", {
  id: text().primaryKey(), accountId: text().notNull(), providerId: text().notNull(),
  userId: text().notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text(), refreshToken: text(), idToken: text(), scope: text(), password: text(),
  accessTokenExpiresAt: integer({ mode: "timestamp_ms" }),
  refreshTokenExpiresAt: integer({ mode: "timestamp_ms" }),
  createdAt: integer({ mode: "timestamp_ms" }).notNull(),
  updatedAt: integer({ mode: "timestamp_ms" }).notNull(),
}, t => [index("auth_account_user").on(t.userId),
  uniqueIndex("auth_account_provider_identity").on(t.providerId, t.accountId)]);
export const verification = sqliteTable("auth_verification", {
  id: text().primaryKey(), identifier: text().notNull(), value: text().notNull(),
  expiresAt: integer({ mode: "timestamp_ms" }).notNull(),
  createdAt: integer({ mode: "timestamp_ms" }).notNull(),
  updatedAt: integer({ mode: "timestamp_ms" }).notNull(),
}, t => [index("auth_verification_identifier").on(t.identifier)]);
export const rateLimit = sqliteTable("auth_rate_limit", {
  id: text().primaryKey(), key: text().notNull().unique(), count: integer().notNull(),
  lastRequest: integer({ mode: "number" }).notNull(),
});
