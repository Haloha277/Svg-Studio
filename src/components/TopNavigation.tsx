import { useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  Check,
  ChevronDown,
  Copy,
  Download,
  Moon,
  Pencil,
  Settings,
  Sun,
} from 'lucide-react';
import type { SaveStatus, ThemeMode } from '../types/studio';

interface TopNavigationProps {
  projectName: string;
  onRenameProject: (name: string) => void;
  saveStatus: SaveStatus;
  onManualSave: () => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
  onOpenExamples: () => void;
  onOpenSettings: () => void;
  onDownloadSvg: () => void;
  onCopySource: () => void;
}

export function TopNavigation({
  projectName,
  onRenameProject,
  saveStatus,
  onManualSave,
  theme,
  onToggleTheme,
  onOpenExamples,
  onOpenSettings,
  onDownloadSvg,
  onCopySource,
}: TopNavigationProps) {
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(projectName);
  const [exportOpen, setExportOpen] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDraftName(projectName);
  }, [projectName]);

  useEffect(() => {
    if (editingName) {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    }
  }, [editingName]);

  useEffect(() => {
    if (!exportOpen) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExportOpen(false);
    };
    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [exportOpen]);

  const commitName = () => {
    const trimmed = draftName.trim();
    if (trimmed) {
      onRenameProject(trimmed);
    } else {
      setDraftName(projectName);
    }
    setEditingName(false);
  };

  const statusLabel =
    saveStatus === 'saved'
      ? 'Saved'
      : saveStatus === 'saving'
        ? 'Saving…'
        : saveStatus === 'error'
          ? 'Save failed'
          : 'Unsaved changes';

  const statusClass =
    saveStatus === 'error'
      ? 'text-red-600 dark:text-red-400'
      : saveStatus === 'unsaved'
        ? 'text-amber-700 dark:text-amber-400'
        : 'text-zinc-500 dark:text-zinc-400';

  return (
    <header className="h-13 shrink-0 flex items-center justify-between gap-3 px-3 sm:px-5 border-b border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 transition-colors">
      {/* Left: Brand + Editable Project Name + Save Status */}
      <div className="flex items-center gap-2.5 min-w-0 shrink-0 sm:shrink">
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded-md bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center text-white dark:text-zinc-900 shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="9" cy="15" r="5" stroke="currentColor" strokeWidth="2" />
              <path d="M12 4L20 12L14 14L12 4Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="font-semibold text-sm tracking-tight text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
            SVG Studio
          </span>
        </div>

        <span className="text-stone-300 dark:text-zinc-700 select-none hidden sm:inline" aria-hidden="true">
          /
        </span>

        <div className="hidden sm:flex items-center gap-2 min-w-0">
          {editingName ? (
            <input
              ref={nameInputRef}
              type="text"
              aria-label="Project name"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitName();
                if (e.key === 'Escape') {
                  setDraftName(projectName);
                  setEditingName(false);
                }
              }}
              className="h-7 px-2 text-sm font-medium rounded-md border border-indigo-500 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 outline-none w-44"
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditingName(true)}
              title="Rename project"
              className="group flex items-center gap-1.5 h-7 px-1.5 rounded-md text-sm font-medium text-zinc-800 dark:text-zinc-200 hover:bg-stone-100 dark:hover:bg-zinc-900 transition-colors max-w-48 truncate cursor-pointer"
            >
              <span className="truncate">{projectName}</span>
              <Pencil className="w-3 h-3 text-zinc-400 hidden group-hover:inline-block shrink-0" />
            </button>
          )}

          <span className="text-stone-300 dark:text-zinc-700 select-none" aria-hidden="true">
            ·
          </span>

          <button
            type="button"
            onClick={onManualSave}
            title="Save project locally (Ctrl+S)"
            data-testid="save-status"
            className={`text-xs whitespace-nowrap shrink-0 hover:underline cursor-pointer ${statusClass}`}
          >
            {statusLabel}
          </button>
        </div>
      </div>

      {/* Right: Workspace Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <button
          type="button"
          onClick={onOpenExamples}
          aria-label="Examples"
          title="SVG Example Library"
          className="inline-flex items-center justify-center gap-1.5 h-8 px-2.5 sm:px-3 rounded-md text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-stone-100 dark:hover:bg-zinc-900 border border-stone-200 dark:border-zinc-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <BookOpen className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
          <span className="hidden sm:inline">Examples</span>
        </button>

        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          className="inline-flex items-center justify-center w-8 h-8 rounded-md text-zinc-600 dark:text-zinc-300 hover:bg-stone-100 dark:hover:bg-zinc-900 border border-transparent hover:border-stone-200 dark:hover:border-zinc-800 transition-colors shrink-0 cursor-pointer"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <button
          type="button"
          onClick={onOpenSettings}
          aria-label="Open settings"
          title="Settings"
          className="inline-flex items-center justify-center w-8 h-8 rounded-md text-zinc-600 dark:text-zinc-300 hover:bg-stone-100 dark:hover:bg-zinc-900 border border-transparent hover:border-stone-200 dark:hover:border-zinc-800 transition-colors shrink-0 cursor-pointer"
        >
          <Settings className="w-4 h-4" />
        </button>

        <div className="relative" ref={exportMenuRef}>
          <button
            type="button"
            onClick={() => setExportOpen((prev) => !prev)}
            aria-expanded={exportOpen}
            aria-haspopup="menu"
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
            <ChevronDown className="w-3 h-3 opacity-80" />
          </button>

          {exportOpen && (
            <div
              role="menu"
              aria-label="Export options"
              className="absolute right-0 mt-1.5 w-56 rounded-lg border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg py-1 z-50"
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setExportOpen(false);
                  onDownloadSvg();
                }}
                className="w-full flex items-center justify-between px-3 py-2 text-left text-xs text-zinc-800 dark:text-zinc-200 hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2 font-medium">
                  <Download className="w-3.5 h-3.5 text-zinc-500" />
                  Download .svg file
                </span>
                <span className="text-[11px] text-zinc-400 font-mono-code">SVG</span>
              </button>

              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setExportOpen(false);
                  onCopySource();
                }}
                className="w-full flex items-center justify-between px-3 py-2 text-left text-xs text-zinc-800 dark:text-zinc-200 hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2 font-medium">
                  <Copy className="w-3.5 h-3.5 text-zinc-500" />
                  Copy SVG source
                </span>
                <span className="text-[11px] text-zinc-400 font-mono-code">Ctrl+Shift+C</span>
              </button>

              <div className="my-1 border-t border-stone-100 dark:border-zinc-800" />
              <div className="px-3 py-1.5 flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Exports exact vector markup</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
