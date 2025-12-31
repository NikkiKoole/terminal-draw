/**
 * CommandHistory - Manages undo/redo stack for commands
 *
 * Maintains a history of executed commands with configurable limits.
 * Supports command merging for continuous operations like brush strokes.
 */
export class CommandHistory {
  /**
   * @param {Object} options - Configuration options
   * @param {number} options.maxSize - Maximum number of commands to keep (default: 50)
   * @param {Object} options.stateManager - StateManager for emitting events
   */
  constructor(options = {}) {
    this.maxSize = options.maxSize || 50;
    this.stateManager = options.stateManager;

    // Command stacks
    this.undoStack = [];
    this.redoStack = [];

    // Merging state
    this.lastCommand = null;
    this.mergingEnabled = true;
  }

  /**
   * Execute a command and add it to the history
   * @param {Command} command - Command to execute
   * @param {boolean} allowMerge - Whether to attempt merging with previous command
   */
  execute(command, allowMerge = true) {
    if (!command) {
      throw new Error("Command is required");
    }

    // Try to merge with the last command if merging is enabled
    if (
      allowMerge &&
      this.mergingEnabled &&
      this.lastCommand &&
      this.lastCommand.canMerge(command)
    ) {
      // Merge the commands
      this.lastCommand.merge(command);

      // Execute the merged command
      command.execute();

      this.emit("history:merged", {
        command: this.lastCommand,
        mergedWith: command,
      });

      return;
    }

    // Execute the command
    command.execute();
    command.executed = true;

    // Add to undo stack
    this.undoStack.push(command);
    this.lastCommand = command;

    // Clear redo stack when new command is executed
    this.redoStack.length = 0;

    // Enforce size limit
    this.enforceSizeLimit();

    this.emit("history:executed", { command });
    this.emit("history:changed", this.getStatus());
  }

  /**
   * Undo the last command
   * @returns {boolean} - True if command was undone, false if nothing to undo
   */
  undo() {
    if (this.undoStack.length === 0) {
      return false;
    }

    const command = this.undoStack.pop();
    command.undo();

    this.redoStack.push(command);
    this.lastCommand = this.undoStack[this.undoStack.length - 1] || null;

    this.emit("history:undone", { command });
    this.emit("history:changed", this.getStatus());

    return true;
  }

  /**
   * Redo the last undone command
   * @returns {boolean} - True if command was redone, false if nothing to redo
   */
  redo() {
    if (this.redoStack.length === 0) {
      return false;
    }

    const command = this.redoStack.pop();
    command.execute();

    this.undoStack.push(command);
    this.lastCommand = command;

    this.emit("history:redone", { command });
    this.emit("history:changed", this.getStatus());

    return true;
  }

  /**
   * Clear all command history
   */
  clear() {
    const hadCommands = this.undoStack.length > 0 || this.redoStack.length > 0;

    this.undoStack.length = 0;
    this.redoStack.length = 0;
    this.lastCommand = null;

    if (hadCommands) {
      this.emit("history:cleared");
      this.emit("history:changed", this.getStatus());
    }
  }

  /**
   * Get current history status
   * @returns {Object} - Status object with undo/redo availability
   */
  getStatus() {
    return {
      canUndo: this.undoStack.length > 0,
      canRedo: this.redoStack.length > 0,
      undoCount: this.undoStack.length,
      redoCount: this.redoStack.length,
      nextUndoDescription:
        this.undoStack.length > 0
          ? this.undoStack[this.undoStack.length - 1].description
          : null,
      nextRedoDescription:
        this.redoStack.length > 0
          ? this.redoStack[this.redoStack.length - 1].description
          : null,
    };
  }

  /**
   * Enable or disable command merging
   * @param {boolean} enabled - Whether merging should be enabled
   */
  setMergingEnabled(enabled) {
    this.mergingEnabled = enabled;
    if (!enabled) {
      this.lastCommand = null; // Prevent merging with previous command
    }
  }

  /**
   * Get the current size of the history
   * @returns {number} - Total number of commands in history
   */
  size() {
    return this.undoStack.length + this.redoStack.length;
  }

  /**
   * Get memory usage estimate in bytes
   * @returns {number} - Estimated memory usage
   */
  getMemoryUsage() {
    // Rough estimate - each command might be ~1KB on average
    // This is a heuristic and actual usage will vary
    return this.size() * 1024;
  }

  /**
   * Enforce the maximum size limit by removing oldest commands
   */
  enforceSizeLimit() {
    while (this.undoStack.length > this.maxSize) {
      this.undoStack.shift(); // Remove oldest command
    }
  }

  /**
   * Emit an event through the StateManager if available
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  emit(event, data) {
    if (this.stateManager && typeof this.stateManager.emit === "function") {
      this.stateManager.emit(event, data);
    }
  }

  /**
   * Check if undo is available
   * @returns {boolean} - True if undo is available
   */
  canUndo() {
    return this.undoStack.length > 0;
  }

  /**
   * Check if redo is available
   * @returns {boolean} - True if redo is available
   */
  canRedo() {
    return this.redoStack.length > 0;
  }

  /**
   * Get the undo stack (for UI purposes)
   * @returns {Array} - Array of commands that can be undone
   */
  getUndoStack() {
    return [...this.undoStack];
  }

  /**
   * Get the redo stack (for UI purposes)
   * @returns {Array} - Array of commands that can be redone
   */
  getRedoStack() {
    return [...this.redoStack];
  }

  /**
   * Get debug information about the command history
   * @returns {Object} - Debug information
   */
  getDebugInfo() {
    return {
      undoStack: this.undoStack.map((cmd) => ({
        description: cmd.description,
        timestamp: cmd.timestamp,
        age: cmd.getAge(),
      })),
      redoStack: this.redoStack.map((cmd) => ({
        description: cmd.description,
        timestamp: cmd.timestamp,
        age: cmd.getAge(),
      })),
      maxSize: this.maxSize,
      mergingEnabled: this.mergingEnabled,
      lastCommand: this.lastCommand ? this.lastCommand.description : null,
      memoryEstimate: this.getMemoryUsage(),
    };
  }
}
