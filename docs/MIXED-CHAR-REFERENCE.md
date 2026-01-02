# Mixed Intersection Character Reference

Visual reference for all mixed single/double line intersection characters.

## Single Horizontal + Double Vertical

These characters have:
- **Horizontal lines: single** (─)
- **Vertical lines: double** (║)

### Full Cross
```
    ║
  ─ ╫ ─
    ║
```
Character: `╫` (U+256B)
Pattern: north + south + east + west
All directions connected

### T-Junctions

**Left Tee (opens to right)**
```
    ║
    ╞ ─
    ║
```
Character: `╞` (U+255E)
Pattern: north + south + east
No west connection

**Right Tee (opens to left)**
```
    ║
  ─ ╡
    ║
```
Character: `╡` (U+2561)
Pattern: north + south + west
No east connection

**Top Tee (opens down)**
```
  ─ ╥ ─
    ║
```
Character: `╥` (U+2565)
Pattern: south + east + west
No north connection

**Bottom Tee (opens up)**
```
    ║
  ─ ╨ ─
```
Character: `╨` (U+2568)
Pattern: north + east + west
No south connection

---

## Double Horizontal + Single Vertical

These characters have:
- **Horizontal lines: double** (═)
- **Vertical lines: single** (│)

### Full Cross
```
    │
  ═ ╪ ═
    │
```
Character: `╪` (U+256A)
Pattern: north + south + east + west
All directions connected

### T-Junctions

**Left Tee (opens to right)**
```
    │
    ╟ ═
    │
```
Character: `╟` (U+255F)
Pattern: north + south + east
No west connection

**Right Tee (opens to left)**
```
    │
  ═ ╢
    │
```
Character: `╢` (U+2562)
Pattern: north + south + west
No east connection

**Top Tee (opens down)**
```
  ═ ╤ ═
    │
```
Character: `╤` (U+2564)
Pattern: south + east + west
No north connection

**Bottom Tee (opens up)**
```
    │
  ═ ╧ ═
```
Character: `╧` (U+2567)
Pattern: north + east + west
No south connection

---

## Quick Mapping Reference

### For `horizontalSingle && verticalDouble`:
- N+S+E+W: `╫`
- N+S+E: `╞`
- N+S+W: `╡`
- N+E+W: `╨`
- S+E+W: `╥`

### For `horizontalDouble && verticalSingle`:
- N+S+E+W: `╪`
- N+S+E: `╟`
- N+S+W: `╢`
- N+E+W: `╧`
- S+E+W: `╤`

---

## Testing in Browser Console

```javascript
console.log("╫ ╞ ╡ ╥ ╨"); // Single horizontal + double vertical
console.log("╪ ╟ ╢ ╤ ╧"); // Double horizontal + single vertical
```

View this in your terminal font to see how they actually render!