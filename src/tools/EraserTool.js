/**
 * EraserTool.js - Clear cells to default values
 *
 * The eraser tool allows users to clear cells on the active layer
 * by clicking or dragging. It resets cells to default state (space character,
 * white foreground, transparent background). Creates undoable commands for all operations.
 * When erasing box-drawing characters, intelligently updates neighboring box-drawing
 * characters to maintain proper connections.
 */

import { Tool } from "./Tool.js";
import { Cell } from "../core/Cell.js";
import { CellCommand } from "../commands/CellCommand.js";
import { SmartBoxDrawing } from "../utils/SmartBoxDrawing.js";

export class EraserTool extends Tool {
  /**
   * Create a new eraser tool
   * @param {CommandHistory} commandHistory - Command history for undo/redo
   */
  constructor(commandHistory = null) {
    super("Eraser");
    this.commandHistory = commandHistory;
    this.currentStroke = null; // Track current eraser stroke for merging
    this.smartBoxDrawing = new SmartBoxDrawing();
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

    // Check if we're erasing a box-drawing character
    const isBoxDrawingChar = this.smartBoxDrawing.isBoxDrawingChar(
      beforeCell.ch,
    );

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

    // If we erased a box-drawing character, update neighboring box-drawing characters
    // that are junctions or corners (not simple lines that should remain unchanged)
    if (isBoxDrawingChar) {
      // Check all four neighbors and update junctions/corners
      const directions = [
        { dx: 0, dy: -1, name: "north" },
        { dx: 0, dy: 1, name: "south" },
        { dx: 1, dy: 0, name: "east" },
        { dx: -1, dy: 0, name: "west" },
      ];

      for (const dir of directions) {
        const nx = x + dir.dx;
        const ny = y + dir.dy;

        // Check bounds
        if (nx < 0 || nx >= scene.w || ny < 0 || ny >= scene.h) {
          continue;
        }

        const neighborCell = activeLayer.getCell(nx, ny);
        if (
          !neighborCell ||
          !this.smartBoxDrawing.isBoxDrawingChar(neighborCell.ch)
        ) {
          continue;
        }

        // Only update if it's a junction or corner (not a simple line)
        const isJunctionOrCorner = this._isJunctionOrCorner(neighborCell.ch);
        if (!isJunctionOrCorner) {
          continue;
        }

        // Calculate what this neighbor should be based on its remaining neighbors
        const neighborNeighbors = this.smartBoxDrawing.getNeighbors(
          nx,
          ny,
          activeLayer,
          scene.w,
          scene.h,
        );

        // Determine the mode based on the neighbor's current character
        const neighborMode = this.smartBoxDrawing.isSingleLineChar(
          neighborCell.ch,
        )
          ? "single"
          : "double";

        // Get the smart character for this neighbor
        const newChar = this.smartBoxDrawing.getSmartCharacter(
          neighborNeighbors,
          neighborMode,
        );

        // Only update if the character would actually change
        if (newChar !== neighborCell.ch) {
          const neighborIndex = ny * scene.w + nx;

          const neighborAfterCell = new Cell(
            newChar,
            neighborCell.fg,
            neighborCell.bg,
          );

          const neighborCommand = CellCommand.fromSingleCell({
            layer: activeLayer,
            index: neighborIndex,
            before: neighborCell.toObject(),
            after: neighborAfterCell.toObject(),
            tool: "eraser",
            stateManager: stateManager,
            scene: scene,
          });

          this.commandHistory.execute(neighborCommand);
        }
      }
    }
  }

  /**
   * Check if a character is a junction or corner (not a simple line)
   * @private
   */
  _isJunctionOrCorner(char) {
    // Simple horizontal and vertical lines should not be updated
    const simpleLines = ["─", "│", "═", "║"];
    if (simpleLines.includes(char)) {
      return false;
    }

    // Everything else (corners, junctions, crosses) should be updated
    return this.smartBoxDrawing.isBoxDrawingChar(char);
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
