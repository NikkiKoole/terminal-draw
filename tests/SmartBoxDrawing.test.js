/**
 * SmartBoxDrawing.test.js - Tests for SmartBoxDrawing utility
 */

import { describe, it, expect, beforeEach } from "vitest";
import { SmartBoxDrawing } from "../src/utils/SmartBoxDrawing.js";
import { Layer } from "../src/core/Layer.js";
import { Cell } from "../src/core/Cell.js";

describe("SmartBoxDrawing", () => {
  let smartBoxDrawing;
  let layer;

  beforeEach(() => {
    smartBoxDrawing = new SmartBoxDrawing();
    layer = new Layer("test", "Test Layer", 10, 10);
  });

  describe("constructor", () => {
    it("should initialize with correct character sets", () => {
      expect(smartBoxDrawing.singleChars.horizontal).toBe("─");
      expect(smartBoxDrawing.singleChars.vertical).toBe("│");
      expect(smartBoxDrawing.doubleChars.horizontal).toBe("═");
      expect(smartBoxDrawing.doubleChars.vertical).toBe("║");
    });

    it("should have all box-drawing characters in detection sets", () => {
      expect(smartBoxDrawing.allSingleChars.has("─")).toBe(true);
      expect(smartBoxDrawing.allSingleChars.has("┼")).toBe(true);
      expect(smartBoxDrawing.allDoubleChars.has("═")).toBe(true);
      expect(smartBoxDrawing.allDoubleChars.has("╬")).toBe(true);
    });
  });

  describe("character detection", () => {
    it("should identify box-drawing characters correctly", () => {
      expect(smartBoxDrawing.isBoxDrawingChar("─")).toBe(true);
      expect(smartBoxDrawing.isBoxDrawingChar("═")).toBe(true);
      expect(smartBoxDrawing.isBoxDrawingChar("┼")).toBe(true);
      expect(smartBoxDrawing.isBoxDrawingChar("╬")).toBe(true);
      expect(smartBoxDrawing.isBoxDrawingChar("A")).toBe(false);
      expect(smartBoxDrawing.isBoxDrawingChar(" ")).toBe(false);
    });

    it("should distinguish between single and double line characters", () => {
      expect(smartBoxDrawing.isSingleLineChar("─")).toBe(true);
      expect(smartBoxDrawing.isSingleLineChar("═")).toBe(false);
      expect(smartBoxDrawing.isDoubleLineChar("═")).toBe(true);
      expect(smartBoxDrawing.isDoubleLineChar("─")).toBe(false);
    });
  });

  describe("connection detection", () => {
    it("should detect horizontal connections correctly", () => {
      expect(smartBoxDrawing.canConnectHorizontally("─")).toBe(true);
      expect(smartBoxDrawing.canConnectHorizontally("┌")).toBe(true);
      expect(smartBoxDrawing.canConnectHorizontally("┼")).toBe(true);
      expect(smartBoxDrawing.canConnectHorizontally("│")).toBe(false);
    });

    it("should detect vertical connections correctly", () => {
      expect(smartBoxDrawing.canConnectVertically("│")).toBe(true);
      expect(smartBoxDrawing.canConnectVertically("┌")).toBe(true);
      expect(smartBoxDrawing.canConnectVertically("┼")).toBe(true);
      expect(smartBoxDrawing.canConnectVertically("─")).toBe(false);
    });

    it("should check neighbor connections", () => {
      expect(smartBoxDrawing.hasConnection("─", "horizontal")).toBe(true);
      expect(smartBoxDrawing.hasConnection("│", "vertical")).toBe(true);
      expect(smartBoxDrawing.hasConnection("A", "horizontal")).toBe(false);
      expect(smartBoxDrawing.hasConnection(null, "horizontal")).toBe(false);
    });
  });

  describe("smart character selection", () => {
    it("should select horizontal line for horizontal connections", () => {
      const neighbors = { north: null, south: null, east: "─", west: "─" };
      expect(smartBoxDrawing.getSmartCharacter(neighbors, "single")).toBe("─");
      expect(smartBoxDrawing.getSmartCharacter(neighbors, "double")).toBe("═");
    });

    it("should select vertical line for vertical connections", () => {
      const neighbors = { north: "│", south: "│", east: null, west: null };
      expect(smartBoxDrawing.getSmartCharacter(neighbors, "single")).toBe("│");
      expect(smartBoxDrawing.getSmartCharacter(neighbors, "double")).toBe("║");
    });

    it("should select cross for all four connections", () => {
      const neighbors = { north: "│", south: "│", east: "─", west: "─" };
      expect(smartBoxDrawing.getSmartCharacter(neighbors, "single")).toBe("┼");
      expect(smartBoxDrawing.getSmartCharacter(neighbors, "double")).toBe("╬");
    });

    it("should select appropriate T-junctions", () => {
      // Tee pointing left (├)
      let neighbors = { north: "│", south: "│", east: "─", west: null };
      expect(smartBoxDrawing.getSmartCharacter(neighbors, "single")).toBe("├");
      expect(smartBoxDrawing.getSmartCharacter(neighbors, "double")).toBe("╠");

      // Tee pointing right (┤)
      neighbors = { north: "│", south: "│", east: null, west: "─" };
      expect(smartBoxDrawing.getSmartCharacter(neighbors, "single")).toBe("┤");
      expect(smartBoxDrawing.getSmartCharacter(neighbors, "double")).toBe("╣");

      // Tee pointing down (┬)
      neighbors = { north: null, south: "│", east: "─", west: "─" };
      expect(smartBoxDrawing.getSmartCharacter(neighbors, "single")).toBe("┬");
      expect(smartBoxDrawing.getSmartCharacter(neighbors, "double")).toBe("╦");

      // Tee pointing up (┴)
      neighbors = { north: "│", south: null, east: "─", west: "─" };
      expect(smartBoxDrawing.getSmartCharacter(neighbors, "single")).toBe("┴");
      expect(smartBoxDrawing.getSmartCharacter(neighbors, "double")).toBe("╩");
    });

    it("should select appropriate corners", () => {
      // Top-left corner (┌)
      let neighbors = { north: null, south: "│", east: "─", west: null };
      expect(smartBoxDrawing.getSmartCharacter(neighbors, "single")).toBe("┌");
      expect(smartBoxDrawing.getSmartCharacter(neighbors, "double")).toBe("╔");

      // Top-right corner (┐)
      neighbors = { north: null, south: "│", east: null, west: "─" };
      expect(smartBoxDrawing.getSmartCharacter(neighbors, "single")).toBe("┐");
      expect(smartBoxDrawing.getSmartCharacter(neighbors, "double")).toBe("╗");

      // Bottom-left corner (└)
      neighbors = { north: "│", south: null, east: "─", west: null };
      expect(smartBoxDrawing.getSmartCharacter(neighbors, "single")).toBe("└");
      expect(smartBoxDrawing.getSmartCharacter(neighbors, "double")).toBe("╚");

      // Bottom-right corner (┘)
      neighbors = { north: "│", south: null, east: null, west: "─" };
      expect(smartBoxDrawing.getSmartCharacter(neighbors, "single")).toBe("┘");
      expect(smartBoxDrawing.getSmartCharacter(neighbors, "double")).toBe("╝");
    });

    it("should default to horizontal line when no connections", () => {
      const neighbors = { north: null, south: null, east: null, west: null };
      expect(smartBoxDrawing.getSmartCharacter(neighbors, "single")).toBe("─");
      expect(smartBoxDrawing.getSmartCharacter(neighbors, "double")).toBe("═");
    });
  });

  describe("neighbor retrieval", () => {
    beforeEach(() => {
      // Set up a test pattern:
      //   A
      // D X B
      //   C
      layer.setCell(5, 4, new Cell("A", 7, -1)); // North
      layer.setCell(6, 5, new Cell("B", 7, -1)); // East
      layer.setCell(5, 6, new Cell("C", 7, -1)); // South
      layer.setCell(4, 5, new Cell("D", 7, -1)); // West
    });

    it("should retrieve neighbors correctly", () => {
      const neighbors = smartBoxDrawing.getNeighbors(5, 5, layer, 10, 10);
      expect(neighbors.north).toBe("A");
      expect(neighbors.east).toBe("B");
      expect(neighbors.south).toBe("C");
      expect(neighbors.west).toBe("D");
    });

    it("should handle boundary conditions", () => {
      // Test at edge (0, 0)
      const neighbors = smartBoxDrawing.getNeighbors(0, 0, layer, 10, 10);
      expect(neighbors.north).toBe(null);
      expect(neighbors.west).toBe(null);
      expect(neighbors.east).toBe(" "); // Default empty cell
      expect(neighbors.south).toBe(" "); // Default empty cell
    });

    it("should handle out-of-bounds coordinates", () => {
      const neighbors = smartBoxDrawing.getNeighbors(9, 9, layer, 10, 10);
      expect(neighbors.east).toBe(null); // Out of bounds
      expect(neighbors.south).toBe(null); // Out of bounds
    });
  });

  describe("neighbor update detection", () => {
    beforeEach(() => {
      // Create a horizontal line that will need junction updates
      layer.setCell(4, 5, new Cell("─", 7, -1)); // West of target
      layer.setCell(5, 5, new Cell("─", 7, -1)); // Target position
      layer.setCell(6, 5, new Cell("─", 7, -1)); // East of target
    });

    it("should identify neighbors that need updating", () => {
      // Place a vertical line that intersects the horizontal line
      layer.setCell(5, 4, new Cell("│", 7, -1)); // North of target

      const neighborsToUpdate = smartBoxDrawing.getNeighborsToUpdate(
        5,
        4, // Position of newly placed vertical line
        layer,
        10,
        10,
      );

      // Should find the horizontal line that needs to become a T-junction
      const southNeighborUpdate = neighborsToUpdate.find(
        (n) => n.x === 5 && n.y === 5,
      );
      expect(southNeighborUpdate).toBeDefined();
      expect(southNeighborUpdate.originalChar).toBe("─");
      expect(southNeighborUpdate.char).toBe("┴"); // Should become T-junction
    });

    it("should not update non-box-drawing characters", () => {
      // Add a regular character that shouldn't be updated
      layer.setCell(6, 5, new Cell("A", 7, -1));

      const neighborsToUpdate = smartBoxDrawing.getNeighborsToUpdate(
        5,
        5,
        layer,
        10,
        10,
      );

      // Should not include the regular character
      const eastNeighborUpdate = neighborsToUpdate.find(
        (n) => n.x === 6 && n.y === 5,
      );
      expect(eastNeighborUpdate).toBeUndefined();
    });

    it("should not update neighbors that don't need changes", () => {
      // Set up a scenario where no updates are needed
      // Place isolated box characters that won't form new junctions
      layer.setCell(3, 3, new Cell("─", 7, -1)); // Isolated horizontal line
      layer.setCell(7, 7, new Cell("│", 7, -1)); // Isolated vertical line

      // Place a character that won't connect to anything
      const neighborsToUpdate = smartBoxDrawing.getNeighborsToUpdate(
        5,
        5,
        layer,
        10,
        10,
      );

      // No neighbors should need updating since there are no adjacent connections
      expect(neighborsToUpdate).toHaveLength(0);
    });
  });

  describe("integration scenarios", () => {
    it("should handle drawing a cross pattern", () => {
      // Draw horizontal line first: ─ ─ ─
      layer.setCell(4, 5, new Cell("─", 7, -1));
      layer.setCell(5, 5, new Cell("─", 7, -1));
      layer.setCell(6, 5, new Cell("─", 7, -1));

      // Now we want to place a vertical line at (5, 4) which should make (5, 5) a T-junction
      const neighbors = {
        north: null, // No connection above the target position
        south: "│", // Vertical connection below
        east: "─", // Horizontal connection to the right
        west: "─", // Horizontal connection to the left
      };

      const smartChar = smartBoxDrawing.getSmartCharacter(neighbors, "single");
      expect(smartChar).toBe("┬"); // Should be a T-junction pointing down

      // Test placing at the intersection
      layer.setCell(5, 4, new Cell("│", 7, -1)); // North
      layer.setCell(5, 6, new Cell("│", 7, -1)); // South

      const finalNeighbors = smartBoxDrawing.getNeighbors(5, 5, layer, 10, 10);
      const finalChar = smartBoxDrawing.getSmartCharacter(
        finalNeighbors,
        "single",
      );
      expect(finalChar).toBe("┼"); // Should be a cross
    });

    it("should handle mixed single and double line detection", () => {
      // Place single line characters
      layer.setCell(5, 4, new Cell("│", 7, -1)); // Single vertical
      layer.setCell(4, 5, new Cell("═", 7, -1)); // Double horizontal

      const neighbors = smartBoxDrawing.getNeighbors(5, 5, layer, 10, 10);

      // Should detect connections regardless of line type
      expect(smartBoxDrawing.hasConnection(neighbors.north, "vertical")).toBe(
        true,
      );
      expect(smartBoxDrawing.hasConnection(neighbors.west, "horizontal")).toBe(
        true,
      );
    });

    it("should preserve color information in neighbor updates", () => {
      // Create a colored box-drawing character
      layer.setCell(4, 5, new Cell("│", 3, 2)); // Colored character

      const neighborsToUpdate = smartBoxDrawing.getNeighborsToUpdate(
        5,
        5,
        layer,
        10,
        10,
      );

      if (neighborsToUpdate.length > 0) {
        const update = neighborsToUpdate[0];
        expect(update.fg).toBe(3); // Should preserve foreground color
        expect(update.bg).toBe(2); // Should preserve background color
      }
    });
  });

  describe("edge cases", () => {
    it("should handle empty layer", () => {
      const neighbors = smartBoxDrawing.getNeighbors(5, 5, layer, 10, 10);
      const smartChar = smartBoxDrawing.getSmartCharacter(neighbors, "single");
      expect(smartChar).toBe("─"); // Should default to horizontal
    });

    it("should handle single cell placement", () => {
      const neighborsToUpdate = smartBoxDrawing.getNeighborsToUpdate(
        0,
        0,
        layer,
        10,
        10,
      );
      expect(neighborsToUpdate).toHaveLength(0); // No neighbors to update
    });

    it("should handle invalid coordinates gracefully", () => {
      expect(() => {
        smartBoxDrawing.getNeighbors(-1, -1, layer, 10, 10);
      }).not.toThrow();

      expect(() => {
        smartBoxDrawing.getNeighborsToUpdate(15, 15, layer, 10, 10);
      }).not.toThrow();
    });

    it("should handle null/undefined characters", () => {
      const neighbors = {
        north: null,
        south: undefined,
        east: "",
        west: "─",
      };

      expect(() => {
        smartBoxDrawing.getSmartCharacter(neighbors, "single");
      }).not.toThrow();
    });
  });

  describe("mixed single/double line intersections", () => {
    it("should create mixed cross when single horizontal crosses double vertical", () => {
      // Create neighbors around position (5,5) - double vertical, single horizontal
      layer.setCell(5, 4, new Cell("║", 7, -1)); // North
      layer.setCell(5, 6, new Cell("║", 7, -1)); // South
      layer.setCell(4, 5, new Cell("─", 7, -1)); // West
      layer.setCell(6, 5, new Cell("─", 7, -1)); // East
      // Note: (5,5) is empty - we're checking what character should go there

      const neighbors = smartBoxDrawing.getNeighbors(5, 5, layer, 10, 10);

      // Should return mixed character (single horizontal, double vertical)
      const char = smartBoxDrawing.getSmartCharacter(neighbors, "single");
      expect(char).toBe("╫"); // Mixed cross: single horizontal, double vertical
    });

    it("should create mixed cross when double horizontal crosses single vertical", () => {
      // Create neighbors around position (5,5) - single vertical, double horizontal
      layer.setCell(5, 4, new Cell("│", 7, -1)); // North
      layer.setCell(5, 6, new Cell("│", 7, -1)); // South
      layer.setCell(4, 5, new Cell("═", 7, -1)); // West
      layer.setCell(6, 5, new Cell("═", 7, -1)); // East

      const neighbors = smartBoxDrawing.getNeighbors(5, 5, layer, 10, 10);
      const char = smartBoxDrawing.getSmartCharacter(neighbors, "double");
      expect(char).toBe("╪"); // Mixed cross: double horizontal, single vertical
    });

    it("should create mixed T-junction when single horizontal meets double vertical from top", () => {
      // Create neighbors: double vertical from north, single horizontal arms
      layer.setCell(5, 4, new Cell("║", 7, -1)); // North
      layer.setCell(4, 5, new Cell("─", 7, -1)); // West
      layer.setCell(6, 5, new Cell("─", 7, -1)); // East
      // South is empty, so this is a T-junction pointing down

      const neighbors = smartBoxDrawing.getNeighbors(5, 5, layer, 10, 10);
      const char = smartBoxDrawing.getSmartCharacter(neighbors, "single");
      expect(char).toBe("╨"); // Tee bottom: double vertical from top, single horizontal arms
    });

    it("should create mixed T-junction when double horizontal meets single vertical from left", () => {
      // Single vertical connections
      layer.setCell(5, 4, new Cell("│", 7, -1)); // North
      layer.setCell(5, 6, new Cell("│", 7, -1)); // South

      // Double horizontal from west
      layer.setCell(4, 5, new Cell("═", 7, -1)); // West

      const neighbors = smartBoxDrawing.getNeighbors(5, 5, layer, 10, 10);
      const char = smartBoxDrawing.getSmartCharacter(neighbors, "double");
      expect(char).toBe("╡"); // Tee right: double horizontal from left, single vertical
    });

    it("should create mixed T-junction when double horizontal meets single vertical from right", () => {
      // Single vertical connections
      layer.setCell(5, 4, new Cell("│", 7, -1)); // North
      layer.setCell(5, 6, new Cell("│", 7, -1)); // South

      // Double horizontal from east
      layer.setCell(6, 5, new Cell("═", 7, -1)); // East

      const neighbors = smartBoxDrawing.getNeighbors(5, 5, layer, 10, 10);
      const char = smartBoxDrawing.getSmartCharacter(neighbors, "double");
      expect(char).toBe("╞"); // Tee left: double horizontal from right, single vertical
    });
  });

  describe("bitwise tileset algorithm (alternative implementation)", () => {
    it("should produce correct result for simple cross", () => {
      // Create a cross pattern
      layer.setCell(5, 4, new Cell("│", 7, -1)); // North
      layer.setCell(5, 6, new Cell("│", 7, -1)); // South
      layer.setCell(4, 5, new Cell("─", 7, -1)); // West
      layer.setCell(6, 5, new Cell("─", 7, -1)); // East

      const neighbors = smartBoxDrawing.getNeighbors(5, 5, layer, 10, 10);
      const result = smartBoxDrawing.getSmartCharacter(neighbors, "single");

      expect(result).toBe("┼");
    });

    it("should produce correct result for mixed intersections", () => {
      // Single horizontal, double vertical
      layer.setCell(5, 4, new Cell("║", 7, -1)); // North
      layer.setCell(5, 6, new Cell("║", 7, -1)); // South
      layer.setCell(4, 5, new Cell("─", 7, -1)); // West
      layer.setCell(6, 5, new Cell("─", 7, -1)); // East

      const neighbors = smartBoxDrawing.getNeighbors(5, 5, layer, 10, 10);
      const result = smartBoxDrawing.getSmartCharacter(neighbors, "single");

      expect(result).toBe("╫");
    });

    it("should calculate correct bitmask for all directions", () => {
      // Test all 16 possible bitmask values
      const testCases = [
        { mask: 0, north: null, south: null, east: null, west: null },
        { mask: 1, north: "│", south: null, east: null, west: null },
        { mask: 2, north: null, south: "│", east: null, west: null },
        { mask: 3, north: "│", south: "│", east: null, west: null },
        { mask: 4, north: null, south: null, east: "─", west: null },
        { mask: 5, north: "│", south: null, east: "─", west: null },
        { mask: 6, north: null, south: "│", east: "─", west: null },
        { mask: 7, north: "│", south: "│", east: "─", west: null },
        { mask: 8, north: null, south: null, east: null, west: "─" },
        { mask: 9, north: "│", south: null, east: null, west: "─" },
        { mask: 10, north: null, south: "│", east: null, west: "─" },
        { mask: 11, north: "│", south: "│", east: null, west: "─" },
        { mask: 12, north: null, south: null, east: "─", west: "─" },
        { mask: 13, north: "│", south: null, east: "─", west: "─" },
        { mask: 14, north: null, south: "│", east: "─", west: "─" },
        { mask: 15, north: "│", south: "│", east: "─", west: "─" },
      ];

      testCases.forEach((testCase) => {
        const neighbors = {
          north: testCase.north,
          south: testCase.south,
          east: testCase.east,
          west: testCase.west,
        };
        const mask = smartBoxDrawing._calculateBitmask(neighbors);
        expect(mask).toBe(testCase.mask);
      });
    });

    it("should handle T-junctions with bitmask correctly", () => {
      // Left tee (├): north + south + east = mask 7
      layer.setCell(5, 4, new Cell("│", 7, -1));
      layer.setCell(5, 6, new Cell("│", 7, -1));
      layer.setCell(6, 5, new Cell("─", 7, -1));

      const neighbors = smartBoxDrawing.getNeighbors(5, 5, layer, 10, 10);
      const result = smartBoxDrawing.getSmartCharacter(neighbors, "single");
      expect(result).toBe("├");
    });

    it("should handle corners with bitmask correctly", () => {
      // Top-left corner (┌): south + east = mask 6
      layer.setCell(5, 6, new Cell("│", 7, -1));
      layer.setCell(6, 5, new Cell("─", 7, -1));

      const neighbors = smartBoxDrawing.getNeighbors(5, 5, layer, 10, 10);
      const result = smartBoxDrawing.getSmartCharacter(neighbors, "single");
      expect(result).toBe("┌");
    });
  });

  describe("8-bit bitmask comprehensive tests", () => {
    it("should draw single line when mode=single with no neighbors", () => {
      const neighbors = { north: null, south: null, east: null, west: null };
      const result = smartBoxDrawing.getSmartCharacter(neighbors, "single");
      expect(result).toBe("─");
    });

    it("should draw double line when mode=double with no neighbors", () => {
      const neighbors = { north: null, south: null, east: null, west: null };
      const result = smartBoxDrawing.getSmartCharacter(neighbors, "double");
      expect(result).toBe("═");
    });

    it("should extend single lines when drawing single with single neighbors", () => {
      const neighbors = { north: null, south: null, east: "─", west: "─" };
      const result = smartBoxDrawing.getSmartCharacter(neighbors, "single");
      expect(result).toBe("─");
    });

    it("should convert to double when drawing double with single neighbors", () => {
      const neighbors = { north: null, south: null, east: "─", west: "─" };
      const result = smartBoxDrawing.getSmartCharacter(neighbors, "double");
      expect(result).toBe("═");
    });

    it("should extend double lines when drawing double with double neighbors", () => {
      const neighbors = { north: null, south: null, east: "═", west: "═" };
      const result = smartBoxDrawing.getSmartCharacter(neighbors, "double");
      expect(result).toBe("═");
    });

    it("should convert to single when drawing single with double neighbors", () => {
      const neighbors = { north: null, south: null, east: "═", west: "═" };
      const result = smartBoxDrawing.getSmartCharacter(neighbors, "single");
      expect(result).toBe("─");
    });

    it("should create mixed cross when drawing double through single vertical", () => {
      const neighbors = { north: "│", south: "│", east: "═", west: null };
      const result = smartBoxDrawing.getSmartCharacter(neighbors, "double");
      expect(result).toBe("╞"); // Mixed: double horizontal + single vertical, left tee
    });

    it("should create mixed cross when drawing single through double vertical", () => {
      const neighbors = { north: "║", south: "║", east: "─", west: null };
      const result = smartBoxDrawing.getSmartCharacter(neighbors, "single");
      expect(result).toBe("╟"); // Mixed: single horizontal + double vertical, left tee
    });

    it("should handle actual painting scenario - brush double over existing single vertical", () => {
      // This simulates: single vertical line exists at a cell, we brush double horizontal through it
      layer.setCell(5, 4, new Cell("│", 7, -1)); // North of target
      layer.setCell(5, 6, new Cell("│", 7, -1)); // South of target
      layer.setCell(4, 5, new Cell("═", 7, -1)); // West of target (we're drawing double)
      // Note: the cell at 5,5 has existing "│" which the brush should detect separately

      const neighbors = smartBoxDrawing.getNeighbors(5, 5, layer, 10, 10);
      // Neighbors: N=│, S=│, E=null, W=═
      const result = smartBoxDrawing.getSmartCharacter(neighbors, "double");
      // We have single vertical (N+S) and double horizontal (W), should give mixed char
      expect(result).toBe("╡"); // Double horizontal + single vertical, right tee
    });
  });
});
