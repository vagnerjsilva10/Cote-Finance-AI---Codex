import 'server-only';

import { prisma } from '@/lib/prisma';
import { normalizeWhatsappPhone } from '@/lib/whatsapp';

export type WhatsAppWorkspaceResolution = {
  workspaceId: string;
  workspaceName: string;
  phone: string;
  userName: string | null;
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

  const ownerMembership = await prisma.workspaceMember.findFirst({
    where: {
      workspace_id: workspace.id,
      role: 'OWNER',
    },
    select: {
      user: {
        select: {
          name: true,
        },
      },
    },
  });

  const adminMembership = ownerMembership
    ? null
    : await prisma.workspaceMember.findFirst({
        where: {
          workspace_id: workspace.id,
          role: 'ADMIN',
        },
        select: {
          user: {
            select: {
              name: true,
            },
          },
        },
      });

  return {
    workspaceId: workspace.id,
    workspaceName: workspace.name,
    phone: workspace.whatsapp_phone_number || sender,
    userName: ownerMembership?.user?.name || adminMembership?.user?.name || null,
  };
}
