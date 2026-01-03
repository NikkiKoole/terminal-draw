/**
 * CircleTool.test.js - Test suite for CircleTool
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { CircleTool } from "../src/tools/CircleTool.js";
import { Scene } from "../src/core/Scene.js";
import { Layer } from "../src/core/Layer.js";
import { Cell } from "../src/core/Cell.js";
import { CommandHistory } from "../src/commands/CommandHistory.js";

describe("CircleTool", () => {
  let circle;
  let scene;
  let layer;
  let commandHistory;

  beforeEach(() => {
    // Create scene and layer for testing
    scene = new Scene(20, 20);
    layer = new Layer("test-layer", "Test Layer", scene.w, scene.h);
    scene.addLayer(layer);
    scene.setActiveLayer(layer.id);

    // Create command history
    commandHistory = new CommandHistory();

    // Create circle tool
    circle = new CircleTool({ ch: "█", fg: 7, bg: -1 }, commandHistory);
  });

  describe("constructor", () => {
    it("should create a circle tool with name 'Circle'", () => {
      expect(circle.name).toBe("Circle");
    });

    it("should have default current cell", () => {
      const cell = circle.getCurrentCell();
      expect(cell.ch).toBe("█");
      expect(cell.fg).toBe(7);
      expect(cell.bg).toBe(-1);
    });

    it("should accept custom initial cell", () => {
      const customCircle = new CircleTool({ ch: "●", fg: 3, bg: 2 });
      const cell = customCircle.getCurrentCell();
      expect(cell.ch).toBe("●");
      expect(cell.fg).toBe(3);
      expect(cell.bg).toBe(2);
    });

    it("should have default paint mode and fill mode", () => {
      expect(circle.getPaintMode()).toBe("all");
      expect(circle.getFillMode()).toBe("outline");
    });
  });

  describe("setCurrentCell / getCurrentCell", () => {
    it("should set and get current cell", () => {
      const newCell = { ch: "●", fg: 5, bg: 2 };
      circle.setCurrentCell(newCell);
      const retrieved = circle.getCurrentCell();
      expect(retrieved.ch).toBe("●");
      expect(retrieved.fg).toBe(5);
      expect(retrieved.bg).toBe(2);
    });

    it("should return a copy not reference", () => {
      const originalCell = circle.getCurrentCell();
      originalCell.ch = "X";
      const retrievedCell = circle.getCurrentCell();
      expect(retrievedCell.ch).toBe("█");
    });
  });

  describe("paint mode", () => {
    it("should have default paint mode 'all'", () => {
      expect(circle.getPaintMode()).toBe("all");
    });

    it("should set paint mode", () => {
      circle.setPaintMode("fg");
      expect(circle.getPaintMode()).toBe("fg");

      circle.setPaintMode("bg");
      expect(circle.getPaintMode()).toBe("bg");

      circle.setPaintMode("glyph");
      expect(circle.getPaintMode()).toBe("glyph");

      circle.setPaintMode("all");
      expect(circle.getPaintMode()).toBe("all");
    });

    it("should ignore invalid paint modes", () => {
      circle.setPaintMode("fg");
      circle.setPaintMode("invalid");
      expect(circle.getPaintMode()).toBe("fg");
    });
  });

  describe("fill mode", () => {
    it("should have default fill mode 'outline'", () => {
      expect(circle.getFillMode()).toBe("outline");
    });

    it("should set fill mode", () => {
      circle.setFillMode("filled");
      expect(circle.getFillMode()).toBe("filled");

      circle.setFillMode("outline");
      expect(circle.getFillMode()).toBe("outline");
    });

    it("should ignore invalid fill modes", () => {
      circle.setFillMode("filled");
      circle.setFillMode("invalid");
      expect(circle.getFillMode()).toBe("filled");
    });
  });

  describe("onCellDown", () => {
    it("should start drawing when clicked", () => {
      const mockStateManager = { emit: vi.fn() };

      circle.onCellDown(5, 5, scene, mockStateManager);

      expect(circle.isDrawing).toBe(true);
      expect(circle.centerX).toBe(5);
      expect(circle.centerY).toBe(5);
      expect(mockStateManager.emit).toHaveBeenCalledWith("circle:anchor", {
        x: 5,
        y: 5,
      });
    });

    it("should not draw on locked layer", () => {
      layer.locked = true;
      const mockStateManager = { emit: vi.fn() };

      circle.onCellDown(5, 5, scene, mockStateManager);

      expect(circle.isDrawing).toBe(false);
      expect(mockStateManager.emit).not.toHaveBeenCalled();
    });

    it("should not draw on invisible layer", () => {
      layer.visible = false;
      const mockStateManager = { emit: vi.fn() };

      circle.onCellDown(5, 5, scene, mockStateManager);

      expect(circle.isDrawing).toBe(false);
      expect(mockStateManager.emit).not.toHaveBeenCalled();
    });
  });

  describe("onCellDrag", () => {
    it("should update current position while dragging", () => {
      const mockStateManager = { emit: vi.fn() };

      circle.onCellDown(5, 5, scene, mockStateManager);
      circle.onCellDrag(8, 7, scene, mockStateManager);

      expect(circle.currentX).toBe(8);
      expect(circle.currentY).toBe(7);
    });

    it("should do nothing if not drawing", () => {
      circle.onCellDrag(8, 7, scene, null);

      expect(circle.currentX).toBe(null);
      expect(circle.currentY).toBe(null);
    });
  });

  describe("onCellUp", () => {
    it("should finish drawing and reset state", () => {
      const mockStateManager = { emit: vi.fn() };
      vi.spyOn(commandHistory, "execute");

      circle.onCellDown(5, 5, scene, mockStateManager);
      circle.onCellDrag(8, 8, scene, mockStateManager);
      circle.onCellUp(8, 8, scene, mockStateManager);

      expect(circle.isDrawing).toBe(false);
      expect(circle.centerX).toBe(null);
      expect(circle.centerY).toBe(null);
      expect(mockStateManager.emit).toHaveBeenCalledWith("circle:anchor", {
        x: null,
        y: null,
      });
      expect(commandHistory.execute).toHaveBeenCalled();
    });

    it("should not draw if not in drawing state", () => {
      const mockStateManager = { emit: vi.fn() };
      vi.spyOn(commandHistory, "execute");

      circle.onCellUp(8, 8, scene, mockStateManager);

      expect(commandHistory.execute).not.toHaveBeenCalled();
    });
  });

  describe("getCursor", () => {
    it("should return crosshair cursor", () => {
      expect(circle.getCursor()).toBe("crosshair");
    });
  });

  describe("circle algorithms", () => {
    beforeEach(() => {
      circle.isDrawing = true;
      circle.centerX = 10;
      circle.centerY = 10;
    });

    describe("_getRadius", () => {
      it("should calculate radius correctly", () => {
        circle.currentX = 13;
        circle.currentY = 14;
        const radius = circle._getRadius();
        // Distance from (10,10) to (13,14) = sqrt(9+16) = 5
        expect(radius).toBe(5);
      });

      it("should handle zero radius", () => {
        circle.currentX = 10;
        circle.currentY = 10;
        const radius = circle._getRadius();
        expect(radius).toBe(0);
      });
    });

    describe("outline circles", () => {
      it("should return single point for zero radius", () => {
        circle.currentX = 10;
        circle.currentY = 10;
        circle.setFillMode("outline");

        const cells = circle._getCircleCells(scene);

        expect(cells).toHaveLength(1);
        expect(cells[0].x).toBe(10);
        expect(cells[0].y).toBe(10);
      });

      it("should create circle outline with Bresenham algorithm", () => {
        circle.currentX = 13; // radius = 3
        circle.currentY = 10;
        circle.setFillMode("outline");

        const cells = circle._getCircleCells(scene);

        expect(cells.length).toBeGreaterThan(8); // Should have multiple points on outline

        // Check that center is not included (outline only)
        const centerIncluded = cells.some(
          (cell) => cell.x === 10 && cell.y === 10,
        );
        expect(centerIncluded).toBe(false);
      });

      it("should respect scene boundaries", () => {
        // Create circle at edge that would go out of bounds
        circle.centerX = 1;
        circle.centerY = 1;
        circle.currentX = 4; // radius = 3
        circle.currentY = 1;
        circle.setFillMode("outline");

        const cells = circle._getCircleCells(scene);

        // All cells should be within scene bounds
        cells.forEach((cell) => {
          expect(cell.x).toBeGreaterThanOrEqual(0);
          expect(cell.x).toBeLessThan(scene.w);
          expect(cell.y).toBeGreaterThanOrEqual(0);
          expect(cell.y).toBeLessThan(scene.h);
        });
      });
    });

    describe("filled circles", () => {
      it("should return single point for zero radius", () => {
        circle.currentX = 10;
        circle.currentY = 10;
        circle.setFillMode("filled");

        const cells = circle._getCircleCells(scene);

        expect(cells).toHaveLength(1);
        expect(cells[0].x).toBe(10);
        expect(cells[0].y).toBe(10);
      });

      it("should create filled circle", () => {
        circle.currentX = 12; // radius = 2
        circle.currentY = 10;
        circle.setFillMode("filled");

        const cells = circle._getCircleCells(scene);

        expect(cells.length).toBeGreaterThan(4); // Should fill interior

        // Check that center is included (filled)
        const centerIncluded = cells.some(
          (cell) => cell.x === 10 && cell.y === 10,
        );
        expect(centerIncluded).toBe(true);
      });

      it("should only include points within radius", () => {
        circle.currentX = 13; // radius = 3
        circle.currentY = 10;
        circle.setFillMode("filled");

        const cells = circle._getCircleCells(scene);

        // All cells should be within radius distance
        cells.forEach((cell) => {
          const dx = cell.x - circle.centerX;
          const dy = cell.y - circle.centerY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          expect(distance).toBeLessThanOrEqual(3.1); // Allow small floating point tolerance
        });
      });
    });
  });

  describe("paint mode integration", () => {
    beforeEach(() => {
      // Set up a cell with existing content
      layer.setCell(10, 10, new Cell("X", 1, 2));

      circle.isDrawing = true;
      circle.centerX = 10;
      circle.centerY = 10;
      circle.currentX = 10; // radius = 0, single point
      circle.currentY = 10;
    });

    it("should paint all attributes in 'all' mode", () => {
      circle.setPaintMode("all");
      circle.setCurrentCell({ ch: "○", fg: 5, bg: 3 });

      const cells = circle._getCircleCells(scene);

      expect(cells[0].cell.ch).toBe("○");
      expect(cells[0].cell.fg).toBe(5);
      expect(cells[0].cell.bg).toBe(3);
    });

    it("should paint only foreground in 'fg' mode", () => {
      circle.setPaintMode("fg");
      circle.setCurrentCell({ ch: "○", fg: 5, bg: 3 });

      const cells = circle._getCircleCells(scene);

      expect(cells[0].cell.ch).toBe("X"); // Original
      expect(cells[0].cell.fg).toBe(5); // New
      expect(cells[0].cell.bg).toBe(2); // Original
    });

    it("should paint only background in 'bg' mode", () => {
      circle.setPaintMode("bg");
      circle.setCurrentCell({ ch: "○", fg: 5, bg: 3 });

      const cells = circle._getCircleCells(scene);

      expect(cells[0].cell.ch).toBe("X"); // Original
      expect(cells[0].cell.fg).toBe(1); // Original
      expect(cells[0].cell.bg).toBe(3); // New
    });

    it("should paint only glyph in 'glyph' mode", () => {
      circle.setPaintMode("glyph");
      circle.setCurrentCell({ ch: "○", fg: 5, bg: 3 });

      const cells = circle._getCircleCells(scene);

      expect(cells[0].cell.ch).toBe("○"); // New
      expect(cells[0].cell.fg).toBe(1); // Original
      expect(cells[0].cell.bg).toBe(2); // Original
    });
  });

  describe("integration", () => {
    it("should create proper command for undo/redo", () => {
      const mockStateManager = { emit: vi.fn() };
      vi.spyOn(commandHistory, "execute");

      circle.onCellDown(10, 10, scene, mockStateManager);
      circle.onCellDrag(12, 10, scene, mockStateManager); // radius = 2
      circle.onCellUp(12, 10, scene, mockStateManager);

      expect(commandHistory.execute).toHaveBeenCalled();
      const call = commandHistory.execute.mock.calls[0][0];
      expect(call.tool).toBe("circle");
    });

    it("should work with different circle sizes", () => {
      const mockStateManager = { emit: vi.fn() };
      vi.spyOn(commandHistory, "execute");

      // Small circle
      circle.onCellDown(5, 5, scene, mockStateManager);
      circle.onCellUp(6, 5, scene, mockStateManager); // radius = 1

      expect(commandHistory.execute).toHaveBeenCalled();

      // Large circle
      commandHistory.execute.mockClear();
      circle.onCellDown(10, 10, scene, mockStateManager);
      circle.onCellUp(15, 10, scene, mockStateManager); // radius = 5

      expect(commandHistory.execute).toHaveBeenCalled();
    });

    it("should handle edge cases gracefully", () => {
      const mockStateManager = { emit: vi.fn() };
      vi.spyOn(commandHistory, "execute");

      // Circle at scene edge
      circle.onCellDown(0, 0, scene, mockStateManager);
      circle.onCellUp(3, 4, scene, mockStateManager); // radius = 5, will clip

      expect(commandHistory.execute).toHaveBeenCalled();
      expect(() => {
        // Should not throw errors
        circle.onCellDown(0, 0, scene, mockStateManager);
        circle.onCellUp(3, 4, scene, mockStateManager);
      }).not.toThrow();
    });
  });

  describe("error handling", () => {
    it("should handle missing command history gracefully", () => {
      const circleWithoutHistory = new CircleTool();
      const mockStateManager = { emit: vi.fn() };

      expect(() => {
        circleWithoutHistory.onCellDown(5, 5, scene, mockStateManager);
        circleWithoutHistory.onCellUp(8, 8, scene, mockStateManager);
      }).not.toThrow();
    });

    it("should handle missing active layer gracefully", () => {
      scene.activeLayerId = null; // Directly set to null to simulate no active layer
      const mockStateManager = { emit: vi.fn() };
      vi.spyOn(commandHistory, "execute");

      circle.onCellDown(5, 5, scene, mockStateManager);
      circle.onCellUp(8, 8, scene, mockStateManager);

      expect(commandHistory.execute).not.toHaveBeenCalled();
    });

    it("should handle out of bounds coordinates gracefully", () => {
      const mockStateManager = { emit: vi.fn() };

      expect(() => {
        circle.onCellDown(-5, -5, scene, mockStateManager);
        circle.onCellUp(100, 100, scene, mockStateManager);
      }).not.toThrow();
    });
  });
});
