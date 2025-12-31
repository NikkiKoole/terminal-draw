/**
 * StartupDialog - Project Template Selection Dialog
 *
 * Displays a modal dialog for selecting project templates, dimensions,
 * and initial settings when starting a new project.
 */

import {
  PROJECT_TEMPLATES,
  getTemplate,
  getAllTemplates,
} from "../core/ProjectTemplate.js";
import { StateManager } from "../core/StateManager.js";
import palettes from "../palettes.json";

export class StartupDialog {
  constructor() {
    this.dialog = null;
    this.selectedTemplate = "standard"; // Default selection
    this.selectedPalette = "default";
    this.customDimensions = { w: 60, h: 25 }; // Match standard template default
    this.borderEnabled = false; // Default border setting
    this.borderStyle = "single"; // single or double
    this.onTemplateSelect = null; // Callback for template selection

    this.init();
  }

  /**
   * Initialize the dialog component
   */
  init() {
    this.createDialog();
    this.attachEventListeners();
    this.initializeDefaultTemplate();
  }

  /**
   * Initialize dimensions for the default template
   */
  initializeDefaultTemplate() {
    const template = getTemplate(this.selectedTemplate);
    if (template) {
      this.customDimensions = { ...template.defaultDimensions };
    }
  }

  /**
   * Create the dialog DOM structure
   */
  createDialog() {
    // Create modal backdrop
    this.dialog = document.createElement("div");
    this.dialog.className = "startup-dialog-overlay";
    this.dialog.innerHTML = `
      <div class="startup-dialog">
        <div class="startup-dialog-header">
          <h2>🎨 Create New Project</h2>
          <p>Choose a template to get started</p>
        </div>

        <div class="startup-dialog-content">
          <div class="template-section">
            <h3>Project Template</h3>
            <div class="template-cards">
              ${this.renderTemplateCards()}
            </div>
          </div>

          <div class="settings-section">
            <div class="settings-grid">
              <div class="setting-group">
                <label for="canvas-width">Width</label>
                <input type="number" id="canvas-width" value="80" min="10" max="200">
              </div>

              <div class="setting-group">
                <label for="canvas-height">Height</label>
                <input type="number" id="canvas-height" value="25" min="10" max="100">
              </div>

              <div class="setting-group palette-group">
                <label for="initial-palette">Color Palette</label>
                <select id="initial-palette">
                  ${this.renderPaletteOptions()}
                </select>
              </div>
            </div>

            <div class="border-section">
              <h4>Border Options</h4>
              <div class="border-controls">
                <div class="setting-group checkbox-group">
                  <label class="checkbox-label">
                    <input type="checkbox" id="enable-border" ${this.borderEnabled ? "checked" : ""}>
                    <span class="checkmark"></span>
                    Add border around canvas
                  </label>
                </div>

                <div class="setting-group border-style-group ${this.borderEnabled ? "" : "disabled"}">
                  <label>Border Style</label>
                  <div class="radio-group">
                    <label class="radio-label">
                      <input type="radio" name="border-style" value="single" ${this.borderStyle === "single" ? "checked" : ""}>
                      <span class="radio-mark"></span>
                      <span class="border-preview">┌─┐<br>│ │<br>└─┘</span>
                      Single Line
                    </label>
                    <label class="radio-label">
                      <input type="radio" name="border-style" value="double" ${this.borderStyle === "double" ? "checked" : ""}>
                      <span class="radio-mark"></span>
                      <span class="border-preview">╔═╗<br>║ ║<br>╚═╝</span>
                      Double Line
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="startup-dialog-footer">
          <div class="quick-start">
            <button id="quick-start-btn" class="btn btn-secondary">
              ⚡ Quick Start
            </button>
            <span class="quick-start-hint">Standard template with default settings</span>
          </div>

          <div class="custom-start">
            <button id="custom-start-btn" class="btn btn-primary">
              🚀 Create Project
            </button>
          </div>
        </div>
      </div>
    `;

    // Initially hide the dialog
    this.dialog.style.display = "none";
    document.body.appendChild(this.dialog);
  }

  /**
   * Render template selection cards
   */
  renderTemplateCards() {
    const templates = getAllTemplates();

    return templates
      .map(
        (template) => `
      <div class="template-card ${template.id === this.selectedTemplate ? "selected" : ""}"
           data-template-id="${template.id}">
        <div class="template-icon">${template.icon}</div>
        <div class="template-info">
          <h4>${template.name}</h4>
          <p class="template-description">${template.description}</p>
          <div class="template-details">
            <span class="layer-count">${template.layers.length} layer${template.layers.length > 1 ? "s" : ""}</span>
            <span class="recommended-size">${template.defaultDimensions.w}×${template.defaultDimensions.h}</span>
          </div>
          <p class="template-recommendation">${template.recommended}</p>
        </div>
      </div>
    `,
      )
      .join("");
  }

  /**
   * Render palette selection options
   */
  renderPaletteOptions() {
    return Object.keys(palettes)
      .map((paletteId) => {
        const palette = palettes[paletteId];
        return `<option value="${paletteId}"${paletteId === this.selectedPalette ? " selected" : ""}>${palette.name}</option>`;
      })
      .join("");
  }

  /**
   * Attach event listeners to dialog elements
   */
  attachEventListeners() {
    // Template card selection
    this.dialog.addEventListener("click", (e) => {
      const card = e.target.closest(".template-card");
      if (card) {
        this.selectTemplate(card.dataset.templateId);
      }
    });

    // Quick start button
    const quickStartBtn = this.dialog.querySelector("#quick-start-btn");
    quickStartBtn.addEventListener("click", () => {
      this.quickStart();
    });

    // Custom start button
    const customStartBtn = this.dialog.querySelector("#custom-start-btn");
    customStartBtn.addEventListener("click", () => {
      this.customStart();
    });

    // Dimension inputs
    const widthInput = this.dialog.querySelector("#canvas-width");
    const heightInput = this.dialog.querySelector("#canvas-height");

    widthInput.addEventListener("input", (e) => {
      this.customDimensions.w = parseInt(e.target.value) || 80;
    });

    heightInput.addEventListener("input", (e) => {
      this.customDimensions.h = parseInt(e.target.value) || 25;
    });

    // Palette selection
    const paletteSelect = this.dialog.querySelector("#initial-palette");
    paletteSelect.addEventListener("change", (e) => {
      this.selectedPalette = e.target.value;
    });

    // Border controls
    const borderCheckbox = this.dialog.querySelector("#enable-border");
    const borderStyleGroup = this.dialog.querySelector(".border-style-group");
    const borderRadios = this.dialog.querySelectorAll(
      'input[name="border-style"]',
    );

    borderCheckbox.addEventListener("change", (e) => {
      this.borderEnabled = e.target.checked;
      if (this.borderEnabled) {
        borderStyleGroup.classList.remove("disabled");
      } else {
        borderStyleGroup.classList.add("disabled");
      }
    });

    borderRadios.forEach((radio) => {
      radio.addEventListener("change", (e) => {
        if (e.target.checked) {
          this.borderStyle = e.target.value;
        }
      });
    });

    // Template selection updates dimensions
    try {
      StateManager.on("template-selected", (templateId) => {
        const template = getTemplate(templateId);
        if (template) {
          widthInput.value = template.defaultDimensions.w;
          heightInput.value = template.defaultDimensions.h;
          this.customDimensions = { ...template.defaultDimensions };
        }
      });
    } catch (e) {
      // StateManager not available (likely in tests)
      console.warn("StateManager not available for template events");
    }

    // Close dialog on backdrop click
    this.dialog.addEventListener("click", (e) => {
      if (e.target === this.dialog) {
        this.hide();
      }
    });

    // Keyboard shortcuts
    document.addEventListener("keydown", (e) => {
      if (this.isVisible()) {
        if (e.key === "Escape") {
          this.hide();
        } else if (e.key === "Enter" && !e.shiftKey) {
          this.customStart();
        } else if (e.key === "Enter" && e.shiftKey) {
          this.quickStart();
        }
      }
    });
  }

  /**
   * Select a template and update UI
   */
  selectTemplate(templateId) {
    // Always update visual selection (in case it's out of sync)
    this.dialog.querySelectorAll(".template-card").forEach((card) => {
      card.classList.remove("selected");
      if (card.dataset.templateId === templateId) {
        card.classList.add("selected");
      }
    });

    // Skip other updates if template hasn't changed
    if (this.selectedTemplate === templateId) return;

    this.selectedTemplate = templateId;

    // Update input fields directly with template dimensions
    const template = getTemplate(templateId);
    if (template) {
      const widthInput = this.dialog.querySelector("#canvas-width");
      const heightInput = this.dialog.querySelector("#canvas-height");
      if (widthInput) widthInput.value = template.defaultDimensions.w;
      if (heightInput) heightInput.value = template.defaultDimensions.h;
      this.customDimensions = { ...template.defaultDimensions };
    }

    // Emit event for dimension updates
    try {
      StateManager.emit("template-selected", templateId);
    } catch (e) {
      // StateManager not available (likely in tests)
    }
  }

  /**
   * Quick start with default standard template
   */
  quickStart() {
    const template = getTemplate("standard");
    const config = {
      template: "standard",
      dimensions: template.defaultDimensions,
      palette: "default",
      border: {
        enabled: false,
        style: "single",
      },
    };

    this.saveLastUsed(config);
    this.createProject(config);
  }

  /**
   * Custom start with user selections
   */
  customStart() {
    const config = {
      template: this.selectedTemplate,
      dimensions: this.customDimensions,
      palette: this.selectedPalette,
      border: {
        enabled: this.borderEnabled,
        style: this.borderStyle,
      },
    };

    this.validateAndCreateProject(config);
  }

  /**
   * Validate configuration and create project
   */
  validateAndCreateProject(config) {
    // Validate dimensions
    if (config.dimensions.w < 10 || config.dimensions.w > 200) {
      this.showError("Width must be between 10 and 200 characters");
      return;
    }

    if (config.dimensions.h < 10 || config.dimensions.h > 100) {
      this.showError("Height must be between 10 and 100 characters");
      return;
    }

    // Validate template
    const template = getTemplate(config.template);
    if (!template) {
      this.showError("Invalid template selection");
      return;
    }

    // Validate palette
    if (!palettes[config.palette]) {
      this.showError("Invalid palette selection");
      return;
    }

    this.saveLastUsed(config);
    this.createProject(config);
  }

  /**
   * Create project with given configuration
   */
  createProject(config) {
    if (this.onTemplateSelect) {
      this.onTemplateSelect(config);
    }

    try {
      StateManager.emit("project-template-selected", config);
    } catch (e) {
      // StateManager not available (likely in tests)
    }
    this.hide();
  }

  /**
   * Save last used configuration to localStorage
   */
  saveLastUsed(config) {
    try {
      localStorage.setItem(
        "terminal-draw-last-template",
        JSON.stringify(config),
      );
    } catch (e) {
      console.warn("Failed to save last used template:", e);
    }
  }

  /**
   * Load last used configuration from localStorage
   */
  loadLastUsed() {
    try {
      const saved = localStorage.getItem("terminal-draw-last-template");
      if (saved) {
        const config = JSON.parse(saved);
        this.selectedTemplate = config.template || "standard";
        this.selectedPalette = config.palette || "default";
        // Use template dimensions as fallback
        const template = getTemplate(this.selectedTemplate);
        this.customDimensions =
          config.dimensions ||
          (template ? { ...template.defaultDimensions } : { w: 60, h: 25 });
        this.borderEnabled = config.border?.enabled || false;
        this.borderStyle = config.border?.style || "single";

        // Update UI to reflect loaded values
        this.updateUIFromConfig(config);
      }
    } catch (e) {
      console.warn("Failed to load last used template:", e);

      // Only set default dimensions when localStorage failed/missing
      const template = getTemplate(this.selectedTemplate);
      if (template) {
        this.customDimensions = { ...template.defaultDimensions };

        // Update UI inputs to match template dimensions
        const widthInput = this.dialog.querySelector("#canvas-width");
        const heightInput = this.dialog.querySelector("#canvas-height");
        if (widthInput) widthInput.value = template.defaultDimensions.w;
        if (heightInput) heightInput.value = template.defaultDimensions.h;
      }
    }
  }

  /**
   * Update UI elements to reflect configuration
   */
  updateUIFromConfig(config) {
    // Update template selection
    this.selectTemplate(config.template);

    // Update dimension inputs
    const widthInput = this.dialog.querySelector("#canvas-width");
    const heightInput = this.dialog.querySelector("#canvas-height");
    if (widthInput) widthInput.value = config.dimensions.w;
    if (heightInput) heightInput.value = config.dimensions.h;

    // Update palette selection
    const paletteSelect = this.dialog.querySelector("#initial-palette");
    if (paletteSelect) paletteSelect.value = config.palette;

    // Update border settings
    const borderCheckbox = this.dialog.querySelector("#enable-border");
    const borderStyleGroup = this.dialog.querySelector(".border-style-group");
    if (borderCheckbox) {
      borderCheckbox.checked = config.border?.enabled || false;
      if (config.border?.enabled) {
        borderStyleGroup?.classList.remove("disabled");
      } else {
        borderStyleGroup?.classList.add("disabled");
      }
    }

    const borderRadios = this.dialog.querySelectorAll(
      'input[name="border-style"]',
    );
    borderRadios.forEach((radio) => {
      if (radio.value === (config.border?.style || "single")) {
        radio.checked = true;
      }
    });
  }

  /**
   * Show error message to user
   */
  showError(message) {
    // Remove any existing error
    const existingError = this.dialog.querySelector(".error-message");
    if (existingError) {
      existingError.remove();
    }

    // Create new error message
    const errorDiv = document.createElement("div");
    errorDiv.className = "error-message";
    errorDiv.textContent = message;

    const footer = this.dialog.querySelector(".startup-dialog-footer");
    footer.parentNode.insertBefore(errorDiv, footer);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      errorDiv.remove();
    }, 5000);
  }

  /**
   * Show the dialog
   */
  show() {
    this.loadLastUsed();
    this.dialog.style.display = "flex";
    document.body.classList.add("modal-open");

    // Focus first template card for keyboard navigation
    const firstCard = this.dialog.querySelector(".template-card");
    if (firstCard) {
      firstCard.focus();
    }
  }

  /**
   * Hide the dialog
   */
  hide() {
    this.dialog.style.display = "none";
    document.body.classList.remove("modal-open");
  }

  /**
   * Check if dialog is currently visible
   */
  isVisible() {
    return this.dialog.style.display !== "none";
  }

  /**
   * Set callback for when a template is selected
   */
  setOnTemplateSelect(callback) {
    this.onTemplateSelect = callback;
  }

  /**
   * Destroy the dialog and clean up
   */
  destroy() {
    if (this.dialog) {
      this.dialog.remove();
      document.body.classList.remove("modal-open");
    }
  }
}
