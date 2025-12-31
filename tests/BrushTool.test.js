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
