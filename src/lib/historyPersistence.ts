export const MAX_PERSISTED_HISTORY_BYTES = 512 * 1024;

export interface EditorHistoryStatus {
  canUndo: boolean;
  canRedo: boolean;
  undoCount: number;
  redoCount: number;
}

export interface SerializedEditorJson {
  doc: string;
  selection?: unknown;
  history: unknown;
}

export function isValidSerializedEditorState(
  raw: unknown,
  expectedDoc: string
): raw is SerializedEditorJson {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return false;
  }

  const candidate = raw as Record<string, unknown>;
  if (typeof candidate.doc !== 'string' || candidate.doc !== expectedDoc) {
    return false;
  }

  if (!candidate.history || typeof candidate.history !== 'object') {
    return false;
  }

  return true;
}

export function sanitizeHistoryForStorage(raw: unknown): unknown | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return undefined;
  }

  try {
    const serialized = JSON.stringify(raw);
    if (serialized.length > MAX_PERSISTED_HISTORY_BYTES) {
      return undefined;
    }
    return JSON.parse(serialized) as unknown;
  } catch {
    return undefined;
  }
}
