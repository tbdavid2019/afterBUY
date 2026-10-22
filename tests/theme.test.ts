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
  assert.equal(getInitialPalette('saffron'), 'saffron');
  assert.equal(getInitialPalette('coral'), 'saffron');
  assert.equal(getInitialPalette('mint'), 'saffron');
  assert.equal(getInitialPalette('peach'), 'saffron');
  assert.equal(getInitialPalette('sky'), 'saffron');
  assert.equal(getInitialPalette('lilac'), 'saffron');
  assert.equal(getInitialPalette(null), 'saffron');
  assert.equal(getInitialPalette('unknown_theme', 'saffron'), 'saffron');
});
