# Tableau Decomposition Tree Extension

Interactive hierarchical decomposition visualization for Tableau Desktop.

## Overview

This extension allows users to interactively drill down through multiple dimensions to understand the composition and drivers of key metrics, similar to Power BI's decomposition tree.

## ✨ Features

### Core Functionality
- ✅ **Interactive drill-down**: Click any node to expand by any dimension
- ✅ **Multi-level exploration**: Support for unlimited levels deep
- ✅ **Dynamic paths**: Each branch can follow different dimensions
- ✅ **Collapse/Expand**: Click expanded nodes to collapse, click again to re-expand
- ✅ **Real-time aggregation**: Calculates values by grouping underlying data
- ✅ **Automatic percentage calculation**: Shows each child's percentage of parent

### Visual Features
- ✅ **Smooth animations**: 250ms transitions for expand/collapse
- ✅ **Hover tooltips**: Detailed information on mouse hover
- ✅ **Clean design**: Professional node styling with proper spacing
- ✅ **Pan & Zoom**: Navigate large trees easily
- ✅ **Top 20 limiting**: Shows top 20 categories to avoid overwhelming display

### Configuration Options
- ✅ **Measure selection**: Choose which measure to analyze
- ✅ **Tree orientation**: Horizontal (left-to-right) or Vertical (top-to-bottom)
- ✅ **Node colors**: Customize node color scheme
- ✅ **Record counts**: Toggle visibility of record counts
- ✅ **Settings persistence**: Configuration saves with workbook

## 🚀 Quick Start

1. **Open Tableau Desktop 25.2.3+** with a workbook containing data
2. **Add Extension** to your dashboard (Objects → Extension)
3. **Browse to** `DecompositionTree.trex` in this folder
4. **Select a measure** from the dropdown
5. **Click the root node** to start exploring!

---

## Installation & Testing

### Step 1: Verify Files

Ensure you have these files in the `Decomposition_tree/` directory:
```
Decomposition_tree/
├── DecompositionTree.trex
├── index.html
├── styles.css
├── decomposition-tree.js
└── README.md
```

### Step 2: Start Local Web Server

**IMPORTANT:** Tableau requires extensions to be served over HTTP, not from local files.

**Option A: Double-click to start (easiest)**
- Double-click `start-server.command` in the Decomposition_tree folder
- A terminal window will open showing the server is running
- Keep this window open while using the extension

**Option B: Command line**
```bash
cd /Users/keithtroutt/Documents/my-claude-project/Decomposition_tree
python3 -m http.server 8000
```

You should see:
```
Starting local web server for Tableau Extension...
Extension will be available at: http://localhost:8000
```

**Keep the server running** - Don't close this terminal window!

### Step 3: Load Extension in Tableau Desktop

**This is a VIZ EXTENSION** - Add it directly to a worksheet!

1. **Open Tableau Desktop 2022.3+** (Viz extensions require 2022.3 or later)

2. **Create a worksheet** with data
   - Drag dimensions and measures to your worksheet
   - Your data should include:
     - One or more numeric measures (e.g., Sales, Profit, Quantity)
     - Multiple dimensions (e.g., Category, Region, Customer)

3. **Add the Extension to the worksheet**:
   - In the worksheet view, look for the **Analytics** pane (or Show Me)
   - Click on **"More Options"** (three dots) in the toolbar
   - Select **"Add Extension"** or find Extension in the Marks card area
   - **OR** Go to **Worksheet** menu → **Show** → **Extension**

4. **Browse to the manifest file**:
   - Click "Access Local Extensions"
   - Navigate to: `/Users/keithtroutt/Documents/my-claude-project/Decomposition_tree/`
   - Select: `DecompositionTree.trex`
   - Click "Open"

5. **Extension should load** from http://localhost:8000 and display "Extension loaded successfully"

**Note:** The extension will replace the current visualization in the worksheet view.

### Step 4: Using the Extension

1. **Select a Measure**:
   - Use the dropdown in the header to select which measure to analyze
   - The root node will appear with the total aggregated value

2. **Drill Down**:
   - Click on the root node
   - A modal will appear listing all available dimensions
   - Select a dimension to break down the data
   - The tree will expand showing child nodes

3. **Explore Further**:
   - Click on any child node to drill down further
   - Each branch can follow a different dimension path
   - Use the "Reset" button to return to the root

4. **Configure Settings** (⚙️):
   - Toggle record counts on/off
   - Change tree orientation (horizontal/vertical)
   - Customize node colors

## Current Status

### ✅ All Core Phases Complete!

**Phase 1:** Foundation ✅
- Extension loads in Tableau Desktop
- Manifest, HTML, CSS, JavaScript structure
- Tableau Extensions API integration

**Phase 2:** Data Integration ✅
- Connects to Tableau worksheet underlying data
- Identifies measures and dimensions
- Calculates root totals from raw data

**Phase 3:** Basic Tree Structure ✅
- D3.js tree layout implemented
- Node rendering with values and percentages
- Connection lines between nodes

**Phase 4:** Drill-Down Functionality ✅
- Real aggregation by selected dimension
- Groups data and calculates child values
- Percentage calculations relative to parent
- Stores filtered data for multi-level drill-downs

**Phase 5:** Navigation ✅
- Collapse/expand nodes
- Reset to root button
- Supports unlimited depth
- Each branch can follow different dimensions

**Phase 6:** Visual Polish ✅
- Smooth 250ms animations
- Fade in/out transitions
- Hover tooltips with details
- Professional styling

**Phase 7:** Configuration ✅
- Settings dialog
- Horizontal/vertical orientation
- Color customization
- Show/hide record counts
- Settings persist with workbook

**Phase 8:** Documentation ✅
- Complete README
- Usage instructions
- Troubleshooting guide

## Testing Checklist

### Basic Functionality
- [ ] Extension loads without errors
- [ ] Measure selector populates with available measures
- [ ] Root node displays with total value and record count
- [ ] Clicking node shows dimension selector modal with all dimensions
- [ ] Selecting dimension creates child nodes with correct values
- [ ] Child percentages add up to ~100% of parent
- [ ] Record counts are accurate

### Multi-Level Drill-Down
- [ ] Can drill down 3+ levels deep
- [ ] Different branches can use different dimensions
- [ ] Clicking expanded node collapses it
- [ ] Clicking collapsed node (with hidden children) expands it
- [ ] Values remain consistent after collapse/expand
- [ ] Reset button returns to root and clears all drill-downs

### Visual & UX
- [ ] Animations are smooth (no jumps or flickers)
- [ ] Hover tooltips appear with correct information
- [ ] Pan and zoom work properly
- [ ] Tree doesn't overflow container
- [ ] Node text is readable
- [ ] Dashed border indicates expandable nodes

### Configuration
- [ ] Settings dialog opens
- [ ] Orientation toggle switches between horizontal/vertical
- [ ] Color picker changes node colors
- [ ] Record count toggle shows/hides counts
- [ ] Settings persist after closing and reopening workbook
- [ ] Changes apply immediately

### Data Compatibility
- [ ] Works with integer measures (e.g., Quantity, Count)
- [ ] Works with float measures (e.g., Sales, Profit)
- [ ] Works with string dimensions (e.g., Category, Region)
- [ ] Works with date dimensions
- [ ] Handles null values appropriately
- [ ] Works with datasets of various sizes (100, 1K, 10K+ rows)

### Edge Cases
- [ ] Handles single measure datasets
- [ ] Handles no dimensions scenario (shows warning)
- [ ] Handles dimensions with 100+ unique values (shows top 20)
- [ ] Handles dimensions with special characters
- [ ] Handles very long dimension values (truncates properly)

## Troubleshooting

### Extension doesn't load
- Verify the file path in `DecompositionTree.trex` matches your actual directory
- Check browser console (Ctrl+Shift+I in extension) for errors
- Ensure Tableau Desktop version is 25.2.3 or later

### No measures or dimensions appear
- Ensure your worksheet has data
- Check that worksheet has at least one measure and one dimension
- Try refreshing the data source

### JavaScript errors
- Open the browser console within the extension (right-click → Inspect)
- Check for error messages
- Verify D3.js and Tableau Extensions API loaded correctly

## Development Notes

**Current Implementation:**
- Uses local `file://` URLs for Tableau Desktop
- Loads D3.js v7 and Tableau Extensions API from CDN
- Single-page application with vanilla JavaScript
- No external dependencies beyond D3.js

**Next Steps:**
- Implement real drill-down with Tableau data aggregation
- Add smooth animations and transitions
- Implement collapse/expand for nodes
- Performance optimization for large datasets
- Testing with diverse workbooks

## Known Limitations

- **Top 20 limit**: Only shows top 20 categories per drill-down to maintain performance
- **Desktop only**: Currently configured for Tableau Desktop with local file:// URLs
- **Single worksheet**: Extension uses the first worksheet in the dashboard
- **Sum aggregation**: Currently uses SUM for aggregating measure values
- **No saved exploration paths**: Drill-down state is lost when closing workbook
- **Cloud deployment**: Requires HTTPS hosting (future enhancement)

## Advanced Usage Tips

### Best Practices
- **Start broad**: Begin with high-level dimensions (Region, Category) before drilling into details
- **Watch the counts**: Low record counts may indicate you've drilled too deep
- **Use percentages**: Focus on categories that represent significant portions of the total
- **Reset often**: Use the Reset button to start fresh when exploring different paths
- **Save your work**: Document interesting findings as the exploration state isn't saved

### Performance Tips
- For large datasets (100K+ rows), limit initial drill-downs to dimensions with lower cardinality
- The extension shows top 20 categories automatically - use more specific filters in Tableau if needed
- Use Tableau's native filters to pre-filter data before exploring in the tree

### Troubleshooting Tips
- If nodes show unexpected values, check Tableau's aggregation settings
- If dimensions don't appear, ensure they're included in the worksheet data
- For date dimensions, Tableau may aggregate them (Year, Quarter, etc.) - drill down accordingly
- Clear browser cache and reload if extension behaves unexpectedly

## Version History

**v1.0.0** - Complete Desktop Version
- ✅ All 8 development phases complete
- Full Tableau data integration
- Real-time aggregation and drill-down
- Collapse/expand functionality
- Smooth animations and tooltips
- Horizontal and vertical orientations
- Configuration persistence
- Comprehensive documentation

---

**Questions or Issues?**
- Check browser console for detailed error messages
- Verify all files are in the correct directory
- Ensure Tableau Desktop is up to date
