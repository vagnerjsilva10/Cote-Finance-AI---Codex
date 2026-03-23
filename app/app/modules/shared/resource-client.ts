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
}) {
  const response = await fetch(params.path, {
    headers: await params.getAuthHeaders(false, params.workspaceIdOverride ?? null),
  });

  if (!response.ok) {
    throw new ResourceClientError(`Falha ao buscar recurso (${params.path}) HTTP ${response.status}.`, {
      status: response.status,
      path: params.path,
    });
  }

  return (await response.json()) as T;
}
