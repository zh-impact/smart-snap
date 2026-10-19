import type { PresetSelector, SelectedElement } from './capture';

export interface PresetResolution {
  targets: SelectedElement[];
  elements: Element[];
  missingSelectors: string[];
  invalidSelectors: string[];
}

export function resolvePresetTargets(
  selectors: PresetSelector[],
  root: ParentNode,
  scrollX = 0,
  scrollY = 0,
): PresetResolution {
  const targets: SelectedElement[] = [];
  const elements: Element[] = [];
  const missingSelectors: string[] = [];
  const invalidSelectors: string[] = [];
  const seen = new Set<Element>();
  let nextId = 1;

  for (const presetSelector of selectors) {
    let matches: Element[];
    try {
      matches = findMatches(root, presetSelector.selector);
    } catch {
      invalidSelectors.push(presetSelector.selector);
      continue;
    }

    const visibleMatches = matches.filter(element => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
    if (visibleMatches.length === 0) {
      missingSelectors.push(presetSelector.selector);
      continue;
    }

    const selectedMatches =
      presetSelector.matchMode === 'first' ? visibleMatches.slice(0, 1) : visibleMatches;
    for (const element of selectedMatches) {
      if (seen.has(element)) continue;
      seen.add(element);
      const rect = element.getBoundingClientRect();
      targets.push({
        id: `preset-target-${nextId++}`,
        bounds: {
          x: rect.left + scrollX,
          y: rect.top + scrollY,
          width: rect.width,
          height: rect.height,
        },
      });
      elements.push(element);
    }
  }

  if (missingSelectors.length > 0 || invalidSelectors.length > 0) {
    return { targets: [], elements: [], missingSelectors, invalidSelectors };
  }
  return { targets, elements, missingSelectors, invalidSelectors };
}

function findMatches(root: ParentNode, selector: string): Element[] {
  const matches: Element[] = [];

  const visit = (scope: ParentNode) => {
    for (const element of scope.querySelectorAll('*')) {
      if (element.matches(selector)) matches.push(element);
      if (element.shadowRoot) visit(element.shadowRoot);
    }
  };

  visit(root);
  return matches;
}
