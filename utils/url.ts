export function normalizeBaseUrl(url: string) {
  const trimmed = url.trim().replace(/\/+$/, '');
  return trimmed.replace(/\/api\/v1$/, '');
}

export function joinUrl(baseUrl: string, ...segments: string[]) {
  const cleanedBase = normalizeBaseUrl(baseUrl);
  const cleanedSegments = segments
    .flatMap((segment) => segment.split('/'))
    .map((segment) => segment.trim())
    .filter(Boolean);

  return [cleanedBase, ...cleanedSegments].join('/');
}
