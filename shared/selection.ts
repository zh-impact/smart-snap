import type { ElementBounds, SelectedElement } from './capture';

export function toggleSelectedElement(
  selected: Map<Element, SelectedElement>,
  element: Element,
  id: string,
  scrollX = 0,
  scrollY = 0,
): boolean {
  if (selected.delete(element)) return false;

  const rect = element.getBoundingClientRect();
  const bounds: ElementBounds = {
    x: rect.left + scrollX,
    y: rect.top + scrollY,
    width: rect.width,
    height: rect.height,
  };
  selected.set(element, { id, bounds });
  return true;
}
