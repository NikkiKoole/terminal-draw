/**
 * BrushTool.js - Paint cells with current character and colors
 *
 * The brush tool allows users to paint cells on the active layer
 * by clicking or dragging. It respects layer lock state and emits
 * events for state changes.
 */

import { Tool } from './Tool.js';
import { Cell } from '../core/Cell.js';

export class BrushTool extends Tool {
  /**
   * Create a new brush tool
   * @param {object} currentCell - Initial cell to paint with {ch, fg, bg}
   */
  constructor(currentCell = { ch: '█', fg: 7, bg: -1 }) {
    super('Brush');
    this.currentCell = { ...currentCell };
  }

  /**
   * Set the current cell to paint with
   * @param {object} cell - Cell data {ch, fg, bg}
   */
  setCurrentCell(cell) {
    this.currentCell = { ...cell };
  }

  /**
   * Get the current cell being painted
   * @returns {object} Current cell {ch, fg, bg}
   */
  getCurrentCell() {
    return { ...this.currentCell };
  }

  /**
   * Paint a cell at the given coordinates
   * @private
   */
  _paintCell(x, y, scene, stateManager) {
    // Get the active layer
    const activeLayer = scene.getActiveLayer();

    if (!activeLayer) {
      return;
    }

    // Check if layer is locked
    if (activeLayer.locked) {
      return;
    }

    // Check if layer is visible (optional - can paint on invisible layers)
    // This is a design choice - we'll allow painting on invisible layers

    // Create a new cell with current brush settings
    const cell = new Cell(
      this.currentCell.ch,
      this.currentCell.fg,
      this.currentCell.bg
    );

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
    this._paintCell(x, y, scene, stateManager);
  }

  /**
   * Handle cell drag event
   */
  onCellDrag(x, y, scene, stateManager, eventData = {}) {
    this._paintCell(x, y, scene, stateManager);
  }

  /**
   * Handle cell mouse up event
   */
  onCellUp(x, y, scene, stateManager, eventData = {}) {
    // Optional: Could emit a "brush:complete" event here for undo/redo
    // For now, we just let the mouse up happen without additional action
  }

  /**
   * Get the cursor style for this tool
   */
  getCursor() {
    return 'crosshair';
  }
}
