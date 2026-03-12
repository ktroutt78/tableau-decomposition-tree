<script>
  import { config, defaultConfig, saveConfig } from '../stores/config.js';
  import { configPanelOpen } from '../stores/treeState.js';

  let draft = { ...defaultConfig, ...$config };
  let activeTab = 'style';

  const colorThemes = [
    { id: 'cobalt',      label: 'Cobalt',      start: '#93C5FD', end: '#1D4ED8' },
    { id: 'ember',      label: 'Ember',       start: '#FDBA74', end: '#C94B1E' },
    { id: 'ultraviolet', label: 'Ultraviolet', start: '#C4B5FD', end: '#5B21B6' },
    { id: 'sage',       label: 'Sage',        start: '#6EE7B7', end: '#3D6B52' },
    { id: 'slate',      label: 'Slate',       start: '#94A3B8', end: '#334155' },
    { id: 'custom',     label: 'Custom',      start: '#1e3a5f', middle: '#e2522a', end: '#f7c074' }
  ];

  let saveTimer;
  function debouncedSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => saveConfig({ ...draft }), 350);
  }

  function close() {
    configPanelOpen.set(false);
  }

  function resetToDefaults() {
    draft = { ...defaultConfig };
    saveConfig({ ...draft });
  }

  function handleKey(e) {
    if (e.key === 'Escape') close();
  }
</script>

<svelte:window on:keydown={handleKey} />

<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
<div class="drawer-backdrop" on:click={close}></div>

<div class="config-drawer" role="dialog" aria-modal="true" aria-label="Visualization Settings">
  <!-- Header -->
  <div class="drawer-header">
    <div class="drawer-header-left">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="settings-icon">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
      <h2>Settings</h2>
    </div>
    <button class="drawer-close" on:click={close} aria-label="Close settings">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      </svg>
    </button>
  </div>

  <!-- Tabs -->
  <div class="tab-bar">
    <button class="tab-btn" class:active={activeTab === 'style'}   on:click={() => activeTab = 'style'}>Style</button>
    <button class="tab-btn" class:active={activeTab === 'layout'}  on:click={() => activeTab = 'layout'}>Layout</button>
    <button class="tab-btn" class:active={activeTab === 'settings'} on:click={() => activeTab = 'settings'}>Settings</button>
  </div>

  <!-- Scrollable body -->
  <div class="drawer-body">

    <!-- ══ STYLE TAB ══════════════════════════════════════════════ -->
    {#if activeTab === 'style'}

      <!-- Color Theme -->
      <section class="config-section">
        <h3 class="section-title">Color Theme</h3>
        <div class="theme-grid">
          {#each colorThemes as theme}
            <button
              class="theme-swatch"
              class:active={draft.colorTheme === theme.id}
              title={theme.label}
              on:click={() => { draft.colorTheme = theme.id; debouncedSave(); }}
              style={theme.id !== 'custom'
                ? `background: linear-gradient(135deg, ${theme.start}, ${theme.end})`
                : `background: linear-gradient(135deg, ${theme.start}, ${theme.middle}, ${theme.end})`}
            >
              {#if draft.colorTheme === theme.id}
                <svg width="12" height="12" viewBox="0 0 12 12">
                  <path d="M2 6l3 3 5-5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                </svg>
              {/if}
              <span class="swatch-label">{theme.label}</span>
            </button>
          {/each}
        </div>

        {#if draft.colorTheme === 'custom'}
          <div class="custom-colors">
            <label class="color-picker-label">
              <span>Start color</span>
              <div class="color-pick-row">
                <input type="color" bind:value={draft.customColorStart} on:input={debouncedSave} class="color-input" />
                <span class="color-hex">{draft.customColorStart}</span>
              </div>
            </label>
            <label class="color-picker-label">
              <span>Middle color</span>
              <div class="color-pick-row">
                <input type="color" bind:value={draft.customColorMiddle} on:input={debouncedSave} class="color-input" />
                <span class="color-hex">{draft.customColorMiddle}</span>
              </div>
            </label>
            <label class="color-picker-label">
              <span>End color</span>
              <div class="color-pick-row">
                <input type="color" bind:value={draft.customColorEnd} on:input={debouncedSave} class="color-input" />
                <span class="color-hex">{draft.customColorEnd}</span>
              </div>
            </label>
          </div>
        {/if}

        <label class="toggle-row" style="margin-top: var(--space-3)">
          <span class="toggle-label">Apply gradient to bars</span>
          <button
            class="toggle-btn"
            class:on={draft.useGradient}
            on:click={() => { draft.useGradient = !draft.useGradient; debouncedSave(); }}
            role="switch"
            aria-label="Apply gradient to bars"
            aria-checked={draft.useGradient}
          ><span class="toggle-thumb"></span></button>
        </label>

        <label class="color-picker-label" style="margin-top: var(--space-3)">
          <span class="field-label" style="margin-bottom:0">Negative value color</span>
          <div class="color-pick-row">
            <input type="color" bind:value={draft.negativeColor} on:input={debouncedSave} class="color-input" />
            <span class="color-hex">{draft.negativeColor}</span>
          </div>
        </label>
        <span class="field-hint">Used for negative bars and connector lines.</span>

        <label class="color-picker-label" style="margin-top: var(--space-3)">
          <span class="field-label" style="margin-bottom:0">Background color</span>
          <div class="color-pick-row">
            <input type="color" bind:value={draft.bgColor} on:input={debouncedSave} class="color-input" />
            <span class="color-hex">{draft.bgColor}</span>
          </div>
        </label>
      </section>

      <!-- Labels -->
      <section class="config-section">
        <h3 class="section-title">Labels</h3>

        <div class="field-group">
          <span class="field-label">Font family</span>
          <div class="seg-control" role="group" aria-label="Font family">
            {#each [['system','System'],['serif','Serif'],['mono','Mono']] as [val, label]}
              <button class="seg-btn seg-btn-sm" class:active={draft.fontFamily === val} on:click={() => { draft.fontFamily = val; debouncedSave(); }}>{label}</button>
            {/each}
          </div>
        </div>

        <div class="field-group">
          <span class="field-label">Show</span>
          <div class="seg-control" role="group" aria-label="Show">
            {#each [['both','Value & %'],['value','Value only'],['percent','% only']] as [val, label]}
              <button class="seg-btn seg-btn-sm" class:active={draft.labelMode === val} on:click={() => { draft.labelMode = val; debouncedSave(); }}>{label}</button>
            {/each}
          </div>
        </div>

        <label class="toggle-row">
          <span class="toggle-label">Show measure name</span>
          <button class="toggle-btn" class:on={draft.showMeasureName} on:click={() => { draft.showMeasureName = !draft.showMeasureName; debouncedSave(); }} role="switch" aria-checked={draft.showMeasureName}><span class="toggle-thumb"></span></button>
        </label>

        <label class="toggle-row">
          <span class="toggle-label">Show group count</span>
          <button class="toggle-btn" class:on={draft.showGroupCount} on:click={() => { draft.showGroupCount = !draft.showGroupCount; debouncedSave(); }} role="switch" aria-checked={draft.showGroupCount}><span class="toggle-thumb"></span></button>
        </label>

        <div class="label-row">
          <span class="label-row-name">Heading</span>
          <input id="fontSize" type="number" min="10" max="22" bind:value={draft.fontSize} on:change={debouncedSave} class="num-input-sm" />
          <input type="color" bind:value={draft.headingColor} on:input={debouncedSave} class="color-input" />
        </div>
        <div class="label-row">
          <span class="label-row-name">Subhead</span>
          <input id="subFontSize" type="number" min="9" max="22" bind:value={draft.subFontSize} on:change={debouncedSave} class="num-input-sm" />
          <input type="color" bind:value={draft.subheadingColor} on:input={debouncedSave} class="color-input" />
        </div>
      </section>

      <!-- Column Headers -->
      <section class="config-section">
        <h3 class="section-title">Column Headers</h3>
        <div class="label-row">
          <span class="label-row-name">Headers</span>
          <input id="headerFontSize" type="number" min="9" max="20" bind:value={draft.headerFontSize} on:change={debouncedSave} class="num-input-sm" />
          <input type="color" bind:value={draft.headerColor} on:input={debouncedSave} class="color-input" />
        </div>
      </section>

      <!-- Shape -->
      <section class="config-section">
        <h3 class="section-title">Shape</h3>
        <div class="two-col">
          <label class="color-picker-label">
            <span>Node radius</span>
            <input id="cornerRadius" type="number" min="0" max="24" bind:value={draft.cornerRadius} on:change={debouncedSave} class="num-input-sm" />
          </label>
          <label class="color-picker-label">
            <span>Bar radius</span>
            <input id="barRadius" type="number" min="0" max="24" bind:value={draft.barRadius} on:change={debouncedSave} class="num-input-sm" />
          </label>
        </div>
      </section>

      <!-- Connectors -->
      <section class="config-section">
        <h3 class="section-title">Connectors</h3>

        <div class="field-group">
          <span class="field-label">Style</span>
          <div class="seg-control" role="group" aria-label="Link style">
            {#each [['curved','Curved'],['step','Step'],['straight','Straight']] as [val, label]}
              <button class="seg-btn seg-btn-sm" class:active={draft.linkStyle === val} on:click={() => { draft.linkStyle = val; debouncedSave(); }}>{label}</button>
            {/each}
          </div>
        </div>

        <div class="field-group">
          <span class="field-label">Line type</span>
          <div class="seg-control" role="group" aria-label="Line type">
            <button class="seg-btn seg-btn-sm" class:active={draft.linkStrokeType === 'line'} on:click={() => { draft.linkStrokeType = 'line'; debouncedSave(); }}>
              <svg width="24" height="12" viewBox="0 0 28 14" fill="none"><line x1="2" y1="7" x2="26" y2="7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
              <span>Line</span>
            </button>
            <button class="seg-btn seg-btn-sm" class:active={draft.linkStrokeType === 'dotted'} on:click={() => { draft.linkStrokeType = 'dotted'; debouncedSave(); }}>
              <svg width="24" height="12" viewBox="0 0 28 14" fill="none"><line x1="2" y1="7" x2="26" y2="7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-dasharray="0 4"/></svg>
              <span>Dotted</span>
            </button>
            <button class="seg-btn seg-btn-sm" class:active={draft.linkStrokeType === 'dashed'} on:click={() => { draft.linkStrokeType = 'dashed'; debouncedSave(); }}>
              <svg width="24" height="12" viewBox="0 0 28 14" fill="none"><line x1="2" y1="7" x2="26" y2="7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-dasharray="5 3"/></svg>
              <span>Dashed</span>
            </button>
          </div>
        </div>

        <label class="color-picker-label" style="margin-bottom: var(--space-3)">
          <span class="field-label" style="margin-bottom:0">Inactive color</span>
          <div class="color-pick-row">
            <input type="color" bind:value={draft.linkColorInactive} on:input={debouncedSave} class="color-input" />
            <span class="color-hex">{draft.linkColorInactive}</span>
          </div>
        </label>

        <div class="two-col">
          <div class="field-group">
            <div class="range-header">
              <label class="field-label" for="linkOpacity">Opacity</label>
              <span class="range-val">{Math.round((draft.linkOpacity ?? 0.9) * 100)}%</span>
            </div>
            <input id="linkOpacity" type="range" min="0.1" max="1" step="0.05" bind:value={draft.linkOpacity} on:input={debouncedSave} class="range-input"/>
          </div>
          <div class="field-group">
            <div class="range-header">
              <label class="field-label" for="linkStrokeWidth">Thickness</label>
              <span class="range-val">{draft.linkStrokeWidth ?? 2}</span>
            </div>
            <input id="linkStrokeWidth" type="range" min="1" max="6" step="0.5" bind:value={draft.linkStrokeWidth} on:input={debouncedSave} class="range-input"/>
          </div>
        </div>
      </section>

    {/if}

    <!-- ══ LAYOUT TAB ═════════════════════════════════════════════ -->
    {#if activeTab === 'layout'}

      <section class="config-section">
        <h3 class="section-title">Orientation</h3>

        <div class="field-group">
          <div class="seg-control" role="group" aria-label="Orientation">
            <button class="seg-btn" class:active={draft.orientation === 'LR'} on:click={() => { draft.orientation = 'LR'; debouncedSave(); }}>
              <svg width="22" height="14" viewBox="0 0 22 14" fill="none">
                <rect x="1" y="4" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.7"/>
                <rect x="10" y="1" width="5" height="5" rx="1.5" fill="currentColor" opacity="0.7"/>
                <rect x="10" y="8" width="5" height="5" rx="1.5" fill="currentColor" opacity="0.7"/>
                <rect x="17.5" y="0" width="3.5" height="3.5" rx="1" fill="currentColor" opacity="0.5"/>
                <rect x="17.5" y="5" width="3.5" height="3.5" rx="1" fill="currentColor" opacity="0.5"/>
                <rect x="17.5" y="10" width="3.5" height="3.5" rx="1" fill="currentColor" opacity="0.5"/>
                <line x1="7" y1="7" x2="10" y2="3.5" stroke="currentColor" stroke-width="1" opacity="0.5"/>
                <line x1="7" y1="7" x2="10" y2="10.5" stroke="currentColor" stroke-width="1" opacity="0.5"/>
              </svg>
              Left → Right
            </button>
            <button class="seg-btn" class:active={draft.orientation === 'TB'} on:click={() => { draft.orientation = 'TB'; debouncedSave(); }}>
              <svg width="14" height="18" viewBox="0 0 14 18" fill="none">
                <rect x="4" y="1" width="6" height="5" rx="1.5" fill="currentColor" opacity="0.7"/>
                <rect x="1" y="9" width="5" height="4" rx="1.5" fill="currentColor" opacity="0.7"/>
                <rect x="8" y="9" width="5" height="4" rx="1.5" fill="currentColor" opacity="0.7"/>
                <line x1="7" y1="6" x2="3.5" y2="9" stroke="currentColor" stroke-width="1" opacity="0.5"/>
                <line x1="7" y1="6" x2="10.5" y2="9" stroke="currentColor" stroke-width="1" opacity="0.5"/>
              </svg>
              Top → Bottom
            </button>
          </div>
        </div>

        {#if draft.orientation === 'LR'}
          <div class="field-group">
            <span class="field-label">Alignment</span>
            <div class="seg-control" role="group" aria-label="Alignment">
              {#each [['top-left','Top'],['center','Centered']] as [val, label]}
                <button class="seg-btn seg-btn-sm" class:active={draft.initialAlignment === val} on:click={() => { draft.initialAlignment = val; debouncedSave(); }}>{label}</button>
              {/each}
            </div>
          </div>
        {/if}

        <label class="toggle-row">
          <span class="toggle-label">Show header bar</span>
          <button class="toggle-btn" class:on={draft.showHeader !== false} on:click={() => { draft.showHeader = !(draft.showHeader !== false); debouncedSave(); }} role="switch" aria-checked={draft.showHeader !== false}><span class="toggle-thumb"></span></button>
        </label>

        <label class="toggle-row">
          <span class="toggle-label">Show title &amp; logo</span>
          <button class="toggle-btn" class:on={draft.showHeaderTitle !== false} on:click={() => { draft.showHeaderTitle = !(draft.showHeaderTitle !== false); debouncedSave(); }} role="switch" aria-checked={draft.showHeaderTitle !== false}><span class="toggle-thumb"></span></button>
        </label>
      </section>

      <section class="config-section">
        <h3 class="section-title">Spacing & Size</h3>

        <div class="field-group">
          <div class="range-header">
            <label class="field-label" for="levelSpacing">Level spacing</label>
            <span class="range-val">{draft.levelSpacing}px</span>
          </div>
          <input id="levelSpacing" type="range" min="160" max="480" step="20" bind:value={draft.levelSpacing} on:input={debouncedSave} class="range-input"/>
        </div>

        <div class="field-group">
          <div class="range-header">
            <label class="field-label" for="barHeight">Bar thickness</label>
            <span class="range-val">{draft.barHeight}px</span>
          </div>
          <input id="barHeight" type="range" min="8" max="48" step="2" bind:value={draft.barHeight} on:input={debouncedSave} class="range-input"/>
        </div>

        <div class="field-group">
          <div class="range-header">
            <label class="field-label" for="maxChildren">Max children shown</label>
            <input type="number" min="1" max="100" bind:value={draft.maxChildrenShown} on:change={debouncedSave} class="num-input-sm" />
          </div>
          <input id="maxChildren" type="range" min="5" max="50" step="5" bind:value={draft.maxChildrenShown} on:input={debouncedSave} class="range-input"/>
        </div>

        <div class="field-group">
          <span class="field-label">Bar scale</span>
          <div class="seg-control" role="group" aria-label="Bar scale">
            {#each [['parent','Parent'],['top','Top Node'],['level','Level Max']] as [val, label]}
              <button class="seg-btn seg-btn-sm" class:active={draft.barScaleMode === val} on:click={() => { draft.barScaleMode = val; debouncedSave(); }}>{label}</button>
            {/each}
          </div>
        </div>
      </section>

    {/if}

    <!-- ══ SETTINGS TAB ═══════════════════════════════════════════ -->
    {#if activeTab === 'settings'}

      <section class="config-section">
        <h3 class="section-title">Values</h3>

        <div class="field-group">
          <label class="field-label" for="valueFormat">Format</label>
          <select id="valueFormat" bind:value={draft.valueFormat} on:change={debouncedSave} class="select-input">
            <option value="auto">Auto (1.2K, 3.4M…)</option>
            <option value="number">Number (1,234)</option>
            <option value="currency">Currency ($1.2K)</option>
            <option value="percent">Percent (12.3%)</option>
          </select>
        </div>

        {#if draft.valueFormat === 'currency'}
          <div class="field-group">
            <label class="field-label" for="currencySymbol">Currency symbol</label>
            <input id="currencySymbol" type="text" maxlength="3" bind:value={draft.currencySymbol} on:input={debouncedSave} class="text-input" style="width: 72px" />
          </div>
        {/if}

        <div class="field-group">
          <label class="field-label" for="measureAlias">Measure display name</label>
          <input id="measureAlias" type="text" placeholder="e.g. Profit or =[Field Name]" bind:value={draft.measureAlias} on:input={debouncedSave} class="text-input" />
          <span class="field-hint">Static text, or <code>=Field Name</code> to use a calculated field/parameter from the view.</span>
        </div>

        <label class="toggle-row">
          <span class="toggle-label">Exclude null values</span>
          <button class="toggle-btn" class:on={draft.excludeNulls} on:click={() => { draft.excludeNulls = !draft.excludeNulls; debouncedSave(); }} role="switch" aria-checked={draft.excludeNulls}><span class="toggle-thumb"></span></button>
        </label>
      </section>

      <section class="config-section">
        <h3 class="section-title">Tooltip</h3>
        <div class="field-group">
          <label class="field-label" for="tooltipNarrative">Narrative template</label>
          <textarea id="tooltipNarrative" bind:value={draft.tooltipNarrative} on:input={debouncedSave} class="text-input narrative-input" placeholder="e.g. <Region> drives key results.&#10;Profit: <SUM(Profit)>" rows="4"></textarea>
          <p class="field-hint">Replaces default tooltip rows. Built-in: &lt;value&gt;, &lt;pct&gt;, &lt;count&gt;. Also supports dimension names and tooltip shelf fields.</p>
        </div>
      </section>

      <section class="config-section">
        <h3 class="section-title">Advanced</h3>

        <div class="field-group">
          <div class="range-header">
            <label class="field-label" for="animDur">Transition speed</label>
            <span class="range-val">{draft.animationDuration}ms</span>
          </div>
          <input id="animDur" type="range" min="0" max="800" step="50" bind:value={draft.animationDuration} on:input={debouncedSave} class="range-input"/>
        </div>

        <label class="toggle-row">
          <span class="toggle-label">Allow saving expansion state</span>
          <button class="toggle-btn" class:on={draft.allowSaveExpansionState} on:click={() => { draft.allowSaveExpansionState = !draft.allowSaveExpansionState; debouncedSave(); }} role="switch" aria-checked={draft.allowSaveExpansionState}><span class="toggle-thumb"></span></button>
        </label>
        <p class="field-hint" style="margin-top: 0">When on, Save state / Clear saved state appear in the header.</p>
      </section>

    {/if}

  </div>

  <!-- Footer -->
  <div class="drawer-footer">
    <button class="btn-ghost-sm" on:click={resetToDefaults}>Reset defaults</button>
    <button class="btn-secondary-sm" on:click={close}>Close</button>
  </div>
</div>

<style>
  .drawer-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(10, 12, 20, 0.3);
    backdrop-filter: blur(2px);
    z-index: calc(var(--z-drawer) - 1);
    animation: fade-in 0.2s ease;
  }

  @keyframes fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .config-drawer {
    position: fixed;
    top: 0;
    right: 0;
    width: 340px;
    height: 100vh;
    background: var(--color-surface);
    border-left: 1px solid var(--color-border);
    box-shadow: -8px 0 40px rgba(0, 0, 0, 0.12);
    z-index: var(--z-drawer);
    display: flex;
    flex-direction: column;
    animation: slide-in 0.22s cubic-bezier(0.22, 1, 0.36, 1);
  }

  @keyframes slide-in {
    from { transform: translateX(100%); opacity: 0; }
    to   { transform: translateX(0);    opacity: 1; }
  }

  /* Header */
  .drawer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-4) var(--space-5);
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
  }

  .drawer-header-left {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .settings-icon { color: var(--color-accent); }

  .drawer-header h2 {
    font-size: var(--text-lg);
    font-weight: var(--font-semibold);
    color: var(--color-text-primary);
  }

  .drawer-close {
    width: 28px; height: 28px;
    border-radius: var(--radius-md);
    display: flex; align-items: center; justify-content: center;
    color: var(--color-text-muted);
    transition: all var(--transition-fast);
  }
  .drawer-close:hover { background: var(--color-bg); color: var(--color-text-primary); }

  /* Tabs */
  .tab-bar {
    display: flex;
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
    padding: 0 var(--space-4);
    gap: 2px;
  }

  .tab-btn {
    flex: 1;
    padding: 10px var(--space-2);
    font-size: var(--text-sm);
    font-weight: var(--font-medium);
    color: var(--color-text-muted);
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s;
  }

  .tab-btn:hover { color: var(--color-text-secondary); }

  .tab-btn.active {
    color: var(--color-accent);
    border-bottom-color: var(--color-accent);
  }

  /* Body */
  .drawer-body {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-4) var(--space-5);
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .drawer-body::-webkit-scrollbar { width: 5px; }
  .drawer-body::-webkit-scrollbar-track { background: transparent; }
  .drawer-body::-webkit-scrollbar-thumb { background: var(--color-border); border-radius: 10px; }

  .config-section {
    padding: var(--space-3) 0 var(--space-4);
    border-bottom: 1px solid var(--color-border-subtle);
  }
  .config-section:last-child { border-bottom: none; }

  .section-title {
    font-size: var(--text-sm);
    font-weight: var(--font-semibold);
    color: var(--color-text-primary);
    text-transform: uppercase;
    letter-spacing: 0.07em;
    margin-bottom: var(--space-3);
  }

  /* Two-column layout for paired controls */
  .two-col {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-3);
  }

  /* Theme swatches */
  .theme-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-2);
    margin-bottom: var(--space-2);
  }

  .theme-swatch {
    height: 52px;
    border-radius: var(--radius-md);
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 3px;
    border: 2px solid transparent;
    cursor: pointer;
    transition: all var(--transition-fast);
    position: relative; overflow: hidden;
  }
  .theme-swatch:hover { transform: scale(1.04); box-shadow: var(--shadow-md); }
  .theme-swatch.active { border-color: white; box-shadow: 0 0 0 2px var(--color-accent), var(--shadow-md); }

  .swatch-label {
    font-size: var(--text-xs); font-weight: var(--font-medium);
    color: rgba(255,255,255,0.9); text-shadow: 0 1px 2px rgba(0,0,0,0.3);
  }

  .custom-colors {
    display: flex; flex-direction: column; gap: var(--space-2);
    padding: var(--space-3); background: var(--color-bg);
    border-radius: var(--radius-md); border: 1px solid var(--color-border);
    margin-top: var(--space-2);
  }

  .color-picker-label {
    display: flex; align-items: center; justify-content: space-between;
    font-size: var(--text-sm); color: var(--color-text-secondary);
  }

  .label-row {
    display: flex; align-items: center; gap: var(--space-2);
    padding: 4px 0;
  }
  .label-row-name {
    flex: 1; font-size: var(--text-sm); color: var(--color-text-secondary);
  }

  .color-pick-row { display: flex; align-items: center; gap: var(--space-2); }

  .color-input {
    width: 36px; height: 28px; padding: 2px;
    border: 1px solid var(--color-border); border-radius: var(--radius-sm);
    cursor: pointer; background: none;
  }

  .color-hex { font-size: var(--text-xs); font-family: var(--font-mono); color: var(--color-text-muted); }

  .field-group { margin-bottom: var(--space-3); }

  .field-label {
    display: block; font-size: var(--text-sm); font-weight: var(--font-medium);
    color: var(--color-text-secondary); margin-bottom: var(--space-2);
  }

  .seg-control {
    display: flex; background: var(--color-bg);
    border: 1px solid var(--color-border); border-radius: var(--radius-md);
    padding: 3px; gap: 2px;
  }

  .seg-btn {
    flex: 1; display: flex; align-items: center; justify-content: center;
    gap: var(--space-1); padding: 6px var(--space-2);
    border-radius: var(--radius-sm); font-size: var(--text-sm);
    font-weight: var(--font-medium); color: var(--color-text-secondary);
    background: transparent; transition: all var(--transition-fast); white-space: nowrap;
  }
  .seg-btn.active { background: var(--color-surface); color: var(--color-text-primary); box-shadow: var(--shadow-sm); }
  .seg-btn-sm { padding: 5px var(--space-2); font-size: var(--text-xs); }

  .range-header {
    display: flex; justify-content: space-between; align-items: center;
    margin-bottom: var(--space-2);
  }
  .range-val { font-size: var(--text-sm); font-weight: var(--font-medium); color: var(--color-accent); font-family: var(--font-mono); }
  .range-input { width: 100%; height: 4px; accent-color: var(--color-accent); cursor: pointer; }

  .toggle-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: var(--space-2) 0; cursor: pointer;
  }
  .toggle-label { font-size: var(--text-base); color: var(--color-text-primary); }

  .toggle-btn {
    width: 40px; height: 22px; border-radius: var(--radius-full);
    background: var(--color-border); padding: 2px;
    display: flex; align-items: center;
    transition: background var(--transition-base); flex-shrink: 0;
  }
  .toggle-btn.on { background: var(--color-accent); }
  .toggle-thumb {
    width: 18px; height: 18px; background: white; border-radius: var(--radius-full);
    box-shadow: var(--shadow-sm); transition: transform var(--transition-base); pointer-events: none;
  }
  .toggle-btn.on .toggle-thumb { transform: translateX(18px); }

  .num-input-sm {
    width: 56px; padding: 3px 6px; background: var(--color-bg);
    border: 1px solid var(--color-border); border-radius: var(--radius-sm);
    color: var(--color-accent); font-size: var(--text-sm); font-weight: var(--font-medium);
    font-family: var(--font-mono); text-align: center; outline: none;
  }
  .num-input-sm:focus { border-color: var(--color-accent); }

  .narrative-input { resize: vertical; min-height: 80px; font-family: var(--font-mono); font-size: var(--text-sm); line-height: 1.5; }

  .field-hint { margin-top: var(--space-1); font-size: var(--text-xs); color: var(--color-text-secondary); line-height: 1.4; }

  .select-input,
  .text-input {
    width: 100%; padding: 7px var(--space-3); background: var(--color-bg);
    border: 1px solid var(--color-border); border-radius: var(--radius-md);
    color: var(--color-text-primary); font-size: var(--text-base);
    outline: none; transition: border-color var(--transition-fast);
  }
  .select-input:focus,
  .text-input:focus { border-color: var(--color-accent); background: var(--color-bg); }

  /* Footer */
  .drawer-footer {
    padding: var(--space-4) var(--space-5); border-top: 1px solid var(--color-border);
    display: flex; align-items: center; justify-content: space-between;
    flex-shrink: 0; background: var(--color-surface);
  }
  .btn-ghost-sm {
    font-size: var(--text-sm); color: var(--color-text-muted);
    padding: 6px var(--space-2); border-radius: var(--radius-md); transition: all var(--transition-fast);
  }
  .btn-ghost-sm:hover { color: var(--color-text-secondary); background: var(--color-bg); }

  .btn-secondary-sm {
    padding: 8px var(--space-4); font-size: var(--text-sm); font-weight: var(--font-medium);
    color: var(--color-text-secondary); background: var(--color-bg);
    border: 1px solid var(--color-border); border-radius: var(--radius-md); transition: all var(--transition-fast);
  }
  .btn-secondary-sm:hover { background: var(--color-border-subtle); border-color: #c0c4cc; }
</style>
