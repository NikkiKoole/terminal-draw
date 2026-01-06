# F3: Animation System Plan

## Vision

Add animation capabilities to Terminal Draw, enabling:
1. **Animated cells** - In-place effects (blink, flicker, color cycle, character cycle)
2. **Procedural behaviors** - Rule-based sprite movement (walkers, traffic, rain, birds)

The goal is "living postcards" - cityscapes where people walk, lights blink, rain falls, all with minimal artist effort through procedural generation.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Animation System                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐   │
│  │ Cell Anims   │    │  Behaviors   │    │  Sprite Library  │   │
│  │ (per-cell)   │    │ (per-layer)  │    │  (reusable)      │   │
│  └──────┬───────┘    └──────┬───────┘    └────────┬─────────┘   │
│         │                   │                     │              │
│         └───────────┬───────┴─────────────────────┘              │
│                     ▼                                            │
│           ┌──────────────────┐                                   │
│           │ AnimationEngine  │  ◄── requestAnimationFrame loop   │
│           └────────┬─────────┘                                   │
│                    │                                             │
│                    ▼                                             │
│           ┌──────────────────┐                                   │
│           │  StateManager    │  ◄── emits cell:changed events    │
│           └────────┬─────────┘                                   │
│                    │                                             │
│                    ▼                                             │
│           ┌──────────────────┐                                   │
│           │  LayerRenderer   │  ◄── dirty updates to DOM         │
│           └──────────────────┘                                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Animated Cells (4-6 hours)

### Goal
Individual cells can have animation properties for in-place effects.

### Data Model Changes

**Extend Cell (`src/core/Cell.js`):**
```javascript
// Cell gains optional animation property
{
  ch: '★',
  fg: 6,
  bg: -1,
  anim: {                    // Optional
    type: 'blink',           // blink | flicker | colorCycle | charCycle
    speed: 500,              // ms per frame
    frames: ['★', '✦', '·'], // for charCycle (optional based on type)
    colors: [6, 7, 5],       // for colorCycle (optional based on type)
  }
}
```

### New Files

**`src/animation/AnimationEngine.js`:**
```javascript
class AnimationEngine {
  constructor(scene, stateManager, renderer) { }
  
  start()           // Begin animation loop
  stop()            // Pause animation
  toggle()          // Play/pause toggle
  isPlaying()       // Current state
  
  tick(timestamp)   // Called via requestAnimationFrame
                    // - Iterates cells with animations
                    // - Calculates current frame based on time
                    // - Emits cell:changed for dirty updates
}
```

**`src/animation/CellAnimator.js`:**
```javascript
// Handles individual cell animation logic
calculateFrame(cell, timestamp)  // Returns current visual state
getBlinkFrame(anim, timestamp)
getFlickerFrame(anim, timestamp) // Randomized timing
getColorCycleFrame(anim, timestamp)
getCharCycleFrame(anim, timestamp)
```

### UI Changes

**Add to `index.html` (tool options bar):**
```html
<div id="animation-controls" style="display: flex; align-items: center; gap: 12px;">
  <button id="anim-play-btn" title="Play/Pause">▶</button>
  <span id="anim-status">Stopped</span>
</div>

<!-- Add to brush-options -->
<label>Animation:</label>
<select id="brush-animation">
  <option value="none">None</option>
  <option value="blink">Blink</option>
  <option value="flicker">Flicker</option>
  <option value="colorCycle">Color Cycle</option>
  <option value="charCycle">Char Cycle</option>
</select>
<select id="brush-anim-speed">
  <option value="1000">Slow</option>
  <option value="500">Medium</option>
  <option value="250">Fast</option>
</select>
```

**Wire up in `src/app.js`:**
- Play/pause button toggles AnimationEngine
- Brush animation dropdown sets animation type on painted cells
- Animation speed dropdown sets timing

### Save/Load Changes

**`src/io/ProjectManager.js`:**
- Update version to "1.1"
- Cell serialization includes `anim` property if present
- Add backward compatibility: projects without `anim` load fine

**`src/core/Cell.js` - toObject/fromObject:**
```javascript
toObject() {
  const obj = { ch: this.ch, fg: this.fg, bg: this.bg };
  if (this.anim) obj.anim = { ...this.anim };
  return obj;
}

static fromObject(obj) {
  const cell = new Cell(obj.ch, obj.fg, obj.bg);
  if (obj.anim) cell.anim = { ...obj.anim };
  return cell;
}
```

### Implementation Steps

1. [ ] Extend Cell class with optional `anim` property
2. [ ] Update Cell.toObject/fromObject for serialization
3. [ ] Create AnimationEngine class with start/stop/tick
4. [ ] Create CellAnimator with blink/flicker/colorCycle/charCycle
5. [ ] Add play/pause button to UI
6. [ ] Add animation options to brush tool
7. [ ] Integrate AnimationEngine into app.js initialization
8. [ ] Update ProjectManager version and validation
9. [ ] Add tests for animation logic
10. [ ] Add tests for serialization

---

## Phase 2: Particle Effects (4-6 hours)

### Goal
Simple procedural effects: rain, snow, twinkling stars.

### Data Model

**Behavior configuration (stored per-layer):**
```javascript
Layer.behaviors = [
  {
    id: 'rain-1',
    type: 'rain',
    config: {
      intensity: 'medium',  // light | medium | heavy
      wind: 0,              // -1 to 1 (left to right drift)
      chars: ['│', '╎', '┆'],
      color: 4              // cyan
    }
  }
]
```

### New Files

**`src/animation/behaviors/ParticleBehavior.js`:**
```javascript
class ParticleBehavior {
  constructor(config, bounds) { }
  
  tick(deltaTime)    // Update particle positions
  getParticles()     // Return array of {x, y, cell}
  
  // Particles spawn at top, fall down, despawn at bottom
}
```

**`src/animation/behaviors/RainBehavior.js`:**
```javascript
// Extends ParticleBehavior
// Fast vertical movement, slight wind drift
// Characters: │ ╎ ┆ ╵
```

**`src/animation/behaviors/SnowBehavior.js`:**
```javascript
// Extends ParticleBehavior
// Slower movement, more horizontal drift
// Characters: * · ✦ ❄
```

**`src/animation/behaviors/StarsBehavior.js`:**
```javascript
// Different from particles - fixed positions, random twinkle
// Randomly picks cells to toggle between ★ ✦ · and off
```

### UI Changes

**Add "Effects" section to Layer Panel or new panel:**
```
┌─ Layer: Sky ──────────────┐
│ 👁 🔒                      │
│ Effects: [+ Add]          │
│  └─ ✨ Stars (twinkling)  │
│  └─ 🌧️ Rain (medium)     │
└───────────────────────────┘
```

Or simpler - a dropdown in tool options when animation tool selected:
```html
<select id="add-effect">
  <option value="">+ Add Effect...</option>
  <option value="rain">Rain</option>
  <option value="snow">Snow</option>
  <option value="stars">Twinkling Stars</option>
</select>
```

### AnimationEngine Extension

```javascript
class AnimationEngine {
  // Existing cell animation...
  
  // Add behavior management
  behaviors = new Map()  // layerId -> Behavior[]
  
  tick(timestamp) {
    this.tickCellAnimations(timestamp);
    this.tickBehaviors(timestamp);
  }
  
  tickBehaviors(timestamp) {
    for (const [layerId, behaviors] of this.behaviors) {
      for (const behavior of behaviors) {
        behavior.tick(deltaTime);
        // Behavior particles render to a temporary overlay
        // or directly update cells in a dedicated effects layer
      }
    }
  }
}
```

### Implementation Steps

1. [ ] Create ParticleBehavior base class
2. [ ] Implement RainBehavior
3. [ ] Implement SnowBehavior  
4. [ ] Implement StarsBehavior (twinkle, not particles)
5. [ ] Extend AnimationEngine to manage behaviors
6. [ ] Add behavior rendering (overlay or layer-based)
7. [ ] Add UI for adding/removing effects
8. [ ] Update save/load for behavior data
9. [ ] Tests

---

## Phase 3: Walking Sprites (6-8 hours)

### Goal
Multi-cell sprites that move across the scene following rules.

### Data Model

**Sprite definition (reusable templates):**
```javascript
// Built-in sprite library
const SPRITES = {
  'person': {
    width: 1,
    height: 2,
    frames: [
      // Frame 0: standing
      [[{ ch: '○', fg: 7 }], [{ ch: '│', fg: 7 }]],
      // Frame 1: walk left
      [[{ ch: '○', fg: 7 }], [{ ch: '╱', fg: 7 }]],
      // Frame 2: walk right  
      [[{ ch: '○', fg: 7 }], [{ ch: '╲', fg: 7 }]],
    ],
    frameSpeed: 200
  },
  'car-right': {
    width: 4,
    height: 1,
    frames: [
      [[{ ch: '▐', fg: 1 }, { ch: '█', fg: 1 }, { ch: '█', fg: 1 }, { ch: '▌', fg: 1 }]]
    ]
  }
};
```

**Walker behavior configuration:**
```javascript
Layer.behaviors = [
  {
    id: 'street-walkers',
    type: 'walker',
    config: {
      sprite: 'person',
      rows: [18, 20],           // Allowed Y positions
      density: [2, 4],          // Min-max concurrent
      speed: [0.5, 1.5],        // Cells per second (randomized)
      spawnInterval: [2000, 5000],
      direction: 'both'         // left | right | both
    }
  }
]
```

### New Files

**`src/animation/SpriteLibrary.js`:**
```javascript
// Built-in sprites + user-defined sprites
const builtInSprites = { person, car, bird };

class SpriteLibrary {
  get(name)           // Get sprite definition
  add(name, sprite)   // Add custom sprite
  list()              // All available sprites
}
```

**`src/animation/behaviors/WalkerBehavior.js`:**
```javascript
class WalkerBehavior {
  constructor(config, bounds, spriteLibrary) { }
  
  actors = []  // Active sprite instances
  
  tick(deltaTime) {
    this.maybeSpawn();
    this.moveActors(deltaTime);
    this.despawnExited();
  }
  
  getActors()  // Return array of {x, y, sprite, frame}
}
```

**`src/animation/Actor.js`:**
```javascript
// A spawned instance of a sprite
class Actor {
  constructor(sprite, x, y, speed, direction) { }
  
  x, y              // Current position (float for smooth movement)
  speed             // Cells per second
  direction         // -1 or 1
  frameIndex        // Current animation frame
  
  move(deltaTime)   // Update position
  getFrame()        // Current sprite frame
  getBounds()       // {x, y, width, height} for collision/exit check
}
```

### Rendering Actors

Actors render on top of their assigned layer. Recommended approach:

**Direct cell manipulation with restoration tracking:**
```javascript
class WalkerBehavior {
  previousPositions = []  // Cells to restore
  
  tick() {
    // 1. Restore previous positions
    for (const pos of this.previousPositions) {
      layer.setCell(pos.x, pos.y, pos.originalCell);
    }
    
    // 2. Move actors
    this.moveActors();
    
    // 3. Draw actors at new positions (save originals)
    this.previousPositions = [];
    for (const actor of this.actors) {
      // Save and overwrite cells
    }
  }
}
```

### Implementation Steps

1. [ ] Create SpriteLibrary with built-in person, car, bird
2. [ ] Create Actor class for sprite instances
3. [ ] Create WalkerBehavior with spawn/move/despawn logic
4. [ ] Implement actor rendering with position restoration
5. [ ] Add walker configuration UI
6. [ ] Update save/load for walker behaviors
7. [ ] Tests for movement and spawning logic

---

## Phase 4: More Behaviors & Polish (4-6 hours)

### Additional Behaviors

**TrafficBehavior:**
- Like WalkerBehavior but for vehicles
- Consistent speed per lane
- Larger sprites (cars: 4x1)

**BirdsBehavior:**
- Flocks move across sky area
- Slight wave motion (sine wave on Y)
- Small sprites (1x1)

**WandererBehavior:**
- Picks random destination within bounds
- Walks there, pauses, picks new destination
- Good for plaza/park scenes

### Behavior Presets

Instead of complex configuration, offer simple presets:

```javascript
const BEHAVIOR_PRESETS = {
  'busy-sidewalk': {
    type: 'walker',
    sprite: 'person',
    density: [4, 6],
    speed: [0.8, 1.5]
  },
  'quiet-street': {
    type: 'walker', 
    sprite: 'person',
    density: [1, 2],
    speed: [0.3, 0.8]
  },
  'light-rain': {
    type: 'rain',
    intensity: 'light',
    wind: 0
  }
}
```

### UI for Adding Behaviors

Simple preset picker:
```
┌─ Add Effect to Layer ─────────────┐
│                                   │
│ People:                           │
│   [Busy Sidewalk] [Quiet Street]  │
│                                   │
│ Weather:                          │
│   [Light Rain] [Heavy Rain]       │
│   [Light Snow] [Heavy Snow]       │
│                                   │
│ Nature:                           │
│   [Flying Birds] [Twinkling Stars]│
│                                   │
│ Configure:                        │
│   Rows: [18, 20]                  │
│                                   │
│ [Cancel]              [Add]       │
└───────────────────────────────────┘
```

### Implementation Steps

1. [ ] Create TrafficBehavior
2. [ ] Create BirdsBehavior
3. [ ] Create WandererBehavior (optional, lower priority)
4. [ ] Define behavior presets
5. [ ] Build preset picker UI
6. [ ] Polish and edge cases

---

## Technical Decisions

### Rendering Strategy
- **No canvas** - Continue using DOM cells
- **Dirty tracking** - Only update changed cells each frame
- **requestAnimationFrame** - Smooth 60fps animation loop
- **Layer-based effects** - Each layer can have its own behaviors

### Performance Considerations
- Limit concurrent actors per behavior (density config)
- Skip animation ticks for off-screen content (future optimization)
- Batch DOM updates using documentFragment if needed
- Target 60fps with up to 100 animated cells + 20 actors

### Save Format (v1.1)
```javascript
{
  version: "1.1",
  name: "Rainy City",
  timestamp: "...",
  scene: {
    // ... existing scene data ...
    layers: [
      {
        // ... existing layer data ...
        behaviors: [
          { id: "rain-1", type: "rain", config: {...} },
          { id: "walkers-1", type: "walker", config: {...} }
        ]
      }
    ]
  },
  sprites: {
    // Custom user-defined sprites (optional)
    "custom-person": { ... }
  }
}
```

### Backward Compatibility
- Projects without `behaviors` or `anim` fields load normally
- Version "1.0" projects are read-only compatible
- On save, projects upgrade to "1.1"

### Random Seed (Optional, Phase 4+)
```javascript
scene.options.animationSeed = 12345;
// Same seed = same random sequence = reproducible animation
```

---

## Files to Create

```
src/animation/
├── AnimationEngine.js      # Main animation loop and coordination
├── CellAnimator.js         # Per-cell animation calculations
├── SpriteLibrary.js        # Built-in and custom sprites
├── Actor.js                # Spawned sprite instance
└── behaviors/
    ├── Behavior.js         # Base class
    ├── ParticleBehavior.js # Base for rain/snow
    ├── RainBehavior.js
    ├── SnowBehavior.js
    ├── StarsBehavior.js
    ├── WalkerBehavior.js
    └── TrafficBehavior.js
```

## Files to Modify

```
src/core/Cell.js            # Add optional anim property
src/core/Layer.js           # Add behaviors array
src/io/ProjectManager.js    # Version 1.1, serialize behaviors
src/app.js                  # Initialize AnimationEngine, wire UI
index.html                  # Animation controls UI
```

---

## Summary

| Phase | Effort | Result |
|-------|--------|--------|
| 1: Animated Cells | 4-6 hrs | Blinking lights, flickering signs, color cycles |
| 2: Particle Effects | 4-6 hrs | Rain, snow, twinkling stars |
| 3: Walking Sprites | 6-8 hrs | People walking, cars driving |
| 4: Polish & More | 4-6 hrs | Birds, presets, better UI |

**Total: 18-26 hours** for a complete procedural animation system.

Start with Phase 1 for immediate visual impact, then iterate through phases based on user feedback.
