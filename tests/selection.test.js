import { expect, test } from 'bun:test';
import { toggleSelectedElement } from '../shared/selection.ts';

test('selection bounds use page coordinates', () => {
  const element = {
    getBoundingClientRect: () => ({
      left: 12,
      top: 24,
      width: 80,
      height: 40,
    }),
  };
  const selected = new Map();

  expect(toggleSelectedElement(selected, element, 'target-1', 5, 7)).toBe(true);
  expect(selected.get(element)).toEqual({
    id: 'target-1',
    bounds: { x: 17, y: 31, width: 80, height: 40 },
  });
});

test('clicking an already selected element removes it', () => {
  const element = {
    getBoundingClientRect: () => ({
      left: 0,
      top: 0,
      width: 10,
      height: 10,
    }),
  };
  const selected = new Map();
  toggleSelectedElement(selected, element, 'target-1');

  expect(toggleSelectedElement(selected, element, 'target-2')).toBe(false);
  expect(selected.has(element)).toBe(false);
});
