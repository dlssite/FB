#!/bin/bash
cat << 'EOF'

╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║              ✅ COMMAND LOADING ERROR FIX - ACTION REQUIRED                  ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝

❌ ERROR YOU'RE SEEING:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Cannot find module 'file:///home/ember/apps/bots/FB/dist/modules/activity/commands/activity.js'
  Cannot find module 'file:///home/ember/apps/bots/FB/dist/modules/ai/commands/ai/_command.js'

🔍 ROOT CAUSE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  TypeScript incremental build skipped files in src/modules/*/commands/
  Need: CLEAN build instead

✅ SOLUTION:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Run these commands on your server:

  ┌─────────────────────────────────────────────────────────────────────────┐
  │ cd ~/apps/bots/FB                                                       │
  │ chmod +x quick-fix.sh                                                   │
  │ ./quick-fix.sh kai                                                      │
  │ pm2 logs flameborn-kai                                                  │
  └─────────────────────────────────────────────────────────────────────────┘

  That's it! Kai will redeploy with clean build.

⚡ WHAT IT DOES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  1. Removes dist/ folder
  2. Runs clean TypeScript compile
  3. Verifies files compiled
  4. Redeploys Kai
  5. Shows status

✅ SUCCESS MEANS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ✓ quick-fix.sh completes with "Build looks good!"
  ✓ pm2 logs shows bot starting
  ✓ NO "Cannot find module" errors

🔄 FOR OTHER BOTS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Once Kai works, do the same for others:

  ./quick-fix.sh ember
  ./quick-fix.sh saphy
  ./quick-fix.sh liber

  Then verify all running:
  pm2 status

📂 NEW FILES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  quick-fix.sh ................. Rebuild + redeploy (EASIEST)
  rebuild.sh ................... Rebuild + verify (DETAILED)
  FIX_COMMAND_LOADING.md ....... Technical explanation
  FIX_SUMMARY.txt .............. Text summary
  COMMAND_LOADING_FIX.md ....... Quick reference

🔧 WHAT I FIXED LOCALLY:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ✓ deploy.sh ............ Updated to do clean builds
  ✓ deploy-single.sh ..... Updated to do clean builds

  Before:
    npm run build        ← Incremental (can skip files)

  After:
    rm -rf dist/
    npx tsc             ← Clean (always works)

═══════════════════════════════════════════════════════════════════════════════

                    👉 RUN ON SERVER NOW:

         chmod +x quick-fix.sh && ./quick-fix.sh kai

═══════════════════════════════════════════════════════════════════════════════

EOF
