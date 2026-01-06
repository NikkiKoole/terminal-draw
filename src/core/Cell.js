/**
 * Cell - Represents a single character cell in the grid
 *
 * Each cell contains:
 * - ch: The character/glyph to display
 * - fg: Foreground color index (0-7)
 * - bg: Background color index (-1 for transparent, 0-7 for colors)
 * - anim: Optional animation configuration with separate glyph/fg/bg animations
 *
 * Animation structure:
 * anim: {
 *   glyph: { frames: ['★','✦'], speed: 500, offset: 0, cycleMode: 'forward' },
 *   fg: { colors: [1,2,3], speed: 250, offset: 0, cycleMode: 'pingpong' },
 *   bg: { colors: [0,-1], speed: 1000, offset: 0, cycleMode: 'forward' }
 * }
 *
 * Each sub-animation is optional. Color -1 = transparent.
 */
export class Cell {
  /**
   * Create a new Cell
   * @param {string} ch - Character (default: space)
   * @param {number} fg - Foreground color index 0-7 (default: 7 = white)
   * @param {number} bg - Background color index -1 to 7 (default: -1 = transparent)
   * @param {Object} anim - Optional animation config {glyph?, fg?, bg?}
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
      cell.anim = Cell.cloneAnim(this.anim);
    }
    return cell;
  }

  /**
   * Deep clone an animation config
   * @param {Object} anim - Animation config to clone
   * @returns {Object} Cloned animation config
   */
  static cloneAnim(anim) {
    if (!anim) return null;

    const cloned = {};

    if (anim.glyph) {
      cloned.glyph = { ...anim.glyph };
      if (anim.glyph.frames) cloned.glyph.frames = [...anim.glyph.frames];
    }

    if (anim.fg) {
      cloned.fg = { ...anim.fg };
      if (anim.fg.colors) cloned.fg.colors = [...anim.fg.colors];
    }

    if (anim.bg) {
      cloned.bg = { ...anim.bg };
      if (anim.bg.colors) cloned.bg.colors = [...anim.bg.colors];
    }

    return cloned;
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
    return JSON.stringify(this.anim) === JSON.stringify(other.anim);
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
    if (!this.anim) return false;
    // Check if any sub-animation exists
    return !!(this.anim.glyph || this.anim.fg || this.anim.bg);
  }

  /**
   * Set glyph animation on this cell
   * @param {string[]} frames - Characters to cycle through
   * @param {number} speed - Milliseconds per frame
   * @param {Object} options - Additional options (offset, cycleMode)
   */
  setGlyphAnimation(frames, speed = 500, options = {}) {
    if (!this.anim) this.anim = {};
    this.anim.glyph = { frames: [...frames], speed, ...options };
  }

  /**
   * Set foreground color animation on this cell
   * @param {number[]} colors - Color indices to cycle through (0-7, -1 for transparent)
   * @param {number} speed - Milliseconds per frame
   * @param {Object} options - Additional options (offset, cycleMode)
   */
  setFgAnimation(colors, speed = 500, options = {}) {
    if (!this.anim) this.anim = {};
    this.anim.fg = { colors: [...colors], speed, ...options };
  }

  /**
   * Set background color animation on this cell
   * @param {number[]} colors - Color indices to cycle through (0-7, -1 for transparent)
   * @param {number} speed - Milliseconds per frame
   * @param {Object} options - Additional options (offset, cycleMode)
   */
  setBgAnimation(colors, speed = 500, options = {}) {
    if (!this.anim) this.anim = {};
    this.anim.bg = { colors: [...colors], speed, ...options };
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
      cell.anim = Cell.cloneAnim(obj.anim);
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
      obj.anim = Cell.cloneAnim(this.anim);
    }
    return obj;
  }
}
