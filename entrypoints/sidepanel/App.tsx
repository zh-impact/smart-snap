import { useEffect, useRef, useState } from 'react';
import type {
  CompositionStrategy,
  ExtensionResponse,
  PresetSelector,
  SelectedElement,
  SitePreset,
  SelectionResponse,
} from '../../shared/capture';
import {
  composeTargetPreviews,
  createTargetPreviews,
  type TargetPreview,
} from '../../shared/capture-preview';
import { createCaptureFilename } from '../../shared/capture-filename';

const SITE_PRESETS_KEY = 'sitePresets';

function App() {
  const [targets, setTargets] = useState<SelectedElement[]>([]);
  const [error, setError] = useState('');
  const [capturing, setCapturing] = useState(false);
  const [previews, setPreviews] = useState<TargetPreview[]>([]);
  const [composite, setComposite] = useState('');
  const [strategy, setStrategy] = useState<CompositionStrategy>('layout-preserving');
  const [site, setSite] = useState('');
  const [selectors, setSelectors] = useState<PresetSelector[]>([]);
  const [selectorDraft, setSelectorDraft] = useState('');
  const [presetMessage, setPresetMessage] = useState('');
  const [resolvingPreset, setResolvingPreset] = useState(false);
  const [previewBeforeSave, setPreviewBeforeSave] = useState(false);
  const [saving, setSaving] = useState(false);
  const [occlusionWarnings, setOcclusionWarnings] = useState<string[]>([]);
  const [autoCaptureToken, setAutoCaptureToken] = useState('');
  const handledCaptureToken = useRef('');

  useEffect(() => {
    const onStorageChanged = (
      changes: Record<string, { newValue?: unknown }>,
      areaName: string,
    ) => {
      if (areaName !== 'session') return;
      const selection = changes.currentSelection?.newValue as
        | {
            targets?: SelectedElement[];
            site?: string;
            strategy?: CompositionStrategy;
            previewBeforeSave?: boolean;
            autoCaptureToken?: string;
          }
        | undefined;
      if (selection?.targets) setTargets(selection.targets);
      if (selection?.site !== undefined) setSite(selection.site);
      if (selection?.strategy) setStrategy(selection.strategy);
      if (selection?.previewBeforeSave !== undefined) {
        setPreviewBeforeSave(selection.previewBeforeSave);
      }
      if (selection) setAutoCaptureToken(selection.autoCaptureToken ?? '');
    };

    browser.storage.onChanged.addListener(onStorageChanged);
    browser.runtime
      .sendMessage({ type: 'selection/get-current' })
      .then((response: SelectionResponse) => {
        setTargets(response.targets);
        setSite(response.site);
        if (response.strategy) setStrategy(response.strategy);
        setPreviewBeforeSave(response.previewBeforeSave ?? false);
        setAutoCaptureToken(response.autoCaptureToken ?? '');
      })
      .catch(() => setError('Could not load the selected elements.'));

    return () => browser.storage.onChanged.removeListener(onStorageChanged);
  }, []);

  useEffect(() => {
    if (!site) {
      setSelectors([]);
      return;
    }

    browser.storage.local
      .get(SITE_PRESETS_KEY)
      .then(stored => {
        const presets = (stored[SITE_PRESETS_KEY] as SitePreset[] | undefined) ?? [];
        const preset = presets.find(item => item.site === site);
        setSelectors(preset?.selectors ?? []);
        setStrategy(preset?.strategy ?? 'layout-preserving');
        setPreviewBeforeSave(preset?.previewBeforeSave ?? false);
      })
      .catch(() => setPresetMessage('Could not load the saved site preset.'));
  }, [site]);

  useEffect(() => {
    let cancelled = false;
    if (previews.length === 0) {
      setComposite('');
      return;
    }

    composeTargetPreviews(previews, strategy)
      .then(image => {
        if (!cancelled) setComposite(image);
      })
      .catch(() => {
        if (!cancelled) setError('Could not compose the selected elements.');
      });
    return () => {
      cancelled = true;
    };
  }, [previews, strategy]);

  async function capture() {
    setCapturing(true);
    setError('');
    setOcclusionWarnings([]);
    try {
      const response = (await browser.runtime.sendMessage({
        type: 'capture/request',
      })) as ExtensionResponse;
      if (response.type === 'capture/error') {
        setError(response.message);
        return;
      }
      if (response.type !== 'capture/result') {
        setError('Could not capture the selected elements.');
        return;
      }
      setOcclusionWarnings(response.result.occlusionWarnings);
      const nextPreviews = await createTargetPreviews(response.result);
      setPreviews(nextPreviews);
    } catch {
      setError('Could not capture the selected elements.');
    } finally {
      setCapturing(false);
    }
  }

  useEffect(() => {
    if (!autoCaptureToken || handledCaptureToken.current === autoCaptureToken) return;
    handledCaptureToken.current = autoCaptureToken;
    void browser.runtime.sendMessage({
      type: 'preset/auto-capture-started',
      token: autoCaptureToken,
    });
    void capture();
  }, [autoCaptureToken]);

  const addSelector = () => {
    const selector = selectorDraft.trim();
    if (!selector) return;
    setSelectors(current => [...current, { selector, matchMode: 'all' }]);
    setSelectorDraft('');
    setPresetMessage('');
  };

  const savePreset = async () => {
    if (!site || selectors.length === 0) return;
    setPresetMessage('');
    try {
      const stored = await browser.storage.local.get(SITE_PRESETS_KEY);
      const presets = (stored[SITE_PRESETS_KEY] as SitePreset[] | undefined) ?? [];
      const current = presets.find(preset => preset.site === site);
      const next: SitePreset = {
        id: current?.id ?? `site-${Date.now()}`,
        site,
        selectors,
        strategy,
        previewBeforeSave,
      };
      await browser.storage.local.set({
        [SITE_PRESETS_KEY]: [...presets.filter(preset => preset.site !== site), next],
      });
      setPresetMessage('Site preset saved.');
    } catch {
      setPresetMessage('Could not save the site preset.');
    }
  };

  const applyPreset = async () => {
    setResolvingPreset(true);
    setPresetMessage('');
    try {
      const response = (await browser.runtime.sendMessage({
        type: 'preset/resolve',
      })) as ExtensionResponse;
      if (response.type === 'preset/error') {
        setPresetMessage(response.message);
      } else if (response.type === 'preset/resolved') {
        setTargets(response.targets);
        setStrategy(response.strategy);
        setPreviewBeforeSave(response.previewBeforeSave);
        setAutoCaptureToken(response.autoCaptureToken ?? '');
        setPresetMessage(`${response.targets.length} preset elements selected.`);
      }
    } catch {
      setPresetMessage('Could not resolve the site preset.');
    } finally {
      setResolvingPreset(false);
    }
  };

  const saveScreenshot = async () => {
    if (!composite) return;
    setSaving(true);
    setPresetMessage('');
    try {
      await browser.downloads.download({
        url: composite,
        filename: createCaptureFilename(site),
        conflictAction: 'uniquify',
      });
      setPresetMessage('Screenshot saved.');
    } catch {
      setPresetMessage('Could not save the screenshot.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main>
      <h1>Selected elements</h1>
      {error ? <p role="alert">{error}</p> : <p>{targets.length} selected</p>}
      {occlusionWarnings.map((warning, index) => (
        <p className="occlusion-warning" role="alert" key={`${warning}-${index}`}>
          {warning} Review the preview before saving.
        </p>
      ))}
      <button disabled={capturing || targets.length === 0} onClick={capture}>
        {capturing ? 'Capturing…' : 'Capture selected elements'}
      </button>
      <label>
        Composition strategy
        <select
          value={strategy}
          onChange={event => setStrategy(event.target.value as CompositionStrategy)}
        >
          <option value="layout-preserving">Preserve layout</option>
          <option value="compact-pack">Compact 2D pack</option>
        </select>
      </label>
      <section>
        <h2>Site preset</h2>
        <p>{site || 'Current site is unavailable.'}</p>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={previewBeforeSave}
            onChange={event => setPreviewBeforeSave(event.target.checked)}
          />
          Preview before saving
        </label>
        <label>
          CSS selector
          <input
            value={selectorDraft}
            onChange={event => setSelectorDraft(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter') addSelector();
            }}
            placeholder=".article"
          />
        </label>
        <button disabled={!selectorDraft.trim()} onClick={addSelector}>
          Add selector
        </button>
        <ul className="selectors">
          {selectors.map((selector, index) => (
            <li key={`${selector.selector}-${index}`}>
              <code>{selector.selector}</code>
              <select
                aria-label={`Match mode for ${selector.selector}`}
                value={selector.matchMode ?? 'all'}
                onChange={event => {
                  const matchMode = event.target.value as NonNullable<PresetSelector['matchMode']>;
                  setSelectors(current =>
                    current.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, matchMode } : item,
                    ),
                  );
                }}
              >
                <option value="all">All matches</option>
                <option value="first">First match</option>
              </select>
              <button
                className="remove-selector"
                aria-label={`Remove ${selector.selector}`}
                onClick={() => setSelectors(current => current.filter((_, itemIndex) => itemIndex !== index))}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
        <button disabled={!site || selectors.length === 0} onClick={savePreset}>
          Save site preset
        </button>
        <button disabled={!site || resolvingPreset} onClick={applyPreset}>
          {resolvingPreset ? 'Resolving…' : 'Apply site preset'}
        </button>
        {presetMessage && <p role="status">{presetMessage}</p>}
      </section>
      <ol>
        {targets.map((target, index) => (
          <li key={target.id}>
            <strong>Element {index + 1}</strong>
            <span>
              x {Math.round(target.bounds.x)}, y {Math.round(target.bounds.y)}
            </span>
            <span>
              {Math.round(target.bounds.width)} × {Math.round(target.bounds.height)}
            </span>
          </li>
        ))}
      </ol>
      {composite && (
        <>
          <h2>{strategy === 'layout-preserving' ? 'Layout-preserving composition' : 'Compact 2D composition'}</h2>
          <img
            alt={strategy === 'layout-preserving' ? 'Layout-preserving composition' : 'Compact 2D composition'}
            src={composite}
          />
          <button disabled={saving} onClick={saveScreenshot}>
            {saving ? 'Saving…' : 'Save screenshot'}
          </button>
        </>
      )}
      {previews.map(preview => (
        <img key={preview.id} alt="Captured selected element" src={preview.src} />
      ))}
    </main>
  );
}

export default App;
