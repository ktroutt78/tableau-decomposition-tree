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

  let initialized = false;
  let _prevValueName = null;

  function onDataReady(encMap, rows, { forceReset = true } = {}) {
    // Only mark initialized when Tableau has returned a valid measure encoding.
    // On dashboards, getVisualSpecificationAsync may return empty on the first
    // call (timing artifact), causing EmptyState to flash before SummaryDataChanged
    // fires with real data. Keep showing the spinner until a non-empty encMap arrives.
    // The fallback timer in onMount ensures genuinely unconfigured sheets
    // still reach EmptyState after 5 seconds.
    if (encMap.value?.length > 0) {
      initialized = true;
    }
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

    // Fallback: if no valid encoding arrives within 5s (genuinely unconfigured
    // extension with no SummaryDataChanged event), show the setup screen.
    const initFallback = setTimeout(() => {
      if (!initialized) initialized = true;
    }, 5000);

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

    return () => { unsubConfig(); clearTimeout(initFallback); };
  });
</script>

<div class="app-shell" style={shellStyle}>
  {#if $config.showHeader}<Header />{/if}

  <main class="viz-area">
    {#if $isReadyToRender && $treeRoot}
      <DecompTree />
    {:else if !initialized || $isReadyToRender}
      <div class="loading-state">
        <svg class="spinner" width="32" height="32" viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="12" stroke="var(--color-border)" stroke-width="3"/>
          <path d="M16 4a12 12 0 0 1 12 12" stroke="var(--color-accent)" stroke-width="3" stroke-linecap="round"/>
        </svg>
        <span>Loading tree…</span>
      </div>
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

  .loading-state {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-3);
    color: var(--color-text-muted);
    font-size: var(--text-sm);
  }

  .spinner {
    animation: spin 0.9s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
</style>
