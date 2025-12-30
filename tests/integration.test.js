import { describe, it, expect, beforeEach, vi } from "vitest";
import { Scene } from "../src/core/Scene.js";
import { StateManager } from "../src/core/StateManager.js";
import { Cell } from "../src/core/Cell.js";
import { Layer } from "../src/core/Layer.js";
import { LAYER_BG, LAYER_MID, LAYER_FG } from "../src/core/constants.js";

describe("Integration Tests", () => {
  let scene;
  let stateManager;

  beforeEach(() => {
    scene = new Scene();
    stateManager = new StateManager();
  });

  describe("Scene + StateManager Integration", () => {
    it("should emit scene:updated when scene is modified", () => {
      const callback = vi.fn();
      stateManager.on("scene:updated", callback);

      // Modify the scene
      const layer = scene.getActiveLayer();
      layer.setCell(10, 10, new Cell("X", 1, 0));

      // Emit the update event
      stateManager.emit("scene:updated", {
        scene: scene.toObject(),
        timestamp: Date.now(),
      });

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback.mock.calls[0][0].scene).toBeDefined();
    });

    it("should emit layer:changed when active layer changes", () => {
      const callback = vi.fn();
      stateManager.on("layer:changed", callback);

      // Change active layer
      scene.setActiveLayer(LAYER_BG);

      // Emit the event
      stateManager.emit("layer:changed", {
        previousLayerId: LAYER_MID,
        currentLayerId: scene.activeLayerId,
      });

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback.mock.calls[0][0].currentLayerId).toBe(LAYER_BG);
    });

    it("should emit cell:changed when cells are modified", () => {
      const callback = vi.fn();
      stateManager.on("cell:changed", callback);

      const layer = scene.getActiveLayer();
      layer.setCell(5, 5, new Cell("█", 3, 1));

      stateManager.emit("cell:changed", {
        layerId: scene.activeLayerId,
        x: 5,
        y: 5,
        cell: layer.getCell(5, 5).toObject(),
      });

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback.mock.calls[0][0].x).toBe(5);
      expect(callback.mock.calls[0][0].y).toBe(5);
      expect(callback.mock.calls[0][0].cell.ch).toBe("█");
    });

    it("should handle multiple subscribers to scene updates", () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const callback3 = vi.fn();

      stateManager.on("scene:updated", callback1);
      stateManager.on("scene:updated", callback2);
      stateManager.on("scene:updated", callback3);

      scene.getActiveLayer().setCell(0, 0, new Cell("A", 1, 0));
      stateManager.emit("scene:updated", { scene: scene.toObject() });

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
      expect(callback3).toHaveBeenCalledTimes(1);
    });

    it("should clean up listeners when unsubscribing", () => {
      const callback = vi.fn();
      const unsubscribe = stateManager.on("scene:updated", callback);

      stateManager.emit("scene:updated", { scene: scene.toObject() });
      expect(callback).toHaveBeenCalledTimes(1);

      unsubscribe();
      stateManager.emit("scene:updated", { scene: scene.toObject() });
      expect(callback).toHaveBeenCalledTimes(1); // Should not increase
    });
  });

  describe("Complete Workflow: Drawing Application", () => {
    it("should handle a complete drawing workflow", () => {
      // Setup callbacks for different events
      const sceneUpdates = vi.fn();
      const layerChanges = vi.fn();
      const cellChanges = vi.fn();

      stateManager.on("scene:updated", sceneUpdates);
      stateManager.on("layer:changed", layerChanges);
      stateManager.on("cell:changed", cellChanges);

      // Step 1: Draw on background layer
      scene.setActiveLayer(LAYER_BG);
      stateManager.emit("layer:changed", {
        previousLayerId: LAYER_MID,
        currentLayerId: LAYER_BG,
      });

      const bgLayer = scene.getActiveLayer();
      bgLayer.fill({ ch: "░", fg: 0, bg: -1 });
      stateManager.emit("scene:updated", { scene: scene.toObject() });

      // Step 2: Switch to middle layer and draw a box
      scene.setActiveLayer(LAYER_MID);
      stateManager.emit("layer:changed", {
        previousLayerId: LAYER_BG,
        currentLayerId: LAYER_MID,
      });

      const midLayer = scene.getActiveLayer();
      // Draw a simple box (10x5 starting at 5,5)
      for (let x = 5; x <= 15; x++) {
        midLayer.setCell(x, 5, new Cell("─", 7, -1));
        midLayer.setCell(x, 10, new Cell("─", 7, -1));
      }
      for (let y = 5; y <= 10; y++) {
        midLayer.setCell(5, y, new Cell("│", 7, -1));
        midLayer.setCell(15, y, new Cell("│", 7, -1));
      }
      midLayer.setCell(5, 5, new Cell("┌", 7, -1));
      midLayer.setCell(15, 5, new Cell("┐", 7, -1));
      midLayer.setCell(5, 10, new Cell("└", 7, -1));
      midLayer.setCell(15, 10, new Cell("┘", 7, -1));

      stateManager.emit("scene:updated", { scene: scene.toObject() });

      // Step 3: Add text on foreground layer
      scene.setActiveLayer(LAYER_FG);
      stateManager.emit("layer:changed", {
        previousLayerId: LAYER_MID,
        currentLayerId: LAYER_FG,
      });

      const fgLayer = scene.getActiveLayer();
      const text = "HELLO";
      for (let i = 0; i < text.length; i++) {
        fgLayer.setCell(7 + i, 7, new Cell(text[i], 3, -1));
      }

      stateManager.emit("scene:updated", { scene: scene.toObject() });

      // Verify all events were emitted correctly
      expect(sceneUpdates).toHaveBeenCalledTimes(3);
      expect(layerChanges).toHaveBeenCalledTimes(3);

      // Verify scene state
      expect(scene.activeLayerId).toBe(LAYER_FG);
      expect(scene.getLayer(LAYER_BG).getCell(0, 0).ch).toBe("░");
      expect(scene.getLayer(LAYER_MID).getCell(5, 5).ch).toBe("┌");
      expect(scene.getLayer(LAYER_FG).getCell(7, 7).ch).toBe("H");
    });

    it("should support undo-like workflow with scene snapshots", () => {
      const snapshots = [];

      // Take initial snapshot
      snapshots.push(scene.toObject());

      // Make changes
      scene.getActiveLayer().setCell(10, 10, new Cell("A", 1, 0));
      snapshots.push(scene.toObject());

      scene.getActiveLayer().setCell(11, 10, new Cell("B", 2, 0));
      snapshots.push(scene.toObject());

      scene.getActiveLayer().setCell(12, 10, new Cell("C", 3, 0));
      snapshots.push(scene.toObject());

      // Verify we can restore previous states
      expect(snapshots.length).toBe(4);

      // Restore to state before "C" was added
      const restoredScene = Scene.fromObject(snapshots[2]);
      expect(restoredScene.getActiveLayer().getCell(10, 10).ch).toBe("A");
      expect(restoredScene.getActiveLayer().getCell(11, 10).ch).toBe("B");
      expect(restoredScene.getActiveLayer().getCell(12, 10).isEmpty()).toBe(
        true
      );
    });

    it("should handle layer visibility changes with state manager", () => {
      const callback = vi.fn();
      stateManager.on("layer:changed", callback);

      // Toggle layer visibility
      const bgLayer = scene.getLayer(LAYER_BG);
      bgLayer.visible = false;
      stateManager.emit("layer:changed", {
        layerId: LAYER_BG,
        property: "visible",
        value: false,
      });

      const fgLayer = scene.getLayer(LAYER_FG);
      fgLayer.visible = false;
      stateManager.emit("layer:changed", {
        layerId: LAYER_FG,
        property: "visible",
        value: false,
      });

      // Get visible layers
      const visibleLayers = scene.getVisibleLayers();
      expect(visibleLayers.length).toBe(1);
      expect(visibleLayers[0].id).toBe(LAYER_MID);

      expect(callback).toHaveBeenCalledTimes(2);
    });

    it("should support multi-layer copy/paste workflow", () => {
      // Draw pattern on middle layer
      const midLayer = scene.getLayer(LAYER_MID);
      midLayer.setCell(0, 0, new Cell("A", 1, 0));
      midLayer.setCell(1, 0, new Cell("B", 2, 0));
      midLayer.setCell(0, 1, new Cell("C", 3, 0));
      midLayer.setCell(1, 1, new Cell("D", 4, 0));

      // Copy region
      const region = midLayer.getRegion(0, 0, 2, 2);

      // Paste to different location
      const count = midLayer.setRegion(5, 5, region);
      expect(count).toBe(4);

      // Verify copied data
      expect(midLayer.getCell(5, 5).ch).toBe("A");
      expect(midLayer.getCell(6, 5).ch).toBe("B");
      expect(midLayer.getCell(5, 6).ch).toBe("C");
      expect(midLayer.getCell(6, 6).ch).toBe("D");

      // Emit update event
      stateManager.emit("scene:updated", {
        action: "paste",
        layerId: LAYER_MID,
        x: 5,
        y: 5,
        region: { width: 2, height: 2 },
      });
    });
  });

  describe("Scene Persistence", () => {
    it("should save and restore complete scene with all layers", () => {
      // Create a complex scene
      scene.getLayer(LAYER_BG).fill({ ch: "░", fg: 0, bg: -1 });
      scene.getLayer(LAYER_MID).setCell(10, 10, new Cell("█", 1, 0));
      scene.getLayer(LAYER_FG).setCell(20, 20, new Cell("X", 7, -1));

      scene.setActiveLayer(LAYER_FG);
      scene.getLayer(LAYER_BG).visible = false;
      scene.options = { zoom: 150, showGrid: true };

      // Serialize to JSON
      const json = JSON.stringify(scene.toObject());

      // Restore from JSON
      const restored = Scene.fromObject(JSON.parse(json));

      // Verify all properties
      expect(restored.w).toBe(scene.w);
      expect(restored.h).toBe(scene.h);
      expect(restored.paletteId).toBe(scene.paletteId);
      expect(restored.activeLayerId).toBe(LAYER_FG);
      expect(restored.options).toEqual({ zoom: 150, showGrid: true });

      // Verify layers
      expect(restored.getLayer(LAYER_BG).visible).toBe(false);
      expect(restored.getLayer(LAYER_BG).getCell(0, 0).ch).toBe("░");
      expect(restored.getLayer(LAYER_MID).getCell(10, 10).ch).toBe("█");
      expect(restored.getLayer(LAYER_FG).getCell(20, 20).ch).toBe("X");
    });

    it("should handle custom palette changes", () => {
      const callback = vi.fn();
      stateManager.on("scene:updated", callback);

      // Change palette
      scene.paletteId = "monokai";
      stateManager.emit("scene:updated", {
        action: "paletteChanged",
        paletteId: "monokai",
      });

      expect(scene.paletteId).toBe("monokai");
      expect(callback).toHaveBeenCalledWith({
        action: "paletteChanged",
        paletteId: "monokai",
      });
    });
  });

  describe("Error Handling and Edge Cases", () => {
    it("should handle invalid layer operations gracefully", () => {
      expect(scene.setActiveLayer("nonexistent")).toBe(false);
      expect(scene.getLayer("nonexistent")).toBe(null);
      expect(scene.removeLayer("nonexistent")).toBe(false);
    });

    it("should prevent removing the last layer", () => {
      scene.removeLayer(LAYER_BG);
      scene.removeLayer(LAYER_FG);

      // Should not be able to remove the last layer
      expect(scene.removeLayer(LAYER_MID)).toBe(false);
      expect(scene.layers.length).toBe(1);
    });

    it("should handle state manager errors without crashing", () => {
      const errorCallback = vi.fn(() => {
        throw new Error("Intentional error");
      });
      const normalCallback = vi.fn();

      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      stateManager.on("test:event", errorCallback);
      stateManager.on("test:event", normalCallback);

      // Should not throw
      expect(() => stateManager.emit("test:event")).not.toThrow();
      expect(normalCallback).toHaveBeenCalled();

      consoleError.mockRestore();
    });

    it("should handle out of bounds cell access", () => {
      const layer = scene.getActiveLayer();
      expect(layer.getCell(-1, -1)).toBe(null);
      expect(layer.getCell(1000, 1000)).toBe(null);
      expect(layer.setCell(-1, -1, new Cell("X", 1, 0))).toBe(false);
    });
  });

  describe("Performance Considerations", () => {
    it("should handle large number of event listeners", () => {
      const callbacks = [];
      for (let i = 0; i < 100; i++) {
        callbacks.push(vi.fn());
        stateManager.on("test:event", callbacks[i]);
      }

      const count = stateManager.emit("test:event", { data: "test" });
      expect(count).toBe(100);

      callbacks.forEach((callback) => {
        expect(callback).toHaveBeenCalledWith({ data: "test" });
      });
    });

    it("should efficiently clear multiple events", () => {
      for (let i = 0; i < 50; i++) {
        stateManager.on(`event${i}`, vi.fn());
      }

      expect(stateManager.eventNames().length).toBe(50);

      stateManager.clear();
      expect(stateManager.eventNames().length).toBe(0);
    });

    it("should handle rapid scene updates", () => {
      const callback = vi.fn();
      stateManager.on("cell:changed", callback);

      const layer = scene.getActiveLayer();
      for (let i = 0; i < 100; i++) {
        layer.setCell(i % 80, Math.floor(i / 80), new Cell("X", 1, 0));
        stateManager.emit("cell:changed", { x: i % 80, y: Math.floor(i / 80) });
      }

      expect(callback).toHaveBeenCalledTimes(100);
    });
  });
});
