-- Ensure transaction write-path columns exist in all environments.
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

-- Indexes tuned for write flows + post-write reads (dashboard/calendar/reports).
CREATE INDEX IF NOT EXISTS "Transaction_workspace_id_destination_wallet_id_date_idx"
  ON "Transaction"("workspace_id", "destination_wallet_id", "date");

CREATE INDEX IF NOT EXISTS "Transaction_workspace_id_category_id_date_idx"
  ON "Transaction"("workspace_id", "category_id", "date");

CREATE INDEX IF NOT EXISTS "Transaction_workspace_id_created_at_idx"
  ON "Transaction"("workspace_id", "created_at");

