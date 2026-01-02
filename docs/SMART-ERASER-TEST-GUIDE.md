# Smart Eraser Visual Testing Guide

**Purpose:** Manual testing checklist for smart box-drawing eraser functionality  
**Estimated Time:** 5-10 minutes

## Setup

1. Start the dev server: `npm run dev`
2. Open http://localhost:5173 in your browser
3. Create a new project (any template)
4. Select the **Brush tool** `[B]`
5. Change brush mode to **"Smart Single Line"** in the dropdown

## Test 1: Basic T-Junction Cleanup

**Goal:** Verify that erasing from a T-junction updates it correctly

### Steps:
1. Draw a T-junction:
   - Click at (5, 5) - should place `─`
   - Click at (6, 5) - should become `┬`
   - Click at (7, 5) - should place `─`
   - Click at (6, 6) - should complete the T with `│`

2. Expected result:
```
 ─┬─
  │
```

3. Switch to **Eraser tool** `[E]`

4. Erase the top-left horizontal line at (5, 5)

5. **Expected:** The T-junction `┬` should automatically become `└` (bottom-left corner)
```
  └─
  │
```

### ✅ Pass Criteria:
- Junction updates automatically when you erase adjacent line
- No manual cleanup needed
- Undo restores both the erased cell and the junction

---

## Test 2: Cross Junction Simplification

**Goal:** Verify cross junctions simplify to T-junctions when one arm is erased

### Steps:
1. Select **Brush tool** `[B]` with **Smart Single Line** mode
2. Draw a cross:
   - Click at (10, 8) - places `─`
   - Click at (11, 8) - becomes junction
   - Click at (12, 8) - continues line
   - Click at (11, 7) - adds north arm
   - Click at (11, 9) - adds south arm (completes cross `┼`)

3. Expected result:
```
  │
 ─┼─
  │
```

4. Switch to **Eraser tool** `[E]`

5. Erase the right horizontal line at (12, 8)

6. **Expected:** Cross `┼` becomes `┤` (left-pointing tee)
```
  │
 ─┤
  │
```

7. Undo `[Ctrl+Z]` - should restore both cells

8. Redo `[Ctrl+Y]` - should erase again with junction update

### ✅ Pass Criteria:
- Cross simplifies to correct T-junction
- Correct orientation (┤ not ├)
- Undo/redo works for both cells

---

## Test 3: Corner Simplification

**Goal:** Verify corners become simple lines when one side is erased

### Steps:
1. Select **Brush tool** `[B]` with **Smart Single Line** mode
2. Draw an L-shape:
   - Click at (15, 10)
   - Click at (16, 10)
   - Click at (16, 11) - should create `┐` corner at (16, 10)

3. Expected result:
```
 ─┐
  │
```

4. Switch to **Eraser tool** `[E]`

5. Erase the horizontal line at (15, 10)

6. **Expected:** Corner `┐` becomes vertical line `│`
```
  │
  │
```

### ✅ Pass Criteria:
- Corner simplifies to simple line
- Orientation preserved (vertical stays vertical)

---

## Test 4: Isolated Lines Stay Unchanged

**Goal:** Verify simple lines don't change orientation when neighbors are erased

### Steps:
1. Select **Brush tool** `[B]` with **Smart Single Line** mode
2. Draw this pattern:
   - Click at (20, 12) - `─`
   - Click at (21, 12) - becomes `┬`
   - Click at (22, 12) - `─`
   - Click at (21, 13) - `│`

3. Expected result:
```
 ─┬─
  │
```

4. Switch to **Eraser tool** `[E]`

5. Erase the center junction at (21, 12)

6. **Expected:** Lines remain in their original orientation
```
 ─ ─
  │
```

**Note:** The horizontal lines stay `─`, the vertical stays `│` - they do NOT flip!

### ✅ Pass Criteria:
- Horizontal lines stay horizontal
- Vertical line stays vertical
- No unexpected character changes

---

## Test 5: Double-Line Box Drawing

**Goal:** Verify smart eraser works with double-line characters

### Steps:
1. Select **Brush tool** `[B]` with **Smart Double Line** mode
2. Draw a cross:
   - Click at (25, 15) - `═`
   - Click at (26, 15) - junction
   - Click at (27, 15) - `═`
   - Click at (26, 14) - `║`
   - Click at (26, 16) - `║` (completes `╬`)

3. Expected result:
```
  ║
 ═╬═
  ║
```

4. Switch to **Eraser tool** `[E]`

5. Erase bottom vertical line at (26, 16)

6. **Expected:** Cross `╬` becomes `╦` (double-line tee pointing down)
```
  ║
 ═╦═
```

### ✅ Pass Criteria:
- Double-line characters update correctly
- Junction uses double-line style (not mixed)

---

## Test 6: Drag Erasing Across Multiple Junctions

**Goal:** Verify drag erasing handles multiple connected junctions

### Steps:
1. Select **Brush tool** `[B]` with **Smart Single Line** mode
2. Draw a horizontal line with multiple junctions:
   - Draw horizontal line from (30, 18) to (34, 18)
   - Add verticals at (31, 19), (32, 19), (33, 19)
   - This creates multiple T-junctions

3. Expected result:
```
 ─┬┬┬─
  │││
```

4. Switch to **Eraser tool** `[E]`

5. Click and drag from (31, 18) to (33, 18) to erase the middle section

6. **Expected:** All three junctions erased, end pieces remain
```
 ─  ─
  │││
```

### ✅ Pass Criteria:
- Drag erasing works smoothly
- Multiple cells erased in one stroke
- Vertical lines remain vertical

---

## Test 7: Color Preservation

**Goal:** Verify neighbor colors are preserved when updated

### Steps:
1. Select **Brush tool** `[B]` with **Smart Single Line** mode
2. Select a bright foreground color (e.g., red, green, blue)
3. Draw a T-junction in that color:
```
 ─┬─
  │
```

4. Switch to **Eraser tool** `[E]`

5. Erase one of the horizontal lines

6. **Expected:** Junction updates but keeps the same color

### ✅ Pass Criteria:
- Updated junction retains original color
- No color reset to default

---

## Test 8: Undo/Redo with Neighbor Updates

**Goal:** Verify undo/redo works correctly with smart updates

### Steps:
1. Create any junction pattern (see Test 1-5)
2. Erase a cell that causes neighbor updates
3. Press `Ctrl+Z` (Undo)
4. **Expected:** Both erased cell AND neighbor updates are undone
5. Press `Ctrl+Y` (Redo)
6. **Expected:** Both cells update again

### ✅ Pass Criteria:
- Single undo restores everything
- Single redo reapplies everything
- No partial states visible

---

## Bug Watch List

While testing, watch for these potential issues:

❌ **Wrong junction type:** Cross becomes wrong T-junction orientation  
❌ **Line flipping:** Horizontal becomes vertical or vice versa  
❌ **Color loss:** Updated neighbors lose their colors  
❌ **Partial undo:** Undo only restores some cells  
❌ **Double updates:** Neighbors update twice or incorrectly  
❌ **Non-box chars affected:** Regular characters (A, B, etc.) change unexpectedly

---

## Quick Visual Reference

### Single-Line Box Drawing Characters:
```
─ │     Horizontal and Vertical
┌ ┐     Top-left and Top-right corners
└ ┘     Bottom-left and Bottom-right corners
├ ┤     Left and Right tees
┬ ┴     Top and Bottom tees
┼       Cross
```

### Double-Line Box Drawing Characters:
```
═ ║     Horizontal and Vertical
╔ ╗     Top-left and Top-right corners
╚ ╝     Bottom-left and Bottom-right corners
╠ ╣     Left and Right tees
╦ ╩     Top and Bottom tees
╬       Cross
```

---

## Summary Checklist

- [ ] Test 1: T-junction cleanup
- [ ] Test 2: Cross junction simplification
- [ ] Test 3: Corner simplification
- [ ] Test 4: Isolated lines unchanged
- [ ] Test 5: Double-line support
- [ ] Test 6: Drag erasing
- [ ] Test 7: Color preservation
- [ ] Test 8: Undo/redo

**All tests passing?** Smart eraser is working correctly! ✅

**Issues found?** Document unexpected behavior and compare with documentation in `SMART-ERASER.md`

---

**Last Updated:** January 2025  
**Related Docs:** `SMART-ERASER.md`, `M4-P2-smart-box-drawing-completion.md`
