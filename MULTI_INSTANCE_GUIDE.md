# 🚀 Flameborn Multi-Instance Setup Guide

Welcome to the **Flameborn Multi-Instance Configuration**! This setup allows you to run 4 different bot instances (Ember, Kai, Saphy, Liber) from a single repository with separate configurations, environments, and databases.

## 📋 Overview

| Bot | Color | Personality | Config | .env | Port |
|-----|-------|------------|--------|------|------|
| **Ember** | #FF6B35 | Energetic, passionate, warm | `src/config/ember.ts` | `.env.ember` | 3000 |
| **Kai** | #00BFFF | Cool, calm, thoughtful | `src/config/kai.ts` | `.env.kai` | 3001 |
| **Saphy** | #9D4EDD | Mystical, wise, spiritual | `src/config/saphy.ts` | `.env.saphy` | 3002 |
| **Liber** | #32CD32 | Free-spirited, fun, rebellious | `src/config/liber.ts` | `.env.liber` | 3003 |

## 🎯 Directory Structure

```
fbt/
├── src/
│   ├── config/
│   │   ├── flameborn.config.ts         # Base config interface & types
│   │   ├── loadConfig.ts               # Dynamic config loader
│   │   ├── ember.ts                    # Ember bot config
│   │   ├── kai.ts                      # Kai bot config
│   │   ├── saphy.ts                    # Saphy bot config
│   │   └── liber.ts                    # Liber bot config
│   ├── index.ts                        # Main entry point
│   └── ...
├── .env                                # Original .env (shared defaults)
├── .env.ember                          # Ember bot secrets
├── .env.kai                            # Kai bot secrets
├── .env.saphy                          # Saphy bot secrets
├── .env.liber                          # Liber bot secrets
├── ecosystem.config.js                 # PM2 configuration for all 4 bots
├── package.json
├── tsconfig.json
├── README.md                           # This file
└── logs/
    ├── ember.error.log                 # Ember error logs
    ├── ember.out.log                   # Ember output logs
    ├── kai.error.log
    ├── saphy.error.log
    └── liber.error.log
```

## ⚙️ Setup Instructions

### 1️⃣ Build the Project

```bash
cd fbt
npm install
npm run build
```

### 2️⃣ Configure Environment Files

Edit each bot's `.env` file with their specific Discord tokens and databases:

**`.env.ember`** - Update these values:
```env
DISCORD_TOKEN="YOUR_EMBER_DISCORD_BOT_TOKEN"
DATABASE_URL="postgresql://user:pass@host:5432/flameborn_ember"
```

**`.env.kai`** - Update these values:
```env
DISCORD_TOKEN="YOUR_KAI_DISCORD_BOT_TOKEN"
DATABASE_URL="postgresql://user:pass@host:5432/flameborn_kai"
```

**`.env.saphy`** - Update these values:
```env
DISCORD_TOKEN="YOUR_SAPHY_DISCORD_BOT_TOKEN"
DATABASE_URL="postgresql://user:pass@host:5432/flameborn_saphy"
```

**`.env.liber`** - Update these values:
```env
DISCORD_TOKEN="YOUR_LIBER_DISCORD_BOT_TOKEN"
DATABASE_URL="postgresql://user:pass@host:5432/flameborn_liber"
```

### 3️⃣ Run Individual Bots

**Run a single bot:**
```bash
# Run Ember only
FLAMEBORN_CONFIG=ember npm start

# Run Kai only
FLAMEBORN_CONFIG=kai npm start

# Run Saphy only
FLAMEBORN_CONFIG=saphy npm start

# Run Liber only
FLAMEBORN_CONFIG=liber npm start
```

**Or use with a .env file:**
```bash
# With dotenv loader
node -r dotenv/config --dotenv-config-path=.env.ember dist/index.js
```

### 4️⃣ Run All Bots with PM2

**Install PM2 (if not already installed):**
```bash
npm install -g pm2
```

**Start all 4 bots:**
```bash
pm2 start ecosystem.config.js
```

**Start specific bots:**
```bash
# Start only Ember
pm2 start ecosystem.config.js --only flameborn-ember

# Start only Kai and Saphy
pm2 start ecosystem.config.js --only flameborn-kai,flameborn-saphy
```

**Monitor all bots:**
```bash
pm2 monit
pm2 status
pm2 logs
```

**View specific bot logs:**
```bash
pm2 logs flameborn-ember
pm2 logs flameborn-kai --lines 100
```

**Restart specific bot:**
```bash
pm2 restart flameborn-ember
```

**Stop all bots:**
```bash
pm2 stop ecosystem.config.js
```

**Delete all bots from PM2:**
```bash
pm2 delete ecosystem.config.js
```

## 🔧 How Config Loading Works

The `loadConfig.ts` module dynamically loads the correct config based on the `FLAMEBORN_CONFIG` environment variable:

```typescript
// In src/index.ts (or where you load the config)
import { loadFlamebornConfig } from './config/loadConfig';

// This automatically loads the right config based on env var
const config = loadFlamebornConfig(); // Loads ember.ts by default
```

**Flow:**
1. ✅ Check `FLAMEBORN_CONFIG` env variable
2. ✅ Load corresponding config file (`ember.ts`, `kai.ts`, etc.)
3. ✅ Load corresponding `.env` file
4. ✅ Merge with base configuration
5. ✅ Bot starts with bot-specific config!

## 🎨 Customizing Each Bot

Each bot's configuration is in `src/config/<botname>.ts`. You can customize:

- **Bot identity**: `bot.id`, `bot.name`, `bot.tenant`
- **AI persona**: `ai.defaultPersona`, `ai.defaultPersonaName`
- **Colors & branding**: `branding.color`, `branding.footerText`
- **Module toggles**: `modules.<module>.active: true/false`
- **Assets & banners**: All image URLs
- **Economy settings**: Cooldowns, rewards, thresholds

Example:
```typescript
// src/config/ember.ts
export default {
  bot: {
    id: 'Ember',
    tenant: {
      id: 'ember_01',
      name: 'Ember Realm',
    },
  },
  branding: {
    color: '#FF6B35', // Orange-red for Ember
    footerText: 'Ember - Flameborn',
  },
  ai: {
    defaultPersona: `You are Emberlyn, a fiery and passionate Flameborn...`,
  },
  // ... rest of config
};
```

## 📊 Database Separation

Each bot has its own PostgreSQL database:

```
PostgreSQL Databases:
├── flameborn_ember  (Ember's data)
├── flameborn_kai    (Kai's data)
├── flameborn_saphy  (Saphy's data)
└── flameborn_liber  (Liber's data)
```

If using SQLite, each bot gets its own database file:
```
db/
├── ember.sqlite
├── kai.sqlite
├── saphy.sqlite
└── liber.sqlite
```

## 🔐 Secrets Management

**Each `.env.<botname>` file contains:**
- Discord bot token (unique per bot)
- Database credentials (unique per bot)
- API keys (can be shared or unique)
- Redis URLs (can be shared)
- Mothership settings

**Important:** Never commit `.env.*` files with real secrets to version control!

## 📈 Scaling & Performance

- **Memory per bot:** ~500MB (configurable in `ecosystem.config.js`)
- **CPU:** Each bot runs on its own process
- **Database:** Separate databases prevent table conflicts
- **Discord:** Each bot has its own token and identity

You can easily add more bots by:
1. Creating `src/config/newbot.ts`
2. Creating `.env.newbot`
3. Adding an app entry in `ecosystem.config.js`

## 🛠️ Troubleshooting

**Bot won't start:**
```bash
# Check logs
pm2 logs flameborn-ember

# Verify .env file exists
cat .env.ember

# Check if FLAMEBORN_CONFIG is set
echo $FLAMEBORN_CONFIG
```

**Wrong config loading:**
```bash
# Explicitly set FLAMEBORN_CONFIG
FLAMEBORN_CONFIG=kai npm start

# Verify it loaded correctly
pm2 logs flameborn-kai | grep "Loading Flameborn config"
```

**Database connection issues:**
```bash
# Verify DATABASE_URL format
cat .env.ember | grep DATABASE_URL

# Test connection manually
psql $DATABASE_URL -c "SELECT 1;"
```

## 📚 Additional Commands

**Save PM2 state:**
```bash
pm2 save
pm2 startup
```

**Deploy to another machine:**
```bash
pm2 deploy ecosystem.config.js production
```

**Scale individual bot:**
```bash
# Run Ember with 2 instances
pm2 start ecosystem.config.js --only flameborn-ember -i 2
```

## 🎯 Best Practices

✅ **DO:**
- Keep `.env.<botname>` files in `.gitignore`
- Use different Discord tokens per bot
- Monitor logs regularly with `pm2 monit`
- Set `max_memory_restart` appropriately
- Use separate databases per bot

❌ **DON'T:**
- Commit secrets to git
- Reuse Discord tokens across bots
- Ignore error logs
- Run bots without PM2 in production
- Use the same database for multiple bots

## 📞 Support

For issues or questions:
1. Check logs: `pm2 logs`
2. Review config files in `src/config/`
3. Verify `.env` files are correctly set up
4. Check Discord bot permissions

---

**Happy botting! May your Flameborn instances burn bright! 🔥❄️🔮💚**
