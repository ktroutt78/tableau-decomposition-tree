/**
 * Tableau Extensions API wrapper for viz extensions.
 * All Tableau API calls are contained here — no other file touches `tableau.*`.
 */

import { encodingMap } from '../stores/encodings.js';
import { summaryRows, statusMessage, treeRoot } from '../stores/treeState.js';
import { loadConfig } from '../stores/config.js';

let worksheet = null;
let _onDataReady = null;
let _isMockMode = false;


export async function initTableau(onDataReady) {
  _onDataReady = onDataReady;

  // The Tableau Extensions API script must be loaded via <script> in index.html.
  // If the tableau global or extensions API is unavailable, fall back to mock data
  // (this happens when opening the page directly in a browser outside Tableau Desktop).
  if (typeof tableau === 'undefined' || typeof tableau.extensions === 'undefined') {
    _isMockMode = true;
    console.warn('[DecompTree] Tableau API not found — using mock data');
    statusMessage.set('Dev mode: using mock data');
    const mockEncMap = getMockEncodingMap();
    const mockRows = getMockRows();
    encodingMap.set(mockEncMap);
    summaryRows.set(mockRows);
    if (onDataReady) onDataReady(mockEncMap, mockRows);
    return;
  }

  try {
    await tableau.extensions.initializeAsync();

    worksheet = tableau.extensions.worksheetContent.worksheet;
    console.log('[DecompTree] Connected to worksheet:', worksheet.name);
    statusMessage.set(`Connected: ${worksheet.name}`);
    loadConfig();

    worksheet.addEventListener(
      tableau.TableauEventType.SummaryDataChanged,
      () => {
        console.log('[DecompTree] SummaryDataChanged — refreshing');
        statusMessage.set('Data updated, refreshing...');
        // Don't wipe the tree — let onDataReady preserve expansion
        fetchAndNotify(false);
      }
    );

    // Render immediately on load — if encoding shelves have fields, show the tree.
    // If they are empty, buildRootNode returns null and the empty state is shown.
    await fetchAndNotify();

  } catch (err) {
    console.error('[DecompTree] Init error:', err);
    // initializeAsync can fail when the page is loaded outside Tableau Desktop.
    // Fall back to mock data so dev mode still works.
    _isMockMode = true;
    statusMessage.set('Dev mode: using mock data');
    const mockEncMap = getMockEncodingMap();
    const mockRows = getMockRows();
    encodingMap.set(mockEncMap);
    summaryRows.set(mockRows);
    if (_onDataReady) _onDataReady(mockEncMap, mockRows);
  }
}

/**
 * Re-fetch data from Tableau and rebuild the tree from scratch.
 * Called by the Reload button in the header.
 */
export async function reloadData() {
  if (_isMockMode) {
    const mockEncMap = getMockEncodingMap();
    const mockRows = getMockRows();
    encodingMap.set(mockEncMap);
    summaryRows.set(mockRows);
    treeRoot.set(null);
    if (_onDataReady) _onDataReady(mockEncMap, mockRows, { forceReset: true });
    return;
  }
  if (!worksheet) return;
  statusMessage.set('Reloading...');
  treeRoot.set(null);
  await fetchAndNotify(true);
}

async function fetchAndNotify(forceReset = true) {
  try {
    const [encMap, rows] = await Promise.all([
      fetchEncodingMap(),
      fetchSummaryData()
    ]);

    encodingMap.set(encMap);
    summaryRows.set(rows);

    if (_onDataReady) _onDataReady(encMap, rows, { forceReset });
  } catch (err) {
    statusMessage.set(`Data error: ${err.message}`);
    console.error('[DecompTree] Fetch error:', err);
  }
}

async function fetchEncodingMap() {
  try {
    const visualSpec = await worksheet.getVisualSpecificationAsync();
    const marksSpec = visualSpec.marksSpecifications[visualSpec.activeMarksSpecificationIndex];
    const map = {};
    for (const enc of (marksSpec.encodings || [])) {
      if (!map[enc.id]) map[enc.id] = [];
      // Normalize to always have a consistent .name property for data lookups
      const f = enc.field;
      const name = f?.name || f?.fieldName || f?.caption || String(f ?? '');
      map[enc.id].push({ name, fieldName: f?.fieldName || name });
    }
    console.log('[DecompTree] Encoding map:', JSON.stringify(map));
    return map;
  } catch (e) {
    console.warn('[DecompTree] getVisualSpecificationAsync failed:', e);
    return {};
  }
}

async function fetchSummaryData() {
  try {
    // Preferred: paginated reader (API 1.9+)
    const reader = await worksheet.getSummaryDataReaderAsync(
      undefined,
      { ignoreSelection: true }
    );
    let rows = [];
    for (let page = 0; page < reader.pageCount; page++) {
      const tablePage = await reader.getPageAsync(page);
      if (page === 0) {
        console.log('[DecompTree] Data columns:', tablePage.columns.map(c => c.fieldName));
      }
      rows = rows.concat(namedRows(tablePage));
    }
    await reader.releaseAsync();
    console.log(`[DecompTree] Loaded ${rows.length} rows`);
    return rows;
  } catch (e) {
    // Fallback: single call (API 1.0+)
    console.warn('[DecompTree] getSummaryDataReaderAsync failed, trying getSummaryDataAsync:', e);
    const dataTable = await worksheet.getSummaryDataAsync({ ignoreSelection: true });
    return namedRows(dataTable);
  }
}

function namedRows(dataTableOrPage) {
  const columns = dataTableOrPage.columns;
  const data = dataTableOrPage.data;
  return data.map(row => {
    const obj = {};
    for (const col of columns) {
      obj[col.fieldName] = row[col.index];
    }
    return obj;
  });
}

/**
 * Programmatically select marks on the host worksheet by dimension path.
 * Tableau's native "Use as Filter" dashboard action propagates the selection
 * to other sheets automatically — no cross-sheet API calls needed.
 * Re-throws on failure so the caller can surface the error in the UI.
 * @param {Array<{field: string, value: string}>} dimensionPath
 */
export async function selectMarksForFilter(dimensionPath) {
  if (!dimensionPath?.length) return;
  if (typeof tableau === 'undefined') return; // dev/mock mode — no-op
  const ws = tableau.extensions.worksheetContent?.worksheet;
  if (!ws) {
    console.warn('[DecompTree] selectMarksForFilter: worksheet not available');
    return;
  }
  const criteria = dimensionPath.map(({ field, value }) => ({
    fieldName: field,
    value: value
  }));
  console.log('[DecompTree] selectMarksByValueAsync criteria:', JSON.stringify(criteria));
  await ws.selectMarksByValueAsync(criteria, tableau.SelectionUpdateType.Replace);
  console.log('[DecompTree] Mark selection applied');
}

/**
 * Clear the mark selection on the host worksheet.
 */
export async function clearMarkSelection() {
  if (typeof tableau === 'undefined') return; // dev/mock mode — no-op
  try {
    const ws = tableau.extensions.worksheetContent?.worksheet;
    if (!ws) return;
    await ws.clearSelectedMarksAsync();
    console.log('[DecompTree] Mark selection cleared');
  } catch (e) {
    console.warn('[DecompTree] clearSelectedMarksAsync error:', e);
  }
}

/**
 * Apply a categorical exclude filter to the host worksheet.
 * Adds `value` to the exclusion filter for `fieldName` on the Tableau filter shelf.
 * No-op in mock/dev mode.
 * @param {string} fieldName - Tableau field name (fieldName property from encodingMap)
 * @param {string} value - The member value to exclude
 */
export async function applyExcludeFilter(fieldName, value) {
  if (typeof tableau === 'undefined') return; // dev/mock mode — no-op
  const ws = tableau.extensions.worksheetContent?.worksheet;
  if (!ws) {
    console.warn('[DecompTree] applyExcludeFilter: worksheet not available');
    return;
  }
  try {
    // Read existing filters to merge — prevents replacing a previous exclusion
    const existing = await ws.getFiltersAsync();
    const existingExclude = existing.find(
      f => f.fieldName === fieldName && f.isExcludeMode
    );
    const currentExcluded = existingExclude
      ? existingExclude.appliedValues.map(v => v.formattedValue ?? v.value)
      : [];
    const merged = [...new Set([...currentExcluded, value])];
    console.log(`[DecompTree] applyExcludeFilter: ${fieldName} excluding`, merged);
    await ws.applyFilterAsync(
      fieldName,
      merged,
      tableau.FilterUpdateType.Replace,
      { isExcludeMode: true }
    );
    console.log(`[DecompTree] Exclude filter applied: ${fieldName} != "${value}"`);
  } catch (e) {
    console.warn('[DecompTree] applyExcludeFilter failed:', e);
  }
}

/**
 * Remove all active exclusion filters from the worksheet.
 * Called by the Reload button to reset excluded items.
 */
export async function clearAllExclusions() {
  if (typeof tableau === 'undefined') return;
  const ws = tableau.extensions.worksheetContent?.worksheet;
  if (!ws) return;
  try {
    const filters = await ws.getFiltersAsync();
    const excludeFilters = filters.filter(f => f.isExcludeMode && f.appliedValues?.length > 0);
    await Promise.all(
      excludeFilters.map(f => ws.applyFilterAsync(f.fieldName, [], tableau.FilterUpdateType.All))
    );
    console.log('[DecompTree] All exclusions cleared');
  } catch (e) {
    console.warn('[DecompTree] clearAllExclusions failed:', e);
  }
}

/**
 * Return all currently active exclusion filter values on the worksheet.
 * Returns an array of { fieldName, value } objects.
 */
export async function getActiveExclusions() {
  if (typeof tableau === 'undefined') return [];
  const ws = tableau.extensions.worksheetContent?.worksheet;
  if (!ws) return [];
  try {
    const filters = await ws.getFiltersAsync();
    const result = [];
    for (const f of filters) {
      if (f.isExcludeMode && f.appliedValues?.length > 0) {
        for (const v of f.appliedValues) {
          result.push({ fieldName: f.fieldName, value: v.formattedValue ?? v.value });
        }
      }
    }
    return result;
  } catch (e) {
    console.warn('[DecompTree] getActiveExclusions failed:', e);
    return [];
  }
}

/**
 * Remove a single value from an exclusion filter.
 * If it was the last excluded value for that field, removes the filter entirely.
 */
export async function removeExclusionValue(fieldName, value) {
  if (typeof tableau === 'undefined') return;
  const ws = tableau.extensions.worksheetContent?.worksheet;
  if (!ws) return;
  try {
    const filters = await ws.getFiltersAsync();
    const existing = filters.find(f => f.fieldName === fieldName && f.isExcludeMode);
    if (!existing) return;
    const remaining = existing.appliedValues
      .map(v => v.formattedValue ?? v.value)
      .filter(v => v !== value);
    if (remaining.length === 0) {
      // No exclusions left — remove the filter entirely
      await ws.applyFilterAsync(fieldName, [], tableau.FilterUpdateType.All);
    } else {
      await ws.applyFilterAsync(fieldName, remaining, tableau.FilterUpdateType.Replace, { isExcludeMode: true });
    }
    console.log(`[DecompTree] Removed exclusion: ${fieldName} != "${value}"`);
  } catch (e) {
    console.warn('[DecompTree] removeExclusionValue failed:', e);
  }
}

// --- Expansion state persistence (EBL-013) ---

const EXPANSION_SETTINGS_KEY = 'expansion_v1';
const EXPANSION_MAX_BYTES = 50000;

/**
 * Load saved expansion recipe from Tableau extension settings.
 * @returns {object|null} Parsed recipe or null if none/invalid
 */
export function loadExpansionState() {
  if (typeof tableau === 'undefined' || typeof tableau.extensions?.settings?.get !== 'function') return null;
  try {
    const raw = tableau.extensions.settings.get(EXPANSION_SETTINGS_KEY);
    if (!raw || typeof raw !== 'string') return null;
    const recipe = JSON.parse(raw);
    return recipe && recipe.d && Array.isArray(recipe.c) ? recipe : null;
  } catch (e) {
    console.warn('[DecompTree] loadExpansionState failed:', e);
    return null;
  }
}

/**
 * Save expansion recipe to Tableau extension settings.
 * @param {object} recipe - From serializeExpansion
 * @returns {Promise<boolean>} true if saved, false if skipped (e.g. too large or not in Tableau)
 */
export async function saveExpansionState(recipe) {
  if (typeof tableau === 'undefined' || typeof tableau.extensions?.settings?.set !== 'function') return false;
  try {
    const raw = JSON.stringify(recipe);
    if (raw.length > EXPANSION_MAX_BYTES) {
      console.warn('[DecompTree] Expansion state too large, not saved');
      return false;
    }
    tableau.extensions.settings.set(EXPANSION_SETTINGS_KEY, raw);
    await tableau.extensions.settings.saveAsync();
    return true;
  } catch (e) {
    console.warn('[DecompTree] saveExpansionState failed:', e);
    return false;
  }
}

/**
 * Clear saved expansion state from Tableau extension settings.
 */
export async function clearExpansionState() {
  if (typeof tableau === 'undefined' || typeof tableau.extensions?.settings?.set !== 'function') return;
  try {
    tableau.extensions.settings.set(EXPANSION_SETTINGS_KEY, '');
    await tableau.extensions.settings.saveAsync();
  } catch (e) {
    console.warn('[DecompTree] clearExpansionState failed:', e);
  }
}

// --- Mock data for development outside Tableau ---

function getMockEncodingMap() {
  return {
    value: [{ name: 'SUM(Sales)', fieldName: 'SUM(Sales)' }],
    breakdown: [
      { name: 'Region',       fieldName: 'Region' },
      { name: 'Category',     fieldName: 'Category' },
      { name: 'Sub-Category', fieldName: 'Sub-Category' },
      { name: 'Segment',      fieldName: 'Segment' }
    ],
    tooltip: [{ name: 'SUM(Profit)', fieldName: 'SUM(Profit)' }],
    color: []
  };
}

function getMockRows() {
  const regions    = ['West', 'East', 'Central', 'South'];
  const categories = ['Technology', 'Furniture', 'Office Supplies'];
  const subCats    = ['Phones', 'Chairs', 'Binders', 'Paper', 'Storage', 'Tables', 'Art'];
  const segments   = ['Consumer', 'Corporate', 'Home Office'];

  const rows = [];
  for (let i = 0; i < 400; i++) {
    const region   = regions[i % regions.length];
    const category = categories[i % categories.length];
    const subCat   = subCats[i % subCats.length];
    const segment  = segments[i % segments.length];
    const sales    = Math.round(500 + Math.random() * 9500);
    const profit   = Math.round(sales * (0.05 + Math.random() * 0.35));
    rows.push({
      'SUM(Sales)':  { value: sales,  formattedValue: `$${sales.toLocaleString()}` },
      'SUM(Profit)': { value: profit, formattedValue: `$${profit.toLocaleString()}` },
      Region:        { value: region,   formattedValue: region },
      Category:      { value: category, formattedValue: category },
      'Sub-Category':{ value: subCat,   formattedValue: subCat },
      Segment:       { value: segment,  formattedValue: segment }
    });
  }
  return rows;
}
