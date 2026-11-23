import { useEffect } from 'react';
import { X } from 'lucide-react';
import type { EditorSettings, PreviewBackground, ThemeMode } from '../types/studio';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  theme: ThemeMode;
  onChangeTheme: (theme: ThemeMode) => void;
  editorSettings: EditorSettings;
  onChangeEditorSettings: (next: EditorSettings) => void;
  previewBackground: PreviewBackground;
  onChangePreviewBackground: (bg: PreviewBackground) => void;
}

export function SettingsModal({
  open,
  onClose,
  theme,
  onChangeTheme,
  editorSettings,
  onChangeEditorSettings,
  previewBackground,
  onChangePreviewBackground,
}: SettingsModalProps) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-200 dark:border-zinc-800 flex items-center justify-between">
          <div>
            <h2 id="settings-dialog-title" className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Workspace Settings
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Preferences persist automatically in local browser storage.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="inline-flex items-center justify-center w-8 h-8 rounded-md text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-stone-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5 text-xs">
          {/* Theme */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <span className="font-medium text-zinc-900 dark:text-zinc-100 block">Theme</span>
              <span className="text-zinc-500 dark:text-zinc-400">Interface & editor color mode</span>
            </div>
            <div className="inline-flex p-0.5 rounded-lg bg-stone-100 dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800">
              {(['light', 'dark'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onChangeTheme(mode)}
                  className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition-colors cursor-pointer ${
                    theme === mode
                      ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs'
                      : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Font Size */}
          <div className="flex items-center justify-between gap-4">
            <label htmlFor="setting-font-size" className="cursor-pointer">
              <span className="font-medium text-zinc-900 dark:text-zinc-100 block">Editor font size</span>
              <span className="text-zinc-500 dark:text-zinc-400">CodeMirror text scale (px)</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                id="setting-font-size"
                type="range"
                min={11}
                max={18}
                step={1}
                value={editorSettings.fontSize}
                onChange={(e) =>
                  onChangeEditorSettings({
                    ...editorSettings,
                    fontSize: Number(e.target.value),
                  })
                }
                className="w-24 accent-indigo-600 cursor-pointer"
              />
              <span className="w-9 text-right font-mono-code text-zinc-700 dark:text-zinc-300">
                {editorSettings.fontSize}px
              </span>
            </div>
          </div>

          {/* Tab Size */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <span className="font-medium text-zinc-900 dark:text-zinc-100 block">Indentation size</span>
              <span className="text-zinc-500 dark:text-zinc-400">Spaces used by editor & formatter</span>
            </div>
            <div className="inline-flex p-0.5 rounded-lg bg-stone-100 dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800">
              {([2, 4] as const).map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => onChangeEditorSettings({ ...editorSettings, tabSize: sz })}
                  className={`px-3 py-1 rounded-md text-xs font-mono-code font-medium transition-colors cursor-pointer ${
                    editorSettings.tabSize === sz
                      ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs'
                      : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                >
                  {sz} sp
                </button>
              ))}
            </div>
          </div>

          {/* Toggles */}
          <div className="space-y-3 pt-1 border-t border-stone-100 dark:border-zinc-800/80">
            <label className="flex items-center justify-between gap-4 cursor-pointer">
              <div>
                <span className="font-medium text-zinc-900 dark:text-zinc-100 block">Word wrapping</span>
                <span className="text-zinc-500 dark:text-zinc-400">Wrap long path strings in editor</span>
              </div>
              <input
                type="checkbox"
                checked={editorSettings.wordWrap}
                onChange={(e) =>
                  onChangeEditorSettings({ ...editorSettings, wordWrap: e.target.checked })
                }
                className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between gap-4 cursor-pointer">
              <div>
                <span className="font-medium text-zinc-900 dark:text-zinc-100 block">Line numbers</span>
                <span className="text-zinc-500 dark:text-zinc-400">Show gutter line numbers & fold controls</span>
              </div>
              <input
                type="checkbox"
                checked={editorSettings.lineNumbers}
                onChange={(e) =>
                  onChangeEditorSettings({ ...editorSettings, lineNumbers: e.target.checked })
                }
                className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between gap-4 cursor-pointer">
              <div>
                <span className="font-medium text-zinc-900 dark:text-zinc-100 block">Automatic live preview</span>
                <span className="text-zinc-500 dark:text-zinc-400">Re-render automatically as you type</span>
              </div>
              <input
                type="checkbox"
                checked={editorSettings.autoPreview}
                onChange={(e) =>
                  onChangeEditorSettings({ ...editorSettings, autoPreview: e.target.checked })
                }
                className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
              />
            </label>
          </div>

          {/* Preview background */}
          <div className="flex items-center justify-between gap-4 pt-1 border-t border-stone-100 dark:border-zinc-800/80">
            <label htmlFor="setting-preview-bg" className="cursor-pointer">
              <span className="font-medium text-zinc-900 dark:text-zinc-100 block">Preview canvas</span>
              <span className="text-zinc-500 dark:text-zinc-400">Backdrop surface (not exported)</span>
            </label>
            <select
              id="setting-preview-bg"
              value={previewBackground}
              onChange={(e) => onChangePreviewBackground(e.target.value as PreviewBackground)}
              className="h-8 px-2.5 rounded-md border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="checkerboard">Checkerboard</option>
              <option value="white">White</option>
              <option value="black">Black</option>
              <option value="gray">Neutral Gray</option>
              <option value="custom">Custom Color</option>
            </select>
          </div>

          {/* Local persistence transparency note */}
          <div className="pt-2 border-t border-stone-100 dark:border-zinc-800/80 text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
            Active single-project workspace stored locally in your browser. Use Export to save standalone <code className="font-mono-code">.svg</code> files.
          </div>
        </div>
      </div>
    </div>
  );
}
