#!/bin/bash

# Rebuild and verify compilation
set -e

BOT_NAME="${1:-kai}"

echo "🔨 [REBUILD] Rebuilding for bot: $BOT_NAME"
echo ""

# Step 1: Clean dist (optional - comment out if you want incremental builds)
echo "🗑️  Cleaning old build..."
rm -rf dist/

# Step 2: Run TypeScript compiler
echo "📦 Compiling TypeScript..."
npx tsc

echo ""
echo "✅ Build complete!"
echo ""

# Step 3: Verify critical files exist
echo "🔍 Verifying compiled files..."
FILES_TO_CHECK=(
  "dist/index.js"
  "dist/core/commandLoader.js"
  "dist/modules/activity/commands/activity.js"
  "dist/modules/ai/commands/ai/_command.js"
)

MISSING=0
for file in "${FILES_TO_CHECK[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✓ $file"
  else
    echo "  ✗ MISSING: $file"
    MISSING=$((MISSING + 1))
  fi
done

echo ""
if [ $MISSING -eq 0 ]; then
  echo "✅ All critical files compiled successfully!"
  echo ""
  echo "Next: Deploy with: ./deploy-single.sh $BOT_NAME"
else
  echo "❌ $MISSING files missing! Build may have failed."
  echo ""
  echo "Try: rm -rf dist && npm ci && npx tsc"
  exit 1
fi
