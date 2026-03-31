import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveReplyMode } from '@/lib/finance-assistant/reply-mode.service';

test('keeps persisted mode when request is unchanged', () => {
  const mode = resolveReplyMode({
    persistedMode: 'text',
    requestedMode: 'unchanged',
  });

  assert.equal(mode, 'text');
});

test('applies explicit request mode', () => {
  const mode = resolveReplyMode({
    persistedMode: 'text',
    requestedMode: 'both',
  });

  assert.equal(mode, 'both');
});
