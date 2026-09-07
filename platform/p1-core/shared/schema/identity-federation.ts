import { sql } from "drizzle-orm";
import { pgTable, uuid, varchar, text, timestamp, jsonb, index, check } from "drizzle-orm/pg-core";
import { users } from "./users";
const time = (name: string) => timestamp(name, { withTimezone: true });
export const p1IdentityLinks = pgTable("p1_identity_link", {
  id: uuid("id").primaryKey().defaultRandom(),
  coreUserId: varchar("core_user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "restrict" }),
  canonicalUserId: text("canonical_user_id").notNull().unique(),
  createdAt: time("created_at").notNull().defaultNow(),
  revokedAt: time("revoked_at"),
  initialGrantId: uuid("initial_grant_id").notNull(),
});
export const p1FederationSessions = pgTable(
  "p1_federation_session",
  {
    tokenHash: text("token_hash").primaryKey(),
    linkId: uuid("link_id")
      .notNull()
      .references(() => p1IdentityLinks.id, { onDelete: "restrict" }),
    grantId: uuid("grant_id").notNull(),
    expiresAt: time("expires_at").notNull(),
    createdAt: time("created_at").notNull().defaultNow(),
  },
  (t) => [index("p1_federation_session_expiry").on(t.expiresAt)],
);
export const p1FederationIntents = pgTable(
  "p1_federation_intent",
  {
    tokenHash: text("token_hash").primaryKey(),
    nonceHash: text("nonce_hash").notNull(),
    kind: text("kind").notNull(),
    payload: jsonb("payload").notNull(),
    expiresAt: time("expires_at").notNull(),
    createdAt: time("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("p1_federation_intent_expiry").on(t.expiresAt),
    check("p1_federation_intent_kind_check", sql`${t.kind} IN ('bootstrap','link','confirm')`),
  ],
);
export const p1FederationStates = pgTable(
  "p1_federation_state",
  {
    stateHash: text("state_hash").primaryKey(),
    nonceHash: text("nonce_hash").notNull(),
    verifier: text("verifier").notNull(),
    kind: text("kind").notNull(),
    payload: jsonb("payload").notNull().default({}),
    expiresAt: time("expires_at").notNull(),
    createdAt: time("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("p1_federation_state_expiry").on(t.expiresAt),
    check("p1_federation_state_kind_check", sql`${t.kind} IN ('bootstrap','link','login')`),
  ],
);
export const p1FederationBootstrapConsumptions = pgTable("p1_federation_bootstrap_consumption", {
  id: uuid("id").primaryKey(),
  proofHash: text("proof_hash").notNull(),
  coreUserId: varchar("core_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "restrict" }),
  consumedAt: time("consumed_at").notNull().defaultNow(),
});
export const p1FederationAudit = pgTable("p1_federation_audit", {
  id: uuid("id").primaryKey().defaultRandom(),
  action: text("action").notNull(),
  coreUserId: varchar("core_user_id"),
  canonicalUserId: text("canonical_user_id"),
  linkId: uuid("link_id"),
  outcome: text("outcome").notNull(),
  createdAt: time("created_at").notNull().defaultNow(),
});
