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

  describe("glyph animation", () => {
    it("should cycle through provided characters", () => {
      const cell = new Cell("★", 6, -1);
      cell.setGlyphAnimation(["★", "✦", "·"], 200);

      expect(CellAnimator.getFrame(cell, 0).ch).toBe("★");
      expect(CellAnimator.getFrame(cell, 200).ch).toBe("✦");
      expect(CellAnimator.getFrame(cell, 400).ch).toBe("·");
      expect(CellAnimator.getFrame(cell, 600).ch).toBe("★"); // loops
    });

    it("should preserve colors", () => {
      const cell = new Cell("A", 3, 2);
      cell.setGlyphAnimation(["A", "B", "C"], 100);

      const frame = CellAnimator.getFrame(cell, 100);

      expect(frame.ch).toBe("B");
      expect(frame.fg).toBe(3);
      expect(frame.bg).toBe(2);
      expect(frame.visible).toBe(true);
    });

    it("should use offset for wave effect", () => {
      const cell = new Cell("★", 6, -1);
      cell.anim = { glyph: { frames: ["A", "B"], speed: 100, offset: 100 } };

      // With 100ms offset, t=0 should show what t=100 would normally show
      expect(CellAnimator.getFrame(cell, 0).ch).toBe("B");
    });
  });

  describe("fg color animation", () => {
    it("should cycle through provided colors", () => {
      const cell = new Cell("█", 7, -1);
      cell.setFgAnimation([1, 2, 3], 100);

      expect(CellAnimator.getFrame(cell, 0).fg).toBe(1);
      expect(CellAnimator.getFrame(cell, 100).fg).toBe(2);
      expect(CellAnimator.getFrame(cell, 200).fg).toBe(3);
      expect(CellAnimator.getFrame(cell, 300).fg).toBe(1); // loops
    });

    it("should preserve character and background", () => {
      const cell = new Cell("★", 7, 2);
      cell.setFgAnimation([1, 2, 3], 100);

      const frame = CellAnimator.getFrame(cell, 0);

      expect(frame.ch).toBe("★");
      expect(frame.bg).toBe(2);
      expect(frame.visible).toBe(true);
    });
  });

  describe("bg color animation", () => {
    it("should cycle through provided colors", () => {
      const cell = new Cell("█", 7, 0);
      cell.setBgAnimation([0, 1, 2], 100);

      expect(CellAnimator.getFrame(cell, 0).bg).toBe(0);
      expect(CellAnimator.getFrame(cell, 100).bg).toBe(1);
      expect(CellAnimator.getFrame(cell, 200).bg).toBe(2);
      expect(CellAnimator.getFrame(cell, 300).bg).toBe(0); // loops
    });

    it("should support transparent color (-1)", () => {
      const cell = new Cell("★", 7, 0);
      cell.setBgAnimation([0, -1], 100);

      expect(CellAnimator.getFrame(cell, 0).bg).toBe(0);
      expect(CellAnimator.getFrame(cell, 100).bg).toBe(-1);
    });
  });

  describe("combined animations", () => {
    it("should animate glyph and fg independently", () => {
      const cell = new Cell("★", 6, -1);
      cell.setGlyphAnimation(["A", "B"], 100);
      cell.setFgAnimation([1, 2, 3], 150);

      // At t=0: glyph=A (0%100=0), fg=1 (0%150=0)
      let frame = CellAnimator.getFrame(cell, 0);
      expect(frame.ch).toBe("A");
      expect(frame.fg).toBe(1);

      // At t=100: glyph=B (100%100=0->1), fg=1 (100%150=0)
      frame = CellAnimator.getFrame(cell, 100);
      expect(frame.ch).toBe("B");
      expect(frame.fg).toBe(1);

      // At t=150: glyph=B (150%100=1), fg=2 (150%150=0->1)
      frame = CellAnimator.getFrame(cell, 150);
      expect(frame.ch).toBe("B");
      expect(frame.fg).toBe(2);
    });

    it("should animate all three independently", () => {
      const cell = new Cell("★", 6, 0);
      cell.setGlyphAnimation(["A", "B"], 100);
      cell.setFgAnimation([1, 2], 200);
      cell.setBgAnimation([0, 3], 300);

      const frame = CellAnimator.getFrame(cell, 0);
      expect(frame.ch).toBe("A");
      expect(frame.fg).toBe(1);
      expect(frame.bg).toBe(0);
    });
  });

  describe("getCycleIndex", () => {
    describe("forward mode", () => {
      it("should cycle forward through indices", () => {
        expect(CellAnimator.getCycleIndex(0, 100, 3, "forward")).toBe(0);
        expect(CellAnimator.getCycleIndex(100, 100, 3, "forward")).toBe(1);
        expect(CellAnimator.getCycleIndex(200, 100, 3, "forward")).toBe(2);
        expect(CellAnimator.getCycleIndex(300, 100, 3, "forward")).toBe(0);
      });
    });

    describe("reverse mode", () => {
      it("should cycle backward through indices", () => {
        expect(CellAnimator.getCycleIndex(0, 100, 3, "reverse")).toBe(2);
        expect(CellAnimator.getCycleIndex(100, 100, 3, "reverse")).toBe(1);
        expect(CellAnimator.getCycleIndex(200, 100, 3, "reverse")).toBe(0);
        expect(CellAnimator.getCycleIndex(300, 100, 3, "reverse")).toBe(2);
      });
    });

    describe("pingpong mode", () => {
      it("should bounce back and forth", () => {
        // With 3 items: 0,1,2,1,0,1,2,1,...
        expect(CellAnimator.getCycleIndex(0, 100, 3, "pingpong")).toBe(0);
        expect(CellAnimator.getCycleIndex(100, 100, 3, "pingpong")).toBe(1);
        expect(CellAnimator.getCycleIndex(200, 100, 3, "pingpong")).toBe(2);
        expect(CellAnimator.getCycleIndex(300, 100, 3, "pingpong")).toBe(1);
        expect(CellAnimator.getCycleIndex(400, 100, 3, "pingpong")).toBe(0);
      });
    });

    describe("random mode", () => {
      it("should return valid indices", () => {
        for (let t = 0; t < 1000; t += 100) {
          const idx = CellAnimator.getCycleIndex(t, 100, 5, "random");
          expect(idx).toBeGreaterThanOrEqual(0);
          expect(idx).toBeLessThan(5);
        }
      });

      it("should be deterministic for same time", () => {
        const idx1 = CellAnimator.getCycleIndex(500, 100, 5, "random");
        const idx2 = CellAnimator.getCycleIndex(500, 100, 5, "random");
        expect(idx1).toBe(idx2);
      });
    });

    it("should return 0 for single item", () => {
      expect(CellAnimator.getCycleIndex(0, 100, 1, "forward")).toBe(0);
      expect(CellAnimator.getCycleIndex(1000, 100, 1, "forward")).toBe(0);
    });
  });
});
