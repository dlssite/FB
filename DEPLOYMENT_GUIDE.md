# 🔥 FLAMEBORN DEPLOYMENT - ESM FIX MASTER GUIDE

## 📋 Executive Summary

**Issue:** Linux deployment failing with `ERR_MODULE_NOT_FOUND` when importing modules
**Root Cause:** Node.js ESM requires `.js` extensions on relative imports
**Solution:** Automatic post-build script adds `.js` to all relative imports
**Status:** ✅ FIXED AND READY

## 🚀 FOR THE IMPATIENT

```bash
# SSH into Linux VM
ssh ember@srv1240072

# Go to project
cd ~/apps/bots/FB

# First time only - clean setup
./setup-build.sh

# Deploy any bot
./deploy-single.sh kai

# Check it's running
pm2 logs flameborn-kai
```

That's it! The bot should start without module errors.

---

## 📚 WHAT WAS CHANGED

### Core Files Modified:
1. **package.json** - Updated build script
2. **tsconfig.json** - Optimized ESM settings
3. **deploy.sh** - Added npm install step
4. **deploy-single.sh** - Added npm install step

### New Files Added:
1. **fix-esm-imports.js** ⭐ - The main fixer
2. **setup-build.sh** - Initial setup helper
3. **Documentation** - Various guides

---

## 🔍 THE PROBLEM IN DETAIL

### Before (Broken):
```javascript
// File: src/index.ts
import { client } from './core/FlamebornClient';

// After TypeScript compilation: dist/index.js
import { client } from './core/FlamebornClient';  // ❌ Missing .js

// Node.js tries to load:
//   - ./core/FlamebornClient (no extension)
//   - Can't find it! ❌
```

### After (Fixed):
```javascript
// After build with fix: dist/index.js
import { client } from './core/FlamebornClient.js';  // ✅ Has .js

// Node.js loads:
//   - ./core/FlamebornClient.js
//   - Found it! ✅
```

---

## 🛠️ HOW THE FIX WORKS

### The Build Pipeline:

```
┌─────────────────────────────────────┐
│  npm run build (from package.json) │
└────────────┬────────────────────────┘
             │
             ├─> npx tsc
             │   (TypeScript → JavaScript)
             │   Creates dist/ with imports missing .js
             │
             ├─> node fix-esm-imports.js
             │   (Post-build fix script)
             │   Adds .js to all relative imports
             │
             └─> Done! All imports fixed ✅
```

### The Script (`fix-esm-imports.js`):

1. Finds all `.js` files in `dist/`
2. Scans for relative imports: `from './path'`
3. Adds `.js` extension: `from './path.js'`
4. Skips imports that already have `.js`
5. Verifies the fix worked
6. Reports results

**Result:** All ESM imports are Node.js compatible!

---

## 📖 STEP-BY-STEP DEPLOYMENT

### Step 1: SSH Into Linux VM
```bash
ssh ember@srv1240072
cd ~/apps/bots/FB
```

### Step 2: First Time Setup (Run Once)
```bash
./setup-build.sh
```

This script:
- ✓ Removes conflicting npm packages
- ✓ Cleans old dependencies
- ✓ Installs fresh dependencies
- ✓ Builds the project
- ✓ Verifies the fix worked

**Output should look like:**
```
✓ Removed conflicting packages
✓ Cleaned node_modules
✓ Dependencies installed
✓ Build successful
✓ Setup Complete!
```

### Step 3: Deploy a Bot
```bash
./deploy-single.sh kai
```

This script:
- ✓ Loads environment variables
- ✓ Installs production dependencies
- ✓ Runs the build (compile + fix)
- ✓ Runs Prisma migrations
- ✓ Stops old PM2 process
- ✓ Starts new PM2 process
- ✓ Reports status

**Output should end with:**
```
✅ kai deployed successfully!

View logs:
  pm2 logs flameborn-kai
```

### Step 4: Verify It's Running
```bash
pm2 logs flameborn-kai
```

**Good output** (bot starting):
```
2026-05-21T10:40:00: Starting Flameborn Prototype...
2026-05-21T10:40:01: Database connection established
2026-05-21T10:40:02: Loading commands...
2026-05-21T10:40:05: Bot is ready!
```

**Bad output** (would look like):
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '...FlamebornClient'
```
(This shouldn't happen anymore)

---

## 🔄 DEPLOYING OTHER BOTS

### Single Bot Deployment:
```bash
# Deploy one bot
./deploy-single.sh kai
./deploy-single.sh ember
./deploy-single.sh saphy
./deploy-single.sh liber
```

### Deploy All Bots:
```bash
./deploy.sh
```

### Check All Bots:
```bash
pm2 status
pm2 logs
```

---

## 🐛 TROUBLESHOOTING

### Problem: "tsc: not found"
```bash
./setup-build.sh
```
This removes the conflicting `tsc` npm package and reinstalls correctly.

### Problem: Build fails
```bash
# Full reset
./setup-build.sh

# Try again
./deploy-single.sh kai
```

### Problem: Bot starts but crashes
```bash
# Check the actual error
pm2 logs flameborn-kai --lines 50

# If it's an ESM error, manually fix:
cd ~/apps/bots/FB
node fix-esm-imports.js

# Rebuild
npm run build

# Try deploying again
./deploy-single.sh kai
```

### Problem: Still getting module errors
```bash
# Verify the fix was applied
grep "from './core/FlamebornClient" dist/index.js

# Should show (with .js):
import { client } from './core/FlamebornClient.js';

# If not, something's wrong with the fixer
# Try running it manually:
node fix-esm-imports.js

# Check output for errors
```

---

## 📊 VERIFICATION CHECKLIST

After deploying a bot:

- [ ] `./deploy-single.sh kai` completes without errors
- [ ] `pm2 status` shows `flameborn-kai` as `online`
- [ ] `pm2 logs flameborn-kai` shows startup messages (no errors)
- [ ] `grep "from './core/FlamebornClient" dist/index.js` shows `.js` extension
- [ ] Bot responds to commands in Discord (if configured)

---

## 📚 REFERENCE DOCUMENTATION

### Quick References:
- **QUICK_START_ESM_FIX.md** - TL;DR version
- **ESM_BUILD_FIX.md** - Complete technical guide
- **ESM_FIX_COMPLETE.md** - Full summary with all details

### Helper Scripts:
- **setup-build.sh** - Initial setup (run once)
- **fix-build.sh** - Manual cleanup and rebuild
- **detailed-diagnostics.sh** - Debug/diagnostic tool
- **fix-esm-imports.js** - The main fixer (runs automatically)

---

## 🎯 WHAT TO DO NOW

### For Development (Windows):
1. Pull the latest code
2. Code as normal (no changes needed)
3. Commit and push

### For Linux VM (Deployment):
1. SSH in
2. Run `./setup-build.sh` (first time only)
3. Run `./deploy-single.sh kai` (every deployment)
4. Check with `pm2 logs flameborn-kai`

### For CI/CD (If Applicable):
- The build script handles everything
- Just run `npm run build` before deployment
- No additional steps needed

---

## ❓ FAQ

**Q: Do I need to reinstall every time?**
A: No. After `./setup-build.sh`, just use `./deploy-single.sh kai`.

**Q: What if I deploy without running setup-build.sh?**
A: The deploy script includes `npm install`, so it should work. But `setup-build.sh` is safer the first time.

**Q: Can I deploy multiple bots?**
A: Yes! Either run `./deploy-single.sh` for each, or use `./deploy.sh` for all.

**Q: What if the fix script breaks?**
A: Just re-run it. It's safe and idempotent. Or re-run `./setup-build.sh`.

**Q: Where are the logs?**
A: `pm2 logs <bot-name>` or `~/apps/bots/FB/logs/`.

**Q: How do I stop a bot?**
A: `pm2 stop flameborn-kai`

**Q: How do I restart a bot?**
A: `pm2 restart flameborn-kai`

**Q: How do I remove a bot?**
A: `pm2 delete flameborn-kai`

---

## 🎓 TECHNICAL DETAILS

### Why .js Extensions Are Needed:
- Node.js ESM (ES Modules) mode strictly requires `.js` extensions
- This is per the ECMAScript specification
- It helps with cross-platform compatibility
- Browsers and bundlers handle it automatically, but Node.js doesn't

### Why TypeScript Doesn't Add Them:
- TypeScript's ESM output matches the module syntax
- The assumption is bundlers or tools will handle extensions
- Our solution: post-build script adds them automatically

### Why This Solution:
- No external dependencies
- Simple, understandable code
- Fast (processes files once)
- Safe (only touches .js files, only fixes relative imports)
- Reliable (straightforward regex patterns)

---

## 📞 SUPPORT

If something goes wrong:

1. **Check the logs:**
   ```bash
   pm2 logs flameborn-kai
   ```

2. **Run diagnostics:**
   ```bash
   ./detailed-diagnostics.sh
   ```

3. **Try the full reset:**
   ```bash
   ./setup-build.sh
   ./deploy-single.sh kai
   ```

4. **Check documentation:**
   - QUICK_START_ESM_FIX.md
   - ESM_BUILD_FIX.md
   - ESM_FIX_COMPLETE.md

---

**🎉 You're all set! Happy deploying!** 🚀
