# ✅ Dynamic Import Fix Applied

## Issue Found

Bot was failing because **dynamic imports** (`await import()`) also need `.js` extensions:

```js
// ❌ WRONG (from compiled code)
const { prisma } = await import('./database/client');

// ✅ CORRECT  
const { prisma } = await import('./database/client.js');
```

## What's Fixed

Updated `fix-esm-imports.js` to handle:
1. ✅ `from './path'` imports
2. ✅ `from "./path"` imports
3. ✅ `import './path'` bare imports
4. ✅ `import "./path"` bare imports
5. ✅ `import('./path')` dynamic imports (NEW!)
6. ✅ `import("./path")` dynamic imports (NEW!)

Also added `"type": "module"` to package.json to eliminate Node.js warnings.

## Rebuild on Linux VM

```bash
cd ~/apps/bots/FB
./quick-rebuild.sh
```

Or full redeploy:
```bash
./deploy-single.sh kai
```

Check logs:
```bash
pm2 logs flameborn-kai
```

Should now start without module errors! 🎉
