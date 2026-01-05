/**
 * EraserTool.test.js - Tests for EraserTool
 */

import { describe, it, expect, beforeEach, vi } from "bun:test";
import { EraserTool } from "../src/tools/EraserTool.js";
import { Scene } from "../src/core/Scene.js";
import { StateManager } from "../src/core/StateManager.js";
import { Cell } from "../src/core/Cell.js";
import { CommandHistory } from "../src/commands/CommandHistory.js";

describe("EraserTool", () => {
  let scene;
  let stateManager;
  let commandHistory;
  let eraser;

  beforeEach(() => {
    scene = new Scene(10, 10);
    stateManager = new StateManager();
    commandHistory = new CommandHistory({ stateManager });
    eraser = new EraserTool(commandHistory);
  });

  describe("constructor", () => {
    it('should create an eraser tool with name "Eraser"', () => {
      expect(eraser.name).toBe("Eraser");
    });
  });

  describe("onCellDown", () => {
    it("should erase cell to default state", () => {
      // First paint a cell to have something to erase
      const layer = scene.getActiveLayer();
      layer.setCell(3, 4, new Cell("X", 1, 2));

      // Now erase it
      eraser.onCellDown(3, 4, scene, stateManager);

      const cell = layer.getCell(3, 4);
      expect(cell.ch).toBe(" ");
      expect(cell.fg).toBe(7);
      expect(cell.bg).toBe(-1);
    });

    it("should emit cell:changed event", () => {
      const events = [];
      stateManager.on("cell:changed", (data) => events.push(data));

      eraser.onCellDown(5, 6, scene, stateManager);

      expect(events.length).toBe(1);
      expect(events[0].x).toBe(5);
      expect(events[0].y).toBe(6);
      expect(events[0].layerId).toBe(scene.activeLayerId);
      expect(events[0].cell.ch).toBe(" ");
      expect(events[0].cell.fg).toBe(7);
      expect(events[0].cell.bg).toBe(-1);
    });

    it("should not erase on locked layer", () => {
      const layer = scene.getActiveLayer();
      layer.locked = true;

      // Set a cell first
      layer.locked = false;
      layer.setCell(2, 2, new Cell("Z", 3, 4));
      layer.locked = true;

      // Try to erase
      eraser.onCellDown(2, 2, scene, stateManager);

      const cell = layer.getCell(2, 2);
      // Cell should remain unchanged
      expect(cell.ch).toBe("Z");
      expect(cell.fg).toBe(3);
      expect(cell.bg).toBe(4);
    });

    it("should not emit event when layer is locked", () => {
      const events = [];
      stateManager.on("cell:changed", (data) => events.push(data));

      const layer = scene.getActiveLayer();
      layer.locked = true;

      eraser.onCellDown(1, 1, scene, stateManager);

      expect(events.length).toBe(0);
    });

    it("should handle erasing on non-default layer", () => {
      // Switch to background layer and paint something
      scene.setActiveLayer("bg");
      const bgLayer = scene.getLayer("bg");
      bgLayer.setCell(7, 8, new Cell("B", 5, 6));

      // Erase on the background layer
      eraser.onCellDown(7, 8, scene, stateManager);

      const cell = bgLayer.getCell(7, 8);
      expect(cell.ch).toBe(" ");
      expect(cell.fg).toBe(7);
      expect(cell.bg).toBe(-1);
    });

    it("should NOT erase on invisible layer", () => {
      const layer = scene.getActiveLayer();
      layer.visible = false;

      // Paint a cell first
      layer.setCell(1, 2, new Cell("H", 2, 3));

      // Try to erase
      eraser.onCellDown(1, 2, scene, stateManager);

      const cell = layer.getCell(1, 2);
      // Should not erase on invisible layer - cell should remain unchanged
      expect(cell.ch).toBe("H");
    });
  });

  describe("onCellDrag", () => {
    it("should erase cell during drag", () => {
      const layer = scene.getActiveLayer();

      // Set a cell
      layer.setCell(8, 9, new Cell("D", 4, 5));

      // Erase via drag
      eraser.onCellDrag(8, 9, scene, stateManager);

      const cell = layer.getCell(8, 9);
      expect(cell.ch).toBe(" ");
      expect(cell.fg).toBe(7);
      expect(cell.bg).toBe(-1);
    });

    it("should emit cell:changed event on drag", () => {
      const events = [];
      stateManager.on("cell:changed", (data) => events.push(data));

      eraser.onCellDrag(3, 3, scene, stateManager);

      expect(events.length).toBe(1);
    });

    it("should respect locked layer during drag", () => {
      const layer = scene.getActiveLayer();
      layer.locked = false;
      layer.setCell(4, 5, new Cell("L", 1, 2));
      layer.locked = true;

      eraser.onCellDrag(4, 5, scene, stateManager);

      const cell = layer.getCell(4, 5);
      expect(cell.ch).toBe("L");
    });

    it("should allow erasing multiple cells in sequence", () => {
      const layer = scene.getActiveLayer();

      // Paint multiple cells
      layer.setCell(0, 0, new Cell("A", 1, 2));
      layer.setCell(1, 0, new Cell("B", 1, 2));
      layer.setCell(2, 0, new Cell("C", 1, 2));

      eraser.onCellDown(0, 0, scene, stateManager);
      eraser.onCellDrag(1, 0, scene, stateManager);
      eraser.onCellDrag(2, 0, scene, stateManager);
      eraser.onCellUp(2, 0, scene, stateManager);

      expect(layer.getCell(0, 0).ch).toBe(" ");
      expect(layer.getCell(1, 0).ch).toBe(" ");
      expect(layer.getCell(2, 0).ch).toBe(" ");
    });
  });

  describe("onCellUp", () => {
    it("should not throw when called", () => {
      expect(() => {
        eraser.onCellUp(0, 0, scene, stateManager);
      }).not.toThrow();
    });

    it("should accept eventData parameter", () => {
      expect(() => {
        eraser.onCellUp(0, 0, scene, stateManager, { button: 0 });
      }).not.toThrow();
    });
  });

  describe("getCursor", () => {
    it("should return not-allowed cursor", () => {
      expect(eraser.getCursor()).toBe("not-allowed");
    });
  });

  describe("edge cases", () => {
    it("should handle erasing at grid boundaries", () => {
      const layer = scene.getActiveLayer();

      // Set cells at boundaries
      layer.setCell(0, 0, new Cell("X", 1, 2));
      layer.setCell(9, 9, new Cell("Y", 3, 4));

      // Erase them
      eraser.onCellDown(0, 0, scene, stateManager);
      expect(layer.getCell(0, 0).ch).toBe(" ");

      eraser.onCellDown(9, 9, scene, stateManager);
      expect(layer.getCell(9, 9).ch).toBe(" ");
    });

    it("should handle rapid cell erasures", () => {
      const events = [];
      stateManager.on("cell:changed", (data) => events.push(data));

      const layer = scene.getActiveLayer();

      // Fill a row
      for (let i = 0; i < 10; i++) {
        layer.setCell(i, 5, new Cell("R", 1, 0));
      }

      // Erase the row
      for (let i = 0; i < 10; i++) {
        eraser.onCellDrag(i, 5, scene, stateManager);
      }

      expect(events.length).toBe(10);

      // Verify all cells are erased
      for (let i = 0; i < 10; i++) {
        expect(layer.getCell(i, 5).ch).toBe(" ");
      }
    });

    it("should handle erasing already empty cells", () => {
      const events = [];
      stateManager.on("cell:changed", (data) => events.push(data));

      // Erase a cell that's already empty
      eraser.onCellDown(5, 5, scene, stateManager);

      // Should still emit event
      expect(events.length).toBe(1);

      const cell = scene.getActiveLayer().getCell(5, 5);
      expect(cell.ch).toBe(" ");
      expect(cell.fg).toBe(7);
      expect(cell.bg).toBe(-1);
    });
  });

  describe("integration", () => {
    it("should work with complete erase workflow", () => {
      const events = [];
      stateManager.on("cell:changed", (data) => events.push(data));

      const layer = scene.getActiveLayer();

      // Set up some cells
      layer.setCell(2, 2, new Cell("█", 4, 2));
      layer.setCell(3, 2, new Cell("█", 4, 2));
      layer.setCell(4, 2, new Cell("█", 4, 2));

      // Mouse down
      eraser.onCellDown(2, 2, scene, stateManager);

      // Drag across cells
      eraser.onCellDrag(3, 2, scene, stateManager);
      eraser.onCellDrag(4, 2, scene, stateManager);

      // Mouse up
      eraser.onCellUp(4, 2, scene, stateManager);

      // Verify cells were erased
      expect(layer.getCell(2, 2).ch).toBe(" ");
      expect(layer.getCell(3, 2).ch).toBe(" ");
      expect(layer.getCell(4, 2).ch).toBe(" ");

      // Verify events
      expect(events.length).toBe(3);
    });

    it("should work with layer switching", () => {
      // Set cells on multiple layers
      scene.setActiveLayer("mid");
      scene.getLayer("mid").setCell(5, 5, new Cell("M", 1, 0));

      scene.setActiveLayer("bg");
      scene.getLayer("bg").setCell(5, 5, new Cell("B", 2, 0));

      // Erase on bg layer
      eraser.onCellDown(5, 5, scene, stateManager);

      // Verify mid layer unchanged, bg layer erased
      expect(scene.getLayer("mid").getCell(5, 5).ch).toBe("M");
      expect(scene.getLayer("bg").getCell(5, 5).ch).toBe(" ");
    });

    it("should handle mixed brush and eraser workflow", () => {
      const layer = scene.getActiveLayer();

      // Paint some cells (simulated)
      layer.setCell(0, 0, new Cell("A", 1, 2));
      layer.setCell(1, 0, new Cell("B", 1, 2));
      layer.setCell(2, 0, new Cell("C", 1, 2));

      // Erase middle cell
      eraser.onCellDown(1, 0, scene, stateManager);

      // Verify
      expect(layer.getCell(0, 0).ch).toBe("A");
      expect(layer.getCell(1, 0).ch).toBe(" ");
      expect(layer.getCell(2, 0).ch).toBe("C");
    });
  });

  describe("smart box-drawing eraser", () => {
    it("should update neighbors when erasing a box-drawing character", () => {
      const layer = scene.getActiveLayer();

      // Create a T-junction: ┬
      //   │
      //  ─┬─
      //   │
      layer.setCell(1, 0, new Cell("│", 7, -1)); // North
      layer.setCell(1, 1, new Cell("┬", 7, -1)); // Center (T-junction)
      layer.setCell(0, 1, new Cell("─", 7, -1)); // West
      layer.setCell(2, 1, new Cell("─", 7, -1)); // East
      layer.setCell(1, 2, new Cell("│", 7, -1)); // South

      // Erase the center T-junction
      eraser.onCellDown(1, 1, scene, stateManager);

      // Center should be erased
      expect(layer.getCell(1, 1).ch).toBe(" ");

      // North vertical line should become endpoint
      expect(layer.getCell(1, 0).ch).toBe("│");

      // West horizontal line should become endpoint
      expect(layer.getCell(0, 1).ch).toBe("─");

      // East horizontal line should become endpoint
      expect(layer.getCell(2, 1).ch).toBe("─");

      // South vertical line should become endpoint
      expect(layer.getCell(1, 2).ch).toBe("│");
    });

    it("should update corner when erasing adjacent line", () => {
      const layer = scene.getActiveLayer();

      // Create a corner:
      //  ┌─
      //  │
      layer.setCell(0, 0, new Cell("┌", 7, -1)); // Corner
      layer.setCell(1, 0, new Cell("─", 7, -1)); // Horizontal
      layer.setCell(0, 1, new Cell("│", 7, -1)); // Vertical

      // Erase the horizontal line
      eraser.onCellDown(1, 0, scene, stateManager);

      // Horizontal should be erased
      expect(layer.getCell(1, 0).ch).toBe(" ");

      // Corner should update to vertical endpoint
      expect(layer.getCell(0, 0).ch).toBe("│");

      // Vertical should remain unchanged
      expect(layer.getCell(0, 1).ch).toBe("│");
    });

    it("should update cross junction when erasing one arm", () => {
      const layer = scene.getActiveLayer();

      // Create a cross:
      //   │
      //  ─┼─
      //   │
      layer.setCell(1, 0, new Cell("│", 7, -1)); // North
      layer.setCell(0, 1, new Cell("─", 7, -1)); // West
      layer.setCell(1, 1, new Cell("┼", 7, -1)); // Center (cross)
      layer.setCell(2, 1, new Cell("─", 7, -1)); // East
      layer.setCell(1, 2, new Cell("│", 7, -1)); // South

      // Erase the east arm
      eraser.onCellDown(2, 1, scene, stateManager);

      // East should be erased
      expect(layer.getCell(2, 1).ch).toBe(" ");

      // Cross should become T-junction (┤) - connects north, south, west
      expect(layer.getCell(1, 1).ch).toBe("┤");
    });

    it("should handle double-line box-drawing characters", () => {
      const layer = scene.getActiveLayer();

      // Create a double-line T-junction:
      //   ║
      //  ═╬═
      //   ║
      layer.setCell(1, 0, new Cell("║", 7, -1)); // North
      layer.setCell(0, 1, new Cell("═", 7, -1)); // West
      layer.setCell(1, 1, new Cell("╬", 7, -1)); // Center (cross)
      layer.setCell(2, 1, new Cell("═", 7, -1)); // East
      layer.setCell(1, 2, new Cell("║", 7, -1)); // South

      // Erase the west arm
      eraser.onCellDown(0, 1, scene, stateManager);

      // West should be erased
      expect(layer.getCell(0, 1).ch).toBe(" ");

      // Cross should become T-junction (╠)
      expect(layer.getCell(1, 1).ch).toBe("╠");
    });

    it("should not affect non-box-drawing characters", () => {
      const layer = scene.getActiveLayer();

      // Mix of box-drawing and regular characters
      layer.setCell(0, 0, new Cell("A", 7, -1)); // Regular char
      layer.setCell(1, 0, new Cell("─", 7, -1)); // Box-drawing
      layer.setCell(2, 0, new Cell("B", 7, -1)); // Regular char

      // Erase the box-drawing character
      eraser.onCellDown(1, 0, scene, stateManager);

      // Box-drawing should be erased
      expect(layer.getCell(1, 0).ch).toBe(" ");

      // Regular characters should not be affected
      expect(layer.getCell(0, 0).ch).toBe("A");
      expect(layer.getCell(2, 0).ch).toBe("B");
    });

    it("should preserve colors when updating neighbors", () => {
      const layer = scene.getActiveLayer();

      // Create a junction with specific colors
      layer.setCell(0, 0, new Cell("─", 3, 5)); // Colored horizontal
      layer.setCell(1, 0, new Cell("┬", 3, 5)); // Colored junction
      layer.setCell(2, 0, new Cell("─", 3, 5)); // Colored horizontal
      layer.setCell(1, 1, new Cell("│", 3, 5)); // Colored vertical

      // Erase the junction
      eraser.onCellDown(1, 0, scene, stateManager);

      // Junction should be erased
      expect(layer.getCell(1, 0).ch).toBe(" ");

      // Neighbors should preserve their colors
      expect(layer.getCell(0, 0).fg).toBe(3);
      expect(layer.getCell(0, 0).bg).toBe(5);
      expect(layer.getCell(2, 0).fg).toBe(3);
      expect(layer.getCell(2, 0).bg).toBe(5);
      expect(layer.getCell(1, 1).fg).toBe(3);
      expect(layer.getCell(1, 1).bg).toBe(5);
    });

    it("should handle erasing isolated box-drawing character", () => {
      const layer = scene.getActiveLayer();

      // Create isolated box-drawing character
      layer.setCell(5, 5, new Cell("─", 7, -1));

      // Erase it
      eraser.onCellDown(5, 5, scene, stateManager);

      // Should be erased with no errors
      expect(layer.getCell(5, 5).ch).toBe(" ");
    });

    it("should support undo/redo with neighbor updates", () => {
      const layer = scene.getActiveLayer();

      // Create a simple junction
      layer.setCell(1, 0, new Cell("│", 7, -1));
      layer.setCell(0, 1, new Cell("─", 7, -1));
      layer.setCell(1, 1, new Cell("┌", 7, -1));

      // Erase the corner
      eraser.onCellDown(1, 1, scene, stateManager);

      // Verify erased state
      expect(layer.getCell(1, 1).ch).toBe(" ");
      expect(layer.getCell(1, 0).ch).toBe("│"); // Should be updated
      expect(layer.getCell(0, 1).ch).toBe("─"); // Should be updated

      // Undo
      commandHistory.undo();

      // Should restore original state
      expect(layer.getCell(1, 1).ch).toBe("┌");
      expect(layer.getCell(1, 0).ch).toBe("│");
      expect(layer.getCell(0, 1).ch).toBe("─");

      // Redo
      commandHistory.redo();

      // Should return to erased state
      expect(layer.getCell(1, 1).ch).toBe(" ");
    });

    it("should handle erasing during drag across box-drawing characters", () => {
      const layer = scene.getActiveLayer();

      // Create a horizontal line with junctions
      //  ─┬─┬─
      //   │ │
      layer.setCell(0, 0, new Cell("─", 7, -1));
      layer.setCell(1, 0, new Cell("┬", 7, -1));
      layer.setCell(2, 0, new Cell("─", 7, -1));
      layer.setCell(3, 0, new Cell("┬", 7, -1));
      layer.setCell(4, 0, new Cell("─", 7, -1));
      layer.setCell(1, 1, new Cell("│", 7, -1));
      layer.setCell(3, 1, new Cell("│", 7, -1));

      // Erase across the middle section
      eraser.onCellDown(1, 0, scene, stateManager);
      eraser.onCellDrag(2, 0, scene, stateManager);
      eraser.onCellDrag(3, 0, scene, stateManager);

      // Middle section should be erased
      expect(layer.getCell(1, 0).ch).toBe(" ");
      expect(layer.getCell(2, 0).ch).toBe(" ");
      expect(layer.getCell(3, 0).ch).toBe(" ");

      // End pieces should still be there
      expect(layer.getCell(0, 0).ch).toBe("─");
      expect(layer.getCell(4, 0).ch).toBe("─");

      // Vertical lines should remain as endpoints
      expect(layer.getCell(1, 1).ch).toBe("│");
      expect(layer.getCell(3, 1).ch).toBe("│");
    });
  });

  describe("paint mode support", () => {
    it("should have default paint mode 'all'", () => {
      expect(eraser.getPaintMode()).toBe("all");
    });

    it("should allow setting paint mode", () => {
      eraser.setPaintMode("fg");
      expect(eraser.getPaintMode()).toBe("fg");

      eraser.setPaintMode("bg");
      expect(eraser.getPaintMode()).toBe("bg");

      eraser.setPaintMode("glyph");
      expect(eraser.getPaintMode()).toBe("glyph");

      eraser.setPaintMode("all");
      expect(eraser.getPaintMode()).toBe("all");
    });

    it("should ignore invalid paint modes", () => {
      eraser.setPaintMode("all");
      eraser.setPaintMode("invalid");
      expect(eraser.getPaintMode()).toBe("all");
    });

    it("should erase only glyph when paint mode is 'glyph'", () => {
      const layer = scene.getActiveLayer();
      // Set a cell with character and colors
      layer.setCell(5, 5, new Cell("█", 3, 5));

      eraser.setPaintMode("glyph");
      eraser.onCellDown(5, 5, scene, stateManager);

      const cell = layer.getCell(5, 5);
      expect(cell.ch).toBe(" "); // Glyph erased to space
      expect(cell.fg).toBe(3); // Foreground preserved
      expect(cell.bg).toBe(5); // Background preserved
    });

    it("should erase only foreground when paint mode is 'fg'", () => {
      const layer = scene.getActiveLayer();
      layer.setCell(5, 5, new Cell("█", 3, 5));

      eraser.setPaintMode("fg");
      eraser.onCellDown(5, 5, scene, stateManager);

      const cell = layer.getCell(5, 5);
      expect(cell.ch).toBe("█"); // Glyph preserved
      expect(cell.fg).toBe(7); // Foreground erased to default (white)
      expect(cell.bg).toBe(5); // Background preserved
    });

    it("should erase only background when paint mode is 'bg'", () => {
      const layer = scene.getActiveLayer();
      layer.setCell(5, 5, new Cell("█", 3, 5));

      eraser.setPaintMode("bg");
      eraser.onCellDown(5, 5, scene, stateManager);

      const cell = layer.getCell(5, 5);
      expect(cell.ch).toBe("█"); // Glyph preserved
      expect(cell.fg).toBe(3); // Foreground preserved
      expect(cell.bg).toBe(-1); // Background erased to default (transparent)
    });

    it("should erase all attributes when paint mode is 'all'", () => {
      const layer = scene.getActiveLayer();
      layer.setCell(5, 5, new Cell("█", 3, 5));

      eraser.setPaintMode("all");
      eraser.onCellDown(5, 5, scene, stateManager);

      const cell = layer.getCell(5, 5);
      expect(cell.ch).toBe(" "); // Glyph erased
      expect(cell.fg).toBe(7); // Foreground erased
      expect(cell.bg).toBe(-1); // Background erased
    });

    it("should work with drag erasing in glyph mode", () => {
      const layer = scene.getActiveLayer();
      layer.setCell(5, 5, new Cell("A", 1, 2));
      layer.setCell(6, 5, new Cell("B", 3, 4));
      layer.setCell(7, 5, new Cell("C", 5, 6));

      eraser.setPaintMode("glyph");
      eraser.onCellDown(5, 5, scene, stateManager);
      eraser.onCellDrag(6, 5, scene, stateManager);
      eraser.onCellDrag(7, 5, scene, stateManager);

      // All glyphs erased, colors preserved
      expect(layer.getCell(5, 5).ch).toBe(" ");
      expect(layer.getCell(5, 5).fg).toBe(1);
      expect(layer.getCell(5, 5).bg).toBe(2);

      expect(layer.getCell(6, 5).ch).toBe(" ");
      expect(layer.getCell(6, 5).fg).toBe(3);
      expect(layer.getCell(6, 5).bg).toBe(4);

      expect(layer.getCell(7, 5).ch).toBe(" ");
      expect(layer.getCell(7, 5).fg).toBe(5);
      expect(layer.getCell(7, 5).bg).toBe(6);
    });

    it("should not update box-drawing neighbors when erasing in fg mode", () => {
      const layer = scene.getActiveLayer();
      // Create a T-junction
      layer.setCell(5, 5, new Cell("┬", 7, -1));
      layer.setCell(5, 6, new Cell("│", 7, -1));
      layer.setCell(4, 5, new Cell("─", 7, -1));
      layer.setCell(6, 5, new Cell("─", 7, -1));

      eraser.setPaintMode("fg");
      eraser.onCellDown(5, 5, scene, stateManager);

      // Character should be preserved, only fg changed
      expect(layer.getCell(5, 5).ch).toBe("┬");
      expect(layer.getCell(5, 5).fg).toBe(7);

      // Neighbors should NOT be updated since we're only erasing fg
      expect(layer.getCell(5, 6).ch).toBe("│");
      expect(layer.getCell(4, 5).ch).toBe("─");
      expect(layer.getCell(6, 5).ch).toBe("─");
    });

    it("should not update box-drawing neighbors when erasing in bg mode", () => {
      const layer = scene.getActiveLayer();
      // Create a T-junction
      layer.setCell(5, 5, new Cell("┬", 7, 5));
      layer.setCell(5, 6, new Cell("│", 7, 5));
      layer.setCell(4, 5, new Cell("─", 7, 5));
      layer.setCell(6, 5, new Cell("─", 7, 5));

      eraser.setPaintMode("bg");
      eraser.onCellDown(5, 5, scene, stateManager);

      // Character should be preserved, only bg changed
      expect(layer.getCell(5, 5).ch).toBe("┬");
      expect(layer.getCell(5, 5).bg).toBe(-1);

      // Neighbors should NOT be updated since we're only erasing bg
      expect(layer.getCell(5, 6).ch).toBe("│");
      expect(layer.getCell(4, 5).ch).toBe("─");
      expect(layer.getCell(6, 5).ch).toBe("─");
    });

    it("should update box-drawing neighbors when erasing in glyph mode", () => {
      const layer = scene.getActiveLayer();
      // Create a T-junction
      layer.setCell(5, 5, new Cell("┬", 7, -1));
      layer.setCell(5, 6, new Cell("│", 7, -1));
      layer.setCell(4, 5, new Cell("─", 7, -1));
      layer.setCell(6, 5, new Cell("─", 7, -1));

      eraser.setPaintMode("glyph");
      eraser.onCellDown(5, 5, scene, stateManager);

      // Center cell glyph erased
      expect(layer.getCell(5, 5).ch).toBe(" ");

      // Neighbor to the south should update (┬ -> ─ since top connection is gone)
      expect(layer.getCell(5, 6).ch).not.toBe("┬");

      // Horizontal lines should remain unchanged
      expect(layer.getCell(4, 5).ch).toBe("─");
      expect(layer.getCell(6, 5).ch).toBe("─");
    });

    it("should update box-drawing neighbors when erasing in all mode", () => {
      const layer = scene.getActiveLayer();
      // Create a T-junction
      layer.setCell(5, 5, new Cell("┬", 7, -1));
      layer.setCell(5, 6, new Cell("│", 7, -1));
      layer.setCell(4, 5, new Cell("─", 7, -1));
      layer.setCell(6, 5, new Cell("─", 7, -1));

      eraser.setPaintMode("all");
      eraser.onCellDown(5, 5, scene, stateManager);

      // Center cell fully erased
      expect(layer.getCell(5, 5).ch).toBe(" ");

      // Neighbor to the south should update
      expect(layer.getCell(5, 6).ch).not.toBe("┬");

      // Horizontal lines should remain unchanged
      expect(layer.getCell(4, 5).ch).toBe("─");
      expect(layer.getCell(6, 5).ch).toBe("─");
    });
  });
});
