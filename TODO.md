# TODO - Fix `npm run build` TypeScript errors in `fbt`

## Step 1 (Config type fixes)
- [ ] Add missing `nsfw` key to `src/config/flameborn.config.ts` (`FlamebornConfig` interface).
- [ ] Re-run `npm run build` to confirm this cluster is resolved.

## Step 2 (Automod command compile fixes)
- [ ] Fix `src/modules/automod/commands/automod/_command.ts` missing `menu` / `buttons` by defining the Discord components used in the container payload.
- [ ] Re-run `npm run build` to confirm this cluster is resolved.

## Step 3 (AI stats typing fixes)
- [ ] Fix `src/modules/ai/commands/ai/stats.ts` so provider keys match the actual output type of `ApiKeyManager.getStats()`.
- [ ] Re-run `npm run build` to confirm this cluster is resolved.

## Step 4 (Index shutdown narrowing)
- [ ] Tighten `src/index.ts` shutdown code to satisfy TS narrowing for `apiServer.close(...)`.
- [ ] Re-run `npm run build` to confirm this cluster is resolved.

## Step 5 (Iterate until build passes)
- [ ] Continue addressing remaining TS errors until `npm run build` succeeds.

## Step 6 (Testing after build passes)
- [ ] Perform critical-path testing (as minimum): start bot + verify AI stats and Automod command render.
- [ ] If requested, expand to thorough testing (API endpoints + additional modules).
