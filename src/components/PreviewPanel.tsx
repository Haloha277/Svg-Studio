import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Maximize2,
  Minimize2,
  Play,
  RefreshCw,
  Scan,
  ShieldCheck,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type { PreviewBackground, SvgProcessResult, ThemeMode } from '../types/studio';
import { calculateFitZoom, clampZoom, formatZoomPercentage, stepZoom } from '../lib/previewUtils';
import { SafeSvgViewport } from './SafeSvgViewport';

interface PreviewPanelProps {
  processResult: SvgProcessResult;
  lastValidSvg: string | null;
  lastValidWidth: number;
  lastValidHeight: number;
  renderKey: number;
  theme: ThemeMode;
  background: PreviewBackground;
  customBgColor: string;
  onChangeBackground: (bg: PreviewBackground) => void;
  onChangeCustomBgColor: (color: string) => void;
  onRun: () => void;
  onRefresh: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onOpenExamples: () => void;
  hasPendingAutoPreview?: boolean;
}

const BG_OPTIONS: { id: PreviewBackground; label: string; swatchClass?: string }[] = [
  { id: 'checkerboard', label: 'Checkerboard' },
  { id: 'white', label: 'White', swatchClass: 'bg-white border border-stone-300' },
  { id: 'black', label: 'Black', swatchClass: 'bg-zinc-950 border border-zinc-700' },
  { id: 'gray', label: 'Neutral Gray', swatchClass: 'bg-zinc-400 border border-zinc-500' },
  { id: 'custom', label: 'Custom' },
];

export function PreviewPanel({
  processResult,
  lastValidSvg,
  lastValidWidth,
  lastValidHeight,
  renderKey,
  theme,
  background,
  customBgColor,
  onChangeBackground,
  onChangeCustomBgColor,
  onRun,
  onRefresh,
  isFullscreen,
  onToggleFullscreen,
  onOpenExamples,
  hasPendingAutoPreview = false,
}: PreviewPanelProps) {
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [bgMenuOpen, setBgMenuOpen] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);
  const bgMenuRef = useRef<HTMLDivElement>(null);
  const panStartRef = useRef<{ pointerX: number; pointerY: number; panX: number; panY: number } | null>(null);

  useEffect(() => {
    if (!bgMenuOpen) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (bgMenuRef.current && !bgMenuRef.current.contains(e.target as Node)) {
        setBgMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setBgMenuOpen(false);
    };
    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [bgMenuOpen]);

  const activeSvg = processResult.valid ? processResult.sanitizedSvg : lastValidSvg;
  const activeWidth = processResult.valid ? processResult.intrinsicWidth : lastValidWidth;
  const activeHeight = processResult.valid ? processResult.intrinsicHeight : lastValidHeight;

  const handleFitToScreen = useCallback(() => {
    const el = canvasRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const nextZoom = calculateFitZoom(rect.width, rect.height, activeWidth, activeHeight, 44);
    setZoom(nextZoom);
    setPan({ x: 0, y: 0 });
  }, [activeWidth, activeHeight]);

  const handleResetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || !activeSvg || processResult.empty) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsPanning(true);
    panStartRef.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      panX: pan.x,
      panY: pan.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPanning || !panStartRef.current) return;
    const dx = e.clientX - panStartRef.current.pointerX;
    const dy = e.clientY - panStartRef.current.pointerY;
    setPan({
      x: panStartRef.current.panX + dx,
      y: panStartRef.current.panY + dy,
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPanning) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore if already released
    }
    setIsPanning(false);
    panStartRef.current = null;
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!activeSvg || processResult.empty) return;
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 0.89;
    setZoom((z) => clampZoom(z * factor));
  };

  const canvasBgClass =
    background === 'checkerboard'
      ? theme === 'dark'
        ? 'svg-checkerboard-dark'
        : 'svg-checkerboard-light'
      : background === 'white'
        ? 'bg-white'
        : background === 'black'
          ? 'bg-zinc-950'
          : background === 'gray'
            ? 'bg-zinc-300 dark:bg-zinc-600'
            : '';

  const canvasCustomStyle = background === 'custom' ? { backgroundColor: customBgColor } : undefined;

  const isErrorState = !processResult.valid && !processResult.empty;
  const currentBgLabel = BG_OPTIONS.find((o) => o.id === background)?.label ?? 'Checkerboard';

  return (
    <section
      aria-label="SVG Live Preview"
      data-fullscreen={isFullscreen ? 'true' : 'false'}
      className={
        isFullscreen
          ? 'fixed inset-0 z-50 flex flex-col bg-white dark:bg-zinc-950'
          : 'flex flex-col h-full min-h-0 bg-white dark:bg-zinc-950'
      }
    >
      {/* Preview Toolbar */}
      <div className="h-10 shrink-0 flex items-center justify-between gap-2 px-3 border-b border-stone-200 dark:border-zinc-800 bg-[#FAF9F7] dark:bg-zinc-900/70 overflow-x-auto">
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onRun}
            title="Run SVG (Ctrl+Enter)"
            className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded text-xs font-medium bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>Run</span>
          </button>

          <button
            type="button"
            onClick={onRefresh}
            aria-label="Refresh preview"
            title="Refresh preview & restart animations"
            className="inline-flex items-center justify-center w-7 h-7 rounded text-zinc-600 dark:text-zinc-300 hover:bg-stone-200/70 dark:hover:bg-zinc-800 transition-colors shrink-0 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          {hasPendingAutoPreview && (
            <span className="text-[11px] text-amber-700 dark:text-amber-400 font-medium whitespace-nowrap pl-1">
              Click Run to update
            </span>
          )}
        </div>

        {/* Zoom & Canvas Controls */}
        <div className="flex items-center gap-1 shrink-0">
          <div className="flex items-center rounded border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <button
              type="button"
              onClick={() => setZoom((z) => stepZoom(z, 'out'))}
              aria-label="Zoom out"
              title="Zoom out"
              className="inline-flex items-center justify-center w-7 h-6.5 text-zinc-600 dark:text-zinc-300 hover:bg-stone-100 dark:hover:bg-zinc-800 rounded-l transition-colors cursor-pointer"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={handleResetView}
              title="Reset zoom to 100% and center"
              data-testid="zoom-indicator"
              className="px-2 h-6.5 text-xs font-mono-code text-zinc-700 dark:text-zinc-200 hover:bg-stone-100 dark:hover:bg-zinc-800 border-x border-stone-200 dark:border-zinc-800 transition-colors whitespace-nowrap cursor-pointer min-w-[52px] text-center"
            >
              {formatZoomPercentage(zoom)}
            </button>

            <button
              type="button"
              onClick={() => setZoom((z) => stepZoom(z, 'in'))}
              aria-label="Zoom in"
              title="Zoom in"
              className="inline-flex items-center justify-center w-7 h-6.5 text-zinc-600 dark:text-zinc-300 hover:bg-stone-100 dark:hover:bg-zinc-800 rounded-r transition-colors cursor-pointer"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleFitToScreen}
            title="Fit SVG to screen"
            aria-label="Fit to screen"
            className="inline-flex items-center gap-1 h-7 px-2 rounded text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-stone-200/70 dark:hover:bg-zinc-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Scan className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
            <span className="hidden sm:inline">Fit</span>
          </button>

          {/* Background Selector */}
          <div className="relative" ref={bgMenuRef}>
            <button
              type="button"
              onClick={() => setBgMenuOpen((v) => !v)}
              aria-expanded={bgMenuOpen}
              aria-label={`Canvas background: ${currentBgLabel}`}
              title={`Background: ${currentBgLabel}`}
              className="inline-flex items-center gap-1.5 h-7 px-2 rounded text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-stone-200/70 dark:hover:bg-zinc-800 border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span
                className={`w-3.5 h-3.5 rounded-sm shrink-0 ${
                  background === 'checkerboard'
                    ? 'svg-checkerboard-light border border-stone-300'
                    : background === 'white'
                      ? 'bg-white border border-stone-300'
                      : background === 'black'
                        ? 'bg-zinc-950 border border-zinc-600'
                        : background === 'gray'
                          ? 'bg-zinc-400 border border-zinc-500'
                          : 'border border-stone-300'
                }`}
                style={background === 'custom' ? { backgroundColor: customBgColor } : undefined}
              />
              <span className="hidden md:inline">Canvas</span>
            </button>

            {bgMenuOpen && (
              <div
                role="menu"
                aria-label="Preview background options"
                className="absolute right-0 mt-1.5 w-48 rounded-lg border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg p-1.5 z-50 space-y-0.5"
              >
                {BG_OPTIONS.map((opt) => {
                  const active = background === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      role="menuitemradio"
                      aria-checked={active}
                      onClick={() => {
                        onChangeBackground(opt.id);
                        if (opt.id !== 'custom') setBgMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs transition-colors cursor-pointer ${
                        active
                          ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-medium'
                          : 'text-zinc-700 dark:text-zinc-300 hover:bg-stone-100 dark:hover:bg-zinc-800'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        {opt.id === 'checkerboard' ? (
                          <span className="w-3.5 h-3.5 rounded-sm svg-checkerboard-light border border-stone-300" />
                        ) : opt.id === 'custom' ? (
                          <span
                            className="w-3.5 h-3.5 rounded-sm border border-stone-300"
                            style={{ backgroundColor: customBgColor }}
                          />
                        ) : (
                          <span className={`w-3.5 h-3.5 rounded-sm ${opt.swatchClass}`} />
                        )}
                        <span>{opt.label}</span>
                      </span>
                    </button>
                  );
                })}

                {background === 'custom' && (
                  <div className="pt-1.5 mt-1 border-t border-stone-100 dark:border-zinc-800 px-2 pb-1 flex items-center justify-between gap-2">
                    <label htmlFor="custom-canvas-color" className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      Color
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        id="custom-canvas-color"
                        type="color"
                        value={customBgColor}
                        onChange={(e) => onChangeCustomBgColor(e.target.value)}
                        className="w-6 h-6 rounded border border-stone-200 dark:border-zinc-700 cursor-pointer bg-transparent p-0"
                      />
                      <span className="text-[11px] font-mono-code text-zinc-600 dark:text-zinc-300">
                        {customBgColor.toUpperCase()}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onToggleFullscreen}
            aria-label={isFullscreen ? 'Exit fullscreen preview' : 'Enter fullscreen preview'}
            title={isFullscreen ? 'Exit fullscreen (Esc)' : 'Fullscreen preview'}
            className="inline-flex items-center justify-center w-7 h-7 rounded text-zinc-600 dark:text-zinc-300 hover:bg-stone-200/70 dark:hover:bg-zinc-800 transition-colors shrink-0 cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Preview Interactive Viewport */}
      <div
        ref={canvasRef}
        data-testid="svg-preview-canvas"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
        style={canvasCustomStyle}
        className={`relative flex-1 min-h-0 overflow-hidden select-none touch-none flex items-center justify-center ${canvasBgClass} ${
          activeSvg && !processResult.empty
            ? isPanning
              ? 'cursor-grabbing'
              : 'cursor-grab'
            : ''
        }`}
      >
        {/* Empty State */}
        {processResult.empty && (
          <div className="max-w-sm mx-auto px-6 py-8 text-center rounded-xl border border-stone-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 shadow-sm select-text">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              No SVG markup to render
            </p>
            <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Write valid <code className="font-mono-code text-zinc-700 dark:text-zinc-300">&lt;svg&gt;</code> markup in the editor or start from a curated example.
            </p>
            <button
              type="button"
              onClick={onOpenExamples}
              className="mt-4 inline-flex items-center gap-1.5 h-8 px-3.5 rounded-md text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white transition-colors cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Browse Examples</span>
            </button>
          </div>
        )}

        {/* Active Sanitized SVG Render Layer */}
        {!processResult.empty && activeSvg && (
          <div
            data-testid="svg-transform-layer"
            style={{
              transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
              transformOrigin: 'center center',
            }}
            className={`transition-opacity duration-150 ${isErrorState ? 'opacity-45' : 'opacity-100'}`}
          >
            <SafeSvgViewport
              sanitizedSvg={activeSvg}
              renderKey={renderKey}
              width={activeWidth}
              height={activeHeight}
              className="pointer-events-none"
            />
          </div>
        )}

        {/* Error card when no prior valid render is available */}
        {isErrorState && !activeSvg && (
          <div
            role="alert"
            data-testid="preview-error-card"
            className="max-w-md mx-4 p-5 rounded-xl border border-red-200 dark:border-red-900/70 bg-white/95 dark:bg-zinc-900/95 shadow-sm select-text"
          >
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-xs font-semibold text-red-800 dark:text-red-300">
                  Unable to render SVG
                </h3>
                <p className="mt-1 text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  {processResult.diagnostics[0]?.message ?? 'The SVG markup contains syntax errors.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Non-blocking status banner when showing last valid render alongside current error */}
        {isErrorState && activeSvg && (
          <div
            role="status"
            data-testid="preview-stale-warning"
            className="absolute top-3 left-3 right-3 sm:right-auto sm:max-w-md px-3 py-2 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50/95 dark:bg-amber-950/90 text-amber-900 dark:text-amber-200 text-xs flex items-center gap-2 shadow-sm select-text"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="truncate">
              Showing last valid preview · {processResult.diagnostics[0]?.message}
            </span>
          </div>
        )}

        {/* Bottom Overlays: Security Notice + Dimension Readout */}
        {(processResult.valid && processResult.strippedCount > 0) ||
        (!processResult.empty && activeSvg) ? (
          <div className="absolute bottom-3 left-3 right-3 flex flex-col sm:flex-row sm:items-end justify-between gap-2 pointer-events-none">
            {processResult.valid && processResult.strippedCount > 0 ? (
              <div
                role="status"
                data-testid="security-sanitized-banner"
                className="pointer-events-auto sm:max-w-md px-3 py-2 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-white/95 dark:bg-zinc-900/95 text-zinc-800 dark:text-zinc-200 text-xs flex items-start gap-2 shadow-sm select-text"
              >
                <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <span className="font-medium">
                    Sanitized untrusted markup ({processResult.strippedCount} item
                    {processResult.strippedCount === 1 ? '' : 's'} removed):
                  </span>{' '}
                  <span className="text-zinc-600 dark:text-zinc-400">
                    {processResult.securityWarnings.slice(0, 2).join(' ')}
                  </span>
                </div>
              </div>
            ) : (
              <div />
            )}

            {!processResult.empty && activeSvg && (
              <div className="self-end shrink-0 px-2.5 py-1 rounded-md bg-white/90 dark:bg-zinc-900/90 border border-stone-200/80 dark:border-zinc-800/80 text-[11px] font-mono-code text-zinc-600 dark:text-zinc-400 backdrop-blur-sm">
                {Math.round(activeWidth)} × {Math.round(activeHeight)}
                {processResult.viewBox ? ` · viewBox ${processResult.viewBox}` : ''}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}
