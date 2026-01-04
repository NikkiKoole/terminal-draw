/**
 * SelectionManager.test.js - Tests for the SelectionManager class
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { SelectionManager } from "../src/core/SelectionManager.js";
import { Scene } from "../src/core/Scene.js";
import { StateManager } from "../src/core/StateManager.js";
import { Cell } from "../src/core/Cell.js";

describe("SelectionManager", () => {
  let selectionManager;
  let scene;
  let stateManager;

  beforeEach(() => {
    stateManager = new StateManager();
    selectionManager = new SelectionManager(stateManager);
    scene = new Scene(10, 10);

    // Add some test data to the scene
    const layer = scene.layers[0];
    layer.setCell(2, 2, new Cell("A", 1, 2));
    layer.setCell(3, 2, new Cell("B", 3, 4));
    layer.setCell(2, 3, new Cell("C", 5, 6));
    layer.setCell(3, 3, new Cell("D", 7, 8));

    // Mock navigator.clipboard and localStorage
    global.navigator = {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(),
      },
    };
    global.localStorage = {
      setItem: vi.fn(),
      getItem: vi.fn().mockReturnValue(null),
      removeItem: vi.fn(),
    };
  });

  describe("Construction and Setup", () => {
    it("should create a SelectionManager with initial state", () => {
      expect(selectionManager.selection).toBe(null);
      expect(selectionManager.selectedData).toBe(null);
      expect(selectionManager.clipboardData).toBe(null);
      expect(selectionManager.isMoving).toBe(false);
    });

    it("should respond to selection events", () => {
      const rect = { x: 1, y: 1, width: 2, height: 2 };

      stateManager.emit("selection:changed", rect);
      expect(selectionManager.selection).toEqual(rect);

      stateManager.emit("selection:clear");
      expect(selectionManager.selection).toBe(null);
    });
  });

  describe("Selection Management", () => {
    it("should set and clear selection correctly", () => {
      const rect = { x: 2, y: 2, width: 2, height: 2 };

      selectionManager.setSelection(rect);
      expect(selectionManager.hasSelection()).toBe(true);
      expect(selectionManager.getSelectionInfo()).toMatchObject(rect);

      selectionManager.clearSelection();
      expect(selectionManager.hasSelection()).toBe(false);
      expect(selectionManager.selectedData).toBe(null);
    });

    it("should extract selected data from scene", () => {
      const rect = { x: 2, y: 2, width: 2, height: 2 };
      selectionManager.setSelection(rect);

      const extracted = selectionManager.extractSelectedData(scene);

      expect(extracted).toBeTruthy();
      expect(extracted.width).toBe(2);
      expect(extracted.height).toBe(2);
      expect(extracted.originX).toBe(2);
      expect(extracted.originY).toBe(2);
      expect(extracted.layers).toBeTruthy();

      const layerId = scene.layers[0].id;
      const layerCells = extracted.layers[layerId];
      expect(layerCells).toBeTruthy();
      expect(layerCells.length).toBe(4); // 2x2 = 4 cells

      // Check specific extracted cells
      const cellA = layerCells.find((c) => c.x === 0 && c.y === 0);
      expect(cellA.cell.ch).toBe("A");
      expect(cellA.cell.fg).toBe(1);
      expect(cellA.cell.bg).toBe(2);
    });
  });

  describe("Copy Operations", () => {
    beforeEach(() => {
      const rect = { x: 2, y: 2, width: 2, height: 2 };
      selectionManager.setSelection(rect);
    });

    it("should copy selection to clipboard", async () => {
      const result = await selectionManager.copySelection(scene);

      expect(result).toBeTruthy();
      expect(selectionManager.hasClipboardData()).toBe(true);
      expect(selectionManager.clipboardData.width).toBe(2);
      expect(selectionManager.clipboardData.height).toBe(2);
      expect(selectionManager.clipboardData.sourceProject).toBeTruthy();

      // Should also copy to system clipboard
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });

    it("should cut selection to clipboard and clear area", async () => {
      const result = await selectionManager.cutSelection(scene);

      expect(result).toBeTruthy();
      expect(selectionManager.hasClipboardData()).toBe(true);

      // Original area should be cleared
      const layer = scene.layers[0];
      expect(layer.getCell(2, 2).ch).toBe(" "); // Should be cleared
      expect(layer.getCell(3, 3).ch).toBe(" "); // Should be cleared
    });

    it("should throw error when copying without selection", async () => {
      selectionManager.clearSelection();

      await expect(selectionManager.copySelection(scene)).rejects.toThrow(
        "No selection to copy",
      );
    });

    it("should export selection as plain text", () => {
      selectionManager.extractSelectedData(scene);

      const text = selectionManager.exportSelectionAsText();

      expect(text).toBeTruthy();
      expect(text).toContain("A");
      expect(text).toContain("B");
      expect(text).toContain("C");
      expect(text).toContain("D");
    });
  });

  describe("Paste Operations", () => {
    beforeEach(async () => {
      // Setup clipboard data
      const rect = { x: 2, y: 2, width: 2, height: 2 };
      selectionManager.setSelection(rect);
      await selectionManager.copySelection(scene);
    });

    it("should paste at specified position", () => {
      const pasteX = 5;
      const pasteY = 5;

      selectionManager.pasteAtPosition(
        scene,
        pasteX,
        pasteY,
        scene.layers[0].id,
      );

      // Check pasted content
      const layer = scene.layers[0];
      expect(layer.getCell(5, 5).ch).toBe("A");
      expect(layer.getCell(6, 5).ch).toBe("B");
      expect(layer.getCell(5, 6).ch).toBe("C");
      expect(layer.getCell(6, 6).ch).toBe("D");

      // Should create new selection at paste location
      expect(selectionManager.selection.x).toBe(pasteX);
      expect(selectionManager.selection.y).toBe(pasteY);
    });

    it("should respect scene boundaries when pasting", () => {
      // Try to paste partially outside bounds
      selectionManager.pasteAtPosition(scene, 9, 9, scene.layers[0].id);

      const layer = scene.layers[0];
      expect(layer.getCell(9, 9).ch).toBe("A"); // Only this cell should be pasted
    });

    it("should throw error when pasting without clipboard data", () => {
      selectionManager.clipboardData = null;

      expect(() => {
        selectionManager.pasteAtPosition(scene, 0, 0, scene.layers[0].id);
      }).toThrow("No clipboard data to paste");
    });
  });

  describe("Transform Operations", () => {
    beforeEach(() => {
      const rect = { x: 2, y: 2, width: 2, height: 2 };
      selectionManager.setSelection(rect);
      selectionManager.extractSelectedData(scene);
    });

    it("should flip selection horizontally", () => {
      selectionManager.flipHorizontal(scene);

      // Check that cells are flipped horizontally
      const layer = scene.layers[0];
      expect(layer.getCell(2, 2).ch).toBe("B"); // Was 'A', now 'B' (flipped)
      expect(layer.getCell(3, 2).ch).toBe("A"); // Was 'B', now 'A' (flipped)
    });

    it("should flip selection vertically", () => {
      selectionManager.flipVertical(scene);

      // Check that cells are flipped vertically
      const layer = scene.layers[0];
      expect(layer.getCell(2, 2).ch).toBe("C"); // Was 'A', now 'C' (flipped)
      expect(layer.getCell(2, 3).ch).toBe("A"); // Was 'C', now 'A' (flipped)
    });

    it("should not transform without selected data", () => {
      selectionManager.selectedData = null;

      expect(() => {
        selectionManager.flipHorizontal(scene);
      }).not.toThrow();

      expect(() => {
        selectionManager.flipVertical(scene);
      }).not.toThrow();
    });
  });

  describe("Move Operations", () => {
    beforeEach(() => {
      const rect = { x: 2, y: 2, width: 2, height: 2 };
      selectionManager.setSelection(rect);
      selectionManager.extractSelectedData(scene);
    });

    it("should move selection to new position", () => {
      const success = selectionManager.moveSelectionTo(scene, 4, 4);

      expect(success).toBe(true);
      expect(selectionManager.selection.x).toBe(4);
      expect(selectionManager.selection.y).toBe(4);

      // Check that content moved to new location
      const layer = scene.layers[0];
      expect(layer.getCell(4, 4).ch).toBe("A"); // Moved from (2,2) to (4,4)
      expect(layer.getCell(2, 2).ch).toBe(" "); // Original location cleared
    });

    it("should not move selection out of bounds", () => {
      const success = selectionManager.moveSelectionTo(scene, 9, 9);

      expect(success).toBe(false);
      expect(selectionManager.selection.x).toBe(2); // Should remain unchanged
      expect(selectionManager.selection.y).toBe(2);
    });

    it("should not move without selection", () => {
      selectionManager.selection = null;
      selectionManager.selectedData = null;

      const success = selectionManager.moveSelectionTo(scene, 4, 4);
      expect(success).toBe(false);
    });
  });

  describe("Clipboard Integration", () => {
    it("should handle clipboard data persistence", async () => {
      const rect = { x: 2, y: 2, width: 2, height: 2 };
      selectionManager.setSelection(rect);

      await selectionManager.copySelection(scene);

      expect(selectionManager.hasClipboardData()).toBe(true);
      expect(selectionManager.clipboardData.timestamp).toBeTruthy();
      expect(selectionManager.clipboardData.layers).toBeTruthy();
    });

    it("should clear selected area properly", () => {
      const rect = { x: 2, y: 2, width: 2, height: 2 };
      selectionManager.setSelection(rect);

      selectionManager.clearSelectedArea(scene);

      const layer = scene.layers[0];
      expect(layer.getCell(2, 2).ch).toBe(" ");
      expect(layer.getCell(3, 2).ch).toBe(" ");
      expect(layer.getCell(2, 3).ch).toBe(" ");
      expect(layer.getCell(3, 3).ch).toBe(" ");
    });
  });

  describe("State Queries", () => {
    it("should report correct selection info", () => {
      expect(selectionManager.hasSelection()).toBe(false);
      expect(selectionManager.getSelectionInfo()).toBe(null);

      const rect = { x: 2, y: 2, width: 2, height: 2 };
      selectionManager.setSelection(rect);
      selectionManager.extractSelectedData(scene);

      expect(selectionManager.hasSelection()).toBe(true);
      const info = selectionManager.getSelectionInfo();
      expect(info).toMatchObject(rect);
      expect(info.hasData).toBe(true);
      expect(info.isMoving).toBe(false);
    });

    it("should track selection info properly", () => {
      const rect = { x: 2, y: 2, width: 2, height: 2 };
      selectionManager.setSelection(rect);
      selectionManager.extractSelectedData(scene);

      const info = selectionManager.getSelectionInfo();
      expect(info.isMoving).toBe(false);
      expect(info.hasData).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("should handle missing scene gracefully", () => {
      const rect = { x: 2, y: 2, width: 2, height: 2 };
      selectionManager.setSelection(rect);

      expect(() => {
        selectionManager.extractSelectedData(null);
      }).not.toThrow();
    });

    it("should handle system clipboard errors gracefully", async () => {
      // Mock clipboard failure
      navigator.clipboard.writeText = vi
        .fn()
        .mockRejectedValue(new Error("Clipboard not available"));

      const rect = { x: 2, y: 2, width: 2, height: 2 };
      selectionManager.setSelection(rect);

      // Should still work even if system clipboard fails
      const result = await selectionManager.copySelection(scene);
      expect(result).toBeTruthy();
      expect(selectionManager.hasClipboardData()).toBe(true);
    });
  });
});
