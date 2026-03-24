# Production Database Stabilization

Date: 2026-03-24
Scope: Vercel + Prisma + Supabase production operations

## Current standard

- `DATABASE_URL`: pooled/runtime connection for the app, usually Supabase pooler on port `6543`
- `DIRECT_DATABASE_URL`: direct/admin connection for controlled Prisma operations, usually Supabase direct host on port `5432`
- `PRISMA_SKIP_MIGRATE_DEPLOY=1`: keep enabled in Vercel so build does not depend on database migrations
- `PRISMA_RUN_MIGRATIONS`: keep unset in Vercel builds; only set to `1` in a controlled manual operation if a migration run is intentionally part of the process

## Build policy

The production build must not rely on `prisma migrate deploy` by default.

Current behavior:

- `npm run build` runs `node scripts/build-with-prisma.js`
- the build validates `DATABASE_URL`
- the build skips `prisma migrate deploy` unless `PRISMA_RUN_MIGRATIONS=1`
- the build still runs `prisma generate`
- the build then runs `next build`

## Production checklist

1. Confirm Vercel Production envs:
- `DATABASE_URL`
- `DIRECT_DATABASE_URL`
- `PRISMA_SKIP_MIGRATE_DEPLOY=1`

2. Confirm runtime connectivity:
- hit `/api/diag`
- verify `status`
- verify `dbHost`
- verify `hasDirectDatabaseUrl`
- verify `migrateInBuildEnabled` is `false`

3. Apply schema changes outside the Vercel build:
- preferred: controlled SQL in Supabase SQL Editor for urgent production stabilization
- optional later: reconcile Prisma migration history calmly after production is stable

## Transaction schema baseline

Production `Transaction` is expected to support:

- `destination_wallet_id`
- `payment_method`
- `receipt_url`

Expected supporting objects:

- FK `Transaction_destination_wallet_id_fkey`
- indexes:
  - `Transaction_workspace_id_destination_wallet_id_date_idx`
  - `Transaction_workspace_id_category_id_date_idx`
  - `Transaction_workspace_id_created_at_idx`

## Emergency SQL

Use this only when production schema must be stabilized immediately and Prisma migration locking is blocking release:

```sql
ALTER TABLE "Transaction"
  ADD COLUMN IF NOT EXISTS "destination_wallet_id" TEXT,
  ADD COLUMN IF NOT EXISTS "payment_method" TEXT NOT NULL DEFAULT 'OTHER',
  ADD COLUMN IF NOT EXISTS "receipt_url" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Transaction_destination_wallet_id_fkey'
  ) THEN
    ALTER TABLE "Transaction"
      ADD CONSTRAINT "Transaction_destination_wallet_id_fkey"
      FOREIGN KEY ("destination_wallet_id") REFERENCES "Wallet"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Transaction_workspace_id_destination_wallet_id_date_idx"
  ON "Transaction"("workspace_id", "destination_wallet_id", "date");

CREATE INDEX IF NOT EXISTS "Transaction_workspace_id_category_id_date_idx"
  ON "Transaction"("workspace_id", "category_id", "date");

CREATE INDEX IF NOT EXISTS "Transaction_workspace_id_created_at_idx"
  ON "Transaction"("workspace_id", "created_at");
```

## Trade-off

If emergency SQL is used first, Prisma migration history can lag behind the real production schema for a short time. That is acceptable temporarily during stabilization, but it should be reconciled later in a planned maintenance window.
