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

## Phase 2: Particle System (Planning)

### Research & Background

Particle systems are a standard technique in game engines. Key concepts from industry:

**Core Architecture** ([Wikipedia](https://en.wikipedia.org/wiki/Particle_system), [Valve](https://developer.valvesoftware.com/wiki/Particle_System_Overview)):
- **Emitter** - Spawns particles at a rate, defines initial velocity/direction
- **Particle** - Individual element with position, velocity, lifespan, appearance
- **Lifecycle** - Particles are born, live (move/change), and die (despawn)
- **Initializers** - Set starting state (position, color, velocity)
- **Operators** - Modify particles each frame (gravity, fade, etc.)

**ASCII-Specific Implementations** ([Cogmind](https://www.gridsagegames.com/blog/2014/03/particle-effects/), [CosPlay](https://cosplayengine.com/devguide/particle.html)):
- Particles are single characters with color
- Movement on a grid (not sub-pixel)
- Scripts/configs define particle behaviors
- Effects: explosions, weather, fire, smoke

**Existing Terminal Tools** ([asciimatics](https://github.com/peterbrittain/asciimatics), [terminal-rain](https://github.com/rmaake1/terminal-rain-lightning)):
- Rain with varying drop characters
- Fire using color gradients
- Responsive to terminal size

---

### Brainstorm: Effect Types

| Effect | Spawn | Movement | Appearance | Lifespan |
|--------|-------|----------|------------|----------|
| **Rain** | Top edge, random X | Down, fast | `│` `\|` `,` `.` | Until bottom |
| **Snow** | Top edge, random X | Down slow, slight drift | `*` `·` `°` `❄` | Until bottom |
| **Smoke** | Point source | Up, spread outward | `░` `▒` `▓` → fade | Time-based |
| **Fire** | Bottom of area | Up, flicker | `▓` `▒` `░` colors cycle | Short, respawn |
| **Clouds** | Side edge | Horizontal drift | `☁` multi-cell? | Until off-screen |
| **Sparkle/Twinkle** | Random in area | Stationary | `✦` `✧` `·` `*` | Blink on/off |
| **Explosion** | Center point | Radial outward | `*` `+` `.` | Quick fade |
| **Bubbles** | Bottom | Up, wobble | `○` `◦` `°` | Until top |

---

### Brainstorm: Architecture Questions

**1. How do particles render without messing up layers?**

Options:
- **A) Overlay rendering** - Particles render on top of everything, don't modify cells
  - Pro: Clean separation, no data corruption
  - Con: Need separate render pass
  
- **B) Dedicated particle layer** - Auto-created layer on top
  - Pro: Uses existing layer system
  - Con: User might accidentally edit it
  
- **C) Composited during render** - Particles merged at render time only
  - Pro: Original cells untouched
  - Con: More complex rendering

**Current thinking:** Option A or C - particles should be ephemeral and not stored in cell data.

**2. Where does emitter data live?**

Options:
- **Scene-level** - `scene.particleEmitters = [...]`
- **Layer-level** - `layer.emitters = [...]` (emits on that layer's depth)
- **Separate system** - `ParticleSystem` independent of layers

**Current thinking:** Scene-level makes sense. Emitters are metadata, not cell content.

**3. How do users create/place emitters?**

Options:
- **New tool** - "Particle Emitter" tool, click to place
- **Selection-based** - Select area, add emitter from menu
- **Brush mode** - Paint emitter zones
- **Layer properties** - "Add rain to this layer"

**Current thinking:** Probably a new tool for placing point/area emitters.

**4. Emitter types**

- **Point emitter** - Single cell, particles spawn from there
- **Line emitter** - Particles spawn along a line (e.g., top edge for rain)
- **Area emitter** - Particles spawn anywhere in rectangle (e.g., sparkle field)
- **Edge emitter** - Spawn from screen edges

---

### Proposed Data Model

```javascript
// Scene-level particle system
scene.particles = {
  emitters: [
    {
      id: 'rain-1',
      type: 'line',              // point | line | area | edge
      position: { x: 0, y: 0 },  // Start position
      size: { width: 80, height: 1 }, // For line/area emitters
      
      // Spawning
      spawnRate: 10,             // Particles per second
      spawnVariance: 0.3,        // Randomness in spawn timing
      maxParticles: 100,         // Cap for performance
      
      // Particle properties
      particle: {
        glyphs: ['│', '|', ',', '.'],  // Random selection
        fg: 4,                          // Cyan
        bg: -1,                         // Transparent
        
        // Movement
        velocity: { x: 0, y: 1 },       // Cells per second
        velocityVariance: { x: 0.2, y: 0.3 },
        gravity: 0,                     // Additional downward acceleration
        
        // Lifecycle
        lifespan: 2000,                 // ms, or null for edge-despawn
        lifespanVariance: 0.2,
        fadeOut: true,                  // Fade near end of life
        
        // Optional behaviors
        drift: { x: 0.1, y: 0 },        // Random per-frame drift
        spin: false,                    // Cycle through glyphs
      }
    }
  ],
  
  // Runtime state (not saved)
  activeParticles: [
    { x: 45.2, y: 12.7, age: 500, emitterId: 'rain-1', glyph: '│', ... }
  ]
}
```

---

### Proposed Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Particle System (Phase 2)                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    ParticleEmitter                          │ │
│  │  - Defines spawn rules (rate, position, area)              │ │
│  │  - Defines particle template (glyph, color, velocity)      │ │
│  │  - Stored in scene.particles.emitters                      │ │
│  └─────────────────────────┬──────────────────────────────────┘ │
│                            │ creates                             │
│                            ▼                                     │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                      Particle                               │ │
│  │  - Runtime instance with position, age, velocity           │ │
│  │  - Not persisted (recreated on play)                       │ │
│  │  - Despawns when: lifespan ends OR leaves bounds           │ │
│  └─────────────────────────┬──────────────────────────────────┘ │
│                            │ managed by                          │
│                            ▼                                     │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                  ParticleEngine                             │ │
│  │  - Extends/integrates with AnimationEngine                 │ │
│  │  - Spawns particles based on emitter rates                 │ │
│  │  - Updates particle positions each frame                   │ │
│  │  - Removes dead particles                                  │ │
│  │  - Renders particles on top of scene                       │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**New Files:**
```
src/particles/
├── ParticleEngine.js     # Main loop, spawn/update/despawn
├── ParticleEmitter.js    # Emitter configuration class
├── Particle.js           # Individual particle instance
├── effects/              # Preset effect configurations
│   ├── rain.js
│   ├── snow.js
│   ├── fire.js
│   └── smoke.js
```

---

### Design Decisions (Resolved)

1. **Rendering strategy** → **Per-layer particle overlays**
   - Each drawing layer gets a corresponding particle layer
   - Particle layers are positioned at the same z-index as their parent layer
   - This allows particles to respect layer depth (e.g., clouds behind buildings, rain in front)
   - Emitters are associated with a specific layer
   - Particle layers are created dynamically alongside visual layers
   - Original cells remain untouched

2. **Coordinate system** → **Float internally, grid for rendering (configurable)**
   - Particles store float positions (x: 45.3, y: 12.7) for smooth physics
   - Rendering snaps to grid by default: `Math.floor(x), Math.floor(y)`
   - Option for sub-cell rendering using CSS transforms (for smoother look)
   - This allows smooth diagonal movement while keeping ASCII aesthetic

3. **Integration with AnimationEngine** → **Separate ParticleEngine**
   - Clean separation of concerns
   - ParticleEngine manages its own requestAnimationFrame loop
   - Can share play/pause state with AnimationEngine via StateManager events
   - Both engines can run independently or together

4. **Tool UX** → **Dedicated Particle UI panel**
   - New collapsible panel (like I/O panel) for particle management
   - List of emitters with add/remove/configure
   - Effect presets for quick setup
   - Click-to-place for point emitters, drag for line/area

5. **Presets vs Custom** → **Presets first, expose customization gradually**
   - Start with Rain, Snow, Sparkle presets
   - Each preset is just a pre-configured emitter
   - Advanced users can tweak parameters later

6. **Bounds handling** → **Despawn at edge (configurable)**
   - Default: particles despawn when leaving scene bounds
   - Option for wrap-around (e.g., continuous rain)

---

## Implementation Plan

### Phase 2.1: Core Particle System

**Goal:** Get particles rendering on screen with a simple rain effect.

#### Step 1: Particle Overlay Layer

Add a dedicated DOM layer for particles in `index.html`:

```html
<!-- In .grid-container.grid-stack, after hover-indicator -->
<div id="particle-layer" class="particle-layer"></div>
```

CSS for particle layer (`styles/grid.css`):
```css
.particle-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;  /* Click through to layers below */
  overflow: hidden;
  z-index: 100;  /* Above all layer containers */
}

.particle {
  position: absolute;
  font-family: monospace;
  /* Size matches cell dimensions - set via JS based on cell size */
}
```

**Files:** `index.html`, `styles/grid.css`

#### Step 2: Particle Class

Create `src/particles/Particle.js`:

```javascript
/**
 * Particle - A single particle instance
 * 
 * Runtime-only, not serialized. Created by emitters, managed by engine.
 */
export class Particle {
  constructor(config) {
    // Position (float for smooth movement)
    this.x = config.x ?? 0;
    this.y = config.y ?? 0;
    
    // Velocity (cells per second)
    this.vx = config.vx ?? 0;
    this.vy = config.vy ?? 0;
    
    // Appearance
    this.glyph = config.glyph ?? '*';
    this.fg = config.fg ?? 7;
    this.bg = config.bg ?? -1;
    
    // Lifecycle
    this.age = 0;              // ms since spawn
    this.lifespan = config.lifespan ?? null;  // null = infinite (despawn at edge)
    
    // Reference back to emitter (for behavior lookups)
    this.emitterId = config.emitterId;
    
    // DOM element (created by renderer)
    this.element = null;
    
    // Last rendered position (for dirty tracking)
    this.lastRenderX = null;
    this.lastRenderY = null;
  }
  
  /**
   * Update particle state
   * @param {number} deltaMs - Time since last update in ms
   */
  update(deltaMs) {
    const deltaSec = deltaMs / 1000;
    
    // Apply velocity
    this.x += this.vx * deltaSec;
    this.y += this.vy * deltaSec;
    
    // Age the particle
    this.age += deltaMs;
  }
  
  /**
   * Check if particle should despawn
   * @param {number} sceneWidth - Scene width in cells
   * @param {number} sceneHeight - Scene height in cells
   * @returns {boolean} True if particle should be removed
   */
  shouldDespawn(sceneWidth, sceneHeight) {
    // Lifespan check
    if (this.lifespan !== null && this.age >= this.lifespan) {
      return true;
    }
    
    // Bounds check (with small margin)
    const margin = 1;
    if (this.x < -margin || this.x >= sceneWidth + margin ||
        this.y < -margin || this.y >= sceneHeight + margin) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Get grid position for rendering
   * @returns {{x: number, y: number}} Integer grid position
   */
  getGridPosition() {
    return {
      x: Math.floor(this.x),
      y: Math.floor(this.y)
    };
  }
}
```

**Files:** `src/particles/Particle.js`

#### Step 3: ParticleEmitter Class

Create `src/particles/ParticleEmitter.js`:

```javascript
/**
 * ParticleEmitter - Defines how particles are spawned
 * 
 * Stored in scene.particles.emitters, serialized with project.
 */
export class ParticleEmitter {
  constructor(config = {}) {
    this.id = config.id ?? crypto.randomUUID();
    this.name = config.name ?? 'Emitter';
    this.enabled = config.enabled ?? true;
    
    // Emitter type and position
    this.type = config.type ?? 'point';  // point | line | area | edge
    this.x = config.x ?? 0;
    this.y = config.y ?? 0;
    this.width = config.width ?? 1;   // For line/area
    this.height = config.height ?? 1; // For area
    this.edge = config.edge ?? 'top'; // For edge type: top | bottom | left | right
    
    // Spawn settings
    this.spawnRate = config.spawnRate ?? 5;        // Particles per second
    this.spawnVariance = config.spawnVariance ?? 0.2;  // Randomness in timing
    this.maxParticles = config.maxParticles ?? 100;    // Cap for this emitter
    
    // Particle template
    this.particle = {
      glyphs: config.particle?.glyphs ?? ['*'],
      fg: config.particle?.fg ?? 7,
      bg: config.particle?.bg ?? -1,
      
      velocity: config.particle?.velocity ?? { x: 0, y: 1 },
      velocityVariance: config.particle?.velocityVariance ?? { x: 0, y: 0 },
      
      lifespan: config.particle?.lifespan ?? null,  // ms, null = edge despawn
      lifespanVariance: config.particle?.lifespanVariance ?? 0,
    };
    
    // Runtime state (not serialized)
    this._timeSinceSpawn = 0;
    this._activeParticles = 0;
  }
  
  /**
   * Get a random spawn position within emitter bounds
   * @param {number} sceneWidth - Scene width (for edge type)
   * @param {number} sceneHeight - Scene height (for edge type)
   * @returns {{x: number, y: number}} Spawn position
   */
  getSpawnPosition(sceneWidth, sceneHeight) {
    switch (this.type) {
      case 'point':
        return { x: this.x, y: this.y };
        
      case 'line':
        return {
          x: this.x + Math.random() * this.width,
          y: this.y
        };
        
      case 'area':
        return {
          x: this.x + Math.random() * this.width,
          y: this.y + Math.random() * this.height
        };
        
      case 'edge':
        switch (this.edge) {
          case 'top':
            return { x: Math.random() * sceneWidth, y: -1 };
          case 'bottom':
            return { x: Math.random() * sceneWidth, y: sceneHeight };
          case 'left':
            return { x: -1, y: Math.random() * sceneHeight };
          case 'right':
            return { x: sceneWidth, y: Math.random() * sceneHeight };
        }
        break;
    }
    
    return { x: this.x, y: this.y };
  }
  
  /**
   * Create a new particle from this emitter's template
   * @param {number} sceneWidth
   * @param {number} sceneHeight
   * @returns {Object} Particle config for Particle constructor
   */
  createParticleConfig(sceneWidth, sceneHeight) {
    const pos = this.getSpawnPosition(sceneWidth, sceneHeight);
    const template = this.particle;
    
    // Random glyph from list
    const glyph = template.glyphs[Math.floor(Math.random() * template.glyphs.length)];
    
    // Velocity with variance
    const vx = template.velocity.x + (Math.random() - 0.5) * 2 * template.velocityVariance.x;
    const vy = template.velocity.y + (Math.random() - 0.5) * 2 * template.velocityVariance.y;
    
    // Lifespan with variance
    let lifespan = template.lifespan;
    if (lifespan !== null && template.lifespanVariance > 0) {
      lifespan *= 1 + (Math.random() - 0.5) * 2 * template.lifespanVariance;
    }
    
    return {
      x: pos.x,
      y: pos.y,
      vx,
      vy,
      glyph,
      fg: template.fg,
      bg: template.bg,
      lifespan,
      emitterId: this.id
    };
  }
  
  /**
   * Serialize emitter for saving
   */
  toObject() {
    return {
      id: this.id,
      name: this.name,
      enabled: this.enabled,
      type: this.type,
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      edge: this.edge,
      spawnRate: this.spawnRate,
      spawnVariance: this.spawnVariance,
      maxParticles: this.maxParticles,
      particle: { ...this.particle }
    };
  }
  
  /**
   * Create emitter from saved data
   */
  static fromObject(obj) {
    return new ParticleEmitter(obj);
  }
}
```

**Files:** `src/particles/ParticleEmitter.js`

#### Step 4: ParticleEngine Class

Create `src/particles/ParticleEngine.js`:

```javascript
import { Particle } from './Particle.js';

/**
 * ParticleEngine - Manages particle simulation and rendering
 */
export class ParticleEngine {
  constructor(scene, stateManager, particleLayer) {
    this.scene = scene;
    this.stateManager = stateManager;
    this.particleLayer = particleLayer;
    
    this.playing = false;
    this.animationFrameId = null;
    this.lastTimestamp = 0;
    
    // Active particles
    this.particles = [];
    
    // Cell dimensions (set from CSS/DOM)
    this.cellWidth = 10;   // Will be measured
    this.cellHeight = 20;  // Will be measured
    
    this.tick = this.tick.bind(this);
  }
  
  /**
   * Measure cell dimensions from the DOM
   */
  measureCellSize() {
    // Find a cell element to measure
    const cell = document.querySelector('.cell');
    if (cell) {
      const rect = cell.getBoundingClientRect();
      this.cellWidth = rect.width;
      this.cellHeight = rect.height;
    }
  }
  
  /**
   * Get emitters from scene
   */
  getEmitters() {
    return this.scene.particles?.emitters ?? [];
  }
  
  /**
   * Start particle simulation
   */
  start() {
    if (this.playing) return;
    
    this.playing = true;
    this.measureCellSize();
    this.lastTimestamp = performance.now();
    this.animationFrameId = requestAnimationFrame(this.tick);
    
    this.stateManager.emit('particles:started');
  }
  
  /**
   * Stop particle simulation
   */
  stop() {
    if (!this.playing) return;
    
    this.playing = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    // Clear all particles
    this.clearParticles();
    
    this.stateManager.emit('particles:stopped');
  }
  
  /**
   * Toggle play/pause
   */
  toggle() {
    if (this.playing) {
      this.stop();
    } else {
      this.start();
    }
    return this.playing;
  }
  
  /**
   * Main animation tick
   */
  tick(timestamp) {
    if (!this.playing) return;
    
    const deltaMs = timestamp - this.lastTimestamp;
    this.lastTimestamp = timestamp;
    
    // Spawn new particles
    this.spawnParticles(deltaMs);
    
    // Update existing particles
    this.updateParticles(deltaMs);
    
    // Remove dead particles
    this.removeDeadParticles();
    
    // Render particles
    this.renderParticles();
    
    // Schedule next frame
    this.animationFrameId = requestAnimationFrame(this.tick);
  }
  
  /**
   * Spawn particles from all emitters
   */
  spawnParticles(deltaMs) {
    const emitters = this.getEmitters();
    
    for (const emitter of emitters) {
      if (!emitter.enabled) continue;
      
      // Count active particles for this emitter
      const activeCount = this.particles.filter(p => p.emitterId === emitter.id).length;
      if (activeCount >= emitter.maxParticles) continue;
      
      // Accumulate time
      emitter._timeSinceSpawn = (emitter._timeSinceSpawn ?? 0) + deltaMs;
      
      // Calculate spawn interval with variance
      const baseInterval = 1000 / emitter.spawnRate;
      const variance = baseInterval * emitter.spawnVariance * (Math.random() - 0.5) * 2;
      const interval = baseInterval + variance;
      
      // Spawn particles
      while (emitter._timeSinceSpawn >= interval) {
        emitter._timeSinceSpawn -= interval;
        
        const config = emitter.createParticleConfig(this.scene.w, this.scene.h);
        const particle = new Particle(config);
        this.particles.push(particle);
      }
    }
  }
  
  /**
   * Update all particles
   */
  updateParticles(deltaMs) {
    for (const particle of this.particles) {
      particle.update(deltaMs);
    }
  }
  
  /**
   * Remove dead particles
   */
  removeDeadParticles() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      
      if (particle.shouldDespawn(this.scene.w, this.scene.h)) {
        // Remove DOM element
        if (particle.element && particle.element.parentNode) {
          particle.element.remove();
        }
        
        // Remove from array
        this.particles.splice(i, 1);
      }
    }
  }
  
  /**
   * Render all particles to DOM
   */
  renderParticles() {
    for (const particle of this.particles) {
      const gridPos = particle.getGridPosition();
      
      // Skip if out of bounds
      if (gridPos.x < 0 || gridPos.x >= this.scene.w ||
          gridPos.y < 0 || gridPos.y >= this.scene.h) {
        if (particle.element) {
          particle.element.style.display = 'none';
        }
        continue;
      }
      
      // Create element if needed
      if (!particle.element) {
        particle.element = document.createElement('span');
        particle.element.className = 'particle';
        this.particleLayer.appendChild(particle.element);
      }
      
      // Update if position changed
      if (gridPos.x !== particle.lastRenderX || gridPos.y !== particle.lastRenderY) {
        particle.element.textContent = particle.glyph;
        particle.element.className = `particle fg-${particle.fg} bg-${particle.bg}`;
        particle.element.style.left = `${gridPos.x * this.cellWidth}px`;
        particle.element.style.top = `${gridPos.y * this.cellHeight}px`;
        particle.element.style.width = `${this.cellWidth}px`;
        particle.element.style.height = `${this.cellHeight}px`;
        particle.element.style.display = '';
        
        particle.lastRenderX = gridPos.x;
        particle.lastRenderY = gridPos.y;
      }
    }
  }
  
  /**
   * Clear all particles and their DOM elements
   */
  clearParticles() {
    for (const particle of this.particles) {
      if (particle.element && particle.element.parentNode) {
        particle.element.remove();
      }
    }
    this.particles = [];
    
    // Also clear any orphaned elements
    if (this.particleLayer) {
      this.particleLayer.innerHTML = '';
    }
  }
  
  /**
   * Get particle count
   */
  getParticleCount() {
    return this.particles.length;
  }
  
  /**
   * Dispose engine
   */
  dispose() {
    this.stop();
    this.particles = [];
  }
}
```

**Files:** `src/particles/ParticleEngine.js`

#### Step 5: Scene Integration

Extend `Scene.js` to support particle emitters:

```javascript
// Add to Scene constructor or create method
this.particles = {
  emitters: []
};

// Add to toObject()
particles: {
  emitters: this.particles.emitters.map(e => e.toObject())
}

// Add to fromObject()
if (obj.particles?.emitters) {
  scene.particles.emitters = obj.particles.emitters.map(e => 
    ParticleEmitter.fromObject(e)
  );
}
```

**Files:** `src/core/Scene.js`

#### Step 6: Effect Presets

Create `src/particles/presets.js`:

```javascript
/**
 * Particle effect presets - pre-configured emitter settings
 */

export const PRESETS = {
  rain: {
    name: 'Rain',
    type: 'edge',
    edge: 'top',
    spawnRate: 15,
    maxParticles: 150,
    particle: {
      glyphs: ['│', '|', ':', '.'],
      fg: 4,  // Cyan
      bg: -1,
      velocity: { x: 0, y: 15 },
      velocityVariance: { x: 0.5, y: 3 },
      lifespan: null  // Despawn at edge
    }
  },
  
  snow: {
    name: 'Snow',
    type: 'edge',
    edge: 'top',
    spawnRate: 8,
    maxParticles: 100,
    particle: {
      glyphs: ['*', '·', '°', '❄', '✦'],
      fg: 7,  // White
      bg: -1,
      velocity: { x: 0, y: 3 },
      velocityVariance: { x: 1, y: 1 },
      lifespan: null
    }
  },
  
  sparkle: {
    name: 'Sparkle',
    type: 'area',
    spawnRate: 3,
    maxParticles: 20,
    particle: {
      glyphs: ['✦', '✧', '*', '·'],
      fg: 6,  // Yellow
      bg: -1,
      velocity: { x: 0, y: 0 },
      velocityVariance: { x: 0, y: 0 },
      lifespan: 800,
      lifespanVariance: 0.5
    }
  },
  
  smoke: {
    name: 'Smoke',
    type: 'point',
    spawnRate: 5,
    maxParticles: 30,
    particle: {
      glyphs: ['░', '▒', '▓'],
      fg: 7,  // White/gray
      bg: -1,
      velocity: { x: 0, y: -2 },
      velocityVariance: { x: 1, y: 0.5 },
      lifespan: 2000,
      lifespanVariance: 0.3
    }
  },
  
  fire: {
    name: 'Fire',
    type: 'line',
    spawnRate: 12,
    maxParticles: 40,
    particle: {
      glyphs: ['▓', '▒', '░', '^', '*'],
      fg: 1,  // Red (could cycle through 1, 3, 6 for fire colors)
      bg: -1,
      velocity: { x: 0, y: -4 },
      velocityVariance: { x: 1.5, y: 1 },
      lifespan: 600,
      lifespanVariance: 0.4
    }
  },
  
  bubbles: {
    name: 'Bubbles',
    type: 'line',
    spawnRate: 4,
    maxParticles: 25,
    particle: {
      glyphs: ['○', '◦', '°', 'o'],
      fg: 4,  // Cyan
      bg: -1,
      velocity: { x: 0, y: -3 },
      velocityVariance: { x: 0.8, y: 0.5 },
      lifespan: null
    }
  }
};

/**
 * Create an emitter from a preset
 * @param {string} presetId - Preset ID (rain, snow, etc.)
 * @param {object} overrides - Optional property overrides
 * @returns {object} Emitter config for ParticleEmitter constructor
 */
export function createFromPreset(presetId, overrides = {}) {
  const preset = PRESETS[presetId];
  if (!preset) {
    throw new Error(`Unknown preset: ${presetId}`);
  }
  
  return {
    ...preset,
    ...overrides,
    particle: {
      ...preset.particle,
      ...overrides.particle
    }
  };
}
```

**Files:** `src/particles/presets.js`

---

### Phase 2.2: UI & Integration

**Goal:** Add UI for managing emitters, wire up to app.

#### Step 7: Particle Panel UI

Add particle panel to `index.html` (similar to I/O panel):

```html
<!-- After I/O panel -->
<div id="particle-panel" class="particle-panel hidden">
  <div class="particle-panel-content">
    <h3>Particle Effects</h3>
    
    <div class="preset-buttons">
      <button class="preset-btn" data-preset="rain">🌧️ Rain</button>
      <button class="preset-btn" data-preset="snow">❄️ Snow</button>
      <button class="preset-btn" data-preset="sparkle">✨ Sparkle</button>
      <button class="preset-btn" data-preset="smoke">💨 Smoke</button>
      <button class="preset-btn" data-preset="fire">🔥 Fire</button>
    </div>
    
    <div id="emitter-list" class="emitter-list">
      <!-- Populated dynamically -->
    </div>
  </div>
</div>
```

Add toggle button to toolbar.

**Files:** `index.html`, `styles/ui.css`

#### Step 8: App Integration

Wire up ParticleEngine in `app.js`:
- Create ParticleEngine instance
- Connect play/pause button to both animation engines
- Add particle panel toggle
- Handle preset buttons

**Files:** `src/app.js`

#### Step 9: Emitter Placement Tool (Optional for Phase 2.2)

Could add later - for now, presets use edge/screen-wide emitters.

---

### Phase 2.3: Polish & Testing

#### Step 10: Tests

Create tests for:
- `Particle.js` - update, despawn logic
- `ParticleEmitter.js` - spawn positions, particle creation
- `ParticleEngine.js` - spawn/update/remove lifecycle
- Presets - all presets create valid configs

**Files:** `tests/Particle.test.js`, `tests/ParticleEmitter.test.js`, `tests/ParticleEngine.test.js`

#### Step 11: Serialization

Ensure emitters save/load with projects:
- Scene.toObject includes particles.emitters
- Scene.fromObject restores emitters
- Backward compatibility for projects without particles

#### Step 12: Performance Optimization

- Object pooling for particles (reuse instead of create/destroy)
- DOM element pooling
- Limit total particles across all emitters
- Consider using canvas for very high particle counts

---

### File Summary

**New Files:**
```
src/particles/
├── Particle.js           # Individual particle class
├── ParticleEmitter.js    # Emitter configuration class  
├── ParticleEngine.js     # Main simulation engine
├── presets.js            # Effect presets (rain, snow, etc.)
└── index.js              # Barrel export

tests/
├── Particle.test.js
├── ParticleEmitter.test.js
└── ParticleEngine.test.js
```

**Modified Files:**
```
index.html                # Add particle layer, panel, toolbar button
styles/grid.css           # Particle layer and particle element styles
styles/ui.css             # Particle panel styles
src/core/Scene.js         # Add particles.emitters storage
src/app.js                # Wire up ParticleEngine, UI handlers
```

---

### Estimated Complexity

| Step | Effort | Description |
|------|--------|-------------|
| 1. Particle layer | Small | HTML + CSS |
| 2. Particle class | Small | Simple data class |
| 3. ParticleEmitter class | Medium | Spawn logic |
| 4. ParticleEngine class | Large | Main simulation loop |
| 5. Scene integration | Small | Add particles property |
| 6. Presets | Small | Config objects |
| 7. Panel UI | Medium | HTML + handlers |
| 8. App integration | Medium | Wiring |
| 9. Tests | Medium | Test coverage |

**Recommended approach:** Implement steps 1-6 first to get rain working, then add UI.

---

## Phase 2 Implementation Status (Complete)

Phase 2 has been fully implemented with all planned features plus additional enhancements.

### Implemented Features

#### Core Particle System
- **Particle class** (`src/particles/Particle.js`) - Individual particle with position, velocity, appearance, lifecycle
- **ParticleEmitter class** (`src/particles/ParticleEmitter.js`) - Defines spawn rules and particle templates
- **ParticleEngine class** (`src/particles/ParticleEngine.js`) - Main simulation loop, spawn/update/render
- **Constants** (`src/particles/constants.js`) - Shared defaults (density glyphs, cycle duration, despawn margin)

#### Emitter Types
- `point` - Single spawn location
- `line` - Spawn along horizontal line
- `area` - Spawn anywhere in rectangle
- `edge` - Spawn from screen edges (top/bottom/left/right)

#### Per-Layer Particle Rendering
- Each visual layer gets a corresponding particle layer
- Particles respect layer depth ordering (e.g., clouds behind buildings, rain in front)
- Emitters are associated with specific layers via `layerId`
- Dynamic z-index calculation: `100 + layerIndex * 2 + 1`

#### Radial Emission System
Particles can emit outward from a center point with configurable angles:
```javascript
particle: {
  radial: true,           // Enable radial emission
  speed: 10,              // Cells per second
  speedVariance: 3,       // Random speed variation
  angleMin: 0,            // Start angle (degrees, 0=right, 90=down)
  angleMax: 360,          // End angle (full circle)
}
```

#### Gravity System
Particles can have gravity applied for realistic physics:
```javascript
particle: {
  gravity: 9.8,  // Cells per second squared (positive = down)
}
```
Gravity is applied each frame: `vy += gravity * deltaSeconds`

#### Color/Glyph Cycling
Particles can animate their appearance over their lifetime:
```javascript
particle: {
  glyphCycle: ['★', '✦', '·'],  // Cycle through glyphs
  fgCycle: [7, 6, 3],            // Cycle through foreground colors
  bgCycle: [0, -1],              // Cycle through background colors
  cycleDuration: 500,            // ms per cycle step
}
```
Uses generic `getCycledValue()` helper for DRY code.

#### Density Accumulation
Multiple particles in the same cell render as denser glyphs:
```javascript
particle: {
  accumulateDensity: true,
  densityGlyphs: ['░', '▒', '▓', '█'],  // Sparse to dense
  densityColors: [7, 7, 0, 0],          // Optional: color per density level
}
```
The engine groups particles by grid cell and renders one glyph based on count.

### Presets (21 total)

#### Basic Effects (8)
| Preset | Type | Description |
|--------|------|-------------|
| `rain` | edge/top | Fast falling rain drops |
| `snow` | edge/top | Slow drifting snowflakes |
| `sparkle` | area | Twinkling stationary sparkles |
| `smoke` | point | Rising smoke wisps |
| `fire` | line | Rising flames with color cycle |
| `bubbles` | line | Rising bubbles |
| `clouds` | area | Drifting clouds with density |
| `stars` | area | Twinkling stars |

#### Dense Volumetric Effects (5)
| Preset | Type | Features |
|--------|------|----------|
| `smokePlume` | area | Density accumulation, rising |
| `inferno` | area | High spawn rate, density, color gradient |
| `stormClouds` | area | Dark clouds, density, horizontal drift |
| `fog` | area | Slow drift, wispy density |
| `embers` | area | Glowing particles, color flicker |

#### Radial Effects (8)
| Preset | Type | Features |
|--------|------|----------|
| `explosion` | point | Radial burst, gravity, density |
| `burst` | point | Radial sparkle, no gravity, density |
| `fountain` | point | Upward cone (250-290°), gravity |
| `firework` | point | Radial burst, gravity, density |
| `shockwave` | point | Fast uniform ring, no gravity |
| `confetti` | point | Upward spray, rainbow colors, gravity |
| `magic` | point | Radial, negative gravity (floats up) |
| `plasma` | point | Radial, color/glyph cycling |

#### Physics-Based Effects (4)
| Preset | Type | Features |
|--------|------|----------|
| `waterfall` | line | Downward with gravity acceleration |
| `leaves` | edge/top | Diagonal fall, gravity, autumn colors |
| `meteor` | edge/top | Diagonal streak, gravity, fading trail |
| `steam` | line | Rising, negative gravity (accelerates up) |

### Positioning System

Changed from pixel-based to CSS unit-based positioning for accurate grid alignment:
```javascript
// Before (caused gaps)
particle.element.style.left = `${gridPos.x * this.cellWidth}px`;

// After (correct alignment)
particle.element.style.left = `${gridPos.x}ch`;
particle.element.style.top = `calc(${gridPos.y} * var(--cell-height))`;
```

### UI Integration

- Particle panel in sidebar with preset buttons
- Layer selection dropdown (dynamically populated from scene layers)
- Position override fields for point/line/area emitters
- Enable/disable toggle per emitter
- Real-time particle count display

### Files

```
src/particles/
├── Particle.js           # Particle class with gravity, cycling, density
├── ParticleEmitter.js    # Emitter with radial, gravity, density support
├── ParticleEngine.js     # Engine with per-layer rendering, density accumulation
├── presets.js            # 21 effect presets
├── constants.js          # Shared constants
└── index.js              # Barrel export

tests/
├── Particle.test.js      # Tests for gravity, cycling, density
├── ParticleEmitter.test.js # Tests for radial emission, all emitter types
└── presets.test.js       # Tests for all 21 presets
```

### Test Coverage

- 1306 total tests passing
- Particle: gravity application, cycling behavior, density properties
- ParticleEmitter: radial velocity calculation, angle ranges, speed variance
- Presets: all 21 presets validated for required properties

---

## Phase 2.2: Precise Control & Force Fields (Planning)

### Overview

Currently emitters are placed via UI fields. This phase adds:
1. **Drawable emitter placement** - Click/drag to place emitters precisely
2. **Force fields** - Objects that affect particle movement
3. **Collision** - Particles interact with drawn cells

### Drawable Emitter Placement

#### Tools

| Tool | Interaction | Result |
|------|-------------|--------|
| **Point Emitter** | Click | Places emitter at click position |
| **Line Emitter** | Click + drag | Creates line from start to end |
| **Area Emitter** | Click + drag | Creates rectangle |

#### Visual Indicators

When particle panel is open or emitter tool selected:
- Point emitters: Small marker (e.g., `◉`)
- Line emitters: Dashed line showing bounds
- Area emitters: Dashed rectangle outline
- Force fields: Radius circle or zone boundary

These indicators render on a UI overlay (not in the artwork).

#### Data Model Changes

```javascript
// Emitters gain precise positioning
emitter: {
  // For line emitters
  x1: 10, y1: 5,   // Start point
  x2: 50, y2: 5,   // End point
  
  // For area emitters  
  x: 10, y: 5,
  width: 40,
  height: 20,
}
```

### Despawn Boundaries

Currently particles despawn at scene edges. This adds configurable despawn zones:

#### Despawn Modes

| Mode | Behavior | Use Case |
|------|----------|----------|
| **Scene** | Despawn at scene edges (default) | Rain, snow, most effects |
| **Emitter Zone** | Despawn when leaving emitter's spawn area | Contained effects, localized fog |
| **Custom Zone** | Despawn when leaving a defined rectangle | Chimney smoke, window effects |
| **Distance** | Despawn when N cells from spawn point | Explosions, radial limits |
| **None** | Only despawn via lifespan or collision | Long-lived particles |

#### Data Model

```javascript
emitter: {
  // Despawn boundary settings
  despawnMode: 'scene',  // scene | emitterZone | customZone | distance | none
  
  // For customZone mode
  despawnBounds: { x: 5, y: 0, width: 30, height: 15 },
  
  // For distance mode
  despawnDistance: 20,   // Cells from spawn point
  
  // Edge behavior before despawn
  edgeBehavior: 'despawn',  // despawn | wrap | bounce | clamp
}
```

#### Edge Behaviors

| Behavior | Description | Use Case |
|----------|-------------|----------|
| **Despawn** | Remove particle (default) | Most effects |
| **Wrap** | Teleport to opposite edge | Continuous rain, scrolling |
| **Bounce** | Reflect velocity at boundary | Contained bouncing |
| **Clamp** | Stop at edge, stay alive | Accumulation effects |

#### Visual Indicators

When editing emitters:
- Despawn boundaries shown as dotted lines (distinct from spawn area)
- Different colors: spawn area (green), despawn zone (red/orange)

### Force Fields

Force fields are scene-level objects that affect particles (and later, boids) passing through or near them.

#### Force Field Types

| Type | Effect | Parameters | Use Case |
|------|--------|------------|----------|
| **Attractor** | Pulls toward center | position, strength, radius | Drains, magnets, black holes |
| **Repulsor** | Pushes away from center | position, strength, radius | Force fields, shields |
| **Gravity Well** | Pull with 1/r² falloff | position, mass, radius | Orbital effects, realistic gravity |
| **Wind Zone** | Constant directional force | bounds, direction, strength | Gusts, fans, drafts |
| **Turbulence** | Random velocity perturbation | bounds, intensity, scale | Chaotic smoke, rough air |
| **Vortex** | Circular/spiral force | position, strength, radius, inward | Tornadoes, whirlpools |
| **Damping Zone** | Reduces velocity | bounds, factor | Friction, water resistance |
| **Bounce Surface** | Reflects velocity | line/rect, elasticity | Walls, floors, barriers |

#### Data Model

```javascript
// Scene-level force fields
scene.forces = [
  {
    id: 'wind-1',
    type: 'wind',
    enabled: true,
    
    // Bounds (for zone-based forces)
    bounds: { x: 0, y: 0, width: 80, height: 10 },
    
    // Or position + radius (for point-based forces)
    position: { x: 40, y: 12 },
    radius: 15,
    
    // Force parameters
    strength: 5,           // Force magnitude
    direction: { x: 1, y: 0 }, // For directional forces
    falloff: 'linear',     // none | linear | quadratic
    
    // What it affects
    affectsParticles: true,
    affectsBoids: true,
  }
];
```

#### Force Field Class Hierarchy

```javascript
// Base class
class ForceField {
  constructor(config) { }
  
  // Calculate force on an entity at position
  getForceAt(x, y) { return { fx: 0, fy: 0 }; }
  
  // Check if position is within influence
  isInRange(x, y) { return false; }
  
  // Serialization
  toObject() { }
  static fromObject(obj) { }
}

// Point-based forces
class Attractor extends ForceField {
  getForceAt(x, y) {
    const dx = this.position.x - x;
    const dy = this.position.y - y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > this.radius || dist < 0.1) return { fx: 0, fy: 0 };
    
    const falloff = this.getFalloff(dist);
    const magnitude = this.strength * falloff;
    return {
      fx: (dx / dist) * magnitude,
      fy: (dy / dist) * magnitude
    };
  }
}

class Repulsor extends Attractor {
  getForceAt(x, y) {
    const force = super.getForceAt(x, y);
    return { fx: -force.fx, fy: -force.fy };
  }
}

// Zone-based forces
class WindZone extends ForceField {
  getForceAt(x, y) {
    if (!this.isInBounds(x, y)) return { fx: 0, fy: 0 };
    return {
      fx: this.direction.x * this.strength,
      fy: this.direction.y * this.strength
    };
  }
}

class Vortex extends ForceField {
  getForceAt(x, y) {
    const dx = x - this.position.x;
    const dy = y - this.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > this.radius || dist < 0.1) return { fx: 0, fy: 0 };
    
    const falloff = this.getFalloff(dist);
    const magnitude = this.strength * falloff;
    
    // Perpendicular force (tangential)
    let fx = -dy / dist * magnitude;
    let fy = dx / dist * magnitude;
    
    // Optional inward pull
    if (this.inwardStrength) {
      fx += (this.position.x - x) / dist * this.inwardStrength * falloff;
      fy += (this.position.y - y) / dist * this.inwardStrength * falloff;
    }
    
    return { fx, fy };
  }
}
```

#### Integration with Particle Engine

```javascript
// In ParticleEngine.updateParticles()
updateParticles(deltaMs) {
  const deltaSec = deltaMs / 1000;
  const forces = this.scene.forces ?? [];
  
  for (const particle of this.particles) {
    // Apply force fields
    for (const field of forces) {
      if (!field.enabled || !field.affectsParticles) continue;
      
      const { fx, fy } = field.getForceAt(particle.x, particle.y);
      particle.vx += fx * deltaSec;
      particle.vy += fy * deltaSec;
    }
    
    // Existing update (gravity, movement)
    particle.update(deltaMs);
  }
}
```

### Collision with Drawn Cells

Particles can interact with the artwork itself.

#### Collision Modes

| Mode | Behavior | Use Case |
|------|----------|----------|
| **None** | Pass through (default) | Most effects |
| **Stop** | Particle stops and stays | Snow accumulation |
| **Destroy** | Particle despawns | Rain hitting ground |
| **Bounce** | Reflect velocity | Bouncing balls |
| **Spawn** | Destroy + emit new particles | Splashes, sparks |

#### Implementation

```javascript
// In Particle or ParticleEngine
checkCollision(scene, layer) {
  const gridX = Math.floor(this.x);
  const gridY = Math.floor(this.y);
  
  const cell = layer.getCell(gridX, gridY);
  if (!cell || cell.ch === ' ' || cell.ch === '') {
    return null; // No collision
  }
  
  return { x: gridX, y: gridY, cell };
}

// Collision response based on emitter config
handleCollision(particle, collision) {
  switch (particle.collisionMode) {
    case 'stop':
      particle.vx = 0;
      particle.vy = 0;
      break;
    case 'destroy':
      particle.lifespan = 0; // Mark for removal
      break;
    case 'bounce':
      // Simple bounce - reverse velocity component
      // More sophisticated: calculate surface normal
      particle.vy *= -particle.elasticity;
      break;
    case 'spawn':
      particle.lifespan = 0;
      this.spawnCollisionParticles(particle, collision);
      break;
  }
}
```

### Drawable Force Field Placement

Similar to emitters, force fields can be drawn:

| Tool | Interaction | Creates |
|------|-------------|---------|
| **Attractor Tool** | Click | Point attractor at position |
| **Repulsor Tool** | Click | Point repulsor at position |
| **Wind Zone Tool** | Click + drag | Rectangular wind area |
| **Vortex Tool** | Click + drag radius | Circular vortex |

### UI Design

#### Force Field Panel

```
┌─────────────────────────────────┐
│ Force Fields                [+] │
├─────────────────────────────────┤
│ ◉ Wind Zone 1        [👁] [🗑] │
│   Strength: [====----] 5        │
│   Direction: → East             │
├─────────────────────────────────┤
│ ◉ Attractor 1        [👁] [🗑] │
│   Strength: [======--] 8        │
│   Radius: [===-------] 10       │
└─────────────────────────────────┘
```

### File Structure

```
src/forces/
├── ForceField.js        # Base class with common logic
├── Attractor.js         # Point attractor
├── Repulsor.js          # Point repulsor
├── GravityWell.js       # 1/r² gravity
├── WindZone.js          # Directional zone force
├── Turbulence.js        # Random perturbation zone
├── Vortex.js            # Circular/spiral force
├── DampingZone.js       # Velocity reduction zone
├── BounceSurface.js     # Reflection surface
├── presets.js           # Pre-configured force setups
└── index.js             # Barrel export

tests/
├── ForceField.test.js
├── Attractor.test.js
├── WindZone.test.js
└── Vortex.test.js
```

### Per-Emitter Controls

Additional emitter settings for precise timing and behavior:

| Setting | Description | Use Case |
|---------|-------------|----------|
| **Burst Mode** | Spawn N particles instantly, then stop | Explosions, one-shot effects |
| **Delay** | Wait X ms before starting | Staged effects, sequencing |
| **Duration** | Run for Y ms, then stop | Timed effects |
| **Loop Count** | Repeat burst N times | Repeating explosions |
| **Loop Delay** | Wait between loops | Pulsing effects |

```javascript
emitter: {
  // Timing controls
  delay: 0,              // ms before first spawn
  duration: null,        // ms to run (null = forever)
  
  // Burst mode
  burstMode: false,      // If true, spawn burstCount instantly
  burstCount: 50,        // Particles per burst
  burstLoops: 1,         // Number of bursts (0 = infinite)
  burstDelay: 1000,      // ms between bursts
}
```

### Emitter Linking / Chain Reactions

Emitters can trigger other emitters, enabling complex staged effects:

| Trigger | Description | Use Case |
|---------|-------------|----------|
| **On Particle Death** | When particle despawns, trigger emitter at that location | Firework stages, splashes |
| **On Collision** | When particle hits cell, trigger emitter | Impact sparks, ripples |
| **On Timer** | After X ms, trigger linked emitter | Staged explosions |
| **On Emitter Complete** | When emitter finishes, trigger next | Effect sequences |

```javascript
emitter: {
  // Linking
  linkedEmitters: [
    {
      emitterId: 'sparks-1',        // Emitter to trigger
      trigger: 'onParticleDeath',   // When to trigger
      probability: 0.3,              // Chance per trigger (0-1)
      inheritPosition: true,         // Spawn at particle's position
      inheritVelocity: false,        // Inherit particle's velocity
    }
  ]
}
```

**Example: Multi-stage Firework**
```
Emitter A (rocket):     Launches upward
    ↓ onParticleDeath
Emitter B (explosion):  Radial burst of sparks
    ↓ onParticleDeath  
Emitter C (trails):     Small trailing particles
```

### Path/Spline Following

Particles can follow drawn paths for guided effects:

#### Path Types

| Type | Description | Use Case |
|------|-------------|----------|
| **Linear Path** | Follow straight line segments | Conveyor belts, rails |
| **Bezier Curve** | Smooth curved path | Rivers, swooping effects |
| **Loop Path** | Closed path that repeats | Orbits, circular flows |

#### Drawing Paths

- **Path Tool** - Click points to create path segments
- **Curve Tool** - Click and drag for bezier control points
- Paths are scene-level objects (like emitters and forces)

```javascript
// Scene-level paths
scene.paths = [
  {
    id: 'river-1',
    type: 'bezier',
    points: [
      { x: 0, y: 10 },
      { x: 20, y: 8, cp1: { x: 10, y: 5 }, cp2: { x: 15, y: 12 } },
      { x: 40, y: 10 },
    ],
    loop: false,
  }
];

// Emitter following a path
emitter: {
  followPath: 'river-1',    // Path ID to follow
  pathSpeed: 5,             // Cells per second along path
  pathSpeedVariance: 1,     // Speed variation
  pathOffset: 0.5,          // Perpendicular offset variance
}
```

### Kill Zones

Specific cells or colors that destroy particles on contact:

```javascript
// Scene-level kill zone settings
scene.particles.killZones = {
  enabled: true,
  
  // Kill by cell content
  killGlyphs: ['█', '▓'],   // These glyphs destroy particles
  
  // Kill by color
  killColors: [0],           // Black cells kill particles
  
  // Kill by layer
  killOnLayer: 'obstacles',  // Any non-empty cell on this layer kills
};

// Or per-emitter override
emitter: {
  particle: {
    killOnGlyphs: ['█'],
    killOnColors: [0],
  }
}
```

### Implementation Order

1. **Force field base system** - ForceField base class, integration with ParticleEngine
2. **Basic forces** - Attractor, Repulsor, WindZone
3. **Drawable emitter placement** - Tools for point/line/area
4. **Per-emitter controls** - Burst mode, delay, duration
5. **Advanced forces** - Vortex, Turbulence, GravityWell
6. **Collision system** - Particle/cell interaction, kill zones
7. **Emitter linking** - Chain reactions, triggers
8. **Path following** - Path drawing, particle guidance
9. **Drawable force placement** - Tools for forces
10. **UI polish** - Visual indicators, panel improvements

---

## Phase 2.3: Boids System (Planning)

### Overview

Boids are autonomous agents that exhibit flocking behavior through simple local rules. Unlike particles, each boid is aware of its neighbors and makes decisions based on them.

### Boids vs Particles Comparison

| Aspect | Particles | Boids |
|--------|-----------|-------|
| **Awareness** | None - independent | Sees neighbors within radius |
| **Rules** | Physics (forces, gravity) | Behavioral (separation, alignment, cohesion) |
| **Movement** | Deterministic from forces | Emergent from local decisions |
| **Complexity** | O(n) | O(n²) naive, O(n log n) optimized |
| **Use Cases** | Weather, fire, explosions | Flocks, schools, crowds, swarms |

### Classic Boid Rules

1. **Separation** - Steer away from nearby boids to avoid crowding
2. **Alignment** - Steer toward average heading of nearby boids
3. **Cohesion** - Steer toward average position of nearby boids

```
    Separation         Alignment          Cohesion
    
    ← ○ →             ○ → → →           ○ ↘
   ↙  ↓  ↘            ○ → → →              ↘ ●
    ○   ○             ○ → → →            ○ ↗
   
  "Don't crowd"    "Go same way"    "Stay together"
```

### Additional Behaviors

| Behavior | Description | Use Case |
|----------|-------------|----------|
| **Avoidance** | Steer away from obstacles/predators | Obstacles, threats |
| **Seek** | Steer toward a target | Food, goal |
| **Flee** | Steer away from a target | Predator |
| **Wander** | Random steering for natural movement | Idle behavior |
| **Boundary** | Stay within bounds | Keep on screen |
| **Leader Following** | Follow a designated boid | V-formation, leader |

### Data Model

```javascript
// Boid class
class Boid {
  constructor(config) {
    // Position and velocity
    this.x = config.x ?? 0;
    this.y = config.y ?? 0;
    this.vx = config.vx ?? 0;
    this.vy = config.vy ?? 0;
    
    // Appearance
    this.glyph = config.glyph ?? '>';  // Direction-aware
    this.glyphSet = config.glyphSet ?? {
      right: '>',
      left: '<',
      up: '^',
      down: 'v',
      // Diagonals
      upRight: '⌝',
      upLeft: '⌜',
      downRight: '⌟',
      downLeft: '⌞',
    };
    this.fg = config.fg ?? 7;
    this.bg = config.bg ?? -1;
    
    // Movement limits
    this.maxSpeed = config.maxSpeed ?? 4;
    this.maxForce = config.maxForce ?? 0.5;  // Steering limit
    
    // Perception
    this.perceptionRadius = config.perceptionRadius ?? 5;
    this.separationRadius = config.separationRadius ?? 2;
    
    // Flock reference
    this.flockId = config.flockId;
    
    // DOM element
    this.element = null;
  }
  
  // Get neighbors within perception radius
  getNeighbors(allBoids) {
    return allBoids.filter(other => {
      if (other === this) return false;
      const dist = this.distanceTo(other);
      return dist < this.perceptionRadius;
    });
  }
  
  // Calculate steering forces
  separate(neighbors) { /* ... */ }
  align(neighbors) { /* ... */ }
  cohere(neighbors) { /* ... */ }
  
  // Update glyph based on velocity direction
  updateGlyph() {
    const angle = Math.atan2(this.vy, this.vx) * 180 / Math.PI;
    // Map angle to glyph
    if (angle > -22.5 && angle <= 22.5) this.glyph = this.glyphSet.right;
    else if (angle > 22.5 && angle <= 67.5) this.glyph = this.glyphSet.downRight;
    // ... etc
  }
}
```

```javascript
// Flock class - manages a group of boids
class Flock {
  constructor(config) {
    this.id = config.id ?? crypto.randomUUID();
    this.name = config.name ?? 'Flock';
    this.enabled = config.enabled ?? true;
    this.layerId = config.layerId ?? 'fg';
    
    // Spawn settings
    this.spawnArea = config.spawnArea ?? { x: 0, y: 0, width: 80, height: 25 };
    this.count = config.count ?? 20;
    
    // Behavior weights (tune these for different effects)
    this.weights = {
      separation: config.weights?.separation ?? 1.5,
      alignment: config.weights?.alignment ?? 1.0,
      cohesion: config.weights?.cohesion ?? 1.0,
      avoidance: config.weights?.avoidance ?? 2.0,
      boundary: config.weights?.boundary ?? 1.0,
    };
    
    // Boid template
    this.boidTemplate = {
      glyphSet: config.boidTemplate?.glyphSet ?? { /* ... */ },
      fg: config.boidTemplate?.fg ?? 7,
      maxSpeed: config.boidTemplate?.maxSpeed ?? 4,
      perceptionRadius: config.boidTemplate?.perceptionRadius ?? 5,
    };
    
    // Runtime
    this.boids = [];
  }
  
  // Spawn initial boids
  spawn() { /* ... */ }
  
  // Update all boids
  update(deltaMs, forces) { /* ... */ }
}
```

### BoidEngine

```javascript
class BoidEngine {
  constructor(scene, stateManager) {
    this.scene = scene;
    this.stateManager = stateManager;
    this.playing = false;
    this.flocks = [];  // Active flock instances
  }
  
  // Main update loop
  tick(timestamp) {
    const deltaMs = timestamp - this.lastTimestamp;
    const forces = this.scene.forces ?? [];
    
    for (const flock of this.flocks) {
      if (!flock.enabled) continue;
      
      for (const boid of flock.boids) {
        // Get nearby boids (same flock only, or all?)
        const neighbors = boid.getNeighbors(flock.boids);
        
        // Calculate steering forces
        let steerX = 0, steerY = 0;
        
        // Boid rules
        const sep = boid.separate(neighbors);
        const ali = boid.align(neighbors);
        const coh = boid.cohere(neighbors);
        
        steerX += sep.x * flock.weights.separation;
        steerY += sep.y * flock.weights.separation;
        steerX += ali.x * flock.weights.alignment;
        steerY += ali.y * flock.weights.alignment;
        steerX += coh.x * flock.weights.cohesion;
        steerY += coh.y * flock.weights.cohesion;
        
        // Force fields (shared with particles!)
        for (const field of forces) {
          if (!field.enabled || !field.affectsBoids) continue;
          const { fx, fy } = field.getForceAt(boid.x, boid.y);
          steerX += fx;
          steerY += fy;
        }
        
        // Boundary avoidance
        const bound = boid.avoidBoundary(this.scene.w, this.scene.h);
        steerX += bound.x * flock.weights.boundary;
        steerY += bound.y * flock.weights.boundary;
        
        // Apply steering
        boid.applyForce(steerX, steerY, deltaMs);
        boid.updateGlyph();
      }
    }
    
    this.render();
  }
}
```

### Spatial Partitioning (Performance)

For many boids, O(n²) neighbor checks are expensive. Use spatial hashing:

```javascript
class SpatialHash {
  constructor(cellSize = 5) {
    this.cellSize = cellSize;
    this.buckets = new Map();
  }
  
  // Get bucket key for position
  getKey(x, y) {
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    return `${cx},${cy}`;
  }
  
  // Add boid to hash
  insert(boid) {
    const key = this.getKey(boid.x, boid.y);
    if (!this.buckets.has(key)) {
      this.buckets.set(key, []);
    }
    this.buckets.get(key).push(boid);
  }
  
  // Get nearby boids (check adjacent cells)
  getNearby(x, y, radius) {
    const results = [];
    const cellRadius = Math.ceil(radius / this.cellSize);
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    
    for (let dx = -cellRadius; dx <= cellRadius; dx++) {
      for (let dy = -cellRadius; dy <= cellRadius; dy++) {
        const key = `${cx + dx},${cy + dy}`;
        const bucket = this.buckets.get(key);
        if (bucket) results.push(...bucket);
      }
    }
    
    return results;
  }
  
  // Clear and rebuild each frame
  clear() {
    this.buckets.clear();
  }
}
```

### Preset Flocks

```javascript
export const FLOCK_PRESETS = {
  birds: {
    name: 'Birds',
    count: 15,
    boidTemplate: {
      glyphSet: {
        right: '>', left: '<', up: '^', down: 'v',
        upRight: '⌝', upLeft: '⌜', downRight: '⌟', downLeft: '⌞',
      },
      fg: 0,  // Black
      maxSpeed: 5,
      perceptionRadius: 8,
    },
    weights: { separation: 1.5, alignment: 1.2, cohesion: 1.0 },
  },
  
  fish: {
    name: 'Fish',
    count: 25,
    boidTemplate: {
      glyphSet: {
        right: '><>', left: '<><', up: 'A', down: 'V',
        // ... or single char: ᗕ ᗒ etc
      },
      fg: 4,  // Cyan
      maxSpeed: 3,
      perceptionRadius: 6,
    },
    weights: { separation: 2.0, alignment: 1.0, cohesion: 1.5 },
  },
  
  fireflies: {
    name: 'Fireflies',
    count: 30,
    boidTemplate: {
      glyphSet: { right: '*', left: '*', up: '*', down: '*' },
      fg: 3,  // Yellow
      fgCycle: [3, 3, 7, 3],  // Blinking
      maxSpeed: 2,
      perceptionRadius: 4,
    },
    weights: { separation: 1.0, alignment: 0.5, cohesion: 0.8 },
  },
  
  crowd: {
    name: 'Crowd',
    count: 20,
    boidTemplate: {
      glyphSet: { right: '☻', left: '☻', up: '☻', down: '☻' },
      fg: 7,
      maxSpeed: 1.5,
      perceptionRadius: 3,
      separationRadius: 1.5,
    },
    weights: { separation: 3.0, alignment: 0.3, cohesion: 0.5 },
  },
};
```

### File Structure

```
src/boids/
├── Boid.js              # Individual boid with steering behaviors
├── Flock.js             # Manages a group of boids
├── BoidEngine.js        # Main simulation loop
├── SpatialHash.js       # Performance optimization
├── presets.js           # Preset flock configurations
└── index.js             # Barrel export

tests/
├── Boid.test.js
├── Flock.test.js
├── BoidEngine.test.js
└── SpatialHash.test.js
```

### Shared Infrastructure

Both particles and boids use:

```
src/forces/              # Shared force field system
├── ForceField.js
├── Attractor.js
├── WindZone.js
└── ...

src/collision/           # Shared collision detection
├── CellCollision.js     # Check against drawn cells
└── BoundsCheck.js       # Screen boundary handling
```

### Implementation Order

1. **Phase 2.2** - Force fields for particles (shared foundation)
2. **Phase 2.3a** - Core boid classes (Boid, Flock)
3. **Phase 2.3b** - BoidEngine with basic rules
4. **Phase 2.3c** - Integration with force fields
5. **Phase 2.3d** - Spatial partitioning for performance
6. **Phase 2.3e** - Presets and UI

---

## Phase 3: Walking Sprites (Future)

- Multi-cell sprites that move across the scene
- Sprite library (person, car, bird)
- Path following along drawn paths
- Could potentially use boid steering for movement

## Phase 4: Polish (Future)

- Combined presets (rain + wind, fire + smoke + embers)
- Scene templates with pre-configured effects
- Export animations to GIF/video
- Performance profiling and optimization

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
