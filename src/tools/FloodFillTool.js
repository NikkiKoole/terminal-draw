/**
 * FloodFillTool.js - Fill connected areas with respect to paint mode
 *
 * The flood fill tool fills connected areas based on the current paint mode:
 * - "all" mode: Fills cells matching all attributes (ch, fg, bg)
 * - "fg" mode: Fills cells matching foreground color only
 * - "bg" mode: Fills cells matching background color only
 * - "glyph" mode: Fills cells matching character only
 *
 * Uses breadth-first search to avoid stack overflow on large fills.
 */

import { Tool } from "./Tool.js";
import { Cell } from "../core/Cell.js";
import { CellCommand } from "../commands/CellCommand.js";

export class FloodFillTool extends Tool {
  /**
   * Create a new flood fill tool
   * @param {object} currentCell - Current cell settings {ch, fg, bg}
   * @param {CommandHistory} commandHistory - Command history for undo/redo
   */
  constructor(currentCell = { ch: "█", fg: 7, bg: -1 }, commandHistory = null) {
    super("FloodFill");
    this.currentCell = { ...currentCell };
    this.commandHistory = commandHistory;
    this.paintMode = "all"; // "all", "fg", "bg", "glyph"
  }

  /**
   * Set the current cell settings
   * @param {object} cell - Cell data {ch, fg, bg}
   */
  setCurrentCell(cell) {
    this.currentCell = { ...cell };
  }

  /**
   * Get the current cell settings
   * @returns {object} Current cell {ch, fg, bg}
   */
  getCurrentCell() {
    return { ...this.currentCell };
  }

  /**
   * Set command history for undo/redo operations
   * @param {CommandHistory} commandHistory - Command history instance
   */
  setCommandHistory(commandHistory) {
    this.commandHistory = commandHistory;
  }

  /**
   * Set paint mode
   * @param {string} mode - Paint mode: "all", "fg", "bg", or "glyph"
   */
  setPaintMode(mode) {
    const validModes = ["all", "fg", "bg", "glyph"];
    if (validModes.includes(mode)) {
      this.paintMode = mode;
    }
  }

  /**
   * Get current paint mode
   * @returns {string} Current paint mode
   */
  getPaintMode() {
    return this.paintMode;
  }

  /**
   * Check if two cells match based on current paint mode
   * @param {Cell} cell1 - First cell
   * @param {Cell} cell2 - Second cell
   * @returns {boolean} True if cells match according to paint mode
   * @private
   */
  _cellsMatch(cell1, cell2) {
    if (!cell1 || !cell2) {
      return false;
    }

    switch (this.paintMode) {
      case "fg":
        return cell1.fg === cell2.fg;
      case "bg":
        return cell1.bg === cell2.bg;
      case "glyph":
        return cell1.ch === cell2.ch;
      default: // "all"
        return (
          cell1.ch === cell2.ch &&
          cell1.fg === cell2.fg &&
          cell1.bg === cell2.bg
        );
    }
  }

  /**
   * Create new cell based on paint mode
   * @param {Cell} originalCell - Original cell at this position
   * @returns {Cell} New cell with appropriate attributes changed
   * @private
   */
  _createFilledCell(originalCell) {
    switch (this.paintMode) {
      case "fg":
        // Change only foreground color
        return new Cell(originalCell.ch, this.currentCell.fg, originalCell.bg);
      case "bg":
        // Change only background color
        return new Cell(originalCell.ch, originalCell.fg, this.currentCell.bg);
      case "glyph":
        // Change only character
        return new Cell(this.currentCell.ch, originalCell.fg, originalCell.bg);
      default: // "all"
        // Change everything
        return new Cell(
          this.currentCell.ch,
          this.currentCell.fg,
          this.currentCell.bg,
        );
    }
  }

  /**
   * Perform flood fill using breadth-first search
   * @param {number} startX - Starting X coordinate
   * @param {number} startY - Starting Y coordinate
   * @param {Scene} scene - Scene instance
   * @param {StateManager} stateManager - State manager for events
   * @private
   */
  _floodFill(startX, startY, scene, stateManager) {
    const activeLayer = scene.getActiveLayer();

    if (!activeLayer || !this.commandHistory) {
      return;
    }

    // Check if layer is locked or invisible
    if (activeLayer.locked || !activeLayer.visible) {
      return;
    }

    // Get the starting cell
    const startCell = activeLayer.getCell(startX, startY);
    if (!startCell) {
      return;
    }

    // Check if we would actually change anything
    const testFilledCell = this._createFilledCell(startCell);
    if (this._cellsMatch(startCell, testFilledCell)) {
      // No change would occur, don't fill
      return;
    }

    // Breadth-first search to find all connected cells
    const queue = [{ x: startX, y: startY }];
    const visited = new Set();
    const toFill = [];

    visited.add(`${startX},${startY}`);

    while (queue.length > 0) {
      const { x, y } = queue.shift();

      // Check if this cell matches the starting cell
      const currentCell = activeLayer.getCell(x, y);
      if (!this._cellsMatch(currentCell, startCell)) {
        continue;
      }

      // Add to fill list
      toFill.push({ x, y });

      // Check all 4 neighbors (N, S, E, W)
      const neighbors = [
        { x: x, y: y - 1 }, // North
        { x: x, y: y + 1 }, // South
        { x: x + 1, y: y }, // East
        { x: x - 1, y: y }, // West
      ];

      for (const neighbor of neighbors) {
        const { x: nx, y: ny } = neighbor;

        // Check bounds
        if (nx < 0 || nx >= scene.w || ny < 0 || ny >= scene.h) {
          continue;
        }

        // Check if already visited
        const key = `${nx},${ny}`;
        if (visited.has(key)) {
          continue;
        }

        visited.add(key);
        queue.push({ x: nx, y: ny });
      }
    }

    // If nothing to fill, return
    if (toFill.length === 0) {
      return;
    }

    // Create changes array for command
    const changes = [];
    for (const { x, y } of toFill) {
      const index = y * scene.w + x;
      const beforeCell = activeLayer.getCell(x, y);
      const afterCell = this._createFilledCell(beforeCell);

      changes.push({
        index: index,
        before: beforeCell.toObject(),
        after: afterCell.toObject(),
      });
    }

    // Create and execute command
    const command = CellCommand.fromMultipleCells({
      layer: activeLayer,
      changes: changes,
      tool: "floodfill",
      stateManager: stateManager,
      scene: scene,
    });

    this.commandHistory.execute(command);
  }

  /**
   * Handle cell mouse down event
   */
  onCellDown(x, y, scene, stateManager, eventData = {}) {
    this._floodFill(x, y, scene, stateManager);
  }

  /**
   * Handle cell drag event (flood fill doesn't do anything on drag)
   */
  onCellDrag(x, y, scene, stateManager, eventData = {}) {
    // Flood fill is a single-click operation, no dragging
  }

  /**
   * Handle cell mouse up event
   */
  onCellUp(x, y, scene, stateManager, eventData = {}) {
    // Nothing to do on mouse up
  }

  /**
   * Get the cursor style for this tool
   */
  getCursor() {
    return "cell"; // Paint bucket cursor would be ideal, but "cell" is a good fallback
  }
}
