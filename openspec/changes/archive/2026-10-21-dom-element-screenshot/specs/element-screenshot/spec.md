# Spec Delta

## Purpose

Lets users capture selected web-page elements, compose them into a screenshot, and reuse per-site selectors for repeat captures.

## ADDED Requirements

### Requirement: Users can select multiple page elements
The extension SHALL provide a configurable keyboard shortcut that activates an element-selection mode, visibly indicate that mode on the page, and allow users to add or remove elements by clicking them. The default shortcut SHALL be Alt+Shift+C across platforms, displayed as Option+Shift+C on macOS.

#### Scenario: Activate selection mode
- **WHEN** the user presses the configured selection shortcut
- **THEN** the extension displays a prominent on-page selection indicator

#### Scenario: Add and remove an element
- **WHEN** the user clicks an unselected element in selection mode
- **THEN** the element is added to the selection and visibly marked
- **WHEN** the user clicks a selected element again
- **THEN** the element is removed from the selection

### Requirement: Preview element hover during selection
The extension SHALL highlight an eligible element under the pointer while selection mode is active, using a visual treatment distinct from the treatment for selected elements.

#### Scenario: Hover an unselected element
- **WHEN** the pointer hovers an unselected eligible element in selection mode
- **THEN** the element receives the hover highlight without changing the selected count

#### Scenario: Hover a selected element
- **WHEN** the pointer hovers an element that is already selected
- **THEN** it retains its selected highlight without a duplicate hover highlight

### Requirement: Users can select elements in supported page contexts
The extension SHALL support element selection and preset resolution in the top-level document and open shadow roots of Chromium-based browsers. Iframe contents and closed shadow roots are not supported.

#### Scenario: Select an element in an open shadow root
- **WHEN** the user selects an element inside an open shadow root
- **THEN** the element can be selected and captured like an element in the top-level document

#### Scenario: Target content in an unsupported context
- **WHEN** a target is inside an iframe or a closed shadow root
- **THEN** the extension does not capture that target

### Requirement: Users can capture selected elements beyond the viewport
The extension SHALL capture the visual content of each selected element, including portions outside the current viewport, without including unrelated page content between selected elements.

#### Scenario: Capture an off-screen element
- **WHEN** a selected element extends beyond or lies outside the current viewport
- **THEN** the saved screenshot includes the selected element's full visible page content

#### Scenario: Exclude unselected content between elements
- **WHEN** selected elements are separated by unselected page content
- **THEN** the composed screenshot excludes that unselected content

### Requirement: Users can detect occluded selected content
The extension SHALL detect when an unrelated fixed or sticky page element covers pixels in a selected element's capture region.

#### Scenario: A fixed or sticky element covers the target
- **WHEN** an unrelated fixed or sticky element overlaps a selected target during capture
- **THEN** the capture identifies the target region as occluded

#### Scenario: No fixed or sticky element covers the target
- **WHEN** no unrelated fixed or sticky element overlaps a selected target's capture region
- **THEN** the extension captures the target without suppressing page elements

### Requirement: Occlusion mitigation restores page appearance
The extension SHALL temporarily hide identified unrelated fixed or sticky blockers only while capturing affected pixels, then restore their prior visibility state.

#### Scenario: Capture pixels covered by a blocker
- **WHEN** a selected target is covered by an identified fixed or sticky blocker
- **THEN** the blocker is hidden for the affected capture frame and the selected pixels are captured

#### Scenario: Capture fails while a blocker is hidden
- **WHEN** an affected capture frame fails
- **THEN** the blocker is restored before the failure is reported

### Requirement: Unresolved occlusion is not silently saved
The extension SHALL report potential occlusion when it cannot reliably identify or mitigate a blocker, and SHALL NOT silently save a direct capture known to be obscured.

#### Scenario: Occlusion cannot be reliably mitigated
- **WHEN** the extension detects possible obstruction but cannot safely identify or hide its source
- **THEN** preview mode displays an obstruction warning and direct-save mode aborts with an explanation

### Requirement: Users can choose an element composition strategy
The extension SHALL offer a layout-preserving composition strategy by default and an alternative compact two-dimensional packing strategy.

#### Scenario: Preserve layout by default
- **WHEN** the user completes a multi-element selection without changing the composition strategy
- **THEN** the screenshot preserves the selected elements' original row and column relationships while compressing empty space

#### Scenario: Pack elements compactly
- **WHEN** the user chooses the two-dimensional packing strategy
- **THEN** the extension may change element order to minimize the composed canvas area

### Requirement: Users can preview and save captures
The extension SHALL provide quick capture actions through its popup and detailed preview and customization through a panel.

#### Scenario: Finish a manual selection
- **WHEN** the user completes an interactive element selection
- **THEN** the extension opens the detailed panel for preview and composition customization

#### Scenario: Save a capture
- **WHEN** the user confirms a capture
- **THEN** the extension saves the composed screenshot

### Requirement: Users can reuse per-site selector presets
The extension SHALL let users define element selectors for a site and capture their matches with a one-click action, with a configurable choice between direct saving and preview.

#### Scenario: Capture all selector matches by default
- **WHEN** a configured selector matches multiple elements and the preset uses the default match mode
- **THEN** all matching elements are captured

#### Scenario: Capture only the first selector match
- **WHEN** a configured selector matches multiple elements and the preset is configured to use the first-match mode
- **THEN** only the first matching element is captured

#### Scenario: Save a preset capture directly
- **WHEN** a user invokes a site preset configured for direct saving and all configured selectors match
- **THEN** the extension captures the matching elements using the preset composition strategy and saves the screenshot without opening the preview

#### Scenario: Preview a preset capture
- **WHEN** a user invokes a site preset configured for preview and all configured selectors match
- **THEN** the extension opens the detailed panel with the composed screenshot before saving

#### Scenario: Abort when a configured selector has no match
- **WHEN** a site preset is invoked and any configured selector has no matching element
- **THEN** the extension aborts the capture and informs the user that the preset did not fully match
