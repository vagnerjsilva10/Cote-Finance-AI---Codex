-- Ensure Transaction supports transfer destination and receipt metadata
ALTER TABLE "Transaction"
  ADD COLUMN IF NOT EXISTS "destination_wallet_id" TEXT,
  ADD COLUMN IF NOT EXISTS "payment_method" TEXT NOT NULL DEFAULT 'OTHER',
  ADD COLUMN IF NOT EXISTS "receipt_url" TEXT,
  ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Add FK only when it does not already exist
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

-- Workspace-scoped category suggestion memory for auto classification
CREATE TABLE IF NOT EXISTS "CategorySuggestion" (
  "id" TEXT NOT NULL,
  "workspace_id" TEXT NOT NULL,
  "keyword" TEXT NOT NULL,
  "category_id" TEXT,
  "category_name" TEXT NOT NULL,
  "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CategorySuggestion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CategorySuggestion_workspace_id_keyword_key"
  ON "CategorySuggestion"("workspace_id", "keyword");

CREATE INDEX IF NOT EXISTS "CategorySuggestion_workspace_id_updated_at_idx"
  ON "CategorySuggestion"("workspace_id", "updated_at");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'CategorySuggestion_workspace_id_fkey'
  ) THEN
    ALTER TABLE "CategorySuggestion"
      ADD CONSTRAINT "CategorySuggestion_workspace_id_fkey"
      FOREIGN KEY ("workspace_id") REFERENCES "Workspace"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'CategorySuggestion_category_id_fkey'
  ) THEN
    ALTER TABLE "CategorySuggestion"
      ADD CONSTRAINT "CategorySuggestion_category_id_fkey"
      FOREIGN KEY ("category_id") REFERENCES "Category"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
