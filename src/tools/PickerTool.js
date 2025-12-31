/**
 * PickerTool.js - Eyedropper tool to sample cell colors and characters
 *
 * The picker tool allows users to sample a cell's character, foreground color,
 * and background color from the active layer. The sampled data is emitted
 * as an event that can be used to update the brush tool.
 */

import { Tool } from "./Tool.js";

export class PickerTool extends Tool {
  /**
   * Create a new picker tool
   * @param {CommandHistory} commandHistory - Command history (unused for picker)
   */
  constructor(commandHistory = null) {
    super("Picker");
    this.commandHistory = commandHistory; // Not used but kept for consistency
  }

  /**
   * Set command history (not used but kept for consistency)
   * @param {CommandHistory} commandHistory - Command history instance
   */
  setCommandHistory(commandHistory) {
    this.commandHistory = commandHistory;
  }

  /**
   * Pick a cell at the given coordinates
   * @private
   */
  _pickCell(x, y, scene, stateManager) {
    // Get the active layer
    const activeLayer = scene.getActiveLayer();

    if (!activeLayer) {
      return;
    }

    // Get the cell at the coordinates
    const cell = activeLayer.getCell(x, y);

    if (!cell) {
      return;
    }

    // Convert cell to object for event emission
    const cellData = cell.toObject();

    // Emit tool:picked event with the sampled cell data
    stateManager.emit("tool:picked", {
      x,
      y,
      layerId: activeLayer.id,
      cell: cellData,
    });
  }

  /**
   * Handle cell mouse down event
   */
  onCellDown(x, y, scene, stateManager, eventData = {}) {
    this._pickCell(x, y, scene, stateManager);
  }

  /**
   * Handle cell drag event
   */
  onCellDrag(x, y, scene, stateManager, eventData = {}) {
    // Picker can sample on drag as well (continuous sampling)
    this._pickCell(x, y, scene, stateManager);
  }

  /**
   * Handle cell mouse up event
   */
  onCellUp(x, y, scene, stateManager, eventData = {}) {
    // Optional: Could auto-switch back to brush tool here
    // For now, just let the mouse up happen without additional action
  }

  /**
   * Get the cursor style for this tool
   */
  getCursor() {
    return "copy";
  }
}
