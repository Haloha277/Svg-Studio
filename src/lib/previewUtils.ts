export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 8;

export function clampZoom(zoom: number): number {
  if (!Number.isFinite(zoom)) return 1;
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(zoom * 100) / 100));
}

export function stepZoom(currentZoom: number, direction: 'in' | 'out'): number {
  const factor = direction === 'in' ? 1.25 : 0.8;
  return clampZoom(currentZoom * factor);
}

export function calculateFitZoom(
  containerWidth: number,
  containerHeight: number,
  svgWidth: number,
  svgHeight: number,
  padding = 48
): number {
  const availW = Math.max(40, containerWidth - padding * 2);
  const availH = Math.max(40, containerHeight - padding * 2);
  const safeW = Math.max(1, svgWidth);
  const safeH = Math.max(1, svgHeight);
  const ratio = Math.min(availW / safeW, availH / safeH);
  return clampZoom(ratio);
}

export function sanitizeSvgFilename(projectName: string): string {
  const cleaned = projectName
    .trim()
    .toLowerCase()
    .replace(/\.svg$/i, '')
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const base = cleaned || 'untitled-artwork';
  return `${base}.svg`;
}

export function formatZoomPercentage(zoom: number): string {
  return `${Math.round(clampZoom(zoom) * 100)}%`;
}
