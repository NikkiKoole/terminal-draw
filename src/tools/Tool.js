/**
 * Tool.js - Base class for all drawing tools
 *
 * Provides the interface that all tools must implement.
 * Tools respond to mouse events and modify the scene.
 */

export class Tool {
  /**
   * Create a new tool
   * @param {string} name - Tool name (e.g., "Brush", "Eraser")
   */
  constructor(name = 'Tool') {
    this.name = name;
  }

  /**
   * Handle cell mouse down event
   * @param {number} x - Cell x coordinate
   * @param {number} y - Cell y coordinate
   * @param {Scene} scene - The scene being edited
   * @param {StateManager} stateManager - State manager for emitting events
   * @param {object} eventData - Additional event data (button, shiftKey, etc.)
   */
  onCellDown(x, y, scene, stateManager, eventData = {}) {
    // Override in subclass
  }

  /**
   * Handle cell drag event (mouse move while pressed)
   * @param {number} x - Cell x coordinate
   * @param {number} y - Cell y coordinate
   * @param {Scene} scene - The scene being edited
   * @param {StateManager} stateManager - State manager for emitting events
   * @param {object} eventData - Additional event data (button, shiftKey, etc.)
   */
  onCellDrag(x, y, scene, stateManager, eventData = {}) {
    // Override in subclass
  }

  /**
   * Handle cell mouse up event
   * @param {number} x - Cell x coordinate
   * @param {number} y - Cell y coordinate
   * @param {Scene} scene - The scene being edited
   * @param {StateManager} stateManager - State manager for emitting events
   * @param {object} eventData - Additional event data (button, shiftKey, etc.)
   */
  onCellUp(x, y, scene, stateManager, eventData = {}) {
    // Override in subclass
  }

  /**
   * Get the cursor style for this tool
   * @returns {string} CSS cursor value
   */
  getCursor() {
    return 'default';
  }
}
