# 🎯 START HERE - ESM DEPLOYMENT FIX

## The Issue ❌
```
Error: Cannot find module '.../FlamebornClient'
```
Node.js ESM requires `.js` in relative imports. TypeScript doesn't add them.

## The Solution ✅
Automatic post-build script adds `.js` extensions.

## For Linux VM Users

### First Time (One Command!)
```bash
cd ~/apps/bots/FB && ./setup-build.sh
```

### Every Deployment After That
```bash
./deploy-single.sh kai
```

### Check It Works
```bash
pm2 logs flameborn-kai
```

---

## What Changed

✅ **package.json** - Build now runs ESM fixer
✅ **tsconfig.json** - Better ESM config  
✅ **deploy scripts** - Auto-install dependencies
✅ **fix-esm-imports.js** - NEW: The automatic fixer
✅ **Lots of docs** - See list below

---

## Documentation Map

| File | Purpose | Read Time |
|------|---------|-----------|
| **QUICK_START_ESM_FIX.md** | TL;DR - Just commands | 1 min |
| **DEPLOYMENT_GUIDE.md** | Step-by-step guide | 5 min |
| **ESM_BUILD_FIX.md** | Technical details | 10 min |
| **FIX_SUMMARY.md** | Complete overview | 5 min |
| **This file** | Navigation | 2 min |

---

## The Build Pipeline

```
npm run build
    ↓
npx tsc (compile TypeScript)
    ↓
node fix-esm-imports.js (add .js extensions)
    ↓
dist/ ready for deployment ✅
```

---

## All Commands

```bash
# First time setup (cleans everything)
./setup-build.sh

# Deploy one bot
./deploy-single.sh kai
./deploy-single.sh ember
./deploy-single.sh saphy
./deploy-single.sh liber

# Deploy all bots
./deploy.sh

# Check status
pm2 status
pm2 logs flameborn-kai
pm2 monit

# Manual build (if needed)
npm run build

# Manual fix only (if needed)
node fix-esm-imports.js

# Debug
./detailed-diagnostics.sh
```

---

## Files Modified

```
package.json          (build script)
tsconfig.json         (ESM config)
deploy.sh             (npm install)
deploy-single.sh      (npm install)
```

## Files Added

```
fix-esm-imports.js                   (THE FIXER)
setup-build.sh                       (setup helper)
fix-build.sh                         (rebuild helper)
detailed-diagnostics.sh              (debug tool)
fix-esm-imports-post-build.sh        (bash version)
QUICK_START_ESM_FIX.md              (TL;DR)
DEPLOYMENT_GUIDE.md                 (full guide)
ESM_BUILD_FIX.md                    (technical)
FIX_SUMMARY.md                      (overview)
ESM_FIX_EXPLANATION.md              (explanation)
ESM_FIX_COMPLETE.md                 (summary)
DEPLOYMENT_GUIDE.md                 (master guide)
THIS FILE                           (you are here)
```

---

## No Changes To

- ✅ Source code (src/)
- ✅ Discord.js
- ✅ Database/Prisma
- ✅ Environment files
- ✅ Bot functionality

**Just the build process!**

---

## One-Minute Summary

**Problem:** Node.js ESM imports need `.js`  
**Solution:** Post-build script adds them  
**Setup:** `./setup-build.sh` (once)  
**Deploy:** `./deploy-single.sh kai` (every time)  
**Verify:** `pm2 logs flameborn-kai`  

---

## Quick Troubleshooting

```bash
# tsc not found?
./setup-build.sh

# Build failed?
./setup-build.sh && ./deploy-single.sh kai

# Bot won't start?
pm2 logs flameborn-kai

# Need to debug?
./detailed-diagnostics.sh
```

---

## Key Files Explained

### fix-esm-imports.js (The Star ⭐)
Runs automatically after TypeScript compilation.
Adds `.js` to all relative imports.
No configuration needed.

### setup-build.sh
Removes broken npm packages.
Cleans node_modules.
Installs fresh dependencies.
Does a test build.
Run this ONCE on Linux VM.

### deploy-single.sh
Loads bot config.
Installs dependencies.
Builds (with ESM fix).
Runs Prisma migrations.
Starts with PM2.

---

## Expected Output

### Good (After Deployment):
```
✅ kai deployed successfully!
pm2 logs flameborn-kai:
  Database connection established
  Loading commands...
  Bot is ready!
```

### Bad (Would Look Like):
```
❌ Error: Cannot find module '.../FlamebornClient'
```
(This shouldn't happen - the fix prevents it!)

---

## Next Steps

### For Developers:
1. Pull latest code
2. Nothing else needed - build handles it

### For Linux VM:
1. `./setup-build.sh` (first time only)
2. `./deploy-single.sh kai` (every deployment)
3. `pm2 logs flameborn-kai` (verify)

### For CI/CD:
1. Just run `npm run build`
2. ESM fix runs automatically

---

## Need Help?

1. **Quick questions?** → QUICK_START_ESM_FIX.md
2. **Step-by-step?** → DEPLOYMENT_GUIDE.md
3. **Technical details?** → ESM_BUILD_FIX.md
4. **Overview?** → FIX_SUMMARY.md
5. **Having issues?** → Run `./detailed-diagnostics.sh`

---

**You're all set!** 🚀

Go deploy with confidence. The fix is automatic and transparent.
