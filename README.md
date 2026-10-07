# MazzyAI

AI voice agents for businesses: Retell-powered phone agents, call logs,
agenda, contacts and analytics, with a superuser console for running every
organization.

## Stack

- Next.js (App Router) — see `AGENTS.md` before writing code; this version
  differs from older docs.
- Prisma 8 (contract-first) on Postgres — `src/prisma/contract.prisma`.
- Better Auth — `lib/auth.ts`.
- Retell (voice), Resend (email), Tailwind.

## Local development

```bash
pnpm install
cp .env.example .env          # then fill in the values
docker compose up -d          # Postgres on localhost:5433
pnpm prisma db update         # apply the contract
pnpm db:seed                  # demo data; logins in src/prisma/seed.ts
pnpm dev
```
