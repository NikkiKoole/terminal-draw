/**
 * LineTool.test.js - Tests for LineTool
 */

import { describe, it, expect, beforeEach } from "bun:test";
import { LineTool } from "../src/tools/LineTool.js";
import { Scene } from "../src/core/Scene.js";
import { StateManager } from "../src/core/StateManager.js";
import { Cell } from "../src/core/Cell.js";
import { CommandHistory } from "../src/commands/CommandHistory.js";

describe("LineTool", () => {
  let scene;
  let stateManager;
  let commandHistory;
  let lineTool;

  beforeEach(() => {
    scene = new Scene(20, 20);
    stateManager = new StateManager();
    commandHistory = new CommandHistory({ stateManager });
    lineTool = new LineTool({ ch: "█", fg: 7, bg: -1 }, commandHistory);
  });

  describe("constructor", () => {
    it('should create a line tool with name "Line"', () => {
      expect(lineTool.name).toBe("Line");
    });

    it("should have default current cell", () => {
      const cell = lineTool.getCurrentCell();
      expect(cell.ch).toBe("█");
      expect(cell.fg).toBe(7);
      expect(cell.bg).toBe(-1);
    });

    it("should have default drawing mode 'normal'", () => {
      expect(lineTool.getDrawingMode()).toBe("normal");
    });

    it("should have default paint mode 'all'", () => {
      expect(lineTool.getPaintMode()).toBe("all");
    });
  });

  describe("setCurrentCell / getCurrentCell", () => {
    it("should set and get current cell", () => {
      lineTool.setCurrentCell({ ch: "X", fg: 1, bg: 2 });
      const cell = lineTool.getCurrentCell();
      expect(cell.ch).toBe("X");
      expect(cell.fg).toBe(1);
      expect(cell.bg).toBe(2);
    });
  });

  describe("drawing modes", () => {
    it("should set and get drawing mode", () => {
      lineTool.setDrawingMode("single");
      expect(lineTool.getDrawingMode()).toBe("single");

      lineTool.setDrawingMode("double");
      expect(lineTool.getDrawingMode()).toBe("double");

      lineTool.setDrawingMode("normal");
      expect(lineTool.getDrawingMode()).toBe("normal");
    });
  });

  describe("paint modes", () => {
    it("should set and get paint mode", () => {
      lineTool.setPaintMode("fg");
      expect(lineTool.getPaintMode()).toBe("fg");

      lineTool.setPaintMode("bg");
      expect(lineTool.getPaintMode()).toBe("bg");

      lineTool.setPaintMode("glyph");
      expect(lineTool.getPaintMode()).toBe("glyph");

      lineTool.setPaintMode("all");
      expect(lineTool.getPaintMode()).toBe("all");
    });

    it("should ignore invalid paint modes", () => {
      lineTool.setPaintMode("fg");
      lineTool.setPaintMode("invalid");
      expect(lineTool.getPaintMode()).toBe("fg");
    });
  });

  describe("line drawing", () => {
    it("should draw a horizontal line in normal mode", () => {
      const layer = scene.getActiveLayer();
      lineTool.setCurrentCell({ ch: "#", fg: 3, bg: 1 });

      // Draw horizontal line from (5,5) to (10,5)
      lineTool.onCellDown(5, 5, scene, stateManager);
      lineTool.onCellUp(10, 5, scene, stateManager);

      // Check all points along the line
      for (let x = 5; x <= 10; x++) {
        const cell = layer.getCell(x, 5);
        expect(cell.ch).toBe("#");
        expect(cell.fg).toBe(3);
        expect(cell.bg).toBe(1);
      }

      // Check adjacent cells are empty
      expect(layer.getCell(4, 5).ch).toBe(" ");
      expect(layer.getCell(11, 5).ch).toBe(" ");
    });

    it("should draw a vertical line in normal mode", () => {
      const layer = scene.getActiveLayer();
      lineTool.setCurrentCell({ ch: "*", fg: 2, bg: -1 });

      // Draw vertical line from (7,3) to (7,8)
      lineTool.onCellDown(7, 3, scene, stateManager);
      lineTool.onCellUp(7, 8, scene, stateManager);

      // Check all points along the line
      for (let y = 3; y <= 8; y++) {
        const cell = layer.getCell(7, y);
        expect(cell.ch).toBe("*");
      }
    });

    it("should draw a diagonal line in normal mode", () => {
      const layer = scene.getActiveLayer();
      lineTool.setCurrentCell({ ch: "+", fg: 4, bg: -1 });

      // Draw diagonal line from (5,5) to (9,9)
      lineTool.onCellDown(5, 5, scene, stateManager);
      lineTool.onCellUp(9, 9, scene, stateManager);

      // Should draw a diagonal line with the character
      expect(layer.getCell(5, 5).ch).toBe("+");
      expect(layer.getCell(6, 6).ch).toBe("+");
      expect(layer.getCell(7, 7).ch).toBe("+");
      expect(layer.getCell(8, 8).ch).toBe("+");
      expect(layer.getCell(9, 9).ch).toBe("+");
    });

    it("should draw a horizontal line with single line mode", () => {
      const layer = scene.getActiveLayer();
      lineTool.setDrawingMode("single");
      lineTool.setCurrentCell({ ch: "#", fg: 7, bg: -1 });

      lineTool.onCellDown(5, 5, scene, stateManager);
      lineTool.onCellUp(8, 5, scene, stateManager);

      // All cells should use horizontal line character
      for (let x = 5; x <= 8; x++) {
        expect(layer.getCell(x, 5).ch).toBe("─");
      }
    });

    it("should draw a vertical line with single line mode", () => {
      const layer = scene.getActiveLayer();
      lineTool.setDrawingMode("single");
      lineTool.setCurrentCell({ ch: "#", fg: 7, bg: -1 });

      lineTool.onCellDown(5, 5, scene, stateManager);
      lineTool.onCellUp(5, 9, scene, stateManager);

      // All cells should use vertical line character
      for (let y = 5; y <= 9; y++) {
        expect(layer.getCell(5, y).ch).toBe("│");
      }
    });

    it("should draw a diagonal line with corners in single line mode", () => {
      const layer = scene.getActiveLayer();
      lineTool.setDrawingMode("single");
      lineTool.setCurrentCell({ ch: "#", fg: 7, bg: -1 });

      // Draw diagonal - should create staircase with corners
      lineTool.onCellDown(5, 5, scene, stateManager);
      lineTool.onCellUp(8, 8, scene, stateManager);

      // Should have box-drawing characters (corners, horizontal, vertical)
      const validChars = ["┌", "┐", "└", "┘", "─", "│"];
      for (let x = 5; x <= 8; x++) {
        for (let y = 5; y <= 8; y++) {
          const cell = layer.getCell(x, y);
          if (cell.ch !== " ") {
            expect(validChars).toContain(cell.ch);
          }
        }
      }
    });

    it("should draw a horizontal line with double line mode", () => {
      const layer = scene.getActiveLayer();
      lineTool.setDrawingMode("double");
      lineTool.setCurrentCell({ ch: "#", fg: 7, bg: -1 });

      lineTool.onCellDown(5, 5, scene, stateManager);
      lineTool.onCellUp(8, 5, scene, stateManager);

      // All cells should use double horizontal line character
      for (let x = 5; x <= 8; x++) {
        expect(layer.getCell(x, 5).ch).toBe("═");
      }
    });

    it("should draw a vertical line with double line mode", () => {
      const layer = scene.getActiveLayer();
      lineTool.setDrawingMode("double");
      lineTool.setCurrentCell({ ch: "#", fg: 7, bg: -1 });

      lineTool.onCellDown(5, 5, scene, stateManager);
      lineTool.onCellUp(5, 9, scene, stateManager);

      // All cells should use double vertical line character
      for (let y = 5; y <= 9; y++) {
        expect(layer.getCell(5, y).ch).toBe("║");
      }
    });

    it("should respect paint mode - foreground only", () => {
      const layer = scene.getActiveLayer();
      layer.setCell(5, 5, new Cell("X", 1, 2));
      layer.setCell(6, 5, new Cell("Y", 1, 2));

      lineTool.setPaintMode("fg");
      lineTool.setCurrentCell({ ch: "#", fg: 5, bg: 9 });

      lineTool.onCellDown(5, 5, scene, stateManager);
      lineTool.onCellUp(6, 5, scene, stateManager);

      // Characters and backgrounds should be preserved
      let cell = layer.getCell(5, 5);
      expect(cell.ch).toBe("X");
      expect(cell.fg).toBe(5); // Changed
      expect(cell.bg).toBe(2); // Preserved

      cell = layer.getCell(6, 5);
      expect(cell.ch).toBe("Y");
      expect(cell.fg).toBe(5); // Changed
      expect(cell.bg).toBe(2); // Preserved
    });

    it("should respect paint mode - background only", () => {
      const layer = scene.getActiveLayer();
      layer.setCell(5, 5, new Cell("X", 1, 2));
      layer.setCell(6, 5, new Cell("Y", 1, 2));

      lineTool.setPaintMode("bg");
      lineTool.setCurrentCell({ ch: "#", fg: 5, bg: 9 });

      lineTool.onCellDown(5, 5, scene, stateManager);
      lineTool.onCellUp(6, 5, scene, stateManager);

      let cell = layer.getCell(5, 5);
      expect(cell.ch).toBe("X"); // Preserved
      expect(cell.fg).toBe(1); // Preserved
      expect(cell.bg).toBe(9); // Changed
    });

    it("should respect paint mode - glyph only", () => {
      const layer = scene.getActiveLayer();
      layer.setCell(5, 5, new Cell("X", 1, 2));
      layer.setCell(6, 5, new Cell("Y", 1, 2));

      lineTool.setPaintMode("glyph");
      lineTool.setDrawingMode("normal");
      lineTool.setCurrentCell({ ch: "#", fg: 5, bg: 9 });

      lineTool.onCellDown(5, 5, scene, stateManager);
      lineTool.onCellUp(6, 5, scene, stateManager);

      let cell = layer.getCell(5, 5);
      expect(cell.ch).toBe("#"); // Changed
      expect(cell.fg).toBe(1); // Preserved
      expect(cell.bg).toBe(2); // Preserved
    });

    it("should handle single point line", () => {
      const layer = scene.getActiveLayer();
      lineTool.setCurrentCell({ ch: "#", fg: 7, bg: -1 });

      lineTool.onCellDown(5, 5, scene, stateManager);
      lineTool.onCellUp(5, 5, scene, stateManager);

      const cell = layer.getCell(5, 5);
      expect(cell.ch).toBe("#");
    });

    it("should handle reverse direction lines", () => {
      const layer = scene.getActiveLayer();
      lineTool.setCurrentCell({ ch: "#", fg: 7, bg: -1 });

      // Draw from right to left
      lineTool.onCellDown(10, 5, scene, stateManager);
      lineTool.onCellUp(5, 5, scene, stateManager);

      // Should still produce correct line
      for (let x = 5; x <= 10; x++) {
        expect(layer.getCell(x, 5).ch).toBe("#");
      }
    });

    it("should not draw on locked layer", () => {
      const layer = scene.getActiveLayer();
      layer.locked = true;

      lineTool.setCurrentCell({ ch: "#", fg: 7, bg: -1 });
      lineTool.onCellDown(5, 5, scene, stateManager);
      lineTool.onCellUp(8, 5, scene, stateManager);

      // Should remain empty
      for (let x = 5; x <= 8; x++) {
        expect(layer.getCell(x, 5).ch).toBe(" ");
      }
    });

    it("should not draw on invisible layer", () => {
      const layer = scene.getActiveLayer();
      layer.visible = false;

      lineTool.setCurrentCell({ ch: "#", fg: 7, bg: -1 });
      lineTool.onCellDown(5, 5, scene, stateManager);
      lineTool.onCellUp(8, 5, scene, stateManager);

      // Should remain empty
      for (let x = 5; x <= 8; x++) {
        expect(layer.getCell(x, 5).ch).toBe(" ");
      }
    });
  });

  describe("undo/redo", () => {
    it("should support undo for line operation", () => {
      const layer = scene.getActiveLayer();
      lineTool.setCurrentCell({ ch: "#", fg: 7, bg: -1 });

      lineTool.onCellDown(5, 5, scene, stateManager);
      lineTool.onCellUp(8, 5, scene, stateManager);

      // Line should be drawn
      expect(layer.getCell(5, 5).ch).toBe("#");
      expect(layer.getCell(8, 5).ch).toBe("#");

      // Undo
      commandHistory.undo();

      // Should be cleared
      expect(layer.getCell(5, 5).ch).toBe(" ");
      expect(layer.getCell(8, 5).ch).toBe(" ");
    });

    it("should support redo for line operation", () => {
      const layer = scene.getActiveLayer();
      lineTool.setCurrentCell({ ch: "#", fg: 7, bg: -1 });

      lineTool.onCellDown(5, 5, scene, stateManager);
      lineTool.onCellUp(8, 5, scene, stateManager);

      // Undo
      commandHistory.undo();
      expect(layer.getCell(5, 5).ch).toBe(" ");

      // Redo
      commandHistory.redo();
      expect(layer.getCell(5, 5).ch).toBe("#");
      expect(layer.getCell(8, 5).ch).toBe("#");
    });
  });

  describe("getCursor", () => {
    it("should return crosshair cursor", () => {
      expect(lineTool.getCursor()).toBe("crosshair");
    });
  });
});
