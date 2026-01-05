#!/bin/bash

echo "📁 Terminal Draw - Complete Project Structure"
echo "============================================="
echo

echo "🎯 Main Directories:"
echo "├── src/              # Source code"
echo "│   ├── core/         # Core classes (Scene, Layer, StateManager, Cell)"
echo "│   ├── tools/        # Drawing tools (Brush, Rectangle, Text, Line, etc.)"
echo "│   ├── input/        # Input handling (HitTestOverlay)"
echo "│   ├── ui/           # UI components (dialogs, panels)"
echo "│   ├── rendering/    # Rendering system (LayerRenderer, Compositor)"
echo "│   ├── commands/     # Command pattern implementations"
echo "│   ├── export/       # Export functionality"
echo "│   ├── io/           # File I/O operations"
echo "│   └── utils/        # Utility functions"
echo "├── tests/            # Test files (1130+ tests across 36 files)"
echo "├── docs/             # Documentation & design documents"
echo "├── styles/           # CSS stylesheets"
echo "├── assets/           # Static assets"
echo "├── scripts/          # Build & development scripts"
echo "├── test-pages/       # Test HTML pages"
echo "└── dist/             # Build output"
echo

echo "📚 Documentation:"
echo "├── docs/README.md                         # Documentation index"
echo "├── docs/00-design-document.md             # Core design"
echo "├── docs/00-implementation-plan.md         # Implementation roadmap"
echo "├── docs/M1-M6-*-completion.md            # Milestone completions"
echo "└── docs/F1-F2-*-roadmap.md               # Future features"
echo

echo "🔧 Key Files:"
echo "├── src/app.js        # Main application entry point"
echo "├── index.html        # HTML entry point"
echo "├── package.json      # Dependencies & scripts"
echo "├── README.md         # Project overview"
echo "└── bun.lock          # Dependency lock file"
echo

echo "🧪 Quick Commands:"
echo "├── bun run test:summary    # Test results summary"
echo "├── bun run build:check     # Quick build verification"
echo "├── bun run lint:check      # Code quality check"
echo "├── bun run check:all       # Run all checks"
echo "├── bun run show:structure  # Show this overview"
echo "└── bun run dev             # Start dev server"
echo

echo "📊 Project Stats:"
echo "├── $(find src -name "*.js" | wc -l | tr -d ' ') source files"
echo "├── $(find tests -name "*.test.js" | wc -l | tr -d ' ') test files"
echo "├── $(find docs -name "*.md" | wc -l | tr -d ' ') documentation files"
echo "├── $(find src -type d | wc -l | tr -d ' ') source directories"
echo "└── $(grep -r "describe\|it(" tests/ | wc -l | tr -d ' ') total tests"
echo

echo "🏗️ Architecture Highlights:"
echo "├── Cell-based rendering system"
echo "├── Multi-layer composition"
echo "├── Command pattern for undo/redo"
echo "├── Event-driven state management"
echo "├── Tool-based drawing system"
echo "├── Template-based project creation"
echo "└── Comprehensive test coverage"
