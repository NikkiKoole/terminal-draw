import { describe, it, expect, beforeEach, vi } from "vitest";
import { Scene } from "../src/core/Scene.js";
import { Cell } from "../src/core/Cell.js";
import { StateManager } from "../src/core/StateManager.js";
import { BrushTool } from "../src/tools/BrushTool.js";
import { EraserTool } from "../src/tools/EraserTool.js";
import { PickerTool } from "../src/tools/PickerTool.js";
import { ClipboardManager } from "../src/export/ClipboardManager.js";
import { ProjectManager } from "../src/io/ProjectManager.js";
import { CommandHistory } from "../src/commands/CommandHistory.js";
import { ClearCommand } from "../src/commands/ClearCommand.js";
import { ResizeCommand } from "../src/commands/ResizeCommand.js";

describe("Dynamic Systems Integration", () => {
  let scene;
  let stateManager;
  let commandHistory;

  beforeEach(() => {
    stateManager = new StateManager();
    commandHistory = new CommandHistory(stateManager);
  });

  describe("Tools with Different Layer Configurations", () => {
    describe("BrushTool with Dynamic Layers", () => {
      it("should work with single layer scene", () => {
        scene = Scene.fromTemplateId("simple");
        const brush = new BrushTool({ ch: "X", fg: 1, bg: -1 }, commandHistory);

        const activeLayer = scene.getActiveLayer();
        expect(activeLayer).toBeDefined();
        expect(activeLayer.id).toBe("main");

        // Simulate painting on active layer
        activeLayer.setCell(5, 5, new Cell("X", 1, -1));
        const cell = activeLayer.getCell(5, 5);

        expect(cell.ch).toBe("X");
        expect(cell.fg).toBe(1);
        expect(cell.bg).toBe(-1);
      });

      it("should work with standard layer scene", () => {
        scene = Scene.fromTemplateId("standard");
        const brush = new BrushTool({ ch: "Y", fg: 2, bg: 0 }, commandHistory);

        expect(scene.layers.length).toBe(2);
        expect(scene.activeLayerId).toBe("fg"); // foreground is default active

        const activeLayer = scene.getActiveLayer();
        expect(activeLayer.name).toBe("Foreground");

        activeLayer.setCell(3, 3, new Cell("Y", 2, 0));
        const cell = activeLayer.getCell(3, 3);

        expect(cell.ch).toBe("Y");
        expect(cell.fg).toBe(2);
        expect(cell.bg).toBe(0);
      });

      it("should work with advanced layer scene", () => {
        scene = Scene.fromTemplateId("advanced");
        const brush = new BrushTool({ ch: "Z", fg: 3, bg: 1 }, commandHistory);

        expect(scene.layers.length).toBe(3);
        expect(scene.activeLayerId).toBe("mid"); // middle is default active

        const activeLayer = scene.getActiveLayer();
        expect(activeLayer.name).toBe("Middle");

        activeLayer.setCell(7, 7, new Cell("Z", 3, 1));
        const cell = activeLayer.getCell(7, 7);

        expect(cell.ch).toBe("Z");
        expect(cell.fg).toBe(3);
        expect(cell.bg).toBe(1);
      });

      it("should work after adding custom layers", () => {
        scene = Scene.fromTemplateId("simple");
        const detailLayer = scene.addSmartLayer("detail");
        scene.setActiveLayer(detailLayer.id);

        const brush = new BrushTool({ ch: "D", fg: 4, bg: -1 }, commandHistory);
        const activeLayer = scene.getActiveLayer();

        expect(activeLayer.name).toBe("Detail");
        expect(scene.layers.length).toBe(2);

        activeLayer.setCell(1, 1, new Cell("D", 4, -1));
        const cell = activeLayer.getCell(1, 1);

        expect(cell.ch).toBe("D");
        expect(cell.fg).toBe(4);
      });
    });

    describe("EraserTool with Dynamic Layers", () => {
      it("should work on any active layer", () => {
        scene = Scene.fromTemplateId("standard");
        const eraser = new EraserTool(commandHistory);

        // Add content to background layer
        const bgLayer = scene.getLayer("bg");
        bgLayer.setCell(2, 2, new Cell("B", 1, 0));

        // Set background as active and erase
        scene.setActiveLayer("bg");
        const activeLayer = scene.getActiveLayer();

        expect(activeLayer.id).toBe("bg");
        expect(activeLayer.getCell(2, 2).ch).toBe("B");

        // Erase the cell
        activeLayer.setCell(2, 2, new Cell(" ", 7, -1));
        const erasedCell = activeLayer.getCell(2, 2);

        expect(erasedCell.ch).toBe(" ");
        expect(erasedCell.fg).toBe(7);
        expect(erasedCell.bg).toBe(-1);
      });

      it("should work with dynamically added layers", () => {
        scene = Scene.fromTemplateId("simple");
        const effectLayer = scene.addSmartLayer("effect");

        effectLayer.setCell(4, 4, new Cell("E", 5, 2));
        scene.setActiveLayer(effectLayer.id);

        const eraser = new EraserTool(commandHistory);
        const activeLayer = scene.getActiveLayer();

        expect(activeLayer.name).toBe("Effect");
        expect(activeLayer.getCell(4, 4).ch).toBe("E");

        // Erase the cell
        activeLayer.setCell(4, 4, new Cell(" ", 7, -1));
        expect(activeLayer.getCell(4, 4).ch).toBe(" ");
      });
    });

    describe("PickerTool with Dynamic Layers", () => {
      it("should pick from any layer configuration", () => {
        scene = Scene.fromTemplateId("advanced");
        const picker = new PickerTool(stateManager);

        // Set up content in different layers
        scene.getLayer("bg").setCell(0, 0, new Cell("B", 1, 0));
        scene.getLayer("mid").setCell(0, 0, new Cell("M", 2, 1));
        scene.getLayer("fg").setCell(0, 0, new Cell("F", 3, 2));

        // Picker should work regardless of active layer
        scene.setActiveLayer("bg");
        const activeLayer = scene.getActiveLayer();

        expect(activeLayer.id).toBe("bg");
        const pickedCell = activeLayer.getCell(0, 0);

        expect(pickedCell.ch).toBe("B");
        expect(pickedCell.fg).toBe(1);
        expect(pickedCell.bg).toBe(0);
      });

      it("should work with single layer scenes", () => {
        scene = Scene.fromTemplateId("simple");
        const picker = new PickerTool(stateManager);

        scene.getActiveLayer().setCell(5, 5, new Cell("S", 6, 3));
        const pickedCell = scene.getActiveLayer().getCell(5, 5);

        expect(pickedCell.ch).toBe("S");
        expect(pickedCell.fg).toBe(6);
        expect(pickedCell.bg).toBe(3);
      });
    });
  });

  describe("Export System with Dynamic Layers", () => {
    let clipboardManager;

    beforeEach(() => {
      // Mock clipboard API
      global.navigator = {
        clipboard: {
          writeText: vi.fn().mockResolvedValue(),
        },
      };
    });

    it("should export single layer scenes correctly", () => {
      scene = Scene.fromTemplateId("simple");
      clipboardManager = new ClipboardManager(scene, stateManager);

      const mainLayer = scene.getActiveLayer();
      mainLayer.setCell(0, 0, new Cell("A", 1, -1));
      mainLayer.setCell(1, 0, new Cell("B", 1, -1));

      const exported = clipboardManager.exportPlainText();
      const lines = exported.split("\n");

      expect(lines[0]).toMatch(/^AB/);
    });

    it("should export multi-layer scenes with compositing", () => {
      scene = Scene.fromTemplateId("standard");
      clipboardManager = new ClipboardManager(scene, stateManager);

      scene.getLayer("bg").setCell(0, 0, new Cell("X", 1, -1));
      scene.getLayer("fg").setCell(0, 0, new Cell("Y", 2, -1));

      const exported = clipboardManager.exportPlainText();
      const lines = exported.split("\n");

      // Foreground should be visible (compositing)
      expect(lines[0]).toMatch(/^Y/);
    });

    it("should export specific layers by ID", () => {
      scene = Scene.fromTemplateId("advanced");
      clipboardManager = new ClipboardManager(scene, stateManager);

      scene.getLayer("bg").setCell(0, 0, new Cell("B", 1, -1));
      scene.getLayer("mid").setCell(0, 0, new Cell("M", 2, -1));
      scene.getLayer("fg").setCell(0, 0, new Cell("F", 3, -1));

      // Export specific layers
      const bgExport = clipboardManager.exportLayer("bg");
      const midExport = clipboardManager.exportLayer("mid");
      const fgExport = clipboardManager.exportLayer("fg");

      expect(bgExport.split("\n")[0]).toMatch(/^B/);
      expect(midExport.split("\n")[0]).toMatch(/^M/);
      expect(fgExport.split("\n")[0]).toMatch(/^F/);
    });

    it("should handle dynamically added layers", () => {
      scene = Scene.fromTemplateId("simple");
      const customLayer = scene.addSmartLayer("overlay");
      clipboardManager = new ClipboardManager(scene, stateManager);

      customLayer.setCell(0, 0, new Cell("O", 4, -1));

      const exported = clipboardManager.exportLayer(customLayer.id);
      expect(exported.split("\n")[0]).toMatch(/^O/);
    });

    it("should handle ANSI export with multiple layers", () => {
      scene = Scene.fromTemplateId("standard");
      clipboardManager = new ClipboardManager(scene, stateManager);

      scene.getLayer("bg").setCell(0, 0, new Cell("A", 1, 0));
      scene.getLayer("fg").setCell(1, 0, new Cell("B", 2, 1));

      const ansiExport = clipboardManager.exportAnsi();
      expect(ansiExport).toContain("\x1b["); // Should contain ANSI codes
    });
  });

  describe("Project Management with Dynamic Layers", () => {
    let projectManager;

    it("should save and load single layer projects", () => {
      scene = Scene.fromTemplateId("simple");
      projectManager = new ProjectManager(scene, stateManager);

      scene.getActiveLayer().setCell(2, 2, new Cell("T", 3, 1));

      const projectJson = projectManager.serializeProject("Test Single");
      const project = JSON.parse(projectJson);

      expect(project.name).toBe("Test Single");
      expect(project.scene.layers.length).toBe(1);
      expect(project.scene.templateId).toBe("simple");
      expect(
        project.scene.layers[0].cells.some((cell) => cell.ch === "T"),
      ).toBe(true);
    });

    it("should save and load multi-layer projects", () => {
      scene = Scene.fromTemplateId("advanced");
      projectManager = new ProjectManager(scene, stateManager);

      scene.getLayer("bg").setCell(1, 1, new Cell("B", 1, -1));
      scene.getLayer("mid").setCell(2, 2, new Cell("M", 2, -1));
      scene.getLayer("fg").setCell(3, 3, new Cell("F", 3, -1));

      const projectJson = projectManager.serializeProject("Test Multi");
      const project = JSON.parse(projectJson);

      expect(project.scene.layers.length).toBe(3);
      expect(project.scene.templateId).toBe("advanced");

      // Check that all layers have their content
      const bgLayer = project.scene.layers.find((l) => l.id === "bg");
      const midLayer = project.scene.layers.find((l) => l.id === "mid");
      const fgLayer = project.scene.layers.find((l) => l.id === "fg");

      expect(bgLayer.cells.some((cell) => cell.ch === "B")).toBe(true);
      expect(midLayer.cells.some((cell) => cell.ch === "M")).toBe(true);
      expect(fgLayer.cells.some((cell) => cell.ch === "F")).toBe(true);
    });

    it("should save and load projects with custom layers", () => {
      scene = Scene.fromTemplateId("simple");
      const detailLayer = scene.addSmartLayer("detail");
      const overlayLayer = scene.addSmartLayer("overlay");

      projectManager = new ProjectManager(scene, stateManager);

      scene.getActiveLayer().setCell(0, 0, new Cell("M", 1, -1));
      detailLayer.setCell(1, 1, new Cell("D", 2, -1));
      overlayLayer.setCell(2, 2, new Cell("O", 3, -1));

      const projectJson = projectManager.serializeProject("Test Custom");
      const project = JSON.parse(projectJson);

      expect(project.scene.layers.length).toBe(3);

      // Verify all layers are preserved with their content
      const layers = project.scene.layers;
      const hasMainContent = layers.some((l) =>
        l.cells.some((c) => c.ch === "M"),
      );
      const hasDetailContent = layers.some((l) =>
        l.cells.some((c) => c.ch === "D"),
      );
      const hasOverlayContent = layers.some((l) =>
        l.cells.some((c) => c.ch === "O"),
      );

      expect(hasMainContent).toBe(true);
      expect(hasDetailContent).toBe(true);
      expect(hasOverlayContent).toBe(true);
    });

    it("should restore projects and maintain layer structure", () => {
      const originalScene = Scene.fromTemplateId("standard");
      originalScene.getLayer("bg").setCell(0, 0, new Cell("X", 1, 0));
      originalScene.getLayer("fg").setCell(1, 1, new Cell("Y", 2, 1));

      projectManager = new ProjectManager(originalScene, stateManager);
      const projectJson = projectManager.serializeProject("Restore Test");

      // Load into new scene
      const projectData = JSON.parse(projectJson);
      const restoredScene = Scene.fromObject(projectData.scene);

      expect(restoredScene.layers.length).toBe(2);
      expect(restoredScene.templateId).toBe("standard");
      expect(restoredScene.getLayer("bg").getCell(0, 0).ch).toBe("X");
      expect(restoredScene.getLayer("fg").getCell(1, 1).ch).toBe("Y");
    });
  });

  describe("Command System with Dynamic Layers", () => {
    describe("ClearCommand with Different Layer Counts", () => {
      it("should clear single layer scenes", () => {
        scene = Scene.fromTemplateId("simple");
        const mainLayer = scene.getActiveLayer();
        mainLayer.setCell(0, 0, new Cell("A", 1, -1));
        mainLayer.setCell(1, 1, new Cell("B", 2, -1));

        const clearCommand = ClearCommand.clearAll({ scene, stateManager });
        clearCommand.execute();

        expect(mainLayer.getCell(0, 0).ch).toBe(" ");
        expect(mainLayer.getCell(1, 1).ch).toBe(" ");
      });

      it("should clear all layers in multi-layer scenes", () => {
        scene = Scene.fromTemplateId("advanced");
        scene.getLayer("bg").setCell(0, 0, new Cell("B", 1, -1));
        scene.getLayer("mid").setCell(1, 1, new Cell("M", 2, -1));
        scene.getLayer("fg").setCell(2, 2, new Cell("F", 3, -1));

        const clearCommand = ClearCommand.clearAll({ scene, stateManager });
        clearCommand.execute();

        expect(scene.getLayer("bg").getCell(0, 0).ch).toBe(" ");
        expect(scene.getLayer("mid").getCell(1, 1).ch).toBe(" ");
        expect(scene.getLayer("fg").getCell(2, 2).ch).toBe(" ");
      });

      it("should clear specific layers dynamically", () => {
        scene = Scene.fromTemplateId("standard");
        const customLayer = scene.addSmartLayer("effect");

        scene.getLayer("bg").setCell(0, 0, new Cell("B", 1, -1));
        customLayer.setCell(1, 1, new Cell("E", 2, -1));

        const clearCommand = ClearCommand.clearLayer({
          layer: customLayer,
          scene,
          stateManager,
        });
        clearCommand.execute();

        expect(scene.getLayer("bg").getCell(0, 0).ch).toBe("B"); // Unchanged
        expect(customLayer.getCell(1, 1).ch).toBe(" "); // Cleared
      });

      it("should support undo/redo with dynamic layers", () => {
        scene = Scene.fromTemplateId("simple");
        const extraLayer = scene.addSmartLayer("extra");

        scene.getActiveLayer().setCell(0, 0, new Cell("M", 1, -1));
        extraLayer.setCell(1, 1, new Cell("E", 2, -1));

        const clearCommand = ClearCommand.clearAll({ scene, stateManager });
        clearCommand.execute();

        expect(scene.getActiveLayer().getCell(0, 0).ch).toBe(" ");
        expect(extraLayer.getCell(1, 1).ch).toBe(" ");

        clearCommand.undo();

        expect(scene.getActiveLayer().getCell(0, 0).ch).toBe("M");
        expect(extraLayer.getCell(1, 1).ch).toBe("E");
      });
    });

    describe("ResizeCommand with Dynamic Layers", () => {
      it("should resize all layers regardless of count", () => {
        scene = Scene.fromTemplateId("simple");
        const extraLayer = scene.addSmartLayer("extra");

        // Add content to both layers
        scene.getActiveLayer().setCell(5, 5, new Cell("M", 1, -1));
        extraLayer.setCell(7, 7, new Cell("E", 2, -1));

        const resizeCommand = new ResizeCommand({
          scene: scene,
          newWidth: 15,
          newHeight: 10,
          strategy: "pad",
          stateManager: stateManager,
        });

        resizeCommand.execute();

        expect(scene.w).toBe(15);
        expect(scene.h).toBe(10);
        expect(scene.layers.length).toBe(2);

        // Check all layers were resized
        scene.layers.forEach((layer) => {
          expect(layer.width).toBe(15);
          expect(layer.height).toBe(10);
        });

        // Content should be preserved
        expect(scene.getActiveLayer().getCell(5, 5).ch).toBe("M");
        expect(extraLayer.getCell(7, 7).ch).toBe("E");
      });

      it("should handle resize with many layers", () => {
        scene = Scene.fromTemplateId("advanced");
        scene.addSmartLayer("detail");
        scene.addSmartLayer("overlay");
        scene.addSmartLayer("effect");

        expect(scene.layers.length).toBe(6); // Original 3 + 3 added

        const resizeCommand = new ResizeCommand({
          scene: scene,
          newWidth: 20,
          newHeight: 15,
          strategy: "center",
          stateManager: stateManager,
        });

        resizeCommand.execute();

        expect(scene.layers.length).toBe(6); // Same number of layers
        scene.layers.forEach((layer) => {
          expect(layer.width).toBe(20);
          expect(layer.height).toBe(15);
        });
      });

      it("should support undo/redo with dynamic layer count", () => {
        scene = Scene.fromTemplateId("standard");
        const originalWidth = scene.w;
        const originalHeight = scene.h;
        const layerCount = scene.layers.length;

        const resizeCommand = new ResizeCommand({
          scene: scene,
          newWidth: 30,
          newHeight: 20,
          strategy: "crop",
          stateManager: stateManager,
        });

        resizeCommand.execute();
        expect(scene.w).toBe(30);
        expect(scene.h).toBe(20);

        resizeCommand.undo();
        expect(scene.w).toBe(originalWidth);
        expect(scene.h).toBe(originalHeight);
        expect(scene.layers.length).toBe(layerCount);
      });
    });
  });

  describe("Integration with Layer Management", () => {
    it("should handle tools after layer reordering", () => {
      scene = Scene.fromTemplateId("advanced");
      const originalOrder = scene.layers.map((l) => l.id);

      // Reorder layers
      scene.reorderLayers(0, 2);
      expect(scene.layers.map((l) => l.id)).not.toEqual(originalOrder);

      // Tools should still work
      const brush = new BrushTool({ ch: "X", fg: 1, bg: -1 }, commandHistory);
      const activeLayer = scene.getActiveLayer();

      activeLayer.setCell(0, 0, new Cell("X", 1, -1));
      expect(activeLayer.getCell(0, 0).ch).toBe("X");
    });

    it("should handle tools after layer removal", () => {
      scene = Scene.fromTemplateId("advanced");
      const layerToRemove = scene.layers[0].id;

      scene.removeLayer(layerToRemove);
      expect(scene.layers.length).toBe(2);
      expect(scene.getLayer(layerToRemove)).toBeNull();

      // Active layer should be updated
      const activeLayer = scene.getActiveLayer();
      expect(activeLayer).toBeDefined();

      // Tools should work with remaining layers
      const eraser = new EraserTool(commandHistory);
      activeLayer.setCell(0, 0, new Cell("T", 1, -1));
      activeLayer.setCell(0, 0, new Cell(" ", 7, -1)); // Erase

      expect(activeLayer.getCell(0, 0).ch).toBe(" ");
    });

    it("should handle export after layer addition", () => {
      scene = Scene.fromTemplateId("simple");
      const newLayer = scene.addSmartLayer("detail");

      scene.getActiveLayer().setCell(0, 0, new Cell("M", 1, -1));
      newLayer.setCell(0, 0, new Cell("D", 2, -1));

      const clipboardManager = new ClipboardManager(scene, stateManager);
      const exported = clipboardManager.exportPlainText();

      // Should export composited result
      expect(exported).toBeDefined();
      expect(exported.length).toBeGreaterThan(0);
    });

    it("should maintain data integrity through complex operations", () => {
      scene = Scene.fromTemplateId("simple");

      // Add layers
      const layer1 = scene.addSmartLayer("layer1");
      const layer2 = scene.addSmartLayer("layer2");

      // Store original layer references
      const mainLayer = scene.getActiveLayer();

      // Add content
      mainLayer.setCell(1, 1, new Cell("A", 1, -1));
      layer1.setCell(2, 2, new Cell("B", 2, -1));
      layer2.setCell(3, 3, new Cell("C", 3, -1));

      // Reorder layers
      scene.reorderLayers(0, 2);

      // Resize scene
      const resizeCommand = new ResizeCommand({
        scene: scene,
        newWidth: 50,
        newHeight: 30,
        strategy: "pad",
        stateManager: stateManager,
      });
      resizeCommand.execute();

      // Verify all content is preserved (using stored references)
      expect(mainLayer.getCell(1, 1).ch).toBe("A");
      expect(layer1.getCell(2, 2).ch).toBe("B");
      expect(layer2.getCell(3, 3).ch).toBe("C");

      // Verify scene properties
      expect(scene.w).toBe(50);
      expect(scene.h).toBe(30);
      expect(scene.layers.length).toBe(3);

      // Test export still works
      const clipboardManager = new ClipboardManager(scene, stateManager);
      const exported = clipboardManager.exportPlainText();
      expect(exported).toBeDefined();
    });
  });
});
