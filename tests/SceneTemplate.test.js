import { describe, it, expect } from "bun:test";
import { Scene } from "../src/core/Scene.js";
import { Cell } from "../src/core/Cell.js";
import { PROJECT_TEMPLATES, getTemplate } from "../src/core/ProjectTemplate.js";

describe("Scene Template Functionality", () => {
  describe("Scene.fromTemplate", () => {
    it("should create scene from simple template", () => {
      const template = PROJECT_TEMPLATES.simple;
      const scene = Scene.fromTemplate(template, 40, 20, "default");

      expect(scene.w).toBe(40);
      expect(scene.h).toBe(20);
      expect(scene.layers).toHaveLength(1);
      expect(scene.layers[0].name).toBe("Main");
      expect(scene.activeLayerId).toBe(scene.layers[0].id);
    });

    it("should create scene from standard template", () => {
      const template = PROJECT_TEMPLATES.standard;
      const scene = Scene.fromTemplate(template, 60, 25, "default");

      expect(scene.w).toBe(60);
      expect(scene.h).toBe(25);
      expect(scene.layers).toHaveLength(2);
      expect(scene.layers[0].name).toBe("Background");
      expect(scene.layers[1].name).toBe("Foreground");
      expect(scene.activeLayerId).toBe(scene.layers[1].id); // Foreground is default active
    });

    it("should create scene from advanced template", () => {
      const template = PROJECT_TEMPLATES.advanced;
      const scene = Scene.fromTemplate(template, 80, 25, "default");

      expect(scene.w).toBe(80);
      expect(scene.h).toBe(25);
      expect(scene.layers).toHaveLength(3);
      expect(scene.layers[0].name).toBe("Background");
      expect(scene.layers[1].name).toBe("Middle");
      expect(scene.layers[2].name).toBe("Foreground");
      expect(scene.activeLayerId).toBe(scene.layers[1].id); // Middle is default active
    });

    it("should use template default dimensions when not specified", () => {
      const template = PROJECT_TEMPLATES.standard;
      const scene = Scene.fromTemplate(template);

      expect(scene.w).toBe(template.defaultDimensions.w);
      expect(scene.h).toBe(template.defaultDimensions.h);
    });

    it("should set correct layer properties from template", () => {
      const template = PROJECT_TEMPLATES.advanced;
      const scene = Scene.fromTemplate(template, 50, 30, "monokai");

      const bgLayer = scene.layers.find((l) => l.name === "Background");
      const fgLayer = scene.layers.find((l) => l.name === "Foreground");

      expect(bgLayer.visible).toBe(true);
      expect(bgLayer.locked).toBe(false);
      expect(fgLayer.visible).toBe(true);
      expect(fgLayer.locked).toBe(false);

      // Verify layer dimensions match scene
      scene.layers.forEach((layer) => {
        expect(layer.width).toBe(50);
        expect(layer.height).toBe(30);
      });
    });

    it("should throw error for invalid template", () => {
      expect(() => {
        Scene.fromTemplate(null);
      }).toThrow("Invalid template");

      expect(() => {
        Scene.fromTemplate({});
      }).toThrow("Invalid template");
    });
  });

  describe("Scene.fromTemplateId", () => {
    it("should create scene from template ID", () => {
      const scene = Scene.fromTemplateId("simple");

      expect(scene.layers).toHaveLength(1);
      expect(scene.layers[0].name).toBe("Main");
    });

    it("should use template default dimensions", () => {
      const scene = Scene.fromTemplateId("standard");
      const template = PROJECT_TEMPLATES.standard;

      expect(scene.w).toBe(template.defaultDimensions.w);
      expect(scene.h).toBe(template.defaultDimensions.h);
    });

    it("should throw error for nonexistent template ID", () => {
      expect(() => {
        Scene.fromTemplateId("nonexistent");
      }).toThrow("Template not found");
    });
  });

  describe("Fixed Layer Architecture", () => {
    it("should maintain layer count after creation", () => {
      const simpleScene = Scene.fromTemplateId("simple");
      const standardScene = Scene.fromTemplateId("standard");
      const advancedScene = Scene.fromTemplateId("advanced");

      // Layer counts should be fixed
      expect(simpleScene.layers.length).toBe(1);
      expect(standardScene.layers.length).toBe(2);
      expect(advancedScene.layers.length).toBe(3);

      // No methods to modify layer count
      expect(simpleScene.addSmartLayer).toBeUndefined();
      expect(simpleScene.addLayerFromTemplate).toBeUndefined();
      expect(simpleScene.removeLayer).toBeUndefined();
      expect(simpleScene.reorderLayers).toBeUndefined();
    });

    it("should allow layer visibility and active layer changes", () => {
      const scene = Scene.fromTemplateId("standard");
      const bgLayer = scene.layers[0];
      const fgLayer = scene.layers[1];

      // Test visibility toggle
      expect(bgLayer.visible).toBe(true);
      bgLayer.visible = false;
      expect(bgLayer.visible).toBe(false);

      // Test active layer switching
      expect(scene.activeLayerId).toBe(fgLayer.id);
      scene.setActiveLayer(bgLayer.id);
      expect(scene.activeLayerId).toBe(bgLayer.id);
    });

    it("should support drawing operations on layers", () => {
      const scene = Scene.fromTemplateId("standard");
      const activeLayer = scene.getActiveLayer();

      expect(activeLayer).toBeDefined();
      expect(activeLayer.setCell).toBeDefined();
      expect(activeLayer.getCell).toBeDefined();
      expect(activeLayer.clear).toBeDefined();

      // Test basic drawing
      const testCell = new Cell("X", 1, -1);
      activeLayer.setCell(0, 0, testCell);
      const cell = activeLayer.getCell(0, 0);
      expect(cell).toBeDefined();
      expect(cell.ch).toBe("X");
      expect(cell.fg).toBe(1);
    });
  });

  describe("Template validation and consistency", () => {
    it("should have consistent template structure", () => {
      Object.keys(PROJECT_TEMPLATES).forEach((templateId) => {
        const template = PROJECT_TEMPLATES[templateId];

        expect(template.id).toBe(templateId);
        expect(template.name).toBeDefined();
        expect(template.description).toBeDefined();
        expect(template.layers).toBeDefined();
        expect(template.defaultDimensions).toBeDefined();
        expect(template.defaultDimensions.w).toBeGreaterThan(0);
        expect(template.defaultDimensions.h).toBeGreaterThan(0);
        expect(Array.isArray(template.layers)).toBe(true);
        expect(template.layers.length).toBeGreaterThan(0);
      });
    });

    it("should create scenes that match template specifications", () => {
      Object.keys(PROJECT_TEMPLATES).forEach((templateId) => {
        const template = PROJECT_TEMPLATES[templateId];
        const scene = Scene.fromTemplate(template);

        expect(scene.layers.length).toBe(template.layers.length);
        expect(scene.w).toBe(template.defaultDimensions.w);
        expect(scene.h).toBe(template.defaultDimensions.h);

        // Check layer names match template
        template.layers.forEach((templateLayer, index) => {
          const sceneLayer = scene.layers[index];
          expect(sceneLayer.name).toBe(templateLayer.name);
          expect(sceneLayer.id).toBe(templateLayer.id);
        });
      });
    });
  });
});
