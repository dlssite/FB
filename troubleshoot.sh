#!/bin/bash

#
# 🔧 Troubleshoot Flameborn Deployment
# Diagnoses common deployment issues
#

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}        🔧 FLAMEBORN DEPLOYMENT TROUBLESHOOTER${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Check 1: Verify .env files
echo -e "${YELLOW}[CHECK 1]${NC} Environment files..."
BOTS=("ember" "kai" "saphy" "liber")
missing_bots=()

for bot in "${BOTS[@]}"; do
  env_file=".env.$bot"
  if [ ! -f "$env_file" ]; then
    echo -e "${RED}  ✗ $env_file MISSING${NC}"
    missing_bots+=("$bot")
  else
    echo -e "${GREEN}  ✓ $env_file exists${NC}"
    
    # Check for DATABASE_URL
    if grep -q "DATABASE_URL=" "$env_file"; then
      db_url=$(grep "DATABASE_URL=" "$env_file" | cut -d '=' -f2 | tr -d '"')
      if [ -z "$db_url" ]; then
        echo -e "${RED}    ✗ DATABASE_URL is empty${NC}"
      else
        echo -e "${GREEN}    ✓ DATABASE_URL configured${NC}"
      fi
    else
      echo -e "${RED}    ✗ DATABASE_URL not found${NC}"
    fi
    
    # Check for DISCORD_TOKEN
    if grep -q "DISCORD_TOKEN=" "$env_file"; then
      token=$(grep "DISCORD_TOKEN=" "$env_file" | cut -d '=' -f2 | tr -d '"')
      if [ -z "$token" ]; then
        echo -e "${RED}    ✗ DISCORD_TOKEN is empty${NC}"
      else
        echo -e "${GREEN}    ✓ DISCORD_TOKEN configured${NC}"
      fi
    else
      echo -e "${RED}    ✗ DISCORD_TOKEN not found${NC}"
    fi
  fi
done

if [ ${#missing_bots[@]} -gt 0 ]; then
  echo ""
  echo -e "${RED}Missing env files for: ${missing_bots[*]}${NC}"
  echo "Copy from examples:"
  for bot in "${missing_bots[@]}"; do
    echo "  cp .env.$bot.example .env.$bot"
  done
fi
echo ""

# Check 2: Verify PM2
echo -e "${YELLOW}[CHECK 2]${NC} PM2 installation..."
if command -v pm2 &> /dev/null; then
  echo -e "${GREEN}  ✓ PM2 installed${NC}"
  pm2 --version
else
  echo -e "${RED}  ✗ PM2 not found${NC}"
  echo "  Install with: npm install -g pm2"
fi
echo ""

# Check 3: Check running bots
echo -e "${YELLOW}[CHECK 3]${NC} Running bots..."
pm2_apps=$(pm2 list | grep -c "flameborn" || true)
if [ "$pm2_apps" -eq 0 ]; then
  echo -e "${YELLOW}  ⚠ No Flameborn bots running${NC}"
else
  echo -e "${GREEN}  ✓ Found $pm2_apps bot(s)${NC}"
  pm2 list | grep flameborn || true
fi
echo ""

# Check 4: Test database connectivity
echo -e "${YELLOW}[CHECK 4]${NC} Database connectivity..."
for bot in "${BOTS[@]}"; do
  env_file=".env.$bot"
  if [ -f "$env_file" ]; then
    db_url=$(grep "DATABASE_URL=" "$env_file" | cut -d '=' -f2 | tr -d '"')
    if [ -n "$db_url" ]; then
      if psql "$db_url" -c "SELECT 1" &>/dev/null; then
        echo -e "${GREEN}  ✓ $bot database OK${NC}"
      else
        echo -e "${RED}  ✗ $bot database connection failed${NC}"
        echo "    URL: $db_url"
      fi
    fi
  fi
done
echo ""

# Check 5: Prisma schema
echo -e "${YELLOW}[CHECK 5]${NC} Prisma schema..."
if [ -f "prisma/schema.prisma" ]; then
  echo -e "${GREEN}  ✓ Schema file exists${NC}"
  
  # Try to generate without errors
  if npx prisma generate &>/dev/null; then
    echo -e "${GREEN}  ✓ Schema validation OK${NC}"
  else
    echo -e "${RED}  ✗ Schema validation failed${NC}"
  fi
else
  echo -e "${RED}  ✗ prisma/schema.prisma not found${NC}"
fi
echo ""

# Check 6: Build status
echo -e "${YELLOW}[CHECK 6]${NC} Build status..."
if [ -d "dist" ] && [ "$(ls -A dist)" ]; then
  echo -e "${GREEN}  ✓ dist/ folder exists${NC}"
  
  # Check if index.js exists
  if [ -f "dist/index.js" ]; then
    echo -e "${GREEN}  ✓ dist/index.js ready${NC}"
  else
    echo -e "${RED}  ✗ dist/index.js not found${NC}"
    echo "    Run: npm run build"
  fi
else
  echo -e "${YELLOW}  ⚠ dist/ folder is empty${NC}"
  echo "    Run: npm run build"
fi
echo ""

# Check 7: Show recent errors
echo -e "${YELLOW}[CHECK 7]${NC} Recent errors (last bot)..."
if [ -f "logs/kai.error.log" ]; then
  if [ -s "logs/kai.error.log" ]; then
    echo -e "${RED}Recent Kai errors:${NC}"
    tail -5 "logs/kai.error.log" | sed 's/^/  /'
  else
    echo -e "${GREEN}  ✓ No errors logged${NC}"
  fi
else
  echo -e "${YELLOW}  ⚠ No error logs yet${NC}"
fi
echo ""

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}        RECOMMENDATIONS${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Recommendations
echo "1. Start with single bot deployment:"
echo "   chmod +x deploy-single.sh"
echo "   ./deploy-single.sh kai"
echo ""

echo "2. If DATABASE_URL error persists:"
echo "   - Check .env.kai has DATABASE_URL set"
echo "   - Verify PostgreSQL is running"
echo "   - Test connection: psql \$DATABASE_URL"
echo ""

echo "3. View live logs:"
echo "   pm2 logs flameborn-kai --err"
echo ""

echo "4. If still stuck:"
echo "   - Kill all bots: pm2 delete ecosystem.config.js"
echo "   - Clean logs: pm2 flush"
echo "   - Try again: ./deploy-single.sh kai"
echo ""
