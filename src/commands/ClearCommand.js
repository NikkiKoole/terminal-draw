/**
 * ClearCommand - Command for undoable clear operations
 *
 * Handles clearing entire grid or single layer operations.
 * Stores previous state for undo functionality.
 */

import { Command } from "./Command.js";
import { Cell } from "../core/Cell.js";

export class ClearCommand extends Command {
  /**
   * @param {Object} options - Command options
   * @param {string} options.description - Command description
   * @param {Scene} options.scene - Target scene
   * @param {Layer} options.layer - Target layer (null for all layers)
   * @param {Object} options.stateManager - StateManager for emitting events
   */
  constructor(options) {
    if (!options.description) {
      throw new Error("ClearCommand description is required");
    }
    if (!options.scene) {
      throw new Error("ClearCommand scene is required");
    }
    if (!options.stateManager) {
      throw new Error("ClearCommand stateManager is required");
    }

    super(options.description);

    this.scene = options.scene;
    this.layer = options.layer || null; // null means all layers
    this.stateManager = options.stateManager;
    this.previousState = null;
    this.affectedCellCount = 0;
  }

  /**
   * Execute the command - clear layer(s) and store previous state
   */
  execute() {
    if (this.layer) {
      // Clear single layer
      this.previousState = this.storeSingleLayerState(this.layer);
      this.layer.clear();
      this.affectedCellCount = this.countNonEmptyCells(
        this.previousState.cells,
      );

      // Emit events for all cells that changed
      this.emitCellChangeEvents(this.layer, this.previousState.cells);
    } else {
      // Clear all layers
      this.previousState = this.storeAllLayersState();
      this.scene.clearAll();
      this.affectedCellCount = this.countTotalNonEmptyCells();

      // Emit events for all layers
      this.scene.layers.forEach((layer, layerIndex) => {
        this.emitCellChangeEvents(
          layer,
          this.previousState.layers[layerIndex].cells,
        );
      });
    }

    this.executed = true;
  }

  /**
   * Undo the command - restore previous state
   */
  undo() {
    if (!this.previousState) {
      throw new Error("Cannot undo: no previous state stored");
    }

    if (this.layer) {
      // Restore single layer
      this.restoreSingleLayerState(this.layer, this.previousState);
      this.emitCellChangeEvents(this.layer, this.layer.cells);
    } else {
      // Restore all layers
      this.restoreAllLayersState();
      this.scene.layers.forEach((layer) => {
        this.emitCellChangeEvents(layer, layer.cells);
      });
    }
  }

  /**
   * Store the state of a single layer
   * @param {Layer} layer - Layer to store
   * @returns {Object} Stored layer state
   */
  storeSingleLayerState(layer) {
    return {
      layerId: layer.id,
      cells: layer.cells.map((cell) => new Cell(cell.ch, cell.fg, cell.bg)),
    };
  }

  /**
   * Store the state of all layers
   * @returns {Object} Stored scene state
   */
  storeAllLayersState() {
    return {
      layers: this.scene.layers.map((layer) =>
        this.storeSingleLayerState(layer),
      ),
    };
  }

  /**
   * Restore state to a single layer
   * @param {Layer} layer - Layer to restore
   * @param {Object} state - Previous layer state
   */
  restoreSingleLayerState(layer, state) {
    if (layer.cells.length !== state.cells.length) {
      throw new Error("Layer size mismatch during restore");
    }

    for (let i = 0; i < layer.cells.length; i++) {
      const cell = state.cells[i];
      layer.cells[i].ch = cell.ch;
      layer.cells[i].fg = cell.fg;
      layer.cells[i].bg = cell.bg;
    }
  }

  /**
   * Restore state to all layers
   */
  restoreAllLayersState() {
    if (this.scene.layers.length !== this.previousState.layers.length) {
      throw new Error("Layer count mismatch during restore");
    }

    this.scene.layers.forEach((layer, index) => {
      const layerState = this.previousState.layers[index];
      this.restoreSingleLayerState(layer, layerState);
    });
  }

  /**
   * Count non-empty cells in a cell array
   * @param {Cell[]} cells - Array of cells
   * @returns {number} Count of non-empty cells
   */
  countNonEmptyCells(cells) {
    return cells.filter((cell) => !cell.isEmpty()).length;
  }

  /**
   * Count total non-empty cells across all layers
   * @returns {number} Total count of non-empty cells
   */
  countTotalNonEmptyCells() {
    let total = 0;
    for (const layerState of this.previousState.layers) {
      total += this.countNonEmptyCells(layerState.cells);
    }
    return total;
  }

  /**
   * Emit cell change events for a layer
   * @param {Layer} layer - Layer that changed
   * @param {Cell[]} cells - New cell states
   */
  emitCellChangeEvents(layer, cells) {
    if (!this.stateManager) return;

    for (let i = 0; i < cells.length; i++) {
      const x = i % this.scene.w;
      const y = Math.floor(i / this.scene.w);

      this.stateManager.emit("cell:changed", {
        x,
        y,
        layerId: layer.id,
        cell: { ...cells[i] },
      });
    }
  }

  /**
   * Get the number of cells affected by this command
   * @returns {number}
   */
  getAffectedCellCount() {
    return this.affectedCellCount;
  }

  /**
   * Get layers affected by this command
   * @returns {Layer[]}
   */
  getAffectedLayers() {
    return this.layer ? [this.layer] : this.scene.layers;
  }

  /**
   * Create a ClearCommand for clearing a single layer
   * @param {Object} options - Options
   * @param {Scene} options.scene - Target scene
   * @param {Layer} options.layer - Target layer
   * @param {Object} options.stateManager - StateManager for events
   * @returns {ClearCommand}
   */
  static clearLayer(options) {
    const { scene, layer, stateManager } = options;

    return new ClearCommand({
      description: `Clear layer '${layer.name}'`,
      scene,
      layer,
      stateManager,
    });
  }

  /**
   * Create a ClearCommand for clearing all layers
   * @param {Object} options - Options
   * @param {Scene} options.scene - Target scene
   * @param {Object} options.stateManager - StateManager for events
   * @returns {ClearCommand}
   */
  static clearAll(options) {
    const { scene, stateManager } = options;

    return new ClearCommand({
      description: "Clear all layers",
      scene,
      layer: null,
      stateManager,
    });
  }
}
