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

    // Check if we should use smart box-drawing
    if (this.drawingMode !== "normal") {
      this._paintSmartBoxDrawing(x, y, scene, stateManager);
    } else {
      this._paintNormalCell(x, y, scene, stateManager);
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

    // Get neighbors around the target position
    const neighbors = this.smartBoxDrawing.getNeighbors(
      x,
      y,
      activeLayer,
      scene.w,
      scene.h,
    );

    // Determine the smart character based on neighbors and mode
    const smartChar = this.smartBoxDrawing.getSmartCharacter(
      neighbors,
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
