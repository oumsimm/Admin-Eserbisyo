@echo off
echo 🔧 Expo Connectivity Fix Script for Windows
echo.

echo 📦 Step 1: Updating Expo CLI...
call npm install -g @expo/cli@latest
echo.

echo 🧹 Step 2: Clearing caches...
call npx expo install --fix
call npm install
echo.

echo 🔄 Step 3: Clearing Metro cache...
call npx expo start --clear --no-dev --minify
timeout /t 3 /nobreak > nul
taskkill /f /im node.exe > nul 2>&1
echo.

echo 🔥 Step 4: Clearing all caches...
if exist node_modules\.cache rmdir /s /q node_modules\.cache
if exist .expo rmdir /s /q .expo
if exist %TEMP%\metro-* rmdir /s /q %TEMP%\metro-*
if exist %TEMP%\react-* rmdir /s /q %TEMP%\react-*
echo.

echo 🌐 Step 5: Configuring Windows Firewall...
echo Adding firewall rules for Expo ports...
netsh advfirewall firewall add rule name="Expo Metro 19000" dir=in action=allow protocol=TCP localport=19000 > nul 2>&1
netsh advfirewall firewall add rule name="Expo Metro 19001" dir=in action=allow protocol=TCP localport=19001 > nul 2>&1
netsh advfirewall firewall add rule name="Expo Metro 19002" dir=in action=allow protocol=TCP localport=19002 > nul 2>&1
echo.

echo ✅ Setup complete! Now run:
echo    npx expo start --tunnel
echo.
echo 📱 If tunnel mode works, try LAN mode:
echo    npx expo start --lan
echo.
pause
