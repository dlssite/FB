# 🚀 QUICK START - ESM Build Fix

## TL;DR - Just Run This

```bash
cd ~/apps/bots/FB
./setup-build.sh          # First time only
./deploy-single.sh kai    # Deploy bot
pm2 logs flameborn-kai    # Check logs
```

## What Was Fixed

**Error was:** `Cannot find module '...FlamebornClient'`

**Why:** Node.js ESM requires `.js` in relative imports
- ❌ `import { x } from './module'`
- ✅ `import { x } from './module.js'`

## The Solution

A post-build Node.js script automatically adds `.js` extensions:

```bash
npm run build
# Runs: npx tsc && node fix-esm-imports.js
```

## One-Time Setup

```bash
./setup-build.sh
```

This removes broken packages and installs correct ones.

## Deploy Any Bot

```bash
# Single bot
./deploy-single.sh kai

# All bots
./deploy.sh
```

## Check Status

```bash
pm2 status
pm2 logs flameborn-kai
```

## If It Still Doesn't Work

```bash
# Full cleanup and rebuild
cd ~/apps/bots/FB
./setup-build.sh

# Try deployment again
./deploy-single.sh kai

# Check logs
pm2 logs flameborn-kai
```

## Files to Know

- **fix-esm-imports.js** - The fixer (automatic)
- **setup-build.sh** - First-time setup
- **deploy-single.sh** - Deploy one bot
- **ESM_BUILD_FIX.md** - Full documentation

---

**That's it!** 🎉 The build now handles ESM correctly.
