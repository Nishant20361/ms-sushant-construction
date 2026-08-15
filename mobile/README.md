# MS Sushant Construction mobile

Native React Native application foundation built with Expo, TypeScript and Expo Router. It is a separate customer client for the existing Express API; it contains no WebView and no admin functionality.

## Install and start

```bash
cd mobile
npm install
npx expo start
```

Press `a` to open an available Android emulator, or run:

```bash
npx expo start --android
```

The current dependencies work in Expo Go. An EAS development client can be created later when needed:

```bash
eas build --profile development --platform android
```

## API configuration

The safe built-in production fallback is:

```text
https://ms-sushant-construction.onrender.com/api/public
```

Copy `.env.example` to `.env.local` to override it during development. Only public configuration may use the `EXPO_PUBLIC_` prefix.

For a physical Android phone, `localhost` points to the phone—not the Mac. Find the Mac LAN address:

```bash
ipconfig getifaddr en0
```

Then set:

```env
EXPO_PUBLIC_API_BASE_URL=http://MAC_LAN_IP:5100/api/public
```

The Mac and phone must be on the same network, the backend must be running, and the local firewall must permit the connection. Production always uses HTTPS.

Never add database credentials, Groq keys, Brevo keys, Cloudinary secrets, JWT secrets, admin credentials or reset-password secrets to this directory.

## Routes

The five native tabs are Home, Products, AI Assistant, Track Order and Cart. Product detail, category, search, checkout, order success and About/Contact are nested stack routes. Phase 2 uses intentionally lightweight foundation UI.

## Builds

`eas.json` provides unsigned project configuration for:

- `development`: internal development client
- `preview`: internal APK
- `production`: Android App Bundle (AAB)

EAS will request or manage signing credentials when an authorized release build is started. No production signing credential is stored in this repository.

## Temporary assets

`assets/icon.png`, `assets/adaptive-icon.png`, and `assets/splash.png` are functional Expo placeholder assets. Replace them with approved MS Sushant Construction artwork before public APK or Play Store distribution.
