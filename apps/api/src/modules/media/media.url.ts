/**
 * Builds a public media URL routed through the API (which streams from MinIO
 * over the internal Docker network). Avoids the need for a public storage
 * subdomain.
 */
export function buildMediaUrl(baseUrl: string, bucket: string, key: string): string {
  const base = baseUrl.replace(/\/+$/, '');
  return `${base}/v1/media/${bucket}/${key}`;
}
