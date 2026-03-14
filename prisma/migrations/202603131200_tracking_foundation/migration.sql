-- CreateTable
CREATE TABLE "PlatformSetting" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PlatformSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketingAttribution" (
  "id" TEXT NOT NULL,
  "user_id" TEXT,
  "workspace_id" TEXT,
  "landing_path" TEXT,
  "initial_referrer" TEXT,
  "utm_source" TEXT,
  "utm_medium" TEXT,
  "utm_campaign" TEXT,
  "utm_content" TEXT,
  "utm_term" TEXT,
  "fbclid" TEXT,
  "xcod" TEXT,
  "raw_params" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MarketingAttribution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlatformSetting_key_key" ON "PlatformSetting"("key");

-- CreateIndex
CREATE UNIQUE INDEX "MarketingAttribution_user_id_key" ON "MarketingAttribution"("user_id");

-- CreateIndex
CREATE INDEX "MarketingAttribution_utm_source_created_at_idx" ON "MarketingAttribution"("utm_source", "created_at");

-- CreateIndex
CREATE INDEX "MarketingAttribution_utm_campaign_created_at_idx" ON "MarketingAttribution"("utm_campaign", "created_at");

-- CreateIndex
CREATE INDEX "MarketingAttribution_workspace_id_idx" ON "MarketingAttribution"("workspace_id");

-- AddForeignKey
ALTER TABLE "MarketingAttribution" ADD CONSTRAINT "MarketingAttribution_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketingAttribution" ADD CONSTRAINT "MarketingAttribution_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;
