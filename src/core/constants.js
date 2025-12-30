/**
 * Constants - Default values and preset configurations
 */

// Grid defaults
export const DEFAULT_WIDTH = 80;
export const DEFAULT_HEIGHT = 25;

// Default palette ID (refers to palettes.json)
export const DEFAULT_PALETTE_ID = "default";

// Default cell values
export const DEFAULT_CHAR = " ";
export const DEFAULT_FG = 7; // White
export const DEFAULT_BG = -1; // Transparent

// Layer IDs
export const LAYER_BG = "bg";
export const LAYER_MID = "mid";
export const LAYER_FG = "fg";

// Glyph presets organized by category
export const GLYPHS = {
  BOX_LIGHT: {
    name: "Box Drawing (Light)",
    chars: ["─", "│", "┌", "┐", "└", "┘", "┬", "┴", "├", "┤", "┼"],
  },
  BOX_HEAVY: {
    name: "Box Drawing (Heavy)",
    chars: ["━", "┃", "┏", "┓", "┗", "┛", "┳", "┻", "┣", "┫", "╋"],
  },
  BOX_DOUBLE: {
    name: "Box Drawing (Double)",
    chars: ["═", "║", "╔", "╗", "╚", "╝", "╦", "╩", "╠", "╣", "╬"],
  },
  BOX_ROUNDED: {
    name: "Box Drawing (Rounded)",
    chars: ["─", "│", "╭", "╮", "╰", "╯"],
  },
  SHADING: {
    name: "Shading & Blocks",
    chars: [
      "░",
      "▒",
      "▓",
      "█",
      "▀",
      "▄",
      "▌",
      "▐",
      "▁",
      "▂",
      "▃",
      "▄",
      "▅",
      "▆",
      "▇",
    ],
  },
  DOTS: {
    name: "Dots & Circles",
    chars: ["·", "•", "∘", "○", "◦", "◉", "◎", "▪", "▫"],
  },
  ARROWS: {
    name: "Arrows & Signs",
    chars: ["→", "←", "↑", "↓", "↔", "⇒", "⇐", "⇔", "⚠", "⚡"],
  },
  GEOMETRY: {
    name: "Geometric Shapes",
    chars: ["◆", "◇", "■", "□", "▲", "△", "▼", "▽", "●", "○"],
  },
  TRIANGLES: {
    name: "Triangles & Pointers",
    chars: [
      "▲",
      "▶",
      "▼",
      "◀",
      "△",
      "▷",
      "▽",
      "◁",
      "▴",
      "▸",
      "▾",
      "◂",
      "▵",
      "▹",
      "▿",
      "◃",
    ],
  },
  MATH_OPERATORS: {
    name: "Math Operators",
    chars: [
      "≠",
      "≤",
      "≥",
      "±",
      "≈",
      "∞",
      "∫",
      "∑",
      "∏",
      "√",
      "∂",
      "∇",
      "∈",
      "∉",
      "⊂",
      "⊃",
      "∩",
      "∪",
      "∧",
      "∨",
    ],
  },
  EXTENDED_ARROWS: {
    name: "Extended Arrows",
    chars: [
      "⇒",
      "⇐",
      "⇔",
      "⇑",
      "⇓",
      "↔",
      "↕",
      "⟵",
      "⟶",
      "⟷",
      "➔",
      "➜",
      "➝",
      "➞",
    ],
  },
  CURRENCY: {
    name: "Currency Symbols",
    chars: ["$", "€", "£", "¥", "₿", "¢", "₽", "₴"],
  },
  SYMBOLS_COMMON: {
    name: "Common Symbols",
    chars: [
      "@",
      "#",
      "*",
      "+",
      "-",
      "=",
      "×",
      "÷",
      "%",
      "°",
      "™",
      "©",
      "®",
      "§",
      "¶",
      "†",
      "‡",
    ],
  },
  COMMON: {
    name: "Common Characters",
    chars: ["A", "B", "C", "X", "O", "#", "@", "*", "+", "-", "=", "~"],
  },
};

// Flatten all glyphs into a single array
export const ALL_GLYPHS = Object.values(GLYPHS).flatMap(
  (category) => category.chars,
);

// Get glyph presets as an array for UI rendering
export const GLYPH_CATEGORIES = Object.entries(GLYPHS).map(([key, value]) => ({
  id: key,
  name: value.name,
  chars: value.chars,
}));
