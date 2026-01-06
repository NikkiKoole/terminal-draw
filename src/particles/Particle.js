/**
 * Particle - A single particle instance
 *
 * Runtime-only, not serialized. Created by emitters, managed by engine.
 */
export class Particle {
  /**
   * Create a new particle
   * @param {Object} config - Particle configuration
   */
  constructor(config) {
    // Position (float for smooth movement)
    this.x = config.x ?? 0;
    this.y = config.y ?? 0;

    // Velocity (cells per second)
    this.vx = config.vx ?? 0;
    this.vy = config.vy ?? 0;

    // Gravity (cells per second squared, positive = down)
    this.gravity = config.gravity ?? 0;

    // Appearance (base values)
    this.glyph = config.glyph ?? "*";
    this.fg = config.fg ?? 7;
    this.bg = config.bg ?? -1;

    // Cycling arrays (for animated appearance over lifetime)
    this.glyphCycle = config.glyphCycle ?? null; // Array of glyphs to cycle through
    this.fgCycle = config.fgCycle ?? null; // Array of fg colors to cycle through
    this.bgCycle = config.bgCycle ?? null; // Array of bg colors to cycle through
    this.cycleDuration = config.cycleDuration ?? 500; // ms per cycle iteration

    // Density accumulation
    this.accumulateDensity = config.accumulateDensity ?? false;
    this.densityGlyphs = config.densityGlyphs ?? null;
    this.densityColors = config.densityColors ?? null;

    // Lifecycle
    this.age = 0; // ms since spawn
    this.lifespan = config.lifespan ?? null; // null = infinite (despawn at edge)

    // Layer association
    this.layerId = config.layerId;

    // Reference back to emitter (for behavior lookups)
    this.emitterId = config.emitterId;

    // DOM element (created by renderer)
    this.element = null;

    // Last rendered position (for dirty tracking)
    this.lastRenderX = null;
    this.lastRenderY = null;
    this.lastRenderGlyph = null;
    this.lastRenderFg = null;
    this.lastRenderBg = null;
  }

  /**
   * Update particle state
   * @param {number} deltaMs - Time since last update in ms
   */
  update(deltaMs) {
    const deltaSec = deltaMs / 1000;

    // Apply gravity to velocity
    if (this.gravity !== 0) {
      this.vy += this.gravity * deltaSec;
    }

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

    // Bounds check (with small margin for particles entering from edges)
    const margin = 2;
    if (
      this.x < -margin ||
      this.x >= sceneWidth + margin ||
      this.y < -margin ||
      this.y >= sceneHeight + margin
    ) {
      return true;
    }

    return false;
  }

  /**
   * Get grid position for rendering (snapped to grid)
   * @returns {{x: number, y: number}} Integer grid position
   */
  getGridPosition() {
    return {
      x: Math.floor(this.x),
      y: Math.floor(this.y),
    };
  }

  /**
   * Get cycled value based on age
   * @param {*} baseValue - Default value if no cycle
   * @param {Array} cycleArray - Array to cycle through
   * @returns {*} Current value from cycle or base
   */
  getCycledValue(baseValue, cycleArray) {
    if (!cycleArray || cycleArray.length === 0) {
      return baseValue;
    }
    const cycleIndex =
      Math.floor(this.age / this.cycleDuration) % cycleArray.length;
    return cycleArray[cycleIndex];
  }

  /**
   * Get current glyph (considering cycling)
   * @returns {string} Current glyph character
   */
  getCurrentGlyph() {
    return this.getCycledValue(this.glyph, this.glyphCycle);
  }

  /**
   * Get current foreground color (considering cycling)
   * @returns {number} Current fg color index
   */
  getCurrentFg() {
    return this.getCycledValue(this.fg, this.fgCycle);
  }

  /**
   * Get current background color (considering cycling)
   * @returns {number} Current bg color index
   */
  getCurrentBg() {
    return this.getCycledValue(this.bg, this.bgCycle);
  }

  /**
   * Check if particle is within visible bounds
   * @param {number} sceneWidth - Scene width in cells
   * @param {number} sceneHeight - Scene height in cells
   * @returns {boolean} True if particle is visible
   */
  isVisible(sceneWidth, sceneHeight) {
    const pos = this.getGridPosition();
    return (
      pos.x >= 0 && pos.x < sceneWidth && pos.y >= 0 && pos.y < sceneHeight
    );
  }
}
