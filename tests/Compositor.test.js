import { describe, it, expect, beforeEach } from "vitest";
import {
  getVisibleCell,
  getVisibleRegion,
  exportScene,
  exportAsText,
  exportAsANSI,
} from "../src/rendering/Compositor.js";
import { Scene } from "../src/core/Scene.js";
import { Cell } from "../src/core/Cell.js";
import { LAYER_BG, LAYER_MID, LAYER_FG } from "../src/core/constants.js";

describe("Compositor", () => {
  let scene;

  beforeEach(() => {
    scene = new Scene(10, 5);
  });

  describe("getVisibleCell", () => {
    it("should return null for out of bounds coordinates", () => {
      expect(getVisibleCell(-1, 0, scene)).toBe(null);
      expect(getVisibleCell(100, 0, scene)).toBe(null);
      expect(getVisibleCell(0, -1, scene)).toBe(null);
      expect(getVisibleCell(0, 100, scene)).toBe(null);
    });

    it("should return null for null scene", () => {
      expect(getVisibleCell(0, 0, null)).toBe(null);
    });

    it("should return default cell for empty layers", () => {
      const cell = getVisibleCell(0, 0, scene);

      expect(cell).toBeInstanceOf(Cell);
      expect(cell.ch).toBe(" ");
      expect(cell.fg).toBe(7);
      expect(cell.bg).toBe(-1);
    });

    it("should return cell from single layer", () => {
      scene.getLayer(LAYER_BG).setCell(0, 0, new Cell("A", 1, 0));

      const cell = getVisibleCell(0, 0, scene);

      expect(cell.ch).toBe("A");
      expect(cell.fg).toBe(1);
      expect(cell.bg).toBe(0);
    });

    it("should composite character from topmost non-space layer", () => {
      scene.getLayer(LAYER_BG).setCell(0, 0, new Cell("A", 1, 0));
      scene.getLayer(LAYER_MID).setCell(0, 0, new Cell("B", 2, 1));
      scene.getLayer(LAYER_FG).setCell(0, 0, new Cell("C", 3, 2));

      const cell = getVisibleCell(0, 0, scene);

      // Should get character from foreground (topmost)
      expect(cell.ch).toBe("C");
      expect(cell.fg).toBe(3);
    });

    it("should skip space characters when compositing", () => {
      scene.getLayer(LAYER_BG).setCell(0, 0, new Cell("A", 1, 0));
      scene.getLayer(LAYER_MID).setCell(0, 0, new Cell("B", 2, 1));
      scene.getLayer(LAYER_FG).setCell(0, 0, new Cell(" ", 3, 2));

      const cell = getVisibleCell(0, 0, scene);

      // Should skip space on FG and get character from MID
      expect(cell.ch).toBe("B");
      expect(cell.fg).toBe(2);
    });

    it("should composite background from topmost non-transparent layer", () => {
      scene.getLayer(LAYER_BG).setCell(0, 0, new Cell("A", 1, 5));
      scene.getLayer(LAYER_MID).setCell(0, 0, new Cell("B", 2, 6));
      scene.getLayer(LAYER_FG).setCell(0, 0, new Cell("C", 3, 7));

      const cell = getVisibleCell(0, 0, scene);

      // Should get background from foreground (topmost)
      expect(cell.bg).toBe(7);
    });

    it("should skip transparent backgrounds when compositing", () => {
      scene.getLayer(LAYER_BG).setCell(0, 0, new Cell("A", 1, 5));
      scene.getLayer(LAYER_MID).setCell(0, 0, new Cell("B", 2, 6));
      scene.getLayer(LAYER_FG).setCell(0, 0, new Cell("C", 3, -1));

      const cell = getVisibleCell(0, 0, scene);

      // Should skip transparent BG on FG and get BG from MID
      expect(cell.bg).toBe(6);
    });

    it("should composite character and background independently", () => {
      scene.getLayer(LAYER_BG).setCell(0, 0, new Cell("A", 1, 5));
      scene.getLayer(LAYER_MID).setCell(0, 0, new Cell(" ", 2, 6));
      scene.getLayer(LAYER_FG).setCell(0, 0, new Cell("C", 3, -1));

      const cell = getVisibleCell(0, 0, scene);

      // Character from FG, background from MID
      expect(cell.ch).toBe("C");
      expect(cell.fg).toBe(3);
      expect(cell.bg).toBe(6);
    });

    it("should handle all layers being spaces", () => {
      scene.getLayer(LAYER_BG).setCell(0, 0, new Cell(" ", 1, -1));
      scene.getLayer(LAYER_MID).setCell(0, 0, new Cell(" ", 2, -1));
      scene.getLayer(LAYER_FG).setCell(0, 0, new Cell(" ", 3, -1));

      const cell = getVisibleCell(0, 0, scene);

      expect(cell.ch).toBe(" ");
      expect(cell.fg).toBe(7); // Default FG
      expect(cell.bg).toBe(-1); // Transparent
    });

    it("should respect layer visibility", () => {
      scene.getLayer(LAYER_BG).setCell(0, 0, new Cell("A", 1, 0));
      scene.getLayer(LAYER_MID).setCell(0, 0, new Cell("B", 2, 1));
      scene.getLayer(LAYER_FG).setCell(0, 0, new Cell("C", 3, 2));

      // Hide foreground layer
      scene.getLayer(LAYER_FG).visible = false;

      const cell = getVisibleCell(0, 0, scene);

      // Should composite from MID since FG is hidden
      expect(cell.ch).toBe("B");
      expect(cell.fg).toBe(2);
      expect(cell.bg).toBe(1);
    });

    it("should handle all layers invisible", () => {
      scene.getLayer(LAYER_BG).setCell(0, 0, new Cell("A", 1, 0));
      scene.getLayer(LAYER_MID).setCell(0, 0, new Cell("B", 2, 1));
      scene.getLayer(LAYER_FG).setCell(0, 0, new Cell("C", 3, 2));

      scene.getLayer(LAYER_BG).visible = false;
      scene.getLayer(LAYER_MID).visible = false;
      scene.getLayer(LAYER_FG).visible = false;

      const cell = getVisibleCell(0, 0, scene);

      // Should return default cell
      expect(cell.ch).toBe(" ");
      expect(cell.fg).toBe(7);
      expect(cell.bg).toBe(-1);
    });

    it("should handle box-drawing characters", () => {
      scene.getLayer(LAYER_BG).setCell(0, 0, new Cell("░", 0, -1));
      scene.getLayer(LAYER_MID).setCell(0, 0, new Cell("┌", 7, -1));
      scene.getLayer(LAYER_FG).setCell(0, 0, new Cell(" ", 7, -1));

      const cell = getVisibleCell(0, 0, scene);

      expect(cell.ch).toBe("┌");
      expect(cell.fg).toBe(7);
    });
  });

  describe("getVisibleRegion", () => {
    it("should return 2D array of composited cells", () => {
      const region = getVisibleRegion(0, 0, 3, 2, scene);

      expect(region.length).toBe(2); // height
      expect(region[0].length).toBe(3); // width
      expect(region[1].length).toBe(3); // width
    });

    it("should composite cells in region", () => {
      scene.getLayer(LAYER_BG).setCell(0, 0, new Cell("A", 1, 0));
      scene.getLayer(LAYER_MID).setCell(1, 0, new Cell("B", 2, 1));
      scene.getLayer(LAYER_FG).setCell(2, 0, new Cell("C", 3, 2));

      const region = getVisibleRegion(0, 0, 3, 1, scene);

      expect(region[0][0].ch).toBe("A");
      expect(region[0][1].ch).toBe("B");
      expect(region[0][2].ch).toBe("C");
    });

    it("should handle region extending beyond bounds", () => {
      const region = getVisibleRegion(8, 3, 5, 5, scene);

      expect(region.length).toBe(5);
      expect(region[0].length).toBe(5);

      // Out of bounds cells should be default
      region.forEach((row) => {
        row.forEach((cell) => {
          expect(cell).toBeInstanceOf(Cell);
        });
      });
    });

    it("should handle empty scene", () => {
      const region = getVisibleRegion(0, 0, 2, 2, scene);

      region.forEach((row) => {
        row.forEach((cell) => {
          expect(cell.ch).toBe(" ");
        });
      });
    });
  });

  describe("exportScene", () => {
    it("should export entire scene", () => {
      scene = new Scene(3, 2);
      scene.getLayer(LAYER_MID).setCell(1, 1, new Cell("X", 3, 1));

      const exported = exportScene(scene);

      expect(exported.length).toBe(2); // height
      expect(exported[0].length).toBe(3); // width
      expect(exported[1][1].ch).toBe("X");
    });

    it("should return empty array for null scene", () => {
      const exported = exportScene(null);
      expect(exported).toEqual([]);
    });

    it("should composite all layers when exporting", () => {
      scene = new Scene(3, 2);
      scene.getLayer(LAYER_BG).setCell(0, 0, new Cell("A", 1, 0));
      scene.getLayer(LAYER_MID).setCell(0, 0, new Cell(" ", 2, 1));
      scene.getLayer(LAYER_FG).setCell(0, 0, new Cell("C", 3, -1));

      const exported = exportScene(scene);

      // Should get character from FG, background from MID
      expect(exported[0][0].ch).toBe("C");
      expect(exported[0][0].bg).toBe(1);
    });
  });

  describe("exportAsText", () => {
    it("should export scene as plain text", () => {
      scene = new Scene(3, 2);
      scene.getLayer(LAYER_MID).setCell(0, 0, new Cell("A", 1, 0));
      scene.getLayer(LAYER_MID).setCell(1, 0, new Cell("B", 2, 1));
      scene.getLayer(LAYER_MID).setCell(2, 0, new Cell("C", 3, 2));

      const text = exportAsText(scene);

      expect(text).toContain("ABC");
      expect(text.split("\n").length).toBe(2); // 2 rows
    });

    it("should return empty string for null scene", () => {
      const text = exportAsText(null);
      expect(text).toBe("");
    });

    it("should preserve spaces", () => {
      scene = new Scene(5, 1);
      scene.getLayer(LAYER_MID).setCell(0, 0, new Cell("A", 1, 0));
      scene.getLayer(LAYER_MID).setCell(4, 0, new Cell("B", 1, 0));

      const text = exportAsText(scene);

      expect(text).toBe("A   B");
    });

    it("should composite layers when exporting", () => {
      scene = new Scene(3, 1);
      scene.getLayer(LAYER_BG).setCell(0, 0, new Cell("A", 1, 0));
      scene.getLayer(LAYER_MID).setCell(1, 0, new Cell("B", 2, 1));
      scene.getLayer(LAYER_FG).setCell(2, 0, new Cell("C", 3, 2));

      const text = exportAsText(scene);

      expect(text).toBe("ABC");
    });

    it("should handle box-drawing characters", () => {
      scene = new Scene(3, 1);
      scene.getLayer(LAYER_MID).setCell(0, 0, new Cell("┌", 7, -1));
      scene.getLayer(LAYER_MID).setCell(1, 0, new Cell("─", 7, -1));
      scene.getLayer(LAYER_MID).setCell(2, 0, new Cell("┐", 7, -1));

      const text = exportAsText(scene);

      expect(text).toBe("┌─┐");
    });

    it("should handle multiple rows", () => {
      scene = new Scene(2, 3);
      scene.getLayer(LAYER_MID).setCell(0, 0, new Cell("A", 1, 0));
      scene.getLayer(LAYER_MID).setCell(0, 1, new Cell("B", 1, 0));
      scene.getLayer(LAYER_MID).setCell(0, 2, new Cell("C", 1, 0));

      const text = exportAsText(scene);
      const lines = text.split("\n");

      expect(lines.length).toBe(3);
      expect(lines[0][0]).toBe("A");
      expect(lines[1][0]).toBe("B");
      expect(lines[2][0]).toBe("C");
    });
  });

  describe("exportAsANSI", () => {
    it("should export scene with ANSI color codes", () => {
      scene = new Scene(3, 1);
      scene.getLayer(LAYER_MID).setCell(0, 0, new Cell("A", 1, 0));

      const ansi = exportAsANSI(scene);

      expect(ansi).toContain("\x1b["); // Should contain ANSI escape codes
      expect(ansi).toContain("A");
      expect(ansi).toContain("\x1b[0m"); // Reset at end of line
    });

    it("should return empty string for null scene", () => {
      const ansi = exportAsANSI(null);
      expect(ansi).toBe("");
    });

    it("should apply foreground color codes", () => {
      scene = new Scene(2, 1);
      scene.getLayer(LAYER_MID).setCell(0, 0, new Cell("A", 1, -1));
      scene.getLayer(LAYER_MID).setCell(1, 0, new Cell("B", 3, -1));

      const ansi = exportAsANSI(scene);

      // Should contain color code for red (31) and yellow (33)
      expect(ansi).toContain("\x1b[31m"); // Red
      expect(ansi).toContain("\x1b[33m"); // Yellow
    });

    it("should apply background color codes", () => {
      scene = new Scene(1, 1);
      scene.getLayer(LAYER_MID).setCell(0, 0, new Cell("A", 7, 1));

      const ansi = exportAsANSI(scene);

      // Should contain both fg and bg color codes in combination
      expect(ansi).toContain("\x1b[37;41m");
    });

    it("should handle transparent background", () => {
      scene = new Scene(1, 1);
      scene.getLayer(LAYER_MID).setCell(0, 0, new Cell("A", 7, -1));

      const ansi = exportAsANSI(scene);

      // Should only emit fg code since bg is transparent (optimization)
      expect(ansi).toContain("\x1b[37m");
    });

    it("should optimize color codes", () => {
      scene = new Scene(3, 1);
      scene.getLayer(LAYER_MID).setCell(0, 0, new Cell("A", 1, 0));
      scene.getLayer(LAYER_MID).setCell(1, 0, new Cell("B", 1, 0));
      scene.getLayer(LAYER_MID).setCell(2, 0, new Cell("C", 1, 0));

      const ansi = exportAsANSI(scene);

      // Should only emit color code once at the start (optimization working)
      const colorCodeCount = (ansi.match(/\x1b\[31;40m/g) || []).length;
      expect(colorCodeCount).toBe(1); // Only once at the start
    });

    it("should reset at end of each line", () => {
      scene = new Scene(1, 2);
      scene.getLayer(LAYER_MID).setCell(0, 0, new Cell("A", 1, 0));
      scene.getLayer(LAYER_MID).setCell(0, 1, new Cell("B", 1, 0));

      const ansi = exportAsANSI(scene);
      const lines = ansi.split("\n");

      lines.forEach((line) => {
        expect(line).toContain("\x1b[0m"); // Reset code at end
      });
    });

    it("should handle multiple rows", () => {
      scene = new Scene(2, 2);
      scene.getLayer(LAYER_MID).setCell(0, 0, new Cell("A", 1, 0));
      scene.getLayer(LAYER_MID).setCell(0, 1, new Cell("B", 2, 1));

      const ansi = exportAsANSI(scene);
      const lines = ansi.split("\n");

      expect(lines.length).toBe(2);
    });

    it("should composite layers before exporting", () => {
      scene = new Scene(3, 1);
      scene.getLayer(LAYER_BG).setCell(0, 0, new Cell("A", 1, 0));
      scene.getLayer(LAYER_MID).setCell(1, 0, new Cell("B", 2, 1));
      scene.getLayer(LAYER_FG).setCell(2, 0, new Cell("C", 3, 2));

      const ansi = exportAsANSI(scene);

      expect(ansi).toContain("A");
      expect(ansi).toContain("B");
      expect(ansi).toContain("C");
    });
  });

  describe("integration tests", () => {
    it("should handle complex multi-layer compositing", () => {
      scene = new Scene(5, 3);

      // Background: shading pattern
      for (let x = 0; x < 5; x++) {
        for (let y = 0; y < 3; y++) {
          scene.getLayer(LAYER_BG).setCell(x, y, new Cell("░", 0, -1));
        }
      }

      // Middle: box with transparent background
      scene.getLayer(LAYER_MID).setCell(0, 0, new Cell("┌", 7, -1));
      scene.getLayer(LAYER_MID).setCell(4, 0, new Cell("┐", 7, -1));
      scene.getLayer(LAYER_MID).setCell(0, 2, new Cell("└", 7, -1));
      scene.getLayer(LAYER_MID).setCell(4, 2, new Cell("┘", 7, -1));

      // Foreground: text with colored background
      scene.getLayer(LAYER_FG).setCell(2, 1, new Cell("X", 3, 1));

      // Test compositing at different positions
      const bgCell = getVisibleCell(1, 1, scene);
      expect(bgCell.ch).toBe("░"); // From BG layer

      const cornerCell = getVisibleCell(0, 0, scene);
      expect(cornerCell.ch).toBe("┌"); // From MID layer

      const centerCell = getVisibleCell(2, 1, scene);
      expect(centerCell.ch).toBe("X"); // From FG layer
      expect(centerCell.bg).toBe(1); // BG from FG layer
    });

    it("should handle text export with compositing", () => {
      scene = new Scene(5, 3);

      // Create a simple box
      scene.getLayer(LAYER_MID).setCell(0, 0, new Cell("┌", 7, -1));
      scene.getLayer(LAYER_MID).setCell(1, 0, new Cell("─", 7, -1));
      scene.getLayer(LAYER_MID).setCell(2, 0, new Cell("─", 7, -1));
      scene.getLayer(LAYER_MID).setCell(3, 0, new Cell("─", 7, -1));
      scene.getLayer(LAYER_MID).setCell(4, 0, new Cell("┐", 7, -1));

      const text = exportAsText(scene);
      const lines = text.split("\n");

      expect(lines[0]).toBe("┌───┐");
    });
  });
});
