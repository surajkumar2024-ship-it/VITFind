import { sql } from "drizzle-orm";
export * from "./auth-schema";
export const localDemoSessions = sqliteTable("local_demo_sessions", {
  tokenHash: text().primaryKey(),
  account: text().notNull(),
  expiresAt: integer().notNull(),
}, t => [index("local_demo_session_expiry").on(t.expiresAt)]);
import {
  sqliteTable,
  text,
  integer,
  real,
  blob,
  primaryKey,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
export const profiles = sqliteTable("profiles", {
  id: text().primaryKey(),
  name: text().notNull(),
  avatar: text().notNull().default(""),
  course: text().notNull().default(""),
  year: text().notNull().default(""),
  bio: text().notNull().default(""),
  role: text().notNull().default("member"),
  createdAt: integer().notNull(),
  updatedAt: integer().notNull(),
});
export const spaces = sqliteTable("spaces", {
  scope: text().primaryKey(),
  createdAt: integer().notNull(),
});
export const reports = sqliteTable(
  "reports",
  {
    scope: text().notNull(),
    id: text().notNull(),
    owner: text().notNull(),
    type: text().notNull(),
    title: text().notNull(),
    description: text().notNull(),
    category: text().notNull(),
    location: text().notNull(),
    latitude: real(),
    longitude: real(),
    locationNote: text().notNull().default(""),
    color: text().notNull(),
    date: text().notNull(),
    image: text().notNull().default(""),
    status: text().notNull().default("open"),
    createdAt: integer().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.scope, t.id] }),
    index("reports_scope_status_date").on(t.scope, t.status, t.createdAt),
    index("reports_scope_owner").on(t.scope, t.owner),
  ],
);
export const claims = sqliteTable(
  "claims",
  {
    scope: text().notNull(),
    id: text().notNull(),
    reportId: text().notNull(),
    claimant: text().notNull(),
    proof: text().notNull(),
    status: text().notNull().default("pending"),
    code: text().notNull().default(""),
    transitionToken: text().notNull().default(""),
    createdAt: integer().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.scope, t.id] }),
    uniqueIndex("claim_once").on(t.scope, t.reportId, t.claimant),
    uniqueIndex("one_approved_claim")
      .on(t.scope, t.reportId)
      .where(sql`${t.status} IN ('approved','completed')`),
    index("claims_scope_claimant").on(t.scope, t.claimant),
  ],
);
export const messages = sqliteTable(
  "messages",
  {
    scope: text().notNull(),
    id: text().notNull(),
    claimId: text().notNull(),
    sender: text().notNull(),
    text: text().notNull(),
    createdAt: integer().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.scope, t.id] }),
    index("messages_thread").on(t.scope, t.claimId, t.createdAt),
  ],
);
export const saved = sqliteTable(
  "saved",
  {
    scope: text().notNull(),
    actor: text().notNull(),
    reportId: text().notNull(),
  },
  (t) => [primaryKey({ columns: [t.scope, t.actor, t.reportId] })],
);
export const notifications = sqliteTable(
  "notifications",
  {
    scope: text().notNull(),
    id: text().notNull(),
    recipient: text().notNull(),
    text: text().notNull(),
    reportId: text().notNull(),
    read: integer().notNull().default(0),
    createdAt: integer().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.scope, t.id] }),
    index("notices_recipient_date").on(t.scope, t.recipient, t.createdAt),
  ],
);
export const audit = sqliteTable(
  "audit",
  {
    scope: text().notNull(),
    id: text().notNull(),
    actor: text().notNull(),
    action: text().notNull(),
    reportId: text().notNull(),
    createdAt: integer().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.scope, t.id] }),
    index("audit_scope_date").on(t.scope, t.createdAt),
  ],
);
export const uploads = sqliteTable(
  "uploads",
  {
    scope: text().notNull(),
    id: text().notNull(),
    actor: text().notNull(),
    contentType: text().notNull(),
    createdAt: integer().notNull(),
  },
  (t) => [primaryKey({ columns: [t.scope, t.id] })],
);
export const imageFeatures = sqliteTable("image_features", {
  scope: text().notNull(),
  image: text().notNull(),
  model: text().notNull(),
  embedding: text().notNull(),
  actor: text().notNull(),
  createdAt: integer().notNull(),
}, t => [primaryKey({ columns: [t.scope, t.image, t.model] })]);
export const photoBudget = sqliteTable("photo_budget", {
  id: text().primaryKey(),
  usedBytes: integer().notNull().default(0),
  maxBytes: integer().notNull(),
});
export const photoBlobs = sqliteTable("photo_blobs", {
  scope: text().notNull(), id: text().notNull(), data: blob().notNull(),
  byteLength: integer().notNull(), createdAt: integer().notNull(),
}, t => [primaryKey({ columns: [t.scope, t.id] })]);
