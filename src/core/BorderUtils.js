/**
 * BorderUtils - Utility functions for creating borders around canvas
 *
 * Provides functions to add single-line or double-line borders
 * to the canvas using box-drawing characters.
 */

import { Cell } from "./Cell.js";

/**
 * Border style definitions with box-drawing characters
 */
export const BORDER_STYLES = {
  single: {
    name: "Single Line",
    chars: {
      topLeft: "┌",
      topRight: "┐",
      bottomLeft: "└",
      bottomRight: "┘",
      horizontal: "─",
      vertical: "│",
    },
  },
  double: {
    name: "Double Line",
    chars: {
      topLeft: "╔",
      topRight: "╗",
      bottomLeft: "╚",
      bottomRight: "╝",
      horizontal: "═",
      vertical: "║",
    },
  },
};

/**
 * Add a border to a layer
 * @param {Layer} layer - The layer to add the border to
 * @param {string} style - Border style ('single' or 'double')
 * @param {number} fgColor - Foreground color for border (0-7)
 * @param {number} bgColor - Background color for border (-1 for transparent)
 */
export function addBorderToLayer(
  layer,
  style = "single",
  fgColor = 7,
  bgColor = -1,
) {
  if (!layer || !BORDER_STYLES[style]) {
    throw new Error(`Invalid layer or border style: ${style}`);
  }

  const borderChars = BORDER_STYLES[style].chars;
  const width = layer.width;
  const height = layer.height;

  // Add border around the perimeter
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Skip if not on the border
      if (y !== 0 && y !== height - 1 && x !== 0 && x !== width - 1) {
        continue;
      }

      let borderChar = borderChars.vertical; // Default to vertical

      // Determine which border character to use
      if (y === 0 && x === 0) {
        borderChar = borderChars.topLeft;
      } else if (y === 0 && x === width - 1) {
        borderChar = borderChars.topRight;
      } else if (y === height - 1 && x === 0) {
        borderChar = borderChars.bottomLeft;
      } else if (y === height - 1 && x === width - 1) {
        borderChar = borderChars.bottomRight;
      } else if (y === 0 || y === height - 1) {
        borderChar = borderChars.horizontal;
      } else if (x === 0 || x === width - 1) {
        borderChar = borderChars.vertical;
      }

      // Set the border cell
      layer.setCell(x, y, new Cell(borderChar, fgColor, bgColor));
    }
  }
}

/**
 * Add a border to a scene's first layer
 * @param {Scene} scene - The scene to add the border to
 * @param {string} style - Border style ('single' or 'double')
 * @param {number} fgColor - Foreground color for border (0-7)
 * @param {number} bgColor - Background color for border (-1 for transparent)
 */
export function addBorderToScene(
  scene,
  style = "single",
  fgColor = 7,
  bgColor = -1,
) {
  if (!scene || scene.layers.length === 0) {
    throw new Error("Invalid scene or scene has no layers");
  }

  // Add border to the first layer (usually background)
  const firstLayer = scene.layers[0];
  addBorderToLayer(firstLayer, style, fgColor, bgColor);
}

/**
 * Check if border style is valid
 * @param {string} style - Style to validate
 * @returns {boolean} True if style is valid
 */
export function isValidBorderStyle(style) {
  return Boolean(style) && BORDER_STYLES.hasOwnProperty(style);
}

/**
 * Get all available border styles
 * @returns {Array<string>} Array of available style names
 */
export function getAvailableBorderStyles() {
  return Object.keys(BORDER_STYLES);
}

/**
 * Get border style information
 * @param {string} style - Style name
 * @returns {object|null} Style information or null if not found
 */
export function getBorderStyle(style) {
  return BORDER_STYLES[style] || null;
}

/**
 * Create a preview of border characters for a given style
 * @param {string} style - Border style
 * @returns {string} Multi-line string showing border preview
 */
export function createBorderPreview(style) {
  if (!BORDER_STYLES[style]) {
    return "";
  }

  const chars = BORDER_STYLES[style].chars;
  return `${chars.topLeft}${chars.horizontal}${chars.topRight}\n${chars.vertical} ${chars.vertical}\n${chars.bottomLeft}${chars.horizontal}${chars.bottomRight}`;
}

/**
 * Calculate inner dimensions when border is applied
 * @param {number} width - Total canvas width
 * @param {number} height - Total canvas height
 * @returns {object} Inner dimensions {width, height}
 */
export function getInnerDimensions(width, height) {
  return {
    width: Math.max(0, width - 2),
    height: Math.max(0, height - 2),
  };
}

/**
 * Check if dimensions are suitable for border
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @returns {boolean} True if dimensions can accommodate border
 */
export function canAddBorder(width, height) {
  return width >= 3 && height >= 3;
}
