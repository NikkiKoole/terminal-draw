/**
 * GlyphPicker.js - Character selection UI component
 *
 * Displays a floating modal with a grid of characters organized by category.
 * Users can filter by category and click a character to select it for the brush.
 */

import { GLYPHS } from "../core/constants.js";

export class GlyphPicker {
  /**
   * Create a glyph picker component
   * @param {object} brushTool - The brush tool to update
   * @param {StateManager} stateManager - State manager for events
   */
  constructor(brushTool, stateManager) {
    this.brushTool = brushTool;
    this.stateManager = stateManager;
    this.isOpen = false;
    this.selectedCategory = "CP437";

    this.modal = null;
    this.triggerButton = null;

    this.createModal();
    this.attachEventListeners();
  }

  /**
   * Create the modal element
   */
  createModal() {
    // Create modal backdrop and container
    const modal = document.createElement("div");
    modal.className = "glyph-picker-modal";
    modal.style.display = "none";

    modal.innerHTML = `
      <div class="glyph-picker-backdrop"></div>
      <div class="glyph-picker-container">
        <div class="glyph-picker-header">
          <h3>Select Character</h3>
          <button class="glyph-picker-close" title="Close">×</button>
        </div>

        <div class="glyph-picker-filter">
          <label for="glyph-category">Category:</label>
          <select id="glyph-category">
            <option value="ALL">All Characters</option>
            ${Object.entries(GLYPHS)
              .map(
                ([key, category]) =>
                  `<option value="${key}" ${key === this.selectedCategory ? "selected" : ""}>${category.name}</option>`,
              )
              .join("")}
          </select>
        </div>

        <div class="glyph-picker-grid" id="glyph-grid">
          ${this.renderGlyphs()}
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.modal = modal;
  }

  /**
   * Create trigger button for sidebar
   */
  createTriggerButton() {
    const button = document.createElement("button");
    button.id = "glyph-picker-trigger";
    button.className = "glyph-trigger-btn";

    this.updateTriggerButton(button);

    this.triggerButton = button;
    return button;
  }

  /**
   * Update trigger button with current character
   */
  updateTriggerButton(button = this.triggerButton) {
    if (!button) return;

    const currentCell = this.brushTool.getCurrentCell();
    const char = currentCell.ch || "█";

    button.innerHTML = `
      <span class="trigger-label">Character:</span>
      <span class="trigger-char">${char}</span>
    `;
  }

  /**
   * Render glyphs based on selected category
   */
  renderGlyphs() {
    let glyphs = [];

    if (this.selectedCategory === "ALL") {
      // All glyphs from all categories
      Object.values(GLYPHS).forEach((category) => {
        glyphs.push(...category.chars);
      });
    } else {
      // Specific category
      const category = GLYPHS[this.selectedCategory];
      if (category) {
        glyphs = category.chars;
      }
    }

    return glyphs
      .map(
        (char) =>
          `<button class="glyph-item" data-char="${char}" title="${char}">${char}</button>`,
      )
      .join("");
  }

  /**
   * Open the modal
   */
  open() {
    if (this.isOpen) return;

    this.isOpen = true;
    this.modal.style.display = "block";

    // Focus on category dropdown
    const dropdown = document.getElementById("glyph-category");
    if (dropdown) dropdown.focus();
  }

  /**
   * Close the modal
   */
  close() {
    if (!this.isOpen) return;

    this.isOpen = false;
    this.modal.style.display = "none";
  }

  /**
   * Handle category change
   */
  handleCategoryChange(category) {
    this.selectedCategory = category;

    // Re-render the grid
    const grid = document.getElementById("glyph-grid");
    if (grid) {
      grid.innerHTML = this.renderGlyphs();
    }
  }

  /**
   * Handle glyph selection
   */
  selectGlyph(char) {
    // Update brush tool
    const currentCell = this.brushTool.getCurrentCell();
    this.brushTool.setCurrentCell({
      ...currentCell,
      ch: char,
    });

    // Update trigger button
    this.updateTriggerButton();

    // Emit event
    this.stateManager.emit("glyph:selected", { char });

    // Close modal
    this.close();
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Close button
    const closeBtn = this.modal.querySelector(".glyph-picker-close");
    closeBtn.addEventListener("click", () => this.close());

    // Backdrop click
    const backdrop = this.modal.querySelector(".glyph-picker-backdrop");
    backdrop.addEventListener("click", () => this.close());

    // Escape key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.isOpen) {
        this.close();
      }
    });

    // Category dropdown
    const categorySelect = document.getElementById("glyph-category");
    categorySelect.addEventListener("change", (e) => {
      this.handleCategoryChange(e.target.value);
    });

    // Glyph selection (event delegation)
    const grid = document.getElementById("glyph-grid");
    grid.addEventListener("click", (e) => {
      const glyphItem = e.target.closest(".glyph-item");
      if (glyphItem) {
        const char = glyphItem.dataset.char;
        this.selectGlyph(char);
      }
    });

    // Listen to picker tool events to update trigger button
    this.stateManager.on("tool:picked", (data) => {
      if (data.cell && data.cell.ch) {
        this.updateTriggerButton();
      }
    });
  }

  /**
   * Get the trigger button element
   */
  getTriggerButton() {
    if (!this.triggerButton) {
      this.triggerButton = this.createTriggerButton();
    }
    return this.triggerButton;
  }

  /**
   * Clean up
   */
  destroy() {
    if (this.modal) {
      this.modal.remove();
    }
    if (this.triggerButton) {
      this.triggerButton.remove();
    }
  }
}
