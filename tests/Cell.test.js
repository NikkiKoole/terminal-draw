import { describe, it, expect } from "bun:test";
import { Cell } from "../src/core/Cell.js";

describe("Cell", () => {
  describe("constructor", () => {
    it("should create a default cell with space, white fg, transparent bg", () => {
      const cell = new Cell();
      expect(cell.ch).toBe(" ");
      expect(cell.fg).toBe(7);
      expect(cell.bg).toBe(-1);
    });

    it("should create a cell with custom values", () => {
      const cell = new Cell("█", 1, 0);
      expect(cell.ch).toBe("█");
      expect(cell.fg).toBe(1);
      expect(cell.bg).toBe(0);
    });

    it("should handle box-drawing characters", () => {
      const cell = new Cell("┌", 6, -1);
      expect(cell.ch).toBe("┌");
      expect(cell.fg).toBe(6);
      expect(cell.bg).toBe(-1);
    });

    it("should handle all color indices", () => {
      for (let i = 0; i <= 7; i++) {
        const cell = new Cell("X", i, i);
        expect(cell.fg).toBe(i);
        expect(cell.bg).toBe(i);
      }
    });
  });

  describe("clone", () => {
    it("should create a deep copy of the cell", () => {
      const original = new Cell("A", 3, 1);
      const clone = original.clone();

      expect(clone.ch).toBe(original.ch);
      expect(clone.fg).toBe(original.fg);
      expect(clone.bg).toBe(original.bg);
      expect(clone).not.toBe(original);
    });

    it("should not affect original when clone is modified", () => {
      const original = new Cell("A", 3, 1);
      const clone = original.clone();

      clone.ch = "B";
      clone.fg = 5;
      clone.bg = 2;

      expect(original.ch).toBe("A");
      expect(original.fg).toBe(3);
      expect(original.bg).toBe(1);
    });
  });

  describe("equals", () => {
    it("should return true for cells with same values", () => {
      const cell1 = new Cell("█", 1, 0);
      const cell2 = new Cell("█", 1, 0);
      expect(cell1.equals(cell2)).toBe(true);
    });

    it("should return false for cells with different characters", () => {
      const cell1 = new Cell("A", 1, 0);
      const cell2 = new Cell("B", 1, 0);
      expect(cell1.equals(cell2)).toBe(false);
    });

    it("should return false for cells with different fg colors", () => {
      const cell1 = new Cell("A", 1, 0);
      const cell2 = new Cell("A", 2, 0);
      expect(cell1.equals(cell2)).toBe(false);
    });

    it("should return false for cells with different bg colors", () => {
      const cell1 = new Cell("A", 1, 0);
      const cell2 = new Cell("A", 1, 1);
      expect(cell1.equals(cell2)).toBe(false);
    });

    it("should return false when comparing with null", () => {
      const cell = new Cell();
      expect(cell.equals(null)).toBe(false);
    });

    it("should return false when comparing with undefined", () => {
      const cell = new Cell();
      expect(cell.equals(undefined)).toBe(false);
    });
  });

  describe("isEmpty", () => {
    it("should return true for default cell", () => {
      const cell = new Cell();
      expect(cell.isEmpty()).toBe(true);
    });

    it("should return true for space with transparent background", () => {
      const cell = new Cell(" ", 7, -1);
      expect(cell.isEmpty()).toBe(true);
    });

    it("should return false for space with colored background", () => {
      const cell = new Cell(" ", 7, 0);
      expect(cell.isEmpty()).toBe(false);
    });

    it("should return false for non-space character", () => {
      const cell = new Cell("█", 7, -1);
      expect(cell.isEmpty()).toBe(false);
    });
  });

  describe("clear", () => {
    it("should reset cell to default values", () => {
      const cell = new Cell("█", 1, 0);
      cell.clear();

      expect(cell.ch).toBe(" ");
      expect(cell.fg).toBe(7);
      expect(cell.bg).toBe(-1);
    });

    it("should make cell empty after clearing", () => {
      const cell = new Cell("X", 3, 2);
      cell.clear();
      expect(cell.isEmpty()).toBe(true);
    });
  });

  describe("fromObject", () => {
    it("should create cell from plain object", () => {
      const obj = { ch: "█", fg: 1, bg: 0 };
      const cell = Cell.fromObject(obj);

      expect(cell).toBeInstanceOf(Cell);
      expect(cell.ch).toBe("█");
      expect(cell.fg).toBe(1);
      expect(cell.bg).toBe(0);
    });

    it("should handle partial objects with defaults", () => {
      const obj = { ch: "A" };
      const cell = Cell.fromObject(obj);

      expect(cell.ch).toBe("A");
      expect(cell.fg).toBe(7); // Uses constructor default
      expect(cell.bg).toBe(-1); // Uses constructor default
    });
  });

  describe("toObject", () => {
    it("should convert cell to plain object", () => {
      const cell = new Cell("█", 1, 0);
      const obj = cell.toObject();

      expect(obj).toEqual({ ch: "█", fg: 1, bg: 0 });
      expect(obj).not.toBeInstanceOf(Cell);
    });

    it("should be serializable to JSON", () => {
      const cell = new Cell("┌", 6, -1);
      const json = JSON.stringify(cell.toObject());
      const parsed = JSON.parse(json);

      expect(parsed.ch).toBe("┌");
      expect(parsed.fg).toBe(6);
      expect(parsed.bg).toBe(-1);
    });
  });

  describe("round-trip conversion", () => {
    it("should preserve values through toObject -> fromObject", () => {
      const original = new Cell("█", 3, 2);
      const obj = original.toObject();
      const restored = Cell.fromObject(obj);

      expect(restored.equals(original)).toBe(true);
    });
  });

  describe("animation support", () => {
    describe("constructor", () => {
      it("should create cell with null animation by default", () => {
        const cell = new Cell();
        expect(cell.anim).toBeNull();
      });

      it("should create cell with animation config", () => {
        const cell = new Cell("★", 6, -1, { type: "blink", speed: 500 });
        expect(cell.anim).toEqual({ type: "blink", speed: 500 });
      });
    });

    describe("hasAnimation", () => {
      it("should return false when no animation", () => {
        const cell = new Cell();
        expect(cell.hasAnimation()).toBe(false);
      });

      it("should return true when animation is set", () => {
        const cell = new Cell("★", 6, -1);
        cell.anim = { type: "blink", speed: 500 };
        expect(cell.hasAnimation()).toBe(true);
      });
    });

    describe("setAnimation", () => {
      it("should set animation with type and speed", () => {
        const cell = new Cell("★", 6, -1);
        cell.setAnimation("blink", 500);

        expect(cell.anim.type).toBe("blink");
        expect(cell.anim.speed).toBe(500);
      });

      it("should set animation with additional options", () => {
        const cell = new Cell("★", 6, -1);
        cell.setAnimation("colorCycle", 100, { colors: [1, 2, 3] });

        expect(cell.anim.type).toBe("colorCycle");
        expect(cell.anim.speed).toBe(100);
        expect(cell.anim.colors).toEqual([1, 2, 3]);
      });

      it("should use default speed if not provided", () => {
        const cell = new Cell("★", 6, -1);
        cell.setAnimation("blink");

        expect(cell.anim.speed).toBe(500);
      });
    });

    describe("clearAnimation", () => {
      it("should remove animation", () => {
        const cell = new Cell("★", 6, -1);
        cell.anim = { type: "blink", speed: 500 };

        cell.clearAnimation();

        expect(cell.anim).toBeNull();
        expect(cell.hasAnimation()).toBe(false);
      });
    });

    describe("clear", () => {
      it("should also clear animation", () => {
        const cell = new Cell("★", 6, -1);
        cell.anim = { type: "blink", speed: 500 };

        cell.clear();

        expect(cell.anim).toBeNull();
      });
    });

    describe("clone", () => {
      it("should clone animation data", () => {
        const original = new Cell("★", 6, -1);
        original.anim = { type: "colorCycle", speed: 100, colors: [1, 2, 3] };

        const clone = original.clone();

        expect(clone.anim).toEqual(original.anim);
        expect(clone.anim).not.toBe(original.anim);
      });

      it("should deep clone animation arrays", () => {
        const original = new Cell("★", 6, -1);
        original.anim = {
          type: "charCycle",
          speed: 100,
          frames: ["A", "B", "C"],
        };

        const clone = original.clone();
        clone.anim.frames[0] = "X";

        expect(original.anim.frames[0]).toBe("A");
      });
    });

    describe("equals", () => {
      it("should return true for cells with same animation", () => {
        const cell1 = new Cell("★", 6, -1);
        cell1.anim = { type: "blink", speed: 500 };

        const cell2 = new Cell("★", 6, -1);
        cell2.anim = { type: "blink", speed: 500 };

        expect(cell1.equals(cell2)).toBe(true);
      });

      it("should return false for cells with different animation type", () => {
        const cell1 = new Cell("★", 6, -1);
        cell1.anim = { type: "blink", speed: 500 };

        const cell2 = new Cell("★", 6, -1);
        cell2.anim = { type: "flicker", speed: 500 };

        expect(cell1.equals(cell2)).toBe(false);
      });

      it("should return false for cells with different animation speed", () => {
        const cell1 = new Cell("★", 6, -1);
        cell1.anim = { type: "blink", speed: 500 };

        const cell2 = new Cell("★", 6, -1);
        cell2.anim = { type: "blink", speed: 1000 };

        expect(cell1.equals(cell2)).toBe(false);
      });

      it("should return false when one has animation and other does not", () => {
        const cell1 = new Cell("★", 6, -1);
        cell1.anim = { type: "blink", speed: 500 };

        const cell2 = new Cell("★", 6, -1);

        expect(cell1.equals(cell2)).toBe(false);
      });

      it("should return true when both have no animation", () => {
        const cell1 = new Cell("★", 6, -1);
        const cell2 = new Cell("★", 6, -1);

        expect(cell1.equals(cell2)).toBe(true);
      });
    });

    describe("toObject", () => {
      it("should include animation in serialization", () => {
        const cell = new Cell("★", 6, -1);
        cell.anim = { type: "blink", speed: 500 };

        const obj = cell.toObject();

        expect(obj.anim).toEqual({ type: "blink", speed: 500 });
      });

      it("should not include anim key when no animation", () => {
        const cell = new Cell("★", 6, -1);

        const obj = cell.toObject();

        expect(obj).not.toHaveProperty("anim");
      });

      it("should deep copy animation arrays", () => {
        const cell = new Cell("★", 6, -1);
        cell.anim = { type: "charCycle", speed: 100, frames: ["A", "B"] };

        const obj = cell.toObject();
        obj.anim.frames[0] = "X";

        expect(cell.anim.frames[0]).toBe("A");
      });
    });

    describe("fromObject", () => {
      it("should restore animation from object", () => {
        const obj = {
          ch: "★",
          fg: 6,
          bg: -1,
          anim: { type: "blink", speed: 500 },
        };

        const cell = Cell.fromObject(obj);

        expect(cell.anim).toEqual({ type: "blink", speed: 500 });
      });

      it("should handle objects without animation", () => {
        const obj = { ch: "★", fg: 6, bg: -1 };

        const cell = Cell.fromObject(obj);

        expect(cell.anim).toBeNull();
      });

      it("should deep copy animation arrays", () => {
        const obj = {
          ch: "★",
          fg: 6,
          bg: -1,
          anim: { type: "colorCycle", speed: 100, colors: [1, 2, 3] },
        };

        const cell = Cell.fromObject(obj);
        obj.anim.colors[0] = 9;

        expect(cell.anim.colors[0]).toBe(1);
      });
    });

    describe("round-trip with animation", () => {
      it("should preserve blink animation through serialization", () => {
        const original = new Cell("★", 6, -1);
        original.anim = { type: "blink", speed: 500 };

        const restored = Cell.fromObject(original.toObject());

        expect(restored.equals(original)).toBe(true);
      });

      it("should preserve colorCycle animation through serialization", () => {
        const original = new Cell("█", 7, -1);
        original.anim = {
          type: "colorCycle",
          speed: 100,
          colors: [0, 1, 2, 3],
        };

        const restored = Cell.fromObject(original.toObject());

        expect(restored.equals(original)).toBe(true);
        expect(restored.anim.colors).toEqual([0, 1, 2, 3]);
      });

      it("should preserve charCycle animation through serialization", () => {
        const original = new Cell("★", 6, -1);
        original.anim = {
          type: "charCycle",
          speed: 200,
          frames: ["★", "✦", "·"],
        };

        const restored = Cell.fromObject(original.toObject());

        expect(restored.equals(original)).toBe(true);
        expect(restored.anim.frames).toEqual(["★", "✦", "·"]);
      });

      it("should preserve flicker animation through serialization", () => {
        const original = new Cell("💡", 6, -1);
        original.anim = { type: "flicker", speed: 100 };

        const restored = Cell.fromObject(original.toObject());

        expect(restored.equals(original)).toBe(true);
      });
    });
  });
});
