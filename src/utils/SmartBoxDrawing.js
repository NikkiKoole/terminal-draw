/**
 * SmartBoxDrawing.js - Utility for intelligent box-drawing character placement
 *
 * Analyzes neighboring cells to determine the correct box-drawing character
 * for single and double line styles, including proper junction handling.
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

    // All box-drawing characters for detection
    this.allBoxChars = new Set([
      ...this.allSingleChars,
      ...this.allDoubleChars,
    ]);

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
   * @param {object} neighbors - Object with north, south, east, west properties
   * @param {string} mode - "single" or "double" line mode
   * @returns {string} The appropriate box-drawing character
   */
  getSmartCharacter(neighbors, mode) {
    const { north, south, east, west } = neighbors;

    // Determine which neighbors have box-drawing characters (any type)
    const hasNorth = this.isBoxDrawingChar(north);
    const hasSouth = this.isBoxDrawingChar(south);
    const hasEast = this.isBoxDrawingChar(east);
    const hasWest = this.isBoxDrawingChar(west);

    // Select character set based on mode
    const chars = mode === "double" ? this.doubleChars : this.singleChars;

    // Determine the appropriate character based on connections
    if (hasNorth && hasSouth && hasEast && hasWest) {
      return chars.cross; // ┼ or ╬
    }

    if (hasNorth && hasSouth && hasEast && !hasWest) {
      return chars.teeLeft; // ├ or ╠
    }

    if (hasNorth && hasSouth && !hasEast && hasWest) {
      return chars.teeRight; // ┤ or ╣
    }

    if (!hasNorth && hasSouth && hasEast && hasWest) {
      return chars.teeTop; // ┬ or ╦
    }

    if (hasNorth && !hasSouth && hasEast && hasWest) {
      return chars.teeBottom; // ┴ or ╩
    }

    if (!hasNorth && hasSouth && hasEast && !hasWest) {
      return chars.topLeft; // ┌ or ╔
    }

    if (!hasNorth && hasSouth && !hasEast && hasWest) {
      return chars.topRight; // ┐ or ╗
    }

    if (hasNorth && !hasSouth && hasEast && !hasWest) {
      return chars.bottomLeft; // └ or ╚
    }

    if (hasNorth && !hasSouth && !hasEast && hasWest) {
      return chars.bottomRight; // ┘ or ╝
    }

    if ((hasNorth || hasSouth) && !(hasEast || hasWest)) {
      return chars.vertical; // │ or ║
    }

    if ((hasEast || hasWest) && !(hasNorth || hasSouth)) {
      return chars.horizontal; // ─ or ═
    }

    // Default to basic line if no connections
    return chars.horizontal; // Default to horizontal line
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

      // Determine the mode based on the neighbor's current character
      const neighborMode = this.isSingleLineChar(neighborCell.ch)
        ? "single"
        : "double";

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
