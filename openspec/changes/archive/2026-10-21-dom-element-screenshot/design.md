# Design

## Context

The repository is a WXT + React extension starter. Its content script, background entry point, and popup are placeholders; there is no existing capture pipeline or persisted preset model. See proposal.md for the motivation and scope.

## Goals / Non-Goals

**Goals:**
- Keep page interaction, capture coordination, image composition, and configuration in clear extension boundaries.
- Preserve selected content as it appears on the page while excluding unrelated pixels.
- Make the layout-preserving strategy predictable and the compact packing strategy explicitly free to reorder elements.
- Keep preset capture usable as a one-click path while allowing users to opt into preview.

**Non-Goals:**
- Reconstruct arbitrary page layouts by cloning DOM into a separate renderer.
- Synchronize presets across devices or send screenshots to a remote service.
- Guarantee identical capture behavior on browser-owned pages or inaccessible embedded content.

## Decisions

### Use a content-script picker and an extension-owned capture/composition flow

The content script owns hit testing, selection state, visible selection marks, and element geometry. A configurable shortcut activates selection mode; clicking adds an element and clicking it again removes it. A prominent page indicator exposes selection progress and completion. Completing a manual selection opens the detailed panel.

Capture coordination and image composition belong to extension-owned code rather than being performed by mutating the page DOM. The popup remains the quick-action surface; the panel owns preview and detailed strategy controls.

### Capture element pixels from viewport imagery, then compose selected crops

For each target, use its page geometry to bring the relevant region into view, capture viewport imagery as needed, and crop only the target's rendered bounds. For targets taller or wider than a viewport, collect and join the necessary portions. Compose those crops in an extension-owned canvas so pixels outside selected regions are not carried into the result.

This favors the page's actual rendered appearance over rendering a cloned element elsewhere. Scrolling and capture must minimize page disruption and re-check geometry because the page can change while a capture is in progress.

### Detect and temporarily suppress capture occluders

Before capturing each planned viewport slice, the content script checks sample points within the selected crop using hit testing and composed-tree ancestry. If an unrelated fixed or sticky element is the hit-tested top layer over selected pixels, temporarily set its visibility to hidden with an important inline override for that frame only. Preserve the original inline visibility value and priority, and restore them in a `finally` path immediately after capture. Do not hide a selected target or an ancestor that contains it.

If hit testing indicates a blocker but the extension cannot safely isolate it, mark the slice as potentially occluded. Preview mode displays that warning; direct-save mode aborts rather than silently delivering an image known to be obscured. Scrolling the target below a top overlay is an alternative when it can expose the same pixels without suppression, but it does not solve every case, such as a target at the top of the document.

### Provide two distinct composition strategies

The default strategy groups elements by their geometric rows and columns, retains those relationships, and compresses empty space. The optional 2D packing strategy treats each captured crop as a rectangle and may reorder rectangles to produce a compact canvas. Both strategies operate on captured element imagery; they do not include the unselected pixels between elements.

Keep the strategy visible in preview so users can compare the result before saving. The packing algorithm is a heuristic for compact output rather than a promise of a globally optimal solution.

### Keep presets local and fail closed on missing selectors

Store site presets locally with their selector set, composition strategy, and preview preference. A one-click preset capture resolves all configured selectors before saving; if any selector has no match, abort the capture and explain the mismatch instead of silently saving a partial image.

The direct-save path is the default. When preview is enabled, route the composed result to the panel before saving. No screenshot or selector data requires a remote service.

### Define the initial browser and DOM scope

Target Chromium-based browsers for the initial release. The picker and preset resolver operate on the top-level document and open shadow roots; iframe contents and closed shadow roots are out of scope. This avoids cross-frame coordination and additional access requirements in the initial implementation.

Each configured selector resolves all matching elements by default. A preset option can restrict a selector to its first match. If any configured selector has no match, the entire preset capture aborts as described above.

## Risks / Trade-offs

- [Scrolling can trigger lazy loading, animations, sticky headers, or layout shifts] -> Re-check target geometry during capture, avoid including pixels outside target crops, and present a preview for manual captures.
- [Hit-test sampling can miss small or pointer-events-none occluders] -> Combine sampling with fixed/sticky overlap checks and report uncertain frames rather than claiming an unobstructed capture.
- [Temporarily hiding a page overlay can race with page scripts changing its styles] -> Save and restore the exact inline visibility value and priority around each frame; never remove overlay nodes or persist style changes.
- [Some targets cannot be faithfully represented by viewport crops, including content clipped by nested scrolling containers] -> Report unsupported or incomplete targets rather than silently treating them as complete.
- [Iframe contents and closed shadow roots are outside the initial support scope] -> Keep these boundaries visible in user-facing capture errors and revisit support as a separate scope decision.
- [Geometric row detection can be ambiguous for irregular layouts] -> Keep the default strategy deterministic, expose the selected strategy in preview, and allow users to switch to 2D packing.
- [Compact packing can make the original reading order difficult to infer] -> Keep it opt-in and leave the layout-preserving strategy as the default.
- [Chromium-based browsers can still differ in extension API support] -> Isolate browser-specific capture, download, and panel operations behind extension-facing boundaries.

## Migration Plan

There is no existing capture or preset data to migrate. The change can be introduced as new extension functionality without a user-data migration.
