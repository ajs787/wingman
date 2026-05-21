# Wingman Native

Expo React Native client for the Wingman app.

## Run locally

Start the existing Next.js backend from the repo root.

For the iOS Simulator:

```bash
npm run dev
```

For a real phone on the same Wi-Fi:

```bash
npm run dev:lan
```

Start Expo from the repo root:

```bash
npm run native:dev
```

Or from this folder:

```bash
npm start
```

For the iOS Simulator, use:

```bash
npm run ios
```

That script uses Expo's localhost mode. It avoids simulator timeouts caused by Expo's default LAN URL, such as `exp://192.168.x.x:8081`.

For a physical phone, use LAN or tunnel mode instead:

```bash
npm run native:ios:lan
npm run ios:tunnel
```

From the repo root, `npm run native:ios:lan` detects your Mac's LAN IP, injects `EXPO_PUBLIC_API_BASE_URL=http://<your-computer-lan-ip>:3000`, and clears Metro's cache. This prevents Expo Go from calling `127.0.0.1`, which means "the phone itself" on a real iPhone.

If your machine has multiple network interfaces, override the IP:

```bash
WINGMAN_LAN_IP=192.168.1.154 npm run native:ios:lan
```

## Backend URL

The app defaults to:

- iOS simulator: `http://127.0.0.1:3000`
- Android emulator: `http://10.0.2.2:3000`
- physical phone over Expo LAN: `http://<your-computer-lan-ip>:3000`

Override it with:

```bash
EXPO_PUBLIC_API_BASE_URL=https://your-api-domain.example npm start
```

## What is native

The screens in `App.js` are React Native screens, not a WebView. They call the existing Next.js API routes and reuse the same MongoDB-backed product logic for auth, profiles, invite codes, swipes, matches, and chats.
