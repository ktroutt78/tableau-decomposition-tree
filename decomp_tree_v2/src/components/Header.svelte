<script>
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { treeRoot, statusMessage, configPanelOpen, resolvedMeasureDisplayName, exportPngCallback } from '../stores/treeState.js';
  import { config } from '../stores/config.js';
  import { encodingMap } from '../stores/encodings.js';
  import { reloadData, saveExpansionState, clearExpansionState } from '../lib/tableau.js';
  import { getDeepestExpandedNode, serializeExpansion } from '../lib/treeEngine.js';

  async function reload() {
    await reloadData();
  }

  // ── Fullscreen ──────────────────────────────────────────────────────────────
  let isFullscreen = false;

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }

  // ── Save PNG ─────────────────────────────────────────────────────────────────
  function savePng() {
    const fn = get(exportPngCallback);
    if (fn) fn();
  }

  onMount(() => {
    const handler = () => { isFullscreen = !!document.fullscreenElement; };
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  });

  async function saveState() {
    const root = $treeRoot;
    if (!root?.children?.length) {
      statusMessage.set('Nothing to save — drill into the tree first');
      return;
    }
    const recipe = serializeExpansion(root);
    if (!recipe) return;
    const ok = await saveExpansionState(recipe);
    statusMessage.set(ok ? 'State saved' : 'Could not save state');
  }

  async function clearSavedState() {
    await clearExpansionState();
    statusMessage.set('Saved state cleared');
  }

  $: breadcrumb = (() => {
    const root = $treeRoot;
    if (!root?.children?.length) return null;
    const deepest = getDeepestExpandedNode(root);
    const segments = (deepest.dimensionPath || []).map(
      ({ field, value }) => `by ${field}: ${value}`
    );
    const lastDim = deepest.children?.[0]?._drillDimension;
    if (lastDim) segments.push(`by ${lastDim}`);
    return segments.length ? segments.join(' > ') : null;
  })();

  // When no drill path, show Ready + resolved measure name (alias) so breadcrumb updates when alias changes
  $: defaultStatus =
    $treeRoot && !breadcrumb
      ? `Ready — ${$resolvedMeasureDisplayName || 'Value'} | ${($encodingMap.breakdown || []).length} breakdown dimension${($encodingMap.breakdown || []).length !== 1 ? 's' : ''}`
      : $statusMessage;
</script>

<header class="app-header">
  <div class="header-left">
    {#if $config.showHeaderTitle !== false}
      <div class="logo-mark">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <circle cx="3" cy="9" r="2.5" fill="currentColor" opacity="0.9"/>
          <circle cx="9" cy="4" r="2.5" fill="currentColor" opacity="0.75"/>
          <circle cx="9" cy="14" r="2.5" fill="currentColor" opacity="0.75"/>
          <circle cx="15" cy="2" r="1.8" fill="currentColor" opacity="0.6"/>
          <circle cx="15" cy="9" r="1.8" fill="currentColor" opacity="0.6"/>
          <circle cx="15" cy="16" r="1.8" fill="currentColor" opacity="0.6"/>
          <line x1="5.4" y1="7.6" x2="7" y2="5.4" stroke="currentColor" stroke-width="1.2" stroke-opacity="0.5"/>
          <line x1="5.4" y1="10.4" x2="7" y2="12.6" stroke="currentColor" stroke-width="1.2" stroke-opacity="0.5"/>
          <line x1="11.4" y1="4.2" x2="13.3" y2="2.9" stroke="currentColor" stroke-width="1.2" stroke-opacity="0.4"/>
          <line x1="11.4" y1="9" x2="13.3" y2="9" stroke="currentColor" stroke-width="1.2" stroke-opacity="0.4"/>
          <line x1="11.4" y1="13.8" x2="13.3" y2="15.1" stroke="currentColor" stroke-width="1.2" stroke-opacity="0.4"/>
        </svg>
      </div>
      <span class="app-title">Decomposition Tree</span>
      <span class="header-divider">|</span>
    {/if}
    <span class="status-text" title={breadcrumb || defaultStatus}>{breadcrumb ?? defaultStatus}</span>
  </div>

  <div class="header-right">
    {#if $treeRoot}
      <button class="btn-ghost" on:click={reload} title="Reload data from Tableau">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M2 7C2 4.24 4.24 2 7 2c1.66 0 3.13.82 4.04 2.07" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          <path d="M12 7c0 2.76-2.24 5-5 5a4.99 4.99 0 01-4.04-2.07" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          <path d="M10.5 1.5l1 2.5-2.5.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Reload
      </button>
      <button class="btn-icon-round" on:click={savePng} title="Save tree as PNG" aria-label="Save tree as PNG">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
      </button>
    {/if}
    <button
      class="btn-icon-round"
      on:click={toggleFullscreen}
      title={isFullscreen ? 'Exit full screen' : 'Full screen'}
      aria-label={isFullscreen ? 'Exit full screen' : 'Enter full screen'}
    >
      {#if isFullscreen}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>
        </svg>
      {:else}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
        </svg>
      {/if}
    </button>
    {#if $config.allowSaveExpansionState}
      <button
        class="btn-ghost"
        on:click={saveState}
        title="Save current tree expansion so it restores on reopen"
        disabled={!$treeRoot?.children?.length}
      >
        Save state
      </button>
      <button
        class="btn-ghost"
        on:click={clearSavedState}
        title="Clear saved expansion so next open starts from root"
      >
        Clear saved state
      </button>
    {/if}

    <button
      class="btn-icon-round"
      on:click={() => configPanelOpen.set(true)}
      title="Settings"
      aria-label="Open settings"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    </button>
  </div>
</header>

<style>
  .app-header {
    height: 46px;
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-border);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 var(--space-4);
    flex-shrink: 0;
    z-index: var(--z-header);
    box-shadow: var(--shadow-sm);
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-width: 0;
  }

  .logo-mark {
    color: var(--color-accent);
    display: flex;
    align-items: center;
    flex-shrink: 0;
  }

  .app-title {
    font-size: var(--text-md);
    font-weight: var(--font-semibold);
    color: var(--color-text-primary);
    white-space: nowrap;
  }

  .header-divider {
    color: var(--color-border);
    font-weight: var(--font-normal);
    flex-shrink: 0;
  }

  .status-text {
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    /* Truncate from the left so the current drill dimension (rightmost segment)
       stays visible when the full path is too long to fit */
    direction: rtl;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    flex-shrink: 0;
  }

  .btn-ghost {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    padding: 5px var(--space-3);
    border-radius: var(--radius-md);
    font-size: var(--text-sm);
    font-weight: var(--font-medium);
    color: var(--color-text-secondary);
    background: transparent;
    border: 1px solid var(--color-border);
    transition: all var(--transition-fast);
  }

  .btn-ghost:hover {
    background: var(--color-bg);
    color: var(--color-text-primary);
    border-color: var(--color-text-muted);
  }

  .btn-icon-round {
    width: 32px;
    height: 32px;
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-text-secondary);
    background: transparent;
    border: 1px solid var(--color-border);
    transition: all var(--transition-fast);
  }

  .btn-icon-round:hover {
    background: var(--color-bg);
    color: var(--color-accent);
    border-color: var(--color-accent);
  }
</style>
