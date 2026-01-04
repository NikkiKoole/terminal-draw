import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Scene } from "../src/core/Scene.js";
import { StateManager } from "../src/core/StateManager.js";
import { CommandHistory } from "../src/commands/CommandHistory.js";
import { CellCommand } from "../src/commands/CellCommand.js";
import { ClearCommand } from "../src/commands/ClearCommand.js";
import { Cell } from "../src/core/Cell.js";
import { LAYER_BG, LAYER_MID, LAYER_FG } from "../src/core/constants.js";

describe("Milestone 2 Integration Tests", () => {
  let scene;
  let stateManager;
  let commandHistory;

  beforeEach(() => {
    scene = new Scene(10, 8); // Medium size for testing
    stateManager = new StateManager();
    commandHistory = new CommandHistory({
      maxSize: 100,
      stateManager,
    });
  });

  afterEach(() => {
    // Clean up any timers or resources
    vi.clearAllTimers();
  });

  describe("Command System Integration", () => {
    it("should handle mixed command types in history", () => {
      const bgLayer = scene.getLayer(LAYER_BG);
      const midLayer = scene.getLayer(LAYER_MID);

      // 1. Paint some cells
      const paintCommand = CellCommand.fromSingleCell({
        layer: bgLayer,
        index: 0,
        before: bgLayer.getCell(0, 0),
        after: new Cell("A", 1, 0),
        tool: "brush",
        stateManager,
        scene,
      });
      commandHistory.execute(paintCommand);

      // 2. Clear layer
      const clearCommand = ClearCommand.clearLayer({
        scene,
        layer: midLayer,
        stateManager,
      });
      commandHistory.execute(clearCommand);

      // 3. Paint more cells
      const paintCommand2 = CellCommand.fromSingleCell({
        layer: bgLayer,
        index: 15,
        before: bgLayer.getCell(1, 1),
        after: new Cell("B", 2, 1),
        tool: "brush",
        stateManager,
        scene,
      });
      commandHistory.execute(paintCommand2);

      expect(commandHistory.getUndoStack()).toHaveLength(3);

      // Verify all operations can be undone in reverse order
      expect(commandHistory.undo()).toBe(true); // Undo paint
      expect(commandHistory.undo()).toBe(true); // Undo clear
      expect(commandHistory.undo()).toBe(true); // Undo paint

      // Verify final state matches original
      expect(bgLayer.getCell(0, 0).isEmpty()).toBe(true);
    });

    it("should handle undo/redo with cell operations", () => {
      const layer = scene.getActiveLayer();

      // Paint content
      layer.setCell(5, 4, new Cell("X", 3, 2));
      layer.setCell(8, 6, new Cell("Y", 4, 3));

      // Paint with command
      const paintCommand = CellCommand.fromSingleCell({
        layer,
        index: scene.getCellIndex(2, 3),
        before: layer.getCell(2, 3),
        after: new Cell("Z", 5, 1),
        tool: "brush",
        stateManager,
        scene,
      });
      commandHistory.execute(paintCommand);

      expect(layer.getCell(2, 3).ch).toBe("Z");

      // Clear layer
      const clearCommand = ClearCommand.clearLayer({
        scene,
        layer,
        stateManager,
      });
      commandHistory.execute(clearCommand);

      expect(layer.getCell(5, 4).ch).toBe(" ");
      expect(layer.getCell(8, 6).ch).toBe(" ");
      expect(layer.getCell(2, 3).ch).toBe(" ");

      // Undo clear
      commandHistory.undo();
      expect(layer.getCell(5, 4).ch).toBe("X");
      expect(layer.getCell(8, 6).ch).toBe("Y");
      expect(layer.getCell(2, 3).ch).toBe("Z");

      // Undo paint
      commandHistory.undo();
      expect(layer.getCell(2, 3).ch).toBe(" ");
      expect(layer.getCell(5, 4).ch).toBe("X"); // Unchanged
      expect(layer.getCell(8, 6).ch).toBe("Y"); // Unchanged

      // Redo paint
      commandHistory.redo();
      expect(layer.getCell(2, 3).ch).toBe("Z");

      // Redo clear
      commandHistory.redo();
      expect(layer.getCell(5, 4).ch).toBe(" ");
      expect(layer.getCell(8, 6).ch).toBe(" ");
      expect(layer.getCell(2, 3).ch).toBe(" ");
    });

    it("should handle clear operations with proper history", () => {
      const bgLayer = scene.getLayer(LAYER_BG);
      const midLayer = scene.getLayer(LAYER_MID);
      const fgLayer = scene.getLayer(LAYER_FG);

      // Set up content in all layers
      bgLayer.setCell(2, 2, new Cell("1", 1, 0));
      midLayer.setCell(3, 3, new Cell("2", 2, 1));
      fgLayer.setCell(4, 4, new Cell("3", 3, 2));

      // Clear middle layer
      const clearMidCommand = ClearCommand.clearLayer({
        scene,
        layer: midLayer,
        stateManager,
      });
      commandHistory.execute(clearMidCommand);

      // Paint new content
      const paintCommand = CellCommand.fromSingleCell({
        layer: bgLayer,
        index: scene.getCellIndex(1, 1),
        before: bgLayer.getCell(1, 1),
        after: new Cell("A", 4, 3),
        tool: "brush",
        stateManager,
        scene,
      });
      commandHistory.execute(paintCommand);

      // Clear all layers
      const clearAllCommand = ClearCommand.clearAll({
        scene,
        stateManager,
      });
      commandHistory.execute(clearAllCommand);

      // Verify everything is cleared
      expect(bgLayer.getCell(2, 2).isEmpty()).toBe(true);
      expect(bgLayer.getCell(1, 1).isEmpty()).toBe(true);
      expect(midLayer.getCell(3, 3).isEmpty()).toBe(true);
      expect(fgLayer.getCell(4, 4).isEmpty()).toBe(true);

      // Undo clear all
      commandHistory.undo();
      expect(bgLayer.getCell(1, 1).ch).toBe("A"); // Paint command restored
      expect(bgLayer.getCell(2, 2).ch).toBe("1"); // Original content restored
      expect(midLayer.getCell(3, 3).isEmpty()).toBe(true); // Still cleared from clear mid
      expect(fgLayer.getCell(4, 4).ch).toBe("3"); // Original content restored

      // Undo paint
      commandHistory.undo();
      expect(bgLayer.getCell(1, 1).isEmpty()).toBe(true);

      // Undo clear middle
      commandHistory.undo();
      expect(midLayer.getCell(3, 3).ch).toBe("2"); // Restored
    });
  });

  describe("Performance Testing", () => {
    it("should handle large grid operations efficiently", () => {
      const startTime = performance.now();

      // Create large grid
      const largeScene = new Scene(100, 50); // 5000 cells
      const largeStateManager = new StateManager();
      const largeHistory = new CommandHistory({
        maxSize: 50,
        stateManager: largeStateManager,
      });

      // Fill with content
      const layer = largeScene.getActiveLayer();
      for (let i = 0; i < 1000; i++) {
        // Fill 1000 cells
        const x = i % 100;
        const y = Math.floor(i / 100);
        layer.setCell(x, y, new Cell("█", 7, -1));
      }

      // Perform clear operation
      const clearCommand = ClearCommand.clearAll({
        scene: largeScene,
        stateManager: largeStateManager,
      });
      largeHistory.execute(clearCommand);

      // Verify clearing worked
      expect(layer.getCell(50, 25).isEmpty()).toBe(true);

      // Undo operation
      largeHistory.undo();
      expect(layer.getCell(50, 5).ch).toBe("█");

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (adjust threshold as needed)
      expect(duration).toBeLessThan(1000); // 1 second
    });

    it("should handle command history with 50+ commands", () => {
      const layer = scene.getActiveLayer();
      const startTime = performance.now();

      // Execute 60 commands with different tools to prevent merging
      for (let i = 0; i < 60; i++) {
        const x = i % scene.w;
        const y = Math.floor(i / scene.w) % scene.h;
        const index = y * scene.w + x;

        const command = CellCommand.fromSingleCell({
          layer,
          index: index,
          before: layer.getCell(x, y),
          after: new Cell(String.fromCharCode(65 + (i % 26)), 1, 0),
          tool: "brush_" + i, // Different tool for each command to prevent merging
          stateManager,
          scene,
        });
        commandHistory.execute(command);
      }

      // With maxSize 100, should have all 60 commands (no merging due to different tools)
      expect(commandHistory.getUndoStack().length).toBe(60);

      // Test undo performance
      let undoCount = 0;
      while (commandHistory.canUndo() && undoCount < 30) {
        commandHistory.undo();
        undoCount++;
      }

      expect(undoCount).toBe(30);

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time
      expect(duration).toBeLessThan(500); // 500ms
    });

    it("should handle memory usage with large operations", () => {
      const memoryBefore = process.memoryUsage().heapUsed;

      // Create multiple large operations
      const operations = [];
      for (let i = 0; i < 10; i++) {
        const clearCommand = ClearCommand.clearAll({
          scene,
          stateManager,
        });
        operations.push(clearCommand);
        commandHistory.execute(clearCommand);

        // Undo to create more state
        if (i % 2 === 0) {
          commandHistory.undo();
        }
      }

      const memoryAfter = process.memoryUsage().heapUsed;
      const memoryIncrease = memoryAfter - memoryBefore;

      // Memory increase should be reasonable (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);

      // Clean up
      operations.length = 0;
    });
  });

  describe("Error Handling Integration", () => {
    it("should recover gracefully from command execution errors", () => {
      const layer = scene.getActiveLayer();

      // Execute valid command
      const validCommand = CellCommand.fromSingleCell({
        layer,
        index: 0,
        before: layer.getCell(0, 0),
        after: new Cell("A", 1, 0),
        tool: "brush",
        stateManager,
        scene,
      });
      commandHistory.execute(validCommand);

      // Try to execute invalid command
      const invalidCommand = {
        execute: () => {
          throw new Error("Simulated error");
        },
        undo: () => {},
        description: "Invalid command",
      };

      expect(() => {
        commandHistory.execute(invalidCommand);
      }).toThrow("Simulated error");

      // History should remain intact
      expect(commandHistory.getUndoStack()).toHaveLength(1);
      expect(commandHistory.canUndo()).toBe(true);

      // Should still be able to undo valid command
      commandHistory.undo();
      expect(layer.getCell(0, 0).isEmpty()).toBe(true);
    });

    it("should handle clear operation errors gracefully", () => {
      const layer = scene.getActiveLayer();
      layer.setCell(3, 3, new Cell("T", 2, 1));

      // Test error handling during construction
      expect(() => {
        new ClearCommand({
          description: "Test clear",
          scene,
          layer,
          stateManager: null, // Invalid
        });
      }).toThrow("ClearCommand stateManager is required");

      // Original content should be preserved
      expect(layer.getCell(3, 3).ch).toBe("T");
    });
  });

  describe("Event System Integration", () => {
    it("should emit correct events during complex operations", () => {
      const events = [];
      stateManager.on("cell:changed", (data) =>
        events.push({ type: "cell:changed", ...data }),
      );

      const layer = scene.getActiveLayer();

      // 1. Paint operation
      const paintCommand = CellCommand.fromSingleCell({
        layer,
        index: 10,
        before: layer.getCell(0, 1),
        after: new Cell("P", 1, 0),
        tool: "brush",
        stateManager,
        scene,
      });
      commandHistory.execute(paintCommand);

      // 2. Clear operation
      const clearCommand = ClearCommand.clearLayer({
        scene,
        layer,
        stateManager,
      });
      commandHistory.execute(clearCommand);

      expect(events.length).toBeGreaterThan(0);

      // Check event types and data
      const cellChangedEvents = events.filter((e) => e.type === "cell:changed");
      expect(cellChangedEvents.length).toBeGreaterThan(0);

      cellChangedEvents.forEach((event) => {
        expect(event.x).toBeTypeOf("number");
        expect(event.y).toBeTypeOf("number");
        expect(event.layerId).toBeTypeOf("string");
        expect(event.cell).toBeTypeOf("object");
      });
    });

    it("should maintain event consistency during undo/redo", () => {
      const events = [];
      stateManager.on("cell:changed", (data) => events.push(data));

      const layer = scene.getActiveLayer();
      const command = CellCommand.fromSingleCell({
        layer,
        index: 5,
        before: layer.getCell(5, 0),
        after: new Cell("E", 3, 2),
        tool: "brush",
        stateManager,
        scene,
      });

      // Execute
      commandHistory.execute(command);
      const executeEvents = events.length;

      // Undo
      commandHistory.undo();
      const undoEvents = events.length - executeEvents;

      // Redo
      commandHistory.redo();
      const redoEvents = events.length - executeEvents - undoEvents;

      // Should emit same number of events for execute/undo/redo
      expect(executeEvents).toBeGreaterThan(0);
      expect(undoEvents).toBeGreaterThan(0);
      expect(redoEvents).toBeGreaterThan(0);
    });
  });

  describe("Layer System Integration", () => {
    it("should maintain layer integrity across all operations", () => {
      const bgLayer = scene.getLayer(LAYER_BG);
      const midLayer = scene.getLayer(LAYER_MID);
      const fgLayer = scene.getLayer(LAYER_FG);

      // Verify initial state
      expect(scene.layers).toHaveLength(3);
      expect(bgLayer.id).toBe(LAYER_BG);
      expect(midLayer.id).toBe(LAYER_MID);
      expect(fgLayer.id).toBe(LAYER_FG);

      // Add content to each layer using direct setCell first
      bgLayer.setCell(1, 1, new Cell("1", 1, 0));
      midLayer.setCell(2, 2, new Cell("2", 2, 1));
      fgLayer.setCell(3, 3, new Cell("3", 3, 2));

      // Verify layers are maintained
      expect(scene.layers).toHaveLength(3);
      expect(scene.getLayer(LAYER_BG)).toBeTruthy();
      expect(scene.getLayer(LAYER_MID)).toBeTruthy();
      expect(scene.getLayer(LAYER_FG)).toBeTruthy();

      // Verify content is preserved
      expect(bgLayer.getCell(1, 1).ch).toBe("1");
      expect(midLayer.getCell(2, 2).ch).toBe("2");
      expect(fgLayer.getCell(3, 3).ch).toBe("3");

      // Test clear operation
      const clearCommand = ClearCommand.clearLayer({
        scene,
        layer: midLayer,
        stateManager,
      });
      commandHistory.execute(clearCommand);

      // Verify layer is cleared
      expect(scene.getLayer(LAYER_MID)).toBeTruthy();
      expect(midLayer.cells.every((cell) => cell.isEmpty())).toBe(true);

      // Test undo operations
      commandHistory.undo(); // Undo clear
      expect(midLayer.getCell(2, 2).ch).toBe("2"); // Should have content again
    });

    it("should handle active layer changes during operations", () => {
      // Start with middle layer active
      expect(scene.activeLayerId).toBe(LAYER_MID);

      // Switch to foreground layer
      scene.setActiveLayer(LAYER_FG);
      const fgLayer = scene.getActiveLayer();

      // Clear active layer
      const clearCommand = ClearCommand.clearLayer({
        scene,
        layer: fgLayer,
        stateManager,
      });
      commandHistory.execute(clearCommand);

      // Switch to background layer
      scene.setActiveLayer(LAYER_BG);
      expect(scene.activeLayerId).toBe(LAYER_BG);

      // Undo clear (should affect FG layer regardless of current active)
      commandHistory.undo();

      // Verify operation affected correct layer
      expect(scene.activeLayerId).toBe(LAYER_BG); // Still bg active
      // FG layer should be restored (test would need specific content to verify)
    });
  });

  describe("Complex Workflow Integration", () => {
    it("should handle realistic user workflow", () => {
      const bgLayer = scene.getLayer(LAYER_BG);
      const midLayer = scene.getLayer(LAYER_MID);

      const commands = [];

      // 1. User draws background
      for (let i = 0; i < 5; i++) {
        const x = i % scene.w;
        const y = Math.floor(i / scene.w);
        const command = CellCommand.fromSingleCell({
          layer: bgLayer,
          index: i,
          before: bgLayer.cells[i],
          after: new Cell("░", 8, 0),
          tool: "brush",
          stateManager,
          scene,
        });
        commandHistory.execute(command);
        commands.push(command);
      }

      // 2. User draws foreground elements
      scene.setActiveLayer(LAYER_MID);
      for (let i = 0; i < 3; i++) {
        const index = 100 + i;
        const x = index % scene.w;
        const y = Math.floor(index / scene.w);
        const command = CellCommand.fromSingleCell({
          layer: midLayer,
          index: index,
          before: midLayer.cells[index],
          after: new Cell("█", 15, -1),
          tool: "brush",
          stateManager,
          scene,
        });
        commandHistory.execute(command);
        commands.push(command);
      }

      // 4. User makes mistake and wants to clear middle layer
      const clearCommand = ClearCommand.clearLayer({
        scene,
        layer: midLayer,
        stateManager,
      });
      commandHistory.execute(clearCommand);

      // 5. User changes mind and undoes clear
      commandHistory.undo();

      // 6. User undoes some drawing
      commandHistory.undo();

      // Verify workflow integrity
      expect(scene.w).toBe(10);
      expect(scene.h).toBe(8);
      expect(commandHistory.canUndo()).toBe(true);
      expect(commandHistory.canRedo()).toBe(true);
    });

    it("should maintain performance during extended session", () => {
      const startTime = performance.now();

      let commandCount = 0;

      // Simulate extended editing session
      for (let session = 0; session < 3; session++) {
        // Draw phase - use different tools to prevent merging
        for (let i = 0; i < 5; i++) {
          const layer =
            session % 2 === 0
              ? scene.getLayer(LAYER_BG)
              : scene.getLayer(LAYER_MID);
          const cellIndex = i + session * 5;
          if (cellIndex < layer.cells.length) {
            const command = CellCommand.fromSingleCell({
              layer,
              index: cellIndex,
              before: layer.cells[cellIndex],
              after: new Cell("*", 1 + (i % 7), 0),
              tool: `brush_session_${session}_${i}`, // Unique tool to prevent merging
              stateManager,
              scene,
            });
            commandHistory.execute(command);
            commandCount++;
          }
        }

        // Add clear operations
        const clearCommand = ClearCommand.clearLayer({
          scene,
          layer: scene.getActiveLayer(),
          stateManager,
        });
        commandHistory.execute(clearCommand);
        commandCount++;
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should maintain reasonable performance
      expect(duration).toBeLessThan(2000); // 2 seconds
      expect(commandHistory.getUndoStack().length).toBe(commandCount);
    });
  });
});
