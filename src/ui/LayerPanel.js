/**
 * LayerPanel - Simplified Layer Display Panel
 *
 * Displays layers with visibility toggles only.
 * No add/remove/reorder functionality - layers are fixed based on project template.
 */

export class LayerPanel {
  /**
   * Create a layer panel
   * @param {HTMLElement} container - Container element for the panel
   * @param {Scene} scene - Scene instance containing layers
   * @param {StateManager} stateManager - State manager for events
   */
  constructor(container, scene, stateManager) {
    this.container = container;
    this.scene = scene;
    this.stateManager = stateManager;
    this.layerButtons = new Map();

    this.createPanel();
    this.attachEventListeners();
    this.render();
  }

  /**
   * Create the panel structure
   */
  createPanel() {
    this.container.innerHTML = `
      <div class="layer-panel">
        <div class="panel-header">
          <h3>Layers</h3>
          <span class="layer-count">${this.scene.layers.length} layers</span>
        </div>
        <div class="layer-list" id="layer-list">
          <!-- Layer buttons will be generated here -->
        </div>
      </div>
    `;

    this.layerList = this.container.querySelector("#layer-list");
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Listen for layer visibility changes
    this.stateManager.on("layer:visibility-changed", () => {
      this.render();
    });

    // Listen for active layer changes
    this.stateManager.on("layer:activated", () => {
      this.render();
    });

    // Listen for scene changes
    this.stateManager.on("scene:updated", () => {
      this.render();
    });
  }

  /**
   * Render the layer list
   */
  render() {
    if (!this.scene) {
      console.warn("No scene available for layer panel");
      return;
    }

    this.layerList.innerHTML = "";
    this.layerButtons.clear();

    // Create layer buttons in reverse order (top layer first)
    const layers = [...this.scene.layers].reverse();

    layers.forEach((layer, index) => {
      const button = this.createLayerButton(layer, layers.length - 1 - index);
      this.layerList.appendChild(button);
      this.layerButtons.set(layer.id, button);
    });
  }

  /**
   * Create a layer button element
   * @param {Layer} layer - Layer instance
   * @param {number} index - Layer index in scene
   * @returns {HTMLElement} Layer button element
   */
  createLayerButton(layer, index) {
    const button = document.createElement("div");
    button.className = "layer-item";
    button.dataset.layerId = layer.id;

    if (layer.id === this.scene.activeLayerId) {
      button.classList.add("active");
    }

    button.innerHTML = `
      <div class="layer-controls">
        <button
          class="visibility-toggle ${layer.visible ? "visible" : "hidden"}"
          title="${layer.visible ? "Hide layer" : "Show layer"}"
          data-layer-id="${layer.id}"
        >
          ${layer.visible ? "👁️" : "👁️‍🗨️"}
        </button>
      </div>
      <div class="layer-info">
        <div class="layer-name">${layer.name}</div>
        <div class="layer-details">Layer ${index + 1}</div>
      </div>
    `;

    // Add click handler for layer activation
    button.addEventListener("click", (e) => {
      // Don't activate if clicking on visibility button
      if (e.target.closest(".visibility-toggle")) {
        return;
      }
      this.activateLayer(layer.id);
    });

    // Add visibility toggle handler
    const visibilityButton = button.querySelector(".visibility-toggle");
    visibilityButton.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggleLayerVisibility(layer.id);
    });

    return button;
  }

  /**
   * Activate a layer
   * @param {string} layerId - ID of layer to activate
   */
  activateLayer(layerId) {
    if (this.scene.activeLayerId === layerId) {
      return; // Already active
    }

    this.scene.setActiveLayer(layerId);
    this.stateManager.emit("layer:activated", {
      layerId,
      layerName: this.scene.getLayer(layerId)?.name,
    });

    this.render();
  }

  /**
   * Toggle layer visibility
   * @param {string} layerId - ID of layer to toggle
   */
  toggleLayerVisibility(layerId) {
    const layer = this.scene.getLayer(layerId);
    if (!layer) return;

    layer.visible = !layer.visible;
    this.stateManager.emit("layer:visibility-changed", {
      layerId,
      visible: layer.visible,
    });

    this.render();
  }

  /**
   * Update the scene reference (for when scene changes)
   * @param {Scene} newScene - New scene instance
   */
  updateScene(newScene) {
    this.scene = newScene;
    this.render();
  }

  /**
   * Destroy the panel and clean up
   */
  destroy() {
    this.container.innerHTML = "";
    this.layerButtons.clear();
  }
}
