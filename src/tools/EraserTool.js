/**
 * EraserTool.js - Clear cells to default values
 *
 * The eraser tool allows users to clear cells on the active layer
 * by clicking or dragging. It resets cells to default state (space character,
 * white foreground, transparent background). Creates undoable commands for all operations.
 */

import { Tool } from "./Tool.js";
import { Cell } from "../core/Cell.js";
import { CellCommand } from "../commands/CellCommand.js";

export class EraserTool extends Tool {
  /**
   * Create a new eraser tool
   * @param {CommandHistory} commandHistory - Command history for undo/redo
   */
  constructor(commandHistory = null) {
    super("Eraser");
    this.commandHistory = commandHistory;
    this.currentStroke = null; // Track current eraser stroke for merging
  }

  /**
   * Set command history for undo/redo operations
   * @param {CommandHistory} commandHistory - Command history instance
   */
  setCommandHistory(commandHistory) {
    this.commandHistory = commandHistory;
  }

  /**
   * Erase a cell at the given coordinates using commands
   * @private
   */
  _eraseCell(x, y, scene, stateManager) {
    // Get the active layer
    const activeLayer = scene.getActiveLayer();

    if (!activeLayer || !this.commandHistory) {
      return;
    }

    // Check if layer is locked
    if (activeLayer.locked) {
      return;
    }

    // Check if layer is visible - don't allow erasing on invisible layers
    if (!activeLayer.visible) {
      return;
    }

    // Get current cell state for undo
    const index = y * scene.w + x;
    const beforeCell = activeLayer.getCell(x, y);

    if (!beforeCell) {
      return;
    }

    // Create default cell (space, white fg, transparent bg)
    const afterCell = new Cell(" ", 7, -1);

    // Create command even if cell appears already erased - let the command system decide

    // Create and execute command
    const command = CellCommand.fromSingleCell({
      layer: activeLayer,
      index: index,
      before: beforeCell.toObject(),
      after: afterCell.toObject(),
      tool: "eraser",
      stateManager: stateManager,
      scene: scene,
    });

    this.commandHistory.execute(command);
  }

  /**
   * Handle cell mouse down event
   */
  onCellDown(x, y, scene, stateManager, eventData = {}) {
    // Start a new eraser stroke
    this.currentStroke = { startTime: Date.now() };
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
    // End eraser stroke - commands will automatically merge if appropriate
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
    return "not-allowed";
  }
}
