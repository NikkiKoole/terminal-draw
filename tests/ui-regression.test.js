import { describe, it, expect, beforeEach, afterEach, vi } from "bun:test";
import { JSDOM } from "jsdom";
import { Scene } from "../src/core/Scene.js";
import { StateManager } from "../src/core/StateManager.js";
import { LayerPanel } from "../src/ui/LayerPanel.js";

// Mock DOM setup for UI regression tests
const dom = new JSDOM(`
<!DOCTYPE html>
<html>
<body>
  <div class="grid-stack">
    <div class="visual-layer" id="layer-bg" data-layer="bg"></div>
    <div class="visual-layer" id="layer-mid" data-layer="mid"></div>
    <div class="visual-layer" id="layer-fg" data-layer="fg"></div>
    <div class="hit-test-overlay"></div>
  </div>

  <button id="io-toggle" class="tool-btn">💾 I/O</button>
  <div id="io-panel" class="io-panel hidden">
    <div class="io-panel-content">
      <button id="export-text">📋 Copy as Text</button>
      <button id="export-ansi">🎨 Copy as ANSI</button>
      <button id="resize-grid">Resize Grid</button>
    </div>
  </div>

  <div id="resize-modal" class="modal hidden">
    <div class="modal-content">
      <div class="current-size">
        <span>Current Size:</span>
        <span id="current-dimensions">80×25</span>
      </div>
      <input type="number" id="resize-width" value="80" />
      <input type="number" id="resize-height" value="25" />
    </div>
  </div>
</body>
</html>
`);

// Mock scene for testing
const mockScene = {
  w: 80,
  h: 25,
  layers: [
    { id: "bg", name: "Background", visible: true },
    { id: "mid", name: "Middle", visible: true },
    { id: "fg", name: "Foreground", visible: true },
  ],
};

describe("UI Regression Tests", () => {
  beforeEach(() => {
    // Reset DOM state
    global.document = dom.window.document;
    global.window = dom.window;

    // Reset mock scene
    mockScene.w = 80;
    mockScene.h = 25;

    // Reset panel states
    const ioPanel = document.getElementById("io-panel");
    const resizeModal = document.getElementById("resize-modal");
    if (ioPanel) ioPanel.classList.add("hidden");
    if (resizeModal) resizeModal.classList.add("hidden");

    // Re-add layer containers if missing
    const gridStack = document.querySelector(".grid-stack");
    if (gridStack) {
      // Clear existing
      const existing = gridStack.querySelectorAll(".visual-layer");
      existing.forEach((el) => el.remove());

      // Re-add
      mockScene.layers.forEach((layer) => {
        const container = document.createElement("div");
        container.className = "visual-layer";
        container.id = `layer-${layer.id}`;
        container.setAttribute("data-layer", layer.id);
        gridStack.appendChild(container);
      });
    }
  });

  describe("I/O Panel Duplicate Event Listener Prevention", () => {
    let ioInitialized = false;

    function initIOPanel() {
      if (ioInitialized) return; // Prevent duplicate initialization

      const ioToggle = document.getElementById("io-toggle");
      const ioPanel = document.getElementById("io-panel");

      if (ioToggle && ioPanel) {
        ioToggle.addEventListener("click", () => {
          ioPanel.classList.toggle("hidden");
          ioToggle.classList.toggle("active");
        });

        ioInitialized = true;
      }
    }

    it("should prevent duplicate event listener registration", () => {
      const ioToggle = document.getElementById("io-toggle");
      const ioPanel = document.getElementById("io-panel");

      // Mock addEventListener to count calls
      const addEventListenerSpy = vi.spyOn(ioToggle, "addEventListener");

      // Initialize multiple times
      initIOPanel();
      initIOPanel();
      initIOPanel();

      // Should only register event listener once
      expect(addEventListenerSpy).toHaveBeenCalledTimes(1);

      addEventListenerSpy.mockRestore();
    });

    it("should toggle panel consistently after preventing duplicates", () => {
      const ioToggle = document.getElementById("io-toggle");
      const ioPanel = document.getElementById("io-panel");

      // Initialize once
      initIOPanel();

      // Initial state - panel should be hidden
      expect(ioPanel.classList.contains("hidden")).toBe(true);

      // First click - should show panel
      ioToggle.click();
      expect(ioPanel.classList.contains("hidden")).toBe(false);
      expect(ioToggle.classList.contains("active")).toBe(true);

      // Second click - should hide panel
      ioToggle.click();
      expect(ioPanel.classList.contains("hidden")).toBe(true);
      expect(ioToggle.classList.contains("active")).toBe(false);
    });

    it("should not break after multiple initialization attempts", () => {
      const ioToggle = document.getElementById("io-toggle");
      const ioPanel = document.getElementById("io-panel");

      // Initialize multiple times (simulating template selection triggers)
      initIOPanel();
      initIOPanel();
      initIOPanel();

      // Should still work correctly
      ioToggle.click();
      expect(ioPanel.classList.contains("hidden")).toBe(false);

      ioToggle.click();
      expect(ioPanel.classList.contains("hidden")).toBe(true);
    });
  });

  describe("Grid Resize Current Dimensions Display", () => {
    function updateCurrentDimensions(scene) {
      if (!scene) {
        console.warn("Scene not available for resize dimensions");
        return;
      }

      const currentDimensions = document.getElementById("current-dimensions");
      const widthInput = document.getElementById("resize-width");
      const heightInput = document.getElementById("resize-height");

      // Update display text
      if (currentDimensions) {
        currentDimensions.textContent = `${scene.w}×${scene.h}`;
      }

      // Update input fields
      if (widthInput) {
        widthInput.value = scene.w;
      }
      if (heightInput) {
        heightInput.value = scene.h;
      }
    }

    it("should display current scene dimensions correctly", () => {
      const currentDimensions = document.getElementById("current-dimensions");
      const widthInput = document.getElementById("resize-width");
      const heightInput = document.getElementById("resize-height");

      updateCurrentDimensions(mockScene);

      expect(currentDimensions.textContent).toBe("80×25");
      expect(widthInput.value).toBe("80");
      expect(heightInput.value).toBe("25");
    });

    it("should update dimensions when scene size changes", () => {
      const currentDimensions = document.getElementById("current-dimensions");
      const widthInput = document.getElementById("resize-width");
      const heightInput = document.getElementById("resize-height");

      // Test with different scene sizes
      mockScene.w = 120;
      mockScene.h = 35;

      updateCurrentDimensions(mockScene);

      expect(currentDimensions.textContent).toBe("120×35");
      expect(widthInput.value).toBe("120");
      expect(heightInput.value).toBe("35");
    });

    it("should handle missing DOM elements gracefully", () => {
      // Remove elements temporarily
      const currentDimensions = document.getElementById("current-dimensions");
      const widthInput = document.getElementById("resize-width");
      const heightInput = document.getElementById("resize-height");

      currentDimensions.remove();
      widthInput.remove();
      heightInput.remove();

      // Should not throw error
      expect(() => {
        updateCurrentDimensions(mockScene);
      }).not.toThrow();
    });

    it("should handle null scene gracefully", () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      updateCurrentDimensions(null);

      expect(consoleSpy).toHaveBeenCalledWith(
        "Scene not available for resize dimensions",
      );

      consoleSpy.mockRestore();
    });

    it("should handle partial DOM element availability", () => {
      // This test validates that the update function doesn't crash
      // when some elements are missing, which is the key regression prevention
      expect(() => {
        updateCurrentDimensions(mockScene);
      }).not.toThrow();
    });
  });

  describe("Template Dimension Update Reliability", () => {
    function selectTemplate(templateId, templates, updateCallback) {
      // Always update visual selection (in case it's out of sync)
      const cards = document.querySelectorAll(".template-card");
      cards.forEach((card) => {
        card.classList.remove("selected");
        if (card.dataset.templateId === templateId) {
          card.classList.add("selected");
        }
      });

      // Update dimensions
      if (updateCallback) {
        updateCallback(templateId, templates);
      }
    }

    it("should update visual selection even if template hasn't changed", () => {
      // Create mock template cards
      const container = document.createElement("div");
      container.innerHTML = `
        <div class="template-card" data-template-id="simple">Simple</div>
        <div class="template-card selected" data-template-id="standard">Standard</div>
        <div class="template-card" data-template-id="advanced">Advanced</div>
      `;
      document.body.appendChild(container);

      const simpleCard = document.querySelector('[data-template-id="simple"]');
      const standardCard = document.querySelector(
        '[data-template-id="standard"]',
      );

      // Initially standard is selected
      expect(standardCard.classList.contains("selected")).toBe(true);
      expect(simpleCard.classList.contains("selected")).toBe(false);

      // Select standard again (same template)
      selectTemplate("standard");

      // Visual selection should still be correct
      expect(standardCard.classList.contains("selected")).toBe(true);
      expect(simpleCard.classList.contains("selected")).toBe(false);

      container.remove();
    });

    it("should handle rapid template selection changes", () => {
      const container = document.createElement("div");
      container.innerHTML = `
        <div class="template-card" data-template-id="simple">Simple</div>
        <div class="template-card selected" data-template-id="standard">Standard</div>
        <div class="template-card" data-template-id="advanced">Advanced</div>
      `;
      document.body.appendChild(container);

      const simpleCard = document.querySelector('[data-template-id="simple"]');
      const standardCard = document.querySelector(
        '[data-template-id="standard"]',
      );
      const advancedCard = document.querySelector(
        '[data-template-id="advanced"]',
      );

      // Rapid selection changes
      selectTemplate("simple");
      expect(simpleCard.classList.contains("selected")).toBe(true);
      expect(standardCard.classList.contains("selected")).toBe(false);
      expect(advancedCard.classList.contains("selected")).toBe(false);

      selectTemplate("advanced");
      expect(simpleCard.classList.contains("selected")).toBe(false);
      expect(standardCard.classList.contains("selected")).toBe(false);
      expect(advancedCard.classList.contains("selected")).toBe(true);

      selectTemplate("simple");
      expect(simpleCard.classList.contains("selected")).toBe(true);
      expect(standardCard.classList.contains("selected")).toBe(false);
      expect(advancedCard.classList.contains("selected")).toBe(false);

      container.remove();
    });
  });

  describe("Layer Container Cleanup", () => {
    function cleanupOrphanedContainers(scene) {
      const allLayerContainers = document.querySelectorAll(".visual-layer");
      const currentLayerIds = new Set(scene.layers.map((layer) => layer.id));

      // Remove orphaned layer containers
      allLayerContainers.forEach((container) => {
        const layerId = container.getAttribute("data-layer");
        if (!currentLayerIds.has(layerId)) {
          container.remove();
        }
      });
    }

    it("should remove orphaned layer containers after layer removal", () => {
      const allContainers = document.querySelectorAll(".visual-layer");
      expect(allContainers.length).toBe(3);

      // Remove a layer from scene
      mockScene.layers = mockScene.layers.filter((l) => l.id !== "mid");

      cleanupOrphanedContainers(mockScene);

      // Container should be removed from DOM
      const remainingContainers = document.querySelectorAll(".visual-layer");
      expect(remainingContainers.length).toBe(2);

      const midContainer = document.getElementById("layer-mid");
      expect(midContainer).toBe(null);
    });

    it("should preserve containers for existing layers", () => {
      const allContainers = document.querySelectorAll(".visual-layer");
      const initialCount = allContainers.length;

      // Cleanup should not remove containers for existing layers
      cleanupOrphanedContainers(mockScene);

      const remainingContainers = document.querySelectorAll(".visual-layer");

      // Should preserve all containers since all layers exist in scene
      expect(remainingContainers.length).toBe(initialCount);
    });

    it("should handle containers with missing data-layer attribute", () => {
      // Create container without data-layer attribute
      const orphanContainer = document.createElement("div");
      orphanContainer.className = "visual-layer";
      orphanContainer.id = "orphan-layer";
      document.querySelector(".grid-stack").appendChild(orphanContainer);

      expect(() => {
        cleanupOrphanedContainers(mockScene);
      }).not.toThrow();

      // Orphan should be removed (no data-layer = not in currentLayerIds)
      expect(document.getElementById("orphan-layer")).toBe(null);
    });
  });

  describe("Layer Visibility and Lock Toggle (New Features)", () => {
    let scene;
    let stateManager;
    let layerPanel;
    let container;

    beforeEach(() => {
      // Create test DOM container
      container = document.createElement("div");
      container.id = "test-layer-panel";
      document.body.appendChild(container);

      // Create scene with multiple layers
      stateManager = new StateManager();
      scene = Scene.fromTemplateId("standard"); // 2 layers: bg, fg

      layerPanel = new LayerPanel(container, scene, stateManager);
    });

    afterEach(() => {
      if (container.parentNode) {
        container.parentNode.removeChild(container);
      }
    });

    describe("Visibility Toggle", () => {
      it("should toggle layer visibility and update button", () => {
        const bgLayer = scene.layers.find((l) => l.name === "Background");
        expect(bgLayer.visible).toBe(true);

        // Toggle visibility
        layerPanel.toggleLayerVisibility(bgLayer.id);

        expect(bgLayer.visible).toBe(false);

        // Toggle back
        layerPanel.toggleLayerVisibility(bgLayer.id);
        expect(bgLayer.visible).toBe(true);
      });

      it("should emit layer:visibility event", () => {
        const events = [];
        stateManager.on("layer:visibility", (data) => events.push(data));

        const bgLayer = scene.layers[0];
        layerPanel.toggleLayerVisibility(bgLayer.id);

        expect(events).toHaveLength(1);
        expect(events[0].layerId).toBe(bgLayer.id);
        expect(events[0].visible).toBe(false);
      });

      it("should update visibility button icon and classes", () => {
        const bgLayer = scene.layers[0];

        // Make layer invisible
        layerPanel.toggleLayerVisibility(bgLayer.id);

        const button = layerPanel.layerButtons.get(bgLayer.id);
        const visibilityBtn = button.querySelector(".visibility-toggle");

        expect(visibilityBtn.classList.contains("layer-hidden")).toBe(true);
        expect(visibilityBtn.innerHTML).toBe("➖");
        expect(visibilityBtn.title).toBe("Show layer");
      });

      it("should handle missing layer gracefully", () => {
        expect(() => {
          layerPanel.toggleLayerVisibility("nonexistent");
        }).not.toThrow();
      });
    });

    describe("Lock Toggle", () => {
      it("should toggle layer lock state and update button", () => {
        const bgLayer = scene.layers.find((l) => l.name === "Background");
        expect(bgLayer.locked).toBe(false);

        // Toggle lock
        layerPanel.toggleLayerLock(bgLayer.id);

        expect(bgLayer.locked).toBe(true);

        // Toggle back
        layerPanel.toggleLayerLock(bgLayer.id);
        expect(bgLayer.locked).toBe(false);
      });

      it("should emit layer:lock event", () => {
        const events = [];
        stateManager.on("layer:lock", (data) => events.push(data));

        const bgLayer = scene.layers[0];
        layerPanel.toggleLayerLock(bgLayer.id);

        expect(events).toHaveLength(1);
        expect(events[0].layerId).toBe(bgLayer.id);
        expect(events[0].locked).toBe(true);
      });

      it("should update lock button icon and classes", () => {
        const bgLayer = scene.layers[0];

        // Lock the layer
        layerPanel.toggleLayerLock(bgLayer.id);

        const button = layerPanel.layerButtons.get(bgLayer.id);
        const lockBtn = button.querySelector(".lock-toggle");

        expect(lockBtn.classList.contains("layer-locked")).toBe(true);
        expect(lockBtn.innerHTML).toBe("🔒");
        expect(lockBtn.title).toBe("Unlock layer");
      });

      it("should handle missing layer gracefully", () => {
        expect(() => {
          layerPanel.toggleLayerLock("nonexistent");
        }).not.toThrow();
      });
    });

    describe("Combined Visibility and Lock States", () => {
      it("should handle layer that is both invisible and locked", () => {
        const bgLayer = scene.layers[0];

        // Make layer invisible and locked
        layerPanel.toggleLayerVisibility(bgLayer.id);
        layerPanel.toggleLayerLock(bgLayer.id);

        expect(bgLayer.visible).toBe(false);
        expect(bgLayer.locked).toBe(true);

        const button = layerPanel.layerButtons.get(bgLayer.id);
        const visibilityBtn = button.querySelector(".visibility-toggle");
        const lockBtn = button.querySelector(".lock-toggle");

        expect(visibilityBtn.classList.contains("layer-hidden")).toBe(true);
        expect(lockBtn.classList.contains("layer-locked")).toBe(true);
      });

      it("should independently toggle visibility and lock", () => {
        const bgLayer = scene.layers[0];

        // Lock layer but keep visible
        layerPanel.toggleLayerLock(bgLayer.id);
        expect(bgLayer.visible).toBe(true);
        expect(bgLayer.locked).toBe(true);

        // Hide layer but keep locked
        layerPanel.toggleLayerVisibility(bgLayer.id);
        expect(bgLayer.visible).toBe(false);
        expect(bgLayer.locked).toBe(true);

        // Show layer, still locked
        layerPanel.toggleLayerVisibility(bgLayer.id);
        expect(bgLayer.visible).toBe(true);
        expect(bgLayer.locked).toBe(true);

        // Unlock layer, still visible
        layerPanel.toggleLayerLock(bgLayer.id);
        expect(bgLayer.visible).toBe(true);
        expect(bgLayer.locked).toBe(false);
      });
    });

    describe("Button Update Methods", () => {
      it("should update visibility button directly without full render", () => {
        const bgLayer = scene.layers[0];
        const spy = vi.spyOn(layerPanel, "render");

        layerPanel.updateVisibilityButton(bgLayer.id, false);

        // Should not trigger full render
        expect(spy).not.toHaveBeenCalled();

        const button = layerPanel.layerButtons.get(bgLayer.id);
        const visibilityBtn = button.querySelector(".visibility-toggle");
        expect(visibilityBtn.innerHTML).toBe("➖");
      });

      it("should update lock button directly without full render", () => {
        const bgLayer = scene.layers[0];
        const spy = vi.spyOn(layerPanel, "render");

        layerPanel.updateLockButton(bgLayer.id, true);

        // Should not trigger full render
        expect(spy).not.toHaveBeenCalled();

        const button = layerPanel.layerButtons.get(bgLayer.id);
        const lockBtn = button.querySelector(".lock-toggle");
        expect(lockBtn.innerHTML).toBe("🔒");
      });
    });
  });
});
