/**
 * Compositor - Logical layer compositing utilities
 *
 * Handles compositing multiple layers to determine the final visible cell
 * at any position. Used for export/copy operations, not for rendering.
 *
 * Compositing Rules:
 * - Glyph + FG: From topmost visible layer where ch !== ' '
 * - BG: From topmost visible layer where bg !== -1
 */

import { Cell } from '../core/Cell.js';

/**
 * Get the composited cell at a specific position
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {Scene} scene - Scene containing layers to composite
 * @returns {Cell|null} Composited cell or null if out of bounds
 */
export function getVisibleCell(x, y, scene) {
  if (!scene || !scene.isValidCoord(x, y)) {
    return null;
  }

  // Get visible layers in top-to-bottom order (reverse of array)
  const visibleLayers = scene.getVisibleLayers();

  // Start with default values
  let finalCh = ' ';
  let finalFg = 7;
  let finalBg = -1;
  let chFound = false;
  let bgFound = false;

  // Iterate from top layer to bottom (reversed array)
  for (let i = visibleLayers.length - 1; i >= 0; i--) {
    const layer = visibleLayers[i];
    const cell = layer.getCell(x, y);

    if (!cell) {
      continue;
    }

    // Get character and foreground from first non-space
    if (!chFound && cell.ch !== ' ') {
      finalCh = cell.ch;
      finalFg = cell.fg;
      chFound = true;
    }

    // Get background from first non-transparent
    if (!bgFound && cell.bg !== -1) {
      finalBg = cell.bg;
      bgFound = true;
    }

    // Early exit if both found
    if (chFound && bgFound) {
      break;
    }
  }

  return new Cell(finalCh, finalFg, finalBg);
}

/**
 * Composite an entire region from a scene
 * @param {number} x - Starting X coordinate
 * @param {number} y - Starting Y coordinate
 * @param {number} width - Region width
 * @param {number} height - Region height
 * @param {Scene} scene - Scene to composite from
 * @returns {Cell[][]} 2D array of composited cells
 */
export function getVisibleRegion(x, y, width, height, scene) {
  const region = [];

  for (let dy = 0; dy < height; dy++) {
    const row = [];
    for (let dx = 0; dx < width; dx++) {
      const cell = getVisibleCell(x + dx, y + dy, scene);
      row.push(cell || new Cell());
    }
    region.push(row);
  }

  return region;
}

/**
 * Export entire scene as composited 2D array
 * @param {Scene} scene - Scene to export
 * @returns {Cell[][]} 2D array of composited cells
 */
export function exportScene(scene) {
  if (!scene) {
    return [];
  }

  return getVisibleRegion(0, 0, scene.w, scene.h, scene);
}

/**
 * Export scene as plain text (characters only, no colors)
 * @param {Scene} scene - Scene to export
 * @returns {string} Text representation with newlines
 */
export function exportAsText(scene) {
  if (!scene) {
    return '';
  }

  const lines = [];

  for (let y = 0; y < scene.h; y++) {
    let line = '';
    for (let x = 0; x < scene.w; x++) {
      const cell = getVisibleCell(x, y, scene);
      line += cell ? cell.ch : ' ';
    }
    lines.push(line);
  }

  return lines.join('\n');
}

/**
 * Export scene as ANSI colored text
 * @param {Scene} scene - Scene to export
 * @returns {string} ANSI text with color codes
 */
export function exportAsANSI(scene) {
  if (!scene) {
    return '';
  }

  // ANSI color codes (standard 8 colors)
  const fgCodes = [30, 31, 32, 33, 34, 35, 36, 37];
  const bgCodes = [40, 41, 42, 43, 44, 45, 46, 47];

  const lines = [];

  for (let y = 0; y < scene.h; y++) {
    let line = '';
    let currentFg = -1;
    let currentBg = -1;

    for (let x = 0; x < scene.w; x++) {
      const cell = getVisibleCell(x, y, scene);

      if (!cell) {
        line += ' ';
        continue;
      }

      // Apply color codes if they changed
      let codes = [];

      if (cell.fg !== currentFg) {
        codes.push(fgCodes[cell.fg] || 37);
        currentFg = cell.fg;
      }

      if (cell.bg !== currentBg) {
        if (cell.bg === -1) {
          codes.push(49); // Default background
        } else {
          codes.push(bgCodes[cell.bg] || 40);
        }
        currentBg = cell.bg;
      }

      if (codes.length > 0) {
        line += `\x1b[${codes.join(';')}m`;
      }

      line += cell.ch;
    }

    // Reset at end of line
    line += '\x1b[0m';
    lines.push(line);
  }

  return lines.join('\n');
}
