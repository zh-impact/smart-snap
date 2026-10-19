import type {
  CapturedFrame,
  CaptureOcclusion,
  ExtensionMessage,
  ExtensionResponse,
  CompositionStrategy,
  SitePreset,
  SelectedElement,
  SelectionResponse,
} from '../shared/capture';
import { captureWithCleanup } from '../shared/capture-frame';

const CURRENT_SELECTION_KEY = 'currentSelection';
const SITE_PRESETS_KEY = 'sitePresets';

interface StoredSelection {
  targets: SelectedElement[];
  tabId: number;
  windowId: number;
  site: string;
  strategy?: CompositionStrategy;
  previewBeforeSave?: boolean;
  autoCaptureToken?: string;
}

export default defineBackground(() => {
  browser.commands.onCommand.addListener((command, tab) => {
    if (command !== 'start-element-selection' || tab?.id === undefined) return;

    void browser.tabs
      .sendMessage(tab.id, { type: 'selection/start' })
      .catch(() => undefined);
  });

  browser.runtime.onMessage.addListener(async (message: ExtensionMessage, sender) => {
    if (message.type === 'selection/complete') {
      const tabId = sender.tab?.id;
      const windowId = sender.tab?.windowId;
      if (tabId === undefined || windowId === undefined) return;
      const site = getSite(sender.tab?.url);

      const storeSelection = browser.storage.session.set({
        [CURRENT_SELECTION_KEY]: { targets: message.targets, tabId, windowId, site },
      });
      const openPanel = browser.sidePanel.open({ tabId });
      await Promise.all([storeSelection, openPanel]);
      return;
    }

    if (message.type === 'selection/get-current') {
      const stored = await browser.storage.session.get(CURRENT_SELECTION_KEY);
      const selection = stored[CURRENT_SELECTION_KEY] as StoredSelection | undefined;
      return {
        type: 'selection/current',
        targets: selection?.targets ?? [],
        site: selection?.site ?? '',
        tabId: selection?.tabId,
        strategy: selection?.strategy,
        previewBeforeSave: selection?.previewBeforeSave,
        autoCaptureToken: selection?.autoCaptureToken,
      } satisfies SelectionResponse;
    }

    if (message.type === 'preset/resolve') {
      const stored = await browser.storage.session.get(CURRENT_SELECTION_KEY);
      const selection = stored[CURRENT_SELECTION_KEY] as StoredSelection | undefined;
      const tabId = message.tabId ?? selection?.tabId;
      if (tabId === undefined) {
        return { type: 'preset/error', message: 'No active tab is available.' };
      }

      const tab = await browser.tabs.get(tabId);
      const site = getSite(tab.url);
      if (!site) {
        return { type: 'preset/error', message: 'No site is available for this tab.' };
      }

      const storedPresets = await browser.storage.local.get(SITE_PRESETS_KEY);
      const presets = (storedPresets[SITE_PRESETS_KEY] as SitePreset[] | undefined) ?? [];
      const preset = presets.find(item => item.site === site);
      if (!preset) {
        return { type: 'preset/error', message: `No preset is saved for ${site}.` };
      }

      const response = (await browser.tabs.sendMessage(tabId, {
        type: 'preset/resolve-selectors',
        selectors: preset.selectors,
      })) as ExtensionResponse;
      if (response.type !== 'preset/matches') {
        return { type: 'preset/error', message: 'Could not resolve the saved selectors.' };
      }
      if (response.missingSelectors.length > 0 || response.invalidSelectors.length > 0) {
        const failed = [...response.missingSelectors, ...response.invalidSelectors];
        return {
          type: 'preset/error',
          message: `Preset stopped because these selectors did not match: ${failed.join(', ')}`,
        };
      }

      const autoCaptureToken =
        message.autoCapture && preset.previewBeforeSave ? crypto.randomUUID() : undefined;
      const updatedSelection: StoredSelection = {
        targets: response.targets,
        tabId,
        windowId: tab.windowId,
        site,
        strategy: preset.strategy,
        previewBeforeSave: preset.previewBeforeSave,
        ...(autoCaptureToken ? { autoCaptureToken } : {}),
      };
      await browser.storage.session.set({
        [CURRENT_SELECTION_KEY]: updatedSelection,
      });
      return {
        type: 'preset/resolved',
        targets: response.targets,
        strategy: preset.strategy,
        site,
        previewBeforeSave: preset.previewBeforeSave,
        autoCaptureToken,
      };
    }

    if (message.type === 'preset/auto-capture-started') {
      const stored = await browser.storage.session.get(CURRENT_SELECTION_KEY);
      const selection = stored[CURRENT_SELECTION_KEY] as StoredSelection | undefined;
      if (selection?.autoCaptureToken !== message.token) return;
      const updatedSelection = { ...selection };
      delete updatedSelection.autoCaptureToken;
      await browser.storage.session.set({ [CURRENT_SELECTION_KEY]: updatedSelection });
      return;
    }

    if (message.type === 'capture/request') {
      const stored = await browser.storage.session.get(CURRENT_SELECTION_KEY);
      const selection = stored[CURRENT_SELECTION_KEY] as StoredSelection | undefined;
      if (!selection) {
        return { type: 'capture/error', message: 'No selected elements are available.' };
      }

      const planResponse = (await browser.tabs.sendMessage(selection.tabId, {
        type: 'capture/plan',
        targets: selection.targets,
      })) as ExtensionResponse;
      if (planResponse.type === 'capture/error') return planResponse;
      if (planResponse.type !== 'capture/plan-result') {
        return { type: 'capture/error', message: 'Could not plan the element capture.' };
      }

      const frames: CapturedFrame[] = [];
      const occlusionWarnings: string[] = [];
      for (const [index, position] of planResponse.plan.frames.entries()) {
        const slices = planResponse.plan.slices.filter(slice => slice.frameIndex === index);
        let occlusion: CaptureOcclusion = { hiddenBlockerCount: 0, uncertain: false };
        try {
          const dataUrl = await captureWithCleanup(
            async () => {
              const response = (await browser.tabs.sendMessage(selection.tabId, {
                type: 'capture/scroll',
                ...position,
                slices,
              })) as ExtensionResponse;
              if (response.type === 'capture/error') throw new Error(response.message);
              if (response.type !== 'capture/scrolled') {
                throw new Error('Could not scroll to a capture region.');
              }
              if (
                Math.abs(response.scrollX - position.scrollX) > 1 ||
                Math.abs(response.scrollY - position.scrollY) > 1
              ) {
                throw new Error('The page changed during capture.');
              }
              occlusion = response.occlusion;
            },
            () => browser.tabs.captureVisibleTab(selection.windowId, { format: 'png' }),
            async () => {
              const response = (await browser.tabs.sendMessage(selection.tabId, {
                type: 'capture/restore',
              })) as ExtensionResponse;
              if (response.type !== 'capture/restored') {
                throw new Error('Could not restore page elements after capture.');
              }
            },
          );
          frames.push({ ...position, dataUrl, occlusion });
          if (occlusion.uncertain) {
            occlusionWarnings.push(`Potential occlusion in capture frame ${index + 1}.`);
          }
        } catch (error) {
          return {
            type: 'capture/error',
            message: error instanceof Error ? error.message : 'Could not capture the page.',
          };
        }
        if (index < planResponse.plan.frames.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 600));
        }
      }

      return {
        type: 'capture/result',
        result: { plan: planResponse.plan, frames, occlusionWarnings },
      };
    }
  });
});

function getSite(url?: string): string {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.origin : '';
  } catch {
    return '';
  }
}
