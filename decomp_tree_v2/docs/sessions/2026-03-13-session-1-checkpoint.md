# Session Checkpoint — 2026-03-13 Session 1

## Summary
Added Save PNG (full tree export), "Keep Only This Item" right-click filter, Active Filters panel, node label 2-line wrapping, node width setting, and tooltip contrast/text improvements. Removed fullscreen button (not supported in Tableau iframe). Reverted reload-clears-exclusions (caused instability).

---

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Fullscreen button removed | Tableau runs extension in an iframe without `allowfullscreen` — browser blocks `requestFullscreen()` regardless of approach |
| Reload reverted to original (no clearAllExclusions) | Adding `clearAllExclusions()` to reload caused extension instability |
| Save PNG captures full tree bounds, not viewport | Uses `treeBounds` (layout bounding box) to set SVG width/height and overrides D3 zoom transform to `translate(-x0,-y0)` at scale 1 |
| Column headers injected into PNG as SVG `<text>` elements | Headers are HTML overlays, not part of SVG — must be drawn at `dataMain - treeBounds.x0/y0` positions for correct placement |
| `exportPngCallback` store pattern | `savePng()` lives in DecompTree.svelte (has `svgEl`, `colHeaders`, `currentZoom`); Header.svelte calls it via store |
| Keep-only filters tracked in `_keepOnlyFilters` in-memory Map | `applyFilterAsync` with `isExcludeMode:false` looks identical to pre-existing dashboard include filters — can't distinguish via API. In-memory tracking ensures only extension-applied keep filters appear in the panel |
| `applyKeepOnlyFilter` uses simple `Replace` without `{ isExcludeMode: false }` | Merge + explicit isExcludeMode caused silent failures; plain Replace with single value matches Tableau's native "Keep Only" behavior |
| `getActiveFilters` reads excludes from Tableau API, keep-only from in-memory | Exclude mode has a unique `isExcludeMode:true` flag; include filters do not — hybrid approach avoids showing all dashboard filters |
| "Active filters" pill renamed from "Excluded (N)" | Now covers both exclude and keep-only filter types |
| Pill color changed from red to blue | Neutral blue fits both filter types; red implied danger/exclusion only |
| Mode badge per row in filters panel | Shows "Keep" (blue) or "Exclude" (red) badge so user can distinguish at a glance |
| Node label wraps to 2 lines in LR mode | `nodeGeometry` bumped `LINE_H * 2 → * 3`, `text2Y` shifted down by `LINE_H`; uses `computeWrappedLines` with tspans (same as TB mode) |
| SVG `<title>` on bar-label for full text tooltip | Native browser tooltip on hover — no JS overhead, works for both LR and TB |
| Node width slider added to Settings → Layout | Was hardcoded config with no UI control; range 140–480px step 20 |
| Dynamic label truncation replaces hardcoded 24 chars | `Math.floor((nw-12)/(fontSize*0.45))` fills available node width; wider nodes show more text automatically |
| Tooltip hint: "Right-click to exclude" → "Right-click for filter options" | Reflects new dual right-click menu (Keep only / Exclude) |
| Tooltip hint color: `--color-text-muted` → `--color-text-secondary` | Muted was too low contrast; secondary is readable |

---

## Files Created or Modified

| File | Change |
|------|--------|
| `src/lib/tableau.js` | Added `clearAllExclusions` (unused after revert), `applyKeepOnlyFilter` (simple Replace), `getActiveFilters` (excludes from API + keep-only from memory), `removeFilterValue` (both modes), `_keepOnlyFilters` in-memory Map |
| `src/stores/treeState.js` | Added `exportPngCallback` writable store |
| `src/components/Header.svelte` | Added `savePng()` (calls exportPngCallback store); removed fullscreen button + all related code; removed clearAllExclusions from reload |
| `src/components/DecompTree.svelte` | `savePng()` function — full tree export via treeBounds, column headers injected; `exportPngCallback` registration in onMount; `activeExclusions→activeFilters`, `refreshExclusions→refreshFilters` using `getActiveFilters`; `handleRemoveFilter` (mode-aware); `handleContextMenuKeepOnly`; filter panel renamed "Active filters" with mode badges; context menu adds "Keep only this item" (blue); help panel text updated; `nodeGeometry` bumped to 3×LINE_H; LR label uses tspans + `computeWrappedLines`; dynamic truncation; SVG `<title>` on bar-label; tooltip hint text + color updated |
| `src/components/Tooltip.svelte` | Right-click hint text: "Right-click for filter options"; color: muted → secondary |
| `src/components/ConfigPanel.svelte` | Added Node width slider (140–480px, step 20) in Layout tab between Level spacing and Bar thickness |
| `docs/` | Rebuilt for every commit |

---

## Commits This Session

| Commit | Description |
|--------|-------------|
| `6a58076` | Add reload clears exclusions, fullscreen button, and save PNG |
| `f0aa756` | Revert reload to original behavior — remove clearAllExclusions call |
| `43f55bd` | Save PNG: export full tree layout, not current viewport |
| `51f17c7` | Remove fullscreen button — not supported inside Tableau iframe |
| (local, not yet pushed) | Keep Only filter, Active Filters panel, label wrapping, node width setting, tooltip updates |

---

## Phase Gate Status

No formal GSD phases. Feature work is commit-based, deployed via GitHub Pages.

**Pending commit:** All local changes from this session have been built but not yet committed or pushed. Includes:
- Keep Only right-click filter + Active Filters panel
- Label 2-line wrapping + dynamic truncation + SVG title tooltip
- Node width slider in Settings
- Tooltip hint text + contrast fix

---

## Open Questions / Blockers

- **Label wrapping visual QA** — 2-line wrap in LR mode needs production testing; node height increase (LINE_H *3) may affect fit-to-view and smart zoom behavior on some trees
- **Keep-only filter persistence** — `_keepOnlyFilters` is in-memory only; reloading the page loses the panel entries (Tableau filter persists, but panel shows nothing). Acceptable for now.
- **`clearAllExclusions` in tableau.js** — function was added but is now unreferenced. Can be removed in a future cleanup commit.
- **Dynamic truncation factor 0.45** — slightly generous; may overflow very narrow nodes. Monitor in production.

---

## Next 3 Actions to Resume

1. **Commit and push all pending local changes** — run `git add` + commit covering: Keep Only filter, Active Filters panel, label wrapping, node width slider, tooltip hint fix. Then `git push` to deploy.

2. **Production QA: label 2-line wrapping** — test on the real workbook to verify label wrap looks correct, value line (`bar-value-text`) is not overlapping, and fit-to-view / smart zoom still works correctly with the taller nodes.

3. **Production QA: Keep Only filter** — verify "Keep only this item" applies correctly on the real workbook, Active Filters panel shows the entry, and the × remove button clears it properly.
