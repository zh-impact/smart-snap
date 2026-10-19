import { expect, test } from 'bun:test';
import { captureWithCleanup } from '../shared/capture-frame.ts';

test('capture cleanup restores blockers after a successful frame', async () => {
  let visible = true;
  const result = await captureWithCleanup(
    async () => {
      visible = false;
    },
    async () => 'frame',
    async () => {
      visible = true;
    },
  );

  expect(result).toBe('frame');
  expect(visible).toBe(true);
});

test('capture cleanup restores blockers when a frame capture fails', async () => {
  let visible = true;
  await expect(
    captureWithCleanup(
      async () => {
        visible = false;
      },
      async () => {
        throw new Error('capture failed');
      },
      async () => {
        visible = true;
      },
    ),
  ).rejects.toThrow('capture failed');

  expect(visible).toBe(true);
});
