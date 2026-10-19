import { expect, test } from 'bun:test';
import { layoutPreservingComposition } from '../shared/capture-layout.ts';

test('preserves rows and columns while removing page gaps', () => {
  const layout = layoutPreservingComposition([
    { id: 'a', bounds: { x: 0, y: 0, width: 40, height: 20 }, width: 40, height: 20 },
    { id: 'b', bounds: { x: 100, y: 0, width: 30, height: 20 }, width: 30, height: 20 },
    { id: 'c', bounds: { x: 0, y: 100, width: 20, height: 10 }, width: 20, height: 10 },
    { id: 'd', bounds: { x: 100, y: 100, width: 50, height: 10 }, width: 50, height: 10 },
  ]);

  expect(layout).toEqual({
    width: 90,
    height: 30,
    placements: [
      { id: 'a', x: 0, y: 0, width: 40, height: 20 },
      { id: 'b', x: 40, y: 0, width: 30, height: 20 },
      { id: 'c', x: 0, y: 20, width: 20, height: 10 },
      { id: 'd', x: 40, y: 20, width: 50, height: 10 },
    ],
  });
});

test('groups elements in the same visual row despite small vertical offsets', () => {
  const layout = layoutPreservingComposition([
    { id: 'a', bounds: { x: 0, y: 0, width: 40, height: 20 }, width: 40, height: 20 },
    { id: 'b', bounds: { x: 100, y: 2, width: 30, height: 18 }, width: 30, height: 18 },
  ]);

  expect(layout.placements.map(item => item.y)).toEqual([0, 0]);
});
