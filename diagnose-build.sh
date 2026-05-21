#!/bin/bash

echo "==============================================="
echo "  🔍 BUILD DIAGNOSTIC SCRIPT"
echo "==============================================="
echo ""

echo "[CHECK 1] Node version:"
node --version
echo ""

echo "[CHECK 2] NPM version:"
npm --version
echo ""

echo "[CHECK 3] TypeScript version:"
npx tsc --version
echo ""

echo "[CHECK 4] Current directory:"
pwd
echo ""

echo "[CHECK 5] Checking tsconfig.json:"
cat tsconfig.json
echo ""

echo "[CHECK 6] Checking if node_modules exists:"
if [ -d "node_modules" ]; then
  echo "✓ node_modules exists"
  echo "  Size: $(du -sh node_modules | cut -f1)"
else
  echo "❌ node_modules NOT found"
fi
echo ""

echo "[CHECK 7] Removing old dist and rebuilding:"
rm -rf dist/
echo "  Running: npx tsc"
npx tsc 2>&1 | head -50
echo ""

echo "[CHECK 8] Checking dist structure:"
if [ -d "dist" ]; then
  echo "✓ dist/ created"
  echo "  Contents:"
  find dist/ -type f -name "*.js" | head -20
else
  echo "❌ dist/ NOT created"
fi
echo ""

echo "[CHECK 9] Specifically checking for FlamebornClient.js:"
if [ -f "dist/core/FlamebornClient.js" ]; then
  echo "✓ dist/core/FlamebornClient.js exists"
  echo "  First 5 lines:"
  head -5 dist/core/FlamebornClient.js
else
  echo "❌ dist/core/FlamebornClient.js NOT found"
fi
echo ""

echo "[CHECK 10] Checking dist/index.js import statement:"
if [ -f "dist/index.js" ]; then
  echo "✓ dist/index.js exists"
  echo "  First import:"
  head -5 dist/index.js
else
  echo "❌ dist/index.js NOT found"
fi
