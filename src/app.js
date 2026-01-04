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
import { CircleTool } from "./tools/CircleTool.js";
import { FloodFillTool } from "./tools/FloodFillTool.js";
import { LayerPanel } from "./ui/LayerPanel.js";
import { GlyphPicker } from "./ui/GlyphPicker.js";
import { ClipboardManager } from "./export/ClipboardManager.js";
import { ProjectManager } from "./io/ProjectManager.js";
import { CommandHistory } from "./commands/CommandHistory.js";

import { ClearCommand } from "./commands/ClearCommand.js";

import { StartupDialog } from "./ui/StartupDialog.js";
import { PROJECT_TEMPLATES, getTemplate } from "./core/ProjectTemplate.js";

import { addBorderToScene, isValidBorderStyle } from "./core/BorderUtils.js";

// =============================================================================
// Configuration & State
// =============================================================================

// Constants for magic numbers
const Z_INDEX = {
  LAYER_BASE: 100,
  PREVIEW_OVERLAY: 1000,
};

const TIMEOUTS = {
  STATUS_HIDE: 3000,
  STATUS_UPDATE: 2000,
};

const PREVIEW_COLORS = {
  CIRCLE: "rgba(100, 255, 150, 0.8)",
  CIRCLE_BG: "rgba(100, 255, 150, 0.25)",
  BRUSH: "rgba(100, 150, 255, 0.8)",
  BRUSH_BG: "rgba(100, 150, 255, 0.25)",
  RECTANGLE: "rgba(255, 200, 100, 0.8)",
  RECTANGLE_BG: "rgba(255, 200, 100, 0.25)",
};

const SCALE = {
  MIN: 10,
  MAX: 1000,
  DEFAULT: 100,
};

let GRID_WIDTH = 80;
let GRID_HEIGHT = 25;

let currentPalette = "default";
let currentScale = SCALE.DEFAULT;

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
let circleTool = null;
let floodFillTool = null;
let currentTool = null;

// Tool configuration - centralizes tool setup to eliminate repetitive code
const TOOL_CONFIG = [
  {
    name: "brushTool",
    class: BrushTool,
    id: "brush",
    key: "b",
    args: [{ ch: "█", fg: 7, bg: -1 }],
    hasOptions: true,
  },
  {
    name: "eraserTool",
    class: EraserTool,
    id: "eraser",
    key: "e",
    args: [],
    hasOptions: false,
  },
  {
    name: "pickerTool",
    class: PickerTool,
    id: "picker",
    key: "p",
    args: [],
    hasOptions: false,
  },
  {
    name: "sprayTool",
    class: SprayTool,
    id: "spray",
    key: "s",
    args: [{ ch: ".", fg: 7, bg: -1 }],
    hasOptions: true,
  },
  {
    name: "rectangleTool",
    class: RectangleTool,
    id: "rectangle",
    key: "r",
    args: [{ ch: "█", fg: 7, bg: -1 }],
    hasOptions: true,
  },
  {
    name: "lineTool",
    class: LineTool,
    id: "line",
    key: "l",
    args: [{ ch: "█", fg: 7, bg: -1 }],
    hasOptions: false,
  },
  {
    name: "circleTool",
    class: CircleTool,
    id: "circle",
    key: "c",
    args: [{ ch: "█", fg: 7, bg: -1 }],
    hasOptions: true,
  },
  {
    name: "floodFillTool",
    class: FloodFillTool,
    id: "floodfill",
    key: "f",
    args: [{ ch: "█", fg: 7, bg: -1 }],
    hasOptions: false,
  },
];

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
    container.style.zIndex = Z_INDEX.LAYER_BASE + index; // Ensure proper stacking order

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

  // Listen for circle tool anchor events
  stateManager.on("circle:anchor", (data) => {
    if (data.x !== null && data.y !== null) {
      showAnchorIndicator(data.x, data.y);
    } else {
      hideAnchorIndicator();
    }
  });

  // Listen for circle tool preview events
  stateManager.on("circle:preview", (data) => {
    if (data.centerX !== null && data.centerY !== null) {
      if (data.ellipseMode && (data.radiusX > 0 || data.radiusY > 0)) {
        showCirclePreview(
          data.centerX,
          data.centerY,
          data.radiusX,
          data.fillMode,
          true,
          data.radiusY,
        );
      } else if (!data.ellipseMode && data.radius > 0) {
        showCirclePreview(
          data.centerX,
          data.centerY,
          data.radius,
          data.fillMode,
          false,
        );
      } else {
        hideCirclePreview();
      }
    } else {
      hideCirclePreview();
    }
  });

  // Listen for rectangle tool preview events
  stateManager.on("rectangle:preview", (data) => {
    if (
      data.x1 !== null &&
      data.y1 !== null &&
      data.x2 !== null &&
      data.y2 !== null
    ) {
      showRectanglePreview(data.x1, data.y1, data.x2, data.y2, data.fillMode);
    } else {
      hideRectanglePreview();
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
  if (!scene) return;

  if (data && data.x !== undefined && data.y !== undefined) {
    // Update status bar with coordinates
    updateStatus(
      `Cell: (${data.x}, ${data.y}) • Grid: ${GRID_WIDTH}×${GRID_HEIGHT} • Scale: ${currentScale}%`,
    );

    // Update hover indicator position
    updateHoverIndicator(data.x, data.y);

    // Show brush preview if brush tool is active and size > 1 or shape != square
    if (
      currentTool === brushTool &&
      (brushTool.getBrushSize() > 1 || brushTool.getBrushShape() !== "square")
    ) {
      showBrushPreview(data.x, data.y);
    }
  } else {
    // Mouse left grid
    updateStatus(
      `Ready • Grid: ${GRID_WIDTH}×${GRID_HEIGHT} • Scale: ${currentScale}%`,
    );
    hideHoverIndicator();
    hideBrushPreview();
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
 * Show circle preview overlay during drag
 */
function showCirclePreview(
  centerX,
  centerY,
  radiusOrRadiusX,
  fillMode,
  ellipseMode = false,
  radiusY = null,
) {
  hideCirclePreview(); // Clear any existing preview

  if (!hitTestOverlay) return;

  const cellDimensions = hitTestOverlay.getCellDimensions();
  const container = document.querySelector(".grid-container");
  if (!container) return;

  // Create preview overlay
  const previewOverlay = getOrCreatePreviewOverlay(
    "circle-preview-overlay",
    container,
  );

  // Calculate circle preview cells using Bresenham algorithm
  const previewCells = getCirclePreviewCells(
    centerX,
    centerY,
    radiusOrRadiusX,
    fillMode,
    ellipseMode,
    radiusY,
  );

  // Create visual elements for each preview cell
  previewCells.forEach((cell) => {
    const previewCell = document.createElement("div");
    previewCell.className = "circle-preview-cell";
    previewCell.style.position = "absolute";
    previewCell.style.left = `${cell.x * cellDimensions.width}px`;
    previewCell.style.top = `${cell.y * cellDimensions.height}px`;
    previewCell.style.width = `${cellDimensions.width}px`;
    previewCell.style.height = `${cellDimensions.height}px`;
    previewCell.style.border = `1px solid ${PREVIEW_COLORS.CIRCLE}`;
    previewCell.style.backgroundColor = PREVIEW_COLORS.CIRCLE_BG;
    previewCell.style.borderRadius = "1px";
    previewCell.style.boxSizing = "border-box";
    previewOverlay.appendChild(previewCell);
  });
}

/**
 * Hide circle preview overlay
 */
function hideCirclePreview() {
  const previewOverlay = document.getElementById("circle-preview-overlay");
  if (previewOverlay) {
    previewOverlay.innerHTML = "";
  }
}

/**
 * Get circle/ellipse preview cells using Bresenham algorithms
 */
function getCirclePreviewCells(
  centerX,
  centerY,
  radiusOrRadiusX,
  fillMode,
  ellipseMode = false,
  radiusY = null,
) {
  const cells = [];

  if (ellipseMode && radiusY !== null) {
    // Ellipse mode
    const radiusX = radiusOrRadiusX;

    if (radiusX === 0 && radiusY === 0) {
      cells.push({ x: centerX, y: centerY });
      return cells;
    }

    if (fillMode === "filled") {
      // Filled ellipse
      for (let y = centerY - radiusY; y <= centerY + radiusY; y++) {
        for (let x = centerX - radiusX; x <= centerX + radiusX; x++) {
          const dx = x - centerX;
          const dy = y - centerY;
          const ellipseValue =
            (dx * dx) / (radiusX * radiusX) + (dy * dy) / (radiusY * radiusY);
          if (ellipseValue <= 1) {
            cells.push({ x, y });
          }
        }
      }
    } else {
      // Outline ellipse - use proper Bresenham-like algorithm for preview
      const ellipsePoints = getEllipseOutlinePoints(
        centerX,
        centerY,
        radiusX,
        radiusY,
      );
      ellipsePoints.forEach((point) => cells.push(point));
    }
  } else {
    // Circle mode
    const radius = radiusOrRadiusX;

    if (radius === 0) {
      cells.push({ x: centerX, y: centerY });
      return cells;
    }

    if (fillMode === "filled") {
      // Filled circle - check each point in bounding box
      for (let y = centerY - radius; y <= centerY + radius; y++) {
        for (let x = centerX - radius; x <= centerX + radius; x++) {
          const dx = x - centerX;
          const dy = y - centerY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance <= radius) {
            cells.push({ x, y });
          }
        }
      }
    } else {
      // Outline circle - use Bresenham algorithm
      let x = 0;
      let y = radius;
      let d = 3 - 2 * radius;

      // Add initial points
      addCirclePoints(cells, centerX, centerY, x, y);

      while (y >= x) {
        x++;
        if (d > 0) {
          y--;
          d = d + 4 * (x - y) + 10;
        } else {
          d = d + 4 * x + 6;
        }
        addCirclePoints(cells, centerX, centerY, x, y);
      }
    }
  }

  return cells;
}

/**
 * Get ellipse outline points using Bresenham-like algorithm for preview
 */
function getEllipseOutlinePoints(centerX, centerY, radiusX, radiusY) {
  const points = [];

  if (radiusX === 0 && radiusY === 0) {
    points.push({ x: centerX, y: centerY });
    return points;
  }

  if (radiusX === 0) {
    // Vertical line
    for (let y = centerY - radiusY; y <= centerY + radiusY; y++) {
      points.push({ x: centerX, y: y });
    }
    return points;
  }

  if (radiusY === 0) {
    // Horizontal line
    for (let x = centerX - radiusX; x <= centerX + radiusX; x++) {
      points.push({ x: x, y: centerY });
    }
    return points;
  }

  let x = 0;
  let y = radiusY;
  let radiusX2 = radiusX * radiusX;
  let radiusY2 = radiusY * radiusY;
  let twoRadiusX2 = 2 * radiusX2;
  let twoRadiusY2 = 2 * radiusY2;
  let p;
  let px = 0;
  let py = twoRadiusX2 * y;

  // Add initial points
  addEllipsePoints(points, centerX, centerY, x, y);

  // Region 1
  p = Math.round(radiusY2 - radiusX2 * radiusY + 0.25 * radiusX2);

  while (px < py) {
    x++;
    px += twoRadiusY2;
    if (p < 0) {
      p += radiusY2 + px;
    } else {
      y--;
      py -= twoRadiusX2;
      p += radiusY2 + px - py;
    }
    addEllipsePoints(points, centerX, centerY, x, y);
  }

  // Region 2
  p = Math.round(
    radiusY2 * (x + 0.5) * (x + 0.5) +
      radiusX2 * (y - 1) * (y - 1) -
      radiusX2 * radiusY2,
  );

  while (y > 0) {
    y--;
    py -= twoRadiusX2;
    if (p > 0) {
      p += radiusX2 - py;
    } else {
      x++;
      px += twoRadiusY2;
      p += radiusX2 - py + px;
    }
    addEllipsePoints(points, centerX, centerY, x, y);
  }

  return points;
}

/**
 * Add 4-fold symmetric points for ellipse preview
 */
function addEllipsePoints(points, centerX, centerY, x, y) {
  points.push({ x: centerX + x, y: centerY + y });
  points.push({ x: centerX - x, y: centerY + y });
  points.push({ x: centerX + x, y: centerY - y });
  points.push({ x: centerX - x, y: centerY - y });
}

/**
 * Add 8-fold symmetric points for circle preview
 */
function addCirclePoints(points, centerX, centerY, x, y) {
  points.push({ x: centerX + x, y: centerY + y });
  points.push({ x: centerX - x, y: centerY + y });
  points.push({ x: centerX + x, y: centerY - y });
  points.push({ x: centerX - x, y: centerY - y });
  points.push({ x: centerX + y, y: centerY + x });
  points.push({ x: centerX - y, y: centerY + x });
  points.push({ x: centerX + y, y: centerY - x });
  points.push({ x: centerX - y, y: centerY - x });
}

/**
 * Show brush preview overlay during hover
 */
function showBrushPreview(x, y) {
  hideBrushPreview(); // Clear any existing preview

  if (!hitTestOverlay || !currentTool || !scene) return;

  const cellDimensions = hitTestOverlay.getCellDimensions();
  const container = document.querySelector(".grid-container");
  if (!container) return;

  // Create preview overlay
  const previewOverlay = getOrCreatePreviewOverlay(
    "brush-preview-overlay",
    container,
  );

  // Get brush preview cells
  const previewCells = brushTool.getBrushPreview(x, y, scene);

  // Create visual elements for each preview cell
  previewCells.forEach((cell) => {
    const previewCell = document.createElement("div");
    previewCell.className = "brush-preview-cell";
    previewCell.style.position = "absolute";
    previewCell.style.left = `${cell.x * cellDimensions.width}px`;
    previewCell.style.top = `${cell.y * cellDimensions.height}px`;
    previewCell.style.width = `${cellDimensions.width}px`;
    previewCell.style.height = `${cellDimensions.height}px`;
    previewCell.style.border = `1px solid ${PREVIEW_COLORS.BRUSH}`;
    previewCell.style.backgroundColor = PREVIEW_COLORS.BRUSH_BG;
    previewCell.style.borderRadius = "2px";
    previewCell.style.boxSizing = "border-box";
    previewOverlay.appendChild(previewCell);
  });
}

/**
 * Hide brush preview overlay
 */
function hideBrushPreview() {
  const previewOverlay = document.getElementById("brush-preview-overlay");
  if (previewOverlay) {
    previewOverlay.innerHTML = "";
  }
}

/**
 * Show rectangle preview overlay during drag
 */
function showRectanglePreview(x1, y1, x2, y2, fillMode) {
  hideRectanglePreview(); // Clear any existing preview

  if (!hitTestOverlay) return;

  const cellDimensions = hitTestOverlay.getCellDimensions();
  const container = document.querySelector(".grid-container");
  if (!container) return;

  // Create preview overlay
  const previewOverlay = getOrCreatePreviewOverlay(
    "rectangle-preview-overlay",
    container,
  );

  // Calculate rectangle preview cells
  const previewCells = getRectanglePreviewCells(x1, y1, x2, y2, fillMode);

  // Create visual elements for each preview cell
  previewCells.forEach((cell) => {
    const previewCell = document.createElement("div");
    previewCell.className = "rectangle-preview-cell";
    previewCell.style.position = "absolute";
    previewCell.style.left = `${cell.x * cellDimensions.width}px`;
    previewCell.style.top = `${cell.y * cellDimensions.height}px`;
    previewCell.style.width = `${cellDimensions.width}px`;
    previewCell.style.height = `${cellDimensions.height}px`;
    previewCell.style.border = `1px solid ${PREVIEW_COLORS.RECTANGLE}`;
    previewCell.style.backgroundColor = PREVIEW_COLORS.RECTANGLE_BG;
    previewCell.style.borderRadius = "1px";
    previewCell.style.boxSizing = "border-box";
    previewOverlay.appendChild(previewCell);
  });
}

/**
 * Hide rectangle preview overlay
 */
function hideRectanglePreview() {
  const previewOverlay = document.getElementById("rectangle-preview-overlay");
  if (previewOverlay) {
    previewOverlay.innerHTML = "";
  }
}

/**
 * Get rectangle preview cells
 */
function getRectanglePreviewCells(x1, y1, x2, y2, fillMode) {
  const cells = [];

  if (fillMode === "filled") {
    // Filled rectangle
    for (let y = y1; y <= y2; y++) {
      for (let x = x1; x <= x2; x++) {
        cells.push({ x, y });
      }
    }
  } else {
    // Outline rectangle
    for (let y = y1; y <= y2; y++) {
      for (let x = x1; x <= x2; x++) {
        // Only include outline cells
        if (y === y1 || y === y2 || x === x1 || x === x2) {
          cells.push({ x, y });
        }
      }
    }
  }

  return cells;
}

/**
 * Update brush preview when brush settings change
 */
function updateBrushPreview() {
  // Hide preview when switching away from brush or when brush is 1x1 square
  if (
    currentTool !== brushTool ||
    (brushTool.getBrushSize() === 1 && brushTool.getBrushShape() === "square")
  ) {
    hideBrushPreview();
  }
}

/**
 * Initialize tools
 */
function initTools() {
  // Create tool instances with command history (using configuration)
  TOOL_CONFIG.forEach((config) => {
    const tool = new config.class(...config.args, commandHistory);

    // Store tool reference in config for easy lookup
    config.tool = tool;

    // Assign to module-level variable by name
    if (config.name === "brushTool") brushTool = tool;
    else if (config.name === "eraserTool") eraserTool = tool;
    else if (config.name === "pickerTool") pickerTool = tool;
    else if (config.name === "sprayTool") sprayTool = tool;
    else if (config.name === "rectangleTool") rectangleTool = tool;
    else if (config.name === "lineTool") lineTool = tool;
    else if (config.name === "circleTool") circleTool = tool;
    else if (config.name === "floodFillTool") floodFillTool = tool;
  });

  // Set initial tool
  setCurrentTool(brushTool);

  // Setup tool buttons (using configuration)
  TOOL_CONFIG.forEach((config) => {
    const button = document.getElementById(`tool-${config.id}`);
    if (button) {
      let tool;
      if (config.name === "brushTool") tool = brushTool;
      else if (config.name === "eraserTool") tool = eraserTool;
      else if (config.name === "pickerTool") tool = pickerTool;
      else if (config.name === "sprayTool") tool = sprayTool;
      else if (config.name === "rectangleTool") tool = rectangleTool;
      else if (config.name === "lineTool") tool = lineTool;
      else if (config.name === "circleTool") tool = circleTool;
      else if (config.name === "floodFillTool") tool = floodFillTool;

      button.addEventListener("click", () => setCurrentTool(tool));
    }
  });

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

    // Tool shortcuts (using configuration)
    const key = e.key.toLowerCase();
    const toolConfig = TOOL_CONFIG.find((config) => config.key === key);
    if (toolConfig) {
      let tool;
      if (toolConfig.name === "brushTool") tool = brushTool;
      else if (toolConfig.name === "eraserTool") tool = eraserTool;
      else if (toolConfig.name === "pickerTool") tool = pickerTool;
      else if (toolConfig.name === "sprayTool") tool = sprayTool;
      else if (toolConfig.name === "rectangleTool") tool = rectangleTool;
      else if (toolConfig.name === "lineTool") tool = lineTool;
      else if (toolConfig.name === "circleTool") tool = circleTool;
      else if (toolConfig.name === "floodFillTool") tool = floodFillTool;

      if (tool) {
        setCurrentTool(tool);
      }
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

  // Clear all previews when switching tools
  hideBrushPreview();
  hideCirclePreview();
  hideRectanglePreview();

  // Update cursor
  if (hitTestOverlay) {
    hitTestOverlay.setCursor(tool.getCursor());
  }

  // Clear all active states and hide all options using configuration
  TOOL_CONFIG.forEach((config) => {
    const button = document.getElementById(`tool-${config.id}`);
    if (button) button.classList.remove("active");

    if (config.hasOptions) {
      const options = document.getElementById(`${config.id}-options`);
      if (options) options.style.display = "none";
    }
  });

  // Find and activate current tool using stored tool reference
  const activeConfig = TOOL_CONFIG.find((config) => config.tool === tool);
  if (activeConfig) {
    const button = document.getElementById(`tool-${activeConfig.id}`);
    if (button) button.classList.add("active");

    if (activeConfig.hasOptions) {
      const options = document.getElementById(`${activeConfig.id}-options`);
      if (options) options.style.display = "flex";
    }
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
 * Get or create a preview overlay element
 * @param {string} id - Unique ID for the overlay
 * @param {HTMLElement} container - Container to append overlay to
 * @returns {HTMLElement} The preview overlay element
 */
function getOrCreatePreviewOverlay(id, container) {
  let overlay = document.getElementById(id);
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = id;
    overlay.style.cssText = `position: absolute; pointer-events: none; z-index: ${Z_INDEX.PREVIEW_OVERLAY};`;
    container.appendChild(overlay);
  }
  return overlay;
}

/**
 * Update all tools with a specific property
 */
function updateAllToolsProperty(property, value) {
  const tools = [
    brushTool,
    sprayTool,
    rectangleTool,
    lineTool,
    circleTool,
    floodFillTool,
  ];
  tools.forEach((tool) => {
    if (tool) {
      const currentCell = tool.getCurrentCell();
      tool.setCurrentCell({ ...currentCell, [property]: value });
    }
  });
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

  // Update all tools with new foreground color
  updateAllToolsProperty("fg", colorIndex);

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

  // Update all tools with new background color
  updateAllToolsProperty("bg", colorIndex);

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
    // Sync character to all tools
    if (data.char) {
      updateAllToolsProperty("ch", data.char);
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
  }, TIMEOUTS.STATUS_HIDE);
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
  if (circleTool && commandHistory) {
    circleTool.setCommandHistory(commandHistory);
  }
  if (floodFillTool && commandHistory) {
    floodFillTool.setCommandHistory(commandHistory);
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
  }, TIMEOUTS.STATUS_HIDE);
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
  initLayerPanel();
  initInteractivePalette();
  initGlyphPicker();
  initPaintMode();
  initSmartDrawingMode();
  initSpraySettings();
  initRectangleSettings();
  initCircleSettings();
  initBrushSettings();
  initClipboard();
  initProject();
  initIOPanel();

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
  container.style.transform = `scale(${scale / SCALE.DEFAULT})`;

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

    const scalePercent = Math.max(
      SCALE.MIN,
      Math.min(SCALE.MAX, Math.round(scale * SCALE.DEFAULT)),
    );
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
      if (circleTool) {
        circleTool.setDrawingMode(mode);
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
    if (circleTool) {
      circleTool.setDrawingMode("normal");
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
      if (circleTool) {
        circleTool.setPaintMode(newMode);
      }
      if (eraserTool) {
        eraserTool.setPaintMode(newMode);
      }
      if (floodFillTool) {
        floodFillTool.setPaintMode(newMode);
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
    if (circleTool) {
      circleTool.setPaintMode("all");
    }
    if (eraserTool) {
      eraserTool.setPaintMode("all");
    }
    if (floodFillTool) {
      floodFillTool.setPaintMode("all");
    }
  }
}

/**
 * Initialize brush tool settings
 */
function initBrushSettings() {
  const sizeSelect = document.getElementById("brush-size");
  const shapeSelect = document.getElementById("brush-shape");

  if (sizeSelect && brushTool) {
    sizeSelect.addEventListener("change", (e) => {
      const size = parseInt(e.target.value);
      brushTool.setBrushSize(size);

      let statusMessage = `Brush Size: ${size}x${size}`;
      updateStatus(statusMessage, TIMEOUTS.STATUS_UPDATE);
      updateBrushPreview();
    });

    // Set initial size
    brushTool.setBrushSize(1);
  }

  if (shapeSelect && brushTool) {
    shapeSelect.addEventListener("change", (e) => {
      const shape = e.target.value;
      brushTool.setBrushShape(shape);

      let statusMessage = `Brush Shape: ${shape.charAt(0).toUpperCase() + shape.slice(1)}`;
      updateStatus(statusMessage, TIMEOUTS.STATUS_UPDATE);
      updateBrushPreview();
    });

    // Set initial shape
    brushTool.setBrushShape("square");
  }
}

/**
 * Initialize spray tool settings
 */
function initSpraySettings() {
  const presetSelect = document.getElementById("spray-preset");
  const radiusSelect = document.getElementById("spray-radius");
  const coverageSelect = document.getElementById("spray-coverage");

  if (presetSelect && sprayTool) {
    presetSelect.addEventListener("change", (e) => {
      const preset = e.target.value;
      sprayTool.setPreset(preset);

      const presetLabels = {
        artist: "Artist (. - + * % m #)",
        blocks: "Blocks (░ ▒ ▓ █)",
        dots: "Dots (· • ● ○)",
        stipple: "Stipple (, . · :)",
        heights: "Heights (▁ ▂ ▃ ▄ ▅ ▆ ▇ █)",
        widths: "Widths (▏ ▎ ▍ ▌ ▋ ▊ ▉)",
        stars: "Stars (· • ✶ ✕)",
        triangles: "Triangles (▴ ▵ ► ◄ ▲ ▼)",
        crosses: "Crosses (· ÷ + ✕ × X ╳)",
        waves: "Waves (~ ∼ ≈ ≋)",
      };

      updateStatus(`Spray Preset: ${presetLabels[preset]}`);
    });

    // Set initial preset
    sprayTool.setPreset("artist");
  }

  if (radiusSelect && sprayTool) {
    radiusSelect.addEventListener("change", (e) => {
      const radius = parseInt(e.target.value);
      sprayTool.setRadius(radius);

      const sizeLabels = {
        2: "Small",
        3: "Medium",
        5: "Large",
      };

      updateStatus(`Spray Size: ${sizeLabels[radius]}`);
    });

    // Set initial radius
    sprayTool.setRadius(3);
  }

  if (coverageSelect && sprayTool) {
    coverageSelect.addEventListener("change", (e) => {
      const coverage = parseFloat(e.target.value);
      sprayTool.setCoverage(coverage);

      const densityLabels = {
        0.025: "Light",
        0.05: "Medium",
        0.1: "Dense",
        0.5: "Heavy",
      };

      updateStatus(`Spray Density: ${densityLabels[coverage]}`);
    });

    // Set initial coverage
    sprayTool.setCoverage(0.05);
  }
}

/**
 * Initialize rectangle tool settings
 */
function initRectangleSettings() {
  const fillSelect = document.getElementById("rectangle-fill");

  if (fillSelect && rectangleTool) {
    fillSelect.addEventListener("change", (e) => {
      const fillMode = e.target.value;
      rectangleTool.setFillMode(fillMode);

      const fillLabels = {
        outline: "Outline",
        filled: "Filled",
      };

      updateStatus(`Rectangle Fill: ${fillLabels[fillMode]}`);
    });

    // Set initial fill mode
    rectangleTool.setFillMode("outline");
  }
}

/**
 * Initialize circle tool settings
 */
function initCircleSettings() {
  const fillSelect = document.getElementById("circle-fill");
  const ellipseCheckbox = document.getElementById("circle-ellipse");

  if (fillSelect && circleTool) {
    fillSelect.addEventListener("change", (e) => {
      const fillMode = e.target.value;
      circleTool.setFillMode(fillMode);

      const fillLabels = {
        outline: "Outline",
        filled: "Filled",
      };

      updateStatus(`Circle Fill: ${fillLabels[fillMode]}`);
    });

    // Set initial fill mode
    circleTool.setFillMode("outline");
  }

  if (ellipseCheckbox && circleTool) {
    ellipseCheckbox.addEventListener("change", (e) => {
      const ellipseMode = e.target.checked;
      circleTool.setEllipseMode(ellipseMode);

      const modeLabel = ellipseMode ? "Ellipse" : "Circle";
      updateStatus(`Circle Tool: ${modeLabel} Mode`);
    });

    // Set initial ellipse mode
    circleTool.setEllipseMode(false);
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
