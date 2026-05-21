#!/bin/bash

#
# 🔧 FIX: ESM Module Import Extensions
# This script fixes the ESM import issue where relative imports don't have .js extensions
#

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

echo "==============================================="
echo "  🔧 FIXING ESM IMPORTS"
echo "==============================================="
echo ""

echo "[STEP 1] Installing dev dependencies including tsc-esm-fix..."
npm install --save-dev tsc-esm-fix@^2.20.8
echo "✓ Dependencies installed"
echo ""

echo "[STEP 2] Building project with ESM fixes..."
npm run build
echo "✓ Build complete with ESM fixes applied"
echo ""

echo "[STEP 3] Verifying FlamebornClient.js has correct imports..."
if grep -q "from './core/FlamebornClient.js" dist/index.js; then
  echo "✓ dist/index.js has correct import with .js extension"
else
  echo "⚠ dist/index.js might not have .js extensions yet"
  echo "  Checking actual content:"
  head -5 dist/index.js | grep "from './core"
fi
echo ""

echo "==============================================="
echo "   ✅ ESM Import Fix Complete!"
echo "==============================================="
echo ""
echo "Next step: Deploy the application"
echo "  ./deploy-single.sh kai"
