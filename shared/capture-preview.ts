import type {
  CaptureResult,
  CompositionStrategy,
  ElementBounds,
} from './capture';
import { layoutPreservingComposition } from './capture-layout';
import { packRectangles } from './capture-pack';

export interface TargetPreview {
  id: string;
  src: string;
  width: number;
  height: number;
  bounds: ElementBounds;
}

export async function createTargetPreviews(result: CaptureResult): Promise<TargetPreview[]> {
  const images = await Promise.all(result.frames.map(frame => loadImage(frame.dataUrl)));
  const firstImage = images[0];
  if (!firstImage) return [];

  const scaleX = firstImage.naturalWidth / result.plan.viewport.width;
  const scaleY = firstImage.naturalHeight / result.plan.viewport.height;

  return result.plan.targets.map(target => {
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(target.bounds.width * scaleX);
    canvas.height = Math.ceil(target.bounds.height * scaleY);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas is unavailable');

    for (const slice of result.plan.slices.filter(item => item.targetId === target.id)) {
      const frame = images[slice.frameIndex];
      if (!frame) throw new Error('A capture frame is missing');
      const { source, destination } = slice;
      context.drawImage(
        frame,
        source.x * scaleX,
        source.y * scaleY,
        source.width * scaleX,
        source.height * scaleY,
        destination.x * scaleX,
        destination.y * scaleY,
        source.width * scaleX,
        source.height * scaleY,
      );
    }

    return {
      id: target.id,
      src: canvas.toDataURL('image/png'),
      width: canvas.width,
      height: canvas.height,
      bounds: target.bounds,
    };
  });
}

export async function composeTargetPreviews(
  previews: TargetPreview[],
  strategy: CompositionStrategy,
): Promise<string> {
  const items = previews.map(preview => ({
    id: preview.id,
    bounds: preview.bounds,
    width: preview.width,
    height: preview.height,
  }));
  const layout =
    strategy === 'layout-preserving'
      ? layoutPreservingComposition(items)
      : packRectangles(items);
  const canvas = document.createElement('canvas');
  canvas.width = layout.width;
  canvas.height = layout.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas is unavailable');

  const images = await Promise.all(previews.map(preview => loadImage(preview.src)));
  const imagesById = new Map(previews.map((preview, index) => [preview.id, images[index]]));
  for (const placement of layout.placements) {
    const image = imagesById.get(placement.id);
    if (!image) throw new Error('A selected element image is missing');
    context.drawImage(image, placement.x, placement.y, placement.width, placement.height);
  }

  return canvas.toDataURL('image/png');
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}
