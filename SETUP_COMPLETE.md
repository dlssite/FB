# 📋 Multi-Instance Bot Setup - Complete Reference

## ✅ What's Been Created

### Environment Templates (.env.*.example)
Safe templates that can be committed to GitHub:
- `fbt/.env.ember.example` - Template for Ember bot secrets
- `fbt/.env.kai.example` - Template for Kai bot secrets
- `fbt/.env.saphy.example` - Template for Saphy bot secrets
- `fbt/.env.liber.example` - Template for Liber bot secrets

**Usage:** Copy these to `.env.{botname}` and fill in actual values

### Bot Configurations (src/config/)
Production-ready config files for each bot:
- `fbt/src/config/ember.ts` - Ember configuration (Emberlyn persona)
- `fbt/src/config/kai.ts` - Kai configuration (Kiaren persona)
- `fbt/src/config/saphy.ts` - Saphy configuration (Saphyran persona)
- `fbt/src/config/liber.ts` - Liber configuration (Liber persona)

**Features:**
- ✅ Correct personas from `src/modules/ai/personas.ts`
- ✅ Complete music nodes (7 Lavalink nodes)
- ✅ All 6 AI models configured
- ✅ Database separation per bot
- ✅ Unique branding and colors

### Configuration Templates
- `fbt/src/config/TEMPLATE.config.example.ts` - Reusable template for adding new bots
- `fbt/src/config/loadConfig.ts` - Dynamic config loader (picks config based on env var)

### PM2 Management
- `fbt/ecosystem.config.js` - Manages all 4 bot instances

### Documentation
- `fbt/SECURE_SETUP_GUIDE.md` - Complete security and setup guide
- `fbt/MULTI_INSTANCE_GUIDE.md` - Technical overview
- `fbt/QUICK_REFERENCE.md` - Command reference

### Git Protection
- Updated `fbt/.gitignore`:
  ```
  .env.*          # Block all .env files
  !.env.*.example # Except .example files
  ```

## 🚀 Quick Start (Local Development)

### 1. Copy Environment Templates
```bash
cd fbt
cp .env.ember.example .env.ember
cp .env.kai.example .env.kai
cp .env.saphy.example .env.saphy
cp .env.liber.example .env.liber
```

### 2. Fill in Secrets
Edit each `.env.{botname}` file:
```env
DISCORD_TOKEN="YOUR_ACTUAL_BOT_TOKEN"
DATABASE_URL="postgresql://user:password@localhost:5432/flameborn_ember"
OPENROUTER_API_KEYS="your_api_key"
# ... etc
```

### 3. Set Up Databases
```bash
psql -c "CREATE DATABASE flameborn_ember;"
psql -c "CREATE DATABASE flameborn_kai;"
psql -c "CREATE DATABASE flameborn_saphy;"
psql -c "CREATE DATABASE flameborn_liber;"
```

### 4. Build and Run
```bash
npm run build
pm2 start ecosystem.config.js
pm2 status
```

## 🔒 Security Features

### Secrets Protection
- ✅ `.env.*` files never committed to git
- ✅ `.env.*.example` templates committed for reference
- ✅ Each bot has isolated secrets
- ✅ Environment variables keep tokens out of code

### Database Isolation
- ✅ 4 separate PostgreSQL databases
- ✅ No cross-bot data access
- ✅ Each bot has own Redis store (if enabled)

### Configuration
- ✅ Configs use env var references (no hardcoded values)
- ✅ loadConfig.ts dynamically selects bot config
- ✅ Each PM2 app has isolated environment

## 📦 File Structure

```
fbt/
├── .env.ember          (actual, git-ignored) →  DO NOT commit
├── .env.kai            (actual, git-ignored) →  DO NOT commit
├── .env.saphy          (actual, git-ignored) →  DO NOT commit
├── .env.liber          (actual, git-ignored) →  DO NOT commit
│
├── .env.ember.example  (template) →  Safe to commit ✅
├── .env.kai.example    (template) →  Safe to commit ✅
├── .env.saphy.example  (template) →  Safe to commit ✅
├── .env.liber.example  (template) →  Safe to commit ✅
│
├── src/config/
│   ├── loadConfig.ts           (dynamic loader)
│   ├── flameborn.config.ts     (base types)
│   ├── ember.ts                (production config)
│   ├── kai.ts                  (production config)
│   ├── saphy.ts                (production config)
│   ├── liber.ts                (production config)
│   └── TEMPLATE.config.example.ts (for new bots)
│
├── ecosystem.config.js         (PM2 manager)
├── .gitignore                  (updated)
└── SECURE_SETUP_GUIDE.md       (this guide)
```

## 📚 Key Concepts

### Config Loading Flow
```
PM2 starts app with FLAMEBORN_CONFIG=ember
  ↓
loadConfig() reads FLAMEBORN_CONFIG env var
  ↓
Requires ./ember.ts config
  ↓
Config reads from .env.ember (via process.env)
  ↓
Bot starts with Ember config + secrets
```

### Each Bot Gets
- 🤖 Unique Discord bot token
- 🗄️ Dedicated PostgreSQL database
- 📝 Custom AI persona + personality
- 🎨 Custom branding (color, logos)
- 🎵 All 7 Lavalink music nodes
- 🧠 All 6 AI models available

### Personas
- **Ember** (Emberlyn) - Warm, caring, radiant flame
- **Kai** (Kiaren) - Cold, mysterious, shadow twin
- **Saphy** (Saphyran) - Lively, artistic, harmonious
- **Liber** (Liber) - Calm, wise, scholarly keeper

## ✨ What's Different Now

**Before:** Single bot, hard to expand
**After:** Multi-instance ready:
- ✅ 4 complete bot configurations
- ✅ Secure environment templates
- ✅ PM2 orchestration
- ✅ Database per bot
- ✅ No secrets in git
- ✅ Easy to add bot #5, #6, etc

## 🔧 Adding Bot #5

1. Copy template: `cp src/config/TEMPLATE.config.example.ts src/config/newbot.ts`
2. Copy env: `cp .env.ember.example .env.newbot`
3. Customize both files
4. Add to ecosystem.config.js
5. Create database: `psql -c "CREATE DATABASE flameborn_newbot;"`
6. Rebuild and restart: `npm run build && pm2 restart ecosystem.config.js`

Done! Bot #5 is live alongside the others.

---

**Last Updated:** 2026-05-20
**Status:** ✅ Production Ready
