import { describe, it, expect, beforeEach, vi } from "bun:test";
import { StateManager } from "../src/core/StateManager.js";

describe("StateManager", () => {
  let stateManager;

  beforeEach(() => {
    stateManager = new StateManager();
  });

  describe("constructor", () => {
    it("should create a new StateManager", () => {
      expect(stateManager).toBeInstanceOf(StateManager);
      expect(stateManager.listeners).toBeInstanceOf(Map);
    });

    it("should initialize with empty listeners", () => {
      expect(stateManager.listeners.size).toBe(0);
    });
  });

  describe("on", () => {
    it("should register a callback for an event", () => {
      const callback = vi.fn();
      stateManager.on("test:event", callback);

      expect(stateManager.listenerCount("test:event")).toBe(1);
    });

    it("should register multiple callbacks for the same event", () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      stateManager.on("test:event", callback1);
      stateManager.on("test:event", callback2);

      expect(stateManager.listenerCount("test:event")).toBe(2);
    });

    it("should register callbacks for different events", () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      stateManager.on("event1", callback1);
      stateManager.on("event2", callback2);

      expect(stateManager.listenerCount("event1")).toBe(1);
      expect(stateManager.listenerCount("event2")).toBe(1);
    });

    it("should return an unsubscribe function", () => {
      const callback = vi.fn();
      const unsubscribe = stateManager.on("test:event", callback);

      expect(typeof unsubscribe).toBe("function");
    });

    it("should unsubscribe when calling returned function", () => {
      const callback = vi.fn();
      const unsubscribe = stateManager.on("test:event", callback);

      expect(stateManager.listenerCount("test:event")).toBe(1);
      unsubscribe();
      expect(stateManager.listenerCount("test:event")).toBe(0);
    });

    it("should throw error if callback is not a function", () => {
      expect(() => stateManager.on("test:event", "not a function")).toThrow(
        "Callback must be a function"
      );
      expect(() => stateManager.on("test:event", 123)).toThrow();
      expect(() => stateManager.on("test:event", null)).toThrow();
    });

    it("should handle scene:updated event", () => {
      const callback = vi.fn();
      stateManager.on("scene:updated", callback);
      expect(stateManager.listenerCount("scene:updated")).toBe(1);
    });

    it("should handle layer:changed event", () => {
      const callback = vi.fn();
      stateManager.on("layer:changed", callback);
      expect(stateManager.listenerCount("layer:changed")).toBe(1);
    });

    it("should handle tool:changed event", () => {
      const callback = vi.fn();
      stateManager.on("tool:changed", callback);
      expect(stateManager.listenerCount("tool:changed")).toBe(1);
    });

    it("should handle cell:changed event", () => {
      const callback = vi.fn();
      stateManager.on("cell:changed", callback);
      expect(stateManager.listenerCount("cell:changed")).toBe(1);
    });
  });

  describe("off", () => {
    it("should remove a registered callback", () => {
      const callback = vi.fn();
      stateManager.on("test:event", callback);

      const result = stateManager.off("test:event", callback);

      expect(result).toBe(true);
      expect(stateManager.listenerCount("test:event")).toBe(0);
    });

    it("should return false if event does not exist", () => {
      const callback = vi.fn();
      const result = stateManager.off("nonexistent:event", callback);

      expect(result).toBe(false);
    });

    it("should return false if callback is not found", () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      stateManager.on("test:event", callback1);
      const result = stateManager.off("test:event", callback2);

      expect(result).toBe(false);
      expect(stateManager.listenerCount("test:event")).toBe(1);
    });

    it("should only remove the specified callback", () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      stateManager.on("test:event", callback1);
      stateManager.on("test:event", callback2);

      stateManager.off("test:event", callback1);

      expect(stateManager.listenerCount("test:event")).toBe(1);
      stateManager.emit("test:event");
      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    it("should clean up empty event arrays", () => {
      const callback = vi.fn();
      stateManager.on("test:event", callback);
      stateManager.off("test:event", callback);

      expect(stateManager.listeners.has("test:event")).toBe(false);
    });

    it("should handle removing the same callback multiple times", () => {
      const callback = vi.fn();
      stateManager.on("test:event", callback);

      expect(stateManager.off("test:event", callback)).toBe(true);
      expect(stateManager.off("test:event", callback)).toBe(false);
    });
  });

  describe("emit", () => {
    it("should call registered callbacks", () => {
      const callback = vi.fn();
      stateManager.on("test:event", callback);

      stateManager.emit("test:event");

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("should call callbacks with provided data", () => {
      const callback = vi.fn();
      const data = { message: "test data" };

      stateManager.on("test:event", callback);
      stateManager.emit("test:event", data);

      expect(callback).toHaveBeenCalledWith(data);
    });

    it("should call all registered callbacks", () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const callback3 = vi.fn();

      stateManager.on("test:event", callback1);
      stateManager.on("test:event", callback2);
      stateManager.on("test:event", callback3);

      stateManager.emit("test:event");

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
      expect(callback3).toHaveBeenCalledTimes(1);
    });

    it("should return the number of callbacks called", () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      stateManager.on("test:event", callback1);
      stateManager.on("test:event", callback2);

      const count = stateManager.emit("test:event");

      expect(count).toBe(2);
    });

    it("should return 0 if no listeners are registered", () => {
      const count = stateManager.emit("nonexistent:event");
      expect(count).toBe(0);
    });

    it("should handle multiple emits", () => {
      const callback = vi.fn();
      stateManager.on("test:event", callback);

      stateManager.emit("test:event");
      stateManager.emit("test:event");
      stateManager.emit("test:event");

      expect(callback).toHaveBeenCalledTimes(3);
    });

    it("should not affect other events", () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      stateManager.on("event1", callback1);
      stateManager.on("event2", callback2);

      stateManager.emit("event1");

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).not.toHaveBeenCalled();
    });

    it("should handle errors in callbacks gracefully", () => {
      const errorCallback = vi.fn(() => {
        throw new Error("Callback error");
      });
      const normalCallback = vi.fn();

      stateManager.on("test:event", errorCallback);
      stateManager.on("test:event", normalCallback);

      // Mock console.error to prevent test output pollution
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const count = stateManager.emit("test:event");

      expect(errorCallback).toHaveBeenCalledTimes(1);
      expect(normalCallback).toHaveBeenCalledTimes(1);
      expect(consoleError).toHaveBeenCalled();
      expect(count).toBe(1); // Only successful callback counted

      consoleError.mockRestore();
    });

    it("should pass complex data objects", () => {
      const callback = vi.fn();
      const complexData = {
        scene: { w: 80, h: 25 },
        layer: { id: "bg", name: "Background" },
        cell: { x: 10, y: 5, ch: "A" },
      };

      stateManager.on("test:event", callback);
      stateManager.emit("test:event", complexData);

      expect(callback).toHaveBeenCalledWith(complexData);
    });
  });

  describe("clear", () => {
    it("should remove all listeners for a specific event", () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      stateManager.on("test:event", callback1);
      stateManager.on("test:event", callback2);

      stateManager.clear("test:event");

      expect(stateManager.listenerCount("test:event")).toBe(0);
    });

    it("should only clear specified event", () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      stateManager.on("event1", callback1);
      stateManager.on("event2", callback2);

      stateManager.clear("event1");

      expect(stateManager.listenerCount("event1")).toBe(0);
      expect(stateManager.listenerCount("event2")).toBe(1);
    });

    it("should clear all events when called without arguments", () => {
      stateManager.on("event1", vi.fn());
      stateManager.on("event2", vi.fn());
      stateManager.on("event3", vi.fn());

      stateManager.clear();

      expect(stateManager.listeners.size).toBe(0);
    });

    it("should not throw if clearing non-existent event", () => {
      expect(() => stateManager.clear("nonexistent:event")).not.toThrow();
    });
  });

  describe("listenerCount", () => {
    it("should return 0 for events with no listeners", () => {
      expect(stateManager.listenerCount("test:event")).toBe(0);
    });

    it("should return correct count for events with listeners", () => {
      stateManager.on("test:event", vi.fn());
      stateManager.on("test:event", vi.fn());
      stateManager.on("test:event", vi.fn());

      expect(stateManager.listenerCount("test:event")).toBe(3);
    });

    it("should update count after adding listeners", () => {
      expect(stateManager.listenerCount("test:event")).toBe(0);
      stateManager.on("test:event", vi.fn());
      expect(stateManager.listenerCount("test:event")).toBe(1);
      stateManager.on("test:event", vi.fn());
      expect(stateManager.listenerCount("test:event")).toBe(2);
    });

    it("should update count after removing listeners", () => {
      const callback = vi.fn();
      stateManager.on("test:event", callback);
      expect(stateManager.listenerCount("test:event")).toBe(1);
      stateManager.off("test:event", callback);
      expect(stateManager.listenerCount("test:event")).toBe(0);
    });
  });

  describe("hasListeners", () => {
    it("should return false for events with no listeners", () => {
      expect(stateManager.hasListeners("test:event")).toBe(false);
    });

    it("should return true for events with listeners", () => {
      stateManager.on("test:event", vi.fn());
      expect(stateManager.hasListeners("test:event")).toBe(true);
    });

    it("should return false after all listeners are removed", () => {
      const callback = vi.fn();
      stateManager.on("test:event", callback);
      stateManager.off("test:event", callback);
      expect(stateManager.hasListeners("test:event")).toBe(false);
    });
  });

  describe("eventNames", () => {
    it("should return empty array when no events registered", () => {
      expect(stateManager.eventNames()).toEqual([]);
    });

    it("should return array of event names", () => {
      stateManager.on("event1", vi.fn());
      stateManager.on("event2", vi.fn());
      stateManager.on("event3", vi.fn());

      const names = stateManager.eventNames();
      expect(names).toContain("event1");
      expect(names).toContain("event2");
      expect(names).toContain("event3");
      expect(names.length).toBe(3);
    });

    it("should not include events after they are cleared", () => {
      stateManager.on("event1", vi.fn());
      stateManager.on("event2", vi.fn());
      stateManager.clear("event1");

      const names = stateManager.eventNames();
      expect(names).not.toContain("event1");
      expect(names).toContain("event2");
    });
  });

  describe("integration tests", () => {
    it("should handle complete workflow", () => {
      const sceneCallback = vi.fn();
      const layerCallback = vi.fn();

      // Subscribe to events
      stateManager.on("scene:updated", sceneCallback);
      stateManager.on("layer:changed", layerCallback);

      // Emit events
      stateManager.emit("scene:updated", { w: 80, h: 25 });
      stateManager.emit("layer:changed", { layerId: "bg" });

      expect(sceneCallback).toHaveBeenCalledWith({ w: 80, h: 25 });
      expect(layerCallback).toHaveBeenCalledWith({ layerId: "bg" });
    });

    it("should handle unsubscribe function workflow", () => {
      const callback = vi.fn();
      const unsubscribe = stateManager.on("test:event", callback);

      stateManager.emit("test:event");
      expect(callback).toHaveBeenCalledTimes(1);

      unsubscribe();
      stateManager.emit("test:event");
      expect(callback).toHaveBeenCalledTimes(1); // Should not increase
    });

    it("should support multiple event types simultaneously", () => {
      const callbacks = {
        scene: vi.fn(),
        layer: vi.fn(),
        tool: vi.fn(),
        cell: vi.fn(),
      };

      stateManager.on("scene:updated", callbacks.scene);
      stateManager.on("layer:changed", callbacks.layer);
      stateManager.on("tool:changed", callbacks.tool);
      stateManager.on("cell:changed", callbacks.cell);

      stateManager.emit("scene:updated", { scene: "data" });
      stateManager.emit("layer:changed", { layer: "data" });
      stateManager.emit("tool:changed", { tool: "brush" });
      stateManager.emit("cell:changed", { x: 5, y: 10 });

      expect(callbacks.scene).toHaveBeenCalledWith({ scene: "data" });
      expect(callbacks.layer).toHaveBeenCalledWith({ layer: "data" });
      expect(callbacks.tool).toHaveBeenCalledWith({ tool: "brush" });
      expect(callbacks.cell).toHaveBeenCalledWith({ x: 5, y: 10 });
    });

    it("should handle rapid subscribe/unsubscribe cycles", () => {
      const callback = vi.fn();

      for (let i = 0; i < 10; i++) {
        stateManager.on("test:event", callback);
        stateManager.off("test:event", callback);
      }

      expect(stateManager.listenerCount("test:event")).toBe(0);
      stateManager.emit("test:event");
      expect(callback).not.toHaveBeenCalled();
    });

    it("should maintain independence between StateManager instances", () => {
      const stateManager2 = new StateManager();
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      stateManager.on("test:event", callback1);
      stateManager2.on("test:event", callback2);

      stateManager.emit("test:event");

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).not.toHaveBeenCalled();
    });
  });
});
