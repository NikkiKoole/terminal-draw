import { describe, it, expect, beforeEach } from "vitest";
import {
  createLayerFromTemplate,
  validateLayerTemplate,
  layerToTemplate,
  cloneLayerTemplate,
  mergeLayerTemplates,
  createSmartLayerTemplate,
  suggestLayerName,
  reorderLayerTemplates,
  findLayerTemplateById,
  removeLayerTemplateById
} from "../src/core/LayerTemplate.js";
import { Layer } from "../src/core/Layer.js";

describe("LayerTemplate", () => {
  let validLayerTemplate;
  let testLayer;

  beforeEach(() => {
    validLayerTemplate = {
      id: "test_layer",
      name: "Test Layer",
      defaultActive: false,
      visible: true,
      locked: false
    };

    testLayer = new Layer("test_id", "Test Layer", 10, 10);
    testLayer.visible = true;
    testLayer.locked = false;
  });

  describe("createLayerFromTemplate", () => {
    it("should create layer from valid template", () => {
      const layer = createLayerFromTemplate(validLayerTemplate, 20, 15);

      expect(layer.id).toBe("test_layer");
      expect(layer.name).toBe("Test Layer");
      expect(layer.width).toBe(20);
      expect(layer.height).toBe(15);
      expect(layer.visible).toBe(true);
      expect(layer.locked).toBe(false);
    });

    it("should apply template properties to layer", () => {
      const template = {
        ...validLayerTemplate,
        visible: false,
        locked: true
      };

      const layer = createLayerFromTemplate(template, 10, 10);

      expect(layer.visible).toBe(false);
      expect(layer.locked).toBe(true);
    });

    it("should use defaults when properties not specified", () => {
      const minimalTemplate = {
        id: "minimal",
        name: "Minimal Layer"
      };

      const layer = createLayerFromTemplate(minimalTemplate, 10, 10);

      expect(layer.visible).toBe(true);
      expect(layer.locked).toBe(false);
    });

    it("should throw error for invalid template", () => {
      const invalidTemplate = {
        name: "Missing ID"
        // missing id field
      };

      expect(() => {
        createLayerFromTemplate(invalidTemplate, 10, 10);
      }).toThrow("Invalid layer template");
    });
  });

  describe("validateLayerTemplate", () => {
    it("should validate correct template", () => {
      expect(validateLayerTemplate(validLayerTemplate)).toBe(true);
    });

    it("should reject null/undefined templates", () => {
      expect(validateLayerTemplate(null)).toBe(false);
      expect(validateLayerTemplate(undefined)).toBe(false);
      expect(validateLayerTemplate("not an object")).toBe(false);
    });

    it("should reject templates missing required fields", () => {
      expect(validateLayerTemplate({ name: "Missing ID" })).toBe(false);
      expect(validateLayerTemplate({ id: "test" })).toBe(false);
    });

    it("should reject templates with wrong field types", () => {
      const invalidTemplate1 = {
        ...validLayerTemplate,
        id: 123 // should be string
      };

      const invalidTemplate2 = {
        ...validLayerTemplate,
        defaultActive: "true" // should be boolean
      };

      expect(validateLayerTemplate(invalidTemplate1)).toBe(false);
      expect(validateLayerTemplate(invalidTemplate2)).toBe(false);
    });

    it("should reject templates with invalid ID format", () => {
      const invalidTemplate1 = {
        ...validLayerTemplate,
        id: "" // empty string
      };

      const invalidTemplate2 = {
        ...validLayerTemplate,
        id: "invalid id" // contains space
      };

      expect(validateLayerTemplate(invalidTemplate1)).toBe(false);
      expect(validateLayerTemplate(invalidTemplate2)).toBe(false);
    });

    it("should reject templates with empty name", () => {
      const invalidTemplate = {
        ...validLayerTemplate,
        name: ""
      };

      expect(validateLayerTemplate(invalidTemplate)).toBe(false);
    });

    it("should accept minimal valid template", () => {
      const minimalTemplate = {
        id: "minimal",
        name: "Minimal"
      };

      expect(validateLayerTemplate(minimalTemplate)).toBe(true);
    });
  });

  describe("layerToTemplate", () => {
    it("should convert layer to template", () => {
      const template = layerToTemplate(testLayer, true);

      expect(template.id).toBe(testLayer.id);
      expect(template.name).toBe(testLayer.name);
      expect(template.defaultActive).toBe(true);
      expect(template.visible).toBe(testLayer.visible);
      expect(template.locked).toBe(testLayer.locked);
    });

    it("should use defaultActive parameter", () => {
      const template1 = layerToTemplate(testLayer, true);
      const template2 = layerToTemplate(testLayer, false);

      expect(template1.defaultActive).toBe(true);
      expect(template2.defaultActive).toBe(false);
    });

    it("should default defaultActive to false", () => {
      const template = layerToTemplate(testLayer);
      expect(template.defaultActive).toBe(false);
    });

    it("should throw error for invalid layer", () => {
      expect(() => {
        layerToTemplate(null);
      }).toThrow("Invalid layer provided");

      expect(() => {
        layerToTemplate({ name: "No ID" });
      }).toThrow("Invalid layer provided");
    });
  });

  describe("cloneLayerTemplate", () => {
    it("should clone template without modifications", () => {
      const clone = cloneLayerTemplate(validLayerTemplate);

      expect(clone).toEqual(validLayerTemplate);
      expect(clone).not.toBe(validLayerTemplate); // different object
    });

    it("should apply modifications to clone", () => {
      const modifications = {
        name: "Modified Name",
        defaultActive: true
      };

      const clone = cloneLayerTemplate(validLayerTemplate, modifications);

      expect(clone.id).toBe(validLayerTemplate.id);
      expect(clone.name).toBe("Modified Name");
      expect(clone.defaultActive).toBe(true);
      expect(clone.visible).toBe(validLayerTemplate.visible);
      expect(clone.locked).toBe(validLayerTemplate.locked);
    });

    it("should throw error for invalid source template", () => {
      expect(() => {
        cloneLayerTemplate({ name: "Invalid" });
      }).toThrow("Invalid source layer template");
    });
  });

  describe("mergeLayerTemplates", () => {
    it("should merge individual templates", () => {
      const template1 = { ...validLayerTemplate, id: "layer1" };
      const template2 = { ...validLayerTemplate, id: "layer2" };

      const merged = mergeLayerTemplates(template1, template2);

      expect(merged).toHaveLength(2);
      expect(merged[0]).toEqual(template1);
      expect(merged[1]).toEqual(template2);
    });

    it("should merge arrays of templates", () => {
      const array1 = [
        { ...validLayerTemplate, id: "layer1" },
        { ...validLayerTemplate, id: "layer2" }
      ];
      const array2 = [
        { ...validLayerTemplate, id: "layer3" }
      ];

      const merged = mergeLayerTemplates(array1, array2);

      expect(merged).toHaveLength(3);
      expect(merged.map(t => t.id)).toEqual(["layer1", "layer2", "layer3"]);
    });

    it("should merge mixed templates and arrays", () => {
      const template = { ...validLayerTemplate, id: "single" };
      const array = [
        { ...validLayerTemplate, id: "array1" },
        { ...validLayerTemplate, id: "array2" }
      ];

      const merged = mergeLayerTemplates(template, array);

      expect(merged).toHaveLength(3);
      expect(merged.map(t => t.id)).toEqual(["single", "array1", "array2"]);
    });

    it("should throw error for invalid template in merge", () => {
      const validTemplate = { ...validLayerTemplate, id: "valid" };
      const invalidTemplate = { name: "Invalid" };

      expect(() => {
        mergeLayerTemplates(validTemplate, invalidTemplate);
      }).toThrow("Invalid layer template in merge");
    });
  });

  describe("createSmartLayerTemplate", () => {
    it("should create template with bg purpose defaults", () => {
      const template = createSmartLayerTemplate("bg");

      expect(template.id).toMatch(/^bg_/);
      expect(template.name).toBe("Background");
      expect(template.defaultActive).toBe(false);
      expect(template.visible).toBe(true);
      expect(template.locked).toBe(false);
    });

    it("should create template with mid purpose defaults", () => {
      const template = createSmartLayerTemplate("mid");

      expect(template.name).toBe("Middle");
      expect(template.defaultActive).toBe(true);
    });

    it("should create template with main purpose defaults", () => {
      const template = createSmartLayerTemplate("main");

      expect(template.name).toBe("Main");
      expect(template.defaultActive).toBe(true);
    });

    it("should use custom name when provided", () => {
      const template = createSmartLayerTemplate("bg", "Custom Background");

      expect(template.name).toBe("Custom Background");
      expect(template.defaultActive).toBe(false); // still uses purpose defaults
    });

    it("should apply custom options", () => {
      const options = {
        visible: false,
        locked: true
      };

      const template = createSmartLayerTemplate("detail", null, options);

      expect(template.name).toBe("Detail");
      expect(template.visible).toBe(false);
      expect(template.locked).toBe(true);
    });

    it("should fall back to main defaults for unknown purpose", () => {
      const template = createSmartLayerTemplate("unknown_purpose");

      expect(template.name).toBe("Main");
      expect(template.defaultActive).toBe(true);
    });

    it("should generate unique IDs for same purpose", () => {
      const template1 = createSmartLayerTemplate("bg");
      const template2 = createSmartLayerTemplate("bg");

      expect(template1.id).not.toBe(template2.id);
      expect(template1.id).toMatch(/^bg_/);
      expect(template2.id).toMatch(/^bg_/);
    });
  });

  describe("suggestLayerName", () => {
    it("should return base name when not taken", () => {
      const existingLayers = [
        { name: "Background" },
        { name: "Foreground" }
      ];

      const name = suggestLayerName(existingLayers, "detail");
      expect(name).toBe("Detail");
    });

    it("should add number when base name is taken", () => {
      const existingLayers = [
        { name: "Detail" },
        { name: "Background" }
      ];

      const name = suggestLayerName(existingLayers, "detail");
      expect(name).toBe("Detail 2");
    });

    it("should find next available number", () => {
      const existingLayers = [
        { name: "Detail" },
        { name: "Detail 2" },
        { name: "Detail 3" }
      ];

      const name = suggestLayerName(existingLayers, "detail");
      expect(name).toBe("Detail 4");
    });

    it("should be case-insensitive", () => {
      const existingLayers = [
        { name: "DETAIL" },
        { name: "detail 2" }
      ];

      const name = suggestLayerName(existingLayers, "detail");
      expect(name).toBe("Detail 3");
    });

    it("should handle layers with id property instead of name", () => {
      const existingLayers = [
        { id: "detail_1" },
        { name: "Background" }
      ];

      const name = suggestLayerName(existingLayers, "detail");
      expect(name).toBe("Detail");
    });
  });

  describe("reorderLayerTemplates", () => {
    let templates;

    beforeEach(() => {
      templates = [
        { ...validLayerTemplate, id: "layer1", name: "Layer 1" },
        { ...validLayerTemplate, id: "layer2", name: "Layer 2" },
        { ...validLayerTemplate, id: "layer3", name: "Layer 3" }
      ];
    });

    it("should reorder templates correctly", () => {
      const reordered = reorderLayerTemplates(templates, 0, 2);

      expect(reordered.map(t => t.id)).toEqual(["layer2", "layer3", "layer1"]);
      expect(reordered).toHaveLength(3);
    });

    it("should not modify original array", () => {
      const original = [...templates];
      const reordered = reorderLayerTemplates(templates, 1, 0);

      expect(templates).toEqual(original);
      expect(reordered).not.toBe(templates);
    });

    it("should handle moving item to beginning", () => {
      const reordered = reorderLayerTemplates(templates, 2, 0);
      expect(reordered.map(t => t.id)).toEqual(["layer3", "layer1", "layer2"]);
    });

    it("should handle moving item to end", () => {
      const reordered = reorderLayerTemplates(templates, 0, 2);
      expect(reordered.map(t => t.id)).toEqual(["layer2", "layer3", "layer1"]);
    });

    it("should throw error for invalid array input", () => {
      expect(() => {
        reorderLayerTemplates("not an array", 0, 1);
      }).toThrow("layerTemplates must be an array");
    });

    it("should throw error for invalid indices", () => {
      expect(() => {
        reorderLayerTemplates(templates, -1, 0);
      }).toThrow("Invalid index for reordering");

      expect(() => {
        reorderLayerTemplates(templates, 0, 5);
      }).toThrow("Invalid index for reordering");
    });
  });

  describe("findLayerTemplateById", () => {
    let templates;

    beforeEach(() => {
      templates = [
        { ...validLayerTemplate, id: "layer1" },
        { ...validLayerTemplate, id: "layer2" },
        { ...validLayerTemplate, id: "layer3" }
      ];
    });

    it("should find template by ID", () => {
      const found = findLayerTemplateById(templates, "layer2");
      expect(found.id).toBe("layer2");
    });

    it("should return null for non-existent ID", () => {
      const found = findLayerTemplateById(templates, "nonexistent");
      expect(found).toBeNull();
    });

    it("should return null for invalid array", () => {
      expect(findLayerTemplateById("not an array", "layer1")).toBeNull();
      expect(findLayerTemplateById(null, "layer1")).toBeNull();
    });

    it("should return first match for duplicate IDs", () => {
      const templatesWithDuplicate = [
        { ...validLayerTemplate, id: "duplicate", name: "First" },
        { ...validLayerTemplate, id: "duplicate", name: "Second" }
      ];

      const found = findLayerTemplateById(templatesWithDuplicate, "duplicate");
      expect(found.name).toBe("First");
    });
  });

  describe("removeLayerTemplateById", () => {
    let templates;

    beforeEach(() => {
      templates = [
        { ...validLayerTemplate, id: "layer1" },
        { ...validLayerTemplate, id: "layer2" },
        { ...validLayerTemplate, id: "layer3" }
      ];
    });

    it("should remove template by ID", () => {
      const filtered = removeLayerTemplateById(templates, "layer2");

      expect(filtered).toHaveLength(2);
      expect(filtered.map(t => t.id)).toEqual(["layer1", "layer3"]);
    });

    it("should not modify original array", () => {
      const original = [...templates];
      const filtered = removeLayerTemplateById(templates, "layer1");

      expect(templates).toEqual(original);
      expect(filtered).not.toBe(templates);
    });

    it("should return original array when ID not found", () => {
      const filtered = removeLayerTemplateById(templates, "nonexistent");

      expect(filtered).toHaveLength(3);
      expect(filtered.map(t => t.id)).toEqual(["layer1", "layer2", "layer3"]);
    });

    it("should remove all instances of duplicate IDs", () => {
      const templatesWithDuplicate = [
        { ...validLayerTemplate, id: "duplicate", name: "First" },
        { ...validLayerTemplate, id: "unique" },
        { ...validLayerTemplate, id: "duplicate", name: "Second" }
      ];

      const filtered = removeLayerTemplateById(templatesWithDuplicate, "duplicate");

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe("unique");
    });

    it("should throw error for invalid array input", () => {
      expect(() => {
        removeLayerTemplateById("not an array", "layer1");
      }).toThrow("layerTemplates must be an array");
    });
  });

  describe("integration tests", () => {
    it("should support complete layer template workflow", () => {
      // Create smart template
      const template = createSmartLayerTemplate("bg", "My Background");
      expect(validateLayerTemplate(template)).toBe(true);

      // Create layer from template
      const layer = createLayerFromTemplate(template, 50, 30);
      expect(layer.name).toBe("My Background");

      // Convert back to template
      const backToTemplate = layerToTemplate(layer, true);
      expect(backToTemplate.name).toBe("My Background");
      expect(backToTemplate.defaultActive).toBe(true);

      // Clone and modify
      const cloned = cloneLayerTemplate(backToTemplate, { name: "Cloned Background" });
      expect(cloned.name).toBe("Cloned Background");
      expect(cloned.id).toBe(template.id); // ID preserved
    });

    it("should handle template arrays efficiently", () => {
      const templates = [
        createSmartLayerTemplate("bg"),
        createSmartLayerTemplate("mid"),
        createSmartLayerTemplate("fg")
      ];

      // All should be valid
      templates.forEach(template => {
        expect(validateLayerTemplate(template)).toBe(true);
      });

      // Should be able to find and remove
      const found = findLayerTemplateById(templates, templates[1].id);
      expect(found).toBe(templates[1]);

      const filtered = removeLayerTemplateById(templates, templates[1].id);
      expect(filtered).toHaveLength(2);

      // Should be able to reorder
      const reordered = reorderLayerTemplates(templates, 0, 2);
      expect(reordered[2].id).toBe(templates[0].id);
    });
  });
});
