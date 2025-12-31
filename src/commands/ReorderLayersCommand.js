/**
 * ReorderLayersCommand - Undoable layer reordering command
 *
 * Provides undo/redo functionality for reordering layers in the scene.
 * Supports both single layer moves and batch reordering operations.
 */

import { Command } from "./Command.js";

export class ReorderLayersCommand extends Command {
  /**
   * Create a reorder layers command
   * @param {Scene} scene - The scene to modify
   * @param {string} layerId - The ID of the layer to move
   * @param {number} fromIndex - Current position of the layer
   * @param {number} toIndex - Target position for the layer
   */
  constructor(scene, layerId, fromIndex, toIndex) {
    const layer = scene ? scene.getLayer(layerId) : null;
    const layerName = layer ? layer.name : "Unknown Layer";
    const direction = toIndex > fromIndex ? "up" : "down";

    super(`Move ${layerName} Layer ${direction}`);

    this.scene = scene;
    this.layerId = layerId;
    this.fromIndex = fromIndex;
    this.toIndex = toIndex;

    // Validate indices
    this.validateIndices();
  }

  /**
   * Execute the command - reorder the layer
   */
  execute() {
    if (this.executed) {
      // Re-execute: move layer to target position again
      return this.reorderAgain();
    }

    try {
      // Validate layer still exists
      const layer = this.scene.getLayer(this.layerId);
      if (!layer) {
        return {
          success: false,
          error: `Layer ${this.layerId} not found`,
        };
      }

      // Validate current position
      const currentIndex = this.scene.getLayerIndex(this.layerId);
      if (currentIndex !== this.fromIndex) {
        // Update fromIndex to current position (layer may have moved)
        this.fromIndex = currentIndex;
      }

      // Perform the reorder
      const success = this.scene.reorderLayers(this.fromIndex, this.toIndex);
      if (!success) {
        return { success: false, error: "Failed to reorder layers" };
      }

      this.executed = true;
      return {
        success: true,
        layerId: this.layerId,
        fromIndex: this.fromIndex,
        toIndex: this.toIndex,
      };
    } catch (error) {
      console.error("ReorderLayersCommand execution failed:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Undo the command - restore original layer order
   */
  undo() {
    if (!this.executed) {
      throw new Error("Cannot undo ReorderLayersCommand - not executed");
    }

    try {
      // Validate layer still exists
      const layer = this.scene.getLayer(this.layerId);
      if (!layer) {
        throw new Error(`Layer ${this.layerId} not found for undo`);
      }

      // Get current position of the layer
      const currentIndex = this.scene.getLayerIndex(this.layerId);

      // Move layer back to original position
      const success = this.scene.reorderLayers(currentIndex, this.fromIndex);
      if (!success) {
        throw new Error("Failed to restore layer order during undo");
      }

      return {
        success: true,
        layerId: this.layerId,
        restoredToIndex: this.fromIndex,
      };
    } catch (error) {
      console.error("ReorderLayersCommand undo failed:", error);
      throw error;
    }
  }

  /**
   * Reorder again (for redo after undo)
   */
  reorderAgain() {
    try {
      // Validate layer still exists
      const layer = this.scene.getLayer(this.layerId);
      if (!layer) {
        throw new Error(`Layer ${this.layerId} not found for redo`);
      }

      // Get current position (should be fromIndex after undo)
      const currentIndex = this.scene.getLayerIndex(this.layerId);

      // Move layer to target position
      const success = this.scene.reorderLayers(currentIndex, this.toIndex);
      if (!success) {
        throw new Error("Failed to reorder layers during redo");
      }

      return {
        success: true,
        layerId: this.layerId,
        fromIndex: currentIndex,
        toIndex: this.toIndex,
      };
    } catch (error) {
      console.error("ReorderLayersCommand re-execution failed:", error);
      throw error;
    }
  }

  /**
   * Validate indices are within bounds
   */
  validateIndices() {
    if (!this.scene || !this.scene.layers) {
      throw new Error("Invalid scene or scene has no layers");
    }

    const layerCount = this.scene.layers.length;

    if (this.fromIndex < 0 || this.fromIndex >= layerCount) {
      throw new Error(
        `Invalid fromIndex: ${this.fromIndex} (layer count: ${layerCount})`,
      );
    }

    if (this.toIndex < 0 || this.toIndex >= layerCount) {
      throw new Error(
        `Invalid toIndex: ${this.toIndex} (layer count: ${layerCount})`,
      );
    }

    if (this.fromIndex === this.toIndex) {
      throw new Error("Cannot reorder layer to the same position");
    }
  }

  /**
   * Check if this command can be merged with another
   * Reorder commands can merge if they operate on the same layer
   * and happen within a short time window
   */
  canMerge(other) {
    if (!(other instanceof ReorderLayersCommand)) {
      return false;
    }

    // Must be the same layer
    if (this.layerId !== other.layerId) {
      return false;
    }

    // Must be within 2 seconds of each other
    const timeDiff = Math.abs(this.timestamp - other.timestamp);
    if (timeDiff > 2000) {
      return false;
    }

    // The end position of this command should be the start position of the other
    return this.toIndex === other.fromIndex;
  }

  /**
   * Merge this command with another reorder command
   */
  merge(other) {
    if (!this.canMerge(other)) {
      throw new Error(
        "Cannot merge ReorderLayersCommand - commands are not compatible",
      );
    }

    // Update the target position to the other command's target
    this.toIndex = other.toIndex;

    // Update description to reflect the full movement
    const layer = this.scene.getLayer(this.layerId);
    const layerName = layer ? layer.name : "Unknown Layer";
    const direction = this.toIndex > this.fromIndex ? "up" : "down";
    const distance = Math.abs(this.toIndex - this.fromIndex);

    this.description = `Move ${layerName} Layer ${direction} (${distance} positions)`;

    // Update timestamp to the more recent command
    this.timestamp = Math.max(this.timestamp, other.timestamp);
  }

  /**
   * Get command details for debugging
   */
  getDetails() {
    const layer = this.scene.getLayer(this.layerId);
    return {
      type: "ReorderLayers",
      layerId: this.layerId,
      layerName: layer ? layer.name : "Unknown",
      fromIndex: this.fromIndex,
      toIndex: this.toIndex,
      direction: this.toIndex > this.fromIndex ? "up" : "down",
      distance: Math.abs(this.toIndex - this.fromIndex),
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

    const layer = this.scene.getLayer(this.layerId);
    if (!layer) {
      return { valid: false, error: `Layer ${this.layerId} not found` };
    }

    try {
      this.validateIndices();
      return { valid: true };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Create a command for moving a layer up by one position
   */
  static moveUp(scene, layerId) {
    const currentIndex = scene.getLayerIndex(layerId);
    if (currentIndex === -1) {
      throw new Error(`Layer ${layerId} not found`);
    }

    const targetIndex = Math.min(currentIndex + 1, scene.layers.length - 1);
    if (targetIndex === currentIndex) {
      // Already at top, return null or throw error
      return null;
    }
    return new ReorderLayersCommand(scene, layerId, currentIndex, targetIndex);
  }

  /**
   * Create a command for moving a layer down by one position
   */
  static moveDown(scene, layerId) {
    const currentIndex = scene.getLayerIndex(layerId);
    if (currentIndex === -1) {
      throw new Error(`Layer ${layerId} not found`);
    }

    const targetIndex = Math.max(currentIndex - 1, 0);
    if (targetIndex === currentIndex) {
      // Already at bottom, return null or throw error
      return null;
    }
    return new ReorderLayersCommand(scene, layerId, currentIndex, targetIndex);
  }

  /**
   * Create a command for moving a layer to the top
   */
  static moveToTop(scene, layerId) {
    const currentIndex = scene.getLayerIndex(layerId);
    if (currentIndex === -1) {
      throw new Error(`Layer ${layerId} not found`);
    }

    const targetIndex = scene.layers.length - 1;
    return new ReorderLayersCommand(scene, layerId, currentIndex, targetIndex);
  }

  /**
   * Create a command for moving a layer to the bottom
   */
  static moveToBottom(scene, layerId) {
    const currentIndex = scene.getLayerIndex(layerId);
    if (currentIndex === -1) {
      throw new Error(`Layer ${layerId} not found`);
    }

    const targetIndex = 0;
    return new ReorderLayersCommand(scene, layerId, currentIndex, targetIndex);
  }

  /**
   * Get a detailed string representation
   */
  toString() {
    const baseString = super.toString();
    const layer = this.scene.getLayer(this.layerId);
    const layerName = layer ? layer.name : "Unknown Layer";
    return `${baseString} (${layerName}: ${this.fromIndex} → ${this.toIndex})`;
  }
}
