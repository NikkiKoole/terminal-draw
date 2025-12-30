/**
 * EraserTool.js - Clear cells to default values
 *
 * The eraser tool allows users to clear cells on the active layer
 * by clicking or dragging. It resets cells to default state (space character,
 * white foreground, transparent background).
 */

import { Tool } from './Tool.js';
import { Cell } from '../core/Cell.js';

export class EraserTool extends Tool {
  /**
   * Create a new eraser tool
   */
  constructor() {
    super('Eraser');
  }

  /**
   * Erase a cell at the given coordinates
   * @private
   */
  _eraseCell(x, y, scene, stateManager) {
    // Get the active layer
    const activeLayer = scene.getActiveLayer();

    if (!activeLayer) {
      return;
    }

    // Check if layer is locked
    if (activeLayer.locked) {
      return;
    }

    // Create a default cell (space, white fg, transparent bg)
    const cell = new Cell(' ', 7, -1);

    // Set the cell in the layer
    activeLayer.setCell(x, y, cell);

    // Emit cell:changed event
    stateManager.emit('cell:changed', {
      x,
      y,
      layerId: activeLayer.id,
      cell: cell.toObject()
    });
  }

  /**
   * Handle cell mouse down event
   */
  onCellDown(x, y, scene, stateManager, eventData = {}) {
    this._eraseCell(x, y, scene, stateManager);
  }

  /**
   * Handle cell drag event
   */
  onCellDrag(x, y, scene, stateManager, eventData = {}) {
    this._eraseCell(x, y, scene, stateManager);
  }

  /**
   * Handle cell mouse up event
   */
  onCellUp(x, y, scene, stateManager, eventData = {}) {
    // Optional: Could emit an "eraser:complete" event here for undo/redo
    // For now, we just let the mouse up happen without additional action
  }

  /**
   * Get the cursor style for this tool
   */
  getCursor() {
    return 'not-allowed';
  }
}
