/**
 * Tests for CellCommand class
 */

import { describe, it, expect, beforeEach, vi } from "bun:test";
import { CellCommand } from "../../src/commands/CellCommand.js";
import { Command } from "../../src/commands/Command.js";

// Mock Layer class for testing
class MockLayer {
  constructor(width = 10, height = 10) {
    this.width = width;
    this.height = height;
    this.cells = new Array(width * height).fill(null).map(() => ({
      ch: " ",
      fg: 7,
      bg: -1,
    }));
    this.setCellCalls = [];
  }

  setCell(x, y, cell) {
    const index = y * this.width + x;
    this.setCellCalls.push({ index, cell: { ...cell } });
    if (index >= 0 && index < this.cells.length) {
      this.cells[index] = { ...cell };
    }
  }

  getCell(x, y) {
    const index = y * this.width + x;
    return this.cells[index] ? { ...this.cells[index] } : null;
  }

  clearSetCellCalls() {
    this.setCellCalls.length = 0;
  }
}

describe("CellCommand", () => {
  let layer;
  let scene;
  let beforeCell;
  let afterCell;
  let change;

  beforeEach(() => {
    layer = new MockLayer();
    scene = { w: 10, h: 10 }; // Mock scene with width and height
    beforeCell = { ch: " ", fg: 7, bg: -1 };
    afterCell = { ch: "A", fg: 2, bg: 0 };
    change = { index: 5, before: beforeCell, after: afterCell };
  });

  describe("constructor", () => {
    it("should create command with valid options", () => {
      const command = new CellCommand({
        description: "Paint cell",
        layer: layer,
        changes: [change],
        tool: "brush",
        scene: scene,
      });

      expect(command.description).toBe("Paint cell");
      expect(command.layer).toBe(layer);
      expect(command.changes).toEqual([change]);
      expect(command.tool).toBe("brush");
      expect(command).toBeInstanceOf(Command);
    });

    it("should throw error for missing description", () => {
      expect(
        () =>
          new CellCommand({
            layer: layer,
            changes: [change],
          }),
      ).toThrow("CellCommand description is required");
    });

    it("should throw error for missing layer", () => {
      expect(
        () =>
          new CellCommand({
            description: "Test",
            changes: [change],
          }),
      ).toThrow("CellCommand layer is required");
    });

    it("should throw error for missing changes", () => {
      expect(
        () =>
          new CellCommand({
            description: "Test",
            layer: layer,
          }),
      ).toThrow("CellCommand changes array is required");
    });

    it("should throw error for invalid changes array", () => {
      expect(
        () =>
          new CellCommand({
            description: "Test",
            layer: layer,
            changes: "not an array",
          }),
      ).toThrow("CellCommand changes array is required");
    });

    it("should validate change structure", () => {
      expect(
        () =>
          new CellCommand({
            description: "Test",
            layer: layer,
            changes: [{ index: "invalid" }],
            scene: scene,
          }),
      ).toThrow("Change 0: index must be a number");

      expect(
        () =>
          new CellCommand({
            description: "Test",
            layer: layer,
            changes: [{ index: 5, before: null, after: afterCell }],
            scene: scene,
          }),
      ).toThrow("Change 0: must have before and after states");
    });

    it("should default tool to unknown", () => {
      const command = new CellCommand({
        description: "Test",
        layer: layer,
        changes: [change],
        scene: scene,
      });

      expect(command.tool).toBe("unknown");
    });
  });

  describe("execute", () => {
    it("should apply all cell changes to layer", () => {
      const changes = [
        { index: 0, before: beforeCell, after: { ch: "A", fg: 1, bg: 0 } },
        { index: 1, before: beforeCell, after: { ch: "B", fg: 2, bg: 1 } },
        { index: 2, before: beforeCell, after: { ch: "C", fg: 3, bg: 2 } },
      ];

      const command = new CellCommand({
        description: "Paint multiple cells",
        layer: layer,
        changes: changes,
        tool: "brush",
        scene: scene,
      });

      command.execute();

      expect(command.executed).toBe(true);
      expect(layer.setCellCalls).toHaveLength(3);
      expect(layer.setCellCalls[0]).toEqual({
        index: 0,
        cell: { ch: "A", fg: 1, bg: 0 },
      });
      expect(layer.setCellCalls[1]).toEqual({
        index: 1,
        cell: { ch: "B", fg: 2, bg: 1 },
      });
      expect(layer.setCellCalls[2]).toEqual({
        index: 2,
        cell: { ch: "C", fg: 3, bg: 2 },
      });
    });

    it("should be idempotent", () => {
      const command = new CellCommand({
        description: "Test",
        layer: layer,
        changes: [change],
        scene: scene,
      });

      command.execute();
      layer.clearSetCellCalls();
      command.execute();

      expect(layer.setCellCalls).toHaveLength(1); // Called again
    });
  });

  describe("undo", () => {
    it("should restore previous cell states", () => {
      const changes = [
        {
          index: 0,
          before: { ch: "X", fg: 5, bg: 3 },
          after: { ch: "A", fg: 1, bg: 0 },
        },
        {
          index: 1,
          before: { ch: "Y", fg: 6, bg: 4 },
          after: { ch: "B", fg: 2, bg: 1 },
        },
      ];

      const command = new CellCommand({
        description: "Test",
        layer: layer,
        changes: changes,
        scene: scene,
      });

      command.undo();

      expect(layer.setCellCalls).toHaveLength(2);
      expect(layer.setCellCalls[0]).toEqual({
        index: 0,
        cell: { ch: "X", fg: 5, bg: 3 },
      });
      expect(layer.setCellCalls[1]).toEqual({
        index: 1,
        cell: { ch: "Y", fg: 6, bg: 4 },
      });
    });
  });

  describe("canMerge", () => {
    let command1;
    let command2;

    beforeEach(() => {
      command1 = new CellCommand({
        description: "Paint cell",
        layer: layer,
        changes: [{ index: 0, before: beforeCell, after: afterCell }],
        tool: "brush",
        scene: scene,
      });

      command2 = new CellCommand({
        description: "Paint cell",
        layer: layer,
        changes: [{ index: 1, before: beforeCell, after: afterCell }],
        tool: "brush",
        scene: scene,
      });
    });

    it("should merge compatible commands", () => {
      expect(command1.canMerge(command2)).toBe(true);
    });

    it("should not merge with non-CellCommand", () => {
      const otherCommand = new Command("Other");
      expect(command1.canMerge(otherCommand)).toBe(false);
    });

    it("should not merge different layers", () => {
      const otherLayer = new MockLayer();
      const otherCommand = new CellCommand({
        description: "Paint cell",
        layer: otherLayer,
        changes: [{ index: 0, before: beforeCell, after: afterCell }],
        tool: "brush",
        scene: scene,
      });

      expect(command1.canMerge(otherCommand)).toBe(false);
    });

    it("should not merge different tools", () => {
      const eraserCommand = new CellCommand({
        description: "Erase cell",
        layer: layer,
        changes: [{ index: 1, before: afterCell, after: beforeCell }],
        tool: "eraser",
        scene: scene,
      });

      expect(command1.canMerge(eraserCommand)).toBe(false);
    });

    it("should not merge commands too far apart in time", () => {
      vi.useFakeTimers();

      const oldCommand = new CellCommand({
        description: "Old paint",
        layer: layer,
        changes: [{ index: 0, before: beforeCell, after: afterCell }],
        tool: "brush",
        scene: scene,
      });

      vi.advanceTimersByTime(3000); // 3 seconds later

      const newCommand = new CellCommand({
        description: "New paint",
        layer: layer,
        changes: [{ index: 1, before: beforeCell, after: afterCell }],
        tool: "brush",
        scene: scene,
      });

      expect(oldCommand.canMerge(newCommand)).toBe(false);

      vi.useRealTimers();
    });

    it("should not merge commands with conflicting overlaps", () => {
      // Commands that paint the same cell with incompatible states
      const conflictCommand = new CellCommand({
        description: "Conflicting paint",
        layer: layer,
        changes: [
          {
            index: 0,
            before: { ch: "X", fg: 1, bg: 1 }, // Different before state
            after: { ch: "Z", fg: 3, bg: 3 },
          },
        ],
        tool: "brush",
        scene: scene,
      });

      command1.changes = [
        {
          index: 0,
          before: beforeCell,
          after: afterCell,
        },
      ];

      expect(command1.canMerge(conflictCommand)).toBe(false);
    });

    it("should merge commands with compatible overlaps", () => {
      const compatibleCommand = new CellCommand({
        description: "Compatible paint",
        layer: layer,
        changes: [
          {
            index: 0,
            before: afterCell, // Matches our after state
            after: { ch: "B", fg: 3, bg: 1 },
          },
        ],
        tool: "brush",
        scene: scene,
      });

      command1.changes = [
        {
          index: 0,
          before: beforeCell,
          after: afterCell,
        },
      ];

      expect(command1.canMerge(compatibleCommand)).toBe(true);
    });

    it("should merge commands within time window", () => {
      vi.useFakeTimers();

      const recentCommand = new CellCommand({
        description: "Recent paint",
        layer: layer,
        changes: [{ index: 1, before: beforeCell, after: afterCell }],
        tool: "brush",
        scene: scene,
      });

      vi.advanceTimersByTime(1000); // 1 second later (within 2s window)

      const newerCommand = new CellCommand({
        description: "Newer paint",
        layer: layer,
        changes: [{ index: 2, before: beforeCell, after: afterCell }],
        tool: "brush",
        scene: scene,
      });

      expect(recentCommand.canMerge(newerCommand)).toBe(true);

      vi.useRealTimers();
    });
  });

  describe("merge", () => {
    it("should combine changes from both commands", () => {
      const command1 = new CellCommand({
        description: "Paint cell 1",
        layer: layer,
        changes: [
          { index: 0, before: beforeCell, after: { ch: "A", fg: 1, bg: 0 } },
        ],
        tool: "brush",
        scene: scene,
      });

      const command2 = new CellCommand({
        description: "Paint cell 2",
        layer: layer,
        changes: [
          { index: 1, before: beforeCell, after: { ch: "B", fg: 2, bg: 1 } },
        ],
        tool: "brush",
        scene: scene,
      });

      command1.merge(command2);

      expect(command1.changes).toHaveLength(2);
      expect(command1.changes[0].index).toBe(0);
      expect(command1.changes[1].index).toBe(1);
      expect(command1.description).toBe("Paint 2 cells");
    });

    it("should update overlapping cells correctly", () => {
      const command1 = new CellCommand({
        description: "Paint cell",
        layer: layer,
        changes: [
          {
            index: 0,
            before: beforeCell,
            after: { ch: "A", fg: 1, bg: 0 },
          },
        ],
        tool: "brush",
        scene: scene,
      });

      const command2 = new CellCommand({
        description: "Paint same cell",
        layer: layer,
        changes: [
          {
            index: 0,
            before: { ch: "A", fg: 1, bg: 0 }, // Matches command1's after
            after: { ch: "B", fg: 2, bg: 1 },
          },
        ],
        tool: "brush",
        scene: scene,
      });

      command1.merge(command2);

      expect(command1.changes).toHaveLength(1);
      expect(command1.changes[0].before).toEqual(beforeCell); // Original before
      expect(command1.changes[0].after).toEqual({ ch: "B", fg: 2, bg: 1 }); // Final after
    });

    it("should update timestamp to most recent", () => {
      vi.useFakeTimers();

      const command1 = new CellCommand({
        description: "First",
        layer: layer,
        changes: [{ index: 0, before: beforeCell, after: afterCell }],
        tool: "brush",
        scene: scene,
      });

      const timestamp1 = command1.timestamp;

      vi.advanceTimersByTime(1000);

      const command2 = new CellCommand({
        description: "Second",
        layer: layer,
        changes: [{ index: 1, before: beforeCell, after: afterCell }],
        tool: "brush",
        scene: scene,
      });

      const timestamp2 = command2.timestamp;

      command1.merge(command2);

      expect(command1.timestamp).toBe(timestamp2);
      expect(command1.timestamp).toBeGreaterThan(timestamp1);

      vi.useRealTimers();
    });

    it("should throw error for incompatible commands", () => {
      const command1 = new CellCommand({
        description: "Brush",
        layer: layer,
        changes: [{ index: 0, before: beforeCell, after: afterCell }],
        tool: "brush",
        scene: scene,
      });

      const command2 = new CellCommand({
        description: "Eraser",
        layer: layer,
        changes: [{ index: 1, before: afterCell, after: beforeCell }],
        tool: "eraser",
        scene: scene,
      });

      expect(() => command1.merge(command2)).toThrow(
        "Cannot merge incompatible commands",
      );
    });

    it("should generate correct merged descriptions", () => {
      const brushCommand1 = new CellCommand({
        description: "Paint",
        layer: layer,
        changes: [{ index: 0, before: beforeCell, after: afterCell }],
        tool: "brush",
        scene: scene,
      });

      const brushCommand2 = new CellCommand({
        description: "Paint",
        layer: layer,
        changes: [
          { index: 1, before: beforeCell, after: afterCell },
          { index: 2, before: beforeCell, after: afterCell },
        ],
        tool: "brush",
        scene: scene,
      });

      brushCommand1.merge(brushCommand2);
      expect(brushCommand1.description).toBe("Paint 3 cells");

      const eraserCommand = new CellCommand({
        description: "Erase",
        layer: layer,
        changes: [{ index: 0, before: afterCell, after: beforeCell }],
        tool: "eraser",
        scene: scene,
      });

      eraserCommand.generateMergedDescription =
        eraserCommand.generateMergedDescription.bind(eraserCommand);
      expect(eraserCommand.generateMergedDescription(1)).toBe("Erase 1 cell");
      expect(eraserCommand.generateMergedDescription(5)).toBe("Erase 5 cells");
    });
  });

  describe("utility methods", () => {
    let command;

    beforeEach(() => {
      command = new CellCommand({
        description: "Test command",
        layer: layer,
        changes: [
          { index: 0, before: beforeCell, after: afterCell },
          { index: 5, before: beforeCell, after: afterCell },
          { index: 10, before: beforeCell, after: afterCell },
        ],
        tool: "brush",
        scene: scene,
      });
    });

    it("should return correct cell count", () => {
      expect(command.getCellCount()).toBe(3);
    });

    it("should return affected indices", () => {
      expect(command.getAffectedIndices()).toEqual([0, 5, 10]);
    });

    it("should compare cells correctly", () => {
      const cell1 = { ch: "A", fg: 1, bg: 0 };
      const cell2 = { ch: "A", fg: 1, bg: 0 };
      const cell3 = { ch: "B", fg: 1, bg: 0 };

      expect(command.cellsEqual(cell1, cell2)).toBe(true);
      expect(command.cellsEqual(cell1, cell3)).toBe(false);
      expect(command.cellsEqual(cell1, { ch: "A", fg: 2, bg: 0 })).toBe(false);
      expect(command.cellsEqual(cell1, { ch: "A", fg: 1, bg: 1 })).toBe(false);
    });
  });

  describe("static factory methods", () => {
    describe("fromSingleCell", () => {
      it("should create command for single cell", () => {
        const command = CellCommand.fromSingleCell({
          layer: layer,
          index: 5,
          before: beforeCell,
          after: afterCell,
          tool: "brush",
        });

        expect(command.description).toBe("Paint cell");
        expect(command.layer).toBe(layer);
        expect(command.changes).toHaveLength(1);
        expect(command.changes[0]).toEqual({
          index: 5,
          before: beforeCell,
          after: afterCell,
        });
        expect(command.tool).toBe("brush");
      });

      it("should handle different tools", () => {
        const brushCommand = CellCommand.fromSingleCell({
          layer: layer,
          index: 0,
          before: afterCell,
          after: beforeCell,
          tool: "brush",
        });
        expect(brushCommand.description).toBe("Paint cell");

        const eraserCommand = CellCommand.fromSingleCell({
          layer: layer,
          index: 0,
          before: afterCell,
          after: beforeCell,
          tool: "eraser",
        });
        expect(eraserCommand.description).toBe("Erase cell");

        const unknownCommand = CellCommand.fromSingleCell({
          layer: layer,
          index: 0,
          before: afterCell,
          after: beforeCell,
          tool: "unknown",
        });
        expect(unknownCommand.description).toBe("Modify cell");
      });

      it("should clone cell objects", () => {
        const originalBefore = { ch: "X", fg: 1, bg: 0 };
        const originalAfter = { ch: "Y", fg: 2, bg: 1 };

        const command = CellCommand.fromSingleCell({
          layer: layer,
          index: 0,
          before: originalBefore,
          after: originalAfter,
          tool: "brush",
        });

        // Modify original objects
        originalBefore.ch = "Z";
        originalAfter.ch = "W";

        // Command should have cloned values
        expect(command.changes[0].before.ch).toBe("X");
        expect(command.changes[0].after.ch).toBe("Y");
      });
    });

    describe("fromMultipleCells", () => {
      it("should create command for multiple cells", () => {
        const changes = [
          { index: 0, before: beforeCell, after: { ch: "A", fg: 1, bg: 0 } },
          { index: 1, before: beforeCell, after: { ch: "B", fg: 2, bg: 1 } },
          { index: 2, before: beforeCell, after: { ch: "C", fg: 3, bg: 2 } },
        ];

        const command = CellCommand.fromMultipleCells({
          layer: layer,
          changes: changes,
          tool: "brush",
        });

        expect(command.description).toBe("Paint 3 cells");
        expect(command.changes).toHaveLength(3);
        expect(command.tool).toBe("brush");
      });

      it("should handle different tools and counts", () => {
        const singleChange = [
          { index: 0, before: afterCell, after: beforeCell },
        ];

        const eraserCommand = CellCommand.fromMultipleCells({
          layer: layer,
          changes: singleChange,
          tool: "eraser",
        });
        expect(eraserCommand.description).toBe("Erase 1 cells");

        const multipleChanges = [
          { index: 0, before: beforeCell, after: afterCell },
          { index: 1, before: beforeCell, after: afterCell },
        ];

        const unknownCommand = CellCommand.fromMultipleCells({
          layer: layer,
          changes: multipleChanges,
          tool: "picker",
        });
        expect(unknownCommand.description).toBe("Modify 2 cells");
      });

      it("should clone all change objects", () => {
        const originalChanges = [
          {
            index: 0,
            before: { ch: "X", fg: 1, bg: 0 },
            after: { ch: "Y", fg: 2, bg: 1 },
          },
          {
            index: 1,
            before: { ch: "A", fg: 3, bg: 2 },
            after: { ch: "B", fg: 4, bg: 3 },
          },
        ];

        const command = CellCommand.fromMultipleCells({
          layer: layer,
          changes: originalChanges,
          tool: "brush",
        });

        // Modify originals
        originalChanges[0].before.ch = "Z";
        originalChanges[0].after.ch = "W";

        // Command should have cloned values
        expect(command.changes[0].before.ch).toBe("X");
        expect(command.changes[0].after.ch).toBe("Y");
      });
    });
  });

  describe("edge cases", () => {
    it("should handle empty changes array", () => {
      const command = new CellCommand({
        description: "Empty command",
        layer: layer,
        changes: [],
        tool: "brush",
        scene: scene,
      });

      expect(command.getCellCount()).toBe(0);
      expect(command.getAffectedIndices()).toEqual([]);

      // Should not crash on execute/undo
      command.execute();
      command.undo();
    });

    it("should handle large number of changes", () => {
      const changes = [];
      for (let i = 0; i < 1000; i++) {
        changes.push({
          index: i,
          before: beforeCell,
          after: { ch: String.fromCharCode(65 + (i % 26)), fg: i % 8, bg: -1 },
        });
      }

      const command = new CellCommand({
        description: "Large command",
        layer: layer,
        changes: changes,
        tool: "brush",
        scene: scene,
      });

      expect(command.getCellCount()).toBe(1000);
      expect(() => command.execute()).not.toThrow();
    });

    it("should handle negative cell indices", () => {
      const command = new CellCommand({
        description: "Negative index",
        layer: layer,
        changes: [{ index: -1, before: beforeCell, after: afterCell }],
        tool: "brush",
        scene: scene,
      });

      // Should not crash (MockLayer handles bounds checking)
      expect(() => command.execute()).not.toThrow();
    });

    it("should handle commands with identical timestamps", () => {
      vi.useFakeTimers();

      const command1 = new CellCommand({
        description: "First",
        layer: layer,
        changes: [{ index: 0, before: beforeCell, after: afterCell }],
        tool: "brush",
        scene: scene,
      });

      const command2 = new CellCommand({
        description: "Second",
        layer: layer,
        changes: [{ index: 1, before: beforeCell, after: afterCell }],
        tool: "brush",
        scene: scene,
      });

      expect(command1.timestamp).toBe(command2.timestamp);
      expect(command1.canMerge(command2)).toBe(true);

      vi.useRealTimers();
    });
  });
});
