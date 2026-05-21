# ✅ DEPLOYMENT FIX - COMPLETE SOLUTION

## Problem
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '...FlamebornClient' 
imported from /home/ember/apps/bots/FB/dist/index.js
```

## Root Cause
Node.js ESM requires `.js` extensions on relative imports:
- ❌ `import { x } from './module'`  
- ✅ `import { x } from './module.js'`

TypeScript compiles without extensions, so we need a post-build fix.

## Solution
**Custom Node.js script that automatically adds `.js` extensions after compilation**

## Files Modified

### 1. package.json
```json
"build": "npx tsc && node fix-esm-imports.js"
```
Changed from `"build": "tsc"` to include the fixer script.

### 2. tsconfig.json
- Changed `moduleResolution` from `"node"` to `"bundler"`
- Added `resolveJsonModule` and `allowSyntheticDefaultImports`

### 3. deploy.sh
Added `npm install --omit=dev` before building

### 4. deploy-single.sh
Added `npm install --omit=dev` before building

## Files Added

### Critical
- **fix-esm-imports.js** - Post-build script that fixes imports

### Helpers
- **setup-build.sh** - Clean setup (run once on Linux VM)
- **fix-build.sh** - Manual rebuild
- **detailed-diagnostics.sh** - Debug tool

### Documentation
- **DEPLOYMENT_GUIDE.md** - Master guide (READ THIS)
- **QUICK_START_ESM_FIX.md** - Quick reference
- **ESM_BUILD_FIX.md** - Technical details
- **ESM_FIX_COMPLETE.md** - Full summary

## Quick Start

### Linux VM - First Time Setup
```bash
cd ~/apps/bots/FB
./setup-build.sh        # Clean setup (one time)
./deploy-single.sh kai  # Deploy
pm2 logs flameborn-kai  # Verify
```

### Linux VM - Subsequent Deployments
```bash
./deploy-single.sh kai
```

## How It Works

```
TypeScript Source (.ts)
         ↓
      tsc compile
         ↓
JavaScript Output (.js, imports missing .js)
         ↓
   fix-esm-imports.js
         ↓
Fixed JavaScript (imports have .js extensions)
         ↓
    Node.js ESM works ✅
```

## What The Fixer Does

The `fix-esm-imports.js` script:

1. Finds all `.js` files in `dist/` directory
2. Searches for relative imports without `.js`
3. Adds `.js` extension to relative imports only
4. Skips imports that already have `.js`
5. Leaves external imports unchanged
6. Reports what was fixed

Example transformation:
```js
// BEFORE
import { client } from './core/FlamebornClient';
import { Logger } from './utils/logger';

// AFTER
import { client } from './core/FlamebornClient.js';
import { Logger } from './utils/logger.js';
```

## Verification

After deploying, verify it worked:

```bash
# Check bot is running
pm2 status | grep flameborn-kai
# Should show: online

# Check logs for startup
pm2 logs flameborn-kai
# Should show database connection, commands loading, etc.
# Should NOT show: "Cannot find module" errors

# Verify imports were fixed
grep "from './core/FlamebornClient" ~/apps/bots/FB/dist/index.js
# Should show: import { client } from './core/FlamebornClient.js';
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `tsc: not found` | Run `./setup-build.sh` |
| Build fails | Run `./setup-build.sh` then `./deploy-single.sh kai` |
| Module not found errors | Check `pm2 logs flameborn-kai` for specific error |
| Imports don't have .js | Run `node fix-esm-imports.js` manually |

## All Deployments

### Single Bot
```bash
./deploy-single.sh kai      # Deploy Kai
./deploy-single.sh ember    # Deploy Ember
./deploy-single.sh saphy    # Deploy Saphy
./deploy-single.sh liber    # Deploy Liber
```

### All Bots
```bash
./deploy.sh
```

### Status
```bash
pm2 status     # All bots status
pm2 logs       # All logs
pm2 monit      # Monitor all
```

## Why This Solution

✅ **Pure Node.js** - No external tools needed
✅ **Reliable** - Simple regex replacements
✅ **Fast** - Minimal overhead
✅ **Safe** - Only touches .js files
✅ **Transparent** - Easy to understand
✅ **Maintainable** - Single self-contained script

## No Changes Needed To

- Source code (src/)
- Database configuration (prisma/)
- Environment files (.env.*)
- Discord.js or any dependencies
- PM2 configuration

Only the build process changed!

## Next Steps

1. **Pull** the latest code (includes all changes)
2. **Linux VM first time:** Run `./setup-build.sh`
3. **Deploy:** Run `./deploy-single.sh kai`
4. **Verify:** Check `pm2 logs flameborn-kai`
5. **Monitor:** Use `pm2 status` and `pm2 logs`

## Documentation

Read these in order:

1. **QUICK_START_ESM_FIX.md** - 2 min read
2. **DEPLOYMENT_GUIDE.md** - 5 min read (comprehensive)
3. **ESM_BUILD_FIX.md** - Technical deep dive

## Support

If stuck:

```bash
# Debug
./detailed-diagnostics.sh

# Full reset
./setup-build.sh

# Check logs
pm2 logs flameborn-kai

# Manual fix if needed
node fix-esm-imports.js
npm run build
```

---

**Status: ✅ READY FOR DEPLOYMENT**

All fixes are in place and tested. The build process now handles ESM correctly.
