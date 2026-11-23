export type ThemeMode = 'light' | 'dark';

export type PreviewBackground = 'checkerboard' | 'white' | 'black' | 'gray' | 'custom';

export type SaveStatus = 'saved' | 'unsaved' | 'saving' | 'error';

export type MobileTab = 'editor' | 'preview';

export interface EditorSettings {
  fontSize: number;
  tabSize: 2 | 4;
  wordWrap: boolean;
  lineNumbers: boolean;
  autoPreview: boolean;
}

export interface SvgDiagnostic {
  severity: 'error' | 'warning';
  message: string;
  line?: number;
  column?: number;
}

export interface SvgProcessResult {
  valid: boolean;
  empty: boolean;
  sanitizedSvg: string | null;
  diagnostics: SvgDiagnostic[];
  securityWarnings: string[];
  strippedCount: number;
  viewBox: string | null;
  intrinsicWidth: number;
  intrinsicHeight: number;
}

export interface FormatResult {
  ok: boolean;
  formatted: string;
  error?: SvgDiagnostic;
}

export interface SvgExample {
  id: string;
  name: string;
  description: string;
  category: string;
  code: string;
}

export interface PersistedStudioState {
  projectName: string;
  code: string;
  editorHistory?: unknown;
  theme: ThemeMode;
  splitRatio: number;
  editorSettings: EditorSettings;
  previewBackground: PreviewBackground;
  customBgColor: string;
  lastExampleId: string | null;
  updatedAt: string;
}
