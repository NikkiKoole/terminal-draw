import { describe, it, expect } from "bun:test";
import { CellAnimator } from "../src/animation/CellAnimator.js";
import { Cell } from "../src/core/Cell.js";

describe("CellAnimator", () => {
  describe("getFrame", () => {
    it("should return original cell state when no animation", () => {
      const cell = new Cell("★", 6, 2);

      const frame = CellAnimator.getFrame(cell, 0);

      expect(frame.ch).toBe("★");
      expect(frame.fg).toBe(6);
      expect(frame.bg).toBe(2);
      expect(frame.visible).toBe(true);
    });

    it("should handle null animation", () => {
      const cell = new Cell("X", 7, -1);
      cell.anim = null;

      const frame = CellAnimator.getFrame(cell, 1000);

      expect(frame.ch).toBe("X");
      expect(frame.fg).toBe(7);
      expect(frame.bg).toBe(-1);
    });
  });

  describe("getBlinkFrame", () => {
    it("should show cell on first half of cycle", () => {
      const cell = new Cell("★", 6, -1);
      cell.anim = { type: "blink", speed: 1000 };

      // At t=0, should be visible (first half of 1000ms cycle)
      const frame = CellAnimator.getBlinkFrame(cell, 0);

      expect(frame.ch).toBe("★");
      expect(frame.visible).toBe(true);
    });

    it("should hide cell on second half of cycle", () => {
      const cell = new Cell("★", 6, -1);
      cell.anim = { type: "blink", speed: 1000 };

      // At t=1000, should be hidden (second half of cycle)
      const frame = CellAnimator.getBlinkFrame(cell, 1000);

      expect(frame.ch).toBe(" ");
      expect(frame.visible).toBe(false);
    });

    it("should cycle correctly over time", () => {
      const cell = new Cell("●", 7, -1);
      cell.anim = { type: "blink", speed: 500 };

      // t=0: visible
      expect(CellAnimator.getBlinkFrame(cell, 0).visible).toBe(true);
      // t=500: hidden
      expect(CellAnimator.getBlinkFrame(cell, 500).visible).toBe(false);
      // t=1000: visible again
      expect(CellAnimator.getBlinkFrame(cell, 1000).visible).toBe(true);
      // t=1500: hidden again
      expect(CellAnimator.getBlinkFrame(cell, 1500).visible).toBe(false);
    });

    it("should preserve colors when visible", () => {
      const cell = new Cell("X", 3, 2);
      cell.anim = { type: "blink", speed: 1000 };

      const frame = CellAnimator.getBlinkFrame(cell, 0);

      expect(frame.fg).toBe(3);
      expect(frame.bg).toBe(2);
    });
  });

  describe("getFlickerFrame", () => {
    it("should mostly show the cell (80% on)", () => {
      const cell = new Cell("💡", 6, -1);
      cell.anim = { type: "flicker", speed: 100 };

      // Test multiple timestamps to verify mostly visible
      let visibleCount = 0;
      for (let t = 0; t < 10000; t += 100) {
        const frame = CellAnimator.getFlickerFrame(cell, t);
        if (frame.visible) visibleCount++;
      }

      // Should be visible roughly 80% of the time
      expect(visibleCount).toBeGreaterThan(70);
      expect(visibleCount).toBeLessThan(90);
    });

    it("should preserve colors", () => {
      const cell = new Cell("*", 5, 1);
      cell.anim = { type: "flicker", speed: 100 };

      const frame = CellAnimator.getFlickerFrame(cell, 0);

      expect(frame.fg).toBe(5);
      expect(frame.bg).toBe(1);
    });
  });

  describe("getColorCycleFrame", () => {
    it("should cycle through provided colors", () => {
      const cell = new Cell("█", 7, -1);
      cell.anim = { type: "colorCycle", speed: 100, colors: [1, 2, 3] };

      expect(CellAnimator.getColorCycleFrame(cell, 0).fg).toBe(1);
      expect(CellAnimator.getColorCycleFrame(cell, 100).fg).toBe(2);
      expect(CellAnimator.getColorCycleFrame(cell, 200).fg).toBe(3);
      expect(CellAnimator.getColorCycleFrame(cell, 300).fg).toBe(1); // loops
    });

    it("should use all 8 colors if none specified", () => {
      const cell = new Cell("█", 7, -1);
      cell.anim = { type: "colorCycle", speed: 100 };

      const colors = [];
      for (let t = 0; t < 800; t += 100) {
        colors.push(CellAnimator.getColorCycleFrame(cell, t).fg);
      }

      expect(colors).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    });

    it("should preserve character and background", () => {
      const cell = new Cell("★", 7, 2);
      cell.anim = { type: "colorCycle", speed: 100, colors: [1, 2, 3] };

      const frame = CellAnimator.getColorCycleFrame(cell, 0);

      expect(frame.ch).toBe("★");
      expect(frame.bg).toBe(2);
      expect(frame.visible).toBe(true);
    });
  });

  describe("getCharCycleFrame", () => {
    it("should cycle through provided characters", () => {
      const cell = new Cell("★", 6, -1);
      cell.anim = { type: "charCycle", speed: 200, frames: ["★", "✦", "·"] };

      expect(CellAnimator.getCharCycleFrame(cell, 0).ch).toBe("★");
      expect(CellAnimator.getCharCycleFrame(cell, 200).ch).toBe("✦");
      expect(CellAnimator.getCharCycleFrame(cell, 400).ch).toBe("·");
      expect(CellAnimator.getCharCycleFrame(cell, 600).ch).toBe("★"); // loops
    });

    it("should use original char if no frames specified", () => {
      const cell = new Cell("X", 7, -1);
      cell.anim = { type: "charCycle", speed: 100 };

      const frame = CellAnimator.getCharCycleFrame(cell, 0);

      expect(frame.ch).toBe("X");
    });

    it("should preserve colors", () => {
      const cell = new Cell("A", 3, 2);
      cell.anim = { type: "charCycle", speed: 100, frames: ["A", "B", "C"] };

      const frame = CellAnimator.getCharCycleFrame(cell, 100);

      expect(frame.ch).toBe("B");
      expect(frame.fg).toBe(3);
      expect(frame.bg).toBe(2);
      expect(frame.visible).toBe(true);
    });
  });

  describe("getFrame dispatching", () => {
    it("should dispatch to blink handler", () => {
      const cell = new Cell("X", 7, -1);
      cell.anim = { type: "blink", speed: 500 };

      const frame = CellAnimator.getFrame(cell, 500);

      expect(frame.visible).toBe(false);
    });

    it("should dispatch to flicker handler", () => {
      const cell = new Cell("X", 7, -1);
      cell.anim = { type: "flicker", speed: 100 };

      const frame = CellAnimator.getFrame(cell, 0);

      expect(frame).toHaveProperty("visible");
    });

    it("should dispatch to colorCycle handler", () => {
      const cell = new Cell("X", 7, -1);
      cell.anim = { type: "colorCycle", speed: 100, colors: [1, 2, 3] };

      const frame = CellAnimator.getFrame(cell, 100);

      expect(frame.fg).toBe(2);
    });

    it("should dispatch to charCycle handler", () => {
      const cell = new Cell("A", 7, -1);
      cell.anim = { type: "charCycle", speed: 100, frames: ["A", "B", "C"] };

      const frame = CellAnimator.getFrame(cell, 100);

      expect(frame.ch).toBe("B");
    });

    it("should return original for unknown animation type", () => {
      const cell = new Cell("X", 7, -1);
      cell.anim = { type: "unknown", speed: 100 };

      const frame = CellAnimator.getFrame(cell, 0);

      expect(frame.ch).toBe("X");
      expect(frame.fg).toBe(7);
      expect(frame.visible).toBe(true);
    });
  });
});
