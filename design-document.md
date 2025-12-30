A web-based, DOM/CSS-rendered ASCII drawing tool that produces copy/pasteable terminal art (real glyphs) for a webgame. Phase 1 focuses on static scenes only; animation/behaviors are designed for later.

1) Goals and non-goals
Goals (Phase 1)

Render a true TUI-like grid using real text glyphs in the DOM (no canvas/webgl).

Support 3 layers (background / mid / foreground) with visibility + lock + active-layer editing.

Provide fast drawing tools for architectural ASCII:

brush, eraser, picker

line + rectangle tools

optional “smart connectivity” for box drawing junctions (toggle on/off)

Copy/export:

Copy the composited scene as plain text (exact grid)

Export/import JSON (all layers, palette, options)

Non-goals (Phase 1)

No animation runtime (behaviors/loops are Phase 2).

No collaboration/multiplayer.

No huge-grid optimization beyond “reasonable” sizes (design for a future cap).

2) Core concepts
Grid

Default size: 80×25

Resizable: user can set W/H (within a reasonable max, TBD)

Each cell is a fixed “terminal cell”:

glyph is a single character

foreground color index (0–7)

background color index (0–7 or transparent)

Terminal-like background behavior (confirmed)

Spaces still show background color if bg is set.

“Transparency” is explicit: bg = -1 means “let lower layers show through”.

3) Data model (source of truth)
Cell

ch: string (single glyph; empty glyph is ' ')

fg: number (0..7)

bg: number (0..7 or -1 for transparent)

Layer

id: "bg" | "mid" | "fg"

name: string

visible: boolean

locked: boolean

ligatures: boolean (per-layer render mode; see §5)

cells: Cell[] length = w*h

Scene

w: number, h: number

paletteFg: string[8] (hex colors)

paletteBg: string[8] (hex colors)

layers: [Layer, Layer, Layer]

activeLayerId: "bg" | "mid" | "fg"

options:

smartConnectivity: boolean (global toggle affecting line/rect tools on active layer)

4) Layer compositing rules (what the user sees)

For each cell index i (top to bottom: FG → MID → BG):

Background (terminal behavior)

The visible background color is from the topmost visible layer where bg !== -1.

This applies even if ch === ' '.

Glyph + foreground

The visible glyph + fg is from the topmost visible layer where ch !== ' '.

If no layer has a non-space glyph, visible glyph is ' '.

Note: compositing is visual. Editing always modifies the active layer only.

5) Rendering (DOM/CSS only) + ligatures
Requirement

No canvas/webgl. Glyphs must be real characters.

Must feel like a terminal grid (square cell logic).

Recommended DOM architecture

Use stacked layers with a separate hit-test overlay:

Hit-test grid (transparent, pointer-events enabled)

BG visual layer (pointer-events: none)

MID visual layer (pointer-events: none)

FG visual layer (pointer-events: none)

All 4 are aligned with identical sizing (w × h, same --cellSize, same grid template).

Two rendering modes per layer (ligatures per layer)

Because ligatures require contiguous text inside one element:

A) Cell mode (ligatures OFF)

Render each cell as its own <span class="cell fg-X bg-Y">A</span>

Fast single-cell patching.

B) Row-run mode (ligatures ON)

Render each row as a <div class="row">

Inside, render runs: spans containing multiple characters where styling (fg/bg) is identical.

This enables ligatures within each run/span.

Important limitation

Ligatures will not form across run boundaries (i.e., across color changes). That’s acceptable.

Font ligature toggling

If layer.ligatures === true, set CSS for that layer:

font-variant-ligatures: contextual;

font-feature-settings: "calt" 1, "liga" 1;

Else:

font-feature-settings: "calt" 0, "liga" 0;

6) Tools and interactions (Phase 1)
Common behavior

Tools apply to active layer only

Respect layer.locked and layer.visible

Tools

Brush

Paints current {ch, fg, bg} while dragging.

Eraser

Sets ch = ' ' (and optionally keeps bg/fg or resets—pick one consistent rule; recommend: reset to defaults).

Picker (eyedropper)

Click cell → sets active brush ch/fg/bg from that layer cell (or from composited view if you prefer; pick one and document it).

Selection

Rect select, move, copy/cut/paste, flip (optional).

Works on the active layer only.

Line tool

Drag start→end; default draws Manhattan line.

Shift constrains to horizontal/vertical.

Rectangle tool

Drag defines a box; draws outline.

Undo/Redo

Continuous drags should be one undo step.

Command-based history recommended: ApplyCells(indices, before, after).

7) Smart connectivity (toggleable)
Option

scene.options.smartConnectivity boolean.

Behavior when ON

Line/rect tools resolve box-drawing glyphs based on local connectivity within the active layer.

Maintain a connectivity resolver for the Light Box family first:

─ │ ┌ ┐ └ ┘ ┬ ┴ ├ ┤ ┼

On each modification, recompute affected cell + its N/E/S/W neighbors to fix junctions.

Protect decor:

If an existing cell’s glyph is not in the chosen box set, do not overwrite unless a “force” modifier is held (optional).

Behavior when OFF

Line/rect tools place “dumb” glyphs without upgrading intersections/junctions:

Horizontal stroke uses ─, vertical uses │

Rectangle uses corners/edges but doesn’t convert crossings into ┼ etc.

8) Glyph presets (for the UI palette)

Provide quick-pick sets:

Box Light: ─│┌┐└┘┬┴├┤┼

Box Heavy: ━┃┏┓┗┛┳┻┣┫╋

Box Double: ═║╔╗╚╝╦╩╠╣╬

Rounded: ╭╮╰╯ (+ ─│)

Shading: ░▒▓ + █▀▄▌▐ + ▁▂▃▄▅▆▇█

Lights: ·•∘○◦◉◎▪▫

Arrows/Signs: →←↑↓↔⇒⇐⇔⚠⚡◆◇

Powerline:  (if font supports it everywhere)

9) Copy/export/import
Copy (required)

Copy composited as text

Output exactly h lines, each exactly w characters (include trailing spaces).

Use \n line breaks.

Copy active layer as text (optional)

Same format but only active layer glyphs.

Export/import JSON (required)

Export full Scene (palette, options, all layers, cells).

Import should validate dimensions and fill missing fields with defaults.

Export HTML (optional)

<pre> with styled spans to preserve fg/bg.

Useful if you want to paste into places that support rich text.

10) Performance strategy (Phase 1)

Default grid 80×25 is trivial.

Implement “dirty updates”:

Cell-rendered layers: patch only changed cells.

Row-run layers: rerender only changed rows.

Keep a configurable max size (decide later; enforce in UI once discovered).

11) Milestones (recommended build order)
Milestone 1 — Core editor scaffold

Scene model with 3 layers

DOM renderer for layers (cell mode first)

Hit-test overlay

Brush/eraser/picker

Copy composited as text

Milestone 2 — Layer UX + undo/redo + resize

Layer panel (visible/lock/active)

Undo/redo (drag = single step)

Grid resize (pad/crop)

JSON export/import

Milestone 3 — Selection + clipboard

Rect selection, move, copy/cut/paste

Milestone 4 — Line/rect tools + smart connectivity toggle

Dumb line/rect

Smart connectivity ON (Light Box resolver)

Toggle in UI

Milestone 5 — Ligatures per layer

Add row-run rendering mode

Toggle ligatures per layer

Ensure copy-as-text unchanged by ligature mode

12) Acceptance criteria (Phase 1)

Rendering uses DOM/CSS only; glyphs are selectable/copyable as text.

Copy composited text yields correct dimensions (h lines × w chars).

Three layers composite correctly:

a space with bg set still paints the background

glyph comes from topmost non-space layer

Line/rect:

with smart connectivity ON, intersections form correct junction glyphs (┼, ├, etc.)

with smart connectivity OFF, intersections do not auto-upgrade

Ligatures:

enabling ligatures on one layer affects only that layer’s rendering

copied text output is identical regardless of ligature settings

Undo/redo works for brush drags and line/rect operations as single steps.

13) Phase 2 placeholder (not implemented now)

Behaviors/loops: per-cell or per-region scripts that change {ch, fg, bg} over time

Keep JSON schema extensible: scene.behaviors[], optional references from cells or groups
