ALTER TABLE "Debt"
ADD COLUMN "due_date" TIMESTAMP(3);

ALTER TABLE "WorkspacePreference"
ADD COLUMN "onboarding_dismissed" BOOLEAN NOT NULL DEFAULT false;
