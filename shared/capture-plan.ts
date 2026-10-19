import type {
  CaptureFramePosition,
  CapturePlan,
  CaptureSlice,
  CaptureViewport,
  SelectedElement,
} from './capture';

export function createCapturePlan(
  targets: SelectedElement[],
  viewport: CaptureViewport,
): CapturePlan {
  if (viewport.width <= 0 || viewport.height <= 0) {
    return { targets, viewport, frames: [], slices: [] };
  }

  const frames: CaptureFramePosition[] = [];
  const frameIndexes = new Map<string, number>();
  const slices: CaptureSlice[] = [];
  const maxScrollX = Math.max(0, viewport.pageWidth - viewport.width);
  const maxScrollY = Math.max(0, viewport.pageHeight - viewport.height);

  for (const target of targets) {
    const { bounds } = target;
    for (let destinationY = 0; destinationY < bounds.height; destinationY += viewport.height) {
      for (let destinationX = 0; destinationX < bounds.width; destinationX += viewport.width) {
        const width = Math.min(viewport.width, bounds.width - destinationX);
        const height = Math.min(viewport.height, bounds.height - destinationY);
        const documentX = bounds.x + destinationX;
        const documentY = bounds.y + destinationY;
        let scrollX = Math.min(Math.max(documentX, 0), maxScrollX);
        let scrollY = Math.min(Math.max(documentY, 0), maxScrollY);

        if (documentX + width > scrollX + viewport.width) {
          scrollX = Math.min(documentX + width - viewport.width, maxScrollX);
        }
        if (documentY + height > scrollY + viewport.height) {
          scrollY = Math.min(documentY + height - viewport.height, maxScrollY);
        }

        const key = `${scrollX}:${scrollY}`;
        let frameIndex = frameIndexes.get(key);
        if (frameIndex === undefined) {
          frameIndex = frames.length;
          frameIndexes.set(key, frameIndex);
          frames.push({ scrollX, scrollY });
        }

        slices.push({
          targetId: target.id,
          frameIndex,
          source: {
            x: documentX - scrollX,
            y: documentY - scrollY,
            width,
            height,
          },
          destination: { x: destinationX, y: destinationY },
        });
      }
    }
  }

  return { targets, viewport, frames, slices };
}
