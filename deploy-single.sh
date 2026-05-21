#!/bin/bash

#
# 🎯 Deploy Single Flameborn Bot
# Usage: ./deploy-single.sh kai
#

set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <bot_name>"
  echo "Available bots: ember, kai, saphy, liber"
  exit 1
fi

BOT="$1"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cd "$PROJECT_ROOT"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Validate bot name
if [[ ! " ember kai saphy liber " =~ " $BOT " ]]; then
  echo -e "${RED}❌ Invalid bot name: $BOT${NC}"
  echo "Available bots: ember, kai, saphy, liber"
  exit 1
fi

env_file=".env.$BOT"

echo "==============================================="
echo "  🚀 Deploying: $BOT"
echo "==============================================="
echo ""

# Check env file exists
if [ ! -f "$env_file" ]; then
  echo -e "${RED}❌ ERROR: $env_file not found!${NC}"
  echo "   Copy from template: cp $env_file.example $env_file"
  exit 1
fi

echo -e "${YELLOW}[STEP 1]${NC} Loading environment for $BOT..."
export $(cat "$env_file" | grep -v '^#' | xargs)

if [ -z "$DATABASE_URL" ]; then
  echo -e "${RED}❌ DATABASE_URL not found in $env_file${NC}"
  exit 1
fi

echo -e "${GREEN}✓${NC} Environment loaded"
echo ""

echo -e "${YELLOW}[STEP 2]${NC} Building project (clean build)..."
npm install 2>&1 | tail -3
rm -rf dist/
npm run build
echo -e "${GREEN}✓${NC} Build complete"
echo ""

echo -e "${YELLOW}[STEP 3]${NC} Running Prisma migrations..."
npx prisma db push --skip-generate --accept-data-loss
echo -e "${GREEN}✓${NC} Migrations complete"
echo ""

echo -e "${YELLOW}[STEP 4]${NC} Stopping existing PM2 process for $BOT..."
pm2 delete "flameborn-$BOT" 2>/dev/null || true
sleep 1
echo -e "${GREEN}✓${NC} Process stopped"
echo ""

echo -e "${YELLOW}[STEP 5]${NC} Starting $BOT with PM2..."
pm2 start ecosystem.config.js --only "flameborn-$BOT"
sleep 3
echo ""

echo -e "${YELLOW}[STEP 6]${NC} Checking status..."
pm2 status

echo ""
echo -e "${GREEN}===============================================${NC}"
echo -e "${GREEN}   ✅ $BOT deployed successfully!${NC}"
echo -e "${GREEN}===============================================${NC}"
echo ""
echo "📖 View logs:"
echo "  pm2 logs flameborn-$BOT"
echo ""
echo "🛑 Stop:"
echo "  pm2 stop flameborn-$BOT"
echo ""
echo "🔄 Restart:"
echo "  pm2 restart flameborn-$BOT"
echo ""
