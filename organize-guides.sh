#!/bin/bash

# Organize all guide files into guides/ folder

set -e

FILES=(
  "START_HERE.md"
  "QUICK_START.md"
  "QUICK_REFERENCE.md"
  "DEPLOYMENT.md"
  "README_DEPLOYMENT.md"
  "DEPLOYMENT_SCRIPTS_CREATED.md"
  "MULTI_INSTANCE_GUIDE.md"
  "CONFIGS_COMPLETE.md"
  "SETUP_COMPLETE.md"
  "SECURE_SETUP_GUIDE.md"
  "COMMAND_LOADING_FIX.md"
  "FIX_COMMAND_LOADING.md"
  "SOLUTION_SUMMARY.md"
  "FIX_SUMMARY.txt"
  "COPY_TO_SERVER.txt"
)

GUIDES_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/guides" && pwd)"

echo "📁 Moving guide files to guides/ folder..."
echo "Target: $GUIDES_DIR"
echo ""

MOVED=0
FAILED=0
SKIPPED=0

for file in "${FILES[@]}"; do
  SOURCE="$(dirname "${BASH_SOURCE[0]}")/$file"
  TARGET="$GUIDES_DIR/$file"
  
  if [ -f "$SOURCE" ]; then
    if [ ! -f "$TARGET" ]; then
      mv "$SOURCE" "$TARGET"
      echo "✓ Moved $file"
      ((MOVED++))
    else
      echo "⊗ Already exists: $file (skipping)"
      rm "$SOURCE" 2>/dev/null || true
      ((SKIPPED++))
    fi
  else
    echo "⊗ Not found: $file"
    ((FAILED++))
  fi
done

echo ""
echo "Summary: $MOVED moved, $SKIPPED already in guides, $FAILED not found"
echo ""
echo "✅ Guide organization complete!"
echo ""
echo "📚 View guides with:"
echo "   cat guides/INDEX.md"
