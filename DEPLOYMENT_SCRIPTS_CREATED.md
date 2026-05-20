# ✅ Deployment Scripts Created

## 🎯 The Problem You Were Facing

When running `npx prisma db push`, you got:
```
Error: Environment variable not found: DATABASE_URL.
```

**Root Cause:** Prisma couldn't find the `.env.*` file before Node.js started. PM2 wasn't loading the environment variables properly.

## ✅ The Solution

Three deployment scripts have been created to handle this:

### 1️⃣ **deploy.sh** - Deploy All 4 Bots

```bash
chmod +x deploy.sh
./deploy.sh
```

This script:
- ✅ Verifies all `.env.*` files exist
- ✅ Loads environment variables from each file
- ✅ Runs migrations with proper env vars
- ✅ Starts all 4 bots with PM2

**When to use:** Full production deployment

---

### 2️⃣ **deploy-single.sh** - Deploy One Bot (RECOMMENDED FOR TESTING)

```bash
chmod +x deploy-single.sh
./deploy-single.sh kai     # Deploy just Kai
./deploy-single.sh ember   # Deploy just Ember
./deploy-single.sh saphy   # Deploy just Saphy
./deploy-single.sh liber   # Deploy just Liber
```

This script:
- ✅ Loads environment for one bot only
- ✅ Runs Prisma migration with proper env var
- ✅ Stops/starts just that bot
- ✅ Perfect for testing before full deployment

**When to use:** Testing individual bots, troubleshooting

---

### 3️⃣ **troubleshoot.sh** - Diagnose Deployment Issues

```bash
chmod +x troubleshoot.sh
./troubleshoot.sh
```

This script:
- ✅ Checks all `.env.*` files exist
- ✅ Validates DATABASE_URL and DISCORD_TOKEN
- ✅ Tests database connectivity
- ✅ Verifies Prisma schema
- ✅ Checks build status
- ✅ Shows recent errors

**When to use:** When things aren't working

---

## 🔧 Fixed Files

### ecosystem.config.js
Updated to use **absolute paths** for env files:
```javascript
env_file: path.join(projectRoot, '.env.kai')
```

This ensures PM2 finds the env files correctly from any working directory.

---

## 🚀 Quick Start (Your Situation - Deploy Kai Only)

```bash
# 1. Navigate to project
cd ~/apps/bots/FB

# 2. Make scripts executable
chmod +x deploy-single.sh troubleshoot.sh

# 3. Check for issues
./troubleshoot.sh

# 4. Deploy Kai only
./deploy-single.sh kai

# 5. Verify it's running
pm2 status

# 6. View logs
pm2 logs flameborn-kai
```

---

## 📋 Full Deployment Steps

### Step 1: Prepare Environment Files

```bash
# Copy templates
cp .env.ember.example .env.ember
cp .env.kai.example .env.kai
cp .env.saphy.example .env.saphy
cp .env.liber.example .env.liber

# Edit each file with real values
nano .env.kai    # Add DISCORD_TOKEN, DATABASE_URL, etc.
nano .env.ember
nano .env.saphy
nano .env.liber
```

### Step 2: Create Databases

```bash
psql -c "CREATE DATABASE flameborn_ember;"
psql -c "CREATE DATABASE flameborn_kai;"
psql -c "CREATE DATABASE flameborn_saphy;"
psql -c "CREATE DATABASE flameborn_liber;"
```

### Step 3: Deploy All Bots

```bash
chmod +x deploy.sh
./deploy.sh
```

Or deploy one-by-one for testing:

```bash
chmod +x deploy-single.sh
./deploy-single.sh kai
./deploy-single.sh ember
./deploy-single.sh saphy
./deploy-single.sh liber
```

---

## ✅ What Changed

### Before ❌
- `env_file: '.env.kai'` (relative path)
- Prisma couldn't find env file
- DATABASE_URL not found error

### After ✅
- `env_file: path.join(projectRoot, '.env.kai')` (absolute path)
- Deploy scripts load env vars before Prisma
- `./deploy.sh` handles migrations properly

---

## 🎯 Recommended Deployment Sequence

For your situation (testing Kai first):

```bash
# 1. Troubleshoot first
./troubleshoot.sh

# 2. If all green, deploy Kai
./deploy-single.sh kai

# 3. Check logs
pm2 logs flameborn-kai --err

# 4. If Kai works, deploy others
./deploy-single.sh ember
./deploy-single.sh saphy
./deploy-single.sh liber

# 5. Final check
pm2 status
```

---

## 📊 File Locations

```
fbt/
├── deploy.sh                 ← Deploy all 4 bots
├── deploy-single.sh          ← Deploy one bot (Kai, Ember, etc)
├── troubleshoot.sh           ← Diagnose issues
├── ecosystem.config.js       ← Updated with absolute paths
├── DEPLOYMENT.md             ← This guide
├── .env.ember               ← (You fill this)
├── .env.kai                 ← (You fill this)
├── .env.saphy               ← (You fill this)
├── .env.liber               ← (You fill this)
└── logs/                    ← PM2 logs will be here
    ├── kai.error.log
    ├── kai.out.log
    ├── ember.error.log
    └── ...
```

---

## 🆘 If Something Still Goes Wrong

1. **Check troubleshooter:**
   ```bash
   ./troubleshoot.sh
   ```

2. **View raw logs:**
   ```bash
   pm2 logs flameborn-kai --err
   tail -50 logs/kai.error.log
   ```

3. **Manually test DATABASE_URL:**
   ```bash
   source .env.kai
   psql $DATABASE_URL -c "SELECT 1"
   ```

4. **Nuclear option (clean restart):**
   ```bash
   pm2 delete ecosystem.config.js
   pm2 flush
   npm run build
   ./deploy-single.sh kai
   ```

---

## 🎉 Success Indicators

After `./deploy-single.sh kai`:

```bash
# ✅ This should show kai running
pm2 status

# ✅ This should NOT show errors
pm2 logs flameborn-kai --err

# ✅ This should show online
pm2 describe flameborn-kai
```

---

**Next Steps:**
1. Run `./troubleshoot.sh` to diagnose
2. Run `./deploy-single.sh kai` to deploy Kai
3. Check `pm2 logs flameborn-kai` to verify
4. Then deploy other bots if Kai works
