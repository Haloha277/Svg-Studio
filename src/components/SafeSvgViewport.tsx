import { useEffect, useRef } from 'react';

interface SafeSvgViewportProps {
  sanitizedSvg: string | null;
  className?: string;
  renderKey?: number;
  width?: number;
  height?: number;
  thumbnail?: boolean;
}

/**
 * Mounts an already-sanitized SVG string using DOMParser + importNode
 * rather than raw HTML injection.
 */
export function SafeSvgViewport({
  sanitizedSvg,
  className = '',
  renderKey = 0,
  width,
  height,
  thumbnail = false,
}: SafeSvgViewportProps) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    if (!sanitizedSvg) {
      host.replaceChildren();
      return;
    }

    try {
      const doc = new DOMParser().parseFromString(sanitizedSvg, 'image/svg+xml');
      const parserError = doc.querySelector('parsererror');
      const svgEl = doc.documentElement;

      if (parserError || !svgEl || svgEl.tagName.toLowerCase() !== 'svg') {
        host.replaceChildren();
        return;
      }

      const imported = document.importNode(svgEl, true) as unknown as SVGSVGElement;

      if (thumbnail) {
        imported.style.width = '100%';
        imported.style.height = '100%';
        imported.style.display = 'block';
        imported.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      } else {
        if (width && !imported.getAttribute('width')) {
          imported.setAttribute('width', String(width));
        }
        if (height && !imported.getAttribute('height')) {
          imported.setAttribute('height', String(height));
        }
        imported.style.display = 'block';
        imported.style.maxWidth = 'none';
        imported.style.maxHeight = 'none';
      }

      host.replaceChildren(imported);
    } catch {
      host.replaceChildren();
    }
  }, [sanitizedSvg, renderKey, width, height, thumbnail]);

  return <div ref={hostRef} className={className} data-testid={thumbnail ? undefined : 'svg-render-target'} />;
}
