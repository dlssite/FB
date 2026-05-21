# 🔧 Linux Deployment Fix - Quick Start

## Problem Fixed ✅

The deployment was failing with:
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/home/ember/apps/bots/FB/dist/core/FlamebornClient'
```

This was caused by **ESM module import paths missing `.js` extensions** in the compiled JavaScript.

## What Changed

1. ✅ **package.json** - Added `tsc-esm-fix` to automatically add `.js` extensions after compilation
2. ✅ **tsconfig.json** - Improved ESM configuration with `moduleResolution: "bundler"`
3. ✅ **deploy.sh** & **deploy-single.sh** - Added `npm install --omit=dev` before building
4. ✅ **fix-esm-imports.sh** - New helper script for manual fixes

## How to Deploy Now

### First Deployment (from Linux VM):

```bash
cd ~/apps/bots/FB

# Install dependencies and rebuild with fix
./fix-esm-imports.sh

# Then deploy your bot
./deploy-single.sh kai
```

### Subsequent Deployments:

```bash
./deploy-single.sh kai
```

The `npm run build` command now automatically applies the ESM fix!

## Verification

After deploying, check that the bot is running:

```bash
pm2 logs flameborn-kai

# Should see startup messages, NOT module not found errors
# If running, you'll see the bot initialization
```

## What the Fix Does

**Before (broken):**
```js
import { client } from './core/FlamebornClient';  // ❌ Missing .js
```

**After (fixed):**
```js
import { client } from './core/FlamebornClient.js';  // ✅ Correct
```

The `tsc-esm-fix` tool automatically transforms all relative imports in the compiled output to include the `.js` extension, which Node.js ESM requires.

## Troubleshooting

If you still see module errors:

```bash
# Manually fix and rebuild
cd ~/apps/bots/FB
./fix-esm-imports.sh

# Check the imports were fixed
grep "from './core" dist/index.js
# Should show imports with .js extensions

# Try deploying again
./deploy-single.sh kai

# Check logs
pm2 logs flameborn-kai
```

## All Bots

To deploy all bots at once:

```bash
./deploy.sh
```

To check their status:

```bash
pm2 status
```

## Questions?

- 📖 See `ESM_FIX_EXPLANATION.md` for technical details
- 🔍 Use `diagnose-build.sh` to debug build issues
- 📊 Check `pm2 logs <app-name>` for runtime errors
