#!/bin/bash

#
# 🔧 ESM BUILD FIX - Complete Setup
# Removes conflicting tsc package and installs correct dependencies
#

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

echo "==============================================="
echo "  🔧 ESM BUILD FIX - Complete Setup"
echo "==============================================="
echo ""

echo "[STEP 1] Checking for conflicting 'tsc' package..."
if npm ls tsc 2>/dev/null | grep -q "tsc@"; then
  echo "⚠️  Found conflicting 'tsc' package - removing it..."
  npm uninstall tsc
  echo "✓ Removed conflicting tsc package"
else
  echo "✓ No conflicting tsc package found"
fi
echo ""

echo "[STEP 2] Ensuring TypeScript and tsc-esm-fix are installed..."
npm install --save-dev typescript@5.4.5 tsc-esm-fix@2.20.8
echo "✓ Dependencies installed"
echo ""

echo "[STEP 3] Cleaning old dist directory..."
rm -rf dist/
echo "✓ Cleaned dist/"
echo ""

echo "[STEP 4] Building project with ESM fixes..."
npm run build
echo "✓ Build complete"
echo ""

echo "[STEP 5] Verifying build..."
if [ -f "dist/index.js" ] && [ -f "dist/core/FlamebornClient.js" ]; then
  echo "✓ dist/index.js and dist/core/FlamebornClient.js exist"
  
  # Check if imports were fixed
  if grep -q "from './core/FlamebornClient.js" dist/index.js; then
    echo "✓ ESM imports have .js extensions (FIXED)"
  else
    echo "⚠️  ESM imports still missing .js extensions"
    echo "   First import line:"
    head -5 dist/index.js | grep "from './core"
  fi
else
  echo "❌ Build output not found!"
  exit 1
fi
echo ""

echo "==============================================="
echo "   ✅ ESM Build Fix Complete!"
echo "==============================================="
echo ""
echo "You can now deploy:"
echo "  ./deploy-single.sh kai"
echo ""
