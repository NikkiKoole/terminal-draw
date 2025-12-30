import { describe, it, expect, beforeEach } from "vitest";
import { Layer } from "../src/core/Layer.js";
import { Cell } from "../src/core/Cell.js";

describe("Layer", () => {
  let layer;

  beforeEach(() => {
    layer = new Layer("test", "Test Layer", 10, 5);
  });

  describe("constructor", () => {
    it("should create a layer with correct properties", () => {
      expect(layer.id).toBe("test");
      expect(layer.name).toBe("Test Layer");
      expect(layer.width).toBe(10);
      expect(layer.height).toBe(5);
      expect(layer.visible).toBe(true);
      expect(layer.locked).toBe(false);
      expect(layer.ligatures).toBe(false);
    });

    it("should initialize correct number of cells", () => {
      expect(layer.cells.length).toBe(50); // 10 * 5
    });

    it("should initialize all cells as default cells", () => {
      for (const cell of layer.cells) {
        expect(cell).toBeInstanceOf(Cell);
        expect(cell.isEmpty()).toBe(true);
      }
    });

    it("should create layers of different sizes", () => {
      const small = new Layer("s", "Small", 3, 2);
      expect(small.cells.length).toBe(6);

      const large = new Layer("l", "Large", 80, 25);
      expect(large.cells.length).toBe(2000);
    });
  });

  describe("getCellIndex", () => {
    it("should convert coordinates to correct index", () => {
      expect(layer.getCellIndex(0, 0)).toBe(0);
      expect(layer.getCellIndex(9, 0)).toBe(9);
      expect(layer.getCellIndex(0, 1)).toBe(10);
      expect(layer.getCellIndex(5, 2)).toBe(25);
      expect(layer.getCellIndex(9, 4)).toBe(49);
    });

    it("should calculate index for any valid coordinate", () => {
      for (let y = 0; y < layer.height; y++) {
        for (let x = 0; x < layer.width; x++) {
          const index = layer.getCellIndex(x, y);
          expect(index).toBeGreaterThanOrEqual(0);
          expect(index).toBeLessThan(layer.cells.length);
        }
      }
    });
  });

  describe("isValidCoord", () => {
    it("should return true for valid coordinates", () => {
      expect(layer.isValidCoord(0, 0)).toBe(true);
      expect(layer.isValidCoord(5, 2)).toBe(true);
      expect(layer.isValidCoord(9, 4)).toBe(true);
    });

    it("should return false for negative coordinates", () => {
      expect(layer.isValidCoord(-1, 0)).toBe(false);
      expect(layer.isValidCoord(0, -1)).toBe(false);
      expect(layer.isValidCoord(-1, -1)).toBe(false);
    });

    it("should return false for out of bounds coordinates", () => {
      expect(layer.isValidCoord(10, 0)).toBe(false);
      expect(layer.isValidCoord(0, 5)).toBe(false);
      expect(layer.isValidCoord(100, 100)).toBe(false);
    });

    it("should return false for boundary edge cases", () => {
      expect(layer.isValidCoord(layer.width, 0)).toBe(false);
      expect(layer.isValidCoord(0, layer.height)).toBe(false);
    });
  });

  describe("getCell", () => {
    it("should return cell at valid coordinates", () => {
      const cell = layer.getCell(3, 2);
      expect(cell).toBeInstanceOf(Cell);
      expect(cell.isEmpty()).toBe(true);
    });

    it("should return null for invalid coordinates", () => {
      expect(layer.getCell(-1, 0)).toBe(null);
      expect(layer.getCell(10, 0)).toBe(null);
      expect(layer.getCell(0, -1)).toBe(null);
      expect(layer.getCell(0, 5)).toBe(null);
    });

    it("should return the same cell on multiple calls", () => {
      const cell1 = layer.getCell(5, 2);
      const cell2 = layer.getCell(5, 2);
      expect(cell1).toBe(cell2);
    });
  });

  describe("setCell", () => {
    it("should set cell at valid coordinates with Cell instance", () => {
      const newCell = new Cell("█", 1, 0);
      const result = layer.setCell(3, 2, newCell);

      expect(result).toBe(true);
      const retrieved = layer.getCell(3, 2);
      expect(retrieved.ch).toBe("█");
      expect(retrieved.fg).toBe(1);
      expect(retrieved.bg).toBe(0);
    });

    it("should set cell with plain object", () => {
      const result = layer.setCell(3, 2, { ch: "X", fg: 3, bg: 1 });

      expect(result).toBe(true);
      const retrieved = layer.getCell(3, 2);
      expect(retrieved.ch).toBe("X");
      expect(retrieved.fg).toBe(3);
      expect(retrieved.bg).toBe(1);
    });

    it("should return false for invalid coordinates", () => {
      const cell = new Cell("A", 1, 0);
      expect(layer.setCell(-1, 0, cell)).toBe(false);
      expect(layer.setCell(10, 0, cell)).toBe(false);
      expect(layer.setCell(0, -1, cell)).toBe(false);
      expect(layer.setCell(0, 5, cell)).toBe(false);
    });

    it("should clone the cell, not store reference", () => {
      const original = new Cell("A", 1, 0);
      layer.setCell(0, 0, original);

      original.ch = "B";
      const stored = layer.getCell(0, 0);
      expect(stored.ch).toBe("A");
    });

    it("should not affect other cells", () => {
      layer.setCell(3, 2, new Cell("X", 1, 0));

      const before = layer.getCell(3, 1);
      const after = layer.getCell(3, 3);
      const left = layer.getCell(2, 2);
      const right = layer.getCell(4, 2);

      expect(before.isEmpty()).toBe(true);
      expect(after.isEmpty()).toBe(true);
      expect(left.isEmpty()).toBe(true);
      expect(right.isEmpty()).toBe(true);
    });
  });

  describe("clear", () => {
    it("should reset all cells to default", () => {
      // Set some cells
      layer.setCell(0, 0, new Cell("A", 1, 0));
      layer.setCell(5, 2, new Cell("B", 2, 1));
      layer.setCell(9, 4, new Cell("C", 3, 2));

      layer.clear();

      // All cells should be empty
      for (const cell of layer.cells) {
        expect(cell.isEmpty()).toBe(true);
      }
    });

    it("should maintain cell count after clear", () => {
      const originalLength = layer.cells.length;
      layer.clear();
      expect(layer.cells.length).toBe(originalLength);
    });
  });

  describe("fill", () => {
    it("should fill all cells with Cell instance", () => {
      const fillCell = new Cell("█", 1, 0);
      layer.fill(fillCell);

      for (const cell of layer.cells) {
        expect(cell.ch).toBe("█");
        expect(cell.fg).toBe(1);
        expect(cell.bg).toBe(0);
      }
    });

    it("should fill all cells with plain object", () => {
      layer.fill({ ch: "X", fg: 3, bg: 2 });

      for (const cell of layer.cells) {
        expect(cell.ch).toBe("X");
        expect(cell.fg).toBe(3);
        expect(cell.bg).toBe(2);
      }
    });

    it("should clone fill cell, not reuse reference", () => {
      layer.fill(new Cell("A", 1, 0));

      const cell1 = layer.getCell(0, 0);
      const cell2 = layer.getCell(1, 0);

      expect(cell1).not.toBe(cell2);
      expect(cell1.equals(cell2)).toBe(true);
    });
  });

  describe("getRegion", () => {
    beforeEach(() => {
      // Create a pattern in the layer
      for (let y = 0; y < layer.height; y++) {
        for (let x = 0; x < layer.width; x++) {
          layer.setCell(x, y, new Cell(String(x), y, 0));
        }
      }
    });

    it("should extract a region correctly", () => {
      const region = layer.getRegion(2, 1, 3, 2);

      expect(region.length).toBe(2); // height
      expect(region[0].length).toBe(3); // width

      expect(region[0][0].ch).toBe("2");
      expect(region[0][0].fg).toBe(1);
      expect(region[1][0].ch).toBe("2");
      expect(region[1][0].fg).toBe(2);
    });

    it("should return cloned cells, not references", () => {
      const region = layer.getRegion(0, 0, 2, 2);

      region[0][0].ch = "MODIFIED";
      const original = layer.getCell(0, 0);
      expect(original.ch).not.toBe("MODIFIED");
    });

    it("should handle region extending beyond bounds", () => {
      const region = layer.getRegion(8, 3, 5, 5);

      expect(region.length).toBe(5);
      expect(region[0].length).toBe(5);

      // Out of bounds cells should be default
      expect(region[0][2]).toBeInstanceOf(Cell);
    });

    it("should extract single cell region", () => {
      const region = layer.getRegion(5, 2, 1, 1);

      expect(region.length).toBe(1);
      expect(region[0].length).toBe(1);
      expect(region[0][0].ch).toBe("5");
    });
  });

  describe("setRegion", () => {
    it("should paste a region correctly", () => {
      const region = [
        [new Cell("A", 1, 0), new Cell("B", 1, 0)],
        [new Cell("C", 2, 0), new Cell("D", 2, 0)],
      ];

      const count = layer.setRegion(3, 2, region);

      expect(count).toBe(4);
      expect(layer.getCell(3, 2).ch).toBe("A");
      expect(layer.getCell(4, 2).ch).toBe("B");
      expect(layer.getCell(3, 3).ch).toBe("C");
      expect(layer.getCell(4, 3).ch).toBe("D");
    });

    it("should return correct count when partially out of bounds", () => {
      const region = [
        [new Cell("A", 1, 0), new Cell("B", 1, 0)],
        [new Cell("C", 2, 0), new Cell("D", 2, 0)],
      ];

      const count = layer.setRegion(9, 4, region);

      // Only (9, 4) is valid
      expect(count).toBe(1);
      expect(layer.getCell(9, 4).ch).toBe("A");
    });

    it("should handle empty region", () => {
      const count = layer.setRegion(0, 0, []);
      expect(count).toBe(0);
    });
  });

  describe("clone", () => {
    it("should create a deep copy of the layer", () => {
      layer.setCell(3, 2, new Cell("X", 1, 0));
      layer.visible = false;
      layer.locked = true;
      layer.ligatures = true;

      const clone = layer.clone();

      expect(clone.id).toBe(layer.id);
      expect(clone.name).toBe(layer.name);
      expect(clone.width).toBe(layer.width);
      expect(clone.height).toBe(layer.height);
      expect(clone.visible).toBe(false);
      expect(clone.locked).toBe(true);
      expect(clone.ligatures).toBe(true);
    });

    it("should clone all cells", () => {
      layer.setCell(3, 2, new Cell("X", 1, 0));
      const clone = layer.clone();

      const clonedCell = clone.getCell(3, 2);
      expect(clonedCell.ch).toBe("X");
    });

    it("should not affect original when clone is modified", () => {
      const clone = layer.clone();

      clone.setCell(0, 0, new Cell("CHANGED", 1, 0));
      clone.visible = false;

      expect(layer.getCell(0, 0).ch).toBe(" ");
      expect(layer.visible).toBe(true);
    });

    it("should create independent cell arrays", () => {
      const clone = layer.clone();
      expect(clone.cells).not.toBe(layer.cells);
      expect(clone.getCell(0, 0)).not.toBe(layer.getCell(0, 0));
    });
  });

  describe("toObject and fromObject", () => {
    it("should convert to plain object", () => {
      layer.setCell(3, 2, new Cell("X", 1, 0));
      layer.visible = false;
      layer.locked = true;

      const obj = layer.toObject();

      expect(obj.id).toBe("test");
      expect(obj.name).toBe("Test Layer");
      expect(obj.width).toBe(10);
      expect(obj.height).toBe(5);
      expect(obj.visible).toBe(false);
      expect(obj.locked).toBe(true);
      expect(obj.cells).toBeInstanceOf(Array);
      expect(obj.cells.length).toBe(50);
    });

    it("should be JSON serializable", () => {
      layer.setCell(0, 0, new Cell("A", 1, 0));
      const json = JSON.stringify(layer.toObject());
      const parsed = JSON.parse(json);

      expect(parsed.id).toBe("test");
      expect(parsed.cells[0].ch).toBe("A");
    });

    it("should restore layer from object", () => {
      layer.setCell(3, 2, new Cell("X", 1, 0));
      layer.visible = false;
      layer.locked = true;
      layer.ligatures = true;

      const obj = layer.toObject();
      const restored = Layer.fromObject(obj);

      expect(restored.id).toBe(layer.id);
      expect(restored.width).toBe(layer.width);
      expect(restored.height).toBe(layer.height);
      expect(restored.visible).toBe(false);
      expect(restored.locked).toBe(true);
      expect(restored.ligatures).toBe(true);
      expect(restored.getCell(3, 2).ch).toBe("X");
    });

    it("should preserve all cells through round-trip", () => {
      layer.setCell(0, 0, new Cell("A", 1, 0));
      layer.setCell(9, 4, new Cell("Z", 7, 6));

      const obj = layer.toObject();
      const restored = Layer.fromObject(obj);

      for (let y = 0; y < layer.height; y++) {
        for (let x = 0; x < layer.width; x++) {
          const original = layer.getCell(x, y);
          const restoredCell = restored.getCell(x, y);
          expect(restoredCell.equals(original)).toBe(true);
        }
      }
    });
  });

  describe("getStats", () => {
    it("should return stats for empty layer", () => {
      const stats = layer.getStats();

      expect(stats.totalCells).toBe(50);
      expect(stats.emptyCount).toBe(50);
      expect(stats.nonEmptyCount).toBe(0);
      expect(stats.charFrequency).toEqual({});
    });

    it("should count non-empty cells", () => {
      layer.setCell(0, 0, new Cell("A", 1, 0));
      layer.setCell(1, 0, new Cell("B", 1, 0));
      layer.setCell(2, 0, new Cell("A", 1, 0));

      const stats = layer.getStats();

      expect(stats.emptyCount).toBe(47);
      expect(stats.nonEmptyCount).toBe(3);
    });

    it("should track character frequency", () => {
      layer.setCell(0, 0, new Cell("A", 1, 0));
      layer.setCell(1, 0, new Cell("B", 1, 0));
      layer.setCell(2, 0, new Cell("A", 1, 0));
      layer.setCell(3, 0, new Cell("A", 1, 0));

      const stats = layer.getStats();

      expect(stats.charFrequency).toEqual({ A: 3, B: 1 });
    });

    it("should not count spaces with colored background as empty", () => {
      layer.setCell(0, 0, new Cell(" ", 7, 0)); // space with background

      const stats = layer.getStats();

      expect(stats.emptyCount).toBe(49);
      expect(stats.nonEmptyCount).toBe(1);
      expect(stats.charFrequency[" "]).toBe(1);
    });
  });
});
