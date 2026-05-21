# Wingman — Your Friends Swipe for You

Wingman is a friend-powered dating app: users delegate swiping to trusted friends, and matches form only when both sides receive mutual right-swipes.

## Current Stack

- Next.js 14 (App Router)
- React 18
- MongoDB + Mongoose
- Tailwind CSS + Radix UI components
- JWT cookie sessions (`wingman_session`)
- Optional auth methods:
  - Email/password
  - Google Sign-In
  - Phone OTP (dev-friendly flow)

## Key Product Features

- 5-step onboarding with photos, prompts, and preference fields
- Delegation model via invite codes (friends swipe on your behalf)
- Ranked candidate feed with explainability metadata
- Daily like-limit backend (tier-ready for monetization)
- Match acceptance flow and chat when both sides accept
- Full match profile view from match cards
- App theme toggle (light/dark mode)

## Backend Ranking + Feed Logic

Feed ranking is handled server-side and exposed through:

- `GET /api/feed`
- `GET /api/feed/ranked`

Ranking pipeline includes:

1. Hard constraints: distance, age range, gender preference compatibility, and active dealbreakers (school/major/year/gender/race)
2. Weighted compatibility scoring:
   - shared context (school, majors, interests, prompt overlap)
   - personality similarity
   - activity recency
   - new-user boost
   - desirability signal (like/match behavior)
3. Controlled randomness (default 15%, bounded to 10–20%) to reduce feed stagnation
4. Explainability metadata for frontend rendering (`ranking.explainability`)

## Daily Like Limits

Right-swipes are quota-protected in `POST /api/swipe`.

- Free tier default: 10 likes/day
- Tier-aware and configurable (`free`, `premium`, `plus`)
- 24-hour reset window with atomic decrement for consistency
- Clear limit response payload when exhausted:
  - `code: LIKE_LIMIT_REACHED`
  - `likesRemaining`
  - `resetAt`

Model/config fields:

- `subscription_tier`
- `daily_like_limit_override`
- `like_boost_until`
- `likes_remaining`
- `last_like_reset`

## Prerequisites

- Node.js 18+
- MongoDB instance (local or hosted)

## Local Setup

1. Install dependencies

```bash
npm install
```

2. Create `.env.local` with at least:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/wingman
JWT_SECRET=replace-with-a-strong-secret
```

Optional settings used by current flows:

```env
NODE_ENV=development
```

Email verification and production SMS delivery:

```env
APP_BASE_URL=https://your-app.example
EMAIL_VERIFICATION_SECRET=replace-with-a-strong-secret
SMTP_URL=smtp://user:pass@smtp.example.com:587
SMTP_FROM="Wingman <no-reply@your-app.example>"

PHONE_OTP_SECRET=replace-with-a-strong-secret
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=replace-with-your-token
TWILIO_FROM_PHONE_NUMBER=+15551234567
# Or use TWILIO_MESSAGING_SERVICE_SID instead of TWILIO_FROM_PHONE_NUMBER
```

3. Run the app

```bash
npm run dev
```

4. Open:

- `http://localhost:3000`

## Development Seed

In development mode, seed demo users and delegations from:

- `POST /api/dev/seed`
- or UI route: `/dev/seed`

This creates demo profiles and active delegations so you can test swiping immediately.

## Scripts

- `npm run dev` — start local dev server
- `npm run dev:lan` — start local dev server reachable from phones on your network
- `npm run build` — production build
- `npm run start` — run production build
- `npm run lint` — lint
- `npm run native:dev` — start the Expo React Native app
- `npm run native:ios` — start the Expo app on iOS simulator
- `npm run native:ios:lan` — start iOS using the local network address
- `npm run native:ios:tunnel` — start iOS through an Expo tunnel
- `npm run native:android` — start the Expo app on Android emulator
- `npm run native:android:lan` — start Android using the local network address
- `npm run ios:add` — add iOS platform files via Capacitor
- `npm run ios:sync` — sync Capacitor config/assets into iOS project
- `npm run ios:open` — open iOS Xcode workspace
- `npm run ios:refresh` — sync and open iOS project

## React Native App

This repo now includes a real Expo React Native client in `native/`. It reuses the existing Next.js API and MongoDB backend instead of duplicating matching, chat, auth, feed ranking, and invite-code logic.

Run the backend first:

```bash
npm run dev
```

Then run the native app in another terminal:

```bash
npm run native:dev
```

By default, the native app talks to:

- iOS simulator: `http://localhost:3000`
- Android emulator: `http://10.0.2.2:3000`
- physical phone over Expo LAN: `http://<your-computer-lan-ip>:3000`

For a real phone on the same Wi-Fi, run:

```bash
npm run dev:lan
npm run native:ios:lan
```

`native:ios:lan` detects your Mac's LAN IP, injects `EXPO_PUBLIC_API_BASE_URL=http://<your-mac-ip>:3000`, and clears Metro's cache. This prevents Expo Go from calling `127.0.0.1`, which means "the phone itself" on a real iPhone.

If Expo says port `8081` is already running, stop the old Expo terminal first. An old Metro process can keep serving a stale bundle that still points at `127.0.0.1`.

If your machine has multiple network interfaces, override the IP:

```bash
WINGMAN_LAN_IP=192.168.1.154 npm run native:ios:lan
```

To point the native app at another backend, set:

```bash
EXPO_PUBLIC_API_BASE_URL=https://your-api-domain.example npm run native:dev
```

The native client currently covers the core mobile product loop: email signup/login, profile setup and photo upload, invite code redemption, friend-powered swiping, match review, and chat.

If the iOS simulator times out opening an `exp://192.168.x.x:8081` URL, use `npm run native:ios`. The iOS script is pinned to Expo's localhost mode so the simulator opens `exp://127.0.0.1:8081` instead of depending on LAN routing. Use `npm run native:ios:lan` or `npm run native:ios:tunnel` only when you intentionally want to test through a physical device or a tunnel.

## Auth Notes

- Session is stored in an HTTP-only cookie named `wingman_session`
- Route protection is enforced by middleware for authenticated pages
- Email auth enforces `.edu` domain validation and requires a 6-digit email verification code before login
- Google Sign-In currently uses a hardcoded client ID in login/API files (consider moving to env vars)
- Phone OTP stores hashed codes, rate-limits resends, expires codes after 10 minutes, and sends through Twilio when production credentials are configured. In development without Twilio, it logs the code.

## Important API Routes

Auth:

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/email/verify`
- `POST /api/auth/email/resend`
- `POST /api/auth/google`
- `POST /api/auth/phone/request-otp`
- `POST /api/auth/phone/verify-otp`

Profile:

- `GET /api/profile`
- `PUT /api/profile`
- `PUT /api/profile/filters`

Feed/swipes/matches:

- `GET /api/feed`
- `GET /api/feed/ranked`
- `POST /api/swipe`
- `GET /api/matches`
- `POST /api/matches/action`

## Deployment Notes

- Deploy as a standard Next.js app (e.g., Vercel)
- Set `MONGODB_URI`, `JWT_SECRET`, SMTP, and Twilio variables in the deployment environment
- Ensure cookie/domain behavior matches your production URL

## iOS Wrapper + App Store

This repository is configured for a Capacitor iOS wrapper that loads your hosted web app URL.

1. Set your production app URL before syncing iOS:

```bash
export CAPACITOR_SERVER_URL="https://your-production-domain.example"
```

2. Sync and open the iOS project:

```bash
npm run ios:sync
npm run ios:open
```

3. In Xcode, configure signing, bundle identifier, app version/build, and archive for App Store Connect upload.

Additional guides in this repo:

- `IOS_APP_STORE_CHECKLIST.md`
- `IOS_AUTH_COOKIE_RISK_AUDIT.md`
