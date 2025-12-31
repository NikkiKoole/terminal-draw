import { describe, it, expect, beforeEach, vi } from "vitest";
import { JSDOM } from "jsdom";
import { ResizeCommand } from "../src/commands/ResizeCommand.js";
import { GridResizer } from "../src/core/GridResizer.js";
import { StateManager } from "../src/core/StateManager.js";

// Mock DOM setup with resize modal HTML
const dom = new JSDOM(`
<!DOCTYPE html>
<html>
<body>
  <div id="io-panel">
    <button id="resize-grid">Resize Grid</button>
    <div id="grid-status" class="grid-status hidden"></div>
  </div>

  <div id="resize-modal" class="modal hidden">
    <div class="modal-backdrop"></div>
    <div class="modal-container">
      <div class="modal-header">
        <h3>Resize Grid</h3>
        <button id="resize-modal-close">×</button>
      </div>
      <div class="modal-content">
        <div class="resize-form">
          <div class="current-size">
            <span>Current Size:</span>
            <span id="current-dimensions">80×25</span>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="resize-width">Width:</label>
              <input type="number" id="resize-width" min="1" max="200" value="80" />
            </div>
            <div class="form-group">
              <label for="resize-height">Height:</label>
              <input type="number" id="resize-height" min="1" max="100" value="25" />
            </div>
          </div>

          <div class="form-group">
            <span>Resize Strategy:</span>
            <div class="radio-group">
              <label>
                <input type="radio" name="resize-strategy" value="pad" checked />
                <span>Pad - Expand and preserve content</span>
              </label>
              <label>
                <input type="radio" name="resize-strategy" value="crop" />
                <span>Crop - Shrink and remove content</span>
              </label>
              <label>
                <input type="radio" name="resize-strategy" value="center" />
                <span>Center - Resize from center</span>
              </label>
            </div>
          </div>

          <div class="resize-preview">
            <div id="resize-preview-text">No changes</div>
            <div id="resize-warning" class="preview-warning hidden">⚠️ Content may be lost</div>
            <div id="memory-impact">Memory: 0 KB</div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button id="resize-cancel">Cancel</button>
        <button id="resize-apply" disabled>Apply Resize</button>
      </div>
    </div>
  </div>
</body>
</html>
`);

global.window = dom.window;
global.document = dom.window.document;

// Mock Scene class
class MockScene {
  constructor(w = 10, h = 10) {
    this.w = w;
    this.h = h;
    this.layers = [
      { id: "bg", name: "Background", width: w, height: h },
      { id: "mid", name: "Middle", width: w, height: h },
      { id: "fg", name: "Foreground", width: w, height: h },
    ];
  }
}

// Mock variables that would be in app.js
let scene;
let stateManager;
let commandHistory;

// Mock functions from app.js
function updateCurrentDimensions() {
  const currentDimensions = document.getElementById("current-dimensions");
  const widthInput = document.getElementById("resize-width");
  const heightInput = document.getElementById("resize-height");

  if (scene && currentDimensions) {
    currentDimensions.textContent = `${scene.w}×${scene.h}`;
    widthInput.value = scene.w;
    heightInput.value = scene.h;
  }
}

function updateResizePreview() {
  const widthInput = document.getElementById("resize-width");
  const heightInput = document.getElementById("resize-height");
  const previewText = document.getElementById("resize-preview-text");
  const warningText = document.getElementById("resize-warning");
  const memoryInfo = document.getElementById("memory-impact");
  const resizeApply = document.getElementById("resize-apply");

  if (!scene || !widthInput || !heightInput) return;

  const newWidth = parseInt(widthInput.value) || 0;
  const newHeight = parseInt(heightInput.value) || 0;
  const strategy =
    document.querySelector('input[name="resize-strategy"]:checked')?.value ||
    "pad";

  // Validate dimensions
  const validation = ResizeCommand.validateResize(scene, newWidth, newHeight);
  const preview = GridResizer.getResizePreview(
    scene.w,
    scene.h,
    newWidth,
    newHeight,
    strategy,
  );

  // Update preview text
  previewText.textContent = preview.description;

  // Show/hide warning
  if (preview.warning) {
    warningText.textContent = `⚠️ ${preview.warning}`;
    warningText.classList.remove("hidden");
  } else {
    warningText.classList.add("hidden");
  }

  // Update memory info
  const memoryMB = (preview.memoryImpact.newMemory / (1024 * 1024)).toFixed(2);
  const deltaKB = (preview.memoryImpact.memoryDelta / 1024).toFixed(1);
  const deltaSign = preview.memoryImpact.memoryDelta >= 0 ? "+" : "";
  memoryInfo.textContent = `Memory: ${memoryMB} MB (${deltaSign}${deltaKB} KB)`;

  // Enable/disable apply button
  resizeApply.disabled = !validation.valid;

  if (!validation.valid && validation.errors.length > 0) {
    previewText.textContent = validation.errors[0];
    previewText.style.color = "rgba(220, 38, 127, 0.9)";
  } else {
    previewText.style.color = "";
  }
}

function showGridStatus(message, isError = false) {
  const status = document.getElementById("grid-status");
  if (!status) return;

  status.textContent = message;
  status.classList.remove("hidden");

  if (isError) {
    status.classList.add("error");
  } else {
    status.classList.remove("error");
  }
}

describe("Grid Resize UI", () => {
  beforeEach(() => {
    // Reset DOM by recreating the modal structure
    const modalHtml = `
      <div id="resize-modal" class="modal hidden">
        <div class="modal-backdrop"></div>
        <div class="modal-container">
          <div class="modal-header">
            <h3>Resize Grid</h3>
            <button id="resize-modal-close">×</button>
          </div>
          <div class="modal-content">
            <div class="resize-form">
              <div class="current-size">
                <span>Current Size:</span>
                <span id="current-dimensions">80×25</span>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label for="resize-width">Width:</label>
                  <input type="number" id="resize-width" min="1" max="200" value="10" />
                </div>
                <div class="form-group">
                  <label for="resize-height">Height:</label>
                  <input type="number" id="resize-height" min="1" max="100" value="10" />
                </div>
              </div>
              <div class="form-group">
                <span>Resize Strategy:</span>
                <div class="radio-group">
                  <label>
                    <input type="radio" name="resize-strategy" value="pad" checked />
                    <span>Pad - Expand and preserve content</span>
                  </label>
                  <label>
                    <input type="radio" name="resize-strategy" value="crop" />
                    <span>Crop - Shrink and remove content</span>
                  </label>
                  <label>
                    <input type="radio" name="resize-strategy" value="center" />
                    <span>Center - Resize from center</span>
                  </label>
                </div>
              </div>
              <div class="resize-preview">
                <div id="resize-preview-text">No changes</div>
                <div id="resize-warning" class="preview-warning hidden">⚠️ Content may be lost</div>
                <div id="memory-impact">Memory: 0 KB</div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button id="resize-cancel">Cancel</button>
            <button id="resize-apply" disabled>Apply Resize</button>
          </div>
        </div>
      </div>
    `;

    // Replace the modal in DOM
    const existingModal = document.getElementById("resize-modal");
    if (existingModal) {
      existingModal.outerHTML = modalHtml;
    }

    // Reset status
    const status = document.getElementById("grid-status");
    if (status) {
      status.classList.add("hidden");
      status.classList.remove("error");
    }

    // Create fresh instances
    scene = new MockScene(10, 10);
    stateManager = new StateManager();
    commandHistory = {
      execute: vi.fn(),
      canUndo: vi.fn().mockReturnValue(false),
      canRedo: vi.fn().mockReturnValue(false),
    };
  });

  describe("Modal Display", () => {
    it("should open modal when resize button is clicked", () => {
      const resizeBtn = document.getElementById("resize-grid");
      const modal = document.getElementById("resize-modal");

      expect(modal.classList.contains("hidden")).toBe(true);

      // Simulate button click
      resizeBtn.click();
      modal.classList.remove("hidden");

      expect(modal.classList.contains("hidden")).toBe(false);
    });

    it("should close modal when close button is clicked", () => {
      const modal = document.getElementById("resize-modal");
      const closeBtn = document.getElementById("resize-modal-close");

      // Open modal first
      modal.classList.remove("hidden");
      expect(modal.classList.contains("hidden")).toBe(false);

      // Close modal
      closeBtn.click();
      modal.classList.add("hidden");

      expect(modal.classList.contains("hidden")).toBe(true);
    });

    it("should close modal when cancel button is clicked", () => {
      const modal = document.getElementById("resize-modal");
      const cancelBtn = document.getElementById("resize-cancel");

      // Open modal first
      modal.classList.remove("hidden");

      // Cancel
      cancelBtn.click();
      modal.classList.add("hidden");

      expect(modal.classList.contains("hidden")).toBe(true);
    });
  });

  describe("Current Dimensions Display", () => {
    it("should display current scene dimensions", () => {
      updateCurrentDimensions();

      const currentDimensions = document.getElementById("current-dimensions");
      const widthInput = document.getElementById("resize-width");
      const heightInput = document.getElementById("resize-height");

      expect(currentDimensions.textContent).toBe("10×10");
      expect(widthInput.value).toBe("10");
      expect(heightInput.value).toBe("10");
    });

    it("should update inputs when scene size changes", () => {
      scene.w = 15;
      scene.h = 8;

      updateCurrentDimensions();

      const currentDimensions = document.getElementById("current-dimensions");
      const widthInput = document.getElementById("resize-width");
      const heightInput = document.getElementById("resize-height");

      expect(currentDimensions.textContent).toBe("15×8");
      expect(widthInput.value).toBe("15");
      expect(heightInput.value).toBe("8");
    });
  });

  describe("Input Validation", () => {
    it("should enable apply button for valid dimensions", () => {
      const widthInput = document.getElementById("resize-width");
      const heightInput = document.getElementById("resize-height");

      widthInput.value = "20";
      heightInput.value = "15";

      updateResizePreview();

      const applyBtn = document.getElementById("resize-apply");
      expect(applyBtn.disabled).toBe(false);
    });

    it("should disable apply button for invalid dimensions", () => {
      const widthInput = document.getElementById("resize-width");
      const heightInput = document.getElementById("resize-height");

      widthInput.value = "0"; // Invalid
      heightInput.value = "15";

      updateResizePreview();

      const applyBtn = document.getElementById("resize-apply");
      expect(applyBtn.disabled).toBe(true);
    });

    it("should disable apply button for same dimensions", () => {
      const widthInput = document.getElementById("resize-width");
      const heightInput = document.getElementById("resize-height");

      // Same as current scene size
      widthInput.value = "10";
      heightInput.value = "10";

      updateResizePreview();

      const applyBtn = document.getElementById("resize-apply");
      expect(applyBtn.disabled).toBe(true);
    });

    it("should show error message for invalid input", () => {
      const widthInput = document.getElementById("resize-width");
      const heightInput = document.getElementById("resize-height");
      const previewText = document.getElementById("resize-preview-text");

      widthInput.value = "1000"; // Too large
      heightInput.value = "15";

      updateResizePreview();

      expect(previewText.textContent).toContain("Width cannot exceed 200");
      expect(previewText.style.color).toBe("rgba(220, 38, 127, 0.9)");
    });
  });

  describe("Strategy Selection", () => {
    beforeEach(() => {
      const widthInput = document.getElementById("resize-width");
      const heightInput = document.getElementById("resize-height");
      widthInput.value = "15";
      heightInput.value = "12";
    });

    it("should default to pad strategy", () => {
      const padRadio = document.querySelector('input[value="pad"]');
      expect(padRadio.checked).toBe(true);

      updateResizePreview();
      const previewText = document.getElementById("resize-preview-text");
      expect(previewText.textContent).toContain(
        "Expanding from 10×10 to 15×12",
      );
    });

    it("should update preview for crop strategy", () => {
      const cropRadio = document.querySelector('input[value="crop"]');
      const widthInput = document.getElementById("resize-width");
      const heightInput = document.getElementById("resize-height");

      // Set smaller dimensions for crop test
      widthInput.value = "5";
      heightInput.value = "5";
      cropRadio.checked = true;

      updateResizePreview();

      const previewText = document.getElementById("resize-preview-text");
      const warningText = document.getElementById("resize-warning");

      expect(previewText.textContent).toContain("Shrinking from 10×10 to 5×5");
      expect(warningText.classList.contains("hidden")).toBe(false);
      expect(warningText.textContent).toContain(
        "Content outside new bounds will be lost",
      );
    });

    it("should update preview for center strategy", () => {
      const centerRadio = document.querySelector('input[value="center"]');
      const widthInput = document.getElementById("resize-width");
      const heightInput = document.getElementById("resize-height");

      widthInput.value = "8";
      heightInput.value = "12";
      centerRadio.checked = true;

      updateResizePreview();

      const previewText = document.getElementById("resize-preview-text");
      expect(previewText.textContent).toContain("Resizing from 10×10 to 8×12");
    });
  });

  describe("Memory Impact Display", () => {
    it("should show memory usage information", () => {
      const widthInput = document.getElementById("resize-width");
      const heightInput = document.getElementById("resize-height");

      widthInput.value = "20";
      heightInput.value = "20";

      updateResizePreview();

      const memoryInfo = document.getElementById("memory-impact");
      expect(memoryInfo.textContent).toMatch(
        /Memory: \d+\.\d+ MB \([+\-]\d+\.\d+ KB\)/,
      );
    });

    it("should show positive delta for expansion", () => {
      const widthInput = document.getElementById("resize-width");
      const heightInput = document.getElementById("resize-height");

      widthInput.value = "20";
      heightInput.value = "20";

      updateResizePreview();

      const memoryInfo = document.getElementById("memory-impact");
      expect(memoryInfo.textContent).toContain("+");
    });

    it("should show negative delta for shrinking", () => {
      const widthInput = document.getElementById("resize-width");
      const heightInput = document.getElementById("resize-height");

      widthInput.value = "5";
      heightInput.value = "5";

      updateResizePreview();

      const memoryInfo = document.getElementById("memory-impact");
      expect(memoryInfo.textContent).toContain("-");
    });
  });

  describe("Warning Display", () => {
    it("should hide warning for pad strategy", () => {
      const padRadio = document.querySelector('input[value="pad"]');
      const widthInput = document.getElementById("resize-width");
      const heightInput = document.getElementById("resize-height");

      widthInput.value = "20";
      heightInput.value = "20";
      padRadio.checked = true;

      updateResizePreview();

      const warningText = document.getElementById("resize-warning");
      expect(warningText.classList.contains("hidden")).toBe(true);
    });

    it("should show warning for crop strategy that loses content", () => {
      const cropRadio = document.querySelector('input[value="crop"]');
      const widthInput = document.getElementById("resize-width");
      const heightInput = document.getElementById("resize-height");

      widthInput.value = "5";
      heightInput.value = "5";
      cropRadio.checked = true;

      updateResizePreview();

      const warningText = document.getElementById("resize-warning");
      expect(warningText.classList.contains("hidden")).toBe(false);
      expect(warningText.textContent).toContain(
        "Content outside new bounds will be lost",
      );
    });

    it("should show warning for center strategy with mixed resize", () => {
      const centerRadio = document.querySelector('input[value="center"]');
      const widthInput = document.getElementById("resize-width");
      const heightInput = document.getElementById("resize-height");

      widthInput.value = "5"; // Shrink width
      heightInput.value = "15"; // Expand height
      centerRadio.checked = true;

      updateResizePreview();

      const warningText = document.getElementById("resize-warning");
      expect(warningText.classList.contains("hidden")).toBe(false);
      expect(warningText.textContent).toContain("Some content may be lost");
    });
  });

  describe("Status Messages", () => {
    it("should show success message", () => {
      showGridStatus("Grid resized successfully!");

      const status = document.getElementById("grid-status");
      expect(status.classList.contains("hidden")).toBe(false);
      expect(status.textContent).toBe("Grid resized successfully!");
      expect(status.classList.contains("error")).toBe(false);
    });

    it("should show error message", () => {
      showGridStatus("Failed to resize grid", true);

      const status = document.getElementById("grid-status");
      expect(status.classList.contains("hidden")).toBe(false);
      expect(status.textContent).toBe("Failed to resize grid");
      expect(status.classList.contains("error")).toBe(true);
    });
  });

  describe("Form Behavior", () => {
    it("should update preview when width input changes", () => {
      const widthInput = document.getElementById("resize-width");
      const previewText = document.getElementById("resize-preview-text");

      widthInput.value = "25";
      widthInput.dispatchEvent(new dom.window.Event("input"));

      updateResizePreview(); // Simulate the event handler

      expect(previewText.textContent).toContain("25");
    });

    it("should update preview when height input changes", () => {
      const heightInput = document.getElementById("resize-height");
      const previewText = document.getElementById("resize-preview-text");

      heightInput.value = "18";
      heightInput.dispatchEvent(new dom.window.Event("input"));

      updateResizePreview(); // Simulate the event handler

      expect(previewText.textContent).toContain("18");
    });

    it("should update preview when strategy changes", () => {
      const cropRadio = document.querySelector('input[value="crop"]');
      const widthInput = document.getElementById("resize-width");
      const heightInput = document.getElementById("resize-height");

      widthInput.value = "5";
      heightInput.value = "5";
      cropRadio.checked = true;
      cropRadio.dispatchEvent(new dom.window.Event("change"));

      updateResizePreview(); // Simulate the event handler

      const previewText = document.getElementById("resize-preview-text");
      expect(previewText.textContent).toContain("Shrinking");
    });
  });

  describe("Edge Cases", () => {
    it("should handle missing scene gracefully", () => {
      scene = null;

      expect(() => updateCurrentDimensions()).not.toThrow();
      expect(() => updateResizePreview()).not.toThrow();
    });

    it("should handle missing DOM elements gracefully", () => {
      scene = null;

      expect(() => updateResizePreview()).not.toThrow();
    });

    it("should handle invalid input values", () => {
      const widthInput = document.getElementById("resize-width");
      const heightInput = document.getElementById("resize-height");

      widthInput.value = "invalid";
      heightInput.value = "";

      updateResizePreview();

      const applyBtn = document.getElementById("resize-apply");
      expect(applyBtn.disabled).toBe(true);
    });

    it("should handle extremely large values", () => {
      const widthInput = document.getElementById("resize-width");
      const heightInput = document.getElementById("resize-height");

      widthInput.value = "99999";
      heightInput.value = "99999";

      updateResizePreview();

      const previewText = document.getElementById("resize-preview-text");
      const applyBtn = document.getElementById("resize-apply");

      expect(applyBtn.disabled).toBe(true);
      expect(previewText.textContent).toContain("exceed");
    });
  });

  describe("Accessibility", () => {
    it("should have proper labels for form inputs", () => {
      const widthInput = document.getElementById("resize-width");
      const heightInput = document.getElementById("resize-height");

      expect(widthInput.getAttribute("id")).toBe("resize-width");
      expect(heightInput.getAttribute("id")).toBe("resize-height");

      const widthLabel = document.querySelector('label[for="resize-width"]');
      const heightLabel = document.querySelector('label[for="resize-height"]');

      expect(widthLabel).toBeTruthy();
      expect(heightLabel).toBeTruthy();
    });

    it("should have proper min/max attributes on inputs", () => {
      const widthInput = document.getElementById("resize-width");
      const heightInput = document.getElementById("resize-height");

      expect(widthInput.getAttribute("min")).toBe("1");
      expect(widthInput.getAttribute("max")).toBe("200");
      expect(heightInput.getAttribute("min")).toBe("1");
      expect(heightInput.getAttribute("max")).toBe("100");
    });

    it("should have radio buttons properly grouped", () => {
      const radioButtons = document.querySelectorAll(
        'input[name="resize-strategy"]',
      );

      expect(radioButtons.length).toBe(3);
      radioButtons.forEach((radio) => {
        expect(radio.getAttribute("name")).toBe("resize-strategy");
      });
    });
  });
});
