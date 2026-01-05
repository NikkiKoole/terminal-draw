import { describe, it, expect, beforeEach, vi } from "bun:test";
import { ClearCommand } from "../../src/commands/ClearCommand.js";
import { Scene } from "../../src/core/Scene.js";
import { Layer } from "../../src/core/Layer.js";
import { Cell } from "../../src/core/Cell.js";
import { StateManager } from "../../src/core/StateManager.js";
import { LAYER_BG, LAYER_MID, LAYER_FG } from "../../src/core/constants.js";

describe("ClearCommand", () => {
  let scene;
  let stateManager;
  let bgLayer, midLayer, fgLayer;

  beforeEach(() => {
    // Create fresh instances
    scene = new Scene(3, 2); // 3x2 grid for testing
    stateManager = new StateManager();

    // Get layer references
    bgLayer = scene.getLayer(LAYER_BG);
    midLayer = scene.getLayer(LAYER_MID);
    fgLayer = scene.getLayer(LAYER_FG);

    // Set up some test data
    bgLayer.setCell(0, 0, new Cell("A", 1, 0));
    bgLayer.setCell(1, 0, new Cell("B", 2, 1));
    midLayer.setCell(0, 1, new Cell("C", 3, 2));
    midLayer.setCell(2, 1, new Cell("D", 4, 3));
    fgLayer.setCell(1, 1, new Cell("E", 5, 4));
  });

  describe("Constructor", () => {
    it("should create clear command with required parameters", () => {
      const command = new ClearCommand({
        description: "Clear layer test",
        scene,
        layer: midLayer,
        stateManager,
      });

      expect(command.description).toBe("Clear layer test");
      expect(command.scene).toBe(scene);
      expect(command.layer).toBe(midLayer);
      expect(command.stateManager).toBe(stateManager);
      expect(command.previousState).toBeNull();
      expect(command.affectedCellCount).toBe(0);
    });

    it("should create clear all command when layer is null", () => {
      const command = new ClearCommand({
        description: "Clear all test",
        scene,
        layer: null,
        stateManager,
      });

      expect(command.layer).toBeNull();
    });

    it("should throw error without description", () => {
      expect(() => {
        new ClearCommand({
          scene,
          layer: midLayer,
          stateManager,
        });
      }).toThrow("ClearCommand description is required");
    });

    it("should throw error without scene", () => {
      expect(() => {
        new ClearCommand({
          description: "Test",
          layer: midLayer,
          stateManager,
        });
      }).toThrow("ClearCommand scene is required");
    });

    it("should throw error without stateManager", () => {
      expect(() => {
        new ClearCommand({
          description: "Test",
          scene,
          layer: midLayer,
        });
      }).toThrow("ClearCommand stateManager is required");
    });
  });

  describe("Single Layer Clear", () => {
    it("should clear single layer and store previous state", () => {
      const command = ClearCommand.clearLayer({
        scene,
        layer: midLayer,
        stateManager,
      });

      // Verify initial state
      expect(midLayer.getCell(0, 1).ch).toBe("C");
      expect(midLayer.getCell(2, 1).ch).toBe("D");

      // Execute command
      command.execute();

      // Verify layer is cleared
      expect(midLayer.getCell(0, 1).isEmpty()).toBe(true);
      expect(midLayer.getCell(2, 1).isEmpty()).toBe(true);
      expect(command.getAffectedCellCount()).toBe(2);

      // Verify other layers unchanged
      expect(bgLayer.getCell(0, 0).ch).toBe("A");
      expect(fgLayer.getCell(1, 1).ch).toBe("E");

      // Verify previous state stored
      expect(command.previousState).toBeTruthy();
      expect(command.previousState.layerId).toBe(LAYER_MID);
      expect(command.previousState.cells).toHaveLength(6);
    });

    it("should undo single layer clear", () => {
      const command = ClearCommand.clearLayer({
        scene,
        layer: midLayer,
        stateManager,
      });

      // Execute then undo
      command.execute();
      command.undo();

      // Verify restoration
      expect(midLayer.getCell(0, 1).ch).toBe("C");
      expect(midLayer.getCell(0, 1).fg).toBe(3);
      expect(midLayer.getCell(0, 1).bg).toBe(2);
      expect(midLayer.getCell(2, 1).ch).toBe("D");
      expect(midLayer.getCell(2, 1).fg).toBe(4);
      expect(midLayer.getCell(2, 1).bg).toBe(3);
    });

    it("should emit cell change events on execute", () => {
      const cellChangedSpy = vi.fn();
      stateManager.on("cell:changed", cellChangedSpy);

      const command = ClearCommand.clearLayer({
        scene,
        layer: midLayer,
        stateManager,
      });

      command.execute();

      // Should emit events for all cells (6 cells in 3x2 grid)
      expect(cellChangedSpy).toHaveBeenCalledTimes(6);

      // Check specific event data
      const firstCall = cellChangedSpy.mock.calls[0][0];
      expect(firstCall.x).toBe(0);
      expect(firstCall.y).toBe(0);
      expect(firstCall.layerId).toBe(LAYER_MID);
      expect(firstCall.cell).toBeTruthy();
    });

    it("should emit cell change events on undo", () => {
      const command = ClearCommand.clearLayer({
        scene,
        layer: midLayer,
        stateManager,
      });

      command.execute();

      const cellChangedSpy = vi.fn();
      stateManager.on("cell:changed", cellChangedSpy);

      command.undo();

      // Should emit events for all cells during undo
      expect(cellChangedSpy).toHaveBeenCalledTimes(6);
    });
  });

  describe("All Layers Clear", () => {
    it("should clear all layers", () => {
      const command = ClearCommand.clearAll({
        scene,
        stateManager,
      });

      // Execute command
      command.execute();

      // Verify all layers are cleared
      expect(bgLayer.getCell(0, 0).isEmpty()).toBe(true);
      expect(bgLayer.getCell(1, 0).isEmpty()).toBe(true);
      expect(midLayer.getCell(0, 1).isEmpty()).toBe(true);
      expect(midLayer.getCell(2, 1).isEmpty()).toBe(true);
      expect(fgLayer.getCell(1, 1).isEmpty()).toBe(true);

      // Verify affected cell count (5 non-empty cells originally)
      expect(command.getAffectedCellCount()).toBe(5);

      // Verify previous state stored for all layers
      expect(command.previousState.layers).toHaveLength(3);
      expect(command.previousState.layers[0].layerId).toBe(LAYER_BG);
      expect(command.previousState.layers[1].layerId).toBe(LAYER_MID);
      expect(command.previousState.layers[2].layerId).toBe(LAYER_FG);
    });

    it("should undo all layers clear", () => {
      const command = ClearCommand.clearAll({
        scene,
        stateManager,
      });

      // Execute then undo
      command.execute();
      command.undo();

      // Verify all layers restored
      expect(bgLayer.getCell(0, 0).ch).toBe("A");
      expect(bgLayer.getCell(1, 0).ch).toBe("B");
      expect(midLayer.getCell(0, 1).ch).toBe("C");
      expect(midLayer.getCell(2, 1).ch).toBe("D");
      expect(fgLayer.getCell(1, 1).ch).toBe("E");

      // Verify colors restored too
      expect(bgLayer.getCell(0, 0).fg).toBe(1);
      expect(bgLayer.getCell(0, 0).bg).toBe(0);
      expect(fgLayer.getCell(1, 1).fg).toBe(5);
      expect(fgLayer.getCell(1, 1).bg).toBe(4);
    });

    it("should emit events for all layers on execute", () => {
      const cellChangedSpy = vi.fn();
      stateManager.on("cell:changed", cellChangedSpy);

      const command = ClearCommand.clearAll({
        scene,
        stateManager,
      });

      command.execute();

      // Should emit events for all cells in all layers (3 layers * 6 cells = 18)
      expect(cellChangedSpy).toHaveBeenCalledTimes(18);

      // Check that different layer IDs are present
      const layerIds = new Set();
      cellChangedSpy.mock.calls.forEach(call => {
        layerIds.add(call[0].layerId);
      });
      expect(layerIds).toContain(LAYER_BG);
      expect(layerIds).toContain(LAYER_MID);
      expect(layerIds).toContain(LAYER_FG);
    });
  });

  describe("Helper Methods", () => {
    it("should count non-empty cells correctly", () => {
      const cells = [
        new Cell(),           // empty
        new Cell("A", 1, 0), // non-empty
        new Cell(),           // empty
        new Cell("B", 2, 1), // non-empty
      ];

      const command = new ClearCommand({
        description: "Test",
        scene,
        layer: midLayer,
        stateManager,
      });

      expect(command.countNonEmptyCells(cells)).toBe(2);
    });

    it("should get affected layers for single layer command", () => {
      const command = ClearCommand.clearLayer({
        scene,
        layer: midLayer,
        stateManager,
      });

      const affected = command.getAffectedLayers();
      expect(affected).toHaveLength(1);
      expect(affected[0]).toBe(midLayer);
    });

    it("should get affected layers for all layers command", () => {
      const command = ClearCommand.clearAll({
        scene,
        stateManager,
      });

      const affected = command.getAffectedLayers();
      expect(affected).toHaveLength(3);
      expect(affected).toContain(bgLayer);
      expect(affected).toContain(midLayer);
      expect(affected).toContain(fgLayer);
    });

    it("should handle empty layers gracefully", () => {
      // Clear mid layer first
      midLayer.clear();

      const command = ClearCommand.clearLayer({
        scene,
        layer: midLayer,
        stateManager,
      });

      command.execute();
      expect(command.getAffectedCellCount()).toBe(0);

      // Should still be able to undo
      command.undo();
      // All cells should still be empty
      expect(midLayer.getCell(0, 1).isEmpty()).toBe(true);
      expect(midLayer.getCell(2, 1).isEmpty()).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("should throw error when undoing without execute", () => {
      const command = ClearCommand.clearLayer({
        scene,
        layer: midLayer,
        stateManager,
      });

      expect(() => {
        command.undo();
      }).toThrow("Cannot undo: no previous state stored");
    });

    it("should handle layer size mismatch during restore", () => {
      const command = ClearCommand.clearLayer({
        scene,
        layer: midLayer,
        stateManager,
      });

      command.execute();

      // Corrupt the previous state
      command.previousState.cells = [new Cell()]; // Wrong size

      expect(() => {
        command.undo();
      }).toThrow("Layer size mismatch during restore");
    });

    it("should handle layer count mismatch for all layers restore", () => {
      const command = ClearCommand.clearAll({
        scene,
        stateManager,
      });

      command.execute();

      // Corrupt the previous state
      command.previousState.layers = []; // Wrong count

      expect(() => {
        command.undo();
      }).toThrow("Layer count mismatch during restore");
    });
  });

  describe("Static Factory Methods", () => {
    it("should create clear layer command with correct description", () => {
      const command = ClearCommand.clearLayer({
        scene,
        layer: midLayer,
        stateManager,
      });

      expect(command.description).toBe("Clear layer 'Middle'");
      expect(command.layer).toBe(midLayer);
    });

    it("should create clear all command with correct description", () => {
      const command = ClearCommand.clearAll({
        scene,
        stateManager,
      });

      expect(command.description).toBe("Clear all layers");
      expect(command.layer).toBeNull();
    });
  });

  describe("Integration", () => {
    it("should work with command pattern interface", () => {
      const command = ClearCommand.clearLayer({
        scene,
        layer: midLayer,
        stateManager,
      });

      // Test Command interface
      expect(command.description).toBeTruthy();
      expect(command.timestamp).toBeTruthy();
      expect(command.executed).toBe(false);

      // Test execution
      command.execute();
      expect(command.executed).toBe(true);

      // Test string representation
      const str = command.toString();
      expect(str).toContain("Clear layer 'Middle'");
      expect(str).toContain(":");

      // Test age
      const age = command.getAge();
      expect(age).toBeGreaterThanOrEqual(0);
    });

    it("should not be mergeable with other commands", () => {
      const command1 = ClearCommand.clearLayer({
        scene,
        layer: midLayer,
        stateManager,
      });

      const command2 = ClearCommand.clearLayer({
        scene,
        layer: fgLayer,
        stateManager,
      });

      expect(command1.canMerge(command2)).toBe(false);
    });
  });
});
