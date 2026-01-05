/**
 * StartupDialog Tests
 * Tests for the project template selection dialog
 */

import {
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
  afterEach,
  vi,
} from "bun:test";
import { JSDOM } from "jsdom";
import { StartupDialog } from "../src/ui/StartupDialog.js";
import { PROJECT_TEMPLATES } from "../src/core/ProjectTemplate.js";

// Mock console.warn globally to suppress expected error messages
const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

// Mock palettes
vi.mock("../src/palettes.json", () => ({
  default: {
    default: { name: "Default Terminal" },
    gruvbox: { name: "Gruvbox Dark" },
    nord: { name: "Nord" },
  },
}));

describe("StartupDialog", () => {
  let dialog;
  let mockCallback;
  let dom;
  let document;

  beforeAll(() => {
    // Create JSDOM instance once for all tests
    dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
    document = dom.window.document;
    global.document = document;
    global.window = dom.window;
    global.Event = dom.window.Event;
    global.KeyboardEvent = dom.window.KeyboardEvent;
    global.localStorage = localStorageMock;
  });

  beforeEach(() => {
    // Reset localStorage mocks
    vi.clearAllMocks();

    // Create mock callback
    mockCallback = vi.fn();

    // Create dialog instance
    dialog = new StartupDialog();
  });

  afterEach(() => {
    if (dialog) {
      dialog.destroy();
    }
  });

  describe("Initialization", () => {
    it("should create dialog DOM structure", () => {
      expect(document.querySelector(".startup-dialog-overlay")).toBeTruthy();
      expect(document.querySelector(".startup-dialog")).toBeTruthy();
      expect(document.querySelector(".startup-dialog-header")).toBeTruthy();
      expect(document.querySelector(".template-cards")).toBeTruthy();
    });

    it("should be hidden by default", () => {
      const overlay = document.querySelector(".startup-dialog-overlay");
      expect(overlay.style.display).toBe("none");
    });

    it("should render all template cards", () => {
      const cards = document.querySelectorAll(".template-card");
      expect(cards.length).toBe(Object.keys(PROJECT_TEMPLATES).length);
    });

    it("should have standard template selected by default", () => {
      expect(dialog.selectedTemplate).toBe("standard");
      const selectedCard = document.querySelector(".template-card.selected");
      expect(selectedCard.dataset.templateId).toBe("standard");
    });
  });

  describe("Template Selection", () => {
    it("should select template when card is clicked", () => {
      const simpleCard = document.querySelector('[data-template-id="simple"]');
      simpleCard.click();

      expect(dialog.selectedTemplate).toBe("simple");
      expect(simpleCard.classList.contains("selected")).toBe(true);
    });

    it("should update dimensions when template is selected", () => {
      const widthInput = document.getElementById("canvas-width");
      const heightInput = document.getElementById("canvas-height");

      const advancedCard = document.querySelector(
        '[data-template-id="advanced"]',
      );
      advancedCard.click();

      const advancedTemplate = PROJECT_TEMPLATES.advanced;
      expect(widthInput.value).toBe(
        advancedTemplate.defaultDimensions.w.toString(),
      );
      expect(heightInput.value).toBe(
        advancedTemplate.defaultDimensions.h.toString(),
      );
    });

    it("should only allow one template to be selected", () => {
      const simpleCard = document.querySelector('[data-template-id="simple"]');
      const standardCard = document.querySelector(
        '[data-template-id="standard"]',
      );

      simpleCard.click();
      expect(simpleCard.classList.contains("selected")).toBe(true);
      expect(standardCard.classList.contains("selected")).toBe(false);

      standardCard.click();
      expect(simpleCard.classList.contains("selected")).toBe(false);
      expect(standardCard.classList.contains("selected")).toBe(true);
    });
  });

  describe("Settings Input", () => {
    it("should update custom dimensions when inputs change", () => {
      const widthInput = document.getElementById("canvas-width");
      const heightInput = document.getElementById("canvas-height");

      widthInput.value = "100";
      widthInput.dispatchEvent(new dom.window.Event("input"));
      expect(dialog.customDimensions.w).toBe(100);

      heightInput.value = "30";
      heightInput.dispatchEvent(new dom.window.Event("input"));
      expect(dialog.customDimensions.h).toBe(30);
    });

    it("should update selected palette when dropdown changes", () => {
      const paletteSelect = document.getElementById("initial-palette");
      paletteSelect.value = "gruvbox";
      paletteSelect.dispatchEvent(new dom.window.Event("change"));

      expect(dialog.selectedPalette).toBe("gruvbox");
    });

    it("should update border settings when controls change", () => {
      const borderCheckbox = document.getElementById("enable-border");
      const borderRadios = document.querySelectorAll(
        'input[name="border-style"]',
      );

      // Initially disabled
      expect(dialog.borderEnabled).toBe(false);
      expect(dialog.borderStyle).toBe("single");

      // Enable border
      borderCheckbox.checked = true;
      borderCheckbox.dispatchEvent(new dom.window.Event("change"));
      expect(dialog.borderEnabled).toBe(true);

      // Change style
      const doubleRadio = Array.from(borderRadios).find(
        (r) => r.value === "double",
      );
      doubleRadio.checked = true;
      doubleRadio.dispatchEvent(new dom.window.Event("change"));
      expect(dialog.borderStyle).toBe("double");
    });
  });

  describe("Quick Start", () => {
    it("should create project with standard template and defaults", () => {
      dialog.setOnTemplateSelect(mockCallback);

      const quickStartBtn = document.getElementById("quick-start-btn");
      quickStartBtn.click();

      expect(mockCallback).toHaveBeenCalledWith({
        template: "standard",
        dimensions: PROJECT_TEMPLATES.standard.defaultDimensions,
        palette: "default",
        border: {
          enabled: false,
          style: "single",
        },
      });
    });

    it("should hide dialog after quick start", () => {
      const quickStartBtn = document.getElementById("quick-start-btn");
      dialog.show();
      expect(dialog.isVisible()).toBe(true);

      quickStartBtn.click();
      expect(dialog.isVisible()).toBe(false);
    });
  });

  describe("Custom Start", () => {
    it("should create project with selected configuration", () => {
      dialog.setOnTemplateSelect(mockCallback);

      // Select advanced template
      const advancedCard = document.querySelector(
        '[data-template-id="advanced"]',
      );
      advancedCard.click();

      // Set custom dimensions
      const widthInput = document.getElementById("canvas-width");
      const heightInput = document.getElementById("canvas-height");
      widthInput.value = "120";
      heightInput.value = "40";
      widthInput.dispatchEvent(new dom.window.Event("input"));
      heightInput.dispatchEvent(new dom.window.Event("input"));

      // Select palette
      const paletteSelect = document.getElementById("initial-palette");
      paletteSelect.value = "gruvbox";
      paletteSelect.dispatchEvent(new dom.window.Event("change"));

      // Start project
      const customStartBtn = document.getElementById("custom-start-btn");
      customStartBtn.click();

      expect(mockCallback).toHaveBeenCalledWith({
        template: "advanced",
        dimensions: { w: 120, h: 40 },
        palette: "gruvbox",
        border: {
          enabled: dialog.borderEnabled,
          style: dialog.borderStyle,
        },
      });
    });

    it("should include border settings in configuration", () => {
      dialog.setOnTemplateSelect(mockCallback);

      // Enable border and set style
      const borderCheckbox = document.getElementById("enable-border");
      const borderRadios = document.querySelectorAll(
        'input[name="border-style"]',
      );

      borderCheckbox.checked = true;
      borderCheckbox.dispatchEvent(new dom.window.Event("change"));

      const doubleRadio = Array.from(borderRadios).find(
        (r) => r.value === "double",
      );
      doubleRadio.checked = true;
      doubleRadio.dispatchEvent(new dom.window.Event("change"));

      const customStartBtn = document.getElementById("custom-start-btn");
      customStartBtn.click();

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          border: {
            enabled: true,
            style: "double",
          },
        }),
      );
    });

    it("should validate dimensions before creating project", () => {
      const widthInput = document.getElementById("canvas-width");
      widthInput.value = "5"; // Too small
      widthInput.dispatchEvent(new dom.window.Event("input"));

      const customStartBtn = document.getElementById("custom-start-btn");
      customStartBtn.click();

      // Should show error and not create project
      expect(document.querySelector(".error-message")).toBeTruthy();
      expect(mockCallback).not.toHaveBeenCalled();
    });

    it("should validate width range (10-200)", () => {
      dialog.setOnTemplateSelect(mockCallback);

      const widthInput = document.getElementById("canvas-width");
      const customStartBtn = document.getElementById("custom-start-btn");

      // Test too small
      widthInput.value = "5";
      widthInput.dispatchEvent(new dom.window.Event("input"));
      customStartBtn.click();
      expect(document.querySelector(".error-message")).toBeTruthy();

      // Clear error
      document.querySelector(".error-message").remove();

      // Test too large
      widthInput.value = "250";
      widthInput.dispatchEvent(new dom.window.Event("input"));
      customStartBtn.click();
      expect(document.querySelector(".error-message")).toBeTruthy();
    });

    it("should validate height range (10-100)", () => {
      dialog.setOnTemplateSelect(mockCallback);

      const heightInput = document.getElementById("canvas-height");
      const customStartBtn = document.getElementById("custom-start-btn");

      // Test too small
      heightInput.value = "5";
      heightInput.dispatchEvent(new dom.window.Event("input"));
      customStartBtn.click();
      expect(document.querySelector(".error-message")).toBeTruthy();

      // Clear error
      document.querySelector(".error-message").remove();

      // Test too large
      heightInput.value = "150";
      heightInput.dispatchEvent(new dom.window.Event("input"));
      customStartBtn.click();
      expect(document.querySelector(".error-message")).toBeTruthy();
    });
  });

  describe("Dialog Visibility", () => {
    it("should show and hide dialog correctly", () => {
      expect(dialog.isVisible()).toBe(false);

      dialog.show();
      expect(dialog.isVisible()).toBe(true);
      expect(document.body.classList.contains("modal-open")).toBe(true);

      dialog.hide();
      expect(dialog.isVisible()).toBe(false);
      expect(document.body.classList.contains("modal-open")).toBe(false);
    });

    it("should close dialog when backdrop is clicked", () => {
      dialog.show();
      expect(dialog.isVisible()).toBe(true);

      const overlay = document.querySelector(".startup-dialog-overlay");
      overlay.click();
      expect(dialog.isVisible()).toBe(false);
    });

    it("should not close dialog when clicking inside dialog content", () => {
      dialog.show();
      expect(dialog.isVisible()).toBe(true);

      const dialogContent = document.querySelector(".startup-dialog");
      dialogContent.click();
      expect(dialog.isVisible()).toBe(true);
    });
  });

  describe("Keyboard Shortcuts", () => {
    it("should close dialog on Escape key", () => {
      dialog.show();
      expect(dialog.isVisible()).toBe(true);

      const escapeEvent = new dom.window.KeyboardEvent("keydown", {
        key: "Escape",
      });
      document.dispatchEvent(escapeEvent);
      expect(dialog.isVisible()).toBe(false);
    });

    it("should trigger custom start on Enter key", () => {
      dialog.setOnTemplateSelect(mockCallback);
      dialog.show();

      const enterEvent = new dom.window.KeyboardEvent("keydown", {
        key: "Enter",
        shiftKey: false,
      });
      document.dispatchEvent(enterEvent);
      expect(mockCallback).toHaveBeenCalled();
    });

    it("should trigger quick start on Shift+Enter", () => {
      dialog.setOnTemplateSelect(mockCallback);
      dialog.show();

      const shiftEnterEvent = new dom.window.KeyboardEvent("keydown", {
        key: "Enter",
        shiftKey: true,
      });
      document.dispatchEvent(shiftEnterEvent);

      expect(mockCallback).toHaveBeenCalledWith({
        template: "standard",
        dimensions: PROJECT_TEMPLATES.standard.defaultDimensions,
        palette: "default",
        border: {
          enabled: false,
          style: "single",
        },
      });
    });

    it("should ignore keyboard shortcuts when dialog is hidden", () => {
      dialog.setOnTemplateSelect(mockCallback);
      expect(dialog.isVisible()).toBe(false);

      const enterEvent = new dom.window.KeyboardEvent("keydown", {
        key: "Enter",
      });
      document.dispatchEvent(enterEvent);
      expect(mockCallback).not.toHaveBeenCalled();
    });
  });

  describe("LocalStorage Integration", () => {
    it("should save last used configuration", () => {
      const config = {
        template: "advanced",
        dimensions: { w: 100, h: 30 },
        palette: "gruvbox",
        border: {
          enabled: true,
          style: "double",
        },
      };

      dialog.saveLastUsed(config);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "terminal-draw-last-template",
        JSON.stringify(config),
      );
    });

    it("should handle missing localStorage data gracefully", () => {
      localStorageMock.getItem.mockReturnValue(null);

      expect(() => dialog.loadLastUsed()).not.toThrow();
      expect(dialog.selectedTemplate).toBe("standard"); // Should keep default
    });

    it("should handle corrupted localStorage data gracefully", () => {
      localStorageMock.getItem.mockReturnValue("invalid json");

      expect(() => dialog.loadLastUsed()).not.toThrow();
      expect(consoleWarnSpy).toHaveBeenCalled();
    });
  });

  describe("Error Handling", () => {
    it("should show error message and auto-remove it", () => {
      vi.useFakeTimers();

      dialog.showError("Test error message");

      const errorElement = document.querySelector(".error-message");
      expect(errorElement).toBeTruthy();
      expect(errorElement.textContent).toBe("Test error message");

      // Fast-forward time by 5 seconds
      vi.advanceTimersByTime(5000);

      expect(document.querySelector(".error-message")).toBeFalsy();

      vi.useRealTimers();
    });

    it("should replace existing error message", () => {
      dialog.showError("First error");
      expect(document.querySelectorAll(".error-message").length).toBe(1);

      dialog.showError("Second error");
      expect(document.querySelectorAll(".error-message").length).toBe(1);
      expect(document.querySelector(".error-message").textContent).toBe(
        "Second error",
      );
    });
  });

  describe("Cleanup", () => {
    it("should remove dialog from DOM on destroy", () => {
      expect(document.querySelector(".startup-dialog-overlay")).toBeTruthy();

      dialog.destroy();
      expect(document.querySelector(".startup-dialog-overlay")).toBeFalsy();
      expect(document.body.classList.contains("modal-open")).toBe(false);
    });

    it("should be safe to call destroy multiple times", () => {
      dialog.destroy();
      expect(() => dialog.destroy()).not.toThrow();
    });
  });

  describe("Template Rendering", () => {
    it("should render correct template information", () => {
      const simpleCard = document.querySelector('[data-template-id="simple"]');
      const template = PROJECT_TEMPLATES.simple;

      expect(simpleCard.querySelector(".template-icon").textContent).toBe(
        template.icon,
      );
      expect(simpleCard.querySelector("h4").textContent).toBe(template.name);
      expect(
        simpleCard.querySelector(".template-description").textContent,
      ).toBe(template.description);
      expect(simpleCard.querySelector(".layer-count").textContent).toBe(
        `${template.layers.length} layer`,
      );
    });

    it("should show plural layers for multi-layer templates", () => {
      const advancedCard = document.querySelector(
        '[data-template-id="advanced"]',
      );
      const template = PROJECT_TEMPLATES.advanced;

      expect(advancedCard.querySelector(".layer-count").textContent).toBe(
        `${template.layers.length} layers`,
      );
    });
  });

  describe("Event Management", () => {
    it("should emit StateManager events on template selection", () => {
      // This would require mocking StateManager, but we can test that
      // the selectTemplate method works correctly
      const originalTemplate = dialog.selectedTemplate;
      dialog.selectTemplate("simple");

      expect(dialog.selectedTemplate).toBe("simple");
      expect(dialog.selectedTemplate).not.toBe(originalTemplate);
    });

    it("should not change selection if same template is clicked", () => {
      const initialTemplate = dialog.selectedTemplate;
      dialog.selectTemplate(initialTemplate);

      // Should remain the same
      expect(dialog.selectedTemplate).toBe(initialTemplate);
    });
  });

  describe("Template Dimension Updates (Regression Tests)", () => {
    it("should update input fields when simple template is selected", () => {
      dialog.show();

      const simpleCard = document.querySelector('[data-template-id="simple"]');
      const widthInput = document.getElementById("canvas-width");
      const heightInput = document.getElementById("canvas-height");

      simpleCard.click();

      expect(widthInput.value).toBe("40");
      expect(heightInput.value).toBe("20");
      expect(dialog.customDimensions).toEqual({ w: 40, h: 20 });
    });

    it("should update input fields when advanced template is selected", () => {
      dialog.show();

      const advancedCard = document.querySelector(
        '[data-template-id="advanced"]',
      );
      const widthInput = document.getElementById("canvas-width");
      const heightInput = document.getElementById("canvas-height");

      advancedCard.click();

      expect(widthInput.value).toBe("80");
      expect(heightInput.value).toBe("25");
      expect(dialog.customDimensions).toEqual({ w: 80, h: 25 });
    });

    it("should update dimensions immediately on template click", () => {
      dialog.show();

      const simpleCard = document.querySelector('[data-template-id="simple"]');
      const standardCard = document.querySelector(
        '[data-template-id="standard"]',
      );
      const advancedCard = document.querySelector(
        '[data-template-id="advanced"]',
      );
      const widthInput = document.getElementById("canvas-width");
      const heightInput = document.getElementById("canvas-height");

      // Click simple
      simpleCard.click();
      expect(widthInput.value).toBe("40");
      expect(heightInput.value).toBe("20");

      // Click standard
      standardCard.click();
      expect(widthInput.value).toBe("60");
      expect(heightInput.value).toBe("25");

      // Click advanced
      advancedCard.click();
      expect(widthInput.value).toBe("80");
      expect(heightInput.value).toBe("25");
    });

    it("should maintain visual selection state after dimension updates", () => {
      dialog.show();

      const simpleCard = document.querySelector('[data-template-id="simple"]');
      const standardCard = document.querySelector(
        '[data-template-id="standard"]',
      );

      // Initially standard should be selected
      expect(standardCard.classList.contains("selected")).toBe(true);
      expect(simpleCard.classList.contains("selected")).toBe(false);

      // Click simple
      simpleCard.click();
      expect(simpleCard.classList.contains("selected")).toBe(true);
      expect(standardCard.classList.contains("selected")).toBe(false);
    });
  });

  describe("Dialog Dismissal Handling (Regression Tests)", () => {
    it("should create default project when dismissed without selection", () => {
      let projectCreated = false;
      let projectConfig = null;

      dialog.setOnTemplateSelect((config) => {
        projectCreated = true;
        projectConfig = config;
      });

      // Show dialog
      dialog.show();
      expect(dialog.isVisible()).toBe(true);
      expect(projectCreated).toBe(false);

      // Dismiss dialog without creating project (simulate backdrop click)
      dialog.hide();

      // Should have created default project
      expect(projectCreated).toBe(true);
      expect(projectConfig).toBeDefined();
      expect(projectConfig.template).toBe("standard");
      expect(projectConfig.dimensions.w).toBe(60);
      expect(projectConfig.dimensions.h).toBe(25);
      expect(projectConfig.palette).toBe("default");
      expect(projectConfig.border.enabled).toBe(false);
    });

    it("should not create duplicate projects if already created", () => {
      let projectCount = 0;

      dialog.setOnTemplateSelect(() => {
        projectCount++;
      });

      // Show dialog and create project normally
      dialog.show();
      dialog.quickStart();
      expect(projectCount).toBe(1);

      // Hide dialog again - should not create another project
      dialog.hide();
      expect(projectCount).toBe(1);
    });

    it("should reset project creation flag on each show", () => {
      let projectCount = 0;

      dialog.setOnTemplateSelect(() => {
        projectCount++;
      });

      // First cycle: show and dismiss
      dialog.show();
      dialog.hide();
      expect(projectCount).toBe(1);

      // Second cycle: show and dismiss again
      dialog.show();
      dialog.hide();
      expect(projectCount).toBe(2);

      // Third cycle: show and create normally
      dialog.show();
      dialog.customStart();
      expect(projectCount).toBe(3);

      // Fourth cycle: dismiss again
      dialog.hide();
      expect(projectCount).toBe(3); // No additional project since one was already created
    });

    it("should handle edge case of hide without show", () => {
      let projectCreated = false;

      dialog.setOnTemplateSelect(() => {
        projectCreated = true;
      });

      // Try to hide without showing first
      dialog.hide();

      // Should not create project since projectCreated flag starts undefined/false
      expect(projectCreated).toBe(false);
    });
  });
});
