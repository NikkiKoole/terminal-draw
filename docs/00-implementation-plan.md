# Terminal Draw - Implementation Plan

## Project Overview

**terminal-draw** is a web-based ASCII art editor that renders true text glyphs in the DOM (no canvas). It features a 3-layer system with compositing, drawing tools, smart connectivity for box-drawing characters, and per-layer ligature support.

**Tech Stack:**
- Vanilla JavaScript (ES6 modules)
- Plain CSS (CSS Grid for layout)
- Modern browsers only

**Font:** JetBrains Mono (supports ligatures and box-drawing characters)

---

## File Structure

```
terminal-draw/
├── index.html
├── assets/
│   └── JetBrainsMono-Medium.woff2
├── src/
│   ├── app.js                    (main entry point, initialization)
│   ├── core/
│   │   ├── Scene.js              (Scene model & methods)
│   │   ├── Layer.js              (Layer model)
│   │   ├── Cell.js               (Cell model)
│   │   ├── constants.js          (default palette, sizes, presets)
│   │   └── StateManager.js       (pub/sub for state changes)
│   ├── renderer/
│   │   ├── LayerRenderer.js      (renders layers to DOM, cell mode)
│   │   ├── HitTestOverlay.js     (handles mouse events, coordinate mapping)
│   │   └── Compositor.js         (compositing logic for visual output)
│   ├── tools/
│   │   ├── Tool.js               (base class/interface)
│   │   ├── BrushTool.js
│   │   ├── EraserTool.js
│   │   └── PickerTool.js
│   ├── ui/
│   │   ├── Toolbar.js            (tool selection)
│   │   ├── LayerPanel.js         (layer visibility/lock/active)
│   │   └── ColorPalette.js       (fg/bg color picker)
│   └── utils/
│       ├── clipboard.js          (copy composited text)
│       └── export.js             (JSON export/import)
└── styles/
    ├── main.css                  (globals, layout, font setup)
    ├── grid.css                  (grid rendering, cell styles)
    └── ui.css                    (toolbar, panels, controls)
```

---

## Core Design Patterns

### State Management
- Single source of truth: `Scene` object
- `StateManager` uses simple pub/sub pattern
- Tools modify state via Scene methods
- Renderer subscribes to state changes

### Rendering Strategy (Milestone 1 - Cell Mode)
```
DOM structure:
<div id="editor">
  <div class="grid-container">
    <!-- Hit test layer (top, handles all events) -->
    <div class="hit-test-layer"></div>
    
    <!-- Visual layers (no pointer events) -->
    <div class="visual-layer" data-layer="bg">
      <span class="cell fg-0 bg-1">█</span>
      <span class="cell fg-7 bg--1">A</span>
      <!-- ... w*h cells -->
    </div>
    <div class="visual-layer" data-layer="mid">...</div>
    <div class="visual-layer" data-layer="fg">...</div>
  </div>
  
  <!-- UI panels -->
  <div class="layer-panel">...</div>
  <div class="toolbar">...</div>
  <div class="color-palette">...</div>
</div>
```

---

## Milestone 1 - Core Editor Scaffold

**Goal:** Basic working editor with brush/eraser/picker and copy-to-clipboard

**Estimated Time:** 15-20 hours

### Step 1: Project Setup ✅ COMPLETE
- [x] Create `index.html` with basic structure
- [x] Set up CSS with font-face for JetBrains Mono
- [x] Define CSS custom properties (colors, cell size)
- [x] Test font rendering with sample box-drawing characters
- [x] Set up ES6 modules (type="module" in script tag)
- [x] Add Bun/Vite dev server setup
- [x] Implement cell-based rendering with row wrappers
- [x] Create background grid layer (single div)
- [x] Add scale controls (slider + scale-to-fit button)
- [x] Implement palette system with 10 color schemes
- [x] Clean and organize code structure

**Deliverable:** Working grid with seamless rendering, scaling, and palette switching ✅

**Key Decisions Made:**
- Cell-based rendering with row wrappers for seamless box-drawing characters
- Separate background layer (single colored div) vs per-cell backgrounds
- Dynamic palette switching via CSS custom properties
- Scale-to-fit calculates from background-grid dimensions
- Test pattern demonstrates font capabilities (will be replaced in Step 2)

---

### Step 2: Core Data Models ✅ COMPLETE

#### Cell.js ✅ COMPLETE
- [x] Simple class with `{ch, fg, bg}`
- [x] Default values: `ch = ' '`, `fg = 7`, `bg = -1`
- [x] Methods: `clone()`, `equals()`, `isEmpty()`, `clear()`, `toObject()`, `fromObject()`
- [x] **23 tests passing** - constructor, clone, equals, isEmpty, clear, serialization

#### Layer.js ✅ COMPLETE
- [x] Properties: `{id, name, visible, locked, ligatures, cells[]}`
- [x] Methods:
  - `getCell(x, y)` - returns Cell at coords
  - `setCell(x, y, cell)` - updates cell at coords
  - `getCellIndex(x, y)` - converts coords to array index
  - `isValidCoord(x, y)` - bounds checking
  - `clear()` - resets all cells to defaults
  - `fill(cell)` - fills layer with cell
  - `getRegion(x, y, w, h)` - copy region
  - `setRegion(x, y, region)` - paste region
  - `clone()` - deep copy layer
  - `getStats()` - layer statistics
  - `toObject()` / `fromObject()` - serialization
- [x] **42 tests passing** - coordinates, bounds, regions, fill, clone, serialization

#### constants.js ✅ COMPLETE
- [x] Default grid size: 80×25
- [x] DEFAULT_PALETTE_ID: "default" (references palettes.json)
- [x] Default cell values: char=' ', fg=7, bg=-1
- [x] Layer IDs: LAYER_BG, LAYER_MID, LAYER_FG
- [x] **10 Glyph preset categories** (1,300+ characters):
  - BASIC_TEXT (88 chars) - A-Z, a-z, 0-9
  - ACCENTED_LETTERS (316 chars) - International characters
  - GREEK_CYRILLIC (197 chars) - Greek & Cyrillic alphabets
  - PUNCTUATION_CURRENCY (72 chars) - Punctuation & currency symbols
  - MATH_OPERATORS (161 chars) - Mathematical symbols
  - OTHERS (55 chars) - Emoji-like symbols
  - ARROWS (41 chars) - Directional arrows
  - SHAPES_GEOMETRY (52 chars) - Shapes, geometry, blocks
  - BOX_DRAWING (128 chars) - Box-drawing characters
  - SPECIAL_SYMBOLS (208 chars) - APL, programming, terminal symbols
- [x] Helper exports: ALL_GLYPHS, GLYPH_CATEGORIES
- [x] **15 tests passing** - defaults, palette ID, layer IDs, glyph categories
- [x] **Category reorganization** (Dec 2024) - Reduced from 24 to 10 balanced categories

#### Scene.js ✅ COMPLETE
- [x] Properties: `{w, h, paletteId, layers[], activeLayerId, options}`
- [x] Methods:
  - `getActiveLayer()` - returns current active layer
  - `getLayer(id)` - returns layer by id
  - `setActiveLayer(id)` - switch active layer
  - `addLayer(layer)` - add new layer
  - `removeLayer(id)` - remove layer by id
  - `getVisibleLayers()` - get all visible layers
  - `clearAll()` - clear all layers
  - `getCellIndex(x, y)` - converts coords to index
  - `isValidCoord(x, y)` - bounds checking
  - `toObject()` / `fromObject()` - serialization
- [x] Initializes with 3 default layers (bg, mid, fg)
- [x] **53 tests passing** - constructor, layer management, active layer, coordinates, serialization, integration tests

#### StateManager.js ✅ COMPLETE
- [x] Simple event emitter pattern
- [x] Methods:
  - `on(event, callback)` - subscribe to event (returns unsubscribe function)
  - `off(event, callback)` - unsubscribe from event
  - `emit(event, data)` - emit event with optional data
  - `clear(event)` - remove all listeners for event
  - `listenerCount(event)` - get number of listeners
  - `hasListeners(event)` - check if event has listeners
  - `eventNames()` - get all registered event names
- [x] Supports events: `'scene:updated'`, `'layer:changed'`, `'tool:changed'`, `'cell:changed'`
- [x] Error handling for callback exceptions
- [x] **46 tests passing** - on/off/emit, multiple callbacks, error handling, integration tests

**Deliverable:** Data models tested and ready for use ✅ COMPLETE (4/4 modules, 179 tests passing)

**Testing Infrastructure Added:**
- ✅ Bun test runner with watch mode
- ✅ **179 tests passing** (23 Cell + 42 Layer + 15 constants + 53 Scene + 46 StateManager)
- ✅ Bun runtime and package manager
- ✅ Test commands: `bun test`, `bun run test:watch`

---

### Step 3: Basic Rendering ✅ COMPLETE (2-3 hours)

#### LayerRenderer.js (Cell Mode) ✅ COMPLETE
- [x] `render(layer, container)` - creates grid-row divs with cell `<span>` elements
- [x] `createCellElement(cell, x, y)` - creates individual cell spans
- [x] `updateCell(layer, container, x, y)` - patches single cell (dirty update)
- [x] Apply classes: `fg-X`, `bg-Y` for colors
- [x] Handle visibility: adds `.hidden` class if `layer.visible === false`
- [x] Handle ligatures: adds `.ligatures-enabled` class if enabled
- [x] Cell content: uses `textContent` for glyph
- [x] Track rendered containers with WeakMap
- [x] Methods: `updateVisibility()`, `updateLigatures()`, `clear()`, `isRendered()`
- [x] **43 tests passing** - render, createCellElement, updateCell, visibility, ligatures, cleanup

#### Compositor.js ✅ COMPLETE
- [x] `getVisibleCell(x, y, scene)` - applies compositing rules:
  - Glyph + FG: from topmost visible layer where `ch !== ' '`
  - BG: from topmost visible layer where `bg !== -1`
- [x] `getVisibleRegion(x, y, width, height, scene)` - composite rectangular region
- [x] `exportScene(scene)` - export entire scene as 2D cell array
- [x] `exportAsText(scene)` - export as plain text with newlines
- [x] `exportAsANSI(scene)` - export with ANSI color codes
- [x] Used for copy/export operations, not for rendering
- [x] Respects layer visibility settings
- [x] **37 tests passing** - compositing rules, region export, text export, ANSI export

#### grid.css ✅ COMPLETE
- [x] CSS custom properties: `--grid-w`, `--grid-h`, `--cell-size`
- [x] `.visual-layer` styles:
  - `position: absolute`
  - `pointer-events: none`
  - z-index layering (bg: 2, mid: 3, fg: 4)
- [x] `.grid-row` styles:
  - `display: block`
  - `line-height: 0`, `font-size: 0`
  - `white-space: nowrap`
- [x] `.cell` styles:
  - Fixed width/height via `--cell-size`
  - `font-family: 'JetBrains Mono'`
  - `line-height: var(--cell-size)`
  - `text-align: center`
  - Ligatures disabled by default
- [x] Color classes `.fg-0` through `.fg-7`, `.bg-0` through `.bg-7`, `.bg--1`
- [x] `.hidden` class for invisible layers

#### Integration ✅ COMPLETE
- [x] Updated `app.js` to use Scene + LayerRenderer
- [x] Replaced manual DOM manipulation with Scene-based rendering
- [x] Test pattern renders on all 3 layers
- [x] Existing UI controls (palette, scale) still work

**Deliverable:** Scene renders to DOM with all 3 layers visible ✅ COMPLETE

**Testing:**
- ✅ 80 tests passing (43 LayerRenderer + 37 Compositor)
- ✅ Visual rendering verified in browser
- ✅ All 3 layers render with proper z-index stacking
- ✅ Color classes applied correctly
- ✅ Scale/zoom works with rendering

---

### Step 4: Hit Test Overlay ✅ COMPLETE (1-2 hours)

#### HitTestOverlay.js ✅ COMPLETE
- [x] Create transparent overlay matching grid dimensions (already in HTML)
- [x] `getCellCoords(mouseEvent)` - converts pixel position to (x, y) grid coords
- [x] `getCellDimensions()` - measures actual cell width and height separately
- [x] `updateOverlaySize()` - dynamically sets overlay size to match rendered grid
- [x] Account for scale/zoom transforms via `updateScale(newScale)`
- [x] Track mouse states: `isDown`, `lastX`, `lastY`, `hoverX`, `hoverY`
- [x] Event handlers:
  - `mousedown` → emit `'cell:down'` with {x, y, button, modifiers}
  - `mousemove` → emit `'cell:hover'` with {x, y}
  - `mousemove` (if down) → emit `'cell:drag'` with {x, y, button, modifiers}
  - `mouseup` → emit `'cell:up'` with {x, y, button, modifiers}
  - `mouseleave` → emit `'cell:hover'` with {x: null, y: null} and `'cell:leave'`
- [x] Prevent duplicate events for same cell (tracks last coordinates)
- [x] `setCursor(cursorType)` - updates CSS cursor
- [x] `destroy()` - cleanup resources
- [x] **45 tests passing** - getCellCoords, scale handling, mouse events, hover tracking, duplicate prevention

#### Integration ✅ COMPLETE
- [x] Integrated into `app.js` with StateManager
- [x] Visual hover feedback - yellow highlight on current cell
- [x] Status bar shows cell coordinates and scale
- [x] Scale synchronization when zoom changes
- [x] Overlay size updates after rendering and scale changes
- [x] Debug logging removed, clean production code

#### CSS Fixes ✅ COMPLETE
- [x] Hit-test-layer uses `1ch` for width with proper font-family/font-size
- [x] Dynamic size calculation ensures accurate mouse tracking
- [x] Works across entire grid at all zoom levels

**Deliverable:** Mouse clicks translate to grid coordinates ✅ COMPLETE

**Testing:**
- ✅ 45 tests passing
- ✅ Coordinate conversion verified at multiple scales (10%, 50%, 100%, 200%, 500%)
- ✅ Visual hover feedback working accurately across entire grid
- ✅ Status bar updates in real-time
- ✅ Fixed coordinate calculation: separate width/height measurement
- ✅ Fixed overlay size: dynamically calculated from rendered cells

---

### Step 5: Tool System ✅ COMPLETE (2-3 hours)

#### Tool.js (Base Class)
```javascript
class Tool {
  constructor() {
    this.name = 'Tool';
  }
  
  onCellDown(x, y, scene, state) {}
  onCellDrag(x, y, scene, state) {}
  onCellUp(x, y, scene, state) {}
  getCursor() { return 'default'; }
}
```

#### BrushTool.js ✅ COMPLETE
- [x] Properties: `currentCell = {ch, fg, bg}`
- [x] `onCellDown()` + `onCellDrag()`: 
  - Get active layer from scene
  - Check if locked → return early
  - `layer.setCell(x, y, currentCell)`
  - Emit `'cell:changed'` event
  - Track dirty cells for undo (later)
- [x] `getCursor()`: return `'crosshair'`

#### EraserTool.js ✅ COMPLETE
- [x] `onCellDown()` + `onCellDrag()`:
  - Get active layer
  - Check if locked → return early
  - Set cell to defaults: `{ch: ' ', fg: 7, bg: -1}`
  - Emit `'cell:changed'` event
- [x] `getCursor()`: return `'not-allowed'`

#### PickerTool.js ✅ COMPLETE
- [x] `onCellDown()`:
  - Get active layer
  - Read cell at (x, y)
  - Update brush tool's `currentCell`
  - Emit `'tool:picked'` event
  - Auto-switch back to brush tool
- [x] `getCursor()`: return `'copy'` (changed from crosshair for better UX)

**Deliverable:** ✅ Can switch tools and paint on grid

---

### Step 6: Basic UI ✅ COMPLETE (2-3 hours)

#### Toolbar.js ✅ COMPLETE
- [x] Create tool buttons: Brush, Eraser, Picker
- [x] Click handler: `setActiveTool(toolName)`
- [x] Visual indication of active tool (CSS class)
- [x] Listen to `'tool:changed'` to update UI
- [x] Display current glyph/fg/bg for brush

#### ColorPalette.js ✅ COMPLETE
- [x] Display 8 foreground color swatches
- [x] Display 8 background color swatches + transparent option
- [x] Click handlers: `setForeground(index)`, `setBackground(index)`
- [x] Visual indication of current selection
- [x] Update brush tool's `currentCell` on change

#### LayerPanel.js ✅ COMPLETE
- [x] Render 3 layer rows (BG, MID, FG)
- [x] Each row shows:
  - Layer name
  - Visibility toggle (eye icon or checkbox)
  - Lock toggle (lock icon or checkbox)
  - Active indicator (radio button or highlight)
- [x] Click handlers:
  - Toggle visibility → update `layer.visible`, re-render layer
  - Toggle lock → update `layer.locked`
  - Click row → set as active layer
- [x] Listen to `'layer:changed'` to update UI

#### GlyphPicker.js ✅ COMPLETE
- [x] Modal with 23 glyph categories (expanded from original 14)
- [x] Category dropdown filter
- [x] Click glyph → update brush tool's `currentCell.ch`
- [x] Display current glyph in trigger button
- [x] Auto-updates when picker tool samples character

**Deliverable:** Full UI for tool/layer/color selection

---

### Step 7: Copy to Clipboard ✅ COMPLETE (1 hour)

#### ClipboardManager.js ✅ COMPLETE
- [x] Export as plain text (uses Compositor.exportAsText)
- [x] Export as ANSI with color codes (uses Compositor.exportAsANSI)
- [x] Export single layer
- [x] Clipboard API integration with error handling
- [x] Event emission (export:success, export:error)
- [x] Statistics tracking (character count, line count)
- [x] Three export buttons in UI (Text, ANSI, Layer)
- [x] Success/error feedback messages
- [x] Auto-hide status after 3 seconds
- [x] 34 comprehensive tests

**Deliverable:** Full clipboard export functionality with multiple formats

---

### Step 8: Integration & App Setup ✅ COMPLETE (1-2 hours)

#### app.js ✅ COMPLETE
- [x] Import all modules
- [x] Initialize Scene with default values (80×25, 3 layers, default palette)
- [x] Create StateManager instance
- [x] Create LayerRenderer instances for each layer
- [x] Create HitTestOverlay instance
- [x] Create Tool instances (Brush, Eraser, Picker)
- [x] Create UI component instances (Toolbar, LayerPanel, ColorPalette, GlyphPicker)
- [x] Wire up event listeners:
  - Hit test events → active tool methods
  - Tool methods → scene updates
  - Scene updates → renderer updates
  - UI interactions → state changes
- [x] Perform initial render of all layers
- [x] Set default active tool (Brush)
- [x] Initialize all UI components (Steps 1-7 integration)
- [x] Scale controls and palette selector working
- [x] Complete event-driven architecture

**Deliverable:** Fully functional application

---

### Step 8b: Save/Load Projects ✅ COMPLETE (1-2 hours) [BONUS]

#### ProjectManager.js ✅ COMPLETE
- [x] Serialize scene to JSON with metadata (version, name, timestamp)
- [x] Deserialize JSON back to Scene
- [x] Version validation and format checking
- [x] File download (Blob + URL.createObjectURL)
- [x] File upload (FileReader + file.text())
- [x] Event emission (project:saved, project:loaded, project:error)
- [x] Scene replacement and component updates
- [x] 49 comprehensive tests

#### UI Integration ✅ COMPLETE
- [x] Save Project button with filename prompt
- [x] Load Project button with file picker
- [x] Drag-and-drop zone for JSON files
- [x] Visual feedback (drag-over animation)
- [x] Confirmation before replacing work
- [x] Success/error status messages

**Deliverable:** Complete project persistence system

**Note:** This was originally planned for a future milestone but was implemented ahead of schedule.

---

### Step 9: Testing & Polish ✅ COMPLETE (1-2 hours)

#### Functionality Tests ✅ COMPLETE
- [x] Draw with brush on each layer
- [x] Verify layer compositing (glyph from top, bg from top non-transparent)
- [x] Test layer visibility toggle (hidden layers don't show)
- [x] Test layer locking (can't edit locked layers)
- [x] Test switching active layer
- [x] Test eraser (sets to space + transparent bg)
- [x] Test picker (copies cell values)
- [x] Test copy output:
  - Correct dimensions (80 chars × 25 lines)
  - Trailing spaces preserved
  - Compositing correct
- [x] Test ANSI output (colors render correctly in terminal)

#### Performance Check ⏳ PENDING
- [ ] Smooth drawing at 60fps on 80×25 grid
- [ ] No lag when switching layers/tools

#### Visual Polish ✅ MOSTLY COMPLETE
- [x] Consistent spacing and alignment
- [x] Clear visual feedback for active tool/layer
- [x] Proper cursor display
- [x] Color contrast for readability
- [x] Cleaner palette indicators (corner triangles instead of colored borders)
- [ ] Minor: transparency swatch indicator visibility (deferred)

#### UX Improvements ✅ COMPLETE
- [x] Keyboard shortcuts:
  - [x] B = Brush tool
  - [x] E = Eraser tool
  - [x] P = Picker tool
  - [x] L = Cycle layers (fg → mid → bg)
- [x] Glyph category reorganization (24 → 10 categories, 1,318 glyphs preserved)
- [x] Clickable layer items (entire button, not just text)
- [x] Updated layer panel header to "[L]ayers"
- [x] Cleaner palette indicators with corner triangles
- [ ] Clear canvas button (deferred to future milestone)
- [ ] Grid size display (deferred to future milestone)

**Deliverable:** Polished, working Milestone 1 ✅ COMPLETE

**Documentation Added:**
- `docs/GLYPH-CATEGORY-REORGANIZATION.md` - Detailed glyph reorganization
- `docs/UX-IMPROVEMENTS.md` - Layer and palette enhancements
- `docs/STEP-9-PROGRESS.md` - Updated progress tracking

---

## Milestone 1 Success Criteria ✅ COMPLETE

✅ Can draw with brush using different glyphs/colors  
✅ Can erase cells  
✅ Can pick colors/glyphs from existing cells  
✅ Layer visibility toggles work correctly  
✅ Can't edit locked layers  
✅ Switching active layer works  
✅ Copy produces correct plain text (80 chars × 25 lines)  
✅ Compositing shows correct result (glyph from top, bg from top non-transparent)  
✅ Keyboard shortcuts implemented (B, E, P, L)  
✅ Glyph categories reorganized (10 balanced categories)  
✅ UX improvements (clickable layers, cleaner palette indicators)  
⏳ Performance validation pending (expected to pass)

**Status:** Milestone 1 complete (~97%) - Only performance validation remains

---

## Key Implementation Notes

### CSS Grid for Cell Layout
- Each layer uses CSS Grid with `grid-template-columns: repeat(80, var(--cell-size))`
- `--cell-size` should be tuned for square-ish cells (JetBrains Mono is close to 1:2 ratio)

### Color Classes
- Generate CSS classes `.fg-0` through `.fg-7` and `.bg-0` through `.bg-7`
- Use CSS custom properties for palette colors (easy theme switching later)
- `.bg--1` has `background: transparent`

### Dirty Tracking
- Keep a `Set<number>` of dirty cell indices per layer
- On each animation frame, batch update only dirty cells
- Clear dirty set after update

### Event Delegation
- Hit test overlay uses single element with math to calculate cell coords
- Formula: `x = Math.floor(mouseX / cellWidth)`, `y = Math.floor(mouseY / cellHeight)`

### State Updates Flow
1. User interaction (mouse/keyboard) → Tool
2. Tool modifies Scene via Layer methods
3. Layer/Scene emits events via StateManager
4. Renderers listen and update only changed DOM elements

---

## Future Milestones (Reference)

### Milestone 2: Layer UX + Undo/Redo + Resize
- Undo/redo system (command pattern)
- Grid resize with pad/crop options
- JSON export/import

### Milestone 3: Selection + Clipboard
- Rectangle selection tool
- Move, copy, cut, paste operations
- Flip horizontal/vertical

### Milestone 4: Line/Rect Tools + Smart Connectivity
- Line tool (Manhattan + Shift-constrain)
- Rectangle tool
- Smart connectivity toggle
- Box-drawing junction resolver

### Milestone 5: Ligatures Per Layer
- Row-run rendering mode
- Per-layer ligature toggle
- Ensure copy output unchanged

---

## Development Notes

### Date Started: 2024-12-30
### Step 1 Completed: 2024-12-30
### Step 2 Completed: 2024-12-30 (All 4 modules complete - 197 tests passing)
### Step 3 Completed: 2024-12-30 (LayerRenderer + Compositor - 277 tests passing)
### Step 4 Completed: 2024-12-30 (HitTestOverlay - 322 tests passing)
### Step 5 Completed: 2024-12-30 (Tool System - 398 tests passing)
### Current Milestone: 1 (In Progress)
### Step 6 Completed: 2024-12-30 (UI Components - 398 tests passing)
### Step 7 Completed: 2024-12-30 (Clipboard Export - 432 tests passing)
### Step 8 Completed: 2024-12-30 (Integration & App Setup - 432 tests passing)
### Step 8b Completed: 2024-12-30 (Save/Load Projects - 481 tests passing)
### Current Step: Step 9 - Testing & Polish (Next)
### Next: Final testing, polish, and optional enhancements

### Step 1 Accomplishments:
- ✅ Project structure with Vite dev server
- ✅ Cell-based rendering with seamless box-drawing
- ✅ Palette system with 10 color schemes (JSON-based)
- ✅ Scaling controls (10-1000%, auto-fit)
- ✅ Clean, organized codebase ready for Step 2

### Key Technical Decisions:
1. **Rendering Approach**: Row-based wrapping with individual cell spans
   - Each row is a `<div class="grid-row">` containing cell `<span>`s
   - Parent has `font-size: 0` to eliminate inline-block gaps
   - Achieves seamless character connection for box-drawing
   
2. **Background Layer**: Single colored div instead of 2000 cell divs
   - More efficient: `background-grid` is one div with calculated dimensions
   - Scales used for dimension calculations (via getBoundingClientRect)
   
3. **Palette System**: Dynamic CSS custom property updates
   - Palettes stored in JSON with single `colors` array (8 colors)
   - Applied to both `--color-fg-X` and `--color-bg-X` variables
   - Instant theme switching without page reload
   
4. **Scaling**: Transform-based with viewport-aware calculations
   - Range: 10% to 1000% (slider control)
   - Auto-fit calculates optimal scale from available editor space
   - Uses `requestAnimationFrame` for accurate dimension measurement

### Issues Resolved:
- ✅ CORS issues with file:// protocol → Added Vite dev server
- ✅ Cell gaps in grid → Row wrappers + font-size: 0 on parent
- ✅ Background rendering → Separate layer approach
- ✅ Scale-to-fit accuracy → Measure background-grid after transform reset

### Files Created (Step 1):
- `index.html` - Clean structure, no test code in header
- `src/app.js` - Well-organized with JSDoc comments
- `src/palettes.json` - 10 curated color schemes
- `styles/main.css` - Global styles, CSS variables, layout
- `styles/grid.css` - Grid and cell rendering
- `styles/ui.css` - Sidebar, controls, palette UI
- `package.json` - Vite dev server setup
- `.gitignore` - Node modules, build artifacts

### Step 2 Progress (100% Complete):
**Completed:**
- ✅ Cell.js with full test coverage (23 tests)
- ✅ Layer.js with comprehensive tests (42 tests)
- ✅ Scene.js with full test coverage (53 tests)
- ✅ StateManager.js with comprehensive tests (46 tests)
- ✅ constants.js with 14 glyph categories (15 tests)
- ✅ Testing infrastructure (Bun test runner)
- ✅ integration.test.js (18 tests)
- ✅ **197 tests passing** (all modules complete)

**Files Created:**
- `src/core/Cell.js` + `tests/Cell.test.js`
- `src/core/Layer.js` + `tests/Layer.test.js`
- `src/core/constants.js` + `tests/constants.test.js`
- `src/core/Scene.js` + `tests/Scene.test.js`
- `src/core/StateManager.js` + `tests/StateManager.test.js`
- `tests/integration.test.js`

**Key Decisions:**
- Use palettes.json as single source of truth (not duplicated in constants)
- DEFAULT_PALETTE_ID references palette by ID
- Scene initializes with 3 default layers (bg, mid, fg)
- StateManager returns unsubscribe function from on() for convenience
- 14 glyph categories: Box styles, Shading, Math, Arrows, Currency, etc.
- Test-driven development approach working well

### Step 3 Progress (100% Complete):
**Completed:**
- ✅ LayerRenderer.js with comprehensive tests (43 tests)
- ✅ Compositor.js with full coverage (37 tests)
- ✅ Scene-based rendering integrated into app.js
- ✅ **277 tests passing** (197 previous + 80 new)

**Files Created:**
- `src/rendering/LayerRenderer.js` + `tests/LayerRenderer.test.js`
- `src/rendering/Compositor.js` + `tests/Compositor.test.js`
- `STEP-3-COMPLETION.md`

**Key Decisions:**
- Visual compositing via CSS z-index (not JavaScript)
- Compositor for logical compositing (export only)
- Row-based DOM structure with grid-row divs
- WeakMap for container tracking (no memory leaks)
- JSDOM for testing DOM rendering
- Export utilities: text and ANSI colored text

### Step 4 Progress (100% Complete):
- ✅ HitTestOverlay.js - 45 tests passing
- ✅ Mouse → cell coordinate conversion with scale support
- ✅ Event emission: cell:hover, cell:down, cell:drag, cell:up, cell:leave
- ✅ Visual hover feedback (yellow highlight)
- ✅ Status bar integration
- ✅ Dynamic overlay sizing
- ✅ Total: 322 tests passing

### Step 5 Progress (100% Complete):
- ✅ Tool.js - Base class with interface (12 tests)
- ✅ BrushTool.js - Paint cells (24 tests)
- ✅ EraserTool.js - Clear cells (20 tests)
- ✅ PickerTool.js - Sample colors (20 tests)
- ✅ Integration in app.js with event handlers
- ✅ Tool buttons in sidebar with active state
- ✅ Cursor changes per tool
- ✅ Picker auto-switches to brush
- ✅ DOM updates on cell changes
- ✅ Total: 398 tests passing (76 new tests)

### Step 6 Progress (100% Complete):
- ✅ LayerPanel.js - Layer management UI component
- ✅ GlyphPicker.js - Modal character picker with 23 categories
- ✅ Interactive color palette (left/right click for fg/bg)
- ✅ Color preview cell
- ✅ Trigger button showing current character
- ✅ Expanded glyph system from 14 to 23 categories (500+ characters)
- ✅ Full UI integration in app.js
- ✅ Updated constants.test.js for new glyph structure
- ✅ Layer visibility/lock/active controls
- ✅ Auto-updates when picker tool samples
- ✅ Total: 398 tests passing (all tests updated)

### Step 7 Progress (100% Complete):
- ✅ ClipboardManager.js - Clipboard export management
- ✅ Export as plain text (all visible layers composited)
- ✅ Export as ANSI with color codes for terminals
- ✅ Export single layer only
- ✅ Clipboard API integration with error handling
- ✅ Event emission (export:success, export:error)
- ✅ Three export buttons in sidebar UI
- ✅ Success/error status messages with auto-hide
- ✅ Character and line count display
- ✅ 34 comprehensive tests for ClipboardManager
- ✅ Layer visibility respected during export
- ✅ Total: 432 tests passing (34 new tests)

### Step 8 Progress (100% Complete):
- ✅ All modules integrated in app.js
- ✅ Scene initialization with 80×25 grid, 3 layers, default palette
- ✅ StateManager created and wired to all components
- ✅ LayerRenderer rendering all layers
- ✅ HitTestOverlay capturing mouse events
- ✅ Tools (Brush, Eraser, Picker) fully functional
- ✅ UI components (LayerPanel, GlyphPicker, ColorPalette) integrated
- ✅ Event-driven architecture complete
- ✅ All event listeners wired up correctly
- ✅ Initial render working
- ✅ Default tool (Brush) set
- ✅ Total: 432 tests passing (integration verified)

### Step 8b Progress (100% Complete) [BONUS]:
- ✅ ProjectManager.js - Complete save/load system
- ✅ JSON serialization with metadata (version, name, timestamp)
- ✅ File download as .json (Blob + URL.createObjectURL)
- ✅ File upload with FileReader API
- ✅ Drag-and-drop zone with visual feedback
- ✅ Scene replacement updating all components
- ✅ Confirmation dialog before replacing work
- ✅ Version validation (1.0)
- ✅ Format validation and error handling
- ✅ 49 comprehensive tests for ProjectManager
- ✅ Round-trip preservation verified (save → load → identical)
- ✅ Total: 481 tests passing (49 new tests)

### Step 9 Progress (In Progress):
- ✅ Functionality Tests - All manual tests passed
  - Draw with brush on each layer ✓
  - Layer compositing verified ✓
  - Layer visibility toggle working ✓
  - Layer locking working ✓
  - Active layer switching working ✓
  - Eraser functionality verified ✓
  - Picker functionality verified ✓
  - Copy output verified (dimensions, spacing, compositing) ✓
  - ANSI output tested and working ✓
- ⏳ Performance Check - Pending
- ⏳ Visual Polish - Pending
- ⏳ Optional Enhancements - Pending

### Step 4 Archived Progress:
**Completed:**
- ✅ HitTestOverlay.js with comprehensive tests (45 tests)
- ✅ Mouse → cell coordinate conversion with scale support
- ✅ Event emission via StateManager
- ✅ Visual hover feedback (yellow highlight)
- ✅ Status bar integration
- ✅ Dynamic overlay sizing to match rendered grid
- ✅ Separate width/height measurement for accurate tracking
- ✅ **322 tests passing** (277 previous + 45 new)

**Files Created:**
- `src/input/HitTestOverlay.js` + `tests/HitTestOverlay.test.js`
- `STEP-4-COMPLETION.md`

**Key Decisions:**
- Event-driven architecture (emit events, don't call tools)
- Explicit scale parameter (not read from DOM)
- Duplicate event prevention (track last coordinates)
- Separate hover and click state
- Visual feedback for user interaction
- Floor coordinates (not round) for consistent selection
- Dynamic size calculation: measure actual rendered cells
- Separate width/height: handle non-square character dimensions
- CSS: use 1ch with proper font settings for accurate sizing

---

## Resources

- [Design Document](./design-document.md)
- [Box Drawing Unicode Chart](https://en.wikipedia.org/wiki/Box-drawing_character)
- [JetBrains Mono Font](https://www.jetbrains.com/lp/mono/)