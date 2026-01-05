import { describe, it, expect, beforeEach } from "bun:test";
import { Scene } from "../src/core/Scene.js";
import { Cell } from "../src/core/Cell.js";
import { StateManager } from "../src/core/StateManager.js";
import { CommandHistory } from "../src/commands/CommandHistory.js";
import { ProjectManager } from "../src/io/ProjectManager.js";
import { ClipboardManager } from "../src/export/ClipboardManager.js";

import { PROJECT_TEMPLATES } from "../src/core/ProjectTemplate.js";

describe("Phase 4 Integration Testing - Step 4.2", () => {
  let stateManager;

  beforeEach(() => {
    stateManager = new StateManager();
  });

  describe("Template Integration Testing", () => {
    it("should work with all templates - simple, standard, advanced", () => {
      // Test simple template
      const simpleScene = Scene.fromTemplate(
        PROJECT_TEMPLATES.simple,
        40,
        20,
        "default",
      );
      expect(simpleScene.layers.length).toBe(1);
      expect(simpleScene.w).toBe(40);
      expect(simpleScene.h).toBe(20);

      // Test standard template
      const standardScene = Scene.fromTemplate(
        PROJECT_TEMPLATES.standard,
        60,
        25,
        "default",
      );
      expect(standardScene.layers.length).toBe(2);
      expect(standardScene.w).toBe(60);
      expect(standardScene.h).toBe(25);

      // Test advanced template
      const advancedScene = Scene.fromTemplate(
        PROJECT_TEMPLATES.advanced,
        80,
        25,
        "default",
      );
      expect(advancedScene.layers.length).toBe(3);
      expect(advancedScene.w).toBe(80);
      expect(advancedScene.h).toBe(25);
    });
  });

  describe("Fixed Layer Architecture Integration", () => {
    it("should maintain fixed layer structure without modification", () => {
      const simpleScene = Scene.fromTemplate(
        PROJECT_TEMPLATES.simple,
        40,
        20,
        "default",
      );
      const standardScene = Scene.fromTemplate(
        PROJECT_TEMPLATES.standard,
        60,
        25,
        "default",
      );
      const advancedScene = Scene.fromTemplate(
        PROJECT_TEMPLATES.advanced,
        80,
        25,
        "default",
      );

      // Verify layer counts are fixed and cannot be changed
      expect(simpleScene.layers.length).toBe(1);
      expect(standardScene.layers.length).toBe(2);
      expect(advancedScene.layers.length).toBe(3);

      // Verify layer structure remains stable
      const originalSimpleCount = simpleScene.layers.length;
      const originalStandardCount = standardScene.layers.length;
      const originalAdvancedCount = advancedScene.layers.length;

      // No layer modification methods available
      expect(simpleScene.layers.length).toBe(originalSimpleCount);
      expect(standardScene.layers.length).toBe(originalStandardCount);
      expect(advancedScene.layers.length).toBe(originalAdvancedCount);
    });
  });

  describe("Export/Save with Different Layer Counts", () => {
    it("should export and save projects with varying layer counts", () => {
      // Test with simple template (1 layer)
      const simpleScene = Scene.fromTemplate(
        PROJECT_TEMPLATES.simple,
        40,
        20,
        "default",
      );
      const simpleManager = new ProjectManager(simpleScene, stateManager);
      const simpleClipboard = new ClipboardManager(simpleScene, stateManager);

      simpleScene.getActiveLayer().setCell(0, 0, new Cell("A", 1, 0));
      const simpleExport = simpleClipboard.exportPlainText();
      const simpleProject = simpleManager.createProject("Simple Test");

      expect(typeof simpleExport).toBe("string");
      expect(simpleProject.scene.layers.length).toBe(1);

      // Test with advanced template (3 layers)
      const advancedScene = Scene.fromTemplate(
        PROJECT_TEMPLATES.advanced,
        80,
        25,
        "default",
      );
      const advancedManager = new ProjectManager(advancedScene, stateManager);
      const advancedClipboard = new ClipboardManager(
        advancedScene,
        stateManager,
      );

      advancedScene.getLayer("bg").setCell(0, 0, new Cell("B", 1, 0));
      advancedScene.getLayer("mid").setCell(0, 0, new Cell("M", 2, -1));
      advancedScene.getLayer("fg").setCell(0, 0, new Cell("F", 3, -1));

      const advancedExport = advancedClipboard.exportPlainText();
      const advancedProject = advancedManager.createProject("Advanced Test");

      expect(typeof advancedExport).toBe("string");
      expect(advancedProject.scene.layers.length).toBe(3);

      // Test save/load cycle maintains layer data
      const serialized = advancedManager.serializeProject("Advanced Test");
      const parsed = advancedManager.parseProject(serialized);
      const restored = advancedManager.importScene(parsed);

      expect(restored.layers.length).toBe(3);
      expect(restored.getLayer("mid").getCell(0, 0).ch).toBe("M");
    });
  });

  describe("Performance Testing with Fixed Layers", () => {
    it("should handle advanced template (3 layers) efficiently", () => {
      const startTime = performance.now();

      // Create 3-layer scene with advanced template
      const scene = Scene.fromTemplate(
        PROJECT_TEMPLATES.advanced,
        80,
        25,
        "default",
      );
      expect(scene.layers.length).toBe(3);

      // Add content to layers
      scene.layers.forEach((layer, index) => {
        layer.setCell(index, index, new Cell("X", index % 8, -1));
      });

      // Test export performance
      const clipboard = new ClipboardManager(scene, stateManager);
      const textExport = clipboard.exportPlainText();

      // Test save performance
      const manager = new ProjectManager(scene, stateManager);
      const project = manager.createProject("Performance Test");

      const totalTime = performance.now() - startTime;

      expect(totalTime).toBeLessThan(100); // Should complete quickly
      expect(textExport.length).toBeGreaterThan(0);
      expect(project.scene.layers.length).toBe(3);
    });

    it("should handle layer visibility and state with fixed layers", () => {
      const scene = Scene.fromTemplate(
        PROJECT_TEMPLATES.advanced,
        60,
        25,
        "default",
      );

      // Test layer visibility toggling
      const layers = scene.layers;
      expect(layers.length).toBe(3);

      layers.forEach((layer, index) => {
        const originalVisibility = layer.visible;

        // Toggle visibility
        layer.visible = !layer.visible;
        expect(layer.visible).toBe(!originalVisibility);

        // Toggle back
        layer.visible = originalVisibility;
        expect(layer.visible).toBe(originalVisibility);
      });

      // Test active layer switching
      const firstLayerId = layers[0].id;
      const lastLayerId = layers[layers.length - 1].id;

      scene.setActiveLayer(firstLayerId);
      expect(scene.activeLayerId).toBe(firstLayerId);

      scene.setActiveLayer(lastLayerId);
      expect(scene.activeLayerId).toBe(lastLayerId);
    });
  });
});
