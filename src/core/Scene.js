/**
 * Scene - Represents the complete drawing scene with multiple layers
 *
 * A scene contains:
 * - w: Width in cells
 * - h: Height in cells
 * - paletteId: ID reference to a palette in palettes.json
 * - layers: Array of Layer objects
 * - activeLayerId: ID of the currently active layer
 * - options: Additional scene options
 */

import { Layer } from './Layer.js';
import {
  DEFAULT_WIDTH,
  DEFAULT_HEIGHT,
  DEFAULT_PALETTE_ID,
  LAYER_BG,
  LAYER_MID,
  LAYER_FG
} from './constants.js';

export class Scene {
  /**
   * Create a new Scene
   * @param {number} w - Width in cells (default: 80)
   * @param {number} h - Height in cells (default: 25)
   * @param {string} paletteId - Palette ID reference (default: "default")
   */
  constructor(w = DEFAULT_WIDTH, h = DEFAULT_HEIGHT, paletteId = DEFAULT_PALETTE_ID) {
    this.w = w;
    this.h = h;
    this.paletteId = paletteId;
    this.options = {};

    // Initialize with 3 default layers
    this.layers = [
      new Layer(LAYER_BG, 'Background', w, h),
      new Layer(LAYER_MID, 'Middle', w, h),
      new Layer(LAYER_FG, 'Foreground', w, h)
    ];

    // Set middle layer as active by default
    this.activeLayerId = LAYER_MID;
  }

  /**
   * Get the currently active layer
   * @returns {Layer|null} Active layer or null if not found
   */
  getActiveLayer() {
    return this.getLayer(this.activeLayerId);
  }

  /**
   * Get layer by ID
   * @param {string} id - Layer ID to find
   * @returns {Layer|null} Layer with matching ID or null if not found
   */
  getLayer(id) {
    const layer = this.layers.find(layer => layer.id === id);
    return layer || null;
  }

  /**
   * Set the active layer by ID
   * @param {string} id - Layer ID to make active
   * @returns {boolean} True if layer was found and set, false otherwise
   */
  setActiveLayer(id) {
    const layer = this.getLayer(id);
    if (layer) {
      this.activeLayerId = id;
      return true;
    }
    return false;
  }

  /**
   * Convert (x, y) coordinates to array index
   * @param {number} x - X coordinate (0-based)
   * @param {number} y - Y coordinate (0-based)
   * @returns {number} Array index
   */
  getCellIndex(x, y) {
    return y * this.w + x;
  }

  /**
   * Check if coordinates are within scene bounds
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {boolean} True if coordinates are valid
   */
  isValidCoord(x, y) {
    return x >= 0 && x < this.w && y >= 0 && y < this.h;
  }

  /**
   * Add a new layer to the scene
   * @param {Layer} layer - Layer to add
   * @returns {boolean} True if layer was added, false if ID already exists
   */
  addLayer(layer) {
    if (this.getLayer(layer.id)) {
      return false; // Layer with this ID already exists
    }
    this.layers.push(layer);
    return true;
  }

  /**
   * Remove a layer by ID
   * @param {string} id - Layer ID to remove
   * @returns {boolean} True if layer was removed, false if not found or only layer
   */
  removeLayer(id) {
    if (this.layers.length <= 1) {
      return false; // Don't allow removing the last layer
    }

    const index = this.layers.findIndex(layer => layer.id === id);
    if (index === -1) {
      return false; // Layer not found
    }

    this.layers.splice(index, 1);

    // If we removed the active layer, set a new active layer
    if (this.activeLayerId === id) {
      this.activeLayerId = this.layers[0].id;
    }

    return true;
  }

  /**
   * Get all visible layers
   * @returns {Layer[]} Array of visible layers
   */
  getVisibleLayers() {
    return this.layers.filter(layer => layer.visible);
  }

  /**
   * Convert scene to plain object (for JSON serialization)
   * @returns {Object} Plain object representation
   */
  toObject() {
    return {
      w: this.w,
      h: this.h,
      paletteId: this.paletteId,
      activeLayerId: this.activeLayerId,
      options: { ...this.options },
      layers: this.layers.map(layer => layer.toObject())
    };
  }

  /**
   * Create scene from plain object
   * @param {Object} obj - Plain object with scene data
   * @returns {Scene} New scene instance
   */
  static fromObject(obj) {
    const scene = new Scene(obj.w, obj.h, obj.paletteId);
    scene.activeLayerId = obj.activeLayerId;
    scene.options = { ...obj.options };

    // Replace default layers with saved layers
    if (obj.layers) {
      scene.layers = obj.layers.map(layerData => Layer.fromObject(layerData));
    }

    return scene;
  }

  /**
   * Clear all layers in the scene
   */
  clearAll() {
    for (const layer of this.layers) {
      layer.clear();
    }
  }
}
