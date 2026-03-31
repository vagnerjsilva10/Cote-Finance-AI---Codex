import 'server-only';

import { prisma } from '@/lib/prisma';
import { normalizeWhatsappPhone } from '@/lib/whatsapp';

export type WhatsAppWorkspaceResolution = {
  workspaceId: string;
  workspaceName: string;
  phone: string;
};

export async function resolveWorkspaceFromWhatsAppSender(rawSender: string): Promise<WhatsAppWorkspaceResolution | null> {
  const sender = normalizeWhatsappPhone(rawSender);
  if (!sender) return null;

  const workspace = await prisma.workspace.findFirst({
    where: {
      whatsapp_status: 'CONNECTED',
      whatsapp_phone_number: sender,
    },
    select: {
      id: true,
      name: true,
      whatsapp_phone_number: true,
    },
    orderBy: {
      updated_at: 'desc',
    },
  });

  if (!workspace) return null;

  return {
    workspaceId: workspace.id,
    workspaceName: workspace.name,
    phone: workspace.whatsapp_phone_number || sender,
  };
}

