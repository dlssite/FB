# Critical Fix - Deploy Scripts

## Issue Found

The deploy scripts were using `npm install --omit=dev` which removes TypeScript and other build tools BEFORE trying to build.

This caused the error:
```
This is not the tsc command you are looking for
```

## Solution

Changed deploy scripts to use `npm install` (without --omit=dev) so that:
1. ✅ All dependencies are installed
2. ✅ TypeScript is available for `npm run build`
3. ✅ ESM fixer runs successfully
4. ✅ Bot starts correctly

## Files Fixed

- deploy-single.sh (line 60)
- deploy.sh (line 46)

## What Changed

**BEFORE (broken):**
```bash
npm install --omit=dev    # Removes TypeScript
npm run build             # Fails - no tsc available
```

**AFTER (fixed):**
```bash
npm install               # Keeps all dependencies
npm run build             # Works - tsc available
```

## Try Again

```bash
cd ~/apps/bots/FB
./deploy-single.sh kai
```

Should now work without errors!
