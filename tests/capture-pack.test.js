import { expect, test } from 'bun:test';
import { packRectangles } from '../shared/capture-pack.ts';

test('packs separated rectangles into a compact non-overlapping canvas', () => {
  const items = [
    { id: 'a', bounds: { x: 0, y: 0, width: 100, height: 100 }, width: 100, height: 100 },
    { id: 'b', bounds: { x: 1000, y: 0, width: 100, height: 100 }, width: 100, height: 100 },
    { id: 'c', bounds: { x: 0, y: 1000, width: 100, height: 100 }, width: 100, height: 100 },
    { id: 'd', bounds: { x: 1000, y: 1000, width: 100, height: 100 }, width: 100, height: 100 },
  ];
  const packed = packRectangles(items);

  expect(packed.placements.map(item => item.id).sort()).toEqual(['a', 'b', 'c', 'd']);
  expect(packed.width * packed.height).toBeLessThan(1100 * 1100);
  for (let i = 0; i < packed.placements.length; i++) {
    for (let j = i + 1; j < packed.placements.length; j++) {
      const a = packed.placements[i];
      const b = packed.placements[j];
      const overlaps =
        a.x < b.x + b.width &&
        a.x + a.width > b.x &&
        a.y < b.y + b.height &&
        a.y + a.height > b.y;
      expect(overlaps).toBe(false);
    }
  }
});
