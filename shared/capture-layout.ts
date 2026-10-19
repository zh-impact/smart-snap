import type { ElementBounds } from './capture';

export interface LayoutItem {
  id: string;
  bounds: ElementBounds;
  width: number;
  height: number;
}

export interface LayoutPlacement {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayoutResult {
  width: number;
  height: number;
  placements: LayoutPlacement[];
}

interface Row {
  top: number;
  bottom: number;
  items: LayoutItem[];
}

export function layoutPreservingComposition(items: LayoutItem[]): LayoutResult {
  const rows: Row[] = [];
  const sorted = [...items].sort(
    (a, b) => a.bounds.y - b.bounds.y || a.bounds.x - b.bounds.x,
  );

  for (const item of sorted) {
    const row = rows
      .map(candidate => ({
        candidate,
        overlap: verticalOverlapRatio(item.bounds, candidate),
      }))
      .filter(match => match.overlap >= 0.5)
      .sort((a, b) => b.overlap - a.overlap)[0]?.candidate;

    if (row) {
      row.items.push(item);
      row.top = Math.min(row.top, item.bounds.y);
      row.bottom = Math.max(row.bottom, item.bounds.y + item.bounds.height);
    } else {
      rows.push({
        top: item.bounds.y,
        bottom: item.bounds.y + item.bounds.height,
        items: [item],
      });
    }
  }

  rows.sort((a, b) => a.top - b.top);
  for (const row of rows) row.items.sort((a, b) => a.bounds.x - b.bounds.x);

  const columnWidths = Array.from(
    { length: Math.max(0, ...rows.map(row => row.items.length)) },
    (_, column) => Math.max(...rows.map(row => row.items[column]?.width ?? 0)),
  );
  const columnOffsets = columnWidths.map((_, index) =>
    columnWidths.slice(0, index).reduce((sum, width) => sum + width, 0),
  );
  const width = columnWidths.reduce((sum, columnWidth) => sum + columnWidth, 0);
  let y = 0;
  const placements: LayoutPlacement[] = [];

  for (const row of rows) {
    for (const [column, item] of row.items.entries()) {
      placements.push({
        id: item.id,
        x: columnOffsets[column] ?? 0,
        y,
        width: item.width,
        height: item.height,
      });
    }
    y += Math.max(0, ...row.items.map(item => item.height));
  }

  return { width, height: y, placements };
}

function verticalOverlapRatio(bounds: ElementBounds, row: Row): number {
  const overlap = Math.max(
    0,
    Math.min(bounds.y + bounds.height, row.bottom) - Math.max(bounds.y, row.top),
  );
  const shorterHeight = Math.min(bounds.height, row.bottom - row.top);
  return shorterHeight > 0 ? overlap / shorterHeight : 0;
}
