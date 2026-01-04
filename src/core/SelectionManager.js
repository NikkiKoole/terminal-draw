/**
 * SelectionManager.js - Manages selection operations and clipboard integration
 *
 * Handles:
 * - Selection state management
 * - Copy/Cut/Paste operations within and between projects
 * - Selection transformations (flip, rotate, mirror)
 * - Move operations with drag support
 */

import { Cell } from "./Cell.js";

export class SelectionManager {
  constructor(stateManager) {
    this.stateManager = stateManager;
    this.selection = null; // Current selection rectangle {x, y, width, height}
    this.selectedData = null; // Extracted cell data from selection
    this.clipboardData = null; // Data in clipboard for cross-project paste
    this.isMoving = false;
    this.moveOffset = { x: 0, y: 0 };
    this.originalPosition = null;

    // Setup event listeners
    this.setupEventListeners();
  }

  setupEventListeners() {
    this.stateManager.on("selection:changed", (rect) =>
      this.setSelection(rect),
    );
    this.stateManager.on("selection:clear", () => this.clearSelection());
    this.stateManager.on("selection:completed", (rect) =>
      this.onSelectionCompleted(rect),
    );
    this.stateManager.on("selection:needsData", (rect) =>
      this.onSelectionNeedsData(rect),
    );
  }

  /**
   * Set current selection rectangle
   */
  setSelection(rect) {
    this.selection = rect;
    this.stateManager.emit("selectionmanager:changed", rect);
  }

  /**
   * Clear current selection
   */
  clearSelection() {
    this.selection = null;
    this.selectedData = null;
    this.isMoving = false;
    this.moveOffset = { x: 0, y: 0 };
    this.originalPosition = null;
    this.stateManager.emit("selectionmanager:cleared");
  }

  /**
   * Handle selection completed
   */
  onSelectionCompleted(rect) {
    this.selection = rect;
    // We need to emit an event with the scene so we can extract data
    this.stateManager.emit("selection:needsData", rect);
  }

  /**
   * Handle when selection needs data extraction
   */
  onSelectionNeedsData(rect) {
    // This will be called from app.js with the scene
    this.pendingDataExtraction = rect;
  }

  /**
   * Extract cell data from current selection
   */
  extractSelectedData(scene) {
    if (!this.selection || !scene) return;

    const { x, y, width, height } = this.selection;
    const layers = {};

    // Extract cells from all layers
    for (const layerId of scene.getLayerIds()) {
      const layer = scene.getLayer(layerId);
      if (!layer) continue;

      const cells = [];
      for (let py = 0; py < height; py++) {
        for (let px = 0; px < width; px++) {
          const worldX = x + px;
          const worldY = y + py;
          const cell = layer.getCell(worldX, worldY);

          cells.push({
            x: px,
            y: py,
            cell: cell
              ? {
                  ch: cell.ch,
                  fg: cell.fg,
                  bg: cell.bg,
                }
              : null,
          });
        }
      }

      layers[layerId] = cells;
    }

    this.selectedData = {
      width,
      height,
      originX: x,
      originY: y,
      layers,
    };

    return this.selectedData;
  }

  /**
   * Copy selected region to clipboard
   */
  async copySelection(scene) {
    if (!this.selection) {
      throw new Error("No selection to copy");
    }

    if (!this.selectedData) {
      this.extractSelectedData(scene);
    }

    this.clipboardData = {
      ...this.selectedData,
      timestamp: Date.now(),
      sourceProject: scene.templateId || "unknown",
    };

    // Store in localStorage for cross-project functionality
    try {
      localStorage.setItem(
        "terminalDraw_clipboard",
        JSON.stringify(this.clipboardData),
      );
    } catch (error) {
      console.warn("Failed to store clipboard data in localStorage:", error);
    }

    // Also copy as plain text to system clipboard
    const plainText = this.exportSelectionAsText();
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(plainText);
      } catch (error) {
        console.warn("Failed to copy to system clipboard:", error);
      }
    }

    this.stateManager.emit("selection:copied", {
      width: this.selectedData.width,
      height: this.selectedData.height,
      layers: Object.keys(this.selectedData.layers).length,
    });

    return this.clipboardData;
  }

  /**
   * Cut selected region to clipboard
   */
  async cutSelection(scene) {
    if (!this.selection) {
      throw new Error("No selection to cut");
    }

    // Copy first
    await this.copySelection(scene);

    // Then clear the selected area
    this.clearSelectedArea(scene);

    this.stateManager.emit("selection:cut", {
      width: this.selectedData.width,
      height: this.selectedData.height,
    });

    return this.clipboardData;
  }

  /**
   * Clear the selected area (erase cells)
   */
  clearSelectedArea(scene) {
    if (!this.selection) return;

    const { x, y, width, height } = this.selection;

    // Clear cells in all layers
    for (const layerId of scene.getLayerIds()) {
      const layer = scene.getLayer(layerId);
      if (!layer || layer.locked) continue;

      for (let py = 0; py < height; py++) {
        for (let px = 0; px < width; px++) {
          const worldX = x + px;
          const worldY = y + py;
          const clearCell = new Cell(" ", -1, -1);
          layer.setCell(worldX, worldY, clearCell);

          // Emit cell changed event to trigger DOM update
          this.stateManager.emit("cell:changed", {
            x: worldX,
            y: worldY,
            cell: clearCell,
            layerId: layerId,
          });
        }
      }
    }

    this.stateManager.emit("scene:modified");
  }

  /**
   * Paste clipboard data at specified position
   */
  pasteAtPosition(scene, x, y, activeLayerId) {
    // Try to load clipboard data if not available
    if (!this.clipboardData) {
      try {
        const stored = localStorage.getItem("terminalDraw_clipboard");
        if (stored) {
          this.clipboardData = JSON.parse(stored);
        }
      } catch (error) {
        console.warn("Failed to load clipboard data from localStorage:", error);
      }
    }

    if (!this.clipboardData) {
      throw new Error("No clipboard data to paste");
    }

    const { width, height, layers } = this.clipboardData;
    const targetLayers = activeLayerId ? [activeLayerId] : Object.keys(layers);

    for (const layerId of targetLayers) {
      const layer = scene.getLayer(layerId);
      if (!layer || layer.locked) continue;

      const sourceLayer = layers[layerId];
      if (!sourceLayer) continue;

      for (const cellData of sourceLayer) {
        if (!cellData.cell) continue;

        const targetX = x + cellData.x;
        const targetY = y + cellData.y;

        // Check bounds
        if (
          targetX >= 0 &&
          targetX < scene.w &&
          targetY >= 0 &&
          targetY < scene.h
        ) {
          const newCell = new Cell(
            cellData.cell.ch,
            cellData.cell.fg,
            cellData.cell.bg,
          );
          layer.setCell(targetX, targetY, newCell);

          // Emit cell changed event to trigger DOM update
          this.stateManager.emit("cell:changed", {
            x: targetX,
            y: targetY,
            cell: newCell,
            layerId: layerId,
          });
        }
      }
    }

    // Create selection at paste position
    this.setSelection({
      x,
      y,
      width,
      height,
      right: x + width - 1,
      bottom: y + height - 1,
    });

    this.extractSelectedData(scene);

    this.stateManager.emit("selection:pasted", {
      x,
      y,
      width,
      height,
      layers: targetLayers.length,
    });

    this.stateManager.emit("scene:modified");
    this.stateManager.emit("selectionmanager:changed", this.selection);
  }

  /**
   * Start moving current selection
   */
  startMove() {
    if (!this.selection || !this.selectedData) return false;

    // Unused - kept for API compatibility
    return true;
  }

  updateMove(offsetX, offsetY) {
    // Unused - kept for API compatibility
  }

  finalizMove(scene) {
    // Unused - kept for API compatibility
  }

  cancelMove() {
    // Unused - kept for API compatibility
  }

  /**
   * Flip selection horizontally
   */
  flipHorizontal(scene) {
    if (!this.selectedData) return;

    this.clearSelectedArea(scene);

    const { width, layers } = this.selectedData;
    const { x, y } = this.selection;

    for (const [layerId, cells] of Object.entries(layers)) {
      const layer = scene.getLayer(layerId);
      if (!layer || layer.locked) continue;

      for (const cellData of cells) {
        if (!cellData.cell) continue;

        const targetX = x + (width - 1 - cellData.x);
        const targetY = y + cellData.y;

        if (
          targetX >= 0 &&
          targetX < scene.w &&
          targetY >= 0 &&
          targetY < scene.h
        ) {
          const newCell = new Cell(
            cellData.cell.ch,
            cellData.cell.fg,
            cellData.cell.bg,
          );
          layer.setCell(targetX, targetY, newCell);
          this.stateManager.emit("cell:changed", {
            x: targetX,
            y: targetY,
            cell: newCell,
            layerId: layerId,
          });
        }
      }
    }

    // Re-extract the transformed data so repeated operations work
    this.extractSelectedData(scene);

    this.stateManager.emit("scene:modified");
  }

  /**
   * Flip selection vertically
   */
  flipVertical(scene) {
    if (!this.selectedData) return;

    this.clearSelectedArea(scene);

    const { height, layers } = this.selectedData;
    const { x, y } = this.selection;

    for (const [layerId, cells] of Object.entries(layers)) {
      const layer = scene.getLayer(layerId);
      if (!layer || layer.locked) continue;

      for (const cellData of cells) {
        if (!cellData.cell) continue;

        const targetX = x + cellData.x;
        const targetY = y + (height - 1 - cellData.y);

        if (
          targetX >= 0 &&
          targetX < scene.w &&
          targetY >= 0 &&
          targetY < scene.h
        ) {
          const newCell = new Cell(
            cellData.cell.ch,
            cellData.cell.fg,
            cellData.cell.bg,
          );
          layer.setCell(targetX, targetY, newCell);
          this.stateManager.emit("cell:changed", {
            x: targetX,
            y: targetY,
            cell: newCell,
            layerId: layerId,
          });
        }
      }
    }

    // Re-extract the transformed data so repeated operations work
    this.extractSelectedData(scene);

    this.stateManager.emit("scene:modified");
  }

  /**
   * Export selection as plain text
   */
  exportSelectionAsText() {
    if (!this.selectedData) return "";

    const { width, height, layers } = this.selectedData;
    const lines = [];

    // Composite all layers
    for (let y = 0; y < height; y++) {
      let line = "";
      for (let x = 0; x < width; x++) {
        let char = " ";

        // Find topmost visible character
        for (const layerId of Object.keys(layers).reverse()) {
          const cells = layers[layerId];
          const cell = cells.find((c) => c.x === x && c.y === y);
          if (cell && cell.cell && cell.cell.ch !== " ") {
            char = cell.cell.ch;
            break;
          }
        }

        line += char;
      }
      lines.push(line);
    }

    return lines.join("\n");
  }

  /**
   * Check if there's an active selection
   */
  hasSelection() {
    return this.selection !== null;
  }

  /**
   * Check if clipboard has data
   */
  hasClipboardData() {
    if (this.clipboardData !== null) return true;

    // Check localStorage for cross-project data
    try {
      const stored = localStorage.getItem("terminalDraw_clipboard");
      if (stored) {
        this.clipboardData = JSON.parse(stored);
        return true;
      }
    } catch (error) {
      console.warn("Failed to load clipboard data from localStorage:", error);
    }

    return false;
  }

  /**
   * Move selection to new position (simple move without clipboard)
   */
  moveSelectionTo(scene, newX, newY) {
    if (!this.selection || !this.selectedData) return false;

    const { x: oldX, y: oldY, width, height } = this.selection;

    // Bounds check
    if (
      newX < 0 ||
      newY < 0 ||
      newX + width > scene.w ||
      newY + height > scene.h
    ) {
      return false;
    }

    // Clear old area first
    for (const [layerId] of Object.entries(this.selectedData.layers)) {
      const layer = scene.getLayer(layerId);
      if (!layer || layer.locked) continue;

      for (let py = 0; py < height; py++) {
        for (let px = 0; px < width; px++) {
          const worldX = oldX + px;
          const worldY = oldY + py;
          const clearCell = new Cell(" ", -1, -1);
          layer.setCell(worldX, worldY, clearCell);
          this.stateManager.emit("cell:changed", {
            x: worldX,
            y: worldY,
            cell: clearCell,
            layerId: layerId,
          });
        }
      }
    }

    // Place content at new position using stored selectedData
    for (const [layerId, cells] of Object.entries(this.selectedData.layers)) {
      const layer = scene.getLayer(layerId);
      if (!layer || layer.locked) continue;

      for (const cellData of cells) {
        if (cellData.cell && cellData.cell.ch !== " ") {
          const worldX = newX + cellData.x;
          const worldY = newY + cellData.y;
          const newCell = new Cell(
            cellData.cell.ch,
            cellData.cell.fg,
            cellData.cell.bg,
          );
          layer.setCell(worldX, worldY, newCell);
          this.stateManager.emit("cell:changed", {
            x: worldX,
            y: worldY,
            cell: newCell,
            layerId: layerId,
          });
        }
      }
    }

    // Update selection position
    this.selection.x = newX;
    this.selection.y = newY;
    this.selection.right = newX + width - 1;
    this.selection.bottom = newY + height - 1;
    this.selectedData.originX = newX;
    this.selectedData.originY = newY;

    this.stateManager.emit("scene:modified");
    this.stateManager.emit("selectionmanager:changed", this.selection);
    return true;
  }

  /**
   * Get current selection info
   */
  getSelectionInfo() {
    if (!this.selection) return null;

    return {
      ...this.selection,
      hasData: this.selectedData !== null,
      isMoving: this.isMoving,
    };
  }
}
