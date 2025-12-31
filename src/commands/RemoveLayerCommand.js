/**
 * RemoveLayerCommand - Undoable layer removal command
 *
 * Provides undo/redo functionality for removing layers from the scene.
 * Preserves all layer data and position for restoration during undo.
 */

import { Command } from "./Command.js";

export class RemoveLayerCommand extends Command {
  /**
   * Create a remove layer command
   * @param {Scene} scene - The scene to modify
   * @param {string} layerId - The ID of the layer to remove
   */
  constructor(scene, layerId) {
    // Get layer info for description before removal
    const layer = scene ? scene.getLayer(layerId) : null;
    const layerName = layer ? layer.name : "Unknown Layer";

    super(`Remove ${layerName} Layer`);

    this.scene = scene;
    this.layerId = layerId;

    // Will be set during execution for restoration
    this.removedLayer = null;
    this.removedIndex = null;
    this.wasActiveLayer = false;
    this.previousActiveLayerId = null;
    this.newActiveLayerId = null;
  }

  /**
   * Execute the command - remove the layer
   */
  execute() {
    if (this.executed) {
      // Re-execute: remove the layer again (after undo)
      return this.removeAgain();
    }

    try {
      // Validate we can remove this layer
      if (this.scene.layers.length <= 1) {
        return {
          success: false,
          error: "Cannot remove the last layer",
        };
      }

      // Get layer to remove
      const layer = this.scene.getLayer(this.layerId);
      if (!layer) {
        return {
          success: false,
          error: `Layer ${this.layerId} not found`,
        };
      }

      // Store layer data for undo
      this.removedLayer = this.cloneLayer(layer);
      this.removedIndex = this.scene.getLayerIndex(this.layerId);
      this.wasActiveLayer = this.scene.activeLayerId === this.layerId;
      this.previousActiveLayerId = this.scene.activeLayerId;

      // If removing active layer, determine new active layer
      if (this.wasActiveLayer) {
        this.newActiveLayerId = this.determineNewActiveLayer();
      }

      // Remove the layer
      const success = this.scene.removeLayer(this.layerId);
      if (!success) {
        return { success: false, error: "Failed to remove layer" };
      }

      // Set new active layer if needed
      if (this.wasActiveLayer && this.newActiveLayerId) {
        this.scene.setActiveLayer(this.newActiveLayerId);
      }

      this.executed = true;
      return {
        success: true,
        removedLayerName: this.removedLayer.name,
        newActiveLayerId: this.newActiveLayerId,
      };
    } catch (error) {
      console.error("RemoveLayerCommand execution failed:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Undo the command - restore the removed layer
   */
  undo() {
    if (!this.executed || !this.removedLayer) {
      throw new Error(
        "Cannot undo RemoveLayerCommand - not executed or no layer data",
      );
    }

    try {
      // Check if layer already exists (shouldn't happen)
      const existingLayer = this.scene.getLayer(this.layerId);
      if (existingLayer) {
        throw new Error(`Layer ${this.layerId} already exists`);
      }

      // Restore the layer at its original position
      const restoredLayer = this.scene.addLayerFromTemplate(
        this.removedLayer,
        this.removedIndex,
      );

      // Copy the layer data back
      this.restoreLayerData(restoredLayer, this.removedLayer);

      // Restore active layer if this was the active one
      if (this.wasActiveLayer) {
        this.scene.setActiveLayer(this.layerId);
      }

      return {
        success: true,
        restoredLayerName: this.removedLayer.name,
      };
    } catch (error) {
      console.error("RemoveLayerCommand undo failed:", error);
      throw error;
    }
  }

  /**
   * Remove the layer again (for redo after undo)
   */
  removeAgain() {
    try {
      // Check layer exists
      const layer = this.scene.getLayer(this.layerId);
      if (!layer) {
        throw new Error(`Layer ${this.layerId} not found for re-removal`);
      }

      // Remove the layer
      const success = this.scene.removeLayer(this.layerId);
      if (!success) {
        throw new Error("Failed to remove layer during redo");
      }

      // Set new active layer if needed
      if (this.wasActiveLayer && this.newActiveLayerId) {
        const newActiveLayer = this.scene.getLayer(this.newActiveLayerId);
        if (newActiveLayer) {
          this.scene.setActiveLayer(this.newActiveLayerId);
        } else {
          // New active layer no longer exists, pick first available
          if (this.scene.layers.length > 0) {
            this.scene.setActiveLayer(this.scene.layers[0].id);
          }
        }
      }

      return {
        success: true,
        removedLayerName: this.removedLayer.name,
      };
    } catch (error) {
      console.error("RemoveLayerCommand re-execution failed:", error);
      throw error;
    }
  }

  /**
   * Create a deep clone of layer data for restoration
   */
  cloneLayer(layer) {
    return {
      id: layer.id,
      name: layer.name,
      visible: layer.visible,
      locked: layer.locked,
      width: layer.width,
      height: layer.height,
      cells: layer.cells.map((cell) => ({
        ch: cell.ch,
        fg: cell.fg,
        bg: cell.bg,
      })),
    };
  }

  /**
   * Restore layer data from cloned data
   */
  restoreLayerData(targetLayer, sourceData) {
    targetLayer.name = sourceData.name;
    targetLayer.visible = sourceData.visible;
    targetLayer.locked = sourceData.locked;

    // Restore cell data (flat array)
    const minCells = Math.min(
      targetLayer.cells.length,
      sourceData.cells.length,
    );
    for (let i = 0; i < minCells; i++) {
      const targetCell = targetLayer.cells[i];
      const sourceCell = sourceData.cells[i];

      targetCell.ch = sourceCell.ch;
      targetCell.fg = sourceCell.fg;
      targetCell.bg = sourceCell.bg;
    }
  }

  /**
   * Determine which layer should become active after removal
   */
  determineNewActiveLayer() {
    const layers = this.scene.layers;
    const currentIndex = this.removedIndex;

    // If there's a layer below (higher index), use it
    if (currentIndex < layers.length - 1) {
      return layers[currentIndex + 1].id;
    }

    // If there's a layer above (lower index), use it
    if (currentIndex > 0) {
      return layers[currentIndex - 1].id;
    }

    // This should only happen if removing the last layer,
    // which should be prevented by validation
    return layers[0]?.id || null;
  }

  /**
   * Check if this command can be merged with another
   * Remove layer commands don't merge
   */
  canMerge(other) {
    return false;
  }

  /**
   * Get command details for debugging
   */
  getDetails() {
    return {
      type: "RemoveLayer",
      layerId: this.layerId,
      removedLayer: this.removedLayer
        ? {
            name: this.removedLayer.name,
            visible: this.removedLayer.visible,
            locked: this.removedLayer.locked,
          }
        : null,
      removedIndex: this.removedIndex,
      wasActiveLayer: this.wasActiveLayer,
      previousActiveLayerId: this.previousActiveLayerId,
      newActiveLayerId: this.newActiveLayerId,
      executed: this.executed,
    };
  }

  /**
   * Validate that the command can be executed
   */
  validate() {
    if (!this.scene) {
      return { valid: false, error: "No scene provided" };
    }

    if (!this.layerId) {
      return { valid: false, error: "No layer ID provided" };
    }

    if (this.scene.layers.length <= 1) {
      return { valid: false, error: "Cannot remove the last layer" };
    }

    const layer = this.scene.getLayer(this.layerId);
    if (!layer) {
      return { valid: false, error: `Layer ${this.layerId} not found` };
    }

    return { valid: true };
  }

  /**
   * Get a detailed string representation
   */
  toString() {
    const baseString = super.toString();
    if (this.removedLayer) {
      return `${baseString} (${this.removedLayer.name})`;
    }
    return baseString;
  }
}
