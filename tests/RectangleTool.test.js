/**
 * RectangleTool.test.js - Tests for RectangleTool
 */

import { describe, it, expect, beforeEach } from "vitest";
import { RectangleTool } from "../src/tools/RectangleTool.js";
import { Scene } from "../src/core/Scene.js";
import { StateManager } from "../src/core/StateManager.js";
import { Cell } from "../src/core/Cell.js";
import { CommandHistory } from "../src/commands/CommandHistory.js";

describe("RectangleTool", () => {
  let scene;
  let stateManager;
  let commandHistory;
  let rectangleTool;

  beforeEach(() => {
    scene = new Scene(20, 20);
    stateManager = new StateManager();
    commandHistory = new CommandHistory({ stateManager });
    rectangleTool = new RectangleTool(
      { ch: "█", fg: 7, bg: -1 },
      commandHistory,
    );
  });

  describe("constructor", () => {
    it('should create a rectangle tool with name "Rectangle"', () => {
      expect(rectangleTool.name).toBe("Rectangle");
    });

    it("should have default current cell", () => {
      const cell = rectangleTool.getCurrentCell();
      expect(cell.ch).toBe("█");
      expect(cell.fg).toBe(7);
      expect(cell.bg).toBe(-1);
    });

    it("should have default drawing mode 'normal'", () => {
      expect(rectangleTool.getDrawingMode()).toBe("normal");
    });

    it("should have default paint mode 'all'", () => {
      expect(rectangleTool.getPaintMode()).toBe("all");
    });

    it("should have default fill mode 'outline'", () => {
      expect(rectangleTool.getFillMode()).toBe("outline");
    });
  });

  describe("setCurrentCell / getCurrentCell", () => {
    it("should set and get current cell", () => {
      rectangleTool.setCurrentCell({ ch: "X", fg: 1, bg: 2 });
      const cell = rectangleTool.getCurrentCell();
      expect(cell.ch).toBe("X");
      expect(cell.fg).toBe(1);
      expect(cell.bg).toBe(2);
    });
  });

  describe("drawing modes", () => {
    it("should set and get drawing mode", () => {
      rectangleTool.setDrawingMode("single");
      expect(rectangleTool.getDrawingMode()).toBe("single");

      rectangleTool.setDrawingMode("double");
      expect(rectangleTool.getDrawingMode()).toBe("double");

      rectangleTool.setDrawingMode("normal");
      expect(rectangleTool.getDrawingMode()).toBe("normal");
    });
  });

  describe("paint modes", () => {
    it("should set and get paint mode", () => {
      rectangleTool.setPaintMode("fg");
      expect(rectangleTool.getPaintMode()).toBe("fg");

      rectangleTool.setPaintMode("bg");
      expect(rectangleTool.getPaintMode()).toBe("bg");

      rectangleTool.setPaintMode("glyph");
      expect(rectangleTool.getPaintMode()).toBe("glyph");

      rectangleTool.setPaintMode("all");
      expect(rectangleTool.getPaintMode()).toBe("all");
    });

    it("should ignore invalid paint modes", () => {
      rectangleTool.setPaintMode("fg");
      rectangleTool.setPaintMode("invalid");
      expect(rectangleTool.getPaintMode()).toBe("fg");
    });
  });

  describe("rectangle drawing", () => {
    it("should draw a rectangle in normal mode", () => {
      const layer = scene.getActiveLayer();
      rectangleTool.setCurrentCell({ ch: "#", fg: 3, bg: 1 });

      // Start at (5,5), end at (8,7) - 4x3 rectangle
      rectangleTool.onCellDown(5, 5, scene, stateManager);
      rectangleTool.onCellUp(8, 7, scene, stateManager);

      // Check corners
      let cell = layer.getCell(5, 5);
      expect(cell.ch).toBe("#");
      expect(cell.fg).toBe(3);
      expect(cell.bg).toBe(1);

      cell = layer.getCell(8, 5); // Top right
      expect(cell.ch).toBe("#");

      cell = layer.getCell(5, 7); // Bottom left
      expect(cell.ch).toBe("#");

      cell = layer.getCell(8, 7); // Bottom right
      expect(cell.ch).toBe("#");

      // Check edges
      cell = layer.getCell(6, 5); // Top edge
      expect(cell.ch).toBe("#");

      cell = layer.getCell(5, 6); // Left edge
      expect(cell.ch).toBe("#");

      // Check interior is empty
      cell = layer.getCell(6, 6);
      expect(cell.ch).toBe(" ");
    });

    it("should draw a rectangle with single line mode", () => {
      const layer = scene.getActiveLayer();
      rectangleTool.setDrawingMode("single");
      rectangleTool.setCurrentCell({ ch: "#", fg: 7, bg: -1 });

      rectangleTool.onCellDown(5, 5, scene, stateManager);
      rectangleTool.onCellUp(8, 7, scene, stateManager);

      // Check box-drawing characters
      expect(layer.getCell(5, 5).ch).toBe("┌"); // Top left
      expect(layer.getCell(8, 5).ch).toBe("┐"); // Top right
      expect(layer.getCell(5, 7).ch).toBe("└"); // Bottom left
      expect(layer.getCell(8, 7).ch).toBe("┘"); // Bottom right
      expect(layer.getCell(6, 5).ch).toBe("─"); // Top edge
      expect(layer.getCell(5, 6).ch).toBe("│"); // Left edge
    });

    it("should draw a rectangle with double line mode", () => {
      const layer = scene.getActiveLayer();
      rectangleTool.setDrawingMode("double");
      rectangleTool.setCurrentCell({ ch: "#", fg: 7, bg: -1 });

      rectangleTool.onCellDown(5, 5, scene, stateManager);
      rectangleTool.onCellUp(8, 7, scene, stateManager);

      // Check double box-drawing characters
      expect(layer.getCell(5, 5).ch).toBe("╔"); // Top left
      expect(layer.getCell(8, 5).ch).toBe("╗"); // Top right
      expect(layer.getCell(5, 7).ch).toBe("╚"); // Bottom left
      expect(layer.getCell(8, 7).ch).toBe("╝"); // Bottom right
      expect(layer.getCell(6, 5).ch).toBe("═"); // Top edge
      expect(layer.getCell(5, 6).ch).toBe("║"); // Left edge
    });

    it("should respect paint mode - foreground only", () => {
      const layer = scene.getActiveLayer();
      layer.setCell(5, 5, new Cell("X", 1, 2));

      rectangleTool.setPaintMode("fg");
      rectangleTool.setCurrentCell({ ch: "#", fg: 5, bg: 9 });

      rectangleTool.onCellDown(5, 5, scene, stateManager);
      rectangleTool.onCellUp(5, 5, scene, stateManager);

      const cell = layer.getCell(5, 5);
      expect(cell.ch).toBe("X"); // Preserved
      expect(cell.fg).toBe(5); // Changed
      expect(cell.bg).toBe(2); // Preserved
    });

    it("should respect paint mode - background only", () => {
      const layer = scene.getActiveLayer();
      layer.setCell(5, 5, new Cell("X", 1, 2));

      rectangleTool.setPaintMode("bg");
      rectangleTool.setCurrentCell({ ch: "#", fg: 5, bg: 9 });

      rectangleTool.onCellDown(5, 5, scene, stateManager);
      rectangleTool.onCellUp(5, 5, scene, stateManager);

      const cell = layer.getCell(5, 5);
      expect(cell.ch).toBe("X"); // Preserved
      expect(cell.fg).toBe(1); // Preserved
      expect(cell.bg).toBe(9); // Changed
    });

    it("should respect paint mode - glyph only", () => {
      const layer = scene.getActiveLayer();
      layer.setCell(5, 5, new Cell("X", 1, 2));

      rectangleTool.setPaintMode("glyph");
      rectangleTool.setDrawingMode("normal");
      rectangleTool.setCurrentCell({ ch: "#", fg: 5, bg: 9 });

      rectangleTool.onCellDown(5, 5, scene, stateManager);
      rectangleTool.onCellUp(5, 5, scene, stateManager);

      const cell = layer.getCell(5, 5);
      expect(cell.ch).toBe("#"); // Changed
      expect(cell.fg).toBe(1); // Preserved
      expect(cell.bg).toBe(2); // Preserved
    });

    it("should handle reverse direction rectangles", () => {
      const layer = scene.getActiveLayer();
      rectangleTool.setCurrentCell({ ch: "#", fg: 7, bg: -1 });

      // Draw from bottom-right to top-left
      rectangleTool.onCellDown(8, 7, scene, stateManager);
      rectangleTool.onCellUp(5, 5, scene, stateManager);

      // Should still produce correct rectangle
      expect(layer.getCell(5, 5).ch).toBe("#");
      expect(layer.getCell(8, 7).ch).toBe("#");
      expect(layer.getCell(6, 6).ch).toBe(" "); // Interior
    });

    it("should handle single point rectangle (1x1)", () => {
      const layer = scene.getActiveLayer();
      rectangleTool.setCurrentCell({ ch: "#", fg: 7, bg: -1 });

      rectangleTool.onCellDown(5, 5, scene, stateManager);
      rectangleTool.onCellUp(5, 5, scene, stateManager);

      const cell = layer.getCell(5, 5);
      expect(cell.ch).toBe("#");
    });

    it("should not draw on locked layer", () => {
      const layer = scene.getActiveLayer();
      layer.locked = true;

      rectangleTool.setCurrentCell({ ch: "#", fg: 7, bg: -1 });
      rectangleTool.onCellDown(5, 5, scene, stateManager);
      rectangleTool.onCellUp(8, 7, scene, stateManager);

      // Should remain empty
      const cell = layer.getCell(5, 5);
      expect(cell.ch).toBe(" ");
    });

    it("should not draw on invisible layer", () => {
      const layer = scene.getActiveLayer();
      layer.visible = false;

      rectangleTool.setCurrentCell({ ch: "#", fg: 7, bg: -1 });
      rectangleTool.onCellDown(5, 5, scene, stateManager);
      rectangleTool.onCellUp(8, 7, scene, stateManager);

      // Should remain empty
      const cell = layer.getCell(5, 5);
      expect(cell.ch).toBe(" ");
    });
  });

  describe("undo/redo", () => {
    it("should support undo for rectangle operation", () => {
      const layer = scene.getActiveLayer();
      rectangleTool.setCurrentCell({ ch: "#", fg: 7, bg: -1 });

      rectangleTool.onCellDown(5, 5, scene, stateManager);
      rectangleTool.onCellUp(8, 7, scene, stateManager);

      // Rectangle should be drawn
      expect(layer.getCell(5, 5).ch).toBe("#");

      // Undo
      commandHistory.undo();

      // Should be cleared
      expect(layer.getCell(5, 5).ch).toBe(" ");
    });

    it("should support redo for rectangle operation", () => {
      const layer = scene.getActiveLayer();
      rectangleTool.setCurrentCell({ ch: "#", fg: 7, bg: -1 });

      rectangleTool.onCellDown(5, 5, scene, stateManager);
      rectangleTool.onCellUp(8, 7, scene, stateManager);

      // Undo
      commandHistory.undo();
      expect(layer.getCell(5, 5).ch).toBe(" ");

      // Redo
      commandHistory.redo();
      expect(layer.getCell(5, 5).ch).toBe("#");
    });
  });

  describe("fill mode", () => {
    it("should set and get fill mode to 'filled'", () => {
      rectangleTool.setFillMode("filled");
      expect(rectangleTool.getFillMode()).toBe("filled");
    });

    it("should set and get fill mode to 'outline'", () => {
      rectangleTool.setFillMode("outline");
      expect(rectangleTool.getFillMode()).toBe("outline");
    });

    it("should ignore invalid fill modes", () => {
      rectangleTool.setFillMode("outline");
      rectangleTool.setFillMode("invalid");
      expect(rectangleTool.getFillMode()).toBe("outline");
    });

    it("should draw filled rectangle when fillMode is 'filled'", () => {
      const activeLayer = scene.getActiveLayer();

      rectangleTool.setFillMode("filled");
      rectangleTool.onCellDown(5, 5, scene, stateManager);
      rectangleTool.onCellDrag(8, 7, scene, stateManager);
      rectangleTool.onCellUp(8, 7, scene, stateManager);

      // Check that interior cells are filled (not just outline)
      // Rectangle from (5,5) to (8,7) should be completely filled
      for (let y = 5; y <= 7; y++) {
        for (let x = 5; x <= 8; x++) {
          const cell = activeLayer.getCell(x, y);
          expect(cell.ch).toBe("█");
        }
      }
    });

    it("should draw outline rectangle when fillMode is 'outline'", () => {
      const activeLayer = scene.getActiveLayer();

      rectangleTool.setFillMode("outline");
      rectangleTool.onCellDown(5, 5, scene, stateManager);
      rectangleTool.onCellDrag(8, 7, scene, stateManager);
      rectangleTool.onCellUp(8, 7, scene, stateManager);

      // Check that interior cells are NOT filled (only outline)
      // Center cell (6,6) should be empty
      const centerCell = activeLayer.getCell(6, 6);
      expect(centerCell.ch).toBe(" ");

      // Corners should be filled
      expect(activeLayer.getCell(5, 5).ch).toBe("█");
      expect(activeLayer.getCell(8, 7).ch).toBe("█");
    });
  });

  describe("getCursor", () => {
    it("should return crosshair cursor", () => {
      expect(rectangleTool.getCursor()).toBe("crosshair");
    });
  });
});
