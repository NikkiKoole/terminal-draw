/**
 * Terminal Draw - Main Application Entry Point
 * ASCII Art Editor with cell-based rendering
 */

import palettes from "./palettes.json";

// =============================================================================
// Configuration & State
// =============================================================================

const GRID_WIDTH = 80;
const GRID_HEIGHT = 25;

let currentPalette = "default";
let currentScale = 100;

// =============================================================================
// Initialization
// =============================================================================

/**
 * Initialize test pattern to demonstrate rendering
 * TODO: Replace with actual scene rendering in Step 2
 */
function initTestPattern() {
  const bgLayer = document.getElementById("layer-bg");
  if (!bgLayer) {
    console.error("layer-bg not found");
    return;
  }

  const testChars = "─│┌┐└┘┬┴├┤┼━┃╔╗╚╝░▒▓█";

  for (let y = 0; y < GRID_HEIGHT; y++) {
    const rowDiv = document.createElement("div");
    rowDiv.className = "grid-row";

    for (let x = 0; x < GRID_WIDTH; x++) {
      const cell = document.createElement("span");
      cell.className = "cell";

      // Border
      if (y === 0 || y === GRID_HEIGHT - 1 || x === 0 || x === GRID_WIDTH - 1) {
        if (y === 0 && x === 0) cell.textContent = "┌";
        else if (y === 0 && x === GRID_WIDTH - 1) cell.textContent = "┐";
        else if (y === GRID_HEIGHT - 1 && x === 0) cell.textContent = "└";
        else if (y === GRID_HEIGHT - 1 && x === GRID_WIDTH - 1)
          cell.textContent = "┘";
        else if (y === 0 || y === GRID_HEIGHT - 1) cell.textContent = "─";
        else cell.textContent = "│";
        cell.classList.add("fg-7");
      }
      // Center text
      else if (y === Math.floor(GRID_HEIGHT / 2) && x >= 25 && x <= 54) {
        const text = "TERMINAL DRAW - FONT TEST";
        cell.textContent = text[x - 25] || " ";
        cell.classList.add("fg-3");
      }
      // Box drawing characters
      else if (y === Math.floor(GRID_HEIGHT / 2) + 2 && x >= 30 && x < 50) {
        cell.textContent = testChars[x - 30] || " ";
        cell.classList.add("fg-6");
      }
      // Empty
      else {
        cell.textContent = " ";
        cell.classList.add("fg-7");
      }

      rowDiv.appendChild(cell);
    }

    bgLayer.appendChild(rowDiv);
  }

  updateStatus(`Ready • Grid: ${GRID_WIDTH}×${GRID_HEIGHT} • Step 1 Complete`);
}

/**
 * Initialize all UI controls and apply defaults
 */
function init() {
  initTestPattern();
  initScaleControls();
  initPaletteSelector();
  console.log("✓ Terminal Draw initialized");
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
