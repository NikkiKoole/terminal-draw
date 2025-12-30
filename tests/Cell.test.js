import { describe, it, expect } from "vitest";
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
});
