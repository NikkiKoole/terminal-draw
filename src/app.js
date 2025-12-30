/**
 * Terminal Draw - Main Application Entry Point
 * ASCII Art Editor with cell-based rendering
 */

import palettes from "./palettes.json";
import { Scene } from "./core/Scene.js";
import { Cell } from "./core/Cell.js";
import { LayerRenderer } from "./rendering/LayerRenderer.js";
import { LAYER_BG, LAYER_MID, LAYER_FG } from "./core/constants.js";

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
  for (let i = 0; i < testChars.length && i < 20; i++) {
    fgLayer.setCell(30 + i, centerY + 2, new Cell(testChars[i], 6, -1));
  }

  // Render all layers
  renderScene();

  updateStatus(`Ready • Grid: ${GRID_WIDTH}×${GRID_HEIGHT} • Step 3 Complete`);
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
}

/**
 * Initialize all UI controls and apply defaults
 */
function init() {
  initScene();
  initScaleControls();
  initPaletteSelector();
  console.log("✓ Terminal Draw initialized (Step 3 Complete)");
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
