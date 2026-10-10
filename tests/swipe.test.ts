import test from 'node:test';
import assert from 'node:assert/strict';
import { swipeDirection } from '../src/client/utils/swipe.ts';

test('horizontal swipe needs deliberate travel and ignores scrolling', () => {
  assert.equal(swipeDirection(20, 2, 'horizontal'), null);
  assert.equal(swipeDirection(8, 160, 'horizontal'), null);
  assert.equal(swipeDirection(90, 100, 'horizontal'), null);
  assert.equal(swipeDirection(100, 10, 'horizontal'), 'right');
  assert.equal(swipeDirection(-100, 10, 'horizontal'), 'left');
});

test('sheet dismissal requires a vertical swipe and preserves horizontal motion', () => {
  assert.equal(swipeDirection(120, 12, 'vertical'), null);
  assert.equal(swipeDirection(4, 60, 'vertical'), null);
  assert.equal(swipeDirection(10, 110, 'vertical'), 'down');
  assert.equal(swipeDirection(10, -110, 'vertical'), 'up');
});
