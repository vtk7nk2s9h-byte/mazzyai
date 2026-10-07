// Copies NextAuth-era password hashes (user.passwordHash) into Better Auth
// "credential" accounts, which is where Better Auth looks for them. Both use
// bcrypt, so every existing password keeps working.
//
//   node scripts/migrate-passwords.ts
//
// Safe to re-run: users who already have a credential account are skipped.
// Reads DATABASE_URL, so point it at whichever database needs migrating.

import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// accountId is the user's own id for credential accounts — that's what
// Better Auth writes on sign-up, and what it matches on sign-in.
const { rowCount } = await pool.query(`
  insert into account (id, "userId", "providerId", "accountId", password, "updatedAt")
  select gen_random_uuid()::text, id, 'credential', id, "passwordHash", now()
  from "user"
  where "passwordHash" is not null
  on conflict ("providerId", "accountId") do nothing
`);

console.log(`copied ${rowCount} password(s) into credential accounts`);
await pool.end();
