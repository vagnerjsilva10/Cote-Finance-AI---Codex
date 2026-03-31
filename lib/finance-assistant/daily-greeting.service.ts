import 'server-only';

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { normalizeWhatsappPhone } from '@/lib/whatsapp';

function getSaoPauloDateKey(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);

  const year = parts.find((part) => part.type === 'year')?.value || '0000';
  const month = parts.find((part) => part.type === 'month')?.value || '00';
  const day = parts.find((part) => part.type === 'day')?.value || '00';
  return `${year}-${month}-${day}`;
}

function normalizeFirstName(name: string | null | undefined) {
  const fullName = String(name || '').trim();
  if (!fullName) return null;
  const [firstName] = fullName.split(/\s+/);
  if (!firstName) return null;
  return firstName.charAt(0).toUpperCase() + firstName.slice(1);
}

function buildDailyGreetingKey(params: {
  workspaceId: string;
  sender: string;
  dateKey: string;
}) {
  const normalizedSender = normalizeWhatsappPhone(params.sender) || params.sender.trim();
  return `whatsapp.assistant.daily-greeting.${params.workspaceId}.${normalizedSender}.${params.dateKey}`;
}

export async function resolveDailyGreeting(params: {
  workspaceId: string;
  sender: string;
  userName?: string | null;
}) {
  const dateKey = getSaoPauloDateKey();
  const greetingKey = buildDailyGreetingKey({
    workspaceId: params.workspaceId,
    sender: params.sender,
    dateKey,
  });

  try {
    await prisma.platformSetting.create({
      data: {
        key: greetingKey,
        value: {
          workspaceId: params.workspaceId,
          sender: normalizeWhatsappPhone(params.sender) || params.sender,
          greetedAt: new Date().toISOString(),
          dateKey,
        },
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return null;
    }
    throw error;
  }

  const firstName = normalizeFirstName(params.userName);
  if (firstName) {
    return `Olá ${firstName}, como está?`;
  }

  return 'Olá, como está?';
}

