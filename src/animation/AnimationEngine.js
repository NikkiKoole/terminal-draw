import { CellAnimator } from "./CellAnimator.js";

/**
 * AnimationEngine - Manages animation playback for the scene
 *
 * Handles:
 * - Animation loop via requestAnimationFrame
 * - Tracking animated cells across all layers
 * - Emitting cell:changed events for dirty updates
 * - Play/pause/stop controls
 */
export class AnimationEngine {
  /**
   * Create a new AnimationEngine
   * @param {Scene} scene - The scene containing layers with animated cells
   * @param {StateManager} stateManager - Event emitter for cell updates
   * @param {Function} updateCellCallback - Callback to update a cell in the DOM
   */
  constructor(scene, stateManager, updateCellCallback) {
    this.scene = scene;
    this.stateManager = stateManager;
    this.updateCellCallback = updateCellCallback;

    this.playing = false;
    this.animationFrameId = null;
    this.lastTimestamp = 0;

    // Cache of animated cells: Map<layerId, Array<{x, y, cell}>>
    this.animatedCells = new Map();

    // Cache of last rendered state for each animated cell
    // Key: "layerId:x:y", Value: {ch, fg, bg}
    this.lastRenderedState = new Map();

    // Bind tick to preserve context
    this.tick = this.tick.bind(this);
  }

  /**
   * Scan all layers for animated cells and cache their positions
   * Note: We only cache positions, not cell references, since cells may be replaced
   */
  scanForAnimatedCells() {
    this.animatedCells.clear();

    for (const layer of this.scene.layers) {
      const animated = [];
      for (let y = 0; y < layer.height; y++) {
        for (let x = 0; x < layer.width; x++) {
          const cell = layer.getCell(x, y);
          if (cell && cell.anim) {
            // Only cache position, we'll read the cell fresh each frame
            animated.push({ x, y });
          }
        }
      }
      if (animated.length > 0) {
        this.animatedCells.set(layer.id, animated);
      }
    }
  }

  /**
   * Start the animation loop
   */
  start() {
    if (this.playing) return;

    this.playing = true;
    this.scanForAnimatedCells();
    this.lastTimestamp = performance.now();
    this.animationFrameId = requestAnimationFrame(this.tick);

    this.stateManager.emit("animation:started");
  }

  /**
   * Stop the animation loop
   */
  stop() {
    if (!this.playing) return;

    this.playing = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Restore original cell appearance
    this.restoreOriginalCells();

    this.stateManager.emit("animation:stopped");
  }

  /**
   * Toggle play/pause state
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
   * Check if animation is currently playing
   * @returns {boolean} True if playing
   */
  isPlaying() {
    return this.playing;
  }

  /**
   * Animation frame tick - called via requestAnimationFrame
   * @param {number} timestamp - Current time from requestAnimationFrame
   */
  tick(timestamp) {
    if (!this.playing) return;

    // Update animated cells
    this.updateAnimatedCells(timestamp);

    // Schedule next frame
    this.animationFrameId = requestAnimationFrame(this.tick);
  }

  /**
   * Update all animated cells based on current timestamp
   * @param {number} timestamp - Current time in ms
   */
  updateAnimatedCells(timestamp) {
    for (const [layerId, positions] of this.animatedCells) {
      const layer = this.scene.layers.find((l) => l.id === layerId);
      if (!layer || !layer.visible) continue;

      for (const { x, y } of positions) {
        // Read cell fresh from layer (cells may have been replaced)
        const cell = layer.getCell(x, y);
        if (!cell || !cell.anim) continue;

        // Get current animation frame
        const frame = CellAnimator.getFrame(cell, timestamp);

        // Check if state changed from last render
        const key = `${layerId}:${x}:${y}`;
        const lastState = this.lastRenderedState.get(key);

        if (
          !lastState ||
          lastState.ch !== frame.ch ||
          lastState.fg !== frame.fg ||
          lastState.bg !== frame.bg
        ) {
          // State changed, update the DOM
          this.lastRenderedState.set(key, {
            ch: frame.ch,
            fg: frame.fg,
            bg: frame.bg,
          });

          // Call the update callback to render the change
          if (this.updateCellCallback) {
            this.updateCellCallback(layer, x, y, frame);
          }

          // Emit event for any listeners
          this.stateManager.emit("animation:frame", {
            layerId,
            x,
            y,
            frame,
          });
        }
      }
    }
  }

  /**
   * Restore all animated cells to their original appearance
   */
  restoreOriginalCells() {
    for (const [layerId, positions] of this.animatedCells) {
      const layer = this.scene.layers.find((l) => l.id === layerId);
      if (!layer) continue;

      for (const { x, y } of positions) {
        // Read cell fresh from layer
        const cell = layer.getCell(x, y);
        if (!cell) continue;

        // Restore original cell state
        if (this.updateCellCallback) {
          this.updateCellCallback(layer, x, y, {
            ch: cell.ch,
            fg: cell.fg,
            bg: cell.bg,
          });
        }
      }
    }

    this.lastRenderedState.clear();
  }

  /**
   * Refresh the animated cells cache (call when cells change)
   */
  refresh() {
    this.scanForAnimatedCells();
  }

  /**
   * Get count of animated cells
   * @returns {number} Total number of animated cells
   */
  getAnimatedCellCount() {
    let count = 0;
    for (const cells of this.animatedCells.values()) {
      count += cells.length;
    }
    return count;
  }

  /**
   * Clean up resources
   */
  dispose() {
    this.stop();
    this.animatedCells.clear();
    this.lastRenderedState.clear();
  }
}
