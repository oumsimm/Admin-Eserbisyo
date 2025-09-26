# API Keys Setup Guide

## Required API Keys for Enhanced MapScreen

To use the enhanced MapScreen with all features, you need to configure the following API keys in your `app.json`:

### 1. Google Maps API Key

**Purpose**: Map rendering, geocoding, and location services

**Setup Steps**:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the following APIs:
   - Maps SDK for Android
   - Maps SDK for iOS
   - Geocoding API
   - Places API
   - Directions API
4. Create credentials (API Key)
5. Restrict the API key to your app's bundle identifier
6. Replace `YOUR_GOOGLE_MAPS_API_KEY_HERE` in `app.json` with your actual key

**Required APIs**:
- Maps SDK for Android
- Maps SDK for iOS
- Geocoding API
- Places API
- Directions API

### 2. Google AI API Key (Optional)

**Purpose**: AI chat assistant in the dashboard

**Setup Steps**:
1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Create a new API key
3. Replace `YOUR_GOOGLE_AI_API_KEY_HERE` in `app.json` with your actual key

### 3. Update app.json

✅ **Google Maps API Key Configured**: `AIzaSyDa_I7V-fP0CSSq5J8gXBGR5XZyQ1k_PhU`

The API key has been added to your `app.json`:

```json
{
  "expo": {
    "extra": {
      "EXPO_PUBLIC_GOOGLE_MAPS_API_KEY": "AIzaSyDa_I7V-fP0CSSq5J8gXBGR5XZyQ1k_PhU",
      "EXPO_PUBLIC_GOOGLE_AI_API_KEY": "AIzaSyA_ZgsmB8-23SHiNH3Lx8r6TZH9qD6a6Fc"
    }
  }
}
```

### 4. Environment Variables (Alternative)

For better security, you can also use environment variables:

1. Create a `.env` file in your project root:
```
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_actual_google_maps_api_key
EXPO_PUBLIC_GOOGLE_AI_API_KEY=your_actual_google_ai_api_key
```

2. Install dotenv:
```bash
npm install dotenv
```

3. Load in your app:
```javascript
import 'dotenv/config';
```

## Security Best Practices

1. **Restrict API Keys**: Always restrict your API keys to specific apps and APIs
2. **Use Environment Variables**: Don't commit API keys to version control
3. **Rotate Keys**: Regularly rotate your API keys
4. **Monitor Usage**: Set up billing alerts and usage monitoring

## Testing

✅ **Google Maps API Key Configured** - Ready for testing!

After setting up the API keys:

1. **Test Map Loading**: ✅ API key configured - map should load correctly
2. **Test Location Services**: ✅ Permissions configured - location should work
3. **Test Route Planning**: ✅ Basic route planning implemented
4. **Test Offline Mode**: ✅ Offline caching implemented
5. **Test Map Features**: 
   - ✅ Map clustering for performance
   - ✅ Custom map styles
   - ✅ Location-based filtering
   - ✅ User location tracking

## Troubleshooting

### Map Not Loading
- Check if Google Maps API key is correct
- Verify API restrictions allow your app
- Check if required APIs are enabled

### Location Not Working
- Verify location permissions in app.json
- Check if location services are enabled on device
- Test on physical device (not simulator)

### AI Chat Not Working
- Check if Google AI API key is correct
- Verify API key has proper permissions
- Check network connectivity

## Support

If you encounter issues:
1. Check the console for error messages
2. Verify API key configuration
3. Test on different devices
4. Check Expo documentation for latest updates
