# WingRu — Your friends swipe for you.

> The Rutgers-only dating app where you delegate swiping to your friends.

![WingRu](https://img.shields.io/badge/Rutgers-only-cc0033?style=flat-square) ![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square) ![Supabase](https://img.shields.io/badge/Supabase-postgres-3ECF8E?style=flat-square)

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Supabase Setup](#supabase-setup)
   - [Create Project](#create-project)
   - [Run SQL Schema](#run-sql-schema)
   - [Storage Bucket](#storage-bucket)
   - [Auth Configuration](#auth-configuration)
3. [Local Development](#local-development)
4. [Environment Variables](#environment-variables)
5. [Phase 2: Rutgers CAS SSO](#phase-2-rutgers-cas-sso)
6. [Sanity Checklist](#sanity-checklist)
7. [Architecture Notes](#architecture-notes)

---

## Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) account (free tier works)

---

## Supabase Setup

### Create Project

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. Choose a region close to New Jersey (e.g., US East).
3. Save your project URL and keys — you'll need them in a moment.

---

### Run SQL Schema

In your Supabase dashboard, go to **SQL Editor** and run the following SQL in order:

```sql
-- 1. Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  netid text not null unique,
  email text not null unique,
  name text,
  age int,
  year text,
  major text,
  gender text,
  looking_for text,
  personality_answer text,
  created_at timestamptz default now()
);

-- 2. Prompts
create table public.prompts (
  id bigserial primary key,
  text text not null
);

-- Seed prompts
insert into public.prompts (text) values
  ('My go-to stress reliever...'),
  ('The way to my heart is...'),
  ('We''ll get along if...'),
  ('My most controversial opinion...'),
  ('I''m secretly really good at...');

-- 3. Photos
create table public.photos (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null,
  position int not null check (position between 0 and 4),
  prompt_id bigint references public.prompts(id),
  prompt_answer text,
  created_at timestamptz default now(),
  unique(user_id, position)
);

-- 4. Delegations
create table public.delegations (
  id bigserial primary key,
  owner_user_id uuid not null references public.profiles(id) on delete cascade,
  delegate_user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'revoked')),
  created_at timestamptz default now(),
  unique(owner_user_id, delegate_user_id)
);

-- 5. Invite codes
create table public.invite_codes (
  code text primary key,
  owner_user_id uuid not null references public.profiles(id) on delete cascade,
  expires_at timestamptz not null,
  max_uses int not null default 1,
  uses int not null default 0,
  created_at timestamptz default now()
);

-- 6. Swipes
create table public.swipes (
  id bigserial primary key,
  owner_user_id uuid not null references public.profiles(id) on delete cascade,
  delegate_user_id uuid not null references public.profiles(id) on delete cascade,
  target_user_id uuid not null references public.profiles(id) on delete cascade,
  direction text not null check (direction in ('left', 'right')),
  tag text,
  created_at timestamptz default now(),
  unique(owner_user_id, target_user_id)
);

-- 7. Matches
-- Note: unique constraint on ordered pair using check constraint
create table public.matches (
  id bigserial primary key,
  user_a uuid not null references public.profiles(id) on delete cascade,
  user_b uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  check (user_a < user_b),
  unique(user_a, user_b)
);

-- Indexes for performance
create index on public.swipes(owner_user_id);
create index on public.swipes(target_user_id);
create index on public.delegations(owner_user_id, status);
create index on public.delegations(delegate_user_id, status);
create index on public.matches(user_a);
create index on public.matches(user_b);
create index on public.invite_codes(owner_user_id);

-- Row Level Security
-- Enable RLS on all tables (API routes use service role key which bypasses RLS)
alter table public.profiles enable row level security;
alter table public.photos enable row level security;
alter table public.delegations enable row level security;
alter table public.invite_codes enable row level security;
alter table public.swipes enable row level security;
alter table public.matches enable row level security;
alter table public.prompts enable row level security;

-- Public read on prompts
create policy "prompts are public" on public.prompts for select using (true);

-- Profiles: users can read their own profile via anon client
create policy "users read own profile" on public.profiles
  for select using (auth.uid() = id);

-- (All mutations go through service role in API routes — no additional policies needed for mutations)
```

> **Tip:** The service role key in your API routes bypasses RLS entirely, so mutations work without additional policies. Client-side reads use the anon key + the policies above.

---

### Storage Bucket

1. In Supabase dashboard, go to **Storage**.
2. Click **New bucket** and name it exactly: `profile-photos`
3. Set it to **Public** (so photo URLs are accessible without auth).
4. Under **Policies**, add a policy allowing authenticated users to upload:

```sql
-- Allow authenticated users to upload to their own folder
create policy "users upload own photos"
on storage.objects for insert
to authenticated
with check (bucket_id = 'profile-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow public read
create policy "public read photos"
on storage.objects for select
to public
using (bucket_id = 'profile-photos');

-- Allow users to delete their own photos
create policy "users delete own photos"
on storage.objects for delete
to authenticated
using (bucket_id = 'profile-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
```

---

### Auth Configuration

1. In Supabase dashboard, go to **Authentication → URL Configuration**.
2. Set **Site URL** to: `http://localhost:3000`
3. Add to **Redirect URLs**: `http://localhost:3000/api/auth/callback`
4. Go to **Authentication → Email Templates**.
5. *(Optional)* Customize the magic link email template.

To restrict signups to Rutgers domains only:
1. Go to **Authentication → Providers → Email**.
2. Keep "Enable Email Provider" on.
3. The domain restriction is enforced in the app's `/login` page and `/api/auth/callback` — Supabase itself does not natively filter by domain.

---

## Local Development

### 1. Clone and Install

```bash
git clone <your-repo>
cd wingru
npm install
```

### 2. Set Up Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local` with your Supabase values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-anon-key
SUPABASE_SERVICE_ROLE_KEY=eyJ...your-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> Find these in Supabase dashboard under **Settings → API**.

### 3. Run Dev Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 4. Seed Demo Data (Development Only)

After logging in, visit [http://localhost:3000/dev/seed](http://localhost:3000/dev/seed) and click **Run seed**.

This creates:
- 10 demo user profiles (Jordan Lee, Morgan Kim, etc.)
- 2 active delegations where **you** are the delegate for the first 2 demo users
- So you can immediately go to `/feed` and start swiping for a friend

---

## Environment Variables

| Variable | Where | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + Server | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + Server | Anon/public key (safe to expose) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server only** | Service role key — bypasses RLS. Never expose to client. |
| `NEXT_PUBLIC_APP_URL` | Client | Base URL of your app |

---

## Deployment (Vercel)

1. Push repo to GitHub.
2. Import into Vercel.
3. Set all environment variables in Vercel dashboard.
4. Update Supabase **Redirect URLs** to include your production URL: `https://your-app.vercel.app/api/auth/callback`
5. Deploy!

---

## Phase 2: Rutgers CAS SSO

Phase 1 uses magic link email authentication (already implemented). When ready for production:

1. **Rutgers CAS** endpoint: `https://cas.rutgers.edu/login`
2. Implement OAuth2/SAML flow or use a CAS client library.
3. In Supabase, use **Custom SAML SSO** (Enterprise feature) or implement a custom auth flow using the service role key to create sessions after CAS validates.
4. Replace the magic link form at `/login` with a "Sign in with Rutgers CAS" button.
5. The NetID extraction and one-account-per-NetID enforcement logic in `/api/auth/callback` remains the same.

---

## Sanity Checklist

Run through these manual tests to verify everything works:

### Auth
- [ ] **Login with Rutgers domain**: Go to `/login`, enter `test@scarletmail.rutgers.edu`, receive magic link, click it, land on `/onboarding`.
- [ ] **Invalid domain blocked**: Try `test@gmail.com` — should show "Only @rutgers.edu..." error.
- [ ] **NetID conflict**: If same NetID tries to log in from a different auth account, should be blocked with an error message.

### Onboarding
- [ ] **All steps completable**: Fill out all 5 onboarding steps, upload 5 photos, answer 2+ prompts, click Done.
- [ ] **Cannot skip required fields**: Try advancing from step 1 without filling all fields — Next button stays disabled.
- [ ] **Photo upload**: Upload 5 photos; they appear in slots with remove buttons.

### Invite & Delegation
- [ ] **Generate invite code**: Go to `/settings`, click "Generate invite code", a code appears.
- [ ] **Code expires in 10 min**: Wait or verify the countdown timer works.
- [ ] **Redeem code**: Log in as User B, go to `/delegate`, enter User A's code → success state, delegation created.
- [ ] **Cannot redeem own code**: Log in as User A, try to redeem your own code → "You cannot be your own wingman."
- [ ] **Revoke delegate**: In `/settings`, click Remove on a delegate → they disappear from list.

### Feed & Swiping
- [ ] **Cannot swipe for yourself**: API must reject if `owner_user_id === delegate_user_id` (verify via direct API call with `curl`).
- [ ] **Cannot access feed without delegation**: Call `GET /api/feed?ownerId=<random-uuid>` without a delegation → 403.
- [ ] **Swipe deck loads**: After delegation, go to `/feed`, click a name, swipe deck shows candidates.
- [ ] **Candidates exclude owner + delegate**: Owner and delegate do not appear in the deck.
- [ ] **Already-swiped excluded**: Swipe on someone; refresh deck; they shouldn't reappear.

### Matches
- [ ] **Mutual right swipe creates match**: User A's delegate right-swipes User B; User B's delegate right-swipes User A → match appears in `/matches/[ownerId]`.
- [ ] **No match on one-sided**: One side right-swipes, other left-swipes → no match.
- [ ] **Match page permission**: Only owner or active delegate can view matches. Another user gets 403.

### Dev Seed
- [ ] **Seed route**: Go to `/dev/seed`, click "Run seed" → 10 profiles created, 2 delegations.
- [ ] **Feed works after seed**: Go to `/feed`, see 2 names to swipe for, click one, deck loads.

---

## Architecture Notes

### Self-Swipe Prevention

Enforced at **two** levels:

1. **UI**: Feed page does not list the current user as a swipe-for option.
2. **Server**: `POST /api/swipe` rejects if `owner_user_id === delegate_user_id` OR `target_user_id === user.id` OR `target_user_id === owner_user_id`.

### Delegation Check

Every feed request and swipe request verifies an active `delegations` row exists for `(owner_user_id, delegate_user_id)`. Revoked delegations are immediately rejected.

### Match Logic

On a right swipe where `owner A` likes `target B`:
- Query: does a right swipe exist where `owner = B` and `target = A`?
- If yes: upsert `matches(min(A,B), max(A,B))`
- The `check (user_a < user_b)` constraint and `unique(user_a, user_b)` prevent duplicate matches.

### Photo Storage

Photos are stored at `{userId}/{position}-{random}.{ext}` in the `profile-photos` bucket. The server always builds public URLs via `admin.storage.from('profile-photos').getPublicUrl(path)`.

### Security

- `SUPABASE_SERVICE_ROLE_KEY` is **only used in API routes** (server-side). It bypasses RLS.
- The browser client uses **only** the anon key.
- Middleware guards all `/feed/*`, `/settings`, `/delegate`, `/matches/*`, `/onboarding` routes.
