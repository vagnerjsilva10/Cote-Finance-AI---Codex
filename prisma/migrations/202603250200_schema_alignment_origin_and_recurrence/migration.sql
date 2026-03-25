-- Align transaction write-path origin metadata with schema.prisma.
ALTER TABLE "Transaction"
  ADD COLUMN IF NOT EXISTS "origin_type" TEXT,
  ADD COLUMN IF NOT EXISTS "origin_id" TEXT;

UPDATE "Transaction"
SET "origin_type" = 'MANUAL'
WHERE "origin_type" IS NULL;

ALTER TABLE "Transaction"
  ALTER COLUMN "origin_type" SET DEFAULT 'MANUAL',
  ALTER COLUMN "origin_type" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "Transaction_workspace_id_date_idx"
  ON "Transaction"("workspace_id", "date");

CREATE INDEX IF NOT EXISTS "Transaction_workspace_id_status_date_idx"
  ON "Transaction"("workspace_id", "status", "date");

CREATE INDEX IF NOT EXISTS "Transaction_workspace_id_wallet_id_date_idx"
  ON "Transaction"("workspace_id", "wallet_id", "date");

CREATE INDEX IF NOT EXISTS "Transaction_workspace_id_status_due_date_idx"
  ON "Transaction"("workspace_id", "status", "due_date");

CREATE INDEX IF NOT EXISTS "Transaction_workspace_id_origin_type_origin_id_idx"
  ON "Transaction"("workspace_id", "origin_type", "origin_id");

CREATE INDEX IF NOT EXISTS "Transaction_workspace_id_wallet_id_due_date_idx"
  ON "Transaction"("workspace_id", "wallet_id", "due_date");

CREATE INDEX IF NOT EXISTS "Transaction_workspace_id_destination_wallet_id_date_idx"
  ON "Transaction"("workspace_id", "destination_wallet_id", "date");

CREATE INDEX IF NOT EXISTS "Transaction_workspace_id_category_id_date_idx"
  ON "Transaction"("workspace_id", "category_id", "date");

CREATE INDEX IF NOT EXISTS "Transaction_workspace_id_created_at_idx"
  ON "Transaction"("workspace_id", "created_at");

CREATE UNIQUE INDEX IF NOT EXISTS "Wallet_workspace_id_name_key"
  ON "Wallet"("workspace_id", "name");

-- Create recurrence rule source-of-truth table expected by runtime.
CREATE TABLE IF NOT EXISTS "RecurrenceRule" (
  "id" TEXT NOT NULL,
  "workspace_id" TEXT NOT NULL,
  "wallet_id" TEXT NOT NULL,
  "category_id" TEXT,
  "kind" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "amount" DECIMAL(12,2) NOT NULL,
  "payment_method" TEXT NOT NULL DEFAULT 'OTHER',
  "frequency" TEXT NOT NULL DEFAULT 'MONTHLY',
  "interval" INTEGER NOT NULL DEFAULT 1,
  "start_date" TIMESTAMP(3) NOT NULL,
  "end_date" TIMESTAMP(3),
  "anchor_day" INTEGER,
  "timezone" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "last_projected_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "RecurrenceRule_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "RecurrenceRule_workspace_id_status_start_date_end_date_idx"
  ON "RecurrenceRule"("workspace_id", "status", "start_date", "end_date");

CREATE INDEX IF NOT EXISTS "RecurrenceRule_workspace_id_created_at_idx"
  ON "RecurrenceRule"("workspace_id", "created_at");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'RecurrenceRule_workspace_id_fkey'
  ) THEN
    ALTER TABLE "RecurrenceRule"
      ADD CONSTRAINT "RecurrenceRule_workspace_id_fkey"
      FOREIGN KEY ("workspace_id") REFERENCES "Workspace"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'RecurrenceRule_wallet_id_fkey'
  ) THEN
    ALTER TABLE "RecurrenceRule"
      ADD CONSTRAINT "RecurrenceRule_wallet_id_fkey"
      FOREIGN KEY ("wallet_id") REFERENCES "Wallet"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'RecurrenceRule_category_id_fkey'
  ) THEN
    ALTER TABLE "RecurrenceRule"
      ADD CONSTRAINT "RecurrenceRule_category_id_fkey"
      FOREIGN KEY ("category_id") REFERENCES "Category"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
