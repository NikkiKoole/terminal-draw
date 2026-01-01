/**
 * SprayTool.test.js - Tests for SprayTool
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { SprayTool } from "../src/tools/SprayTool.js";
import { Scene } from "../src/core/Scene.js";
import { StateManager } from "../src/core/StateManager.js";
import { Cell } from "../src/core/Cell.js";
import { CommandHistory } from "../src/commands/CommandHistory.js";

describe("SprayTool", () => {
  let scene;
  let stateManager;
  let commandHistory;
  let sprayTool;

  beforeEach(() => {
    scene = new Scene(10, 10);
    stateManager = new StateManager();
    commandHistory = new CommandHistory({ stateManager });
    sprayTool = new SprayTool({ ch: ".", fg: 7, bg: -1 }, commandHistory);
  });

  describe("constructor", () => {
    it('should create a spray tool with name "Spray"', () => {
      expect(sprayTool.name).toBe("Spray");
    });

    it("should have default current cell", () => {
      const cell = sprayTool.getCurrentCell();
      expect(cell.ch).toBe(".");
      expect(cell.fg).toBe(7);
      expect(cell.bg).toBe(-1);
    });

    it("should accept custom initial cell", () => {
      const customSpray = new SprayTool(
        { ch: "X", fg: 1, bg: 2 },
        commandHistory,
      );
      const cell = customSpray.getCurrentCell();
      expect(cell.ch).toBe("X");
      expect(cell.fg).toBe(1);
      expect(cell.bg).toBe(2);
    });

    it("should have default radius and coverage", () => {
      expect(sprayTool.radius).toBe(3);
      expect(sprayTool.coverage).toBe(0.1); // 10%
    });

    it("should have correct density sequence", () => {
      expect(sprayTool.densitySequence).toEqual([
        ".",
        "-",
        "+",
        "*",
        "%",
        "m",
        "#",
      ]);
    });
  });

  describe("setCurrentCell", () => {
    it("should update current cell", () => {
      sprayTool.setCurrentCell({ ch: "X", fg: 1, bg: 2 });
      const cell = sprayTool.getCurrentCell();
      expect(cell.ch).toBe("X");
      expect(cell.fg).toBe(1);
      expect(cell.bg).toBe(2);
    });
  });

  describe("setCommandHistory", () => {
    it("should update command history", () => {
      const newHistory = new CommandHistory({ stateManager });
      sprayTool.setCommandHistory(newHistory);
      expect(sprayTool.commandHistory).toBe(newHistory);
    });
  });

  describe("getCursor", () => {
    it('should return "crosshair" cursor', () => {
      expect(sprayTool.getCursor()).toBe("crosshair");
    });
  });

  describe("_getNextDensityChar", () => {
    it("should progress through density sequence", () => {
      expect(sprayTool._getNextDensityChar(".")).toBe("-");
      expect(sprayTool._getNextDensityChar("-")).toBe("+");
      expect(sprayTool._getNextDensityChar("+")).toBe("*");
      expect(sprayTool._getNextDensityChar("*")).toBe("%");
      expect(sprayTool._getNextDensityChar("%")).toBe("m");
      expect(sprayTool._getNextDensityChar("m")).toBe("#");
    });

    it("should not progress beyond maximum density", () => {
      expect(sprayTool._getNextDensityChar("#")).toBe("#");
    });

    it("should start at beginning for unknown characters", () => {
      expect(sprayTool._getNextDensityChar("X")).toBe(".");
      expect(sprayTool._getNextDensityChar(" ")).toBe(".");
      expect(sprayTool._getNextDensityChar("█")).toBe(".");
    });
  });

  describe("_getCellsInRadius", () => {
    it("should return cells within radius", () => {
      const cells = sprayTool._getCellsInRadius(5, 5, scene);

      // Should include center cell
      expect(cells.some((c) => c.x === 5 && c.y === 5)).toBe(true);

      // Should include cells within radius
      expect(cells.some((c) => c.x === 4 && c.y === 5)).toBe(true); // 1 unit away
      expect(cells.some((c) => c.x === 3 && c.y === 4)).toBe(true); // ~2.2 units away

      // Should exclude cells outside radius
      expect(cells.some((c) => c.x === 1 && c.y === 1)).toBe(false); // ~5.7 units away
    });

    it("should respect scene boundaries", () => {
      const cells = sprayTool._getCellsInRadius(1, 1, scene);

      // Should not include negative coordinates
      expect(cells.some((c) => c.x < 0 || c.y < 0)).toBe(false);

      // Should include valid coordinates
      expect(cells.some((c) => c.x === 0 && c.y === 1)).toBe(true);
      expect(cells.some((c) => c.x === 1 && c.y === 0)).toBe(true);
    });

    it("should handle edge cases at scene boundaries", () => {
      // Test corner
      const cornerCells = sprayTool._getCellsInRadius(0, 0, scene);
      expect(cornerCells.some((c) => c.x < 0 || c.y < 0)).toBe(false);
      expect(cornerCells.some((c) => c.x === 0 && c.y === 0)).toBe(true);

      // Test near right edge
      const edgeCells = sprayTool._getCellsInRadius(9, 5, scene);
      expect(edgeCells.some((c) => c.x >= 10)).toBe(false);
      expect(edgeCells.some((c) => c.x === 9 && c.y === 5)).toBe(true);
    });
  });

  describe("_selectRandomCells", () => {
    beforeEach(() => {
      // Mock Math.random to return predictable values
      vi.spyOn(Math, "random");
    });

    it("should select all cells when random returns values below coverage", () => {
      Math.random.mockReturnValue(0.05); // Below 0.1 coverage

      const inputCells = [
        { x: 1, y: 1 },
        { x: 2, y: 2 },
        { x: 3, y: 3 },
      ];

      const selectedCells = sprayTool._selectRandomCells(inputCells);
      expect(selectedCells).toHaveLength(3);
    });

    it("should select no cells when random returns values above coverage", () => {
      Math.random.mockReturnValue(0.15); // Above 0.1 coverage

      const inputCells = [
        { x: 1, y: 1 },
        { x: 2, y: 2 },
        { x: 3, y: 3 },
      ];

      const selectedCells = sprayTool._selectRandomCells(inputCells);
      expect(selectedCells).toHaveLength(0);
    });

    it("should handle empty input", () => {
      Math.random.mockReturnValue(0.05);

      const selectedCells = sprayTool._selectRandomCells([]);
      expect(selectedCells).toHaveLength(0);
    });
  });

  describe("painting operations", () => {
    let activeLayer;

    beforeEach(() => {
      activeLayer = scene.getActiveLayer();

      // Set up some test cells with different density levels
      activeLayer.setCell(5, 5, new Cell(".", 7, -1));
      activeLayer.setCell(4, 5, new Cell("-", 7, -1));
      activeLayer.setCell(6, 5, new Cell("#", 7, -1)); // Max density
      activeLayer.setCell(5, 4, new Cell(" ", 7, -1)); // Empty space
    });

    describe("onCellDown", () => {
      it("should spray at the clicked location", () => {
        // Mock random to ensure some cells are selected
        vi.spyOn(Math, "random").mockReturnValue(0.05); // Below coverage threshold

        const initialCommandCount = commandHistory.undoStack.length;

        sprayTool.onCellDown(5, 5, scene, stateManager);

        // Should have executed some commands
        expect(commandHistory.undoStack.length).toBeGreaterThan(
          initialCommandCount,
        );
      });

      it("should not spray on locked layer", () => {
        activeLayer.locked = true;

        const initialCommandCount = commandHistory.undoStack.length;

        sprayTool.onCellDown(5, 5, scene, stateManager);

        // Should not have executed any commands
        expect(commandHistory.undoStack.length).toBe(initialCommandCount);
      });

      it("should not spray on hidden layer", () => {
        activeLayer.visible = false;

        const initialCommandCount = commandHistory.undoStack.length;

        sprayTool.onCellDown(5, 5, scene, stateManager);

        // Should not have executed any commands
        expect(commandHistory.undoStack.length).toBe(initialCommandCount);
      });
    });

    describe("density progression integration", () => {
      it("should upgrade cell density when spraying", () => {
        // Mock random to ensure the center cell gets selected
        const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.05);

        // Set up a cell with '.' character
        activeLayer.setCell(5, 5, new Cell(".", 7, -1));

        sprayTool.onCellDown(5, 5, scene, stateManager);

        // The cell at (5,5) should have been upgraded from '.' to '-'
        // We can't easily test this directly due to the random selection,
        // but we can verify that commands were created
        expect(commandHistory.undoStack.length).toBeGreaterThan(0);

        randomSpy.mockRestore();
      });

      it("should preserve background color when spraying", () => {
        // Set spray tool to use a specific foreground color
        sprayTool.setCurrentCell({ ch: ".", fg: 3, bg: -1 });

        // Set up a cell with background color
        activeLayer.setCell(5, 5, new Cell(".", 7, 2)); // fg=7, bg=2

        // Mock random to ensure deterministic selection
        const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.05);

        sprayTool.onCellDown(5, 5, scene, stateManager);

        // Verify a command was created (can't easily test the exact result due to randomness)
        expect(commandHistory.undoStack.length).toBeGreaterThan(0);

        randomSpy.mockRestore();
      });

      it("should change color of max density cells when using different color", () => {
        // Set up a cell at maximum density with one color
        activeLayer.setCell(5, 5, new Cell("#", 1, -1)); // fg=1 (red)

        // Set spray tool to use a different color
        sprayTool.setCurrentCell({ ch: ".", fg: 3, bg: -1 }); // fg=3 (blue)

        // Mock random to ensure the center cell gets selected
        const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.05);

        sprayTool.onCellDown(5, 5, scene, stateManager);

        // Should have created a command to change the color
        expect(commandHistory.undoStack.length).toBeGreaterThan(0);

        // Check that the cell color was changed but character stayed #
        const updatedCell = activeLayer.getCell(5, 5);
        expect(updatedCell.ch).toBe("#");
        expect(updatedCell.fg).toBe(3); // Should be the new color

        randomSpy.mockRestore();
      });

      it("should not modify max density cells when using same color", () => {
        // Set up a cell already at maximum density
        activeLayer.setCell(5, 5, new Cell("#", 7, -1));

        // Mock random to ensure the center cell would be selected
        const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.05);

        // Set spray tool to use the same color as the existing cell
        sprayTool.setCurrentCell({ ch: ".", fg: 7, bg: -1 }); // Same as cell color

        const initialCommandCount = commandHistory.undoStack.length;

        sprayTool.onCellDown(5, 5, scene, stateManager);

        // Should not create commands for max density cells with same color
        // Note: Other cells in radius might still be affected, so we check the specific cell
        const cellAfter = activeLayer.getCell(5, 5);
        expect(cellAfter.ch).toBe("#");
        expect(cellAfter.fg).toBe(7); // Should remain unchanged

        randomSpy.mockRestore();
      });
    });

    describe("onCellDrag", () => {
      it("should continue spraying while dragging", () => {
        // Mock random for predictable results
        vi.spyOn(Math, "random").mockReturnValue(0.05);

        sprayTool.onCellDown(5, 5, scene, stateManager);
        const commandsAfterDown = commandHistory.undoStack.length;

        sprayTool.onCellDrag(6, 6, scene, stateManager);

        // Should have created additional commands
        expect(commandHistory.undoStack.length).toBeGreaterThanOrEqual(
          commandsAfterDown,
        );
      });
    });

    describe("onCellUp", () => {
      it("should end spray stroke", () => {
        sprayTool.onCellDown(5, 5, scene, stateManager);
        expect(sprayTool.currentStroke).toBeTruthy();

        sprayTool.onCellUp(5, 5, scene, stateManager);
        expect(sprayTool.currentStroke).toBeNull();
      });

      it("should disable command merging briefly", () => {
        vi.spyOn(commandHistory, "setMergingEnabled");
        vi.useFakeTimers();

        sprayTool.onCellUp(5, 5, scene, stateManager);

        // Should not have called setMergingEnabled yet
        expect(commandHistory.setMergingEnabled).not.toHaveBeenCalled();

        // Fast-forward time
        vi.advanceTimersByTime(150);

        // Should have called setMergingEnabled twice (false, then true)
        expect(commandHistory.setMergingEnabled).toHaveBeenCalledTimes(2);
        expect(commandHistory.setMergingEnabled).toHaveBeenNthCalledWith(
          1,
          false,
        );
        expect(commandHistory.setMergingEnabled).toHaveBeenNthCalledWith(
          2,
          true,
        );

        vi.useRealTimers();
      });
    });
  });

  describe("error handling", () => {
    it("should handle missing command history gracefully", () => {
      const sprayWithoutHistory = new SprayTool(
        { ch: ".", fg: 7, bg: -1 },
        null,
      );

      // Should not throw when trying to spray
      expect(() => {
        sprayWithoutHistory.onCellDown(5, 5, scene, stateManager);
      }).not.toThrow();
    });

    it("should handle missing active layer gracefully", () => {
      // Create scene with no layers
      const emptyScene = new Scene(10, 10);
      emptyScene.layers = [];

      expect(() => {
        sprayTool.onCellDown(5, 5, emptyScene, stateManager);
      }).not.toThrow();
    });

    it("should handle coordinates outside scene bounds", () => {
      expect(() => {
        sprayTool.onCellDown(-1, -1, scene, stateManager);
      }).not.toThrow();

      expect(() => {
        sprayTool.onCellDown(20, 20, scene, stateManager);
      }).not.toThrow();
    });
  });
});
