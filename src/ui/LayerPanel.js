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
    // Listen for layer visibility changes - don't re-render, just update specific button
    // (visibility is handled by updateVisibilityButton in toggleLayerVisibility)

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
          class="visibility-toggle ${layer.visible ? "layer-visible" : "layer-hidden"}"
          title="${layer.visible ? "Hide layer" : "Show layer"}"
          data-layer-id="${layer.id}"
        >
          ${layer.visible ? "👁️" : "➖"}
        </button>
        <button
          class="lock-toggle ${layer.locked ? "layer-locked" : "layer-unlocked"}"
          title="${layer.locked ? "Unlock layer" : "Lock layer"}"
          data-layer-id="${layer.id}"
        >
          ${layer.locked ? "🔒" : "🔓"}
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

    // Add lock toggle handler
    const lockButton = button.querySelector(".lock-toggle");
    lockButton.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggleLayerLock(layer.id);
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
    if (!layer) {
      return;
    }

    const oldVisibility = layer.visible;
    layer.visible = !layer.visible;

    this.stateManager.emit("layer:visibility", {
      layerId,
      visible: layer.visible,
    });

    // Update just this specific button instead of full re-render
    this.updateVisibilityButton(layerId, layer.visible);
  }

  /**
   * Update a specific visibility button
   * @param {string} layerId - ID of layer to update
   * @param {boolean} visible - New visibility state
   */
  updateVisibilityButton(layerId, visible) {
    const layerButton = this.layerButtons.get(layerId);

    if (!layerButton) return;

    const visibilityButton = layerButton.querySelector(".visibility-toggle");

    if (!visibilityButton) return;

    // Update button class
    if (visible) {
      visibilityButton.classList.remove("layer-hidden");
      visibilityButton.classList.add("layer-visible");
    } else {
      visibilityButton.classList.remove("layer-visible");
      visibilityButton.classList.add("layer-hidden");
    }

    // Update icon and title
    visibilityButton.innerHTML = visible ? "👁️" : "➖";
    visibilityButton.title = visible ? "Hide layer" : "Show layer";
  }

  /**
   * Toggle layer lock state
   * @param {string} layerId - ID of layer to toggle
   */
  toggleLayerLock(layerId) {
    const layer = this.scene.getLayer(layerId);
    if (!layer) {
      return;
    }

    const oldLocked = layer.locked;
    layer.locked = !layer.locked;

    this.stateManager.emit("layer:lock", {
      layerId,
      locked: layer.locked,
    });

    // Update just this specific button instead of full re-render
    this.updateLockButton(layerId, layer.locked);
  }

  /**
   * Update a specific lock button
   * @param {string} layerId - ID of layer to update
   * @param {boolean} locked - New lock state
   */
  updateLockButton(layerId, locked) {
    const layerButton = this.layerButtons.get(layerId);

    if (!layerButton) return;

    const lockButton = layerButton.querySelector(".lock-toggle");

    if (!lockButton) return;

    // Update button class
    if (locked) {
      lockButton.classList.remove("layer-unlocked");
      lockButton.classList.add("layer-locked");
    } else {
      lockButton.classList.remove("layer-locked");
      lockButton.classList.add("layer-unlocked");
    }

    // Update icon and title
    lockButton.innerHTML = locked ? "🔒" : "🔓";
    lockButton.title = locked ? "Unlock layer" : "Lock layer";
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
