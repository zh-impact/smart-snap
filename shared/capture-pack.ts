import type { LayoutItem, LayoutPlacement, LayoutResult } from './capture-layout';

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PlacedItem {
  item: LayoutItem;
  rect: Rect;
}

export function packRectangles(items: LayoutItem[]): LayoutResult {
  if (items.length === 0) return { width: 0, height: 0, placements: [] };

  const maxItemWidth = Math.max(...items.map(item => item.width));
  const totalWidth = items.reduce((sum, item) => sum + item.width, 0);
  const totalArea = items.reduce((sum, item) => sum + item.width * item.height, 0);
  const baseWidth = Math.sqrt(totalArea);
  const widths = new Set<number>([maxItemWidth, totalWidth]);
  for (const factor of [0.7, 0.85, 1, 1.15, 1.3, 1.5, 1.8]) {
    widths.add(Math.ceil(Math.min(totalWidth, Math.max(maxItemWidth, baseWidth * factor))));
  }

  const ordered = [...items].sort(
    (a, b) =>
      b.width * b.height - a.width * a.height ||
      Math.max(b.width, b.height) - Math.max(a.width, a.height),
  );
  let best: LayoutResult | undefined;
  let bestArea = Infinity;
  let bestAspectPenalty = Infinity;

  for (const binWidth of widths) {
    const candidate = packAtWidth(ordered, binWidth);
    if (!candidate) continue;

    const area = candidate.width * candidate.height;
    const aspectPenalty =
      candidate.width > 0 && candidate.height > 0
        ? Math.abs(Math.log(candidate.width / candidate.height))
        : Infinity;
    if (area < bestArea || (area === bestArea && aspectPenalty < bestAspectPenalty)) {
      best = candidate;
      bestArea = area;
      bestAspectPenalty = aspectPenalty;
    }
  }

  return best ?? packAtWidth(ordered, totalWidth)!;
}

function packAtWidth(items: LayoutItem[], binWidth: number): LayoutResult | undefined {
  const totalHeight = items.reduce((sum, item) => sum + item.height, 0);
  let freeRectangles: Rect[] = [{ x: 0, y: 0, width: binWidth, height: totalHeight }];
  const placed: PlacedItem[] = [];

  for (const item of items) {
    let bestRect: Rect | undefined;
    let bestShortSide = Infinity;
    let bestLongSide = Infinity;

    for (const free of freeRectangles) {
      if (item.width > free.width || item.height > free.height) continue;

      const horizontal = free.width - item.width;
      const vertical = free.height - item.height;
      const shortSide = Math.min(horizontal, vertical);
      const longSide = Math.max(horizontal, vertical);
      if (
        shortSide < bestShortSide ||
        (shortSide === bestShortSide && longSide < bestLongSide) ||
        (shortSide === bestShortSide && longSide === bestLongSide && free.y < (bestRect?.y ?? Infinity))
      ) {
        bestRect = free;
        bestShortSide = shortSide;
        bestLongSide = longSide;
      }
    }

    if (!bestRect) return undefined;

    const rect = { x: bestRect.x, y: bestRect.y, width: item.width, height: item.height };
    placed.push({ item, rect });
    freeRectangles = pruneFreeRectangles(splitFreeRectangles(freeRectangles, rect));
  }

  const placements: LayoutPlacement[] = placed.map(({ item, rect }) => ({
    id: item.id,
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
  }));

  return {
    width: Math.max(...placements.map(item => item.x + item.width)),
    height: Math.max(...placements.map(item => item.y + item.height)),
    placements,
  };
}

function splitFreeRectangles(freeRectangles: Rect[], used: Rect): Rect[] {
  const split: Rect[] = [];
  for (const free of freeRectangles) {
    if (!intersects(free, used)) {
      split.push(free);
      continue;
    }

    const right = free.x + free.width;
    const bottom = free.y + free.height;
    const usedRight = used.x + used.width;
    const usedBottom = used.y + used.height;
    if (used.x > free.x) split.push({ x: free.x, y: free.y, width: used.x - free.x, height: free.height });
    if (usedRight < right) split.push({ x: usedRight, y: free.y, width: right - usedRight, height: free.height });
    if (used.y > free.y) split.push({ x: free.x, y: free.y, width: free.width, height: used.y - free.y });
    if (usedBottom < bottom) split.push({ x: free.x, y: usedBottom, width: free.width, height: bottom - usedBottom });
  }
  return split.filter(rect => rect.width > 0 && rect.height > 0);
}

function pruneFreeRectangles(rectangles: Rect[]): Rect[] {
  return rectangles.filter((rect, index) => {
    return !rectangles.some((other, otherIndex) => {
      return otherIndex !== index && contains(other, rect);
    });
  });
}

function intersects(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function contains(outer: Rect, inner: Rect): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height
  );
}
