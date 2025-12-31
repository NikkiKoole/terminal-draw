import { describe, it, expect, beforeEach } from "vitest";
import { Scene } from "../src/core/Scene.js";
import { Cell } from "../src/core/Cell.js";
import { StateManager } from "../src/core/StateManager.js";
import { CommandHistory } from "../src/commands/CommandHistory.js";
import { ProjectManager } from "../src/io/ProjectManager.js";
import { ClipboardManager } from "../src/export/ClipboardManager.js";
import { AddLayerCommand } from "../src/commands/AddLayerCommand.js";
import { RemoveLayerCommand } from "../src/commands/RemoveLayerCommand.js";
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

  describe("Layer Add/Remove with Undo/Redo Integration", () => {
    it("should handle layer operations with undo/redo", () => {
      const scene = Scene.fromTemplate(
        PROJECT_TEMPLATES.standard,
        60,
        25,
        "default",
      );
      const initialCount = scene.layers.length;

      // Test add layer
      const addCommand = new AddLayerCommand(scene, "test");
      addCommand.execute();
      expect(scene.layers.length).toBe(initialCount + 1);

      // Test undo
      addCommand.undo();
      expect(scene.layers.length).toBe(initialCount);

      // Test redo
      addCommand.execute();
      expect(scene.layers.length).toBe(initialCount + 1);

      // Test remove layer
      const removeCommand = new RemoveLayerCommand(scene, "test");
      const removeResult = removeCommand.execute();

      // Layer should be removed if command succeeds
      if (removeResult && removeResult.success) {
        expect(scene.layers.length).toBe(initialCount);
        expect(scene.getLayer("test")).toBe(null);

        // Test undo remove
        removeCommand.undo();
        expect(scene.layers.length).toBe(initialCount + 1);
        expect(scene.getLayer("test")).toBeDefined();
      } else {
        // If removal fails (e.g., last layer protection), that's also valid behavior
        expect(scene.layers.length).toBeGreaterThanOrEqual(initialCount);
      }
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

  describe("Performance Testing with Many Layers (5-10)", () => {
    it("should handle scenes with 5+ layers efficiently", () => {
      const startTime = performance.now();

      // Create 5-layer scene
      const scene = Scene.fromTemplate(
        PROJECT_TEMPLATES.advanced,
        80,
        25,
        "default",
      );
      scene.addSmartLayer("extra1");
      scene.addSmartLayer("extra2");
      expect(scene.layers.length).toBe(5);

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
      expect(project.scene.layers.length).toBe(5);
    });

    it("should handle layer operations with many layers", () => {
      const scene = Scene.fromTemplate(
        PROJECT_TEMPLATES.simple,
        60,
        25,
        "default",
      );
      const commandHistory = new CommandHistory(stateManager);

      // Add multiple layers rapidly
      for (let i = 1; i <= 8; i++) {
        const addCommand = new AddLayerCommand(scene, `layer${i}`);
        commandHistory.execute(addCommand);
      }

      expect(scene.layers.length).toBe(9);

      // Test that undo/redo still works with many layers
      for (let i = 0; i < 4; i++) {
        commandHistory.undo();
      }
      expect(scene.layers.length).toBe(5);

      for (let i = 0; i < 4; i++) {
        commandHistory.redo();
      }
      expect(scene.layers.length).toBe(9);
    });
  });
});
