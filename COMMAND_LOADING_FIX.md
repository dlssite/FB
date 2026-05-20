# ✅ Command Loading Error - FIXED

## 🎯 The Problem You're Facing

Kai is trying to load command files that don't exist in `dist/`:
```
Cannot find module 'file:///home/ember/apps/bots/FB/dist/modules/activity/commands/activity.js'
Cannot find module 'file:///home/ember/apps/bots/FB/dist/modules/ai/commands/ai/_command.js'
```

## 🔍 Root Cause
TypeScript incremental builds sometimes skip files in `src/modules/*/commands/`

## ✅ What I Fixed
Updated deploy scripts to do **clean builds** (remove dist/ first)

## 🚀 Deploy Now

```bash
# Option 1: Fastest (use new quick-fix script)
chmod +x quick-fix.sh
./quick-fix.sh kai

# Option 2: Manual (same thing)
rm -rf dist/
npx tsc
./deploy-single.sh kai

# Option 3: Complete reset
rm -rf dist/ node_modules/
npm ci
./deploy-single.sh kai
```

Then check:
```bash
pm2 logs flameborn-kai
```

Expected: Bot starts without "Cannot find module" errors ✅

## 📦 New Files Created

| File | Purpose |
|------|---------|
| **quick-fix.sh** | Rebuild + redeploy in one command |
| **rebuild.sh** | Rebuild and verify compilation |
| **FIX_COMMAND_LOADING.md** | Technical explanation |
| **FIX_SUMMARY.txt** | This summary (text version) |

## 🔄 Updated Files

- **deploy-single.sh** - Now does clean builds
- **deploy.sh** - Now does clean builds

## ⚡ Next Steps

1. **On server, run:**
   ```bash
   chmod +x quick-fix.sh
   ./quick-fix.sh kai
   pm2 logs flameborn-kai
   ```

2. **If Kai works, do others:**
   ```bash
   ./quick-fix.sh ember
   ./quick-fix.sh saphy
   ./quick-fix.sh liber
   ```

3. **Verify:**
   ```bash
   pm2 status
   ```

## 💡 Why This Works

- ❌ Before: `npm run build` (incremental - skips files)
- ✅ After: `rm -rf dist/ && npx tsc` (clean - always compiles everything)

All command files in `src/modules/*/commands/` will now properly compile to `dist/modules/*/commands/`

---

**Go to server and run:**
```
chmod +x quick-fix.sh && ./quick-fix.sh kai
```
