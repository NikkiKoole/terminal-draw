/**
 * ProjectManager.js - Handles project save/load operations
 *
 * Manages saving and loading complete projects as JSON files:
 * - Wraps scene data with metadata (version, name, timestamp)
 * - Downloads project as JSON file
 * - Loads project from JSON file upload
 * - Validates project format and version
 */

import { Scene } from "../core/Scene.js";

export class ProjectManager {
  /**
   * Create a project manager
   * @param {Scene} scene - The scene to manage
   * @param {StateManager} stateManager - State manager for events
   */
  constructor(scene, stateManager) {
    this.scene = scene;
    this.stateManager = stateManager;
    this.version = "1.0";
    this.currentProjectName = null;
  }

  /**
   * Create a project object with metadata
   * @param {string} name - Project name
   * @returns {object} Project object with metadata and scene data
   */
  createProject(name = "Untitled") {
    return {
      version: this.version,
      name: name,
      timestamp: new Date().toISOString(),
      scene: this.scene.toObject(),
    };
  }

  /**
   * Serialize project to JSON string
   * @param {string} name - Project name
   * @returns {string} JSON string
   */
  serializeProject(name = "Untitled") {
    const project = this.createProject(name);
    return JSON.stringify(project, null, 2);
  }

  /**
   * Parse JSON string to project object
   * @param {string} jsonString - JSON string to parse
   * @returns {object} Parsed project object
   */
  parseProject(jsonString) {
    try {
      const project = JSON.parse(jsonString);
      this.validateProject(project);
      return project;
    } catch (error) {
      throw new Error(`Failed to parse project: ${error.message}`);
    }
  }

  /**
   * Validate project structure and version
   * @param {object} project - Project object to validate
   * @throws {Error} If project is invalid
   */
  validateProject(project) {
    // Check required fields
    if (!project.version) {
      throw new Error("Missing version field");
    }

    if (!project.scene) {
      throw new Error("Missing scene data");
    }

    // Check version compatibility
    if (project.version !== this.version) {
      throw new Error(
        `Unsupported version: ${project.version} (expected ${this.version})`,
      );
    }

    // Validate scene structure
    const scene = project.scene;
    if (typeof scene.w !== "number" || typeof scene.h !== "number") {
      throw new Error("Invalid scene dimensions");
    }

    if (!scene.paletteId) {
      throw new Error("Missing palette ID");
    }

    if (!Array.isArray(scene.layers)) {
      throw new Error("Missing or invalid layers array");
    }

    // Basic validation passed
    return true;
  }

  /**
   * Import scene from project object
   * @param {object} project - Project object
   * @returns {Scene} Restored scene
   */
  importScene(project) {
    this.validateProject(project);
    const scene = Scene.fromObject(project.scene);
    this.currentProjectName = project.name;
    return scene;
  }

  /**
   * Save project to file (download)
   * @param {string} filename - Filename without extension
   * @returns {object} Result with success status and metadata
   */
  saveToFile(filename = "terminal-draw-project") {
    try {
      // Create project
      const json = this.serializeProject(filename);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      // Trigger download
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // Clean up
      URL.revokeObjectURL(url);

      this.currentProjectName = filename;

      const result = {
        success: true,
        filename: `${filename}.json`,
        size: json.length,
        name: filename,
      };

      this.stateManager.emit("project:saved", result);

      return result;
    } catch (error) {
      const result = {
        success: false,
        error: error.message,
      };

      this.stateManager.emit("project:error", result);

      return result;
    }
  }

  /**
   * Load project from file
   * @param {File} file - File object from input element
   * @returns {Promise<object>} Result with scene and metadata
   */
  async loadFromFile(file) {
    try {
      // Validate file type
      if (!file.name.endsWith(".json")) {
        throw new Error("Invalid file type. Expected .json file");
      }

      // Read file
      const text = await this.readFileAsText(file);

      // Parse and validate
      const project = this.parseProject(text);

      // Import scene
      const scene = this.importScene(project);

      const result = {
        success: true,
        scene: scene,
        project: project,
        filename: file.name,
        name: project.name,
        timestamp: project.timestamp,
        size: text.length,
      };

      this.stateManager.emit("project:loaded", result);

      return result;
    } catch (error) {
      const result = {
        success: false,
        error: error.message,
        filename: file.name,
      };

      this.stateManager.emit("project:error", result);

      return result;
    }
  }

  /**
   * Read file as text using FileReader or file.text()
   * @param {File} file - File to read
   * @returns {Promise<string>} File contents as text
   */
  async readFileAsText(file) {
    try {
      // Modern browsers support file.text()
      if (file.text) {
        return await file.text();
      }

      // Fallback to FileReader for older browsers
      return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (event) => {
          resolve(event.target.result);
        };

        reader.onerror = (event) => {
          reject(new Error("Failed to read file"));
        };

        reader.readAsText(file);
      });
    } catch (error) {
      throw new Error(`Failed to read file: ${error.message}`);
    }
  }

  /**
   * Get project metadata without full serialization
   * @returns {object} Project metadata
   */
  getProjectInfo() {
    return {
      version: this.version,
      name: this.currentProjectName || "Untitled",
      dimensions: {
        width: this.scene.w,
        height: this.scene.h,
      },
      paletteId: this.scene.paletteId,
      layerCount: this.scene.layers.length,
      activeLayer: this.scene.activeLayerId,
    };
  }

  /**
   * Estimate serialized project size in bytes
   * @returns {number} Estimated size in bytes
   */
  estimateSize() {
    const json = this.serializeProject();
    return json.length;
  }
}
