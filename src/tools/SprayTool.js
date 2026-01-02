/**
 * SprayTool.js - Spray characters in a random pattern with various presets
 *
 * The spray tool applies characters in a circular area around the cursor
 * with random distribution. Supports multiple character set presets:
 * - Density: . - + * % m # (progressive density)
 * - Blocks: ░ ▒ ▓ █ (light to heavy blocks)
 * - Dots: · • ● ○ (various dot styles)
 * - Stipple: , . · : (fine texture)
 *
 * Each spray application upgrades existing characters to the next level
 * in the current preset sequence.
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
    this.radius = 3; // Default medium radius
    this.coverage = 0.05; // 5% of cells within radius get painted (medium)

    // Character set presets
    this.presets = {
      artist: [".", "-", "+", "*", "%", "m", "#"],
      blocks: ["░", "▒", "▓", "█"],
      dots: ["·", "•", "○", "●"],
      stipple: [",", ".", "·", ":"],
      heights: ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"],
      widths: ["▏", "▎", "▍", "▌", "▋", "▊", "▉"],
      stars: ["·", "•", "✶", "✕"],
      triangles: ["▴", "▵", "►", "◄", "▲", "▼"],
      crosses: ["·", "÷", "+", "✕", "×", "X", "╳"],
      waves: ["~", "∼", "≈", "≋"],
    };

    // Current preset and sequence
    this.currentPreset = "artist";
    this.densitySequence = this.presets.artist;
  }

  /**
   * Set the character preset
   * @param {string} presetName - Name of preset: "density", "blocks", "dots", or "stipple"
   */
  setPreset(presetName) {
    if (this.presets[presetName]) {
      this.currentPreset = presetName;
      this.densitySequence = this.presets[presetName];
    }
  }

  /**
   * Get the current preset name
   * @returns {string} Current preset name
   */
  getPreset() {
    return this.currentPreset;
  }

  /**
   * Set the spray radius
   * @param {number} radius - Radius size (2=small, 3=medium, 5=large)
   */
  setRadius(radius) {
    if (radius === 2 || radius === 3 || radius === 5) {
      this.radius = radius;
    }
  }

  /**
   * Get the current radius
   * @returns {number} Current radius
   */
  getRadius() {
    return this.radius;
  }

  /**
   * Set the spray coverage (density)
   * @param {number} coverage - Coverage percentage (0.025=light, 0.05=medium, 0.1=dense, 0.5=heavy)
   */
  setCoverage(coverage) {
    if (
      coverage === 0.025 ||
      coverage === 0.05 ||
      coverage === 0.1 ||
      coverage === 0.5
    ) {
      this.coverage = coverage;
    }
  }

  /**
   * Get the current coverage
   * @returns {number} Current coverage
   */
  getCoverage() {
    return this.coverage;
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

      // Handle max density cells - allow color change even if character doesn't change
      if (nextChar === beforeCell.ch) {
        // If already at max density (#), check if we can change color
        if (beforeCell.ch === "#" && beforeCell.fg !== this.currentCell.fg) {
          // Change color of existing # character
          const afterCell = new Cell(
            "#", // Keep the # character
            this.currentCell.fg, // Use new color
            beforeCell.bg, // Preserve background color
          );

          // Create command for color change
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
        // If same color or not max density, skip
        continue;
      }

      // Create new cell with upgraded density and current color
      const afterCell = new Cell(
        nextChar,
        this.currentCell.fg,
        beforeCell.bg, // Preserve background color
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
