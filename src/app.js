/**
 * Terminal Draw - Main Application Entry Point
 * ASCII Art Editor with cell-based rendering
 */

import palettes from "./palettes.json";
console.log(palettes);
import { Scene } from "./core/Scene.js";
import { Cell } from "./core/Cell.js";
import { LayerRenderer } from "./rendering/LayerRenderer.js";
import { StateManager } from "./core/StateManager.js";
import { HitTestOverlay } from "./input/HitTestOverlay.js";
import {
  LAYER_BG,
  LAYER_MID,
  LAYER_FG,
  DEFAULT_TEMPLATE_ID,
} from "./core/constants.js";
import { BrushTool } from "./tools/BrushTool.js";
import { EraserTool } from "./tools/EraserTool.js";
import { PickerTool } from "./tools/PickerTool.js";
import { SprayTool } from "./tools/SprayTool.js";
import { RectangleTool } from "./tools/RectangleTool.js";
import { LineTool } from "./tools/LineTool.js";
import { LayerPanel } from "./ui/LayerPanel.js";
import { GlyphPicker } from "./ui/GlyphPicker.js";
import { ClipboardManager } from "./export/ClipboardManager.js";
import { ProjectManager } from "./io/ProjectManager.js";
import { CommandHistory } from "./commands/CommandHistory.js";
import { ResizeCommand } from "./commands/ResizeCommand.js";
import { ClearCommand } from "./commands/ClearCommand.js";
import { GridResizer } from "./core/GridResizer.js";
import { StartupDialog } from "./ui/StartupDialog.js";
import { PROJECT_TEMPLATES, getTemplate } from "./core/ProjectTemplate.js";

import { addBorderToScene, isValidBorderStyle } from "./core/BorderUtils.js";

// =============================================================================
// Configuration & State
// =============================================================================

let GRID_WIDTH = 80;
let GRID_HEIGHT = 25;

let currentPalette = "default";
let currentScale = 100;

// Command History
let commandHistory;

// Scene and Renderer
let scene = null;
let renderer = null;
let stateManager = null;
let hitTestOverlay = null;

// Tools
let brushTool = null;
let eraserTool = null;
let pickerTool = null;
let sprayTool = null;
let rectangleTool = null;
let lineTool = null;
let currentTool = null;

// Startup Dialog
let startupDialog = null;

// UI Components
let layerPanel = null;
let glyphPicker = null;
let clipboardManager = null;
let projectManager = null;

// Color selection state
let selectedFg = 7;
let selectedBg = -1;

// Hover indicator element
let hoverIndicator = null;
let anchorIndicator = null;

// =============================================================================
// Scene Management
// =============================================================================

/**
 * Initialize scene with test pattern
 */
function initScene() {
  // Create scene with default template (advanced 3-layer setup for compatibility)
  scene = new Scene(GRID_WIDTH, GRID_HEIGHT, currentPalette);
  renderer = new LayerRenderer();

  // Create dynamic layer containers
  createLayerContainers();

  // Create test pattern in layers (flexible for any layer count)
  createTestPattern();

  console.log(`Scene initialized with ${scene.layers.length} layers`);
}

/**
 * Initialize scene from template configuration
 */
function initSceneFromTemplate(config) {
  const { template, dimensions, palette, border } = config;

  // Update global dimensions
  GRID_WIDTH = dimensions.w;
  GRID_HEIGHT = dimensions.h;
  currentPalette = palette;

  // Get template object
  const templateObj = getTemplate(template);
  if (!templateObj) {
    console.error(`Template not found: ${template}`);
    return;
  }

  // Create scene from template
  scene = Scene.fromTemplate(templateObj, dimensions.w, dimensions.h, palette);
  renderer = new LayerRenderer();

  // Add border if enabled
  if (border && border.enabled) {
    const borderStyle = isValidBorderStyle(border.style)
      ? border.style
      : "single";
    try {
      addBorderToScene(scene, borderStyle, 7, -1);
      console.log(`Added ${borderStyle} border to scene`);
    } catch (error) {
      console.error("Failed to add border:", error);
    }
  }

  // Create dynamic layer containers
  createLayerContainers();

  // Apply palette
  applyPalette(palette);

  // Render scene to update grid dimensions and visual display
  renderScene();

  console.log(
    `Scene created from template '${template}' with ${scene.layers.length} layers (${dimensions.w}×${dimensions.h})${border?.enabled ? " with border" : ""}`,
  );
}

/**
 * Create test pattern that works with any number of layers
 */
function createTestPattern() {
  if (scene.layers.length === 0) return;

  const testChars = "─│┌┐└┘┬┴├┤┼━┃╔╗╚╝░▒▓█";
  const centerY = Math.floor(GRID_HEIGHT / 2);

  // Use first layer for border (usually background)
  const firstLayer = scene.layers[0];
  if (firstLayer) {
    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        if (
          y === 0 ||
          y === GRID_HEIGHT - 1 ||
          x === 0 ||
          x === GRID_WIDTH - 1
        ) {
          let ch = "│";
          if (y === 0 && x === 0) ch = "┌";
          else if (y === 0 && x === GRID_WIDTH - 1) ch = "┐";
          else if (y === GRID_HEIGHT - 1 && x === 0) ch = "└";
          else if (y === GRID_HEIGHT - 1 && x === GRID_WIDTH - 1) ch = "┘";
          else if (y === 0 || y === GRID_HEIGHT - 1) ch = "─";

          firstLayer.setCell(x, y, new Cell(ch, 7, -1));
        }
      }
    }
  }

  // Use middle layer for text (if available)
  if (scene.layers.length >= 2) {
    const middleLayer = scene.layers[Math.floor(scene.layers.length / 2)];
    const text = `TERMINAL DRAW - ${scene.layers.length} LAYERS`;
    const textX = Math.floor((GRID_WIDTH - text.length) / 2);
    for (let i = 0; i < text.length; i++) {
      middleLayer.setCell(textX + i, centerY, new Cell(text[i], 3, -1));
    }
  }

  // Use last layer for decorations (usually foreground)
  if (scene.layers.length >= 2) {
    const lastLayer = scene.layers[scene.layers.length - 1];
    for (let i = 0; i < testChars.length && i < 20; i++) {
      lastLayer.setCell(30 + i, centerY + 2, new Cell(testChars[i], 6, -1));
      lastLayer.setCell(30 + i, centerY + 3, new Cell(testChars[i], 6, -1));
    }
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
/**
 * Update CSS custom properties for grid dimensions
 */
function updateGridDimensions() {
  if (!scene) return;

  const root = document.documentElement;
  root.style.setProperty("--grid-w", scene.w);
  root.style.setProperty("--grid-h", scene.h);
}
// =============================================================================
// Dynamic Layer Management
// =============================================================================

/**
 * Create layer containers dynamically based on scene layers
 */
function createLayerContainers() {
  const gridStack = document.querySelector(".grid-stack");
  if (!gridStack) {
    console.error("Grid stack container not found");
    return;
  }

  if (!scene) {
    console.error("Scene not available for creating layer containers");
    return;
  }

  // Clear existing layer containers (except background and hit-test)
  const existingLayers = gridStack.querySelectorAll(".visual-layer");
  existingLayers.forEach((layer) => {
    // Force immediate removal with innerHTML clear
    layer.innerHTML = "";
    layer.remove();
  });

  // Create containers for each layer in the scene
  scene.layers.forEach((layer, index) => {
    const container = document.createElement("div");
    container.id = `layer-${layer.id}`;
    container.className = "visual-layer";
    container.setAttribute("data-layer", layer.id);
    container.style.zIndex = 100 + index; // Ensure proper stacking order

    // Insert before the hit-test overlay (which should be on top)
    const hitTestOverlay = gridStack.querySelector(".hit-test-overlay");
    if (hitTestOverlay) {
      gridStack.insertBefore(container, hitTestOverlay);
    } else {
      gridStack.appendChild(container);
    }
  });
}

// =============================================================================
// Rendering Functions
// =============================================================================

function renderScene() {
  if (!scene || !renderer) return;

  updateGridDimensions();

  // Get all current layer containers
  const allLayerContainers = document.querySelectorAll(".visual-layer");
  const currentLayerIds = new Set(scene.layers.map((layer) => layer.id));

  // Remove orphaned layer containers (for layers that no longer exist)
  allLayerContainers.forEach((container) => {
    const layerId = container.getAttribute("data-layer");
    if (!currentLayerIds.has(layerId)) {
      console.warn(`Removing orphaned layer container: ${layerId}`);
      container.remove();
    }
  });

  // Render each layer dynamically
  scene.layers.forEach((layer) => {
    const container = document.getElementById(`layer-${layer.id}`);
    if (container) {
      renderer.render(layer, container);
      // Update layer visibility
      if (layer.visible) {
        container.classList.remove("hidden");
      } else {
        container.classList.add("hidden");
      }
    } else {
      console.warn(`Container not found for layer: ${layer.id}`);
    }
  });

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

  // Listen for rectangle tool anchor events
  stateManager.on("rectangle:anchor", (data) => {
    if (data.x !== null && data.y !== null) {
      showAnchorIndicator(data.x, data.y);
    } else {
      hideAnchorIndicator();
    }
  });

  // Listen for line tool anchor events
  stateManager.on("line:anchor", (data) => {
    if (data.x !== null && data.y !== null) {
      showAnchorIndicator(data.x, data.y);
    } else {
      hideAnchorIndicator();
    }
  });

  // Listen to tool:picked events from picker tool
  stateManager.on("tool:picked", handleToolPicked);

  // Listen to cell:changed events to update DOM
  stateManager.on("cell:changed", handleCellChanged);

  // Initialize hover indicator
  hoverIndicator = document.getElementById("hover-indicator");
  anchorIndicator = document.getElementById("anchor-indicator");
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
 * Show anchor indicator at specific cell (for rectangle start point)
 */
function showAnchorIndicator(x, y) {
  if (!anchorIndicator) return;

  // Get cell dimensions from hit test overlay
  const cellDimensions = hitTestOverlay.getCellDimensions();

  // Position the anchor indicator
  anchorIndicator.style.left = `${x * cellDimensions.width}px`;
  anchorIndicator.style.top = `${y * cellDimensions.height}px`;
  anchorIndicator.classList.add("visible");
}

/**
 * Hide anchor indicator
 */
function hideAnchorIndicator() {
  if (!anchorIndicator) return;
  anchorIndicator.classList.remove("visible");
}

/**
 * Initialize tools
 */
function initTools() {
  // Create tool instances with command history
  brushTool = new BrushTool({ ch: "█", fg: 7, bg: -1 }, commandHistory);
  eraserTool = new EraserTool(commandHistory);
  pickerTool = new PickerTool(commandHistory);
  sprayTool = new SprayTool({ ch: ".", fg: 7, bg: -1 }, commandHistory);
  rectangleTool = new RectangleTool({ ch: "█", fg: 7, bg: -1 }, commandHistory);
  lineTool = new LineTool({ ch: "█", fg: 7, bg: -1 }, commandHistory);

  // Set initial tool
  setCurrentTool(brushTool);

  // Setup tool buttons
  const brushBtn = document.getElementById("tool-brush");
  const eraserBtn = document.getElementById("tool-eraser");
  const pickerBtn = document.getElementById("tool-picker");
  const sprayBtn = document.getElementById("tool-spray");
  const rectangleBtn = document.getElementById("tool-rectangle");
  const lineBtn = document.getElementById("tool-line");

  if (brushBtn) {
    brushBtn.addEventListener("click", () => setCurrentTool(brushTool));
  }
  if (eraserBtn) {
    eraserBtn.addEventListener("click", () => setCurrentTool(eraserTool));
  }
  if (pickerBtn) {
    pickerBtn.addEventListener("click", () => setCurrentTool(pickerTool));
  }
  if (sprayBtn) {
    sprayBtn.addEventListener("click", () => setCurrentTool(sprayTool));
  }
  if (rectangleBtn) {
    rectangleBtn.addEventListener("click", () => setCurrentTool(rectangleTool));
  }
  if (lineBtn) {
    lineBtn.addEventListener("click", () => setCurrentTool(lineTool));
  }

  // Keyboard shortcuts
  initKeyboardShortcuts();
}

/**
 * Initialize keyboard shortcuts for tools
 */
function initKeyboardShortcuts() {
  document.addEventListener("keydown", (e) => {
    // Don't trigger shortcuts if user is typing in an input/textarea
    if (e.target.matches("input, textarea")) {
      return;
    }

    // Undo/Redo shortcuts
    if (
      (e.ctrlKey || e.metaKey) &&
      !e.shiftKey &&
      e.key.toLowerCase() === "z"
    ) {
      e.preventDefault();
      if (commandHistory && commandHistory.canUndo()) {
        commandHistory.undo();
        updateUndoRedoButtons();
      }
      return;
    }

    if (
      (e.ctrlKey || e.metaKey) &&
      (e.key.toLowerCase() === "y" ||
        (e.shiftKey && e.key.toLowerCase() === "z"))
    ) {
      e.preventDefault();
      if (commandHistory && commandHistory.canRedo()) {
        commandHistory.redo();
        updateUndoRedoButtons();
      }
      return;
    }

    // Tool shortcuts
    switch (e.key.toLowerCase()) {
      case "b":
        setCurrentTool(brushTool);
        break;
      case "e":
        setCurrentTool(eraserTool);
        break;
      case "p":
        setCurrentTool(pickerTool);
        break;
      case "s":
        setCurrentTool(sprayTool);
        break;
      case "r":
        setCurrentTool(rectangleTool);
        break;
      case "l":
        setCurrentTool(lineTool);
        break;
    }
  });
}

/**
 * Cycle through layers (fg -> mid -> bg -> fg)
 */
function cycleLayer() {
  if (!scene) return;

  const layers = ["fg", "mid", "bg"];
  const currentIndex = layers.indexOf(scene.activeLayerId);
  const nextIndex = (currentIndex + 1) % layers.length;
  const nextLayerId = layers[nextIndex];

  scene.setActiveLayer(nextLayerId);
  stateManager.emit("layer:active", { layerId: nextLayerId });

  // Update layer panel if it exists
  if (layerPanel) {
    layerPanel.render();
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
  } else if (tool === sprayTool) {
    document.getElementById("tool-spray")?.classList.add("active");
  } else if (tool === rectangleTool) {
    document.getElementById("tool-rectangle")?.classList.add("active");
  } else if (tool === lineTool) {
    document.getElementById("tool-line")?.classList.add("active");
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

  // Listen to layer structure changes to recreate containers
  stateManager.on("layers:structure_changed", () => {
    createLayerContainers();
    renderScene();
  });

  // Listen to layer removal for immediate cleanup
  stateManager.on("layer:removed", (data) => {
    // Immediate synchronous removal
    const layerElement = document.getElementById(`layer-${data.layerId}`);
    if (layerElement) {
      layerElement.innerHTML = ""; // Clear content immediately
      layerElement.remove();
      console.log(`Immediately removed layer container: ${data.layerId}`);
    }
  });

  // Listen to layer visibility changes to update DOM
  stateManager.on("layer:visibility", (data) => {
    const layerElement = document.getElementById(`layer-${data.layerId}`);
    if (layerElement) {
      if (data.visible) {
        layerElement.classList.remove("hidden");
      } else {
        layerElement.classList.add("hidden");
      }
    }
  });

  // Listen to scene updates that might affect layers
  stateManager.on("scene:updated", (data) => {
    if (
      data.reason === "layer_added" ||
      data.reason === "layer_removed" ||
      data.reason === "layer_reordered"
    ) {
      renderScene();
    }
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

  // Update spray tool
  if (sprayTool) {
    const sprayCell = sprayTool.getCurrentCell();
    sprayTool.setCurrentCell({
      ...sprayCell,
      fg: colorIndex,
    });
  }

  // Update rectangle tool
  if (rectangleTool) {
    const rectangleCell = rectangleTool.getCurrentCell();
    rectangleTool.setCurrentCell({
      ...rectangleCell,
      fg: colorIndex,
    });
  }

  // Update line tool
  if (lineTool) {
    const lineCell = lineTool.getCurrentCell();
    lineTool.setCurrentCell({
      ...lineCell,
      fg: colorIndex,
    });
  }

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

  // Update spray tool (preserve background for spray tool)
  if (sprayTool) {
    const sprayCell = sprayTool.getCurrentCell();
    sprayTool.setCurrentCell({
      ...sprayCell,
      bg: colorIndex,
    });
  }

  // Update rectangle tool
  if (rectangleTool) {
    const rectangleCell = rectangleTool.getCurrentCell();
    rectangleTool.setCurrentCell({
      ...rectangleCell,
      bg: colorIndex,
    });
  }

  // Update line tool
  if (lineTool) {
    const lineCell = lineTool.getCurrentCell();
    lineTool.setCurrentCell({
      ...lineCell,
      bg: colorIndex,
    });
  }

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

  // Listen to glyph selection events to update preview and sync tools
  stateManager.on("glyph:selected", (data) => {
    // Sync character to spray tool
    if (sprayTool && data.char) {
      const sprayCell = sprayTool.getCurrentCell();
      sprayTool.setCurrentCell({
        ...sprayCell,
        ch: data.char,
      });
    }

    // Sync character to rectangle tool
    if (rectangleTool && data.char) {
      const rectangleCell = rectangleTool.getCurrentCell();
      rectangleTool.setCurrentCell({
        ...rectangleCell,
        ch: data.char,
      });
    }

    // Sync character to line tool
    if (lineTool && data.char) {
      const lineCell = lineTool.getCurrentCell();
      lineTool.setCurrentCell({
        ...lineCell,
        ch: data.char,
      });
    }

    updateColorPreview();
  });
}

/**
 * Initialize clipboard export functionality
 */
function initClipboard() {
  clipboardManager = new ClipboardManager(scene, stateManager);

  const exportTextBtn = document.getElementById("export-text");
  const exportAnsiBtn = document.getElementById("export-ansi");
  const exportLayerBtn = document.getElementById("export-layer");
  const exportStatus = document.getElementById("export-status");

  // Copy as plain text
  if (exportTextBtn) {
    exportTextBtn.addEventListener("click", async () => {
      const result = await clipboardManager.copyPlainText();
      showExportStatus(result, exportStatus);
    });
  }

  // Copy as ANSI
  if (exportAnsiBtn) {
    exportAnsiBtn.addEventListener("click", async () => {
      const result = await clipboardManager.copyAnsi();
      showExportStatus(result, exportStatus);
    });
  }

  // Copy current layer only
  if (exportLayerBtn) {
    exportLayerBtn.addEventListener("click", async () => {
      const layerId = scene.activeLayerId;
      const result = await clipboardManager.copyLayerText(layerId);
      showExportStatus(result, exportStatus, layerId);
    });
  }

  // Listen to export events for additional feedback
  stateManager.on("export:success", (data) => {
    console.log("Export successful:", data);
  });

  stateManager.on("export:error", (data) => {
    console.error("Export failed:", data.error);
  });
}

/**
 * Show export status message
 */
function showExportStatus(result, statusElement, layerId = null) {
  if (!statusElement) return;

  statusElement.classList.remove("hidden", "error");

  if (result.success) {
    const format = layerId ? `Layer ${layerId.toUpperCase()}` : "Artwork";
    statusElement.textContent = `✅ Copied ${format}! (${result.charCount} chars, ${result.lineCount} lines)`;
    statusElement.classList.remove("error");
  } else {
    statusElement.textContent = `❌ Error: ${result.error}`;
    statusElement.classList.add("error");
  }

  // Hide after 3 seconds
  setTimeout(() => {
    statusElement.classList.add("hidden");
  }, 3000);
}

/**
 * Initialize project manager and file operations
 */
function initProject() {
  projectManager = new ProjectManager(scene, stateManager);

  const newBtn = document.getElementById("new-project");
  const saveBtn = document.getElementById("save-project");
  const loadBtn = document.getElementById("load-project");
  const fileInput = document.getElementById("file-input");
  const dropzone = document.getElementById("dropzone");
  const projectStatus = document.getElementById("project-status");

  // New project
  if (newBtn) {
    newBtn.addEventListener("click", () => {
      newProject();
    });
  }

  // Save project
  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      const filename = prompt("Project name:", "my-artwork");
      if (filename) {
        const result = projectManager.saveToFile(filename);
        showProjectStatus(result, projectStatus);
      }
    });
  }

  // Load project (file picker)
  if (loadBtn && fileInput) {
    loadBtn.addEventListener("click", () => {
      fileInput.click();
    });

    fileInput.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (file) {
        await loadProjectFile(file, projectStatus);
      }
      // Reset input so same file can be loaded again
      fileInput.value = "";
    });
  }

  // Dropzone functionality
  if (dropzone) {
    // Prevent default drag behaviors
    ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
      dropzone.addEventListener(eventName, preventDefaults, false);
      document.body.addEventListener(eventName, preventDefaults, false);
    });

    // Highlight dropzone when dragging over it
    ["dragenter", "dragover"].forEach((eventName) => {
      dropzone.addEventListener(eventName, () => {
        dropzone.classList.add("drag-over");
      });
    });

    ["dragleave", "drop"].forEach((eventName) => {
      dropzone.addEventListener(eventName, () => {
        dropzone.classList.remove("drag-over");
      });
    });

    // Handle dropped files
    dropzone.addEventListener("drop", async (e) => {
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        await loadProjectFile(files[0], projectStatus);
      }
    });

    // Also allow clicking on dropzone
    dropzone.addEventListener("click", () => {
      fileInput.click();
    });
  }

  // Listen to project events
  stateManager.on("project:saved", (data) => {
    console.log("Project saved:", data);
  });

  stateManager.on("project:loaded", (data) => {
    console.log("Project loaded:", data);
  });

  stateManager.on("project:error", (data) => {
    console.error("Project error:", data.error);
  });
}

/**
 * Prevent default drag/drop behavior
 */
function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}

/**
 * Load project from file
 */
async function loadProjectFile(file, statusElement) {
  // Confirm if user wants to lose current work
  const confirmed = confirm(
    "Loading a project will replace your current work. Continue?",
  );

  if (!confirmed) {
    return;
  }

  const result = await projectManager.loadFromFile(file);

  if (result.success) {
    // Replace current scene
    replaceScene(result.scene);
    showProjectStatus(result, statusElement);
  } else {
    showProjectStatus(result, statusElement);
  }
}

/**
 * Replace current scene with a new one
 */
function replaceScene(newScene) {
  // Update scene reference
  scene = newScene;

  // Update all components that reference the scene
  if (projectManager) {
    projectManager.scene = scene;
  }
  if (clipboardManager) {
    clipboardManager.scene = scene;
  }

  // Clear command history when loading new scene
  if (commandHistory) {
    commandHistory.clear();
  }

  // Re-render all layers
  renderScene();

  // Update layer panel
  if (layerPanel) {
    layerPanel.scene = scene;
    layerPanel.render();
  }

  // Update hit test overlay
  if (hitTestOverlay) {
    hitTestOverlay.scene = scene;
    hitTestOverlay.updateOverlaySize();
  }

  // Apply the palette from loaded scene
  applyPalette(scene.paletteId);
}

/**
 * Update all tools with current command history reference
 */
function updateToolsCommandHistory() {
  if (brushTool && commandHistory) {
    brushTool.setCommandHistory(commandHistory);
  }
  if (eraserTool && commandHistory) {
    eraserTool.setCommandHistory(commandHistory);
  }
  if (pickerTool && commandHistory) {
    pickerTool.setCommandHistory(commandHistory);
  }
  if (sprayTool && commandHistory) {
    sprayTool.setCommandHistory(commandHistory);
  }
  if (rectangleTool && commandHistory) {
    rectangleTool.setCommandHistory(commandHistory);
  }
  if (lineTool && commandHistory) {
    lineTool.setCommandHistory(commandHistory);
  }
}

/**
 * Show project status message
 */
function showProjectStatus(result, statusElement) {
  if (!statusElement) return;

  statusElement.classList.remove("hidden", "error");

  if (result.success) {
    if (result.filename) {
      // Load success
      statusElement.textContent = `✅ Loaded: ${result.name}`;
    } else {
      // Save success
      const kb = Math.round(result.size / 1024);
      statusElement.textContent = `✅ Saved: ${result.name} (${kb} KB)`;
    }
    statusElement.classList.remove("error");
  } else {
    statusElement.textContent = `❌ Error: ${result.error}`;
    statusElement.classList.add("error");
  }

  // Hide after 3 seconds
  setTimeout(() => {
    statusElement.classList.add("hidden");
  }, 3000);
}

/**
 * Initialize I/O panel toggle
 */
let ioInitialized = false;
function initIOPanel() {
  if (ioInitialized) return; // Prevent duplicate initialization

  const ioToggle = document.getElementById("io-toggle");
  const ioPanel = document.getElementById("io-panel");

  if (ioToggle && ioPanel) {
    // Toggle panel on button click
    ioToggle.addEventListener("click", () => {
      ioPanel.classList.toggle("hidden");
      ioToggle.classList.toggle("active");
    });

    // Close panel when clicking outside
    document.addEventListener("click", (e) => {
      if (
        !ioPanel.contains(e.target) &&
        !ioToggle.contains(e.target) &&
        !ioPanel.classList.contains("hidden")
      ) {
        ioPanel.classList.add("hidden");
        ioToggle.classList.remove("active");
      }
    });

    // Close panel on Escape key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !ioPanel.classList.contains("hidden")) {
        ioPanel.classList.add("hidden");
        ioToggle.classList.remove("active");
      }
    });

    ioInitialized = true;
  }
}

/**
 * Initialize all UI controls and apply defaults
 */
function init() {
  // Initialize startup dialog first
  initStartupDialog();

  // Check if we should show startup dialog or use last project
  if (shouldShowStartupDialog()) {
    showStartupDialog();
  } else {
    // Initialize with default scene for now (will be replaced by startup dialog flow)
    initScene();
    initUIComponents();
  }
}

/**
 * Initialize UI components after scene is created
 */
function initUIComponents() {
  initInput();
  initCommandHistory();
  initTools();
  initKeyboardShortcuts();
  initLayerPanel();
  initInteractivePalette();
  initGlyphPicker();
  initPaintMode();
  initSmartDrawingMode();
  initClipboard();
  initProject();
  initIOPanel();
  initGridResize();
  initClearOperations();
  initScaleControls();
  initPaletteSelector();

  // Mark body as loaded to prevent FOUC
  document.body.classList.add("loaded");
}

/**
 * Initialize startup dialog
 */
function initStartupDialog() {
  startupDialog = new StartupDialog();
  startupDialog.setOnTemplateSelect((config) => {
    initSceneFromTemplate(config);
    initUIComponents();
  });
}

/**
 * Show startup dialog
 */
function showStartupDialog() {
  startupDialog.show();
}

/**
 * Determine if we should show startup dialog
 */
function shouldShowStartupDialog() {
  // Always show startup dialog for now - can add logic for recent projects later
  return true;
}

/**
 * Create new project (show startup dialog)
 */
function newProject() {
  if (startupDialog) {
    startupDialog.show();
  }
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
    // Clear existing options
    selector.innerHTML = "";

    // Populate options dynamically from palettes.json
    Object.keys(palettes).forEach((paletteId) => {
      const option = document.createElement("option");
      option.value = paletteId;
      option.textContent = palettes[paletteId].name;

      // Mark default palette as selected
      if (paletteId === currentPalette) {
        option.selected = true;
      }

      selector.appendChild(option);
    });

    selector.addEventListener("change", (e) => {
      applyPalette(e.target.value);
    });
  }

  applyPalette(currentPalette);
}

/**
 * Initialize smart drawing mode dropdown
 */
function initSmartDrawingMode() {
  const selector = document.getElementById("smart-drawing-mode");

  if (selector && brushTool) {
    selector.addEventListener("change", (e) => {
      const mode = e.target.value;
      brushTool.setDrawingMode(mode);
      if (rectangleTool) {
        rectangleTool.setDrawingMode(mode);
      }
      if (lineTool) {
        lineTool.setDrawingMode(mode);
      }

      let statusMessage = `Drawing Mode: ${mode.charAt(0).toUpperCase() + mode.slice(1)}`;
      if (mode === "single") {
        statusMessage += " Line (Smart Box-Drawing)";
      } else if (mode === "double") {
        statusMessage += " Line (Smart Box-Drawing)";
      }

      updateStatus(statusMessage);
    });

    // Set initial mode
    brushTool.setDrawingMode("normal");
    if (rectangleTool) {
      rectangleTool.setDrawingMode("normal");
    }
    if (lineTool) {
      lineTool.setDrawingMode("normal");
    }
  }
}

/**
 * Initialize paint mode toggle button
 */
function initPaintMode() {
  const toggleBtn = document.getElementById("paint-mode-toggle");

  if (toggleBtn && brushTool) {
    toggleBtn.addEventListener("click", () => {
      const newMode = brushTool.cyclePaintMode();
      if (rectangleTool) {
        rectangleTool.setPaintMode(newMode);
      }
      if (lineTool) {
        lineTool.setPaintMode(newMode);
      }
      if (eraserTool) {
        eraserTool.setPaintMode(newMode);
      }

      // Update button text based on mode
      const modeLabels = {
        all: "🎨 All",
        fg: "F FG",
        bg: "B BG",
        glyph: "G Char",
      };

      toggleBtn.textContent = modeLabels[newMode] || "🎨 All";

      // Update status message
      const modeDescriptions = {
        all: "Paint all attributes (glyph + colors)",
        fg: "Paint foreground color only",
        bg: "Paint background color only",
        glyph: "Paint glyph character only",
      };

      updateStatus(`Paint Mode: ${modeDescriptions[newMode]}`);
    });

    // Set initial mode
    brushTool.setPaintMode("all");
    if (rectangleTool) {
      rectangleTool.setPaintMode("all");
    }
    if (lineTool) {
      lineTool.setPaintMode("all");
    }
    if (eraserTool) {
      eraserTool.setPaintMode("all");
    }
  }
}

/**
 * Initialize command history system
 */
function initCommandHistory() {
  commandHistory = new CommandHistory({
    maxSize: 50,
    stateManager: stateManager,
  });

  // Update tools with command history reference
  updateToolsCommandHistory();

  // Initialize undo/redo buttons
  initUndoRedoButtons();

  // Listen for history events
  stateManager.on("history:changed", (status) => {
    console.log("History changed:", status);
    updateUndoRedoButtons();
  });

  stateManager.on("history:executed", (data) => {
    console.log("Command executed:", data.command.description);
    updateStatus(`Executed: ${data.command.description}`);
    updateUndoRedoButtons();
    // Re-render affected areas after command execution
    renderScene();
  });

  stateManager.on("history:undone", (data) => {
    console.log("Command undone:", data.command.description);
    updateStatus(`Undid: ${data.command.description}`);
    updateUndoRedoButtons();
    // Re-render affected areas after undo
    renderScene();
  });

  stateManager.on("history:redone", (data) => {
    console.log("Command redone:", data.command.description);
    updateStatus(`Redid: ${data.command.description}`);
    updateUndoRedoButtons();
    // Re-render affected areas after redo
    renderScene();
  });

  stateManager.on("history:merged", (data) => {
    // Commands merged - could add UI feedback here if needed
  });
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

function initUndoRedoButtons() {
  const undoBtn = document.getElementById("undo-btn");
  const redoBtn = document.getElementById("redo-btn");

  if (undoBtn) {
    undoBtn.addEventListener("click", () => {
      if (commandHistory && commandHistory.canUndo()) {
        commandHistory.undo();
      }
    });
  }

  if (redoBtn) {
    redoBtn.addEventListener("click", () => {
      if (commandHistory && commandHistory.canRedo()) {
        commandHistory.redo();
      }
    });
  }

  // Initial button state
  updateUndoRedoButtons();
}

/**
 * Update layer panel with command history reference
 */

function updateUndoRedoButtons() {
  const undoBtn = document.getElementById("undo-btn");
  const redoBtn = document.getElementById("redo-btn");

  if (undoBtn && commandHistory) {
    const canUndo = commandHistory.canUndo();
    undoBtn.disabled = !canUndo;

    if (canUndo) {
      const undoCommand =
        commandHistory.getUndoStack()[commandHistory.getUndoStack().length - 1];
      undoBtn.title = `Undo: ${undoCommand.description} (Ctrl+Z)`;
    } else {
      undoBtn.title = "Undo (Ctrl+Z)";
    }
  }

  if (redoBtn && commandHistory) {
    const canRedo = commandHistory.canRedo();
    redoBtn.disabled = !canRedo;

    if (canRedo) {
      const redoCommand =
        commandHistory.getRedoStack()[commandHistory.getRedoStack().length - 1];
      redoBtn.title = `Redo: ${redoCommand.description} (Ctrl+Y)`;
    } else {
      redoBtn.title = "Redo (Ctrl+Y)";
    }
  }
}

/**
 * Initialize grid resize functionality
 */
function initGridResize() {
  const resizeGridBtn = document.getElementById("resize-grid");
  const resizeModal = document.getElementById("resize-modal");
  const resizeModalClose = document.getElementById("resize-modal-close");
  const resizeCancel = document.getElementById("resize-cancel");
  const resizeApply = document.getElementById("resize-apply");
  const widthInput = document.getElementById("resize-width");
  const heightInput = document.getElementById("resize-height");
  const currentDimensions = document.getElementById("current-dimensions");
  const previewText = document.getElementById("resize-preview-text");
  const warningText = document.getElementById("resize-warning");
  const memoryInfo = document.getElementById("memory-impact");

  if (!resizeGridBtn || !resizeModal) return;

  // Open resize modal
  resizeGridBtn.addEventListener("click", () => {
    updateCurrentDimensions();
    updateResizePreview();
    resizeModal.classList.remove("hidden");
    widthInput.focus();
  });

  // Close modal handlers
  const closeModal = () => {
    resizeModal.classList.add("hidden");
  };

  resizeModalClose.addEventListener("click", closeModal);
  resizeCancel.addEventListener("click", closeModal);

  // Close on backdrop click
  resizeModal
    .querySelector(".modal-backdrop")
    .addEventListener("click", closeModal);

  // Close on Escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !resizeModal.classList.contains("hidden")) {
      closeModal();
    }
  });

  // Update preview when inputs change
  const updatePreview = () => updateResizePreview();
  widthInput.addEventListener("input", updatePreview);
  heightInput.addEventListener("input", updatePreview);

  // Update preview when strategy changes
  document
    .querySelectorAll('input[name="resize-strategy"]')
    .forEach((radio) => {
      radio.addEventListener("change", updatePreview);
    });

  // Apply resize
  resizeApply.addEventListener("click", () => {
    applyGridResize();
  });

  function updateCurrentDimensions() {
    if (!scene) {
      console.warn("Scene not available for resize dimensions");
      return;
    }

    // Update display text
    if (currentDimensions) {
      currentDimensions.textContent = `${scene.w}×${scene.h}`;
    }

    // Update input fields
    if (widthInput) {
      widthInput.value = scene.w;
    }
    if (heightInput) {
      heightInput.value = scene.h;
    }
  }

  function updateResizePreview() {
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
    const memoryMB = (preview.memoryImpact.newMemory / (1024 * 1024)).toFixed(
      2,
    );
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

  function applyGridResize() {
    if (!scene || !commandHistory) return;

    const newWidth = parseInt(widthInput.value);
    const newHeight = parseInt(heightInput.value);
    const strategy =
      document.querySelector('input[name="resize-strategy"]:checked')?.value ||
      "pad";

    try {
      const resizeCommand = ResizeCommand.create({
        scene: scene,
        newWidth: newWidth,
        newHeight: newHeight,
        strategy: strategy,
        stateManager: stateManager,
      });

      // Execute the command through command history
      commandHistory.execute(resizeCommand);

      // Show success message
      showGridStatus("Grid resized successfully!");

      // Close modal
      resizeModal.classList.add("hidden");

      // Trigger re-render
      renderScene();
    } catch (error) {
      console.error("Failed to resize grid:", error);
      showGridStatus("Failed to resize grid: " + error.message, true);
    }
  }
}

/**
 * Initialize clear operations functionality
 */
function initClearOperations() {
  const clearGridBtn = document.getElementById("clear-grid");
  const clearLayerBtn = document.getElementById("clear-layer");

  if (!clearGridBtn || !clearLayerBtn) return;

  // Clear entire grid
  clearGridBtn.addEventListener("click", () => {
    showClearConfirmation(
      "Clear Grid",
      "This will clear all layers and remove all content. This action can be undone.",
      () => {
        try {
          const clearCommand = ClearCommand.clearAll({
            scene: scene,
            stateManager: stateManager,
          });

          commandHistory.execute(clearCommand);
          showGridStatus(
            `Cleared ${clearCommand.getAffectedCellCount()} cells from all layers`,
          );
        } catch (error) {
          console.error("Failed to clear grid:", error);
          showGridStatus("Failed to clear grid: " + error.message, true);
        }
      },
    );
  });

  // Clear active layer
  clearLayerBtn.addEventListener("click", () => {
    const activeLayer = scene.getActiveLayer();
    if (!activeLayer) {
      showGridStatus("No active layer selected", true);
      return;
    }

    // Count non-empty cells for confirmation
    const stats = activeLayer.getStats();
    const nonEmptyCount = stats.nonEmptyCount;

    showClearConfirmation(
      "Clear Layer",
      `This will clear ${nonEmptyCount} cells from layer "${activeLayer.name}". This action can be undone.`,
      () => {
        try {
          const clearCommand = ClearCommand.clearLayer({
            scene: scene,
            layer: activeLayer,
            stateManager: stateManager,
          });

          commandHistory.execute(clearCommand);
          showGridStatus(
            `Cleared ${clearCommand.getAffectedCellCount()} cells from layer "${activeLayer.name}"`,
          );
        } catch (error) {
          console.error("Failed to clear layer:", error);
          showGridStatus("Failed to clear layer: " + error.message, true);
        }
      },
    );
  });
}

/**
 * Show confirmation dialog for clear operations
 */
function showClearConfirmation(title, message, onConfirm) {
  const confirmed = window.confirm(`${title}\n\n${message}\n\nContinue?`);
  if (confirmed) {
    onConfirm();
  }
}

/**
 * Show grid status message
 */
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

  // Auto-hide after 3 seconds
  setTimeout(() => {
    status.classList.add("hidden");
  }, 3000);
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
