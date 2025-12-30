/**
 * LayerRenderer - Renders Layer objects to DOM
 *
 * Handles:
 * - Full layer rendering (creating all DOM elements)
 * - Single cell updates (dirty updates)
 * - Color class application (fg-X, bg-Y)
 * - Layer visibility
 */

export class LayerRenderer {
  constructor() {
    // Track rendered containers for potential optimizations
    this.renderedContainers = new WeakMap();
  }

  /**
   * Render a complete layer to a DOM container
   * @param {Layer} layer - Layer to render
   * @param {HTMLElement} container - DOM container element
   */
  render(layer, container) {
    if (!layer || !container) {
      console.error("LayerRenderer.render: Invalid layer or container");
      return;
    }

    // Handle visibility
    if (!layer.visible) {
      container.classList.add("hidden");
      return;
    } else {
      container.classList.remove("hidden");
    }

    // Clear existing content
    container.innerHTML = "";

    // Add ligatures class if enabled
    if (layer.ligatures) {
      container.classList.add("ligatures-enabled");
    } else {
      container.classList.remove("ligatures-enabled");
    }

    // Render all rows
    for (let y = 0; y < layer.height; y++) {
      const rowDiv = document.createElement("div");
      rowDiv.className = "grid-row";
      rowDiv.dataset.row = y;

      for (let x = 0; x < layer.width; x++) {
        const cell = layer.getCell(x, y);
        const cellSpan = this.createCellElement(cell, x, y);
        rowDiv.appendChild(cellSpan);
      }

      container.appendChild(rowDiv);
    }

    // Track that this container has been rendered
    this.renderedContainers.set(container, {
      layerId: layer.id,
      width: layer.width,
      height: layer.height,
    });
  }

  /**
   * Create a single cell DOM element
   * @param {Cell} cell - Cell data
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {HTMLElement} Span element for the cell
   */
  createCellElement(cell, x, y) {
    const span = document.createElement("span");
    span.className = "cell";
    span.dataset.x = x;
    span.dataset.y = y;

    // Set text content
    span.textContent = cell.ch;

    // Apply foreground color class
    span.classList.add(`fg-${cell.fg}`);

    // Apply background color class
    span.classList.add(`bg-${cell.bg}`);

    return span;
  }

  /**
   * Update a single cell in an already-rendered layer
   * @param {Layer} layer - Layer containing the cell
   * @param {HTMLElement} container - DOM container element
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {boolean} True if cell was updated, false otherwise
   */
  updateCell(layer, container, x, y) {
    if (!layer || !container) {
      return false;
    }

    // Validate coordinates
    if (!layer.isValidCoord(x, y)) {
      return false;
    }

    // Find the row
    const rowDiv = container.querySelector(`[data-row="${y}"]`);
    if (!rowDiv) {
      console.warn(`LayerRenderer.updateCell: Row ${y} not found`);
      return false;
    }

    // Find the cell span
    const cellSpan = rowDiv.querySelector(`[data-x="${x}"][data-y="${y}"]`);
    if (!cellSpan) {
      console.warn(`LayerRenderer.updateCell: Cell (${x}, ${y}) not found`);
      return false;
    }

    // Get the cell data
    const cell = layer.getCell(x, y);
    if (!cell) {
      return false;
    }

    // Update text content
    cellSpan.textContent = cell.ch;

    // Remove old color classes
    cellSpan.className = "cell";

    // Apply new color classes
    cellSpan.classList.add(`fg-${cell.fg}`);
    cellSpan.classList.add(`bg-${cell.bg}`);

    return true;
  }

  /**
   * Update layer visibility
   * @param {Layer} layer - Layer to update
   * @param {HTMLElement} container - DOM container element
   */
  updateVisibility(layer, container) {
    if (!layer || !container) {
      return;
    }

    if (layer.visible) {
      container.classList.remove("hidden");
    } else {
      container.classList.add("hidden");
    }
  }

  /**
   * Update ligatures setting
   * @param {Layer} layer - Layer to update
   * @param {HTMLElement} container - DOM container element
   */
  updateLigatures(layer, container) {
    if (!layer || !container) {
      return;
    }

    if (layer.ligatures) {
      container.classList.add("ligatures-enabled");
    } else {
      container.classList.remove("ligatures-enabled");
    }
  }

  /**
   * Clear a container
   * @param {HTMLElement} container - DOM container element
   */
  clear(container) {
    if (container) {
      container.innerHTML = "";
      this.renderedContainers.delete(container);
    }
  }

  /**
   * Check if a container has been rendered
   * @param {HTMLElement} container - DOM container element
   * @returns {boolean} True if container has been rendered
   */
  isRendered(container) {
    return this.renderedContainers.has(container);
  }
}
