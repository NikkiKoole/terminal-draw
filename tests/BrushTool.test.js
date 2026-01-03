/**
 * BrushTool.test.js - Tests for BrushTool
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { BrushTool } from "../src/tools/BrushTool.js";
import { Scene } from "../src/core/Scene.js";
import { StateManager } from "../src/core/StateManager.js";
import { Cell } from "../src/core/Cell.js";
import { CommandHistory } from "../src/commands/CommandHistory.js";

describe("BrushTool", () => {
  let scene;
  let stateManager;
  let commandHistory;
  let brush;

  beforeEach(() => {
    scene = new Scene(10, 10);
    stateManager = new StateManager();
    commandHistory = new CommandHistory({ stateManager });
    brush = new BrushTool({ ch: "█", fg: 7, bg: -1 }, commandHistory);
  });

  describe("constructor", () => {
    it('should create a brush tool with name "Brush"', () => {
      expect(brush.name).toBe("Brush");
    });

    it("should have default current cell", () => {
      const cell = brush.getCurrentCell();
      expect(cell.ch).toBe("█");
      expect(cell.fg).toBe(7);
      expect(cell.bg).toBe(-1);
    });

    it("should have default brush size and shape", () => {
      expect(brush.getBrushSize()).toBe(1);
      expect(brush.getBrushShape()).toBe("square");
    });

    it("should accept custom initial cell", () => {
      const customBrush = new BrushTool(
        { ch: "X", fg: 1, bg: 2 },
        commandHistory,
      );
      const cell = customBrush.getCurrentCell();
      expect(cell.ch).toBe("X");
      expect(cell.fg).toBe(1);
      expect(cell.bg).toBe(2);
    });
  });

  describe("setCurrentCell / getCurrentCell", () => {
    it("should set and get current cell", () => {
      brush.setCurrentCell({ ch: "A", fg: 3, bg: 4 });
      const cell = brush.getCurrentCell();
      expect(cell.ch).toBe("A");
      expect(cell.fg).toBe(3);
      expect(cell.bg).toBe(4);
    });

    it("should return a copy not reference", () => {
      const original = { ch: "B", fg: 5, bg: 6 };
      brush.setCurrentCell(original);
      const retrieved = brush.getCurrentCell();

      // Modify retrieved
      retrieved.ch = "Z";

      // Original should be unchanged
      const again = brush.getCurrentCell();
      expect(again.ch).toBe("B");
    });
  });

  describe("onCellDown", () => {
    it("should paint cell on active layer", () => {
      brush.setCurrentCell({ ch: "X", fg: 1, bg: 2 });

      brush.onCellDown(3, 4, scene, stateManager);

      const layer = scene.getActiveLayer();
      const cell = layer.getCell(3, 4);
      expect(cell.ch).toBe("X");
      expect(cell.fg).toBe(1);
      expect(cell.bg).toBe(2);
    });

    it("should emit cell:changed event", () => {
      const events = [];
      stateManager.on("cell:changed", (data) => events.push(data));

      brush.setCurrentCell({ ch: "Y", fg: 3, bg: 4 });
      brush.onCellDown(5, 6, scene, stateManager);

      expect(events.length).toBe(1);
      expect(events[0].x).toBe(5);
      expect(events[0].y).toBe(6);
      expect(events[0].layerId).toBe(scene.activeLayerId);
      expect(events[0].cell.ch).toBe("Y");
      expect(events[0].cell.fg).toBe(3);
      expect(events[0].cell.bg).toBe(4);
    });

    it("should not paint on locked layer", () => {
      const layer = scene.getActiveLayer();
      layer.locked = true;

      brush.setCurrentCell({ ch: "Z", fg: 1, bg: 2 });
      brush.onCellDown(2, 2, scene, stateManager);

      const cell = layer.getCell(2, 2);
      // Cell should remain default (space)
      expect(cell.ch).toBe(" ");
    });

    it("should not emit event when layer is locked", () => {
      const events = [];
      stateManager.on("cell:changed", (data) => events.push(data));

      const layer = scene.getActiveLayer();
      layer.locked = true;

      brush.onCellDown(1, 1, scene, stateManager);

      expect(events.length).toBe(0);
    });

    it("should handle painting on non-default layer", () => {
      scene.setActiveLayer("bg");
      // Paint on the background layer
      brush.setCurrentCell({ ch: "B", fg: 5, bg: 6 });
      brush.onCellDown(7, 8, scene, stateManager);

      // Verify it was painted on the correct layer
      const bgLayer = scene.getLayer("bg");
      const cell = bgLayer.getCell(7, 8);
      expect(cell.ch).toBe("B");
      expect(cell.fg).toBe(5);
      expect(cell.bg).toBe(6);
    });

    it("should NOT paint on invisible layer", () => {
      const layer = scene.getActiveLayer();
      layer.visible = false;

      brush.setCurrentCell({ ch: "H", fg: 2, bg: 3 });
      brush.onCellDown(1, 2, scene, stateManager);

      const cell = layer.getCell(1, 2);
      // Should not paint on invisible layer - cell should remain default
      expect(cell.ch).toBe(" ");
    });
  });

  describe("onCellDrag", () => {
    it("should paint cell during drag", () => {
      brush.setCurrentCell({ ch: "D", fg: 4, bg: 5 });
      brush.onCellDrag(8, 9, scene, stateManager);

      const layer = scene.getActiveLayer();
      const cell = layer.getCell(8, 9);
      expect(cell.ch).toBe("D");
      expect(cell.fg).toBe(4);
      expect(cell.bg).toBe(5);
    });

    it("should emit cell:changed event on drag", () => {
      const events = [];
      stateManager.on("cell:changed", (data) => events.push(data));

      brush.onCellDrag(3, 3, scene, stateManager);

      expect(events.length).toBe(1);
    });

    it("should respect locked layer during drag", () => {
      const layer = scene.getActiveLayer();
      layer.locked = true;

      brush.setCurrentCell({ ch: "L", fg: 1, bg: 2 });
      brush.onCellDrag(4, 5, scene, stateManager);

      const cell = layer.getCell(4, 5);
      expect(cell.ch).toBe(" ");
    });

    it("should allow painting multiple cells in sequence", () => {
      brush.setCurrentCell({ ch: "░", fg: 2, bg: 3 });

      // Paint a horizontal line
      brush.onCellDown(0, 0, scene, stateManager);
      brush.onCellDrag(1, 0, scene, stateManager);
      brush.onCellDrag(2, 0, scene, stateManager);
      brush.onCellUp(2, 0, scene, stateManager);

      const layer = scene.getActiveLayer();
      expect(layer.getCell(0, 0).ch).toBe("░");
      expect(layer.getCell(1, 0).ch).toBe("░");
      expect(layer.getCell(2, 0).ch).toBe("░");
    });
  });

  describe("onCellUp", () => {
    it("should not throw when called", () => {
      expect(() => {
        brush.onCellUp(0, 0, scene, stateManager);
      }).not.toThrow();
    });

    it("should accept eventData parameter", () => {
      expect(() => {
        brush.onCellUp(0, 0, scene, stateManager, { button: 0 });
      }).not.toThrow();
    });
  });

  describe("getCursor", () => {
    it("should return crosshair cursor", () => {
      expect(brush.getCursor()).toBe("crosshair");
    });
  });

  describe("edge cases", () => {
    it("should handle painting at grid boundaries", () => {
      brush.setCurrentCell({ ch: "E", fg: 2, bg: 3 });

      // Top-left corner
      brush.onCellDown(0, 0, scene, stateManager);
      expect(scene.getActiveLayer().getCell(0, 0).ch).toBe("E");

      // Bottom-right corner
      brush.onCellDown(9, 9, scene, stateManager);
      expect(scene.getActiveLayer().getCell(9, 9).ch).toBe("E");
    });

    it("should handle rapid cell changes", () => {
      const events = [];
      stateManager.on("cell:changed", (data) => events.push(data));

      brush.setCurrentCell({ ch: "R", fg: 1, bg: 0 });

      for (let i = 0; i < 10; i++) {
        brush.onCellDrag(i, 5, scene, stateManager);
      }

      expect(events.length).toBe(10);
    });

    it("should handle painting with space character", () => {
      brush.setCurrentCell({ ch: " ", fg: 0, bg: 1 });
      brush.onCellDown(5, 5, scene, stateManager);

      const cell = scene.getActiveLayer().getCell(5, 5);
      expect(cell.ch).toBe(" ");
      expect(cell.bg).toBe(1); // Background should still be set
    });

    it("should handle painting with transparent background", () => {
      brush.setCurrentCell({ ch: "█", fg: 3, bg: -1 });

      brush.onCellDown(3, 3, scene, stateManager);

      const cell = scene.getActiveLayer().getCell(3, 3);
      expect(cell.bg).toBe(-1);
    });

    describe("Paint Mode", () => {
      it("should have default paint mode 'all'", () => {
        expect(brush.getPaintMode()).toBe("all");
      });

      it("should set paint mode", () => {
        brush.setPaintMode("fg");
        expect(brush.getPaintMode()).toBe("fg");

        brush.setPaintMode("bg");
        expect(brush.getPaintMode()).toBe("bg");

        brush.setPaintMode("glyph");
        expect(brush.getPaintMode()).toBe("glyph");

        brush.setPaintMode("all");
        expect(brush.getPaintMode()).toBe("all");
      });

      it("should ignore invalid paint modes", () => {
        brush.setPaintMode("fg");
        brush.setPaintMode("invalid");
        expect(brush.getPaintMode()).toBe("fg"); // Should not change
      });

      it("should cycle through paint modes", () => {
        expect(brush.getPaintMode()).toBe("all");

        let mode = brush.cyclePaintMode();
        expect(mode).toBe("fg");
        expect(brush.getPaintMode()).toBe("fg");

        mode = brush.cyclePaintMode();
        expect(mode).toBe("bg");
        expect(brush.getPaintMode()).toBe("bg");

        mode = brush.cyclePaintMode();
        expect(mode).toBe("glyph");
        expect(brush.getPaintMode()).toBe("glyph");

        mode = brush.cyclePaintMode();
        expect(mode).toBe("all");
        expect(brush.getPaintMode()).toBe("all");
      });

      it("should paint only foreground in 'fg' mode", () => {
        const layer = scene.getActiveLayer();
        layer.setCell(5, 5, new Cell("X", 1, 2));

        brush.setPaintMode("fg");
        brush.setCurrentCell({ ch: "Y", fg: 3, bg: 4 });
        brush.onCellDown(5, 5, scene, stateManager);

        const cell = layer.getCell(5, 5);
        expect(cell.ch).toBe("X"); // Preserved
        expect(cell.fg).toBe(3); // Changed
        expect(cell.bg).toBe(2); // Preserved
      });

      it("should paint only background in 'bg' mode", () => {
        const layer = scene.getActiveLayer();
        layer.setCell(5, 5, new Cell("X", 1, 2));

        brush.setPaintMode("bg");
        brush.setCurrentCell({ ch: "Y", fg: 3, bg: 4 });
        brush.onCellDown(5, 5, scene, stateManager);

        const cell = layer.getCell(5, 5);
        expect(cell.ch).toBe("X"); // Preserved
        expect(cell.fg).toBe(1); // Preserved
        expect(cell.bg).toBe(4); // Changed
      });

      it("should paint only glyph in 'glyph' mode", () => {
        const layer = scene.getActiveLayer();
        layer.setCell(5, 5, new Cell("X", 1, 2));

        brush.setPaintMode("glyph");
        brush.setCurrentCell({ ch: "Y", fg: 3, bg: 4 });
        brush.onCellDown(5, 5, scene, stateManager);

        const cell = layer.getCell(5, 5);
        expect(cell.ch).toBe("Y"); // Changed
        expect(cell.fg).toBe(1); // Preserved
        expect(cell.bg).toBe(2); // Preserved
      });

      it("should paint all attributes in 'all' mode", () => {
        const layer = scene.getActiveLayer();
        layer.setCell(5, 5, new Cell("X", 1, 2));

        brush.setPaintMode("all");
        brush.setCurrentCell({ ch: "Y", fg: 3, bg: 4 });
        brush.onCellDown(5, 5, scene, stateManager);

        const cell = layer.getCell(5, 5);
        expect(cell.ch).toBe("Y"); // Changed
        expect(cell.fg).toBe(3); // Changed
        expect(cell.bg).toBe(4); // Changed
      });

      it("should work with undo/redo in different paint modes", () => {
        const layer = scene.getActiveLayer();
        layer.setCell(5, 5, new Cell("X", 1, 2));

        // Paint foreground only
        brush.setPaintMode("fg");
        brush.setCurrentCell({ ch: "Y", fg: 3, bg: 4 });
        brush.onCellDown(5, 5, scene, stateManager);

        let cell = layer.getCell(5, 5);
        expect(cell.fg).toBe(3);

        // Undo
        commandHistory.undo();
        cell = layer.getCell(5, 5);
        expect(cell.fg).toBe(1); // Back to original

        // Redo
        commandHistory.redo();
        cell = layer.getCell(5, 5);
        expect(cell.fg).toBe(3); // Forward again
      });
    });
  });

  describe("brush size and shape", () => {
    describe("setBrushSize / getBrushSize", () => {
      it("should set valid brush sizes", () => {
        brush.setBrushSize(1);
        expect(brush.getBrushSize()).toBe(1);

        brush.setBrushSize(2);
        expect(brush.getBrushSize()).toBe(2);

        brush.setBrushSize(3);
        expect(brush.getBrushSize()).toBe(3);

        brush.setBrushSize(5);
        expect(brush.getBrushSize()).toBe(5);

        brush.setBrushSize(7);
        expect(brush.getBrushSize()).toBe(7);
      });

      it("should ignore invalid brush sizes", () => {
        brush.setBrushSize(3);
        brush.setBrushSize(4); // Invalid size
        expect(brush.getBrushSize()).toBe(3); // Should not change

        brush.setBrushSize(10); // Invalid size
        expect(brush.getBrushSize()).toBe(3); // Should not change
      });
    });

    describe("setBrushShape / getBrushShape", () => {
      it("should set valid brush shapes", () => {
        brush.setBrushShape("square");
        expect(brush.getBrushShape()).toBe("square");

        brush.setBrushShape("circle");
        expect(brush.getBrushShape()).toBe("circle");

        brush.setBrushShape("triangle");
        expect(brush.getBrushShape()).toBe("triangle");

        brush.setBrushShape("cross");
        expect(brush.getBrushShape()).toBe("cross");

        brush.setBrushShape("plus");
        expect(brush.getBrushShape()).toBe("plus");

        brush.setBrushShape("minus");
        expect(brush.getBrushShape()).toBe("minus");
      });

      it("should ignore invalid brush shapes", () => {
        brush.setBrushShape("circle");
        brush.setBrushShape("diamond"); // Invalid shape
        expect(brush.getBrushShape()).toBe("circle"); // Should not change

        brush.setBrushShape("invalid"); // Invalid shape
        expect(brush.getBrushShape()).toBe("circle"); // Should not change
      });
    });

    describe("_getBrushCells", () => {
      it("should return single cell for 1x1 brush", () => {
        brush.setBrushSize(1);
        const cells = brush._getBrushCells(5, 5, scene);
        expect(cells).toHaveLength(1);
        expect(cells[0]).toEqual({ x: 5, y: 5 });
      });

      it("should return correct cells for 2x2 square brush", () => {
        brush.setBrushSize(2);
        brush.setBrushShape("square");
        const cells = brush._getBrushCells(5, 5, scene);
        expect(cells).toHaveLength(4);
        expect(cells).toContainEqual({ x: 4, y: 4 });
        expect(cells).toContainEqual({ x: 5, y: 4 });
        expect(cells).toContainEqual({ x: 4, y: 5 });
        expect(cells).toContainEqual({ x: 5, y: 5 });
      });

      it("should return correct cells for 3x3 square brush", () => {
        brush.setBrushSize(3);
        brush.setBrushShape("square");
        const cells = brush._getBrushCells(5, 5, scene);
        expect(cells).toHaveLength(9);
        // Check corners
        expect(cells).toContainEqual({ x: 4, y: 4 });
        expect(cells).toContainEqual({ x: 6, y: 6 });
        // Check center
        expect(cells).toContainEqual({ x: 5, y: 5 });
      });

      it("should return correct cells for 3x3 circle brush", () => {
        brush.setBrushSize(3);
        brush.setBrushShape("circle");
        const cells = brush._getBrushCells(5, 5, scene);
        // Circle should exclude corners that are too far
        expect(cells.length).toBeLessThan(9);
        // Center should always be included
        expect(cells).toContainEqual({ x: 5, y: 5 });
        // Adjacent cells should be included
        expect(cells).toContainEqual({ x: 4, y: 5 });
        expect(cells).toContainEqual({ x: 6, y: 5 });
        expect(cells).toContainEqual({ x: 5, y: 4 });
        expect(cells).toContainEqual({ x: 5, y: 6 });
      });

      it("should return correct cells for 3x3 triangle brush", () => {
        brush.setBrushSize(3);
        brush.setBrushShape("triangle");
        const cells = brush._getBrushCells(5, 5, scene);
        // Triangle should have fewer cells than square but more than single point
        expect(cells.length).toBeGreaterThan(1);
        expect(cells.length).toBeLessThan(9);
        // Center should always be included
        expect(cells).toContainEqual({ x: 5, y: 5 });
        // Bottom row should have most cells
        expect(cells).toContainEqual({ x: 5, y: 6 });
      });

      it("should return correct cells for 5x5 triangle brush", () => {
        brush.setBrushSize(5);
        brush.setBrushShape("triangle");
        const cells = brush._getBrushCells(5, 5, scene);
        // Triangle should have fewer cells than square
        expect(cells.length).toBeGreaterThan(1);
        expect(cells.length).toBeLessThan(25);
        // Center should be included
        expect(cells).toContainEqual({ x: 5, y: 5 });
        // Bottom center should be included
        expect(cells).toContainEqual({ x: 5, y: 7 });
      });

      it("should respect grid boundaries", () => {
        brush.setBrushSize(3);
        // Paint near edge
        const cells = brush._getBrushCells(0, 0, scene);
        // Should not include cells with negative coordinates
        for (const cell of cells) {
          expect(cell.x).toBeGreaterThanOrEqual(0);
          expect(cell.y).toBeGreaterThanOrEqual(0);
        }
      });

      it("should respect grid boundaries on right edge", () => {
        brush.setBrushSize(3);
        // Paint near right edge (scene is 10x10, so max is 9,9)
        const cells = brush._getBrushCells(9, 9, scene);
        // Should not include cells beyond grid
        for (const cell of cells) {
          expect(cell.x).toBeLessThan(10);
          expect(cell.y).toBeLessThan(10);
        }
      });

      it("should handle 5x5 brush correctly", () => {
        brush.setBrushSize(5);
        brush.setBrushShape("square");
        const cells = brush._getBrushCells(5, 5, scene);
        expect(cells).toHaveLength(25);
        // Check corners
        expect(cells).toContainEqual({ x: 3, y: 3 });
        expect(cells).toContainEqual({ x: 7, y: 7 });
      });

      it("should handle 7x7 brush correctly", () => {
        brush.setBrushSize(7);
        brush.setBrushShape("square");
        const cells = brush._getBrushCells(5, 5, scene);
        expect(cells).toHaveLength(49);
        // Check corners
        expect(cells).toContainEqual({ x: 2, y: 2 });
        expect(cells).toContainEqual({ x: 8, y: 8 });
      });

      it("should handle triangle shape with different sizes", () => {
        // Test 2x2 triangle
        brush.setBrushSize(2);
        brush.setBrushShape("triangle");
        let cells = brush._getBrushCells(5, 5, scene);
        expect(cells.length).toBeGreaterThan(1);
        expect(cells.length).toBeLessThanOrEqual(4);

        // Test 7x7 triangle
        brush.setBrushSize(7);
        brush.setBrushShape("triangle");
        cells = brush._getBrushCells(5, 5, scene);
        expect(cells.length).toBeGreaterThan(1);
        expect(cells.length).toBeLessThan(49); // Less than square
      });

      it("should return correct cells for 3x3 cross brush", () => {
        brush.setBrushSize(3);
        brush.setBrushShape("cross");
        const cells = brush._getBrushCells(5, 5, scene);
        // Cross (X) should have 5 cells in a 3x3: center + 4 corners
        expect(cells).toHaveLength(5);
        expect(cells).toContainEqual({ x: 4, y: 4 }); // top-left
        expect(cells).toContainEqual({ x: 5, y: 5 }); // center
        expect(cells).toContainEqual({ x: 6, y: 6 }); // bottom-right
        expect(cells).toContainEqual({ x: 6, y: 4 }); // top-right
        expect(cells).toContainEqual({ x: 4, y: 6 }); // bottom-left
      });

      it("should return correct cells for 3x3 plus brush", () => {
        brush.setBrushSize(3);
        brush.setBrushShape("plus");
        const cells = brush._getBrushCells(5, 5, scene);
        // Plus (+) should have 5 cells in a 3x3: center + 4 cardinal directions
        expect(cells).toHaveLength(5);
        expect(cells).toContainEqual({ x: 5, y: 4 }); // top
        expect(cells).toContainEqual({ x: 5, y: 5 }); // center
        expect(cells).toContainEqual({ x: 5, y: 6 }); // bottom
        expect(cells).toContainEqual({ x: 4, y: 5 }); // left
        expect(cells).toContainEqual({ x: 6, y: 5 }); // right
      });

      it("should return correct cells for 3x3 minus brush", () => {
        brush.setBrushSize(3);
        brush.setBrushShape("minus");
        const cells = brush._getBrushCells(5, 5, scene);
        // Minus (-) should have 3 cells in a horizontal line
        expect(cells).toHaveLength(3);
        expect(cells).toContainEqual({ x: 4, y: 5 }); // left
        expect(cells).toContainEqual({ x: 5, y: 5 }); // center
        expect(cells).toContainEqual({ x: 6, y: 5 }); // right
      });

      it("should return correct cells for 5x5 cross brush", () => {
        brush.setBrushSize(5);
        brush.setBrushShape("cross");
        const cells = brush._getBrushCells(5, 5, scene);
        // Cross (X) should have 9 cells in a 5x5
        expect(cells).toHaveLength(9);
        expect(cells).toContainEqual({ x: 5, y: 5 }); // center
        // Main diagonal
        expect(cells).toContainEqual({ x: 3, y: 3 });
        expect(cells).toContainEqual({ x: 4, y: 4 });
        expect(cells).toContainEqual({ x: 6, y: 6 });
        expect(cells).toContainEqual({ x: 7, y: 7 });
        // Anti-diagonal
        expect(cells).toContainEqual({ x: 7, y: 3 });
        expect(cells).toContainEqual({ x: 6, y: 4 });
        expect(cells).toContainEqual({ x: 4, y: 6 });
        expect(cells).toContainEqual({ x: 3, y: 7 });
      });

      it("should return correct cells for 5x5 plus brush", () => {
        brush.setBrushSize(5);
        brush.setBrushShape("plus");
        const cells = brush._getBrushCells(5, 5, scene);
        // Plus (+) should have 9 cells in a 5x5
        expect(cells).toHaveLength(9);
        expect(cells).toContainEqual({ x: 5, y: 5 }); // center
        // Vertical line
        expect(cells).toContainEqual({ x: 5, y: 3 });
        expect(cells).toContainEqual({ x: 5, y: 4 });
        expect(cells).toContainEqual({ x: 5, y: 6 });
        expect(cells).toContainEqual({ x: 5, y: 7 });
        // Horizontal line
        expect(cells).toContainEqual({ x: 3, y: 5 });
        expect(cells).toContainEqual({ x: 4, y: 5 });
        expect(cells).toContainEqual({ x: 6, y: 5 });
        expect(cells).toContainEqual({ x: 7, y: 5 });
      });

      it("should return correct cells for 5x5 minus brush", () => {
        brush.setBrushSize(5);
        brush.setBrushShape("minus");
        const cells = brush._getBrushCells(5, 5, scene);
        // Minus (-) should have 5 cells in a horizontal line
        expect(cells).toHaveLength(5);
        expect(cells).toContainEqual({ x: 3, y: 5 });
        expect(cells).toContainEqual({ x: 4, y: 5 });
        expect(cells).toContainEqual({ x: 5, y: 5 }); // center
        expect(cells).toContainEqual({ x: 6, y: 5 });
        expect(cells).toContainEqual({ x: 7, y: 5 });
      });
    });

    describe("multi-cell painting", () => {
      it("should paint multiple cells with 3x3 brush", () => {
        brush.setBrushSize(3);
        brush.setBrushShape("square");
        brush.setCurrentCell({ ch: "█", fg: 7, bg: -1 });

        brush.onCellDown(5, 5, scene, stateManager);

        const layer = scene.getActiveLayer();
        // Check that multiple cells were painted
        expect(layer.getCell(4, 4).ch).toBe("█");
        expect(layer.getCell(5, 5).ch).toBe("█");
        expect(layer.getCell(6, 6).ch).toBe("█");
      });

      it("should respect paint mode with multi-cell brushes", () => {
        brush.setBrushSize(2);
        brush.setPaintMode("fg");
        brush.setCurrentCell({ ch: "X", fg: 3, bg: 4 });

        const layer = scene.getActiveLayer();
        // Set up existing cells with different attributes
        layer.setCell(4, 4, new Cell("A", 1, 2));
        layer.setCell(5, 4, new Cell("B", 1, 2));

        brush.onCellDown(5, 5, scene, stateManager);

        // Check that only foreground was changed
        const cell1 = layer.getCell(4, 4);
        expect(cell1.ch).toBe("A"); // Preserved
        expect(cell1.fg).toBe(3); // Changed
        expect(cell1.bg).toBe(2); // Preserved
      });

      it("should work with undo/redo for multi-cell painting", () => {
        brush.setBrushSize(2);
        brush.setCurrentCell({ ch: "█", fg: 7, bg: -1 });

        brush.onCellDown(5, 5, scene, stateManager);

        const layer = scene.getActiveLayer();
        // Verify cells are painted
        expect(layer.getCell(4, 4).ch).toBe("█");
        expect(layer.getCell(5, 5).ch).toBe("█");

        // Undo
        commandHistory.undo();

        // Verify cells are restored
        expect(layer.getCell(4, 4).ch).toBe(" ");
        expect(layer.getCell(5, 5).ch).toBe(" ");

        // Redo
        commandHistory.redo();

        // Verify cells are painted again
        expect(layer.getCell(4, 4).ch).toBe("█");
        expect(layer.getCell(5, 5).ch).toBe("█");
      });

      it("should not paint on locked layer with multi-cell brush", () => {
        const layer = scene.getActiveLayer();
        layer.locked = true;

        brush.setBrushSize(3);
        brush.setCurrentCell({ ch: "X", fg: 1, bg: 2 });
        brush.onCellDown(5, 5, scene, stateManager);

        // No cells should be painted
        expect(layer.getCell(4, 4).ch).toBe(" ");
        expect(layer.getCell(5, 5).ch).toBe(" ");
        expect(layer.getCell(6, 6).ch).toBe(" ");
      });

      it("should not paint on invisible layer with multi-cell brush", () => {
        const layer = scene.getActiveLayer();
        layer.visible = false;

        brush.setBrushSize(3);
        brush.setCurrentCell({ ch: "X", fg: 1, bg: 2 });
        brush.onCellDown(5, 5, scene, stateManager);

        // No cells should be painted
        expect(layer.getCell(4, 4).ch).toBe(" ");
        expect(layer.getCell(5, 5).ch).toBe(" ");
        expect(layer.getCell(6, 6).ch).toBe(" ");
      });

      it("should emit correct number of events for multi-cell painting", () => {
        const events = [];
        stateManager.on("cell:changed", (data) => events.push(data));

        brush.setBrushSize(2);
        brush.onCellDown(5, 5, scene, stateManager);

        // Should emit one event per painted cell
        expect(events.length).toBe(4);
      });

      it("should paint triangle shape correctly", () => {
        brush.setBrushSize(3);
        brush.setBrushShape("triangle");
        brush.setCurrentCell({ ch: "▲", fg: 7, bg: -1 });

        brush.onCellDown(5, 5, scene, stateManager);

        const layer = scene.getActiveLayer();
        // Triangle should paint fewer cells than a square
        let paintedCount = 0;
        for (let y = 0; y < 10; y++) {
          for (let x = 0; x < 10; x++) {
            if (layer.getCell(x, y).ch === "▲") {
              paintedCount++;
            }
          }
        }
        expect(paintedCount).toBeGreaterThan(1);
        expect(paintedCount).toBeLessThan(9); // Less than 3x3 square

        // Center should always be painted
        expect(layer.getCell(5, 5).ch).toBe("▲");
      });
    });
  });

  describe("integration", () => {
    it("should work with complete paint workflow", () => {
      const events = [];
      stateManager.on("cell:changed", (data) => events.push(data));

      // Set up brush
      brush.setCurrentCell({ ch: "█", fg: 4, bg: 2 });

      // Mouse down
      brush.onCellDown(2, 2, scene, stateManager);

      // Drag across cells
      brush.onCellDrag(3, 2, scene, stateManager);
      brush.onCellDrag(4, 2, scene, stateManager);

      // Mouse up
      brush.onCellUp(4, 2, scene, stateManager);

      // Verify cells were painted
      const layer = scene.getActiveLayer();
      expect(layer.getCell(2, 2).ch).toBe("█");
      expect(layer.getCell(3, 2).ch).toBe("█");
      expect(layer.getCell(4, 2).ch).toBe("█");

      // Verify events
      expect(events.length).toBe(3);
    });

    it("should work with layer switching", () => {
      brush.setCurrentCell({ ch: "F", fg: 6, bg: 7 });

      // Paint on mid layer
      scene.setActiveLayer("mid");
      brush.onCellDown(5, 5, scene, stateManager);

      // Paint on bg layer
      scene.setActiveLayer("bg");
      brush.onCellDown(5, 5, scene, stateManager);

      // Verify both layers have the painted cell
      expect(scene.getLayer("mid").getCell(5, 5).ch).toBe("F");
      expect(scene.getLayer("bg").getCell(5, 5).ch).toBe("F");
    });
  });
});
