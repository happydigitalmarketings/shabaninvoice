/**
 * Returns the configured backend API base URL.
 * In production builds with no explicit VITE_API_URL, defaults to same-origin `/api`
 * so single-project Vercel or single-server deployments work without extra configuration.
 */
export function getApiBaseUrl(): string {
  const configured = (import.meta.env.VITE_API_URL || '').trim();
  if (configured) return configured;
  return import.meta.env.PROD ? '/api' : 'http://localhost:5000/api';
}

/**
 * Returns the backend root origin without the trailing `/api` path segment.
 */
export function getBackendOrigin(): string {
  return getApiBaseUrl().replace(/\/api\/?$/, '');
}

/**
 * Resolves a stored PDF or asset URL against the active backend origin.
 * Legacy localhost URLs migrated from local dev are transparently rewritten.
 */
export function resolveBackendAssetUrl(url?: string): string {
  if (!url) return '';
  const origin = getBackendOrigin();

  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//i.test(url)) {
    try {
      const parsed = new URL(url);
      return `${origin}${parsed.pathname}${parsed.search}`;
    } catch {
      return url;
    }
  }

  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  return `${origin}${url.startsWith('/') ? '' : '/'}${url}`;
}
