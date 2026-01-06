import { Particle } from "./Particle.js";
import { DEFAULT_DENSITY_GLYPHS } from "./constants.js";

/**
 * ParticleEngine - Manages particle simulation and rendering
 *
 * Handles spawning, updating, and rendering particles across multiple layers.
 * Each layer has its own particle overlay for proper depth ordering.
 */
export class ParticleEngine {
  /**
   * Create a new particle engine
   * @param {Scene} scene - The scene containing emitters
   * @param {StateManager} stateManager - Event emitter
   * @param {HTMLElement} gridContainer - The grid container element
   */
  constructor(scene, stateManager, gridContainer) {
    this.scene = scene;
    this.stateManager = stateManager;
    this.gridContainer = gridContainer;

    this.playing = false;
    this.animationFrameId = null;
    this.lastTimestamp = 0;

    // Active particles grouped by layer
    this.particles = new Map(); // layerId -> Particle[]

    // Particle layer DOM elements
    this.particleLayers = new Map(); // layerId -> HTMLElement

    // Cell dimensions (measured from DOM)
    this.cellWidth = 10;
    this.cellHeight = 20;

    this.tick = this.tick.bind(this);
  }

  /**
   * Create particle layer elements for each scene layer
   */
  createParticleLayers() {
    // Clear existing particle layers
    for (const layer of this.particleLayers.values()) {
      layer.remove();
    }
    this.particleLayers.clear();

    // Create a particle layer for each scene layer
    for (let i = 0; i < this.scene.layers.length; i++) {
      const layer = this.scene.layers[i];
      const particleLayer = document.createElement("div");
      particleLayer.className = "particle-layer";
      particleLayer.dataset.layer = layer.id;
      particleLayer.id = `particle-layer-${layer.id}`;

      // Insert after the visual layer with matching ID
      const visualLayer = this.gridContainer.querySelector(
        `.visual-layer[data-layer="${layer.id}"]`,
      );
      if (visualLayer && visualLayer.nextSibling) {
        this.gridContainer.insertBefore(particleLayer, visualLayer.nextSibling);
      } else {
        this.gridContainer.appendChild(particleLayer);
      }

      // Set z-index just above the visual layer (visual layers use 100 + index)
      // Particle layers use 150 + index to be above all visual layers but maintain relative order
      particleLayer.style.zIndex = 150 + i;

      this.particleLayers.set(layer.id, particleLayer);
      this.particles.set(layer.id, []);
    }
  }

  /**
   * Measure cell dimensions from the DOM
   */
  measureCellSize() {
    const cell = document.querySelector(".cell");
    if (cell) {
      const rect = cell.getBoundingClientRect();
      this.cellWidth = rect.width;
      this.cellHeight = rect.height;
    }
  }

  /**
   * Get emitters from scene
   * @returns {ParticleEmitter[]} Array of emitters
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
    this.createParticleLayers();
    this.measureCellSize();
    this.lastTimestamp = performance.now();
    this.animationFrameId = requestAnimationFrame(this.tick);

    this.stateManager.emit("particles:started");
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

    this.stateManager.emit("particles:stopped");
  }

  /**
   * Toggle play/pause
   * @returns {boolean} New playing state
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
   * Check if engine is playing
   * @returns {boolean} True if playing
   */
  isPlaying() {
    return this.playing;
  }

  /**
   * Main animation tick
   * @param {number} timestamp - Current time from requestAnimationFrame
   */
  tick(timestamp) {
    if (!this.playing) return;

    const deltaMs = Math.min(timestamp - this.lastTimestamp, 100); // Cap delta to avoid huge jumps
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
   * @param {number} deltaMs - Time since last update
   */
  spawnParticles(deltaMs) {
    const emitters = this.getEmitters();

    for (const emitter of emitters) {
      if (!emitter.enabled) continue;

      // Get particles for this emitter's layer
      const layerParticles = this.particles.get(emitter.layerId) ?? [];

      // Count active particles for this emitter
      const activeCount = layerParticles.filter(
        (p) => p.emitterId === emitter.id,
      ).length;
      if (activeCount >= emitter.maxParticles) continue;

      // Accumulate time
      emitter._timeSinceSpawn = (emitter._timeSinceSpawn ?? 0) + deltaMs;

      // Calculate spawn interval
      const baseInterval = 1000 / emitter.spawnRate;

      // Spawn particles while we have accumulated enough time
      while (emitter._timeSinceSpawn >= baseInterval) {
        // Apply variance to next interval
        const variance =
          baseInterval * emitter.spawnVariance * (Math.random() - 0.5) * 2;
        emitter._timeSinceSpawn -= baseInterval + variance;

        // Check cap again
        if (activeCount >= emitter.maxParticles) break;

        // Create particle
        const config = emitter.createParticleConfig(this.scene.w, this.scene.h);
        const particle = new Particle(config);

        // Add to layer's particle array
        if (!this.particles.has(emitter.layerId)) {
          this.particles.set(emitter.layerId, []);
        }
        this.particles.get(emitter.layerId).push(particle);
      }
    }
  }

  /**
   * Update all particles
   * @param {number} deltaMs - Time since last update
   */
  updateParticles(deltaMs) {
    for (const particles of this.particles.values()) {
      for (const particle of particles) {
        particle.update(deltaMs);
      }
    }
  }

  /**
   * Remove dead particles
   */
  removeDeadParticles() {
    for (const [layerId, particles] of this.particles) {
      for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i];

        if (particle.shouldDespawn(this.scene.w, this.scene.h)) {
          // Remove DOM element
          if (particle.element && particle.element.parentNode) {
            particle.element.remove();
          }

          // Remove from array
          particles.splice(i, 1);
        }
      }
    }
  }

  /**
   * Render all particles to DOM
   */
  renderParticles() {
    for (const [layerId, particles] of this.particles) {
      const particleLayer = this.particleLayers.get(layerId);
      if (!particleLayer) continue;

      // Check if parent layer is visible
      const layer = this.scene.getLayer(layerId);
      if (layer && !layer.visible) {
        particleLayer.classList.add("hidden");
        continue;
      } else {
        particleLayer.classList.remove("hidden");
      }

      // Separate particles into density-accumulating and regular
      const densityParticles = [];
      const regularParticles = [];

      for (const particle of particles) {
        if (particle.accumulateDensity) {
          densityParticles.push(particle);
        } else {
          regularParticles.push(particle);
        }
      }

      // Render density-accumulating particles (grouped by cell)
      this.renderDensityParticles(densityParticles, particleLayer);

      // Render regular particles (one element per particle)
      this.renderRegularParticles(regularParticles, particleLayer);
    }
  }

  /**
   * Render density-accumulating particles grouped by grid cell
   */
  renderDensityParticles(particles, particleLayer) {
    // Group particles by grid position
    const cellMap = new Map(); // "x,y" -> particle[]

    for (const particle of particles) {
      if (!particle.isVisible(this.scene.w, this.scene.h)) {
        // Hide element if it exists
        if (particle.element) {
          particle.element.style.display = "none";
        }
        continue;
      }

      const gridPos = particle.getGridPosition();
      const key = `${gridPos.x},${gridPos.y}`;

      if (!cellMap.has(key)) {
        cellMap.set(key, []);
      }
      cellMap.get(key).push(particle);
    }

    // Track which density elements we've used this frame
    if (!this.densityElements) {
      this.densityElements = new Map(); // layerId -> Map("x,y" -> element)
    }
    const layerId = particleLayer.dataset.layer;
    if (!this.densityElements.has(layerId)) {
      this.densityElements.set(layerId, new Map());
    }
    const layerDensityElements = this.densityElements.get(layerId);
    const usedKeys = new Set();

    // Render one element per occupied cell
    for (const [key, cellParticles] of cellMap) {
      const count = cellParticles.length;
      const [x, y] = key.split(",").map(Number);

      // Use the first particle's density config (they should all be same emitter)
      const refParticle = cellParticles[0];
      const densityGlyphs = refParticle.densityGlyphs || DEFAULT_DENSITY_GLYPHS;
      const densityColors = refParticle.densityColors;

      // Get glyph based on density (count)
      const glyphIndex = Math.min(count - 1, densityGlyphs.length - 1);
      const glyph = densityGlyphs[glyphIndex];

      // Get color - either from density colors or from particle's current color
      let fg;
      if (densityColors && densityColors.length > 0) {
        const colorIndex = Math.min(count - 1, densityColors.length - 1);
        fg = densityColors[colorIndex];
      } else {
        fg = refParticle.getCurrentFg();
      }
      const bg = refParticle.getCurrentBg();

      // Get or create element for this cell
      let element = layerDensityElements.get(key);
      if (!element) {
        element = document.createElement("span");
        element.className = "particle";
        element.dataset.density = "true";
        particleLayer.appendChild(element);
        layerDensityElements.set(key, element);
      }

      // Update element
      element.textContent = glyph;
      element.className = `particle fg-${fg} bg-${bg}`;
      element.style.left = `${x}ch`;
      element.style.top = `calc(${y} * var(--cell-height))`;
      element.style.display = "";

      usedKeys.add(key);
    }

    // Hide unused density elements
    for (const [key, element] of layerDensityElements) {
      if (!usedKeys.has(key)) {
        element.style.display = "none";
      }
    }
  }

  /**
   * Render regular (non-density) particles
   */
  renderRegularParticles(particles, particleLayer) {
    for (const particle of particles) {
      const gridPos = particle.getGridPosition();

      // Skip if out of bounds
      if (!particle.isVisible(this.scene.w, this.scene.h)) {
        if (particle.element) {
          particle.element.style.display = "none";
        }
        continue;
      }

      // Create element if needed
      if (!particle.element) {
        particle.element = document.createElement("span");
        particle.element.className = "particle";
        particleLayer.appendChild(particle.element);
      }

      // Get current appearance (may be cycling)
      const currentGlyph = particle.getCurrentGlyph();
      const currentFg = particle.getCurrentFg();
      const currentBg = particle.getCurrentBg();

      // Update if position or appearance changed
      if (
        gridPos.x !== particle.lastRenderX ||
        gridPos.y !== particle.lastRenderY ||
        currentGlyph !== particle.lastRenderGlyph ||
        currentFg !== particle.lastRenderFg ||
        currentBg !== particle.lastRenderBg
      ) {
        particle.element.textContent = currentGlyph;
        particle.element.className = `particle fg-${currentFg} bg-${currentBg}`;
        particle.element.style.left = `${gridPos.x}ch`;
        particle.element.style.top = `calc(${gridPos.y} * var(--cell-height))`;
        particle.element.style.display = "";

        particle.lastRenderX = gridPos.x;
        particle.lastRenderY = gridPos.y;
        particle.lastRenderGlyph = currentGlyph;
        particle.lastRenderFg = currentFg;
        particle.lastRenderBg = currentBg;
      }
    }
  }

  /**
   * Clear all particles and their DOM elements
   */
  clearParticles() {
    for (const particles of this.particles.values()) {
      for (const particle of particles) {
        if (particle.element && particle.element.parentNode) {
          particle.element.remove();
        }
      }
    }

    // Reset particle arrays
    for (const layerId of this.particles.keys()) {
      this.particles.set(layerId, []);
    }

    // Clear DOM
    for (const layer of this.particleLayers.values()) {
      layer.innerHTML = "";
    }
  }

  /**
   * Get total particle count across all layers
   * @returns {number} Total number of active particles
   */
  getParticleCount() {
    let count = 0;
    for (const particles of this.particles.values()) {
      count += particles.length;
    }
    return count;
  }

  /**
   * Refresh particle layers (call when layers change)
   */
  refresh() {
    if (this.playing) {
      this.createParticleLayers();
      this.measureCellSize();
    }
  }

  /**
   * Clean up resources
   */
  dispose() {
    this.stop();

    // Remove particle layer elements
    for (const layer of this.particleLayers.values()) {
      layer.remove();
    }
    this.particleLayers.clear();
    this.particles.clear();
  }
}
