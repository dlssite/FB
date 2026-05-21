# ESM Import Fix - Deployment Issue Resolution

## Problem

When deploying to the Linux VM, the application fails with:
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/home/ember/apps/bots/FB/dist/core/FlamebornClient' 
imported from /home/ember/apps/bots/FB/dist/index.js
```

## Root Cause

The TypeScript compiler is configured to output ES Modules (ESM), but the compiled JavaScript files use **relative imports without `.js` extensions**:

```js
// ❌ INCORRECT (from dist/index.js)
import { client } from './core/FlamebornClient';
```

In Node.js ESM, relative imports **MUST** have the `.js` extension:

```js
// ✅ CORRECT
import { client } from './core/FlamebornClient.js';
```

## Solution

The fix involves two changes:

### 1. **Add `tsc-esm-fix` to the Build Process**

This tool automatically adds `.js` extensions to all relative imports in the compiled JavaScript files.

**Changes Made:**
- Added `tsc-esm-fix` as a dev dependency in `package.json`
- Updated build script: `"build": "tsc && tsc-esm-fix"`
- Updated `tsconfig.json` to use `moduleResolution: "bundler"` for better ESM support

### 2. **Ensure Dependencies Are Installed on Deploy**

Updated both `deploy.sh` and `deploy-single.sh` to run `npm install --omit=dev` before building.

## Deployment Steps

### For New Deployments:

```bash
cd ~/apps/bots/FB

# First time only - fix ESM imports
./fix-esm-imports.sh

# Then deploy as usual
./deploy-single.sh kai
```

### For Subsequent Deployments:

The build script automatically handles the ESM fix:

```bash
./deploy-single.sh kai
```

## Testing the Fix

To verify the build is correct:

```bash
npm install
npm run build

# Check that imports have .js extensions
grep "from './core" dist/index.js
# Should show: import { client } from './core/FlamebornClient.js';
```

## Files Modified

1. **package.json**
   - Added `tsc-esm-fix` to `devDependencies`
   - Updated `build` script to include `tsc-esm-fix`

2. **tsconfig.json**
   - Changed `moduleResolution` to `"bundler"` (better for ESM)
   - Added `resolveJsonModule` and `allowSyntheticDefaultImports`

3. **deploy.sh** & **deploy-single.sh**
   - Added `npm install --omit=dev` before building
   - Ensures all build dependencies are available

4. **fix-esm-imports.sh** (new)
   - Helper script to install dependencies and rebuild
   - Run this once on the Linux VM if you get the ESM error

## Why This Happens

TypeScript's default build output for ES modules doesn't automatically add `.js` extensions. This works fine in browsers and with bundlers (which handle extension resolution), but Node.js in strict ESM mode requires explicit extensions.

The `tsc-esm-fix` tool scans the compiled JavaScript and adds `.js` extensions to all relative imports, making the code compatible with Node.js ESM requirements.

## References

- [Node.js ESM Resolution Algorithm](https://nodejs.org/api/esm.html#resolution-algorithm)
- [tsc-esm-fix Tool](https://www.npmjs.com/package/tsc-esm-fix)
- [TypeScript ESM Handbook](https://www.typescriptlang.org/docs/handbook/esm-node.html)
