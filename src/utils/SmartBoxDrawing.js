/**
 * SmartBoxDrawing.js - Utility for intelligent box-drawing character placement
 *
 * Analyzes neighboring cells to determine the correct box-drawing character
 * for single and double line styles, including proper junction handling.
 *
 * NOTE: This implementation uses conditional logic. An alternative bitwise tileset
 * approach is included below for potential future refactoring.
 */

export class SmartBoxDrawing {
  constructor() {
    // Single line box-drawing characters
    this.singleChars = {
      horizontal: "─",
      vertical: "│",
      topLeft: "┌",
      topRight: "┐",
      bottomLeft: "└",
      bottomRight: "┘",
      cross: "┼",
      teeTop: "┬",
      teeBottom: "┴",
      teeLeft: "├",
      teeRight: "┤",
    };

    // Double line box-drawing characters
    this.doubleChars = {
      horizontal: "═",
      vertical: "║",
      topLeft: "╔",
      topRight: "╗",
      bottomLeft: "╚",
      bottomRight: "╝",
      cross: "╬",
      teeTop: "╦",
      teeBottom: "╩",
      teeLeft: "╠",
      teeRight: "╣",
    };

    // All single line characters for detection
    this.allSingleChars = new Set(Object.values(this.singleChars));

    // All double line characters for detection
    this.allDoubleChars = new Set(Object.values(this.doubleChars));

    // Mixed single/double intersection characters
    this.mixedChars = {
      // Single horizontal, double vertical
      singleHorizontalDoubleVertical: {
        cross: "╫",
        teeTop: "╥",
        teeBottom: "╨",
        teeLeft: "╞",
        teeRight: "╡",
      },
      // Double horizontal, single vertical
      doubleHorizontalSingleVertical: {
        cross: "╪",
        teeTop: "╤",
        teeBottom: "╧",
        teeLeft: "╟",
        teeRight: "╢",
      },
    };

    // All box-drawing characters for detection (including mixed)
    this.allBoxChars = new Set([
      ...this.allSingleChars,
      ...this.allDoubleChars,
      ...Object.values(this.mixedChars.singleHorizontalDoubleVertical),
      ...Object.values(this.mixedChars.doubleHorizontalSingleVertical),
    ]);

    // Unified 8-bit bitmask lookup table
    // Bits 0-3: single line connections (N=1, S=2, E=4, W=8)
    // Bits 4-7: double line connections (N=16, S=32, E=64, W=128)
    // This elegantly handles all combinations including mixed intersections!
    this.BITMASK_CHARS = this._buildBitmaskTable();
  }

  /**
   * Calculate 8-bit bitmask encoding both presence AND type of neighbors
   * Lower 4 bits = single line connections
   * Upper 4 bits = double line connections
   * @param {object} neighbors - Object with north, south, east, west properties
   * @returns {number} Bitmask value 0-255
   * @private
   */
  _calculateBitmask(neighbors) {
    const { north, south, east, west } = neighbors;
    let mask = 0;

    // Single line bits (0-3)
    if (north && this.isSingleLineChar(north)) mask |= 1; // North single = bit 0
    if (south && this.isSingleLineChar(south)) mask |= 2; // South single = bit 1
    if (east && this.isSingleLineChar(east)) mask |= 4; // East single = bit 2
    if (west && this.isSingleLineChar(west)) mask |= 8; // West single = bit 3

    // Double line bits (4-7)
    if (north && this.isDoubleLineChar(north)) mask |= 16; // North double = bit 4
    if (south && this.isDoubleLineChar(south)) mask |= 32; // South double = bit 5
    if (east && this.isDoubleLineChar(east)) mask |= 64; // East double = bit 6
    if (west && this.isDoubleLineChar(west)) mask |= 128; // West double = bit 7

    return mask;
  }

  /**
   * Check if a character is a box-drawing character
   * @param {string} char - Character to check
   * @returns {boolean} True if it's a box-drawing character
   */
  isBoxDrawingChar(char) {
    return this.allBoxChars.has(char);
  }

  /**
   * Check if a character is a single line box-drawing character
   * @param {string} char - Character to check
   * @returns {boolean} True if it's a single line character
   */
  isSingleLineChar(char) {
    return this.allSingleChars.has(char);
  }

  /**
   * Check if a character is a double line box-drawing character
   * @param {string} char - Character to check
   * @returns {boolean} True if it's a double line character
   */
  isDoubleLineChar(char) {
    return this.allDoubleChars.has(char);
  }

  /**
   * Build the complete 8-bit bitmask lookup table
   * @returns {object} Lookup table mapping masks to characters
   * @private
   */
  _buildBitmaskTable() {
    const table = {};

    // Helper to get character for a specific pattern
    const getChar = (
      nSingle,
      sSingle,
      eSingle,
      wSingle,
      nDouble,
      sDouble,
      eDouble,
      wDouble,
    ) => {
      const hasN = nSingle || nDouble;
      const hasS = sSingle || sDouble;
      const hasE = eSingle || eDouble;
      const hasW = wSingle || wDouble;

      // Check if this is a mixed intersection
      const verticalSingle = (nSingle || sSingle) && !nDouble && !sDouble;
      const verticalDouble = (nDouble || sDouble) && !nSingle && !sSingle;
      const horizontalSingle = (eSingle || wSingle) && !eDouble && !wDouble;
      const horizontalDouble = (eDouble || wDouble) && !eSingle && !wSingle;

      // Mixed: single horizontal + double vertical
      if (horizontalSingle && verticalDouble) {
        if (hasN && hasS && hasE && hasW) return "╫"; // Cross
        if (hasN && hasS && hasE) return "╞"; // Left tee
        if (hasN && hasS && hasW) return "╡"; // Right tee
        if (hasN && hasE && hasW) return "╨"; // Bottom tee
        if (hasS && hasE && hasW) return "╥"; // Top tee
      }

      // Mixed: double horizontal + single vertical
      if (horizontalDouble && verticalSingle) {
        if (hasN && hasS && hasE && hasW) return "╪"; // Cross
        if (hasN && hasS && hasE) return "╟"; // Left tee
        if (hasN && hasS && hasW) return "╢"; // Right tee
        if (hasN && hasE && hasW) return "╧"; // Bottom tee
        if (hasS && hasE && hasW) return "╤"; // Top tee
      }

      // Pure double lines
      const allDouble =
        (hasN ? nDouble : true) &&
        (hasS ? sDouble : true) &&
        (hasE ? eDouble : true) &&
        (hasW ? wDouble : true);
      if (allDouble && (nDouble || sDouble || eDouble || wDouble)) {
        if (hasN && hasS && hasE && hasW) return "╬";
        if (hasN && hasS && hasE) return "╠";
        if (hasN && hasS && hasW) return "╣";
        if (hasN && hasE && hasW) return "╩";
        if (hasS && hasE && hasW) return "╦";
        if (hasN && hasE) return "╚";
        if (hasN && hasW) return "╝";
        if (hasS && hasE) return "╔";
        if (hasS && hasW) return "╗";
        if (hasN && hasS) return "║";
        if (hasE && hasW) return "═";
        if (hasN || hasS) return "║";
        if (hasE || hasW) return "═";
        return "═";
      }

      // Pure single lines (or default)
      if (hasN && hasS && hasE && hasW) return "┼";
      if (hasN && hasS && hasE) return "├";
      if (hasN && hasS && hasW) return "┤";
      if (hasN && hasE && hasW) return "┴";
      if (hasS && hasE && hasW) return "┬";
      if (hasN && hasE) return "└";
      if (hasN && hasW) return "┘";
      if (hasS && hasE) return "┌";
      if (hasS && hasW) return "┐";
      if (hasN && hasS) return "│";
      if (hasE && hasW) return "─";
      if (hasN || hasS) return "│";
      if (hasE || hasW) return "─";
      return "─";
    };

    // Generate all 256 combinations
    for (let mask = 0; mask < 256; mask++) {
      const nSingle = (mask & 1) !== 0;
      const sSingle = (mask & 2) !== 0;
      const eSingle = (mask & 4) !== 0;
      const wSingle = (mask & 8) !== 0;
      const nDouble = (mask & 16) !== 0;
      const sDouble = (mask & 32) !== 0;
      const eDouble = (mask & 64) !== 0;
      const wDouble = (mask & 128) !== 0;

      table[mask] = getChar(
        nSingle,
        sSingle,
        eSingle,
        wSingle,
        nDouble,
        sDouble,
        eDouble,
        wDouble,
      );
    }

    return table;
  }

  /**
   * Analyze neighbors and determine the correct box-drawing character
   * Mode determines what WE draw, neighbors determine the shape (corner, tee, etc.)
   * 8-bit mask only used for true mixed intersections
   *
   * @param {object} neighbors - Object with north, south, east, west properties
   * @param {string} mode - "single" or "double" line mode - determines what WE draw
   * @returns {string} The appropriate box-drawing character
   */
  getSmartCharacter(neighbors, mode) {
    const { north, south, east, west } = neighbors;

    // Check if we have any neighbors at all
    const hasNeighbors = north || south || east || west;

    // If no neighbors, use mode to determine starting character
    if (!hasNeighbors) {
      return mode === "double" ? "═" : "─";
    }

    // Determine basic connectivity pattern (ignoring type for now)
    const hasNorth = this.isBoxDrawingChar(north);
    const hasSouth = this.isBoxDrawingChar(south);
    const hasEast = this.isBoxDrawingChar(east);
    const hasWest = this.isBoxDrawingChar(west);

    // Check if we have a mixed intersection situation
    const northSingle = north && this.isSingleLineChar(north);
    const northDouble = north && this.isDoubleLineChar(north);
    const southSingle = south && this.isSingleLineChar(south);
    const southDouble = south && this.isDoubleLineChar(south);
    const eastSingle = east && this.isSingleLineChar(east);
    const eastDouble = east && this.isDoubleLineChar(east);
    const westSingle = west && this.isSingleLineChar(west);
    const westDouble = west && this.isDoubleLineChar(west);

    // Detect if we're crossing different line types (true mixed intersection)
    const verticalSingle =
      (northSingle || southSingle) && !northDouble && !southDouble;
    const verticalDouble =
      (northDouble || southDouble) && !northSingle && !southSingle;
    const horizontalSingle =
      (eastSingle || westSingle) && !eastDouble && !westDouble;
    const horizontalDouble =
      (eastDouble || westDouble) && !eastSingle && !westSingle;

    // MIXED INTERSECTION: single horizontal crossing double vertical
    if (horizontalSingle && verticalDouble) {
      if (hasNorth && hasSouth && hasEast && hasWest) return "╫";
      if (hasNorth && hasSouth && hasEast) return "╟";
      if (hasNorth && hasSouth && hasWest) return "╢";
      if (hasNorth && hasEast && hasWest) return "╨";
      if (hasSouth && hasEast && hasWest) return "╥";
    }

    // MIXED INTERSECTION: double horizontal crossing single vertical
    if (horizontalDouble && verticalSingle) {
      if (hasNorth && hasSouth && hasEast && hasWest) return "╪";
      if (hasNorth && hasSouth && hasEast) return "╞";
      if (hasNorth && hasSouth && hasWest) return "╡";
      if (hasNorth && hasEast && hasWest) return "╧";
      if (hasSouth && hasEast && hasWest) return "╤";
    }

    // NO MIXED INTERSECTION: Use mode to determine which character set
    const chars = mode === "double" ? this.doubleChars : this.singleChars;

    // Return appropriate character based on connectivity pattern
    if (hasNorth && hasSouth && hasEast && hasWest) return chars.cross;
    if (hasNorth && hasSouth && hasEast) return chars.teeLeft;
    if (hasNorth && hasSouth && hasWest) return chars.teeRight;
    if (hasNorth && hasEast && hasWest) return chars.teeBottom;
    if (hasSouth && hasEast && hasWest) return chars.teeTop;
    if (hasNorth && hasEast) return chars.bottomLeft;
    if (hasNorth && hasWest) return chars.bottomRight;
    if (hasSouth && hasEast) return chars.topLeft;
    if (hasSouth && hasWest) return chars.topRight;
    if (hasNorth || hasSouth) return chars.vertical;
    if (hasEast || hasWest) return chars.horizontal;

    return mode === "double" ? "═" : "─";
  }

  /**
   * Check if a neighbor character forms a connection
   * @param {string|null} char - The neighbor character
   * @param {string} direction - "horizontal" or "vertical"
   * @returns {boolean} True if there's a connection
   */
  hasConnection(char, direction) {
    if (!char || !this.isBoxDrawingChar(char)) {
      return false;
    }

    if (direction === "horizontal") {
      return this.canConnectHorizontally(char);
    } else {
      return this.canConnectVertically(char);
    }
  }

  /**
   * Check if a character can connect horizontally
   * @param {string} char - Character to check
   * @returns {boolean} True if it can connect horizontally
   */
  canConnectHorizontally(char) {
    // Characters that can connect to the left or right
    const horizontalConnectors = [
      // Single line
      "─",
      "┌",
      "┐",
      "└",
      "┘",
      "┼",
      "┬",
      "┴",
      "├",
      "┤",
      // Double line
      "═",
      "╔",
      "╗",
      "╚",
      "╝",
      "╬",
      "╦",
      "╩",
      "╠",
      "╣",
      // Mixed
      "╫",
      "╥",
      "╨",
      "╞",
      "╡",
      "╪",
      "╤",
      "╧",
      "╟",
      "╢",
    ];

    return horizontalConnectors.includes(char);
  }

  /**
   * Check if a character can connect vertically
   * @param {string} char - Character to check
   * @returns {boolean} True if it can connect vertically
   */
  canConnectVertically(char) {
    // Characters that can connect up or down
    const verticalConnectors = [
      // Single line
      "│",
      "┌",
      "┐",
      "└",
      "┘",
      "┼",
      "┬",
      "┴",
      "├",
      "┤",
      // Double line
      "║",
      "╔",
      "╗",
      "╚",
      "╝",
      "╬",
      "╦",
      "╩",
      "╠",
      "╣",
      // Mixed
      "╫",
      "╥",
      "╨",
      "╞",
      "╡",
      "╪",
      "╤",
      "╧",
      "╟",
      "╢",
    ];

    return verticalConnectors.includes(char);
  }

  /**
   * Get neighbors that need updating when a new character is placed
   * @param {number} x - X coordinate of placed character
   * @param {number} y - Y coordinate of placed character
   * @param {object} layer - Layer object to read neighbors from
   * @param {number} width - Grid width
   * @param {number} height - Grid height
   * @returns {Array} Array of {x, y, char} objects for neighbors that need updating
   */
  getNeighborsToUpdate(x, y, layer, width, height) {
    const neighborsToUpdate = [];

    // Check all four cardinal directions
    const directions = [
      { dx: 0, dy: -1, name: "north" }, // North
      { dx: 0, dy: 1, name: "south" }, // South
      { dx: 1, dy: 0, name: "east" }, // East
      { dx: -1, dy: 0, name: "west" }, // West
    ];

    for (const dir of directions) {
      const nx = x + dir.dx;
      const ny = y + dir.dy;

      // Check bounds
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
        continue;
      }

      // Get neighbor cell
      const neighborCell = layer.getCell(nx, ny);
      if (!neighborCell || !this.isBoxDrawingChar(neighborCell.ch)) {
        continue;
      }

      // Calculate what this neighbor should be based on its new neighbors
      const neighborNeighbors = this.getNeighbors(nx, ny, layer, width, height);

      // Determine the mode based on the neighbor's current character and orientation
      let neighborMode;

      // Check if the neighbor is currently a mixed character
      const isMixedChar =
        Object.values(this.mixedChars.singleHorizontalDoubleVertical).includes(
          neighborCell.ch,
        ) ||
        Object.values(this.mixedChars.doubleHorizontalSingleVertical).includes(
          neighborCell.ch,
        );

      if (isMixedChar) {
        // For mixed characters, preserve the orientation that is double
        // If the original character has double vertical, use double mode
        const hasDoubleVertical = Object.values(
          this.mixedChars.singleHorizontalDoubleVertical,
        ).includes(neighborCell.ch);
        neighborMode = hasDoubleVertical ? "double" : "single";
      } else {
        // For regular characters, determine mode by the character type
        neighborMode = this.isSingleLineChar(neighborCell.ch)
          ? "single"
          : "double";
      }

      // Get the smart character for this neighbor
      const newChar = this.getSmartCharacter(neighborNeighbors, neighborMode);

      // Only update if the character would change
      if (newChar !== neighborCell.ch) {
        neighborsToUpdate.push({
          x: nx,
          y: ny,
          char: newChar,
          originalChar: neighborCell.ch,
          fg: neighborCell.fg,
          bg: neighborCell.bg,
        });
      }
    }

    return neighborsToUpdate;
  }

  /**
   * Get the neighbor characters around a position
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {object} layer - Layer object to read from
   * @param {number} width - Grid width
   * @param {number} height - Grid height
   * @returns {object} Object with north, south, east, west properties
   */
  getNeighbors(x, y, layer, width, height) {
    const getChar = (nx, ny) => {
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
        return null;
      }
      const cell = layer.getCell(nx, ny);
      return cell ? cell.ch : null;
    };

    return {
      north: getChar(x, y - 1),
      south: getChar(x, y + 1),
      east: getChar(x + 1, y),
      west: getChar(x - 1, y),
    };
  }
}
