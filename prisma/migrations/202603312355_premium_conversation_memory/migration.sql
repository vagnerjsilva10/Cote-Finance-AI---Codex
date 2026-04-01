CREATE TABLE "conversation_memory" (
  "id" TEXT NOT NULL,
  "workspace_id" TEXT NOT NULL,
  "user_phone" TEXT NOT NULL,
  "messages" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "conversation_memory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "conversation_memory_workspace_id_user_phone_key"
  ON "conversation_memory"("workspace_id", "user_phone");

CREATE INDEX "conversation_memory_workspace_id_updated_at_idx"
  ON "conversation_memory"("workspace_id", "updated_at");

ALTER TABLE "conversation_memory"
  ADD CONSTRAINT "conversation_memory_workspace_id_fkey"
  FOREIGN KEY ("workspace_id") REFERENCES "Workspace"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
