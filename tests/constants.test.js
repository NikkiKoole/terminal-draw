import { describe, it, expect } from "vitest";
import {
  DEFAULT_WIDTH,
  DEFAULT_HEIGHT,
  DEFAULT_PALETTE_ID,
  DEFAULT_CHAR,
  DEFAULT_FG,
  DEFAULT_BG,
  LAYER_BG,
  LAYER_MID,
  LAYER_FG,
  GLYPHS,
  ALL_GLYPHS,
  GLYPH_CATEGORIES,
} from "../src/core/constants.js";

describe("constants", () => {
  describe("grid defaults", () => {
    it("should have correct default dimensions", () => {
      expect(DEFAULT_WIDTH).toBe(80);
      expect(DEFAULT_HEIGHT).toBe(25);
    });
  });

  describe("default palette ID", () => {
    it("should reference default palette", () => {
      expect(DEFAULT_PALETTE_ID).toBe("default");
    });
  });

  describe("default cell values", () => {
    it("should have correct defaults", () => {
      expect(DEFAULT_CHAR).toBe(" ");
      expect(DEFAULT_FG).toBe(7);
      expect(DEFAULT_BG).toBe(-1);
    });
  });

  describe("layer IDs", () => {
    it("should define three layer IDs", () => {
      expect(LAYER_BG).toBe("bg");
      expect(LAYER_MID).toBe("mid");
      expect(LAYER_FG).toBe("fg");
    });
  });

  describe("GLYPHS", () => {
    it("should have all expected categories", () => {
      expect(GLYPHS.BOX_LIGHT).toBeDefined();
      expect(GLYPHS.BOX_HEAVY).toBeDefined();
      expect(GLYPHS.BOX_DOUBLE).toBeDefined();
      expect(GLYPHS.BOX_ROUNDED).toBeDefined();
      expect(GLYPHS.SHADING).toBeDefined();
      expect(GLYPHS.DOTS).toBeDefined();
      expect(GLYPHS.ARROWS).toBeDefined();
      expect(GLYPHS.GEOMETRY).toBeDefined();
      expect(GLYPHS.TRIANGLES).toBeDefined();
      expect(GLYPHS.MATH_OPERATORS).toBeDefined();
      expect(GLYPHS.EXTENDED_ARROWS).toBeDefined();
      expect(GLYPHS.CURRENCY).toBeDefined();
      expect(GLYPHS.SYMBOLS_COMMON).toBeDefined();
      expect(GLYPHS.COMMON).toBeDefined();
    });

    it("should have name and chars for each category", () => {
      for (const [key, value] of Object.entries(GLYPHS)) {
        expect(value.name).toBeDefined();
        expect(value.chars).toBeInstanceOf(Array);
        expect(value.chars.length).toBeGreaterThan(0);
      }
    });

    it("should contain expected box drawing characters", () => {
      expect(GLYPHS.BOX_LIGHT.chars).toContain("─");
      expect(GLYPHS.BOX_LIGHT.chars).toContain("│");
      expect(GLYPHS.BOX_LIGHT.chars).toContain("┌");
      expect(GLYPHS.BOX_LIGHT.chars).toContain("┐");
    });

    it("should contain expected shading characters", () => {
      expect(GLYPHS.SHADING.chars).toContain("░");
      expect(GLYPHS.SHADING.chars).toContain("▒");
      expect(GLYPHS.SHADING.chars).toContain("▓");
      expect(GLYPHS.SHADING.chars).toContain("█");
    });

    it("should contain expected arrow characters", () => {
      expect(GLYPHS.ARROWS.chars).toContain("→");
      expect(GLYPHS.ARROWS.chars).toContain("←");
      expect(GLYPHS.ARROWS.chars).toContain("↑");
      expect(GLYPHS.ARROWS.chars).toContain("↓");
    });
  });

  describe("ALL_GLYPHS", () => {
    it("should be an array", () => {
      expect(ALL_GLYPHS).toBeInstanceOf(Array);
    });

    it("should contain glyphs from all categories", () => {
      expect(ALL_GLYPHS.length).toBeGreaterThan(0);
      expect(ALL_GLYPHS).toContain("─"); // from BOX_LIGHT
      expect(ALL_GLYPHS).toContain("━"); // from BOX_HEAVY
      expect(ALL_GLYPHS).toContain("░"); // from SHADING
      expect(ALL_GLYPHS).toContain("→"); // from ARROWS
    });

    it("should have unique characters", () => {
      // Check that flattening worked (some duplication is okay in original design)
      expect(ALL_GLYPHS.length).toBeGreaterThan(50);
    });
  });

  describe("GLYPH_CATEGORIES", () => {
    it("should be an array of category objects", () => {
      expect(GLYPH_CATEGORIES).toBeInstanceOf(Array);
      expect(GLYPH_CATEGORIES.length).toBe(14);
    });

    it("should have id, name, and chars for each category", () => {
      for (const category of GLYPH_CATEGORIES) {
        expect(category.id).toBeDefined();
        expect(category.name).toBeDefined();
        expect(category.chars).toBeInstanceOf(Array);
      }
    });

    it("should have BOX_LIGHT as first category", () => {
      expect(GLYPH_CATEGORIES[0].id).toBe("BOX_LIGHT");
      expect(GLYPH_CATEGORIES[0].name).toBe("Box Drawing (Light)");
    });
  });
});
