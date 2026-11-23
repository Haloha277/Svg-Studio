import { useEffect, useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { SVG_EXAMPLES } from '../data/examples';
import { processSvgForPreview } from '../lib/svgProcessor';
import type { SvgExample } from '../types/studio';
import { SafeSvgViewport } from './SafeSvgViewport';

interface ExampleLibraryModalProps {
  open: boolean;
  onClose: () => void;
  activeExampleId: string | null;
  onSelectExample: (example: SvgExample) => void;
}

export function ExampleLibraryModal({
  open,
  onClose,
  activeExampleId,
  onSelectExample,
}: ExampleLibraryModalProps) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  const sanitizedThumbnails = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const ex of SVG_EXAMPLES) {
      map.set(ex.id, processSvgForPreview(ex.code).sanitizedSvg);
    }
    return map;
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SVG_EXAMPLES;
    return SVG_EXAMPLES.filter(
      (ex) =>
        ex.name.toLowerCase().includes(q) ||
        ex.description.toLowerCase().includes(q) ||
        ex.category.toLowerCase().includes(q)
    );
  }, [query]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="examples-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-4xl max-h-[85vh] flex flex-col rounded-xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-200 dark:border-zinc-800 flex items-center justify-between gap-4 shrink-0">
          <div>
            <h2 id="examples-dialog-title" className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              SVG Example Library
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Select a starter graphic to load its editable SVG source into the studio.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close examples library"
            className="inline-flex items-center justify-center w-8 h-8 rounded-md text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-stone-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Filter */}
        <div className="px-5 py-3 border-b border-stone-100 dark:border-zinc-800/80 bg-[#FAF9F7] dark:bg-zinc-900/50 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter examples by name, capability, or category…"
              aria-label="Filter SVG examples"
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Examples Grid */}
        <div className="flex-1 overflow-y-auto p-5">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-xs text-zinc-500 dark:text-zinc-400">
              No examples matched “{query}”.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((ex) => {
                const isActive = activeExampleId === ex.id;
                return (
                  <button
                    key={ex.id}
                    type="button"
                    onClick={() => {
                      onSelectExample(ex);
                      onClose();
                    }}
                    className={`group text-left flex flex-col rounded-xl border p-3 transition-colors cursor-pointer ${
                      isActive
                        ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/25'
                        : 'border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 hover:border-stone-300 dark:hover:border-zinc-700 hover:bg-stone-50/70 dark:hover:bg-zinc-900'
                    }`}
                  >
                    <div className="w-full h-32 rounded-lg overflow-hidden border border-stone-200/80 dark:border-zinc-800 svg-checkerboard-light dark:svg-checkerboard-dark flex items-center justify-center p-3">
                      <SafeSvgViewport
                        sanitizedSvg={sanitizedThumbnails.get(ex.id) ?? null}
                        thumbnail
                        className="w-full h-full pointer-events-none"
                      />
                    </div>
                    <div className="mt-3 flex items-baseline justify-between gap-2">
                      <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {ex.name}
                      </span>
                      <span className="text-[11px] text-zinc-400 dark:text-zinc-500 shrink-0">
                        {ex.category}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                      {ex.description}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
