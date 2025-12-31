import { describe, it, expect, beforeEach } from "vitest";
import {
  PROJECT_TEMPLATES,
  getTemplate,
  getAllTemplates,
  getDefaultTemplate,
  validateTemplate,
  createLayerTemplate,
  LAYER_TEMPLATES,
  TEMPLATE_CONVERSIONS,
  getAvailableConversions,
  generateLayerId
} from "../src/core/ProjectTemplate.js";

describe("ProjectTemplate", () => {
  describe("generateLayerId", () => {
    it("should generate unique IDs with purpose prefix", () => {
      const id1 = generateLayerId("bg");
      const id2 = generateLayerId("bg");

      expect(id1).toMatch(/^bg_/);
      expect(id2).toMatch(/^bg_/);
      expect(id1).not.toBe(id2);
    });

    it("should use default prefix when none provided", () => {
      const id = generateLayerId();
      expect(id).toMatch(/^layer_/);
    });

    it("should generate consistent format", () => {
      const id = generateLayerId("test");
      const parts = id.split("_");
      expect(parts).toHaveLength(3);
      expect(parts[0]).toBe("test");
      expect(parts[1]).toMatch(/^[0-9a-z]+$/); // timestamp in base36
      expect(parts[2]).toMatch(/^[0-9a-z]{5}$/); // random string
    });
  });

  describe("PROJECT_TEMPLATES", () => {
    it("should define all three templates", () => {
      expect(PROJECT_TEMPLATES.simple).toBeDefined();
      expect(PROJECT_TEMPLATES.standard).toBeDefined();
      expect(PROJECT_TEMPLATES.advanced).toBeDefined();
    });

    it("should have valid simple template structure", () => {
      const template = PROJECT_TEMPLATES.simple;
      expect(template.id).toBe("simple");
      expect(template.name).toBe("Simple Drawing");
      expect(template.layers).toHaveLength(1);
      expect(template.layers[0].id).toBe("main");
      expect(template.layers[0].defaultActive).toBe(true);
      expect(template.defaultDimensions).toEqual({ w: 40, h: 20 });
    });

    it("should have valid standard template structure", () => {
      const template = PROJECT_TEMPLATES.standard;
      expect(template.id).toBe("standard");
      expect(template.name).toBe("Standard Artwork");
      expect(template.layers).toHaveLength(2);

      const bgLayer = template.layers.find(l => l.id === "bg");
      const fgLayer = template.layers.find(l => l.id === "fg");

      expect(bgLayer).toBeDefined();
      expect(bgLayer.defaultActive).toBe(false);
      expect(fgLayer).toBeDefined();
      expect(fgLayer.defaultActive).toBe(true);
      expect(template.defaultDimensions).toEqual({ w: 60, h: 25 });
    });

    it("should have valid advanced template structure", () => {
      const template = PROJECT_TEMPLATES.advanced;
      expect(template.id).toBe("advanced");
      expect(template.name).toBe("Multi-Layer Project");
      expect(template.layers).toHaveLength(3);

      const bgLayer = template.layers.find(l => l.id === "bg");
      const midLayer = template.layers.find(l => l.id === "mid");
      const fgLayer = template.layers.find(l => l.id === "fg");

      expect(bgLayer).toBeDefined();
      expect(bgLayer.defaultActive).toBe(false);
      expect(midLayer).toBeDefined();
      expect(midLayer.defaultActive).toBe(true);
      expect(fgLayer).toBeDefined();
      expect(fgLayer.defaultActive).toBe(false);
      expect(template.defaultDimensions).toEqual({ w: 80, h: 25 });
    });

    it("should have exactly one default active layer per template", () => {
      Object.values(PROJECT_TEMPLATES).forEach(template => {
        const activeLayers = template.layers.filter(l => l.defaultActive);
        expect(activeLayers).toHaveLength(1);
      });
    });
  });

  describe("getTemplate", () => {
    it("should return template by ID", () => {
      const template = getTemplate("simple");
      expect(template).toBe(PROJECT_TEMPLATES.simple);
    });

    it("should return null for non-existent template", () => {
      const template = getTemplate("nonexistent");
      expect(template).toBeNull();
    });

    it("should return null for null/undefined ID", () => {
      expect(getTemplate(null)).toBeNull();
      expect(getTemplate(undefined)).toBeNull();
    });
  });

  describe("getAllTemplates", () => {
    it("should return all templates as array", () => {
      const templates = getAllTemplates();
      expect(Array.isArray(templates)).toBe(true);
      expect(templates).toHaveLength(3);

      const ids = templates.map(t => t.id);
      expect(ids).toContain("simple");
      expect(ids).toContain("standard");
      expect(ids).toContain("advanced");
    });

    it("should return template objects, not references", () => {
      const templates = getAllTemplates();
      templates.forEach(template => {
        expect(template).toHaveProperty("id");
        expect(template).toHaveProperty("name");
        expect(template).toHaveProperty("layers");
      });
    });
  });

  describe("getDefaultTemplate", () => {
    it("should return simple template as default", () => {
      const defaultTemplate = getDefaultTemplate();
      expect(defaultTemplate).toBe(PROJECT_TEMPLATES.simple);
    });
  });

  describe("validateTemplate", () => {
    it("should validate correct template structure", () => {
      expect(validateTemplate(PROJECT_TEMPLATES.simple)).toBe(true);
      expect(validateTemplate(PROJECT_TEMPLATES.standard)).toBe(true);
      expect(validateTemplate(PROJECT_TEMPLATES.advanced)).toBe(true);
    });

    it("should reject null/undefined templates", () => {
      expect(validateTemplate(null)).toBe(false);
      expect(validateTemplate(undefined)).toBe(false);
      expect(validateTemplate("not an object")).toBe(false);
    });

    it("should reject templates missing required fields", () => {
      const incompleteTemplate = {
        id: "test",
        name: "Test"
        // missing description, layers, defaultDimensions
      };
      expect(validateTemplate(incompleteTemplate)).toBe(false);
    });

    it("should reject templates with empty layers array", () => {
      const invalidTemplate = {
        id: "test",
        name: "Test",
        description: "Test template",
        layers: [],
        defaultDimensions: { w: 10, h: 10 }
      };
      expect(validateTemplate(invalidTemplate)).toBe(false);
    });

    it("should reject templates with invalid layer structure", () => {
      const invalidTemplate = {
        id: "test",
        name: "Test",
        description: "Test template",
        layers: [
          { name: "Layer 1" } // missing id and defaultActive
        ],
        defaultDimensions: { w: 10, h: 10 }
      };
      expect(validateTemplate(invalidTemplate)).toBe(false);
    });

    it("should reject templates with invalid dimensions", () => {
      const invalidTemplate = {
        id: "test",
        name: "Test",
        description: "Test template",
        layers: [
          { id: "layer1", name: "Layer 1", defaultActive: true }
        ],
        defaultDimensions: { w: 0, h: 10 } // invalid width
      };
      expect(validateTemplate(invalidTemplate)).toBe(false);
    });
  });

  describe("createLayerTemplate", () => {
    it("should create layer template with purpose and name", () => {
      const template = createLayerTemplate("detail", "Detail Layer");

      expect(template.id).toMatch(/^detail_/);
      expect(template.name).toBe("Detail Layer");
      expect(template.defaultActive).toBe(false);
      expect(template.visible).toBe(true);
      expect(template.locked).toBe(false);
    });

    it("should use purpose as name when name not provided", () => {
      const template = createLayerTemplate("effect");

      expect(template.name).toBe("Effect");
    });

    it("should generate unique IDs for same purpose", () => {
      const template1 = createLayerTemplate("bg");
      const template2 = createLayerTemplate("bg");

      expect(template1.id).not.toBe(template2.id);
      expect(template1.id).toMatch(/^bg_/);
      expect(template2.id).toMatch(/^bg_/);
    });
  });

  describe("LAYER_TEMPLATES", () => {
    it("should provide factory functions for common layer types", () => {
      expect(typeof LAYER_TEMPLATES.background).toBe("function");
      expect(typeof LAYER_TEMPLATES.foreground).toBe("function");
      expect(typeof LAYER_TEMPLATES.detail).toBe("function");
      expect(typeof LAYER_TEMPLATES.effect).toBe("function");
      expect(typeof LAYER_TEMPLATES.overlay).toBe("function");
      expect(typeof LAYER_TEMPLATES.sketch).toBe("function");
    });

    it("should create valid layer templates", () => {
      const bgTemplate = LAYER_TEMPLATES.background();

      expect(bgTemplate.id).toMatch(/^bg_/);
      expect(bgTemplate.name).toBe("Background");
      expect(bgTemplate.defaultActive).toBe(false);
      expect(bgTemplate.visible).toBe(true);
      expect(bgTemplate.locked).toBe(false);
    });

    it("should generate unique IDs on each call", () => {
      const template1 = LAYER_TEMPLATES.detail();
      const template2 = LAYER_TEMPLATES.detail();

      expect(template1.id).not.toBe(template2.id);
    });
  });

  describe("TEMPLATE_CONVERSIONS", () => {
    it("should define conversion from simple to standard", () => {
      const conversion = TEMPLATE_CONVERSIONS.simpleToStandard;
      expect(conversion.from).toBe("simple");
      expect(conversion.to).toBe("standard");
      expect(conversion.addLayers).toHaveLength(1);
      expect(conversion.addLayers[0].id).toBe("bg");
      expect(conversion.addLayers[0].insertAt).toBe(0);
    });

    it("should define conversion from standard to advanced", () => {
      const conversion = TEMPLATE_CONVERSIONS.standardToAdvanced;
      expect(conversion.from).toBe("standard");
      expect(conversion.to).toBe("advanced");
      expect(conversion.addLayers).toHaveLength(1);
      expect(conversion.addLayers[0].id).toBe("mid");
      expect(conversion.addLayers[0].insertAt).toBe(1);
    });

    it("should define conversion from simple to advanced", () => {
      const conversion = TEMPLATE_CONVERSIONS.simpleToAdvanced;
      expect(conversion.from).toBe("simple");
      expect(conversion.to).toBe("advanced");
      expect(conversion.addLayers).toHaveLength(2);

      const bgLayer = conversion.addLayers.find(l => l.id === "bg");
      const midLayer = conversion.addLayers.find(l => l.id === "mid");

      expect(bgLayer.insertAt).toBe(0);
      expect(midLayer.insertAt).toBe(1);
    });
  });

  describe("getAvailableConversions", () => {
    it("should return conversions from simple template", () => {
      const conversions = getAvailableConversions("simple");
      expect(conversions).toHaveLength(2);

      const conversionTos = conversions.map(c => c.to);
      expect(conversionTos).toContain("standard");
      expect(conversionTos).toContain("advanced");
    });

    it("should return conversions from standard template", () => {
      const conversions = getAvailableConversions("standard");
      expect(conversions).toHaveLength(1);
      expect(conversions[0].to).toBe("advanced");
    });

    it("should return empty array for advanced template", () => {
      const conversions = getAvailableConversions("advanced");
      expect(conversions).toHaveLength(0);
    });

    it("should return empty array for non-existent template", () => {
      const conversions = getAvailableConversions("nonexistent");
      expect(conversions).toHaveLength(0);
    });
  });

  describe("integration tests", () => {
    it("should support complete template workflow", () => {
      // Get a template
      const template = getTemplate("standard");
      expect(validateTemplate(template)).toBe(true);

      // Get available conversions
      const conversions = getAvailableConversions(template.id);
      expect(conversions.length).toBeGreaterThan(0);

      // Create additional layer
      const extraLayer = createLayerTemplate("detail", "Detail");
      expect(extraLayer.id).toMatch(/^detail_/);
    });

    it("should maintain consistent template structure across operations", () => {
      const templates = getAllTemplates();

      templates.forEach(template => {
        expect(validateTemplate(template)).toBe(true);

        // Each template should have unique layer IDs within itself
        const layerIds = template.layers.map(l => l.id);
        const uniqueIds = [...new Set(layerIds)];
        expect(uniqueIds).toHaveLength(layerIds.length);

        // Each template should have exactly one default active layer
        const activeLayers = template.layers.filter(l => l.defaultActive);
        expect(activeLayers).toHaveLength(1);
      });
    });

    it("should provide sensible defaults for all templates", () => {
      const templates = getAllTemplates();

      templates.forEach(template => {
        // Dimensions should be reasonable
        expect(template.defaultDimensions.w).toBeGreaterThan(0);
        expect(template.defaultDimensions.h).toBeGreaterThan(0);
        expect(template.defaultDimensions.w).toBeLessThan(200);
        expect(template.defaultDimensions.h).toBeLessThan(200);

        // Should have description and recommendation
        expect(typeof template.description).toBe("string");
        expect(template.description.length).toBeGreaterThan(0);

        if (template.recommended) {
          expect(typeof template.recommended).toBe("string");
          expect(template.recommended.length).toBeGreaterThan(0);
        }
      });
    });
  });
});
