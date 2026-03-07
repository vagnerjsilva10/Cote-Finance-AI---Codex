export function getSiteUrl() {
  const value =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    'https://finance.cotejuros.com.br';

  return String(value).trim().replace(/\/+$/, '');
}

export function absoluteUrl(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getSiteUrl()}${normalizedPath}`;
}
