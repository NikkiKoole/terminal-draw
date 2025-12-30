import { describe, it, expect, beforeEach, vi } from "vitest";
import { ClipboardManager } from "../src/export/ClipboardManager.js";
import { Scene } from "../src/core/Scene.js";
import { Cell } from "../src/core/Cell.js";
import { StateManager } from "../src/core/StateManager.js";

describe("ClipboardManager", () => {
  let scene;
  let stateManager;
  let clipboardManager;

  beforeEach(() => {
    scene = new Scene(10, 5, "default");
    stateManager = new StateManager();
    clipboardManager = new ClipboardManager(scene, stateManager);

    // Mock navigator.clipboard
    global.navigator = {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    };
  });

  describe("constructor", () => {
    it("should create a clipboard manager with scene and state manager", () => {
      expect(clipboardManager.scene).toBe(scene);
      expect(clipboardManager.stateManager).toBe(stateManager);
    });
  });

  describe("exportPlainText", () => {
    it("should export empty scene as spaces and newlines", () => {
      const text = clipboardManager.exportPlainText();
      const lines = text.split("\n");

      expect(lines.length).toBe(5);
      expect(lines[0].length).toBe(10);
      expect(text).toMatch(/^\s+$/); // All whitespace
    });

    it("should export scene with content", () => {
      const layer = scene.getLayer("mid");
      layer.setCell(0, 0, new Cell("H", 7, -1));
      layer.setCell(1, 0, new Cell("I", 7, -1));

      const text = clipboardManager.exportPlainText();
      const lines = text.split("\n");

      expect(lines[0]).toMatch(/^HI\s+/);
    });

    it("should composite multiple visible layers", () => {
      const bg = scene.getLayer("bg");
      const mid = scene.getLayer("mid");
      const fg = scene.getLayer("fg");

      bg.setCell(0, 0, new Cell("A", 0, 0));
      mid.setCell(1, 0, new Cell("B", 1, 1));
      fg.setCell(2, 0, new Cell("C", 2, 2));

      const text = clipboardManager.exportPlainText();
      const lines = text.split("\n");

      expect(lines[0].substring(0, 3)).toBe("ABC");
    });

    it("should skip invisible layers", () => {
      const mid = scene.getLayer("mid");
      const fg = scene.getLayer("fg");

      mid.setCell(0, 0, new Cell("X", 7, -1));
      fg.setCell(0, 0, new Cell("Y", 7, -1));

      // Hide foreground layer
      fg.visible = false;

      const text = clipboardManager.exportPlainText();
      const lines = text.split("\n");

      // Should see 'X' from mid layer, not 'Y' from hidden fg
      expect(lines[0][0]).toBe("X");
    });
  });

  describe("exportAnsi", () => {
    it("should export scene with ANSI color codes", () => {
      const layer = scene.getLayer("mid");
      layer.setCell(0, 0, new Cell("A", 1, 0)); // Red on black

      const text = clipboardManager.exportAnsi();

      // Should contain ANSI escape codes
      expect(text).toContain("\x1b[");
      expect(text).toContain("A");
    });

    it("should include reset codes at end of lines", () => {
      const layer = scene.getLayer("mid");
      layer.setCell(0, 0, new Cell("X", 7, -1));

      const text = clipboardManager.exportAnsi();
      const lines = text.split("\n");

      // Each line should end with reset code
      lines.forEach((line) => {
        expect(line).toContain("\x1b[0m");
      });
    });

    it("should composite visible layers with colors", () => {
      const bg = scene.getLayer("bg");
      const fg = scene.getLayer("fg");

      bg.setCell(0, 0, new Cell("A", 1, 0));
      fg.setCell(1, 0, new Cell("B", 2, 3));

      const text = clipboardManager.exportAnsi();

      expect(text).toContain("A");
      expect(text).toContain("B");
      expect(text).toContain("\x1b[");
    });
  });

  describe("exportLayer", () => {
    it("should export single layer as plain text", () => {
      const layer = scene.getLayer("mid");
      layer.setCell(0, 0, new Cell("H", 7, -1));
      layer.setCell(1, 0, new Cell("I", 7, -1));

      const text = clipboardManager.exportLayer("mid");
      const lines = text.split("\n");

      expect(lines.length).toBe(5);
      expect(lines[0].substring(0, 2)).toBe("HI");
    });

    it("should throw error for invalid layer ID", () => {
      expect(() => {
        clipboardManager.exportLayer("invalid");
      }).toThrow("Layer not found: invalid");
    });

    it("should export only specified layer, ignoring others", () => {
      const bg = scene.getLayer("bg");
      const mid = scene.getLayer("mid");
      const fg = scene.getLayer("fg");

      bg.setCell(0, 0, new Cell("A", 7, -1));
      mid.setCell(0, 0, new Cell("B", 7, -1));
      fg.setCell(0, 0, new Cell("C", 7, -1));

      const text = clipboardManager.exportLayer("mid");

      // Should only see 'B' from mid layer
      expect(text).toContain("B");
    });

    it("should export layer even if it's hidden", () => {
      const layer = scene.getLayer("fg");
      layer.visible = false;
      layer.setCell(0, 0, new Cell("X", 7, -1));

      const text = clipboardManager.exportLayer("fg");

      // Should still export hidden layer when explicitly requested
      expect(text).toContain("X");
    });
  });

  describe("copyToClipboard", () => {
    it("should copy text to clipboard successfully", async () => {
      const text = "Hello World";
      const result = await clipboardManager.copyToClipboard(text);

      expect(result.success).toBe(true);
      expect(result.charCount).toBe(11);
      expect(result.lineCount).toBe(1);
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(text);
    });

    it("should emit export:success event on success", async () => {
      const emitSpy = vi.fn();
      stateManager.on("export:success", emitSpy);

      await clipboardManager.copyToClipboard("test");

      expect(emitSpy).toHaveBeenCalledWith({
        format: "text",
        charCount: 4,
        lineCount: 1,
      });
    });

    it("should handle clipboard API errors", async () => {
      navigator.clipboard.writeText = vi
        .fn()
        .mockRejectedValue(new Error("Permission denied"));

      const result = await clipboardManager.copyToClipboard("test");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Permission denied");
    });

    it("should emit export:error event on failure", async () => {
      const emitSpy = vi.fn();
      stateManager.on("export:error", emitSpy);

      navigator.clipboard.writeText = vi
        .fn()
        .mockRejectedValue(new Error("Failed"));

      await clipboardManager.copyToClipboard("test");

      expect(emitSpy).toHaveBeenCalledWith({
        error: "Failed",
      });
    });

    it("should handle missing clipboard API", async () => {
      global.navigator.clipboard = undefined;

      const result = await clipboardManager.copyToClipboard("test");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Clipboard API not available");
    });

    it("should count newlines correctly", async () => {
      const text = "Line 1\nLine 2\nLine 3";
      const result = await clipboardManager.copyToClipboard(text);

      expect(result.lineCount).toBe(3);
    });
  });

  describe("copyPlainText", () => {
    it("should export and copy plain text", async () => {
      const layer = scene.getLayer("mid");
      layer.setCell(0, 0, new Cell("A", 7, -1));

      const result = await clipboardManager.copyPlainText();

      expect(result.success).toBe(true);
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });

    it("should return statistics", async () => {
      const layer = scene.getLayer("mid");
      layer.setCell(0, 0, new Cell("X", 7, -1));

      const result = await clipboardManager.copyPlainText();

      expect(result.charCount).toBeGreaterThan(0);
      expect(result.lineCount).toBe(5); // Scene height
    });
  });

  describe("copyAnsi", () => {
    it("should export and copy ANSI text", async () => {
      const layer = scene.getLayer("mid");
      layer.setCell(0, 0, new Cell("A", 1, 0));

      const result = await clipboardManager.copyAnsi();

      expect(result.success).toBe(true);
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });

    it("should emit export:success with ANSI format", async () => {
      const emitSpy = vi.fn();
      stateManager.on("export:success", emitSpy);

      await clipboardManager.copyAnsi();

      // Should be called twice: once in copyToClipboard, once in copyAnsi
      expect(emitSpy).toHaveBeenCalled();
      const calls = emitSpy.mock.calls;
      const ansiCall = calls.find((call) => call[0].format === "ansi");
      expect(ansiCall).toBeDefined();
    });
  });

  describe("copyLayerText", () => {
    it("should export and copy single layer", async () => {
      const layer = scene.getLayer("fg");
      layer.setCell(0, 0, new Cell("Z", 7, -1));

      const result = await clipboardManager.copyLayerText("fg");

      expect(result.success).toBe(true);
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });

    it("should emit export:success with layer format", async () => {
      const emitSpy = vi.fn();
      stateManager.on("export:success", emitSpy);

      await clipboardManager.copyLayerText("mid");

      expect(emitSpy).toHaveBeenCalled();
      const lastCall = emitSpy.mock.calls[emitSpy.mock.calls.length - 1][0];
      expect(lastCall.format).toBe("layer");
      expect(lastCall.layerId).toBe("mid");
    });

    it("should handle invalid layer ID", async () => {
      const result = await clipboardManager.copyLayerText("invalid");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Layer not found");
    });

    it("should emit export:error on invalid layer", async () => {
      const emitSpy = vi.fn();
      stateManager.on("export:error", emitSpy);

      await clipboardManager.copyLayerText("invalid");

      expect(emitSpy).toHaveBeenCalledWith({
        error: "Layer not found: invalid",
      });
    });
  });

  describe("getExportStats", () => {
    it("should return statistics about the scene", () => {
      const stats = clipboardManager.getExportStats();

      expect(stats).toHaveProperty("plainTextSize");
      expect(stats).toHaveProperty("ansiTextSize");
      expect(stats).toHaveProperty("lineCount");
      expect(stats).toHaveProperty("visibleLayerCount");
      expect(stats).toHaveProperty("totalLayerCount");
      expect(stats).toHaveProperty("dimensions");
    });

    it("should report correct dimensions", () => {
      const stats = clipboardManager.getExportStats();

      expect(stats.dimensions.width).toBe(10);
      expect(stats.dimensions.height).toBe(5);
    });

    it("should count visible layers correctly", () => {
      scene.getLayer("fg").visible = false;

      const stats = clipboardManager.getExportStats();

      expect(stats.visibleLayerCount).toBe(2);
      expect(stats.totalLayerCount).toBe(3);
    });

    it("should report line count equal to scene height", () => {
      const stats = clipboardManager.getExportStats();

      expect(stats.lineCount).toBe(5);
    });

    it("should show ANSI text is larger than plain text", () => {
      const layer = scene.getLayer("mid");
      layer.setCell(0, 0, new Cell("A", 1, 0));

      const stats = clipboardManager.getExportStats();

      // ANSI includes escape codes, so it's larger
      expect(stats.ansiTextSize).toBeGreaterThan(stats.plainTextSize);
    });
  });

  describe("integration", () => {
    it("should handle complete export workflow", async () => {
      // Create some artwork
      const mid = scene.getLayer("mid");
      mid.setCell(0, 0, new Cell("H", 7, -1));
      mid.setCell(1, 0, new Cell("I", 7, -1));

      // Get stats
      const stats = clipboardManager.getExportStats();
      expect(stats.plainTextSize).toBeGreaterThan(0);

      // Copy plain text
      const plainResult = await clipboardManager.copyPlainText();
      expect(plainResult.success).toBe(true);

      // Copy ANSI
      const ansiResult = await clipboardManager.copyAnsi();
      expect(ansiResult.success).toBe(true);

      // Copy single layer
      const layerResult = await clipboardManager.copyLayerText("mid");
      expect(layerResult.success).toBe(true);
    });

    it("should handle layer visibility changes", async () => {
      const fg = scene.getLayer("fg");
      const mid = scene.getLayer("mid");

      fg.setCell(0, 0, new Cell("A", 7, -1));
      mid.setCell(0, 0, new Cell("B", 7, -1));

      // With fg visible, should see 'A'
      let text = clipboardManager.exportPlainText();
      expect(text.charAt(0)).toBe("A");

      // Hide fg layer
      fg.visible = false;

      // Now should see 'B'
      text = clipboardManager.exportPlainText();
      expect(text.charAt(0)).toBe("B");
    });

    it("should emit events for all export operations", async () => {
      const successSpy = vi.fn();
      stateManager.on("export:success", successSpy);

      await clipboardManager.copyPlainText();
      await clipboardManager.copyAnsi();
      await clipboardManager.copyLayerText("mid");

      expect(successSpy).toHaveBeenCalledTimes(5); // 1 + 2 + 2 (copyAnsi emits twice)
    });
  });
});
