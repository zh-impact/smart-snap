# Tasks

## 1. Establish capture contracts and test support

- [x] 1.1 Add a Bun test script and initial test layout; verify `bun test` runs successfully.
- [x] 1.2 Define typed messages and data models for selected targets, capture strategies, and site presets; verify with `bun run compile`.

## 2. Implement page selection

- [x] 2.1 Implement the configurable selection shortcut, prominent on-page indicator, add/remove click behavior, and top-level/open-shadow-root targeting; verify selection behavior with focused tests and a Chromium page fixture.
- [x] 2.2 Connect manual selection completion to the extension panel; verify that completing a selection opens the panel with the selected targets.
- [x] 2.3 Add a distinct hover preview highlight during selection mode; verify hover and selected styles differ, the selected count changes only on click, and hovering a selected element does not duplicate its marker in Chromium.

## 3. Capture and compose selected elements

- [x] 3.1 Implement viewport capture, scrolling, and crop assembly for selected elements beyond the viewport; verify with fixtures for visible, off-screen, and viewport-spanning elements.
- [x] 3.2 Implement the default layout-preserving composition strategy with compressed gaps; verify row/column preservation and exclusion of unselected pixels with geometry and image tests.
- [x] 3.3 Implement compact 2D packing that may reorder captured rectangles; verify that all rectangles are present, non-overlapping, and compact on representative fixtures.
- [x] 3.4 Detect fixed/sticky occluders over selected capture slices and temporarily hide confirmed blockers; verify captured target pixels are revealed and original inline visibility is restored after both successful and failed captures.
- [x] 3.5 Classify uncertain occlusion, including pointer-events-none overlays, without hiding unverified elements; verify the capture result carries an occlusion warning.

## 4. Add popup, panel, and site presets

- [x] 4.1 Implement popup quick actions and panel preview/customization for capture and composition strategies; verify both surfaces in the Chromium extension.
- [x] 4.2 Implement local per-site selector presets with all-matches default, first-match option, and all-or-nothing handling for missing selectors; verify with zero-, one-, and multi-match tests.
- [x] 4.3 Implement preset direct-save by default and the configurable preview path; verify each path saves or previews the composed image as configured.
- [x] 4.4 Document selection, composition strategies, and preset setup in the README; verify the documented workflow against the extension.
- [x] 4.5 Display unresolved-occlusion warnings in panel preview and abort direct saves when selected content may remain obscured; verify both outcomes.

## 5. Verify the integrated extension

- [x] 5.1 Run `bun run compile` and `bun run build`, then verify the end-to-end manual and preset capture flows in a supported Chromium-based browser.
- [x] 5.2 Verify fixed/sticky occlusion handling end to end in Chromium, including overlay restoration and direct-save abort when occlusion cannot be resolved.
