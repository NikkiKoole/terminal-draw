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

import { Layer } from "./Layer.js";
import {
  DEFAULT_WIDTH,
  DEFAULT_HEIGHT,
  DEFAULT_PALETTE_ID,
  DEFAULT_TEMPLATE_ID,
  LEGACY_LAYER_BG,
  LEGACY_LAYER_MID,
  LEGACY_LAYER_FG,
} from "./constants.js";
import {
  getTemplate,
  getDefaultTemplate,
  validateTemplate,
  createLayerTemplate,
} from "./ProjectTemplate.js";
import {
  createLayerFromTemplate,
  validateLayerTemplate,
  layerToTemplate,
  suggestLayerName,
  createSmartLayerTemplate,
} from "./LayerTemplate.js";

export class Scene {
  /**
   * Create a new Scene
   * @param {number} w - Width in cells (default: 80)
   * @param {number} h - Height in cells (default: 25)
   * @param {string} paletteId - Palette ID reference (default: "default")
   * @param {Array} layers - Optional array of layers (for internal use)
   * @param {string} templateId - Template ID used to create this scene
   */
  constructor(
    w = DEFAULT_WIDTH,
    h = DEFAULT_HEIGHT,
    paletteId = DEFAULT_PALETTE_ID,
    layers = null,
    templateId = null,
  ) {
    this.w = w;
    this.h = h;
    this.paletteId = paletteId;
    this.templateId = templateId;
    this.options = {};

    // Initialize layers
    if (layers) {
      this.layers = layers;
      this.activeLayerId =
        this.findDefaultActiveLayer() ||
        (this.layers.length > 0 ? this.layers[0].id : null);
    } else {
      // Legacy constructor - create default 3-layer setup for backward compatibility
      this.layers = [
        new Layer(LEGACY_LAYER_BG, "Background", w, h),
        new Layer(LEGACY_LAYER_MID, "Middle", w, h),
        new Layer(LEGACY_LAYER_FG, "Foreground", w, h),
      ];
      this.activeLayerId = LEGACY_LAYER_MID;
      this.templateId = "advanced"; // This matches the 3-layer setup
    }
  }

  /**
   * Create a Scene from a project template
   * @param {object} template - Project template object
   * @param {number} w - Width override (optional)
   * @param {number} h - Height override (optional)
   * @param {string} paletteId - Palette ID override (optional)
   * @returns {Scene} New Scene instance
   */
  static fromTemplate(
    template,
    w = null,
    h = null,
    paletteId = DEFAULT_PALETTE_ID,
  ) {
    if (!validateTemplate(template)) {
      throw new Error(`Invalid template: ${JSON.stringify(template)}`);
    }

    // Use template defaults if dimensions not specified
    const width = w || template.defaultDimensions.w;
    const height = h || template.defaultDimensions.h;

    // Create layers from template
    const layers = template.layers.map((layerTemplate) =>
      createLayerFromTemplate(layerTemplate, width, height),
    );

    // Create scene
    const scene = new Scene(width, height, paletteId, layers, template.id);

    // Set active layer based on template
    const defaultActiveLayer = template.layers.find(
      (layer) => layer.defaultActive,
    );
    if (defaultActiveLayer) {
      scene.activeLayerId = defaultActiveLayer.id;
    }

    return scene;
  }

  /**
   * Create a Scene from template ID
   * @param {string} templateId - Template ID to use
   * @param {number} w - Width override (optional)
   * @param {number} h - Height override (optional)
   * @param {string} paletteId - Palette ID override (optional)
   * @returns {Scene} New Scene instance
   */
  static fromTemplateId(
    templateId,
    w = null,
    h = null,
    paletteId = DEFAULT_PALETTE_ID,
  ) {
    const template = getTemplate(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }
    return Scene.fromTemplate(template, w, h, paletteId);
  }

  /**
   * Find the default active layer ID from current layers
   * @returns {string|null} Layer ID or null if none found
   */
  findDefaultActiveLayer() {
    if (this.layers.length === 0) return null;

    // For backward compatibility, prefer middle layer if it exists
    const middleLayer = this.layers.find(
      (layer) => layer.id === LEGACY_LAYER_MID,
    );
    if (middleLayer) return middleLayer.id;

    // Otherwise return first layer
    return this.layers[0].id;
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
    const layer = this.layers.find((layer) => layer.id === id);
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

    const index = this.layers.findIndex((layer) => layer.id === id);
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
    return this.layers.filter((layer) => layer.visible);
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
      templateId: this.templateId,
      activeLayerId: this.activeLayerId,
      options: { ...this.options },
      layers: this.layers.map((layer) => layer.toObject()),
    };
  }

  /**
   * Create scene from plain object
   * @param {Object} obj - Plain object with scene data
   * @returns {Scene} New scene instance
   */
  static fromObject(obj) {
    const scene = new Scene(obj.w, obj.h, obj.paletteId);
    scene.templateId = obj.templateId;
    scene.activeLayerId = obj.activeLayerId;
    scene.options = { ...obj.options };

    // Replace default layers with saved layers
    if (obj.layers) {
      scene.layers = obj.layers.map((layerData) => Layer.fromObject(layerData));
    }

    return scene;
  }

  /**
   * Add a layer from template
   * @param {object} layerTemplate - Layer template to add
   * @param {number} insertAt - Position to insert layer (optional, defaults to end)
   * @returns {Layer} The newly added layer
   */
  addLayerFromTemplate(layerTemplate, insertAt = null) {
    if (!validateLayerTemplate(layerTemplate)) {
      throw new Error(
        `Invalid layer template: ${JSON.stringify(layerTemplate)}`,
      );
    }

    // Check for duplicate IDs
    if (this.getLayer(layerTemplate.id)) {
      throw new Error(`Layer with ID '${layerTemplate.id}' already exists`);
    }

    const layer = createLayerFromTemplate(layerTemplate, this.w, this.h);

    if (insertAt !== null && insertAt >= 0 && insertAt <= this.layers.length) {
      this.layers.splice(insertAt, 0, layer);
    } else {
      this.layers.push(layer);
    }

    // Set as active if specified in template
    if (layerTemplate.defaultActive) {
      this.activeLayerId = layer.id;
    }

    return layer;
  }

  /**
   * Add a layer with smart defaults
   * @param {string} purpose - Layer purpose (bg, fg, detail, etc.)
   * @param {string} customName - Custom name override (optional)
   * @param {number} insertAt - Position to insert (optional)
   * @returns {Layer} The newly added layer
   */
  addSmartLayer(purpose = "layer", customName = null, insertAt = null) {
    const layerTemplate = createSmartLayerTemplate(purpose, customName);

    // If no custom name provided, check for conflicts with existing layers
    if (!customName) {
      const suggestedName = suggestLayerName(
        this.layers,
        layerTemplate.name.toLowerCase(),
      );
      if (suggestedName !== layerTemplate.name) {
        layerTemplate.name = suggestedName;
      }
    }

    return this.addLayerFromTemplate(layerTemplate, insertAt);
  }

  /**
   * Reorder layers
   * @param {number} fromIndex - Source index
   * @param {number} toIndex - Target index
   * @returns {boolean} True if reorder was successful
   */
  reorderLayers(fromIndex, toIndex) {
    if (
      fromIndex < 0 ||
      fromIndex >= this.layers.length ||
      toIndex < 0 ||
      toIndex >= this.layers.length ||
      fromIndex === toIndex
    ) {
      return false;
    }

    const [removed] = this.layers.splice(fromIndex, 1);
    this.layers.splice(toIndex, 0, removed);

    return true;
  }

  /**
   * Get layer count
   * @returns {number} Number of layers
   */
  getLayerCount() {
    return this.layers.length;
  }

  /**
   * Get layer index by ID
   * @param {string} id - Layer ID
   * @returns {number} Layer index or -1 if not found
   */
  getLayerIndex(id) {
    return this.layers.findIndex((layer) => layer.id === id);
  }

  /**
   * Convert scene to use a different template
   * @param {object} targetTemplate - Template to convert to
   * @param {object} conversionRules - How to handle conversion
   * @returns {boolean} True if conversion was successful
   */
  convertToTemplate(targetTemplate, conversionRules = {}) {
    if (!validateTemplate(targetTemplate)) {
      throw new Error("Invalid target template");
    }

    // Store current state for potential rollback
    const originalLayers = this.layers.slice();
    const originalActiveLayer = this.activeLayerId;

    try {
      // Apply conversion based on target template
      if (conversionRules.addLayers) {
        for (const layerToAdd of conversionRules.addLayers) {
          this.addLayerFromTemplate(layerToAdd, layerToAdd.insertAt);
        }
      }

      // Update template ID
      this.templateId = targetTemplate.id;

      // Set new active layer if specified
      const newActiveLayer = targetTemplate.layers.find((l) => l.defaultActive);
      if (newActiveLayer && this.getLayer(newActiveLayer.id)) {
        this.activeLayerId = newActiveLayer.id;
      }

      return true;
    } catch (error) {
      // Rollback on error
      this.layers = originalLayers;
      this.activeLayerId = originalActiveLayer;
      throw error;
    }
  }

  /**
   * Get scene template information
   * @returns {object} Template info including ID and current layer structure
   */
  getTemplateInfo() {
    return {
      templateId: this.templateId,
      layerCount: this.layers.length,
      layers: this.layers.map((layer) =>
        layerToTemplate(layer, layer.id === this.activeLayerId),
      ),
    };
  }

  /**
   * Resize all layers in the scene
   * @param {number} newWidth - New width in cells
   * @param {number} newHeight - New height in cells
   * @param {string} strategy - Resize strategy ('pad', 'crop', 'center')
   */
  resizeAllLayers(newWidth, newHeight, strategy = "pad") {
    this.w = newWidth;
    this.h = newHeight;

    this.layers.forEach((layer) => {
      // For now, we'll need to implement layer resize differently
      // since Layer doesn't have a resize method yet
      layer.width = newWidth;
      layer.height = newHeight;
      // TODO: Implement proper layer resizing with cell preservation
    });
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
