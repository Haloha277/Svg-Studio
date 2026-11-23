import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isValidSerializedEditorState,
  MAX_PERSISTED_HISTORY_BYTES,
  sanitizeHistoryForStorage,
} from './historyPersistence';

test('isValidSerializedEditorState validates matching doc and history object', () => {
  const valid = {
    doc: '<svg />',
    selection: { main: 0, ranges: [{ anchor: 0, head: 0 }] },
    history: { done: [], undone: [] },
  };
  assert.equal(isValidSerializedEditorState(valid, '<svg />'), true);
  assert.equal(isValidSerializedEditorState(valid, '<svg><circle /></svg>'), false);
  assert.equal(isValidSerializedEditorState({ doc: '<svg />' }, '<svg />'), false);
  assert.equal(isValidSerializedEditorState(null, '<svg />'), false);
  assert.equal(isValidSerializedEditorState([], '<svg />'), false);
});

test('sanitizeHistoryForStorage drops oversized or invalid payloads and preserves valid ones', () => {
  const small = { doc: '<svg />', history: { done: [{ changes: [] }], undone: [] } };
  assert.deepEqual(sanitizeHistoryForStorage(small), small);

  const oversized = {
    doc: 'x'.repeat(MAX_PERSISTED_HISTORY_BYTES + 100),
    history: { done: [], undone: [] },
  };
  assert.equal(sanitizeHistoryForStorage(oversized), undefined);
  assert.equal(sanitizeHistoryForStorage('bad'), undefined);
});
