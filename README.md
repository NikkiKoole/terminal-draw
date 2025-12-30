# Terminal Draw

A web-based ASCII art editor that renders true text glyphs in the DOM for creating terminal art.

## Features (Step 1 Complete)

✅ **Cell-based Rendering** - 80×25 grid with seamless box-drawing characters  
✅ **Multi-Palette System** - 10 curated color schemes with instant switching  
✅ **Flexible Scaling** - 10-1000% zoom with auto-fit-to-viewport  
✅ **Clean Architecture** - Organized vanilla JS with ES6 modules  

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

**Step 1: Complete** ✅  
- Project setup and foundation
- Rendering with seamless box-drawing
- Palette management
- View controls (scaling)

**Step 2: In Progress** 🚧  
- Core data models (Cell, Layer, Scene)
- State management
- Event handling

See [IMPLEMENTATION-PLAN.md](./IMPLEMENTATION-PLAN.md) for detailed roadmap.

## Testing Strategy

We use **Vitest** for unit and integration tests:

- ✅ **Unit tests** for core data models (Cell, Layer, Scene, etc.)
- ✅ **Test-driven development** - write tests as features are built
- ✅ **Coverage tracking** - ensure code quality
- ✅ **Fast feedback** - tests run in milliseconds

**Example test output:**
```bash
✓ tests/Cell.test.js (23 tests)
  ✓ Cell > constructor (5)
  ✓ Cell > clone (2)
  ✓ Cell > equals (6)
  ✓ Cell > isEmpty (4)
  ✓ Cell > clear (2)
  ✓ Cell > fromObject (2)
  ✓ Cell > toObject (2)
```

See `tests/` directory for all test suites.

## Color Palettes

- Default Terminal
- Gruvbox Dark
- Nord
- Dracula
- Monokai
- Solarized Dark
- Tokyo Night
- Catppuccin Mocha
- Anthropic Claude
- Monet Muted

Edit `src/palettes.json` to add more!

## Development

### Key Files

- `src/app.js` - Application entry point and initialization
- `src/core/` - Data models (Cell, Layer, Scene, StateManager)
- `src/palettes.json` - Color scheme definitions
- `styles/grid.css` - Grid cell rendering and color classes
- `styles/main.css` - Layout, CSS variables, global styles
- `tests/` - Test suites for all modules

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