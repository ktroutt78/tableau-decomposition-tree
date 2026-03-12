<script>
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import * as d3 from 'd3';
  import { treeRoot, pendingDrillNode, statusMessage, selectedNodeInfo, resolvedMeasureDisplayName, configPanelOpen } from '../stores/treeState.js';
  import { selectMarksForFilter, clearMarkSelection, applyExcludeFilter, getActiveExclusions, removeExclusionValue } from '../lib/tableau.js';
  import { config, saveConfig } from '../stores/config.js';
  import { encodingMap } from '../stores/encodings.js';
  import { drillDown, toggleCollapse, updateNodeInTree, findParent, toggleSortAtDimension, reapplyExpansion } from '../lib/treeEngine.js';
  import { formatValue, truncate } from '../lib/formatters.js';
  import Tooltip from './Tooltip.svelte';
  import DimensionPicker from './DimensionPicker.svelte';

  let containerEl;
  let svgEl;
  let containerWidth = 800;
  let containerHeight = 600;

  let tooltipVisible = false;
  let tooltipX = 0;
  let tooltipY = 0;
  let tooltipData = null;

  let contextMenuVisible = false;
  let contextMenuX = 0;
  let contextMenuY = 0;
  let contextMenuNode = null;

  let activeExclusions = [];
  let exclusionsOpen = false;

  // Reload exclusion list whenever tree data changes (fires after every filter change)
  $: $treeRoot, refreshExclusions();
  function refreshExclusions() {
    getActiveExclusions().then(e => { activeExclusions = e; });
  }

  let helpOpen = false;

  let mainGroup;
  let zoomBehavior;

  // ── Bar chart node geometry ────────────────────────────────────────────────
  // BAR_H comes from config.barHeight (default 20); the rest are derived.
  const TEXT_GAP = 8;    // gap from bar bottom to first text baseline
  const LINE_H   = 18;   // line height between text rows
  const BOT_PAD  = 6;    // padding below last text line
  const EXPAND_R = 10;   // expand button circle radius

  // Compute layout geometry from a given bar height
  function nodeGeometry(barH) {
    const nodeH  = barH + TEXT_GAP + LINE_H * 2 + BOT_PAD;
    const barTopY = -nodeH / 2;
    return {
      nodeH,
      barTopY,
      barCY:  barTopY + barH / 2,
      text1Y: barTopY + barH + TEXT_GAP + 13,
      text2Y: barTopY + barH + TEXT_GAP + 13 + LINE_H,
    };
  }

  // Stable defaults used for doFitToView when called outside renderTree
  let _lastNodeH = 70;

  // Set to the ID of the node that was just drilled into so doFitToView can
  // smart-zoom to that parent + its new children. Reset to null after consuming.
  let _lastDrilledNodeId = null;

  // When true, doFitToView skips the zoom transform and returns immediately.
  // Set before collapse / re-expand updates so the user's current pan/zoom is preserved.
  let _suppressNextFit = false;

  // When true, doFitToView finds the deepest drilled node in the live (post-update)
  // hierarchy and smart-zooms to it. Used by increaseMaxChildren / decreaseMaxChildren
  // with smart zoom ON — avoids the pre/post-update ID lookup mismatch.
  let _smartZoomToDeepest = false;

  // When set to a node ID, doFitToView delegates to doPanOnly — pans to show that
  // node + its children at the current zoom scale instead of recalculating scale.
  // Used when smartZoom is OFF and a drill produces nodes that may be off-screen.
  let _panToNodeId = null;

  // HTML column headers (driven from D3 layout, updated each render)
  let colHeaders = []; // [{ dimName, dataX }]

  // Expand-button position in tree coordinates — used to anchor the drill hint overlay
  let hintAnchor = null; // { tx, ty }

  // Current D3 zoom transform — tracked to position column headers correctly
  let currentZoom = { x: 0, y: 0, k: 1 };

  let treeBounds = null; // layout-space bounding box of all visible nodes

  // ── Top-left layout helpers ────────────────────────────────────────────────
  // Shift an entire subtree's vertical axis (x in LR, y in TB) by delta.
  function shiftVertical(node, delta, isLR) {
    if (isLR) node.x += delta; else node.y += delta;
    if (node.children) node.children.forEach(c => shiftVertical(c, delta, isLR));
  }

  // Post-process a D3 hierarchy so that each sibling group starts AT the
  // parent's vertical position and extends downward, instead of centering.
  function topAlignHier(node, isLR) {
    if (!node.children || node.children.length === 0) return;
    const parentV     = isLR ? node.x     : node.y;
    const firstChildV = isLR ? node.children[0].x : node.children[0].y;
    const shift       = parentV - firstChildV;
    node.children.forEach(c => shiftVertical(c, shift, isLR));
    node.children.forEach(c => topAlignHier(c, isLR));
  }

  // Color palette — start (lightest, for smallest bar) and end (darkest, for largest bar) for per-sibling gradient
  const COLOR_THEMES = {
    cobalt:      { start: '#93C5FD', end: '#1D4ED8' },
    ember:       { start: '#FDBA74', end: '#C94B1E' },
    ultraviolet: { start: '#C4B5FD', end: '#5B21B6' },
    sage:        { start: '#6EE7B7', end: '#3D6B52' },
    slate:       { start: '#94A3B8', end: '#334155' },
  };
  // Bar track color — computed in renderTree so it reacts to isDarkBg
  let BAR_BG_COLOR = '#e2e8f0';

  onMount(() => {
    const svgSel = d3.select(svgEl);
    mainGroup = svgSel.append('g').attr('class', 'tree-root-group');

    zoomBehavior = d3.zoom()
      .scaleExtent([0.04, 4])
      .on('zoom', (event) => {
        mainGroup.attr('transform', event.transform);
        currentZoom = { x: event.transform.x, y: event.transform.y, k: event.transform.k };
        tooltipVisible = false;
      });
    svgSel.call(zoomBehavior).on('dblclick.zoom', null);

    // Clicking the SVG background deselects the current node and clears mark selection
    svgSel.on('click', async () => {
      helpOpen = false;
      const info = get(selectedNodeInfo);
      if (info) {
        selectedNodeInfo.set(null);
        statusMessage.set('Selection cleared');
        await clearMarkSelection();
      }
    });

    // Store subscription fires immediately with current value, then on every change.
    // This avoids the Svelte 5 legacy-mode race where $: blocks fire before onMount.
    const redraw = () => {
      const root = get(treeRoot);
      if (!root || !mainGroup) return;
      const cfg = get(config);
      const vName = get(resolvedMeasureDisplayName);
      renderTree(root, cfg, vName);
      doFitToView(root, cfg);
    };

    const unsubRoot     = treeRoot.subscribe(redraw);
    const unsubConfig   = config.subscribe(redraw);
    const unsubResolved = resolvedMeasureDisplayName.subscribe(redraw);
    const unsubSelected = selectedNodeInfo.subscribe(() => {
      if (!svgEl) return;
      const sel = get(selectedNodeInfo);
      const cfg = get(config);
      d3.select(svgEl).selectAll('.tree-node')
        .transition().duration(200)
        .style('opacity', d => {
          if (!sel) return 1;
          if (d.data.id === sel.id) return 1;
          return d.parent?.children?.some(c => c.data.id === sel.id) ? 0.3 : 1;
        });
      d3.select(svgEl).selectAll('.tree-link')
        .transition().duration(200)
        .attr('stroke', d => resolveLinkColor(d, sel, cfg))
        .attr('stroke-width', d => resolveLinkWidth(d, sel, cfg))
        .attr('stroke-dasharray', resolveLinkStrokeDasharray(cfg))
        .attr('stroke-linecap', resolveLinkStrokeLinecap(cfg));
    });

    return () => { unsubRoot(); unsubConfig(); unsubSelected(); unsubResolved(); };
  });

  // Split `text` into lines that fit within `maxWidth` pixels (approximate char-width method).
  // Returns up to maxLines strings; truncates the last line with "…" if needed.
  function computeWrappedLines(text, maxWidth, fontSize, maxLines = 2) {
    const charW  = fontSize * 0.58;
    const maxCh  = Math.max(6, Math.floor(maxWidth / charW));
    const words  = String(text ?? '').split(/\s+/).filter(Boolean);
    if (!words.length) return [''];
    const lines  = [];
    let cur      = '';
    for (const word of words) {
      if (lines.length === maxLines - 1) {
        // On the last allowed line — keep appending (will truncate below)
        cur = cur ? `${cur} ${word}` : word;
      } else if (!cur) {
        cur = word;
      } else if ((cur + ' ' + word).length <= maxCh) {
        cur += ' ' + word;
      } else {
        lines.push(cur);
        cur = word;
      }
    }
    if (cur) lines.push(cur.length > maxCh + 3 ? `${cur.slice(0, maxCh)}…` : cur);
    return lines.slice(0, maxLines);
  }

  function renderTree(rootData, cfg, valueName) {
    if (!mainGroup || !rootData) return;
    // Compute from cfg directly — avoids timing race with module-level $: isDarkBg
    // (config.subscribe fires synchronously before Svelte's reactive cycle updates isDarkBg)
    const hex = (cfg.bgColor || '#ffffff').replace('#', '');
    const isDarkBg = hex.length === 6
      ? (0.299 * parseInt(hex.slice(0, 2), 16) + 0.587 * parseInt(hex.slice(2, 4), 16) + 0.114 * parseInt(hex.slice(4, 6), 16)) < 128
      : false;
    BAR_BG_COLOR = isDarkBg ? '#334155' : '#e2e8f0';

    const isLR     = cfg.orientation === 'LR';
    const dur      = cfg.animationDuration;
    const nw       = cfg.nodeWidth;
    const BAR_H    = cfg.barHeight ?? 20;
    const { nodeH: nh, barTopY, barCY, text1Y, text2Y } = nodeGeometry(BAR_H);

    // TB (top-bottom) vertical bar geometry — used only when !isLR
    const TB_BAR_W     = 36;                      // vertical bar column width
    const TB_BAR_MAX_H = 100;                     // bar background height (100% fill)
    const TB_LABEL_X   = TB_BAR_W / 2 + 8;       // text x: right of bar
    const TB_BAR_TOP   = -TB_BAR_MAX_H / 2;       // bar top y (relative to node center)
    const TB_BAR_BOT   =  TB_BAR_MAX_H / 2;       // bar bottom y
    const TB_EXPAND_CY = TB_BAR_BOT + EXPAND_R + 6; // expand button center y (below bar)
    const TB_NH        = TB_BAR_MAX_H + EXPAND_R * 2 + 14; // effective node height for layout

    _lastNodeH = isLR ? nh : TB_NH;

    // Compute the final wrapped line array for a TB label node (including pct% suffix).
    // Shared between bar-label rendering and bar-value-text y-position calculation.
    function tbLabelContent(d) {
      const rawLabel   = d.depth === 0 ? valueName : d.data.label;
      const availWidth = nw - TB_BAR_W / 2 - 8;
      const lines      = computeWrappedLines(rawLabel, availWidth, fontSize);
      if (d.depth > 0 && labelMode !== 'value') {
        const pct    = (d.data.percentOfParent ?? 100).toFixed(0);
        const pctStr = ` (${pct}%)`;
        const maxCh  = Math.floor(availWidth / (fontSize * 0.58));
        const last   = lines[lines.length - 1];
        if (last.length + pctStr.length <= maxCh) {
          lines[lines.length - 1] += pctStr; // fits on same line
        } else {
          lines.push(`(${pct}%)`);           // overflow to new line
        }
      }
      return lines;
    }

    const BAR_R    = cfg.barRadius ?? 4;
    const negColor = cfg.negativeColor || '#dc2626';
    const theme     = COLOR_THEMES[cfg.colorTheme] || COLOR_THEMES.cobalt;
    const startColor = (cfg.colorTheme === 'custom' ? (cfg.customColorStart || '#164E63') : theme.start).toString().toLowerCase();
    const middleColor = cfg.colorTheme === 'custom' ? (cfg.customColorMiddle || '').toString().toLowerCase() || null : null;
    const endColor   = (cfg.colorTheme === 'custom' ? (cfg.customColorEnd   || '#DB2777') : theme.end).toString().toLowerCase();
    const colorInterp = (t) => {
      if (cfg.colorTheme === 'custom' && middleColor) {
        if (t <= 0.5) return d3.interpolateRgb(startColor, middleColor)(t * 2);
        return d3.interpolateRgb(middleColor, endColor)((t - 0.5) * 2);
      }
      return d3.interpolateRgb(startColor, endColor)(t);
    };

    // Coerce useGradient to boolean (saved config can be string)
    const useGradient = cfg.useGradient !== false && cfg.useGradient !== 'false';

    // (Other) = grouping of children not displayed (overflow when > maxChildrenShown).
    const isOtherNode = (d) => (d.data?.label ?? '').trim() === '(Other)';
    const otherNodeColor = cfg.colorTheme === 'slate' ? '#0d9488' : '#94a3b8'; // teal for Slate; light grey for others

    // Returns a color for a node based on value rank among siblings: largest value = darkest, smallest = lightest.
    const isCustom = cfg.colorTheme === 'custom';
    function posColor(d) {
      if (isOtherNode(d)) return otherNodeColor;
      if (!useGradient) return colorInterp(isCustom ? 0 : 1);
      if (!d.parent || !d.parent.children || d.parent.children.length <= 1) {
        return colorInterp(isCustom ? 0 : 1);
      }
      const siblings = d.parent.children;
      // Sort by absolute value descending so index 0 = largest
      const byValue = [...siblings].sort((a, b) => Math.abs(b.data.value ?? 0) - Math.abs(a.data.value ?? 0));
      const rank = byValue.findIndex(n => n === d);
      if (rank < 0) return colorInterp(isCustom ? 0 : 1);
      const t = rank / Math.max(1, siblings.length - 1);
      return colorInterp(isCustom ? t : 1 - t);
    }

    const fontSize      = cfg.fontSize    || 13;
    const subFontSize   = cfg.subFontSize || 11;
    const headingColor  = isDarkBg ? '#f1f5f9' : (cfg.headingColor    || '#1e293b');
    const subheadColor  = isDarkBg ? '#94a3b8' : (cfg.subheadingColor || '#64748b');
    const fontFamilyMap = {
      system: 'system-ui, sans-serif',
      serif:  'Georgia, serif',
      mono:   'ui-monospace, monospace'
    };
    const fontFamily    = fontFamilyMap[cfg.fontFamily] || fontFamilyMap.system;
    const labelMode     = cfg.labelMode || 'both';
    const showMeasName  = cfg.showMeasureName !== false;

    const totalBreakdownDims = ($encodingMap.breakdown || []).length;

    function visibleChildren(d) {
      if (d._collapsed || !d.children) return null;
      return d.children.slice(0, cfg.maxChildrenShown + 1); // +1 to always include (Other)
    }
    const hier = d3.hierarchy(rootData, visibleChildren);
    d3.tree().nodeSize(
      isLR ? [nh + cfg.siblingSpacing, nw + cfg.levelSpacing]
           : [nw + cfg.siblingSpacing, TB_NH + cfg.levelSpacing]
    )(hier);
    if (cfg.initialAlignment === 'top-left' && isLR) topAlignHier(hier, isLR);

    const nodes = hier.descendants();
    const links = hier.links();

    // Per-depth max absolute value — used only for 'level' bar scale mode
    const maxByDepth = {};
    for (const d of nodes) {
      if (d.depth === 0) continue;
      const abs = Math.abs(d.data.value ?? 0);
      if (abs > (maxByDepth[d.depth] ?? 0)) maxByDepth[d.depth] = abs;
    }

    // Returns the bar fill percentage (0–100) for a node based on barScaleMode.
    // The percentage label shown on the node always uses percentOfParent regardless of mode.
    function barPct(d) {
      if (d.depth === 0) return 100;
      const mode = cfg.barScaleMode || 'parent';
      if (mode === 'top') {
        const rootAbs = Math.abs(rootData.value ?? 1) || 1;
        return Math.max(0, Math.min(100, Math.abs(d.data.value ?? 0) / rootAbs * 100));
      }
      if (mode === 'level') {
        const levelMax = maxByDepth[d.depth] || 1;
        return Math.max(0, Math.min(100, Math.abs(d.data.value ?? 0) / levelMax * 100));
      }
      // 'parent' (default) — use pre-computed percentOfParent
      return Math.max(0, Math.min(100, Math.abs(d.data.percentOfParent ?? 100)));
    }

    const posX  = isLR ? d => d.y : d => d.x;
    const posY  = isLR ? d => d.x : d => d.y;
    const xform = d => `translate(${posX(d)},${posY(d)})`;

    // Track full tree bounds for scrollbar computation
    if (nodes.length) {
      const allX = nodes.map(d => posX(d));
      const allY = nodes.map(d => posY(d));
      const nodeH = isLR ? nh : TB_NH;
      treeBounds = {
        x0: Math.min(...allX) - nw / 2 - 50,
        x1: Math.max(...allX) + nw / 2 + 50,
        y0: Math.min(...allY) - nodeH / 2 - 50,
        y1: Math.max(...allY) + nodeH / 2 + 50,
      };
    }

    // Named transitions prevent cross-interruption
    const tLayout = d3.transition('layout').duration(dur).ease(d3.easeCubicOut);
    const tFill   = d3.transition('fill').duration(dur).ease(d3.easeCubicOut);

    // ── Links ─────────────────────────────────────────────────────────────
    const linkGen = buildLinkGen(cfg, nw, nh, barCY);

    const linkSel = mainGroup.selectAll('.tree-link')
      .data(links, d => d.target.data.id);

    const linkOpacity = cfg.linkOpacity ?? 0.9;
    const sel = get(selectedNodeInfo);

    linkSel.exit().transition(tLayout).style('opacity', 0).remove();

    const linkDasharray = resolveLinkStrokeDasharray(cfg);
    const linkLinecap = resolveLinkStrokeLinecap(cfg);

    linkSel.enter().append('path')
      .attr('class', 'tree-link')
      .attr('d', linkGen)
      .attr('stroke', d => resolveLinkColor(d, sel, cfg))
      .attr('stroke-width', d => resolveLinkWidth(d, sel, cfg))
      .attr('stroke-dasharray', linkDasharray)
      .attr('stroke-linecap', linkLinecap)
      .attr('stroke-opacity', 0)
      .transition(tLayout).attr('stroke-opacity', linkOpacity);

    mainGroup.selectAll('.tree-link')
      .transition(tLayout)
      .attr('d', linkGen)
      .attr('stroke', d => resolveLinkColor(d, sel, cfg))
      .attr('stroke-width', d => resolveLinkWidth(d, sel, cfg))
      .attr('stroke-dasharray', linkDasharray)
      .attr('stroke-linecap', linkLinecap)
      .attr('stroke-opacity', linkOpacity);

    // ── Nodes ─────────────────────────────────────────────────────────────
    const nodeSel = mainGroup.selectAll('.tree-node')
      .data(nodes, d => d.data.id);

    nodeSel.exit().transition(tLayout).style('opacity', 0).remove();

    const nodeEnter = nodeSel.enter().append('g')
      .attr('class', 'tree-node')
      .attr('transform', xform)
      .style('opacity', 0)
      .on('mousemove', handleMouseMove)
      .on('mouseleave', () => { tooltipVisible = false; })
      .on('contextmenu', (event, d) => {
        event.preventDefault();
        event.stopPropagation();
        const node = d.data;
        if (node.depth === 0 || !node._drillDimension || node.label === '(Other)') return;
        const rect = containerEl.getBoundingClientRect();
        contextMenuX = event.clientX - rect.left;
        contextMenuY = event.clientY - rect.top;
        contextMenuNode = node;
        contextMenuVisible = true;
      });

    // Bar background (gray track, full width)
    nodeEnter.append('rect').attr('class', 'bar-bg')
      .attr('x', -nw / 2).attr('y', barTopY)
      .attr('width', nw).attr('height', BAR_H)
      .attr('rx', BAR_R).attr('fill', BAR_BG_COLOR);

    // Bar fill: LR animates width from left; TB animates height growing upward from bottom
    const fillEnter = nodeEnter.append('rect').attr('class', 'bar-fill').attr('rx', BAR_R);
    if (isLR) {
      fillEnter.attr('x', -nw / 2).attr('y', barTopY).attr('height', BAR_H).attr('width', 0);
    } else {
      fillEnter.attr('x', -TB_BAR_W / 2).attr('y', TB_BAR_BOT).attr('width', TB_BAR_W).attr('height', 0);
    }

    // Line 1: "Label (pct%)"
    nodeEnter.append('text').attr('class', 'bar-label')
      .attr('text-anchor', 'start');

    // Line 2: "MeasureName: value"
    nodeEnter.append('text').attr('class', 'bar-value-text')
      .attr('text-anchor', 'start');

    // Expand button circle — just to the right of the node card, at bar height
    nodeEnter.append('circle').attr('class', 'expand-circle')
      .attr('cy', barCY).attr('r', EXPAND_R)
      .attr('stroke', 'white').attr('stroke-width', 1.5);

    // Expand icon text (+/−)
    nodeEnter.append('text').attr('class', 'expand-icon')
      .attr('text-anchor', 'middle');


    // ── UPDATE (enter + existing) ──────────────────────────────────────────
    const nodeUpdate = nodeEnter.merge(nodeSel);

    nodeUpdate.transition(tLayout).attr('transform', xform);

    // Bar background: update position, size, and corner radius
    nodeUpdate.select('.bar-bg')
      .attr('x',      isLR ? -nw / 2       : -TB_BAR_W / 2)
      .attr('y',      isLR ? barTopY        : TB_BAR_TOP)
      .attr('width',  isLR ? nw             : TB_BAR_W)
      .attr('height', isLR ? BAR_H          : TB_BAR_MAX_H)
      .attr('rx', BAR_R)
      .attr('fill', BAR_BG_COLOR);

    // Bar fill: set color immediately so gradient is correct; animate size with transition
    nodeUpdate.select('.bar-fill')
      .attr('x',  isLR ? -nw / 2 : -TB_BAR_W / 2)
      .attr('rx', BAR_R)
      .attr('fill', d => d.data.value >= 0 ? posColor(d) : negColor)
      .transition(tFill)
      .attr('width', d => {
        const pct = barPct(d);
        return isLR ? nw * pct / 100 : TB_BAR_W;
      })
      .attr('height', d => {
        const pct = barPct(d);
        return isLR ? BAR_H : TB_BAR_MAX_H * pct / 100;
      })
      .attr('y', d => {
        const pct = barPct(d);
        return isLR ? barTopY : TB_BAR_BOT - TB_BAR_MAX_H * pct / 100;
      });

    // Label line 1:
    //   root  → measure name/alias only (% is always 100%, never shown)
    //   child → label + optional (pct%) based on labelMode
    nodeUpdate.select('.bar-label')
      .attr('x', isLR ? -nw / 2 + 6 : TB_LABEL_X)
      .attr('y', isLR ? text1Y : TB_BAR_TOP + 13)
      .style('font-size', `${fontSize}px`)
      .style('font-family', fontFamily)
      .style('fill', headingColor)
      .each(function(d) {
        const el = d3.select(this);
        if (isLR) {
          // LR: single-line text — D3's .text() clears any existing tspans automatically
          if (d.depth === 0) { el.text(valueName); return; }
          const label = truncate(d.data.label, 24);
          if (labelMode === 'value') { el.text(label); return; }
          const pct = (d.data.percentOfParent ?? 100).toFixed(0);
          el.text(`${label} (${pct}%)`);
        } else {
          // TB: wrap label into tspan elements so text doesn't overflow into adjacent bar
          el.text(''); // clears existing text/tspans
          const lines = tbLabelContent(d);
          lines.forEach((line, i) => {
            el.append('tspan')
              .attr('x', TB_LABEL_X)
              .attr('dy', i === 0 ? 0 : LINE_H)
              .text(line);
          });
        }
      });

    // Value line 2:
    //   root        → formatted value only (measure name is already on line 1)
    //   labelMode 'percent' → empty (value hidden; % is shown on line 1)
    //   otherwise   → value, optionally prefixed with measure name
    nodeUpdate.select('.bar-value-text')
      .attr('x', isLR ? -nw / 2 + 6 : TB_LABEL_X)
      .attr('y', d => isLR ? text2Y : TB_BAR_TOP + 13 + LINE_H * tbLabelContent(d).length)
      .style('font-size', `${subFontSize}px`)
      .style('font-family', fontFamily)
      .style('fill', subheadColor)
      .text(d => {
        // Group count suffix: "• N groups" when enabled and node has been drilled
        const gc = (cfg.showGroupCount && d.data.children?.length)
          ? ` • ${d.data.children.length} groups`
          : '';

        if (d.depth === 0) return `${formatValue(d.data.value, cfg)}${gc}`;
        if (labelMode === 'percent') return gc.trimStart() || '';
        const val = formatValue(d.data.value, cfg);
        const line = showMeasName ? `${valueName}: ${val}` : val;
        return `${line}${gc}`;
      });

    // Expand button: color, position, and visibility
    const isExpanded = d => !!(d.data.children && !d.data._collapsed);
    // Hide + when node has used all available breakdown dimensions
    const showExpand = d => {
      if (isExpanded(d)) return true; // always show − to collapse
      const dimsUsed = d.data.dimensionPath?.length ?? 0;
      return dimsUsed < totalBreakdownDims;
    };

    const expandActiveColor = getActiveColor(cfg);
    nodeUpdate.select('.expand-circle')
      .attr('cx', isLR ? nw / 2 + EXPAND_R + 2 : 0)
      .attr('cy', isLR ? barCY : TB_EXPAND_CY)
      .attr('visibility', d => showExpand(d) ? 'visible' : 'hidden')
      .transition(tFill)
      .attr('fill', d => isExpanded(d) ? '#94a3b8' : expandActiveColor);

    nodeUpdate.select('.expand-icon')
      .attr('x', isLR ? nw / 2 + EXPAND_R + 2 : 0)
      .attr('y', isLR ? barCY + 5 : TB_EXPAND_CY + 5)
      .attr('visibility', d => showExpand(d) ? 'visible' : 'hidden')
      .style('fill', 'white')
      .text(d => isExpanded(d) ? '−' : '+');

    // Dim sibling nodes when a selection is active
    nodeUpdate.transition(tFill)
      .style('opacity', d => {
        const sel = get(selectedNodeInfo);
        if (!sel) return 1;
        if (d.data.id === sel.id) return 1;
        return d.parent?.children?.some(c => c.data.id === sel.id) ? 0.3 : 1;
      });

    // Bar area click → select/filter; expand button click → drill/collapse
    nodeUpdate.on('click', (event, d) => handleBarClick(event, d));
    nodeUpdate.select('.expand-circle').on('click', (event, d) => handleExpandClick(event, d));
    nodeUpdate.select('.expand-icon').on('click', (event, d) => handleExpandClick(event, d));

    // ── Drill hint anchor — centered on expand button X, below node card Y ─
    // ty points to the bottom of the node (text included) so the bubble never
    // overlaps the label or subheading. A small fixed screen-pixel gap is added
    // in the template on top of this.
    hintAnchor = {
      tx: posX(hier) + (isLR ? nw / 2 + EXPAND_R + 2 : 0),
      ty: posY(hier) + (isLR ? nh / 2 : TB_EXPAND_CY + EXPAND_R + 4),
    };

    // ── Collect column header data for HTML overlay ────────────────────────
    // LR: one header per unique column (posX = horizontal); rendered at top.
    // TB: one header per unique depth row (posY = vertical); rendered at left.
    const headerMap = new Map(); // key: dataMain → { dim, dataMain, isLR, sortOrder }
    for (const d of nodes) {
      if (!d.parent || !d.data._drillDimension) continue;
      // No first-child-only restriction: if the first sibling was reset its
      // _drillDimension is null, so let any sibling register the header.
      // headerMap deduplicates by position — first match wins.
      const dataMain = isLR ? posX(d) : posY(d);
      if (!headerMap.has(dataMain)) {
        headerMap.set(dataMain, {
          dim: d.data._drillDimension,
          dataMain,
          isLR,
          sortOrder: d.data._sortOrder || 'desc'
        });
      }
    }
    colHeaders = Array.from(headerMap.values());
  }

  // Returns the theme-derived active link color.
  // Slate is a special case: its start color (#94A3B8) is identical to the inactive
  // link default (#94a3b8), making active/inactive links indistinguishable.
  // Use the end color (#334155) for Slate so active links are clearly distinct.
  function getActiveColor(cfg) {
    const theme = COLOR_THEMES[cfg.colorTheme] || COLOR_THEMES.cobalt;
    if (cfg.colorTheme === 'custom') return cfg.customColorStart || '#1e40af';
    if (cfg.colorTheme === 'slate')  return theme.end;
    return theme.start;
  }

  // Returns the stroke color for a link.
  //
  // When a filter selection is active: only the selected node's ancestor path is
  // colored; everything else is grey (existing behavior).
  //
  // When nothing is selected: the expansion path (drilled, non-collapsed chain
  // from root to the deepest open level) is colored with the theme's active color.
  // A link is on the expansion path when its target is not collapsed AND has no
  // drilled+expanded sibling (meaning it IS the currently-open branch, not a
  // grey/collapsed sibling). Negative nodes on any active path use the negative color.
  // Returns true when this link is on the active expansion path.
  // Used by both resolveLinkColor and resolveLinkWidth to keep logic in sync.
  function isLinkActive(link, sel) {
    const tdata = link.target.data;

    function onExpansionPath() {
      if (tdata._collapsed) return false;
      const dSiblings = link.target.parent?.children || [];
      const hasDrilledExpandedSibling = dSiblings.some(
        s => s !== link.target && s.data.children?.length && !s.data._collapsed
      );
      const targetIsDrilledExpanded = !!(tdata.children?.length && !tdata._collapsed);
      return !hasDrilledExpandedSibling || targetIsDrilledExpanded;
    }

    if (sel) {
      const tid = tdata.id;
      if (sel.id === tid || sel.id.startsWith(tid + '|')) return true;
      if (tid.startsWith(sel.id + '|')) return onExpansionPath();
      return false;
    }
    return onExpansionPath();
  }

  function resolveLinkColor(link, sel, cfg) {
    if (!isLinkActive(link, sel)) return cfg.linkColorInactive || '#94a3b8';
    // cfg.linkColorActive: user override — empty string / falsy means follow theme
    const activeColor = cfg.linkColorActive || getActiveColor(cfg);
    return link.target.data.value < 0
      ? (cfg.negativeColor || '#dc2626')
      : activeColor;
  }

  function resolveLinkWidth(link, sel, cfg) {
    const base = Math.max(1, Math.min(6, Number(cfg.linkStrokeWidth) || 2));
    return isLinkActive(link, sel) ? base : Math.max(1, base * 0.6);
  }

  function resolveLinkStrokeDasharray(cfg) {
    const t = cfg.linkStrokeType || 'line';
    if (t === 'dotted') return '0,4';
    if (t === 'dashed') return '8,4';
    return 'none';
  }

  function resolveLinkStrokeLinecap(cfg) {
    return (cfg.linkStrokeType || 'line') === 'dotted' ? 'round' : 'butt';
  }

  // Build a link generator that respects cfg.linkStyle: 'step' | 'curved' | 'straight'
  function buildLinkGen(cfg, nw, nh, barCY) {
    const isLR  = cfg.orientation === 'LR';
    const style = cfg.linkStyle || 'step';

    if (isLR) {
      // LR: source exits after the expand button (card edge + button diameter + gap)
      const srcX = nw / 2 + EXPAND_R * 2 + 6;
      if (style === 'curved') {
        return d3.linkHorizontal()
          .x(d => d.barX)
          .y(d => d.barY)
          .source(d => ({ barX: d.source.y + srcX, barY: d.source.x + barCY }))
          .target(d => ({ barX: d.target.y - nw / 2, barY: d.target.x + barCY }));
      }
      if (style === 'straight') {
        return d => {
          const sx = d.source.y + srcX, sy = d.source.x + barCY;
          const tx = d.target.y - nw / 2, ty = d.target.x + barCY;
          return `M${sx},${sy}L${tx},${ty}`;
        };
      }
      // step (default)
      return d => {
        const sx = d.source.y + srcX, sy = d.source.x + barCY;
        const tx = d.target.y - nw / 2, ty = d.target.x + barCY;
        const mx = (sx + tx) / 2;
        return `M${sx},${sy}H${mx}V${ty}H${tx}`;
      };
    } else {
      // TB vertical bar: source exits below expand button; target enters bar top
      const TB_BAR_MAX_H = 100;
      const TB_EXPAND_CY = TB_BAR_MAX_H / 2 + EXPAND_R + 6;
      const srcYOff = TB_EXPAND_CY + EXPAND_R + 2; // just below expand button
      const tgtYOff = -TB_BAR_MAX_H / 2;           // top of child bar bg

      if (style === 'curved') {
        return d3.linkVertical()
          .x(d => d.barX)
          .y(d => d.barY)
          .source(d => ({ barX: d.source.x, barY: d.source.y + srcYOff }))
          .target(d => ({ barX: d.target.x, barY: d.target.y + tgtYOff }));
      }
      if (style === 'straight') {
        return d => {
          const sx = d.source.x, sy = d.source.y + srcYOff;
          const tx = d.target.x, ty = d.target.y + tgtYOff;
          return `M${sx},${sy}L${tx},${ty}`;
        };
      }
      // step (default)
      return d => {
        const sx = d.source.x, sy = d.source.y + srcYOff;
        const tx = d.target.x, ty = d.target.y + tgtYOff;
        const my = (sy + ty) / 2;
        return `M${sx},${sy}V${my}H${tx}V${ty}`;
      };
    }
  }

  // Pan-only follow: keeps the current zoom scale, translates the minimum amount
  // needed to bring nodeId + its children into the viewport. No-ops if already visible.
  function doPanOnly(rootData, cfg, targetId) {
    if (!mainGroup || !svgEl || !rootData || !targetId) return;
    const isLR = cfg.orientation === 'LR';
    const nw   = cfg.nodeWidth;
    const nh   = _lastNodeH;
    function visibleChildren(d) {
      if (d._collapsed || !d.children) return null;
      return d.children.slice(0, cfg.maxChildrenShown + 1);
    }
    const hier = d3.hierarchy(rootData, visibleChildren);
    d3.tree().nodeSize(
      isLR ? [nh + cfg.siblingSpacing, nw + cfg.levelSpacing]
           : [nw + cfg.siblingSpacing, nh + cfg.levelSpacing]
    )(hier);
    // Must match renderTree's coordinate system — apply the same top-align pass
    if (cfg.initialAlignment === 'top-left' && isLR) topAlignHier(hier, isLR);
    const panNode = hier.descendants().find(n => n.data.id === targetId);
    if (!panNode) return;
    const focusNodes = panNode.children?.length
      ? [panNode, ...panNode.children]
      : [panNode];
    const xs = focusNodes.map(n => isLR ? n.y : n.x);
    const ys = focusNodes.map(n => isLR ? n.x : n.y);
    const pad = 30;
    const x0 = Math.min(...xs) - nw / 2 - pad;
    const y0 = Math.min(...ys) - nh / 2 - pad;
    const x1 = Math.max(...xs) + nw / 2 + pad;
    const y1 = Math.max(...ys) + nh / 2 + pad;
    const k  = currentZoom.k;
    const w  = containerWidth  || 800;
    const h  = containerHeight || 600;
    // No-op if the target bbox is already fully within the viewport
    if (x0 * k + currentZoom.x >= 0 &&
        y0 * k + currentZoom.y >= 0 &&
        x1 * k + currentZoom.x <= w &&
        y1 * k + currentZoom.y <= h) return;
    // Minimum pan: scroll just enough to bring the bbox into view, no more
    let tx = currentZoom.x;
    let ty = currentZoom.y;
    if (x1 * k + tx > w) tx = w - x1 * k;
    if (y1 * k + ty > h) ty = h - y1 * k;
    if (x0 * k + tx < 0) tx = -x0 * k;
    if (y0 * k + ty < 0) ty = -y0 * k;
    // Header collision prevention (mirrors doFitToView)
    if (isLR && colHeaders.length) {
      ty = Math.max(ty, 44 - (y0 + pad) * k);
    } else if (!isLR && colHeaders.length) {
      tx = Math.max(tx, 160 - (x0 + pad) * k);
    }
    d3.select(svgEl)
      .transition('fit').duration(350)
      .call(zoomBehavior.transform, d3.zoomIdentity.translate(tx, ty).scale(k));
  }

  function doFitToView(rootData, cfg, { skipMinScale = false } = {}) {
    if (!mainGroup || !svgEl || !rootData) return;
    if (_suppressNextFit) { _suppressNextFit = false; _lastDrilledNodeId = null; _panToNodeId = null; return; }
    if (_panToNodeId) { const id = _panToNodeId; _panToNodeId = null; doPanOnly(rootData, cfg, id); return; }
    const isLR = cfg.orientation === 'LR';
    const nw = cfg.nodeWidth;
    const nh = _lastNodeH;

    function visibleChildren(d) {
      if (d._collapsed || !d.children) return null;
      return d.children.slice(0, cfg.maxChildrenShown + 1); // +1 to always include (Other)
    }
    const hier = d3.hierarchy(rootData, visibleChildren);
    d3.tree().nodeSize(
      isLR ? [nh + cfg.siblingSpacing, nw + cfg.levelSpacing]
           : [nw + cfg.siblingSpacing, nh + cfg.levelSpacing]
    )(hier);
    if (cfg.initialAlignment === 'top-left' && isLR) topAlignHier(hier, isLR);

    const allNodes = hier.descendants();

    // Smart zoom: when a drill just happened, restrict the bounding box to the
    // drilled parent + its new children so the new level is framed in the viewport.
    let focusNodes = allNodes;
    let usedSmartZoom = false;
    if (cfg.smartZoom && _lastDrilledNodeId) {
      const drilled = allNodes.find(n => n.data.id === _lastDrilledNodeId);
      if (drilled?.children?.length) {
        focusNodes = [drilled, ...drilled.children];
        usedSmartZoom = true;
      }
      _lastDrilledNodeId = null; // consume regardless — avoids stale state
    } else if (_smartZoomToDeepest) {
      // maxChildren +/- with smart zoom: find the deepest expanded node in the
      // live post-update hierarchy (avoids pre/post-update ID mismatch).
      _smartZoomToDeepest = false;
      function findDeepestHier(node, depth = 0) {
        if (!node.children?.length) return null;
        let best = { node, depth };
        for (const child of node.children) {
          const deeper = findDeepestHier(child, depth + 1);
          if (deeper && deeper.depth > best.depth) best = deeper;
        }
        return best;
      }
      const deepest = findDeepestHier(hier);
      if (deepest?.node?.children?.length) {
        focusNodes = [deepest.node, ...deepest.node.children];
        usedSmartZoom = true;
      }
    }

    const xs = focusNodes.map(n => isLR ? n.y : n.x);
    const ys = focusNodes.map(n => isLR ? n.x : n.y);
    const x0 = Math.min(...xs) - nw / 2 - 50;
    const y0 = Math.min(...ys) - nh / 2 - 50;
    const x1 = Math.max(...xs) + nw / 2 + 50;
    const y1 = Math.max(...ys) + nh / 2 + 50;
    const tw = x1 - x0;
    const th = y1 - y0;

    const w = containerWidth  || 800;
    const h = containerHeight || 600;
    // Reserve right-side clearance for the zoom controls panel
    // (position: absolute; right: 16px; ~38px wide = 54px total inset).
    const ZOOM_PANEL_RIGHT = 54;
    const wAvail = w - ZOOM_PANEL_RIGHT;
    // Cap at 1.2 for focused drills to prevent over-zooming on a small set of nodes
    const maxScale = usedSmartZoom ? 1.2 : 0.92;
    // Dynamic minimum: stop zooming out once the viewport shows ~8 children (LR) or
    // ~9 children (TB) in the sibling direction — beyond that, scrollbars take over.
    const siblingSlot = isLR
      ? (nh + (cfg.siblingSpacing ?? 20))
      : (nw + (cfg.siblingSpacing ?? 20));
    const MIN_READABLE_SCALE = isLR
      ? h / (8 * siblingSlot)
      : w / (9 * siblingSlot);

    const naturalScale = Math.min(maxScale, Math.min(wAvail / tw, h / th));
    // skipMinScale: explicit "Fit to view" — show the whole tree regardless of size.
    // Otherwise clamp so auto-fits never zoom out past the readable floor.
    const scale = skipMinScale ? naturalScale : Math.max(MIN_READABLE_SCALE, naturalScale);
    // When scale is clamped (tree too big to fit at readable size), anchor to the
    // top-left so the root node is always visible; scrollbars handle the overflow.
    const scaleClamped = !skipMinScale && naturalScale < MIN_READABLE_SCALE;

    // Smart zoom always centers the focused region; full fit respects alignment setting
    let tx, ty;
    if (usedSmartZoom) {
      tx = (w - tw * scale) / 2 - x0 * scale;
      ty = (h - th * scale) / 2 - y0 * scale;
    } else if (scaleClamped || (cfg.initialAlignment === 'top-left' && isLR)) {
      tx = 40 - x0 * scale;
      ty = 40 - y0 * scale;
    } else {
      tx = (w - tw * scale) / 2 - x0 * scale;
      ty = (h - th * scale) / 2 - y0 * scale;
    }

    // Ensure nodes never render behind the column-header overlay.
    // LR: headers sit at the top (bottom edge ≈ 44px from container top).
    // TB: headers sit at the left (right edge ≈ 160px from container left).
    // y0+50 / x0+50 are the top/left edges of the content bounding box in layout space.
    if (isLR && colHeaders.length) {
      ty = Math.max(ty, 44 - (y0 + 50) * scale);
    } else if (!isLR && colHeaders.length) {
      tx = Math.max(tx, 160 - (x0 + 50) * scale);
    }
    // Safety clamp: ensure rightmost content edge stays clear of the zoom panel.
    tx = Math.min(tx, (w - ZOOM_PANEL_RIGHT) - x1 * scale);

    d3.select(svgEl)
      .transition('fit').duration(350)
      .call(zoomBehavior.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
  }

  // Called when the expand/collapse button is clicked
  function handleExpandClick(event, d) {
    event.stopPropagation();
    doDrillAction(d);
  }

  // Called when the bar area (node group background) is clicked.
  // Selects marks on this worksheet; Tableau's native "Use as Filter" action
  // propagates the selection to other sheets on the dashboard automatically.
  // Also auto-drills the node when a sibling is already expanded at this level
  // (preserves the original one-click expand-to-same-dimension behavior).
  async function handleBarClick(event, d) {
    event.stopPropagation();
    tooltipVisible = false;
    const node = d.data;
    const info = get(selectedNodeInfo);
    const isSameNode = info?.id === node.id;

    if (isSameNode) {
      selectedNodeInfo.set(null);
      statusMessage.set('Selection cleared');
      await clearMarkSelection();
    } else {
      selectedNodeInfo.set({ id: node.id, dimensionPath: node.dimensionPath });
      const label = node.dimensionPath.map(p => p.value).join(' › ');
      try {
        await selectMarksForFilter(node.dimensionPath);
        statusMessage.set(`Filtering: ${label}`);
      } catch (e) {
        console.error('[DecompTree] handleBarClick filter error:', e);
        statusMessage.set(`Filter error — check browser console (F12)`);
      }
    }

    const siblings = d.parent?.data?.children || [];

    if (node._collapsed) {
      // Previously drilled but collapsed by one-at-a-time logic — re-expand it
      // and collapse whichever sibling is currently expanded.
      // Also re-apply the active sibling's full expansion pattern so depth stays
      // in sync (e.g. if Geo1 was drilled to School→SOC2 while Geo2 was collapsed
      // at School only, clicking Geo2 should bring it up to School→SOC2 as well).
      const cfg = get(config);
      const encMap = get(encodingMap);
      const activeSibling = siblings.find(s => s.id !== node.id && s.children?.length > 0 && !s._collapsed);

      if (cfg.smartZoom) {
        _lastDrilledNodeId = node.id; // smart zoom to this re-expanded node + its children
      } else {
        _suppressNextFit = true;      // no smart zoom: keep current pan/zoom
      }
      treeRoot.update(root => {
        const baseNode = { ...node, _collapsed: false };
        const updated = activeSibling
          ? reapplyExpansion(activeSibling, baseNode, encMap, cfg.maxChildrenShown, cfg.excludeNulls)
          : baseNode;
        let r = updateNodeInTree(root, node.id, () => updated);
        for (const sib of siblings) {
          if (sib.id !== node.id && sib.children && !sib._collapsed) {
            r = updateNodeInTree(r, sib.id, n => ({ ...n, _collapsed: true }));
          }
        }
        return r;
      });
    } else if (!node.children) {
      // Un-drilled node: if a sibling is already drilled, replay its full expansion
      // pattern onto this node (EBL-008). Prefer the currently-expanded sibling so
      // the visible drill path is used; fall back to any sibling with children.
      const drilledSibling =
        siblings.find(s => s.id !== node.id && s.children?.length > 0 && !s._collapsed) ||
        siblings.find(s => s.id !== node.id && s.children?.length > 0);
      if (drilledSibling) {
        const cfg = get(config);
        // reapplyExpansion recursively re-drills using the sibling's full dimension path
        const updated = reapplyExpansion(drilledSibling, node, get(encodingMap), cfg.maxChildrenShown, cfg.excludeNulls);
        if (cfg.smartZoom) {
          _lastDrilledNodeId = node.id; // signal doFitToView to smart-zoom this node
        } else {
          _panToNodeId = node.id; // pan-only: scroll to show new nodes without rescaling
        }
        treeRoot.update(root => {
          let r = updateNodeInTree(root, node.id, () => updated);
          for (const sib of siblings) {
            if (sib.id !== node.id && sib.children && !sib._collapsed) {
              r = updateNodeInTree(r, sib.id, n => ({ ...n, _collapsed: true }));
            }
          }
          return r;
        });
      }
    }
  }

  function doDrillAction(d) {
    tooltipVisible = false;
    const node = d.data;

    // Helper: collapse expanded siblings (preserves drill state; user can re-expand fast)
    function collapseExpandedSiblings(r, sibs, skipId) {
      for (const sib of sibs) {
        if (sib.id !== skipId && sib.children && !sib._collapsed) {
          r = updateNodeInTree(r, sib.id, n => ({ ...n, _collapsed: true }));
        }
      }
      return r;
    }

    const siblings = d.parent?.data?.children || [];

    if (node.children && !node._collapsed) {
      // Collapse: clear children but keep _drillDimension so we know this node was
      // user-collapsed. When they click + again we show the picker instead of
      // auto-drilling from a sibling. _rows is preserved for fast re-drill.
      const cfg = get(config);
      if (cfg.smartZoom) {
        _lastDrilledNodeId = d.parent?.data?.id ?? d.data.id;
      } else {
        _suppressNextFit = true;
      }
      treeRoot.update(root => updateNodeInTree(root, node.id,
        n => ({ ...n, children: null, _collapsed: false })));

    } else if (node._collapsed) {
      // Re-expand; auto-collapse any currently-expanded siblings for one-at-a-time view.
      // Sync depth with the active sibling so multi-level expansions are preserved.
      const cfg = get(config);
      const encMap = get(encodingMap);
      const activeSibling = siblings.find(s => s.id !== node.id && s.children?.length > 0 && !s._collapsed);

      if (cfg.smartZoom) {
        _lastDrilledNodeId = node.id; // smart zoom to this re-expanded node + its children
      } else {
        _suppressNextFit = true;      // no smart zoom: keep current pan/zoom
      }
      treeRoot.update(root => {
        const baseNode = { ...node, _collapsed: false };
        const updated = activeSibling
          ? reapplyExpansion(activeSibling, baseNode, encMap, cfg.maxChildrenShown, cfg.excludeNulls)
          : baseNode;
        let r = updateNodeInTree(root, node.id, () => updated);
        return collapseExpandedSiblings(r, siblings, node.id);
      });

    } else {
      // No children: either never drilled or user collapsed this node. If
      // _drillDimension is set, the user had collapsed it — always show picker
      // so they can choose a different attribute. Otherwise sibling auto-drill or picker.
      if (node._drillDimension != null) {
        pendingDrillNode.set(node);
        return;
      }
      const drilledSibling =
        siblings.find(s => s.id !== node.id && s.children?.length > 0 && !s._collapsed) ||
        siblings.find(s => s.id !== node.id && s.children?.length > 0);
      if (drilledSibling) {
        const cfg = get(config);
        const encMap = get(encodingMap);
        const updated = reapplyExpansion(drilledSibling, node, encMap, cfg.maxChildrenShown, cfg.excludeNulls);
        if (cfg.smartZoom) {
          _lastDrilledNodeId = node.id;
        } else {
          _panToNodeId = node.id; // pan-only: scroll to show new nodes without rescaling
        }
        treeRoot.update(root => {
          let r = updateNodeInTree(root, node.id, () => updated);
          return collapseExpandedSiblings(r, siblings, node.id);
        });
      } else {
        pendingDrillNode.set(node);
      }
    }
  }

  function handleMouseMove(event, d) {
    tooltipData = d.data;
    tooltipVisible = true;
    const rect = containerEl.getBoundingClientRect();
    tooltipX = event.clientX - rect.left + 14;
    // LR: appear above-right of cursor (clears the bar to the left).
    // TB: appear below-right of cursor, near the + button; existing adjustedX
    //     flips to the left automatically when near the right edge.
    tooltipY = event.clientY - rect.top + ($config.orientation === 'TB' ? 20 : -14);
  }

  function zoomIn() {
    d3.select(svgEl).transition().duration(250).call(zoomBehavior.scaleBy, 1.5);
  }

  function zoomOut() {
    d3.select(svgEl).transition().duration(250).call(zoomBehavior.scaleBy, 1 / 1.5);
  }

  function fitView() {
    const root = get(treeRoot);
    const cfg  = get(config);
    if (root) doFitToView(root, cfg, { skipMinScale: true });
  }

  // Hoisted so increaseMaxChildren / decreaseMaxChildren can use it too.
  function findDeepestDrilled(node, depth = 0) {
    if (!node.children?.length || node._collapsed) return null;
    let best = { id: node.id, depth };
    for (const child of node.children) {
      const deeper = findDeepestDrilled(child, depth + 1);
      if (deeper && deeper.depth > best.depth) best = deeper;
    }
    return best;
  }

  // Find the deepest currently-expanded node and zoom to it + its children.
  function focusCurrentDrill() {
    const root = get(treeRoot);
    const cfg  = get(config);
    if (!root) return;
    const deepest = findDeepestDrilled(root);
    if (deepest) {
      _lastDrilledNodeId = deepest.id;
      doFitToView(root, { ...cfg, smartZoom: true });
    } else {
      doFitToView(root, cfg);
    }
  }

  // Toggle smart zoom on/off.
  // Turning ON also immediately zooms to the current drill level.
  // Turning OFF leaves the view where it is.
  async function increaseMaxChildren() {
    const current = get(config);
    const newVal = Math.min(50, current.maxChildrenShown + 1);
    if (newVal === current.maxChildrenShown) return;
    if (current.smartZoom) _smartZoomToDeepest = true;
    else _suppressNextFit = true;
    await saveConfig({ ...current, maxChildrenShown: newVal });
  }

  async function decreaseMaxChildren() {
    const current = get(config);
    const newVal = Math.max(1, current.maxChildrenShown - 1);
    if (newVal === current.maxChildrenShown) return;
    if (current.smartZoom) _smartZoomToDeepest = true;
    else _suppressNextFit = true;
    await saveConfig({ ...current, maxChildrenShown: newVal });
  }

  async function toggleSmartZoom() {
    const current = get(config);
    _suppressNextFit = true; // suppress the fit triggered by the config change
    await saveConfig({ ...current, smartZoom: !current.smartZoom });
    if (!current.smartZoom) {
      // Was OFF, now ON — zoom to current drill level
      focusCurrentDrill();
    }
  }

  function handleSortToggle(dim) {
    const cfg = get(config);
    _suppressNextFit = true;
    treeRoot.update(root =>
      toggleSortAtDimension(root, dim, $encodingMap, cfg.maxChildrenShown, cfg.excludeNulls)
    );
  }

  // Show the onboarding hint when the root has never been drilled (no children).
  // Automatically disappears when the root is expanded and reappears on collapse/reload.
  $: showDrillHint = !!$treeRoot && !$treeRoot.children?.length;

  // Derive whether the configured background is dark so overlays (col headers,
  // drill hint) can adapt their surface color instead of always being white.
  $: isDarkBg = (() => {
    const hex = ($config.bgColor || '#ffffff').replace('#', '');
    if (hex.length !== 6) return false;
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) < 128;
  })();

  const SCROLLBAR_SIZE = 10;

  $: hContentWidth  = treeBounds ? (treeBounds.x1 - treeBounds.x0) * currentZoom.k : 0;
  $: vContentHeight = treeBounds ? (treeBounds.y1 - treeBounds.y0) * currentZoom.k : 0;
  $: showHScroll = hContentWidth  > containerWidth  + 2;
  $: showVScroll = vContentHeight > containerHeight + 2;

  // Horizontal thumb
  $: hScrollRange = Math.max(1, hContentWidth - containerWidth);
  $: hScrollLeft  = treeBounds
      ? Math.max(0, Math.min(hScrollRange, -(treeBounds.x0 * currentZoom.k + currentZoom.x)))
      : 0;
  $: hThumbWidth  = Math.max(30, containerWidth  * (containerWidth  / hContentWidth));
  $: hThumbLeft   = (containerWidth  - hThumbWidth)  * (hScrollLeft  / hScrollRange);

  // Vertical thumb
  $: vScrollRange = Math.max(1, vContentHeight - containerHeight);
  $: vScrollTop   = treeBounds
      ? Math.max(0, Math.min(vScrollRange, -(treeBounds.y0 * currentZoom.k + currentZoom.y)))
      : 0;
  $: vThumbHeight = Math.max(30, containerHeight * (containerHeight / vContentHeight));
  $: vThumbTop    = (containerHeight - vThumbHeight) * (vScrollTop  / vScrollRange);

  let _sbDragging = null; // 'h' | 'v' | null
  let _sbDragStart = { client: 0, scrollPos: 0 };

  function onSbMousedown(axis, e) {
    e.stopPropagation();
    e.preventDefault();
    _sbDragging = axis;
    _sbDragStart = {
      client: axis === 'h' ? e.clientX : e.clientY,
      scrollPos: axis === 'h' ? hScrollLeft : vScrollTop,
    };
  }

  function onWindowMousemove(e) {
    if (!_sbDragging || !treeBounds) return;
    const k = currentZoom.k;
    if (_sbDragging === 'h') {
      const dx        = e.clientX - _sbDragStart.client;
      const trackW    = containerWidth - hThumbWidth;
      const newScroll = Math.max(0, Math.min(hScrollRange,
                          _sbDragStart.scrollPos + dx * (hScrollRange / Math.max(1, trackW))));
      const newTx = -treeBounds.x0 * k - newScroll;
      zoomBehavior.transform(d3.select(svgEl),
        d3.zoomIdentity.translate(newTx, currentZoom.y).scale(k));
    } else {
      const dy        = e.clientY - _sbDragStart.client;
      const trackH    = containerHeight - vThumbHeight;
      const newScroll = Math.max(0, Math.min(vScrollRange,
                          _sbDragStart.scrollPos + dy * (vScrollRange / Math.max(1, trackH))));
      const newTy = -treeBounds.y0 * k - newScroll;
      zoomBehavior.transform(d3.select(svgEl),
        d3.zoomIdentity.translate(currentZoom.x, newTy).scale(k));
    }
  }

  function onWindowMouseup() {
    _sbDragging = null;
  }

  function handleWindowKeydown(e) {
    if (e.key === 'Escape') { helpOpen = false; exclusionsOpen = false; contextMenuVisible = false; }
  }

  async function handleRemoveExclusion(fieldName, value) {
    await removeExclusionValue(fieldName, value);
    // Panel stays open — list updates reactively when treeRoot refreshes
  }

  function handleDrillSelect(dimName, sortOrder = 'desc') {
    if (!$pendingDrillNode) return;
    const pendingNode = $pendingDrillNode;
    const updated = drillDown(pendingNode, dimName, $encodingMap, $config.maxChildrenShown, $config.excludeNulls, sortOrder);
    if ($config.smartZoom) {
      _lastDrilledNodeId = pendingNode.id; // smart-zoom: rescale + pan to this node
    } else {
      _panToNodeId = pendingNode.id; // pan-only: scroll to show new nodes without rescaling
    }
    treeRoot.update(root => {
      const parent = findParent(root, pendingNode.id);
      const siblings = parent?.children || [];
      let r = updateNodeInTree(root, pendingNode.id, () => updated);
      for (const sib of siblings) {
        if (sib.id !== pendingNode.id && sib.children && !sib._collapsed) {
          r = updateNodeInTree(r, sib.id, n => ({ ...n, _collapsed: true }));
        }
      }
      return r;
    });
    pendingDrillNode.set(null);
  }

  async function handleContextMenuExclude() {
    const node = contextMenuNode;
    contextMenuVisible = false;
    contextMenuNode = null;
    const encMap = get(encodingMap);
    const dimField = (encMap.breakdown || []).find(f => f.name === node._drillDimension);
    const fieldName = dimField?.fieldName || node._drillDimension;
    await applyExcludeFilter(fieldName, node.label);
  }
</script>

<svelte:window
  on:keydown={handleWindowKeydown}
  on:mousemove={onWindowMousemove}
  on:mouseup={onWindowMouseup}
/>

<div
  class="tree-container"
  bind:this={containerEl}
  bind:clientWidth={containerWidth}
  bind:clientHeight={containerHeight}
  style="background: {$config.bgColor};
    --surface-bg:           {isDarkBg ? 'rgba(30,41,59,0.93)'       : 'rgba(255,255,255,0.92)'};
    --surface-bg-solid:     {isDarkBg ? '#1e293b'                   : '#ffffff'};
    --surface-bg-hover:     {isDarkBg ? 'rgba(30,41,59,1)'          : 'rgba(255,255,255,1)'};
    --surface-text:         {isDarkBg ? '#cbd5e1'                   : '#1e293b'};
    --surface-border:       {isDarkBg ? '#475569'                   : '#e2e8f0'};
    --surface-border-hover: {isDarkBg ? '#64748b'                   : '#94a3b8'};
    --color-surface:        {isDarkBg ? '#1e293b'                   : 'var(--color-surface-default, #fff)'};
    --color-bg:             {isDarkBg ? '#0f172a'                   : 'var(--color-bg-default, #f8fafc)'};
    --color-border:         {isDarkBg ? '#334155'                   : 'var(--color-border-default, #e2e8f0)'};
    --color-border-subtle:  {isDarkBg ? '#1e293b'                   : 'var(--color-border-subtle-default, #f1f5f9)'};
    --color-text-primary:   {isDarkBg ? '#f1f5f9'                   : 'var(--color-text-primary-default, #1e293b)'};
    --color-text-secondary: {isDarkBg ? '#94a3b8'                   : 'var(--color-text-secondary-default, #64748b)'};
    --color-text-muted:     {isDarkBg ? '#64748b'                   : 'var(--color-text-muted-default, #94a3b8)'};
    --color-accent-subtle:  {isDarkBg ? 'rgba(74,108,247,0.18)'     : 'var(--color-accent-subtle-default, #eff3ff)'};"
>
  <svg bind:this={svgEl} class="tree-svg"></svg>

  <!-- HTML column headers — follow pan/zoom; top for LR, left for TB -->
  {#each colHeaders as h (h.dim + h.dataMain)}
    {@const sc = h.dataMain * currentZoom.k + (h.isLR ? currentZoom.x : currentZoom.y)}
    {@const style = h.isLR
      ? `left:${sc}px; top:8px; transform:translateX(-50%)`
      : `left:8px; top:${sc}px; transform:translateY(-50%)`}
    <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
    <div class="col-header-overlay" style={style} on:click={() => handleSortToggle(h.dim)}>
      <div class="col-header-title" style="font-size:{$config.headerFontSize ?? 12}px; color:{isDarkBg ? '#94a3b8' : ($config.headerColor || '#334155')}">
        ▸ by {h.dim}
        <span class="sort-arrow">{h.sortOrder === 'asc' ? '↑' : '↓'}</span>
      </div>
    </div>
  {/each}

  <!-- Drill hint — shown when root node has never been expanded -->
  {#if showDrillHint && hintAnchor}
    {@const sx = hintAnchor.tx * currentZoom.k + currentZoom.x}
    {@const sy = hintAnchor.ty * currentZoom.k + currentZoom.y}
    <div class="drill-hint" style="left:{sx}px; top:{sy + 14}px">
      <span>Click</span>
      <svg width="20" height="20" viewBox="0 0 20 20" style="flex-shrink:0; vertical-align:middle">
        <circle cx="10" cy="10" r="10" fill={getActiveColor($config)}/>
        <text x="10" y="15" text-anchor="middle" fill="white" font-size="16" font-weight="700" font-family="system-ui, sans-serif">+</text>
      </svg>
      <span>to drill into an attribute</span>
    </div>
  {/if}

  <!-- Help button + panel — upper right corner -->
  <div class="help-widget">
    {#if activeExclusions.length > 0}
      <div class="excl-widget">
        <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
        <button
          class="excl-pill"
          class:excl-pill--open={exclusionsOpen}
          on:click|stopPropagation={() => { exclusionsOpen = !exclusionsOpen; helpOpen = false; }}
          title="Active exclusions"
          aria-expanded={exclusionsOpen}
        >Excluded ({activeExclusions.length})</button>
        {#if exclusionsOpen}
          <div class="excl-panel" role="dialog" aria-label="Active exclusions">
            <div class="excl-panel-title">Active exclusions</div>
            <ul class="excl-list">
              {#each activeExclusions as excl (excl.fieldName + '|' + excl.value)}
                <li class="excl-item">
                  <span class="excl-item-label" title={excl.fieldName}>{excl.fieldName}: {excl.value}</span>
                  <button class="excl-remove-btn" title="Restore" on:click={() => handleRemoveExclusion(excl.fieldName, excl.value)}>×</button>
                </li>
              {/each}
            </ul>
          </div>
        {/if}
      </div>
    {/if}
    {#if exclusionsOpen}
      <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
      <div class="help-backdrop" on:click={() => exclusionsOpen = false}></div>
    {/if}

    {#if !$config.showHeader}
      <button
        class="help-btn"
        on:click|stopPropagation={() => configPanelOpen.set(true)}
        title="Settings"
        aria-label="Open settings"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
      </button>
    {/if}
    <button
      class="help-btn"
      class:help-btn-open={helpOpen}
      on:click|stopPropagation={() => helpOpen = !helpOpen}
      title={helpOpen ? 'Close help' : 'How to use this visualization'}
      aria-label="Help"
      aria-expanded={helpOpen}
      aria-haspopup="true"
    >?</button>

    {#if helpOpen}
      <div class="help-panel" role="dialog" aria-label="How to use this visualization">

        <h4 class="help-section-title">Exploring the tree</h4>
        <ul class="help-list">
          <li>
            <span class="help-chip">
              <svg width="16" height="16" viewBox="0 0 20 20">
                <circle cx="10" cy="10" r="10" fill={getActiveColor($config)}/>
                <text x="10" y="15" text-anchor="middle" fill="white" font-size="16" font-weight="700" font-family="system-ui">+</text>
              </svg>
            </span>
            Click <strong>+</strong> to drill into a dimension
          </li>
          <li>
            <span class="help-chip">
              <svg width="16" height="16" viewBox="0 0 20 20">
                <circle cx="10" cy="10" r="10" fill="#94a3b8"/>
                <text x="10" y="15" text-anchor="middle" fill="white" font-size="20" font-weight="700" font-family="system-ui">−</text>
              </svg>
            </span>
            Click <strong>−</strong> to collapse a node
          </li>
          <li>
            <span class="help-chip help-chip--bar"></span>
            Click a <strong>bar</strong> to filter other sheets; click again to deselect
          </li>
          <li>
            <span class="help-chip help-chip--header">▸</span>
            Click a <strong>column header</strong> to toggle sort order
          </li>
          <li>
            <span class="help-chip help-chip--ctx">⋮</span>
            <strong>Right-click</strong> a bar to exclude that item from the data
          </li>
        </ul>

        <h4 class="help-section-title" style="margin-top:14px">Zoom panel (bottom right)</h4>
        <ul class="help-list">
          <li>
            <span class="help-chip">
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                <circle cx="6" cy="6" r="5" stroke="currentColor" stroke-width="1.4"/>
                <path d="M6 3.5v5M3.5 6h5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
                <path d="M10 10l2.5 2.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
              </svg>
            </span>
            <strong>Zoom in</strong> — magnify the tree
          </li>
          <li>
            <span class="help-chip">
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                <circle cx="6" cy="6" r="5" stroke="currentColor" stroke-width="1.4"/>
                <path d="M3.5 6h5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
                <path d="M10 10l2.5 2.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
              </svg>
            </span>
            <strong>Zoom out</strong> — see more of the tree
          </li>
          <li>
            <span class="help-chip">
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                <path d="M1 4V1h3M10 1h3v3M13 10v3h-3M4 13H1v-3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </span>
            <strong>Fit to view</strong> — reset zoom to show all nodes
          </li>
          <li>
            <span class="help-chip">
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="2.5" stroke="currentColor" stroke-width="1.4"/>
                <path d="M7 1v2.5M7 8.5v4.5M1 7h2.5M8.5 7h4.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
              </svg>
            </span>
            <strong>Smart zoom</strong> — rescales to new nodes when on; pans only when off
          </li>
          <li>
            <span class="help-chip">
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                <path d="M7 10.5V3.5M3.5 6.5L7 3l3.5 3.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </span>
            <strong>More children</strong> — show more groups per level (+1)
          </li>
          <li>
            <span class="help-chip">
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                <path d="M7 3.5v7M3.5 7.5L7 11l3.5-3.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </span>
            <strong>Fewer children</strong> — show fewer groups per level (−1)
          </li>
        </ul>

      </div>
    {/if}
  </div>

  {#if helpOpen}
    <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
    <div class="help-backdrop" on:click={() => helpOpen = false}></div>
  {/if}

  <!-- Zoom controls -->
  <div class="zoom-controls">
    <button class="zoom-btn" on:click={zoomIn}  title="Zoom in"     aria-label="Zoom in">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="6" cy="6" r="5" stroke="currentColor" stroke-width="1.4"/>
        <path d="M6 3.5v5M3.5 6h5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
        <path d="M10 10l2.5 2.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
      </svg>
    </button>
    <button class="zoom-btn zoom-btn-fit" on:click={fitView} title="Fit to view" aria-label="Fit to view">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M1 4V1h3M10 1h3v3M13 10v3h-3M4 13H1v-3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
    <button class="zoom-btn" on:click={zoomOut} title="Zoom out"    aria-label="Zoom out">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="6" cy="6" r="5" stroke="currentColor" stroke-width="1.4"/>
        <path d="M3.5 6h5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
        <path d="M10 10l2.5 2.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
      </svg>
    </button>
    <button
      class="zoom-btn zoom-btn-smart"
      class:smart-on={$config.smartZoom}
      on:click={toggleSmartZoom}
      title={$config.smartZoom ? 'Smart zoom: on — click to disable' : 'Smart zoom: off — click to enable'}
      aria-label="Toggle smart zoom"
      aria-pressed={$config.smartZoom}
    >
      <!-- Crosshair / focus icon -->
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="2.5" stroke="currentColor" stroke-width="1.4"/>
        <path d="M7 1v2.5M7 8.5v4.5M1 7h2.5M8.5 7h4.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
      </svg>
    </button>

    <!-- Max children control -->
    <div class="zoom-children-group">
      <button
        class="zoom-btn zoom-btn-children-up"
        on:click={increaseMaxChildren}
        title="Show more children per node (currently {$config.maxChildrenShown})"
        aria-label="Show more children per node"
        disabled={$config.maxChildrenShown >= 50}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M7 10.5V3.5M3.5 6.5L7 3l3.5 3.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
      <div class="zoom-children-count" title="Max children shown per node">
        <span class="zoom-children-num">{$config.maxChildrenShown}</span>
        <span class="zoom-children-label">max</span>
      </div>
      <button
        class="zoom-btn zoom-btn-children-down"
        on:click={decreaseMaxChildren}
        title="Show fewer children per node (currently {$config.maxChildrenShown})"
        aria-label="Show fewer children per node"
        disabled={$config.maxChildrenShown <= 1}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M7 3.5v7M3.5 7.5L7 11l3.5-3.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </div>
  </div>

  {#if tooltipVisible && tooltipData}
    <Tooltip x={tooltipX} y={tooltipY} data={tooltipData} />
  {/if}

  {#if contextMenuVisible && contextMenuNode}
    <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
    <div class="context-backdrop" on:click={() => { contextMenuVisible = false; }}></div>
    <div class="context-menu" style="left: {contextMenuX}px; top: {contextMenuY}px">
      <button class="context-menu-item context-menu-item--danger" on:click={handleContextMenuExclude}>
        Exclude this item
      </button>
    </div>
  {/if}

  {#if showHScroll}
    <div class="sb-track sb-h" style="right:{showVScroll ? SCROLLBAR_SIZE : 0}px">
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <div
        class="sb-thumb"
        class:sb-thumb-active={_sbDragging === 'h'}
        style="width:{hThumbWidth}px; left:{hThumbLeft}px"
        on:mousedown={e => onSbMousedown('h', e)}
      ></div>
    </div>
  {/if}

  {#if showVScroll}
    <div class="sb-track sb-v" style="bottom:{showHScroll ? SCROLLBAR_SIZE : 0}px">
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <div
        class="sb-thumb"
        class:sb-thumb-active={_sbDragging === 'v'}
        style="height:{vThumbHeight}px; top:{vThumbTop}px"
        on:mousedown={e => onSbMousedown('v', e)}
      ></div>
    </div>
  {/if}
</div>

{#if $pendingDrillNode}
  <DimensionPicker
    node={$pendingDrillNode}
    onSelect={handleDrillSelect}
    onClose={() => pendingDrillNode.set(null)}
  />
{/if}

<style>
  .tree-container {
    width: 100%;
    height: 100%;
    position: relative;
    overflow: hidden;
    background: var(--color-bg-viz);
  }
  .tree-svg {
    display: block;
    width: 100%;
    height: 100%;
  }

  .zoom-controls {
    position: absolute;
    bottom: 16px;
    right: 16px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    background: var(--color-surface, #fff);
    border: 1px solid var(--color-border, #e2e8f0);
    border-radius: 8px;
    padding: 3px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.10);
    z-index: 10;
  }

  .zoom-btn {
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 5px;
    color: var(--color-text-secondary, #64748b);
    background: transparent;
    transition: background 0.12s, color 0.12s;
    cursor: pointer;
  }

  .zoom-btn:hover {
    background: var(--color-accent-subtle, #eff3ff);
    color: var(--color-accent, #4a6cf7);
  }

  .zoom-btn-fit {
    border-top: 1px solid var(--color-border-subtle, #f1f5f9);
    border-bottom: 1px solid var(--color-border-subtle, #f1f5f9);
    border-radius: 0;
  }

  .zoom-btn-smart {
    border-top: 1px solid var(--color-border-subtle, #f1f5f9);
    border-radius: 0;
  }

  .zoom-btn-smart.smart-on {
    color: var(--color-accent, #4a6cf7);
    background: var(--color-accent-subtle, #eff3ff);
  }

  /* Max children control */
  .zoom-children-group {
    border-top: 1px solid var(--color-border-subtle, #f1f5f9);
    display: flex;
    flex-direction: column;
    align-items: stretch;
    background: var(--color-accent-subtle, #eff3ff);
    border-radius: 0 0 5px 5px;
    overflow: hidden;
  }

  .zoom-children-group .zoom-btn {
    color: var(--color-accent, #4a6cf7);
  }

  .zoom-children-group .zoom-btn:hover {
    background: rgba(74, 108, 247, 0.15);
  }

  .zoom-btn-children-up:disabled,
  .zoom-btn-children-down:disabled {
    opacity: 0.3;
    cursor: default;
  }

  .zoom-children-count {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4px 0 2px;
    gap: 1px;
    user-select: none;
    cursor: default;
  }

  .zoom-children-num {
    font-size: 15px;
    font-weight: 700;
    font-family: var(--font-mono, monospace);
    color: var(--color-accent, #4a6cf7);
    line-height: 1;
  }

  .zoom-children-label {
    font-size: 8px;
    font-weight: 600;
    color: var(--color-accent, #4a6cf7);
    opacity: 0.65;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    line-height: 1;
  }


  /* Column headers — HTML overlay; position/transform set inline per orientation */
  .col-header-overlay {
    position: absolute;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    z-index: 5;
    cursor: pointer;
  }

  .col-header-title {
    display: flex;
    align-items: center;
    gap: 5px;
    font-weight: 600;
    background: var(--surface-bg);
    padding: 3px 9px;
    border-radius: 5px;
    white-space: nowrap;
    border: 1px solid var(--surface-border);
    backdrop-filter: blur(4px);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.07);
    transition: background 0.15s, border-color 0.15s;
    user-select: none;
  }

  .col-header-overlay:hover .col-header-title {
    background: var(--surface-bg-hover);
    border-color: var(--surface-border-hover);
  }

  .sort-arrow {
    font-size: 11px;
    color: #64748b;
    font-weight: 700;
  }

  /* Drill hint callout */
  .drill-hint {
    position: absolute;
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--surface-bg-solid);
    color: var(--surface-text);
    border: 1px solid var(--surface-border);
    border-radius: 10px;
    padding: 11px 18px;
    font-size: 14px;
    font-weight: 500;
    white-space: nowrap;
    pointer-events: none;
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
    transform: translateX(-50%);
    z-index: 8;
    animation: hint-pop 0.35s cubic-bezier(0.22, 1, 0.36, 1);
  }

  /* Bordered upward-pointing triangle: ::before = border layer, ::after = fill layer */
  .drill-hint::before {
    content: '';
    position: absolute;
    top: -10px;
    left: 50%;
    transform: translateX(-50%);
    border-width: 0 10px 10px 10px;
    border-style: solid;
    border-color: transparent transparent var(--surface-border) transparent;
  }

  .drill-hint::after {
    content: '';
    position: absolute;
    top: -8px;
    left: 50%;
    transform: translateX(-50%);
    border-width: 0 9px 9px 9px;
    border-style: solid;
    border-color: transparent transparent var(--surface-bg-solid) transparent;
  }

  @keyframes hint-pop {
    from { opacity: 0; transform: translateX(-50%) translateY(6px); }
    to   { opacity: 1; transform: translateX(-50%) translateY(0);   }
  }

  /* ── Help widget ──────────────────────────────────────────────────── */
  .help-widget {
    position: absolute;
    top: 16px;
    right: 16px;
    z-index: 20;
    display: flex;
    gap: 6px;
  }

  .help-btn {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: var(--color-surface, #fff);
    border: 1px solid var(--color-border, #e2e8f0);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.10);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: 700;
    color: var(--color-text-secondary, #64748b);
    cursor: pointer;
    transition: background 0.12s, color 0.12s, box-shadow 0.12s;
    line-height: 1;
    padding: 0;
  }

  .help-btn:hover,
  .help-btn.help-btn-open {
    background: var(--color-accent-subtle, #eff3ff);
    color: var(--color-accent, #4a6cf7);
    box-shadow: 0 2px 8px rgba(74, 108, 247, 0.18);
  }

  .help-panel {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    width: 500px;
    background: var(--color-surface, #fff);
    border: 1px solid var(--color-border, #e2e8f0);
    border-radius: 10px;
    box-shadow: 0 6px 24px rgba(0, 0, 0, 0.13);
    padding: 14px 16px 16px;
    z-index: 21;
    animation: help-in 0.2s cubic-bezier(0.22, 1, 0.36, 1);
  }

  @keyframes help-in {
    from { opacity: 0; transform: translateY(-6px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .help-section-title {
    font-size: 10px;
    font-weight: 700;
    color: var(--color-text-primary, #1e293b);
    text-transform: uppercase;
    letter-spacing: 0.07em;
    margin-bottom: 8px;
  }

  .help-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 7px;
  }

  .help-list li {
    display: flex;
    align-items: flex-start;
    gap: 6px;
    font-size: 12px;
    line-height: 1.4;
    color: var(--color-text-secondary, #64748b);
  }

  .help-list li strong {
    color: var(--color-text-primary, #1e293b);
    font-weight: 600;
  }

  .help-chip {
    flex-shrink: 0;
    width: 22px;
    height: 22px;
    border-radius: 5px;
    background: var(--color-border-subtle, #f1f5f9);
    border: 1px solid var(--color-border, #e2e8f0);
    color: var(--color-text-secondary, #64748b);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 600;
  }

  .help-chip--bar {
    background: linear-gradient(90deg, var(--color-accent) 52%, var(--color-border) 52%);
    border-color: var(--color-accent-subtle);
  }

  .help-chip--header {
    background: var(--color-surface);
    color: var(--color-text-primary);
    font-size: 10px;
  }

  .help-chip--ctx {
    background: var(--color-surface);
    color: var(--color-text-secondary);
    font-size: 14px;
    letter-spacing: -1px;
  }

  /* ── Exclusions widget ────────────────────────────────────────────── */
  .excl-widget {
    position: relative;
  }

  .excl-pill {
    height: 28px;
    padding: 0 10px;
    border-radius: 14px;
    background: #fef2f2;
    border: 1px solid #fca5a5;
    color: #dc2626;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    transition: background 0.12s, box-shadow 0.12s;
    line-height: 1;
  }

  .excl-pill:hover,
  .excl-pill--open {
    background: #dc2626;
    color: #fff;
    border-color: #dc2626;
  }

  .excl-panel {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    min-width: 220px;
    max-width: 300px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 10px;
    box-shadow: 0 6px 24px rgba(0,0,0,0.13);
    padding: 10px 12px;
    z-index: 21;
    animation: help-in 0.2s cubic-bezier(0.22, 1, 0.36, 1);
  }

  .excl-panel-title {
    font-size: 10px;
    font-weight: 700;
    color: var(--color-text-primary);
    text-transform: uppercase;
    letter-spacing: 0.07em;
    margin-bottom: 8px;
  }

  .excl-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .excl-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 4px 2px;
    border-top: 1px solid var(--color-border-subtle);
  }

  .excl-item:first-child {
    border-top: none;
  }

  .excl-item-label {
    font-size: 12px;
    color: var(--color-text-primary);
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .excl-remove-btn {
    flex-shrink: 0;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: 1px solid var(--color-border);
    border-radius: 50%;
    font-size: 14px;
    line-height: 1;
    color: var(--color-text-secondary);
    cursor: pointer;
    transition: background 0.1s, border-color 0.1s, color 0.1s;
  }

  .excl-remove-btn:hover {
    background: #fef2f2;
    border-color: #fca5a5;
    color: #dc2626;
  }

  .help-backdrop {
    position: absolute;
    inset: 0;
    z-index: 19;
  }

  .context-backdrop {
    position: absolute;
    inset: 0;
    z-index: 29;
  }

  .context-menu {
    position: absolute;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-xl);
    padding: 4px;
    z-index: 30;
    min-width: 160px;
    animation: help-in 0.12s cubic-bezier(0.22, 1, 0.36, 1);
  }

  .context-menu-item {
    display: block;
    width: 100%;
    padding: 6px 10px;
    background: none;
    border: none;
    border-radius: var(--radius-sm);
    font-size: var(--text-sm);
    cursor: pointer;
    text-align: left;
    transition: background 0.1s;
  }

  .context-menu-item--danger {
    color: #dc2626;
  }

  .context-menu-item--danger:hover {
    background: #fef2f2;
  }

  /* ── Scrollbars ───────────────────────────────────────────────── */
  .sb-track {
    position: absolute;
    background: rgba(0, 0, 0, 0.04);
    border-radius: 5px;
    z-index: 5;
  }
  .sb-h {
    bottom: 0;
    left: 0;
    height: 10px;
  }
  .sb-v {
    right: 0;
    top: 0;
    width: 10px;
  }
  .sb-thumb {
    position: absolute;
    background: rgba(100, 116, 139, 0.35);
    border-radius: 5px;
    cursor: grab;
    transition: background 0.15s;
  }
  .sb-thumb:hover,
  .sb-thumb-active {
    background: rgba(100, 116, 139, 0.6);
    cursor: grabbing;
  }
  .sb-h .sb-thumb { top: 1px; bottom: 1px; }
  .sb-v .sb-thumb { left: 1px; right: 1px; }

</style>
