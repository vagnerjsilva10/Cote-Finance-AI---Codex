import 'server-only';

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

const WHATSAPP_MESSAGE_IDEMPOTENCY_PREFIX = 'whatsapp.assistant.processed-message.';

export function buildWhatsAppMessageIdempotencyKey(messageId: string) {
  return `${WHATSAPP_MESSAGE_IDEMPOTENCY_PREFIX}${messageId.trim()}`;
}

export async function markWhatsAppMessageAsProcessed(params: {
  workspaceId: string;
  messageId: string;
  from: string;
}) {
  const messageId = params.messageId.trim();
  if (!messageId) {
    return { alreadyProcessed: false };
  }

  const key = buildWhatsAppMessageIdempotencyKey(messageId);
  const existing = await prisma.platformSetting.findUnique({
    where: { key },
    select: { key: true },
  });

  if (existing) {
    return { alreadyProcessed: true };
  }

  try {
    await prisma.platformSetting.create({
      data: {
        key,
        value: {
          workspaceId: params.workspaceId,
          from: params.from,
          processedAt: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return { alreadyProcessed: true };
    }
    throw error;
  }

  return { alreadyProcessed: false };
}
