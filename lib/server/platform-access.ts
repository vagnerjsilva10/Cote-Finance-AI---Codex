import { HttpError, requireAuthenticatedUser } from '@/lib/server/multi-tenant';

export type PlatformRole = 'user' | 'admin' | 'superadmin';

export type PlatformAccess = {
  userId: string;
  email: string | null;
  platformRole: PlatformRole;
  isAdmin: boolean;
  isSuperadmin: boolean;
};

function parseEmailList(value: string | undefined) {
  return new Set(
    (value || '')
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function getPlatformRoleForEmail(email: string | null): PlatformRole {
  if (!email) return 'user';
  const normalizedEmail = email.trim().toLowerCase();
  const superadmins = parseEmailList(process.env.SUPERADMIN_EMAILS);
  if (superadmins.has(normalizedEmail)) return 'superadmin';

  const admins = parseEmailList(process.env.ADMIN_EMAILS);
  if (admins.has(normalizedEmail)) return 'admin';

  return 'user';
}

export async function resolvePlatformAccess(req: Request): Promise<PlatformAccess> {
  const authUser = await requireAuthenticatedUser(req);
  const platformRole = getPlatformRoleForEmail(authUser.email);

  return {
    userId: authUser.userId,
    email: authUser.email,
    platformRole,
    isAdmin: platformRole === 'admin' || platformRole === 'superadmin',
    isSuperadmin: platformRole === 'superadmin',
  };
}

export async function requireSuperadminAccess(req: Request) {
  const access = await resolvePlatformAccess(req);
  if (!access.isSuperadmin) {
    throw new HttpError(403, 'Permissão negada');
  }
  return access;
}
