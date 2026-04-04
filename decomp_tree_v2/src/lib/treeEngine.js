/**
 * Pure data logic for the decomposition tree — no Tableau API, D3, or Svelte.
 */

function isNullLike(val) {
  if (val === null || val === undefined || val === '') return true;
  if (typeof val === 'string') {
    const lower = val.toLowerCase().trim();
    return lower === 'null' || lower === '(null)' || lower === '%null%';
  }
  return false;
}

// Returns the value from a row for a given field, trying name then fieldName
function getFieldValue(row, field) {
  let dv = row[field.name];
  if (dv === undefined && field.fieldName && field.fieldName !== field.name) {
    dv = row[field.fieldName];
  }
  return dv;
}

// True if the value is null/empty for breakdown dimension checks
function isBreakdownEmpty(row, field) {
  const dv = getFieldValue(row, field);
  if (dv === undefined || dv === null) return true;
  const raw = typeof dv === 'object' ? dv.value : dv;
  return raw === undefined || raw === null || raw === '' || String(raw).trim() === '';
}

export function buildRootNode(rows, encMap) {
  const valueField = encMap.value?.[0];
  if (!valueField) return null;

  const valueName = valueField.name;
  const breakdownFields = encMap.breakdown || [];

  // Separate rows into: grand-total (all breakdowns empty), leaf (all breakdowns populated),
  // and subtotals (some empty, some populated). Subtotals cause double-counting in drillDown
  // and must be excluded. This matters for aggregate calcs (e.g. SUM(A) - SUM(B)) where
  // Tableau may return intermediate subtotal rows in the summary data.
  let grandTotalValue = null;
  let leafRows = rows;

  if (breakdownFields.length > 0) {
    const classified = classifyRows(rows, breakdownFields);
    grandTotalValue = classified.grandTotalValue;
    leafRows = classified.leafRows;
    const skipped = rows.length - leafRows.length - (grandTotalValue ? 1 : 0);
    if (skipped > 0) {
      console.log(`[DecompTree] Filtered out ${skipped} subtotal rows to prevent double-counting`);
    }
  }

  // Use grand-total row value if available (correct for non-additive measures like COUNTD)
  let total = null;
  if (grandTotalValue !== null) {
    const dv = getFieldValue(grandTotalValue, valueField);
    if (dv !== undefined && dv !== null) {
      const v = typeof dv === 'object' ? dv.value : dv;
      if (v !== null && !isNaN(Number(v))) {
        total = Number(v);
      }
    }
  }

  // No total row: fall back to summing leaf rows (correct for SUM, wrong for COUNTD / non-additive)
  let count = 0;
  if (total === null) {
    total = 0;
    for (const row of leafRows) {
      const dv = getFieldValue(row, valueField);
      if (dv !== undefined && dv !== null) {
        const v = typeof dv === 'object' ? dv.value : dv;
        if (v !== null && !isNaN(Number(v))) {
          total += Number(v);
          count++;
        }
      }
    }
  } else {
    count = leafRows.length;
  }

  return {
    id: 'root',
    label: valueName,
    value: total,
    count,
    percentOfParent: 100,
    depth: 0,
    dimensionPath: [],
    children: null,
    _collapsed: false,
    _rows: leafRows,
    _tooltipData: extractTooltipData(leafRows, encMap),
    _colorValue: extractColorValue(leafRows, encMap),
    _drillDimension: null
  };
}

/**
 * Classify rows into grand-total, leaf, and subtotal categories.
 * - Grand-total: ALL breakdown dimensions are empty → used for root value
 * - Leaf: ALL breakdown dimensions are populated → stored in _rows for drill-down
 * - Subtotal: SOME empty, SOME populated → discarded to prevent double-counting
 */
function classifyRows(rows, breakdownFields) {
  let grandTotalValue = null;
  const leafRows = [];

  for (const row of rows) {
    let emptyCount = 0;
    for (const f of breakdownFields) {
      if (isBreakdownEmpty(row, f)) emptyCount++;
    }

    if (emptyCount === breakdownFields.length) {
      // Grand-total row: all breakdowns empty
      if (grandTotalValue === null) {
        // Store the raw value field data for later extraction
        grandTotalValue = row;
      }
    } else if (emptyCount === 0) {
      // Leaf row: all breakdowns populated
      leafRows.push(row);
    }
    // else: subtotal row (some empty) — skip to avoid double-counting
  }

  return { grandTotalValue, leafRows };
}

export function drillDown(node, dimensionName, encMap, maxChildren = 20, excludeNulls = false, sortOrder = 'desc') {
  const valueField = encMap.value?.[0];
  if (!valueField) return node;

  // Find the breakdown field object so we can do name/fieldName fallback
  const dimField = (encMap.breakdown || []).find(f => f.name === dimensionName)
    || { name: dimensionName, fieldName: dimensionName };

  const groups = new Map();

  for (const row of node._rows) {
    const dimDv = getFieldValue(row, dimField);
    if (dimDv === undefined || dimDv === null) continue;

    const rawVal = typeof dimDv === 'object' ? dimDv.value : dimDv;
    if (excludeNulls && isNullLike(rawVal)) continue;

    const fmtVal = typeof dimDv === 'object' ? (dimDv.formattedValue ?? rawVal) : rawVal;
    const key = String(fmtVal ?? '(null)');
    if (excludeNulls && isNullLike(key)) continue;

    if (!groups.has(key)) {
      groups.set(key, { label: key, rows: [], value: 0, count: 0 });
    }

    const group = groups.get(key);
    group.rows.push(row);

    const valDv = getFieldValue(row, valueField);
    if (valDv !== undefined && valDv !== null) {
      const v = typeof valDv === 'object' ? valDv.value : valDv;
      if (v !== null && !isNaN(Number(v))) {
        group.value += Number(v);
        group.count++;
      }
    }
  }

  const sorted = Array.from(groups.values())
    .sort((a, b) => sortOrder === 'asc' ? a.value - b.value : b.value - a.value);

  // When nulls are excluded, use the non-null total as the denominator for
  // percentOfParent so the visible children's percentages sum to ~100% and
  // bar fills reflect proportions among the remaining values.
  const effectiveParent = excludeNulls
    ? sorted.reduce((sum, g) => sum + g.value, 0)
    : node.value;

  const shown  = sorted.slice(0, maxChildren);
  const hidden = sorted.slice(maxChildren);

  function makeChild(group) {
    return {
      id: `${node.id}|${dimensionName}|${group.label}`,
      label: group.label,
      value: group.value,
      count: group.count,
      percentOfParent: effectiveParent !== 0 ? (group.value / Math.abs(effectiveParent)) * 100 : 0,
      depth: node.depth + 1,
      dimensionPath: [...node.dimensionPath, { field: dimensionName, value: group.label }],
      children: null,
      _collapsed: false,
      _rows: group.rows,
      _tooltipData: extractTooltipData(group.rows, encMap),
      _colorValue: extractColorValue(group.rows, encMap),
      _drillDimension: dimensionName,
      _sortOrder: sortOrder
    };
  }

  const children = shown.map(makeChild);

  // If any groups were cut off, aggregate them into a final "(Other)" child
  if (hidden.length > 0) {
    const otherRows  = hidden.flatMap(g => g.rows);
    const otherValue = hidden.reduce((s, g) => s + g.value, 0);
    const otherCount = hidden.reduce((s, g) => s + g.count, 0);
    children.push(makeChild({ label: '(Other)', rows: otherRows, value: otherValue, count: otherCount }));
  }

  return { ...node, children, _collapsed: false };
}

export function toggleCollapse(node) {
  return { ...node, _collapsed: !node._collapsed };
}

export function updateNodeInTree(root, targetId, transformFn) {
  if (root.id === targetId) return transformFn(root);
  if (!root.children) return root;
  return {
    ...root,
    children: root.children.map(c => updateNodeInTree(c, targetId, transformFn))
  };
}

/**
 * Toggle the sort order for all nodes drilled by `dim`, preserving sub-expansions.
 * Descending ↔ Ascending.
 */
export function toggleSortAtDimension(root, dim, encMap, maxChildren, excludeNulls = false) {
  if (!root.children) return root;

  const drillDim = root.children[0]?._drillDimension;
  const currentSort = root.children[0]?._sortOrder || 'desc';

  if (drillDim === dim) {
    const newSort = currentSort === 'desc' ? 'asc' : 'desc';
    const reDrilled = drillDown(root, dim, encMap, maxChildren, excludeNulls, newSort);
    if (!reDrilled.children) return root;

    // Match new children to old by label, restore collapse + sub-expansions
    const newChildren = reDrilled.children.map(newChild => {
      const oldChild = root.children.find(oc => oc.label === newChild.label);
      if (!oldChild) return newChild;
      let result = { ...newChild, _collapsed: oldChild._collapsed };
      if (oldChild.children && !oldChild._collapsed) {
        result = reapplyExpansion(oldChild, result, encMap, maxChildren, excludeNulls);
      }
      return result;
    });
    return { ...reDrilled, children: newChildren, _collapsed: root._collapsed };
  }

  // Recurse into children to find the matching dimension at a deeper level
  return {
    ...root,
    children: root.children.map(child =>
      toggleSortAtDimension(child, dim, encMap, maxChildren, excludeNulls)
    )
  };
}

/**
 * Walk the tree to find the direct parent of the node with childId.
 * Returns the parent data node, or null if not found.
 */
export function findParent(root, childId) {
  if (!root.children) return null;
  for (const child of root.children) {
    if (child.id === childId) return root;
    const found = findParent(child, childId);
    if (found) return found;
  }
  return null;
}

/**
 * Walk the tree to find the deepest node that has visible (non-collapsed) children.
 * Used for the header breadcrumb to show the full drill path.
 */
export function getDeepestExpandedNode(node) {
  if (!node?.children || node._collapsed) return node;
  for (const child of node.children) {
    if (child.children?.length && !child._collapsed) {
      return getDeepestExpandedNode(child);
    }
  }
  return node;
}

/**
 * After a filter/data refresh, replay the old tree's drill-down operations
 * against the new root's fresh row data, restoring expansion and collapse state.
 *
 * @param {object} oldNode  - The previously expanded tree node
 * @param {object} newNode  - A freshly built node with new _rows (same position in tree)
 * @param {object} encMap   - Current encoding map
 * @param {number} maxChildren
 * @returns {object} newNode with children restored to match oldNode's expansion
 */
export function reapplyExpansion(oldNode, newNode, encMap, maxChildren, excludeNulls = false) {
  if (!oldNode.children) return newNode;

  // The dimension and sort order used to split this node's children are stored on the children
  const drillDim = oldNode.children[0]?._drillDimension;
  if (!drillDim) return newNode;
  const sortOrder = oldNode.children[0]?._sortOrder || 'desc';

  // Re-drill the fresh node with the same dimension and sort order
  const reDrilled = drillDown(newNode, drillDim, encMap, maxChildren, excludeNulls, sortOrder);
  if (!reDrilled.children) return newNode;

  // The previously-expanded child (if any) — used as a fallback when no label matches.
  const expandedOldChild = oldNode.children.find(oc => oc.children?.length && !oc._collapsed);
  let expansionApplied = false;

  // Match new children to old by label and restore collapse + sub-expansion
  const newChildren = reDrilled.children.map(newChild => {
    const oldChild = oldNode.children.find(oc => oc.label === newChild.label);
    if (!oldChild) return newChild;

    let result = { ...newChild, _collapsed: oldChild._collapsed };

    // Recurse into uncollapsed children that had further drilling
    if (oldChild.children && !oldChild._collapsed) {
      result = reapplyExpansion(oldChild, result, encMap, maxChildren, excludeNulls);
      expansionApplied = true;
    }

    return result;
  });

  // If no label match produced an expansion (e.g. the new node has completely
  // different child values — different manufacturers under a different sub-category),
  // fall back to expanding the first non-Other child using the old expansion pattern.
  // This ensures the full drill depth is always preserved when switching siblings.
  if (expandedOldChild && !expansionApplied) {
    const idx = newChildren.findIndex(c => c.label !== '(Other)');
    if (idx >= 0) {
      newChildren[idx] = reapplyExpansion(
        expandedOldChild, newChildren[idx], encMap, maxChildren, excludeNulls
      );
    }
  }

  return { ...reDrilled, children: newChildren };
}

/**
 * Serialize the tree expansion state to a minimal JSON-friendly recipe.
 * Used for persisting to Tableau extension settings.
 * @param {object} node - Root or any node with optional children
 * @returns {object|null} Recipe { d, s, c } or null if no children
 */
export function serializeExpansion(node) {
  if (!node?.children?.length) return null;
  const drillDim = node.children[0]._drillDimension;
  const sortOrder = node.children[0]._sortOrder || 'desc';
  const c = node.children.map(child => {
    const out = { l: child.label, v: !!child._collapsed };
    const nested = serializeExpansion(child);
    if (nested) out.e = nested;
    return out;
  });
  return { d: drillDim, s: sortOrder, c };
}

/**
 * Replay a saved expansion recipe onto a freshly built node (no children).
 * If a dimension in the recipe is not in encMap.breakdown, aborts and returns the fresh node (start from root).
 * @param {object} freshNode - Node with _rows, no children
 * @param {object|null} recipe - Saved recipe from serializeExpansion
 * @param {object} encMap - Encoding map with breakdown array
 * @param {number} maxChildren
 * @param {boolean} excludeNulls
 * @returns {object} Node with children restored, or freshNode if replay aborted
 */
export function replayExpansion(freshNode, recipe, encMap, maxChildren, excludeNulls = false) {
  if (!recipe || !recipe.d || !Array.isArray(recipe.c)) return freshNode;
  const breakdownNames = (encMap.breakdown || []).map(f => f.name);
  if (!breakdownNames.includes(recipe.d)) return freshNode;
  const sortOrder = recipe.s === 'asc' ? 'asc' : 'desc';
  const reDrilled = drillDown(freshNode, recipe.d, encMap, maxChildren, excludeNulls, sortOrder);
  if (!reDrilled.children) return freshNode;
  const newChildren = reDrilled.children.map(newChild => {
    const recipeChild = recipe.c.find(rc => rc.l === newChild.label);
    if (!recipeChild) return newChild;
    let result = { ...newChild, _collapsed: !!recipeChild.v };
    if (recipeChild.e && result._rows) {
      result = replayExpansion(result, recipeChild.e, encMap, maxChildren, excludeNulls);
    }
    return result;
  });
  return { ...reDrilled, children: newChildren };
}

function extractTooltipData(rows, encMap) {
  const fields = encMap.tooltip || [];
  if (!fields.length || !rows.length) return {};
  const result = {};
  for (const field of fields) {
    const values = rows
      .map(r => r[field.name])
      .filter(dv => dv !== undefined && dv !== null);
    if (!values.length) continue;
    const first = typeof values[0] === 'object' ? values[0].value : values[0];
    const isNumeric = typeof first === 'number';
    if (isNumeric) {
      result[field.name] = values.reduce((sum, dv) => {
        const v = typeof dv === 'object' ? dv.value : dv;
        return sum + (isNaN(Number(v)) ? 0 : Number(v));
      }, 0);
    } else {
      const dv = values[0];
      result[field.name] = typeof dv === 'object' ? (dv.formattedValue ?? dv.value) : dv;
    }
  }
  return result;
}

function extractColorValue(rows, encMap) {
  const fields = encMap.color || [];
  if (!fields.length || !rows.length) return null;
  const dv = rows[0]?.[fields[0].name];
  if (!dv) return null;
  return typeof dv === 'object' ? (dv.formattedValue ?? dv.value) : dv;
}
