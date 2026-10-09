import postgres from '@prisma/orm-postgres/runtime';
import { DATABASE_URL } from '../../lib/env.ts';
import type { Contract } from './contract.d';
import contractJson from './contract.json' with { type: 'json' };

export const db = postgres<Contract>({
  contractJson,
  url: DATABASE_URL,
});
