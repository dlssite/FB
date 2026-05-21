#!/bin/bash

#
# 🔧 Fix ESM Imports - Post-build Script
# Adds .js extensions to all relative imports in compiled JavaScript
#

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIST_DIR="$PROJECT_ROOT/dist"

if [ ! -d "$DIST_DIR" ]; then
  echo "❌ dist/ directory not found. Build first with: npm run tsc"
  exit 1
fi

echo "🔧 Fixing ESM imports in dist/ directory..."

# Find all .js files and fix imports
find "$DIST_DIR" -name "*.js" -type f | while read file; do
  # Fix imports from relative paths without .js extension
  # Pattern: from './path/to/module'
  # Replace with: from './path/to/module.js'
  # But only if it doesn't already have .js
  
  # Use sed to add .js before the closing quote for relative imports
  sed -i \
    -e "s/from '\.\([^']*[^.]\)';$/from '.\1.js';/g" \
    -e "s/from \"\.\([^\"]*[^.]\)\";$/from \".\1.js\";/g" \
    "$file"
done

echo "✓ ESM imports fixed in all files"
echo ""
echo "Verifying dist/index.js..."
if grep -q "from './core/FlamebornClient.js" "$DIST_DIR/index.js"; then
  echo "✓ dist/index.js has correct imports with .js extensions"
else
  echo "⚠️ Check dist/index.js imports:"
  head -10 "$DIST_DIR/index.js" | grep "from '"
fi
