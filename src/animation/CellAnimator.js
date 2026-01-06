/**
 * CellAnimator - Calculates animation frames for individual cells
 *
 * Animation structure with separate glyph/fg/bg animations:
 * anim: {
 *   glyph: { frames: ['★','✦'], speed: 500, offset: 0, cycleMode: 'forward' },
 *   fg: { colors: [1,2,3], speed: 250, offset: 0, cycleMode: 'pingpong' },
 *   bg: { colors: [0,-1], speed: 1000, offset: 0, cycleMode: 'forward' }
 * }
 */
export class CellAnimator {
  /**
   * Calculate the current visual state of an animated cell
   * @param {Cell} cell - The cell with animation config
   * @param {number} timestamp - Current time in ms
   * @returns {Object} Visual state {ch, fg, bg, visible}
   */
  static getFrame(cell, timestamp) {
    if (!cell.anim) {
      return { ch: cell.ch, fg: cell.fg, bg: cell.bg, visible: true };
    }

    return CellAnimator.getAnimatedFrame(cell, timestamp);
  }

  /**
   * Get frame for animated cell with separate glyph/fg/bg animations
   * @param {Cell} cell - The cell with animation config
   * @param {number} timestamp - Current time in ms
   * @returns {Object} Visual state {ch, fg, bg, visible}
   */
  static getAnimatedFrame(cell, timestamp) {
    let ch = cell.ch;
    let fg = cell.fg;
    let bg = cell.bg;

    // Process glyph animation
    if (cell.anim.glyph) {
      const glyphAnim = cell.anim.glyph;
      const frames = glyphAnim.frames || [cell.ch];
      if (frames.length > 0) {
        const index = CellAnimator.getCycleIndex(
          timestamp + (glyphAnim.offset || 0),
          glyphAnim.speed || 500,
          frames.length,
          glyphAnim.cycleMode || "forward",
        );
        ch = frames[index];
      }
    }

    // Process foreground color animation
    if (cell.anim.fg) {
      const fgAnim = cell.anim.fg;
      const colors = fgAnim.colors || [cell.fg];
      if (colors.length > 0) {
        const index = CellAnimator.getCycleIndex(
          timestamp + (fgAnim.offset || 0),
          fgAnim.speed || 500,
          colors.length,
          fgAnim.cycleMode || "forward",
        );
        fg = colors[index];
      }
    }

    // Process background color animation
    if (cell.anim.bg) {
      const bgAnim = cell.anim.bg;
      const colors = bgAnim.colors || [cell.bg];
      if (colors.length > 0) {
        const index = CellAnimator.getCycleIndex(
          timestamp + (bgAnim.offset || 0),
          bgAnim.speed || 500,
          colors.length,
          bgAnim.cycleMode || "forward",
        );
        bg = colors[index];
      }
    }

    return { ch, fg, bg, visible: true };
  }

  /**
   * Calculate frame index based on cycle mode
   * @param {number} time - Current time with offset applied
   * @param {number} speed - Ms per frame
   * @param {number} length - Number of items in the cycle
   * @param {string} cycleMode - "forward", "reverse", "pingpong", or "random"
   * @returns {number} Index into the cycle array
   */
  static getCycleIndex(time, speed, length, cycleMode) {
    if (length <= 1) return 0;

    const rawIndex = Math.floor(time / speed);

    switch (cycleMode) {
      case "reverse":
        return length - 1 - (rawIndex % length);

      case "pingpong": {
        // For pingpong, we cycle 0,1,2,1,0,1,2,1,0... (length*2-2 period)
        const period = length * 2 - 2;
        const pos = rawIndex % period;
        return pos < length ? pos : period - pos;
      }

      case "random": {
        // Use time segment as seed for pseudo-random
        const segment = rawIndex;
        const hash = (segment * 2654435761) >>> 0;
        return hash % length;
      }

      case "forward":
      default:
        return rawIndex % length;
    }
  }
}
