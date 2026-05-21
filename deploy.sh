#!/bin/bash

#
# 🚀 Flameborn Multi-Instance Deployment Script
# Handles Prisma migrations, build, and PM2 startup for all 4 bots
#

set -e  # Exit on any error

echo "==============================================="
echo "   🔥 FLAMEBORN DEPLOYMENT SCRIPT 🔥"
echo "==============================================="
echo ""

BOTS=("ember" "kai" "saphy" "liber")
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cd "$PROJECT_ROOT"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}[STEP 1]${NC} Verifying environment files..."
for bot in "${BOTS[@]}"; do
  env_file=".env.$bot"
  if [ ! -f "$env_file" ]; then
    echo -e "${RED}❌ ERROR: $env_file not found!${NC}"
    echo "   Copy from template: cp .env.$bot.example .env.$bot"
    exit 1
  fi
  
  # Check if DATABASE_URL is set
  if ! grep -q "DATABASE_URL=" "$env_file"; then
    echo -e "${RED}❌ ERROR: DATABASE_URL not found in $env_file!${NC}"
    exit 1
  fi
  
  echo -e "${GREEN}✓${NC} $env_file exists with DATABASE_URL"
done
echo ""

echo -e "${YELLOW}[STEP 2]${NC} Building project (clean build)..."
npm install --omit=dev 2>&1 | tail -5
rm -rf dist/
npm run build
echo -e "${GREEN}✓${NC} Build complete"
echo ""

echo -e "${YELLOW}[STEP 3]${NC} Running Prisma migrations for each bot..."
for bot in "${BOTS[@]}"; do
  echo ""
  echo -e "${YELLOW}→ Processing $bot...${NC}"
  
  # Load environment variables from the bot's .env file
  export $(cat .env.$bot | grep -v '^#' | xargs)
  
  # Verify DATABASE_URL is loaded
  if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ Failed to load DATABASE_URL from .env.$bot${NC}"
    exit 1
  fi
  
  echo "  Running Prisma migrations..."
  npx prisma db push --skip-generate --accept-data-loss || {
    echo -e "${RED}❌ Migration failed for $bot${NC}"
    exit 1
  }
  
  echo -e "${GREEN}  ✓ Migrations complete for $bot${NC}"
  
  # Unset variables for next iteration
  unset DATABASE_URL
  unset DISCORD_TOKEN
  unset FLAMEBORN_ID
done
echo ""

echo -e "${YELLOW}[STEP 4]${NC} Stopping any existing PM2 processes..."
pm2 delete ecosystem.config.js 2>/dev/null || true
echo -e "${GREEN}✓${NC} Previous processes cleaned up"
echo ""

echo -e "${YELLOW}[STEP 5]${NC} Starting all bots with PM2..."
pm2 start ecosystem.config.js
echo ""

echo -e "${YELLOW}[STEP 6]${NC} Verifying all bots are running..."
sleep 3
pm2 status
echo ""

echo -e "${GREEN}===============================================${NC}"
echo -e "${GREEN}   ✅ DEPLOYMENT COMPLETE!${NC}"
echo -e "${GREEN}===============================================${NC}"
echo ""
echo "📊 Monitor logs:"
echo "  pm2 monit"
echo ""
echo "📖 View specific bot logs:"
echo "  pm2 logs flameborn-ember"
echo "  pm2 logs flameborn-kai"
echo "  pm2 logs flameborn-saphy"
echo "  pm2 logs flameborn-liber"
echo ""
echo "🛑 Stop all bots:"
echo "  pm2 stop ecosystem.config.js"
echo ""
echo "🔄 Restart all bots:"
echo "  pm2 restart ecosystem.config.js"
echo ""
echo "❌ Delete all bots:"
echo "  pm2 delete ecosystem.config.js"
echo ""
