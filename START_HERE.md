# 🎯 DEPLOY KAI (OR ANY BOT) - START HERE

## ✅ Everything You Need Is Ready

Three bash scripts have been created to solve the `DATABASE_URL` deployment error:

```
deploy.sh              ← Deploy all 4 bots
deploy-single.sh       ← Deploy ONE bot (Kai, Ember, Saphy, Liber)  
troubleshoot.sh        ← Check for issues first
```

---

## 🚀 Deploy Kai in 3 Steps

### Step 1: Make scripts executable
```bash
chmod +x deploy-single.sh troubleshoot.sh
```

### Step 2: Check for issues (optional but recommended)
```bash
./troubleshoot.sh
```

This will check:
- ✓ All .env files exist
- ✓ DATABASE_URL and DISCORD_TOKEN are set
- ✓ Database is running
- ✓ Build exists

### Step 3: Deploy Kai
```bash
./deploy-single.sh kai
```

This will:
- ✓ Load environment variables from .env.kai
- ✓ Run Prisma migrations with proper env vars (FIXES YOUR ERROR!)
- ✓ Stop any old Kai process
- ✓ Start fresh Kai with PM2

### Step 4: Verify it works
```bash
pm2 logs flameborn-kai
```

Should see bot starting up. If no `DATABASE_URL` error, you're good! ✅

---

## 📖 Documentation Files

| File | Purpose | Read When |
|------|---------|-----------|
| **QUICK_START.md** | 3-command reference | You're in a hurry |
| **DEPLOYMENT.md** | Full step-by-step guide | You want details |
| **README_DEPLOYMENT.md** | Package overview | You want context |
| **troubleshoot.sh** | Run this first | Something's not working |

---

## 🔧 What Problem Was Fixed

### ❌ Before (Your Error)
```bash
npm run build                     # OK
pm2 start ecosystem.config.js     # OK
# But then:
pm2 logs flameborn-kai
# Shows: "Error: Environment variable not found: DATABASE_URL"
```

**Why?** Prisma reads DATABASE_URL at startup, but PM2 wasn't loading the `.env.kai` file before Prisma initialized.

### ✅ After (The Fix)
```bash
chmod +x deploy-single.sh
./deploy-single.sh kai            # This script:
                                  # 1. Loads .env.kai explicitly
                                  # 2. Runs Prisma migrations (DATABASE_URL available!)
                                  # 3. Then starts with PM2
# Result: No errors! ✅
```

---

## 🎯 Recommended Path Forward

### For Testing (Start Here)
```bash
# 1. Make executable
chmod +x deploy-single.sh troubleshoot.sh

# 2. Diagnose
./troubleshoot.sh

# 3. Deploy Kai only
./deploy-single.sh kai

# 4. Check status
pm2 status
pm2 logs flameborn-kai

# 5. If Kai works, deploy others
./deploy-single.sh ember
./deploy-single.sh saphy
./deploy-single.sh liber
```

### For Production (When All Work)
```bash
# Deploy all 4 at once
./deploy.sh

# Verify all running
pm2 status

# Save for auto-restart on reboot
pm2 save
pm2 startup
```

---

## 💡 What Each Script Does

### deploy-single.sh kai
**Purpose:** Deploy just one bot (perfect for testing)

**How it works:**
```
1. source .env.kai                 (load DATABASE_URL, DISCORD_TOKEN, etc.)
2. npm run build                   (compile TypeScript)
3. FLAMEBORN_CONFIG=kai npx prisma db push --accept-data-loss
   (run migrations with DATABASE_URL available!)
4. pm2 delete ecosystem.config.js  (stop old processes)
5. pm2 start ecosystem.config.js --name flameborn-kai
   (start just Kai)
```

### deploy.sh
**Purpose:** Deploy all 4 bots at once

**How it works:**
- Same as above, but runs migrations for all 4 bots (ember, kai, saphy, liber)
- Then starts all 4 with PM2

### troubleshoot.sh
**Purpose:** Diagnose issues

**Checks:**
- ✓ All 4 .env files exist
- ✓ DATABASE_URL is set (not empty)
- ✓ DISCORD_TOKEN is set (not empty)
- ✓ Can connect to PostgreSQL
- ✓ dist/index.js exists (build is complete)
- ✓ Shows any recent errors

---

## 🚨 If Something Goes Wrong

### Error: Database connection failed

```bash
# 1. Check env file has DATABASE_URL
grep DATABASE_URL .env.kai

# 2. Verify PostgreSQL is running
psql -c "SELECT 1"

# 3. Run troubleshooter
./troubleshoot.sh

# 4. Try deploying again
./deploy-single.sh kai
```

### Error: process suddenly stopped

```bash
# Check logs for errors
pm2 logs flameborn-kai --err

# View last 50 lines of error log
tail -50 logs/kai.error.log

# If corrupted, clean and retry
pm2 delete ecosystem.config.js
pm2 flush
npm run build
./deploy-single.sh kai
```

### Everything is stuck

```bash
# Nuclear option: Complete reset
pm2 delete ecosystem.config.js
pm2 flush
rm -rf dist/
npm run build
./troubleshoot.sh
./deploy-single.sh kai
```

---

## 📊 Monitoring Commands

After deployment:

```bash
# Quick status (shows online/stopped)
pm2 status

# Full details for one bot
pm2 describe flameborn-kai

# Real-time monitoring (like htop)
pm2 monit

# View logs
pm2 logs flameborn-kai           # All logs
pm2 logs flameborn-kai --err     # Errors only
pm2 logs flameborn-kai --lines 100 # Last 100 lines

# Process stats
pm2 stats
```

---

## ✨ Success Indicators

After `./deploy-single.sh kai`, check:

```bash
# ✅ This shows flameborn-kai as 'online' (not stopped/errored)
pm2 status

# ✅ This shows no DATABASE_URL error
pm2 logs flameborn-kai

# ✅ This shows bot has been running > 1 minute
pm2 describe flameborn-kai
```

---

## 📝 Prerequisite Checklist

Before running `./deploy-single.sh kai`:

- [ ] `.env.kai` file exists
- [ ] `.env.kai` contains `DATABASE_URL=postgres://...`
- [ ] `.env.kai` contains `DISCORD_TOKEN=your_token_here`
- [ ] PostgreSQL is running
- [ ] Database `flameborn_kai` exists (or will be auto-created)
- [ ] `npm run build` has been run once (or script will do it)

---

## 🎉 You're Ready!

```bash
# Do this now:
chmod +x deploy-single.sh troubleshoot.sh
./troubleshoot.sh
./deploy-single.sh kai
pm2 logs flameborn-kai
```

**That's it!** If no errors appear in the logs, Kai is running. ✅

---

## 📚 For More Info

- **QUICK_START.md** - Command reference card
- **DEPLOYMENT.md** - Step-by-step guide  
- **README_DEPLOYMENT.md** - Full package overview
- Run **./troubleshoot.sh** - Automatic diagnosis

---

**Next step:** Run `./deploy-single.sh kai` and check logs! 🚀
