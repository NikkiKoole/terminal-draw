/**
 * Command - Base class for undoable operations
 *
 * Implements the Command pattern for undo/redo functionality.
 * All user actions that modify the scene should extend this class.
 */
export class Command {
  /**
   * @param {string} description - Human-readable description of the command
   */
  constructor(description) {
    if (!description) {
      throw new Error("Command description is required");
    }

    this.description = description;
    this.timestamp = Date.now();
    this.executed = false;
  }

  /**
   * Execute the command
   * Should be idempotent - safe to call multiple times
   */
  execute() {
    throw new Error("Must implement execute() method");
  }

  /**
   * Undo the command
   * Should restore the exact state before execute() was called
   */
  undo() {
    throw new Error("Must implement undo() method");
  }

  /**
   * Check if this command can be merged with another command
   * Used to combine continuous brush strokes into a single undo step
   *
   * @param {Command} other - The command to potentially merge with
   * @returns {boolean} - True if commands can be merged
   */
  canMerge(other) {
    return false;
  }

  /**
   * Merge this command with another command
   * Only called if canMerge() returns true
   *
   * @param {Command} other - The command to merge with
   * @throws {Error} - If commands cannot be merged
   */
  merge(other) {
    throw new Error("Cannot merge commands - override canMerge() and merge() together");
  }

  /**
   * Get a formatted string representation of this command
   * @returns {string}
   */
  toString() {
    const date = new Date(this.timestamp).toLocaleTimeString();
    return `${this.description} (${date})`;
  }

  /**
   * Get the age of this command in milliseconds
   * @returns {number}
   */
  getAge() {
    return Date.now() - this.timestamp;
  }
}
