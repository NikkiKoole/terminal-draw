import { describe, it, expect, beforeEach, vi } from "bun:test";
import { JSDOM } from "jsdom";
import { LayerRenderer } from "../src/rendering/LayerRenderer.js";
import { Layer } from "../src/core/Layer.js";
import { Cell } from "../src/core/Cell.js";

describe("LayerRenderer", () => {
  let renderer;
  let dom;
  let document;
  let container;

  beforeEach(() => {
    // Create a new JSDOM instance for each test
    dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
    document = dom.window.document;
    global.document = document;
    global.HTMLElement = dom.window.HTMLElement;

    // Create container
    container = document.createElement("div");
    container.className = "visual-layer";
    document.body.appendChild(container);

    // Create renderer
    renderer = new LayerRenderer();
  });

  describe("constructor", () => {
    it("should create a new LayerRenderer instance", () => {
      expect(renderer).toBeInstanceOf(LayerRenderer);
      expect(renderer.renderedContainers).toBeDefined();
    });
  });

  describe("render", () => {
    it("should render a layer to a container", () => {
      const layer = new Layer("test", "Test Layer", 3, 2);

      renderer.render(layer, container);

      // Should have 2 rows
      const rows = container.querySelectorAll(".grid-row");
      expect(rows.length).toBe(2);

      // Each row should have 3 cells
      rows.forEach((row) => {
        const cells = row.querySelectorAll(".cell");
        expect(cells.length).toBe(3);
      });
    });

    it("should set correct row data attributes", () => {
      const layer = new Layer("test", "Test Layer", 3, 2);

      renderer.render(layer, container);

      const rows = container.querySelectorAll(".grid-row");
      expect(rows[0].dataset.row).toBe("0");
      expect(rows[1].dataset.row).toBe("1");
    });

    it("should set correct cell data attributes", () => {
      const layer = new Layer("test", "Test Layer", 2, 2);

      renderer.render(layer, container);

      const firstRow = container.querySelector('[data-row="0"]');
      const cells = firstRow.querySelectorAll(".cell");

      expect(cells[0].dataset.x).toBe("0");
      expect(cells[0].dataset.y).toBe("0");
      expect(cells[1].dataset.x).toBe("1");
      expect(cells[1].dataset.y).toBe("0");
    });

    it("should apply default color classes", () => {
      const layer = new Layer("test", "Test Layer", 2, 2);

      renderer.render(layer, container);

      const cell = container.querySelector(".cell");
      expect(cell.classList.contains("fg-7")).toBe(true);
      expect(cell.classList.contains("bg--1")).toBe(true);
    });

    it("should render cell characters", () => {
      const layer = new Layer("test", "Test Layer", 3, 1);
      layer.setCell(0, 0, new Cell("A", 1, 0));
      layer.setCell(1, 0, new Cell("B", 2, 1));
      layer.setCell(2, 0, new Cell("C", 3, 2));

      renderer.render(layer, container);

      const cells = container.querySelectorAll(".cell");
      expect(cells[0].textContent).toBe("A");
      expect(cells[1].textContent).toBe("B");
      expect(cells[2].textContent).toBe("C");
    });

    it("should apply custom color classes", () => {
      const layer = new Layer("test", "Test Layer", 2, 1);
      layer.setCell(0, 0, new Cell("X", 3, 5));

      renderer.render(layer, container);

      const cell = container.querySelector(".cell");
      expect(cell.classList.contains("fg-3")).toBe(true);
      expect(cell.classList.contains("bg-5")).toBe(true);
    });

    it("should handle invisible layer", () => {
      const layer = new Layer("test", "Test Layer", 3, 2);
      layer.visible = false;

      renderer.render(layer, container);

      expect(container.classList.contains("hidden")).toBe(true);
      // Should not render content when invisible
      const rows = container.querySelectorAll(".grid-row");
      expect(rows.length).toBe(0);
    });

    it("should remove hidden class for visible layer", () => {
      const layer = new Layer("test", "Test Layer", 3, 2);
      container.classList.add("hidden");

      renderer.render(layer, container);

      expect(container.classList.contains("hidden")).toBe(false);
    });

    it("should apply ligatures class when enabled", () => {
      const layer = new Layer("test", "Test Layer", 3, 2);
      layer.ligatures = true;

      renderer.render(layer, container);

      expect(container.classList.contains("ligatures-enabled")).toBe(true);
    });

    it("should remove ligatures class when disabled", () => {
      const layer = new Layer("test", "Test Layer", 3, 2);
      layer.ligatures = false;
      container.classList.add("ligatures-enabled");

      renderer.render(layer, container);

      expect(container.classList.contains("ligatures-enabled")).toBe(false);
    });

    it("should clear existing content before rendering", () => {
      const existingDiv = document.createElement("div");
      existingDiv.textContent = "Old content";
      container.appendChild(existingDiv);

      const layer = new Layer("test", "Test Layer", 2, 1);
      renderer.render(layer, container);

      expect(container.textContent).not.toContain("Old content");
      const rows = container.querySelectorAll(".grid-row");
      expect(rows.length).toBe(1);
    });

    it("should handle null layer gracefully", () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      renderer.render(null, container);

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it("should handle null container gracefully", () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const layer = new Layer("test", "Test Layer", 2, 1);

      renderer.render(layer, null);

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it("should track rendered container", () => {
      const layer = new Layer("test", "Test Layer", 3, 2);

      renderer.render(layer, container);

      expect(renderer.isRendered(container)).toBe(true);
    });
  });

  describe("createCellElement", () => {
    it("should create a cell span element", () => {
      const cell = new Cell("X", 3, 1);
      const span = renderer.createCellElement(cell, 5, 10);

      expect(span.tagName).toBe("SPAN");
      expect(span.className).toContain("cell");
    });

    it("should set cell coordinates", () => {
      const cell = new Cell("A", 1, 0);
      const span = renderer.createCellElement(cell, 5, 10);

      expect(span.dataset.x).toBe("5");
      expect(span.dataset.y).toBe("10");
    });

    it("should set text content", () => {
      const cell = new Cell("█", 1, 0);
      const span = renderer.createCellElement(cell, 0, 0);

      expect(span.textContent).toBe("█");
    });

    it("should apply color classes", () => {
      const cell = new Cell("X", 3, 5);
      const span = renderer.createCellElement(cell, 0, 0);

      expect(span.classList.contains("fg-3")).toBe(true);
      expect(span.classList.contains("bg-5")).toBe(true);
    });

    it("should handle box-drawing characters", () => {
      const cell = new Cell("┌", 7, -1);
      const span = renderer.createCellElement(cell, 0, 0);

      expect(span.textContent).toBe("┌");
      expect(span.classList.contains("fg-7")).toBe(true);
      expect(span.classList.contains("bg--1")).toBe(true);
    });
  });

  describe("updateCell", () => {
    beforeEach(() => {
      // Render a layer first
      const layer = new Layer("test", "Test Layer", 3, 2);
      renderer.render(layer, container);
    });

    it("should update a single cell", () => {
      const layer = new Layer("test", "Test Layer", 3, 2);
      layer.setCell(1, 0, new Cell("X", 3, 1));

      const result = renderer.updateCell(layer, container, 1, 0);

      expect(result).toBe(true);
      const cell = container.querySelector('[data-x="1"][data-y="0"]');
      expect(cell.textContent).toBe("X");
    });

    it("should update color classes", () => {
      const layer = new Layer("test", "Test Layer", 3, 2);
      layer.setCell(1, 0, new Cell("A", 5, 3));

      renderer.updateCell(layer, container, 1, 0);

      const cell = container.querySelector('[data-x="1"][data-y="0"]');
      expect(cell.classList.contains("fg-5")).toBe(true);
      expect(cell.classList.contains("bg-3")).toBe(true);
    });

    it("should remove old color classes", () => {
      const layer = new Layer("test", "Test Layer", 3, 2);
      layer.setCell(1, 0, new Cell("A", 7, -1));

      // First update
      renderer.updateCell(layer, container, 1, 0);
      const cell = container.querySelector('[data-x="1"][data-y="0"]');
      expect(cell.classList.contains("fg-7")).toBe(true);

      // Second update with different colors
      layer.setCell(1, 0, new Cell("B", 1, 2));
      renderer.updateCell(layer, container, 1, 0);

      expect(cell.classList.contains("fg-7")).toBe(false);
      expect(cell.classList.contains("fg-1")).toBe(true);
      expect(cell.classList.contains("bg-2")).toBe(true);
    });

    it("should return false for invalid coordinates", () => {
      const layer = new Layer("test", "Test Layer", 3, 2);

      expect(renderer.updateCell(layer, container, -1, 0)).toBe(false);
      expect(renderer.updateCell(layer, container, 10, 0)).toBe(false);
      expect(renderer.updateCell(layer, container, 0, -1)).toBe(false);
      expect(renderer.updateCell(layer, container, 0, 10)).toBe(false);
    });

    it("should return false for null layer", () => {
      const result = renderer.updateCell(null, container, 0, 0);
      expect(result).toBe(false);
    });

    it("should return false for null container", () => {
      const layer = new Layer("test", "Test Layer", 3, 2);
      const result = renderer.updateCell(layer, null, 0, 0);
      expect(result).toBe(false);
    });

    it("should warn if row not found", () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const layer = new Layer("test", "Test Layer", 3, 2);

      // Remove a row manually
      const firstRow = container.querySelector('[data-row="0"]');
      firstRow?.remove();

      renderer.updateCell(layer, container, 0, 0);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Row 0 not found")
      );
      consoleSpy.mockRestore();
    });
  });

  describe("updateVisibility", () => {
    it("should hide container when layer is not visible", () => {
      const layer = new Layer("test", "Test Layer", 3, 2);
      layer.visible = false;

      renderer.updateVisibility(layer, container);

      expect(container.classList.contains("hidden")).toBe(true);
    });

    it("should show container when layer is visible", () => {
      const layer = new Layer("test", "Test Layer", 3, 2);
      layer.visible = true;
      container.classList.add("hidden");

      renderer.updateVisibility(layer, container);

      expect(container.classList.contains("hidden")).toBe(false);
    });

    it("should handle null layer gracefully", () => {
      expect(() => renderer.updateVisibility(null, container)).not.toThrow();
    });

    it("should handle null container gracefully", () => {
      const layer = new Layer("test", "Test Layer", 3, 2);
      expect(() => renderer.updateVisibility(layer, null)).not.toThrow();
    });
  });

  describe("updateLigatures", () => {
    it("should add ligatures class when enabled", () => {
      const layer = new Layer("test", "Test Layer", 3, 2);
      layer.ligatures = true;

      renderer.updateLigatures(layer, container);

      expect(container.classList.contains("ligatures-enabled")).toBe(true);
    });

    it("should remove ligatures class when disabled", () => {
      const layer = new Layer("test", "Test Layer", 3, 2);
      layer.ligatures = false;
      container.classList.add("ligatures-enabled");

      renderer.updateLigatures(layer, container);

      expect(container.classList.contains("ligatures-enabled")).toBe(false);
    });

    it("should handle null layer gracefully", () => {
      expect(() => renderer.updateLigatures(null, container)).not.toThrow();
    });

    it("should handle null container gracefully", () => {
      const layer = new Layer("test", "Test Layer", 3, 2);
      expect(() => renderer.updateLigatures(layer, null)).not.toThrow();
    });
  });

  describe("clear", () => {
    it("should clear container content", () => {
      const layer = new Layer("test", "Test Layer", 3, 2);
      renderer.render(layer, container);

      expect(container.children.length).toBeGreaterThan(0);

      renderer.clear(container);

      expect(container.innerHTML).toBe("");
    });

    it("should remove tracking", () => {
      const layer = new Layer("test", "Test Layer", 3, 2);
      renderer.render(layer, container);

      expect(renderer.isRendered(container)).toBe(true);

      renderer.clear(container);

      expect(renderer.isRendered(container)).toBe(false);
    });

    it("should handle null container gracefully", () => {
      expect(() => renderer.clear(null)).not.toThrow();
    });
  });

  describe("isRendered", () => {
    it("should return false for unrendered container", () => {
      expect(renderer.isRendered(container)).toBe(false);
    });

    it("should return true for rendered container", () => {
      const layer = new Layer("test", "Test Layer", 3, 2);
      renderer.render(layer, container);

      expect(renderer.isRendered(container)).toBe(true);
    });

    it("should return false after clearing", () => {
      const layer = new Layer("test", "Test Layer", 3, 2);
      renderer.render(layer, container);
      renderer.clear(container);

      expect(renderer.isRendered(container)).toBe(false);
    });
  });

  describe("integration tests", () => {
    it("should render a complex layer with multiple cells", () => {
      const layer = new Layer("test", "Test Layer", 5, 3);

      // Set some cells
      layer.setCell(0, 0, new Cell("┌", 7, -1));
      layer.setCell(1, 0, new Cell("─", 7, -1));
      layer.setCell(4, 0, new Cell("┐", 7, -1));
      layer.setCell(0, 1, new Cell("│", 7, -1));
      layer.setCell(2, 1, new Cell("X", 3, 1));
      layer.setCell(4, 1, new Cell("│", 7, -1));
      layer.setCell(0, 2, new Cell("└", 7, -1));
      layer.setCell(4, 2, new Cell("┘", 7, -1));

      renderer.render(layer, container);

      // Verify structure
      expect(container.querySelectorAll(".grid-row").length).toBe(3);
      expect(container.querySelectorAll(".cell").length).toBe(15);

      // Verify specific cells
      const topLeft = container.querySelector('[data-x="0"][data-y="0"]');
      expect(topLeft.textContent).toBe("┌");

      const center = container.querySelector('[data-x="2"][data-y="1"]');
      expect(center.textContent).toBe("X");
      expect(center.classList.contains("fg-3")).toBe(true);
      expect(center.classList.contains("bg-1")).toBe(true);
    });

    it("should handle multiple renders to the same container", () => {
      const layer1 = new Layer("test1", "Test 1", 2, 1);
      layer1.setCell(0, 0, new Cell("A", 1, 0));

      renderer.render(layer1, container);
      expect(container.querySelector(".cell").textContent).toBe("A");

      const layer2 = new Layer("test2", "Test 2", 2, 1);
      layer2.setCell(0, 0, new Cell("B", 2, 1));

      renderer.render(layer2, container);
      expect(container.querySelector(".cell").textContent).toBe("B");
    });
  });
});
