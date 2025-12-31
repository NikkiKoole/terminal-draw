/**
 * BrushTool.js - Paint cells with current character and colors
 *
 * The brush tool allows users to paint cells on the active layer
 * by clicking or dragging. It respects layer lock state and creates
 * undoable commands for all operations.
 */

import { Tool } from "./Tool.js";
import { Cell } from "../core/Cell.js";
import { CellCommand } from "../commands/CellCommand.js";

export class BrushTool extends Tool {
  /**
   * Create a new brush tool
   * @param {object} currentCell - Initial cell to paint with {ch, fg, bg}
   * @param {CommandHistory} commandHistory - Command history for undo/redo
   */
  constructor(currentCell = { ch: "█", fg: 7, bg: -1 }, commandHistory = null) {
    super("Brush");
    this.currentCell = { ...currentCell };
    this.commandHistory = commandHistory;
    this.currentStroke = null; // Track current brush stroke for merging
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
   * Set command history for undo/redo operations
   * @param {CommandHistory} commandHistory - Command history instance
   */
  setCommandHistory(commandHistory) {
    this.commandHistory = commandHistory;
  }

  /**
   * Paint a cell at the given coordinates using commands
   * @private
   */
  _paintCell(x, y, scene, stateManager) {
    // Get the active layer
    const activeLayer = scene.getActiveLayer();

    if (!activeLayer || !this.commandHistory) {
      return;
    }

    // Check if layer is locked
    if (activeLayer.locked) {
      return;
    }

    // Get current cell state for undo
    const index = y * scene.w + x;
    const beforeCell = activeLayer.getCell(x, y);

    if (!beforeCell) {
      return;
    }

    // Create new cell with current brush settings
    const afterCell = new Cell(
      this.currentCell.ch,
      this.currentCell.fg,
      this.currentCell.bg,
    );

    // Create command even if cell appears unchanged - let the command system decide

    // Create and execute command
    const command = CellCommand.fromSingleCell({
      layer: activeLayer,
      index: index,
      before: beforeCell.toObject(),
      after: afterCell.toObject(),
      tool: "brush",
      stateManager: stateManager,
      scene: scene,
    });

    this.commandHistory.execute(command);
  }

  /**
   * Handle cell mouse down event
   */
  onCellDown(x, y, scene, stateManager, eventData = {}) {
    // Start a new brush stroke
    this.currentStroke = { startTime: Date.now() };
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
    // End brush stroke - commands will automatically merge if appropriate
    this.currentStroke = null;

    // Disable merging briefly to prevent merging with next stroke
    if (this.commandHistory) {
      setTimeout(() => {
        if (this.commandHistory) {
          this.commandHistory.setMergingEnabled(false);
          this.commandHistory.setMergingEnabled(true);
        }
      }, 100);
    }
  }

  /**
   * Get the cursor style for this tool
   */
  getCursor() {
    return "crosshair";
  }
}
