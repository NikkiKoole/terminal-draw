# Documentation Organization

This folder contains all project documentation organized with a structured naming convention for clarity and scalability.

## Naming Convention

### Prefixes

- **`00-`** = Foundation documents (design, master plans)
- **`M{n}-`** = Milestone documents (major feature groups)
- **`P{n}-`** = Phase documents (within milestones)
- **`F{n}-`** = Feature-specific documents
- **`S{n}-`** = Session/process documents

### File Types

- **`-plan.md`** = Planning documents and roadmaps
- **`-completion.md`** = Completion summaries and achievements
- **`-progress.md`** = Work-in-progress status updates
- **`-notes.md`** = Session notes and informal documentation

## Structure Example

```
00-design-document.md           # Master design specification
00-implementation-plan.md       # Overall implementation roadmap
M1-original-editor-completion.md # First milestone completion
M2-advanced-editing-completion.md # Second milestone completion
M3-flexible-layers-plan.md      # Third milestone planning
M3-P1-infrastructure-completion.md # Phase 1 of milestone 3
M3-P2-startup-dialog-plan.md    # Phase 2 planning
F1-glyph-reorganization.md      # Feature-specific documentation
S1-handoff-notes.md             # Session handoff information
```

## Benefits

1. **Chronological Order**: Files sort naturally by milestone and phase
2. **Clear Relationships**: Easy to see which phase belongs to which milestone
3. **Scalable**: Pattern works for unlimited milestones (M4, M5, etc.)
4. **Consistent**: All files follow the same naming convention
5. **Searchable**: Prefixes make finding specific documents easy

## Usage Guidelines

- Use kebab-case for multi-word descriptions
- Keep names descriptive but concise
- Include status/type suffix for clarity
- Number milestones and phases sequentially
- Group related documents by prefix when browsing

This convention ensures the documentation remains organized and navigable as the project grows!