/**
 * SelectionTool.test.js - Tests for the SelectionTool class
 */

import { describe, it, expect, beforeEach, vi } from "bun:test";
import { SelectionTool } from "../src/tools/SelectionTool.js";
import { Scene } from "../src/core/Scene.js";
import { StateManager } from "../src/core/StateManager.js";

describe("SelectionTool", () => {
  let selectionTool;
  let scene;
  let stateManager;

  beforeEach(() => {
    selectionTool = new SelectionTool();
    scene = new Scene(10, 10);
    stateManager = new StateManager();

    // Mock the emit method to track events
    stateManager.emit = vi.fn();
  });

  describe("Construction", () => {
    it("should create a SelectionTool with correct name", () => {
      expect(selectionTool.name).toBe("Selection");
      expect(selectionTool.isSelecting).toBe(false);
      expect(selectionTool.selectionRect).toBe(null);
    });

    it("should return crosshair cursor", () => {
      expect(selectionTool.getCursor()).toBe("crosshair");
    });
  });

  describe("Selection Process", () => {
    it("should start selection on mouse down", () => {
      selectionTool.onCellDown(2, 3, scene, stateManager);

      expect(selectionTool.isSelecting).toBe(true);
      expect(selectionTool.startX).toBe(2);
      expect(selectionTool.startY).toBe(3);
      expect(selectionTool.currentX).toBe(2);
      expect(selectionTool.currentY).toBe(3);

      // Should emit selection:clear first
      expect(stateManager.emit).toHaveBeenCalledWith("selection:clear");
    });

    it("should update selection during drag", () => {
      // Start selection
      selectionTool.onCellDown(2, 3, scene, stateManager);

      // Clear previous calls to focus on drag behavior
      stateManager.emit.mockClear();

      // Drag to expand selection
      selectionTool.onCellDrag(5, 7, scene, stateManager);

      expect(selectionTool.currentX).toBe(5);
      expect(selectionTool.currentY).toBe(7);
      expect(selectionTool.isSelecting).toBe(true);

      // Should emit selection:changed
      expect(stateManager.emit).toHaveBeenCalledWith(
        "selection:changed",
        expect.any(Object),
      );
    });

    it("should finalize selection on mouse up", () => {
      // Start and drag selection
      selectionTool.onCellDown(1, 1, scene, stateManager);
      selectionTool.onCellDrag(3, 4, scene, stateManager);

      // Clear previous calls
      stateManager.emit.mockClear();

      // Complete selection
      selectionTool.onCellUp(3, 4, scene, stateManager);

      expect(selectionTool.isSelecting).toBe(false);
      expect(stateManager.emit).toHaveBeenCalledWith(
        "selection:completed",
        expect.any(Object),
      );
    });
  });

  describe("Selection Rectangle Calculation", () => {
    it("should calculate correct rectangle for top-left to bottom-right drag", () => {
      selectionTool.onCellDown(2, 3, scene, stateManager);
      selectionTool.onCellUp(5, 7, scene, stateManager);

      const rect = selectionTool.selectionRect;
      expect(rect).toEqual({
        x: 2,
        y: 3,
        width: 4, // 5 - 2 + 1
        height: 5, // 7 - 3 + 1
        right: 5,
        bottom: 7,
      });
    });

    it("should calculate correct rectangle for bottom-right to top-left drag", () => {
      selectionTool.onCellDown(5, 7, scene, stateManager);
      selectionTool.onCellUp(2, 3, scene, stateManager);

      const rect = selectionTool.selectionRect;
      expect(rect).toEqual({
        x: 2,
        y: 3,
        width: 4,
        height: 5,
        right: 5,
        bottom: 7,
      });
    });

    it("should handle single cell selection", () => {
      selectionTool.onCellDown(4, 5, scene, stateManager);
      selectionTool.onCellUp(4, 5, scene, stateManager);

      const rect = selectionTool.selectionRect;
      expect(rect).toEqual({
        x: 4,
        y: 5,
        width: 1,
        height: 1,
        right: 4,
        bottom: 5,
      });
    });

    it("should clamp selection to scene bounds", () => {
      const smallScene = new Scene(5, 5);

      // Try to select beyond bounds
      selectionTool.onCellDown(-2, -1, smallScene, stateManager);
      selectionTool.onCellUp(10, 8, smallScene, stateManager);

      const rect = selectionTool.selectionRect;
      expect(rect.x).toBe(0);
      expect(rect.y).toBe(0);
      expect(rect.right).toBe(4); // scene.w - 1
      expect(rect.bottom).toBe(4); // scene.h - 1
    });
  });

  describe("Selection State Management", () => {
    it("should report selection state correctly", () => {
      expect(selectionTool.hasSelection()).toBe(false);

      selectionTool.onCellDown(1, 1, scene, stateManager);
      selectionTool.onCellUp(3, 3, scene, stateManager);

      expect(selectionTool.hasSelection()).toBe(true);
      expect(selectionTool.getSelection()).toBeTruthy();
    });

    it("should clear selection properly", () => {
      // Create a selection
      selectionTool.onCellDown(1, 1, scene, stateManager);
      selectionTool.onCellUp(3, 3, scene, stateManager);

      expect(selectionTool.hasSelection()).toBe(true);

      // Clear it
      selectionTool.clearSelection(stateManager);

      expect(selectionTool.hasSelection()).toBe(false);
      expect(selectionTool.isSelecting).toBe(false);
      expect(selectionTool.startX).toBe(null);
      expect(selectionTool.startY).toBe(null);
      expect(stateManager.emit).toHaveBeenCalledWith("selection:clear");
    });
  });

  describe("Preview Generation", () => {
    it("should generate preview cells for selection border", () => {
      selectionTool.onCellDown(1, 1, scene, stateManager);
      selectionTool.onCellDrag(3, 3, scene, stateManager);

      // Check that tool:preview was emitted with selection border cells
      const previewCall = stateManager.emit.mock.calls.find(
        (call) => call[0] === "tool:preview" && call[1].tool === "selection",
      );

      expect(previewCall).toBeTruthy();
      expect(previewCall[1].cells).toBeTruthy();
      expect(previewCall[1].cells.length).toBeGreaterThan(0);

      // Check that preview cells form a border
      const previewCells = previewCall[1].cells;
      const borderCells = previewCells.filter((cell) => cell.isSelectionBorder);
      expect(borderCells.length).toBe(previewCells.length);
    });

    it("should use correct preview cell styling", () => {
      selectionTool.onCellDown(1, 1, scene, stateManager);
      selectionTool.onCellDrag(2, 2, scene, stateManager);

      const previewCall = stateManager.emit.mock.calls.find(
        (call) => call[0] === "tool:preview" && call[1].tool === "selection",
      );

      const previewCells = previewCall[1].cells;
      previewCells.forEach((cell) => {
        expect(cell.ch).toBe("·"); // Middle dot
        expect(cell.fg).toBe(11); // Bright cyan
        expect(cell.bg).toBe(-1); // Transparent
        expect(cell.isSelectionBorder).toBe(true);
      });
    });
  });

  describe("Cell Extraction", () => {
    it("should extract cells from selected region", () => {
      // Set up scene with some data
      const layer = scene.layers[0];
      layer.setCell(2, 2, { ch: "A", fg: 1, bg: 2 });
      layer.setCell(3, 2, { ch: "B", fg: 3, bg: 4 });

      // Make selection
      selectionTool.onCellDown(2, 2, scene, stateManager);
      selectionTool.onCellUp(3, 3, scene, stateManager);

      // Extract cells
      const extracted = selectionTool.extractSelectedCells(scene);

      expect(extracted).toBeTruthy();
      expect(extracted.width).toBe(2);
      expect(extracted.height).toBe(2);
      expect(extracted.originX).toBe(2);
      expect(extracted.originY).toBe(2);
      expect(extracted.layers).toBeTruthy();
    });

    it("should handle empty selection extraction", () => {
      const extracted = selectionTool.extractSelectedCells(scene);
      expect(extracted).toBe(null);
    });
  });

  describe("Edge Cases", () => {
    it("should handle onCellDrag without prior onCellDown", () => {
      expect(() => {
        selectionTool.onCellDrag(5, 5, scene, stateManager);
      }).not.toThrow();

      expect(selectionTool.isSelecting).toBe(false);
    });

    it("should handle onCellUp without prior onCellDown", () => {
      expect(() => {
        selectionTool.onCellUp(5, 5, scene, stateManager);
      }).not.toThrow();

      expect(selectionTool.isSelecting).toBe(false);
    });

    it("should handle zero-sized scene", () => {
      const emptyScene = new Scene(0, 0);

      selectionTool.onCellDown(0, 0, emptyScene, stateManager);
      selectionTool.onCellUp(0, 0, emptyScene, stateManager);

      // Should not crash and should create valid (but empty) selection
      expect(selectionTool.selectionRect).toBeTruthy();
    });

    it("should handle coordinates exactly at scene boundaries", () => {
      selectionTool.onCellDown(0, 0, scene, stateManager);
      selectionTool.onCellUp(9, 9, scene, stateManager); // scene is 10x10

      const rect = selectionTool.selectionRect;
      expect(rect.x).toBe(0);
      expect(rect.y).toBe(0);
      expect(rect.right).toBe(9);
      expect(rect.bottom).toBe(9);
      expect(rect.width).toBe(10);
      expect(rect.height).toBe(10);
    });
  });
});
