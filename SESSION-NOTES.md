# Session Notes - Terminal Draw

## Current Status (2024-12-30)

### ✅ Completed
- **Step 1: Project Setup** - 100% complete
  - HTML/CSS foundation
  - Cell-based rendering with seamless box-drawing
  - 10 color palette system with JSON source
  - Scaling controls (10-1000% + auto-fit)
  - Vite dev server + npm scripts

- **Step 2: Core Data Models** - 50% complete (2/4 modules)
  - ✅ Cell.js (23 tests passing)
  - ✅ Layer.js (42 tests passing)
  - ✅ constants.js (15 tests passing)
  - 🚧 Scene.js (TODO)
  - 🚧 StateManager.js (TODO)

### 🚧 Next Tasks

**Complete Step 2:**
1. Create `src/core/Scene.js` with tests
2. Create `src/core/StateManager.js` with tests
3. Update implementation plan when Step 2 is complete

**Scene.js Requirements:**
- Properties: `{w, h, paletteId, layers[], activeLayerId, options}`
- Methods:
  - `getActiveLayer()` - returns active layer
  - `getLayer(id)` - get layer by id
  - `setActiveLayer(id)` - switch active layer
  - `toObject()` / `fromObject()` - serialization
- Initialize with 3 layers (bg/mid/fg)
- Reference palette by ID (use constants.DEFAULT_PALETTE_ID)
- Include comprehensive tests

**StateManager.js Requirements:**
- Simple event emitter pattern
- Methods: `on(event, callback)`, `off(event, callback)`, `emit(event, data)`
- Support events: 'scene:updated', 'layer:changed', 'tool:changed', 'cell:changed'
- Include tests for subscribe/unsubscribe/emit

### 📊 Test Status
- **80 tests passing** across 3 files
- Test command: `npm test` (watch mode) or `npm run test:run` (once)
- **IMPORTANT:** Use Node 20 (see .nvmrc)
- Command prefix: `source ~/.nvm/nvm.sh && nvm use 20 && <command>`

### 🔑 Key Decisions Made
1. **Single source of truth:** palettes.json (not duplicated in constants)
2. **DEFAULT_PALETTE_ID:** References palette by ID, not inline data
3. **14 glyph categories:** Practical sets covering 100+ useful characters
4. **Test-driven development:** Write tests alongside implementation
5. **Node 20 required:** Specified in .nvmrc for Vitest compatibility

### 📁 Project Structure
```
terminal-draw/
├── src/
│   ├── app.js                 # Main app (uses test pattern currently)
│   ├── palettes.json          # 10 color schemes (source of truth)
│   └── core/
│       ├── Cell.js            ✅ Complete (23 tests)
│       ├── Layer.js           ✅ Complete (42 tests)
│       ├── constants.js       ✅ Complete (15 tests)
│       ├── Scene.js           🚧 TODO
│       └── StateManager.js    🚧 TODO
├── tests/
│   ├── Cell.test.js           ✅ 23 passing
│   ├── Layer.test.js          ✅ 42 passing
│   └── constants.test.js      ✅ 15 passing
├── styles/
│   ├── main.css               # Global styles, CSS vars, layout
│   ├── grid.css               # Cell rendering
│   └── ui.css                 # Sidebar, controls, palette UI
├── index.html                 # Clean structure
├── vitest.config.js           # Test configuration
├── .nvmrc                     # Node 20
└── package.json               # Vite + Vitest

Total: 80 tests passing
```

### 🎯 Step 2 Acceptance Criteria
When Scene.js and StateManager.js are complete with tests:
- ✅ Can create Scene with 3 layers
- ✅ Can get/set active layer
- ✅ Can serialize/deserialize Scene
- ✅ StateManager emits and receives events
- ✅ All tests passing (estimate: 110+ total)

### 📝 Important Files to Reference
- `IMPLEMENTATION-PLAN.md` - Detailed roadmap and progress tracking
- `README.md` - Quick start and testing info
- `design-document.md` - Original specification
- `src/core/Cell.js` - Example of complete implementation with tests
- `src/core/Layer.js` - Example of complex class with full test coverage

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
- Scene.js should store `paletteId` string, not palette object
- Scene should initialize 3 layers with IDs from constants (LAYER_BG, LAYER_MID, LAYER_FG)
- StateManager is simple - just pub/sub pattern
- Follow existing test patterns from Cell.test.js and Layer.test.js
- After Step 2 complete, Step 3 is rendering (LayerRenderer.js, Compositor.js)
- The test pattern in app.js will be replaced once rendering is done

### 📈 Progress Tracking
- **Milestone 1 Total:** 9 steps
- **Step 1:** ✅ Complete (100%)
- **Step 2:** 🚧 In Progress (50% - 2/4 modules done)
- **Steps 3-9:** ⏳ Not started
- **Overall:** ~15% complete

### 🎨 Current Visual State
The app currently shows a test pattern in the browser:
- Border box with box-drawing characters
- "TERMINAL DRAW - FONT TEST" text in center
- Sample box-drawing characters
- All rendered with cell-based approach
- Scales correctly with controls in sidebar
- 10 palettes switchable via dropdown

Next step will keep this test pattern until Step 3 (rendering) when we connect the Scene data model to actual DOM rendering.