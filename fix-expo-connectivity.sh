#!/bin/bash

echo "🔧 Expo Connectivity Fix Script for macOS/Linux"
echo ""

echo "📦 Step 1: Updating Expo CLI..."
npm install -g @expo/cli@latest
echo ""

echo "🧹 Step 2: Clearing caches and fixing dependencies..."
npx expo install --fix
npm install
echo ""

echo "🔄 Step 3: Clearing Metro cache..."
npx expo start --clear --no-dev --minify &
EXPO_PID=$!
sleep 3
kill $EXPO_PID 2>/dev/null
echo ""

echo "🔥 Step 4: Clearing all caches..."
rm -rf node_modules/.cache
rm -rf .expo
rm -rf /tmp/metro-*
rm -rf /tmp/react-*
echo ""

echo "🌐 Step 5: Network diagnostics..."
echo "Current IP addresses:"
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}'
else
    # Linux
    ip addr show | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | cut -d/ -f1
fi
echo ""

echo "✅ Setup complete! Now run:"
echo "   npx expo start --tunnel"
echo ""
echo "📱 If tunnel mode works, try LAN mode:"
echo "   npx expo start --lan"
echo ""
