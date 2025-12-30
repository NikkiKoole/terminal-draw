import { describe, it, expect, beforeEach, vi } from "vitest";
import { JSDOM } from "jsdom";
import { HitTestOverlay } from "../src/input/HitTestOverlay.js";
import { Scene } from "../src/core/Scene.js";
import { StateManager } from "../src/core/StateManager.js";

describe("HitTestOverlay", () => {
  let dom;
  let document;
  let element;
  let scene;
  let stateManager;
  let overlay;

  beforeEach(() => {
    // Create JSDOM instance
    dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
    document = dom.window.document;
    global.document = document;
    global.MouseEvent = dom.window.MouseEvent;
    global.getComputedStyle = dom.window.getComputedStyle;

    // Create hit test element
    element = document.createElement("div");
    element.id = "hit-test-layer";
    element.style.width = "1280px"; // 80 cells * 16px
    element.style.height = "400px"; // 25 cells * 16px
    document.body.appendChild(element);

    // Mock getBoundingClientRect
    element.getBoundingClientRect = vi.fn(() => ({
      left: 100,
      top: 50,
      width: 1280,
      height: 400,
      right: 1380,
      bottom: 450,
    }));

    // Create scene and state manager
    scene = new Scene(80, 25);
    stateManager = new StateManager();
  });

  describe("constructor", () => {
    it("should create a new HitTestOverlay instance", () => {
      overlay = new HitTestOverlay(element, scene, stateManager);

      expect(overlay).toBeInstanceOf(HitTestOverlay);
      expect(overlay.element).toBe(element);
      expect(overlay.scene).toBe(scene);
      expect(overlay.stateManager).toBe(stateManager);
      expect(overlay.scale).toBe(100);
    });

    it("should accept custom scale", () => {
      overlay = new HitTestOverlay(element, scene, stateManager, 150);
      expect(overlay.scale).toBe(150);
    });

    it("should initialize mouse state", () => {
      overlay = new HitTestOverlay(element, scene, stateManager);

      expect(overlay.isDown).toBe(false);
      expect(overlay.lastX).toBe(null);
      expect(overlay.lastY).toBe(null);
      expect(overlay.hoverX).toBe(null);
      expect(overlay.hoverY).toBe(null);
    });

    it("should attach event listeners", () => {
      const addEventListenerSpy = vi.spyOn(element, "addEventListener");
      overlay = new HitTestOverlay(element, scene, stateManager);

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        "mousedown",
        expect.any(Function)
      );
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        "mousemove",
        expect.any(Function)
      );
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        "mouseup",
        expect.any(Function)
      );
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        "mouseleave",
        expect.any(Function)
      );
    });
  });

  describe("getCellCoords", () => {
    beforeEach(() => {
      overlay = new HitTestOverlay(element, scene, stateManager, 100);
    });

    it("should convert mouse coordinates to cell coordinates at scale 100%", () => {
      const event = {
        clientX: 100, // left edge
        clientY: 50, // top edge
      };

      const coords = overlay.getCellCoords(event);

      expect(coords).toEqual({ x: 0, y: 0 });
    });

    it("should calculate cell coordinates in the middle of grid", () => {
      const event = {
        clientX: 100 + 16 * 10, // 10 cells from left (160px)
        clientY: 50 + 16 * 5, // 5 cells from top (80px)
      };

      const coords = overlay.getCellCoords(event);

      expect(coords).toEqual({ x: 10, y: 5 });
    });

    it("should calculate bottom-right cell", () => {
      const event = {
        clientX: 100 + 16 * 79, // Cell 79 (last column)
        clientY: 50 + 16 * 24, // Cell 24 (last row)
      };

      const coords = overlay.getCellCoords(event);

      expect(coords).toEqual({ x: 79, y: 24 });
    });

    it("should return null for out of bounds (negative)", () => {
      const event = {
        clientX: 50, // Before grid starts
        clientY: 25,
      };

      const coords = overlay.getCellCoords(event);

      expect(coords).toBe(null);
    });

    it("should return null for out of bounds (beyond grid)", () => {
      const event = {
        clientX: 100 + 16 * 80, // Beyond last column
        clientY: 50 + 16 * 25, // Beyond last row
      };

      const coords = overlay.getCellCoords(event);

      expect(coords).toBe(null);
    });

    it("should account for scale at 200%", () => {
      overlay.updateScale(200);

      // At 200% scale, the visual size is doubled
      // But we need to unscale to get actual cell coords
      const event = {
        clientX: 100 + 16 * 2 * 10, // Visual position at 200% for cell 10
        clientY: 50 + 16 * 2 * 5, // Visual position at 200% for cell 5
      };

      const coords = overlay.getCellCoords(event);

      expect(coords).toEqual({ x: 10, y: 5 });
    });

    it("should account for scale at 50%", () => {
      overlay.updateScale(50);

      // At 50% scale, the visual size is halved
      const event = {
        clientX: 100 + 16 * 0.5 * 10, // Visual position at 50% for cell 10
        clientY: 50 + 16 * 0.5 * 5, // Visual position at 50% for cell 5
      };

      const coords = overlay.getCellCoords(event);

      expect(coords).toEqual({ x: 10, y: 5 });
    });

    it("should return null if element is null", () => {
      overlay.element = null;
      const event = { clientX: 200, clientY: 100 };

      const coords = overlay.getCellCoords(event);

      expect(coords).toBe(null);
    });

    it("should return null if scene is null", () => {
      overlay.scene = null;
      const event = { clientX: 200, clientY: 100 };

      const coords = overlay.getCellCoords(event);

      expect(coords).toBe(null);
    });

    it("should floor coordinates (not round)", () => {
      const event = {
        clientX: 100 + 16 * 5 + 15, // 5.9375 cells from left
        clientY: 50 + 16 * 3 + 10, // 3.625 cells from top
      };

      const coords = overlay.getCellCoords(event);

      // Should floor, not round
      expect(coords).toEqual({ x: 5, y: 3 });
    });
  });

  describe("getCellSize", () => {
    beforeEach(() => {
      overlay = new HitTestOverlay(element, scene, stateManager);
    });

    it("should return default cell size", () => {
      const cellSize = overlay.getCellSize();
      expect(cellSize).toBe(16);
    });

    it("should read from CSS custom property if available", () => {
      // Mock getComputedStyle to return custom cell size
      const originalGetComputedStyle = global.getComputedStyle;
      global.getComputedStyle = vi.fn(() => ({
        getPropertyValue: (prop) => {
          if (prop === "--cell-size") return "20px";
          return "";
        },
      }));

      const cellSize = overlay.getCellSize();
      expect(cellSize).toBe(20);

      global.getComputedStyle = originalGetComputedStyle;
    });
  });

  describe("updateScale", () => {
    beforeEach(() => {
      overlay = new HitTestOverlay(element, scene, stateManager, 100);
    });

    it("should update scale factor", () => {
      expect(overlay.scale).toBe(100);

      overlay.updateScale(150);
      expect(overlay.scale).toBe(150);

      overlay.updateScale(50);
      expect(overlay.scale).toBe(50);
    });
  });

  describe("setCursor", () => {
    beforeEach(() => {
      overlay = new HitTestOverlay(element, scene, stateManager);
    });

    it("should set cursor style", () => {
      overlay.setCursor("pointer");
      expect(element.style.cursor).toBe("pointer");

      overlay.setCursor("crosshair");
      expect(element.style.cursor).toBe("crosshair");
    });

    it("should handle null element gracefully", () => {
      overlay.element = null;
      expect(() => overlay.setCursor("pointer")).not.toThrow();
    });
  });

  describe("handleMouseDown", () => {
    let callback;

    beforeEach(() => {
      overlay = new HitTestOverlay(element, scene, stateManager);
      callback = vi.fn();
      stateManager.on("cell:down", callback);
    });

    it("should emit cell:down event with coordinates", () => {
      const event = new dom.window.MouseEvent("mousedown", {
        clientX: 100 + 16 * 5,
        clientY: 50 + 16 * 10,
        button: 0,
      });

      overlay.handleMouseDown(event);

      expect(callback).toHaveBeenCalledWith({
        x: 5,
        y: 10,
        button: 0,
        shiftKey: false,
        ctrlKey: false,
        altKey: false,
      });
    });

    it("should set isDown to true", () => {
      const event = new dom.window.MouseEvent("mousedown", {
        clientX: 100 + 16 * 5,
        clientY: 50 + 16 * 10,
      });

      overlay.handleMouseDown(event);

      expect(overlay.isDown).toBe(true);
    });

    it("should track last coordinates", () => {
      const event = new dom.window.MouseEvent("mousedown", {
        clientX: 100 + 16 * 5,
        clientY: 50 + 16 * 10,
      });

      overlay.handleMouseDown(event);

      expect(overlay.lastX).toBe(5);
      expect(overlay.lastY).toBe(10);
    });

    it("should include modifier keys", () => {
      const event = new dom.window.MouseEvent("mousedown", {
        clientX: 100 + 16 * 5,
        clientY: 50 + 16 * 10,
        shiftKey: true,
        ctrlKey: true,
      });

      overlay.handleMouseDown(event);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          shiftKey: true,
          ctrlKey: true,
        })
      );
    });

    it("should not emit if out of bounds", () => {
      const event = new dom.window.MouseEvent("mousedown", {
        clientX: 50, // Out of bounds
        clientY: 25,
      });

      overlay.handleMouseDown(event);

      expect(callback).not.toHaveBeenCalled();
      expect(overlay.isDown).toBe(false);
    });
  });

  describe("handleMouseMove", () => {
    let hoverCallback;
    let dragCallback;

    beforeEach(() => {
      overlay = new HitTestOverlay(element, scene, stateManager);
      hoverCallback = vi.fn();
      dragCallback = vi.fn();
      stateManager.on("cell:hover", hoverCallback);
      stateManager.on("cell:drag", dragCallback);
    });

    it("should emit cell:hover event", () => {
      const event = new dom.window.MouseEvent("mousemove", {
        clientX: 100 + 16 * 5,
        clientY: 50 + 16 * 10,
      });

      overlay.handleMouseMove(event);

      expect(hoverCallback).toHaveBeenCalledWith({
        x: 5,
        y: 10,
      });
    });

    it("should not emit duplicate hover events for same cell", () => {
      const event1 = new dom.window.MouseEvent("mousemove", {
        clientX: 100 + 16 * 5 + 5,
        clientY: 50 + 16 * 10 + 5,
      });
      const event2 = new dom.window.MouseEvent("mousemove", {
        clientX: 100 + 16 * 5 + 10,
        clientY: 50 + 16 * 10 + 10,
      });

      overlay.handleMouseMove(event1);
      overlay.handleMouseMove(event2);

      // Should only be called once since both events are in the same cell
      expect(hoverCallback).toHaveBeenCalledTimes(1);
    });

    it("should emit hover event when cell changes", () => {
      const event1 = new dom.window.MouseEvent("mousemove", {
        clientX: 100 + 16 * 5,
        clientY: 50 + 16 * 10,
      });
      const event2 = new dom.window.MouseEvent("mousemove", {
        clientX: 100 + 16 * 6,
        clientY: 50 + 16 * 10,
      });

      overlay.handleMouseMove(event1);
      overlay.handleMouseMove(event2);

      expect(hoverCallback).toHaveBeenCalledTimes(2);
      expect(hoverCallback).toHaveBeenNthCalledWith(1, { x: 5, y: 10 });
      expect(hoverCallback).toHaveBeenNthCalledWith(2, { x: 6, y: 10 });
    });

    it("should emit cell:drag when mouse is down", () => {
      // Mouse down first
      const downEvent = new dom.window.MouseEvent("mousedown", {
        clientX: 100 + 16 * 5,
        clientY: 50 + 16 * 10,
      });
      overlay.handleMouseDown(downEvent);

      // Then move
      const moveEvent = new dom.window.MouseEvent("mousemove", {
        clientX: 100 + 16 * 6,
        clientY: 50 + 16 * 11,
      });
      overlay.handleMouseMove(moveEvent);

      expect(dragCallback).toHaveBeenCalledWith({
        x: 6,
        y: 11,
        button: 0,
        shiftKey: false,
        ctrlKey: false,
        altKey: false,
      });
    });

    it("should not emit duplicate drag events for same cell", () => {
      // Mouse down
      overlay.isDown = true;
      overlay.lastX = 5;
      overlay.lastY = 10;

      // Move within same cell
      const event1 = new dom.window.MouseEvent("mousemove", {
        clientX: 100 + 16 * 5 + 5,
        clientY: 50 + 16 * 10 + 5,
      });
      const event2 = new dom.window.MouseEvent("mousemove", {
        clientX: 100 + 16 * 5 + 10,
        clientY: 50 + 16 * 10 + 10,
      });

      overlay.handleMouseMove(event1);
      overlay.handleMouseMove(event2);

      // Should not emit drag since cell hasn't changed
      expect(dragCallback).not.toHaveBeenCalled();
    });

    it("should emit hover event with null when out of bounds", () => {
      // First, hover over a valid cell
      const event1 = new dom.window.MouseEvent("mousemove", {
        clientX: 100 + 16 * 5,
        clientY: 50 + 16 * 10,
      });
      overlay.handleMouseMove(event1);

      // Then move out of bounds
      const event2 = new dom.window.MouseEvent("mousemove", {
        clientX: 50,
        clientY: 25,
      });
      overlay.handleMouseMove(event2);

      expect(hoverCallback).toHaveBeenCalledTimes(2);
      expect(hoverCallback).toHaveBeenNthCalledWith(2, { x: null, y: null });
    });
  });

  describe("handleMouseUp", () => {
    let callback;

    beforeEach(() => {
      overlay = new HitTestOverlay(element, scene, stateManager);
      callback = vi.fn();
      stateManager.on("cell:up", callback);
    });

    it("should emit cell:up event", () => {
      // Set mouse down first
      overlay.isDown = true;

      const event = new dom.window.MouseEvent("mouseup", {
        clientX: 100 + 16 * 7,
        clientY: 50 + 16 * 8,
      });

      overlay.handleMouseUp(event);

      expect(callback).toHaveBeenCalledWith({
        x: 7,
        y: 8,
        button: 0,
        shiftKey: false,
        ctrlKey: false,
        altKey: false,
      });
    });

    it("should set isDown to false", () => {
      overlay.isDown = true;

      const event = new dom.window.MouseEvent("mouseup", {
        clientX: 100 + 16 * 7,
        clientY: 50 + 16 * 8,
      });

      overlay.handleMouseUp(event);

      expect(overlay.isDown).toBe(false);
    });

    it("should clear last coordinates", () => {
      overlay.isDown = true;
      overlay.lastX = 5;
      overlay.lastY = 10;

      const event = new dom.window.MouseEvent("mouseup", {
        clientX: 100 + 16 * 7,
        clientY: 50 + 16 * 8,
      });

      overlay.handleMouseUp(event);

      expect(overlay.lastX).toBe(null);
      expect(overlay.lastY).toBe(null);
    });

    it("should not emit if mouse was not down", () => {
      const event = new dom.window.MouseEvent("mouseup", {
        clientX: 100 + 16 * 7,
        clientY: 50 + 16 * 8,
      });

      overlay.handleMouseUp(event);

      expect(callback).not.toHaveBeenCalled();
    });

    it("should emit with null coords if out of bounds", () => {
      overlay.isDown = true;

      const event = new dom.window.MouseEvent("mouseup", {
        clientX: 50,
        clientY: 25,
      });

      overlay.handleMouseUp(event);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          x: null,
          y: null,
        })
      );
    });
  });

  describe("handleMouseLeave", () => {
    let hoverCallback;
    let leaveCallback;

    beforeEach(() => {
      overlay = new HitTestOverlay(element, scene, stateManager);
      hoverCallback = vi.fn();
      leaveCallback = vi.fn();
      stateManager.on("cell:hover", hoverCallback);
      stateManager.on("cell:leave", leaveCallback);
    });

    it("should clear hover state", () => {
      // Set hover state
      overlay.hoverX = 5;
      overlay.hoverY = 10;

      const event = new dom.window.MouseEvent("mouseleave");
      overlay.handleMouseLeave(event);

      expect(overlay.hoverX).toBe(null);
      expect(overlay.hoverY).toBe(null);
    });

    it("should emit hover event with null", () => {
      overlay.hoverX = 5;
      overlay.hoverY = 10;

      const event = new dom.window.MouseEvent("mouseleave");
      overlay.handleMouseLeave(event);

      expect(hoverCallback).toHaveBeenCalledWith({ x: null, y: null });
    });

    it("should emit leave event if mouse was down", () => {
      overlay.isDown = true;

      const event = new dom.window.MouseEvent("mouseleave");
      overlay.handleMouseLeave(event);

      expect(leaveCallback).toHaveBeenCalledWith({ wasDown: true });
    });

    it("should clear mouse down state", () => {
      overlay.isDown = true;
      overlay.lastX = 5;
      overlay.lastY = 10;

      const event = new dom.window.MouseEvent("mouseleave");
      overlay.handleMouseLeave(event);

      expect(overlay.isDown).toBe(false);
      expect(overlay.lastX).toBe(null);
      expect(overlay.lastY).toBe(null);
    });

    it("should not emit leave event if mouse was not down", () => {
      overlay.hoverX = 5;
      overlay.hoverY = 10;

      const event = new dom.window.MouseEvent("mouseleave");
      overlay.handleMouseLeave(event);

      expect(leaveCallback).not.toHaveBeenCalled();
    });
  });

  describe("detachEventListeners", () => {
    beforeEach(() => {
      overlay = new HitTestOverlay(element, scene, stateManager);
    });

    it("should remove all event listeners", () => {
      const removeEventListenerSpy = vi.spyOn(element, "removeEventListener");

      overlay.detachEventListeners();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        "mousedown",
        expect.any(Function)
      );
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        "mousemove",
        expect.any(Function)
      );
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        "mouseup",
        expect.any(Function)
      );
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        "mouseleave",
        expect.any(Function)
      );
    });
  });

  describe("destroy", () => {
    beforeEach(() => {
      overlay = new HitTestOverlay(element, scene, stateManager);
    });

    it("should clean up resources", () => {
      const detachSpy = vi.spyOn(overlay, "detachEventListeners");

      overlay.destroy();

      expect(detachSpy).toHaveBeenCalled();
      expect(overlay.element).toBe(null);
      expect(overlay.scene).toBe(null);
      expect(overlay.stateManager).toBe(null);
    });
  });

  describe("integration tests", () => {
    beforeEach(() => {
      overlay = new HitTestOverlay(element, scene, stateManager);
    });

    it("should handle complete click workflow", () => {
      const downCallback = vi.fn();
      const upCallback = vi.fn();

      stateManager.on("cell:down", downCallback);
      stateManager.on("cell:up", upCallback);

      // Mouse down
      const downEvent = new dom.window.MouseEvent("mousedown", {
        clientX: 100 + 16 * 10,
        clientY: 50 + 16 * 15,
      });
      overlay.handleMouseDown(downEvent);

      // Mouse up
      const upEvent = new dom.window.MouseEvent("mouseup", {
        clientX: 100 + 16 * 10,
        clientY: 50 + 16 * 15,
      });
      overlay.handleMouseUp(upEvent);

      expect(downCallback).toHaveBeenCalledWith(
        expect.objectContaining({ x: 10, y: 15 })
      );
      expect(upCallback).toHaveBeenCalledWith(
        expect.objectContaining({ x: 10, y: 15 })
      );
    });

    it("should handle drag workflow", () => {
      const downCallback = vi.fn();
      const dragCallback = vi.fn();
      const upCallback = vi.fn();

      stateManager.on("cell:down", downCallback);
      stateManager.on("cell:drag", dragCallback);
      stateManager.on("cell:up", upCallback);

      // Mouse down
      const downEvent = new dom.window.MouseEvent("mousedown", {
        clientX: 100 + 16 * 5,
        clientY: 50 + 16 * 5,
      });
      overlay.handleMouseDown(downEvent);

      // Drag to different cells
      for (let i = 6; i <= 10; i++) {
        const moveEvent = new dom.window.MouseEvent("mousemove", {
          clientX: 100 + 16 * i,
          clientY: 50 + 16 * 5,
        });
        overlay.handleMouseMove(moveEvent);
      }

      // Mouse up
      const upEvent = new dom.window.MouseEvent("mouseup", {
        clientX: 100 + 16 * 10,
        clientY: 50 + 16 * 5,
      });
      overlay.handleMouseUp(upEvent);

      expect(downCallback).toHaveBeenCalledTimes(1);
      expect(dragCallback).toHaveBeenCalledTimes(5); // Cells 6-10
      expect(upCallback).toHaveBeenCalledTimes(1);
    });

    it("should handle scale changes during interaction", () => {
      const hoverCallback = vi.fn();
      stateManager.on("cell:hover", hoverCallback);

      // Hover at 100% scale
      overlay.updateScale(100);
      const event1 = new dom.window.MouseEvent("mousemove", {
        clientX: 100 + 16 * 10,
        clientY: 50 + 16 * 5,
      });
      overlay.handleMouseMove(event1);

      expect(hoverCallback).toHaveBeenCalledWith({ x: 10, y: 5 });

      // Change scale and hover at different visual position
      overlay.updateScale(200);
      const event2 = new dom.window.MouseEvent("mousemove", {
        clientX: 100 + 16 * 2 * 20,
        clientY: 50 + 16 * 2 * 10,
      });
      overlay.handleMouseMove(event2);

      expect(hoverCallback).toHaveBeenCalledWith({ x: 20, y: 10 });
    });
  });
});
