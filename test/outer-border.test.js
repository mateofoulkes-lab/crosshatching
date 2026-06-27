import test from 'node:test';
import assert from 'node:assert/strict';
import {traceOuterBorder} from '../src/core/outerBorder.js';

test('outer border renders exposed mask edges as independent segments', () => {
  const mask = new Uint8Array([
    0, 0, 0,
    0, 1, 0,
    0, 0, 0
  ]);
  const layer = traceOuterBorder(mask, 3, 3, {enabled: true, color: '#000', strokeWidth: 1});
  assert.equal(layer.id, 'outer_border');
  assert.equal(layer.segments.length, 4);
  assert.equal(layer.stats.segments, 4);
  assert.equal(layer.polylines, undefined);
});
