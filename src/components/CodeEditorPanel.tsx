import { useEffect, useImperativeHandle, useRef, useState, forwardRef } from 'react';
import {
  EditorState,
  Compartment,
} from '@codemirror/state';
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLine,
  highlightActiveLineGutter,
  drawSelection,
  dropCursor,
} from '@codemirror/view';
import {
  defaultKeymap,
  history,
  historyField,
  historyKeymap,
  indentWithTab,
  isolateHistory,
  redo,
  redoDepth,
  undo,
  undoDepth,
} from '@codemirror/commands';
import {
  foldGutter,
  foldKeymap,
  bracketMatching,
  indentOnInput,
  indentUnit,
  syntaxHighlighting,
  defaultHighlightStyle,
} from '@codemirror/language';
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { search, searchKeymap, openSearchPanel, highlightSelectionMatches } from '@codemirror/search';
import { xml } from '@codemirror/lang-xml';
import { oneDark } from '@codemirror/theme-one-dark';
import { lintGutter, setDiagnostics, type Diagnostic } from '@codemirror/lint';
import {
  AlertCircle,
  Check,
  Copy,
  Eraser,
  Redo2,
  Search,
  SlidersHorizontal,
  Sparkles,
  Undo2,
} from 'lucide-react';
import {
  isValidSerializedEditorState,
  type EditorHistoryStatus,
} from '../lib/historyPersistence';
import type { EditorSettings, SvgDiagnostic, ThemeMode } from '../types/studio';

export interface CodeEditorHandle {
  focusLine: (line: number, column?: number) => void;
  openFind: () => void;
  undo: () => boolean;
  redo: () => boolean;
  hasFocus: () => boolean;
}

interface CodeEditorPanelProps {
  code: string;
  initialSerializedHistory?: unknown;
  onChange: (nextCode: string) => void;
  onHistorySnapshot?: (serializedState: unknown) => void;
  theme: ThemeMode;
  settings: EditorSettings;
  diagnostics: SvgDiagnostic[];
  onFormat: () => void;
  onCopy: () => void;
  onClear: () => void;
  onOpenSettings: () => void;
  copiedJustNow: boolean;
}

function buildLightTheme(fontSize: number) {
  return EditorView.theme(
    {
      '&': {
        backgroundColor: '#FFFFFF',
        color: '#18181B',
        height: '100%',
      },
      '.cm-content': {
        caretColor: '#4F46E5',
        fontSize: `${fontSize}px`,
        paddingTop: '12px',
        paddingBottom: '12px',
      },
      '.cm-gutters': {
        backgroundColor: '#FAF9F7',
        color: '#71717A',
        borderRight: '1px solid #E4E2DD',
        fontSize: `${fontSize}px`,
      },
      '.cm-activeLine': {
        backgroundColor: 'rgba(91, 91, 214, 0.045)',
      },
      '.cm-activeLineGutter': {
        backgroundColor: '#F1EFEA',
        color: '#18181B',
      },
      '&.cm-focused .cm-selectionBackground, ::selection': {
        backgroundColor: 'rgba(91, 91, 214, 0.16)',
      },
      '.cm-panels': {
        backgroundColor: '#FAF9F7',
        color: '#18181B',
        borderBottom: '1px solid #E4E2DD',
      },
      '.cm-searchMatch': {
        backgroundColor: 'rgba(245, 158, 11, 0.25)',
      },
    },
    { dark: false }
  );
}

function buildDarkTheme(fontSize: number) {
  return [
    oneDark,
    EditorView.theme(
      {
        '&': {
          backgroundColor: '#141417',
          height: '100%',
        },
        '.cm-content': {
          fontSize: `${fontSize}px`,
          paddingTop: '12px',
          paddingBottom: '12px',
        },
        '.cm-gutters': {
          backgroundColor: '#111113',
          borderRight: '1px solid #27272A',
          fontSize: `${fontSize}px`,
        },
        '.cm-activeLineGutter': {
          backgroundColor: '#1C1C21',
        },
        '.cm-panels': {
          backgroundColor: '#18181B',
          color: '#F4F4F5',
          borderBottom: '1px solid #27272A',
        },
      },
      { dark: true }
    ),
  ];
}

export const CodeEditorPanel = forwardRef<CodeEditorHandle, CodeEditorPanelProps>(
  function CodeEditorPanel(
    {
      code,
      initialSerializedHistory,
      onChange,
      onHistorySnapshot,
      theme,
      settings,
      diagnostics,
      onFormat,
      onCopy,
      onClear,
      onOpenSettings,
      copiedJustNow,
    },
    ref
  ) {
    const hostRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;
    const onHistorySnapshotRef = useRef(onHistorySnapshot);
    onHistorySnapshotRef.current = onHistorySnapshot;

    const [historyStatus, setHistoryStatus] = useState<EditorHistoryStatus>({
      canUndo: false,
      canRedo: false,
      undoCount: 0,
      redoCount: 0,
    });

    // Compartments allow dynamic reconfiguration without remounting EditorView
    const compartmentsRef = useRef({
      theme: new Compartment(),
      lineNumbers: new Compartment(),
      wrap: new Compartment(),
      tabSize: new Compartment(),
    });

    const syncHistoryStatus = (state: EditorState) => {
      const undoCount = undoDepth(state);
      const redoCount = redoDepth(state);
      setHistoryStatus({
        canUndo: undoCount > 0,
        canRedo: redoCount > 0,
        undoCount,
        redoCount,
      });
    };

    useImperativeHandle(ref, () => ({
      focusLine: (line: number, column = 1) => {
        const view = viewRef.current;
        if (!view) return;
        const clampedLine = Math.min(Math.max(1, line), view.state.doc.lines);
        const lineInfo = view.state.doc.line(clampedLine);
        const pos = Math.min(lineInfo.from + Math.max(0, column - 1), lineInfo.to);
        view.dispatch({
          selection: { anchor: pos },
          scrollIntoView: true,
        });
        view.focus();
      },
      openFind: () => {
        const view = viewRef.current;
        if (!view) return;
        openSearchPanel(view);
      },
      undo: () => {
        const view = viewRef.current;
        if (!view) return false;
        const didUndo = undo(view);
        if (didUndo) {
          syncHistoryStatus(view.state);
        }
        return didUndo;
      },
      redo: () => {
        const view = viewRef.current;
        if (!view) return false;
        const didRedo = redo(view);
        if (didRedo) {
          syncHistoryStatus(view.state);
        }
        return didRedo;
      },
      hasFocus: () => {
        return Boolean(viewRef.current?.hasFocus);
      },
    }));

    // Mount CodeMirror once
    useEffect(() => {
      const host = hostRef.current;
      if (!host) return;

      const c = compartmentsRef.current;

      const extensions = [
        c.lineNumbers.of(
          settings.lineNumbers
            ? [lineNumbers(), highlightActiveLineGutter(), foldGutter()]
            : []
        ),
        history({ minDepth: 250, newGroupDelay: 400 }),
        drawSelection(),
        dropCursor(),
        EditorState.allowMultipleSelections.of(true),
        indentOnInput(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        bracketMatching(),
        closeBrackets(),
        highlightActiveLine(),
        highlightSelectionMatches(),
        search({ top: true }),
        lintGutter(),
        xml(),
        c.wrap.of(settings.wordWrap ? EditorView.lineWrapping : []),
        c.tabSize.of([
          EditorState.tabSize.of(settings.tabSize),
          indentUnit.of(' '.repeat(settings.tabSize)),
        ]),
        c.theme.of(
          theme === 'dark'
            ? buildDarkTheme(settings.fontSize)
            : buildLightTheme(settings.fontSize)
        ),
        keymap.of([
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...searchKeymap,
          ...historyKeymap,
          ...foldKeymap,
          indentWithTab,
        ]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const nextDoc = update.state.doc.toString();
            onChangeRef.current(nextDoc);
            syncHistoryStatus(update.state);
            onHistorySnapshotRef.current?.(update.state.toJSON({ history: historyField }));
          } else if (
            update.transactions.some(
              (tr) => tr.isUserEvent('undo') || tr.isUserEvent('redo')
            )
          ) {
            syncHistoryStatus(update.state);
            onHistorySnapshotRef.current?.(update.state.toJSON({ history: historyField }));
          }
        }),
        EditorView.contentAttributes.of({
          'aria-label': 'SVG source code editor',
        }),
      ];

      let state: EditorState;
      if (isValidSerializedEditorState(initialSerializedHistory, code)) {
        try {
          state = EditorState.fromJSON(
            initialSerializedHistory,
            { extensions },
            { history: historyField }
          );
        } catch {
          state = EditorState.create({ doc: code, extensions });
        }
      } else {
        state = EditorState.create({ doc: code, extensions });
      }

      const view = new EditorView({ state, parent: host });
      viewRef.current = view;
      syncHistoryStatus(view.state);

      return () => {
        view.destroy();
        viewRef.current = null;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Sync external code updates (e.g., loading examples, formatting, clearing) as isolated atomic undo steps
    useEffect(() => {
      const view = viewRef.current;
      if (!view) return;
      const current = view.state.doc.toString();
      if (current === code) return;

      const currentPos = Math.min(view.state.selection.main.head, code.length);
      view.dispatch({
        changes: { from: 0, to: current.length, insert: code },
        selection: { anchor: currentPos },
        annotations: isolateHistory.of('full'),
      });
      syncHistoryStatus(view.state);
      onHistorySnapshotRef.current?.(view.state.toJSON({ history: historyField }));
    }, [code]);

    // Reconfigure theme & font size dynamically
    useEffect(() => {
      const view = viewRef.current;
      if (!view) return;
      view.dispatch({
        effects: compartmentsRef.current.theme.reconfigure(
          theme === 'dark'
            ? buildDarkTheme(settings.fontSize)
            : buildLightTheme(settings.fontSize)
        ),
      });
    }, [theme, settings.fontSize]);

    // Reconfigure line numbers
    useEffect(() => {
      const view = viewRef.current;
      if (!view) return;
      view.dispatch({
        effects: compartmentsRef.current.lineNumbers.reconfigure(
          settings.lineNumbers
            ? [lineNumbers(), highlightActiveLineGutter(), foldGutter()]
            : []
        ),
      });
    }, [settings.lineNumbers]);

    // Reconfigure word wrapping
    useEffect(() => {
      const view = viewRef.current;
      if (!view) return;
      view.dispatch({
        effects: compartmentsRef.current.wrap.reconfigure(
          settings.wordWrap ? EditorView.lineWrapping : []
        ),
      });
    }, [settings.wordWrap]);

    // Reconfigure tab size
    useEffect(() => {
      const view = viewRef.current;
      if (!view) return;
      view.dispatch({
        effects: compartmentsRef.current.tabSize.reconfigure([
          EditorState.tabSize.of(settings.tabSize),
          indentUnit.of(' '.repeat(settings.tabSize)),
        ]),
      });
    }, [settings.tabSize]);

    // Push SVG validation diagnostics into CodeMirror lint gutter
    useEffect(() => {
      const view = viewRef.current;
      if (!view) return;

      const cmDiagnostics: Diagnostic[] = diagnostics
        .filter((d) => d.line !== undefined)
        .map((d) => {
          const lineNum = Math.min(Math.max(1, d.line ?? 1), view.state.doc.lines);
          const lineInfo = view.state.doc.line(lineNum);
          const colOffset = Math.max(0, (d.column ?? 1) - 1);
          const from = Math.min(lineInfo.from + colOffset, lineInfo.to);
          const to = Math.min(from + 8, lineInfo.to);
          return {
            from: from === to ? lineInfo.from : from,
            to: from === to ? lineInfo.to : to,
            severity: d.severity,
            message: d.message,
          };
        });

      view.dispatch(setDiagnostics(view.state, cmDiagnostics));
    }, [diagnostics, code]);

    const lineCount = code ? code.split('\n').length : 0;

    return (
      <section
        aria-label="SVG Code Editor"
        className="flex flex-col h-full min-h-0 bg-white dark:bg-[#141417]"
      >
        {/* Editor Toolbar */}
        <div className="h-10 shrink-0 flex items-center justify-between gap-2 px-3 border-b border-stone-200 dark:border-zinc-800 bg-[#FAF9F7] dark:bg-zinc-900/70">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
              SVG Source
            </span>
            <span className="text-xs text-zinc-400 dark:text-zinc-500 font-mono-code whitespace-nowrap hidden sm:inline">
              {lineCount} {lineCount === 1 ? 'line' : 'lines'}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <div className="flex items-center mr-0.5 border-r border-stone-200 dark:border-zinc-800 pr-1.5 gap-0.5">
              <button
                type="button"
                disabled={!historyStatus.canUndo}
                onClick={() => {
                  const view = viewRef.current;
                  if (view && undo(view)) {
                    syncHistoryStatus(view.state);
                  }
                }}
                aria-label="Undo"
                data-undo-count={historyStatus.undoCount}
                title={
                  historyStatus.canUndo
                    ? `Undo (Ctrl+Z) · ${historyStatus.undoCount} ${historyStatus.undoCount === 1 ? 'step' : 'steps'}`
                    : 'Nothing to undo (Ctrl+Z)'
                }
                className="inline-flex items-center justify-center w-7 h-7 rounded text-zinc-700 dark:text-zinc-200 hover:bg-stone-200/70 dark:hover:bg-zinc-800 disabled:opacity-35 disabled:pointer-events-none transition-colors shrink-0 cursor-pointer"
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                disabled={!historyStatus.canRedo}
                onClick={() => {
                  const view = viewRef.current;
                  if (view && redo(view)) {
                    syncHistoryStatus(view.state);
                  }
                }}
                aria-label="Redo"
                data-redo-count={historyStatus.redoCount}
                title={
                  historyStatus.canRedo
                    ? `Redo (Ctrl+Shift+Z) · ${historyStatus.redoCount} ${historyStatus.redoCount === 1 ? 'step' : 'steps'}`
                    : 'Nothing to redo (Ctrl+Shift+Z)'
                }
                className="inline-flex items-center justify-center w-7 h-7 rounded text-zinc-700 dark:text-zinc-200 hover:bg-stone-200/70 dark:hover:bg-zinc-800 disabled:opacity-35 disabled:pointer-events-none transition-colors shrink-0 cursor-pointer"
              >
                <Redo2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={onFormat}
              aria-label="Format"
              title="Format SVG code (Ctrl+Shift+F)"
              className="inline-flex items-center gap-1.5 h-7 px-2 rounded text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-stone-200/70 dark:hover:bg-zinc-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span className="hidden sm:inline">Format</span>
            </button>

            <button
              type="button"
              onClick={onCopy}
              aria-label="Copy"
              title="Copy SVG source (Ctrl+Shift+C)"
              className="inline-flex items-center gap-1.5 h-7 px-2 rounded text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-stone-200/70 dark:hover:bg-zinc-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {copiedJustNow ? (
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
              )}
              <span className="hidden sm:inline">{copiedJustNow ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              type="button"
              onClick={() => viewRef.current && openSearchPanel(viewRef.current)}
              title="Find and replace (Ctrl+F)"
              aria-label="Find and replace"
              className="inline-flex items-center gap-1.5 h-7 px-2 rounded text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-stone-200/70 dark:hover:bg-zinc-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Search className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
              <span className="hidden lg:inline">Find</span>
            </button>

            <button
              type="button"
              onClick={onClear}
              title="Clear editor"
              aria-label="Clear editor"
              className="inline-flex items-center gap-1.5 h-7 px-2 rounded text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-stone-200/70 dark:hover:bg-zinc-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Eraser className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
              <span className="hidden lg:inline">Clear</span>
            </button>

            <button
              type="button"
              onClick={onOpenSettings}
              title="Editor settings"
              aria-label="Editor settings"
              className="inline-flex items-center justify-center w-7 h-7 rounded text-zinc-600 dark:text-zinc-300 hover:bg-stone-200/70 dark:hover:bg-zinc-800 transition-colors shrink-0 cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* CodeMirror 6 Mount */}
        <div
          ref={hostRef}
          data-testid="codemirror-container"
          className="cm-studio-host flex-1 min-h-0 overflow-hidden"
        />

        {/* Bottom Diagnostic Strip */}
        {diagnostics.length > 0 && (
          <div
            role="status"
            data-testid="editor-diagnostics"
            className="shrink-0 border-t border-red-200 dark:border-red-900/60 bg-red-50/90 dark:bg-red-950/40 px-3 py-2 flex items-start gap-2 text-xs text-red-800 dark:text-red-300"
          >
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1 space-y-0.5">
              {diagnostics.slice(0, 2).map((d, idx) => (
                <div key={idx} className="flex items-baseline gap-2 flex-wrap">
                  {d.line !== undefined ? (
                    <button
                      type="button"
                      onClick={() => {
                        const view = viewRef.current;
                        if (!view) return;
                        const ln = Math.min(Math.max(1, d.line!), view.state.doc.lines);
                        const info = view.state.doc.line(ln);
                        const pos = Math.min(info.from + Math.max(0, (d.column ?? 1) - 1), info.to);
                        view.dispatch({ selection: { anchor: pos }, scrollIntoView: true });
                        view.focus();
                      }}
                      className="font-mono-code font-medium underline underline-offset-2 hover:text-red-950 dark:hover:text-red-200 shrink-0 cursor-pointer"
                    >
                      Ln {d.line}
                      {d.column ? `, Col ${d.column}` : ''}
                    </button>
                  ) : null}
                  <span className="break-words">{d.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    );
  }
);
