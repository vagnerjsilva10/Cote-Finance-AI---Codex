import { Prisma } from '@prisma/client';
import { asPrismaServiceUnavailableError, prisma } from '@/lib/prisma';
import { HttpError, requireAuthenticatedUser } from '@/lib/server/multi-tenant';

export type PlatformRole = 'user' | 'admin' | 'superadmin';

export type PlatformAccess = {
  userId: string;
  email: string | null;
  platformRole: PlatformRole;
  roleSource: 'env' | 'override' | 'default';
  isAdmin: boolean;
  isSuperadmin: boolean;
};

const PLATFORM_ROLE_OVERRIDES_KEY = 'superadmin.platform-role-overrides';

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

function normalizeOverrideRole(value: unknown): PlatformRole | null {
  if (value === 'superadmin' || value === 'admin' || value === 'user') return value;
  return null;
}

function isMissingPlatformSettingError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === 'P2021' || error.code === 'P2022';
  }

  const message = error instanceof Error ? error.message : String(error || '');
  return /does not exist|relation .* does not exist|table .* doesn't exist|column .* does not exist/i.test(message);
}

async function readPlatformRoleOverrides() {
  try {
    const setting = await prisma.platformSetting.findUnique({
      where: { key: PLATFORM_ROLE_OVERRIDES_KEY },
      select: { value: true },
    });

    const raw = setting?.value;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return {} as Record<string, PlatformRole>;
    }

    return Object.entries(raw as Record<string, unknown>).reduce<Record<string, PlatformRole>>((acc, [email, role]) => {
      const normalizedRole = normalizeOverrideRole(role);
      if (normalizedRole) acc[email.trim().toLowerCase()] = normalizedRole;
      return acc;
    }, {});
  } catch (error) {
    if (asPrismaServiceUnavailableError(error) || isMissingPlatformSettingError(error)) {
      return {} as Record<string, PlatformRole>;
    }

    throw error;
  }
}

export async function resolvePlatformRoleForEmail(email: string | null): Promise<{
  role: PlatformRole;
  source: 'env' | 'override' | 'default';
}> {
  if (!email) return { role: 'user', source: 'default' };

  const normalizedEmail = email.trim().toLowerCase();
  const envRole = getPlatformRoleForEmail(normalizedEmail);
  if (envRole === 'superadmin') {
    return { role: 'superadmin', source: 'env' };
  }
  const overrides = await readPlatformRoleOverrides();
  const overrideRole = overrides[normalizedEmail];

  if (overrideRole) return { role: overrideRole, source: 'override' };
  if (envRole !== 'user') return { role: envRole, source: 'env' };
  return { role: 'user', source: 'default' };
}

export async function resolvePlatformAccess(req: Request): Promise<PlatformAccess> {
  const authUser = await requireAuthenticatedUser(req);
  const resolvedRole = await resolvePlatformRoleForEmail(authUser.email);
  const platformRole = resolvedRole.role;

  return {
    userId: authUser.userId,
    email: authUser.email,
    platformRole,
    roleSource: resolvedRole.source,
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
