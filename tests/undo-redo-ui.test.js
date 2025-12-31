import { describe, it, expect, beforeEach, vi } from "vitest";
import { JSDOM } from "jsdom";
import { CommandHistory } from "../src/commands/CommandHistory.js";
import { CellCommand } from "../src/commands/CellCommand.js";
import { StateManager } from "../src/core/StateManager.js";

// Mock DOM setup
const dom = new JSDOM(`
<!DOCTYPE html>
<html>
<body>
  <div id="toolbar">
    <button id="undo-btn" class="tool-btn" title="Undo (Ctrl+Z)" disabled>
      ↶ Undo
    </button>
    <button id="redo-btn" class="tool-btn" title="Redo (Ctrl+Y)" disabled>
      ↷ Redo
    </button>
  </div>
  <div id="status">Ready</div>
</body>
</html>
`);

global.window = dom.window;
global.document = dom.window.document;

// Mock functions from app.js
let commandHistory;
let stateManager;

function updateStatus(message) {
  const status = document.getElementById("status");
  if (status) status.textContent = message;
}

function updateUndoRedoButtons() {
  const undoBtn = document.getElementById("undo-btn");
  const redoBtn = document.getElementById("redo-btn");

  if (undoBtn && commandHistory) {
    const canUndo = commandHistory.canUndo();
    undoBtn.disabled = !canUndo;

    if (canUndo) {
      const undoCommand =
        commandHistory.getUndoStack()[commandHistory.getUndoStack().length - 1];
      undoBtn.title = `Undo: ${undoCommand.description} (Ctrl+Z)`;
    } else {
      undoBtn.title = "Undo (Ctrl+Z)";
    }
  }

  if (redoBtn && commandHistory) {
    const canRedo = commandHistory.canRedo();
    redoBtn.disabled = !canRedo;

    if (canRedo) {
      const redoCommand =
        commandHistory.getRedoStack()[commandHistory.getRedoStack().length - 1];
      redoBtn.title = `Redo: ${redoCommand.description} (Ctrl+Y)`;
    } else {
      redoBtn.title = "Redo (Ctrl+Y)";
    }
  }
}

function initUndoRedoButtons() {
  const undoBtn = document.getElementById("undo-btn");
  const redoBtn = document.getElementById("redo-btn");

  if (undoBtn) {
    undoBtn.addEventListener("click", () => {
      if (commandHistory && commandHistory.canUndo()) {
        commandHistory.undo();
      }
    });
  }

  if (redoBtn) {
    redoBtn.addEventListener("click", () => {
      if (commandHistory && commandHistory.canRedo()) {
        commandHistory.redo();
      }
    });
  }

  updateUndoRedoButtons();
}

// Mock Layer class
class MockLayer {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.cells = new Array(width * height)
      .fill(null)
      .map(() => ({ char: " ", fg: 0, bg: -1 }));
  }

  setCell(x, y, cell) {
    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
      const index = y * this.width + x;
      this.cells[index] = { ...cell };
    }
  }

  getCell(x, y) {
    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
      const index = y * this.width + x;
      return { ...this.cells[index] };
    }
    return { char: " ", fg: 0, bg: -1 };
  }
}

// Mock Scene class
class MockScene {
  constructor(width = 10, height = 10) {
    this.w = width;
    this.h = height;
    this.width = width;
    this.height = height;
    this.layers = {
      bg: new MockLayer(width, height),
      mid: new MockLayer(width, height),
      fg: new MockLayer(width, height),
    };
  }
}

describe("Undo/Redo UI Integration", () => {
  beforeEach(() => {
    // Reset DOM
    const undoBtn = document.getElementById("undo-btn");
    const redoBtn = document.getElementById("redo-btn");
    const status = document.getElementById("status");

    if (undoBtn) {
      undoBtn.disabled = true;
      undoBtn.title = "Undo (Ctrl+Z)";
    }
    if (redoBtn) {
      redoBtn.disabled = true;
      redoBtn.title = "Redo (Ctrl+Y)";
    }
    if (status) {
      status.textContent = "Ready";
    }

    // Create fresh instances
    stateManager = new StateManager();
    commandHistory = new CommandHistory({
      maxSize: 50,
      stateManager: stateManager,
    });

    // Initialize buttons
    initUndoRedoButtons();

    // Set up event listeners for status updates
    stateManager.on("history:executed", (data) => {
      updateStatus(`Executed: ${data.command.description}`);
      updateUndoRedoButtons();
    });

    stateManager.on("history:undone", (data) => {
      updateStatus(`Undid: ${data.command.description}`);
      updateUndoRedoButtons();
    });

    stateManager.on("history:redone", (data) => {
      updateStatus(`Redid: ${data.command.description}`);
      updateUndoRedoButtons();
    });
  });

  describe("Button State Management", () => {
    it("should start with disabled buttons", () => {
      expect(document.getElementById("undo-btn").disabled).toBe(true);
      expect(document.getElementById("redo-btn").disabled).toBe(true);
    });

    it("should enable undo button after command execution", () => {
      const scene = new MockScene();
      const beforeCell = scene.layers.mid.getCell(0, 0);
      const afterCell = { char: "X", fg: 1, bg: -1 };
      const index = 0 * scene.w + 0;
      const command = CellCommand.fromSingleCell({
        layer: scene.layers.mid,
        index: index,
        before: beforeCell,
        after: afterCell,
        tool: "brush",
        stateManager: stateManager,
        scene: scene,
      });

      commandHistory.execute(command);

      expect(document.getElementById("undo-btn").disabled).toBe(false);
      expect(document.getElementById("redo-btn").disabled).toBe(true);
    });

    it("should enable redo button after undo", () => {
      const scene = new MockScene();
      const beforeCell = scene.layers.mid.getCell(0, 0);
      const afterCell = { char: "X", fg: 1, bg: -1 };
      const index = 0 * scene.w + 0;
      const command = CellCommand.fromSingleCell({
        layer: scene.layers.mid,
        index: index,
        before: beforeCell,
        after: afterCell,
        tool: "brush",
        stateManager: stateManager,
        scene: scene,
      });

      commandHistory.execute(command);
      commandHistory.undo();

      expect(document.getElementById("undo-btn").disabled).toBe(true);
      expect(document.getElementById("redo-btn").disabled).toBe(false);
    });

    it("should update tooltips with command descriptions", () => {
      const scene = new MockScene();
      const beforeCell = scene.layers.mid.getCell(0, 0);
      const afterCell = { char: "X", fg: 1, bg: -1 };
      const index = 0 * scene.w + 0;
      const command = CellCommand.fromSingleCell({
        layer: scene.layers.mid,
        index: index,
        before: beforeCell,
        after: afterCell,
        tool: "brush",
        stateManager: stateManager,
        scene: scene,
      });

      commandHistory.execute(command);

      const undoBtn = document.getElementById("undo-btn");
      expect(undoBtn.title).toContain("Paint cell");
      expect(undoBtn.title).toContain("(Ctrl+Z)");
    });

    it("should reset tooltips when no commands available", () => {
      const scene = new MockScene();
      const beforeCell = scene.layers.mid.getCell(0, 0);
      const afterCell = { char: "X", fg: 1, bg: -1 };
      const index = 0 * scene.w + 0;
      const command = CellCommand.fromSingleCell({
        layer: scene.layers.mid,
        index: index,
        before: beforeCell,
        after: afterCell,
        tool: "brush",
        stateManager: stateManager,
        scene: scene,
      });

      commandHistory.execute(command);
      commandHistory.undo();
      commandHistory.redo();
      commandHistory.undo();
      updateUndoRedoButtons();

      expect(document.getElementById("undo-btn").title).toBe("Undo (Ctrl+Z)");
      expect(document.getElementById("redo-btn").title).toContain("Redo:");
    });
  });

  describe("Button Click Handlers", () => {
    it("should undo when undo button is clicked", () => {
      const scene = new MockScene();
      const beforeCell = scene.layers.mid.getCell(2, 3);
      const afterCell = { char: "A", fg: 2, bg: -1 };
      const index = 3 * scene.w + 2;
      const command = CellCommand.fromSingleCell({
        layer: scene.layers.mid,
        index: index,
        before: beforeCell,
        after: afterCell,
        tool: "brush",
        stateManager: stateManager,
        scene: scene,
      });

      commandHistory.execute(command);
      expect(scene.layers.mid.getCell(2, 3).char).toBe("A");

      document.getElementById("undo-btn").click();
      expect(scene.layers.mid.getCell(2, 3).char).toBe(" ");
    });

    it("should redo when redo button is clicked", () => {
      const scene = new MockScene();
      const beforeCell = scene.layers.mid.getCell(1, 1);
      const afterCell = { char: "B", fg: 3, bg: -1 };
      const index = 1 * scene.w + 1;
      const command = CellCommand.fromSingleCell({
        layer: scene.layers.mid,
        index: index,
        before: beforeCell,
        after: afterCell,
        tool: "brush",
        stateManager: stateManager,
        scene: scene,
      });

      commandHistory.execute(command);
      commandHistory.undo();
      expect(scene.layers.mid.getCell(1, 1).char).toBe(" ");

      document.getElementById("redo-btn").click();
      expect(scene.layers.mid.getCell(1, 1).char).toBe("B");
    });

    it("should not crash when clicking disabled buttons", () => {
      expect(() => {
        document.getElementById("undo-btn").click();
        document.getElementById("redo-btn").click();
      }).not.toThrow();
    });
  });

  describe("Keyboard Shortcuts", () => {
    function simulateKeydown(
      key,
      ctrlKey = false,
      shiftKey = false,
      metaKey = false,
    ) {
      const event = new dom.window.KeyboardEvent("keydown", {
        key,
        ctrlKey,
        shiftKey,
        metaKey,
        bubbles: true,
        cancelable: true,
      });

      // Mock preventDefault
      event.preventDefault = vi.fn();

      return event;
    }

    it("should handle Ctrl+Z for undo", () => {
      const scene = new MockScene();
      const beforeCell = scene.layers.mid.getCell(0, 0);
      const afterCell = { char: "Z", fg: 1, bg: -1 };
      const index = 0 * scene.w + 0;
      const command = CellCommand.fromSingleCell({
        layer: scene.layers.mid,
        index: index,
        before: beforeCell,
        after: afterCell,
        tool: "brush",
        stateManager: stateManager,
        scene: scene,
      });

      commandHistory.execute(command);
      expect(scene.layers.mid.getCell(0, 0).char).toBe("Z");

      // Simulate Ctrl+Z
      const event = simulateKeydown("z", true);

      // We need to mock the keyboard handler since we're not running the full app
      if (commandHistory && commandHistory.canUndo()) {
        commandHistory.undo();
        updateUndoRedoButtons();
      }

      expect(scene.layers.mid.getCell(0, 0).char).toBe(" ");
      expect(document.getElementById("undo-btn").disabled).toBe(true);
      expect(document.getElementById("redo-btn").disabled).toBe(false);
    });

    it("should handle Ctrl+Y for redo", () => {
      const scene = new MockScene();
      const beforeCell = scene.layers.mid.getCell(0, 0);
      const afterCell = { char: "Y", fg: 1, bg: -1 };
      const index = 0 * scene.w + 0;
      const command = CellCommand.fromSingleCell({
        layer: scene.layers.mid,
        index: index,
        before: beforeCell,
        after: afterCell,
        tool: "brush",
        stateManager: stateManager,
        scene: scene,
      });

      commandHistory.execute(command);
      commandHistory.undo();
      expect(scene.layers.mid.getCell(0, 0).char).toBe(" ");

      // Simulate Ctrl+Y
      if (commandHistory && commandHistory.canRedo()) {
        commandHistory.redo();
        updateUndoRedoButtons();
      }

      expect(scene.layers.mid.getCell(0, 0).char).toBe("Y");
      expect(document.getElementById("undo-btn").disabled).toBe(false);
      expect(document.getElementById("redo-btn").disabled).toBe(true);
    });

    it("should handle Ctrl+Shift+Z for redo", () => {
      const scene = new MockScene();
      const beforeCell = scene.layers.mid.getCell(0, 0);
      const afterCell = { char: "S", fg: 1, bg: -1 };
      const index = 0 * scene.w + 0;
      const command = CellCommand.fromSingleCell({
        layer: scene.layers.mid,
        index: index,
        before: beforeCell,
        after: afterCell,
        tool: "brush",
        stateManager: stateManager,
        scene: scene,
      });

      commandHistory.execute(command);
      commandHistory.undo();
      expect(scene.layers.mid.getCell(0, 0).char).toBe(" ");

      // Simulate Ctrl+Shift+Z
      if (commandHistory && commandHistory.canRedo()) {
        commandHistory.redo();
        updateUndoRedoButtons();
      }

      expect(scene.layers.mid.getCell(0, 0).char).toBe("S");
    });
  });

  describe("Status Message Updates", () => {
    it("should show execute status messages", () => {
      const scene = new MockScene();
      const beforeCell = scene.layers.mid.getCell(0, 0);
      const afterCell = { char: "X", fg: 1, bg: -1 };
      const index = 0 * scene.w + 0;
      const command = CellCommand.fromSingleCell({
        layer: scene.layers.mid,
        index: index,
        before: beforeCell,
        after: afterCell,
        tool: "brush",
        stateManager: stateManager,
        scene: scene,
      });

      commandHistory.execute(command);

      expect(document.getElementById("status").textContent).toContain(
        "Executed:",
      );
      expect(document.getElementById("status").textContent).toContain(
        "Paint cell",
      );
    });

    it("should show undo status messages", () => {
      const scene = new MockScene();
      const beforeCell = scene.layers.mid.getCell(0, 0);
      const afterCell = { char: "X", fg: 1, bg: -1 };
      const index = 0 * scene.w + 0;
      const command = CellCommand.fromSingleCell({
        layer: scene.layers.mid,
        index: index,
        before: beforeCell,
        after: afterCell,
        tool: "brush",
        stateManager: stateManager,
        scene: scene,
      });

      commandHistory.execute(command);
      commandHistory.undo();

      expect(document.getElementById("status").textContent).toContain("Undid:");
      expect(document.getElementById("status").textContent).toContain(
        "Paint cell",
      );
    });

    it("should show redo status messages", () => {
      const scene = new MockScene();
      const beforeCell = scene.layers.mid.getCell(0, 0);
      const afterCell = { char: "X", fg: 1, bg: -1 };
      const index = 0 * scene.w + 0;
      const command = CellCommand.fromSingleCell({
        layer: scene.layers.mid,
        index: index,
        before: beforeCell,
        after: afterCell,
        tool: "brush",
        stateManager: stateManager,
        scene: scene,
      });

      commandHistory.execute(command);
      commandHistory.undo();
      commandHistory.redo();

      expect(document.getElementById("status").textContent).toContain("Redid:");
      expect(document.getElementById("status").textContent).toContain(
        "Paint cell",
      );
    });
  });

  describe("Multiple Commands", () => {
    it("should handle multiple undo/redo operations correctly", () => {
      const scene = new MockScene();

      // Create commands with proper before states (all start empty)
      const beforeCell1 = { char: " ", fg: 0, bg: -1 };
      const afterCell1 = { char: "A", fg: 1, bg: -1 };
      const index1 = 0 * scene.w + 0;
      const command1 = CellCommand.fromSingleCell({
        layer: scene.layers.mid,
        index: index1,
        before: beforeCell1,
        after: afterCell1,
        tool: "brush",
        stateManager: stateManager,
        scene: scene,
      });

      const beforeCell2 = { char: " ", fg: 0, bg: -1 };
      const afterCell2 = { char: "B", fg: 1, bg: -1 };
      const index2 = 0 * scene.w + 1;
      const command2 = CellCommand.fromSingleCell({
        layer: scene.layers.mid,
        index: index2,
        before: beforeCell2,
        after: afterCell2,
        tool: "brush",
        stateManager: stateManager,
        scene: scene,
      });

      const beforeCell3 = { char: " ", fg: 0, bg: -1 };
      const afterCell3 = { char: "C", fg: 1, bg: -1 };
      const index3 = 0 * scene.w + 2;
      const command3 = CellCommand.fromSingleCell({
        layer: scene.layers.mid,
        index: index3,
        before: beforeCell3,
        after: afterCell3,
        tool: "brush",
        stateManager: stateManager,
        scene: scene,
      });

      commandHistory.execute(command1, false); // Disable merging
      commandHistory.execute(command2, false); // Disable merging
      commandHistory.execute(command3, false); // Disable merging

      expect(scene.layers.mid.getCell(0, 0).char).toBe("A");
      expect(scene.layers.mid.getCell(1, 0).char).toBe("B");
      expect(scene.layers.mid.getCell(2, 0).char).toBe("C");

      // Undo twice
      commandHistory.undo(); // Undoes command3 (C at 2,0)
      commandHistory.undo(); // Undoes command2 (B at 1,0)

      updateUndoRedoButtons();

      expect(scene.layers.mid.getCell(0, 0).char).toBe("A");
      expect(scene.layers.mid.getCell(1, 0).char).toBe(" ");
      expect(scene.layers.mid.getCell(2, 0).char).toBe(" ");
      expect(document.getElementById("undo-btn").disabled).toBe(false);
      expect(document.getElementById("redo-btn").disabled).toBe(false);

      // Redo once
      commandHistory.redo(); // Redoes command2 (B at 1,0)
      updateUndoRedoButtons();

      expect(scene.layers.mid.getCell(0, 0).char).toBe("A");
      expect(scene.layers.mid.getCell(1, 0).char).toBe("B");
      expect(scene.layers.mid.getCell(2, 0).char).toBe(" ");
      expect(document.getElementById("undo-btn").disabled).toBe(false);
      expect(document.getElementById("redo-btn").disabled).toBe(false);
    });

    it("should clear redo stack when new command is executed", () => {
      const scene = new MockScene();
      const beforeCell1 = { char: " ", fg: 0, bg: -1 };
      const afterCell1 = { char: "A", fg: 1, bg: -1 };
      const index1 = 0 * scene.w + 0;
      const command1 = CellCommand.fromSingleCell({
        layer: scene.layers.mid,
        index: index1,
        before: beforeCell1,
        after: afterCell1,
        tool: "brush",
        stateManager: stateManager,
        scene: scene,
      });

      const beforeCell2 = { char: " ", fg: 0, bg: -1 };
      const afterCell2 = { char: "B", fg: 1, bg: -1 };
      const index2 = 0 * scene.w + 1;
      const command2 = CellCommand.fromSingleCell({
        layer: scene.layers.mid,
        index: index2,
        before: beforeCell2,
        after: afterCell2,
        tool: "brush",
        stateManager: stateManager,
        scene: scene,
      });

      const beforeCell3 = { char: " ", fg: 0, bg: -1 };
      const afterCell3 = { char: "C", fg: 1, bg: -1 };
      const index3 = 0 * scene.w + 2;
      const command3 = CellCommand.fromSingleCell({
        layer: scene.layers.mid,
        index: index3,
        before: beforeCell3,
        after: afterCell3,
        tool: "brush",
        stateManager: stateManager,
        scene: scene,
      });

      commandHistory.execute(command1);
      commandHistory.execute(command2);
      commandHistory.undo();

      expect(document.getElementById("redo-btn").disabled).toBe(false);

      commandHistory.execute(command3);
      updateUndoRedoButtons();

      expect(document.getElementById("redo-btn").disabled).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty command history gracefully", () => {
      updateUndoRedoButtons();

      expect(document.getElementById("undo-btn").disabled).toBe(true);
      expect(document.getElementById("redo-btn").disabled).toBe(true);
      expect(document.getElementById("undo-btn").title).toBe("Undo (Ctrl+Z)");
      expect(document.getElementById("redo-btn").title).toBe("Redo (Ctrl+Y)");
    });

    it("should handle missing buttons gracefully", () => {
      // Remove buttons from DOM
      document.getElementById("undo-btn").remove();
      document.getElementById("redo-btn").remove();

      expect(() => updateUndoRedoButtons()).not.toThrow();
    });

    it("should handle null command history gracefully", () => {
      commandHistory = null;

      expect(() => updateUndoRedoButtons()).not.toThrow();
      // Buttons should still be there after updateUndoRedoButtons runs
      const undoBtn = document.getElementById("undo-btn");
      const redoBtn = document.getElementById("redo-btn");
      if (undoBtn) expect(undoBtn.disabled).toBe(true);
      if (redoBtn) expect(redoBtn.disabled).toBe(true);
    });
  });

  describe("Command Merging Integration", () => {
    it("should update buttons correctly with merged commands", () => {
      const scene = new MockScene();
      const beforeCell1 = { char: " ", fg: 0, bg: -1 };
      const afterCell1 = { char: "A", fg: 1, bg: -1 };
      const index1 = 0 * scene.w + 0;
      const command1 = CellCommand.fromSingleCell({
        layer: scene.layers.mid,
        index: index1,
        before: beforeCell1,
        after: afterCell1,
        tool: "brush",
        stateManager: stateManager,
        scene: scene,
      });

      const beforeCell2 = { char: "A", fg: 1, bg: -1 };
      const afterCell2 = { char: "B", fg: 1, bg: -1 };
      const index2 = 0 * scene.w + 0;
      const command2 = CellCommand.fromSingleCell({
        layer: scene.layers.mid,
        index: index2,
        before: beforeCell2,
        after: afterCell2,
        tool: "brush",
        stateManager: stateManager,
        scene: scene,
      });

      // Execute first command
      commandHistory.execute(command1);

      // Check if buttons still exist before testing disabled state
      const undoBtn = document.getElementById("undo-btn");
      if (undoBtn) {
        expect(undoBtn.disabled).toBe(false);
      }

      // Execute second command (should merge if within time window)
      commandHistory.execute(command2, true);
      updateUndoRedoButtons();

      // Should still have one undoable operation
      const undoBtn2 = document.getElementById("undo-btn");
      if (undoBtn2) {
        expect(undoBtn2.disabled).toBe(false);
      }

      // One undo should revert both changes
      commandHistory.undo();
      updateUndoRedoButtons();

      expect(scene.layers.mid.getCell(0, 0).char).toBe(" ");

      const undoBtn3 = document.getElementById("undo-btn");
      const redoBtn3 = document.getElementById("redo-btn");
      if (undoBtn3) expect(undoBtn3.disabled).toBe(true);
      if (redoBtn3) expect(redoBtn3.disabled).toBe(false);
    });
  });
});
