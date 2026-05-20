#!/bin/bash

# Quick fix script - clean rebuild and redeploy

echo "🔧 Quick Fix: Clean Rebuild"
echo "============================"
echo ""

BOT="${1:-kai}"

if [[ ! " ember kai saphy liber " =~ " $BOT " ]]; then
  echo "❌ Invalid bot: $BOT"
  echo "Available: ember, kai, saphy, liber"
  exit 1
fi

echo "Step 1: Removing old build..."
rm -rf dist/

echo "Step 2: Clean TypeScript compile..."
npx tsc

echo ""
echo "Step 3: Verifying files..."

# Check if critical files exist
MISSING=0

if [ ! -f "dist/modules/activity/commands/activity.js" ]; then
  echo "❌ dist/modules/activity/commands/activity.js MISSING"
  MISSING=$((MISSING + 1))
else
  echo "✅ dist/modules/activity/commands/activity.js exists"
fi

if [ ! -f "dist/modules/ai/commands/ai/_command.js" ]; then
  echo "❌ dist/modules/ai/commands/ai/_command.js MISSING"
  MISSING=$((MISSING + 1))
else
  echo "✅ dist/modules/ai/commands/ai/_command.js exists"
fi

echo ""

if [ $MISSING -gt 0 ]; then
  echo "❌ Build verification failed!"
  exit 1
fi

echo "✅ Build looks good!"
echo ""
echo "Redeploying $BOT..."
./deploy-single.sh $BOT
