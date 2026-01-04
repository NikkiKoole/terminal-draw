/**
 * CircleTool.js - Draw circle outlines and filled circles using Bresenham algorithm
 *
 * The circle tool allows users to draw circles by click-dragging to define radius.
 * Supports both outline and filled modes with ASCII character approximation.
 * Uses the Bresenham circle algorithm for perfect circular shapes.
 */

import { Tool } from "./Tool.js";
import { Cell } from "../core/Cell.js";
import { CellCommand } from "../commands/CellCommand.js";

export class CircleTool extends Tool {
  /**
   * Create a new circle tool
   * @param {object} currentCell - Initial cell to draw with {ch, fg, bg}
   * @param {CommandHistory} commandHistory - Command history for undo/redo
   */
  constructor(currentCell = { ch: "█", fg: 7, bg: -1 }, commandHistory = null) {
    super("Circle");
    this.currentCell = { ...currentCell };
    this.commandHistory = commandHistory;
    this.drawingMode = "normal"; // "normal", "single", or "double"
    this.paintMode = "all"; // "all", "fg", "bg", "glyph"
    this.fillMode = "outline"; // "outline" or "filled"
    this.ellipseMode = false; // false for circle, true for ellipse

    // Circle state
    this.isDrawing = false;
    this.centerX = null;
    this.centerY = null;
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
   * Set ellipse mode
   * @param {boolean} enabled - True for ellipse, false for circle
   */
  setEllipseMode(enabled) {
    this.ellipseMode = enabled;
  }

  /**
   * Get current ellipse mode
   * @returns {boolean} True if ellipse mode, false if circle mode
   */
  getEllipseMode() {
    return this.ellipseMode;
  }

  /**
   * Start drawing a circle
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
    this.centerX = x;
    this.centerY = y;
    this.currentX = x;
    this.currentY = y;

    // Show anchor indicator at center position
    if (stateManager) {
      stateManager.emit("circle:anchor", { x, y });
    }
  }

  /**
   * Update circle preview while dragging
   */
  onCellDrag(x, y, scene, stateManager, eventData = {}) {
    if (!this.isDrawing) {
      return;
    }

    this.currentX = x;
    this.currentY = y;

    // Emit circle preview event with current radius/ellipse data and center
    if (stateManager) {
      if (this.ellipseMode) {
        const { radiusX, radiusY } = this._getEllipseRadii();
        stateManager.emit("circle:preview", {
          centerX: this.centerX,
          centerY: this.centerY,
          radiusX: radiusX,
          radiusY: radiusY,
          fillMode: this.fillMode,
          ellipseMode: true,
        });
      } else {
        const radius = this._getRadius();
        stateManager.emit("circle:preview", {
          centerX: this.centerX,
          centerY: this.centerY,
          radius: radius,
          fillMode: this.fillMode,
          ellipseMode: false,
        });
      }
    }
  }

  /**
   * Finish drawing the circle
   */
  onCellUp(x, y, scene, stateManager, eventData = {}) {
    if (!this.isDrawing) {
      return;
    }

    this.currentX = x;
    this.currentY = y;

    // Draw the actual circle
    this._drawCircle(scene, stateManager);

    // Hide anchor indicator and preview
    if (stateManager) {
      stateManager.emit("circle:anchor", { x: null, y: null });
      stateManager.emit("circle:preview", {
        centerX: null,
        centerY: null,
        radius: 0,
      });
    }

    // Reset state
    this.isDrawing = false;
    this.centerX = null;
    this.centerY = null;
    this.currentX = null;
    this.currentY = null;

    // Disable merging briefly to prevent next circle from merging with this one
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
   * Calculate circle radius from center to current drag position
   * @returns {number} Circle radius
   * @private
   */
  _getRadius() {
    const dx = this.currentX - this.centerX;
    const dy = this.currentY - this.centerY;
    return Math.round(Math.sqrt(dx * dx + dy * dy));
  }

  /**
   * Get ellipse dimensions from center to current drag position
   * @returns {object} {radiusX, radiusY} Ellipse radii
   * @private
   */
  _getEllipseRadii() {
    const dx = Math.abs(this.currentX - this.centerX);
    const dy = Math.abs(this.currentY - this.centerY);
    return { radiusX: dx, radiusY: dy };
  }

  /**
   * Get cells for circle using Bresenham circle algorithm
   * @param {Scene} scene - Scene instance
   * @returns {Array} Array of {x, y, cell} objects
   * @private
   */
  _getCircleCells(scene) {
    if (this.fillMode === "filled") {
      return this._getFilledCircleCells(scene);
    } else {
      return this._getOutlineCircleCells(scene);
    }
  }

  /**
   * Get cells for circle outline using Bresenham algorithm
   * @param {Scene} scene - Scene instance
   * @returns {Array} Array of {x, y, cell} objects
   * @private
   */
  _getOutlineCircleCells(scene) {
    const cells = [];
    const activeLayer = scene.getActiveLayer();

    if (!activeLayer) {
      return cells;
    }

    if (this.ellipseMode) {
      return this._getOutlineEllipseCells(scene);
    }

    const radius = this._getRadius();
    if (radius === 0) {
      // Single point circle
      const char = this._getCircleChar();
      const beforeCell =
        activeLayer.getCell(this.centerX, this.centerY) || new Cell(" ", 7, -1);
      const afterCell = this._applyPaintMode(char, beforeCell);
      cells.push({ x: this.centerX, y: this.centerY, cell: afterCell });
      return cells;
    }

    // Bresenham circle algorithm - use connected mode for smart drawing
    const circlePoints = this._bresenhamCircle(
      this.centerX,
      this.centerY,
      radius,
      this.drawingMode !== "normal",
    );

    // For smart mode, collect all circle positions first
    const circlePositions = new Set();
    if (this.drawingMode !== "normal") {
      for (const point of circlePoints) {
        if (
          point.x >= 0 &&
          point.x < scene.w &&
          point.y >= 0 &&
          point.y < scene.h
        ) {
          circlePositions.add(`${point.x},${point.y}`);
        }
      }
    }

    for (const point of circlePoints) {
      const { x, y } = point;

      // Check bounds
      if (x >= 0 && x < scene.w && y >= 0 && y < scene.h) {
        let char;
        if (this.drawingMode === "normal") {
          char = this._getCircleChar();
        } else {
          // Smart mode: select box-drawing character based on neighbors
          char = this._getSmartCircleChar(x, y, circlePositions);
        }
        const beforeCell = activeLayer.getCell(x, y) || new Cell(" ", 7, -1);
        const afterCell = this._applyPaintMode(char, beforeCell);
        cells.push({ x, y, cell: afterCell });
      }
    }

    return cells;
  }

  /**
   * Get cells for ellipse outline
   * @param {Scene} scene - Scene instance
   * @returns {Array} Array of {x, y, cell} objects
   * @private
   */
  _getOutlineEllipseCells(scene) {
    const cells = [];
    const activeLayer = scene.getActiveLayer();

    if (!activeLayer) {
      return cells;
    }

    const { radiusX, radiusY } = this._getEllipseRadii();

    if (radiusX === 0 && radiusY === 0) {
      // Single point
      const char = this._getCircleChar();
      const beforeCell =
        activeLayer.getCell(this.centerX, this.centerY) || new Cell(" ", 7, -1);
      const afterCell = this._applyPaintMode(char, beforeCell);
      cells.push({ x: this.centerX, y: this.centerY, cell: afterCell });
      return cells;
    }

    // Generate ellipse outline points - use connected mode for smart drawing
    const ellipsePoints = this._bresenhamEllipse(
      this.centerX,
      this.centerY,
      radiusX,
      radiusY,
      this.drawingMode !== "normal",
    );

    // For smart mode, collect all ellipse positions first
    const ellipsePositions = new Set();
    if (this.drawingMode !== "normal") {
      for (const point of ellipsePoints) {
        if (
          point.x >= 0 &&
          point.x < scene.w &&
          point.y >= 0 &&
          point.y < scene.h
        ) {
          ellipsePositions.add(`${point.x},${point.y}`);
        }
      }
    }

    for (const point of ellipsePoints) {
      const { x, y } = point;

      // Check bounds
      if (x >= 0 && x < scene.w && y >= 0 && y < scene.h) {
        let char;
        if (this.drawingMode === "normal") {
          char = this._getCircleChar();
        } else {
          // Smart mode: select box-drawing character based on neighbors
          char = this._getSmartCircleChar(x, y, ellipsePositions);
        }
        const beforeCell = activeLayer.getCell(x, y) || new Cell(" ", 7, -1);
        const afterCell = this._applyPaintMode(char, beforeCell);
        cells.push({ x, y, cell: afterCell });
      }
    }

    return cells;
  }

  /**
   * Get cells for filled circle
   * @param {Scene} scene - Scene instance
   * @returns {Array} Array of {x, y, cell} objects
   * @private
   */
  _getFilledCircleCells(scene) {
    const cells = [];
    const activeLayer = scene.getActiveLayer();

    if (!activeLayer) {
      return cells;
    }

    if (this.ellipseMode) {
      return this._getFilledEllipseCells(scene);
    }

    const radius = this._getRadius();
    if (radius === 0) {
      // Single point circle
      const char = this._getCircleChar();
      const beforeCell =
        activeLayer.getCell(this.centerX, this.centerY) || new Cell(" ", 7, -1);
      const afterCell = this._applyPaintMode(char, beforeCell);
      cells.push({ x: this.centerX, y: this.centerY, cell: afterCell });
      return cells;
    }

    // Fill circle by checking each point within bounding box
    const minX = Math.max(0, this.centerX - radius);
    const maxX = Math.min(scene.w - 1, this.centerX + radius);
    const minY = Math.max(0, this.centerY - radius);
    const maxY = Math.min(scene.h - 1, this.centerY + radius);

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const dx = x - this.centerX;
        const dy = y - this.centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Include point if it's inside or on the circle
        if (distance <= radius) {
          const char = this._getCircleChar();
          const beforeCell = activeLayer.getCell(x, y) || new Cell(" ", 7, -1);
          const afterCell = this._applyPaintMode(char, beforeCell);
          cells.push({ x, y, cell: afterCell });
        }
      }
    }

    return cells;
  }

  /**
   * Get cells for filled ellipse
   * @param {Scene} scene - Scene instance
   * @returns {Array} Array of {x, y, cell} objects
   * @private
   */
  _getFilledEllipseCells(scene) {
    const cells = [];
    const activeLayer = scene.getActiveLayer();

    if (!activeLayer) {
      return cells;
    }

    const { radiusX, radiusY } = this._getEllipseRadii();

    if (radiusX === 0 && radiusY === 0) {
      // Single point
      const char = this._getCircleChar();
      const beforeCell =
        activeLayer.getCell(this.centerX, this.centerY) || new Cell(" ", 7, -1);
      const afterCell = this._applyPaintMode(char, beforeCell);
      cells.push({ x: this.centerX, y: this.centerY, cell: afterCell });
      return cells;
    }

    // Fill ellipse by checking each point within bounding box
    const minX = Math.max(0, this.centerX - radiusX);
    const maxX = Math.min(scene.w - 1, this.centerX + radiusX);
    const minY = Math.max(0, this.centerY - radiusY);
    const maxY = Math.min(scene.h - 1, this.centerY + radiusY);

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const dx = x - this.centerX;
        const dy = y - this.centerY;

        // Ellipse equation: (dx/radiusX)² + (dy/radiusY)² <= 1
        const ellipseValue =
          (dx * dx) / (radiusX * radiusX) + (dy * dy) / (radiusY * radiusY);

        if (ellipseValue <= 1) {
          const char = this._getCircleChar();
          const beforeCell = activeLayer.getCell(x, y) || new Cell(" ", 7, -1);
          const afterCell = this._applyPaintMode(char, beforeCell);
          cells.push({ x, y, cell: afterCell });
        }
      }
    }

    return cells;
  }

  /**
   * Generate circle outline using Bresenham algorithm
   * @param {number} centerX - Center X coordinate
   * @param {number} centerY - Center Y coordinate
   * @param {number} radius - Circle radius
   * @param {boolean} connected - If true, ensures 4-connectivity (no diagonal gaps)
   * @returns {Array} Array of {x, y} points
   * @private
   */
  _bresenhamCircle(centerX, centerY, radius, connected = false) {
    const points = [];
    let x = 0;
    let y = radius;
    let d = 3 - 2 * radius;

    // Add initial points
    this._addCirclePoints(points, centerX, centerY, x, y);

    while (y >= x) {
      const prevY = y;
      x++;

      if (d > 0) {
        y--;
        d = d + 4 * (x - y) + 10;
      } else {
        d = d + 4 * x + 6;
      }

      // If connected mode and we moved diagonally, add connecting point
      if (connected && y !== prevY && x > 0) {
        this._addCirclePoints(points, centerX, centerY, x, prevY);
      }

      this._addCirclePoints(points, centerX, centerY, x, y);
    }

    return points;
  }

  /**
   * Bresenham ellipse algorithm to get ellipse outline points
   * @param {number} centerX - Ellipse center X coordinate
   * @param {number} centerY - Ellipse center Y coordinate
   * @param {number} radiusX - Horizontal radius
   * @param {number} radiusY - Vertical radius
   * @param {boolean} connected - If true, ensures 4-connectivity (no diagonal gaps)
   * @returns {Array} Array of {x, y} points on ellipse outline
   * @private
   */
  _bresenhamEllipse(centerX, centerY, radiusX, radiusY, connected = false) {
    const points = [];

    if (radiusX === 0 && radiusY === 0) {
      points.push({ x: centerX, y: centerY });
      return points;
    }

    if (radiusX === 0) {
      // Vertical line
      for (let y = centerY - radiusY; y <= centerY + radiusY; y++) {
        points.push({ x: centerX, y: y });
      }
      return points;
    }

    if (radiusY === 0) {
      // Horizontal line
      for (let x = centerX - radiusX; x <= centerX + radiusX; x++) {
        points.push({ x: x, y: centerY });
      }
      return points;
    }

    let x = 0;
    let y = radiusY;
    let radiusX2 = radiusX * radiusX;
    let radiusY2 = radiusY * radiusY;
    let twoRadiusX2 = 2 * radiusX2;
    let twoRadiusY2 = 2 * radiusY2;
    let p;
    let px = 0;
    let py = twoRadiusX2 * y;

    // Region 1
    this._addEllipsePoints(points, centerX, centerY, x, y);
    p = Math.round(radiusY2 - radiusX2 * radiusY + 0.25 * radiusX2);

    while (px < py) {
      const prevX = x;
      const prevY = y;

      x++;
      px += twoRadiusY2;
      if (p < 0) {
        p += radiusY2 + px;
      } else {
        y--;
        py -= twoRadiusX2;
        p += radiusY2 + px - py;
      }

      // If connected mode and we moved diagonally, add connecting point
      if (connected && x !== prevX && y !== prevY) {
        this._addEllipsePoints(points, centerX, centerY, x, prevY);
      }

      this._addEllipsePoints(points, centerX, centerY, x, y);
    }

    // Region 2
    p = Math.round(
      radiusY2 * (x + 0.5) * (x + 0.5) +
        radiusX2 * (y - 1) * (y - 1) -
        radiusX2 * radiusY2,
    );

    while (y > 0) {
      const prevX = x;
      const prevY = y;

      y--;
      py -= twoRadiusX2;
      if (p > 0) {
        p += radiusX2 - py;
      } else {
        x++;
        px += twoRadiusY2;
        p += radiusX2 - py + px;
      }

      // If connected mode and we moved diagonally, add connecting point
      if (connected && x !== prevX && y !== prevY) {
        this._addEllipsePoints(points, centerX, centerY, prevX, y);
      }

      this._addEllipsePoints(points, centerX, centerY, x, y);
    }

    return points;
  }

  /**
   * Add 4-fold symmetric points for ellipse
   * @param {Array} points - Array to add points to
   * @param {number} centerX - Ellipse center X
   * @param {number} centerY - Ellipse center Y
   * @param {number} x - Current x offset
   * @param {number} y - Current y offset
   * @private
   */
  _addEllipsePoints(points, centerX, centerY, x, y) {
    points.push({ x: centerX + x, y: centerY + y });
    points.push({ x: centerX - x, y: centerY + y });
    points.push({ x: centerX + x, y: centerY - y });
    points.push({ x: centerX - x, y: centerY - y });
  }

  /**
   * Add 8-fold symmetric points for circle
   * @param {Array} points - Array to add points to
   * @param {number} centerX - Circle center X
   * @param {number} centerY - Circle center Y
   * @param {number} x - Current x offset
   * @param {number} y - Current y offset
   * @private
   */
  _addCirclePoints(points, centerX, centerY, x, y) {
    points.push({ x: centerX + x, y: centerY + y });
    points.push({ x: centerX - x, y: centerY + y });
    points.push({ x: centerX + x, y: centerY - y });
    points.push({ x: centerX - x, y: centerY - y });
    points.push({ x: centerX + y, y: centerY + x });
    points.push({ x: centerX - y, y: centerY + x });
    points.push({ x: centerX + y, y: centerY - x });
    points.push({ x: centerX - y, y: centerY - x });
  }

  /**
   * Get character to use for circle based on drawing mode
   * @returns {string} Character to use
   * @private
   */
  _getCircleChar() {
    if (this.drawingMode === "single") {
      return "─"; // Use horizontal line for single mode
    } else if (this.drawingMode === "double") {
      return "═"; // Use double horizontal line for double mode
    } else {
      return this.currentCell.ch; // Use selected glyph for normal mode
    }
  }

  /**
   * Get box-drawing character set based on drawing mode
   * @returns {object} Character set
   * @private
   */
  _getBoxDrawingCharSet() {
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
    }
    // Shouldn't reach here in smart mode
    return {};
  }

  /**
   * Get smart circle character based on neighboring positions
   * @param {number} x - Current x position
   * @param {number} y - Current y position
   * @param {Set} positions - Set of all circle/ellipse position keys
   * @returns {string} Appropriate box-drawing character
   * @private
   */
  _getSmartCircleChar(x, y, positions) {
    const chars = this._getBoxDrawingCharSet();

    // Check 4-directional neighbors
    const hasLeft = positions.has(`${x - 1},${y}`);
    const hasRight = positions.has(`${x + 1},${y}`);
    const hasUp = positions.has(`${x},${y - 1}`);
    const hasDown = positions.has(`${x},${y + 1}`);

    // Count connections
    const connectionCount = [hasLeft, hasRight, hasUp, hasDown].filter(
      Boolean,
    ).length;

    // Select character based on connection pattern
    if (connectionCount === 1) {
      if (hasLeft || hasRight) return chars.horizontal;
      if (hasUp || hasDown) return chars.vertical;
    }

    if (connectionCount === 2) {
      // Straight lines
      if (hasLeft && hasRight) return chars.horizontal;
      if (hasUp && hasDown) return chars.vertical;

      // Corners
      if (hasRight && hasDown) return chars.topLeft;
      if (hasLeft && hasDown) return chars.topRight;
      if (hasRight && hasUp) return chars.bottomLeft;
      if (hasLeft && hasUp) return chars.bottomRight;
    }

    // For 3+ connections or no connections, use horizontal as fallback
    return chars.horizontal;
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
   * Draw the actual circle and create undo command
   * @private
   */
  _drawCircle(scene, stateManager) {
    const activeLayer = scene.getActiveLayer();

    if (!activeLayer || !this.commandHistory) {
      return;
    }

    const cells = this._getCircleCells(scene);

    if (cells.length === 0) {
      return;
    }

    // Collect before/after states for all cells
    const changes = [];
    for (const { x, y, cell } of cells) {
      const index = y * scene.w + x;
      const before = activeLayer.getCell(x, y) || new Cell(" ", 7, -1);

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
      tool: "circle",
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
