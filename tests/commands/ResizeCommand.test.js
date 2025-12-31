import { describe, it, expect, beforeEach, vi } from "vitest";
import { ResizeCommand } from "../../src/commands/ResizeCommand.js";
import { Command } from "../../src/commands/Command.js";
import { Cell } from "../../src/core/Cell.js";
import { StateManager } from "../../src/core/StateManager.js";

// Mock Scene class
class MockScene {
  constructor(w = 10, h = 10) {
    this.w = w;
    this.h = h;
    this.layers = [
      new MockLayer("bg", "Background", w, h),
      new MockLayer("mid", "Middle", w, h),
      new MockLayer("fg", "Foreground", w, h),
    ];
  }
}

// Mock Layer class
class MockLayer {
  constructor(id, name, width, height) {
    this.id = id;
    this.name = name;
    this.width = width;
    this.height = height;
    this.visible = true;
    this.locked = false;
    this.ligatures = false;
    this.cells = [];

    // Initialize with empty cells
    for (let i = 0; i < width * height; i++) {
      this.cells.push(new Cell(" ", 0, -1));
    }
  }

  setCell(x, y, cell) {
    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
      const index = y * this.width + x;
      this.cells[index] = new Cell(cell.ch, cell.fg, cell.bg);
    }
  }

  getCell(x, y) {
    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
      const index = y * this.width + x;
      return this.cells[index];
    }
    return new Cell();
  }
}

describe("ResizeCommand", () => {
  let scene;
  let stateManager;
  let resizeOptions;

  beforeEach(() => {
    scene = new MockScene(5, 5);
    stateManager = new StateManager();

    // Add some test content
    scene.layers[0].setCell(0, 0, new Cell("A", 1, -1));
    scene.layers[1].setCell(2, 2, new Cell("B", 2, -1));
    scene.layers[2].setCell(4, 4, new Cell("C", 3, -1));

    resizeOptions = {
      scene: scene,
      newWidth: 8,
      newHeight: 6,
      strategy: "pad",
      stateManager: stateManager,
    };
  });

  describe("constructor", () => {
    it("should create command with valid options", () => {
      const command = new ResizeCommand(resizeOptions);

      expect(command).toBeInstanceOf(Command);
      expect(command.scene).toBe(scene);
      expect(command.newWidth).toBe(8);
      expect(command.newHeight).toBe(6);
      expect(command.strategy).toBe("pad");
      expect(command.oldWidth).toBe(5);
      expect(command.oldHeight).toBe(5);
      expect(command.description).toContain("Resize grid from 5×5 to 8×6");
    });

    it("should throw error for missing scene", () => {
      expect(() => {
        new ResizeCommand({ newWidth: 10, newHeight: 10 });
      }).toThrow("ResizeCommand scene is required");
    });

    it("should throw error for missing dimensions", () => {
      expect(() => {
        new ResizeCommand({ scene: scene, newHeight: 10 });
      }).toThrow("ResizeCommand newWidth and newHeight are required");

      expect(() => {
        new ResizeCommand({ scene: scene, newWidth: 10 });
      }).toThrow("ResizeCommand newWidth and newHeight are required");
    });

    it("should use default strategy when not provided", () => {
      const command = new ResizeCommand({
        scene: scene,
        newWidth: 10,
        newHeight: 10,
      });

      expect(command.strategy).toBe("pad");
    });

    it("should capture initial layer state", () => {
      const command = new ResizeCommand(resizeOptions);

      expect(command.oldLayerData).toBeDefined();
      expect(command.oldLayerData.bg).toBeDefined();
      expect(command.oldLayerData.mid).toBeDefined();
      expect(command.oldLayerData.fg).toBeDefined();

      // Check that cell data is captured
      expect(command.oldLayerData.bg.cells[0].ch).toBe("A");
      expect(command.oldLayerData.mid.cells[12].ch).toBe("B"); // (2,2) at width 5
      expect(command.oldLayerData.fg.cells[24].ch).toBe("C"); // (4,4) at width 5
    });
  });

  describe("execute", () => {
    it("should resize all layers correctly", () => {
      const command = new ResizeCommand(resizeOptions);
      command.execute();

      // Check scene dimensions updated
      expect(scene.w).toBe(8);
      expect(scene.h).toBe(6);

      // Check all layers resized
      scene.layers.forEach((layer) => {
        expect(layer.width).toBe(8);
        expect(layer.height).toBe(6);
        expect(layer.cells).toHaveLength(48);
      });

      // Check content preserved (pad strategy)
      expect(scene.layers[0].getCell(0, 0).ch).toBe("A");
      expect(scene.layers[1].getCell(2, 2).ch).toBe("B");
      expect(scene.layers[2].getCell(4, 4).ch).toBe("C");

      // Check new areas are empty
      expect(scene.layers[0].getCell(7, 5).ch).toBe(" ");
    });

    it("should emit scene:resized event", () => {
      const eventSpy = vi.fn();
      stateManager.on("scene:resized", eventSpy);

      const command = new ResizeCommand(resizeOptions);
      command.execute();

      expect(eventSpy).toHaveBeenCalledWith({
        oldWidth: 5,
        oldHeight: 5,
        newWidth: 8,
        newHeight: 6,
        strategy: "pad",
        resizeResults: expect.any(Array),
      });
    });

    it("should emit scene:changed event", () => {
      const eventSpy = vi.fn();
      stateManager.on("scene:changed", eventSpy);

      const command = new ResizeCommand(resizeOptions);
      command.execute();

      expect(eventSpy).toHaveBeenCalledWith({
        type: "resize",
        scene: scene,
      });
    });

    it("should set executed flag", () => {
      const command = new ResizeCommand(resizeOptions);
      expect(command.executed).toBeFalsy();

      command.execute();
      expect(command.executed).toBe(true);
    });

    it("should capture new layer data after execution", () => {
      const command = new ResizeCommand(resizeOptions);
      command.execute();

      expect(command.newLayerData).toBeDefined();
      expect(command.newLayerData.bg.width).toBe(8);
      expect(command.newLayerData.bg.height).toBe(6);
    });

    it("should throw error for invalid dimensions", () => {
      const invalidOptions = {
        ...resizeOptions,
        newWidth: -1,
        newHeight: 10,
      };

      const command = new ResizeCommand(invalidOptions);
      expect(() => command.execute()).toThrow("Resize validation failed");
    });

    it("should handle different resize strategies", () => {
      // Test crop strategy
      const cropOptions = {
        ...resizeOptions,
        newWidth: 3,
        newHeight: 3,
        strategy: "crop",
      };

      const command = new ResizeCommand(cropOptions);
      command.execute();

      expect(scene.w).toBe(3);
      expect(scene.h).toBe(3);
      expect(scene.layers[0].getCell(0, 0).ch).toBe("A");
      expect(scene.layers[1].getCell(2, 2).ch).toBe("B");
      // C at (4,4) should be lost due to crop
    });

    it("should handle custom fill cell", () => {
      const fillCell = new Cell("#", 5, 2);
      const optionsWithFill = {
        ...resizeOptions,
        fillCell: fillCell,
      };

      const command = new ResizeCommand(optionsWithFill);
      command.execute();

      // New areas should use fill cell
      const newCell = scene.layers[0].getCell(7, 5);
      expect(newCell.ch).toBe("#");
      expect(newCell.fg).toBe(5);
      expect(newCell.bg).toBe(2);
    });
  });

  describe("undo", () => {
    it("should restore original dimensions and content", () => {
      const command = new ResizeCommand(resizeOptions);
      command.execute();

      // Verify resize happened
      expect(scene.w).toBe(8);
      expect(scene.h).toBe(6);

      command.undo();

      // Verify undo restored original state
      expect(scene.w).toBe(5);
      expect(scene.h).toBe(5);

      scene.layers.forEach((layer) => {
        expect(layer.width).toBe(5);
        expect(layer.height).toBe(5);
        expect(layer.cells).toHaveLength(25);
      });

      // Verify content restored
      expect(scene.layers[0].getCell(0, 0).ch).toBe("A");
      expect(scene.layers[1].getCell(2, 2).ch).toBe("B");
      expect(scene.layers[2].getCell(4, 4).ch).toBe("C");
    });

    it("should emit undo events", () => {
      const resizedSpy = vi.fn();
      const changedSpy = vi.fn();
      stateManager.on("scene:resized", resizedSpy);
      stateManager.on("scene:changed", changedSpy);

      const command = new ResizeCommand(resizeOptions);
      command.execute();

      resizedSpy.mockClear();
      changedSpy.mockClear();

      command.undo();

      expect(resizedSpy).toHaveBeenCalledWith({
        oldWidth: 8,
        oldHeight: 6,
        newWidth: 5,
        newHeight: 5,
        strategy: "undo",
        isUndo: true,
      });

      expect(changedSpy).toHaveBeenCalledWith({
        type: "resize_undo",
        scene: scene,
      });
    });

    it("should throw error when no old data available", () => {
      const command = new ResizeCommand(resizeOptions);
      command.oldLayerData = null;

      expect(() => command.undo()).toThrow(
        "No old layer data available for undo",
      );
    });

    it("should restore layer properties correctly", () => {
      // Modify layer properties
      scene.layers[0].visible = false;
      scene.layers[1].locked = true;

      const command = new ResizeCommand(resizeOptions);
      command.execute();

      // Change properties after resize
      scene.layers[0].visible = true;
      scene.layers[1].locked = false;

      command.undo();

      // Properties should be restored
      expect(scene.layers[0].visible).toBe(false);
      expect(scene.layers[1].locked).toBe(true);
    });
  });

  describe("canMerge", () => {
    it("should never merge resize commands", () => {
      const command1 = new ResizeCommand(resizeOptions);
      const command2 = new ResizeCommand({
        ...resizeOptions,
        newWidth: 10,
        newHeight: 10,
      });

      expect(command1.canMerge(command2)).toBe(false);
      expect(command2.canMerge(command1)).toBe(false);
    });
  });

  describe("getMemoryUsage", () => {
    it("should calculate memory usage correctly", () => {
      const command = new ResizeCommand(resizeOptions);
      const usage = command.getMemoryUsage();

      // 3 layers * (5*5 + 8*6) cells * 32 bytes per cell
      const expectedUsage = 3 * (25 + 48) * 32;
      expect(usage).toBe(expectedUsage);
    });
  });

  describe("getDebugInfo", () => {
    it("should return comprehensive debug information", () => {
      const command = new ResizeCommand(resizeOptions);
      const debugInfo = command.getDebugInfo();

      expect(debugInfo).toMatchObject({
        description: expect.stringContaining("Resize grid"),
        timestamp: expect.any(Number),
        age: expect.any(Number),
        oldDimensions: "5×5",
        newDimensions: "8×6",
        strategy: "pad",
        memoryUsage: expect.any(Number),
        executed: false,
        hasOldData: true,
        hasNewData: false,
        layerCount: 3,
      });
    });
  });

  describe("static create method", () => {
    it("should create command with factory method", () => {
      const command = ResizeCommand.create(resizeOptions);

      expect(command).toBeInstanceOf(ResizeCommand);
      expect(command.newWidth).toBe(8);
      expect(command.newHeight).toBe(6);
    });
  });

  describe("static validateResize method", () => {
    it("should validate correct parameters", () => {
      const result = ResizeCommand.validateResize(scene, 10, 8);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject missing scene", () => {
      const result = ResizeCommand.validateResize(null, 10, 8);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Scene is required");
    });

    it("should reject invalid dimensions", () => {
      const result1 = ResizeCommand.validateResize(scene, 0, 8);
      expect(result1.valid).toBe(false);
      expect(result1.errors).toContain("New width must be a positive integer");

      const result2 = ResizeCommand.validateResize(scene, 10, -5);
      expect(result2.valid).toBe(false);
      expect(result2.errors).toContain("New height must be a positive integer");

      const result3 = ResizeCommand.validateResize(scene, "invalid", 8);
      expect(result3.valid).toBe(false);
      expect(result3.errors).toContain("New width must be a positive integer");
    });

    it("should reject same dimensions", () => {
      const result = ResizeCommand.validateResize(scene, 5, 5); // Same as current

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "New dimensions are the same as current dimensions",
      );
    });

    it("should include GridResizer validation errors", () => {
      const result = ResizeCommand.validateResize(scene, 1000, 1000); // Too large

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe("complex scenarios", () => {
    it("should handle multiple resize operations", () => {
      const command1 = new ResizeCommand(resizeOptions); // 5x5 -> 8x6
      command1.execute();

      const command2 = new ResizeCommand({
        scene: scene,
        newWidth: 3,
        newHeight: 4,
        strategy: "crop",
        stateManager: stateManager,
      }); // 8x6 -> 3x4
      command2.execute();

      // Verify final state
      expect(scene.w).toBe(3);
      expect(scene.h).toBe(4);

      // Undo second resize
      command2.undo();
      expect(scene.w).toBe(8);
      expect(scene.h).toBe(6);

      // Undo first resize
      command1.undo();
      expect(scene.w).toBe(5);
      expect(scene.h).toBe(5);
    });

    it("should preserve complex cell data through resize cycles", () => {
      // Set up complex content
      scene.layers[0].setCell(1, 1, new Cell("★", 4, 3));
      scene.layers[1].setCell(3, 2, new Cell("♦", 6, 1));

      const command = new ResizeCommand({
        scene: scene,
        newWidth: 10,
        newHeight: 8,
        strategy: "center",
        stateManager: stateManager,
      });

      command.execute();

      // Content should be offset due to centering
      // Original (1,1) -> (3,2) with offset (2,1)
      // Original (3,2) -> (5,3) with offset (2,1)

      command.undo();

      // Verify original content restored exactly
      expect(scene.layers[0].getCell(1, 1).ch).toBe("★");
      expect(scene.layers[0].getCell(1, 1).fg).toBe(4);
      expect(scene.layers[0].getCell(1, 1).bg).toBe(3);

      expect(scene.layers[1].getCell(3, 2).ch).toBe("♦");
      expect(scene.layers[1].getCell(3, 2).fg).toBe(6);
      expect(scene.layers[1].getCell(3, 2).bg).toBe(1);
    });

    it("should handle edge case dimensions", () => {
      // Resize to 1x1
      const command1 = new ResizeCommand({
        scene: scene,
        newWidth: 1,
        newHeight: 1,
        strategy: "crop",
        stateManager: stateManager,
      });

      command1.execute();

      expect(scene.w).toBe(1);
      expect(scene.h).toBe(1);
      expect(scene.layers[0].cells).toHaveLength(1);

      command1.undo();

      // Should restore to original 5x5
      expect(scene.w).toBe(5);
      expect(scene.h).toBe(5);
      expect(scene.layers[0].getCell(0, 0).ch).toBe("A");
    });

    it("should handle resize with no stateManager", () => {
      const optionsNoState = {
        scene: scene,
        newWidth: 7,
        newHeight: 7,
        strategy: "pad",
      };

      const command = new ResizeCommand(optionsNoState);

      expect(() => command.execute()).not.toThrow();
      expect(scene.w).toBe(7);
      expect(scene.h).toBe(7);

      expect(() => command.undo()).not.toThrow();
      expect(scene.w).toBe(5);
      expect(scene.h).toBe(5);
    });
  });

  describe("error handling", () => {
    it("should handle execute errors gracefully", () => {
      // Create command with invalid dimensions to trigger validation error
      const invalidOptions = {
        scene: scene,
        newWidth: 1000,
        newHeight: 1000,
        strategy: "pad",
        stateManager: stateManager,
      };

      const command = new ResizeCommand(invalidOptions);

      expect(() => command.execute()).toThrow("Failed to execute resize");
    });

    it("should handle undo errors gracefully", () => {
      const command = new ResizeCommand(resizeOptions);
      command.execute();

      // Corrupt old data to trigger undo error
      command.oldLayerData = null;

      expect(() => command.undo()).toThrow("Failed to undo resize");
    });
  });
});
