/**
 * ClipboardManager.js - Handles clipboard export operations
 *
 * Manages copying ASCII art to clipboard in various formats:
 * - Plain text (characters only)
 * - ANSI (with color codes for terminals)
 * - Single layer export
 */

import { exportAsText, exportAsANSI } from "../rendering/Compositor.js";

export class ClipboardManager {
  /**
   * Create a clipboard manager
   * @param {Scene} scene - The scene to export
   * @param {StateManager} stateManager - State manager for events
   */
  constructor(scene, stateManager) {
    this.scene = scene;
    this.stateManager = stateManager;
  }

  /**
   * Export scene as plain text (all visible layers composited)
   * @returns {string} Plain text representation
   */
  exportPlainText() {
    return exportAsText(this.scene);
  }

  /**
   * Export scene as ANSI with color codes (all visible layers composited)
   * @returns {string} ANSI text with color escape codes
   */
  exportAnsi() {
    return exportAsANSI(this.scene);
  }

  /**
   * Export single layer as plain text
   * @param {string} layerId - Layer ID to export ('bg', 'mid', or 'fg')
   * @returns {string} Plain text representation of single layer
   */
  exportLayer(layerId) {
    const layer = this.scene.getLayer(layerId);
    if (!layer) {
      throw new Error(`Layer not found: ${layerId}`);
    }

    const lines = [];
    for (let y = 0; y < layer.height; y++) {
      let line = "";
      for (let x = 0; x < layer.width; x++) {
        const cell = layer.getCell(x, y);
        line += cell ? cell.ch : " ";
      }
      lines.push(line);
    }

    return lines.join("\n");
  }

  /**
   * Copy text to clipboard using Clipboard API
   * @param {string} text - Text to copy
   * @returns {Promise<{success: boolean, error?: string, charCount?: number}>}
   */
  async copyToClipboard(text) {
    try {
      // Check if Clipboard API is available
      if (!navigator.clipboard) {
        throw new Error("Clipboard API not available. Use HTTPS or localhost.");
      }

      await navigator.clipboard.writeText(text);

      const charCount = text.length;
      const lineCount = text.split("\n").length;

      this.stateManager.emit("export:success", {
        format: "text",
        charCount,
        lineCount,
      });

      return {
        success: true,
        charCount,
        lineCount,
      };
    } catch (error) {
      this.stateManager.emit("export:error", {
        error: error.message,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Copy plain text to clipboard
   * @returns {Promise<{success: boolean, error?: string, charCount?: number}>}
   */
  async copyPlainText() {
    const text = this.exportPlainText();
    return await this.copyToClipboard(text);
  }

  /**
   * Copy ANSI text to clipboard
   * @returns {Promise<{success: boolean, error?: string, charCount?: number}>}
   */
  async copyAnsi() {
    const text = this.exportAnsi();
    const result = await this.copyToClipboard(text);

    if (result.success) {
      this.stateManager.emit("export:success", {
        format: "ansi",
        charCount: result.charCount,
        lineCount: result.lineCount,
      });
    }

    return result;
  }

  /**
   * Copy single layer to clipboard
   * @param {string} layerId - Layer ID to export
   * @returns {Promise<{success: boolean, error?: string, charCount?: number}>}
   */
  async copyLayerText(layerId) {
    try {
      const text = this.exportLayer(layerId);
      const result = await this.copyToClipboard(text);

      if (result.success) {
        this.stateManager.emit("export:success", {
          format: "layer",
          layerId,
          charCount: result.charCount,
          lineCount: result.lineCount,
        });
      }

      return result;
    } catch (error) {
      this.stateManager.emit("export:error", {
        error: error.message,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get export statistics without copying
   * @returns {object} Statistics about the current scene
   */
  getExportStats() {
    const text = this.exportPlainText();
    const ansiText = this.exportAnsi();

    return {
      plainTextSize: text.length,
      ansiTextSize: ansiText.length,
      lineCount: text.split("\n").length,
      visibleLayerCount: this.scene.getVisibleLayers().length,
      totalLayerCount: this.scene.layers.length,
      dimensions: {
        width: this.scene.w,
        height: this.scene.h,
      },
    };
  }
}
