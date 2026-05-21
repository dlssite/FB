#!/bin/bash

#
# 🔧 SETUP: ESM Build Fix (Linux VM)
# Removes conflicting packages and sets up correct build process
#

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

echo "==============================================="
echo "  🔧 ESM BUILD SETUP"
echo "==============================================="
echo ""

echo "[STEP 1] Removing conflicting 'tsc' package..."
npm uninstall tsc tsc-esm-fix 2>/dev/null || true
echo "✓ Removed conflicting packages"
echo ""

echo "[STEP 2] Cleaning old dependencies..."
rm -rf node_modules/ package-lock.json
echo "✓ Cleaned node_modules"
echo ""

echo "[STEP 3] Installing dependencies..."
npm install
echo "✓ Dependencies installed"
echo ""

echo "[STEP 4] Building project..."
npm run build
echo "✓ Build successful"
echo ""

echo "==============================================="
echo "   ✅ Setup Complete!"
echo "==============================================="
echo ""
echo "Your build is now configured to:"
echo "  1. Compile TypeScript: npx tsc"
echo "  2. Fix ESM imports: node fix-esm-imports.js"
echo "  3. Automatically run both with: npm run build"
echo ""
echo "Next: Deploy your bot"
echo "  ./deploy-single.sh kai"
echo ""
