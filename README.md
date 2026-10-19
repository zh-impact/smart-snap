# Smart Snap

Smart Snap is a Chromium extension for capturing selected page elements without including unrelated content between them.

## Select and capture elements

1. Open a web page and press `Alt+Shift+C` (`Option+Shift+C` on macOS). The shortcut can also be changed in the browser's extension keyboard-shortcut settings.
2. Hover over elements to preview them in cyan, then click to add them to the selection. Selected elements are highlighted in purple; click one again to remove it. Use the on-page `Finish` button to open the detailed panel, or `Cancel` / `Escape` to leave selection mode.
3. In the panel, choose `Capture selected elements` to capture the full selected regions, including content outside the viewport.
4. Review the composition and use `Save screenshot` to download it as a PNG.

The default `Preserve layout` strategy keeps the elements' row and column relationships while compressing empty space. `Compact 2D pack` rearranges the captured elements to produce a compact image and does not preserve their original order.

## Site presets

1. Open the page's panel and add one CSS selector for each target group.
2. Each selector captures all matches by default. Set it to `First match` to capture only the first result.
3. Choose a composition strategy and save the site preset. Presets are stored locally and match the page's exact origin.
4. In the popup, choose `Capture site preset` for a direct save. To preview before saving, enable `Preview before saving` in the panel and save the preset; the popup then opens the panel with the capture preview.

If any configured selector is invalid or has no visible match, the preset capture is aborted rather than saving a partial screenshot. The initial release supports Chromium-based browsers, the top-level document, and open shadow roots; iframe content and closed shadow roots are not supported.

## Development

```sh
bun run dev
bun test
bun run compile
bun run build
```

The development extension is written to `.output/chrome-mv3-dev` and is labeled `Smart Snap (DEV)`. Production builds are written to `.output/chrome-mv3` and use the `Smart Snap` name.
