@echo off
echo Starting E-SERBISYO Mobile App for Expo Go...
echo.

:: Clear any cache first
echo Clearing cache and starting Expo...
npx expo start --clear --tunnel

echo.
echo The app is now starting with tunnel mode for better connectivity!
echo.
echo Instructions:
echo 1. Install "Expo Go" app on your mobile device from:
echo    - iOS: App Store
echo    - Android: Google Play Store
echo 2. Open Expo Go app
echo 3. Scan the QR code that appears in the terminal or browser
echo 4. The app will load on your device
echo.
echo Troubleshooting:
echo - If QR scan doesn't work, try tunnel mode (already enabled)
echo - Make sure your phone has internet connection
echo - Try: npm install (if dependencies are missing)
echo - Try: npx expo install --fix (if version conflicts)
echo.
pause
