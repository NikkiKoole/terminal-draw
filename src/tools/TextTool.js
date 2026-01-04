/**
 * TextTool.js - Text input tool for adding typed text to ASCII drawings
 *
 * Allows users to click to position a cursor and type text directly into the drawing.
 * Supports line breaks, basic editing, and integrates with existing paint modes.
 */

import { Tool } from "./Tool.js";
import { Cell } from "../core/Cell.js";
import { CellCommand } from "../commands/CellCommand.js";

export class TextTool extends Tool {
  /**
   * Create a new text tool
   * @param {object} currentCell - Initial cell to draw with {ch, fg, bg}
   * @param {CommandHistory} commandHistory - Command history for undo/redo
   */
  constructor(currentCell = { ch: " ", fg: 7, bg: -1 }, commandHistory = null) {
    super("Text");
    this.currentCell = { ...currentCell };
    this.commandHistory = commandHistory;
    this.paintMode = "all"; // "all", "fg", "bg", "glyph"

    // Text input state
    this.isTyping = false;
    this.cursorX = null;
    this.cursorY = null;
    this.startX = null; // Remember original X for new lines
    this.currentWord = []; // Buffer for current word (for undo batching)
    this.wordChanges = []; // Accumulated changes for current word

    // Store references to scene and state manager when activated
    this.scene = null;
    this.stateManager = null;

    // Bind methods for event handling
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyPress = this.handleKeyPress.bind(this);
  }

  /**
   * Set the current cell to draw with
   * @param {object} cell - Cell data {ch, fg, bg}
   */
  setCurrentCell(cell) {
    this.currentCell = { ...cell };
  }

  /**
   * Get the current cell being used
   * @returns {object} Current cell {ch, fg, bg}
   */
  getCurrentCell() {
    return { ...this.currentCell };
  }

  /**
   * Set command history for undo/redo operations
   * @param {CommandHistory} commandHistory - Command history instance
   */
  setCommandHistory(commandHistory) {
    this.commandHistory = commandHistory;
  }

  /**
   * Set the paint mode (which attributes to paint)
   * @param {string} mode - Paint mode: "all", "fg", "bg", or "glyph"
   */
  setPaintMode(mode) {
    const validModes = ["all", "fg", "bg", "glyph"];
    if (validModes.includes(mode)) {
      this.paintMode = mode;
    }
  }

  /**
   * Get the current paint mode
   * @returns {string} Current paint mode
   */
  getPaintMode() {
    return this.paintMode;
  }

  /**
   * Start text input at clicked position
   */
  onCellDown(x, y, scene, stateManager, eventData = {}) {
    // Store references for use in event handlers
    this.scene = scene;
    this.stateManager = stateManager;

    const activeLayer = scene.getActiveLayer();

    if (!activeLayer || !this.commandHistory) {
      return;
    }

    // Check if layer is locked or invisible
    if (activeLayer.locked || !activeLayer.visible) {
      return;
    }

    // Position cursor and start typing
    this.cursorX = x;
    this.cursorY = y;
    this.startX = x; // Remember starting X for new lines
    this.isTyping = true;
    this.currentWord = [];
    this.wordChanges = [];

    // Show text cursor
    if (stateManager) {
      stateManager.emit("text:cursor", { x, y, visible: true });
      stateManager.emit("text:typing", { active: true });
    }

    // Add keyboard event listeners
    this._addKeyboardListeners();
  }

  /**
   * Handle cell drag (no action for text tool)
   */
  onCellDrag(x, y, scene, stateManager, eventData = {}) {
    // Text tool doesn't use drag
  }

  /**
   * Handle cell up (no action for text tool)
   */
  onCellUp(x, y, scene, stateManager, eventData = {}) {
    // Text tool doesn't use mouse up
  }

  /**
   * Stop typing mode
   */
  stopTyping(stateManager) {
    if (!this.isTyping) {
      return;
    }

    // Always commit current word if any - this ensures no work is lost
    this._commitCurrentWord();

    this.isTyping = false;
    this.cursorX = null;
    this.cursorY = null;
    this.startX = null;
    this.scene = null;
    this.stateManager = null;

    // Hide text cursor
    if (stateManager) {
      stateManager.emit("text:cursor", { visible: false });
      stateManager.emit("text:typing", { active: false });
    }

    // Remove keyboard event listeners
    this._removeKeyboardListeners();
  }

  /**
   * Add keyboard event listeners for text input
   * @private
   */
  _addKeyboardListeners() {
    document.addEventListener("keydown", this.handleKeyDown, true);
    document.addEventListener("keypress", this.handleKeyPress, true);
  }

  /**
   * Remove keyboard event listeners
   * @private
   */
  _removeKeyboardListeners() {
    document.removeEventListener("keydown", this.handleKeyDown, true);
    document.removeEventListener("keypress", this.handleKeyPress, true);
  }

  /**
   * Handle keydown events for special keys
   * @private
   */
  handleKeyDown(event) {
    if (!this.isTyping) {
      return;
    }

    // Prevent default for keys we handle
    const handledKeys = [
      "Enter",
      "Backspace",
      "Escape",
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
    ];
    if (handledKeys.includes(event.key)) {
      event.preventDefault();
      event.stopPropagation();
    }

    switch (event.key) {
      case "Enter":
        this._handleEnter();
        break;
      case "Backspace":
        this._handleBackspace();
        break;
      case "Escape":
        this._handleEscape();
        break;
      case "ArrowLeft":
        this._handleArrowLeft();
        break;
      case "ArrowRight":
        this._handleArrowRight();
        break;
      case "ArrowUp":
        this._handleArrowUp();
        break;
      case "ArrowDown":
        this._handleArrowDown();
        break;
    }
  }

  /**
   * Handle keypress events for character input
   * @private
   */
  handleKeyPress(event) {
    if (!this.isTyping) {
      return;
    }

    // Prevent default for all printable characters
    if (event.key.length === 1) {
      event.preventDefault();
      event.stopPropagation();
      this._addCharacter(event.key);
    }
  }

  /**
   * Handle Enter key - new line
   * @private
   */
  _handleEnter() {
    // Commit current word before new line
    this._commitCurrentWord();

    // Move to next line, return to start X
    this.cursorY++;
    this.cursorX = this.startX;

    this._updateCursor();
  }

  /**
   * Handle Backspace key - delete previous character
   * @private
   */
  _handleBackspace() {
    if (this.currentWord.length > 0) {
      // Remove from current word buffer
      this.currentWord.pop();
      this.wordChanges.pop();
      this.cursorX--;
      this._clearCurrentCell();
    } else if (this.cursorX > 0) {
      // Commit pending changes and delete character to the left
      this._commitCurrentWord();
      this.cursorX--;
      this._deleteCharacterAt(this.cursorX, this.cursorY);
    }
    this._updateCursor();
  }

  /**
   * Handle Escape key - stop typing
   * @private
   */
  _handleEscape() {
    this.stopTyping(this.stateManager);
  }

  /**
   * Handle left arrow - move cursor left
   * @private
   */
  _handleArrowLeft() {
    this.cursorX--;
    this._updateCursor();
  }

  /**
   * Handle right arrow - move cursor right
   * @private
   */
  _handleArrowRight() {
    this.cursorX++;
    this._updateCursor();
  }

  /**
   * Handle up arrow - move cursor up
   * @private
   */
  _handleArrowUp() {
    this.cursorY--;
    this._updateCursor();
  }

  /**
   * Handle down arrow - move cursor down
   * @private
   */
  _handleArrowDown() {
    this.cursorY++;
    this._updateCursor();
  }

  /**
   * Add a character at current cursor position
   * @private
   */
  _addCharacter(char) {
    if (!this._isValidPosition(this.cursorX, this.cursorY)) return;

    const activeLayer = this.scene.getActiveLayer();
    const beforeCell = activeLayer.getCell(this.cursorX, this.cursorY);
    const afterCell = this._applyPaintMode(char, beforeCell);

    // Add to current word
    this.currentWord.push(char);
    this.wordChanges.push({
      x: this.cursorX,
      y: this.cursorY,
      before: beforeCell,
      after: afterCell,
    });

    // Apply change
    this._setCellAndUpdate(this.cursorX, this.cursorY, afterCell);
    this.cursorX++;
    this._updateCursor();

    // Commit word on space or punctuation
    if (char === " " || /[.,!?;:]/.test(char)) {
      this._commitCurrentWord();
    }
  }

  /**
   * Delete character at specific position and create undo command
   * @private
   */
  _deleteCharacterAt(x, y) {
    if (!this._isValidPosition(x, y)) return;

    const activeLayer = this.scene.getActiveLayer();
    const beforeCell = activeLayer.getCell(x, y);

    // Only delete if there's something to delete
    if (beforeCell.ch !== " ") {
      const emptyCell = new Cell(" ", 7, -1);
      this._setCellAndUpdate(x, y, emptyCell);

      // Create immediate undo command
      this._createUndoCommand(
        [
          {
            index: y * this.scene.w + x,
            before: beforeCell.toObject(),
            after: emptyCell.toObject(),
          },
        ],
        "text-delete",
      );
    }
  }

  /**
   * Clear the current cell
   * @private
   */
  _clearCurrentCell() {
    if (this._isValidPosition(this.cursorX, this.cursorY)) {
      const emptyCell = new Cell(" ", 7, -1);
      this._setCellAndUpdate(this.cursorX, this.cursorY, emptyCell);
    }
  }

  /**
   * Commit current word to undo history
   * @private
   */
  _commitCurrentWord() {
    if (this.wordChanges.length === 0) return;

    if (this.scene && this.commandHistory) {
      const changes = this.wordChanges.map((change) => ({
        index: change.y * this.scene.w + change.x,
        before: change.before.toObject(),
        after: change.after.toObject(),
      }));
      this._createUndoCommand(changes, "text");
    }

    // Clear word buffer
    this.currentWord = [];
    this.wordChanges = [];
  }

  /**
   * Update cursor position display
   * @private
   */
  _updateCursor() {
    if (this.stateManager && this.isTyping) {
      this.stateManager.emit("text:cursor", {
        x: this.cursorX,
        y: this.cursorY,
        visible: true,
      });
    }
  }

  /**
   * Check if position is valid within scene bounds
   * @private
   */
  _isValidPosition(x, y) {
    if (!this.scene) {
      console.warn("TextTool: No scene available");
      return false;
    }
    return x >= 0 && x < this.scene.w && y >= 0 && y < this.scene.h;
  }

  /**
   * Set cell and emit update event
   * @private
   */
  _setCellAndUpdate(x, y, cell) {
    const activeLayer = this.scene.getActiveLayer();
    activeLayer.setCell(x, y, cell);

    if (this.stateManager) {
      this.stateManager.emit("cell:changed", {
        x,
        y,
        cell,
        layerId: activeLayer.id,
      });
    }
  }

  /**
   * Create and execute undo command
   * @private
   */
  _createUndoCommand(changes, toolName) {
    const command = CellCommand.fromMultipleCells({
      layer: this.scene.getActiveLayer(),
      changes,
      tool: toolName,
      stateManager: this.stateManager,
      scene: this.scene,
    });
    this.commandHistory.execute(command);
  }

  /**
   * Apply paint mode to create new cell
   * @private
   */
  _applyPaintMode(char, beforeCell) {
    switch (this.paintMode) {
      case "fg":
        return new Cell(beforeCell.ch, this.currentCell.fg, beforeCell.bg);
      case "bg":
        return new Cell(beforeCell.ch, beforeCell.fg, this.currentCell.bg);
      case "glyph":
        return new Cell(char, beforeCell.fg, beforeCell.bg);
      default: // "all"
        return new Cell(char, this.currentCell.fg, this.currentCell.bg);
    }
  }

  /**
   * Get cursor style for this tool
   */
  getCursor() {
    return "text";
  }
}
