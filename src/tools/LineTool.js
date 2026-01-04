/**
 * LineTool.js - Draw lines with Bresenham algorithm and smart box-drawing support
 *
 * The line tool allows users to draw straight lines by click-dragging.
 * Supports normal mode (using current glyph) and smart line modes (single/double)
 * with appropriate box-drawing characters including corners for diagonal lines.
 */

import { Tool } from "./Tool.js";
import { Cell } from "../core/Cell.js";
import { CellCommand } from "../commands/CellCommand.js";

export class LineTool extends Tool {
  /**
   * Create a new line tool
   * @param {object} currentCell - Initial cell to draw with {ch, fg, bg}
   * @param {CommandHistory} commandHistory - Command history for undo/redo
   */
  constructor(currentCell = { ch: "█", fg: 7, bg: -1 }, commandHistory = null) {
    super("Line");
    this.currentCell = { ...currentCell };
    this.commandHistory = commandHistory;
    this.drawingMode = "normal"; // "normal", "single", or "double"
    this.paintMode = "all"; // "all", "fg", "bg", "glyph"

    // Line state
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
   * Get the current paint mode
   * @returns {string} Current paint mode
   */
  getPaintMode() {
    return this.paintMode;
  }

  /**
   * Start drawing a line
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
      stateManager.emit("line:anchor", { x, y });
    }
  }

  /**
   * Update line endpoint while dragging
   */
  onCellDrag(x, y, scene, stateManager, eventData = {}) {
    if (!this.isDrawing) {
      return;
    }

    this.currentX = x;
    this.currentY = y;
  }

  /**
   * Finish drawing the line
   */
  onCellUp(x, y, scene, stateManager, eventData = {}) {
    if (!this.isDrawing) {
      return;
    }

    this.currentX = x;
    this.currentY = y;

    // Draw the actual line
    this._drawLine(scene, stateManager);

    // Hide anchor indicator
    if (stateManager) {
      stateManager.emit("line:anchor", { x: null, y: null });
    }

    // Reset state
    this.isDrawing = false;
    this.startX = null;
    this.startY = null;
    this.currentX = null;
    this.currentY = null;

    // Disable merging briefly to prevent next line from merging with this one
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
   * Calculate line points using Bresenham's line algorithm
   * @param {number} x0 - Start x coordinate
   * @param {number} y0 - Start y coordinate
   * @param {number} x1 - End x coordinate
   * @param {number} y1 - End y coordinate
   * @param {boolean} connected - If true, ensures 4-connectivity (no diagonal gaps)
   * @returns {Array} Array of {x, y} points
   * @private
   */
  _bresenham(x0, y0, x1, y1, connected = false) {
    const points = [];
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    let x = x0;
    let y = y0;

    while (true) {
      points.push({ x, y });

      if (x === x1 && y === y1) {
        break;
      }

      const e2 = 2 * err;
      const prevX = x;
      const prevY = y;

      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }

      if (e2 < dx) {
        err += dx;
        y += sy;
      }

      // If connected mode and we moved diagonally, add connecting point
      if (connected && x !== prevX && y !== prevY) {
        // Add intermediate point to ensure 4-connectivity
        points.push({ x: prevX, y: y });
      }
    }

    return points;
  }

  /**
   * Get the appropriate box-drawing character for a line segment
   * @param {object} prev - Previous point {x, y} or null
   * @param {object} curr - Current point {x, y}
   * @param {object} next - Next point {x, y} or null
   * @returns {string} Appropriate box-drawing character
   * @private
   */
  _getLineChar(prev, curr, next) {
    // Get character set based on drawing mode
    const chars = this._getLineCharSet();

    // Determine which directions this point connects to
    const connections = {
      left: false,
      right: false,
      up: false,
      down: false,
    };

    if (prev) {
      const dx = curr.x - prev.x;
      const dy = curr.y - prev.y;
      if (dx > 0) connections.left = true;
      else if (dx < 0) connections.right = true;
      if (dy > 0) connections.up = true;
      else if (dy < 0) connections.down = true;
    }

    if (next) {
      const dx = next.x - curr.x;
      const dy = next.y - curr.y;
      if (dx > 0) connections.right = true;
      else if (dx < 0) connections.left = true;
      if (dy > 0) connections.down = true;
      else if (dy < 0) connections.up = true;
    }

    // Count connections
    const connectionCount = Object.values(connections).filter(Boolean).length;

    // Single connection (endpoint)
    if (connectionCount === 1) {
      if (connections.left || connections.right) return chars.horizontal;
      if (connections.up || connections.down) return chars.vertical;
    }

    // Two connections
    if (connectionCount === 2) {
      // Straight lines
      if (connections.left && connections.right) return chars.horizontal;
      if (connections.up && connections.down) return chars.vertical;

      // Corners
      if (connections.right && connections.down) return chars.topLeft;
      if (connections.left && connections.down) return chars.topRight;
      if (connections.right && connections.up) return chars.bottomLeft;
      if (connections.left && connections.up) return chars.bottomRight;
    }

    // Three or more connections - use horizontal as fallback
    // (shouldn't happen in a simple line, but just in case)
    return chars.horizontal;
  }

  /**
   * Get box-drawing character set based on drawing mode
   * @returns {object} Character set
   * @private
   */
  _getLineCharSet() {
    if (this.drawingMode === "single") {
      return {
        horizontal: "─",
        vertical: "│",
        topLeft: "┌",
        topRight: "┐",
        bottomLeft: "└",
        bottomRight: "┘",
      };
    } else if (this.drawingMode === "double") {
      return {
        horizontal: "═",
        vertical: "║",
        topLeft: "╔",
        topRight: "╗",
        bottomLeft: "╚",
        bottomRight: "╝",
      };
    } else {
      // Normal mode - use current glyph for everything
      const ch = this.currentCell.ch;
      return {
        horizontal: ch,
        vertical: ch,
        topLeft: ch,
        topRight: ch,
        bottomLeft: ch,
        bottomRight: ch,
      };
    }
  }

  /**
   * Get cells for the line
   * @param {Array} points - Line points from Bresenham
   * @param {Scene} scene - Scene instance
   * @returns {Array} Array of {x, y, cell} objects
   * @private
   */
  _getLineCells(points, scene) {
    const cells = [];
    const activeLayer = scene.getActiveLayer();

    if (!activeLayer || points.length === 0) {
      return cells;
    }

    // Process points - in smart mode they already have corners from connected Bresenham
    const processedPoints = points.map((p, i) => ({
      ...p,
      prev: i > 0 ? points[i - 1] : null,
      next: i < points.length - 1 ? points[i + 1] : null,
    }));

    for (const point of processedPoints) {
      // Determine character for this point
      let char;
      if (this.drawingMode === "normal") {
        // Normal mode: just use the current glyph
        char = this.currentCell.ch;
      } else {
        // Smart mode: use appropriate box-drawing character
        char = this._getLineChar(point.prev, point, point.next);
      }

      // Apply paint mode
      const beforeCell = activeLayer.getCell(point.x, point.y);
      const afterCell = this._applyPaintMode(char, beforeCell);

      cells.push({ x: point.x, y: point.y, cell: afterCell });
    }

    return cells;
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
   * Draw the actual line and create undo command
   * @private
   */
  _drawLine(scene, stateManager) {
    const activeLayer = scene.getActiveLayer();

    if (!activeLayer || !this.commandHistory) {
      return;
    }

    // Calculate line points using Bresenham - use connected mode for smart drawing
    const points = this._bresenham(
      this.startX,
      this.startY,
      this.currentX,
      this.currentY,
      this.drawingMode !== "normal",
    );

    // Get cells for the line
    const cells = this._getLineCells(points, scene);

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
      tool: "line",
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
