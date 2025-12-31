/**
 * CellCommand - Command for undoable cell modifications
 *
 * Handles painting, erasing, and other cell-level changes.
 * Supports merging for continuous brush strokes.
 */

import { Command } from "./Command.js";

export class CellCommand extends Command {
  /**
   * @param {Object} options - Command options
   * @param {string} options.description - Command description
   * @param {Layer} options.layer - Target layer
   * @param {Array<Object>} options.changes - Array of cell changes
   * @param {number} options.changes[].index - Cell index
   * @param {Object} options.changes[].before - Cell state before change
   * @param {Object} options.changes[].after - Cell state after change
   * @param {string} options.tool - Tool that created this command (for merging)
   * @param {Object} options.stateManager - StateManager for emitting events
   * @param {Object} options.scene - Scene for coordinate calculations
   */
  constructor(options) {
    if (!options.description) {
      throw new Error("CellCommand description is required");
    }
    if (!options.layer) {
      throw new Error("CellCommand layer is required");
    }
    if (!options.changes || !Array.isArray(options.changes)) {
      throw new Error("CellCommand changes array is required");
    }

    super(options.description);

    this.layer = options.layer;
    this.changes = options.changes;
    this.tool = options.tool || "unknown";
    this.stateManager = options.stateManager;
    this.scene = options.scene;

    // Validate changes
    this.changes.forEach((change, index) => {
      if (typeof change.index !== "number") {
        throw new Error(`Change ${index}: index must be a number`);
      }
      if (!change.before || !change.after) {
        throw new Error(`Change ${index}: must have before and after states`);
      }
    });
  }

  /**
   * Execute the command - apply all cell changes
   */
  execute() {
    this.changes.forEach((change) => {
      // Convert index to x,y coordinates for layer.setCell if scene is available
      if (this.scene && typeof this.scene.w === "number") {
        const x = change.index % this.scene.w;
        const y = Math.floor(change.index / this.scene.w);

        this.layer.setCell(x, y, change.after);

        // Emit cell:changed event if we have stateManager and scene
        if (this.stateManager) {
          this.stateManager.emit("cell:changed", {
            x,
            y,
            layerId: this.layer.id,
            cell: { ...change.after },
          });
        }
      } else {
        // Fallback for tests or when scene is not available - use direct index
        this.layer.setCell(change.index, change.after);
      }
    });
    this.executed = true;
  }

  /**
   * Undo the command - restore previous cell states
   */
  undo() {
    this.changes.forEach((change) => {
      // Convert index to x,y coordinates for layer.setCell if scene is available
      if (this.scene && typeof this.scene.w === "number") {
        const x = change.index % this.scene.w;
        const y = Math.floor(change.index / this.scene.w);

        this.layer.setCell(x, y, change.before);

        // Emit cell:changed event for undo as well
        if (this.stateManager) {
          this.stateManager.emit("cell:changed", {
            x,
            y,
            layerId: this.layer.id,
            cell: { ...change.before },
          });
        }
      } else {
        // Fallback for tests or when scene is not available - use direct index
        this.layer.setCell(change.index, change.before);
      }
    });
  }

  /**
   * Check if this command can be merged with another
   * Commands can merge if they:
   * - Are both CellCommands
   * - Target the same layer
   * - Use the same tool
   * - Are recent (within merge time window)
   * - Don't overlap cell indices
   *
   * @param {Command} other - Command to potentially merge with
   * @returns {boolean}
   */
  canMerge(other) {
    if (!(other instanceof CellCommand)) {
      return false;
    }

    // Must be same layer and tool
    if (this.layer !== other.layer || this.tool !== other.tool) {
      return false;
    }

    // Must be recent (within 2 seconds)
    const timeDiff = other.timestamp - this.timestamp;
    if (timeDiff > 2000 || timeDiff < 0) {
      return false;
    }

    // Check for overlapping cell indices
    const thisIndices = new Set(this.changes.map((c) => c.index));
    const otherIndices = new Set(other.changes.map((c) => c.index));

    // Allow merging if no overlap, or if they're painting the same cells
    // (for continuous brush strokes over the same area)
    return !this.hasConflictingOverlap(thisIndices, otherIndices, other);
  }

  /**
   * Check if two sets of indices have conflicting overlaps
   * @param {Set} thisIndices - Indices from this command
   * @param {Set} otherIndices - Indices from other command
   * @param {CellCommand} other - Other command for state comparison
   * @returns {boolean}
   */
  hasConflictingOverlap(thisIndices, otherIndices, other) {
    for (const index of otherIndices) {
      if (thisIndices.has(index)) {
        // Find the changes for this index
        const thisChange = this.changes.find((c) => c.index === index);
        const otherChange = other.changes.find((c) => c.index === index);

        // If we can't find either change, assume conflict to be safe
        if (!thisChange || !otherChange) {
          return true;
        }

        // If the 'before' state of the other command doesn't match
        // our 'after' state, then we can't merge
        if (!this.cellsEqual(thisChange.after, otherChange.before)) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Merge another command into this one
   * @param {CellCommand} other - Command to merge
   */
  merge(other) {
    if (!this.canMerge(other)) {
      throw new Error("Cannot merge incompatible commands");
    }

    // Combine changes, avoiding duplicates
    const existingIndices = new Set(this.changes.map((c) => c.index));

    other.changes.forEach((otherChange) => {
      const existingChange = this.changes.find(
        (c) => c.index === otherChange.index,
      );

      if (existingChange) {
        // Update the 'after' state of existing change
        existingChange.after = { ...otherChange.after };
      } else {
        // Add new change
        this.changes.push({ ...otherChange });
      }
    });

    // Update description to reflect merged operation
    const totalCells = this.changes.length;
    this.description = this.generateMergedDescription(totalCells);

    // Update timestamp to the most recent
    this.timestamp = Math.max(this.timestamp, other.timestamp);
  }

  /**
   * Generate description for merged command
   * @param {number} cellCount - Total number of cells affected
   * @returns {string}
   */
  generateMergedDescription(cellCount) {
    if (this.tool === "brush") {
      return `Paint ${cellCount} cell${cellCount === 1 ? "" : "s"}`;
    } else if (this.tool === "eraser") {
      return `Erase ${cellCount} cell${cellCount === 1 ? "" : "s"}`;
    } else {
      return `Modify ${cellCount} cell${cellCount === 1 ? "" : "s"}`;
    }
  }

  /**
   * Check if two cell objects are equal
   * @param {Object} cell1 - First cell
   * @param {Object} cell2 - Second cell
   * @returns {boolean}
   */
  cellsEqual(cell1, cell2) {
    return (
      cell1.ch === cell2.ch && cell1.fg === cell2.fg && cell1.bg === cell2.bg
    );
  }

  /**
   * Get the number of cells affected by this command
   * @returns {number}
   */
  getCellCount() {
    return this.changes.length;
  }

  /**
   * Get all cell indices affected by this command
   * @returns {Array<number>}
   */
  getAffectedIndices() {
    return this.changes.map((c) => c.index);
  }

  /**
   * Create a CellCommand from a single cell change
   * @param {Object} options - Options
   * @param {Layer} options.layer - Target layer
   * @param {number} options.index - Cell index
   * @param {Object} options.before - Previous cell state
   * @param {Object} options.after - New cell state
   * @param {string} options.tool - Tool name
   * @param {Object} options.stateManager - StateManager for events
   * @param {Object} options.scene - Scene for coordinates
   * @returns {CellCommand}
   */
  static fromSingleCell(options) {
    const { layer, index, before, after, tool, stateManager, scene } = options;

    const description =
      tool === "brush"
        ? "Paint cell"
        : tool === "eraser"
          ? "Erase cell"
          : "Modify cell";

    return new CellCommand({
      description,
      layer,
      changes: [{ index, before: { ...before }, after: { ...after } }],
      tool,
      stateManager,
      scene,
    });
  }

  /**
   * Create a CellCommand from multiple cell changes
   * @param {Object} options - Options
   * @param {Layer} options.layer - Target layer
   * @param {Array<Object>} options.changes - Array of changes
   * @param {string} options.tool - Tool name
   * @param {Object} options.stateManager - StateManager for events
   * @param {Object} options.scene - Scene for coordinates
   * @returns {CellCommand}
   */
  static fromMultipleCells(options) {
    const { layer, changes, tool, stateManager, scene } = options;
    const cellCount = changes.length;

    const description =
      tool === "brush"
        ? `Paint ${cellCount} cells`
        : tool === "eraser"
          ? `Erase ${cellCount} cells`
          : `Modify ${cellCount} cells`;

    return new CellCommand({
      description,
      layer,
      changes: changes.map((c) => ({
        index: c.index,
        before: { ...c.before },
        after: { ...c.after },
      })),
      tool,
      stateManager,
      scene,
    });
  }
}
