/**
 * Cell - Represents a single character cell in the grid
 *
 * Each cell contains:
 * - ch: The character/glyph to display
 * - fg: Foreground color index (0-7)
 * - bg: Background color index (-1 for transparent, 0-7 for colors)
 */
export class Cell {
  /**
   * Create a new Cell
   * @param {string} ch - Character (default: space)
   * @param {number} fg - Foreground color index 0-7 (default: 7 = white)
   * @param {number} bg - Background color index -1 to 7 (default: -1 = transparent)
   */
  constructor(ch = ' ', fg = 7, bg = -1) {
    this.ch = ch;
    this.fg = fg;
    this.bg = bg;
  }

  /**
   * Create a copy of this cell
   * @returns {Cell} New cell with same values
   */
  clone() {
    return new Cell(this.ch, this.fg, this.bg);
  }

  /**
   * Check if this cell equals another cell
   * @param {Cell} other - Cell to compare with
   * @returns {boolean} True if all properties match
   */
  equals(other) {
    if (!other) return false;
    return this.ch === other.ch && this.fg === other.fg && this.bg === other.bg;
  }

  /**
   * Check if this cell is empty (space with transparent background)
   * @returns {boolean} True if cell is default/empty
   */
  isEmpty() {
    return this.ch === ' ' && this.bg === -1;
  }

  /**
   * Reset cell to default values
   */
  clear() {
    this.ch = ' ';
    this.fg = 7;
    this.bg = -1;
  }

  /**
   * Create a cell from a plain object
   * @param {Object} obj - Plain object with ch, fg, bg properties
   * @returns {Cell} New cell instance
   */
  static fromObject(obj) {
    return new Cell(obj.ch, obj.fg, obj.bg);
  }

  /**
   * Convert cell to plain object (for JSON serialization)
   * @returns {Object} Plain object representation
   */
  toObject() {
    return {
      ch: this.ch,
      fg: this.fg,
      bg: this.bg
    };
  }
}
