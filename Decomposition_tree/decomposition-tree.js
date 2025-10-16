/**
 * Tableau Decomposition Tree Extension
 * Interactive hierarchical decomposition for data exploration
 */

// Global state
let worksheet = null;
let dataSource = null;
let measures = [];
let dimensions = [];
let selectedMeasure = null;
let treeData = null;
let currentNodeForDrilldown = null;

// Configuration
let config = {
    showRecordCounts: true,
    orientation: 'horizontal',
    nodeColor: '#4A90E2',
    nodeWidth: 180,
    nodeHeight: 80,
    levelSpacing: 250,
    nodeSpacing: 20
};

// D3 tree layout
let svg, g, tree, zoom;

/**
 * Initialize the extension when DOM is ready
 */
document.addEventListener('DOMContentLoaded', function() {
    tableau.extensions.initializeAsync({ configure: configure }).then(() => {
        console.log('Tableau viz extension initialized');
        updateStatus('Extension loaded successfully');

        // Get the worksheet - for viz extensions, use worksheetContent
        if (tableau.extensions.worksheetContent) {
            // Viz extension (worksheet extension)
            worksheet = tableau.extensions.worksheetContent.worksheet;
            console.log('Using viz extension worksheet:', worksheet.name);
        } else if (tableau.extensions.dashboardContent) {
            // Dashboard extension (fallback for compatibility)
            const worksheets = tableau.extensions.dashboardContent.dashboard.worksheets;
            if (worksheets.length === 0) {
                updateStatus('Error: No worksheet found');
                return;
            }
            worksheet = worksheets[0];
            console.log('Using dashboard worksheet:', worksheet.name);
        } else {
            updateStatus('Error: No worksheet context found');
            return;
        }

        // Initialize the extension
        initializeExtension();

    }).catch((error) => {
        console.error('Error initializing extension:', error);
        updateStatus('Error: ' + error.toString());
    });
});

/**
 * Initialize extension - load data sources and set up UI
 */
async function initializeExtension() {
    try {
        updateStatus('Loading data...');

        // Load settings
        loadSettings();

        // For viz extensions, we need to try different data access methods
        let dataTable = null;
        let dataMethod = '';

        try {
            // Try getting underlying data first (most complete)
            console.log('Attempting to get underlying data...');
            dataTable = await worksheet.getUnderlyingDataAsync();
            dataMethod = 'underlying';
            console.log('Underlying data loaded:', dataTable.totalRowCount, 'rows');
        } catch (error) {
            console.warn('Could not get underlying data:', error);

            try {
                // Fallback to summary data
                console.log('Attempting to get summary data...');
                dataTable = await worksheet.getSummaryDataAsync();
                dataMethod = 'summary';
                console.log('Summary data loaded:', dataTable.totalRowCount, 'rows');
            } catch (summaryError) {
                console.error('Could not get summary data either:', summaryError);
                updateStatus('Error: Cannot access worksheet data. Please ensure data is present in the worksheet.');
                return;
            }
        }

        // Extract measures and dimensions from columns
        const columns = dataTable.columns;
        console.log('Total columns found:', columns.length);
        console.log('Column details:', columns.map(c => ({
            name: c.fieldName,
            type: c.dataType,
            isReferenced: c.isReferenced,
            index: c.index
        })));

        // Identify measures (numeric types) - be more lenient with filtering
        // For viz extensions, isReferenced might not work as expected, so we'll try multiple approaches
        let candidateMeasures = columns.filter(col =>
            col.dataType === 'float' || col.dataType === 'int'
        );

        console.log('Candidate measures (by type):', candidateMeasures.map(m => m.fieldName));

        // If we have isReferenced info, prefer those columns
        const referencedMeasures = candidateMeasures.filter(col => col.isReferenced === true);
        if (referencedMeasures.length > 0) {
            measures = referencedMeasures;
            console.log('Using referenced measures:', measures.map(m => m.fieldName));
        } else {
            // Fallback: use all numeric columns
            measures = candidateMeasures;
            console.log('Using all numeric columns as measures (no isReferenced info)');
        }

        // Identify dimensions (string/date types) - same lenient approach
        let candidateDimensions = columns.filter(col =>
            col.dataType === 'string' ||
            col.dataType === 'date' ||
            col.dataType === 'date-time' ||
            col.dataType === 'datetime'
        );

        console.log('Candidate dimensions (by type):', candidateDimensions.map(d => d.fieldName));

        const referencedDimensions = candidateDimensions.filter(col => col.isReferenced === true);
        if (referencedDimensions.length > 0) {
            dimensions = referencedDimensions;
            console.log('Using referenced dimensions:', dimensions.map(d => d.fieldName));
        } else {
            // Fallback: use all string/date columns
            dimensions = candidateDimensions;
            console.log('Using all string/date columns as dimensions (no isReferenced info)');
        }

        console.log('Measures found:', measures.map(m => m.fieldName));
        console.log('Dimensions found:', dimensions.map(d => d.fieldName));

        if (measures.length === 0) {
            updateStatus('No measures found. Please add a measure to your worksheet (e.g., drag Sales to Rows or Columns).');
            console.warn('No measures detected. Available columns:', columns.map(c => c.fieldName));
            return;
        }

        if (dimensions.length === 0) {
            updateStatus('Warning: No dimensions found for drill-down. Add dimensions to enable exploration.');
            console.warn('No dimensions detected. Available columns:', columns.map(c => c.fieldName));
        }

        // Store data globally for aggregations
        window.underlyingData = dataTable;
        window.dataAccessMethod = dataMethod;

        console.log(`Data access method: ${dataMethod}`);
        console.log(`Found ${measures.length} measures and ${dimensions.length} dimensions`);

        // Populate measure selector
        populateMeasureSelector();

        // Set up event handlers
        setupEventHandlers();

        // Initialize tree visualization
        initializeTree();

        updateStatus('Ready - Select a measure to begin');

    } catch (error) {
        console.error('Error initializing:', error);
        console.error('Error stack:', error.stack);
        updateStatus('Error: ' + error.toString());
    }
}

/**
 * Populate measure selector dropdown
 */
function populateMeasureSelector() {
    const select = document.getElementById('measureSelect');
    select.innerHTML = '<option value="">Select Measure...</option>';

    measures.forEach((measure, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = measure.fieldName;
        select.appendChild(option);
    });

    // Auto-select if only one measure
    if (measures.length === 1) {
        select.value = '0';
        onMeasureSelected();
    }
}

/**
 * Set up UI event handlers
 */
function setupEventHandlers() {
    // Measure selection
    document.getElementById('measureSelect').addEventListener('change', onMeasureSelected);

    // Reset button
    document.getElementById('resetBtn').addEventListener('click', resetToRoot);

    // Config button
    document.getElementById('configBtn').addEventListener('click', openConfigDialog);

    // Config dialog buttons
    document.getElementById('saveConfigBtn').addEventListener('click', saveConfiguration);
    document.getElementById('cancelConfigBtn').addEventListener('click', closeConfigDialog);

    // Dimension search
    document.getElementById('dimensionSearch').addEventListener('input', filterDimensions);
}

/**
 * Initialize D3 tree visualization
 */
function initializeTree() {
    const container = document.getElementById('tree-container');
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Clear existing SVG
    d3.select('#tree-svg').selectAll('*').remove();

    // Create SVG
    svg = d3.select('#tree-svg')
        .attr('width', width)
        .attr('height', height);

    // Add zoom behavior
    zoom = d3.zoom()
        .scaleExtent([0.1, 3])
        .on('zoom', (event) => {
            g.attr('transform', event.transform);
        });

    svg.call(zoom);

    // Create main group with appropriate starting position
    const startX = config.orientation === 'horizontal' ? 100 : width / 2;
    const startY = config.orientation === 'horizontal' ? height / 2 : 100;

    g = svg.append('g')
        .attr('transform', `translate(${startX}, ${startY})`);

    // Create tree layout with appropriate node size
    if (config.orientation === 'horizontal') {
        tree = d3.tree()
            .nodeSize([config.nodeHeight + config.nodeSpacing, config.levelSpacing]);
    } else {
        tree = d3.tree()
            .nodeSize([config.nodeWidth + config.nodeSpacing, config.levelSpacing]);
    }
}

/**
 * Handle measure selection
 */
async function onMeasureSelected() {
    const select = document.getElementById('measureSelect');
    const index = parseInt(select.value);

    if (isNaN(index)) return;

    selectedMeasure = measures[index];
    console.log('Selected measure:', selectedMeasure.fieldName);

    updateStatus('Calculating root total...');

    try {
        const underlyingData = window.underlyingData;

        // Find measure column index
        const measureIndex = underlyingData.columns.findIndex(
            col => col.fieldName === selectedMeasure.fieldName
        );

        if (measureIndex === -1) {
            updateStatus('Error: Measure not found in data');
            return;
        }

        // Calculate root total by summing all values
        let total = 0;
        let count = 0;

        underlyingData.data.forEach(row => {
            const value = row[measureIndex].value;
            if (value !== null && value !== undefined && !isNaN(value)) {
                total += parseFloat(value);
                count++;
            }
        });

        console.log('Root total:', total, 'Count:', count);

        // Create root node with all data rows
        treeData = {
            name: selectedMeasure.fieldName,
            value: total,
            count: count,
            percentage: 100,
            expanded: false,
            children: null,
            _dataRows: underlyingData.data, // Store all rows for drill-down
            _filters: {} // Track which filters have been applied
        };

        // Render tree
        renderTree();

        updateStatus('Ready - Click node to drill down');

    } catch (error) {
        console.error('Error loading data:', error);
        updateStatus('Error loading data: ' + error.toString());
    }
}

/**
 * Render the tree visualization with smooth animations
 */
function renderTree() {
    if (!treeData) return;

    const duration = 250; // Animation duration in ms

    // Create hierarchy
    const root = d3.hierarchy(treeData);

    // Compute layout
    tree(root);

    // Update links with animation
    const linkData = root.links();
    const link = g.selectAll('.tree-link')
        .data(linkData, d => d.target.data.name + '-' + d.source.data.name);

    // Remove old links
    link.exit()
        .transition()
        .duration(duration)
        .style('opacity', 0)
        .remove();

    // Determine link generator based on orientation
    const linkGenerator = config.orientation === 'horizontal'
        ? d3.linkHorizontal().x(d => d.y).y(d => d.x)
        : d3.linkVertical().x(d => d.x).y(d => d.y);

    // Add new links
    link.enter()
        .append('path')
        .attr('class', 'tree-link')
        .attr('d', linkGenerator)
        .style('opacity', 0)
        .transition()
        .duration(duration)
        .style('opacity', 1);

    // Update existing links
    link.transition()
        .duration(duration)
        .attr('d', linkGenerator);

    // Update nodes with animation
    const nodeData = root.descendants();
    const node = g.selectAll('.tree-node')
        .data(nodeData, d => d.data.name + '-' + (d.parent ? d.parent.data.name : 'root'));

    // Remove old nodes
    node.exit()
        .transition()
        .duration(duration)
        .style('opacity', 0)
        .remove();

    // Add new node groups with appropriate transform
    const getTransform = config.orientation === 'horizontal'
        ? d => `translate(${d.y}, ${d.x})`
        : d => `translate(${d.x}, ${d.y})`;

    const nodeEnter = node.enter()
        .append('g')
        .attr('class', 'tree-node')
        .attr('transform', getTransform)
        .style('opacity', 0)
        .on('click', onNodeClick)
        .on('mouseover', showTooltip)
        .on('mouseout', hideTooltip);

    // Add rectangles to new nodes
    nodeEnter.append('rect')
        .attr('class', d => {
            let classes = 'node-rect';
            if (d.data._hiddenChildren || (!d.data.children && !d.data.expanded)) {
                classes += ' expandable';
            }
            return classes;
        })
        .attr('x', -config.nodeWidth / 2)
        .attr('y', -config.nodeHeight / 2)
        .attr('width', config.nodeWidth)
        .attr('height', config.nodeHeight)
        .attr('fill', config.nodeColor);

    // Add text elements to new nodes
    nodeEnter.append('text')
        .attr('class', 'node-text')
        .attr('y', -20)
        .attr('text-anchor', 'middle')
        .text(d => truncateText(d.data.name, 20));

    nodeEnter.append('text')
        .attr('class', 'node-value')
        .attr('y', 5)
        .attr('text-anchor', 'middle')
        .text(d => formatValue(d.data.value));

    nodeEnter.append('text')
        .attr('class', 'node-percentage')
        .attr('y', 22)
        .attr('text-anchor', 'middle')
        .text(d => d.data.percentage ? `${d.data.percentage.toFixed(1)}%` : '');

    if (config.showRecordCounts) {
        nodeEnter.append('text')
            .attr('class', 'node-count')
            .attr('y', 35)
            .attr('text-anchor', 'middle')
            .text(d => `n=${d.data.count}`);
    }

    // Fade in new nodes
    nodeEnter.transition()
        .duration(duration)
        .style('opacity', 1);

    // Update existing nodes position
    node.transition()
        .duration(duration)
        .attr('transform', getTransform);

    // Update rectangle classes for existing nodes
    node.select('rect')
        .attr('class', d => {
            let classes = 'node-rect';
            if (d.data._hiddenChildren || (!d.data.children && !d.data.expanded)) {
                classes += ' expandable';
            }
            return classes;
        });

    console.log('Tree rendered with', nodeData.length, 'nodes');
}

/**
 * Handle node click for drill-down or collapse
 */
function onNodeClick(event, d) {
    event.stopPropagation();
    console.log('Node clicked:', d.data.name);

    // If node has children and is expanded, collapse it
    if (d.data.children && d.data.expanded) {
        collapseNode(d);
    }
    // If node has children but is collapsed, expand it
    else if (d.data.children && !d.data.expanded) {
        expandNode(d);
    }
    // If node has no children, allow drill-down
    else {
        currentNodeForDrilldown = d;
        showDimensionSelector();
    }
}

/**
 * Collapse a node (hide its children)
 */
function collapseNode(d) {
    console.log('Collapsing node:', d.data.name);

    d.data.expanded = false;
    d.data._hiddenChildren = d.data.children;
    d.data.children = null;

    renderTree();
    updateStatus('Node collapsed - Click to expand');
}

/**
 * Expand a node (show its children)
 */
function expandNode(d) {
    console.log('Expanding node:', d.data.name);

    d.data.expanded = true;
    d.data.children = d.data._hiddenChildren;
    d.data._hiddenChildren = null;

    renderTree();
    updateStatus('Node expanded - Click to drill further');
}

/**
 * Show dimension selector modal
 */
function showDimensionSelector() {
    const modal = document.getElementById('dimensionModal');
    const list = document.getElementById('dimensionList');

    // Clear list
    list.innerHTML = '';

    // Populate with dimensions
    dimensions.forEach((dim, index) => {
        const li = document.createElement('li');
        li.textContent = dim.fieldName;
        li.onclick = () => onDimensionSelected(index);
        list.appendChild(li);
    });

    // Show modal
    modal.style.display = 'flex';
}

/**
 * Close dimension selector modal
 */
function closeDimensionModal() {
    document.getElementById('dimensionModal').style.display = 'none';
    document.getElementById('dimensionSearch').value = '';
    currentNodeForDrilldown = null;
}

/**
 * Handle dimension selection for drill-down
 */
async function onDimensionSelected(dimensionIndex) {
    closeDimensionModal();

    if (!currentNodeForDrilldown) return;

    const dimension = dimensions[dimensionIndex];
    console.log('Drilling down by:', dimension.fieldName);

    updateStatus('Calculating breakdown...');

    try {
        const underlyingData = window.underlyingData;
        const node = currentNodeForDrilldown.data;

        // Find column indices
        const dimensionColIndex = underlyingData.columns.findIndex(
            col => col.fieldName === dimension.fieldName
        );
        const measureColIndex = underlyingData.columns.findIndex(
            col => col.fieldName === selectedMeasure.fieldName
        );

        if (dimensionColIndex === -1 || measureColIndex === -1) {
            updateStatus('Error: Column not found');
            return;
        }

        // Get data rows for this node (may be filtered from parent drill-downs)
        const dataRows = node._dataRows || underlyingData.data;

        // Group by dimension and aggregate measure
        const groups = {};

        dataRows.forEach(row => {
            const dimValue = row[dimensionColIndex].value;
            const measureValue = row[measureColIndex].value;

            // Skip null/undefined dimension values
            if (dimValue === null || dimValue === undefined) return;

            // Convert to string for grouping
            const dimKey = String(dimValue);

            if (!groups[dimKey]) {
                groups[dimKey] = {
                    name: dimKey,
                    value: 0,
                    count: 0,
                    rows: []
                };
            }

            // Aggregate measure value
            if (measureValue !== null && measureValue !== undefined && !isNaN(measureValue)) {
                groups[dimKey].value += parseFloat(measureValue);
                groups[dimKey].count++;
                groups[dimKey].rows.push(row);
            }
        });

        // Convert groups to array and calculate percentages
        const children = Object.values(groups).map(group => ({
            name: group.name,
            value: group.value,
            count: group.count,
            percentage: node.value > 0 ? (group.value / node.value) * 100 : 0,
            expanded: false,
            children: null,
            _dataRows: group.rows, // Store filtered rows for further drill-down
            _filters: {
                ...node._filters,
                [dimension.fieldName]: group.name
            }
        }));

        // Sort by value descending
        children.sort((a, b) => b.value - a.value);

        // Limit to top 20 to avoid overwhelming the display
        const displayChildren = children.slice(0, 20);

        if (children.length > 20) {
            console.log(`Showing top 20 of ${children.length} categories`);
        }

        console.log(`Created ${displayChildren.length} child nodes`);

        // Update node with children
        currentNodeForDrilldown.data.children = displayChildren;
        currentNodeForDrilldown.data.expanded = true;

        // Re-render tree
        renderTree();

        updateStatus(`Showing ${displayChildren.length} categories - Click to drill further`);

    } catch (error) {
        console.error('Error drilling down:', error);
        updateStatus('Error: ' + error.toString());
    }
}

/**
 * Filter dimensions in selector
 */
function filterDimensions() {
    const search = document.getElementById('dimensionSearch').value.toLowerCase();
    const items = document.querySelectorAll('.dimension-list li');

    items.forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(search) ? 'block' : 'none';
    });
}

/**
 * Reset tree to root
 */
function resetToRoot() {
    if (!treeData) return;

    // Clear all children
    function clearChildren(node) {
        node.children = null;
        node.expanded = false;
    }

    clearChildren(treeData);
    renderTree();

    updateStatus('Reset to root');
}

/**
 * Open configuration dialog
 */
function openConfigDialog() {
    document.getElementById('showRecordCounts').checked = config.showRecordCounts;
    document.getElementById('orientationSelect').value = config.orientation;
    document.getElementById('nodeColor').value = config.nodeColor;

    document.getElementById('configDialog').style.display = 'flex';
}

/**
 * Close configuration dialog
 */
function closeConfigDialog() {
    document.getElementById('configDialog').style.display = 'none';
}

/**
 * Save configuration
 */
function saveConfiguration() {
    config.showRecordCounts = document.getElementById('showRecordCounts').checked;
    config.orientation = document.getElementById('orientationSelect').value;
    config.nodeColor = document.getElementById('nodeColor').value;

    // Save to Tableau settings
    tableau.extensions.settings.set('showRecordCounts', config.showRecordCounts.toString());
    tableau.extensions.settings.set('orientation', config.orientation);
    tableau.extensions.settings.set('nodeColor', config.nodeColor);

    tableau.extensions.settings.saveAsync().then(() => {
        console.log('Settings saved');

        // Re-initialize tree with new orientation
        initializeTree();

        // Re-render if data exists
        if (treeData) {
            renderTree();
        }

        closeConfigDialog();
    });
}

/**
 * Load settings from Tableau
 */
function loadSettings() {
    const savedShowCounts = tableau.extensions.settings.get('showRecordCounts');
    const savedOrientation = tableau.extensions.settings.get('orientation');
    const savedColor = tableau.extensions.settings.get('nodeColor');

    if (savedShowCounts) config.showRecordCounts = savedShowCounts === 'true';
    if (savedOrientation) config.orientation = savedOrientation;
    if (savedColor) config.nodeColor = savedColor;
}

/**
 * Configure function for settings dialog
 */
function configure() {
    // This is called when user clicks configure in Tableau
    // For now, we use our custom config dialog
    return Promise.resolve();
}

/**
 * Utility: Update status message
 */
function updateStatus(message) {
    document.getElementById('status').textContent = message;
}

/**
 * Utility: Format value for display
 */
function formatValue(value) {
    if (value >= 1000000) {
        return (value / 1000000).toFixed(1) + 'M';
    } else if (value >= 1000) {
        return (value / 1000).toFixed(1) + 'K';
    }
    return value.toFixed(0);
}

/**
 * Utility: Truncate text
 */
function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
}

/**
 * Show tooltip on node hover
 */
function showTooltip(event, d) {
    const tooltip = d3.select('body')
        .append('div')
        .attr('class', 'tooltip')
        .style('display', 'block')
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 10) + 'px')
        .html(`
            <strong>${d.data.name}</strong><br/>
            Value: ${d.data.value.toLocaleString()}<br/>
            Percentage: ${d.data.percentage.toFixed(2)}%<br/>
            Records: ${d.data.count.toLocaleString()}<br/>
            ${d.data.children ? '<em>Click to collapse</em>' : '<em>Click to drill down</em>'}
        `);
}

/**
 * Hide tooltip
 */
function hideTooltip() {
    d3.selectAll('.tooltip').remove();
}
