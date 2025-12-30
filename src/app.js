// Terminal Draw - Main Application Entry Point
// Step 1: Basic setup and font testing

console.log("Terminal Draw initializing...");

// Create a test pattern to verify font rendering and grid setup
function initTestPattern() {
  console.log("Initializing test pattern...");

  const container = document.querySelector(".grid-container");
  const bgLayer = document.getElementById("layer-bg");

  if (!container || !bgLayer) {
    console.error("Container or bgLayer not found!", { container, bgLayer });
    return;
  }

  console.log("Found container and bgLayer");

  // Set grid dimensions
  const w = 80;
  const h = 25;

  // Test characters including box-drawing glyphs
  const testChars = "─│┌┐└┘┬┴├┤┼━┃╔╗╚╝░▒▓█";

  // Build the pattern as an array of rows (strings)
  const rows = [];

  for (let y = 0; y < h; y++) {
    let rowText = "";

    for (let x = 0; x < w; x++) {
      let char = " ";

      // Create test pattern
      if (y === 0 || y === h - 1 || x === 0 || x === w - 1) {
        // Border
        if (y === 0 && x === 0) char = "┌";
        else if (y === 0 && x === w - 1) char = "┐";
        else if (y === h - 1 && x === 0) char = "└";
        else if (y === h - 1 && x === w - 1) char = "┘";
        else if (y === 0 || y === h - 1) char = "─";
        else char = "│";
      } else if (y === Math.floor(h / 2) && x >= 25 && x <= 54) {
        // Test text in middle
        const text = "TERMINAL DRAW - FONT TEST";
        const charIndex = x - 25;
        char = text[charIndex] || " ";
      } else if (y === Math.floor(h / 2) + 2 && x >= 30 && x < 50) {
        // Box drawing test
        char = testChars[x - 30] || " ";
      } else if (y === Math.floor(h / 2) + 4 && x >= 20 && x < 60) {
        // Ligature test
        const ligatureTest = "-> => != <= >= :: ++ -- /** */ =:= ~~>";
        char = ligatureTest[x - 20] || " ";
      }

      rowText += char;
    }

    rows.push(rowText);
  }

  // Render each row as a single div with the full text
  rows.forEach((rowText, y) => {
    const rowDiv = document.createElement("div");
    rowDiv.className = "grid-row";
    rowDiv.textContent = rowText;

    // For now, simple coloring - we'll make this more sophisticated later
    if (y === 0 || y === h - 1) {
      rowDiv.classList.add("fg-7");
    } else if (y === Math.floor(h / 2)) {
      rowDiv.classList.add("fg-3");
    } else if (y === Math.floor(h / 2) + 2) {
      rowDiv.classList.add("fg-6");
    } else if (y === Math.floor(h / 2) + 4) {
      // Ligature test row - enable ligatures
      rowDiv.classList.add("fg-5", "ligatures-enabled");
    } else {
      rowDiv.classList.add("fg-7");
    }

    bgLayer.appendChild(rowDiv);
  });

  console.log(
    `✓ Test pattern rendered: ${w}×${h} grid with ${rows.length} rows`,
  );

  // Update status
  const status = document.getElementById("status");
  if (status) {
    status.textContent = `Ready • Grid: ${w}×${h} • Step 1 Complete`;
  }
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM Content Loaded");
    initTestPattern();
  });
} else {
  console.log("DOM already loaded");
  initTestPattern();
}

// Test font loading
document.fonts.ready.then(() => {
  console.log("✓ Fonts loaded and ready");
});

// Log when everything is ready
window.addEventListener("load", () => {
  console.log("✓ Page fully loaded");
});
