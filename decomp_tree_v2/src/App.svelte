<script>
  import { onMount } from 'svelte';
  import { initTableau, loadExpansionState } from './lib/tableau.js';
  import { isReadyToRender } from './stores/encodings.js';
  import { treeRoot, statusMessage, configPanelOpen, summaryRows } from './stores/treeState.js';
  import { encodingMap } from './stores/encodings.js';
  import { buildRootNode, reapplyExpansion, replayExpansion } from './lib/treeEngine.js';
  import { detectValueFormat, resolveMeasureDisplayName } from './lib/formatters.js';
  import { config } from './stores/config.js';
  import { get } from 'svelte/store';

  import Header from './components/Header.svelte';
  import DecompTree from './components/DecompTree.svelte';
  import ConfigPanel from './components/ConfigPanel.svelte';
  import EmptyState from './components/EmptyState.svelte';

  $: isDarkBg = (() => {
    const hex = ($config.bgColor || '#ffffff').replace('#', '');
    if (hex.length !== 6) return false;
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) < 128;
  })();

  $: shellStyle = isDarkBg
    ? `--color-surface:#1e293b; --color-bg:#0f172a; --color-border:#334155;
       --color-border-subtle:#1e293b; --color-text-primary:#f1f5f9;
       --color-text-secondary:#94a3b8; --color-text-muted:#64748b;
       --color-accent-subtle:rgba(74,108,247,0.18);`
    : '';

  let _prevValueName = null;

  function onDataReady(encMap, rows, { forceReset = true } = {}) {
    const newValueName = encMap.value?.[0]?.name ?? null;
    const measureChanged = newValueName !== _prevValueName;

    // Auto-detect Tableau's native value format
    if (get(config).valueFormat === 'auto') {
      const detected = detectValueFormat(rows, encMap.value?.[0]);
      config.update(c => ({ ...c, tableauDetectedFormat: detected ?? null }));
    }

    // Always auto-strip aggregation prefix (e.g. "SUM(Sales)" → "Sales") when the
    // measure loads or changes. A saved alias may be stale (from a different measure),
    // so we always reset it to match the current field.
    if (measureChanged && newValueName) {
      const isInitialLoad = _prevValueName === null;
      const savedAlias = get(config).measureAlias?.trim();
      if (!isInitialLoad || !savedAlias) {
        const stripped = newValueName.replace(/^[A-Z_]+\((.+)\)$/, '$1');
        config.update(c => ({ ...c, measureAlias: stripped !== newValueName ? stripped : '' }));
      }
    }

    _prevValueName = newValueName;

    const freshRoot = buildRootNode(rows, encMap);

    if (!forceReset) {
      // Preserve expansion: replay drill operations on the fresh data
      const existingRoot = get(treeRoot);
      if (existingRoot && freshRoot) {
        treeRoot.set(reapplyExpansion(existingRoot, freshRoot, encMap, get(config).maxChildrenShown, get(config).excludeNulls));
      } else {
        treeRoot.set(freshRoot);
      }
    } else {
      const recipe = loadExpansionState();
      const cfg = get(config);
      if (recipe && freshRoot) {
        const restored = replayExpansion(freshRoot, recipe, encMap, cfg.maxChildrenShown, cfg.excludeNulls);
        treeRoot.set(restored);
      } else {
        treeRoot.set(freshRoot);
      }
    }

    const root = get(treeRoot);
    if (root) {
      const dims = (encMap.breakdown || []).length;
      const displayName = resolveMeasureDisplayName(get(config).measureAlias, rows, newValueName ?? 'Value');
      const valName = displayName || (newValueName ?? '(none)');
      statusMessage.set(`Ready — ${valName} | ${dims} breakdown dimension${dims !== 1 ? 's' : ''}`);
    } else {
      statusMessage.set('Drop a measure onto the Measure shelf to begin');
    }
  }

  onMount(() => {
    initTableau(onDataReady);

    // When maxChildrenShown or excludeNulls changes (user saves Settings),
    // re-drill the existing tree so the update applies immediately without
    // requiring a collapse/expand cycle.
    let _prevMax = null;
    let _prevExcludeNulls = null;
    const unsubConfig = config.subscribe(cfg => {
      const maxChanged = _prevMax !== null && cfg.maxChildrenShown !== _prevMax;
      const nullsChanged = _prevExcludeNulls !== null && cfg.excludeNulls !== _prevExcludeNulls;
      if (maxChanged || nullsChanged) {
        const root = get(treeRoot);
        const encMap = get(encodingMap);
        if (root && root._rows) {
          const freshRoot = buildRootNode(root._rows, encMap);
          treeRoot.set(reapplyExpansion(root, freshRoot, encMap, cfg.maxChildrenShown, cfg.excludeNulls));
        }
      }
      _prevMax = cfg.maxChildrenShown;
      _prevExcludeNulls = cfg.excludeNulls;
    });

    return () => unsubConfig();
  });
</script>

<div class="app-shell" style={shellStyle}>
  {#if $config.showHeader}<Header />{/if}

  {#if !$config.showHeader}
    <button
      class="floating-settings"
      on:click={() => configPanelOpen.set(true)}
      title="Settings"
      aria-label="Open settings"
    >
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="2.5" stroke="currentColor" stroke-width="1.5"/>
        <path d="M8 1v1.5M8 13.5V15M15 8h-1.5M2.5 8H1M12.36 3.64l-1.06 1.06M4.7 11.3l-1.06 1.06M12.36 12.36l-1.06-1.06M4.7 4.7L3.64 3.64"
          stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    </button>
  {/if}

  <main class="viz-area">
    {#if $isReadyToRender && $treeRoot}
      <DecompTree />
    {:else}
      <EmptyState />
    {/if}
  </main>

  {#if $configPanelOpen}
    <ConfigPanel />
  {/if}
</div>

<style>
  .app-shell {
    width: 100vw;
    height: 100vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: var(--color-bg);
  }

  .viz-area {
    flex: 1;
    position: relative;
    overflow: hidden;
    min-height: 0;
  }

  .floating-settings {
    position: absolute;
    top: 8px;
    right: 8px;
    z-index: var(--z-header);
    width: 28px;
    height: 28px;
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-text-secondary);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    opacity: 0.35;
    transition: opacity var(--transition-fast);
    cursor: pointer;
  }

  .floating-settings:hover {
    opacity: 1;
    color: var(--color-accent);
    border-color: var(--color-accent);
  }
</style>
