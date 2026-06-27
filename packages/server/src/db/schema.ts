import {
  bigint,
  index,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

/** Accounts. `username` keeps the original casing for display; `usernameKey`
 *  is the lowercased form that uniqueness is enforced on (so `Kopper` and
 *  `kopper` can't both exist). The CHECK mirrors the app's validation. */
export const users = pgTable(
  'users',
  {
    id: text('id').primaryKey(),
    username: text('username').notNull(),
    usernameKey: text('username_key').notNull(),
    passwordHash: text('password_hash').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('users_username_key_uq').on(t.usernameKey)],
);

/** Server-side sessions. The browser holds the raw token in an httpOnly cookie;
 *  we store only its SHA-256 hash, so a DB leak doesn't hand out live sessions. */
export const sessions = pgTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    tokenHash: text('token_hash').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('sessions_token_hash_uq').on(t.tokenHash),
    index('sessions_user_id_idx').on(t.userId),
  ],
);

/** One persisted run. `points` is the server-recomputed final score; `rounds`
 *  keeps the per-round breakdown for auditing. */
export const scores = pgTable(
  'scores',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    points: numeric('points', { precision: 4, scale: 2 }).notNull(),
    seed: bigint('seed', { mode: 'number' }).notNull(),
    rounds: jsonb('rounds').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('scores_points_idx').on(t.points), index('scores_user_id_idx').on(t.userId)],
);

/** Single-use game-token nonces. A submitted token's nonce is inserted here;
 *  the primary-key collision is what blocks replays. */
export const redeemedTokens = pgTable('redeemed_tokens', {
  nonce: text('nonce').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Per-round breakdown stored in `scores.rounds`. */
export interface StoredRound {
  index: number;
  targetMs: number;
  guessMs: number;
  deltaMs: number;
  points: number;
}
