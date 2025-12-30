# Session Notes - Terminal Draw

## Current Status (2024-12-30)

### ✅ Completed
- **Step 1: Project Setup** - 100% complete
  - HTML/CSS foundation
  - Cell-based rendering with seamless box-drawing
  - 10 color palette system with JSON source
  - Scaling controls (10-1000% + auto-fit)
  - Vite dev server + npm scripts

- **Step 2: Core Data Models** - 100% complete ✅ (4/4 modules)
  - ✅ Cell.js (23 tests passing)
  - ✅ Layer.js (42 tests passing)
  - ✅ constants.js (15 tests passing)
  - ✅ Scene.js (53 tests passing)
  - ✅ StateManager.js (46 tests passing)

- **Step 3: Basic Rendering** - 100% complete ✅ (2/2 modules)
  - ✅ LayerRenderer.js (43 tests passing)
  - ✅ Compositor.js (37 tests passing)
  - ✅ Scene-based rendering integrated into app.js
  - ✅ All 3 layers rendering with proper z-index compositing

- **Step 4: Hit Test Overlay** - 100% complete ✅
  - ✅ HitTestOverlay.js (45 tests passing)
  - ✅ Mouse → cell coordinate conversion with scale support
  - ✅ Separate width/height measurement for accurate tracking
  - ✅ Dynamic overlay sizing to match rendered grid
  - ✅ Event emission via StateManager (cell:hover, cell:down, cell:drag, cell:up)
  - ✅ Visual hover feedback (yellow highlight - accurate across entire grid)
  - ✅ Status bar showing cell coordinates
  - ✅ Integrated into app.js with scale synchronization
  - ✅ Clean production code (debug logging removed)

### 🚧 Next Tasks

**Begin Step 5: Tool System**
1. Create base Tool.js class
2. Create BrushTool.js - Paint cells
3. Create EraserTool.js - Clear cells
4. Create PickerTool.js - Eyedropper
5. Integrate tools with HitTestOverlay events

### 📊 Test Status
- **322 tests passing** across 9 files ✅
- Test command: `npm test` (watch mode) or `npm run test:run` (once)
- **IMPORTANT:** Use Node 20 (see .nvmrc)
- Command prefix: `source ~/.nvm/nvm.sh && nvm use 20 && <command>`

### 🔑 Key Decisions Made
1. **Single source of truth:** palettes.json (not duplicated in constants)
2. **DEFAULT_PALETTE_ID:** References palette by ID, not inline data
3. **14 glyph categories:** Practical sets covering 100+ useful characters
4. **Test-driven development:** Write tests alongside implementation
5. **Node 20 required:** Specified in .nvmrc for Vitest compatibility
6. **Scene initialization:** 3 default layers (bg/mid/fg) with middle layer active
7. **StateManager convenience:** Returns unsubscribe function from on() method
8. **Rendering separation:** LayerRenderer handles DOM, Compositor handles logic
9. **Visual compositing:** CSS z-index handles layer stacking, not JavaScript
10. **Export utilities:** Compositor provides text and ANSI export functions
11. **Coordinate conversion:** Accounts for scale transform via getBoundingClientRect
12. **Event-driven input:** HitTestOverlay emits events, doesn't call tools directly
13. **Duplicate prevention:** Only emit events when cell coordinates change
14. **Hover feedback:** Visual highlight (yellow bg) shows current cell
15. **Dynamic overlay sizing:** Measures actual cell dimensions and sets overlay size
16. **Separate dimensions:** Width (1ch) and height (16px) measured independently

### 📁 Project Structure
```
terminal-draw/
├── src/
│   ├── app.js                 # Main app (uses test pattern currently)
│   ├── palettes.json          # 10 color schemes (source of truth)
│   ├── core/
│   │   ├── Cell.js            ✅ Complete (23 tests)
│   │   ├── Layer.js           ✅ Complete (42 tests)
│   │   ├── constants.js       ✅ Complete (15 tests)
│   │   ├── Scene.js           ✅ Complete (53 tests)
│   │   └── StateManager.js    ✅ Complete (46 tests)
│   ├── rendering/
│   │   ├── LayerRenderer.js   ✅ Complete (43 tests)
│   │   └── Compositor.js      ✅ Complete (37 tests)
│   └── input/
│       └── HitTestOverlay.js  ✅ Complete (45 tests)
├── tests/
│   ├── Cell.test.js           ✅ 23 passing
│   ├── Layer.test.js          ✅ 42 passing
│   ├── constants.test.js      ✅ 15 passing
│   ├── Scene.test.js          ✅ 53 passing
│   ├── StateManager.test.js   ✅ 46 passing
│   ├── integration.test.js    ✅ 18 passing
│   ├── LayerRenderer.test.js  ✅ 43 passing
│   ├── Compositor.test.js     ✅ 37 passing
│   └── HitTestOverlay.test.js ✅ 45 passing
├── styles/
│   ├── main.css               # Global styles, CSS vars, layout
│   ├── grid.css               # Cell rendering
│   └── ui.css                 # Sidebar, controls, palette UI
├── index.html                 # Clean structure
├── vitest.config.js           # Test configuration
├── .nvmrc                     # Node 20
└── package.json               # Vite + Vitest

Total: 322 tests passing ✅
```

### 🎯 Step 3 Acceptance Criteria ✅ COMPLETE
- ✅ LayerRenderer renders Layer objects to DOM
- ✅ Creates proper grid-row and cell structure
- ✅ Applies fg-X and bg-Y color classes correctly
- ✅ Handles layer visibility
- ✅ Supports single cell updates (dirty updates)
- ✅ Compositor provides logical compositing
- ✅ Export functions (text, ANSI) work correctly
- ✅ Scene integrated into app.js
- ✅ All 277 tests passing
- ✅ Visual rendering verified

### 🎯 Step 4 Acceptance Criteria ✅ COMPLETE
- ✅ HitTestOverlay converts mouse coordinates to cell coordinates
- ✅ Accounts for scale/zoom transforms correctly (10%-1000%)
- ✅ Emits cell:hover, cell:down, cell:drag, cell:up events
- ✅ Prevents duplicate events for same cell
- ✅ Visual hover feedback with yellow highlight (accurate across entire grid)
- ✅ Status bar shows current cell coordinates
- ✅ getCellDimensions() measures actual width/height separately
- ✅ updateOverlaySize() sets exact pixel dimensions after rendering
- ✅ All 322 tests passing
- ✅ Verified with multiple zoom levels and edge cases
- ✅ Clean production code (no debug logging)

### 🎯 Step 2 Acceptance Criteria ✅ COMPLETE
- ✅ Can create Scene with 3 layers
- ✅ Can get/set active layer
- ✅ Can add/remove layers
- ✅ Can serialize/deserialize Scene
- ✅ StateManager emits and receives events
- ✅ Scene includes coordinate validation and layer management
- ✅ StateManager includes error handling and convenience features

### 📝 Important Files to Reference
- `IMPLEMENTATION-PLAN.md` - Detailed roadmap and progress tracking
- `README.md` - Quick start and testing info
- `design-document.md` - Original specification
- `src/core/Cell.js` - Example of simple class with full test coverage
- `src/core/Layer.js` - Example of complex class with comprehensive tests
- `src/core/Scene.js` - Top-level scene container with layer management
- `src/core/StateManager.js` - Event emitter for reactive updates
- `src/rendering/LayerRenderer.js` - DOM rendering for layers
- `src/rendering/Compositor.js` - Logical compositing and export
- `src/input/HitTestOverlay.js` - Mouse input and coordinate conversion

### 🔧 Common Commands
```bash
# Switch to Node 20 and run tests
source ~/.nvm/nvm.sh && nvm use 20 && npm test

# Run tests once
source ~/.nvm/nvm.sh && nvm use 20 && npm run test:run

# Start dev server
npm run dev

# Run tests with UI
source ~/.nvm/nvm.sh && nvm use 20 && npm run test:ui
```

### 💡 Notes for Next Session
- Step 4 is now complete with 322 tests passing!
- Next up: Step 5 - Tool System
  - Tool.js base class
  - BrushTool.js - Paint with current cell
  - EraserTool.js - Clear cells
  - PickerTool.js - Eyedropper
- Input system complete and production-ready:
  - HitTestOverlay handles all mouse events
  - Converts pixel coords to cell coords with scale support
  - Measures actual cell dimensions (width/height separately)
  - Dynamic overlay sizing ensures accurate tracking
  - Emits events via StateManager
  - Visual hover feedback shows current cell accurately
  - Clean code with no debug logging
- Try it: Hover over the grid and see yellow highlight + coordinates in status bar!
- Works perfectly across entire grid at all zoom levels

### 📈 Progress Tracking
- **Milestone 1 Total:** 9 steps
- **Step 1:** ✅ Complete (100%)
- **Step 2:** ✅ Complete (100% - 4/4 modules)
- **Step 3:** ✅ Complete (100% - 2/2 modules)
- **Step 4:** ✅ Complete (100% - HitTestOverlay, 322 tests total)
- **Steps 5-9:** ⏳ Not started
- **Overall:** ~44% complete (4/9 steps)

### 🎨 Current Visual State
The app now has full mouse input:
- Border box rendered on BG layer
- "TERMINAL DRAW - STEP 3 COMPLETE" text on MID layer
- Box-drawing characters on FG layer
- **NEW:** Hover over grid → yellow highlight on current cell (accurate tracking!)
- **NEW:** Status bar shows cell coordinates (x, y) and scale
- **NEW:** Works across entire grid, even at edges
- **NEW:** Handles all zoom levels correctly (10%-1000%)
- All rendered through LayerRenderer from Scene data model
- Proper z-index compositing (BG → MID → FG)
- Scales correctly with controls in sidebar
- 10 palettes switchable via dropdown
- Production-ready code with clean output
- Ready for tool system in Step 5