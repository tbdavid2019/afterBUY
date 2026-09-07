import test from 'node:test';
import assert from 'node:assert/strict';
import { getInitialTheme, getInitialPalette } from '../src/client/utils/theme.ts';

test('prefers an explicitly stored theme over the fallback', () => {
  assert.equal(getInitialTheme('dark', 'light'), 'dark');
  assert.equal(getInitialTheme('light', 'dark'), 'light');
});

test('falls back to the configured default when no preference is stored', () => {
  assert.equal(getInitialTheme(null), 'light');
  assert.equal(getInitialTheme('sepia', 'dark'), 'dark');
});

test('handles theme palette selection and fallback', () => {
  assert.equal(getInitialPalette('mint'), 'mint');
  assert.equal(getInitialPalette('peach'), 'peach');
  assert.equal(getInitialPalette('sky'), 'sky');
  assert.equal(getInitialPalette('lilac'), 'lilac');
  assert.equal(getInitialPalette('coral'), 'coral');
  assert.equal(getInitialPalette(null), 'coral');
  assert.equal(getInitialPalette('unknown_theme', 'sky'), 'sky');
});
