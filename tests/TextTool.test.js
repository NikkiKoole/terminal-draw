import { describe, it, expect, beforeEach, vi } from "bun:test";
import { TextTool } from "../src/tools/TextTool.js";
import { Scene } from "../src/core/Scene.js";
import { StateManager } from "../src/core/StateManager.js";
import { CommandHistory } from "../src/commands/CommandHistory.js";
import { Cell } from "../src/core/Cell.js";

// Mock console.warn to suppress expected warnings
const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

// Mock DOM globals for testing
global.document = {
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};

global.window = {
  currentScene: null,
  currentStateManager: null,
};

describe("TextTool", () => {
  let textTool;
  let scene;
  let stateManager;
  let commandHistory;

  beforeEach(() => {
    // Create test scene
    scene = new Scene(20, 10);
    stateManager = new StateManager();
    commandHistory = new CommandHistory(100);

    // Set up global references
    global.window.currentScene = scene;
    global.window.currentStateManager = stateManager;

    // Create text tool
    textTool = new TextTool({ ch: "A", fg: 7, bg: -1 }, commandHistory);
  });

  describe("Constructor", () => {
    it("should create a TextTool with correct initial state", () => {
      expect(textTool.name).toBe("Text");
      expect(textTool.isTyping).toBe(false);
      expect(textTool.cursorX).toBeNull();
      expect(textTool.cursorY).toBeNull();
      expect(textTool.currentWord).toEqual([]);
      expect(textTool.wordChanges).toEqual([]);
    });

    it("should have correct default cell", () => {
      const tool = new TextTool();
      const cell = tool.getCurrentCell();
      expect(cell.ch).toBe(" ");
      expect(cell.fg).toBe(7);
      expect(cell.bg).toBe(-1);
    });
  });

  describe("Cell Management", () => {
    it("should set and get current cell correctly", () => {
      const newCell = { ch: "X", fg: 3, bg: 1 };
      textTool.setCurrentCell(newCell);

      const retrievedCell = textTool.getCurrentCell();
      expect(retrievedCell).toEqual(newCell);
      expect(retrievedCell).not.toBe(newCell); // Should be a copy
    });

    it("should set command history", () => {
      const newHistory = new CommandHistory(50);
      textTool.setCommandHistory(newHistory);
      expect(textTool.commandHistory).toBe(newHistory);
    });
  });

  describe("Paint Mode", () => {
    it("should set and get paint mode correctly", () => {
      expect(textTool.getPaintMode()).toBe("all");

      textTool.setPaintMode("fg");
      expect(textTool.getPaintMode()).toBe("fg");

      textTool.setPaintMode("bg");
      expect(textTool.getPaintMode()).toBe("bg");

      textTool.setPaintMode("glyph");
      expect(textTool.getPaintMode()).toBe("glyph");
    });

    it("should ignore invalid paint modes", () => {
      textTool.setPaintMode("invalid");
      expect(textTool.getPaintMode()).toBe("all");
    });
  });

  describe("Text Input State", () => {
    it("should start typing when cell is clicked", () => {
      const mockEmit = vi.fn();
      stateManager.emit = mockEmit;

      textTool.onCellDown(5, 3, scene, stateManager);

      expect(textTool.isTyping).toBe(true);
      expect(textTool.cursorX).toBe(5);
      expect(textTool.cursorY).toBe(3);
      expect(textTool.startX).toBe(5);
      expect(mockEmit).toHaveBeenCalledWith("text:cursor", {
        x: 5,
        y: 3,
        visible: true,
      });
      expect(mockEmit).toHaveBeenCalledWith("text:typing", { active: true });
    });

    it("should not start typing if layer is locked", () => {
      const layer = scene.getActiveLayer();
      layer.locked = true;

      textTool.onCellDown(5, 3, scene, stateManager);

      expect(textTool.isTyping).toBe(false);
    });

    it("should not start typing if layer is invisible", () => {
      const layer = scene.getActiveLayer();
      layer.visible = false;

      textTool.onCellDown(5, 3, scene, stateManager);

      expect(textTool.isTyping).toBe(false);
    });

    it("should stop typing correctly", () => {
      const mockEmit = vi.fn();
      stateManager.emit = mockEmit;

      // Start typing
      textTool.onCellDown(5, 3, scene, stateManager);
      expect(textTool.isTyping).toBe(true);

      // Stop typing
      textTool.stopTyping(stateManager);

      expect(textTool.isTyping).toBe(false);
      expect(textTool.cursorX).toBeNull();
      expect(textTool.cursorY).toBeNull();
      expect(textTool.startX).toBeNull();
      expect(mockEmit).toHaveBeenCalledWith("text:cursor", { visible: false });
      expect(mockEmit).toHaveBeenCalledWith("text:typing", { active: false });
    });
  });

  describe("Character Input", () => {
    beforeEach(() => {
      textTool.onCellDown(5, 3, scene, stateManager);
    });

    it("should add character and advance cursor", () => {
      textTool._addCharacter("A");

      expect(textTool.cursorX).toBe(6);
      expect(textTool.cursorY).toBe(3);
      expect(textTool.currentWord).toEqual(["A"]);
      expect(textTool.wordChanges).toHaveLength(1);

      const layer = scene.getActiveLayer();
      const cell = layer.getCell(5, 3);
      expect(cell.ch).toBe("A");
    });

    it("should ignore characters outside grid bounds", () => {
      textTool.cursorX = 25; // Outside grid
      textTool._addCharacter("X");

      expect(textTool.currentWord).toEqual([]);
      expect(textTool.wordChanges).toEqual([]);
    });

    it("should commit word on space character", () => {
      const executeSpy = vi.spyOn(commandHistory, "execute");

      textTool._addCharacter("A");
      textTool._addCharacter("B");
      textTool._addCharacter(" ");

      expect(executeSpy).toHaveBeenCalled();
      expect(textTool.currentWord).toEqual([]);
      expect(textTool.wordChanges).toEqual([]);
    });
  });

  describe("Special Key Handling", () => {
    beforeEach(() => {
      textTool.onCellDown(5, 3, scene, stateManager);
    });

    it("should handle Enter key - new line", () => {
      textTool._handleEnter();

      expect(textTool.cursorX).toBe(5); // Back to startX
      expect(textTool.cursorY).toBe(4); // One line down
    });

    it("should handle Backspace key", () => {
      textTool._addCharacter("A");
      textTool._addCharacter("B");

      expect(textTool.currentWord).toEqual(["A", "B"]);
      expect(textTool.cursorX).toBe(7);

      textTool._handleBackspace();

      expect(textTool.currentWord).toEqual(["A"]);
      expect(textTool.cursorX).toBe(6);
    });

    it("should handle Escape key", () => {
      const stopTypingSpy = vi.spyOn(textTool, "stopTyping");
      textTool._handleEscape();
      expect(stopTypingSpy).toHaveBeenCalled();
    });

    it("should handle arrow keys", () => {
      textTool._handleArrowLeft();
      expect(textTool.cursorX).toBe(4);

      textTool._handleArrowRight();
      expect(textTool.cursorX).toBe(5);

      textTool._handleArrowUp();
      expect(textTool.cursorY).toBe(2);

      textTool._handleArrowDown();
      expect(textTool.cursorY).toBe(3);
    });
  });

  describe("Paint Mode Integration", () => {
    beforeEach(() => {
      textTool.onCellDown(5, 3, scene, stateManager);
    });

    it("should apply 'all' paint mode correctly", () => {
      textTool.setPaintMode("all");
      textTool.setCurrentCell({ ch: "X", fg: 5, bg: 2 });

      const beforeCell = new Cell("O", 7, -1);
      const afterCell = textTool._applyPaintMode("A", beforeCell);

      expect(afterCell.ch).toBe("A");
      expect(afterCell.fg).toBe(5);
      expect(afterCell.bg).toBe(2);
    });

    it("should apply 'fg' paint mode correctly", () => {
      textTool.setPaintMode("fg");
      textTool.setCurrentCell({ ch: "X", fg: 5, bg: 2 });

      const beforeCell = new Cell("O", 7, -1);
      const afterCell = textTool._applyPaintMode("A", beforeCell);

      expect(afterCell.ch).toBe("O"); // Unchanged
      expect(afterCell.fg).toBe(5); // Changed
      expect(afterCell.bg).toBe(-1); // Unchanged
    });

    it("should apply 'bg' paint mode correctly", () => {
      textTool.setPaintMode("bg");
      textTool.setCurrentCell({ ch: "X", fg: 5, bg: 2 });

      const beforeCell = new Cell("O", 7, -1);
      const afterCell = textTool._applyPaintMode("A", beforeCell);

      expect(afterCell.ch).toBe("O"); // Unchanged
      expect(afterCell.fg).toBe(7); // Unchanged
      expect(afterCell.bg).toBe(2); // Changed
    });

    it("should apply 'glyph' paint mode correctly", () => {
      textTool.setPaintMode("glyph");
      textTool.setCurrentCell({ ch: "X", fg: 5, bg: 2 });

      const beforeCell = new Cell("O", 7, -1);
      const afterCell = textTool._applyPaintMode("A", beforeCell);

      expect(afterCell.ch).toBe("A"); // Changed
      expect(afterCell.fg).toBe(7); // Unchanged
      expect(afterCell.bg).toBe(-1); // Unchanged
    });
  });

  describe("Undo/Redo Integration", () => {
    beforeEach(() => {
      textTool.onCellDown(5, 3, scene, stateManager);
    });

    it("should create undo command for word", () => {
      const executeSpy = vi.spyOn(commandHistory, "execute");

      textTool._addCharacter("H");
      textTool._addCharacter("i");
      textTool._commitCurrentWord();

      expect(executeSpy).toHaveBeenCalledTimes(1);
      const command = executeSpy.mock.calls[0][0];
      expect(command.changes).toHaveLength(2);
    });

    it("should batch multiple characters into one command", () => {
      const executeSpy = vi.spyOn(commandHistory, "execute");

      textTool._addCharacter("H");
      textTool._addCharacter("e");
      textTool._addCharacter("l");
      textTool._addCharacter("l");
      textTool._addCharacter("o");
      textTool._commitCurrentWord();

      expect(executeSpy).toHaveBeenCalledTimes(1);
      const command = executeSpy.mock.calls[0][0];
      expect(command.changes).toHaveLength(5);
    });
  });

  describe("Keyboard Event Handling", () => {
    it("should handle keydown events correctly", () => {
      textTool.isTyping = true;

      const mockEvent = {
        key: "Enter",
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      };

      const handleEnterSpy = vi.spyOn(textTool, "_handleEnter");
      textTool.handleKeyDown(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
      expect(handleEnterSpy).toHaveBeenCalled();
    });

    it("should handle keypress events correctly", () => {
      textTool.isTyping = true;

      const mockEvent = {
        key: "a",
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      };

      const addCharacterSpy = vi.spyOn(textTool, "_addCharacter");
      textTool.handleKeyPress(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
      expect(addCharacterSpy).toHaveBeenCalledWith("a");
    });

    it("should ignore events when not typing", () => {
      textTool.isTyping = false;

      const mockEvent = {
        key: "a",
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      };

      const addCharacterSpy = vi.spyOn(textTool, "_addCharacter");
      textTool.handleKeyPress(mockEvent);

      expect(mockEvent.preventDefault).not.toHaveBeenCalled();
      expect(addCharacterSpy).not.toHaveBeenCalled();
    });
  });

  describe("Multi-line Text", () => {
    beforeEach(() => {
      textTool.onCellDown(5, 3, scene, stateManager);
    });

    it("should handle multi-line text correctly", () => {
      // Type first line
      textTool._addCharacter("L");
      textTool._addCharacter("i");
      textTool._addCharacter("n");
      textTool._addCharacter("e");
      textTool._addCharacter("1");

      // Enter new line
      textTool._handleEnter();

      // Type second line
      textTool._addCharacter("L");
      textTool._addCharacter("i");
      textTool._addCharacter("n");
      textTool._addCharacter("e");
      textTool._addCharacter("2");

      expect(textTool.cursorX).toBe(10); // 5 + 5 characters on second line
      expect(textTool.cursorY).toBe(4); // One line down from start

      // Check that text was placed correctly
      const layer = scene.getActiveLayer();
      expect(layer.getCell(5, 3).ch).toBe("L"); // First line start
      expect(layer.getCell(9, 3).ch).toBe("1"); // First line end
      expect(layer.getCell(5, 4).ch).toBe("L"); // Second line start
      expect(layer.getCell(9, 4).ch).toBe("2"); // Second line end
    });
  });

  describe("Tool Interface", () => {
    it("should return correct cursor style", () => {
      expect(textTool.getCursor()).toBe("text");
    });

    it("should handle drag and up events gracefully", () => {
      // These should not throw errors
      expect(() => {
        textTool.onCellDrag(1, 1, scene, stateManager);
        textTool.onCellUp(1, 1, scene, stateManager);
      }).not.toThrow();
    });
  });
});
