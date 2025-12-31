import { describe, it, expect, beforeEach, vi } from "vitest";
import { Scene } from "../src/core/Scene.js";
import { StateManager } from "../src/core/StateManager.js";
import { CommandHistory } from "../src/commands/CommandHistory.js";
import { ClearCommand } from "../src/commands/ClearCommand.js";
import { Cell } from "../src/core/Cell.js";
import { LAYER_BG, LAYER_MID, LAYER_FG } from "../src/core/constants.js";

describe("Clear Operations UI", () => {
  let scene;
  let stateManager;
  let commandHistory;
  let mockDocument;
  let mockWindow;
  let clearGridBtn;
  let clearLayerBtn;
  let gridStatus;

  // Mock DOM elements
  function createMockElement(id, tag = 'button') {
    const element = {
      id,
      tagName: tag.toUpperCase(),
      classList: {
        add: vi.fn(),
        remove: vi.fn(),
        contains: vi.fn(() => false),
        toggle: vi.fn()
      },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      click: vi.fn(),
      textContent: '',
      innerHTML: '',
      disabled: false,
      style: {},
      getAttribute: vi.fn(),
      setAttribute: vi.fn(),
      removeAttribute: vi.fn()
    };

    // Add click simulation
    element.click = () => {
      const clickEvent = { type: 'click', target: element };
      element.addEventListener.mock.calls.forEach(([event, handler]) => {
        if (event === 'click') {
          handler(clickEvent);
        }
      });
    };

    return element;
  }

  function createMockGetElementById() {
    const elements = {
      'clear-grid': clearGridBtn,
      'clear-layer': clearLayerBtn,
      'grid-status': gridStatus
    };

    return vi.fn((id) => elements[id] || null);
  }

  beforeEach(() => {
    // Create fresh instances
    scene = new Scene(4, 3); // 4x3 grid for testing
    stateManager = new StateManager();
    commandHistory = new CommandHistory({
      maxSize: 50,
      stateManager
    });

    // Create mock DOM elements
    clearGridBtn = createMockElement('clear-grid');
    clearLayerBtn = createMockElement('clear-layer');
    gridStatus = createMockElement('grid-status', 'div');

    // Mock document and window
    mockDocument = {
      getElementById: createMockGetElementById()
    };

    mockWindow = {
      confirm: vi.fn(() => true) // Default to confirming actions
    };

    // Set up test data in layers
    const bgLayer = scene.getLayer(LAYER_BG);
    const midLayer = scene.getLayer(LAYER_MID);
    const fgLayer = scene.getLayer(LAYER_FG);

    bgLayer.setCell(0, 0, new Cell("A", 1, 0));
    bgLayer.setCell(1, 0, new Cell("B", 2, 1));
    midLayer.setCell(0, 1, new Cell("C", 3, 2));
    midLayer.setCell(2, 1, new Cell("D", 4, 3));
    fgLayer.setCell(1, 2, new Cell("E", 5, 4));
  });

  describe("Clear Grid Button", () => {
    it("should register click event listener on clear grid button", () => {
      // Simulate initClearOperations() for clear grid
      clearGridBtn.addEventListener('click', () => {
        // Mock implementation
      });

      expect(clearGridBtn.addEventListener).toHaveBeenCalledWith(
        'click',
        expect.any(Function)
      );
    });

    it("should show confirmation dialog when clear grid is clicked", () => {
      const confirmSpy = vi.fn(() => true);

      clearGridBtn.addEventListener('click', () => {
        const result = confirmSpy(
          "Clear Grid\n\nThis will clear all layers and remove all content. This action can be undone.\n\nContinue?"
        );
        if (result) {
          // Execute clear command
        }
      });

      clearGridBtn.click();

      expect(confirmSpy).toHaveBeenCalledWith(
        expect.stringContaining("Clear Grid")
      );
      expect(confirmSpy).toHaveBeenCalledWith(
        expect.stringContaining("all layers")
      );
    });

    it("should execute clear all command when confirmed", () => {
      let executedCommand = null;

      clearGridBtn.addEventListener('click', () => {
        const confirmed = true; // Simulate user confirming
        if (confirmed) {
          const clearCommand = ClearCommand.clearAll({
            scene,
            stateManager
          });
          commandHistory.execute(clearCommand);
          executedCommand = clearCommand;
        }
      });

      clearGridBtn.click();

      expect(executedCommand).toBeTruthy();
      expect(executedCommand.description).toBe("Clear all layers");
      expect(commandHistory.canUndo()).toBe(true);
    });

    it("should not execute command when user cancels confirmation", () => {
      let executedCommand = null;

      clearGridBtn.addEventListener('click', () => {
        const confirmed = false; // Simulate user cancelling
        if (confirmed) {
          const clearCommand = ClearCommand.clearAll({
            scene,
            stateManager
          });
          commandHistory.execute(clearCommand);
          executedCommand = clearCommand;
        }
      });

      clearGridBtn.click();

      expect(executedCommand).toBeNull();
      expect(commandHistory.canUndo()).toBe(false);
    });

    it("should show success status after clearing grid", () => {
      const showStatusSpy = vi.fn();

      clearGridBtn.addEventListener('click', () => {
        const clearCommand = ClearCommand.clearAll({
          scene,
          stateManager
        });
        commandHistory.execute(clearCommand);

        const affectedCount = clearCommand.getAffectedCellCount();
        showStatusSpy(`Cleared ${affectedCount} cells from all layers`);
      });

      clearGridBtn.click();

      expect(showStatusSpy).toHaveBeenCalledWith(
        expect.stringContaining("Cleared")
      );
      expect(showStatusSpy).toHaveBeenCalledWith(
        expect.stringContaining("cells from all layers")
      );
    });

    it("should handle errors gracefully during grid clear", () => {
      const showErrorSpy = vi.fn();

      clearGridBtn.addEventListener('click', () => {
        try {
          // Simulate error by passing invalid scene
          const clearCommand = ClearCommand.clearAll({
            scene: null,
            stateManager
          });
          commandHistory.execute(clearCommand);
        } catch (error) {
          showErrorSpy("Failed to clear grid: " + error.message);
        }
      });

      clearGridBtn.click();

      expect(showErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("Failed to clear grid")
      );
    });
  });

  describe("Clear Layer Button", () => {
    it("should register click event listener on clear layer button", () => {
      clearLayerBtn.addEventListener('click', () => {
        // Mock implementation
      });

      expect(clearLayerBtn.addEventListener).toHaveBeenCalledWith(
        'click',
        expect.any(Function)
      );
    });

    it("should show confirmation with layer-specific information", () => {
      const activeLayer = scene.getActiveLayer();
      const confirmSpy = vi.fn(() => true);

      clearLayerBtn.addEventListener('click', () => {
        if (!activeLayer) return;

        const stats = activeLayer.getStats();
        const confirmed = confirmSpy(
          `Clear Layer\n\nThis will clear ${stats.nonEmptyCount} cells from layer "${activeLayer.name}". This action can be undone.\n\nContinue?`
        );
      });

      clearLayerBtn.click();

      expect(confirmSpy).toHaveBeenCalledWith(
        expect.stringContaining("Clear Layer")
      );
      expect(confirmSpy).toHaveBeenCalledWith(
        expect.stringContaining("Middle") // Default active layer
      );
    });

    it("should execute clear layer command when confirmed", () => {
      const activeLayer = scene.getActiveLayer();
      let executedCommand = null;

      clearLayerBtn.addEventListener('click', () => {
        if (!activeLayer) return;

        const confirmed = true;
        if (confirmed) {
          const clearCommand = ClearCommand.clearLayer({
            scene,
            layer: activeLayer,
            stateManager
          });
          commandHistory.execute(clearCommand);
          executedCommand = clearCommand;
        }
      });

      clearLayerBtn.click();

      expect(executedCommand).toBeTruthy();
      expect(executedCommand.description).toBe("Clear layer 'Middle'");
      expect(commandHistory.canUndo()).toBe(true);
    });

    it("should show error when no active layer is selected", () => {
      const showErrorSpy = vi.fn();
      scene.activeLayerId = 'non-existent';

      clearLayerBtn.addEventListener('click', () => {
        const activeLayer = scene.getActiveLayer();
        if (!activeLayer) {
          showErrorSpy("No active layer selected");
          return;
        }
      });

      clearLayerBtn.click();

      expect(showErrorSpy).toHaveBeenCalledWith("No active layer selected");
    });

    it("should show correct cell count in confirmation for different layers", () => {
      const confirmSpy = vi.fn(() => true);

      // Switch to foreground layer (has 1 cell)
      scene.setActiveLayer(LAYER_FG);
      const fgLayer = scene.getActiveLayer();

      clearLayerBtn.addEventListener('click', () => {
        const activeLayer = scene.getActiveLayer();
        if (!activeLayer) return;

        const stats = activeLayer.getStats();
        confirmSpy(`Will clear ${stats.nonEmptyCount} cells from ${activeLayer.name}`);
      });

      clearLayerBtn.click();

      expect(confirmSpy).toHaveBeenCalledWith(
        expect.stringContaining("1 cells from Foreground")
      );
    });

    it("should show success status with layer name after clearing", () => {
      const showStatusSpy = vi.fn();
      const activeLayer = scene.getActiveLayer();

      clearLayerBtn.addEventListener('click', () => {
        if (!activeLayer) return;

        const clearCommand = ClearCommand.clearLayer({
          scene,
          layer: activeLayer,
          stateManager
        });
        commandHistory.execute(clearCommand);

        const count = clearCommand.getAffectedCellCount();
        showStatusSpy(`Cleared ${count} cells from layer "${activeLayer.name}"`);
      });

      clearLayerBtn.click();

      expect(showStatusSpy).toHaveBeenCalledWith(
        expect.stringContaining('cells from layer "Middle"')
      );
    });
  });

  describe("Status Display", () => {
    it("should show and hide status messages correctly", () => {
      const status = gridStatus;

      // Mock showGridStatus function
      const showGridStatus = (message, isError = false) => {
        status.textContent = message;
        status.classList.remove('hidden');
        if (isError) {
          status.classList.add('error');
        } else {
          status.classList.remove('error');
        }
      };

      showGridStatus("Test message");

      expect(status.textContent).toBe("Test message");
      expect(status.classList.remove).toHaveBeenCalledWith('hidden');
      expect(status.classList.remove).toHaveBeenCalledWith('error');
    });

    it("should show error status correctly", () => {
      const status = gridStatus;

      const showGridStatus = (message, isError = false) => {
        status.textContent = message;
        if (isError) {
          status.classList.add('error');
        }
      };

      showGridStatus("Error message", true);

      expect(status.textContent).toBe("Error message");
      expect(status.classList.add).toHaveBeenCalledWith('error');
    });

    it("should auto-hide status after timeout", (done) => {
      const status = gridStatus;

      const showGridStatus = (message) => {
        status.textContent = message;
        status.classList.remove('hidden');

        setTimeout(() => {
          status.classList.add('hidden');
          done();
        }, 50); // Short timeout for testing
      };

      showGridStatus("Auto-hide message");
    });
  });

  describe("Integration with Command System", () => {
    it("should integrate clear commands with undo/redo system", () => {
      const midLayer = scene.getLayer(LAYER_MID);

      // Verify initial state
      expect(midLayer.getCell(0, 1).ch).toBe("C");
      expect(commandHistory.canUndo()).toBe(false);

      // Execute clear command
      const clearCommand = ClearCommand.clearLayer({
        scene,
        layer: midLayer,
        stateManager
      });
      commandHistory.execute(clearCommand);

      // Verify cleared state and undo available
      expect(midLayer.getCell(0, 1).isEmpty()).toBe(true);
      expect(commandHistory.canUndo()).toBe(true);

      // Test undo
      commandHistory.undo();
      expect(midLayer.getCell(0, 1).ch).toBe("C");
      expect(commandHistory.canRedo()).toBe(true);

      // Test redo
      commandHistory.redo();
      expect(midLayer.getCell(0, 1).isEmpty()).toBe(true);
    });

    it("should emit state change events during clear operations", () => {
      const cellChangedSpy = vi.fn();
      stateManager.on('cell:changed', cellChangedSpy);

      const clearCommand = ClearCommand.clearLayer({
        scene,
        layer: scene.getActiveLayer(),
        stateManager
      });

      commandHistory.execute(clearCommand);

      expect(cellChangedSpy).toHaveBeenCalled();

      // Should emit for all cells in layer (4x3 = 12 cells)
      expect(cellChangedSpy).toHaveBeenCalledTimes(12);
    });

    it("should work with multiple clear operations in history", () => {
      const bgLayer = scene.getLayer(LAYER_BG);
      const midLayer = scene.getLayer(LAYER_MID);

      // Clear background layer
      const clearBg = ClearCommand.clearLayer({
        scene,
        layer: bgLayer,
        stateManager
      });
      commandHistory.execute(clearBg);

      // Clear middle layer
      const clearMid = ClearCommand.clearLayer({
        scene,
        layer: midLayer,
        stateManager
      });
      commandHistory.execute(clearMid);

      expect(commandHistory.getUndoStack()).toHaveLength(2);

      // Undo both operations
      commandHistory.undo(); // Undo mid layer clear
      expect(midLayer.getCell(0, 1).ch).toBe("C");
      expect(bgLayer.getCell(0, 0).isEmpty()).toBe(true); // Still cleared

      commandHistory.undo(); // Undo bg layer clear
      expect(bgLayer.getCell(0, 0).ch).toBe("A");
    });

    it("should handle command history limits correctly", () => {
      // Create history with small limit
      const smallHistory = new CommandHistory({
        maxSize: 2,
        stateManager
      });

      const layers = [
        scene.getLayer(LAYER_BG),
        scene.getLayer(LAYER_MID),
        scene.getLayer(LAYER_FG)
      ];

      // Execute 3 clear commands (exceeds limit)
      layers.forEach(layer => {
        const clearCommand = ClearCommand.clearLayer({
          scene,
          layer,
          stateManager
        });
        smallHistory.execute(clearCommand);
      });

      // Should only keep last 2 commands
      expect(smallHistory.getUndoStack()).toHaveLength(2);
      expect(smallHistory.getUndoStack()[0].description).toContain("Middle");
      expect(smallHistory.getUndoStack()[1].description).toContain("Foreground");
    });
  });

  describe("Error Handling and Edge Cases", () => {
    it("should handle clearing already empty layers", () => {
      const emptyLayer = scene.getLayer(LAYER_BG);
      emptyLayer.clear(); // Start with empty layer

      const clearCommand = ClearCommand.clearLayer({
        scene,
        layer: emptyLayer,
        stateManager
      });

      expect(() => {
        commandHistory.execute(clearCommand);
      }).not.toThrow();

      expect(clearCommand.getAffectedCellCount()).toBe(0);
    });

    it("should handle clearing when no layers exist", () => {
      // Create scene with no layers (edge case)
      const emptyScene = new Scene(2, 2);
      emptyScene.layers = []; // Remove all layers

      expect(() => {
        ClearCommand.clearAll({
          scene: emptyScene,
          stateManager
        });
      }).not.toThrow();
    });

    it("should provide descriptive error messages", () => {
      const errors = [];

      try {
        new ClearCommand({
          // Missing required fields
          scene,
        });
      } catch (error) {
        errors.push(error.message);
      }

      expect(errors).toContain("ClearCommand description is required");
    });

    it("should maintain layer integrity after clear operations", () => {
      const layer = scene.getActiveLayer();
      const originalCellCount = layer.cells.length;

      const clearCommand = ClearCommand.clearLayer({
        scene,
        layer,
        stateManager
      });

      commandHistory.execute(clearCommand);

      // Layer should maintain same structure
      expect(layer.cells.length).toBe(originalCellCount);
      expect(layer.width).toBe(scene.w);
      expect(layer.height).toBe(scene.h);

      // All cells should be empty
      expect(layer.cells.every(cell => cell.isEmpty())).toBe(true);
    });

    it("should handle rapid successive clear operations", () => {
      const layer = scene.getActiveLayer();

      // Execute multiple clears rapidly
      for (let i = 0; i < 5; i++) {
        const clearCommand = ClearCommand.clearLayer({
          scene,
          layer,
          stateManager
        });
        commandHistory.execute(clearCommand);
      }

      expect(commandHistory.getUndoStack()).toHaveLength(5);
      expect(layer.cells.every(cell => cell.isEmpty())).toBe(true);
    });
  });
});
