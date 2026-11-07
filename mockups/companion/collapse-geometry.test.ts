import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bottomRightPosition } from './collapse-geometry.ts';

test('collapses down and right without moving the bottom-right corner', () => {
  const position = bottomRightPosition({ x: 1000, y: 500 }, { width: 360, height: 380 }, { width: 280, height: 44 }, 1);

  assert.deepEqual(position, { x: 1080, y: 836 });
  assert.equal(position.x + 280, 1360);
  assert.equal(position.y + 44, 880);
});

test('expands up and left from the same bottom-right corner', () => {
  const position = bottomRightPosition({ x: 1080, y: 836 }, { width: 280, height: 44 }, { width: 360, height: 380 }, 1);

  assert.deepEqual(position, { x: 1000, y: 500 });
});

test('anchors correctly on Retina displays and negative monitor coordinates', () => {
  const position = bottomRightPosition({ x: -1200, y: -100 }, { width: 720, height: 760 }, { width: 280, height: 44 }, 2);

  assert.deepEqual(position, { x: -1040, y: 572 });
  assert.equal(position.x + 560, -480);
  assert.equal(position.y + 88, 660);
});
