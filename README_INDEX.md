# 📚 Flameborn Project - Documentation Index

Welcome to Flameborn! This project contains multi-instance bot deployment setup for 4 bots: Ember, Kai, Saphy, and Liber.

## 🎯 Quick Navigation

### 🚀 I Want to Deploy a Bot
→ Read: **[guides/START_HERE.md](guides/START_HERE.md)**

### 🔧 Something's Not Working
→ Read: **[guides/COMMAND_LOADING_FIX.md](guides/COMMAND_LOADING_FIX.md)**

### 📖 I Want to Understand Everything
→ Read: **[guides/INDEX.md](guides/INDEX.md)** (Master index with all guides)

---

## 📁 Project Structure

```
fbt/
├── guides/                       ← 📚 All deployment & setup guides (START HERE!)
│   ├── INDEX.md                 ← Master guide directory
│   ├── START_HERE.md            ← Quick 3-step deploy
│   ├── DEPLOYMENT.md            ← Full deployment guide
│   └── ... (15 guides total)
│
├── Deployment Scripts
│   ├── deploy.sh                ← Deploy all 4 bots
│   ├── deploy-single.sh         ← Deploy one bot (Kai, Ember, etc)
│   ├── quick-fix.sh             ← Fix + redeploy for errors
│   ├── rebuild.sh               ← Rebuild and verify
│   └── troubleshoot.sh          ← Diagnostic tool
│
├── Configuration
│   ├── ecosystem.config.js      ← PM2 configuration
│   ├── .env.*                   ← Environment files (not in git)
│   ├── .env.*.example           ← Templates for env files
│   └── tsconfig.json            ← TypeScript config
│
├── Source Code
│   ├── src/                     ← TypeScript source
│   │   ├── config/              ← Bot configs (ember.ts, kai.ts, etc)
│   │   ├── modules/             ← Discord bot modules (32 total)
│   │   ├── core/                ← Core systems
│   │   └── utils/               ← Utilities
│   ├── dist/                    ← Compiled JavaScript (gitignored)
│   ├── prisma/                  ← Database schema
│   └── logs/                    ← PM2 logs
│
└── Configuration Files
    ├── package.json
    ├── prisma/schema.prisma
    ├── .gitignore
    └── README.md
```

---

## 🎯 Common Tasks

### Deploy Kai for First Time
```bash
chmod +x deploy-single.sh troubleshoot.sh
./troubleshoot.sh
./deploy-single.sh kai
pm2 logs flameborn-kai
```
→ Details: [guides/START_HERE.md](guides/START_HERE.md)

### Deploy All 4 Bots
```bash
chmod +x deploy.sh
./deploy.sh
pm2 status
```
→ Details: [guides/DEPLOYMENT.md](guides/DEPLOYMENT.md)

### Fix "Cannot find module" Error
```bash
chmod +x quick-fix.sh
./quick-fix.sh kai
```
→ Details: [guides/COMMAND_LOADING_FIX.md](guides/COMMAND_LOADING_FIX.md)

### View Bot Logs
```bash
pm2 logs flameborn-kai
pm2 logs flameborn-kai --err     # errors only
pm2 monit                         # real-time dashboard
```

### Stop/Restart Bots
```bash
pm2 stop flameborn-kai           # stop one
pm2 restart flameborn-kai        # restart one
pm2 stop ecosystem.config.js     # stop all
```

---

## 📚 Guide Categories

### 📖 Getting Started (Read First!)
- **[guides/INDEX.md](guides/INDEX.md)** - Master guide index
- **[guides/START_HERE.md](guides/START_HERE.md)** - 3-step quick start
- **[guides/QUICK_START.md](guides/QUICK_START.md)** - Command reference

### 🚀 Deployment
- **[guides/DEPLOYMENT.md](guides/DEPLOYMENT.md)** - Full deployment guide
- **[guides/README_DEPLOYMENT.md](guides/README_DEPLOYMENT.md)** - Overview
- **[guides/DEPLOYMENT_SCRIPTS_CREATED.md](guides/DEPLOYMENT_SCRIPTS_CREATED.md)** - Script details

### 🏗️ Configuration
- **[guides/MULTI_INSTANCE_GUIDE.md](guides/MULTI_INSTANCE_GUIDE.md)** - 4-bot setup
- **[guides/CONFIGS_COMPLETE.md](guides/CONFIGS_COMPLETE.md)** - Config verification
- **[guides/SECURE_SETUP_GUIDE.md](guides/SECURE_SETUP_GUIDE.md)** - .env security

### 🔧 Troubleshooting
- **[guides/COMMAND_LOADING_FIX.md](guides/COMMAND_LOADING_FIX.md)** - Module not found fix
- **[guides/FIX_COMMAND_LOADING.md](guides/FIX_COMMAND_LOADING.md)** - Technical explanation

---

## 🤖 Bot Information

### 4 Bots
- **Ember** - Emberlyn (warm, caring personality)
- **Kai** - Kiaren (mysterious, calculated)
- **Saphy** - Saphyran (lively, artistic)
- **Liber** - Liber (calm, wise)

### Each Bot Has
- ✅ Independent Discord token
- ✅ Own PostgreSQL database
- ✅ Unique AI personality & persona
- ✅ Individual module configuration
- ✅ Separate PM2 process

### Shared
- ✅ Single codebase
- ✅ Shared build (dist/)
- ✅ Same update schedule
- ✅ One deployment command

---

## ⚙️ Scripts Explained

| Script | Purpose | Usage |
|--------|---------|-------|
| **deploy.sh** | Deploy all 4 bots | `./deploy.sh` |
| **deploy-single.sh** | Deploy one bot | `./deploy-single.sh kai` |
| **quick-fix.sh** | Rebuild + deploy | `./quick-fix.sh kai` |
| **rebuild.sh** | Build & verify | `./rebuild.sh kai` |
| **troubleshoot.sh** | Diagnostic check | `./troubleshoot.sh` |

---

## 🔐 Security

### Environment Files
- ❌ `.env.kai`, `.env.ember`, `.env.saphy`, `.env.liber` are NOT in git
- ✅ `.env.*.example` templates ARE in git (safe to share)
- ✅ All secrets protected by .gitignore

### Getting Started Securely
```bash
cp .env.kai.example .env.kai
nano .env.kai                    # Fill in your DISCORD_TOKEN and DATABASE_URL
./deploy-single.sh kai
```

→ Full guide: [guides/SECURE_SETUP_GUIDE.md](guides/SECURE_SETUP_GUIDE.md)

---

## 📦 Prerequisites

Before deploying, you need:
- ✅ Node.js v24+
- ✅ PostgreSQL database (or cloud postgres)
- ✅ PM2 globally installed: `npm install -g pm2`
- ✅ Discord bot token for each bot
- ✅ Database connection string (DATABASE_URL)

---

## 🚀 Quick Start on New Server

```bash
# 1. Clone repository (if not already done)
git clone <repo>
cd fbt

# 2. Install dependencies
npm install

# 3. Copy env templates and fill with real values
cp .env.kai.example .env.kai
nano .env.kai                    # Edit with your tokens

# 4. Deploy Kai
chmod +x deploy-single.sh troubleshoot.sh
./troubleshoot.sh               # Verify prerequisites
./deploy-single.sh kai          # Deploy

# 5. Deploy others if Kai works
./deploy-single.sh ember
./deploy-single.sh saphy
./deploy-single.sh liber

# 6. Verify all running
pm2 status

# 7. Save for auto-restart on reboot (optional)
pm2 save
pm2 startup
```

→ Detailed guide: [guides/START_HERE.md](guides/START_HERE.md)

---

## 📊 Monitoring

### Check Status
```bash
pm2 status                       # All bots status
pm2 describe flameborn-kai       # Details for Kai
pm2 stats                        # Process stats
```

### View Logs
```bash
pm2 logs                         # All bots
pm2 logs flameborn-kai          # Kai only
pm2 logs flameborn-kai --err    # Errors only
pm2 logs flameborn-kai --lines 100
```

### Real-Time Dashboard
```bash
pm2 monit
```

---

## 🆘 Troubleshooting

| Issue | Solution |
|-------|----------|
| "Cannot find module" | Read [guides/COMMAND_LOADING_FIX.md](guides/COMMAND_LOADING_FIX.md) |
| "DATABASE_URL not found" | Check `.env.kai` has DATABASE_URL |
| Bot keeps restarting | Check logs: `pm2 logs flameborn-kai --err` |
| "Port already in use" | Check PORT in `.env` files |

→ More help: [guides/INDEX.md](guides/INDEX.md)

---

## 📞 Support

### Resources
- 📚 **Guides:** [guides/](guides/) (start with guides/INDEX.md)
- 🔧 **Diagnostics:** Run `./troubleshoot.sh`
- 📖 **Documentation:** Read relevant guide in `guides/` folder
- 💬 **Logs:** `pm2 logs flameborn-<botname>`

---

## 📝 Files at Root Level

These files are in `fbt/` root directory:
- `deploy.sh`, `deploy-single.sh` - Deployment scripts
- `quick-fix.sh`, `rebuild.sh`, `troubleshoot.sh` - Utility scripts
- `ecosystem.config.js` - PM2 configuration
- `package.json` - Project dependencies
- `tsconfig.json` - TypeScript configuration
- `.env.*.example` - Environment templates

**All guides** are organized in `guides/` folder.

---

## 🎉 You're Ready!

1. **Read:** [guides/INDEX.md](guides/INDEX.md)
2. **Deploy:** `./deploy-single.sh kai`
3. **Monitor:** `pm2 logs flameborn-kai`

**Next step:** Open [guides/START_HERE.md](guides/START_HERE.md) 🚀

---

**Last Updated:** 2026-05-20  
**Total Guides:** 15  
**Bots:** Ember, Kai, Saphy, Liber  
**Status:** Ready to Deploy ✅
