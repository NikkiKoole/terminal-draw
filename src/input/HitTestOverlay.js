/**
 * HitTestOverlay - Handles mouse input and converts to grid coordinates
 *
 * Responsibilities:
 * - Convert mouse pixel coordinates to cell grid coordinates
 * - Handle mouse events (down, move, up, leave)
 * - Emit events via StateManager
 * - Prevent duplicate events for the same cell
 * - Account for scale/zoom transforms
 */

export class HitTestOverlay {
  /**
   * Create a new HitTestOverlay
   * @param {HTMLElement} element - The hit test overlay DOM element
   * @param {Scene} scene - The scene containing grid dimensions
   * @param {StateManager} stateManager - Event manager for emitting events
   * @param {number} scale - Current zoom scale percentage (default: 100)
   */
  constructor(element, scene, stateManager, scale = 100) {
    this.element = element;
    this.scene = scene;
    this.stateManager = stateManager;
    this.scale = scale;

    // Mouse state tracking
    this.isDown = false;
    this.lastX = null;
    this.lastY = null;
    this.hoverX = null;
    this.hoverY = null;

    // Bind event handlers
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.handleMouseLeave = this.handleMouseLeave.bind(this);

    // Attach listeners
    this.attachEventListeners();

    // Set initial size to match rendered cells
    this.updateOverlaySize();
  }

  /**
   * Update the overlay size to match the actual rendered grid
   */
  updateOverlaySize() {
    if (!this.element || !this.scene) {
      return;
    }

    const { width, height } = this.getCellDimensions();
    const totalWidth = this.scene.w * width;
    const totalHeight = this.scene.h * height;

    this.element.style.width = `${totalWidth}px`;
    this.element.style.height = `${totalHeight}px`;
  }

  /**
   * Attach event listeners to the overlay element
   */
  attachEventListeners() {
    this.element.addEventListener("mousedown", this.handleMouseDown);
    this.element.addEventListener("mousemove", this.handleMouseMove);
    this.element.addEventListener("mouseup", this.handleMouseUp);
    this.element.addEventListener("mouseleave", this.handleMouseLeave);
  }

  /**
   * Remove event listeners (cleanup)
   */
  detachEventListeners() {
    this.element.removeEventListener("mousedown", this.handleMouseDown);
    this.element.removeEventListener("mousemove", this.handleMouseMove);
    this.element.removeEventListener("mouseup", this.handleMouseUp);
    this.element.removeEventListener("mouseleave", this.handleMouseLeave);
  }

  /**
   * Convert mouse event coordinates to cell grid coordinates
   * @param {MouseEvent} event - Mouse event
   * @returns {{x: number, y: number}|null} Cell coordinates or null if out of bounds
   */
  getCellCoords(event) {
    if (!this.element || !this.scene) {
      return null;
    }

    // Get the bounding rectangle of the hit test layer
    const rect = this.element.getBoundingClientRect();

    // Calculate mouse position relative to the element
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    // Account for scale transform
    // The element is scaled, so we need to "unscale" the coordinates
    const scaleFactor = this.scale / 100;
    const unscaledX = mouseX / scaleFactor;
    const unscaledY = mouseY / scaleFactor;

    // Get cell dimensions
    const { width: cellWidth, height: cellHeight } = this.getCellDimensions();

    // Calculate cell coordinates
    const cellX = Math.floor(unscaledX / cellWidth);
    const cellY = Math.floor(unscaledY / cellHeight);

    // Validate bounds
    if (
      cellX < 0 ||
      cellX >= this.scene.w ||
      cellY < 0 ||
      cellY >= this.scene.h
    ) {
      return null;
    }

    return { x: cellX, y: cellY };
  }

  /**
   * Get the cell dimensions in pixels
   * @returns {{width: number, height: number}} Cell dimensions in pixels
   */
  getCellDimensions() {
    // Calculate actual cell dimensions from the rendered grid
    // The cells are inline-block with 1ch width in monospace font
    // We need to measure the actual rendered dimensions

    // Try to get a rendered cell to measure
    const container =
      this.element.parentElement?.querySelector(".visual-layer");
    if (container) {
      const firstCell = container.querySelector(".cell");
      if (firstCell) {
        const rect = firstCell.getBoundingClientRect();
        // Account for current scale
        const scaleFactor = this.scale / 100;
        const actualWidth = rect.width / scaleFactor;
        const actualHeight = rect.height / scaleFactor;
        if (actualWidth > 0 && actualHeight > 0) {
          return { width: actualWidth, height: actualHeight };
        }
      }
    }

    // Fallback: try to read from CSS custom property
    const rootStyles = getComputedStyle(document.documentElement);
    const cellSizeStr = rootStyles.getPropertyValue("--cell-size").trim();

    if (cellSizeStr) {
      const size = parseFloat(cellSizeStr);
      return { width: size, height: size };
    }

    // Final fallback to default
    return { width: 16, height: 16 };
  }

  /**
   * Get the cell size in pixels (for backwards compatibility)
   * @returns {number} Cell size in pixels
   */
  getCellSize() {
    const dims = this.getCellDimensions();
    return dims.width;
  }

  /**
   * Update the scale factor
   * @param {number} newScale - New scale percentage
   */
  updateScale(newScale) {
    this.scale = newScale;
    // Update overlay size when scale changes
    this.updateOverlaySize();
  }

  /**
   * Set cursor style
   * @param {string} cursor - CSS cursor value
   */
  setCursor(cursor) {
    if (this.element) {
      this.element.style.cursor = cursor;
    }
  }

  /**
   * Handle mouse down event
   * @param {MouseEvent} event - Mouse event
   */
  handleMouseDown(event) {
    event.preventDefault();

    const coords = this.getCellCoords(event);
    if (!coords) return;

    this.isDown = true;
    this.lastX = coords.x;
    this.lastY = coords.y;

    // Emit cell:down event
    this.stateManager.emit("cell:down", {
      x: coords.x,
      y: coords.y,
      button: event.button,
      shiftKey: event.shiftKey,
      ctrlKey: event.ctrlKey,
      altKey: event.altKey,
    });
  }

  /**
   * Handle mouse move event
   * @param {MouseEvent} event - Mouse event
   */
  handleMouseMove(event) {
    const coords = this.getCellCoords(event);

    // Always emit hover event (even if null for out of bounds)
    if (coords) {
      // Check if hover position changed
      if (this.hoverX !== coords.x || this.hoverY !== coords.y) {
        this.hoverX = coords.x;
        this.hoverY = coords.y;

        this.stateManager.emit("cell:hover", {
          x: coords.x,
          y: coords.y,
        });
      }

      // If mouse is down, emit drag events
      if (this.isDown) {
        // Only emit if cell changed (prevent duplicate events)
        if (this.lastX !== coords.x || this.lastY !== coords.y) {
          this.lastX = coords.x;
          this.lastY = coords.y;

          this.stateManager.emit("cell:drag", {
            x: coords.x,
            y: coords.y,
            button: event.button,
            shiftKey: event.shiftKey,
            ctrlKey: event.ctrlKey,
            altKey: event.altKey,
          });
        }
      }
    } else {
      // Out of bounds - clear hover
      if (this.hoverX !== null || this.hoverY !== null) {
        this.hoverX = null;
        this.hoverY = null;

        this.stateManager.emit("cell:hover", {
          x: null,
          y: null,
        });
      }
    }
  }

  /**
   * Handle mouse up event
   * @param {MouseEvent} event - Mouse event
   */
  handleMouseUp(event) {
    if (!this.isDown) return;

    const coords = this.getCellCoords(event);

    this.isDown = false;
    this.lastX = null;
    this.lastY = null;

    // Emit cell:up event even if out of bounds
    this.stateManager.emit("cell:up", {
      x: coords ? coords.x : null,
      y: coords ? coords.y : null,
      button: event.button,
      shiftKey: event.shiftKey,
      ctrlKey: event.ctrlKey,
      altKey: event.altKey,
    });
  }

  /**
   * Handle mouse leave event
   * @param {MouseEvent} event - Mouse event
   */
  handleMouseLeave(event) {
    // Clear hover state
    if (this.hoverX !== null || this.hoverY !== null) {
      this.hoverX = null;
      this.hoverY = null;

      this.stateManager.emit("cell:hover", {
        x: null,
        y: null,
      });
    }

    // If mouse was down, emit leave event
    if (this.isDown) {
      this.stateManager.emit("cell:leave", {
        wasDown: true,
      });

      this.isDown = false;
      this.lastX = null;
      this.lastY = null;
    }
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.detachEventListeners();
    this.element = null;
    this.scene = null;
    this.stateManager = null;
  }
}
