# 🔥 Flameborn Multi-Instance Quick Reference

## 🚀 Quick Start

```bash
# Build
npm run build

# Start single bot
FLAMEBORN_CONFIG=ember npm start
FLAMEBORN_CONFIG=kai npm start
FLAMEBORN_CONFIG=saphy npm start
FLAMEBORN_CONFIG=liber npm start

# Start all with PM2
pm2 start ecosystem.config.js

# View status
pm2 status
pm2 monit

# View logs
pm2 logs flameborn-ember
pm2 logs flameborn-kai
```

## 📁 Key Files

| File | Purpose |
|------|---------|
| `src/config/ember.ts` | Ember bot configuration |
| `src/config/kai.ts` | Kai bot configuration |
| `src/config/saphy.ts` | Saphy bot configuration |
| `src/config/liber.ts` | Liber bot configuration |
| `src/config/loadConfig.ts` | Dynamic config loader |
| `.env.ember` | Ember bot secrets & env vars |
| `.env.kai` | Kai bot secrets & env vars |
| `.env.saphy` | Saphy bot secrets & env vars |
| `.env.liber` | Liber bot secrets & env vars |
| `ecosystem.config.js` | PM2 configuration for all 4 bots |
| `MULTI_INSTANCE_GUIDE.md` | Comprehensive setup guide |

## 🎨 Bot Specs

```
Ember:   #FF6B35  🔥 Energetic, passionate, warm
Kai:     #00BFFF  ❄️  Cool, calm, thoughtful  
Saphy:   #9D4EDD  🔮 Mystical, wise, spiritual
Liber:   #32CD32  🎭 Free-spirited, fun, wild
```

## 📊 Database Names

- `flameborn_ember` → Ember bot
- `flameborn_kai` → Kai bot
- `flameborn_saphy` → Saphy bot
- `flameborn_liber` → Liber bot

## 🔧 Edit Bot Config

Each bot has unique settings in `src/config/<name>.ts`:
- Bot identity, color, personality
- AI persona
- Module toggles
- Asset URLs
- Branding

## ⚡ PM2 Commands

```bash
pm2 start ecosystem.config.js              # Start all
pm2 start ecosystem.config.js --only flameborn-ember  # Start one
pm2 monit                                  # Real-time monitor
pm2 logs flameborn-ember                   # View logs
pm2 restart flameborn-kai                  # Restart specific
pm2 stop ecosystem.config.js               # Stop all
pm2 delete ecosystem.config.js             # Remove all
```

## 🆘 Troubleshooting

```bash
# Check logs for errors
pm2 logs flameborn-ember --err

# Verify env file
cat .env.ember

# Check if config loads
grep "Loading Flameborn config" ~/.pm2/logs/*

# Manual test
FLAMEBORN_CONFIG=ember node dist/index.js
```

## 📝 Customize Bot

1. Edit `src/config/<botname>.ts`
2. Change `ai.defaultPersona`
3. Change `branding.color`
4. Change module settings
5. Rebuild: `npm run build`
6. Restart: `pm2 restart flameborn-<botname>`

---

**See `MULTI_INSTANCE_GUIDE.md` for full documentation** 📚
