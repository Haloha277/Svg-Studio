import type { EditorSettings, PersistedStudioState, PreviewBackground, ThemeMode } from '../types/studio';
import { sanitizeHistoryForStorage } from './historyPersistence';

export const STORAGE_KEY = 'svg-studio:project:v1';

export const DEFAULT_EDITOR_SETTINGS: EditorSettings = {
  fontSize: 13,
  tabSize: 2,
  wordWrap: false,
  lineNumbers: true,
  autoPreview: true,
};

export function createDefaultState(initialCode: string, initialExampleId: string): PersistedStudioState {
  return {
    projectName: 'Orbital Emblem',
    code: initialCode,
    editorHistory: undefined,
    theme: 'light',
    splitRatio: 0.48,
    editorSettings: { ...DEFAULT_EDITOR_SETTINGS },
    previewBackground: 'checkerboard',
    customBgColor: '#ffffff',
    lastExampleId: initialExampleId,
    updatedAt: new Date().toISOString(),
  };
}

function isTheme(val: unknown): val is ThemeMode {
  return val === 'light' || val === 'dark';
}

function isPreviewBackground(val: unknown): val is PreviewBackground {
  return val === 'checkerboard' || val === 'white' || val === 'black' || val === 'gray' || val === 'custom';
}

export function loadStudioState(fallbackCode: string, fallbackExampleId: string): PersistedStudioState {
  const defaults = createDefaultState(fallbackCode, fallbackExampleId);
  if (typeof window === 'undefined') return defaults;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<PersistedStudioState>;

    const tabSize = parsed.editorSettings?.tabSize === 4 ? 4 : 2;
    const fontSizeRaw = Number(parsed.editorSettings?.fontSize);
    const fontSize = Number.isFinite(fontSizeRaw) ? Math.min(20, Math.max(11, fontSizeRaw)) : defaults.editorSettings.fontSize;

    const splitRaw = Number(parsed.splitRatio);
    const splitRatio = Number.isFinite(splitRaw) ? Math.min(0.75, Math.max(0.25, splitRaw)) : defaults.splitRatio;

    return {
      projectName: typeof parsed.projectName === 'string' && parsed.projectName.trim() ? parsed.projectName : defaults.projectName,
      code: typeof parsed.code === 'string' ? parsed.code : defaults.code,
      editorHistory: sanitizeHistoryForStorage(parsed.editorHistory),
      theme: isTheme(parsed.theme) ? parsed.theme : defaults.theme,
      splitRatio,
      editorSettings: {
        fontSize,
        tabSize,
        wordWrap: typeof parsed.editorSettings?.wordWrap === 'boolean' ? parsed.editorSettings.wordWrap : defaults.editorSettings.wordWrap,
        lineNumbers: typeof parsed.editorSettings?.lineNumbers === 'boolean' ? parsed.editorSettings.lineNumbers : defaults.editorSettings.lineNumbers,
        autoPreview: typeof parsed.editorSettings?.autoPreview === 'boolean' ? parsed.editorSettings.autoPreview : defaults.editorSettings.autoPreview,
      },
      previewBackground: isPreviewBackground(parsed.previewBackground) ? parsed.previewBackground : defaults.previewBackground,
      customBgColor: typeof parsed.customBgColor === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(parsed.customBgColor)
        ? parsed.customBgColor
        : defaults.customBgColor,
      lastExampleId: typeof parsed.lastExampleId === 'string' ? parsed.lastExampleId : defaults.lastExampleId,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : defaults.updatedAt,
    };
  } catch {
    return defaults;
  }
}

export function saveStudioState(state: PersistedStudioState): { ok: boolean; error?: string } {
  if (typeof window === 'undefined') {
    return { ok: false, error: 'Browser storage is unavailable.' };
  }

  const sanitizedHistory = sanitizeHistoryForStorage(state.editorHistory);
  const payload: PersistedStudioState = {
    ...state,
    editorHistory: sanitizedHistory,
    updatedAt: new Date().toISOString(),
  };

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return { ok: true };
  } catch (err) {
    // Retry without editorHistory if localStorage quota is tight so user code is never lost
    try {
      const compactPayload: PersistedStudioState = {
        ...payload,
        editorHistory: undefined,
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(compactPayload));
      return { ok: true };
    } catch {
      const message = err instanceof Error ? err.message : 'Unable to save to local storage.';
      return { ok: false, error: message };
    }
  }
}
