# F3: Animation System

## Overview

The animation system allows cells to have animated properties for glyph (character), foreground color, and background color. Each can be animated independently with its own settings.

## Current Implementation (Phase 1 Complete)

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Animation System                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Cell Animations                        │   │
│  │  Each cell can have independent glyph/fg/bg animations   │   │
│  └──────────────────────────┬───────────────────────────────┘   │
│                             │                                    │
│                             ▼                                    │
│           ┌──────────────────────────────────────┐              │
│           │         AnimationEngine              │              │
│           │  - requestAnimationFrame loop        │              │
│           │  - Scans for animated cells          │              │
│           │  - Calculates current frame state    │              │
│           │  - Updates renderer with dirty cells │              │
│           └──────────────────┬───────────────────┘              │
│                              │                                   │
│                              ▼                                   │
│           ┌──────────────────────────────────────┐              │
│           │          CellAnimator                │              │
│           │  - getCycleIndex() for frame calc    │              │
│           │  - Handles cycle modes               │              │
│           │  - Applies offsets for wave effects  │              │
│           └──────────────────────────────────────┘              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Data Model

**Cell animation structure (`src/core/Cell.js`):**
```javascript
{
  ch: '★',
  fg: 6,
  bg: -1,
  anim: {
    // Each sub-animation is optional and independent
    glyph: {
      frames: ['★', '✦', '·'],  // Characters to cycle through
      speed: 500,                // ms per frame
      offset: 0,                 // Time offset for wave effects
      cycleMode: 'forward'       // forward | reverse | pingpong | random
    },
    fg: {
      colors: [1, 2, 3, 4],      // Color indices to cycle (0-7, -1=transparent)
      speed: 250,
      offset: 0,
      cycleMode: 'pingpong'
    },
    bg: {
      colors: [0, -1],           // Background colors (-1 = transparent)
      speed: 1000,
      offset: 0,
      cycleMode: 'forward'
    }
  }
}
```

### Animation Properties

**Cycle Modes:**
- `forward` - Cycles 0→1→2→0→1→2...
- `reverse` - Cycles 2→1→0→2→1→0...
- `pingpong` - Bounces 0→1→2→1→0→1→2...
- `random` - Pseudo-random selection (deterministic per timestamp)

**Offset Modes (in brush tool):**
- `sync` - All cells animate together
- `random` - Each cell gets a random offset, creating wave effects

**Speed Options:**
- Slow: 1000ms
- Medium: 500ms
- Fast: 250ms

### Files

**Core Animation:**
```
src/animation/
├── AnimationEngine.js   # Main loop, cell scanning, dirty tracking
└── CellAnimator.js      # Frame calculation, cycle modes
```

**Modified Files:**
```
src/core/Cell.js         # Added anim property, setGlyphAnimation/setFgAnimation/setBgAnimation
src/tools/BrushTool.js   # Separate glyphAnim/fgAnim/bgAnim configs
src/app.js               # Animation UI wiring, play/pause button
src/ui/GlyphPicker.js    # Copies selected glyph to clipboard
index.html               # Animation controls in brush options bar
```

### UI

The brush tool options bar shows animation settings:

```
Animation: [Glyph ☐] [FG ☐] [BG ☐]
```

When a checkbox is enabled, detailed settings appear:
- Input field for frames/colors
- Speed dropdown (Slow/Med/Fast)
- Offset dropdown (Sync/Rand)
- Mode dropdown (Fwd/Rev/Ping/Rand)

**Color input format:**
- Type digits directly: `01234567` means colors 0,1,2,3,4,5,6,7
- Use `8` for transparent (-1)

**Glyph input:**
- Type or paste characters directly
- Selecting a glyph from the picker copies it to clipboard for easy pasting

**Play/Pause:**
- Button in toolbar toggles animation playback
- Shows animated cell count when playing

### Serialization

Animations are saved/loaded with projects. The `anim` property is included in cell serialization when present.

```javascript
// Cell.toObject()
{
  ch: '★',
  fg: 6,
  bg: -1,
  anim: {
    glyph: { frames: ['★', '✦'], speed: 500, offset: 0, cycleMode: 'forward' }
  }
}
```

---

## Future Phases (Not Yet Implemented)

### Phase 2: Particle Effects
- Rain, snow, twinkling stars
- Layer-based behaviors
- Procedural particle spawning/movement

### Phase 3: Walking Sprites
- Multi-cell sprites that move across the scene
- Sprite library (person, car, bird)
- Walker/traffic behaviors with spawn rules

### Phase 4: Polish
- Behavior presets
- More movement patterns
- UI improvements

---

## Technical Notes

### Performance
- Uses requestAnimationFrame for smooth 60fps
- Dirty tracking: only updates cells that changed
- Scans for animated cells on start/refresh

### Rendering
- DOM-based (no canvas)
- Updates individual cell elements
- Restores original state when animation stops

### Limitations
- Animation data increases project file size
- Many animated cells may impact performance
- No preview in brush cursor (cells animate after painting)
