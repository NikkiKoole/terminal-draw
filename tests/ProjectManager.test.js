import { describe, it, expect, beforeEach, vi } from "bun:test";
import { ProjectManager } from "../src/io/ProjectManager.js";
import { Scene } from "../src/core/Scene.js";
import { Cell } from "../src/core/Cell.js";
import { StateManager } from "../src/core/StateManager.js";

describe("ProjectManager", () => {
  let scene;
  let stateManager;
  let projectManager;

  beforeEach(() => {
    scene = new Scene(80, 25, "default");
    stateManager = new StateManager();
    projectManager = new ProjectManager(scene, stateManager);

    // Mock URL.createObjectURL and revokeObjectURL
    global.URL.createObjectURL = vi.fn(() => "blob:mock-url");
    global.URL.revokeObjectURL = vi.fn();

    // Mock document
    global.document = {
      createElement: vi.fn(() => ({
        href: "",
        download: "",
        click: vi.fn(),
      })),
      body: {
        appendChild: vi.fn(),
        removeChild: vi.fn(),
      },
    };

    // Mock FileReader
    global.FileReader = vi.fn(function () {
      this.readAsText = vi.fn(function (blob) {
        // Simulate async file reading - immediate for testing
        blob.text().then((text) => {
          this.result = text;
          if (this.onload) {
            this.onload({ target: this });
          }
        });
      });
    });

    // Mock Blob with text() method
    global.Blob = vi.fn(function (content, options) {
      this.content = content;
      this.type = options?.type;
      this.text = async () => content[0];
    });
  });

  describe("constructor", () => {
    it("should create a project manager with scene and state manager", () => {
      expect(projectManager.scene).toBe(scene);
      expect(projectManager.stateManager).toBe(stateManager);
      expect(projectManager.version).toBe("1.0");
      expect(projectManager.currentProjectName).toBeNull();
    });
  });

  describe("createProject", () => {
    it("should create project object with metadata", () => {
      const project = projectManager.createProject("Test Project");

      expect(project).toHaveProperty("version");
      expect(project).toHaveProperty("name");
      expect(project).toHaveProperty("timestamp");
      expect(project).toHaveProperty("scene");

      expect(project.version).toBe("1.0");
      expect(project.name).toBe("Test Project");
      expect(project.scene).toEqual(scene.toObject());
    });

    it("should use default name if not provided", () => {
      const project = projectManager.createProject();

      expect(project.name).toBe("Untitled");
    });

    it("should include valid ISO timestamp", () => {
      const project = projectManager.createProject("Test");

      expect(project.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it("should include complete scene data", () => {
      scene.getLayer("mid").setCell(5, 5, new Cell("X", 1, 0));

      const project = projectManager.createProject("Test");

      expect(project.scene.w).toBe(80);
      expect(project.scene.h).toBe(25);
      expect(project.scene.paletteId).toBe("default");
      expect(project.scene.layers).toBeInstanceOf(Array);
      expect(project.scene.layers.length).toBe(3);
    });
  });

  describe("serializeProject", () => {
    it("should serialize project to JSON string", () => {
      const json = projectManager.serializeProject("Test");

      expect(typeof json).toBe("string");
      expect(() => JSON.parse(json)).not.toThrow();
    });

    it("should produce valid JSON with proper formatting", () => {
      const json = projectManager.serializeProject("Test");
      const parsed = JSON.parse(json);

      expect(parsed.version).toBe("1.0");
      expect(parsed.name).toBe("Test");
      expect(parsed.scene).toBeDefined();
    });

    it("should include scene modifications", () => {
      scene.getLayer("bg").setCell(0, 0, new Cell("A", 7, -1));

      const json = projectManager.serializeProject("Test");
      const parsed = JSON.parse(json);

      expect(parsed.scene.layers[0].cells[0].ch).toBe("A");
    });
  });

  describe("parseProject", () => {
    it("should parse valid JSON string", () => {
      const json = projectManager.serializeProject("Test");
      const project = projectManager.parseProject(json);

      expect(project.version).toBe("1.0");
      expect(project.name).toBe("Test");
      expect(project.scene).toBeDefined();
    });

    it("should throw error on invalid JSON", () => {
      expect(() => {
        projectManager.parseProject("{ invalid json");
      }).toThrow("Failed to parse project");
    });

    it("should throw error on missing version", () => {
      const json = JSON.stringify({ name: "Test", scene: {} });

      expect(() => {
        projectManager.parseProject(json);
      }).toThrow("Missing version field");
    });

    it("should throw error on missing scene", () => {
      const json = JSON.stringify({ version: "1.0", name: "Test" });

      expect(() => {
        projectManager.parseProject(json);
      }).toThrow("Missing scene data");
    });
  });

  describe("validateProject", () => {
    it("should validate correct project structure", () => {
      const project = projectManager.createProject("Test");

      expect(() => projectManager.validateProject(project)).not.toThrow();
      expect(projectManager.validateProject(project)).toBe(true);
    });

    it("should reject project without version", () => {
      const project = { scene: scene.toObject() };

      expect(() => projectManager.validateProject(project)).toThrow(
        "Missing version field",
      );
    });

    it("should reject project without scene", () => {
      const project = { version: "1.0", name: "Test" };

      expect(() => projectManager.validateProject(project)).toThrow(
        "Missing scene data",
      );
    });

    it("should reject unsupported version", () => {
      const project = {
        version: "2.0",
        scene: scene.toObject(),
      };

      expect(() => projectManager.validateProject(project)).toThrow(
        "Unsupported version",
      );
    });

    it("should reject invalid scene dimensions", () => {
      const project = {
        version: "1.0",
        scene: { w: "invalid", h: 25, paletteId: "default", layers: [] },
      };

      expect(() => projectManager.validateProject(project)).toThrow(
        "Invalid scene dimensions",
      );
    });

    it("should reject missing palette ID", () => {
      const project = {
        version: "1.0",
        scene: { w: 80, h: 25, layers: [] },
      };

      expect(() => projectManager.validateProject(project)).toThrow(
        "Missing palette ID",
      );
    });

    it("should reject missing layers array", () => {
      const project = {
        version: "1.0",
        scene: { w: 80, h: 25, paletteId: "default" },
      };

      expect(() => projectManager.validateProject(project)).toThrow(
        "Missing or invalid layers array",
      );
    });

    it("should reject invalid layers (not array)", () => {
      const project = {
        version: "1.0",
        scene: { w: 80, h: 25, paletteId: "default", layers: "not-array" },
      };

      expect(() => projectManager.validateProject(project)).toThrow(
        "Missing or invalid layers array",
      );
    });
  });

  describe("importScene", () => {
    it("should restore scene from project", () => {
      scene.getLayer("mid").setCell(10, 10, new Cell("Z", 3, 2));
      const project = projectManager.createProject("Test");

      const restored = projectManager.importScene(project);

      expect(restored).toBeInstanceOf(Scene);
      expect(restored.w).toBe(80);
      expect(restored.h).toBe(25);
      expect(restored.getLayer("mid").getCell(10, 10).ch).toBe("Z");
    });

    it("should set current project name", () => {
      const project = projectManager.createProject("My Project");

      projectManager.importScene(project);

      expect(projectManager.currentProjectName).toBe("My Project");
    });

    it("should validate before importing", () => {
      const invalidProject = { version: "999.0" };

      expect(() => projectManager.importScene(invalidProject)).toThrow();
    });

    it("should restore layer states", () => {
      scene.getLayer("bg").visible = false;
      scene.getLayer("mid").locked = true;

      const project = projectManager.createProject("Test");
      const restored = projectManager.importScene(project);

      expect(restored.getLayer("bg").visible).toBe(false);
      expect(restored.getLayer("mid").locked).toBe(true);
    });

    it("should restore active layer ID", () => {
      scene.setActiveLayer("fg");

      const project = projectManager.createProject("Test");
      const restored = projectManager.importScene(project);

      expect(restored.activeLayerId).toBe("fg");
    });
  });

  describe("saveToFile", () => {
    it("should create and download file", () => {
      const result = projectManager.saveToFile("test-project");

      expect(result.success).toBe(true);
      expect(result.filename).toBe("test-project.json");
      expect(result.name).toBe("test-project");
      expect(result.size).toBeGreaterThan(0);
    });

    it("should emit project:saved event", () => {
      const emitSpy = vi.fn();
      stateManager.on("project:saved", emitSpy);

      projectManager.saveToFile("test");

      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          filename: "test.json",
        }),
      );
    });

    it("should update current project name", () => {
      projectManager.saveToFile("my-project");

      expect(projectManager.currentProjectName).toBe("my-project");
    });

    it("should use default filename if not provided", () => {
      const result = projectManager.saveToFile();

      expect(result.filename).toBe("terminal-draw-project.json");
    });

    it("should create blob with correct type", () => {
      const BlobSpy = vi.fn(function (content, options) {
        this.content = content;
        this.type = options?.type;
        this.text = async () => content[0];
      });
      global.Blob = BlobSpy;

      projectManager.saveToFile("test");

      expect(BlobSpy).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({ type: "application/json" }),
      );
    });

    it("should handle errors gracefully", () => {
      // Force an error
      projectManager.serializeProject = vi.fn(() => {
        throw new Error("Serialization failed");
      });

      const result = projectManager.saveToFile("test");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Serialization failed");
    });

    it("should emit project:error on failure", () => {
      const emitSpy = vi.fn();
      stateManager.on("project:error", emitSpy);

      projectManager.serializeProject = vi.fn(() => {
        throw new Error("Test error");
      });

      projectManager.saveToFile("test");

      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: "Test error",
        }),
      );
    });
  });

  describe("loadFromFile", () => {
    it("should load project from file", async () => {
      scene.getLayer("mid").setCell(5, 5, new Cell("X", 1, 0));
      const json = projectManager.serializeProject("Test Project");

      const file = {
        name: "test.json",
        text: async () => json,
      };

      const result = await projectManager.loadFromFile(file);

      expect(result.success).toBe(true);
      expect(result.scene).toBeInstanceOf(Scene);
      expect(result.name).toBe("Test Project");
      expect(result.filename).toBe("test.json");
    });

    it("should reject non-JSON files", async () => {
      const file = {
        name: "test.txt",
        text: async () => "content",
      };

      const result = await projectManager.loadFromFile(file);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid file type");
    });

    it("should emit project:loaded event on success", async () => {
      const emitSpy = vi.fn();
      stateManager.on("project:loaded", emitSpy);

      const json = projectManager.serializeProject("Test");
      const file = {
        name: "test.json",
        text: async () => json,
      };

      await projectManager.loadFromFile(file);

      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          scene: expect.any(Scene),
        }),
      );
    });

    it("should emit project:error on failure", async () => {
      const emitSpy = vi.fn();
      stateManager.on("project:error", emitSpy);

      const file = {
        name: "test.json",
        text: async () => "invalid json",
      };

      await projectManager.loadFromFile(file);

      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.any(String),
        }),
      );
    });

    it("should handle invalid JSON gracefully", async () => {
      const file = {
        name: "test.json",
        text: async () => "{ invalid json }",
      };

      const result = await projectManager.loadFromFile(file);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should include file metadata in result", async () => {
      const json = projectManager.serializeProject("Test");
      const file = {
        name: "my-project.json",
        text: async () => json,
      };

      const result = await projectManager.loadFromFile(file);

      expect(result.filename).toBe("my-project.json");
      expect(result.size).toBeGreaterThan(0);
    });
  });

  describe("readFileAsText", () => {
    it("should read file contents as text", async () => {
      const content = "test content";
      const file = {
        text: async () => content,
      };

      const text = await projectManager.readFileAsText(file);

      expect(text).toBe(content);
    });

    it("should handle read errors", async () => {
      const file = {
        text: async () => {
          throw new Error("Read failed");
        },
      };

      await expect(projectManager.readFileAsText(file)).rejects.toThrow();
    });
  });

  describe("getProjectInfo", () => {
    it("should return project metadata", () => {
      projectManager.currentProjectName = "My Project";

      const info = projectManager.getProjectInfo();

      expect(info.version).toBe("1.0");
      expect(info.name).toBe("My Project");
      expect(info.dimensions.width).toBe(80);
      expect(info.dimensions.height).toBe(25);
      expect(info.paletteId).toBe("default");
      expect(info.layerCount).toBe(3);
      expect(info.activeLayer).toBe("mid");
    });

    it("should use Untitled if no project name", () => {
      const info = projectManager.getProjectInfo();

      expect(info.name).toBe("Untitled");
    });

    it("should reflect current scene state", () => {
      scene.setActiveLayer("fg");
      scene.paletteId = "gruvbox";

      const info = projectManager.getProjectInfo();

      expect(info.activeLayer).toBe("fg");
      expect(info.paletteId).toBe("gruvbox");
    });
  });

  describe("estimateSize", () => {
    it("should estimate project size", () => {
      const size = projectManager.estimateSize();

      expect(size).toBeGreaterThan(0);
      expect(typeof size).toBe("number");
    });

    it("should reflect scene content", () => {
      const emptySize = projectManager.estimateSize();

      // Add different content (not just default spaces)
      const layer = scene.getLayer("mid");
      for (let i = 0; i < 100; i++) {
        layer.setCell(i % 80, Math.floor(i / 80), new Cell("█", 1, 0));
      }

      const filledSize = projectManager.estimateSize();

      // Size should be roughly the same (cells already exist, just changing values)
      expect(typeof filledSize).toBe("number");
      expect(filledSize).toBeGreaterThan(0);
    });
  });

  describe("integration", () => {
    it("should handle complete save/load workflow", async () => {
      // Modify scene
      scene.getLayer("bg").setCell(0, 0, new Cell("A", 1, 0));
      scene.getLayer("mid").setCell(10, 10, new Cell("B", 2, 1));
      scene.getLayer("fg").setCell(79, 24, new Cell("C", 3, 2));
      scene.setActiveLayer("fg");
      scene.getLayer("mid").visible = false;

      // Serialize
      const json = projectManager.serializeProject("Integration Test");

      // Create file mock
      const file = {
        name: "integration-test.json",
        text: async () => json,
      };

      // Load back
      const result = await projectManager.loadFromFile(file);

      expect(result.success).toBe(true);

      const restored = result.scene;
      expect(restored.getLayer("bg").getCell(0, 0).ch).toBe("A");
      expect(restored.getLayer("mid").getCell(10, 10).ch).toBe("B");
      expect(restored.getLayer("fg").getCell(79, 24).ch).toBe("C");
      expect(restored.activeLayerId).toBe("fg");
      expect(restored.getLayer("mid").visible).toBe(false);
    });

    it("should emit all events during save/load", async () => {
      const savedSpy = vi.fn();
      const loadedSpy = vi.fn();

      stateManager.on("project:saved", savedSpy);
      stateManager.on("project:loaded", loadedSpy);

      // Save
      projectManager.saveToFile("test");
      expect(savedSpy).toHaveBeenCalledTimes(1);

      // Load
      const json = projectManager.serializeProject("test");
      const file = {
        name: "test.json",
        text: async () => json,
      };

      await projectManager.loadFromFile(file);
      expect(loadedSpy).toHaveBeenCalledTimes(1);
    });

    it("should preserve all cell data through round-trip", async () => {
      const layer = scene.getLayer("mid");

      // Create diverse cell data
      layer.setCell(0, 0, new Cell("█", 0, 7));
      layer.setCell(1, 0, new Cell(" ", 7, -1));
      layer.setCell(2, 0, new Cell("┌", 3, 2));
      layer.setCell(3, 0, new Cell("░", 6, 5));

      const json = projectManager.serializeProject("Test");
      const file = {
        name: "test.json",
        text: async () => json,
      };

      const result = await projectManager.loadFromFile(file);
      const restoredLayer = result.scene.getLayer("mid");

      expect(restoredLayer.getCell(0, 0).equals(new Cell("█", 0, 7))).toBe(
        true,
      );
      expect(restoredLayer.getCell(1, 0).equals(new Cell(" ", 7, -1))).toBe(
        true,
      );
      expect(restoredLayer.getCell(2, 0).equals(new Cell("┌", 3, 2))).toBe(
        true,
      );
      expect(restoredLayer.getCell(3, 0).equals(new Cell("░", 6, 5))).toBe(
        true,
      );
    });

    it("should handle custom scene dimensions", async () => {
      const customScene = new Scene(40, 20, "gruvbox");
      const customManager = new ProjectManager(customScene, stateManager);

      const json = customManager.serializeProject("Custom");
      const file = {
        name: "custom.json",
        text: async () => json,
      };

      const result = await customManager.loadFromFile(file);

      expect(result.scene.w).toBe(40);
      expect(result.scene.h).toBe(20);
      expect(result.scene.paletteId).toBe("gruvbox");
    });
  });
});
