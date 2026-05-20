# 🔧 Fix Command Module Loading Error

## Problem
Bot starts but crashes with:
```
Error: Cannot find module 'file:///home/ember/apps/bots/FB/dist/modules/activity/commands/activity.js'
Error: Cannot find module 'file:///home/ember/apps/bots/FB/dist/modules/ai/commands/ai/_command.js'
```

## Root Cause
The TypeScript files in `src/modules/*/commands/` aren't being compiled to `dist/modules/*/commands/`

This happens when:
1. Build is incomplete or incremental build fails
2. TypeScript compiler skips certain files
3. `dist/` folder has stale/partial build

## Solution: Clean Rebuild on Server

### Option 1: Quick Fix (Recommended)
```bash
cd ~/apps/bots/FB

# Clean build
rm -rf dist/
npx tsc

# Verify files exist
ls -la dist/modules/activity/commands/
ls -la dist/modules/ai/commands/ai/

# If files exist, redeploy Kai
./deploy-single.sh kai
```

### Option 2: Full Clean Deployment
```bash
cd ~/apps/bots/FB

# Stop all bots
pm2 delete ecosystem.config.js

# Clean everything
rm -rf dist/ node_modules/

# Reinstall and rebuild
npm ci
npx tsc

# Redeploy Kai
./deploy-single.sh kai

# Then others
./deploy-single.sh ember
./deploy-single.sh saphy
./deploy-single.sh liber
```

### Option 3: Use New Rebuild Script
```bash
chmod +x rebuild.sh
./rebuild.sh kai    # Rebuilds and verifies Kai files
./deploy-single.sh kai
```

---

## What Was Fixed

Updated both deploy scripts to do **clean builds** instead of incremental:

**Before:**
```bash
npm run build      # Might skip files if already compiled
```

**After:**
```bash
rm -rf dist/       # Remove old build
npx tsc            # Full clean TypeScript compile
```

This ensures:
- ✅ All TypeScript files compile fresh
- ✅ `src/modules/*/commands/` files end up in `dist/modules/*/commands/`
- ✅ No stale/partial builds causing module not found errors

---

## Verify Fix Works

After running the rebuild:

```bash
# 1. Check files exist
ls dist/modules/activity/commands/activity.js
ls dist/modules/ai/commands/ai/_command.js

# 2. Deploy
./deploy-single.sh kai

# 3. Check logs
pm2 logs flameborn-kai

# Expected: Bot starts with NO "Cannot find module" errors
```

---

## Files Changed

- **deploy-single.sh** - Now does `rm -rf dist/ && npx tsc`
- **deploy.sh** - Now does `rm -rf dist/ && npx tsc`
- **rebuild.sh** - New script to rebuild and verify

---

## Why This Happens

When TypeScript compiles incrementally, it sometimes misses files, especially:
- Files in nested directories (`src/modules/*/commands/`)
- Files added recently or with timing issues
- Stale `.js` files in `dist/` that don't match source

**Solution:** Always do clean builds in production deployments.

---

## Next Steps

1. **On server, run:**
   ```bash
   rm -rf dist/
   npx tsc
   ./deploy-single.sh kai
   pm2 logs flameborn-kai
   ```

2. **If Kai works:**
   ```bash
   ./deploy-single.sh ember
   ./deploy-single.sh saphy
   ./deploy-single.sh liber
   ```

3. **Verify all running:**
   ```bash
   pm2 status
   ```

---

## Prevention

Going forward, the deploy scripts will always do clean builds, so this shouldn't happen again.

If it does, just run:
```bash
rm -rf dist/ && npx tsc
```

Before redeploying.
