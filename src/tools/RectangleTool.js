/**
 * RectangleTool.js - Draw rectangle outlines with smart box-drawing support
 *
 * The rectangle tool allows users to draw rectangle outlines by click-dragging.
 * Supports normal mode (using current glyph) and smart line modes (single/double).
 * Respects paint mode settings and includes shift-constraint for perfect squares.
 */

import { Tool } from "./Tool.js";
import { Cell } from "../core/Cell.js";
import { CellCommand } from "../commands/CellCommand.js";
import { SmartBoxDrawing } from "../utils/SmartBoxDrawing.js";

export class RectangleTool extends Tool {
  /**
   * Create a new rectangle tool
   * @param {object} currentCell - Initial cell to draw with {ch, fg, bg}
   * @param {CommandHistory} commandHistory - Command history for undo/redo
   */
  constructor(currentCell = { ch: "█", fg: 7, bg: -1 }, commandHistory = null) {
    super("Rectangle");
    this.currentCell = { ...currentCell };
    this.commandHistory = commandHistory;
    this.drawingMode = "normal"; // "normal", "single", or "double"
    this.paintMode = "all"; // "all", "fg", "bg", "glyph"
    this.fillMode = "outline"; // "outline" or "filled"
    this.smartBoxDrawing = new SmartBoxDrawing();

    // Rectangle state
    this.isDrawing = false;
    this.startX = null;
    this.startY = null;
    this.currentX = null;
    this.currentY = null;
  }

  /**
   * Set the current cell to draw with
   * @param {object} cell - Cell data {ch, fg, bg}
   */
  setCurrentCell(cell) {
    this.currentCell = { ...cell };
  }

  /**
   * Get the current cell being used
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
   * Set the drawing mode for smart box-drawing
   * @param {string} mode - Drawing mode: "normal", "single", or "double"
   */
  setDrawingMode(mode) {
    this.drawingMode = mode;
  }

  /**
   * Get the current drawing mode
   * @returns {string} Current drawing mode
   */
  getDrawingMode() {
    return this.drawingMode;
  }

  /**
   * Set the paint mode (which attributes to paint)
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
   * Set fill mode
   * @param {string} mode - Fill mode: "outline" or "filled"
   */
  setFillMode(mode) {
    const validModes = ["outline", "filled"];
    if (validModes.includes(mode)) {
      this.fillMode = mode;
    }
  }

  /**
   * Get current fill mode
   * @returns {string} Current fill mode
   */
  getFillMode() {
    return this.fillMode;
  }

  /**
   * Start drawing a rectangle
   */
  onCellDown(x, y, scene, stateManager, eventData = {}) {
    const activeLayer = scene.getActiveLayer();

    if (!activeLayer || !this.commandHistory) {
      return;
    }

    // Check if layer is locked or invisible
    if (activeLayer.locked || !activeLayer.visible) {
      return;
    }

    this.isDrawing = true;
    this.startX = x;
    this.startY = y;
    this.currentX = x;
    this.currentY = y;

    // Show anchor indicator at start position
    if (stateManager) {
      stateManager.emit("rectangle:anchor", { x, y });
    }
  }

  /**
   * Update rectangle preview while dragging
   */
  onCellDrag(x, y, scene, stateManager, eventData = {}) {
    if (!this.isDrawing) {
      return;
    }

    this.currentX = x;
    this.currentY = y;
  }

  /**
   * Finish drawing the rectangle
   */
  onCellUp(x, y, scene, stateManager, eventData = {}) {
    if (!this.isDrawing) {
      return;
    }

    this.currentX = x;
    this.currentY = y;

    // Draw the actual rectangle
    this._drawRectangle(scene, stateManager);

    // Hide anchor indicator
    if (stateManager) {
      stateManager.emit("rectangle:anchor", { x: null, y: null });
    }

    // Reset state
    this.isDrawing = false;
    this.startX = null;
    this.startY = null;
    this.currentX = null;
    this.currentY = null;

    // Disable merging briefly to prevent next rectangle from merging with this one
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
   * Get rectangle coordinates (normalized and constrained)
   * @returns {object} {x1, y1, x2, y2, width, height}
   * @private
   */
  _getRectangleCoords() {
    let x1 = this.startX;
    let y1 = this.startY;
    let x2 = this.currentX;
    let y2 = this.currentY;

    // Normalize coordinates
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);

    return {
      x1: minX,
      y1: minY,
      x2: maxX,
      y2: maxY,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
    };
  }

  /**
   * Get cells for rectangle (outline or filled)
   * @param {object} coords - Rectangle coordinates from _getRectangleCoords
   * @param {Scene} scene - Scene instance
   * @returns {Array} Array of {x, y, cell} objects
   * @private
   */
  _getRectangleCells(coords, scene) {
    if (this.fillMode === "filled") {
      return this._getFilledRectangleCells(coords, scene);
    } else {
      return this._getOutlineRectangleCells(coords, scene);
    }
  }

  /**
   * Get cells for filled rectangle
   * @param {object} coords - Rectangle coordinates
   * @param {Scene} scene - Scene instance
   * @returns {Array} Array of {x, y, cell} objects
   * @private
   */
  _getFilledRectangleCells(coords, scene) {
    const cells = [];
    const activeLayer = scene.getActiveLayer();

    if (!activeLayer) {
      return cells;
    }

    const { x1, y1, x2, y2 } = coords;

    // Fill entire rectangle area
    for (let y = y1; y <= y2; y++) {
      for (let x = x1; x <= x2; x++) {
        const char = this.currentCell.ch;
        const beforeCell = activeLayer.getCell(x, y);
        const afterCell = this._applyPaintMode(char, beforeCell);
        cells.push({ x, y, cell: afterCell });
      }
    }

    return cells;
  }

  /**
   * Get cells for rectangle outline
   * @param {object} coords - Rectangle coordinates
   * @param {Scene} scene - Scene instance
   * @returns {Array} Array of {x, y, cell} objects
   * @private
   */
  _getOutlineRectangleCells(coords, scene) {
    const { x1, y1, x2, y2 } = coords;
    const cells = [];
    const activeLayer = scene.getActiveLayer();

    if (!activeLayer) {
      return cells;
    }

    // Determine which characters to use
    const chars = this._getBoxChars();

    // Draw rectangle outline
    for (let y = y1; y <= y2; y++) {
      for (let x = x1; x <= x2; x++) {
        // Only draw on the outline
        const isTop = y === y1;
        const isBottom = y === y2;
        const isLeft = x === x1;
        const isRight = x === x2;

        if (!isTop && !isBottom && !isLeft && !isRight) {
          continue; // Skip interior cells
        }

        // Determine character based on position
        let char;

        // Get the expected character for this position
        const expectedChar = this._getExpectedChar(
          chars,
          isTop,
          isBottom,
          isLeft,
          isRight,
        );

        // In smart mode, check if there are existing perpendicular lines
        // that would require a mixed intersection character
        if (this.drawingMode !== "normal") {
          const neighbors = this.smartBoxDrawing.getNeighbors(
            x,
            y,
            activeLayer,
            scene.w,
            scene.h,
          );

          // Get the smart character considering neighbors
          const smartChar = this.smartBoxDrawing.getSmartCharacter(
            neighbors,
            this.drawingMode,
          );

          // Only use smart character if it's a mixed character
          // (different from what we'd normally place)
          const isMixedChar =
            Object.values(
              this.smartBoxDrawing.mixedChars.singleHorizontalDoubleVertical,
            ).includes(smartChar) ||
            Object.values(
              this.smartBoxDrawing.mixedChars.doubleHorizontalSingleVertical,
            ).includes(smartChar);

          if (isMixedChar) {
            char = smartChar; // Use mixed character for intersection
          } else {
            char = expectedChar; // Use normal rectangle character
          }
        } else {
          // Normal mode - use position-based character
          char = expectedChar;
        }

        // Apply paint mode
        const beforeCell = activeLayer.getCell(x, y);
        const afterCell = this._applyPaintMode(char, beforeCell);

        cells.push({ x, y, cell: afterCell });
      }
    }

    return cells;
  }

  /**
   * Get expected character based on position
   * @private
   */
  _getExpectedChar(chars, isTop, isBottom, isLeft, isRight) {
    if (isTop && isLeft) {
      return chars.topLeft;
    } else if (isTop && isRight) {
      return chars.topRight;
    } else if (isBottom && isLeft) {
      return chars.bottomLeft;
    } else if (isBottom && isRight) {
      return chars.bottomRight;
    } else if (isTop || isBottom) {
      return chars.horizontal;
    } else {
      return chars.vertical;
    }
  }

  /**
   * Get box-drawing characters based on drawing mode
   * @returns {object} Character set for rectangle corners and edges
   * @private
   */
  _getBoxChars() {
    if (this.drawingMode === "single") {
      return {
        topLeft: "┌",
        topRight: "┐",
        bottomLeft: "└",
        bottomRight: "┘",
        horizontal: "─",
        vertical: "│",
      };
    } else if (this.drawingMode === "double") {
      return {
        topLeft: "╔",
        topRight: "╗",
        bottomLeft: "╚",
        bottomRight: "╝",
        horizontal: "═",
        vertical: "║",
      };
    } else {
      // Normal mode - use current glyph for everything
      const ch = this.currentCell.ch;
      return {
        topLeft: ch,
        topRight: ch,
        bottomLeft: ch,
        bottomRight: ch,
        horizontal: ch,
        vertical: ch,
      };
    }
  }

  /**
   * Apply paint mode to create new cell
   * @param {string} char - Character to draw
   * @param {Cell} beforeCell - Existing cell
   * @returns {Cell} New cell with paint mode applied
   * @private
   */
  _applyPaintMode(char, beforeCell) {
    switch (this.paintMode) {
      case "fg":
        return new Cell(beforeCell.ch, this.currentCell.fg, beforeCell.bg);
      case "bg":
        return new Cell(beforeCell.ch, beforeCell.fg, this.currentCell.bg);
      case "glyph":
        return new Cell(char, beforeCell.fg, beforeCell.bg);
      default: // "all"
        return new Cell(char, this.currentCell.fg, this.currentCell.bg);
    }
  }

  /**
   * Draw the actual rectangle and create undo command
   * @private
   */
  _drawRectangle(scene, stateManager) {
    const activeLayer = scene.getActiveLayer();

    if (!activeLayer || !this.commandHistory) {
      return;
    }

    const coords = this._getRectangleCoords();
    const cells = this._getRectangleCells(coords, scene);

    if (cells.length === 0) {
      return;
    }

    // Collect before/after states for all cells
    const changes = [];
    for (const { x, y, cell } of cells) {
      const index = y * scene.w + x;
      const before = activeLayer.getCell(x, y);

      changes.push({
        index: index,
        before: before.toObject(),
        after: cell.toObject(),
      });
    }

    // Create and execute command
    const command = CellCommand.fromMultipleCells({
      layer: activeLayer,
      changes: changes,
      tool: "rectangle",
      stateManager: stateManager,
      scene: scene,
    });

    this.commandHistory.execute(command);
  }

  /**
   * Get cursor style for this tool
   * @returns {string} CSS cursor style
   */
  getCursor() {
    return "crosshair";
  }
}
