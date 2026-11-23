import { useCallback, useEffect, useRef, useState } from 'react';
import { Code2, Eye, GripVertical, Pencil } from 'lucide-react';
import { DEFAULT_EXAMPLE } from './data/examples';
import { loadStudioState, saveStudioState } from './lib/storage';
import { formatSvgMarkup, processSvgForPreview } from './lib/svgProcessor';
import { sanitizeSvgFilename } from './lib/previewUtils';
import type {
  EditorSettings,
  MobileTab,
  PersistedStudioState,
  PreviewBackground,
  SaveStatus,
  SvgExample,
  SvgProcessResult,
  ThemeMode,
} from './types/studio';
import { TopNavigation } from './components/TopNavigation';
import { CodeEditorPanel, type CodeEditorHandle } from './components/CodeEditorPanel';
import { PreviewPanel } from './components/PreviewPanel';
import { ExampleLibraryModal } from './components/ExampleLibraryModal';
import { SettingsModal } from './components/SettingsModal';
import { NotificationBanner, type StudioNotification } from './components/NotificationBanner';

export default function App() {
  const [initialState] = useState<PersistedStudioState>(() =>
    loadStudioState(DEFAULT_EXAMPLE.code, DEFAULT_EXAMPLE.id)
  );

  const [projectName, setProjectName] = useState<string>(initialState.projectName);
  const [code, setCode] = useState<string>(initialState.code);
  const [theme, setTheme] = useState<ThemeMode>(initialState.theme);
  const [splitRatio, setSplitRatio] = useState<number>(initialState.splitRatio);
  const [editorSettings, setEditorSettings] = useState<EditorSettings>(initialState.editorSettings);
  const [previewBackground, setPreviewBackground] = useState<PreviewBackground>(
    initialState.previewBackground
  );
  const [customBgColor, setCustomBgColor] = useState<string>(initialState.customBgColor);
  const [lastExampleId, setLastExampleId] = useState<string | null>(initialState.lastExampleId);

  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [examplesOpen, setExamplesOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>('editor');
  const [copiedJustNow, setCopiedJustNow] = useState(false);
  const [notification, setNotification] = useState<StudioNotification | null>(null);
  const [renderKey, setRenderKey] = useState(1);

  // Initial SVG evaluation
  const [processResult, setProcessResult] = useState<SvgProcessResult>(() =>
    processSvgForPreview(initialState.code)
  );
  const [lastValidSvg, setLastValidSvg] = useState<string | null>(() => {
    const initial = processSvgForPreview(initialState.code);
    return initial.valid ? initial.sanitizedSvg : null;
  });
  const [lastValidDims, setLastValidDims] = useState<{ width: number; height: number }>(() => {
    const initial = processSvgForPreview(initialState.code);
    return { width: initial.intrinsicWidth, height: initial.intrinsicHeight };
  });
  const [hasPendingAutoPreview, setHasPendingAutoPreview] = useState(false);

  const editorRef = useRef<CodeEditorHandle>(null);
  const editorHistoryRef = useRef<unknown>(initialState.editorHistory);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const isResizingRef = useRef(false);
  const isFirstRenderRef = useRef(true);
  const notifyTimerRef = useRef<number | null>(null);

  const notify = useCallback((type: StudioNotification['type'], message: string) => {
    if (notifyTimerRef.current) {
      window.clearTimeout(notifyTimerRef.current);
    }
    setNotification({ id: Date.now(), type, message });
    notifyTimerRef.current = window.setTimeout(() => {
      setNotification(null);
    }, 2800);
  }, []);

  // Sync Tailwind dark class on <html>
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  // Execute SVG pipeline helper
  const executeSvg = useCallback((source: string, bumpRenderKey = false) => {
    const result = processSvgForPreview(source);
    setProcessResult(result);
    setHasPendingAutoPreview(false);
    if (result.valid && result.sanitizedSvg) {
      setLastValidSvg(result.sanitizedSvg);
      setLastValidDims({ width: result.intrinsicWidth, height: result.intrinsicHeight });
    }
    if (bumpRenderKey) {
      setRenderKey((k) => k + 1);
    }
    return result;
  }, []);

  // Debounced live execution when code changes and autoPreview is enabled
  useEffect(() => {
    if (isFirstRenderRef.current) return;

    if (!editorSettings.autoPreview) {
      setHasPendingAutoPreview(true);
      return;
    }

    const timer = window.setTimeout(() => {
      executeSvg(code, false);
    }, 180);

    return () => window.clearTimeout(timer);
  }, [code, editorSettings.autoPreview, executeSvg]);

  // Persist workspace state to localStorage with debounce
  const persistNow = useCallback(
    (showToast = false) => {
      setSaveStatus('saving');
      const res = saveStudioState({
        projectName,
        code,
        editorHistory: editorHistoryRef.current,
        theme,
        splitRatio,
        editorSettings,
        previewBackground,
        customBgColor,
        lastExampleId,
        updatedAt: new Date().toISOString(),
      });

      if (res.ok) {
        setSaveStatus('saved');
        if (showToast) notify('success', 'Project saved locally.');
      } else {
        setSaveStatus('error');
        notify('error', res.error ?? 'Failed to save to browser storage.');
      }
    },
    [
      projectName,
      code,
      theme,
      splitRatio,
      editorSettings,
      previewBackground,
      customBgColor,
      lastExampleId,
      notify,
    ]
  );

  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }

    setSaveStatus('unsaved');
    const timer = window.setTimeout(() => {
      persistNow(false);
    }, 600);

    return () => window.clearTimeout(timer);
  }, [
    projectName,
    code,
    theme,
    splitRatio,
    editorSettings,
    previewBackground,
    customBgColor,
    lastExampleId,
    persistNow,
  ]);

  // Actions
  const handleRun = useCallback(() => {
    const res = executeSvg(code, true);
    if (!res.valid && !res.empty) {
      notify('error', res.diagnostics[0]?.message ?? 'SVG contains syntax errors.');
    }
  }, [code, executeSvg, notify]);

  const handleRefresh = useCallback(() => {
    executeSvg(code, true);
  }, [code, executeSvg]);

  const handleFormat = useCallback(() => {
    const res = formatSvgMarkup(code, editorSettings.tabSize);
    if (res.ok) {
      setCode(res.formatted);
      notify('success', 'Formatted SVG markup.');
    } else {
      notify('error', res.error?.message ?? 'Unable to format invalid XML.');
    }
  }, [code, editorSettings.tabSize, notify]);

  const handleCopySource = useCallback(async () => {
    if (!code.trim()) {
      notify('info', 'Editor is empty — nothing to copy.');
      return;
    }
    try {
      await navigator.clipboard.writeText(code);
      setCopiedJustNow(true);
      notify('success', 'SVG source copied to clipboard.');
      window.setTimeout(() => setCopiedJustNow(false), 1800);
    } catch {
      notify('error', 'Clipboard access was denied by the browser.');
    }
  }, [code, notify]);

  const handleDownloadSvg = useCallback(() => {
    if (!code.trim()) {
      notify('error', 'Cannot export an empty SVG document.');
      return;
    }

    const validation = processSvgForPreview(code);
    if (!validation.valid) {
      notify('error', 'Fix SVG syntax errors before downloading.');
      return;
    }

    try {
      const blob = new Blob([code], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = sanitizeSvgFilename(projectName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      notify('success', `Downloaded ${sanitizeSvgFilename(projectName)}`);
    } catch {
      notify('error', 'Failed to generate SVG download.');
    }
  }, [code, projectName, notify]);

  const handleClear = useCallback(() => {
    setCode('');
    executeSvg('', false);
    notify('info', 'Editor cleared. Press Ctrl+Z to undo.');
  }, [executeSvg, notify]);

  const handleSelectExample = useCallback(
    (example: SvgExample) => {
      setCode(example.code);
      setProjectName(example.name);
      setLastExampleId(example.id);
      executeSvg(example.code, true);
      setSaveStatus('unsaved');
      notify('success', `Loaded "${example.name}" example.`);
    },
    [executeSvg, notify]
  );

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;

      if (e.key === 'Escape') {
        if (examplesOpen) {
          setExamplesOpen(false);
          return;
        }
        if (settingsOpen) {
          setSettingsOpen(false);
          return;
        }
        if (isFullscreen) {
          setIsFullscreen(false);
          return;
        }
      }

      if (mod && e.key === 'Enter') {
        e.preventDefault();
        handleRun();
        return;
      }

      if (mod && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        handleFormat();
        return;
      }

      if (mod && !e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        persistNow(true);
        return;
      }

      if (mod && e.shiftKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        handleCopySource();
        return;
      }

      // Global Undo/Redo fallback when focus is outside CodeMirror (e.g., toolbar or preview)
      const activeEl = document.activeElement;
      const isTextInput =
        activeEl instanceof HTMLInputElement ||
        activeEl instanceof HTMLTextAreaElement ||
        activeEl instanceof HTMLSelectElement;

      if (mod && !isTextInput && !editorRef.current?.hasFocus()) {
        const key = e.key.toLowerCase();
        if (key === 'z' && !e.shiftKey) {
          e.preventDefault();
          editorRef.current?.undo();
          return;
        }
        if ((key === 'z' && e.shiftKey) || (key === 'y' && !e.shiftKey)) {
          e.preventDefault();
          editorRef.current?.redo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    examplesOpen,
    settingsOpen,
    isFullscreen,
    handleRun,
    handleFormat,
    persistNow,
    handleCopySource,
  ]);

  // Resizable split divider pointer handling
  const handleDividerPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    isResizingRef.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMove = (moveEvent: PointerEvent) => {
      if (!isResizingRef.current || !workspaceRef.current) return;
      const rect = workspaceRef.current.getBoundingClientRect();
      if (rect.width <= 0) return;
      const rawRatio = (moveEvent.clientX - rect.left) / rect.width;
      const clamped = Math.min(0.74, Math.max(0.26, rawRatio));
      setSplitRatio(Math.round(clamped * 1000) / 1000);
    };

    const handleUp = () => {
      isResizingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  };

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-[#FAF9F7] dark:bg-[#111113] text-zinc-900 dark:text-zinc-100">
      <TopNavigation
        projectName={projectName}
        onRenameProject={setProjectName}
        saveStatus={saveStatus}
        onManualSave={() => persistNow(true)}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
        onOpenExamples={() => setExamplesOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        onDownloadSvg={handleDownloadSvg}
        onCopySource={handleCopySource}
      />

      {/* Mobile Header Strip + Editor/Preview Tabs (< 768px) */}
      <div className="md:hidden shrink-0 border-b border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 flex items-center justify-between gap-2">
        <div
          role="tablist"
          aria-label="Workspace view"
          className="inline-flex p-0.5 rounded-lg bg-stone-100 dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mobileTab === 'editor'}
            onClick={() => setMobileTab('editor')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              mobileTab === 'editor'
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Editor</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mobileTab === 'preview'}
            onClick={() => setMobileTab('preview')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              mobileTab === 'preview'
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Preview</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5 min-w-0">
          <input
            type="text"
            aria-label="Mobile project name"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            onBlur={(e) => {
              if (!e.target.value.trim()) setProjectName('Untitled Artwork');
            }}
            className="w-28 text-right text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-transparent border-b border-transparent focus:border-indigo-500 focus:outline-none truncate"
          />
          <Pencil className="w-3 h-3 text-zinc-400 shrink-0 pointer-events-none" />
        </div>
      </div>

      {/* Main Split Workspace */}
      <main ref={workspaceRef} className="flex-1 min-h-0 flex flex-col md:flex-row relative">
        {/* Editor Pane */}
        <div
          style={{ ['--split-width' as string]: `${splitRatio * 100}%` }}
          className={`min-h-0 min-w-0 md:w-[var(--split-width)] md:shrink-0 h-full ${
            mobileTab === 'editor' ? 'flex-1 md:flex-none flex flex-col' : 'hidden md:flex md:flex-col'
          }`}
        >
          <CodeEditorPanel
            ref={editorRef}
            code={code}
            initialSerializedHistory={initialState.editorHistory}
            onChange={setCode}
            onHistorySnapshot={(snapshot) => {
              editorHistoryRef.current = snapshot;
            }}
            theme={theme}
            settings={editorSettings}
            diagnostics={processResult.diagnostics}
            onFormat={handleFormat}
            onCopy={handleCopySource}
            onClear={handleClear}
            onOpenSettings={() => setSettingsOpen(true)}
            copiedJustNow={copiedJustNow}
          />
        </div>

        {/* Draggable Split Divider (Desktop / Tablet) */}
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize editor and preview panels"
          aria-valuenow={Math.round(splitRatio * 100)}
          aria-valuemin={26}
          aria-valuemax={74}
          tabIndex={0}
          data-testid="panel-resizer"
          onPointerDown={handleDividerPointerDown}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') {
              setSplitRatio((r) => Math.max(0.26, Math.round((r - 0.02) * 100) / 100));
            } else if (e.key === 'ArrowRight') {
              setSplitRatio((r) => Math.min(0.74, Math.round((r + 0.02) * 100) / 100));
            }
          }}
          className="hidden md:flex w-1.5 shrink-0 items-center justify-center bg-stone-200/80 dark:bg-zinc-800 hover:bg-indigo-500/40 dark:hover:bg-indigo-500/40 cursor-col-resize transition-colors group focus:outline-none focus-visible:bg-indigo-500"
        >
          <GripVertical className="w-3 h-3 text-zinc-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 pointer-events-none" />
        </div>

        {/* Preview Pane */}
        <div
          className={`min-h-0 min-w-0 flex-1 h-full ${
            mobileTab === 'preview' ? 'flex flex-col' : 'hidden md:flex md:flex-col'
          }`}
        >
          <PreviewPanel
            processResult={processResult}
            lastValidSvg={lastValidSvg}
            lastValidWidth={lastValidDims.width}
            lastValidHeight={lastValidDims.height}
            renderKey={renderKey}
            theme={theme}
            background={previewBackground}
            customBgColor={customBgColor}
            onChangeBackground={setPreviewBackground}
            onChangeCustomBgColor={setCustomBgColor}
            onRun={handleRun}
            onRefresh={handleRefresh}
            isFullscreen={isFullscreen}
            onToggleFullscreen={() => setIsFullscreen((f) => !f)}
            onOpenExamples={() => setExamplesOpen(true)}
            hasPendingAutoPreview={hasPendingAutoPreview}
          />
        </div>
      </main>

      {/* Modals & Notifications */}
      <ExampleLibraryModal
        open={examplesOpen}
        onClose={() => setExamplesOpen(false)}
        activeExampleId={lastExampleId}
        onSelectExample={handleSelectExample}
      />

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        theme={theme}
        onChangeTheme={setTheme}
        editorSettings={editorSettings}
        onChangeEditorSettings={setEditorSettings}
        previewBackground={previewBackground}
        onChangePreviewBackground={setPreviewBackground}
      />

      <NotificationBanner
        notification={notification}
        onDismiss={() => setNotification(null)}
      />
    </div>
  );
}
