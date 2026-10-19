import type { CaptureSlice, ExtensionMessage, SelectedElement } from '../shared/capture';
import { createCapturePlan } from '../shared/capture-plan';
import { resolvePresetTargets } from '../shared/preset-resolution';
import { toggleSelectedElement } from '../shared/selection';

export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    let active = false;
    const selected = new Map<Element, SelectedElement>();
    const hiddenOccluders = new Map<Element, { value: string; priority: string }>();
    let hovered: Element | undefined;
    let nextId = 1;
    let host: HTMLDivElement | undefined;
    let shadow: ShadowRoot | undefined;

    const update = () => {
      if (!shadow || !host) return;

      const highlights = shadow.querySelector<HTMLDivElement>('.highlights');
      const count = shadow.querySelector<HTMLSpanElement>('.count');
      const complete = shadow.querySelector<HTMLButtonElement>('.complete');
      if (!highlights || !count || !complete) return;

      highlights.replaceChildren();
      for (const element of selected.keys()) {
        if (!element.isConnected) continue;
        const rect = element.getBoundingClientRect();
        const marker = document.createElement('div');
        marker.className = 'highlight';
        marker.style.left = `${rect.left}px`;
        marker.style.top = `${rect.top}px`;
        marker.style.width = `${rect.width}px`;
        marker.style.height = `${rect.height}px`;
        highlights.append(marker);
      }

      if (hovered?.isConnected && !selected.has(hovered)) {
        const rect = hovered.getBoundingClientRect();
        const marker = document.createElement('div');
        marker.className = 'hover-highlight';
        marker.style.left = `${rect.left}px`;
        marker.style.top = `${rect.top}px`;
        marker.style.width = `${rect.width}px`;
        marker.style.height = `${rect.height}px`;
        highlights.append(marker);
      }

      count.textContent = `${selected.size} selected`;
      complete.disabled = selected.size === 0;
    };

    const stop = (completeSelection = false) => {
      if (!active) return;
      active = false;
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('pointermove', onPointerMove, true);
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
      hovered = undefined;
      host?.remove();
      host = undefined;
      shadow = undefined;

      if (completeSelection) {
        void browser.runtime
          .sendMessage({
            type: 'selection/complete',
            targets: [...selected.values()],
          } satisfies ExtensionMessage)
          .catch(() => undefined);
      }
    };

    const onClick = (event: MouseEvent) => {
      if (!active || !host || event.composedPath().includes(host)) return;

      const element = event
        .composedPath()
        .find(
          (target): target is Element =>
            target instanceof Element &&
            !['BODY', 'HEAD', 'HTML', 'SCRIPT', 'STYLE'].includes(target.tagName),
        );
      if (!element) return;

      const rect = element.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      toggleSelectedElement(
        selected,
        element,
        `target-${nextId++}`,
        window.scrollX,
        window.scrollY,
      );
      if (selected.has(element)) hovered = undefined;
      update();
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!active || !host) return;
      if (event.composedPath().includes(host)) {
        if (hovered) {
          hovered = undefined;
          update();
        }
        return;
      }

      const element = event
        .composedPath()
        .find(
          (target): target is Element =>
            target instanceof Element &&
            !['BODY', 'HEAD', 'HTML', 'SCRIPT', 'STYLE'].includes(target.tagName),
        );
      const selectedAncestor = element
        ? [...selected.keys()].find(selectedElement => composedContains(selectedElement, element))
        : undefined;
      const nextHovered = selectedAncestor ? undefined : element;
      if (nextHovered === hovered) return;
      hovered = nextHovered;
      update();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (active && event.key === 'Escape') stop();
    };

    const restoreOccluders = () => {
      for (const [element, previous] of hiddenOccluders) {
        if (!element.isConnected) continue;
        const style = (element as HTMLElement).style;
        if (
          style.getPropertyValue('visibility') !== 'hidden' ||
          style.getPropertyPriority('visibility') !== 'important'
        ) {
          continue;
        }
        if (previous.value) {
          style.setProperty('visibility', previous.value, previous.priority);
        } else {
          style.removeProperty('visibility');
        }
      }
      hiddenOccluders.clear();
    };

    const composedParent = (element: Element): Element | null => {
      if (element.parentElement) return element.parentElement;
      const root = element.getRootNode();
      return root instanceof ShadowRoot ? root.host : null;
    };

    const composedContains = (ancestor: Element, element: Element): boolean => {
      for (let current: Element | null = element; current; current = composedParent(current)) {
        if (current === ancestor) return true;
      }
      return false;
    };

    const findOccluders = (slices: CaptureSlice[]) => {
      let uncertain = false;

      for (const slice of slices) {
        const target = [...selected.entries()].find(([, item]) => item.id === slice.targetId)?.[0];
        if (!target?.isConnected) {
          uncertain = true;
          continue;
        }

        const xs = [
          slice.source.x + 1,
          slice.source.x + slice.source.width / 2,
          slice.source.x + slice.source.width - 1,
        ];
        const ys = [
          slice.source.y + 1,
          slice.source.y + slice.source.height / 2,
          slice.source.y + slice.source.height - 1,
        ];
        for (const x of xs) {
          for (const y of ys) {
            if (x < 0 || y < 0 || x >= window.innerWidth || y >= window.innerHeight) continue;
            const top = document
              .elementsFromPoint(x, y)
              .find(element => {
                const style = getComputedStyle(element);
                return style.visibility === 'visible' && Number(style.opacity) > 0;
              });
            if (!top || composedContains(target, top)) continue;

            let blocker: Element | null = top;
            while (blocker) {
              const position = getComputedStyle(blocker).position;
              if (position === 'fixed' || position === 'sticky') break;
              blocker = composedParent(blocker);
            }
            if (!blocker || composedContains(blocker, target)) {
              uncertain = true;
              continue;
            }
            if (hiddenOccluders.has(blocker)) continue;

            const style = (blocker as HTMLElement).style;
            hiddenOccluders.set(blocker, {
              value: style.getPropertyValue('visibility'),
              priority: style.getPropertyPriority('visibility'),
            });
            style.setProperty('visibility', 'hidden', 'important');
          }
        }
      }

      const pointerlessOverlays = collectOpenElements(document).filter(element => {
        const style = getComputedStyle(element);
        return (
          style.pointerEvents === 'none' &&
          (style.position === 'fixed' || style.position === 'sticky') &&
          style.visibility === 'visible' &&
          Number(style.opacity) > 0
        );
      });

      for (const slice of slices) {
        const target = [...selected.entries()].find(([, item]) => item.id === slice.targetId)?.[0];
        if (!target) continue;
        if (
          pointerlessOverlays.some(element => {
            if (composedContains(target, element) || composedContains(element, target)) return false;
            const rect = element.getBoundingClientRect();
            return (
              rect.left < slice.source.x + slice.source.width &&
              rect.right > slice.source.x &&
              rect.top < slice.source.y + slice.source.height &&
              rect.bottom > slice.source.y
            );
          })
        ) {
          uncertain = true;
        }
      }

      return { hiddenBlockerCount: hiddenOccluders.size, uncertain };
    };

    const collectOpenElements = (root: ParentNode): Element[] => {
      const elements = [...root.querySelectorAll('*')];
      for (const element of elements) {
        if (element.shadowRoot) elements.push(...collectOpenElements(element.shadowRoot));
      }
      return elements;
    };

    const start = () => {
      if (active) return;
      active = true;
      selected.clear();
      hovered = undefined;
      host = document.createElement('div');
      host.style.setProperty('all', 'initial', 'important');
      host.style.setProperty('display', 'block', 'important');
      host.style.setProperty('position', 'fixed', 'important');
      host.style.setProperty('inset', '0', 'important');
      host.style.setProperty('z-index', '2147483647', 'important');
      host.style.setProperty('pointer-events', 'none', 'important');
      shadow = host.attachShadow({ mode: 'open' });
      shadow.innerHTML = `
        <style>
          .highlights { position: fixed; inset: 0; pointer-events: none; }
          .highlight {
            position: fixed;
            box-sizing: border-box;
            border: 2px solid #4f46e5;
            background: rgb(79 70 229 / 12%);
            pointer-events: none;
          }
          .hover-highlight {
            position: fixed;
            box-sizing: border-box;
            border: 2px dashed #0891b2;
            background: rgb(8 145 178 / 12%);
            pointer-events: none;
          }
          .toolbar {
            position: fixed;
            bottom: 16px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 10px 14px;
            border-radius: 10px;
            background: #111827;
            color: white;
            box-shadow: 0 4px 18px rgb(0 0 0 / 28%);
            font: 14px/1.4 system-ui, sans-serif;
            pointer-events: auto;
          }
          button {
            border: 0;
            border-radius: 6px;
            padding: 6px 10px;
            font: inherit;
            cursor: pointer;
          }
          .complete { background: #818cf8; color: #111827; }
          .complete:disabled { cursor: not-allowed; opacity: .5; }
          .cancel { background: #374151; color: white; }
        </style>
        <div class="highlights" aria-hidden="true"></div>
        <div class="toolbar" role="status" aria-live="polite">
          <span>Hover to preview. Click to select; click again to remove.</span>
          <span class="count">0 selected</span>
          <button class="complete" type="button" disabled>Finish</button>
          <button class="cancel" type="button">Cancel</button>
        </div>
      `;
      document.documentElement.append(host);
      shadow.querySelector('.complete')?.addEventListener('click', () => stop(true));
      shadow.querySelector('.cancel')?.addEventListener('click', () => stop());
      document.addEventListener('click', onClick, true);
      document.addEventListener('keydown', onKeyDown, true);
      document.addEventListener('pointermove', onPointerMove, true);
      window.addEventListener('scroll', update, true);
      window.addEventListener('resize', update);
      update();
    };

    browser.runtime.onMessage.addListener(async (message: ExtensionMessage) => {
      if (message.type === 'selection/start') start();

      if (message.type === 'capture/plan') {
        const targets: SelectedElement[] = [];
        for (const target of message.targets) {
          const element = [...selected.entries()].find(([, selectedTarget]) => {
            return selectedTarget.id === target.id;
          })?.[0];
          if (!element?.isConnected) {
            return {
              type: 'capture/error',
              message: 'A selected element is no longer on the page.',
            };
          }

          const rect = element.getBoundingClientRect();
          targets.push({
            id: target.id,
            bounds: {
              x: rect.left + window.scrollX,
              y: rect.top + window.scrollY,
              width: rect.width,
              height: rect.height,
            },
          });
        }

        const root = document.documentElement;
        const body = document.body;
        const plan = createCapturePlan(targets, {
          width: window.innerWidth,
          height: window.innerHeight,
          pageWidth: Math.max(root.scrollWidth, body?.scrollWidth ?? 0, window.innerWidth),
          pageHeight: Math.max(root.scrollHeight, body?.scrollHeight ?? 0, window.innerHeight),
        });
        return { type: 'capture/plan-result', plan };
      }

      if (message.type === 'capture/scroll') {
        restoreOccluders();
        window.scrollTo({
          left: message.scrollX,
          top: message.scrollY,
          behavior: 'instant' as ScrollBehavior,
        });
        await new Promise<void>(resolve => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        });
        const occlusion = findOccluders(message.slices);
        return {
          type: 'capture/scrolled',
          scrollX: window.scrollX,
          scrollY: window.scrollY,
          occlusion,
        };
      }

      if (message.type === 'capture/restore') {
        restoreOccluders();
        return { type: 'capture/restored' };
      }

      if (message.type === 'preset/resolve-selectors') {
        const resolution = resolvePresetTargets(
          message.selectors,
          document,
          window.scrollX,
          window.scrollY,
        );
        if (resolution.missingSelectors.length === 0 && resolution.invalidSelectors.length === 0) {
          selected.clear();
          resolution.targets.forEach((target, index) => {
            const element = resolution.elements[index];
            if (element) selected.set(element, target);
          });
        }
        return {
          type: 'preset/matches',
          targets: resolution.targets,
          missingSelectors: resolution.missingSelectors,
          invalidSelectors: resolution.invalidSelectors,
        };
      }
    });
  },
});
