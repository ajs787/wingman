# Penguin — Your Friends Swipe for You

Penguin is a friend-powered dating app: users delegate swiping to trusted friends, and matches form only when both sides receive mutual right-swipes.

## Current Stack

- Next.js 14 (App Router)
- React 18
- MongoDB + Mongoose
- Tailwind CSS + Radix UI components
- JWT cookie sessions (`penguin_session`)
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
MONGODB_URI=mongodb://127.0.0.1:27017/penguin
JWT_SECRET=replace-with-a-strong-secret
```

Optional settings used by current flows:

```env
NODE_ENV=development
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
- `npm run build` — production build
- `npm run start` — run production build
- `npm run lint` — lint

## Auth Notes

- Session is stored in an HTTP-only cookie named `penguin_session`
- Route protection is enforced by middleware for authenticated pages
- Email auth enforces `.edu` domain validation
- Google Sign-In currently uses a hardcoded client ID in login/API files (consider moving to env vars)
- Phone OTP currently logs OTP in development and is ready for SMS provider integration

## Important API Routes

Auth:

- `POST /api/auth/signup`
- `POST /api/auth/login`
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
- Set `MONGODB_URI` and `JWT_SECRET` in deployment environment
- Ensure cookie/domain behavior matches your production URL
