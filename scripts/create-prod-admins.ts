// The two internal accounts a fresh production database needs: the SUPERUSER
// that owns the superuser dashboard, and the ADMIN account a superuser may
// switch into. Nothing else — src/prisma/seed.ts is a dev fixture and invents
// organizations, agents, calls and a known password, none of which belong in
// production.
//
// The credentials are read straight from process.env rather than added to
// lib/env.ts: the app itself never reads them, they are supplied once for this
// run, and making them `required` there would break every other entry point.
//
//   PROD_SUPERUSER_EMAIL=you@example.com PROD_SUPERUSER_PASSWORD=... \
//   PROD_ADMIN_PASSWORD=... DATABASE_URL=<production> \
//   node scripts/create-prod-admins.ts
//
// Re-running is safe: it re-asserts the role and resets the password, so a
// demoted or locked-out account recovers without manual SQL.
import 'dotenv/config';
import bcrypt from 'bcrypt';
import { db } from '../src/prisma/db.ts';

// Same work factor as lib/auth.ts, so these hashes match what the app writes.
const BCRYPT_ROUNDS = 12;

// The impersonation hook in lib/auth.ts allows switching into this address and
// no other (ADMIN_ACCOUNT_EMAIL, lib/auth.ts:20). Spelled out again here
// because that module resolves '@/' path aliases and so cannot be imported by
// a plain `node` script — keep the two in step.
const ADMIN_EMAIL = 'admin@mazzyai.com';

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing ${name}. See the header of this file for usage.`);
  }
  return value;
}

const accounts = [
  {
    email: required('PROD_SUPERUSER_EMAIL'),
    password: required('PROD_SUPERUSER_PASSWORD'),
    name: process.env.PROD_SUPERUSER_NAME?.trim() || 'Superuser',
    systemRole: 'SUPERUSER',
  },
  {
    email: ADMIN_EMAIL,
    password: required('PROD_ADMIN_PASSWORD'),
    name: 'Admin',
    systemRole: 'ADMIN',
  },
] as const;

for (const account of accounts) {
  const existing = await db.orm.public.User.where({ email: account.email })
    .select('id')
    .first();

  if (existing) {
    await db.orm.public.User.where({ id: existing.id }).update({
      systemRole: account.systemRole,
      status: 'ACTIVE',
    });
    console.log(`updated ${account.systemRole}:`, account.email);
  } else {
    await db.orm.public.User.create({
      email: account.email,
      name: account.name,
      emailVerified: true,
      systemRole: account.systemRole,
      status: 'ACTIVE',
    });
    console.log(`created ${account.systemRole}:`, account.email);
  }

  // Better Auth keeps the password on the user's "credential" Account row
  // (accountId = the user's id), the same shape src/prisma/seed.ts writes.
  const user = await db.orm.public.User.where({ email: account.email })
    .select('id')
    .first();
  if (!user) throw new Error(`no user ${account.email} after write`);
  const hash = await bcrypt.hash(account.password, BCRYPT_ROUNDS);
  const credential = await db.orm.public.Account.where({
    userId: user.id,
    providerId: 'credential',
  })
    .select('id')
    .first();
  if (credential) {
    await db.orm.public.Account.where({ id: credential.id }).update({
      password: hash,
    });
  } else {
    await db.orm.public.Account.create({
      userId: user.id,
      providerId: 'credential',
      accountId: user.id,
      password: hash,
    });
  }
}

await db.close();
