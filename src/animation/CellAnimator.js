/**
 * CellAnimator - Calculates animation frames for individual cells
 *
 * Supports animation types:
 * - blink: Cell toggles between visible and invisible
 * - flicker: Random on/off timing (like a failing light)
 * - colorCycle: Cycles through foreground colors
 * - charCycle: Cycles through characters
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

    const { type, speed } = cell.anim;

    switch (type) {
      case "blink":
        return CellAnimator.getBlinkFrame(cell, timestamp);
      case "flicker":
        return CellAnimator.getFlickerFrame(cell, timestamp);
      case "colorCycle":
        return CellAnimator.getColorCycleFrame(cell, timestamp);
      case "charCycle":
        return CellAnimator.getCharCycleFrame(cell, timestamp);
      default:
        return { ch: cell.ch, fg: cell.fg, bg: cell.bg, visible: true };
    }
  }

  /**
   * Blink animation - alternates between visible and invisible
   * @param {Cell} cell - The cell with blink animation
   * @param {number} timestamp - Current time in ms
   * @returns {Object} Visual state
   */
  static getBlinkFrame(cell, timestamp) {
    const { speed, offset = 0 } = cell.anim;
    const phase = Math.floor((timestamp + offset) / speed) % 2;
    const visible = phase === 0;

    return {
      ch: visible ? cell.ch : " ",
      fg: cell.fg,
      bg: cell.bg,
      visible,
    };
  }

  /**
   * Flicker animation - random on/off timing like a failing light
   * Uses a pseudo-random approach based on timestamp for consistency
   * @param {Cell} cell - The cell with flicker animation
   * @param {number} timestamp - Current time in ms
   * @returns {Object} Visual state
   */
  static getFlickerFrame(cell, timestamp) {
    const { speed, offset = 0 } = cell.anim;
    // Create pseudo-random flicker using timestamp
    // Divide into segments, each segment has a chance to be off
    const segment = Math.floor((timestamp + offset) / speed);
    // Use a simple hash to get pseudo-random behavior
    const hash = (segment * 2654435761) % 100;
    const visible = hash > 20; // 80% on, 20% off

    return {
      ch: visible ? cell.ch : " ",
      fg: cell.fg,
      bg: cell.bg,
      visible,
    };
  }

  /**
   * Color cycle animation - cycles through foreground colors
   * @param {Cell} cell - The cell with colorCycle animation
   * @param {number} timestamp - Current time in ms
   * @returns {Object} Visual state
   */
  static getColorCycleFrame(cell, timestamp) {
    const { speed, colors, offset = 0, cycleMode = "forward" } = cell.anim;
    // Default to cycling through all 8 colors if none specified
    const colorList =
      colors && colors.length > 0 ? colors : [0, 1, 2, 3, 4, 5, 6, 7];
    const frameIndex = CellAnimator.getCycleIndex(
      timestamp + offset,
      speed,
      colorList.length,
      cycleMode,
    );

    return {
      ch: cell.ch,
      fg: colorList[frameIndex],
      bg: cell.bg,
      visible: true,
    };
  }

  /**
   * Character cycle animation - cycles through characters
   * @param {Cell} cell - The cell with charCycle animation
   * @param {number} timestamp - Current time in ms
   * @returns {Object} Visual state
   */
  static getCharCycleFrame(cell, timestamp) {
    const { speed, frames, offset = 0, cycleMode = "forward" } = cell.anim;
    // Default to original char if no frames specified
    const charList = frames && frames.length > 0 ? frames : [cell.ch];
    const frameIndex = CellAnimator.getCycleIndex(
      timestamp + offset,
      speed,
      charList.length,
      cycleMode,
    );

    return {
      ch: charList[frameIndex],
      fg: cell.fg,
      bg: cell.bg,
      visible: true,
    };
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
