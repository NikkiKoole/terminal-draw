/**
 * SelectionTool.js - Rectangle selection tool with visual feedback
 *
 * Enables users to select rectangular regions by click-dragging.
 * Provides visual feedback with selection rectangle outline.
 */

import { Tool } from "./Tool.js";

export class SelectionTool extends Tool {
  constructor() {
    super("Selection");
    this.isSelecting = false;
    this.startX = null;
    this.startY = null;
    this.currentX = null;
    this.currentY = null;
    this.selectionRect = null;
  }

  /**
   * Handle mouse down - start selection
   */
  onCellDown(x, y, scene, stateManager, eventData = {}) {
    this.isSelecting = true;
    this.startX = x;
    this.startY = y;
    this.currentX = x;
    this.currentY = y;

    // Clear any existing selection
    stateManager.emit("selection:clear");

    // Create initial selection (single cell)
    this.updateSelection(scene, stateManager);
    this.showSelectionPreview(scene, stateManager);
  }

  /**
   * Handle drag - update selection rectangle
   */
  onCellDrag(x, y, scene, stateManager, eventData = {}) {
    if (!this.isSelecting) return;

    this.currentX = x;
    this.currentY = y;

    this.updateSelection(scene, stateManager);
    this.showSelectionPreview(scene, stateManager);
  }

  /**
   * Handle mouse up - finalize selection
   */
  onCellUp(x, y, scene, stateManager, eventData = {}) {
    if (!this.isSelecting) return;

    this.currentX = x;
    this.currentY = y;
    this.isSelecting = false;

    this.updateSelection(scene, stateManager);
    this.hideSelectionPreview(stateManager);

    // Emit selection completed event
    stateManager.emit("selection:completed", this.selectionRect);
  }

  /**
   * Calculate and update selection rectangle
   */
  updateSelection(scene, stateManager) {
    if (this.startX === null || this.currentX === null) return;

    // Calculate rectangle bounds
    const left = Math.min(this.startX, this.currentX);
    const right = Math.max(this.startX, this.currentX);
    const top = Math.min(this.startY, this.currentY);
    const bottom = Math.max(this.startY, this.currentY);

    // Clamp to scene bounds
    const clampedLeft = Math.max(0, Math.min(left, scene.w - 1));
    const clampedRight = Math.max(0, Math.min(right, scene.w - 1));
    const clampedTop = Math.max(0, Math.min(top, scene.h - 1));
    const clampedBottom = Math.max(0, Math.min(bottom, scene.h - 1));

    this.selectionRect = {
      x: clampedLeft,
      y: clampedTop,
      width: clampedRight - clampedLeft + 1,
      height: clampedBottom - clampedTop + 1,
      right: clampedRight,
      bottom: clampedBottom
    };

    // Emit selection changed event
    stateManager.emit("selection:changed", this.selectionRect);
  }

  /**
   * Show visual selection preview (marching ants effect)
   */
  showSelectionPreview(scene, stateManager) {
    if (!this.selectionRect) return;

    const previewCells = [];
    const { x, y, width, height } = this.selectionRect;

    // Create border cells for selection rectangle
    for (let py = y; py < y + height; py++) {
      for (let px = x; px < x + width; px++) {
        // Only show border cells
        const isTopBorder = py === y;
        const isBottomBorder = py === y + height - 1;
        const isLeftBorder = px === x;
        const isRightBorder = px === x + width - 1;

        if (isTopBorder || isBottomBorder || isLeftBorder || isRightBorder) {
          previewCells.push({
            x: px,
            y: py,
            ch: "·", // Middle dot for selection outline
            fg: 11, // Bright cyan
            bg: -1, // Transparent background
            isSelectionBorder: true
          });
        }
      }
    }

    stateManager.emit("tool:preview", {
      tool: "selection",
      cells: previewCells,
      isActive: this.isSelecting
    });
  }

  /**
   * Hide selection preview
   */
  hideSelectionPreview(stateManager) {
    stateManager.emit("tool:preview", {
      tool: "selection",
      cells: [],
      isActive: false
    });
  }

  /**
   * Clear current selection
   */
  clearSelection(stateManager) {
    this.isSelecting = false;
    this.startX = null;
    this.startY = null;
    this.currentX = null;
    this.currentY = null;
    this.selectionRect = null;

    this.hideSelectionPreview(stateManager);
    stateManager.emit("selection:clear");
  }

  /**
   * Get current selection rectangle
   */
  getSelection() {
    return this.selectionRect;
  }

  /**
   * Check if there is an active selection
   */
  hasSelection() {
    return this.selectionRect !== null;
  }

  /**
   * Get cursor style for selection tool
   */
  getCursor() {
    return "crosshair";
  }

  /**
   * Extract cells from the selected region
   */
  extractSelectedCells(scene) {
    if (!this.selectionRect) return null;

    const { x, y, width, height } = this.selectionRect;
    const cells = [];

    // Extract cells from all layers
    for (const layerId of scene.getLayerIds()) {
      const layer = scene.getLayer(layerId);
      if (!layer) continue;

      const layerCells = [];
      for (let py = 0; py < height; py++) {
        for (let px = 0; px < width; px++) {
          const worldX = x + px;
          const worldY = y + py;
          const cell = layer.getCell(worldX, worldY);

          layerCells.push({
            x: px,
            y: py,
            worldX,
            worldY,
            cell: cell ? {
              ch: cell.ch,
              fg: cell.fg,
              bg: cell.bg
            } : null
          });
        }
      }

      cells.push({
        layerId,
        cells: layerCells
      });
    }

    return {
      width,
      height,
      originX: x,
      originY: y,
      layers: cells
    };
  }
}
