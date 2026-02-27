import { writable, derived } from 'svelte/store';
import { config } from './config.js';
import { encodingMap } from './encodings.js';
import { resolveMeasureDisplayName } from '../lib/formatters.js';

export const treeRoot = writable(null);
export const pendingDrillNode = writable(null);
export const statusMessage = writable('Connecting to Tableau...');
export const configPanelOpen = writable(false);
export const summaryRows = writable([]);
export const selectedNodeInfo = writable(null);
// Shape when set: { id: string, dimensionPath: [{field, value}, ...] }
// null = nothing selected

/** Resolved measure display name: supports "=Field Name" to use a field value from the view (e.g. parameter-driven). */
export const resolvedMeasureDisplayName = derived(
  [config, summaryRows, encodingMap],
  ([$config, $summaryRows, $encodingMap]) =>
    resolveMeasureDisplayName(
      $config?.measureAlias,
      $summaryRows,
      $encodingMap?.value?.[0]?.name ?? 'Value'
    )
);
