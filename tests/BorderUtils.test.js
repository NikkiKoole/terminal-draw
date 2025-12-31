/**
 * BorderUtils Tests
 * Tests for border creation and utility functions
 */

import { describe, it, expect, beforeEach } from "vitest";
import { Layer } from "../src/core/Layer.js";
import { Scene } from "../src/core/Scene.js";
import { Cell } from "../src/core/Cell.js";
import {
  BORDER_STYLES,
  addBorderToLayer,
  addBorderToScene,
  isValidBorderStyle,
  getAvailableBorderStyles,
  getBorderStyle,
  createBorderPreview,
  getInnerDimensions,
  canAddBorder,
} from "../src/core/BorderUtils.js";

describe("BorderUtils", () => {
  let layer;
  let scene;

  beforeEach(() => {
    layer = new Layer("test", "Test Layer", 10, 8);
    scene = new Scene(12, 10, "default");
  });

  describe("BORDER_STYLES", () => {
    it("should define single line border style", () => {
      expect(BORDER_STYLES.single).toBeDefined();
      expect(BORDER_STYLES.single.name).toBe("Single Line");
      expect(BORDER_STYLES.single.chars.topLeft).toBe("┌");
      expect(BORDER_STYLES.single.chars.topRight).toBe("┐");
      expect(BORDER_STYLES.single.chars.bottomLeft).toBe("└");
      expect(BORDER_STYLES.single.chars.bottomRight).toBe("┘");
      expect(BORDER_STYLES.single.chars.horizontal).toBe("─");
      expect(BORDER_STYLES.single.chars.vertical).toBe("│");
    });

    it("should define double line border style", () => {
      expect(BORDER_STYLES.double).toBeDefined();
      expect(BORDER_STYLES.double.name).toBe("Double Line");
      expect(BORDER_STYLES.double.chars.topLeft).toBe("╔");
      expect(BORDER_STYLES.double.chars.topRight).toBe("╗");
      expect(BORDER_STYLES.double.chars.bottomLeft).toBe("╚");
      expect(BORDER_STYLES.double.chars.bottomRight).toBe("╝");
      expect(BORDER_STYLES.double.chars.horizontal).toBe("═");
      expect(BORDER_STYLES.double.chars.vertical).toBe("║");
    });
  });

  describe("addBorderToLayer", () => {
    it("should add single line border to layer", () => {
      addBorderToLayer(layer, "single", 7, -1);

      // Check corners
      expect(layer.getCell(0, 0).ch).toBe("┌");
      expect(layer.getCell(9, 0).ch).toBe("┐");
      expect(layer.getCell(0, 7).ch).toBe("└");
      expect(layer.getCell(9, 7).ch).toBe("┘");

      // Check horizontal edges
      expect(layer.getCell(5, 0).ch).toBe("─");
      expect(layer.getCell(5, 7).ch).toBe("─");

      // Check vertical edges
      expect(layer.getCell(0, 4).ch).toBe("│");
      expect(layer.getCell(9, 4).ch).toBe("│");

      // Check interior is unchanged
      expect(layer.getCell(5, 4).ch).toBe(" ");
    });

    it("should add double line border to layer", () => {
      addBorderToLayer(layer, "double", 3, 2);

      // Check corners
      expect(layer.getCell(0, 0).ch).toBe("╔");
      expect(layer.getCell(9, 0).ch).toBe("╗");
      expect(layer.getCell(0, 7).ch).toBe("╚");
      expect(layer.getCell(9, 7).ch).toBe("╝");

      // Check horizontal edges
      expect(layer.getCell(5, 0).ch).toBe("═");
      expect(layer.getCell(5, 7).ch).toBe("═");

      // Check vertical edges
      expect(layer.getCell(0, 4).ch).toBe("║");
      expect(layer.getCell(9, 4).ch).toBe("║");

      // Check colors
      expect(layer.getCell(0, 0).fg).toBe(3);
      expect(layer.getCell(0, 0).bg).toBe(2);
    });

    it("should use default colors when not specified", () => {
      addBorderToLayer(layer, "single");

      expect(layer.getCell(0, 0).fg).toBe(7);
      expect(layer.getCell(0, 0).bg).toBe(-1);
    });

    it("should throw error for invalid layer", () => {
      expect(() => {
        addBorderToLayer(null, "single");
      }).toThrow();
    });

    it("should throw error for invalid border style", () => {
      expect(() => {
        addBorderToLayer(layer, "invalid");
      }).toThrow();
    });

    it("should handle small layers correctly", () => {
      const smallLayer = new Layer("small", "Small", 3, 3);
      addBorderToLayer(smallLayer, "single");

      // Should have all corners and one center cell
      expect(smallLayer.getCell(0, 0).ch).toBe("┌");
      expect(smallLayer.getCell(2, 0).ch).toBe("┐");
      expect(smallLayer.getCell(0, 2).ch).toBe("└");
      expect(smallLayer.getCell(2, 2).ch).toBe("┘");
      expect(smallLayer.getCell(1, 1).ch).toBe(" "); // Center unchanged
    });

    it("should handle minimum border size", () => {
      const minLayer = new Layer("min", "Minimum", 2, 2);
      addBorderToLayer(minLayer, "single");

      // Should only have corners
      expect(minLayer.getCell(0, 0).ch).toBe("┌");
      expect(minLayer.getCell(1, 0).ch).toBe("┐");
      expect(minLayer.getCell(0, 1).ch).toBe("└");
      expect(minLayer.getCell(1, 1).ch).toBe("┘");
    });
  });

  describe("addBorderToScene", () => {
    it("should add border to first layer of scene", () => {
      addBorderToScene(scene, "single", 7, -1);

      const firstLayer = scene.layers[0];
      expect(firstLayer.getCell(0, 0).ch).toBe("┌");
      expect(firstLayer.getCell(11, 0).ch).toBe("┐");
      expect(firstLayer.getCell(0, 9).ch).toBe("└");
      expect(firstLayer.getCell(11, 9).ch).toBe("┘");
    });

    it("should throw error for null scene", () => {
      expect(() => {
        addBorderToScene(null, "single");
      }).toThrow();
    });

    it("should throw error for scene with no layers", () => {
      const emptyScene = new Scene(10, 10, "default");
      emptyScene.layers = [];

      expect(() => {
        addBorderToScene(emptyScene, "single");
      }).toThrow();
    });

    it("should use default style and colors", () => {
      addBorderToScene(scene);

      const firstLayer = scene.layers[0];
      expect(firstLayer.getCell(0, 0).ch).toBe("┌");
      expect(firstLayer.getCell(0, 0).fg).toBe(7);
      expect(firstLayer.getCell(0, 0).bg).toBe(-1);
    });
  });

  describe("isValidBorderStyle", () => {
    it("should return true for valid styles", () => {
      expect(isValidBorderStyle("single")).toBe(true);
      expect(isValidBorderStyle("double")).toBe(true);
    });

    it("should return false for invalid styles", () => {
      expect(isValidBorderStyle("invalid")).toBe(false);
      expect(isValidBorderStyle("")).toBe(false);
      expect(isValidBorderStyle(null)).toBe(false);
      expect(isValidBorderStyle(undefined)).toBe(false);
    });
  });

  describe("getAvailableBorderStyles", () => {
    it("should return array of available styles", () => {
      const styles = getAvailableBorderStyles();
      expect(Array.isArray(styles)).toBe(true);
      expect(styles).toContain("single");
      expect(styles).toContain("double");
      expect(styles.length).toBe(2);
    });
  });

  describe("getBorderStyle", () => {
    it("should return style object for valid style", () => {
      const singleStyle = getBorderStyle("single");
      expect(singleStyle).toBeDefined();
      expect(singleStyle.name).toBe("Single Line");
      expect(singleStyle.chars).toBeDefined();

      const doubleStyle = getBorderStyle("double");
      expect(doubleStyle).toBeDefined();
      expect(doubleStyle.name).toBe("Double Line");
    });

    it("should return null for invalid style", () => {
      expect(getBorderStyle("invalid")).toBeNull();
      expect(getBorderStyle("")).toBeNull();
      expect(getBorderStyle(null)).toBeNull();
    });
  });

  describe("createBorderPreview", () => {
    it("should create preview for single line border", () => {
      const preview = createBorderPreview("single");
      expect(preview).toBe("┌─┐\n│ │\n└─┘");
    });

    it("should create preview for double line border", () => {
      const preview = createBorderPreview("double");
      expect(preview).toBe("╔═╗\n║ ║\n╚═╝");
    });

    it("should return empty string for invalid style", () => {
      expect(createBorderPreview("invalid")).toBe("");
      expect(createBorderPreview("")).toBe("");
    });
  });

  describe("getInnerDimensions", () => {
    it("should calculate inner dimensions correctly", () => {
      const inner = getInnerDimensions(10, 8);
      expect(inner.width).toBe(8);
      expect(inner.height).toBe(6);
    });

    it("should handle minimum dimensions", () => {
      const inner = getInnerDimensions(2, 2);
      expect(inner.width).toBe(0);
      expect(inner.height).toBe(0);
    });

    it("should handle very small dimensions", () => {
      const inner = getInnerDimensions(1, 1);
      expect(inner.width).toBe(0);
      expect(inner.height).toBe(0);
    });

    it("should handle zero dimensions", () => {
      const inner = getInnerDimensions(0, 0);
      expect(inner.width).toBe(0);
      expect(inner.height).toBe(0);
    });
  });

  describe("canAddBorder", () => {
    it("should return true for sufficient dimensions", () => {
      expect(canAddBorder(10, 8)).toBe(true);
      expect(canAddBorder(3, 3)).toBe(true);
      expect(canAddBorder(100, 50)).toBe(true);
    });

    it("should return false for insufficient dimensions", () => {
      expect(canAddBorder(2, 3)).toBe(false);
      expect(canAddBorder(3, 2)).toBe(false);
      expect(canAddBorder(2, 2)).toBe(false);
      expect(canAddBorder(1, 1)).toBe(false);
      expect(canAddBorder(0, 0)).toBe(false);
    });

    it("should handle edge case exactly at minimum", () => {
      expect(canAddBorder(3, 3)).toBe(true);
    });
  });

  describe("Integration scenarios", () => {
    it("should work with different layer sizes", () => {
      const sizes = [
        [5, 5],
        [10, 6],
        [20, 15],
        [3, 8],
      ];

      sizes.forEach(([w, h]) => {
        const testLayer = new Layer("test", "Test", w, h);
        expect(() => {
          addBorderToLayer(testLayer, "single");
        }).not.toThrow();

        // Verify border was added correctly
        expect(testLayer.getCell(0, 0).ch).toBe("┌");
        expect(testLayer.getCell(w - 1, 0).ch).toBe("┐");
        expect(testLayer.getCell(0, h - 1).ch).toBe("└");
        expect(testLayer.getCell(w - 1, h - 1).ch).toBe("┘");
      });
    });

    it("should work with all border styles", () => {
      const styles = getAvailableBorderStyles();

      styles.forEach((style) => {
        const testLayer = new Layer("test", "Test", 8, 6);
        expect(() => {
          addBorderToLayer(testLayer, style);
        }).not.toThrow();

        // Verify some border was added
        expect(testLayer.getCell(0, 0).ch).not.toBe(" ");
        expect(testLayer.getCell(7, 0).ch).not.toBe(" ");
        expect(testLayer.getCell(0, 5).ch).not.toBe(" ");
        expect(testLayer.getCell(7, 5).ch).not.toBe(" ");
      });
    });

    it("should preserve existing cell data in interior", () => {
      // Set some interior cells
      layer.setCell(3, 3, new Cell("X", 1, 2));
      layer.setCell(5, 4, new Cell("Y", 3, 4));

      addBorderToLayer(layer, "single");

      // Interior cells should be unchanged
      expect(layer.getCell(3, 3).ch).toBe("X");
      expect(layer.getCell(3, 3).fg).toBe(1);
      expect(layer.getCell(3, 3).bg).toBe(2);

      expect(layer.getCell(5, 4).ch).toBe("Y");
      expect(layer.getCell(5, 4).fg).toBe(3);
      expect(layer.getCell(5, 4).bg).toBe(4);
    });

    it("should work with different color combinations", () => {
      const colorCombos = [
        [0, -1], // Black on transparent
        [7, 0], // White on black
        [3, 4], // Yellow on blue
        [6, 2], // Cyan on green
      ];

      colorCombos.forEach(([fg, bg]) => {
        const testLayer = new Layer("test", "Test", 6, 4);
        addBorderToLayer(testLayer, "double", fg, bg);

        expect(testLayer.getCell(0, 0).fg).toBe(fg);
        expect(testLayer.getCell(0, 0).bg).toBe(bg);
        expect(testLayer.getCell(5, 3).fg).toBe(fg);
        expect(testLayer.getCell(5, 3).bg).toBe(bg);
      });
    });
  });
});
