/**
 * SprayTool.js - Spray density characters in a random pattern
 *
 * The spray tool applies density characters (. - + * % m #) in a circular
 * area around the cursor with random distribution. Each spray application
 * upgrades existing characters to the next density level.
 */

import { Tool } from "./Tool.js";
import { Cell } from "../core/Cell.js";
import { CellCommand } from "../commands/CellCommand.js";

export class SprayTool extends Tool {
  /**
   * Create a new spray tool
   * @param {object} currentCell - Current cell settings for color {ch, fg, bg}
   * @param {CommandHistory} commandHistory - Command history for undo/redo
   */
  constructor(currentCell = { ch: ".", fg: 7, bg: -1 }, commandHistory = null) {
    super("Spray");
    this.currentCell = { ...currentCell };
    this.commandHistory = commandHistory;
    this.currentStroke = null;

    // Spray settings
    this.radius = 3; // Hardcoded radius for now
    this.coverage = 0.1; // 10% of cells within radius get painted

    // Density progression sequence
    this.densitySequence = ['.', '-', '+', '*', '%', 'm', '#'];
  }

  /**
   * Set the current cell settings (mainly for color)
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
   * Get the next density character in the progression
   * @param {string} currentChar - Current character
   * @returns {string} Next character in density sequence, or same if at max
   * @private
   */
  _getNextDensityChar(currentChar) {
    const currentIndex = this.densitySequence.indexOf(currentChar);

    if (currentIndex === -1) {
      // Character not in density sequence, start at beginning
      return this.densitySequence[0];
    }

    if (currentIndex === this.densitySequence.length - 1) {
      // Already at maximum density (#), no change
      return currentChar;
    }

    // Move to next density level
    return this.densitySequence[currentIndex + 1];
  }

  /**
   * Get all cells within spray radius
   * @param {number} centerX - Center X coordinate
   * @param {number} centerY - Center Y coordinate
   * @param {Scene} scene - The scene being edited
   * @returns {Array} Array of {x, y} coordinates within radius
   * @private
   */
  _getCellsInRadius(centerX, centerY, scene) {
    const cells = [];

    for (let dy = -this.radius; dy <= this.radius; dy++) {
      for (let dx = -this.radius; dx <= this.radius; dx++) {
        const x = centerX + dx;
        const y = centerY + dy;

        // Check if within scene bounds
        if (x < 0 || x >= scene.w || y < 0 || y >= scene.h) {
          continue;
        }

        // Check if within circular radius
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance <= this.radius) {
          cells.push({ x, y });
        }
      }
    }

    return cells;
  }

  /**
   * Randomly select cells from the radius area for spraying
   * @param {Array} cells - Array of {x, y} coordinates
   * @returns {Array} Randomly selected subset of cells
   * @private
   */
  _selectRandomCells(cells) {
    const selectedCells = [];

    for (const cell of cells) {
      if (Math.random() < this.coverage) {
        selectedCells.push(cell);
      }
    }

    return selectedCells;
  }

  /**
   * Spray at the given coordinates
   * @param {number} x - Center X coordinate
   * @param {number} y - Center Y coordinate
   * @param {Scene} scene - The scene being edited
   * @param {StateManager} stateManager - State manager for emitting events
   * @private
   */
  _sprayAtLocation(x, y, scene, stateManager) {
    // Get the active layer
    const activeLayer = scene.getActiveLayer();

    if (!activeLayer || !this.commandHistory) {
      return;
    }

    // Check if layer is locked
    if (activeLayer.locked) {
      return;
    }

    // Check if layer is visible - don't allow drawing on invisible layers
    if (!activeLayer.visible) {
      return;
    }

    // Get all cells within radius
    const cellsInRadius = this._getCellsInRadius(x, y, scene);

    // Randomly select cells to spray
    const selectedCells = this._selectRandomCells(cellsInRadius);

    // Apply spray to selected cells
    const commands = [];

    for (const cellCoord of selectedCells) {
      const { x: cellX, y: cellY } = cellCoord;
      const index = cellY * scene.w + cellX;

      // Get current cell state
      const beforeCell = activeLayer.getCell(cellX, cellY);
      if (!beforeCell) {
        continue;
      }

      // Calculate next density character
      const nextChar = this._getNextDensityChar(beforeCell.ch);

      // If character doesn't change (already at max density), skip
      if (nextChar === beforeCell.ch) {
        continue;
      }

      // Create new cell with upgraded density and current color
      const afterCell = new Cell(
        nextChar,
        this.currentCell.fg,
        beforeCell.bg // Preserve background color
      );

      // Create command for this cell
      const command = CellCommand.fromSingleCell({
        layer: activeLayer,
        index: index,
        before: beforeCell.toObject(),
        after: afterCell.toObject(),
        tool: "spray",
        stateManager: stateManager,
        scene: scene,
      });

      commands.push(command);
    }

    // Execute all commands as a batch if any were created
    if (commands.length > 0) {
      // Execute the first command, which will handle the batch
      for (const command of commands) {
        this.commandHistory.execute(command);
      }
    }
  }

  /**
   * Handle cell mouse down event
   */
  onCellDown(x, y, scene, stateManager, eventData = {}) {
    // Start a new spray stroke
    this.currentStroke = { startTime: Date.now() };
    this._sprayAtLocation(x, y, scene, stateManager);
  }

  /**
   * Handle cell drag event
   */
  onCellDrag(x, y, scene, stateManager, eventData = {}) {
    this._sprayAtLocation(x, y, scene, stateManager);
  }

  /**
   * Handle cell mouse up event
   */
  onCellUp(x, y, scene, stateManager, eventData = {}) {
    // End spray stroke
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
