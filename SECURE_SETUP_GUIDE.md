# 🔐 Multi-Instance Setup Guide (Secure)

## Environment Files (.env)

Never commit actual `.env.*` files to GitHub! Each bot needs its own environment file with secrets.

### Quick Setup

1. **Copy example files to actual env files:**
   ```bash
   cp .env.ember.example .env.ember
   cp .env.kai.example .env.kai
   cp .env.saphy.example .env.saphy
   cp .env.liber.example .env.liber
   ```

2. **Fill in your secrets in each file:**
   - `DISCORD_TOKEN`: Your bot's token from Discord Developer Portal
   - `DATABASE_URL`: PostgreSQL connection string for each bot's database
   - `API_SECRET`: Your mothership API key
   - `REDIS_URL`: Your Redis connection (if using)
   - `OPENROUTER_API_KEYS`: Your OpenRouter API key
   - `GENIUS_TOKEN`: Your Genius API token (for lyrics)

3. **.gitignore Protection:**
   - All `.env.*` files are ignored by git
   - Only `.env.*.example` files are committed
   - **NEVER** manually commit `.env` files

## Config Files

Each bot has a TypeScript config file that references environment variables:

```
src/config/
├── ember.ts          # Ember bot config
├── kai.ts            # Kai bot config
├── saphy.ts          # Saphy bot config
├── liber.ts          # Liber bot config
├── flameborn.config.ts  # Base config interface
├── loadConfig.ts     # Dynamic loader (picks config based on env var)
└── TEMPLATE.config.example.ts  # Template for adding new bots
```

### How Config Loading Works

1. **Environment Variable:** `FLAMEBORN_CONFIG`
   - Set in `ecosystem.config.js` for each PM2 app
   - Example: `FLAMEBORN_CONFIG=ember` → loads `src/config/ember.ts`

2. **Config Loader:** `src/config/loadConfig.ts`
   ```typescript
   export function loadFlamebornConfig() {
     const name = process.env.FLAMEBORN_CONFIG ?? "main";
     return require(`./flameborn.${name}.ts`).default;
   }
   ```

3. **Usage in Index:**
   ```typescript
   import { loadFlamebornConfig } from './config/loadConfig';
   const config = loadFlamebornConfig();
   ```

## Adding a New Bot

### Step 1: Create Config File
Copy the template: `src/config/TEMPLATE.config.example.ts`

Rename and customize:
```bash
cp src/config/TEMPLATE.config.example.ts src/config/mynewbot.ts
```

Update:
- Replace `{BOTNAME}`, `{botname}`, `{BOTNAME_UPPER}`
- Set the AI persona from `src/modules/ai/personas.ts`
- Adjust color, database, etc.

### Step 2: Create Environment File
```bash
cp .env.ember.example .env.mynewbot
```

Edit `.env.mynewbot`:
```env
DISCORD_TOKEN="YOUR_NEW_BOT_TOKEN"
DATABASE_URL="postgresql://user:password@localhost:5432/flameborn_mynewbot"
FLAMEBORN_ID="MyNewBot"
TENANT_ID="mynewbot_01"
TENANT_NAME="MyNewBot's Domain"
PORT="3004"  # Use next available port
```

### Step 3: Add to PM2 Config
Edit `ecosystem.config.js`:

```javascript
{
  name: 'flameborn-mynewbot',
  script: 'dist/index.js',
  env: {
    NODE_ENV: 'production',
    ENV_FILE: 'env/.env.mynewbot',
    FLAMEBORN_CONFIG: 'mynewbot',
  },
  // ... other settings
}
```

### Step 4: Build and Start
```bash
npm run build
pm2 restart ecosystem.config.js
```

## Database Setup

Each bot needs its own PostgreSQL database:

```sql
CREATE DATABASE flameborn_ember;
CREATE DATABASE flameborn_kai;
CREATE DATABASE flameborn_saphy;
CREATE DATABASE flameborn_liber;
```

Run migrations for each:
```bash
FLAMEBORN_CONFIG=ember npm run migrate
FLAMEBORN_CONFIG=kai npm run migrate
FLAMEBORN_CONFIG=saphy npm run migrate
FLAMEBORN_CONFIG=liber npm run migrate
```

## Deployment Checklist

- [ ] All 4 `.env.*` files filled in with real secrets
- [ ] All 4 databases created in PostgreSQL
- [ ] Migrations run for each bot
- [ ] `ecosystem.config.js` verified with correct ports
- [ ] `.gitignore` is blocking `.env.*` files (except `.example`)
- [ ] Built with `npm run build`
- [ ] PM2 started: `pm2 start ecosystem.config.js`
- [ ] All 4 bots running: `pm2 status`

## Secrets Safety

**DO:**
- ✅ Store secrets only in `.env.*` files
- ✅ Use `.env.*.example` files as templates
- ✅ Add `.env.*` to `.gitignore`
- ✅ Document what each secret is for

**DON'T:**
- ❌ Commit real `.env.*` files
- ❌ Hard-code secrets in config files
- ❌ Share `.env.*` files via Slack/email
- ❌ Check secrets into version control

## Troubleshooting

**Bot not starting?**
```bash
pm2 logs flameborn-ember
# Check for missing env vars or database connection
```

**Wrong config loading?**
```bash
pm2 env flameborn-ember | grep FLAMEBORN_CONFIG
# Should show the correct config name
```

**Database connection error?**
```bash
psql $DATABASE_URL
# Test connection manually
```
