/**
 * Tests for Command base class
 */

import { describe, it, expect, beforeEach } from "bun:test";
import { Command } from "../../src/commands/Command.js";

// Test implementation of Command for testing
class TestCommand extends Command {
  constructor(description, shouldExecute = true, shouldUndo = true) {
    super(description);
    this.shouldExecute = shouldExecute;
    this.shouldUndo = shouldUndo;
    this.executeCount = 0;
    this.undoCount = 0;
  }

  execute() {
    if (!this.shouldExecute) {
      throw new Error("Execute failed");
    }
    this.executeCount++;
    this.executed = true;
  }

  undo() {
    if (!this.shouldUndo) {
      throw new Error("Undo failed");
    }
    this.undoCount++;
  }
}

// Test command that can merge
class MergeableCommand extends TestCommand {
  canMerge(other) {
    return (
      other instanceof MergeableCommand &&
      other.description === this.description
    );
  }

  merge(other) {
    this.executeCount += other.executeCount;
    this.undoCount += other.undoCount;
    this.timestamp = Math.max(this.timestamp, other.timestamp);
  }
}

describe("Command", () => {
  let command;

  beforeEach(() => {
    command = new TestCommand("Test command");
  });

  describe("constructor", () => {
    it("should create command with description", () => {
      expect(command.description).toBe("Test command");
      expect(command.timestamp).toBeTypeOf("number");
      expect(command.executed).toBe(false);
    });

    it("should throw error if no description provided", () => {
      expect(() => new Command()).toThrow("Command description is required");
      expect(() => new Command("")).toThrow("Command description is required");
      expect(() => new Command(null)).toThrow(
        "Command description is required",
      );
    });

    it("should set timestamp to current time", () => {
      const before = Date.now();
      const cmd = new TestCommand("Test");
      const after = Date.now();

      expect(cmd.timestamp).toBeGreaterThanOrEqual(before);
      expect(cmd.timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe("abstract methods", () => {
    it("should throw error for unimplemented execute", () => {
      const baseCommand = new Command("Base");
      expect(() => baseCommand.execute()).toThrow(
        "Must implement execute() method",
      );
    });

    it("should throw error for unimplemented undo", () => {
      const baseCommand = new Command("Base");
      expect(() => baseCommand.undo()).toThrow("Must implement undo() method");
    });
  });

  describe("execute", () => {
    it("should call execute implementation", () => {
      command.execute();
      expect(command.executeCount).toBe(1);
      expect(command.executed).toBe(true);
    });

    it("should handle execute errors", () => {
      const failingCommand = new TestCommand("Failing", false);
      expect(() => failingCommand.execute()).toThrow("Execute failed");
    });

    it("should be idempotent - safe to call multiple times", () => {
      command.execute();
      command.execute();
      command.execute();
      expect(command.executeCount).toBe(3);
    });
  });

  describe("undo", () => {
    it("should call undo implementation", () => {
      command.undo();
      expect(command.undoCount).toBe(1);
    });

    it("should handle undo errors", () => {
      const failingCommand = new TestCommand("Failing", true, false);
      expect(() => failingCommand.undo()).toThrow("Undo failed");
    });
  });

  describe("canMerge", () => {
    it("should return false by default", () => {
      const other = new TestCommand("Other");
      expect(command.canMerge(other)).toBe(false);
    });

    it("should allow override in subclasses", () => {
      const mergeable1 = new MergeableCommand("Mergeable");
      const mergeable2 = new MergeableCommand("Mergeable");
      const mergeable3 = new MergeableCommand("Different");

      expect(mergeable1.canMerge(mergeable2)).toBe(true);
      expect(mergeable1.canMerge(mergeable3)).toBe(false);
      expect(mergeable1.canMerge(command)).toBe(false);
    });
  });

  describe("merge", () => {
    it("should throw error by default", () => {
      const other = new TestCommand("Other");
      expect(() => command.merge(other)).toThrow("Cannot merge commands");
    });

    it("should allow override in subclasses", () => {
      const mergeable1 = new MergeableCommand("Mergeable");
      const mergeable2 = new MergeableCommand("Mergeable");

      mergeable1.executeCount = 2;
      mergeable2.executeCount = 3;

      mergeable1.merge(mergeable2);
      expect(mergeable1.executeCount).toBe(5);
    });
  });

  describe("toString", () => {
    it("should return formatted string with description and time", () => {
      const str = command.toString();
      expect(str).toContain("Test command");
      expect(str).toMatch(/\(\d{1,2}:\d{2}:\d{2}/); // Time format
    });

    it("should use locale time format", () => {
      const cmd = new TestCommand("Test");
      const str = cmd.toString();

      expect(str).toContain("Test");
      // Should contain some time representation in format (HH:MM:SS)
      expect(str).toMatch(/\(\d{1,2}:\d{2}:\d{2}/);
    });
  });

  describe("getAge", () => {
    it("should return age in milliseconds", () => {
      const startTime = Date.now();
      const cmd = new TestCommand("Test");
      const age = cmd.getAge();

      // Age should be very small (close to 0) for a newly created command
      expect(age).toBeGreaterThanOrEqual(0);
      expect(age).toBeLessThan(100); // Should be less than 100ms for a new command
    });

    it("should return 0 for new commands", () => {
      const age = command.getAge();
      expect(age).toBeGreaterThanOrEqual(0);
      expect(age).toBeLessThan(100); // Should be very recent
    });
  });

  describe("properties", () => {
    it("should have correct initial properties", () => {
      expect(command.description).toBe("Test command");
      expect(command.executed).toBe(false);
      expect(command.timestamp).toBeTypeOf("number");
    });

    it("should track executed state", () => {
      expect(command.executed).toBe(false);
      command.execute();
      expect(command.executed).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("should handle very long descriptions", () => {
      const longDesc = "A".repeat(1000);
      const cmd = new TestCommand(longDesc);
      expect(cmd.description).toBe(longDesc);
      expect(cmd.toString()).toContain(longDesc);
    });

    it("should handle special characters in description", () => {
      const specialDesc = 'Test "quotes" & <html> chars 🎨';
      const cmd = new TestCommand(specialDesc);
      expect(cmd.description).toBe(specialDesc);
      expect(cmd.toString()).toContain(specialDesc);
    });

    it("should handle commands created at same millisecond", () => {
      const cmd1 = new TestCommand("First");
      const cmd2 = new TestCommand("Second");

      // Should be same or very close timestamps
      expect(Math.abs(cmd1.timestamp - cmd2.timestamp)).toBeLessThan(10);
    });
  });

  describe("inheritance", () => {
    it("should allow proper subclassing", () => {
      expect(command).toBeInstanceOf(Command);
      expect(command).toBeInstanceOf(TestCommand);
    });

    it("should call parent constructor correctly", () => {
      class CustomCommand extends Command {
        constructor(description, customProp) {
          super(description);
          this.customProp = customProp;
        }

        execute() {
          // Implementation
        }

        undo() {
          // Implementation
        }
      }

      const custom = new CustomCommand("Custom", "value");
      expect(custom.description).toBe("Custom");
      expect(custom.customProp).toBe("value");
      expect(custom.timestamp).toBeTypeOf("number");
    });
  });
});
