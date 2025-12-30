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
- `src/palettes.json` - Color scheme definitions
- `styles/grid.css` - Grid cell rendering and color classes
- `styles/main.css` - Layout, CSS variables, global styles

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