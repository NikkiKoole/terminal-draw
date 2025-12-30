/**
 * LayerPanel.js - Layer management UI component
 *
 * Displays all layers with controls for:
 * - Setting active layer
 * - Toggling visibility
 * - Toggling lock state
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
  }

  /**
   * Render the layer panel
   */
  render() {
    const layerIds = ["fg", "mid", "bg"];
    const layerNames = {
      fg: "Foreground",
      mid: "Middle",
      bg: "Background",
    };

    const html = `
      <div class="layer-panel">
        <h3>[L]ayers</h3>
        <div class="layer-list">
          ${layerIds
            .map((layerId) => {
              const layer = this.scene.getLayer(layerId);
              const isActive = this.scene.activeLayerId === layerId;

              return `
              <div class="layer-item ${isActive ? "active" : ""}" data-layer-id="${layerId}">
                <div class="layer-select" data-layer-id="${layerId}" title="Set as active layer">
                  <span class="layer-name">${layerNames[layerId]}</span>
                  ${isActive ? '<span class="layer-badge">●</span>' : ""}
                </div>
                <div class="layer-controls">
                  <button
                    class="layer-visibility ${layer.visible ? "layer-visible" : "layer-hidden"}"
                    data-layer-id="${layerId}"
                    title="${layer.visible ? "Hide layer" : "Show layer"}"
                  >
                    ${layer.visible ? "👁️" : "👁️‍🗨️"}
                  </button>
                  <button
                    class="layer-lock ${layer.locked ? "locked" : "unlocked"}"
                    data-layer-id="${layerId}"
                    title="${layer.locked ? "Unlock layer" : "Lock layer"}"
                  >
                    ${layer.locked ? "🔒" : "🔓"}
                  </button>
                </div>
              </div>
            `;
            })
            .join("")}
        </div>
      </div>
    `;

    this.container.innerHTML = html;
  }

  /**
   * Attach event listeners to layer controls
   */
  attachEventListeners() {
    // Use event delegation for all clicks
    this.container.addEventListener("click", (e) => {
      // Check if clicking on visibility or lock buttons
      const button = e.target.closest("button");
      if (button) {
        const layerId = button.dataset.layerId;
        if (!layerId) return;

        if (button.classList.contains("layer-visibility")) {
          this.toggleVisibility(layerId);
          return;
        } else if (button.classList.contains("layer-lock")) {
          this.toggleLock(layerId);
          return;
        }
      }

      // Otherwise, check if clicking on layer item or layer-select
      const layerItem = e.target.closest(".layer-item");
      if (layerItem) {
        const layerId = layerItem.dataset.layerId;
        if (layerId) {
          this.setActiveLayer(layerId);
        }
      }
    });
  }

  /**
   * Set the active layer
   */
  setActiveLayer(layerId) {
    this.scene.setActiveLayer(layerId);
    this.stateManager.emit("layer:active", { layerId });
    this.render();
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
    const layerElement = document.getElementById(`layer-${layerId}`);
    if (layerElement) {
      if (layer.visible) {
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
