import { describe, it, expect, beforeEach, vi } from "bun:test";
import { AnimationEngine } from "../src/animation/AnimationEngine.js";
import { Scene } from "../src/core/Scene.js";
import { Cell } from "../src/core/Cell.js";
import { StateManager } from "../src/core/StateManager.js";

describe("AnimationEngine", () => {
  let scene;
  let stateManager;
  let updateCallback;
  let engine;

  beforeEach(() => {
    scene = new Scene(10, 10, "default");
    stateManager = new StateManager();
    updateCallback = vi.fn();
    engine = new AnimationEngine(scene, stateManager, updateCallback);

    // Mock requestAnimationFrame
    global.requestAnimationFrame = vi.fn((cb) => {
      return setTimeout(() => cb(performance.now()), 16);
    });
    global.cancelAnimationFrame = vi.fn((id) => clearTimeout(id));
  });

  describe("constructor", () => {
    it("should create an animation engine", () => {
      expect(engine.scene).toBe(scene);
      expect(engine.stateManager).toBe(stateManager);
      expect(engine.playing).toBe(false);
    });

    it("should initialize with empty animated cells cache", () => {
      expect(engine.animatedCells.size).toBe(0);
    });
  });

  describe("scanForAnimatedCells", () => {
    it("should find cells with animations", () => {
      const layer = scene.getLayer("mid");
      const animatedCell = new Cell("★", 6, -1);
      animatedCell.anim = { type: "blink", speed: 500 };
      layer.setCell(5, 5, animatedCell);

      engine.scanForAnimatedCells();

      expect(engine.animatedCells.has("mid")).toBe(true);
      expect(engine.animatedCells.get("mid").length).toBe(1);
    });

    it("should find multiple animated cells", () => {
      const layer = scene.getLayer("mid");

      const cell1 = new Cell("A", 7, -1);
      cell1.anim = { type: "blink", speed: 500 };
      layer.setCell(0, 0, cell1);

      const cell2 = new Cell("B", 7, -1);
      cell2.anim = { type: "colorCycle", speed: 100, colors: [1, 2, 3] };
      layer.setCell(1, 1, cell2);

      engine.scanForAnimatedCells();

      expect(engine.animatedCells.get("mid").length).toBe(2);
    });

    it("should not include cells without animations", () => {
      const layer = scene.getLayer("mid");
      layer.setCell(0, 0, new Cell("X", 7, -1)); // No animation

      engine.scanForAnimatedCells();

      expect(engine.animatedCells.has("mid")).toBe(false);
    });

    it("should scan all layers", () => {
      const bgLayer = scene.getLayer("bg");
      const fgLayer = scene.getLayer("fg");

      const bgCell = new Cell("1", 7, -1);
      bgCell.anim = { type: "blink", speed: 500 };
      bgLayer.setCell(0, 0, bgCell);

      const fgCell = new Cell("2", 7, -1);
      fgCell.anim = { type: "blink", speed: 500 };
      fgLayer.setCell(0, 0, fgCell);

      engine.scanForAnimatedCells();

      expect(engine.animatedCells.has("bg")).toBe(true);
      expect(engine.animatedCells.has("fg")).toBe(true);
    });
  });

  describe("start/stop", () => {
    it("should start animation loop", () => {
      const layer = scene.getLayer("mid");
      const cell = new Cell("★", 6, -1);
      cell.anim = { type: "blink", speed: 500 };
      layer.setCell(0, 0, cell);

      engine.start();

      expect(engine.playing).toBe(true);
      expect(engine.animationFrameId).not.toBeNull();
    });

    it("should emit animation:started event", () => {
      const spy = vi.fn();
      stateManager.on("animation:started", spy);

      engine.start();

      expect(spy).toHaveBeenCalled();
    });

    it("should stop animation loop", () => {
      engine.start();
      engine.stop();

      expect(engine.playing).toBe(false);
    });

    it("should emit animation:stopped event", () => {
      const spy = vi.fn();
      stateManager.on("animation:stopped", spy);

      engine.start();
      engine.stop();

      expect(spy).toHaveBeenCalled();
    });

    it("should not start twice", () => {
      engine.start();
      const firstId = engine.animationFrameId;

      engine.start();

      expect(engine.animationFrameId).toBe(firstId);
    });

    it("should not stop if not playing", () => {
      const spy = vi.fn();
      stateManager.on("animation:stopped", spy);

      engine.stop();

      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe("toggle", () => {
    it("should start when stopped", () => {
      const result = engine.toggle();

      expect(result).toBe(true);
      expect(engine.playing).toBe(true);
    });

    it("should stop when playing", () => {
      engine.start();

      const result = engine.toggle();

      expect(result).toBe(false);
      expect(engine.playing).toBe(false);
    });
  });

  describe("isPlaying", () => {
    it("should return false when stopped", () => {
      expect(engine.isPlaying()).toBe(false);
    });

    it("should return true when playing", () => {
      engine.start();

      expect(engine.isPlaying()).toBe(true);
    });
  });

  describe("getAnimatedCellCount", () => {
    it("should return 0 when no animated cells", () => {
      engine.scanForAnimatedCells();

      expect(engine.getAnimatedCellCount()).toBe(0);
    });

    it("should count animated cells across layers", () => {
      const bgLayer = scene.getLayer("bg");
      const midLayer = scene.getLayer("mid");

      const cell1 = new Cell("A", 7, -1);
      cell1.anim = { type: "blink", speed: 500 };
      bgLayer.setCell(0, 0, cell1);

      const cell2 = new Cell("B", 7, -1);
      cell2.anim = { type: "blink", speed: 500 };
      midLayer.setCell(0, 0, cell2);

      const cell3 = new Cell("C", 7, -1);
      cell3.anim = { type: "blink", speed: 500 };
      midLayer.setCell(1, 1, cell3);

      engine.scanForAnimatedCells();

      expect(engine.getAnimatedCellCount()).toBe(3);
    });
  });

  describe("refresh", () => {
    it("should rescan for animated cells", () => {
      engine.scanForAnimatedCells();
      expect(engine.getAnimatedCellCount()).toBe(0);

      // Add animated cell
      const layer = scene.getLayer("mid");
      const cell = new Cell("★", 6, -1);
      cell.anim = { type: "blink", speed: 500 };
      layer.setCell(0, 0, cell);

      engine.refresh();

      expect(engine.getAnimatedCellCount()).toBe(1);
    });
  });

  describe("dispose", () => {
    it("should stop and clear all state", () => {
      const layer = scene.getLayer("mid");
      const cell = new Cell("★", 6, -1);
      cell.anim = { type: "blink", speed: 500 };
      layer.setCell(0, 0, cell);

      engine.start();
      engine.dispose();

      expect(engine.playing).toBe(false);
      expect(engine.animatedCells.size).toBe(0);
      expect(engine.lastRenderedState.size).toBe(0);
    });
  });

  describe("updateAnimatedCells", () => {
    it("should call update callback for changed cells", () => {
      const layer = scene.getLayer("mid");
      const cell = new Cell("★", 6, -1);
      cell.anim = { type: "blink", speed: 500 };
      layer.setCell(5, 5, cell);

      engine.scanForAnimatedCells();
      engine.updateAnimatedCells(0);

      expect(updateCallback).toHaveBeenCalled();
    });

    it("should not update cells that haven't changed", () => {
      const layer = scene.getLayer("mid");
      const cell = new Cell("★", 6, -1);
      cell.anim = { type: "blink", speed: 1000 };
      layer.setCell(5, 5, cell);

      engine.scanForAnimatedCells();

      // First update
      engine.updateAnimatedCells(0);
      expect(updateCallback).toHaveBeenCalledTimes(1);

      // Second update at same phase - should not call again
      engine.updateAnimatedCells(100);
      expect(updateCallback).toHaveBeenCalledTimes(1);
    });

    it("should update when animation phase changes", () => {
      const layer = scene.getLayer("mid");
      const cell = new Cell("★", 6, -1);
      cell.anim = { type: "blink", speed: 500 };
      layer.setCell(5, 5, cell);

      engine.scanForAnimatedCells();

      // First update - visible
      engine.updateAnimatedCells(0);
      expect(updateCallback).toHaveBeenCalledTimes(1);

      // Second update - hidden (phase changed)
      engine.updateAnimatedCells(500);
      expect(updateCallback).toHaveBeenCalledTimes(2);
    });

    it("should skip hidden layers", () => {
      const layer = scene.getLayer("mid");
      layer.visible = false;

      const cell = new Cell("★", 6, -1);
      cell.anim = { type: "blink", speed: 500 };
      layer.setCell(5, 5, cell);

      engine.scanForAnimatedCells();
      engine.updateAnimatedCells(0);

      expect(updateCallback).not.toHaveBeenCalled();
    });

    it("should emit animation:frame event", () => {
      const spy = vi.fn();
      stateManager.on("animation:frame", spy);

      const layer = scene.getLayer("mid");
      const cell = new Cell("★", 6, -1);
      cell.anim = { type: "blink", speed: 500 };
      layer.setCell(5, 5, cell);

      engine.scanForAnimatedCells();
      engine.updateAnimatedCells(0);

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          layerId: "mid",
          x: 5,
          y: 5,
        })
      );
    });
  });

  describe("restoreOriginalCells", () => {
    it("should restore cells to original state", () => {
      const layer = scene.getLayer("mid");
      const cell = new Cell("★", 6, -1);
      cell.anim = { type: "blink", speed: 500 };
      layer.setCell(5, 5, cell);

      engine.scanForAnimatedCells();
      engine.updateAnimatedCells(500); // Make it blink off
      updateCallback.mockClear();

      engine.restoreOriginalCells();

      expect(updateCallback).toHaveBeenCalledWith(
        layer,
        5,
        5,
        expect.objectContaining({
          ch: "★",
          fg: 6,
          bg: -1,
        })
      );
    });
  });
});
