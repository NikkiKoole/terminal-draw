/**
 * Cell - Represents a single character cell in the grid
 *
 * Each cell contains:
 * - ch: The character/glyph to display
 * - fg: Foreground color index (0-7)
 * - bg: Background color index (-1 for transparent, 0-7 for colors)
 * - anim: Optional animation configuration
 *
 * Animation types:
 * - blink: Cell blinks on/off
 * - flicker: Random blink timing (like a failing light)
 * - colorCycle: Cycles through foreground colors
 * - charCycle: Cycles through characters
 */
export class Cell {
  /**
   * Create a new Cell
   * @param {string} ch - Character (default: space)
   * @param {number} fg - Foreground color index 0-7 (default: 7 = white)
   * @param {number} bg - Background color index -1 to 7 (default: -1 = transparent)
   * @param {Object} anim - Optional animation config {type, speed, frames?, colors?}
   */
  constructor(ch = " ", fg = 7, bg = -1, anim = null) {
    this.ch = ch;
    this.fg = fg;
    this.bg = bg;
    this.anim = anim;
  }

  /**
   * Create a copy of this cell
   * @returns {Cell} New cell with same values
   */
  clone() {
    const cell = new Cell(this.ch, this.fg, this.bg);
    if (this.anim) {
      cell.anim = { ...this.anim };
      if (this.anim.frames) cell.anim.frames = [...this.anim.frames];
      if (this.anim.colors) cell.anim.colors = [...this.anim.colors];
    }
    return cell;
  }

  /**
   * Check if this cell equals another cell
   * @param {Cell} other - Cell to compare with
   * @returns {boolean} True if all properties match
   */
  equals(other) {
    if (!other) return false;
    if (this.ch !== other.ch || this.fg !== other.fg || this.bg !== other.bg) {
      return false;
    }
    // Compare animation
    if (this.anim === other.anim) return true;
    if (!this.anim || !other.anim) return false;
    return (
      this.anim.type === other.anim.type &&
      this.anim.speed === other.anim.speed &&
      JSON.stringify(this.anim.frames) === JSON.stringify(other.anim.frames) &&
      JSON.stringify(this.anim.colors) === JSON.stringify(other.anim.colors)
    );
  }

  /**
   * Check if this cell is empty (space with transparent background)
   * @returns {boolean} True if cell is default/empty
   */
  isEmpty() {
    return this.ch === " " && this.bg === -1;
  }

  /**
   * Reset cell to default values
   */
  clear() {
    this.ch = " ";
    this.fg = 7;
    this.bg = -1;
    this.anim = null;
  }

  /**
   * Check if this cell has an animation
   * @returns {boolean} True if cell has animation config
   */
  hasAnimation() {
    return this.anim !== null;
  }

  /**
   * Set animation on this cell
   * @param {string} type - Animation type: blink, flicker, colorCycle, charCycle
   * @param {number} speed - Milliseconds per frame
   * @param {Object} options - Additional options (frames for charCycle, colors for colorCycle)
   */
  setAnimation(type, speed = 500, options = {}) {
    this.anim = { type, speed, ...options };
  }

  /**
   * Remove animation from this cell
   */
  clearAnimation() {
    this.anim = null;
  }

  /**
   * Create a cell from a plain object
   * @param {Object} obj - Plain object with ch, fg, bg, anim? properties
   * @returns {Cell} New cell instance
   */
  static fromObject(obj) {
    const cell = new Cell(obj.ch, obj.fg, obj.bg);
    if (obj.anim) {
      cell.anim = { ...obj.anim };
      if (obj.anim.frames) cell.anim.frames = [...obj.anim.frames];
      if (obj.anim.colors) cell.anim.colors = [...obj.anim.colors];
    }
    return cell;
  }

  /**
   * Convert cell to plain object (for JSON serialization)
   * @returns {Object} Plain object representation
   */
  toObject() {
    const obj = {
      ch: this.ch,
      fg: this.fg,
      bg: this.bg,
    };
    if (this.anim) {
      obj.anim = { ...this.anim };
      if (this.anim.frames) obj.anim.frames = [...this.anim.frames];
      if (this.anim.colors) obj.anim.colors = [...this.anim.colors];
    }
    return obj;
  }
}
