-- Align @updatedAt columns with Prisma schema (no DB-level default).
ALTER TABLE "CalendarEventReadModel" ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE "DailyCashProjection" ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE "DashboardReadModel" ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE "FinancialEvent" ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE "FinancialEventOccurrence" ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE "MarketingAttribution" ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE "PlatformSetting" ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE "RecurringDebt" ALTER COLUMN "updated_at" DROP DEFAULT;
