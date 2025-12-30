/**
 * Terminal Draw - Main Application Entry Point
 * ASCII Art Editor with cell-based rendering
 */

import palettes from "./palettes.json";
import { Scene } from "./core/Scene.js";
import { Cell } from "./core/Cell.js";
import { LayerRenderer } from "./rendering/LayerRenderer.js";
import { StateManager } from "./core/StateManager.js";
import { HitTestOverlay } from "./input/HitTestOverlay.js";
import { LAYER_BG, LAYER_MID, LAYER_FG } from "./core/constants.js";
import { BrushTool } from "./tools/BrushTool.js";
import { EraserTool } from "./tools/EraserTool.js";
import { PickerTool } from "./tools/PickerTool.js";
import { LayerPanel } from "./ui/LayerPanel.js";
import { GlyphPicker } from "./ui/GlyphPicker.js";

// =============================================================================
// Configuration & State
// =============================================================================

const GRID_WIDTH = 80;
const GRID_HEIGHT = 25;

let currentPalette = "default";
let currentScale = 100;

// Scene and Renderer
let scene = null;
let renderer = null;
let stateManager = null;
let hitTestOverlay = null;

// Tools
let brushTool = null;
let eraserTool = null;
let pickerTool = null;
let currentTool = null;

// UI Components
let layerPanel = null;
let glyphPicker = null;

// Color selection state
let selectedFg = 7;
let selectedBg = -1;

// Hover indicator element
let hoverIndicator = null;

// =============================================================================
// Scene Management
// =============================================================================

/**
 * Initialize scene with test pattern
 */
function initScene() {
  // Create scene
  scene = new Scene(GRID_WIDTH, GRID_HEIGHT, currentPalette);
  renderer = new LayerRenderer();

  // Get layers
  const bgLayer = scene.getLayer(LAYER_BG);
  const midLayer = scene.getLayer(LAYER_MID);
  const fgLayer = scene.getLayer(LAYER_FG);

  // Create test pattern in layers
  const testChars = "─│┌┐└┘┬┴├┤┼━┃╔╗╚╝░▒▓█";

  // Background: border
  for (let y = 0; y < GRID_HEIGHT; y++) {
    for (let x = 0; x < GRID_WIDTH; x++) {
      if (y === 0 || y === GRID_HEIGHT - 1 || x === 0 || x === GRID_WIDTH - 1) {
        let ch = "│";
        if (y === 0 && x === 0) ch = "┌";
        else if (y === 0 && x === GRID_WIDTH - 1) ch = "┐";
        else if (y === GRID_HEIGHT - 1 && x === 0) ch = "└";
        else if (y === GRID_HEIGHT - 1 && x === GRID_WIDTH - 1) ch = "┘";
        else if (y === 0 || y === GRID_HEIGHT - 1) ch = "─";

        bgLayer.setCell(x, y, new Cell(ch, 7, -1));
      }
    }
  }

  // Middle: center text
  const centerY = Math.floor(GRID_HEIGHT / 2);
  const text = "TERMINAL DRAW - STEP 3 COMPLETE";
  const textX = Math.floor((GRID_WIDTH - text.length) / 2);
  for (let i = 0; i < text.length; i++) {
    midLayer.setCell(textX + i, centerY, new Cell(text[i], 3, -1));
  }

  // Foreground: box drawing characters
  //const testChars = "─│┌┐└┘┬┴├┤┼━┃╔╗╚╝░▒▓█";
  for (let i = 0; i < testChars.length && i < 20; i++) {
    fgLayer.setCell(30 + i, centerY + 2, new Cell(testChars[i], 6, -1));
    fgLayer.setCell(30 + i, centerY + 3, new Cell(testChars[i], 6, -1));
  }

  // Render all layers
  renderScene();

  updateStatus(
    `Ready • Grid: ${GRID_WIDTH}×${GRID_HEIGHT} • Hover over grid to test`,
  );
}

/**
 * Render the scene to DOM
 */
function renderScene() {
  if (!scene || !renderer) return;

  const bgContainer = document.getElementById("layer-bg");
  const midContainer = document.getElementById("layer-mid");
  const fgContainer = document.getElementById("layer-fg");

  if (!bgContainer || !midContainer || !fgContainer) {
    console.error("Layer containers not found");
    return;
  }

  renderer.render(scene.getLayer(LAYER_BG), bgContainer);
  renderer.render(scene.getLayer(LAYER_MID), midContainer);
  renderer.render(scene.getLayer(LAYER_FG), fgContainer);

  // Update overlay size to match rendered grid
  if (hitTestOverlay) {
    hitTestOverlay.updateOverlaySize();
  }
}

/**
 * Initialize hit test overlay and input handling
 */
function initInput() {
  const hitTestElement = document.getElementById("hit-test-layer");
  if (!hitTestElement) {
    console.error("❌ Hit test layer not found");
    return;
  }

  // Create state manager
  stateManager = new StateManager();

  // Create hit test overlay
  hitTestOverlay = new HitTestOverlay(
    hitTestElement,
    scene,
    stateManager,
    currentScale,
  );

  // Listen to hover events for visual feedback
  stateManager.on("cell:hover", handleCellHover);

  // Listen to cell interaction events for tools
  stateManager.on("cell:down", handleCellDown);
  stateManager.on("cell:drag", handleCellDrag);
  stateManager.on("cell:up", handleCellUp);

  // Listen to tool:picked events from picker tool
  stateManager.on("tool:picked", handleToolPicked);

  // Listen to cell:changed events to update DOM
  stateManager.on("cell:changed", handleCellChanged);

  // Initialize hover indicator
  hoverIndicator = document.getElementById("hover-indicator");
}

/**
 * Handle cell hover events - update status and visual feedback
 */
function handleCellHover(data) {
  if (data.x !== null && data.y !== null) {
    // Update status bar with coordinates
    updateStatus(
      `Cell: (${data.x}, ${data.y}) • Grid: ${GRID_WIDTH}×${GRID_HEIGHT} • Scale: ${currentScale}%`,
    );

    // Update hover indicator position
    updateHoverIndicator(data.x, data.y);
  } else {
    // Mouse left grid
    updateStatus(
      `Ready • Grid: ${GRID_WIDTH}×${GRID_HEIGHT} • Scale: ${currentScale}%`,
    );
    hideHoverIndicator();
  }
}

/**
 * Handle cell:down events - call current tool
 */
function handleCellDown(data) {
  if (!currentTool || !scene || !stateManager) return;
  currentTool.onCellDown(data.x, data.y, scene, stateManager, data);
}

/**
 * Handle cell:drag events - call current tool
 */
function handleCellDrag(data) {
  if (!currentTool || !scene || !stateManager) return;
  currentTool.onCellDrag(data.x, data.y, scene, stateManager, data);
}

/**
 * Handle cell:up events - call current tool
 */
function handleCellUp(data) {
  if (!currentTool || !scene || !stateManager) return;
  currentTool.onCellUp(data.x, data.y, scene, stateManager, data);
}

/**
 * Handle tool:picked events from picker tool
 */
function handleToolPicked(data) {
  if (!brushTool) return;

  // Update brush tool with picked cell
  brushTool.setCurrentCell(data.cell);

  // Auto-switch back to brush tool
  setCurrentTool(brushTool);

  updateStatus(
    `Picked: '${data.cell.ch}' (fg:${data.cell.fg}, bg:${data.cell.bg}) • Switched to Brush`,
  );
}

/**
 * Handle cell:changed events - update DOM
 */
function handleCellChanged(data) {
  if (!renderer || !scene) return;

  const layer = scene.getLayer(data.layerId);
  if (!layer) return;

  // Get the container for this layer
  const container = document.getElementById(`layer-${data.layerId}`);
  if (!container) return;

  // Update the cell in the DOM
  renderer.updateCell(layer, container, data.x, data.y);
}

/**
 * Update hover indicator position
 */
function updateHoverIndicator(x, y) {
  if (!hoverIndicator) return;

  // Get cell dimensions from hit test overlay
  const cellDimensions = hitTestOverlay.getCellDimensions();

  // Position the hover indicator
  hoverIndicator.style.left = `${x * cellDimensions.width}px`;
  hoverIndicator.style.top = `${y * cellDimensions.height}px`;
  hoverIndicator.classList.add("visible");
}

/**
 * Hide hover indicator
 */
function hideHoverIndicator() {
  if (!hoverIndicator) return;
  hoverIndicator.classList.remove("visible");
}

/**
 * Initialize tools
 */
function initTools() {
  // Create tool instances
  brushTool = new BrushTool({ ch: "█", fg: 7, bg: -1 });
  eraserTool = new EraserTool();
  pickerTool = new PickerTool();

  // Set initial tool
  setCurrentTool(brushTool);

  // Setup tool buttons
  const brushBtn = document.getElementById("tool-brush");
  const eraserBtn = document.getElementById("tool-eraser");
  const pickerBtn = document.getElementById("tool-picker");

  if (brushBtn) {
    brushBtn.addEventListener("click", () => setCurrentTool(brushTool));
  }
  if (eraserBtn) {
    eraserBtn.addEventListener("click", () => setCurrentTool(eraserTool));
  }
  if (pickerBtn) {
    pickerBtn.addEventListener("click", () => setCurrentTool(pickerTool));
  }
}

/**
 * Set the current active tool
 */
function setCurrentTool(tool) {
  currentTool = tool;

  // Update cursor
  if (hitTestOverlay) {
    hitTestOverlay.setCursor(tool.getCursor());
  }

  // Update button states
  const buttons = document.querySelectorAll('[id^="tool-"]');
  buttons.forEach((btn) => btn.classList.remove("active"));

  if (tool === brushTool) {
    document.getElementById("tool-brush")?.classList.add("active");
  } else if (tool === eraserTool) {
    document.getElementById("tool-eraser")?.classList.add("active");
  } else if (tool === pickerTool) {
    document.getElementById("tool-picker")?.classList.add("active");
  }

  updateStatus(
    `Tool: ${tool.name} • Grid: ${GRID_WIDTH}×${GRID_HEIGHT} • Scale: ${currentScale}%`,
  );
}

/**
 * Initialize layer panel UI
 */
function initLayerPanel() {
  const container = document.getElementById("layer-panel");
  if (!container) {
    console.error("Layer panel container not found");
    return;
  }

  layerPanel = new LayerPanel(container, scene, stateManager);

  // Listen to layer active changes to update status
  stateManager.on("layer:active", (data) => {
    updateStatus(
      `Layer: ${data.layerId.toUpperCase()} • Tool: ${currentTool.name} • Scale: ${currentScale}%`,
    );
  });
}

/**
 * Initialize interactive palette swatches
 */
function initInteractivePalette() {
  const swatches = document.querySelectorAll(".palette-swatch");

  swatches.forEach((swatch) => {
    // Left click = foreground
    swatch.addEventListener("click", (e) => {
      e.preventDefault();
      const color = parseInt(swatch.dataset.color);
      selectFgColor(color);
    });

    // Right click = background
    swatch.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      const color = parseInt(swatch.dataset.color);
      selectBgColor(color);
    });
  });

  // Listen to picker tool events
  stateManager.on("tool:picked", (data) => {
    if (data.cell) {
      selectFgColor(data.cell.fg);
      selectBgColor(data.cell.bg);
    }
  });

  // Initialize visual state
  updatePaletteSelection();
  updateColorPreview();
}

/**
 * Select foreground color
 */
function selectFgColor(colorIndex) {
  // Don't allow transparent foreground
  if (colorIndex === -1) {
    return;
  }

  selectedFg = colorIndex;

  // Update brush tool
  const currentCell = brushTool.getCurrentCell();
  brushTool.setCurrentCell({
    ...currentCell,
    fg: colorIndex,
  });

  // Update UI
  updatePaletteSelection();
  updateColorPreview();

  // Emit event
  stateManager.emit("color:fg-selected", { color: colorIndex });
}

/**
 * Select background color
 */
function selectBgColor(colorIndex) {
  selectedBg = colorIndex;

  // Update brush tool
  const currentCell = brushTool.getCurrentCell();
  brushTool.setCurrentCell({
    ...currentCell,
    bg: colorIndex,
  });

  // Update UI
  updatePaletteSelection();
  updateColorPreview();

  // Emit event
  stateManager.emit("color:bg-selected", { color: colorIndex });
}

/**
 * Update palette swatch selection visual indicators
 */
function updatePaletteSelection() {
  const swatches = document.querySelectorAll(".palette-swatch");

  swatches.forEach((swatch) => {
    const color = parseInt(swatch.dataset.color);

    // Remove existing classes
    swatch.classList.remove("selected-fg", "selected-bg");

    // Add classes for selected colors
    if (color === selectedFg) {
      swatch.classList.add("selected-fg");
    }
    if (color === selectedBg) {
      swatch.classList.add("selected-bg");
    }
  });
}

/**
 * Update color preview cell
 */
function updateColorPreview() {
  const previewCell = document.getElementById("color-preview");
  if (!previewCell) return;

  const currentCell = brushTool.getCurrentCell();

  previewCell.textContent = currentCell.ch || "█";
  previewCell.className = "preview-cell";
  previewCell.classList.add(`fg-${currentCell.fg}`);

  if (currentCell.bg >= 0) {
    previewCell.classList.add(`bg-${currentCell.bg}`);
  } else {
    previewCell.classList.add("bg--1");
  }
}

/**
 * Initialize glyph picker
 */
function initGlyphPicker() {
  const container = document.getElementById("glyph-picker-trigger");
  if (!container) {
    console.error("Glyph picker trigger container not found");
    return;
  }

  glyphPicker = new GlyphPicker(brushTool, stateManager);

  // Add trigger button to container
  const triggerButton = glyphPicker.getTriggerButton();
  container.appendChild(triggerButton);

  // Attach click handler to open modal
  triggerButton.addEventListener("click", () => {
    glyphPicker.open();
  });

  // Listen to glyph selection events to update preview
  stateManager.on("glyph:selected", () => {
    updateColorPreview();
  });
}

/**
 * Initialize all UI controls and apply defaults
 */
function init() {
  initScene();
  initInput();
  initTools();
  initLayerPanel();
  initInteractivePalette();
  initGlyphPicker();
  initScaleControls();
  initPaletteSelector();
}

// =============================================================================
// View Controls - Scaling
// =============================================================================

/**
 * Apply scale transform to grid
 */
function applyScale(scale) {
  const container = document.querySelector(".grid-container");
  if (!container) return;

  currentScale = scale;
  container.style.transform = `scale(${scale / 100})`;

  // Update hit test overlay scale
  if (hitTestOverlay) {
    hitTestOverlay.updateScale(scale);
  }

  // Update UI
  const scaleValue = document.getElementById("scale-value");
  const scaleSlider = document.getElementById("scale-slider");
  if (scaleValue) scaleValue.textContent = scale;
  if (scaleSlider) scaleSlider.value = scale;
}

/**
 * Calculate and apply optimal scale to fit viewport
 */
function scaleGridToFit() {
  const container = document.querySelector(".grid-container");
  const editor = document.getElementById("editor");
  const backgroundGrid = document.getElementById("background-grid");

  if (!container || !editor || !backgroundGrid) return;

  container.style.transform = "none";

  requestAnimationFrame(() => {
    const editorStyle = window.getComputedStyle(editor);
    const editorPadding = {
      left: parseFloat(editorStyle.paddingLeft),
      right: parseFloat(editorStyle.paddingRight),
      top: parseFloat(editorStyle.paddingTop),
      bottom: parseFloat(editorStyle.paddingBottom),
    };

    const gridRect = backgroundGrid.getBoundingClientRect();
    const editorRect = editor.getBoundingClientRect();

    const padding = 20;
    const availableWidth =
      editorRect.width - editorPadding.left - editorPadding.right - padding;
    const availableHeight =
      editorRect.height - editorPadding.top - editorPadding.bottom - padding;

    const scaleX = availableWidth / gridRect.width;
    const scaleY = availableHeight / gridRect.height;
    const scale = Math.min(scaleX, scaleY);

    const scalePercent = Math.max(10, Math.min(1000, Math.round(scale * 100)));
    applyScale(scalePercent);
  });
}

/**
 * Initialize scale controls and event listeners
 */
function initScaleControls() {
  const scaleToFitBtn = document.getElementById("scale-to-fit-btn");
  const scaleSlider = document.getElementById("scale-slider");

  if (scaleToFitBtn) {
    scaleToFitBtn.addEventListener("click", scaleGridToFit);
  }

  if (scaleSlider) {
    scaleSlider.addEventListener("input", (e) => {
      applyScale(parseInt(e.target.value));
    });
  }

  // Auto-fit on load
  scaleGridToFit();
}

// =============================================================================
// Palette Management
// =============================================================================

/**
 * Apply palette colors to CSS custom properties
 */
function applyPalette(paletteId) {
  const palette = palettes[paletteId];
  if (!palette) {
    console.error(`Palette "${paletteId}" not found`);
    return;
  }

  const root = document.documentElement;

  // Update foreground and background colors (same palette)
  palette.colors.forEach((color, index) => {
    root.style.setProperty(`--color-fg-${index}`, color);
    root.style.setProperty(`--color-bg-${index}`, color);
  });

  currentPalette = paletteId;

  // Update scene palette if it exists
  if (scene) {
    scene.paletteId = paletteId;
  }

  updatePaletteSwatches();
}

/**
 * Update palette swatch colors in UI
 */
function updatePaletteSwatches() {
  const swatches = document.querySelectorAll(".palette-swatch");
  swatches.forEach((swatch, index) => {
    const colorIndex = swatch.getAttribute("data-color");
    const color = getComputedStyle(document.documentElement).getPropertyValue(
      `--color-fg-${colorIndex}`,
    );
    swatch.style.backgroundColor = color;
  });
}

/**
 * Initialize palette selector and apply default
 */
function initPaletteSelector() {
  const selector = document.getElementById("palette-selector");

  if (selector) {
    selector.addEventListener("change", (e) => {
      applyPalette(e.target.value);
    });
  }

  applyPalette(currentPalette);
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Update status bar text
 */
function updateStatus(message) {
  const status = document.getElementById("status");
  if (status) status.textContent = message;
}

// =============================================================================
// Application Entry Point
// =============================================================================

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
