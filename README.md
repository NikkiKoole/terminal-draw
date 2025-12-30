# Terminal Draw

A web-based ASCII art editor that renders true text glyphs in the DOM for creating terminal art.

## Features

**Steps 1-8b Complete ✅**
- ✅ Project Setup - Cell-based rendering, palettes, scaling
- ✅ Core Data Models - Cell, Layer, Scene, StateManager, constants
- ✅ Basic Rendering - LayerRenderer and Compositor
- ✅ Hit Test Overlay - Mouse input and coordinate conversion
- ✅ Tool System - Brush, Eraser, and Picker tools
- ✅ Basic UI - LayerPanel, GlyphPicker, interactive color palette
- ✅ Copy to Clipboard - Export as plain text, ANSI, or single layer
- ✅ Integration & App Setup - All components wired together
- ✅ Save/Load Projects - JSON file persistence with drag-and-drop
- ✅ **481 tests passing** across 15 test files

**Current Status: Step 9 - Testing & Polish ✅ ~97% Complete**
- Fully functional ASCII art editor
- Complete UI with layer management, color selection, and character picking
- Clipboard export in multiple formats (text, ANSI, single layer)
- Project save/load with drag-and-drop support
- 10 glyph categories with 1,300+ characters (reorganized from 24)
- Keyboard shortcuts: [B]rush, [E]raser, [P]icker, [L]ayer cycle
- UX improvements: clickable layer items, cleaner palette indicators
- All functionality tests passed - performance validation pending

## Quick Start

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
```

Open `http://localhost:5173` in your browser.

## Node Version

This project requires **Node 20** (specified in `.nvmrc`).

If using nvm, run:
```bash
nvm use
```

**Important for development/testing:** All terminal commands should use Node 20. To ensure this, prefix commands with:
```bash
source ~/.nvm/nvm.sh && nvm use 20 && <your-command>
```

Example:
```bash
source ~/.nvm/nvm.sh && nvm use 20 && npm test -- --run
```

## Running Tests

```bash
# Run tests in watch mode (recommended during development)
npm test

# Run tests once
npm run test:run

# Run tests with UI
npm run test:ui
```

Tests are located in the `tests/` directory and use Vitest.

## Project Structure

```
terminal-draw/
├── src/
│   ├── app.js                # Main application logic
│   ├── palettes.json         # Color scheme definitions
│   ├── core/                 # Data models
│   │   ├── Cell.js
│   │   ├── Layer.js
│   │   ├── Scene.js
│   │   ├── StateManager.js
│   │   └── constants.js
│   ├── rendering/            # Rendering system
│   │   ├── LayerRenderer.js
│   │   └── Compositor.js
│   ├── input/                # Mouse input
│   │   └── HitTestOverlay.js
│   ├── tools/                # Drawing tools
│   │   ├── Tool.js
│   │   ├── BrushTool.js
│   │   ├── EraserTool.js
│   │   └── PickerTool.js
│   ├── ui/                   # UI components
│   │   ├── LayerPanel.js
│   │   └── GlyphPicker.js
│   ├── export/               # Export functionality
│   │   └── ClipboardManager.js
│   └── io/                   # File I/O
│       └── ProjectManager.js
├── styles/
│   ├── main.css              # Global styles & layout
│   ├── grid.css              # Grid rendering
│   └── ui.css                # UI component styles
├── tests/                    # 481 tests
├── docs/                     # Documentation
│   ├── IMPLEMENTATION-PLAN.md
│   ├── STEP-*-COMPLETION.md
│   └── design-document.md
├── test-pages/               # Test HTML pages
│   ├── test-ansi.html
│   ├── diagnose-cells.html
│   └── verify-rendering.html
└── index.html                # Application shell
```

## Technology Stack

- **Vanilla JavaScript** (ES6 modules)
- **Plain CSS** (CSS Grid, custom properties)
- **Vite** (dev server & build tool)
- **Vitest** (testing framework)
- **JetBrains Mono** (monospace font with ligatures)

## Architecture

### Rendering Strategy
- **Row-based wrapping** - Each grid row is a container div with cell spans
- **Background layer** - Single colored div sized to match grid
- **Text layers** - 3 stacked layers (bg/mid/fg) for multi-layer compositing
- **Hit-test overlay** - Separate layer for mouse event handling
- **Hover indicator** - Visual feedback for current cell

### Event-Driven Architecture
- **StateManager** - Central event bus for all components
- **Tools** - Listen to cell events (down/drag/up)
- **UI Components** - Emit events for state changes
- **Reactive updates** - DOM updates automatically on state changes

### Palette System
- JSON-based color definitions (8 colors per palette)
- Dynamic CSS custom property updates
- Real-time theme switching
- Interactive swatches (left-click fg, right-click bg)

### Scaling
- CSS transform-based scaling (10-1000%)
- Auto-fit calculates optimal scale for viewport
- Maintains aspect ratio and centering

## Current Status

**Steps 1-8b: Complete** ✅  
- ✅ Step 1: Project Setup (HTML/CSS, palettes, scaling)
- ✅ Step 2: Core Data Models (Cell, Layer, Scene, StateManager, constants)
- ✅ Step 3: Basic Rendering (LayerRenderer, Compositor)
- ✅ Step 4: Hit Test Overlay (Mouse input, coordinate conversion)
- ✅ Step 5: Tool System (Brush, Eraser, Picker tools)
- ✅ Step 6: Basic UI (LayerPanel, GlyphPicker, color palette)
- ✅ Step 7: Copy to Clipboard (export as text/ANSI/layer)
- ✅ Step 8: Integration & App Setup (all components wired together)
- ✅ Step 8b: Save/Load Projects (JSON file persistence with drag-and-drop)
- **481 tests passing (100%)**

**Current:** Step 9 - Testing & Polish (~97% complete - performance validation pending)

See [IMPLEMENTATION-PLAN.md](./IMPLEMENTATION-PLAN.md) for detailed roadmap.

## User Interface

### Tools (Keyboard Shortcuts)
- **[B] Brush** - Paint cells with current character and colors
- **[E] Eraser** - Clear cells to default state
- **[P] Picker** - Sample colors and characters from existing cells

### Color Palette
- **8 color swatches** from current palette
- **Left-click** to set foreground color
- **Right-click** to set background color
- **Transparent option** for backgrounds
- **Live preview** showing current color combination

### Layer Panel
- **[L]ayers** - Press L to cycle through layers
- **3 layers** - Background, Middle, Foreground
- **Visibility toggle** (👁️ icon)
- **Lock toggle** (🔒 icon)
- **Active indicator** (● badge)
- Click anywhere on layer item to set as active

### Glyph Picker
- **10 categories** with 1,300+ characters
- **Modal interface** with category filter
- **Trigger button** showing current character
- **Auto-updates** when using picker tool

### Export & Projects
- **📋 Copy as Text** - Export artwork as plain text
- **🎨 Copy as ANSI** - Export with terminal color codes
- **📄 Copy Layer Only** - Export active layer only
- **💾 Save Project** - Download complete project as JSON (~540 KB)
- **📂 Load Project** - Restore any saved project
- **Drag & Drop** - Drop JSON files to load projects
- **Status feedback** - Shows character/line count or file size on success
- **Layer visibility** - Hidden layers excluded from export

### Keyboard Shortcuts
- **B** - Switch to Brush tool
- **E** - Switch to Eraser tool
- **P** - Switch to Picker tool
- **L** - Cycle through layers (Foreground → Middle → Background)

### View Controls
- **Scale slider** (10%-1000%)
- **Scale to Fit** button
- **Palette selector** (10 color schemes)

## Testing Strategy

We use **Vitest** for unit and integration tests:

- ✅ **Unit tests** for all modules (core, rendering, input, tools)
- ✅ **Test-driven development** - write tests as features are built
- ✅ **Coverage tracking** - ensure code quality
- ✅ **Fast feedback** - tests run in milliseconds

**Current test status: 481 tests passing (100%)**

```bash
✓ tests/Cell.test.js (23)
✓ tests/Layer.test.js (42)
✓ tests/constants.test.js (15)
✓ tests/Scene.test.js (53)
✓ tests/StateManager.test.js (46)
✓ tests/integration.test.js (18)
✓ tests/LayerRenderer.test.js (43)
✓ tests/Compositor.test.js (37)
✓ tests/HitTestOverlay.test.js (45)
✓ tests/Tool.test.js (12)
✓ tests/BrushTool.test.js (24)
✓ tests/EraserTool.test.js (20)
✓ tests/PickerTool.test.js (20)
✓ tests/ClipboardManager.test.js (34)
✓ tests/ProjectManager.test.js (49)
```

See `tests/` directory for all test suites.

## Color Palettes

- **Default Terminal** - Classic terminal colors
- **Gruvbox Dark** - Warm, retro aesthetic
- **Nord** - Cool, blue-ish theme
- **Dracula** - Purple/pink vampire theme
- **Monokai** - Classic editor theme
- **Solarized Dark** - Muted, eye-friendly
- **Tokyo Night** - Modern blue/purple
- **Catppuccin Mocha** - Soft pastels
- **Anthropic Claude** - Warm browns/blues
- **Monet Muted** - Soft artist palette

Edit `src/palettes.json` to add more!

## Glyph Categories (10 Total)

Over 1,300 characters organized in categories:
- **Basic Text** - Uppercase, lowercase, numbers (A-Z, a-z, 0-9, subscripts, superscripts)
- **Accented Letters** - All accented Latin characters for international languages
- **Greek & Cyrillic** - Complete Greek and Cyrillic alphabets
- **Punctuation & Currency** - Common punctuation marks and currency symbols
- **Math & Operators** - Mathematical symbols and operators
- **Others** - Emoji-like symbols (hearts, stars, weather, music)
- **Arrows** - Directional arrows and pointers
- **Shapes, Geometry and Blocks** - Geometric shapes and block drawing elements (░▒▓█●■▲)
- **Box Drawing** - Box characters for borders and tables (─│┌┐└┘┬┴├┤┼)
- **Special Symbols** - APL, programming, terminal, and specialized symbols

See `src/core/constants.js` for complete list.

## Development

### Key Files

- `src/app.js` - Application entry point and initialization
- `src/core/` - Data models (Cell, Layer, Scene, StateManager, constants)
- `src/rendering/` - LayerRenderer and Compositor
- `src/input/` - HitTestOverlay for mouse events
- `src/tools/` - Tool system (Brush, Eraser, Picker)
- `src/ui/` - UI components (LayerPanel, GlyphPicker)
- `src/export/` - Export functionality (ClipboardManager)
- `src/io/` - File I/O (ProjectManager)
- `src/palettes.json` - Color scheme definitions
- `styles/grid.css` - Grid cell rendering and color classes
- `styles/main.css` - Layout, CSS variables, global styles
- `styles/ui.css` - UI component styles
- `tests/` - Test suites for all modules (481 tests)

### Adding Tests

When adding new features, create corresponding test files:

```javascript
// tests/YourModule.test.js
import { describe, it, expect } from 'vitest';
import { YourModule } from '../src/core/YourModule.js';

describe('YourModule', () => {
  it('should do something', () => {
    const instance = new YourModule();
    expect(instance.method()).toBe(expected);
  });
});
```

### CSS Custom Properties

Colors are defined as CSS variables for easy theming:

```css
--color-fg-0 through --color-fg-7  /* Foreground colors */
--color-bg-0 through --color-bg-7  /* Background colors */
--grid-w: 80                        /* Grid width */
--grid-h: 25                        /* Grid height */
--cell-height: 21px                 /* Cell height */
```

## Design Documents

All documentation has been moved to the `docs/` folder:

- [design-document.md](./docs/design-document.md) - Full feature specification
- [IMPLEMENTATION-PLAN.md](./docs/IMPLEMENTATION-PLAN.md) - Development roadmap
- [STEP-8-COMPLETION.md](./docs/STEP-8-COMPLETION.md) - Latest completion details
- [STEP-9-PROGRESS.md](./docs/STEP-9-PROGRESS.md) - Current progress
- [HANDOFF-NEXT-SESSION.md](./docs/HANDOFF-NEXT-SESSION.md) - Next session guide

Test pages are in `test-pages/`:
- [test-ansi.html](./test-pages/test-ansi.html) - ANSI output viewer

## Progress

**9 of 9 steps ~97% complete**

Current step:
- Step 9: Testing & Polish (functionality, UX improvements, and polish complete - performance validation pending)

Recent improvements:
- ✅ Glyph categories reorganized (24 → 10 balanced categories)
- ✅ Keyboard shortcuts added (B, E, P, L)
- ✅ Layer panel UX improved (clickable items, [L] shortcut)
- ✅ Palette indicators redesigned (corner triangles)

## License

MIT