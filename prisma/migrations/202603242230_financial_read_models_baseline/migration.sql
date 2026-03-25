-- Baseline for financial read models used by dashboard + calendar sync paths.

CREATE TABLE IF NOT EXISTS "DailyCashProjection" (
  "id" TEXT NOT NULL,
  "workspace_id" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "opening_balance" DECIMAL(12,2) NOT NULL,
  "inflow_confirmed" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "outflow_confirmed" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "inflow_planned" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "outflow_planned" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "closing_balance" DECIMAL(12,2) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "DailyCashProjection_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "DailyCashProjection"
  ADD COLUMN IF NOT EXISTS "workspace_id" TEXT,
  ADD COLUMN IF NOT EXISTS "date" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "opening_balance" DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS "inflow_confirmed" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "outflow_confirmed" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "inflow_planned" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "outflow_planned" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "closing_balance" DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS "CalendarEventReadModel" (
  "id" TEXT NOT NULL,
  "workspace_id" TEXT NOT NULL,
  "occurrence_key" TEXT NOT NULL,
  "event_id" TEXT NOT NULL,
  "series_date" TIMESTAMP(3) NOT NULL,
  "source_type" TEXT NOT NULL,
  "source_id" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "type" TEXT NOT NULL,
  "amount" DECIMAL(12,2),
  "category" TEXT,
  "date" TIMESTAMP(3) NOT NULL,
  "end_date" TIMESTAMP(3),
  "recurrence" TEXT NOT NULL,
  "recurrence_interval" INTEGER NOT NULL,
  "is_recurring" BOOLEAN NOT NULL,
  "status" TEXT NOT NULL,
  "flow" TEXT NOT NULL,
  "reminder_enabled" BOOLEAN NOT NULL,
  "reminder_days_before" INTEGER NOT NULL,
  "color_token" TEXT,
  "is_manual" BOOLEAN NOT NULL,
  "is_overdue" BOOLEAN NOT NULL,
  "is_derived" BOOLEAN NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CalendarEventReadModel_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "CalendarEventReadModel"
  ADD COLUMN IF NOT EXISTS "workspace_id" TEXT,
  ADD COLUMN IF NOT EXISTS "occurrence_key" TEXT,
  ADD COLUMN IF NOT EXISTS "event_id" TEXT,
  ADD COLUMN IF NOT EXISTS "series_date" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "source_type" TEXT,
  ADD COLUMN IF NOT EXISTS "source_id" TEXT,
  ADD COLUMN IF NOT EXISTS "title" TEXT,
  ADD COLUMN IF NOT EXISTS "description" TEXT,
  ADD COLUMN IF NOT EXISTS "type" TEXT,
  ADD COLUMN IF NOT EXISTS "amount" DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS "category" TEXT,
  ADD COLUMN IF NOT EXISTS "date" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "end_date" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "recurrence" TEXT,
  ADD COLUMN IF NOT EXISTS "recurrence_interval" INTEGER,
  ADD COLUMN IF NOT EXISTS "is_recurring" BOOLEAN,
  ADD COLUMN IF NOT EXISTS "status" TEXT,
  ADD COLUMN IF NOT EXISTS "flow" TEXT,
  ADD COLUMN IF NOT EXISTS "reminder_enabled" BOOLEAN,
  ADD COLUMN IF NOT EXISTS "reminder_days_before" INTEGER,
  ADD COLUMN IF NOT EXISTS "color_token" TEXT,
  ADD COLUMN IF NOT EXISTS "is_manual" BOOLEAN,
  ADD COLUMN IF NOT EXISTS "is_overdue" BOOLEAN,
  ADD COLUMN IF NOT EXISTS "is_derived" BOOLEAN,
  ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS "DashboardReadModel" (
  "id" TEXT NOT NULL,
  "workspace_id" TEXT NOT NULL,
  "as_of_date" TIMESTAMP(3) NOT NULL,
  "current_balance" DECIMAL(12,2) NOT NULL,
  "projected_balance_30d" DECIMAL(12,2) NOT NULL,
  "projected_negative_date" TIMESTAMP(3),
  "month_confirmed_income" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "month_confirmed_expense" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "month_planned_income" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "month_planned_expense" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "upcoming_events_count_14d" INTEGER NOT NULL DEFAULT 0,
  "next_critical_date" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "DashboardReadModel_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "DashboardReadModel"
  ADD COLUMN IF NOT EXISTS "workspace_id" TEXT,
  ADD COLUMN IF NOT EXISTS "as_of_date" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "current_balance" DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS "projected_balance_30d" DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS "projected_negative_date" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "month_confirmed_income" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "month_confirmed_expense" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "month_planned_income" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "month_planned_expense" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "upcoming_events_count_14d" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "next_critical_date" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX IF NOT EXISTS "DailyCashProjection_workspace_id_date_key"
  ON "DailyCashProjection"("workspace_id", "date");

CREATE INDEX IF NOT EXISTS "DailyCashProjection_workspace_id_date_idx"
  ON "DailyCashProjection"("workspace_id", "date");

CREATE UNIQUE INDEX IF NOT EXISTS "CalendarEventReadModel_workspace_id_occurrence_key_key"
  ON "CalendarEventReadModel"("workspace_id", "occurrence_key");

CREATE INDEX IF NOT EXISTS "CalendarEventReadModel_workspace_id_date_idx"
  ON "CalendarEventReadModel"("workspace_id", "date");

CREATE INDEX IF NOT EXISTS "CalendarEventReadModel_workspace_id_status_date_idx"
  ON "CalendarEventReadModel"("workspace_id", "status", "date");

CREATE UNIQUE INDEX IF NOT EXISTS "DashboardReadModel_workspace_id_key"
  ON "DashboardReadModel"("workspace_id");

CREATE INDEX IF NOT EXISTS "DashboardReadModel_workspace_id_updated_at_idx"
  ON "DashboardReadModel"("workspace_id", "updated_at");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'DailyCashProjection_workspace_id_fkey'
  ) THEN
    ALTER TABLE "DailyCashProjection"
      ADD CONSTRAINT "DailyCashProjection_workspace_id_fkey"
      FOREIGN KEY ("workspace_id") REFERENCES "Workspace"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'CalendarEventReadModel_workspace_id_fkey'
  ) THEN
    ALTER TABLE "CalendarEventReadModel"
      ADD CONSTRAINT "CalendarEventReadModel_workspace_id_fkey"
      FOREIGN KEY ("workspace_id") REFERENCES "Workspace"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'DashboardReadModel_workspace_id_fkey'
  ) THEN
    ALTER TABLE "DashboardReadModel"
      ADD CONSTRAINT "DashboardReadModel_workspace_id_fkey"
      FOREIGN KEY ("workspace_id") REFERENCES "Workspace"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
