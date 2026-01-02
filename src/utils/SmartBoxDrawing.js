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

    // Build lookup tables using 4-bit connectivity masks
    // Bits: North=1, South=2, East=4, West=8
    this.CONNECTIVITY_SINGLE = this._buildConnectivityTable(this.singleChars);
    this.CONNECTIVITY_DOUBLE = this._buildConnectivityTable(this.doubleChars);

    // Mixed intersection lookup tables
    this.MIXED_SH_DV = this._buildMixedTable("singleHorizontalDoubleVertical");
    this.MIXED_DH_SV = this._buildMixedTable("doubleHorizontalSingleVertical");
  }

  /**
   * Build a 4-bit connectivity lookup table for a character set
   * @param {object} chars - Character set (singleChars or doubleChars)
   * @returns {object} Lookup table mapping 4-bit masks to characters
   * @private
   */
  _buildConnectivityTable(chars) {
    return {
      0: chars.horizontal, // 0000 - no connections
      1: chars.vertical, // 0001 - north only
      2: chars.vertical, // 0010 - south only
      3: chars.vertical, // 0011 - north + south
      4: chars.horizontal, // 0100 - east only
      5: chars.bottomLeft, // 0101 - north + east
      6: chars.topLeft, // 0110 - south + east
      7: chars.teeLeft, // 0111 - north + south + east
      8: chars.horizontal, // 1000 - west only
      9: chars.bottomRight, // 1001 - north + west
      10: chars.topRight, // 1010 - south + west
      11: chars.teeRight, // 1011 - north + south + west
      12: chars.horizontal, // 1100 - east + west
      13: chars.teeBottom, // 1101 - north + east + west
      14: chars.teeTop, // 1110 - south + east + west
      15: chars.cross, // 1111 - all directions
    };
  }

  /**
   * Build mixed intersection lookup table
   * @param {string} type - "singleHorizontalDoubleVertical" or "doubleHorizontalSingleVertical"
   * @returns {object} Lookup table for mixed patterns
   * @private
   */
  _buildMixedTable(type) {
    if (type === "singleHorizontalDoubleVertical") {
      // Single horizontal + double vertical
      return {
        7: "╟", // 0111 - N + S + E
        11: "╢", // 1011 - N + S + W
        13: "╨", // 1101 - N + E + W
        14: "╥", // 1110 - S + E + W
        15: "╫", // 1111 - all directions
      };
    } else {
      // Double horizontal + single vertical
      return {
        7: "╞", // 0111 - N + S + E
        11: "╡", // 1011 - N + S + W
        13: "╧", // 1101 - N + E + W
        14: "╤", // 1110 - S + E + W
        15: "╪", // 1111 - all directions
      };
    }
  }

  /**
   * Calculate 4-bit connectivity mask from neighbors
   * @param {object} neighbors - Object with north, south, east, west properties
   * @returns {number} Bitmask value 0-15
   * @private
   */
  _calculateConnectivity(neighbors) {
    const { north, south, east, west } = neighbors;
    let mask = 0;
    if (this.isBoxDrawingChar(north)) mask |= 1; // North = bit 0
    if (this.isBoxDrawingChar(south)) mask |= 2; // South = bit 1
    if (this.isBoxDrawingChar(east)) mask |= 4; // East = bit 2
    if (this.isBoxDrawingChar(west)) mask |= 8; // West = bit 3
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
   * Analyze neighbors and determine the correct box-drawing character
   * Uses bitwise connectivity masks for clean, efficient lookup
   *
   * @param {object} neighbors - Object with north, south, east, west properties
   * @param {string} mode - "single" or "double" line mode - determines what WE draw
   * @returns {string} The appropriate box-drawing character
   */
  getSmartCharacter(neighbors, mode) {
    const { north, south, east, west } = neighbors;

    // Quick check: if no neighbors, return default based on mode
    if (!north && !south && !east && !west) {
      return mode === "double" ? "═" : "─";
    }

    // Calculate 4-bit connectivity mask (which directions have box-drawing chars)
    const connectivityMask = this._calculateConnectivity(neighbors);

    // Detect mixed intersections by checking neighbor types
    const northSingle = north && this.isSingleLineChar(north);
    const northDouble = north && this.isDoubleLineChar(north);
    const southSingle = south && this.isSingleLineChar(south);
    const southDouble = south && this.isDoubleLineChar(south);
    const eastSingle = east && this.isSingleLineChar(east);
    const eastDouble = east && this.isDoubleLineChar(east);
    const westSingle = west && this.isSingleLineChar(west);
    const westDouble = west && this.isDoubleLineChar(west);

    const verticalSingle =
      (northSingle || southSingle) && !northDouble && !southDouble;
    const verticalDouble =
      (northDouble || southDouble) && !northSingle && !southSingle;
    const horizontalSingle =
      (eastSingle || westSingle) && !eastDouble && !westDouble;
    const horizontalDouble =
      (eastDouble || westDouble) && !eastSingle && !westSingle;

    // Check for mixed intersections first
    if (horizontalSingle && verticalDouble) {
      const char = this.MIXED_SH_DV[connectivityMask];
      if (char) return char;
    }

    if (horizontalDouble && verticalSingle) {
      const char = this.MIXED_DH_SV[connectivityMask];
      if (char) return char;
    }

    // No mixed intersection: use mode-based lookup table
    const lookupTable =
      mode === "double" ? this.CONNECTIVITY_DOUBLE : this.CONNECTIVITY_SINGLE;
    return lookupTable[connectivityMask] || (mode === "double" ? "═" : "─");
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
