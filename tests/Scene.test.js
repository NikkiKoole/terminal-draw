import { describe, it, expect, beforeEach } from "vitest";
import { Scene } from "../src/core/Scene.js";
import { Layer } from "../src/core/Layer.js";
import { Cell } from "../src/core/Cell.js";
import {
  DEFAULT_WIDTH,
  DEFAULT_HEIGHT,
  DEFAULT_PALETTE_ID,
  LAYER_BG,
  LAYER_MID,
  LAYER_FG,
} from "../src/core/constants.js";

describe("Scene", () => {
  let scene;

  beforeEach(() => {
    scene = new Scene();
  });

  describe("constructor", () => {
    it("should create a scene with default dimensions", () => {
      expect(scene.w).toBe(DEFAULT_WIDTH);
      expect(scene.h).toBe(DEFAULT_HEIGHT);
      expect(scene.paletteId).toBe(DEFAULT_PALETTE_ID);
    });

    it("should create a scene with custom dimensions", () => {
      const customScene = new Scene(40, 20, "monokai");
      expect(customScene.w).toBe(40);
      expect(customScene.h).toBe(20);
      expect(customScene.paletteId).toBe("monokai");
    });

    it("should initialize with 3 layers", () => {
      expect(scene.layers.length).toBe(3);
    });

    it("should create layers with correct IDs", () => {
      expect(scene.layers[0].id).toBe(LAYER_BG);
      expect(scene.layers[1].id).toBe(LAYER_MID);
      expect(scene.layers[2].id).toBe(LAYER_FG);
    });

    it("should create layers with correct names", () => {
      expect(scene.layers[0].name).toBe("Background");
      expect(scene.layers[1].name).toBe("Middle");
      expect(scene.layers[2].name).toBe("Foreground");
    });

    it("should create layers with scene dimensions", () => {
      const customScene = new Scene(40, 20);
      expect(customScene.layers[0].width).toBe(40);
      expect(customScene.layers[0].height).toBe(20);
    });

    it("should set middle layer as active by default", () => {
      expect(scene.activeLayerId).toBe(LAYER_MID);
    });

    it("should initialize empty options object", () => {
      expect(scene.options).toEqual({});
    });

    it("should store paletteId as string reference", () => {
      expect(typeof scene.paletteId).toBe("string");
    });
  });

  describe("getActiveLayer", () => {
    it("should return the middle layer by default", () => {
      const layer = scene.getActiveLayer();
      expect(layer).toBeInstanceOf(Layer);
      expect(layer.id).toBe(LAYER_MID);
    });

    it("should return correct layer after changing active layer", () => {
      scene.setActiveLayer(LAYER_BG);
      const layer = scene.getActiveLayer();
      expect(layer.id).toBe(LAYER_BG);
    });

    it("should return null if active layer ID is invalid", () => {
      scene.activeLayerId = "nonexistent";
      const layer = scene.getActiveLayer();
      expect(layer).toBe(null);
    });
  });

  describe("getLayer", () => {
    it("should return layer by ID", () => {
      const bgLayer = scene.getLayer(LAYER_BG);
      expect(bgLayer).toBeInstanceOf(Layer);
      expect(bgLayer.id).toBe(LAYER_BG);

      const midLayer = scene.getLayer(LAYER_MID);
      expect(midLayer.id).toBe(LAYER_MID);

      const fgLayer = scene.getLayer(LAYER_FG);
      expect(fgLayer.id).toBe(LAYER_FG);
    });

    it("should return null for non-existent layer", () => {
      const layer = scene.getLayer("nonexistent");
      expect(layer).toBe(null);
    });

    it("should return null for undefined ID", () => {
      const layer = scene.getLayer(undefined);
      expect(layer).toBe(null);
    });

    it("should return null for null ID", () => {
      const layer = scene.getLayer(null);
      expect(layer).toBe(null);
    });
  });

  describe("setActiveLayer", () => {
    it("should set active layer to background", () => {
      const result = scene.setActiveLayer(LAYER_BG);
      expect(result).toBe(true);
      expect(scene.activeLayerId).toBe(LAYER_BG);
    });

    it("should set active layer to foreground", () => {
      const result = scene.setActiveLayer(LAYER_FG);
      expect(result).toBe(true);
      expect(scene.activeLayerId).toBe(LAYER_FG);
    });

    it("should return false for non-existent layer", () => {
      const result = scene.setActiveLayer("nonexistent");
      expect(result).toBe(false);
      expect(scene.activeLayerId).toBe(LAYER_MID); // Should not change
    });

    it("should not change active layer if ID is invalid", () => {
      const originalActive = scene.activeLayerId;
      scene.setActiveLayer("invalid");
      expect(scene.activeLayerId).toBe(originalActive);
    });
  });

  describe("getCellIndex", () => {
    it("should convert coordinates to correct index", () => {
      expect(scene.getCellIndex(0, 0)).toBe(0);
      expect(scene.getCellIndex(79, 0)).toBe(79);
      expect(scene.getCellIndex(0, 1)).toBe(80);
      expect(scene.getCellIndex(5, 2)).toBe(165); // 2 * 80 + 5
    });

    it("should work with custom scene dimensions", () => {
      const customScene = new Scene(40, 20);
      expect(customScene.getCellIndex(0, 0)).toBe(0);
      expect(customScene.getCellIndex(39, 0)).toBe(39);
      expect(customScene.getCellIndex(0, 1)).toBe(40);
      expect(customScene.getCellIndex(5, 2)).toBe(85); // 2 * 40 + 5
    });
  });

  describe("isValidCoord", () => {
    it("should return true for valid coordinates", () => {
      expect(scene.isValidCoord(0, 0)).toBe(true);
      expect(scene.isValidCoord(40, 12)).toBe(true);
      expect(scene.isValidCoord(79, 24)).toBe(true);
    });

    it("should return false for negative coordinates", () => {
      expect(scene.isValidCoord(-1, 0)).toBe(false);
      expect(scene.isValidCoord(0, -1)).toBe(false);
      expect(scene.isValidCoord(-1, -1)).toBe(false);
    });

    it("should return false for out of bounds coordinates", () => {
      expect(scene.isValidCoord(80, 0)).toBe(false);
      expect(scene.isValidCoord(0, 25)).toBe(false);
      expect(scene.isValidCoord(100, 100)).toBe(false);
    });

    it("should work with custom scene dimensions", () => {
      const customScene = new Scene(40, 20);
      expect(customScene.isValidCoord(39, 19)).toBe(true);
      expect(customScene.isValidCoord(40, 19)).toBe(false);
      expect(customScene.isValidCoord(39, 20)).toBe(false);
    });
  });

  describe("addLayer", () => {
    it("should add a new layer to the scene", () => {
      const newLayer = new Layer("custom", "Custom Layer", 80, 25);
      const result = scene.addLayer(newLayer);

      expect(result).toBe(true);
      expect(scene.layers.length).toBe(4);
      expect(scene.getLayer("custom")).toBe(newLayer);
    });

    it("should return false if layer ID already exists", () => {
      const duplicateLayer = new Layer(LAYER_BG, "Duplicate", 80, 25);
      const result = scene.addLayer(duplicateLayer);

      expect(result).toBe(false);
      expect(scene.layers.length).toBe(3); // Should not add
    });

    it("should add layer at the end of layers array", () => {
      const newLayer = new Layer("custom", "Custom Layer", 80, 25);
      scene.addLayer(newLayer);

      expect(scene.layers[3]).toBe(newLayer);
    });
  });

  describe("removeLayer", () => {
    it("should remove a layer by ID", () => {
      const result = scene.removeLayer(LAYER_FG);

      expect(result).toBe(true);
      expect(scene.layers.length).toBe(2);
      expect(scene.getLayer(LAYER_FG)).toBe(null);
    });

    it("should return false if layer not found", () => {
      const result = scene.removeLayer("nonexistent");

      expect(result).toBe(false);
      expect(scene.layers.length).toBe(3);
    });

    it("should not remove the last layer", () => {
      // Remove two layers, leaving only one
      scene.removeLayer(LAYER_FG);
      scene.removeLayer(LAYER_MID);

      // Try to remove the last layer
      const result = scene.removeLayer(LAYER_BG);

      expect(result).toBe(false);
      expect(scene.layers.length).toBe(1);
    });

    it("should change active layer if removing active layer", () => {
      scene.setActiveLayer(LAYER_FG);
      scene.removeLayer(LAYER_FG);

      expect(scene.activeLayerId).not.toBe(LAYER_FG);
      expect(scene.getActiveLayer()).not.toBe(null);
    });

    it("should set first layer as active when removing active layer", () => {
      scene.setActiveLayer(LAYER_FG);
      scene.removeLayer(LAYER_FG);

      expect(scene.activeLayerId).toBe(scene.layers[0].id);
    });

    it("should not change active layer if removing non-active layer", () => {
      scene.setActiveLayer(LAYER_MID);
      scene.removeLayer(LAYER_FG);

      expect(scene.activeLayerId).toBe(LAYER_MID);
    });
  });

  describe("getVisibleLayers", () => {
    it("should return all layers when all are visible", () => {
      const visible = scene.getVisibleLayers();
      expect(visible.length).toBe(3);
    });

    it("should return only visible layers", () => {
      scene.getLayer(LAYER_BG).visible = false;
      scene.getLayer(LAYER_FG).visible = false;

      const visible = scene.getVisibleLayers();
      expect(visible.length).toBe(1);
      expect(visible[0].id).toBe(LAYER_MID);
    });

    it("should return empty array if no layers are visible", () => {
      scene.layers.forEach((layer) => (layer.visible = false));

      const visible = scene.getVisibleLayers();
      expect(visible.length).toBe(0);
    });

    it("should return actual layer objects", () => {
      const visible = scene.getVisibleLayers();
      expect(visible[0]).toBeInstanceOf(Layer);
    });
  });

  describe("clearAll", () => {
    it("should clear all layers", () => {
      // Set some cells
      scene.getLayer(LAYER_BG).setCell(0, 0, new Cell("A", 1, 0));
      scene.getLayer(LAYER_MID).setCell(0, 0, new Cell("B", 2, 1));
      scene.getLayer(LAYER_FG).setCell(0, 0, new Cell("C", 3, 2));

      scene.clearAll();

      // All cells should be empty
      expect(scene.getLayer(LAYER_BG).getCell(0, 0).isEmpty()).toBe(true);
      expect(scene.getLayer(LAYER_MID).getCell(0, 0).isEmpty()).toBe(true);
      expect(scene.getLayer(LAYER_FG).getCell(0, 0).isEmpty()).toBe(true);
    });

    it("should not change layer properties", () => {
      scene.getLayer(LAYER_BG).visible = false;
      scene.getLayer(LAYER_MID).locked = true;

      scene.clearAll();

      expect(scene.getLayer(LAYER_BG).visible).toBe(false);
      expect(scene.getLayer(LAYER_MID).locked).toBe(true);
    });
  });

  describe("toObject and fromObject", () => {
    it("should convert to plain object", () => {
      const obj = scene.toObject();

      expect(obj.w).toBe(80);
      expect(obj.h).toBe(25);
      expect(obj.paletteId).toBe(DEFAULT_PALETTE_ID);
      expect(obj.activeLayerId).toBe(LAYER_MID);
      expect(obj.layers).toBeInstanceOf(Array);
      expect(obj.layers.length).toBe(3);
      expect(obj.options).toEqual({});
    });

    it("should include custom options", () => {
      scene.options = { customSetting: true, zoom: 150 };
      const obj = scene.toObject();

      expect(obj.options).toEqual({ customSetting: true, zoom: 150 });
    });

    it("should serialize layer data", () => {
      scene.getLayer(LAYER_BG).setCell(0, 0, new Cell("X", 1, 0));
      const obj = scene.toObject();

      expect(obj.layers[0].cells[0].ch).toBe("X");
    });

    it("should be JSON serializable", () => {
      scene.getLayer(LAYER_MID).setCell(5, 5, new Cell("A", 3, 2));
      const json = JSON.stringify(scene.toObject());
      const parsed = JSON.parse(json);

      expect(parsed.w).toBe(80);
      expect(parsed.paletteId).toBe(DEFAULT_PALETTE_ID);
    });

    it("should restore scene from object", () => {
      scene.getLayer(LAYER_BG).setCell(0, 0, new Cell("X", 1, 0));
      scene.setActiveLayer(LAYER_FG);
      scene.options = { test: true };

      const obj = scene.toObject();
      const restored = Scene.fromObject(obj);

      expect(restored.w).toBe(scene.w);
      expect(restored.h).toBe(scene.h);
      expect(restored.paletteId).toBe(scene.paletteId);
      expect(restored.activeLayerId).toBe(LAYER_FG);
      expect(restored.options).toEqual({ test: true });
      expect(restored.layers.length).toBe(3);
    });

    it("should restore layer data correctly", () => {
      scene.getLayer(LAYER_BG).setCell(5, 5, new Cell("Z", 7, 6));
      scene.getLayer(LAYER_BG).visible = false;
      scene.getLayer(LAYER_MID).locked = true;

      const obj = scene.toObject();
      const restored = Scene.fromObject(obj);

      const bgLayer = restored.getLayer(LAYER_BG);
      expect(bgLayer.visible).toBe(false);
      expect(bgLayer.getCell(5, 5).ch).toBe("Z");

      const midLayer = restored.getLayer(LAYER_MID);
      expect(midLayer.locked).toBe(true);
    });

    it("should preserve all cells through round-trip", () => {
      scene.getLayer(LAYER_MID).setCell(0, 0, new Cell("A", 1, 0));
      scene.getLayer(LAYER_MID).setCell(79, 24, new Cell("Z", 7, 6));

      const obj = scene.toObject();
      const restored = Scene.fromObject(obj);

      const midLayer = restored.getLayer(LAYER_MID);
      expect(midLayer.getCell(0, 0).ch).toBe("A");
      expect(midLayer.getCell(0, 0).fg).toBe(1);
      expect(midLayer.getCell(79, 24).ch).toBe("Z");
      expect(midLayer.getCell(79, 24).bg).toBe(6);
    });

    it("should handle custom scene dimensions", () => {
      const customScene = new Scene(40, 20, "monokai");
      const obj = customScene.toObject();
      const restored = Scene.fromObject(obj);

      expect(restored.w).toBe(40);
      expect(restored.h).toBe(20);
      expect(restored.paletteId).toBe("monokai");
    });

    it("should clone options object", () => {
      scene.options = { setting: "value" };
      const obj = scene.toObject();

      obj.options.setting = "modified";
      expect(scene.options.setting).toBe("value");
    });
  });

  describe("integration tests", () => {
    it("should handle complex scene workflow", () => {
      // Create a scene, modify it
      scene.setActiveLayer(LAYER_BG);
      scene.getActiveLayer().setCell(10, 10, new Cell("█", 1, 0));

      scene.setActiveLayer(LAYER_MID);
      scene.getActiveLayer().setCell(10, 10, new Cell("○", 7, -1));

      // Serialize and restore
      const obj = scene.toObject();
      const restored = Scene.fromObject(obj);

      // Verify restoration
      expect(restored.getLayer(LAYER_BG).getCell(10, 10).ch).toBe("█");
      expect(restored.getLayer(LAYER_MID).getCell(10, 10).ch).toBe("○");
    });

    it("should handle layer visibility toggling", () => {
      scene.getLayer(LAYER_BG).visible = false;
      scene.getLayer(LAYER_FG).visible = false;

      const visible = scene.getVisibleLayers();
      expect(visible.length).toBe(1);
      expect(visible[0].id).toBe(LAYER_MID);
    });

    it("should maintain data integrity after multiple operations", () => {
      // Add layer
      const newLayer = new Layer("extra", "Extra", 80, 25);
      scene.addLayer(newLayer);

      // Set it as active
      scene.setActiveLayer("extra");
      expect(scene.getActiveLayer().id).toBe("extra");

      // Remove original middle layer
      scene.removeLayer(LAYER_MID);
      expect(scene.layers.length).toBe(3);

      // Active layer should still be "extra"
      expect(scene.activeLayerId).toBe("extra");
    });
  });
});
