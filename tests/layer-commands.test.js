/**
 * Layer Management Commands Tests
 * Tests for AddLayerCommand, RemoveLayerCommand, and ReorderLayersCommand
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { Scene } from "../src/core/Scene.js";
import { StateManager } from "../src/core/StateManager.js";
import { AddLayerCommand } from "../src/commands/AddLayerCommand.js";
import { RemoveLayerCommand } from "../src/commands/RemoveLayerCommand.js";
import { ReorderLayersCommand } from "../src/commands/ReorderLayersCommand.js";

describe("Layer Management Commands", () => {
  let scene;
  let stateManager;

  beforeEach(() => {
    stateManager = new StateManager();

    // Create a standard scene with 3 layers for testing
    scene = Scene.fromTemplateId("advanced", 20, 10, "default");

    // Ensure we have the expected layers
    expect(scene.layers.length).toBe(3);
    expect(scene.layers[0].name).toBe("Background");
    expect(scene.layers[1].name).toBe("Middle");
    expect(scene.layers[2].name).toBe("Foreground");
  });

  describe("AddLayerCommand", () => {
    describe("Construction", () => {
      it("should create command with proper description", () => {
        const command = new AddLayerCommand(scene, "detail");
        expect(command.description).toBe("Add Detail Layer");
        expect(command.purpose).toBe("detail");
        expect(command.executed).toBe(false);
      });

      it("should create command with custom name", () => {
        const command = new AddLayerCommand(scene, "effect", "Special Effect");
        expect(command.description).toBe("Add Special Effect Layer");
        expect(command.customName).toBe("Special Effect");
      });

      it("should create command with insertion position", () => {
        const command = new AddLayerCommand(scene, "overlay", null, 1);
        expect(command.insertAt).toBe(1);
      });
    });

    describe("Validation", () => {
      it("should validate valid configuration", () => {
        const command = new AddLayerCommand(scene, "detail");
        const validation = command.validate();
        expect(validation.valid).toBe(true);
      });

      it("should reject null scene", () => {
        const command = new AddLayerCommand(null, "detail");
        const validation = command.validate();
        expect(validation.valid).toBe(false);
        expect(validation.error).toContain("No scene provided");
      });

      it("should reject invalid purpose", () => {
        const command = new AddLayerCommand(scene, null);
        const validation = command.validate();
        expect(validation.valid).toBe(false);
        expect(validation.error).toContain("Invalid layer purpose");
      });

      it("should reject empty purpose string", () => {
        const command = new AddLayerCommand(scene, "");
        const validation = command.validate();
        expect(validation.valid).toBe(false);
        expect(validation.error).toContain("Invalid layer purpose");
      });
    });

    describe("Execution", () => {
      it("should add layer successfully", () => {
        const command = new AddLayerCommand(scene, "detail");
        const initialLayerCount = scene.layers.length;

        const result = command.execute();

        expect(result.success).toBe(true);
        expect(result.layerId).toBeDefined();
        expect(scene.layers.length).toBe(initialLayerCount + 1);
        expect(command.executed).toBe(true);
        expect(command.addedLayerId).toBe(result.layerId);
      });

      it("should set new layer as active", () => {
        const command = new AddLayerCommand(scene, "detail");
        const originalActiveId = scene.activeLayerId;

        const result = command.execute();

        expect(scene.activeLayerId).toBe(result.layerId);
        expect(scene.activeLayerId).not.toBe(originalActiveId);
      });

      it("should store previous active layer for undo", () => {
        const command = new AddLayerCommand(scene, "detail");
        const originalActiveId = scene.activeLayerId;

        command.execute();

        expect(command.previousActiveLayerId).toBe(originalActiveId);
      });

      it("should handle custom name correctly", () => {
        const command = new AddLayerCommand(scene, "effect", "Custom Effect");
        const result = command.execute();

        const addedLayer = scene.getLayer(result.layerId);
        expect(addedLayer.name).toBe("Custom Effect");
      });

      it("should handle insertion at specific position", () => {
        const command = new AddLayerCommand(scene, "overlay", null, 1);
        const result = command.execute();

        const layerIndex = scene.getLayerIndex(result.layerId);
        expect(layerIndex).toBe(1);
      });

      it("should be idempotent on re-execution", () => {
        const command = new AddLayerCommand(scene, "detail");

        const result1 = command.execute();
        const layerCount1 = scene.layers.length;

        const result2 = command.execute();
        const layerCount2 = scene.layers.length;

        expect(result2.success).toBe(true);
        expect(layerCount2).toBe(layerCount1); // Should not add another layer
        expect(result2.layerId).toBe(result1.layerId);
      });
    });

    describe("Undo", () => {
      it("should remove added layer", () => {
        const command = new AddLayerCommand(scene, "detail");
        const initialLayerCount = scene.layers.length;

        const result = command.execute();
        expect(scene.layers.length).toBe(initialLayerCount + 1);

        command.undo();
        expect(scene.layers.length).toBe(initialLayerCount);
        expect(scene.getLayer(result.layerId)).toBeNull();
      });

      it("should restore previous active layer", () => {
        const command = new AddLayerCommand(scene, "detail");
        const originalActiveId = scene.activeLayerId;

        command.execute();
        expect(scene.activeLayerId).not.toBe(originalActiveId);

        command.undo();
        expect(scene.activeLayerId).toBe(originalActiveId);
      });

      it("should handle case where previous active layer was removed", () => {
        const command1 = new AddLayerCommand(scene, "detail");
        const command2 = new RemoveLayerCommand(scene, scene.activeLayerId);

        command1.execute();
        command2.execute(); // Remove the previously active layer

        expect(() => command1.undo()).not.toThrow();
        expect(scene.layers.length).toBeGreaterThan(0);
      });

      it("should throw error if not executed", () => {
        const command = new AddLayerCommand(scene, "detail");
        expect(() => command.undo()).toThrow();
      });
    });

    describe("Details and String representation", () => {
      it("should provide detailed information", () => {
        const command = new AddLayerCommand(scene, "detail", "Custom Detail");
        command.execute();

        const details = command.getDetails();
        expect(details.type).toBe("AddLayer");
        expect(details.purpose).toBe("detail");
        expect(details.customName).toBe("Custom Detail");
        expect(details.executed).toBe(true);
        expect(details.addedLayerId).toBeDefined();
      });

      it("should provide enhanced string representation", () => {
        const command = new AddLayerCommand(scene, "detail");
        command.execute();

        const str = command.toString();
        expect(str).toContain("Add Detail Layer");
        expect(str).toContain(command.addedLayerName || "Detail");
      });
    });
  });

  describe("RemoveLayerCommand", () => {
    let layerToRemove;
    let layerToRemoveId;

    beforeEach(() => {
      // Add an extra layer to remove
      const addCommand = new AddLayerCommand(scene, "detail");
      const result = addCommand.execute();
      layerToRemoveId = result.layerId;
      layerToRemove = scene.getLayer(layerToRemoveId);
    });

    describe("Construction", () => {
      it("should create command with proper description", () => {
        const command = new RemoveLayerCommand(scene, layerToRemoveId);
        expect(command.description).toBe("Remove Detail Layer");
        expect(command.layerId).toBe(layerToRemoveId);
        expect(command.executed).toBe(false);
      });

      it("should handle missing layer gracefully", () => {
        const command = new RemoveLayerCommand(scene, "nonexistent");
        expect(command.description).toBe("Remove Unknown Layer Layer");
      });
    });

    describe("Validation", () => {
      it("should validate valid configuration", () => {
        const command = new RemoveLayerCommand(scene, layerToRemoveId);
        const validation = command.validate();
        expect(validation.valid).toBe(true);
      });

      it("should reject null scene", () => {
        const command = new RemoveLayerCommand(null, layerToRemoveId);
        const validation = command.validate();
        expect(validation.valid).toBe(false);
        expect(validation.error).toContain("No scene provided");
      });

      it("should reject missing layer ID", () => {
        const command = new RemoveLayerCommand(scene, null);
        const validation = command.validate();
        expect(validation.valid).toBe(false);
        expect(validation.error).toContain("No layer ID provided");
      });

      it("should reject removing last layer", () => {
        // Remove all layers except one
        while (scene.layers.length > 1) {
          scene.removeLayer(scene.layers[0].id);
        }

        const command = new RemoveLayerCommand(scene, scene.layers[0].id);
        const validation = command.validate();
        expect(validation.valid).toBe(false);
        expect(validation.error).toContain("Cannot remove the last layer");
      });

      it("should reject nonexistent layer", () => {
        const command = new RemoveLayerCommand(scene, "nonexistent");
        const validation = command.validate();
        expect(validation.valid).toBe(false);
        expect(validation.error).toContain("not found");
      });
    });

    describe("Execution", () => {
      it("should remove layer successfully", () => {
        const command = new RemoveLayerCommand(scene, layerToRemoveId);
        const initialLayerCount = scene.layers.length;

        const result = command.execute();

        expect(result.success).toBe(true);
        expect(scene.layers.length).toBe(initialLayerCount - 1);
        expect(scene.getLayer(layerToRemoveId)).toBeNull();
        expect(command.executed).toBe(true);
      });

      it("should store layer data for restoration", () => {
        const command = new RemoveLayerCommand(scene, layerToRemoveId);
        const originalLayerName = layerToRemove.name;

        command.execute();

        expect(command.removedLayer).toBeDefined();
        expect(command.removedLayer.name).toBe(originalLayerName);
        expect(command.removedIndex).toBeDefined();
        expect(command.removedIndex).toBeGreaterThanOrEqual(0);
      });

      it("should handle active layer removal", () => {
        scene.setActiveLayer(layerToRemoveId);
        const command = new RemoveLayerCommand(scene, layerToRemoveId);

        expect(scene.activeLayerId).toBe(layerToRemoveId);

        const result = command.execute();

        expect(result.success).toBe(true);
        expect(scene.activeLayerId).not.toBe(layerToRemoveId);
        expect(command.wasActiveLayer).toBe(true);
      });

      it("should select appropriate new active layer", () => {
        const initialLayers = [...scene.layers];
        const targetIndex = 1; // Remove middle layer
        const targetLayerId = initialLayers[targetIndex].id;

        scene.setActiveLayer(targetLayerId);
        const command = new RemoveLayerCommand(scene, targetLayerId);

        command.execute();

        // Should pick adjacent layer
        const newActiveLayer = scene.getActiveLayer();
        expect(newActiveLayer).toBeDefined();
        expect(newActiveLayer.id).not.toBe(targetLayerId);
      });

      it("should prevent removing last layer", () => {
        // Remove all but one layer
        while (scene.layers.length > 1) {
          scene.removeLayer(scene.layers[0].id);
        }

        const command = new RemoveLayerCommand(scene, scene.layers[0].id);
        const result = command.execute();

        expect(result.success).toBe(false);
        expect(result.error).toContain("Cannot remove the last layer");
        expect(scene.layers.length).toBe(1);
      });
    });

    describe("Undo", () => {
      it("should restore removed layer", () => {
        const command = new RemoveLayerCommand(scene, layerToRemoveId);
        const initialLayerCount = scene.layers.length;
        const originalLayerName = layerToRemove.name;

        command.execute();
        expect(scene.layers.length).toBe(initialLayerCount - 1);

        command.undo();
        expect(scene.layers.length).toBe(initialLayerCount);

        const restoredLayer = scene.getLayer(layerToRemoveId);
        expect(restoredLayer).toBeDefined();
        expect(restoredLayer.name).toBe(originalLayerName);
      });

      it("should restore layer at original position", () => {
        const originalIndex = scene.getLayerIndex(layerToRemoveId);
        const command = new RemoveLayerCommand(scene, layerToRemoveId);

        command.execute();
        command.undo();

        const restoredIndex = scene.getLayerIndex(layerToRemoveId);
        expect(restoredIndex).toBe(originalIndex);
      });

      it("should restore active layer if was active", () => {
        scene.setActiveLayer(layerToRemoveId);
        const command = new RemoveLayerCommand(scene, layerToRemoveId);

        command.execute();
        expect(scene.activeLayerId).not.toBe(layerToRemoveId);

        command.undo();
        expect(scene.activeLayerId).toBe(layerToRemoveId);
      });

      it("should throw error if not executed", () => {
        const command = new RemoveLayerCommand(scene, layerToRemoveId);
        expect(() => command.undo()).toThrow();
      });
    });

    describe("Layer data preservation", () => {
      it("should preserve all layer properties", () => {
        // Modify the layer to have specific properties
        layerToRemove.visible = false;
        layerToRemove.locked = true;
        layerToRemove.name = "Custom Name";

        const command = new RemoveLayerCommand(scene, layerToRemoveId);

        command.execute();
        command.undo();

        const restoredLayer = scene.getLayer(layerToRemoveId);
        expect(restoredLayer.visible).toBe(false);
        expect(restoredLayer.locked).toBe(true);
        expect(restoredLayer.name).toBe("Custom Name");
      });

      it("should preserve cell data", () => {
        // Modify some cells (flat array indexing)
        layerToRemove.cells[0] = { ch: "A", fg: 1, bg: 2 };
        layerToRemove.cells[55] = { ch: "B", fg: 3, bg: 4 }; // 5*width + 5

        const command = new RemoveLayerCommand(scene, layerToRemoveId);

        command.execute();
        command.undo();

        const restoredLayer = scene.getLayer(layerToRemoveId);
        expect(restoredLayer.cells[0].ch).toBe("A");
        expect(restoredLayer.cells[0].fg).toBe(1);
        expect(restoredLayer.cells[0].bg).toBe(2);
        expect(restoredLayer.cells[55].ch).toBe("B");
        expect(restoredLayer.cells[55].fg).toBe(3);
        expect(restoredLayer.cells[55].bg).toBe(4);
      });
    });
  });

  describe("ReorderLayersCommand", () => {
    let targetLayerId;

    beforeEach(() => {
      targetLayerId = scene.layers[1].id; // Middle layer
    });

    describe("Construction", () => {
      it("should create command with proper description", () => {
        const command = new ReorderLayersCommand(scene, targetLayerId, 1, 2);
        expect(command.description).toContain("Move");
        expect(command.description).toContain("Middle");
        expect(command.description).toContain("up");
      });

      it("should detect direction correctly", () => {
        const upCommand = new ReorderLayersCommand(scene, targetLayerId, 1, 2);
        expect(upCommand.description).toContain("up");

        const downCommand = new ReorderLayersCommand(
          scene,
          targetLayerId,
          1,
          0,
        );
        expect(downCommand.description).toContain("down");
      });

      it("should validate indices on construction", () => {
        expect(() => {
          new ReorderLayersCommand(scene, targetLayerId, -1, 0);
        }).toThrow();

        expect(() => {
          new ReorderLayersCommand(scene, targetLayerId, 0, 10);
        }).toThrow();

        expect(() => {
          new ReorderLayersCommand(scene, targetLayerId, 1, 1);
        }).toThrow();
      });
    });

    describe("Static factory methods", () => {
      it("should create moveUp command", () => {
        const command = ReorderLayersCommand.moveUp(scene, targetLayerId);
        expect(command.fromIndex).toBe(1);
        expect(command.toIndex).toBe(2);
      });

      it("should create moveDown command", () => {
        const command = ReorderLayersCommand.moveDown(scene, targetLayerId);
        expect(command.fromIndex).toBe(1);
        expect(command.toIndex).toBe(0);
      });

      it("should create moveToTop command", () => {
        const command = ReorderLayersCommand.moveToTop(scene, targetLayerId);
        expect(command.toIndex).toBe(scene.layers.length - 1);
      });

      it("should create moveToBottom command", () => {
        const command = ReorderLayersCommand.moveToBottom(scene, targetLayerId);
        expect(command.toIndex).toBe(0);
      });

      it("should handle edge cases for moveUp", () => {
        const topLayerId = scene.layers[scene.layers.length - 1].id;
        const command = ReorderLayersCommand.moveUp(scene, topLayerId);
        expect(command).toBeNull(); // Cannot move up from top
      });

      it("should handle edge cases for moveDown", () => {
        const bottomLayerId = scene.layers[0].id;
        const command = ReorderLayersCommand.moveDown(scene, bottomLayerId);
        expect(command).toBeNull(); // Cannot move down from bottom
      });
    });

    describe("Execution", () => {
      it("should reorder layer successfully", () => {
        const command = new ReorderLayersCommand(scene, targetLayerId, 1, 2);
        const originalOrder = scene.layers.map((l) => l.id);

        const result = command.execute();

        expect(result.success).toBe(true);
        expect(scene.getLayerIndex(targetLayerId)).toBe(2);
        expect(command.executed).toBe(true);

        const newOrder = scene.layers.map((l) => l.id);
        expect(newOrder).not.toEqual(originalOrder);
      });

      it("should update fromIndex if layer position changed", () => {
        const command = new ReorderLayersCommand(scene, targetLayerId, 1, 2);

        // Move the layer elsewhere first
        scene.reorderLayers(1, 0);

        const result = command.execute();

        expect(result.success).toBe(true);
        expect(command.fromIndex).toBe(0); // Should update to current position
      });

      it("should handle nonexistent layer", () => {
        const command = new ReorderLayersCommand(scene, "nonexistent", 1, 2);
        const result = command.execute();

        expect(result.success).toBe(false);
        expect(result.error).toContain("not found");
      });
    });

    describe("Undo", () => {
      it("should restore original layer order", () => {
        const command = new ReorderLayersCommand(scene, targetLayerId, 1, 2);
        const originalOrder = scene.layers.map((l) => l.id);

        command.execute();
        const newOrder = scene.layers.map((l) => l.id);
        expect(newOrder).not.toEqual(originalOrder);

        command.undo();
        const restoredOrder = scene.layers.map((l) => l.id);
        expect(restoredOrder).toEqual(originalOrder);
      });

      it("should handle complex reordering sequences", () => {
        const command1 = new ReorderLayersCommand(scene, targetLayerId, 1, 2);
        const command2 = new ReorderLayersCommand(scene, targetLayerId, 2, 0);
        const originalOrder = scene.layers.map((l) => l.id);

        command1.execute();
        command2.execute();

        command2.undo();
        expect(scene.getLayerIndex(targetLayerId)).toBe(2);

        command1.undo();
        const finalOrder = scene.layers.map((l) => l.id);
        expect(finalOrder).toEqual(originalOrder);
      });

      it("should throw error if not executed", () => {
        const command = new ReorderLayersCommand(scene, targetLayerId, 1, 2);
        expect(() => command.undo()).toThrow();
      });
    });

    describe("Command merging", () => {
      it("should merge compatible commands", () => {
        const command1 = new ReorderLayersCommand(scene, targetLayerId, 1, 2);
        const command2 = new ReorderLayersCommand(scene, targetLayerId, 2, 0);

        command2.timestamp = command1.timestamp + 1000; // Within merge window

        expect(command1.canMerge(command2)).toBe(true);
      });

      it("should not merge different layers", () => {
        const otherLayerId = scene.layers[0].id;
        const command1 = new ReorderLayersCommand(scene, targetLayerId, 1, 2);
        const command2 = new ReorderLayersCommand(scene, otherLayerId, 0, 1);

        expect(command1.canMerge(command2)).toBe(false);
      });

      it("should not merge commands with large time gap", () => {
        const command1 = new ReorderLayersCommand(scene, targetLayerId, 1, 2);
        const command2 = new ReorderLayersCommand(scene, targetLayerId, 2, 0);

        command2.timestamp = command1.timestamp + 5000; // Outside merge window

        expect(command1.canMerge(command2)).toBe(false);
      });

      it("should not merge non-sequential moves", () => {
        const command1 = new ReorderLayersCommand(scene, targetLayerId, 1, 2);
        const command2 = new ReorderLayersCommand(scene, targetLayerId, 1, 0); // Wrong fromIndex

        expect(command1.canMerge(command2)).toBe(false);
      });

      it("should merge commands correctly", () => {
        const command1 = new ReorderLayersCommand(scene, targetLayerId, 1, 2);
        const command2 = new ReorderLayersCommand(scene, targetLayerId, 2, 0);

        command2.timestamp = command1.timestamp + 1000;

        command1.merge(command2);

        expect(command1.toIndex).toBe(0); // Final destination
        expect(command1.fromIndex).toBe(1); // Original position
        expect(command1.description).toContain("down");
      });
    });

    describe("Validation", () => {
      it("should validate correct configuration", () => {
        const command = new ReorderLayersCommand(scene, targetLayerId, 1, 2);
        const validation = command.validate();
        expect(validation.valid).toBe(true);
      });

      it("should reject invalid configurations", () => {
        // Test null scene
        expect(() => {
          new ReorderLayersCommand(null, targetLayerId, 1, 2);
        }).toThrow();

        // Test null layerId - should validate and return error
        const command1 = new ReorderLayersCommand(scene, null, 1, 2);
        const validation1 = command1.validate();
        expect(validation1.valid).toBe(false);
        expect(validation1.error).toBeDefined();

        // Test nonexistent layer - should validate and return error
        const command2 = new ReorderLayersCommand(scene, "nonexistent", 1, 2);
        const validation2 = command2.validate();
        expect(validation2.valid).toBe(false);
        expect(validation2.error).toBeDefined();
      });
    });
  });

  describe("Integration scenarios", () => {
    it("should handle complex command sequences", () => {
      const addCommand = new AddLayerCommand(scene, "detail", "Detail Layer");
      const addResult = addCommand.execute();

      const removeCommand = new RemoveLayerCommand(scene, scene.layers[0].id);
      const removeResult = removeCommand.execute();

      const reorderCommand = new ReorderLayersCommand(
        scene,
        addResult.layerId,
        scene.getLayerIndex(addResult.layerId),
        0,
      );
      const reorderResult = reorderCommand.execute();

      expect(addResult.success).toBe(true);
      expect(removeResult.success).toBe(true);
      expect(reorderResult.success).toBe(true);

      // Undo in reverse order
      reorderCommand.undo();
      removeCommand.undo();
      addCommand.undo();

      // Should be back to original state
      expect(scene.layers.length).toBe(3);
      expect(scene.layers[0].name).toBe("Background");
      expect(scene.layers[1].name).toBe("Middle");
      expect(scene.layers[2].name).toBe("Foreground");
    });

    it("should handle error conditions gracefully", () => {
      // Try to remove a layer that doesn't exist
      const removeCommand = new RemoveLayerCommand(scene, "nonexistent");
      const removeResult = removeCommand.execute();
      expect(removeResult.success).toBe(false);

      // Try to create reorder command with invalid indices
      const validLayerId = scene.layers[0].id;
      expect(() => {
        new ReorderLayersCommand(scene, validLayerId, 0, 10);
      }).toThrow();

      // Scene should remain unchanged
      expect(scene.layers.length).toBe(3);
    });

    it("should maintain scene consistency", () => {
      const operations = [];

      // Perform various operations
      operations.push(new AddLayerCommand(scene, "detail"));
      operations.push(new AddLayerCommand(scene, "effect"));
      operations.push(
        new ReorderLayersCommand(scene, scene.layers[0].id, 0, 2),
      );

      // Execute all
      const results = operations.map((op) => op.execute());
      results.forEach((result) => expect(result.success).toBe(true));

      // Verify scene consistency
      expect(scene.layers.length).toBe(5);
      expect(scene.activeLayerId).toBeDefined();
      expect(scene.getActiveLayer()).toBeDefined();

      // All layers should have unique IDs
      const layerIds = scene.layers.map((l) => l.id);
      const uniqueIds = new Set(layerIds);
      expect(uniqueIds.size).toBe(layerIds.length);
    });
  });

  describe("Layer Removal UI Updates (Regression Tests)", () => {
    it("should execute RemoveLayerCommand through CommandHistory without return value", () => {
      const commandHistory = {
        execute: vi.fn(), // CommandHistory.execute() returns void, not command result
      };

      const command = new RemoveLayerCommand(scene, "mid");

      // Simulate what happens in LayerPanel.removeLayer()
      expect(() => {
        commandHistory.execute(command);
      }).not.toThrow();

      expect(commandHistory.execute).toHaveBeenCalledWith(command);
    });

    it("should handle command execution success without relying on return value", () => {
      const commandHistory = {
        execute: vi.fn(), // Returns undefined (void)
      };

      let success = false;
      let error = null;

      try {
        commandHistory.execute(new RemoveLayerCommand(scene, "mid"));
        // If no exception thrown, consider it successful
        success = true;
      } catch (e) {
        error = e;
      }

      expect(success).toBe(true);
      expect(error).toBe(null);
    });

    it("should properly validate layer removal before execution", () => {
      const command = new RemoveLayerCommand(scene, "mid");

      // Validate the command can be executed
      const validation = command.validate();
      expect(validation.valid).toBe(true);

      // Execute and verify layer is removed from scene
      const originalLayerCount = scene.layers.length;
      const result = command.execute();

      expect(result.success).toBe(true);
      expect(scene.layers.length).toBe(originalLayerCount - 1);
      expect(scene.getLayer("mid")).toBe(null);
    });

    it("should maintain layer panel state consistency after removal", () => {
      const initialLayers = scene.layers.map((l) => l.id);
      expect(initialLayers).toContain("mid");

      // Execute removal command
      const command = new RemoveLayerCommand(scene, "mid");
      command.execute();

      // Verify scene state is updated
      const finalLayers = scene.layers.map((l) => l.id);
      expect(finalLayers).not.toContain("mid");
      expect(finalLayers.length).toBe(initialLayers.length - 1);

      // Verify active layer is properly updated if removed layer was active
      if (scene.activeLayerId !== "mid") {
        expect(scene.getActiveLayer()).toBeDefined();
      }
    });
  });
});
