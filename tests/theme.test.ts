import test from 'node:test';
import assert from 'node:assert/strict';
import { getInitialTheme } from '../src/client/utils/theme.ts';

test('prefers an explicitly stored theme over the fallback', () => {
  assert.equal(getInitialTheme('dark', 'light'), 'dark');
  assert.equal(getInitialTheme('light', 'dark'), 'light');
});

test('falls back to the configured default when no preference is stored', () => {
  assert.equal(getInitialTheme(null), 'light');
  assert.equal(getInitialTheme('sepia', 'dark'), 'dark');
});
