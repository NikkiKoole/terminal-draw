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
import { SmartBoxDrawing } from "../utils/SmartBoxDrawing.js";

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
    this.smartBoxDrawing = new SmartBoxDrawing();
    this.drawingMode = "normal"; // "normal", "single", or "double"
    this.paintMode = "all"; // "all", "fg", "bg", "glyph"

    // Brush shape and size properties
    this.brushSize = 1; // 1, 3, or 5
    this.brushShape = "square"; // "square" or "circle"
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
   * Get the current paint mode
   * @returns {string} Current paint mode
   */
  getPaintMode() {
    return this.paintMode;
  }

  /**
   * Cycle to the next paint mode
   * Order: all -> fg -> bg -> glyph -> all
   * @returns {string} The new paint mode
   */
  cyclePaintMode() {
    const modes = ["all", "fg", "bg", "glyph"];
    const currentIndex = modes.indexOf(this.paintMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    this.paintMode = modes[nextIndex];
    return this.paintMode;
  }

  /**
   * Set brush size
   * @param {number} size - Brush size (1, 2, 3, 5, or 7)
   */
  setBrushSize(size) {
    const validSizes = [1, 2, 3, 5, 7];
    if (validSizes.includes(size)) {
      this.brushSize = size;
    }
  }

  /**
   * Set brush shape
   * @param {string} shape - Brush shape ("square", "circle", "triangle", "cross", "plus", or "minus")
   */
  setBrushShape(shape) {
    const validShapes = [
      "square",
      "circle",
      "triangle",
      "cross",
      "plus",
      "minus",
    ];
    if (validShapes.includes(shape)) {
      this.brushShape = shape;
    }
  }

  /**
   * Get brush size
   */
  getBrushSize() {
    return this.brushSize;
  }

  /**
   * Get brush shape
   */
  getBrushShape() {
    return this.brushShape;
  }

  /**
   * Get brush preview for hover/drag events
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {Scene} scene - Scene instance
   * @returns {Array} Array of {x, y} preview positions
   */
  getBrushPreview(x, y, scene) {
    return this._getBrushCells(x, y, scene).map((cell) => ({
      x: cell.x,
      y: cell.y,
    }));
  }

  /**
   * Get cells to paint based on brush size and shape
   * @private
   */
  _getBrushCells(centerX, centerY, scene) {
    if (this.brushSize === 1) {
      return [{ x: centerX, y: centerY }];
    }

    const cells = [];

    // Handle even vs odd brush sizes differently
    if (this.brushSize % 2 === 0) {
      // Even sizes: position brush so click point is bottom-right
      const size = this.brushSize;
      const startX = centerX - size + 1;
      const startY = centerY - size + 1;

      for (let dy = 0; dy < size; dy++) {
        for (let dx = 0; dx < size; dx++) {
          const x = startX + dx;
          const y = startY + dy;

          // Check bounds
          if (x < 0 || x >= scene.w || y < 0 || y >= scene.h) {
            continue;
          }

          // Apply shape filter for even sizes
          if (this.brushShape === "circle") {
            // Use circular brush - check if point is within circle
            const centerBrushX = startX + (size - 1) / 2;
            const centerBrushY = startY + (size - 1) / 2;
            const distance = Math.sqrt(
              (x - centerBrushX) ** 2 + (y - centerBrushY) ** 2,
            );
            const radius = size / 2;
            if (distance > radius) {
              continue;
            }
          } else if (this.brushShape === "triangle") {
            // Use triangular brush - triangle pointing up with wide base at bottom
            const relX = x - startX;
            const relY = y - startY;
            const distanceFromBottom = size - 1 - relY;
            const centerX = (size - 1) / 2;
            const distanceFromCenter = Math.abs(relX - centerX);

            // Triangle gets narrower as we go up
            // At bottom: full width, at top: single point
            if (distanceFromCenter > distanceFromBottom) {
              continue;
            }
          } else if (this.brushShape === "cross") {
            // Cross (X) shape - diagonal lines
            const relX = x - startX;
            const relY = y - startY;
            const centerX = (size - 1) / 2;
            const centerY = (size - 1) / 2;
            const distFromMainDiag = Math.abs(relX - relY);
            const distFromAntiDiag = Math.abs(relX + relY - (size - 1));
            if (distFromMainDiag !== 0 && distFromAntiDiag !== 0) {
              continue;
            }
          } else if (this.brushShape === "plus") {
            // Plus (+) shape - horizontal and vertical lines
            const relX = x - startX;
            const relY = y - startY;
            const centerX = (size - 1) / 2;
            const centerY = (size - 1) / 2;
            if (relX !== centerX && relY !== centerY) {
              continue;
            }
          } else if (this.brushShape === "minus") {
            // Minus (-) shape - horizontal line only
            const relY = y - startY;
            const centerY = (size - 1) / 2;
            if (relY !== centerY) {
              continue;
            }
          }

          cells.push({ x, y });
        }
      }
    } else {
      // Odd sizes: center around click point
      const radius = Math.floor(this.brushSize / 2);

      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const x = centerX + dx;
          const y = centerY + dy;

          // Check bounds
          if (x < 0 || x >= scene.w || y < 0 || y >= scene.h) {
            continue;
          }

          // Apply shape filter
          if (this.brushShape === "circle") {
            // Use circular brush - check if point is within circle
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance > radius) {
              continue;
            }
          } else if (this.brushShape === "triangle") {
            // Use triangular brush - triangle pointing up with wide base at bottom
            const absX = Math.abs(dx);
            const distanceFromBottom = radius + dy; // Distance from bottom of triangle

            // Triangle gets narrower as we go up
            // At bottom (dy=radius): full width (absX <= radius)
            // At top (dy=-radius): single point (absX <= 0)
            if (absX > distanceFromBottom) {
              continue;
            }
          } else if (this.brushShape === "cross") {
            // Cross (X) shape - diagonal lines
            if (Math.abs(dx) !== Math.abs(dy)) {
              continue;
            }
          } else if (this.brushShape === "plus") {
            // Plus (+) shape - horizontal and vertical lines
            if (dx !== 0 && dy !== 0) {
              continue;
            }
          } else if (this.brushShape === "minus") {
            // Minus (-) shape - horizontal line only
            if (dy !== 0) {
              continue;
            }
          }
          // Square brush includes all cells in the radius

          cells.push({ x, y });
        }
      }
    }

    return cells;
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

    // Check if layer is visible - don't allow drawing on invisible layers
    if (!activeLayer.visible) {
      return;
    }

    // Get all cells to paint based on brush size and shape
    const cellsToPaint = this._getBrushCells(x, y, scene);

    if (cellsToPaint.length === 1) {
      // Single cell - use existing logic
      const cell = cellsToPaint[0];
      if (this.drawingMode !== "normal") {
        this._paintSmartBoxDrawing(cell.x, cell.y, scene, stateManager);
      } else {
        this._paintNormalCell(cell.x, cell.y, scene, stateManager);
      }
    } else {
      // Multiple cells - paint them all as a group
      this._paintMultipleCells(cellsToPaint, scene, stateManager);
    }
  }

  /**
   * Paint multiple cells (for brush sizes > 1)
   * @private
   */
  _paintMultipleCells(cellsToPaint, scene, stateManager) {
    const activeLayer = scene.getActiveLayer();
    const changes = [];

    for (const cellPos of cellsToPaint) {
      const index = cellPos.y * scene.w + cellPos.x;
      const beforeCell = activeLayer.getCell(cellPos.x, cellPos.y);

      if (!beforeCell) {
        continue;
      }

      // Create new cell based on paint mode
      let afterCell;
      switch (this.paintMode) {
        case "fg":
          afterCell = new Cell(
            beforeCell.ch,
            this.currentCell.fg,
            beforeCell.bg,
          );
          break;
        case "bg":
          afterCell = new Cell(
            beforeCell.ch,
            beforeCell.fg,
            this.currentCell.bg,
          );
          break;
        case "glyph":
          afterCell = new Cell(
            this.currentCell.ch,
            beforeCell.fg,
            beforeCell.bg,
          );
          break;
        default: // "all"
          afterCell = new Cell(
            this.currentCell.ch,
            this.currentCell.fg,
            this.currentCell.bg,
          );
      }

      changes.push({
        index,
        before: beforeCell.toObject(),
        after: afterCell.toObject(),
      });
    }

    if (changes.length > 0) {
      // Create a single command for all cells
      const command = CellCommand.fromMultipleCells({
        layer: activeLayer,
        changes: changes,
        tool: "brush",
        stateManager: stateManager,
        scene: scene,
      });

      this.commandHistory.execute(command);
    }
  }

  /**
   * Paint a cell normally (non-smart mode)
   * @private
   */
  _paintNormalCell(x, y, scene, stateManager) {
    const activeLayer = scene.getActiveLayer();
    const index = y * scene.w + x;
    const beforeCell = activeLayer.getCell(x, y);

    if (!beforeCell) {
      return;
    }

    // Create new cell based on paint mode
    let afterCell;
    switch (this.paintMode) {
      case "fg":
        // Paint only foreground, preserve glyph and background
        afterCell = new Cell(beforeCell.ch, this.currentCell.fg, beforeCell.bg);
        break;
      case "bg":
        // Paint only background, preserve glyph and foreground
        afterCell = new Cell(beforeCell.ch, beforeCell.fg, this.currentCell.bg);
        break;
      case "glyph":
        // Paint only glyph, preserve colors
        afterCell = new Cell(this.currentCell.ch, beforeCell.fg, beforeCell.bg);
        break;
      default: // "all"
        // Paint all attributes
        afterCell = new Cell(
          this.currentCell.ch,
          this.currentCell.fg,
          this.currentCell.bg,
        );
    }

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
   * Paint using smart box-drawing logic
   * @private
   */
  _paintSmartBoxDrawing(x, y, scene, stateManager) {
    const activeLayer = scene.getActiveLayer();

    // Get the existing cell at this position
    const existingCell = activeLayer.getCell(x, y);
    const existingChar = existingCell ? existingCell.ch : null;

    // Get neighbors around the target position
    const neighbors = this.smartBoxDrawing.getNeighbors(
      x,
      y,
      activeLayer,
      scene.w,
      scene.h,
    );

    // Check if we're painting over a perpendicular line (mixed intersection)
    // We need to inject the existing perpendicular line into neighbors
    let modifiedNeighbors = { ...neighbors };

    if (existingChar && this.smartBoxDrawing.isBoxDrawingChar(existingChar)) {
      const existingIsSingleVertical = existingChar === "│";
      const existingIsDoubleVertical = existingChar === "║";
      const existingIsSingleHorizontal = existingChar === "─";
      const existingIsDoubleHorizontal = existingChar === "═";

      const existingIsVertical =
        existingIsSingleVertical || existingIsDoubleVertical;
      const existingIsHorizontal =
        existingIsSingleHorizontal || existingIsDoubleHorizontal;

      // Determine if we're drawing horizontally or vertically based on neighbors
      const drawingHorizontal = neighbors.east || neighbors.west;
      const drawingVertical = neighbors.north || neighbors.south;

      // If we're drawing horizontal over an existing vertical line, inject it as north/south
      if (existingIsVertical && drawingHorizontal && !drawingVertical) {
        modifiedNeighbors.north = existingChar;
        modifiedNeighbors.south = existingChar;
      }
      // If we're drawing vertical over an existing horizontal line, inject it as east/west
      else if (existingIsHorizontal && drawingVertical && !drawingHorizontal) {
        modifiedNeighbors.east = existingChar;
        modifiedNeighbors.west = existingChar;
      }
    }

    // Determine the smart character based on neighbors and mode
    const smartChar = this.smartBoxDrawing.getSmartCharacter(
      modifiedNeighbors,
      this.drawingMode,
    );

    // Create and execute command for the main cell
    const index = y * scene.w + x;
    const beforeCell = activeLayer.getCell(x, y);

    if (!beforeCell) {
      return;
    }

    const afterCell = new Cell(
      smartChar,
      this.currentCell.fg,
      this.currentCell.bg,
    );

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

    // Update neighboring box-drawing characters that need adjustment
    const neighborsToUpdate = this.smartBoxDrawing.getNeighborsToUpdate(
      x,
      y,
      activeLayer,
      scene.w,
      scene.h,
    );

    for (const neighbor of neighborsToUpdate) {
      const neighborIndex = neighbor.y * scene.w + neighbor.x;
      const neighborBeforeCell = activeLayer.getCell(neighbor.x, neighbor.y);

      if (!neighborBeforeCell) {
        continue;
      }

      const neighborAfterCell = new Cell(
        neighbor.char,
        neighbor.fg,
        neighbor.bg,
      );

      const neighborCommand = CellCommand.fromSingleCell({
        layer: activeLayer,
        index: neighborIndex,
        before: neighborBeforeCell.toObject(),
        after: neighborAfterCell.toObject(),
        tool: "brush",
        stateManager: stateManager,
        scene: scene,
      });

      this.commandHistory.execute(neighborCommand);
    }
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
