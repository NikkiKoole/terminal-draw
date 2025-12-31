/**
 * ResizeCommand - Command for undoable grid resize operations
 *
 * Handles resizing the entire scene (all layers) with content preservation.
 * This is a large command as it stores complete before/after state for all layers,
 * but this is necessary for reliable undo/redo functionality.
 */

import { Command } from "./Command.js";
import { GridResizer } from "../core/GridResizer.js";
import { Cell } from "../core/Cell.js";

export class ResizeCommand extends Command {
  /**
   * @param {Object} options - Command options
   * @param {Scene} options.scene - Scene to resize
   * @param {number} options.newWidth - New width
   * @param {number} options.newHeight - New height
   * @param {string} options.strategy - Resize strategy ('pad', 'crop', 'center')
   * @param {Cell} options.fillCell - Cell to use for padding
   * @param {Object} options.stateManager - StateManager for emitting events
   */
  constructor(options) {
    if (!options.scene) {
      throw new Error("ResizeCommand scene is required");
    }
    if (
      typeof options.newWidth !== "number" ||
      typeof options.newHeight !== "number"
    ) {
      throw new Error("ResizeCommand newWidth and newHeight are required");
    }

    const { scene, newWidth, newHeight, strategy = "pad" } = options;
    const description = `Resize grid from ${scene.w}×${scene.h} to ${newWidth}×${newHeight}`;

    super(description);

    this.scene = scene;
    this.newWidth = newWidth;
    this.newHeight = newHeight;
    this.strategy = strategy;
    this.fillCell = options.fillCell || null;
    this.stateManager = options.stateManager;

    // Store original state for undo
    this.oldWidth = scene.w;
    this.oldHeight = scene.h;
    this.oldLayerData = this._captureLayerState(scene.layers);

    // Will be set after execute()
    this.newLayerData = null;
  }

  /**
   * Execute the resize operation
   */
  execute() {
    try {
      // Validate resize parameters
      const validation = GridResizer.validateResize(
        this.newWidth,
        this.newHeight,
      );
      if (!validation.valid) {
        throw new Error(
          `Resize validation failed: ${validation.errors.join(", ")}`,
        );
      }

      // Store current state before resize
      if (!this.newLayerData) {
        this.oldLayerData = this._captureLayerState(this.scene.layers);
      }

      // Resize all layers
      const resizeResults = GridResizer.resizeLayers(
        this.scene.layers,
        this.newWidth,
        this.newHeight,
        this.strategy,
        this.fillCell,
      );

      // Update scene dimensions
      this.scene.w = this.newWidth;
      this.scene.h = this.newHeight;

      // Store new state for potential redo
      this.newLayerData = this._captureLayerState(this.scene.layers);

      // Emit events
      if (this.stateManager) {
        this.stateManager.emit("scene:resized", {
          oldWidth: this.oldWidth,
          oldHeight: this.oldHeight,
          newWidth: this.newWidth,
          newHeight: this.newHeight,
          strategy: this.strategy,
          resizeResults,
        });

        this.stateManager.emit("scene:changed", {
          type: "resize",
          scene: this.scene,
        });
      }

      this.executed = true;
    } catch (error) {
      throw new Error(`Failed to execute resize: ${error.message}`);
    }
  }

  /**
   * Undo the resize operation
   */
  undo() {
    try {
      if (!this.oldLayerData) {
        throw new Error("No old layer data available for undo");
      }

      // Restore old dimensions
      this.scene.w = this.oldWidth;
      this.scene.h = this.oldHeight;

      // Restore old layer state
      this._restoreLayerState(this.scene.layers, this.oldLayerData);

      // Emit events
      if (this.stateManager) {
        this.stateManager.emit("scene:resized", {
          oldWidth: this.newWidth,
          oldHeight: this.newHeight,
          newWidth: this.oldWidth,
          newHeight: this.oldHeight,
          strategy: "undo",
          isUndo: true,
        });

        this.stateManager.emit("scene:changed", {
          type: "resize_undo",
          scene: this.scene,
        });
      }
    } catch (error) {
      throw new Error(`Failed to undo resize: ${error.message}`);
    }
  }

  /**
   * Check if this resize command can merge with another
   * Resize commands generally shouldn't merge as they're distinct operations
   * @param {Command} other - Other command to check for merging
   * @returns {boolean} - False (resize commands don't merge)
   */
  canMerge(other) {
    // Resize operations are significant enough that they shouldn't merge
    // Each resize should be its own undo step
    return false;
  }

  /**
   * Get memory usage estimate for this command
   * @returns {number} - Estimated memory usage in bytes
   */
  getMemoryUsage() {
    const layerCount = this.scene.layers.length;
    const oldCells = this.oldWidth * this.oldHeight * layerCount;
    const newCells = this.newWidth * this.newHeight * layerCount;
    const cellSize = 32; // Rough estimate per cell

    // Store both old and new state
    return (oldCells + newCells) * cellSize;
  }

  /**
   * Capture the current state of all layers
   * @param {Array<Layer>} layers - Layers to capture
   * @returns {Object} - Captured layer state
   * @private
   */
  _captureLayerState(layers) {
    const layerData = {};

    layers.forEach((layer) => {
      if (layer) {
        layerData[layer.id] = {
          width: layer.width,
          height: layer.height,
          visible: layer.visible,
          locked: layer.locked,
          ligatures: layer.ligatures,
          cells: layer.cells.map((cell) => ({
            ch: cell.ch,
            fg: cell.fg,
            bg: cell.bg,
          })),
        };
      }
    });

    return layerData;
  }

  /**
   * Restore layer state from captured data
   * @param {Array<Layer>} layers - Layers to restore
   * @param {Object} layerData - Previously captured layer data
   * @private
   */
  _restoreLayerState(layers, layerData) {
    layers.forEach((layer) => {
      if (layer && layerData[layer.id]) {
        const data = layerData[layer.id];

        layer.width = data.width;
        layer.height = data.height;
        layer.visible = data.visible;
        layer.locked = data.locked;
        layer.ligatures = data.ligatures;

        // Restore cells
        layer.cells = data.cells.map((cellData) => {
          return new Cell(cellData.ch, cellData.fg, cellData.bg);
        });
      }
    });
  }

  /**
   * Get debug information about this resize command
   * @returns {Object} - Debug information
   */
  getDebugInfo() {
    return {
      description: this.description,
      timestamp: this.timestamp,
      age: this.getAge(),
      oldDimensions: `${this.oldWidth}×${this.oldHeight}`,
      newDimensions: `${this.newWidth}×${this.newHeight}`,
      strategy: this.strategy,
      memoryUsage: this.getMemoryUsage(),
      executed: this.executed,
      hasOldData: !!this.oldLayerData,
      hasNewData: !!this.newLayerData,
      layerCount: this.scene.layers.length,
    };
  }

  /**
   * Create a ResizeCommand for scene resizing
   * @param {Object} options - Options for resize command
   * @param {Scene} options.scene - Scene to resize
   * @param {number} options.newWidth - New width
   * @param {number} options.newHeight - New height
   * @param {string} options.strategy - Resize strategy
   * @param {Cell} options.fillCell - Fill cell for padding
   * @param {Object} options.stateManager - StateManager instance
   * @returns {ResizeCommand}
   */
  static create(options) {
    return new ResizeCommand(options);
  }

  /**
   * Validate resize parameters before creating command
   * @param {Scene} scene - Scene to resize
   * @param {number} newWidth - New width
   * @param {number} newHeight - New height
   * @returns {Object} - {valid: boolean, errors: Array<string>}
   */
  static validateResize(scene, newWidth, newHeight) {
    const errors = [];

    if (!scene) {
      errors.push("Scene is required");
    }

    if (
      typeof newWidth !== "number" ||
      !Number.isInteger(newWidth) ||
      newWidth < 1
    ) {
      errors.push("New width must be a positive integer");
    }

    if (
      typeof newHeight !== "number" ||
      !Number.isInteger(newHeight) ||
      newHeight < 1
    ) {
      errors.push("New height must be a positive integer");
    }

    if (scene && newWidth === scene.w && newHeight === scene.h) {
      errors.push("New dimensions are the same as current dimensions");
    }

    // Use GridResizer validation for additional checks
    if (errors.length === 0) {
      const gridValidation = GridResizer.validateResize(newWidth, newHeight);
      errors.push(...gridValidation.errors);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
