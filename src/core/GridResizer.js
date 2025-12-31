/**
 * GridResizer - Utility for resizing grid layers with content preservation
 *
 * Handles resizing operations with different strategies:
 * - 'pad': Add empty cells to expand, preserve all content
 * - 'crop': Remove cells to shrink, lose content outside new bounds
 * - 'center': Pad/crop from center, preserving central content
 */

import { Cell } from './Cell.js';

export class GridResizer {
  /**
   * Resize a layer with the specified strategy
   * @param {Layer} layer - Layer to resize
   * @param {number} newW - New width
   * @param {number} newH - New height
   * @param {string} strategy - Resize strategy ('pad', 'crop', 'center')
   * @param {Cell} fillCell - Cell to use for padding (default: empty cell)
   * @returns {Object} - {oldCells, newCells, oldWidth, oldHeight}
   */
  static resizeLayer(layer, newW, newH, strategy = 'pad', fillCell = null) {
    if (!layer || typeof newW !== 'number' || typeof newH !== 'number') {
      throw new Error('Invalid parameters for layer resize');
    }

    if (newW < 1 || newH < 1) {
      throw new Error('New dimensions must be at least 1x1');
    }

    const oldW = layer.width;
    const oldH = layer.height;
    const oldCells = [...layer.cells]; // Copy existing cells

    // Use default empty cell if no fill cell provided
    const fill = fillCell || new Cell();

    let newCells;

    switch (strategy) {
      case 'pad':
        newCells = this._resizePad(oldCells, oldW, oldH, newW, newH, fill);
        break;
      case 'crop':
        newCells = this._resizeCrop(oldCells, oldW, oldH, newW, newH);
        break;
      case 'center':
        newCells = this._resizeCenter(oldCells, oldW, oldH, newW, newH, fill);
        break;
      default:
        throw new Error(`Unknown resize strategy: ${strategy}`);
    }

    // Update layer properties
    layer.width = newW;
    layer.height = newH;
    layer.cells = newCells;

    return {
      oldCells,
      newCells,
      oldWidth: oldW,
      oldHeight: oldH
    };
  }

  /**
   * Pad strategy: Expand from top-left, add empty cells
   * @private
   */
  static _resizePad(oldCells, oldW, oldH, newW, newH, fillCell) {
    const newCells = new Array(newW * newH);

    for (let y = 0; y < newH; y++) {
      for (let x = 0; x < newW; x++) {
        const newIndex = y * newW + x;

        if (x < oldW && y < oldH) {
          // Copy existing cell
          const oldIndex = y * oldW + x;
          newCells[newIndex] = oldCells[oldIndex] ?
            new Cell(oldCells[oldIndex].ch, oldCells[oldIndex].fg, oldCells[oldIndex].bg) :
            new Cell();
        } else {
          // Add fill cell
          newCells[newIndex] = new Cell(fillCell.ch, fillCell.fg, fillCell.bg);
        }
      }
    }

    return newCells;
  }

  /**
   * Crop strategy: Shrink from bottom-right, lose content
   * @private
   */
  static _resizeCrop(oldCells, oldW, oldH, newW, newH) {
    const newCells = new Array(newW * newH);

    for (let y = 0; y < newH; y++) {
      for (let x = 0; x < newW; x++) {
        const newIndex = y * newW + x;
        const oldIndex = y * oldW + x;

        // Copy cell if it exists in old grid
        if (oldCells[oldIndex]) {
          newCells[newIndex] = new Cell(
            oldCells[oldIndex].ch,
            oldCells[oldIndex].fg,
            oldCells[oldIndex].bg
          );
        } else {
          newCells[newIndex] = new Cell();
        }
      }
    }

    return newCells;
  }

  /**
   * Center strategy: Pad/crop from center, preserve central content
   * @private
   */
  static _resizeCenter(oldCells, oldW, oldH, newW, newH, fillCell) {
    const newCells = new Array(newW * newH);

    // Calculate offset to center the old content in the new grid
    const offsetX = Math.floor((newW - oldW) / 2);
    const offsetY = Math.floor((newH - oldH) / 2);

    for (let y = 0; y < newH; y++) {
      for (let x = 0; x < newW; x++) {
        const newIndex = y * newW + x;

        // Calculate corresponding position in old grid
        const oldX = x - offsetX;
        const oldY = y - offsetY;

        if (oldX >= 0 && oldX < oldW && oldY >= 0 && oldY < oldH) {
          // Copy existing cell
          const oldIndex = oldY * oldW + oldX;
          newCells[newIndex] = oldCells[oldIndex] ?
            new Cell(oldCells[oldIndex].ch, oldCells[oldIndex].fg, oldCells[oldIndex].bg) :
            new Cell();
        } else {
          // Add fill cell
          newCells[newIndex] = new Cell(fillCell.ch, fillCell.fg, fillCell.bg);
        }
      }
    }

    return newCells;
  }

  /**
   * Resize multiple layers atomically
   * @param {Array<Layer>} layers - Array of layers to resize
   * @param {number} newW - New width
   * @param {number} newH - New height
   * @param {string} strategy - Resize strategy
   * @param {Cell} fillCell - Fill cell for padding
   * @returns {Array} - Array of resize results for each layer
   */
  static resizeLayers(layers, newW, newH, strategy = 'pad', fillCell = null) {
    const results = [];

    layers.forEach(layer => {
      if (layer) {
        const result = this.resizeLayer(layer, newW, newH, strategy, fillCell);
        results.push({
          layerId: layer.id,
          ...result
        });
      }
    });

    return results;
  }

  /**
   * Calculate memory impact of resize operation
   * @param {number} oldW - Current width
   * @param {number} oldH - Current height
   * @param {number} newW - New width
   * @param {number} newH - New height
   * @param {number} layerCount - Number of layers (default: 3)
   * @returns {Object} - Memory impact information
   */
  static calculateMemoryImpact(oldW, oldH, newW, newH, layerCount = 3) {
    const oldCells = oldW * oldH * layerCount;
    const newCells = newW * newH * layerCount;
    const cellSize = 32; // Rough estimate of Cell object size in bytes

    const oldMemory = oldCells * cellSize;
    const newMemory = newCells * cellSize;
    const delta = newMemory - oldMemory;

    return {
      oldCells,
      newCells,
      cellDelta: newCells - oldCells,
      oldMemory,
      newMemory,
      memoryDelta: delta,
      percentChange: oldMemory > 0 ? ((delta / oldMemory) * 100) : 0
    };
  }

  /**
   * Validate resize parameters
   * @param {number} newW - New width
   * @param {number} newH - New height
   * @param {Object} options - Validation options
   * @returns {Object} - {valid: boolean, errors: Array<string>}
   */
  static validateResize(newW, newH, options = {}) {
    const errors = [];
    const maxW = options.maxWidth || 200;
    const maxH = options.maxHeight || 100;
    const minW = options.minWidth || 1;
    const minH = options.minHeight || 1;

    if (typeof newW !== 'number' || !Number.isInteger(newW)) {
      errors.push('Width must be an integer');
    } else if (newW < minW) {
      errors.push(`Width must be at least ${minW}`);
    } else if (newW > maxW) {
      errors.push(`Width cannot exceed ${maxW}`);
    }

    if (typeof newH !== 'number' || !Number.isInteger(newH)) {
      errors.push('Height must be an integer');
    } else if (newH < minH) {
      errors.push(`Height must be at least ${minH}`);
    } else if (newH > maxH) {
      errors.push(`Height cannot exceed ${maxH}`);
    }

    // Check memory impact
    const memoryImpact = this.calculateMemoryImpact(80, 25, newW, newH); // Assume 80x25 baseline
    if (memoryImpact.newMemory > 10 * 1024 * 1024) { // 10MB limit
      errors.push('New grid size would use too much memory');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get preview information for resize operation
   * @param {number} oldW - Current width
   * @param {number} oldH - Current height
   * @param {number} newW - New width
   * @param {number} newH - New height
   * @param {string} strategy - Resize strategy
   * @returns {Object} - Preview information
   */
  static getResizePreview(oldW, oldH, newW, newH, strategy) {
    const isExpanding = newW > oldW || newH > oldH;
    const isShrinking = newW < oldW || newH < oldH;
    const isResizing = newW !== oldW || newH !== oldH;

    let description = '';
    let warning = null;

    if (!isResizing) {
      description = 'No change in dimensions';
    } else if (isExpanding && !isShrinking) {
      description = `Expanding from ${oldW}×${oldH} to ${newW}×${newH}`;
    } else if (isShrinking && !isExpanding) {
      description = `Shrinking from ${oldW}×${oldH} to ${newW}×${newH}`;
      if (strategy === 'crop' || strategy === 'center') {
        warning = 'Content outside new bounds will be lost';
      }
    } else {
      description = `Resizing from ${oldW}×${oldH} to ${newW}×${newH}`;
      if (strategy === 'crop' || strategy === 'center') {
        warning = 'Some content may be lost';
      }
    }

    const memoryImpact = this.calculateMemoryImpact(oldW, oldH, newW, newH);

    return {
      description,
      warning,
      isExpanding,
      isShrinking,
      isResizing,
      memoryImpact,
      strategy
    };
  }
}
