export type AuthHeadersResolver = (
  withJsonContentType?: boolean,
  workspaceIdOverride?: string | null
) => Promise<Record<string, string>>;

export class ResourceClientError extends Error {
  readonly status: number;
  readonly path: string;

  constructor(message: string, params: { status: number; path: string }) {
    super(message);
    this.name = 'ResourceClientError';
    this.status = params.status;
    this.path = params.path;
  }
}

export async function fetchResourceJson<T>(params: {
  path: string;
  getAuthHeaders: AuthHeadersResolver;
  workspaceIdOverride?: string | null;
  timeoutMs?: number;
}) {
  const controller = new AbortController();
  const timeoutMs = Math.max(1000, Number(params.timeoutMs || 12000));
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(params.path, {
      headers: await params.getAuthHeaders(false, params.workspaceIdOverride ?? null),
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timeout);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ResourceClientError(
        `Tempo limite ao buscar recurso (${params.path}).`,
        {
          status: 408,
          path: params.path,
        }
      );
    }
    throw error;
  }

  clearTimeout(timeout);

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { message?: string; error?: string }
      | null;
    const message =
      typeof payload?.message === 'string' && payload.message.trim()
        ? payload.message.trim()
        : typeof payload?.error === 'string' && payload.error.trim()
          ? payload.error.trim()
          : `Falha ao buscar recurso (${params.path}) HTTP ${response.status}.`;

    throw new ResourceClientError(message, {
      status: response.status,
      path: params.path,
    });
  }

  return (await response.json()) as T;
}
