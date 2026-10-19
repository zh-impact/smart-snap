export type CompositionStrategy = 'layout-preserving' | 'compact-pack';

export type SelectorMatchMode = 'all' | 'first';

export interface ElementBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SelectedElement {
  id: string;
  bounds: ElementBounds;
}

export interface PresetSelector {
  selector: string;
  matchMode?: SelectorMatchMode;
}

export interface SitePreset {
  id: string;
  site: string;
  selectors: PresetSelector[];
  strategy: CompositionStrategy;
  previewBeforeSave: boolean;
}

export interface CaptureViewport {
  width: number;
  height: number;
  pageWidth: number;
  pageHeight: number;
}

export interface CaptureFramePosition {
  scrollX: number;
  scrollY: number;
}

export interface CaptureOcclusion {
  hiddenBlockerCount: number;
  uncertain: boolean;
}

export interface CaptureSlice {
  targetId: string;
  frameIndex: number;
  source: ElementBounds;
  destination: { x: number; y: number };
}

export interface CapturePlan {
  targets: SelectedElement[];
  viewport: CaptureViewport;
  frames: CaptureFramePosition[];
  slices: CaptureSlice[];
}

export interface CapturedFrame extends CaptureFramePosition {
  dataUrl: string;
  occlusion: CaptureOcclusion;
}

export interface CaptureResult {
  plan: CapturePlan;
  frames: CapturedFrame[];
  occlusionWarnings: string[];
}

export type ExtensionMessage =
  | { type: 'selection/start' }
  | { type: 'selection/complete'; targets: SelectedElement[] }
  | { type: 'selection/get-current' }
  | { type: 'preset/resolve'; tabId?: number; autoCapture?: boolean }
  | { type: 'preset/auto-capture-started'; token: string }
  | { type: 'preset/resolve-selectors'; selectors: PresetSelector[] }
  | {
      type: 'capture/request';
      targets?: SelectedElement[];
      strategy?: CompositionStrategy;
      preview?: boolean;
    }
  | { type: 'capture/plan'; targets: SelectedElement[] }
  | { type: 'capture/scroll'; scrollX: number; scrollY: number; slices: CaptureSlice[] }
  | { type: 'capture/restore' }
  | { type: 'preset/capture'; presetId: string };

export interface SelectionResponse {
  type: 'selection/current';
  targets: SelectedElement[];
  site: string;
  tabId?: number;
  strategy?: CompositionStrategy;
  previewBeforeSave?: boolean;
  autoCaptureToken?: string;
}

export type ExtensionResponse =
  | SelectionResponse
  | { type: 'preset/matches'; targets: SelectedElement[]; missingSelectors: string[]; invalidSelectors: string[] }
  | {
      type: 'preset/resolved';
      targets: SelectedElement[];
      strategy: CompositionStrategy;
      site: string;
      previewBeforeSave: boolean;
      autoCaptureToken?: string;
    }
  | { type: 'preset/error'; message: string }
  | { type: 'capture/plan-result'; plan: CapturePlan }
  | {
      type: 'capture/scrolled';
      scrollX: number;
      scrollY: number;
      occlusion: CaptureOcclusion;
    }
  | { type: 'capture/restored' }
  | { type: 'capture/result'; result: CaptureResult }
  | { type: 'capture/error'; message: string };
