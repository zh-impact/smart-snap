import { useEffect, useState } from 'react';
import type { ExtensionResponse, SitePreset } from '../../shared/capture';
import { composeTargetPreviews, createTargetPreviews } from '../../shared/capture-preview';
import { createCaptureFilename } from '../../shared/capture-filename';
import './App.css';

const SITE_PRESETS_KEY = 'sitePresets';

function App() {
  const [tabId, setTabId] = useState<number>();
  const [site, setSite] = useState('');
  const [preset, setPreset] = useState<SitePreset>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    browser.tabs
      .query({ active: true, currentWindow: true })
      .then(async tabs => {
        const tab = tabs[0];
        setTabId(tab?.id);
        const currentSite = getSite(tab?.url);
        setSite(currentSite);
        if (!currentSite) return;

        const stored = await browser.storage.local.get(SITE_PRESETS_KEY);
        const presets = (stored[SITE_PRESETS_KEY] as SitePreset[] | undefined) ?? [];
        setPreset(presets.find(item => item.site === currentSite));
      })
      .catch(() => setError('Could not load the current site.'));
  }, []);

  const startSelection = async () => {
    if (tabId === undefined) return;
    setError('');
    try {
      await browser.tabs.sendMessage(tabId, { type: 'selection/start' });
      window.close();
    } catch {
      setError('Element selection is not available on this page.');
    }
  };

  const openPanel = async () => {
    if (tabId === undefined) return;
    setError('');
    try {
      await browser.sidePanel.open({ tabId });
      window.close();
    } catch {
      setError('Could not open the detailed panel.');
    }
  };

  const capturePreset = async () => {
    if (tabId === undefined || !preset) return;
    setBusy(true);
    setError('');
    setStatus('');

    if (preset.previewBeforeSave) {
      const openingPanel = browser.sidePanel.open({ tabId });
      try {
        const [_, response] = await Promise.all([
          openingPanel,
          browser.runtime.sendMessage({
            type: 'preset/resolve',
            tabId,
            autoCapture: true,
          }),
        ]);
        if ((response as ExtensionResponse).type === 'preset/error') {
          setError((response as Extract<ExtensionResponse, { type: 'preset/error' }>).message);
          return;
        }
        window.close();
      } catch {
        setError('Could not open a preview for this preset.');
      } finally {
        setBusy(false);
      }
      return;
    }

    try {
      const resolved = (await browser.runtime.sendMessage({
        type: 'preset/resolve',
        tabId,
      })) as ExtensionResponse;
      if (resolved.type === 'preset/error') {
        setError(resolved.message);
        return;
      }
      if (resolved.type !== 'preset/resolved') {
        setError('Could not resolve the site preset.');
        return;
      }

      const response = (await browser.runtime.sendMessage({
        type: 'capture/request',
      })) as ExtensionResponse;
      if (response.type === 'capture/error') {
        setError(response.message);
        return;
      }
      if (response.type !== 'capture/result') {
        setError('Could not capture the site preset.');
        return;
      }
      if (response.result.occlusionWarnings.length > 0) {
        setError('The capture may be obscured. Open the panel to review it before saving.');
        return;
      }

      const tiles = await createTargetPreviews(response.result);
      const image = await composeTargetPreviews(tiles, resolved.strategy);
      await browser.downloads.download({
        url: image,
        filename: createCaptureFilename(site),
        conflictAction: 'uniquify',
      });
      setStatus('Screenshot saved.');
    } catch {
      setError('Could not save the site preset screenshot.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main>
      <h1>Smart Snap</h1>
      <p>Capture selected page elements.</p>
      <button disabled={tabId === undefined} onClick={startSelection}>
        Select elements
      </button>
      <button className="secondary" disabled={tabId === undefined} onClick={openPanel}>
        Open panel
      </button>
      <button
        className="secondary"
        disabled={tabId === undefined || !preset || busy}
        onClick={capturePreset}
      >
        {busy ? 'Capturing…' : preset?.previewBeforeSave ? 'Preview site preset' : 'Capture site preset'}
      </button>
      {error && <p className="error" role="alert">{error}</p>}
      {status && <p className="status" role="status">{status}</p>}
      <p className="shortcut">Shortcut: Alt+Shift+C</p>
    </main>
  );
}

function getSite(url?: string): string {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.origin : '';
  } catch {
    return '';
  }
}

export default App;
