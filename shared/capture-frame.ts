export async function captureWithCleanup<T>(
  prepare: () => Promise<void>,
  capture: () => Promise<T>,
  restore: () => Promise<void>,
): Promise<T> {
  try {
    await prepare();
    return await capture();
  } finally {
    await restore();
  }
}
