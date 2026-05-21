#!/bin/bash

#
# 🔍 Detailed Build Diagnostics
# Shows exactly what's happening with tsc and tsc-esm-fix
#

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

echo "==============================================="
echo "  🔍 DETAILED BUILD DIAGNOSTICS"
echo "==============================================="
echo ""

echo "[CHECK 1] Which 'tsc' is available?"
which tsc || echo "  tsc not in PATH"
echo ""

echo "[CHECK 2] NPX can find typescript?"
npx --yes which tsc || echo "  Failed to find tsc via npx"
echo ""

echo "[CHECK 3] Checking installed packages..."
npm ls --depth=0 | grep -E "(typescript|tsc|tsc-esm-fix)" || echo "  Filtering results..."
echo ""

echo "[CHECK 4] TypeScript version via npx:"
npx -y tsc --version 2>&1
echo ""

echo "[CHECK 5] tsc-esm-fix availability:"
npx -y tsc-esm-fix --version 2>&1 || echo "  tsc-esm-fix not found"
echo ""

echo "[CHECK 6] Attempting build with verbose output:"
echo "  Running: npm run build"
npm run build 2>&1 | head -20
echo ""

echo "[CHECK 7] Checking dist folder after build:"
if [ -d "dist" ]; then
  echo "✓ dist/ exists"
  echo "  Files: $(find dist -name "*.js" | wc -l) JavaScript files"
  ls -la dist/core/ 2>/dev/null | head -5 || echo "  (no dist/core)"
else
  echo "❌ dist/ does not exist"
fi
echo ""

echo "[CHECK 8] Checking if imports have .js extensions:"
if grep -q "from './core/FlamebornClient.js" dist/index.js 2>/dev/null; then
  echo "✓ Imports have .js extensions"
elif grep -q "from './core/FlamebornClient'" dist/index.js 2>/dev/null; then
  echo "❌ Imports are MISSING .js extensions"
else
  echo "? Could not find import line"
fi
