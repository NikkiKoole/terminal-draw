import { describe, it, expect, beforeEach } from "vitest";
import { Scene } from "../src/core/Scene.js";
import { Layer } from "../src/core/Layer.js";
import { Cell } from "../src/core/Cell.js";
import {
  PROJECT_TEMPLATES,
  getTemplate,
  createLayerTemplate,
} from "../src/core/ProjectTemplate.js";
import {
  LEGACY_LAYER_BG,
  LEGACY_LAYER_MID,
  LEGACY_LAYER_FG,
} from "../src/core/constants.js";

describe("Scene Template Functionality", () => {
  describe("Scene.fromTemplate", () => {
    it("should create scene from simple template", () => {
      const template = PROJECT_TEMPLATES.simple;
      const scene = Scene.fromTemplate(template);

      expect(scene.w).toBe(40);
      expect(scene.h).toBe(20);
      expect(scene.templateId).toBe("simple");
      expect(scene.layers).toHaveLength(1);
      expect(scene.layers[0].id).toBe("main");
      expect(scene.layers[0].name).toBe("Main");
      expect(scene.activeLayerId).toBe("main");
    });

    it("should create scene from standard template", () => {
      const template = PROJECT_TEMPLATES.standard;
      const scene = Scene.fromTemplate(template);

      expect(scene.w).toBe(60);
      expect(scene.h).toBe(25);
      expect(scene.templateId).toBe("standard");
      expect(scene.layers).toHaveLength(2);

      const bgLayer = scene.getLayer("bg");
      const fgLayer = scene.getLayer("fg");

      expect(bgLayer).toBeDefined();
      expect(bgLayer.name).toBe("Background");
      expect(fgLayer).toBeDefined();
      expect(fgLayer.name).toBe("Foreground");
      expect(scene.activeLayerId).toBe("fg"); // fg is defaultActive in template
    });

    it("should create scene from advanced template", () => {
      const template = PROJECT_TEMPLATES.advanced;
      const scene = Scene.fromTemplate(template);

      expect(scene.w).toBe(80);
      expect(scene.h).toBe(25);
      expect(scene.templateId).toBe("advanced");
      expect(scene.layers).toHaveLength(3);

      const bgLayer = scene.getLayer("bg");
      const midLayer = scene.getLayer("mid");
      const fgLayer = scene.getLayer("fg");

      expect(bgLayer).toBeDefined();
      expect(midLayer).toBeDefined();
      expect(fgLayer).toBeDefined();
      expect(scene.activeLayerId).toBe("mid"); // mid is defaultActive in template
    });

    it("should override dimensions when provided", () => {
      const template = PROJECT_TEMPLATES.simple;
      const scene = Scene.fromTemplate(template, 100, 50);

      expect(scene.w).toBe(100);
      expect(scene.h).toBe(50);
      expect(scene.layers[0].width).toBe(100);
      expect(scene.layers[0].height).toBe(50);
    });

    it("should override palette when provided", () => {
      const template = PROJECT_TEMPLATES.simple;
      const scene = Scene.fromTemplate(template, null, null, "gruvbox");

      expect(scene.paletteId).toBe("gruvbox");
    });

    it("should throw error for invalid template", () => {
      const invalidTemplate = {
        id: "invalid",
        // missing required fields
      };

      expect(() => {
        Scene.fromTemplate(invalidTemplate);
      }).toThrow("Invalid template");
    });

    it("should apply layer properties from template", () => {
      const customTemplate = {
        id: "custom",
        name: "Custom Template",
        description: "Custom test template",
        layers: [
          {
            id: "custom_layer",
            name: "Custom Layer",
            defaultActive: true,
            visible: false,
            locked: true,
          },
        ],
        defaultDimensions: { w: 30, h: 20 },
      };

      const scene = Scene.fromTemplate(customTemplate);
      const layer = scene.getLayer("custom_layer");

      expect(layer.visible).toBe(false);
      expect(layer.locked).toBe(true);
    });
  });

  describe("Scene.fromTemplateId", () => {
    it("should create scene from template ID", () => {
      const scene = Scene.fromTemplateId("standard");

      expect(scene.templateId).toBe("standard");
      expect(scene.layers).toHaveLength(2);
    });

    it("should throw error for non-existent template ID", () => {
      expect(() => {
        Scene.fromTemplateId("nonexistent");
      }).toThrow("Template not found: nonexistent");
    });
  });

  describe("Scene.addLayerFromTemplate", () => {
    let scene;

    beforeEach(() => {
      scene = Scene.fromTemplateId("simple");
    });

    it("should add layer from template", () => {
      const layerTemplate = createLayerTemplate("bg", "Background");
      const layer = scene.addLayerFromTemplate(layerTemplate);

      expect(scene.layers).toHaveLength(2);
      expect(layer.id).toBe(layerTemplate.id);
      expect(layer.name).toBe("Background");
      expect(layer.width).toBe(scene.w);
      expect(layer.height).toBe(scene.h);
    });

    it("should insert layer at specified position", () => {
      const layerTemplate = createLayerTemplate("bg", "Background");
      scene.addLayerFromTemplate(layerTemplate, 0);

      expect(scene.layers[0].name).toBe("Background");
      expect(scene.layers[1].name).toBe("Main");
    });

    it("should set as active if defaultActive is true", () => {
      const layerTemplate = createLayerTemplate("fg", "Foreground");
      layerTemplate.defaultActive = true;

      scene.addLayerFromTemplate(layerTemplate);

      expect(scene.activeLayerId).toBe(layerTemplate.id);
    });

    it("should throw error for duplicate layer ID", () => {
      const existingLayer = scene.layers[0];
      const duplicateTemplate = createLayerTemplate("duplicate", "Duplicate");
      duplicateTemplate.id = existingLayer.id;

      expect(() => {
        scene.addLayerFromTemplate(duplicateTemplate);
      }).toThrow("Layer with ID");
    });

    it("should throw error for invalid template", () => {
      const invalidTemplate = {
        name: "Missing ID",
      };

      expect(() => {
        scene.addLayerFromTemplate(invalidTemplate);
      }).toThrow("Invalid layer template");
    });
  });

  describe("Scene.addSmartLayer", () => {
    let scene;

    beforeEach(() => {
      scene = Scene.fromTemplateId("simple");
    });

    it("should add smart layer with defaults", () => {
      const layer = scene.addSmartLayer("bg");

      expect(layer.name).toBe("Background");
      expect(layer.id).toMatch(/^bg_/);
      expect(scene.layers).toHaveLength(2);
    });

    it("should use custom name when provided", () => {
      const layer = scene.addSmartLayer("detail", "Custom Detail");

      expect(layer.name).toBe("Custom Detail");
    });

    it("should suggest unique names when name conflicts", () => {
      // Add first background layer
      const layer1 = scene.addSmartLayer("bg", "Background");
      // Add second background layer - should get unique name
      const layer2 = scene.addSmartLayer("bg");

      expect(layer2.name).toBe("Background 2");
    });
  });

  describe("Scene.reorderLayers", () => {
    let scene;

    beforeEach(() => {
      scene = Scene.fromTemplateId("advanced");
    });

    it("should reorder layers correctly", () => {
      const originalOrder = scene.layers.map((l) => l.id);
      const success = scene.reorderLayers(0, 2);

      expect(success).toBe(true);
      expect(scene.layers[0].id).toBe(originalOrder[1]);
      expect(scene.layers[1].id).toBe(originalOrder[2]);
      expect(scene.layers[2].id).toBe(originalOrder[0]);
    });

    it("should return false for invalid indices", () => {
      expect(scene.reorderLayers(-1, 0)).toBe(false);
      expect(scene.reorderLayers(0, 5)).toBe(false);
      expect(scene.reorderLayers(1, 1)).toBe(false);
    });

    it("should not modify layers on invalid reorder", () => {
      const originalLayers = scene.layers.slice();
      scene.reorderLayers(-1, 0);

      expect(scene.layers).toEqual(originalLayers);
    });
  });

  describe("Scene.getLayerIndex", () => {
    let scene;

    beforeEach(() => {
      scene = Scene.fromTemplateId("standard");
    });

    it("should return correct layer index", () => {
      const bgIndex = scene.getLayerIndex("bg");
      const fgIndex = scene.getLayerIndex("fg");

      expect(bgIndex).toBe(0);
      expect(fgIndex).toBe(1);
    });

    it("should return -1 for non-existent layer", () => {
      const index = scene.getLayerIndex("nonexistent");
      expect(index).toBe(-1);
    });
  });

  describe("Scene.convertToTemplate", () => {
    let scene;

    beforeEach(() => {
      scene = Scene.fromTemplateId("simple");
    });

    it("should convert simple to standard template", () => {
      const targetTemplate = PROJECT_TEMPLATES.standard;
      const conversion = {
        addLayers: [
          {
            id: "bg",
            name: "Background",
            defaultActive: false,
            visible: true,
            locked: false,
            insertAt: 0,
          },
        ],
      };

      const success = scene.convertToTemplate(targetTemplate, conversion);

      expect(success).toBe(true);
      expect(scene.templateId).toBe("standard");
      expect(scene.layers).toHaveLength(2);
      expect(scene.layers[0].id).toBe("bg");
      expect(scene.layers[1].id).toBe("main");
    });

    it("should rollback on conversion error", () => {
      const originalLayers = scene.layers.slice();
      const originalActive = scene.activeLayerId;
      const invalidTemplate = { id: "invalid" };

      expect(() => {
        scene.convertToTemplate(invalidTemplate);
      }).toThrow("Invalid target template");

      expect(scene.layers).toEqual(originalLayers);
      expect(scene.activeLayerId).toBe(originalActive);
    });
  });

  describe("Scene.getTemplateInfo", () => {
    it("should return template information", () => {
      const scene = Scene.fromTemplateId("standard");
      const info = scene.getTemplateInfo();

      expect(info.templateId).toBe("standard");
      expect(info.layerCount).toBe(2);
      expect(info.layers).toHaveLength(2);

      const activeLayer = info.layers.find((l) => l.defaultActive);
      expect(activeLayer.id).toBe(scene.activeLayerId);
    });
  });

  describe("Scene.resizeAllLayers", () => {
    it("should resize all layers in scene", () => {
      const scene = Scene.fromTemplateId("advanced");
      scene.resizeAllLayers(120, 40, "pad");

      expect(scene.w).toBe(120);
      expect(scene.h).toBe(40);

      scene.layers.forEach((layer) => {
        expect(layer.width).toBe(120);
        expect(layer.height).toBe(40);
      });
    });
  });

  describe("Scene.findDefaultActiveLayer", () => {
    it("should find legacy middle layer when present", () => {
      const scene = new Scene(); // Default constructor creates legacy layers
      const activeId = scene.findDefaultActiveLayer();

      expect(activeId).toBe(LEGACY_LAYER_MID);
    });

    it("should return first layer when no legacy middle layer", () => {
      const scene = Scene.fromTemplateId("simple");
      const activeId = scene.findDefaultActiveLayer();

      expect(activeId).toBe("main");
    });

    it("should return null for empty scene", () => {
      const scene = new Scene(10, 10, "default", []);
      const activeId = scene.findDefaultActiveLayer();

      expect(activeId).toBeNull();
    });
  });

  describe("Legacy compatibility", () => {
    it("should maintain backward compatibility with default constructor", () => {
      const scene = new Scene();

      expect(scene.layers).toHaveLength(3);
      expect(scene.getLayer(LEGACY_LAYER_BG)).toBeDefined();
      expect(scene.getLayer(LEGACY_LAYER_MID)).toBeDefined();
      expect(scene.getLayer(LEGACY_LAYER_FG)).toBeDefined();
      expect(scene.activeLayerId).toBe(LEGACY_LAYER_MID);
      expect(scene.templateId).toBe("advanced");
    });

    it("should work with existing scene operations", () => {
      const scene = new Scene();
      const bgLayer = scene.getLayer(LEGACY_LAYER_BG);

      bgLayer.setCell(0, 0, new Cell("A", 1, 0));
      expect(bgLayer.getCell(0, 0).ch).toBe("A");

      scene.setActiveLayer(LEGACY_LAYER_FG);
      expect(scene.activeLayerId).toBe(LEGACY_LAYER_FG);
    });
  });

  describe("Integration with existing systems", () => {
    it("should work with toObject/fromObject serialization", () => {
      const originalScene = Scene.fromTemplateId("standard");
      originalScene.getLayer("bg").setCell(0, 0, new Cell("X", 2, 1));

      const obj = originalScene.toObject();
      const restoredScene = Scene.fromObject(obj);

      expect(restoredScene.templateId).toBe("standard");
      expect(restoredScene.layers).toHaveLength(2);
      expect(restoredScene.getLayer("bg").getCell(0, 0).ch).toBe("X");
    });

    it("should maintain layer properties through serialization", () => {
      const scene = Scene.fromTemplateId("simple");
      scene.addSmartLayer("detail");
      const detailLayer = scene.layers.find((l) => l.name === "Detail");
      detailLayer.visible = false;
      detailLayer.locked = true;

      const obj = scene.toObject();
      const restored = Scene.fromObject(obj);
      const restoredDetail = restored.layers.find((l) => l.name === "Detail");

      expect(restoredDetail.visible).toBe(false);
      expect(restoredDetail.locked).toBe(true);
    });

    it("should work with layer operations", () => {
      const scene = Scene.fromTemplateId("simple");

      // Add content to layer
      const mainLayer = scene.getActiveLayer();
      mainLayer.setCell(5, 5, new Cell("★", 3, 2));

      // Add new layer
      const fgLayer = scene.addSmartLayer("fg");
      fgLayer.setCell(5, 5, new Cell("●", 4, -1));

      // Verify both layers have content
      expect(mainLayer.getCell(5, 5).ch).toBe("★");
      expect(fgLayer.getCell(5, 5).ch).toBe("●");

      // Test visibility
      expect(scene.getVisibleLayers()).toHaveLength(2);
      fgLayer.visible = false;
      expect(scene.getVisibleLayers()).toHaveLength(1);
    });
  });
});
