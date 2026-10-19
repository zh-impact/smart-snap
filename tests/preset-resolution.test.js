import { expect, test } from 'bun:test';
import { resolvePresetTargets } from '../shared/preset-resolution.ts';

function element(selectors, bounds, shadowRoot) {
  return {
    matches: selector => selectors.includes(selector),
    getBoundingClientRect: () => bounds,
    shadowRoot,
  };
}

function root(elements) {
  return { querySelectorAll: selector => (selector === '*' ? elements : []) };
}

test('selector defaults to every visible match, including open shadow roots', () => {
  const shadowButton = element(['button'], { left: 30, top: 40, width: 20, height: 10 });
  const host = element([], { left: 0, top: 0, width: 50, height: 50 }, root([shadowButton]));
  const first = element(['button'], { left: 10, top: 20, width: 20, height: 10 });
  const second = element(['button'], { left: 60, top: 20, width: 20, height: 10 });

  const result = resolvePresetTargets([{ selector: 'button' }], root([first, host, second]), 5, 7);

  expect(result.targets.map(target => target.bounds)).toEqual([
    { x: 15, y: 27, width: 20, height: 10 },
    { x: 35, y: 47, width: 20, height: 10 },
    { x: 65, y: 27, width: 20, height: 10 },
  ]);
  expect(result.missingSelectors).toEqual([]);
});

test('first match mode selects only the first composed-tree match', () => {
  const first = element(['.item'], { left: 0, top: 0, width: 10, height: 10 });
  const second = element(['.item'], { left: 20, top: 0, width: 10, height: 10 });
  const result = resolvePresetTargets(
    [{ selector: '.item', matchMode: 'first' }],
    root([first, second]),
  );

  expect(result.targets).toHaveLength(1);
  expect(result.targets[0].bounds.x).toBe(0);
});

test('a missing selector aborts the entire preset resolution', () => {
  const present = element(['.present'], { left: 0, top: 0, width: 10, height: 10 });
  const result = resolvePresetTargets(
    [{ selector: '.present' }, { selector: '.missing' }],
    root([present]),
  );

  expect(result.targets).toEqual([]);
  expect(result.missingSelectors).toEqual(['.missing']);
});
