#!/bin/bash

#
# 🔧 Quick Rebuild
# Rebuilds just the dist folder without reinstalling dependencies
#

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

echo "==============================================="
echo "  🔧 Quick Rebuild"
echo "==============================================="
echo ""

echo "[STEP 1] Cleaning old dist..."
rm -rf dist/
echo "✓ Cleaned dist/"
echo ""

echo "[STEP 2] Rebuilding with ESM fixes..."
npm run build
echo "✓ Build complete"
echo ""

echo "[STEP 3] Verifying..."
if [ -f "dist/index.js" ]; then
  echo "✓ Build successful"
  echo ""
  echo "Checking for bare imports..."
  if grep -q "import './network/mothership.js'" dist/index.js; then
    echo "✓ Bare imports have .js extensions"
  else
    echo "⚠️ Check bare imports in dist/index.js"
  fi
else
  echo "❌ Build failed"
  exit 1
fi
echo ""

echo "==============================================="
echo "   ✅ Rebuild Complete!"
echo "==============================================="
