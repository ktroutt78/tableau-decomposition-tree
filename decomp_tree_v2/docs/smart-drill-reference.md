# Zoom Behavior Reference

## User-Facing Modes

### Smart Zoom (toggle button: crosshair icon)
Automatically frames the drilled node and its children in the viewport when you expand a level.

- **LR orientation**: includes the full ancestor path (root to drilled children) so the entire tree is visible horizontally
- **TB orientation**: focuses tightly on the drilled parent + immediate children
- **On collapse**: zooms to the collapsed node's parent + its siblings
- **On re-expand**: zooms to the re-expanded node + its children
- **Max scale**: 0.95 (prevents over-zooming on small node sets)
- **Padding**: 100px around focused nodes
- **Mutually exclusive** with Fit to Screen

### Fit to Screen (toggle button: corner-arrows icon)
Locks the viewport so all visible nodes always fit within the screen. Every tree update (drill, expand, collapse) recalculates the zoom to show everything.

- **Overrides**: smart zoom, suppress, and pan-only flags when locked
- **No minimum scale**: will zoom out as far as needed to fit all nodes
- **Button highlights blue** when locked (same visual pattern as smart zoom)
- **Mutually exclusive** with Smart Zoom — enabling one disables the other

### Neither Mode (both off)
Manual zoom/pan. The viewport stays where you left it.

- **On drill**: pans to reveal the new children without changing zoom scale (`_panToNodeId`)
- **On collapse / re-expand / sort / config change**: viewport preserved (`_suppressNextFit`)
- **Zoom in/out buttons** and scroll-wheel still work

---

## D3 Zoom Behavior Setup

```javascript
zoomBehavior = d3.zoom()
  .scaleExtent([0.04, 4])   // hard limits: 4% to 400%
  .on('zoom', (event) => {
    mainGroup.attr('transform', event.transform);
    currentZoom = { x: event.transform.x, y: event.transform.y, k: event.transform.k };
    tooltipVisible = false;  // hide tooltip on any zoom/pan
  });
svgSel.call(zoomBehavior).on('dblclick.zoom', null);  // disable double-click zoom
```

- **Scale extent**: 0.04 (min) to 4 (max) — hard limits on user zoom
- **Double-click zoom**: disabled
- **Scroll wheel / pinch**: default D3 behavior (no custom override)
- **`currentZoom`**: tracked on every zoom event as `{ x, y, k }` — used by column header positioning

---

## Internal Flags

| Flag | Type | Purpose |
|------|------|---------|
| `_lastDrilledNodeId` | `string\|null` | Set before `treeRoot.update()` to signal smart zoom should frame this node + children. Consumed (reset to null) after use. |
| `_suppressNextFit` | `boolean` | When true, `doFitToView` returns immediately without changing the transform. Used for collapse, re-expand, sort, and config changes to preserve the user's current view. |
| `_smartZoomToDeepest` | `boolean` | When true, `doFitToView` finds the deepest expanded node in the hierarchy and smart-zooms to it. Used by max-children +/- to avoid pre/post-update ID mismatch. |
| `_panToNodeId` | `string\|null` | When set, `doFitToView` delegates to `doPanOnly` — scrolls the minimum amount to reveal the target node at the current zoom scale. Used when smart zoom is OFF and a new drill may be off-screen. |
| `_fitToScreenLocked` | `boolean` | When true, `doFitToView` always fits all nodes, ignoring all other flags. Toggled by the fit-to-screen button. |

---

## Flag Priority (in `doFitToView`)

```
1. _fitToScreenLocked  → fit all nodes, clear all other flags, skipMinScale = true
2. _suppressNextFit    → skip entirely, preserve current view
3. _panToNodeId        → delegate to doPanOnly (pan without rescale)
4. smart zoom ON + _lastDrilledNodeId  → frame drilled node + ancestors (LR) or parent+children (TB)
5. _smartZoomToDeepest → frame deepest expanded node + ancestors (LR) or parent+children (TB)
6. default             → fit all nodes with MIN_READABLE_SCALE floor
```

---

## `doFitToView` Algorithm

Called after every tree update (drill, collapse, config change) via the store subscription redraw cycle.

### Step 1: Flag resolution
Check flags in priority order (see above). Early return for suppress/pan-only.

### Step 2: Rebuild layout hierarchy
```javascript
const hier = d3.hierarchy(rootData, visibleChildren);
d3.tree().nodeSize(
  isLR ? [nh + cfg.siblingSpacing, nw + cfg.levelSpacing]
       : [nw + cfg.siblingSpacing, nh + cfg.levelSpacing]
)(hier);
if (cfg.initialAlignment === 'top-left' && isLR) topAlignHier(hier, isLR);
```
- `visibleChildren(d)`: returns `null` if collapsed or no children; otherwise `d.children.slice(0, maxChildrenShown + 1)` (+1 for the "(Other)" node)
- Layout must match what `renderTree` produces so coordinates are consistent

### Step 3: Select focus nodes
- **Smart zoom (LR)**: drilled node + its children + all ancestors up to root
- **Smart zoom (TB)**: drilled node + its children only
- **`_smartZoomToDeepest`**: same logic but finds the deepest expanded node first
- **Fit to screen / default**: all visible nodes

### Step 4: Compute bounding box
```javascript
const pad = usedSmartZoom ? 100 : 50;
const x0 = Math.min(...xs) - nw / 2 - pad;
const y0 = Math.min(...ys) - nh / 2 - pad;
const x1 = Math.max(...xs) + nw / 2 + pad;
const y1 = Math.max(...ys) + nh / 2 + pad;
```
- Node positions are centers; offset by half node width/height to get edges
- Smart zoom gets 100px padding; full-fit gets 50px

### Step 5: Calculate scale
```javascript
const ZOOM_PANEL_RIGHT = 54;
const wAvail = w - ZOOM_PANEL_RIGHT;
const maxScale = usedSmartZoom ? 0.95 : 0.92;
const naturalScale = Math.min(maxScale, Math.min(wAvail / tw, h / th));
const scale = skipMinScale ? naturalScale : Math.max(MIN_READABLE_SCALE, naturalScale);
```
- `w`, `h`: container pixel dimensions (tracked via Svelte `bind:clientWidth/clientHeight`)
- `wAvail`: subtract 54px for the zoom control panel on the right
- `MIN_READABLE_SCALE`: dynamic floor — `h / (8 * siblingSlot)` for LR, `w / (9 * siblingSlot)` for TB
  - `siblingSlot = nodeHeight + siblingSpacing` (LR) or `nodeWidth + siblingSpacing` (TB)
- `skipMinScale = true` for fit-to-screen lock and explicit fit button click (no floor)

### Step 6: Calculate translation
```javascript
// Smart zoom: left-aligned, vertically centered
if (usedSmartZoom) {
  tx = 40 - x0 * scale;
  ty = (h - th * scale) / 2 - y0 * scale;
}
// Top-left alignment or scale clamped: anchor to top-left corner
else if (scaleClamped || (cfg.initialAlignment === 'top-left' && isLR)) {
  tx = 40 - x0 * scale;
  ty = 40 - y0 * scale;
}
// Centered alignment: left-aligned, vertically centered
else {
  tx = 40 - x0 * scale;
  ty = (h - th * scale) / 2 - y0 * scale;
}
```

### Step 7: Clamp for overlays
```javascript
// Column header clearance
if (isLR && colHeaders.length) ty = Math.max(ty, 44 - (y0 + pad) * scale);
if (!isLR && colHeaders.length) tx = Math.max(tx, 160 - (x0 + pad) * scale);
// Zoom panel right-edge clearance
tx = Math.min(tx, (w - ZOOM_PANEL_RIGHT) - x1 * scale);
```

### Step 8: Animate
```javascript
d3.select(svgEl)
  .transition('fit').duration(350)
  .call(zoomBehavior.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
```

---

## `doPanOnly` Algorithm

Called when smart zoom is OFF and a new drill produces nodes that may be off-screen. Pans the minimum distance to bring the target into view without changing zoom scale.

### Step 1: Rebuild layout hierarchy
Same as `doFitToView` step 2 — must match rendered positions.

### Step 2: Find target + compute bounding box
```javascript
const target = allNodes.find(n => n.data.id === targetId);
const focusSet = target.children?.length ? [target, ...target.children] : [target];
const pad = 30;  // tighter padding than doFitToView
// Compute x0, y0, x1, y1 from focusSet with pad
```

### Step 3: Check visibility
Transform the bounding box to screen coordinates using the current zoom:
```javascript
const k = currentZoom.k;  // current scale (preserved)
const sx0 = x0 * k + currentZoom.x;
const sy0 = y0 * k + currentZoom.y;
const sx1 = x1 * k + currentZoom.x;
const sy1 = y1 * k + currentZoom.y;
```
If all four edges are within `[0, containerWidth]` x `[0, containerHeight]`: **no-op return** (already visible).

### Step 4: Minimum pan
Only shift the axis that's out of bounds, and only by the minimum amount needed:
```javascript
let tx = currentZoom.x;
let ty = currentZoom.y;
if (sx1 > w) tx -= (sx1 - w);       // push left if right edge overflows
if (sx0 < 0) tx -= sx0;             // push right if left edge overflows
if (sy1 > h) ty -= (sy1 - h);       // push up if bottom edge overflows
if (sy0 < 0) ty -= sy0;             // push down if top edge overflows
```

### Step 5: Clamp for headers
Same header clearance logic as `doFitToView`:
- LR: `ty = Math.max(ty, 44 - (y0 + pad) * k)`
- TB: `tx = Math.max(tx, 160 - (x0 + pad) * k)`

### Step 6: Animate
```javascript
d3.select(svgEl)
  .transition('fit').duration(350)
  .call(zoomBehavior.transform, d3.zoomIdentity.translate(tx, ty).scale(k));
// k is unchanged — scale preserved
```

---

## `topAlignHier` Algorithm

Post-processes the D3 tree hierarchy so children start at the parent's vertical position instead of centering around it. Only applied when `initialAlignment === 'top-left'` and `isLR`.

```javascript
function shiftVertical(node, delta, isLR) {
  if (isLR) node.x += delta; else node.y += delta;
  if (node.children) node.children.forEach(c => shiftVertical(c, delta, isLR));
}

function topAlignHier(node, isLR) {
  if (!node.children || node.children.length === 0) return;
  const parentV     = isLR ? node.x : node.y;       // parent's vertical position
  const firstChildV = isLR ? node.children[0].x : node.children[0].y;
  const shift       = parentV - firstChildV;          // move first child to parent level
  node.children.forEach(c => shiftVertical(c, shift, isLR));
  node.children.forEach(c => topAlignHier(c, isLR));  // recurse
}
```

**Effect**: In LR mode, the first child aligns vertically with its parent. Children extend downward. Without this, D3's default centers children symmetrically around the parent.

**Applied in 3 places**: `renderTree`, `doPanOnly`, `doFitToView` — must be consistent.

---

## Scale Limits Summary

| Context | Max Scale | Min Scale |
|---------|-----------|-----------|
| D3 zoom extent (hard limit) | 4 | 0.04 |
| Smart zoom (focused drill) | 0.95 | MIN_READABLE_SCALE |
| Full tree fit (auto) | 0.92 | MIN_READABLE_SCALE |
| Fit to screen (locked) | 0.92 | none (unlimited zoom-out) |
| Explicit fit button click | 0.92 | none |
| Zoom in button | 1.5x current | — |
| Zoom out button | current / 1.5 | — |

---

## Transition Durations

| Animation | Duration | Easing | Transition Name |
|-----------|----------|--------|-----------------|
| `doFitToView` | 350ms | default (linear) | `'fit'` |
| `doPanOnly` | 350ms | default (linear) | `'fit'` |
| Zoom in button | 250ms | default | (unnamed) |
| Zoom out button | 250ms | default | (unnamed) |
| Tree layout (node/link moves) | `cfg.animationDuration` | `d3.easeCubicOut` | `'layout'` |

Named transitions (`'fit'`, `'layout'`) prevent conflicts — a new fit transition cancels an in-progress fit but not a layout transition, and vice versa.

---

## Viewport Positioning

| Mode | Horizontal (tx) | Vertical (ty) |
|------|-----------------|----------------|
| Smart zoom | Left-aligned (40px offset) | Vertically centered |
| Top-left alignment | Left-aligned (40px offset) | Top-aligned (40px offset) |
| Centered alignment | Left-aligned (40px offset) | Vertically centered |
| Scale clamped (tree too big) | Left-aligned (40px offset) | Top-aligned (40px offset) |

### Overlay constraints
- **Column headers (LR)**: content pushed below 44px from top
- **Column headers (TB)**: content pushed right of 160px from left
- **Zoom panel**: rightmost content stays left of zoom controls (54px from right edge)

### Column header positioning formula
Headers track zoom in real-time:
```javascript
screenPos = dataPosition * currentZoom.k + (isLR ? currentZoom.x : currentZoom.y)
// LR: positioned horizontally at screenPos, fixed at top 8px
// TB: fixed at left 8px, positioned vertically at screenPos
```

---

## Alignment Setting (`initialAlignment`)

Controls the D3 tree layout, not just the viewport:

| Setting | Layout | Viewport |
|---------|--------|----------|
| `top-left` | `topAlignHier()` shifts children to start at parent's vertical position | Top-left anchored |
| `center` | D3 default — children centered symmetrically around parent | Left-aligned, vertically centered |

---

## Container Dimensions

Tracked via Svelte's `bind:clientWidth` / `bind:clientHeight` on the `.tree-container` element. Automatically updates on resize. Defaults to 800x600 before first bind.

Used by:
- `doFitToView` — available viewport size for scale/position calculations
- `doPanOnly` — visibility check against current viewport bounds

---

## Which Flags Are Set Per Action

| Action | Smart Zoom ON | Smart Zoom OFF |
|--------|--------------|----------------|
| New drill (bar click, picker) | `_lastDrilledNodeId = node.id` | `_panToNodeId = node.id` |
| Collapse | `_lastDrilledNodeId = parent.id` | `_suppressNextFit = true` |
| Re-expand collapsed node | `_lastDrilledNodeId = node.id` | `_suppressNextFit = true` |
| Sibling auto-drill | `_lastDrilledNodeId = node.id` | `_panToNodeId = node.id` |
| Sort toggle | `_suppressNextFit = true` | `_suppressNextFit = true` |
| Config change | (triggers redraw via store subscription) | (triggers redraw via store subscription) |
| Max children +/- | `_smartZoomToDeepest = true` | `_suppressNextFit = true` |
| Fit to screen toggle ON | clears all flags, turns off smart zoom, fits all | clears all flags, fits all |
| Fit to screen toggle OFF | (returns to smart zoom behavior) | (returns to manual mode) |
| Smart zoom toggle ON | turns off fit-to-screen, `focusCurrentDrill()` | — |
| Smart zoom toggle OFF | `_suppressNextFit = true` (preserve view) | — |

### Sibling auto-drill detail
When user clicks a bar on an undrilled sibling node, the extension:
1. Collapses the currently-expanded sibling
2. Drills the clicked sibling using the same dimension
3. Sets the appropriate zoom flag for the newly-drilled node
