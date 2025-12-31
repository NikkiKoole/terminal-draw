/**
 * LayerPanel.js - Dynamic Layer management UI component
 *
 * Displays all layers dynamically with controls for:
 * - Setting active layer
 * - Toggling visibility
 * - Toggling lock state
 * - Adding new layers
 * - Removing layers
 */

export class LayerPanel {
  /**
   * Create a layer panel
   * @param {HTMLElement} container - Container element for the panel
   * @param {Scene} scene - The scene to manage
   * @param {StateManager} stateManager - State manager for events
   */
  constructor(container, scene, stateManager) {
    this.container = container;
    this.scene = scene;
    this.stateManager = stateManager;

    this.render();
    this.attachEventListeners();

    // Listen to layer changes from external sources
    this.stateManager.on("layer:changed", () => this.render());
    this.stateManager.on("scene:updated", () => this.render());
  }

  /**
   * Render the layer panel dynamically
   */
  render() {
    const layers = this.scene.layers.slice().reverse(); // Reverse for top-to-bottom display

    const html = `
      <div class="layer-panel">
        <div class="layer-panel-header">
          <h3>[L]ayers</h3>
          <button
            id="add-layer-btn"
            class="add-layer-btn"
            title="Add new layer"
          >
            +
          </button>
        </div>
        <div class="layer-list">
          ${layers
            .map((layer, displayIndex) => {
              const isActive = this.scene.activeLayerId === layer.id;
              const actualIndex = this.scene.layers.length - 1 - displayIndex;

              return `
              <div class="layer-item ${isActive ? "active" : ""}" data-layer-id="${layer.id}">
                <div class="layer-select" data-layer-id="${layer.id}" title="Set as active layer">
                  <span class="layer-name">${layer.name}</span>
                  ${isActive ? '<span class="layer-badge">●</span>' : ""}
                </div>
                <div class="layer-controls">
                  <button
                    class="layer-visibility ${layer.visible ? "layer-visible" : "layer-hidden"}"
                    data-layer-id="${layer.id}"
                    title="${layer.visible ? "Hide layer" : "Show layer"}"
                  >
                    ${layer.visible ? "👁️" : "👁️‍🗨️"}
                  </button>
                  <button
                    class="layer-lock ${layer.locked ? "locked" : "unlocked"}"
                    data-layer-id="${layer.id}"
                    title="${layer.locked ? "Unlock layer" : "Lock layer"}"
                  >
                    ${layer.locked ? "🔒" : "🔓"}
                  </button>
                  ${
                    this.scene.layers.length > 1
                      ? `
                    <button
                      class="layer-remove"
                      data-layer-id="${layer.id}"
                      title="Remove layer"
                    >
                      ×
                    </button>
                  `
                      : ""
                  }
                  <div class="layer-reorder-controls">
                    ${
                      actualIndex < this.scene.layers.length - 1
                        ? `
                      <button
                        class="layer-move"
                        data-layer-id="${layer.id}"
                        data-direction="up"
                        title="Move layer up"
                      >
                        ↑
                      </button>
                    `
                        : ""
                    }
                    ${
                      actualIndex > 0
                        ? `
                      <button
                        class="layer-move"
                        data-layer-id="${layer.id}"
                        data-direction="down"
                        title="Move layer down"
                      >
                        ↓
                      </button>
                    `
                        : ""
                    }
                  </div>
                </div>
              </div>
            `;
            })
            .join("")}
        </div>
        ${this.renderLayerTemplateMenu()}
      </div>
    `;

    this.container.innerHTML = html;
  }

  /**
   * Render the layer template menu for adding new layers
   */
  renderLayerTemplateMenu() {
    return `
      <div id="layer-template-menu" class="layer-template-menu hidden">
        <div class="template-menu-header">
          <h4>Add Layer</h4>
          <button id="close-template-menu" class="close-btn">×</button>
        </div>
        <div class="template-options">
          <button class="template-option" data-purpose="bg">
            <span class="template-icon">🏞️</span>
            <span class="template-name">Background</span>
          </button>
          <button class="template-option" data-purpose="fg">
            <span class="template-icon">🎭</span>
            <span class="template-name">Foreground</span>
          </button>
          <button class="template-option" data-purpose="detail">
            <span class="template-icon">✨</span>
            <span class="template-name">Detail</span>
          </button>
          <button class="template-option" data-purpose="effect">
            <span class="template-icon">⚡</span>
            <span class="template-name">Effect</span>
          </button>
          <button class="template-option" data-purpose="overlay">
            <span class="template-icon">📄</span>
            <span class="template-name">Overlay</span>
          </button>
          <button class="template-option" data-purpose="sketch">
            <span class="template-icon">✏️</span>
            <span class="template-name">Sketch</span>
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Attach event listeners to layer controls
   */
  attachEventListeners() {
    // Use event delegation for all clicks
    this.container.addEventListener("click", (e) => {
      // Handle different button types
      const button = e.target.closest("button");
      if (button) {
        const layerId = button.dataset.layerId;

        // Add layer button
        if (button.id === "add-layer-btn") {
          this.showAddLayerMenu();
          return;
        }

        // Close template menu
        if (button.id === "close-template-menu") {
          this.hideAddLayerMenu();
          return;
        }

        // Template option selection
        if (button.classList.contains("template-option")) {
          const purpose = button.dataset.purpose;
          this.addLayer(purpose);
          this.hideAddLayerMenu();
          return;
        }

        // Layer-specific controls
        if (!layerId) return;

        if (button.classList.contains("layer-visibility")) {
          this.toggleVisibility(layerId);
          return;
        } else if (button.classList.contains("layer-lock")) {
          this.toggleLock(layerId);
          return;
        } else if (button.classList.contains("layer-remove")) {
          this.removeLayer(layerId);
          return;
        } else if (button.classList.contains("layer-move")) {
          const direction = button.dataset.direction;
          this.moveLayer(layerId, direction);
          return;
        }
      }

      // Handle layer selection
      const layerItem = e.target.closest(".layer-item");
      if (layerItem && !e.target.closest("button")) {
        const layerId = layerItem.dataset.layerId;
        if (layerId) {
          this.setActiveLayer(layerId);
        }
      }
    });

    // Hide template menu when clicking outside
    document.addEventListener("click", (e) => {
      const templateMenu = document.getElementById("layer-template-menu");
      const addBtn = document.getElementById("add-layer-btn");

      if (
        templateMenu &&
        !templateMenu.contains(e.target) &&
        e.target !== addBtn
      ) {
        this.hideAddLayerMenu();
      }
    });
  }

  /**
   * Show the add layer template menu
   */
  showAddLayerMenu() {
    const menu = document.getElementById("layer-template-menu");
    if (menu) {
      menu.classList.remove("hidden");
    }
  }

  /**
   * Hide the add layer template menu
   */
  hideAddLayerMenu() {
    const menu = document.getElementById("layer-template-menu");
    if (menu) {
      menu.classList.add("hidden");
    }
  }

  /**
   * Add a new layer with the specified purpose
   */
  addLayer(purpose) {
    try {
      const newLayer = this.scene.addSmartLayer(purpose);
      this.stateManager.emit("layer:added", {
        layerId: newLayer.id,
        name: newLayer.name,
        purpose: purpose,
      });
      this.stateManager.emit("scene:updated", { reason: "layer_added" });

      // Set the new layer as active
      this.scene.setActiveLayer(newLayer.id);
      this.stateManager.emit("layer:active", { layerId: newLayer.id });

      this.render();

      // Re-create layer containers to include the new layer
      this.stateManager.emit("layers:structure_changed");
    } catch (error) {
      console.error("Failed to add layer:", error);
      this.stateManager.emit("error", {
        message: `Failed to add ${purpose} layer: ${error.message}`,
      });
    }
  }

  /**
   * Remove a layer
   */
  removeLayer(layerId) {
    if (this.scene.layers.length <= 1) {
      this.stateManager.emit("error", {
        message: "Cannot remove the last layer",
      });
      return;
    }

    const layer = this.scene.getLayer(layerId);
    if (!layer) {
      this.stateManager.emit("error", { message: "Layer not found" });
      return;
    }

    const layerName = layer.name;

    if (confirm(`Remove layer "${layerName}"? This action cannot be undone.`)) {
      try {
        const success = this.scene.removeLayer(layerId);
        if (success) {
          this.stateManager.emit("layer:removed", { layerId, name: layerName });
          this.stateManager.emit("scene:updated", { reason: "layer_removed" });
          this.stateManager.emit("layers:structure_changed");
          this.render();
        } else {
          this.stateManager.emit("error", {
            message: "Failed to remove layer",
          });
        }
      } catch (error) {
        console.error("Failed to remove layer:", error);
        this.stateManager.emit("error", {
          message: `Failed to remove layer: ${error.message}`,
        });
      }
    }
  }

  /**
   * Move layer up or down
   */
  moveLayer(layerId, direction) {
    const currentIndex = this.scene.getLayerIndex(layerId);
    if (currentIndex === -1) return;

    const targetIndex =
      direction === "up" ? currentIndex + 1 : currentIndex - 1;

    try {
      const success = this.scene.reorderLayers(currentIndex, targetIndex);
      if (success) {
        this.stateManager.emit("layer:reordered", {
          layerId,
          fromIndex: currentIndex,
          toIndex: targetIndex,
        });
        this.stateManager.emit("scene:updated", { reason: "layer_reordered" });
        this.stateManager.emit("layers:structure_changed");
        this.render();
      }
    } catch (error) {
      console.error("Failed to reorder layer:", error);
      this.stateManager.emit("error", {
        message: `Failed to reorder layer: ${error.message}`,
      });
    }
  }

  /**
   * Set the active layer
   */
  setActiveLayer(layerId) {
    const success = this.scene.setActiveLayer(layerId);
    if (success) {
      this.stateManager.emit("layer:active", { layerId });
      this.render();
    }
  }

  /**
   * Toggle layer visibility
   */
  toggleVisibility(layerId) {
    const layer = this.scene.getLayer(layerId);
    if (!layer) return;

    layer.visible = !layer.visible;
    this.stateManager.emit("layer:visibility", {
      layerId,
      visible: layer.visible,
    });
    this.render();

    // Update DOM visibility
    this.updateLayerVisibility(layerId, layer.visible);
  }

  /**
   * Update layer visibility in DOM
   */
  updateLayerVisibility(layerId, visible) {
    const layerElement = document.getElementById(`layer-${layerId}`);
    if (layerElement) {
      if (visible) {
        layerElement.classList.remove("hidden");
      } else {
        layerElement.classList.add("hidden");
      }
    }
  }

  /**
   * Toggle layer lock state
   */
  toggleLock(layerId) {
    const layer = this.scene.getLayer(layerId);
    if (!layer) return;

    layer.locked = !layer.locked;
    this.stateManager.emit("layer:lock", { layerId, locked: layer.locked });
    this.render();
  }

  /**
   * Clean up event listeners
   */
  destroy() {
    // Event delegation handles cleanup automatically
  }
}
