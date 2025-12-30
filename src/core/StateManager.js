/**
 * StateManager - Simple event emitter for managing application state events
 *
 * Supports subscribing to events, unsubscribing, and emitting events with data.
 * Used for decoupled communication between different parts of the application.
 *
 * Supported events:
 * - 'scene:updated' - When scene data changes
 * - 'layer:changed' - When active layer changes
 * - 'tool:changed' - When active tool changes
 * - 'cell:changed' - When a cell is modified
 */

export class StateManager {
  constructor() {
    // Map of event names to arrays of callback functions
    this.listeners = new Map();
  }

  /**
   * Subscribe to an event
   * @param {string} event - Event name to listen for
   * @param {Function} callback - Function to call when event is emitted
   * @returns {Function} Unsubscribe function
   */
  on(event, callback) {
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }

    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }

    this.listeners.get(event).push(callback);

    // Return unsubscribe function for convenience
    return () => this.off(event, callback);
  }

  /**
   * Unsubscribe from an event
   * @param {string} event - Event name to stop listening to
   * @param {Function} callback - Callback function to remove
   * @returns {boolean} True if callback was found and removed
   */
  off(event, callback) {
    if (!this.listeners.has(event)) {
      return false;
    }

    const callbacks = this.listeners.get(event);
    const index = callbacks.indexOf(callback);

    if (index === -1) {
      return false;
    }

    callbacks.splice(index, 1);

    // Clean up empty event arrays
    if (callbacks.length === 0) {
      this.listeners.delete(event);
    }

    return true;
  }

  /**
   * Emit an event with optional data
   * @param {string} event - Event name to emit
   * @param {*} data - Optional data to pass to callbacks
   * @returns {number} Number of callbacks that were called
   */
  emit(event, data) {
    if (!this.listeners.has(event)) {
      return 0;
    }

    const callbacks = this.listeners.get(event);
    let count = 0;

    // Call each callback with the data
    for (const callback of callbacks) {
      try {
        callback(data);
        count++;
      } catch (error) {
        console.error(`Error in event listener for '${event}':`, error);
      }
    }

    return count;
  }

  /**
   * Remove all listeners for a specific event, or all events if no event specified
   * @param {string} [event] - Optional event name to clear. If omitted, clears all.
   */
  clear(event) {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  /**
   * Get the number of listeners for an event
   * @param {string} event - Event name
   * @returns {number} Number of listeners
   */
  listenerCount(event) {
    if (!this.listeners.has(event)) {
      return 0;
    }
    return this.listeners.get(event).length;
  }

  /**
   * Check if there are any listeners for an event
   * @param {string} event - Event name
   * @returns {boolean} True if event has listeners
   */
  hasListeners(event) {
    return this.listeners.has(event) && this.listeners.get(event).length > 0;
  }

  /**
   * Get all event names that have listeners
   * @returns {string[]} Array of event names
   */
  eventNames() {
    return Array.from(this.listeners.keys());
  }
}
