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
- [x] Add npm/Vite dev server setup
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

### Step 2: Core Data Models ✅ PARTIAL (2/4 complete)

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
- [x] **14 Glyph preset categories** (100+ characters):
  - Box Light, Box Heavy, Box Double, Box Rounded
  - Shading, Dots, Arrows, Geometry
  - Triangles, Math Operators, Extended Arrows
  - Currency, Common Symbols, Common Characters
- [x] Helper exports: ALL_GLYPHS, GLYPH_CATEGORIES
- [x] **15 tests passing** - defaults, palette ID, layer IDs, glyph categories

#### Scene.js 🚧 TODO
- [ ] Properties: `{w, h, paletteId, layers[], activeLayerId, options}`
- [ ] Methods:
  - `getActiveLayer()` - returns current active layer
  - `getLayer(id)` - returns layer by id
  - `setActiveLayer(id)` - switch active layer
  - `getCellIndex(x, y)` - converts coords to index
  - `isValidCoord(x, y)` - bounds checking
  - `toObject()` / `fromObject()` - serialization

#### StateManager.js 🚧 TODO
- [ ] Simple event emitter with `on(event, callback)`, `emit(event, data)`, `off(event, callback)`
- [ ] Events: `'scene:updated'`, `'layer:changed'`, `'tool:changed'`, `'cell:changed'`

**Deliverable:** Data models tested and ready for use (2/4 complete, 80 tests passing)

**Testing Infrastructure Added:**
- ✅ Vitest test runner with watch mode
- ✅ 80 tests passing (23 Cell + 42 Layer + 15 constants)
- ✅ Node 20 requirement (.nvmrc added)
- ✅ Test commands: `npm test`, `npm run test:run`, `npm run test:ui`

---

### Step 3: Basic Rendering (2-3 hours)

#### LayerRenderer.js (Cell Mode)
- [ ] `render(layer, container, width, height)` - creates w×h `<span>` elements
- [ ] `updateCell(layer, x, y, width)` - patches single cell (dirty update)
- [ ] Apply classes: `fg-X`, `bg-Y` for colors
- [ ] Handle visibility: skip rendering if `layer.visible === false`
- [ ] Cell content: use `textContent` or `innerText` for glyph

#### Compositor.js
- [ ] `getVisibleCell(x, y, scene)` - applies compositing rules:
  - Glyph + FG: from topmost visible layer where `ch !== ' '`
  - BG: from topmost visible layer where `bg !== -1`
- [ ] Used for copy/export, not direct rendering

#### grid.css
- [ ] CSS Grid layout for visual layers
- [ ] Custom properties: `--grid-w`, `--grid-h`, `--cell-size`
- [ ] `.visual-layer` styles:
  - `display: grid`
  - `grid-template-columns: repeat(var(--grid-w), var(--cell-size))`
  - `position: absolute`
  - `pointer-events: none`
- [ ] `.cell` styles:
  - Fixed width/height
  - `font-family: 'JetBrains Mono'`
  - `line-height: 1`
  - `text-align: center`
- [ ] Color classes `.fg-0` through `.fg-7`, `.bg-0` through `.bg-7`, `.bg--1`

**Deliverable:** Scene renders to DOM with all 3 layers visible

---

### Step 4: Hit Test Overlay (1-2 hours)

#### HitTestOverlay.js
- [ ] Create transparent overlay matching grid dimensions
- [ ] `getCellCoords(mouseEvent)` - converts pixel position to (x, y) grid coords
- [ ] Track mouse states: `isDown`, `lastX`, `lastY`
- [ ] Event handlers:
  - `mousedown` → emit `'cell:down'` with (x, y)
  - `mousemove` (if down) → emit `'cell:drag'` with (x, y)
  - `mouseup` → emit `'cell:up'` with (x, y)
- [ ] Prevent duplicate events for same cell
- [ ] `setCursor(cursorType)` - updates CSS cursor

**Deliverable:** Mouse clicks translate to grid coordinates

---

### Step 5: Tool System (2-3 hours)

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

#### BrushTool.js
- [ ] Properties: `currentCell = {ch, fg, bg}`
- [ ] `onCellDown()` + `onCellDrag()`: 
  - Get active layer from scene
  - Check if locked → return early
  - `layer.setCell(x, y, currentCell)`
  - Emit `'cell:changed'` event
  - Track dirty cells for undo (later)
- [ ] `getCursor()`: return `'crosshair'`

#### EraserTool.js
- [ ] `onCellDown()` + `onCellDrag()`:
  - Get active layer
  - Check if locked → return early
  - Set cell to defaults: `{ch: ' ', fg: 7, bg: -1}`
  - Emit `'cell:changed'` event
- [ ] `getCursor()`: return `'not-allowed'`

#### PickerTool.js
- [ ] `onCellDown()`:
  - Get active layer
  - Read cell at (x, y)
  - Update brush tool's `currentCell`
  - Emit `'tool:picked'` event
  - Auto-switch back to brush tool
- [ ] `getCursor()`: return `'crosshair'`

**Deliverable:** Can switch tools and paint on grid

---

### Step 6: Basic UI (2-3 hours)

#### Toolbar.js
- [ ] Create tool buttons: Brush, Eraser, Picker
- [ ] Click handler: `setActiveTool(toolName)`
- [ ] Visual indication of active tool (CSS class)
- [ ] Listen to `'tool:changed'` to update UI
- [ ] Display current glyph/fg/bg for brush

#### ColorPalette.js
- [ ] Display 8 foreground color swatches
- [ ] Display 8 background color swatches + transparent option
- [ ] Click handlers: `setForeground(index)`, `setBackground(index)`
- [ ] Visual indication of current selection
- [ ] Update brush tool's `currentCell` on change

#### LayerPanel.js
- [ ] Render 3 layer rows (BG, MID, FG)
- [ ] Each row shows:
  - Layer name
  - Visibility toggle (eye icon or checkbox)
  - Lock toggle (lock icon or checkbox)
  - Active indicator (radio button or highlight)
- [ ] Click handlers:
  - Toggle visibility → update `layer.visible`, re-render layer
  - Toggle lock → update `layer.locked`
  - Click row → set as active layer
- [ ] Listen to `'layer:changed'` to update UI

#### Glyph Picker (Simple Version)
- [ ] Dropdown or grid showing glyph presets from constants
- [ ] Click glyph → update brush tool's `currentCell.ch`
- [ ] Display current glyph in toolbar

**Deliverable:** Full UI for tool/layer/color selection

---

### Step 7: Copy to Clipboard (1 hour)

#### clipboard.js
- [ ] `copyCompositedText(scene)` function:
  - Loop through each row (0 to h-1)
  - For each cell in row, use `Compositor.getVisibleCell(x, y, scene)`
  - Build string: `row.map(cell => cell.ch).join('')`
  - Join rows with `\n`
  - Ensure each row is exactly `w` characters (include trailing spaces)
  - Use `navigator.clipboard.writeText(text)` with fallback
- [ ] Add "Copy" button to UI
- [ ] Show success/error feedback

**Deliverable:** Copy button produces correct plain text output

---

### Step 8: Integration & App Setup (1-2 hours)

#### app.js
- [ ] Import all modules
- [ ] Initialize Scene with default values (80×25, 3 layers, default palette)
- [ ] Create StateManager instance
- [ ] Create LayerRenderer instances for each layer
- [ ] Create HitTestOverlay instance
- [ ] Create Tool instances (Brush, Eraser, Picker)
- [ ] Create UI component instances (Toolbar, LayerPanel, ColorPalette)
- [ ] Wire up event listeners:
  - Hit test events → active tool methods
  - Tool methods → scene updates
  - Scene updates → renderer updates
  - UI interactions → state changes
- [ ] Perform initial render of all layers
- [ ] Set default active tool (Brush)

**Deliverable:** Fully functional application

---

### Step 9: Testing & Polish (1-2 hours)

#### Functionality Tests
- [ ] Draw with brush on each layer
- [ ] Verify layer compositing (glyph from top, bg from top non-transparent)
- [ ] Test layer visibility toggle (hidden layers don't show)
- [ ] Test layer locking (can't edit locked layers)
- [ ] Test switching active layer
- [ ] Test eraser (sets to space + transparent bg)
- [ ] Test picker (copies cell values)
- [ ] Test copy output:
  - Correct dimensions (80 chars × 25 lines)
  - Trailing spaces preserved
  - Compositing correct

#### Performance Check
- [ ] Smooth drawing at 60fps on 80×25 grid
- [ ] No lag when switching layers/tools

#### Visual Polish
- [ ] Consistent spacing and alignment
- [ ] Clear visual feedback for active tool/layer
- [ ] Proper cursor display
- [ ] Color contrast for readability

#### Optional Enhancements
- [ ] Keyboard shortcuts (B=brush, E=eraser, I=picker, [/]=layer switch)
- [ ] Clear canvas button
- [ ] Grid size display

**Deliverable:** Polished, working Milestone 1

---

## Milestone 1 Success Criteria

✅ Can draw with brush using different glyphs/colors  
✅ Can erase cells  
✅ Can pick colors/glyphs from existing cells  
✅ Layer visibility toggles work correctly  
✅ Can't edit locked layers  
✅ Switching active layer works  
✅ Copy produces correct plain text (80 chars × 25 lines)  
✅ Compositing shows correct result (glyph from top, bg from top non-transparent)  

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
### Step 2 Started: 2024-12-30 (Partial - 2/4 modules complete)
### Current Milestone: 1 (In Progress)
### Current Step: Step 2 - Core Data Models (50% complete)
### Next: Complete Scene.js and StateManager.js

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

### Step 2 Progress (50% Complete):
**Completed:**
- ✅ Cell.js with full test coverage (23 tests)
- ✅ Layer.js with comprehensive tests (42 tests)
- ✅ constants.js with 14 glyph categories (15 tests)
- ✅ Testing infrastructure (Vitest + Node 20)
- ✅ 80 tests passing

**Remaining:**
- 🚧 Scene.js - Top-level scene container
- 🚧 StateManager.js - Event system for reactive updates

**Key Decisions:**
- Use palettes.json as single source of truth (not duplicated in constants)
- DEFAULT_PALETTE_ID references palette by ID
- 14 glyph categories: Box styles, Shading, Math, Arrows, Currency, etc.
- Test-driven development approach working well

---

## Resources

- [Design Document](./design-document.md)
- [Box Drawing Unicode Chart](https://en.wikipedia.org/wiki/Box-drawing_character)
- [JetBrains Mono Font](https://www.jetbrains.com/lp/mono/)