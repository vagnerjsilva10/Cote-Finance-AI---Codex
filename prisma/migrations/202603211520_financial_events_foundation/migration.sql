CREATE TABLE IF NOT EXISTS "FinancialEvent" (
  "id" TEXT NOT NULL,
  "user_id" TEXT,
  "workspace_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "type" TEXT NOT NULL,
  "amount" DECIMAL(12,2),
  "category" TEXT,
  "date" TIMESTAMP(3) NOT NULL,
  "end_date" TIMESTAMP(3),
  "recurrence" TEXT NOT NULL DEFAULT 'NONE',
  "recurrence_interval" INTEGER NOT NULL DEFAULT 1,
  "is_recurring" BOOLEAN NOT NULL DEFAULT false,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "source_type" TEXT NOT NULL DEFAULT 'MANUAL',
  "source_id" TEXT,
  "reminder_enabled" BOOLEAN NOT NULL DEFAULT false,
  "reminder_days_before" INTEGER NOT NULL DEFAULT 0,
  "color_token" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "FinancialEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "FinancialEventOccurrence" (
  "id" TEXT NOT NULL,
  "financial_event_id" TEXT NOT NULL,
  "occurrence_date" TIMESTAMP(3) NOT NULL,
  "title" TEXT,
  "description" TEXT,
  "amount" DECIMAL(12,2),
  "status" TEXT,
  "reminder_enabled" BOOLEAN,
  "reminder_days_before" INTEGER,
  "is_deleted" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "FinancialEventOccurrence_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "FinancialEventOccurrence_financial_event_id_occurrence_date_key"
  ON "FinancialEventOccurrence"("financial_event_id", "occurrence_date");

CREATE INDEX IF NOT EXISTS "FinancialEvent_workspace_id_date_idx"
  ON "FinancialEvent"("workspace_id", "date");

CREATE INDEX IF NOT EXISTS "FinancialEvent_workspace_id_type_status_idx"
  ON "FinancialEvent"("workspace_id", "type", "status");

CREATE INDEX IF NOT EXISTS "FinancialEvent_workspace_id_source_type_source_id_idx"
  ON "FinancialEvent"("workspace_id", "source_type", "source_id");

CREATE INDEX IF NOT EXISTS "FinancialEvent_user_id_date_idx"
  ON "FinancialEvent"("user_id", "date");

CREATE INDEX IF NOT EXISTS "FinancialEventOccurrence_occurrence_date_idx"
  ON "FinancialEventOccurrence"("occurrence_date");

CREATE INDEX IF NOT EXISTS "FinancialEventOccurrence_financial_event_id_is_deleted_idx"
  ON "FinancialEventOccurrence"("financial_event_id", "is_deleted");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'FinancialEvent_user_id_fkey'
  ) THEN
    ALTER TABLE "FinancialEvent"
      ADD CONSTRAINT "FinancialEvent_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'FinancialEvent_workspace_id_fkey'
  ) THEN
    ALTER TABLE "FinancialEvent"
      ADD CONSTRAINT "FinancialEvent_workspace_id_fkey"
      FOREIGN KEY ("workspace_id") REFERENCES "Workspace"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'FinancialEventOccurrence_financial_event_id_fkey'
  ) THEN
    ALTER TABLE "FinancialEventOccurrence"
      ADD CONSTRAINT "FinancialEventOccurrence_financial_event_id_fkey"
      FOREIGN KEY ("financial_event_id") REFERENCES "FinancialEvent"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
