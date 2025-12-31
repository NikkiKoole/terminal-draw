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
    console.log(`🎨 RENDER START - LayerPanel`);

    if (!this.scene) {
      console.warn("No scene available for layer panel");
      return;
    }

    console.log(`🗑️ Clearing layer list and buttons map`);
    this.layerList.innerHTML = "";
    this.layerButtons.clear();

    // Create layer buttons in reverse order (top layer first)
    const layers = [...this.scene.layers].reverse();

    layers.forEach((layer, index) => {
      console.log(`🔨 Creating button for layer: ${layer.id} (${layer.name})`);
      const button = this.createLayerButton(layer, layers.length - 1 - index);
      this.layerList.appendChild(button);
      this.layerButtons.set(layer.id, button);
    });

    console.log(`✅ RENDER COMPLETE - Created ${layers.length} layer buttons`);
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
      console.log(`🖱️ VISIBILITY BUTTON CLICKED - Layer: ${layer.id}`);
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
    console.log(`🔍 VISIBILITY TOGGLE START - Layer: ${layerId}`);

    const layer = this.scene.getLayer(layerId);
    if (!layer) {
      console.log(`❌ Layer ${layerId} not found`);
      return;
    }

    const oldVisibility = layer.visible;
    layer.visible = !layer.visible;

    console.log(`👁️ Visibility changed: ${oldVisibility} → ${layer.visible}`);

    this.stateManager.emit("layer:visibility-changed", {
      layerId,
      visible: layer.visible,
    });

    console.log(`📡 Emitted layer:visibility-changed event`);

    // Update just this specific button instead of full re-render
    console.log(`🔄 Calling updateVisibilityButton...`);
    this.updateVisibilityButton(layerId, layer.visible);
    console.log(`✅ VISIBILITY TOGGLE COMPLETE`);
  }

  /**
   * Update a specific visibility button
   * @param {string} layerId - ID of layer to update
   * @param {boolean} visible - New visibility state
   */
  updateVisibilityButton(layerId, visible) {
    console.log(
      `🎯 updateVisibilityButton - Layer: ${layerId}, Visible: ${visible}`,
    );

    const layerButton = this.layerButtons.get(layerId);
    console.log(`🔘 Layer button found:`, layerButton ? "YES" : "NO");
    if (!layerButton) return;

    const visibilityButton = layerButton.querySelector(".visibility-toggle");
    console.log(`👆 Visibility button found:`, visibilityButton ? "YES" : "NO");
    if (!visibilityButton) return;

    console.log(`📝 Before update - Classes:`, visibilityButton.className);
    console.log(`📝 Before update - HTML:`, visibilityButton.innerHTML);

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

    console.log(`📝 After update - Classes:`, visibilityButton.className);
    console.log(`📝 After update - HTML:`, visibilityButton.innerHTML);
    console.log(`✨ updateVisibilityButton COMPLETE`);
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
