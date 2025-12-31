/**
 * AddLayerCommand - Undoable layer addition command
 *
 * Provides undo/redo functionality for adding new layers to the scene.
 * Supports both template-based layer creation and custom layer configuration.
 */

import { Command } from "./Command.js";

export class AddLayerCommand extends Command {
  /**
   * Create an add layer command
   * @param {Scene} scene - The scene to modify
   * @param {string} purpose - The layer purpose/template type
   * @param {string} customName - Optional custom name for the layer
   * @param {number} insertAt - Optional position to insert layer (defaults to top)
   */
  constructor(scene, purpose, customName = null, insertAt = null) {
    const layerName =
      customName ||
      (purpose
        ? purpose.charAt(0).toUpperCase() + purpose.slice(1)
        : "Unknown");
    super(`Add ${layerName} Layer`);

    this.scene = scene;
    this.purpose = purpose;
    this.customName = customName;
    this.insertAt = insertAt;

    // Will be set after execution
    this.addedLayerId = null;
    this.addedLayerName = null;
    this.actualInsertIndex = null;
    this.previousActiveLayerId = null;
  }

  /**
   * Execute the command - add the layer
   */
  execute() {
    if (this.executed) {
      // Re-execute: restore the previously added layer
      return this.restore();
    }

    try {
      // Store current state
      this.previousActiveLayerId = this.scene.activeLayerId;

      // Add the layer using scene's smart layer creation
      const newLayer = this.scene.addSmartLayer(
        this.purpose,
        this.customName,
        this.insertAt,
      );

      // Store information for undo
      this.addedLayerId = newLayer.id;
      this.addedLayerName = newLayer.name;
      this.actualInsertIndex = this.scene.getLayerIndex(newLayer.id);

      // Set new layer as active
      this.scene.setActiveLayer(this.addedLayerId);

      this.executed = true;
      return { success: true, layerId: this.addedLayerId };
    } catch (error) {
      console.error("AddLayerCommand execution failed:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Undo the command - remove the added layer
   */
  undo() {
    if (!this.executed || !this.addedLayerId) {
      throw new Error(
        "Cannot undo AddLayerCommand - not executed or layer ID missing",
      );
    }

    try {
      // Check if layer still exists
      const layer = this.scene.getLayer(this.addedLayerId);
      if (!layer) {
        throw new Error(`Layer ${this.addedLayerId} no longer exists`);
      }

      // Remove the layer
      const success = this.scene.removeLayer(this.addedLayerId);
      if (!success) {
        throw new Error("Failed to remove layer during undo");
      }

      // Restore previous active layer if it still exists
      if (this.previousActiveLayerId) {
        const previousLayer = this.scene.getLayer(this.previousActiveLayerId);
        if (previousLayer) {
          this.scene.setActiveLayer(this.previousActiveLayerId);
        } else {
          // Previous layer was removed, activate first available layer
          if (this.scene.layers.length > 0) {
            this.scene.setActiveLayer(this.scene.layers[0].id);
          }
        }
      }

      return { success: true };
    } catch (error) {
      console.error("AddLayerCommand undo failed:", error);
      throw error;
    }
  }

  /**
   * Restore the layer after undo (for redo)
   */
  restore() {
    if (!this.addedLayerId) {
      throw new Error(
        "Cannot restore AddLayerCommand - no layer information stored",
      );
    }

    try {
      // Check if layer already exists (shouldn't happen)
      const existingLayer = this.scene.getLayer(this.addedLayerId);
      if (existingLayer) {
        // Layer already exists, just set it as active
        this.scene.setActiveLayer(this.addedLayerId);
        return { success: true, layerId: this.addedLayerId };
      }

      // Re-create the layer with the same configuration
      const newLayer = this.scene.addSmartLayer(
        this.purpose,
        this.customName,
        this.actualInsertIndex,
      );

      // Update stored information in case layer ID changed
      this.addedLayerId = newLayer.id;
      this.addedLayerName = newLayer.name;

      // Set as active
      this.scene.setActiveLayer(this.addedLayerId);

      return { success: true, layerId: this.addedLayerId };
    } catch (error) {
      console.error("AddLayerCommand restore failed:", error);
      throw error;
    }
  }

  /**
   * Check if this command can be merged with another
   * Add layer commands don't merge
   */
  canMerge(other) {
    return false;
  }

  /**
   * Get command details for debugging
   */
  getDetails() {
    return {
      type: "AddLayer",
      purpose: this.purpose,
      customName: this.customName,
      insertAt: this.insertAt,
      addedLayerId: this.addedLayerId,
      addedLayerName: this.addedLayerName,
      actualInsertIndex: this.actualInsertIndex,
      previousActiveLayerId: this.previousActiveLayerId,
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

    if (!this.purpose || typeof this.purpose !== "string") {
      return { valid: false, error: "Invalid layer purpose" };
    }

    return { valid: true };
  }

  /**
   * Get a detailed string representation
   */
  toString() {
    const baseString = super.toString();
    if (this.addedLayerName) {
      return `${baseString} (${this.addedLayerName})`;
    }
    return baseString;
  }
}
