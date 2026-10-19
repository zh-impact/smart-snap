import { expect, test } from 'bun:test';
import { createCapturePlan } from '../shared/capture-plan.ts';

test('capture plan scrolls to an off-screen element', () => {
  const plan = createCapturePlan(
    [{ id: 'target-1', bounds: { x: 40, y: 900, width: 100, height: 100 } }],
    { width: 300, height: 200, pageWidth: 600, pageHeight: 1000 },
  );

  expect(plan.frames).toEqual([{ scrollX: 40, scrollY: 800 }]);
  expect(plan.slices).toEqual([
    {
      targetId: 'target-1',
      frameIndex: 0,
      source: { x: 0, y: 100, width: 100, height: 100 },
      destination: { x: 0, y: 0 },
    },
  ]);
});

test('capture plan tiles a target spanning multiple viewports', () => {
  const plan = createCapturePlan(
    [{ id: 'target-1', bounds: { x: 250, y: 150, width: 400, height: 250 } }],
    { width: 300, height: 200, pageWidth: 900, pageHeight: 1000 },
  );

  expect(plan.frames).toHaveLength(4);
  expect(plan.slices).toHaveLength(4);
  expect(plan.slices.map(slice => slice.destination)).toEqual([
    { x: 0, y: 0 },
    { x: 300, y: 0 },
    { x: 0, y: 200 },
    { x: 300, y: 200 },
  ]);
  expect(plan.slices.map(slice => slice.source)).toEqual([
    { x: 0, y: 0, width: 300, height: 200 },
    { x: 0, y: 0, width: 100, height: 200 },
    { x: 0, y: 0, width: 300, height: 50 },
    { x: 0, y: 0, width: 100, height: 50 },
  ]);
});
