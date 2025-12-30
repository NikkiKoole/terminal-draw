# Terminal Draw

A web-based ASCII art editor that renders true text glyphs in the DOM for creating terminal art.

## Features

**Steps 1-5 Complete ✅**
- ✅ Project Setup - Cell-based rendering, palettes, scaling
- ✅ Core Data Models - Cell, Layer, Scene, StateManager, constants
- ✅ Basic Rendering - LayerRenderer and Compositor
- ✅ Hit Test Overlay - Mouse input and coordinate conversion
- ✅ Tool System - Brush, Eraser, and Picker tools
- ✅ **398 tests passing** across 13 test files

**Current Status: Step 6 Next 🚧**
- Interactive drawing with three tools working
- Event-driven architecture fully functional
- Ready to build UI components (ColorPalette, LayerPanel, GlyphPicker)

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
│   ├── app.js           # Main application logic
│   └── palettes.json    # Color scheme definitions
├── styles/
│   ├── main.css         # Global styles & layout
│   ├── grid.css         # Grid rendering
│   └── ui.css           # UI components
├── assets/
│   └── JetBrainsMono-Medium.woff2
└── index.html           # Application shell
```

## Technology Stack

- **Vanilla JavaScript** (ES6 modules)
- **Plain CSS** (CSS Grid, custom properties)
- **Vite** (dev server & build tool)
- **JetBrains Mono** (monospace font with ligatures)

## Architecture

### Rendering Strategy
- **Row-based wrapping** - Each grid row is a container div with cell spans
- **Background layer** - Single colored div sized to match grid
- **Text layers** - 3 stacked layers (bg/mid/fg) for future compositing
- **Hit-test overlay** - Separate layer for mouse event handling (not yet implemented)

### Palette System
- JSON-based color definitions (8 colors per palette)
- Dynamic CSS custom property updates
- Real-time theme switching

### Scaling
- CSS transform-based scaling (10-1000%)
- Auto-fit calculates optimal scale for viewport
- Maintains aspect ratio and centering

## Current Status

**Steps 1-5: Complete** ✅  
- ✅ Step 1: Project Setup (HTML/CSS, palettes, scaling)
- ✅ Step 2: Core Data Models (Cell, Layer, Scene, StateManager, constants)
- ✅ Step 3: Basic Rendering (LayerRenderer, Compositor)
- ✅ Step 4: Hit Test Overlay (Mouse input, coordinate conversion)
- ✅ Step 5: Tool System (Brush, Eraser, Picker tools)
- **398 tests passing**

**Next:** Step 6 - Basic UI (ColorPalette, LayerPanel, GlyphPicker)

See [IMPLEMENTATION-PLAN.md](./IMPLEMENTATION-PLAN.md) for detailed roadmap.

## Testing Strategy

We use **Vitest** for unit and integration tests:

- ✅ **Unit tests** for all modules (core, rendering, input, tools)
- ✅ **Test-driven development** - write tests as features are built
- ✅ **Coverage tracking** - ensure code quality
- ✅ **Fast feedback** - tests run in milliseconds

**Current test status: 398 tests passing**

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
```

See `tests/` directory for all test suites.

## Color Palettes

- Default Terminal
- **Gruvbox Dark** - Warm, retro
- **Nord** - Cool, blue-ish
- **Dracula** - Purple/pink
- **Monokai** - Classic
- **Solarized Dark** - Muted
- **Tokyo Night** - Modern blue/purple
- **Catppuccin Mocha** - Soft pastels
- **Anthropic Claude** - Warm browns/blues
- **Monet Muted** - Soft artist palette

Edit `src/palettes.json` to add more!

## Glyph Presets (14 Categories)

Over 100 useful characters organized in categories:
- Box Drawing (Light/Heavy/Double/Rounded)
- Shading & Blocks
- Triangles & Pointers
- Math Operators
- Arrows & Extended Arrows
- Dots & Circles
- Geometric Shapes
- Currency Symbols
- Common Symbols & Characters

See `src/core/constants.js` for complete list.

## Development

### Key Files

- `src/app.js` - Application entry point and initialization
- `src/core/` - Data models (Cell, Layer, Scene, StateManager)
- `src/rendering/` - LayerRenderer and Compositor
- `src/input/` - HitTestOverlay for mouse events
- `src/tools/` - Tool system (Brush, Eraser, Picker)
- `src/palettes.json` - Color scheme definitions
- `styles/grid.css` - Grid cell rendering and color classes
- `styles/main.css` - Layout, CSS variables, global styles
- `tests/` - Test suites for all modules (398 tests)

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
--cell-size: 12px                   /* Base cell size */
```

## Design Documents

- [design-document.md](./design-document.md) - Full feature specification
- [IMPLEMENTATION-PLAN.md](./IMPLEMENTATION-PLAN.md) - Development roadmap

## License

MIT