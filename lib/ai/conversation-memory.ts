import 'server-only';

import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { normalizeWhatsappPhone } from '@/lib/whatsapp';
import { MAX_CONVERSATION_TURNS, trimConversationMemoryMessages } from '@/lib/ai/conversation-memory-helpers';

const MAX_CONVERSATION_MESSAGES = MAX_CONVERSATION_TURNS * 2;

export type ConversationMemoryRole = 'user' | 'assistant' | 'system';

export type ConversationMemoryMessage = {
  id: string;
  role: ConversationMemoryRole;
  content: string;
  createdAt: string;
  metadata?: Record<string, unknown> | null;
};

function isMissingConversationMemoryTableError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || '');
  return /conversation_memory|relation .* does not exist|table .* doesn't exist/i.test(message);
}

function assertWorkspaceId(value: string) {
  const workspaceId = String(value || '').trim();
  if (!workspaceId) {
    throw new Error('workspaceId is required for conversation memory.');
  }
  return workspaceId;
}

function assertParticipantKey(value: string) {
  const participant = String(value || '').trim();
  if (!participant) {
    throw new Error('userPhone is required for conversation memory.');
  }
  return participant;
}

function isRole(value: unknown): value is ConversationMemoryRole {
  return value === 'user' || value === 'assistant' || value === 'system';
}

function coerceMessages(value: Prisma.JsonValue): ConversationMemoryMessage[] {
  if (!Array.isArray(value)) return [];

  const parsed: ConversationMemoryMessage[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const role = row.role;
    const content = typeof row.content === 'string' ? row.content.trim() : '';
    const createdAt = typeof row.createdAt === 'string' ? row.createdAt : new Date().toISOString();
    if (!isRole(role) || !content) continue;

    const metadata =
      row.metadata && typeof row.metadata === 'object' ? (row.metadata as Record<string, unknown>) : null;

    parsed.push({
      id: typeof row.id === 'string' ? row.id : crypto.randomUUID(),
      role,
      content,
      createdAt,
      metadata,
    });
  }

  return parsed;
}

function trimMessages(messages: ConversationMemoryMessage[], turns = MAX_CONVERSATION_TURNS) {
  return trimConversationMemoryMessages(messages, turns);
}

export function resolveConversationMemoryParticipant(params: {
  userPhone?: string | null;
  userId?: string | null;
  channel: 'whatsapp' | 'app';
}) {
  const normalizedPhone = normalizeWhatsappPhone(String(params.userPhone || ''));
  if (normalizedPhone) return normalizedPhone;

  const userId = String(params.userId || '').trim();
  if (userId) return `app:${userId}`;

  return `${params.channel}:anonymous`;
}

export async function getConversationMemory(params: {
  workspaceId: string;
  userPhone: string;
  turns?: number;
}) {
  const workspaceId = assertWorkspaceId(params.workspaceId);
  const userPhone = assertParticipantKey(params.userPhone);
  const turns = params.turns ?? MAX_CONVERSATION_TURNS;

  try {
    const rows = await prisma.$queryRaw<Array<{ messages: Prisma.JsonValue }>>(Prisma.sql`
      SELECT "messages"
      FROM "conversation_memory"
      WHERE "workspace_id" = ${workspaceId}
        AND "user_phone" = ${userPhone}
      ORDER BY "created_at" DESC
      LIMIT 1
    `);

    const messages = coerceMessages(rows[0]?.messages ?? []);
    return trimMessages(messages, turns);
  } catch (error) {
    if (isMissingConversationMemoryTableError(error)) {
      return [];
    }
    throw error;
  }
}

export async function appendConversationMemory(params: {
  workspaceId: string;
  userPhone: string;
  messages: Array<{
    role: ConversationMemoryRole;
    content: string;
    metadata?: Record<string, unknown> | null;
  }>;
  turns?: number;
}) {
  const workspaceId = assertWorkspaceId(params.workspaceId);
  const userPhone = assertParticipantKey(params.userPhone);
  const incoming = Array.isArray(params.messages) ? params.messages : [];
  if (!incoming.length) {
    return getConversationMemory({
      workspaceId,
      userPhone,
      turns: params.turns,
    });
  }

  const existing = await getConversationMemory({
    workspaceId,
    userPhone,
    turns: params.turns,
  });

  const now = new Date().toISOString();
  const normalizedIncoming: ConversationMemoryMessage[] = [];
  for (const item of incoming) {
    const content = String(item.content || '').trim();
    if (!content || !isRole(item.role)) continue;
    normalizedIncoming.push({
      id: String(crypto.randomUUID()),
      role: item.role,
      content,
      createdAt: now,
      metadata: item.metadata || null,
    });
  }

  const merged = trimMessages([...existing, ...normalizedIncoming], params.turns ?? MAX_CONVERSATION_TURNS);
  const persisted = trimMessages(merged, MAX_CONVERSATION_TURNS);

  try {
    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO "conversation_memory" (
        "id",
        "workspace_id",
        "user_phone",
        "messages",
        "created_at",
        "updated_at"
      )
      VALUES (
        ${crypto.randomUUID()},
        ${workspaceId},
        ${userPhone},
        ${JSON.stringify(persisted)}::jsonb,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
      ON CONFLICT ("workspace_id", "user_phone")
      DO UPDATE SET
        "messages" = EXCLUDED."messages",
        "updated_at" = CURRENT_TIMESTAMP
    `);
  } catch (error) {
    if (!isMissingConversationMemoryTableError(error)) {
      throw error;
    }
  }

  return persisted;
}

export function findLastAssistantToolResult<T = Record<string, unknown>>(
  messages: ConversationMemoryMessage[],
  toolName: string
) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (!message || message.role !== 'assistant') continue;
    const metadata = message.metadata || {};
    if (metadata.toolName !== toolName) continue;
    return (metadata.toolResult as T | undefined) ?? null;
  }
  return null;
}

export function findLatestTransactionIdFromMemory(messages: ConversationMemoryMessage[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (!message || message.role !== 'assistant') continue;
    const metadata = message.metadata || {};
    const transactionId = typeof metadata.transactionId === 'string' ? metadata.transactionId.trim() : '';
    if (transactionId) return transactionId;
    const toolResult =
      metadata.toolResult && typeof metadata.toolResult === 'object'
        ? (metadata.toolResult as Record<string, unknown>)
        : null;
    const fromResult = typeof toolResult?.transactionId === 'string' ? toolResult.transactionId.trim() : '';
    if (fromResult) return fromResult;
  }
  return null;
}

export function trimConversationMemoryToTenTurns(messages: ConversationMemoryMessage[]) {
  return trimMessages(messages, MAX_CONVERSATION_TURNS).slice(-MAX_CONVERSATION_MESSAGES);
}
