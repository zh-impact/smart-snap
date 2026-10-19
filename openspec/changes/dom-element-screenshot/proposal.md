# Proposal

## Why

Users need a quick way to save only the meaningful parts of a web page without capturing unrelated content or being limited to the visible viewport. Reusable per-site selectors and flexible composition strategies make repeated captures faster while keeping the result configurable.

## What Changes

- Add interactive selection and capture of one or more DOM elements, including content outside the current viewport.
- Compose selected elements into a screenshot that excludes unselected page content, with a layout-preserving default and an optional compact 2D packing strategy.
- Provide quick capture actions through the popup and detailed preview and customization through a panel.
- Support per-site selector presets for one-click capture, with configurable preview behavior and clear failure when a configured selector has no match.

## Capabilities

### New Capabilities
- `element-screenshot`: Select, capture, compose, preview, save, and reuse DOM element targets on web pages.

### Modified Capabilities

## Impact

- Extension content script, background coordination, popup, and a detailed capture panel.
- Browser screenshot, downloads, extension storage, and permissions as needed.
