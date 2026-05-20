# ⚡ QUICK REFERENCE - Deploy Kai (or any bot)

## 🎯 3 Commands to Deploy Kai

```bash
# 1. Check for issues (optional but recommended)
chmod +x troubleshoot.sh
./troubleshoot.sh

# 2. Deploy Kai
chmod +x deploy-single.sh
./deploy-single.sh kai

# 3. View logs (to verify it's working)
pm2 logs flameborn-kai
```

## ✅ Success = No Errors in Logs

```bash
# Good (no DATABASE_URL error, bot running):
pm2 logs flameborn-kai

# Bad (shows DATABASE_URL error):
pm2 logs flameborn-kai --err
```

---

## 🚀 Deploy All 4 Bots

```bash
chmod +x deploy.sh
./deploy.sh
```

---

## 🛑 Stop/Start/Restart

```bash
# Stop all
pm2 stop ecosystem.config.js

# Start all
pm2 start ecosystem.config.js

# Restart all
pm2 restart ecosystem.config.js

# Check status
pm2 status
```

---

## 🔍 Troubleshooting

### Error: DATABASE_URL not found

```bash
# Check if env file exists
ls -la .env.kai

# Check if DATABASE_URL is set
grep DATABASE_URL .env.kai

# Test connection manually
source .env.kai
psql $DATABASE_URL -c "SELECT 1"
```

### Error: Bot keeps restarting

```bash
# View full error
pm2 logs flameborn-kai --err | head -50

# Check database is running
psql -c "SELECT 1"

# Check build exists
ls -la dist/index.js
```

### Everything looks stuck

```bash
# Nuclear reset
pm2 delete ecosystem.config.js
pm2 flush
npm run build
./deploy-single.sh kai
```

---

## 📊 Monitoring

```bash
# Real-time status
pm2 monit

# See all processes
pm2 list

# Describe one bot
pm2 describe flameborn-kai

# Stats
pm2 stats
```

---

## 📝 File Checklist

Before deploying, verify:

- [ ] `.env.kai` exists
- [ ] `.env.kai` has `DATABASE_URL` filled in
- [ ] `.env.kai` has `DISCORD_TOKEN` filled in
- [ ] PostgreSQL database `flameborn_kai` exists
- [ ] `dist/index.js` exists (run `npm run build` if not)

---

## 🎯 Step-by-Step: Deploy Kai for First Time

1. **Check prerequisites:**
   ```bash
   ./troubleshoot.sh
   ```

2. **Verify .env.kai has values:**
   ```bash
   cat .env.kai | grep -E "DATABASE_URL|DISCORD_TOKEN"
   ```

3. **Create database if missing:**
   ```bash
   psql -c "CREATE DATABASE flameborn_kai;"
   ```

4. **Deploy:**
   ```bash
   ./deploy-single.sh kai
   ```

5. **Check it's running:**
   ```bash
   pm2 status  # Should show flameborn-kai as online
   ```

6. **View output:**
   ```bash
   pm2 logs flameborn-kai
   ```

---

## 🎬 After Kai Works, Deploy Others

```bash
./deploy-single.sh ember
./deploy-single.sh saphy
./deploy-single.sh liber

# Or all at once:
./deploy.sh
```

---

**Need help?** Run: `./troubleshoot.sh`
