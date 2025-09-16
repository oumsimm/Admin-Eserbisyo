# E-SERBISYO Mobile App - Expo Go Setup Guide

## Quick Start

### Prerequisites
1. **Install Expo Go on your mobile device:**
   - **iOS**: Download from App Store
   - **Android**: Download from Google Play Store

2. **Ensure you have Node.js installed** on your computer
3. **Make sure your phone and computer have internet access**

### Running the App

#### Option 1: Use the startup scripts (Recommended)
- **Windows**: Double-click `start-expo.bat`
- **Mac/Linux**: Run `./start-expo.sh` in terminal

#### Option 2: Manual start
```bash
# Clear cache and start
npx expo start --clear

# If you have connectivity issues, use tunnel mode
npx expo start --clear --tunnel
```

### Connecting to Expo Go

1. **Open Expo Go** on your mobile device
2. **Scan the QR code** that appears in your terminal or browser
3. **Wait for the app to load** (first time may take a few minutes)

### Troubleshooting

#### If the QR code doesn't scan:
- Try tunnel mode: `npx expo start --tunnel`
- Make sure both devices are connected to internet
- Check if Expo Go app is updated to latest version

#### If you see Metro bundler errors:
```bash
# Clear everything and reinstall
npm install
npx expo install --fix
npx expo start --clear
```

#### If you see "Network response timed out":
- Use tunnel mode: `npx expo start --tunnel`
- Check your firewall settings
- Ensure Expo CLI is updated: `npm install -g @expo/cli`

#### If dependencies are missing:
```bash
npm install
npx expo install --fix
```

### App Features

This E-SERBISYO mobile app includes:
- ✅ User Authentication with Firebase
- ✅ QR Code Scanning (works in Expo Go)
- ✅ Interactive Maps with React Native Maps
- ✅ Event Management System
- ✅ Real-time Chat with AI Assistant
- ✅ Community Features
- ✅ Admin Dashboard
- ✅ Push Notifications
- ✅ Location Services

### Development Commands

```bash
# Start normally
npm start

# Start with cache clearing
npm run start:clear

# Start with tunnel mode (for better connectivity)
npm run start:tunnel

# Start on specific platform
npm run android
npm run ios
npm run web
```

### Notes

- The app is optimized for Expo Go and doesn't require ejecting
- All native features (camera, location, maps) work within Expo Go
- Firebase is configured for web/mobile compatibility
- The app automatically handles both development and production environments

### Support

If you encounter issues:
1. Check this troubleshooting guide first
2. Clear cache: `npx expo start --clear`
3. Reinstall dependencies: `npm install`
4. Try tunnel mode: `npx expo start --tunnel`

For persistent issues, check the terminal output for specific error messages.
