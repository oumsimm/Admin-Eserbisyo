 # Building the Application (APK) with EAS
 
 This guide provides step-by-step instructions on how to build an Android APK for testing and distribution using Expo Application Services (EAS).
 
 ## Prerequisites
 
 - You have a registered account on [expo.dev](https://expo.dev/).
 - Your project is registered with Expo. If not, run `npx expo register` in your project directory.
 - Node.js and npm are installed on your machine.
 
 ## Step 1: Install Required Command-Line Tools
 
 To build your application, you need the Expo CLI and the EAS CLI. Install them globally on your system if you haven't already.
 
 ```bash
 # Install Expo CLI globally
 npm install -g @expo/cli
 
 # Install EAS CLI globally for building
 npm install -g eas-cli
 ```
 
 ## Step 2: Log in to Your Expo Account
 
 Authenticate your local machine with your Expo account. This allows the EAS CLI to access your projects and manage builds.
 
 ```bash
 # Login to your Expo account
 eas login
 ```
 
 You will be prompted to enter your Expo username and password.
 
 ## Step 3: Configure EAS Build
 
 EAS uses a configuration file named `eas.json` to define different build profiles (e.g., for development, preview, or production). If your project doesn't have this file, you can generate it easily.
 
 ```bash
 # Initialize EAS configuration in your project root
 eas build:configure
 ```
 
 This command will create a default `eas.json` file. It typically includes three profiles:
 - **`development`**: For use with the `expo-dev-client`.
 - **`preview`**: For creating shareable builds for testing (APKs or internal distribution).
 - **`production`**: For creating release builds to be submitted to app stores (AABs).
 
 ## Step 4: Start the Build
 
 You can now start the build process. For testing on an Android device, building an APK using the `preview` profile is the recommended approach.
 
 ```bash
 # Build an APK for Android using the 'preview' profile
 eas build --platform android --profile preview
 ```
 
 This command will:
 1.  Upload your project to the EAS build servers.
 2.  Queue a new build for the Android platform.
 3.  Build the APK in a cloud environment.
 4.  Provide you with a link to the build details page where you can monitor the progress.
 
 ## Step 5: Download and Install the APK
 
 Once the build is complete, you will see a link to your build's details page.
 
 1.  Open the link in your web browser.
 2.  Click the "Download" button to get the `.apk` file.
 3.  Transfer the APK to your Android device (via USB, email, or a file-sharing service).
 4.  Open the file on your device and follow the prompts to install it. You may need to enable "Install from unknown sources" in your device's security settings.
 
 Alternatively, the build details page will also show a QR code. You can scan this QR code with your Android device's camera to download and install the app directly.
 
 ## Alternative: Building for the Google Play Store
 
 When you are ready to release your app, you should build an Android App Bundle (AAB) using the `production` profile.
 
 ```bash
 # Build an AAB for Android using the 'production' profile
 eas build --platform android --profile production
 ```
 
 This will create a release-signed AAB file, which is the required format for uploading new apps to the Google Play Store.