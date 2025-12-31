import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Scene } from "../src/core/Scene.js";
import { Cell } from "../src/core/Cell.js";
import { StateManager } from "../src/core/StateManager.js";
import { LayerRenderer } from "../src/rendering/LayerRenderer.js";

// Mock DOM elements and functions
const mockDocument = {
  getElementById: vi.fn(),
  createElement: vi.fn(),
  querySelector: vi.fn(),
  querySelectorAll: vi.fn(),
  addEventListener: vi.fn(),
};

const mockElement = {
  appendChild: vi.fn(),
  insertBefore: vi.fn(),
  remove: vi.fn(),
  classList: {
    add: vi.fn(),
    remove: vi.fn(),
    contains: vi.fn(),
  },
  setAttribute: vi.fn(),
  style: {},
  innerHTML: "",
  children: [],
};

// Mock global document
global.document = mockDocument;

describe("Dynamic Rendering Infrastructure", () => {
  let scene;
  let stateManager;
  let renderer;
  let mockGridStack;
  let mockHitTestOverlay;

  beforeEach(() => {
    vi.clearAllMocks();

    scene = Scene.fromTemplateId("simple");
    stateManager = new StateManager();
    renderer = new LayerRenderer();

    // Setup mock DOM elements
    mockGridStack = {
      ...mockElement,
      querySelectorAll: vi.fn(() => []),
      querySelector: vi.fn(),
    };

    mockHitTestOverlay = { ...mockElement };

    mockDocument.querySelector.mockImplementation((selector) => {
      if (selector === ".grid-stack") return mockGridStack;
      if (selector === ".hit-test-overlay") return mockHitTestOverlay;
      return null;
    });

    mockDocument.getElementById.mockImplementation((id) => {
      if (id === "layer-main") return { ...mockElement };
      return null;
    });

    mockDocument.createElement.mockReturnValue({ ...mockElement });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("createLayerContainers", () => {
    // Mock implementation of createLayerContainers function
    const createLayerContainers = (scene) => {
      const gridStack = document.querySelector(".grid-stack");
      if (!gridStack) {
        console.error("Grid stack container not found");
        return false;
      }

      // Clear existing layer containers
      const existingLayers = gridStack.querySelectorAll(".visual-layer");
      existingLayers.forEach((layer) => layer.remove());

      // Create containers for each layer in the scene
      scene.layers.forEach((layer, index) => {
        const container = document.createElement("div");
        container.id = `layer-${layer.id}`;
        container.className = "visual-layer";
        container.setAttribute("data-layer", layer.id);
        container.style.zIndex = 100 + index;

        const hitTestOverlay = gridStack.querySelector(".hit-test-overlay");
        if (hitTestOverlay) {
          gridStack.insertBefore(container, hitTestOverlay);
        } else {
          gridStack.appendChild(container);
        }
      });

      return true;
    };

    it("should create layer containers for all layers in scene", () => {
      // Mock hit-test overlay to exist
      mockGridStack.querySelector.mockReturnValue(mockHitTestOverlay);

      const result = createLayerContainers(scene);

      expect(result).toBe(true);
      expect(mockDocument.querySelector).toHaveBeenCalledWith(".grid-stack");
      expect(mockDocument.createElement).toHaveBeenCalledTimes(
        scene.layers.length,
      );
      // insertBefore is called when hit-test overlay exists (mocked to return mockHitTestOverlay)
      expect(mockGridStack.insertBefore).toHaveBeenCalledTimes(
        scene.layers.length,
      );
    });

    it("should clear existing layer containers before creating new ones", () => {
      const existingLayer1 = { ...mockElement };
      const existingLayer2 = { ...mockElement };
      mockGridStack.querySelectorAll.mockReturnValue([
        existingLayer1,
        existingLayer2,
      ]);

      createLayerContainers(scene);

      expect(mockGridStack.querySelectorAll).toHaveBeenCalledWith(
        ".visual-layer",
      );
      expect(existingLayer1.remove).toHaveBeenCalled();
      expect(existingLayer2.remove).toHaveBeenCalled();
    });

    it("should set correct attributes for each layer container", () => {
      const mockContainer = { ...mockElement };
      mockDocument.createElement.mockReturnValue(mockContainer);

      createLayerContainers(scene);

      const layer = scene.layers[0];
      expect(mockContainer.id).toBe(`layer-${layer.id}`);
      expect(mockContainer.className).toBe("visual-layer");
      expect(mockContainer.setAttribute).toHaveBeenCalledWith(
        "data-layer",
        layer.id,
      );
      expect(mockContainer.style.zIndex).toBe(100);
    });

    it("should handle missing grid stack gracefully", () => {
      mockDocument.querySelector.mockReturnValue(null);
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const result = createLayerContainers(scene);

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith("Grid stack container not found");
    });

    it("should insert containers before hit-test overlay when it exists", () => {
      mockGridStack.querySelector.mockReturnValue(mockHitTestOverlay);

      createLayerContainers(scene);

      expect(mockGridStack.insertBefore).toHaveBeenCalledWith(
        expect.anything(),
        mockHitTestOverlay,
      );
    });

    it("should append containers when hit-test overlay doesn't exist", () => {
      mockGridStack.querySelector.mockReturnValue(null);

      createLayerContainers(scene);

      expect(mockGridStack.appendChild).toHaveBeenCalledTimes(
        scene.layers.length,
      );
    });
  });

  describe("Dynamic Scene Rendering", () => {
    const renderScene = (scene, renderer) => {
      if (!scene || !renderer) return false;

      scene.layers.forEach((layer) => {
        const container = document.getElementById(`layer-${layer.id}`);
        if (container) {
          renderer.render(layer, container);

          // Update layer visibility
          if (layer.visible) {
            container.classList.remove("hidden");
          } else {
            container.classList.add("hidden");
          }
        } else {
          console.warn(`Container not found for layer: ${layer.id}`);
        }
      });

      return true;
    };

    it("should render all layers in the scene", () => {
      const mockContainer = { ...mockElement };
      mockDocument.getElementById.mockReturnValue(mockContainer);
      const renderSpy = vi
        .spyOn(renderer, "render")
        .mockImplementation(() => {});

      const result = renderScene(scene, renderer);

      expect(result).toBe(true);
      expect(renderSpy).toHaveBeenCalledTimes(scene.layers.length);
      expect(renderSpy).toHaveBeenCalledWith(scene.layers[0], mockContainer);
    });

    it("should update layer visibility classes correctly", () => {
      const mockContainer = { ...mockElement };
      mockDocument.getElementById.mockReturnValue(mockContainer);
      vi.spyOn(renderer, "render").mockImplementation(() => {});

      // Test visible layer
      scene.layers[0].visible = true;
      renderScene(scene, renderer);
      expect(mockContainer.classList.remove).toHaveBeenCalledWith("hidden");

      // Test hidden layer
      scene.layers[0].visible = false;
      renderScene(scene, renderer);
      expect(mockContainer.classList.add).toHaveBeenCalledWith("hidden");
    });

    it("should warn when layer container is not found", () => {
      mockDocument.getElementById.mockReturnValue(null);
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      renderScene(scene, renderer);

      expect(consoleSpy).toHaveBeenCalledWith(
        `Container not found for layer: ${scene.layers[0].id}`,
      );
    });

    it("should handle null scene gracefully", () => {
      const result = renderScene(null, renderer);
      expect(result).toBe(false);
    });

    it("should handle null renderer gracefully", () => {
      const result = renderScene(scene, null);
      expect(result).toBe(false);
    });
  });

  describe("Multi-Layer Scene Management", () => {
    let multiLayerScene;

    beforeEach(() => {
      multiLayerScene = Scene.fromTemplateId("advanced");
    });

    it("should handle scenes with multiple layers", () => {
      const containers = multiLayerScene.layers.map((layer, index) => ({
        ...mockElement,
        id: `layer-${layer.id}`,
      }));

      mockDocument.getElementById.mockImplementation((id) => {
        return containers.find((c) => c.id === id) || null;
      });

      const renderSpy = vi
        .spyOn(renderer, "render")
        .mockImplementation(() => {});

      const renderScene = (scene, renderer) => {
        scene.layers.forEach((layer) => {
          const container = document.getElementById(`layer-${layer.id}`);
          if (container) {
            renderer.render(layer, container);
          }
        });
        return true;
      };

      const result = renderScene(multiLayerScene, renderer);

      expect(result).toBe(true);
      expect(renderSpy).toHaveBeenCalledTimes(3); // bg, mid, fg
    });

    it("should maintain correct z-index order for multiple layers", () => {
      const createLayerContainers = (scene) => {
        const containers = [];
        scene.layers.forEach((layer, index) => {
          const container = {
            ...mockElement,
            style: { zIndex: 100 + index },
          };
          containers.push(container);
        });
        return containers;
      };

      const containers = createLayerContainers(multiLayerScene);

      expect(containers[0].style.zIndex).toBe(100); // first layer
      expect(containers[1].style.zIndex).toBe(101); // second layer
      expect(containers[2].style.zIndex).toBe(102); // third layer
    });
  });

  describe("Layer Addition and Removal", () => {
    it("should handle dynamic layer addition", () => {
      const originalLayerCount = scene.layers.length;

      // Add a new layer
      const newLayer = scene.addSmartLayer("detail");

      expect(scene.layers.length).toBe(originalLayerCount + 1);
      expect(newLayer.name).toBe("Detail");
      expect(scene.layers.includes(newLayer)).toBe(true);
    });

    it("should handle layer removal", () => {
      // Start with multiple layers
      const multiScene = Scene.fromTemplateId("standard");
      const originalLayerCount = multiScene.layers.length;
      const layerToRemove = multiScene.layers[0];

      const success = multiScene.removeLayer(layerToRemove.id);

      expect(success).toBe(true);
      expect(multiScene.layers.length).toBe(originalLayerCount - 1);
      expect(multiScene.getLayer(layerToRemove.id)).toBeNull();
    });

    it("should prevent removal of the last layer", () => {
      // Scene with only one layer
      expect(scene.layers.length).toBe(1);

      const success = scene.removeLayer(scene.layers[0].id);

      expect(success).toBe(false);
      expect(scene.layers.length).toBe(1);
    });
  });

  describe("Layer Reordering", () => {
    let multiScene;

    beforeEach(() => {
      multiScene = Scene.fromTemplateId("advanced");
    });

    it("should handle layer reordering", () => {
      const originalOrder = multiScene.layers.map((l) => l.id);

      const success = multiScene.reorderLayers(0, 2);

      expect(success).toBe(true);
      expect(multiScene.layers[0].id).toBe(originalOrder[1]);
      expect(multiScene.layers[1].id).toBe(originalOrder[2]);
      expect(multiScene.layers[2].id).toBe(originalOrder[0]);
    });

    it("should handle invalid reorder indices", () => {
      const originalOrder = multiScene.layers.map((l) => l.id);

      const success = multiScene.reorderLayers(-1, 0);

      expect(success).toBe(false);
      expect(multiScene.layers.map((l) => l.id)).toEqual(originalOrder);
    });
  });

  describe("Layer Visibility Management", () => {
    it("should handle layer visibility changes", () => {
      const layer = scene.layers[0];
      const originalVisibility = layer.visible;

      layer.visible = !originalVisibility;

      expect(layer.visible).toBe(!originalVisibility);
    });

    it("should track visible layers correctly", () => {
      const multiScene = Scene.fromTemplateId("advanced");

      // All layers visible by default
      expect(multiScene.getVisibleLayers().length).toBe(3);

      // Hide one layer
      multiScene.layers[0].visible = false;
      expect(multiScene.getVisibleLayers().length).toBe(2);

      // Hide all layers
      multiScene.layers.forEach((layer) => (layer.visible = false));
      expect(multiScene.getVisibleLayers().length).toBe(0);
    });
  });

  describe("State Manager Integration", () => {
    it("should emit layer structure change events", () => {
      const eventSpy = vi.fn();
      stateManager.on("layers:structure_changed", eventSpy);

      // This would be called by the layer panel
      stateManager.emit("layers:structure_changed");

      expect(eventSpy).toHaveBeenCalled();
    });

    it("should emit scene update events", () => {
      const eventSpy = vi.fn();
      stateManager.on("scene:updated", eventSpy);

      stateManager.emit("scene:updated", { reason: "layer_added" });

      expect(eventSpy).toHaveBeenCalledWith({ reason: "layer_added" });
    });

    it("should emit layer visibility events", () => {
      const eventSpy = vi.fn();
      stateManager.on("layer:visibility", eventSpy);

      const layerId = scene.layers[0].id;
      stateManager.emit("layer:visibility", { layerId, visible: false });

      expect(eventSpy).toHaveBeenCalledWith({ layerId, visible: false });
    });
  });

  describe("Template System Integration", () => {
    it("should work with simple template", () => {
      const simpleScene = Scene.fromTemplateId("simple");
      expect(simpleScene.layers.length).toBe(1);
      expect(simpleScene.templateId).toBe("simple");
    });

    it("should work with standard template", () => {
      const standardScene = Scene.fromTemplateId("standard");
      expect(standardScene.layers.length).toBe(2);
      expect(standardScene.templateId).toBe("standard");
    });

    it("should work with advanced template", () => {
      const advancedScene = Scene.fromTemplateId("advanced");
      expect(advancedScene.layers.length).toBe(3);
      expect(advancedScene.templateId).toBe("advanced");
    });

    it("should maintain template information", () => {
      const templateInfo = scene.getTemplateInfo();
      expect(templateInfo.templateId).toBe("simple");
      expect(templateInfo.layerCount).toBe(1);
      expect(templateInfo.layers).toHaveLength(1);
    });
  });

  describe("Error Handling", () => {
    it("should handle rendering errors gracefully", () => {
      const mockContainer = { ...mockElement };
      mockDocument.getElementById.mockReturnValue(mockContainer);

      const errorRenderer = {
        render: vi.fn().mockImplementation(() => {
          throw new Error("Rendering failed");
        }),
      };

      const renderScene = (scene, renderer) => {
        let errors = [];
        scene.layers.forEach((layer) => {
          const container = document.getElementById(`layer-${layer.id}`);
          if (container) {
            try {
              renderer.render(layer, container);
            } catch (error) {
              errors.push(error);
            }
          }
        });
        return errors;
      };

      const errors = renderScene(scene, errorRenderer);
      expect(errors.length).toBe(1);
      expect(errors[0].message).toBe("Rendering failed");
    });

    it("should handle missing DOM elements gracefully", () => {
      mockDocument.querySelector.mockReturnValue(null);
      mockDocument.getElementById.mockReturnValue(null);

      const createLayerContainers = (scene) => {
        const gridStack = document.querySelector(".grid-stack");
        if (!gridStack) return false;
        return true;
      };

      const result = createLayerContainers(scene);
      expect(result).toBe(false);
    });
  });
});
