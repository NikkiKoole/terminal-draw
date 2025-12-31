/**
 * Tests for CommandHistory class
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { CommandHistory } from "../../src/commands/CommandHistory.js";
import { Command } from "../../src/commands/Command.js";

// Test implementation of Command for testing
class TestCommand extends Command {
  constructor(description, data = {}) {
    super(description);
    this.data = data;
    this.executeCount = 0;
    this.undoCount = 0;
  }

  execute() {
    this.executeCount++;
    this.executed = true;
  }

  undo() {
    this.undoCount++;
  }
}

// Test command that can merge
class MergeableCommand extends TestCommand {
  constructor(description, mergeKey = "default") {
    super(description);
    this.mergeKey = mergeKey;
    this.mergedCommands = [];
  }

  canMerge(other) {
    return (
      other instanceof MergeableCommand &&
      other.mergeKey === this.mergeKey &&
      other.timestamp - this.timestamp <= 2000
    ); // Within 2 seconds
  }

  merge(other) {
    this.mergedCommands.push(other);
    this.description = `${this.description} + ${other.description}`;
    this.timestamp = Math.max(this.timestamp, other.timestamp);
  }
}

// Mock StateManager for testing events
class MockStateManager {
  constructor() {
    this.events = [];
  }

  emit(event, data) {
    this.events.push({ event, data, timestamp: Date.now() });
  }

  getEvents() {
    return [...this.events];
  }

  clearEvents() {
    this.events.length = 0;
  }
}

describe("CommandHistory", () => {
  let history;
  let mockStateManager;

  beforeEach(() => {
    mockStateManager = new MockStateManager();
    history = new CommandHistory({
      maxSize: 5, // Small size for testing
      stateManager: mockStateManager,
    });
  });

  describe("constructor", () => {
    it("should create empty history with default options", () => {
      const defaultHistory = new CommandHistory();
      expect(defaultHistory.maxSize).toBe(50);
      expect(defaultHistory.size()).toBe(0);
      expect(defaultHistory.getStatus().canUndo).toBe(false);
      expect(defaultHistory.getStatus().canRedo).toBe(false);
    });

    it("should accept custom options", () => {
      const customHistory = new CommandHistory({
        maxSize: 100,
        stateManager: mockStateManager,
      });

      expect(customHistory.maxSize).toBe(100);
      expect(customHistory.stateManager).toBe(mockStateManager);
    });

    it("should handle missing stateManager gracefully", () => {
      const noManagerHistory = new CommandHistory({ maxSize: 10 });
      const command = new TestCommand("Test");

      expect(() => noManagerHistory.execute(command)).not.toThrow();
    });
  });

  describe("execute", () => {
    it("should execute command and add to history", () => {
      const command = new TestCommand("Test command");
      history.execute(command);

      expect(command.executeCount).toBe(1);
      expect(command.executed).toBe(true);
      expect(history.size()).toBe(1);
      expect(history.getStatus().canUndo).toBe(true);
    });

    it("should clear redo stack when new command is executed", () => {
      const cmd1 = new TestCommand("Command 1");
      const cmd2 = new TestCommand("Command 2");
      const cmd3 = new TestCommand("Command 3");

      history.execute(cmd1);
      history.execute(cmd2);
      history.undo(); // cmd2 goes to redo stack

      expect(history.getStatus().canRedo).toBe(true);

      history.execute(cmd3); // Should clear redo stack

      expect(history.getStatus().canRedo).toBe(false);
      expect(history.getStatus().undoCount).toBe(2); // cmd1 + cmd3
    });

    it("should emit events when executing", () => {
      const command = new TestCommand("Test");
      history.execute(command);

      const events = mockStateManager.getEvents();
      expect(events).toHaveLength(2);
      expect(events[0].event).toBe("history:executed");
      expect(events[0].data.command).toBe(command);
      expect(events[1].event).toBe("history:changed");
    });

    it("should throw error if no command provided", () => {
      expect(() => history.execute()).toThrow("Command is required");
      expect(() => history.execute(null)).toThrow("Command is required");
    });

    it("should enforce size limit", () => {
      // Execute more commands than max size
      for (let i = 0; i < 10; i++) {
        history.execute(new TestCommand(`Command ${i}`));
      }

      expect(history.size()).toBe(5); // Should be limited to maxSize
      expect(history.getStatus().undoCount).toBe(5);
    });
  });

  describe("undo", () => {
    it("should undo last command", () => {
      const command = new TestCommand("Test command");
      history.execute(command);

      const result = history.undo();

      expect(result).toBe(true);
      expect(command.undoCount).toBe(1);
      expect(history.getStatus().canUndo).toBe(false);
      expect(history.getStatus().canRedo).toBe(true);
    });

    it("should return false when nothing to undo", () => {
      const result = history.undo();
      expect(result).toBe(false);
    });

    it("should move command to redo stack", () => {
      const command = new TestCommand("Test");
      history.execute(command);
      history.undo();

      expect(history.getStatus().redoCount).toBe(1);
      expect(history.getStatus().undoCount).toBe(0);
    });

    it("should emit events when undoing", () => {
      const command = new TestCommand("Test");
      history.execute(command);
      mockStateManager.clearEvents();

      history.undo();

      const events = mockStateManager.getEvents();
      expect(events).toHaveLength(2);
      expect(events[0].event).toBe("history:undone");
      expect(events[0].data.command).toBe(command);
      expect(events[1].event).toBe("history:changed");
    });

    it("should update lastCommand correctly", () => {
      const cmd1 = new TestCommand("Command 1");
      const cmd2 = new TestCommand("Command 2");

      history.execute(cmd1);
      history.execute(cmd2);

      expect(history.lastCommand).toBe(cmd2);

      history.undo();
      expect(history.lastCommand).toBe(cmd1);

      history.undo();
      expect(history.lastCommand).toBe(null);
    });
  });

  describe("redo", () => {
    it("should redo last undone command", () => {
      const command = new TestCommand("Test command");
      history.execute(command);
      history.undo();

      const result = history.redo();

      expect(result).toBe(true);
      expect(command.executeCount).toBe(2); // Executed twice
      expect(history.getStatus().canRedo).toBe(false);
      expect(history.getStatus().canUndo).toBe(true);
    });

    it("should return false when nothing to redo", () => {
      const result = history.redo();
      expect(result).toBe(false);
    });

    it("should move command back to undo stack", () => {
      const command = new TestCommand("Test");
      history.execute(command);
      history.undo();
      history.redo();

      expect(history.getStatus().undoCount).toBe(1);
      expect(history.getStatus().redoCount).toBe(0);
    });

    it("should emit events when redoing", () => {
      const command = new TestCommand("Test");
      history.execute(command);
      history.undo();
      mockStateManager.clearEvents();

      history.redo();

      const events = mockStateManager.getEvents();
      expect(events).toHaveLength(2);
      expect(events[0].event).toBe("history:redone");
      expect(events[1].event).toBe("history:changed");
    });
  });

  describe("command merging", () => {
    it("should merge compatible commands", () => {
      const cmd1 = new MergeableCommand("Command 1", "brush");
      const cmd2 = new MergeableCommand("Command 2", "brush");

      history.execute(cmd1);
      history.execute(cmd2);

      expect(history.size()).toBe(1); // Should be merged
      expect(cmd1.description).toBe("Command 1 + Command 2");
      expect(cmd1.mergedCommands).toContain(cmd2);
      expect(cmd2.executeCount).toBe(1); // cmd2 was executed
    });

    it("should not merge incompatible commands", () => {
      const cmd1 = new MergeableCommand("Command 1", "brush");
      const cmd2 = new MergeableCommand("Command 2", "eraser");

      history.execute(cmd1);
      history.execute(cmd2);

      expect(history.size()).toBe(2); // Should not be merged
    });

    it("should respect allowMerge parameter", () => {
      const cmd1 = new MergeableCommand("Command 1", "brush");
      const cmd2 = new MergeableCommand("Command 2", "brush");

      history.execute(cmd1);
      history.execute(cmd2, false); // Don't allow merging

      expect(history.size()).toBe(2); // Should not be merged
    });

    it("should emit merge event", () => {
      const cmd1 = new MergeableCommand("Command 1", "brush");
      const cmd2 = new MergeableCommand("Command 2", "brush");

      history.execute(cmd1);
      mockStateManager.clearEvents();
      history.execute(cmd2);

      const events = mockStateManager.getEvents();
      const mergeEvent = events.find((e) => e.event === "history:merged");
      expect(mergeEvent).toBeDefined();
      expect(mergeEvent.data.command).toBe(cmd1);
      expect(mergeEvent.data.mergedWith).toBe(cmd2);
    });

    it("should handle merging disabled", () => {
      const cmd1 = new MergeableCommand("Command 1", "brush");
      const cmd2 = new MergeableCommand("Command 2", "brush");

      history.execute(cmd1);
      history.setMergingEnabled(false);
      history.execute(cmd2);

      expect(history.size()).toBe(2); // Should not merge when disabled
    });

    it("should prevent merging when lastCommand is cleared", () => {
      const cmd1 = new MergeableCommand("Command 1", "brush");
      const cmd2 = new MergeableCommand("Command 2", "brush");

      history.execute(cmd1);
      history.setMergingEnabled(false); // This clears lastCommand
      history.setMergingEnabled(true);
      history.execute(cmd2);

      expect(history.size()).toBe(2); // Should not merge
    });
  });

  describe("clear", () => {
    it("should clear all history", () => {
      const cmd1 = new TestCommand("Command 1");
      const cmd2 = new TestCommand("Command 2");

      history.execute(cmd1);
      history.execute(cmd2);
      history.undo();

      expect(history.size()).toBe(2);

      history.clear();

      expect(history.size()).toBe(0);
      expect(history.getStatus().canUndo).toBe(false);
      expect(history.getStatus().canRedo).toBe(false);
      expect(history.lastCommand).toBe(null);
    });

    it("should emit events when clearing non-empty history", () => {
      history.execute(new TestCommand("Test"));
      mockStateManager.clearEvents();

      history.clear();

      const events = mockStateManager.getEvents();
      expect(events).toHaveLength(2);
      expect(events[0].event).toBe("history:cleared");
      expect(events[1].event).toBe("history:changed");
    });

    it("should not emit events when clearing empty history", () => {
      mockStateManager.clearEvents();
      history.clear();

      expect(mockStateManager.getEvents()).toHaveLength(0);
    });
  });

  describe("getStatus", () => {
    it("should return correct status for empty history", () => {
      const status = history.getStatus();
      expect(status).toEqual({
        canUndo: false,
        canRedo: false,
        undoCount: 0,
        redoCount: 0,
        nextUndoDescription: null,
        nextRedoDescription: null,
      });
    });

    it("should return correct status with commands", () => {
      const cmd1 = new TestCommand("Command 1");
      const cmd2 = new TestCommand("Command 2");

      history.execute(cmd1);
      history.execute(cmd2);
      history.undo(); // cmd2 goes to redo stack

      const status = history.getStatus();
      expect(status).toEqual({
        canUndo: true,
        canRedo: true,
        undoCount: 1,
        redoCount: 1,
        nextUndoDescription: "Command 1",
        nextRedoDescription: "Command 2",
      });
    });
  });

  describe("utility methods", () => {
    it("should calculate size correctly", () => {
      expect(history.size()).toBe(0);

      history.execute(new TestCommand("Test 1"));
      expect(history.size()).toBe(1);

      history.execute(new TestCommand("Test 2"));
      expect(history.size()).toBe(2);

      history.undo();
      expect(history.size()).toBe(2); // Still 2 (1 undo + 1 redo)
    });

    it("should estimate memory usage", () => {
      const estimate1 = history.getMemoryUsage();
      expect(estimate1).toBe(0);

      history.execute(new TestCommand("Test"));
      const estimate2 = history.getMemoryUsage();
      expect(estimate2).toBe(1024); // 1 command * 1KB estimate
    });

    it("should provide debug information", () => {
      const cmd1 = new TestCommand("Command 1");
      const cmd2 = new TestCommand("Command 2");

      history.execute(cmd1);
      history.execute(cmd2);
      history.undo();

      const debug = history.getDebugInfo();

      expect(debug.undoStack).toHaveLength(1);
      expect(debug.redoStack).toHaveLength(1);
      expect(debug.undoStack[0].description).toBe("Command 1");
      expect(debug.redoStack[0].description).toBe("Command 2");
      expect(debug.maxSize).toBe(5);
      expect(debug.mergingEnabled).toBe(true);
      expect(debug.lastCommand).toBe("Command 1");
      expect(debug.memoryEstimate).toBe(2048);
    });
  });

  describe("edge cases", () => {
    it("should handle rapid command execution", () => {
      const commands = [];
      for (let i = 0; i < 100; i++) {
        commands.push(new TestCommand(`Command ${i}`));
      }

      commands.forEach((cmd) => history.execute(cmd));

      expect(history.size()).toBe(5); // Limited by maxSize
      expect(history.getStatus().canUndo).toBe(true);
    });

    it("should handle alternating undo/redo", () => {
      history.execute(new TestCommand("Test"));

      for (let i = 0; i < 10; i++) {
        if (i % 2 === 0) {
          history.undo();
        } else {
          history.redo();
        }
      }

      // After 10 iterations starting with undo (0,2,4,6,8 = undo, 1,3,5,7,9 = redo)
      // We end on redo (i=9), so command should be in undo stack
      expect(history.getStatus().canUndo).toBe(true);
      expect(history.getStatus().canRedo).toBe(false);
    });

    it("should handle commands with execution errors", () => {
      class FailingCommand extends TestCommand {
        execute() {
          throw new Error("Execution failed");
        }
      }

      const failingCmd = new FailingCommand("Failing command");
      expect(() => history.execute(failingCmd)).toThrow("Execution failed");

      // History should remain unchanged
      expect(history.size()).toBe(0);
    });

    it("should handle very old commands for merging", () => {
      vi.useFakeTimers();

      const cmd1 = new MergeableCommand("Command 1", "brush");
      history.execute(cmd1);

      // Move time forward beyond merge window
      vi.advanceTimersByTime(5000);

      const cmd2 = new MergeableCommand("Command 2", "brush");
      history.execute(cmd2);

      expect(history.size()).toBe(2); // Should not merge due to time

      vi.useRealTimers();
    });
  });

  describe("setMergingEnabled", () => {
    it("should enable/disable merging", () => {
      const cmd1 = new MergeableCommand("Command 1", "brush");
      const cmd2 = new MergeableCommand("Command 2", "brush");

      history.setMergingEnabled(false);
      history.execute(cmd1);
      history.execute(cmd2);

      expect(history.size()).toBe(2); // Should not merge

      history.clear();
      history.setMergingEnabled(true);
      history.execute(new MergeableCommand("Command 3", "brush"));
      history.execute(new MergeableCommand("Command 4", "brush"));

      expect(history.size()).toBe(1); // Should merge
    });

    it("should clear lastCommand when disabling merging", () => {
      const cmd = new MergeableCommand("Command", "brush");
      history.execute(cmd);
      expect(history.lastCommand).toBe(cmd);

      history.setMergingEnabled(false);
      expect(history.lastCommand).toBe(null);
    });
  });
});
