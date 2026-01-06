/**
 * Layer - Represents a layer containing a 2D grid of cells
 *
 * A layer contains:
 * - id: Unique identifier (e.g., 'bg', 'mid', 'fg')
 * - name: Display name
 * - visible: Whether the layer is rendered
 * - locked: Whether the layer can be edited
 * - ligatures: Whether font ligatures are enabled
 * - cells: Flat array of Cell objects (length = width * height)
 */

import { Cell } from "./Cell.js";

export class Layer {
  /**
   * Create a new Layer
   * @param {string} id - Unique layer identifier
   * @param {string} name - Display name
   * @param {number} width - Grid width
   * @param {number} height - Grid height
   */
  constructor(id, name, width, height) {
    this.id = id;
    this.name = name;
    this.width = width;
    this.height = height;
    this.visible = true;
    this.locked = false;
    this.ligatures = false;

    // Initialize cells array with default cells
    this.cells = [];
    for (let i = 0; i < width * height; i++) {
      this.cells.push(new Cell());
    }
  }

  /**
   * Convert (x, y) coordinates to array index
   * @param {number} x - X coordinate (0-based)
   * @param {number} y - Y coordinate (0-based)
   * @returns {number} Array index
   */
  getCellIndex(x, y) {
    return y * this.width + x;
  }

  /**
   * Check if coordinates are within bounds
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {boolean} True if coordinates are valid
   */
  isValidCoord(x, y) {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  /**
   * Get cell at coordinates
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {Cell|null} Cell at position or null if out of bounds
   */
  getCell(x, y) {
    if (!this.isValidCoord(x, y)) {
      return null;
    }
    const index = this.getCellIndex(x, y);
    return this.cells[index];
  }

  /**
   * Set cell at coordinates
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {Cell|Object} cell - Cell object or plain object with {ch, fg, bg}
   * @returns {boolean} True if cell was set, false if out of bounds
   */
  setCell(x, y, cell) {
    if (!this.isValidCoord(x, y)) {
      return false;
    }

    const index = this.getCellIndex(x, y);

    // If it's a plain object, convert to Cell
    if (cell instanceof Cell) {
      this.cells[index] = cell.clone();
    } else {
      // Use Cell.fromObject to properly restore all properties including anim
      this.cells[index] = Cell.fromObject(cell);
    }

    return true;
  }

  /**
   * Clear all cells to default values
   */
  clear() {
    for (let i = 0; i < this.cells.length; i++) {
      this.cells[i].clear();
    }
  }

  /**
   * Fill entire layer with a specific cell
   * @param {Cell|Object} cell - Cell to fill with
   */
  fill(cell) {
    const fillCell =
      cell instanceof Cell ? cell : new Cell(cell.ch, cell.fg, cell.bg);

    for (let i = 0; i < this.cells.length; i++) {
      this.cells[i] = fillCell.clone();
    }
  }

  /**
   * Copy a rectangular region from this layer
   * @param {number} x - Start X coordinate
   * @param {number} y - Start Y coordinate
   * @param {number} width - Region width
   * @param {number} height - Region height
   * @returns {Cell[][]} 2D array of cells
   */
  getRegion(x, y, width, height) {
    const region = [];

    for (let dy = 0; dy < height; dy++) {
      const row = [];
      for (let dx = 0; dx < width; dx++) {
        const cell = this.getCell(x + dx, y + dy);
        row.push(cell ? cell.clone() : new Cell());
      }
      region.push(row);
    }

    return region;
  }

  /**
   * Paste a rectangular region into this layer
   * @param {number} x - Start X coordinate
   * @param {number} y - Start Y coordinate
   * @param {Cell[][]} region - 2D array of cells
   * @returns {number} Number of cells pasted
   */
  setRegion(x, y, region) {
    let count = 0;

    for (let dy = 0; dy < region.length; dy++) {
      const row = region[dy];
      for (let dx = 0; dx < row.length; dx++) {
        if (this.setCell(x + dx, y + dy, row[dx])) {
          count++;
        }
      }
    }

    return count;
  }

  /**
   * Create a copy of this layer
   * @returns {Layer} New layer with same data
   */
  clone() {
    const newLayer = new Layer(this.id, this.name, this.width, this.height);
    newLayer.visible = this.visible;
    newLayer.locked = this.locked;
    newLayer.ligatures = this.ligatures;

    // Clone all cells
    for (let i = 0; i < this.cells.length; i++) {
      newLayer.cells[i] = this.cells[i].clone();
    }

    return newLayer;
  }

  /**
   * Convert layer to plain object (for JSON serialization)
   * @returns {Object} Plain object representation
   */
  toObject() {
    return {
      id: this.id,
      name: this.name,
      width: this.width,
      height: this.height,
      visible: this.visible,
      locked: this.locked,
      ligatures: this.ligatures,
      cells: this.cells.map((cell) => cell.toObject()),
    };
  }

  /**
   * Create layer from plain object
   * @param {Object} obj - Plain object with layer data
   * @returns {Layer} New layer instance
   */
  static fromObject(obj) {
    const layer = new Layer(obj.id, obj.name, obj.width, obj.height);
    layer.visible = obj.visible;
    layer.locked = obj.locked;
    layer.ligatures = obj.ligatures;

    // Restore cells
    if (obj.cells) {
      layer.cells = obj.cells.map((cellData) => Cell.fromObject(cellData));
    }

    return layer;
  }

  /**
   * Get statistics about the layer
   * @returns {Object} Statistics object
   */
  getStats() {
    let emptyCount = 0;
    let nonEmptyCount = 0;
    const charFrequency = {};

    for (const cell of this.cells) {
      if (cell.isEmpty()) {
        emptyCount++;
      } else {
        nonEmptyCount++;
        charFrequency[cell.ch] = (charFrequency[cell.ch] || 0) + 1;
      }
    }

    return {
      totalCells: this.cells.length,
      emptyCount,
      nonEmptyCount,
      charFrequency,
    };
  }
}
