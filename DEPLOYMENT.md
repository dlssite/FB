# 🚀 Deployment Quick Start

## Option 1: Deploy All 4 Bots (Recommended)

```bash
# Make script executable
chmod +x deploy.sh

# Run deployment
./deploy.sh
```

This will:
1. ✅ Verify all `.env.*` files exist
2. ✅ Build the project
3. ✅ Run Prisma migrations for all 4 bots
4. ✅ Start all bots with PM2

## Option 2: Deploy Single Bot (For Testing)

Perfect for testing Kai first:

```bash
# Make script executable
chmod +x deploy-single.sh

# Deploy only Kai
./deploy-single.sh kai

# Or deploy other bots
./deploy-single.sh ember
./deploy-single.sh saphy
./deploy-single.sh liber
```

## 🔍 Verify Deployment

After deployment, check status:

```bash
# View all bots
pm2 status

# Monitor in real-time
pm2 monit

# View Kai logs
pm2 logs flameborn-kai

# View Kai errors
pm2 logs flameborn-kai --err
```

## ✅ Checklist Before Deploying

- [ ] All `.env.*` files created (copy from `.env.*.example`)
- [ ] `DATABASE_URL` filled in each `.env.*` file
- [ ] `DISCORD_TOKEN` filled in each `.env.*` file
- [ ] PostgreSQL databases created:
  ```bash
  psql -c "CREATE DATABASE flameborn_ember;"
  psql -c "CREATE DATABASE flameborn_kai;"
  psql -c "CREATE DATABASE flameborn_saphy;"
  psql -c "CREATE DATABASE flameborn_liber;"
  ```
- [ ] Project built: `npm run build`

## 🛑 Troubleshooting

### Bot not starting?

```bash
# Check logs for errors
pm2 logs flameborn-kai --err

# Check if DATABASE_URL is loaded
pm2 env flameborn-kai | grep DATABASE_URL
```

### DATABASE_URL not found error?

The `.env.*` file isn't being loaded. Check:

```bash
# Verify file exists and has DATABASE_URL
cat .env.kai | grep DATABASE_URL

# Verify it's not empty
echo $DATABASE_URL  # Should not be blank after running deploy.sh
```

### Port already in use?

Each bot runs on a different port (3000, 3001, 3002, 3003). Check if ports are available:

```bash
netstat -tlnp | grep 300
```

## 📊 Monitoring Commands

```bash
# Status overview
pm2 status

# Real-time monitoring
pm2 monit

# View logs with filtering
pm2 logs flameborn-kai --lines 100

# Clear logs
pm2 flush

# Save PM2 config
pm2 save

# Resurrect saved config on reboot
pm2 startup
pm2 save
```

## 🔄 Common Operations

```bash
# Start all bots
pm2 start ecosystem.config.js

# Start just Kai
pm2 start ecosystem.config.js --only flameborn-kai

# Restart all
pm2 restart ecosystem.config.js

# Stop all
pm2 stop ecosystem.config.js

# Delete all
pm2 delete ecosystem.config.js

# Reload (zero-downtime restart)
pm2 reload ecosystem.config.js
```

## 📝 Log Locations

```
logs/
├── ember.error.log       # Errors for Ember
├── ember.out.log         # Output for Ember
├── kai.error.log         # Errors for Kai
├── kai.out.log           # Output for Kai
├── saphy.error.log       # Errors for Saphy
├── saphy.out.log         # Output for Saphy
├── liber.error.log       # Errors for Liber
└── liber.out.log         # Output for Liber
```

## 🎯 For Testing Kai Only

```bash
# 1. Verify Kai env file is complete
nano .env.kai

# 2. Deploy just Kai
./deploy-single.sh kai

# 3. Check if running
pm2 status

# 4. View logs
pm2 logs flameborn-kai

# 5. If all good, deploy others
./deploy-single.sh ember
./deploy-single.sh saphy
./deploy-single.sh liber
```
