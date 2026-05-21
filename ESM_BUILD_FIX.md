# 🔧 ESM Build Fix - Complete Solution

## Problem Summary

The deployment was failing with:
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '...FlamebornClient'
```

**Root Cause:** TypeScript compiled to ES Modules (ESM), but relative imports were missing `.js` extensions. Node.js ESM requires explicit file extensions for relative imports.

## Solution

Instead of relying on an external tool, we now use a **custom Node.js post-build script** (`fix-esm-imports.js`) that automatically adds `.js` extensions to all relative imports.

### How It Works

1. **TypeScript compiles:** `npx tsc` converts `.ts` → `.js`
2. **ESM fixer runs:** `node fix-esm-imports.js` adds `.js` extensions
3. **Result:** All relative imports are Node.js ESM compatible

```
BEFORE (broken):
  import { client } from './core/FlamebornClient';  ❌

AFTER (fixed):
  import { client } from './core/FlamebornClient.js';  ✅
```

## Setup on Linux VM

### First Time Setup

```bash
cd ~/apps/bots/FB

# Remove conflicting packages and reinstall
./setup-build.sh
```

This script:
- Removes the conflicting `tsc` npm package
- Removes old `tsc-esm-fix` dependency
- Reinstalls all dependencies
- Builds the project with the fix applied

### Deploy Your Bot

```bash
./deploy-single.sh kai
```

### Check It's Working

```bash
pm2 logs flameborn-kai
```

Should see startup messages (no module errors).

## How the Fix Works

### The Custom Fixer: `fix-esm-imports.js`

Located in the project root, this Node.js script:

1. **Finds** all compiled `.js` files in `dist/`
2. **Scans** each file for relative imports
3. **Adds** `.js` extensions only to relative imports (not external packages)
4. **Verifies** the fix was applied correctly

### Build Process

```bash
npm run build

# This runs:
#   1. npx tsc                  # Compile TypeScript
#   2. node fix-esm-imports.js  # Fix ESM imports
```

## Files Changed

### Modified:
- **package.json** - Updated build script to use Node.js fixer
- **tsconfig.json** - Optimized for ESM output
- **deploy.sh** & **deploy-single.sh** - Ensure npm install before building

### New:
- **fix-esm-imports.js** - Custom post-build fixer script
- **setup-build.sh** - Initial setup script for Linux VM
- **fix-build.sh** - Manual cleanup and rebuild script
- **detailed-diagnostics.sh** - Debug script
- **fix-esm-imports-post-build.sh** - Bash version of fixer (fallback)

## Troubleshooting

### If build still fails:

```bash
# Full reset
./setup-build.sh

# Try again
./deploy-single.sh kai
```

### If you see "Cannot find module" errors in logs:

```bash
# Verify the fix was applied
grep "from './core/FlamebornClient" dist/index.js
# Should show: import { client } from './core/FlamebornClient.js';

# If not fixed, manually run:
node fix-esm-imports.js

# Then try deployment again
./deploy-single.sh kai
```

### Check what npm packages are installed

```bash
npm ls | grep -E "(typescript|tsc|esm)" | head -10
```

Should show:
- ✓ typescript
- ✗ tsc (should NOT be present)
- ✗ tsc-esm-fix (should NOT be present)

## Manual Commands

```bash
# Just compile (without fixing)
npx tsc

# Just fix imports
node fix-esm-imports.js

# Full build (compile + fix)
npm run build

# Clean rebuild
rm -rf dist node_modules package-lock.json
npm install
npm run build
```

## All Bots

To deploy all 4 bots at once:

```bash
./deploy.sh
```

Check status:

```bash
pm2 status
pm2 logs
```

## Why This Solution

1. **Reliable** - Uses standard Node.js, no external tools
2. **Fast** - Simple regex-based file processing
3. **Transparent** - Easy to understand and debug
4. **Maintainable** - All logic in one simple script
5. **Zero Dependencies** - No additional npm packages needed

## References

- [Node.js ESM Module Resolution](https://nodejs.org/api/esm.html#resolution-algorithm)
- [TypeScript ESM Output](https://www.typescriptlang.org/docs/handbook/esm-node.html)

---

**Questions?** Check logs with: `pm2 logs flameborn-kai`
