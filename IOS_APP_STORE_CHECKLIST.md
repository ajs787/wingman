# Wingman — App Store Submission Checklist

iOS ships as a **native React Native (Expo)** app in `native/`. Backend is Next.js on
Vercel at `https://www.wingman33.com`. Bundle ID: **`com.wingman.mobile`**. Apple Team
ID: **J74X34U73R**.

Legend: `[x]` done · `[ ]` to do · 🔴 blocker · 🟡 recommended

---

## A. Done in code (reference — no action needed)

- [x] **Profile photos → Vercel Blob** (was broken on Vercel's read-only FS). Legacy
  `/uploads` photos still serve via fallback. Verified end-to-end.
- [x] **In-app account deletion** — Profile → "Delete my account" → `DELETE /api/account` (5.1.1(v)).
- [x] **Report + block** from **chat AND a candidate profile** (pre-match) — `/api/report`,
  `/api/block`; moderation backend at `/api/admin/reports` (1.2).
- [x] **18+ age gate** — client pickers + server validation (`age >= 18`).
- [x] **.edu email + emailed-code auth**; **legal pages** live at `/privacy` and `/terms`.
- [x] **App icon** 1024×1024, no alpha; photo-library permission string; `ITSAppUsesNonExemptEncryption=false`.
- [x] `JWT_SECRET` throws in prod if unset (fail-closed).

---

## B. Backend / environment (set in Vercel → Project → Settings → Environment Variables)

- [ ] 🔴 `JWT_SECRET` — strong random secret (Production).
- [ ] 🔴 `MONGODB_URI` — production cluster.
- [ ] 🔴 `SENDGRID_API_KEY` (or `SMTP_PASS`) + `SMTP_FROM` — verification emails must send.
- [ ] 🔴 Google OAuth client IDs/secret.
- [ ] `BLOB_READ_WRITE_TOKEN` (or the store's prefixed `*_READ_WRITE_TOKEN`) — auto-injected
  because the **public** Blob store is connected to the project. Keep the store **public**.
- [ ] 🟡 **SPF DNS record** on wingman33.com (Cloudflare): `v=spf1 include:sendgrid.net ~all`
  so verification emails don't land in .edu spam.
- [ ] 🔴 **Smoke test after deploy:** on `wingman33.com`, upload a profile photo → confirm it
  persists and loads from a `*.public.blob.vercel-storage.com` URL.

---

## C. Apple Developer portal — Certificates, Identifiers & Profiles (you're here)

- [ ] **Register the App ID** (or let EAS create it during `eas build`):
  - Description: `Wingman`
  - Bundle ID: **Explicit** → `com.wingman.mobile`  ← must match `native/app.json`
  - Capabilities: **none required** — no Push, no Sign in with Apple, no Associated Domains
    yet. Leave them all unchecked. (Enable Push Notifications later only if/when you add it.)
- [ ] Ensure your Apple Developer Program membership is active ($99/yr).

---

## D. App Store Connect — create the app record

- [ ] New app → platform iOS, bundle ID `com.wingman.mobile`, primary language, name "Wingman".
- [ ] **Age rating:** answer the questionnaire honestly (dating/mature themes) → **17+**
  (choose 18+ if the tier is offered; the app is 18+ in-product regardless).
- [ ] **App Privacy** nutrition labels — declare: email, photos, profile data (name/school/etc.),
  and usage data. (No precise location — "Location" is a free-text field, not GPS.)
- [ ] **Privacy Policy URL:** `https://www.wingman33.com/privacy`
- [ ] **Support URL** + a monitored support email.
- [ ] Category: Social Networking (or Lifestyle). Screenshots for required iPhone sizes
  (6.7" + 6.5") and iPad (app sets `supportsTablet:true`).

---

## E. Build & submit (EAS)

- [ ] `npm i -g eas-cli && eas login`
- [ ] `eas build --platform ios --profile production` (EAS manages signing/certs).
- [ ] `eas submit --platform ios` → TestFlight.
- [ ] 🔴 **One full real-device pass** (not simulator): sign in → swipe for a friend → like →
  accept → match → chat → report/block (from a profile AND a chat) → delete account.

---

## F. App Review notes (paste into App Review Information → Notes)

- [ ] Demo account (pre-verified — reviewer can't register past the .edu + email-code gate):
  **`maya@scarletmail.rutgers.edu` / `WingmanWalk1!`** — tell them to SIGN IN, not register.
- [ ] Explain the model: **friends swipe FOR you; only the other person's side approves.**
- [ ] Full walkthrough incl. report/block + account deletion. (Draft saved separately.)

---

## Known decisions / notes
- **Sign in with Apple (4.8):** you offer Google + first-party email/password. The email/password
  option generally satisfies 4.8, so Sign in with Apple is likely **not required** — but it's a
  common rejection area; be ready to add it if pushed.
- **Moderation SLA:** commit to acting on reports within 24h (someone watches `/api/admin/reports`).
- No push-notification infrastructure yet (fine — nothing to declare).
