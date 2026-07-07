export const metadata = {
  title: 'Privacy Policy · Wingman',
  description: 'How Wingman collects, uses, and protects your information.',
};

const UPDATED = 'July 7, 2026';

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-6 py-14">
        <a href="/" className="text-sm text-[#e0447f] font-semibold">← Wingman</a>
        <h1 className="mt-4 text-3xl font-display font-extrabold text-slate-900">Privacy Policy</h1>
        <p className="mt-1 text-sm text-slate-400">Last updated {UPDATED}</p>

        <div className="mt-8 space-y-7 text-[15px] leading-relaxed text-slate-700">
          <p>
            Wingman (&ldquo;we,&rdquo; &ldquo;us&rdquo;) is a social matchmaking app where friends help each
            other meet people. This policy explains what we collect, why, and the choices you have. By
            creating an account you agree to this policy.
          </p>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2">Information we collect</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Account details</strong> you provide: email address and password (stored only as a secure hash).</li>
              <li><strong>Profile information</strong>: name, age, school, major, year, gender, who you&rsquo;re looking for, photos, and prompt answers.</li>
              <li><strong>Activity</strong>: likes, matches, the friends who swipe for you (your wingmen), and messages you send to matches.</li>
              <li><strong>Reports and safety signals</strong> you or others submit, used to keep the community safe.</li>
              <li><strong>Basic technical data</strong> needed to run the service, such as your IP address for rate-limiting and abuse prevention.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2">How we use it</h2>
            <p>
              We use your information to create your profile, show you and your wingmen potential matches,
              enable messaging with mutual matches, keep the service secure, and respond to reports of
              abuse. We do not sell your personal information.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2">Who can see your information</h2>
            <p>
              Your profile is visible to other Wingman users and to the friends you authorize to swipe for
              you. Notes your wingmen write may be shown to the other side&rsquo;s wingmen as part of a
              potential match. Messages are visible to you and your match. We share data with service
              providers (such as our hosting and email delivery vendors) only as needed to operate the app,
              and when required by law.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2">Your choices and rights</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>You can edit your profile and photos at any time in the app.</li>
              <li>You can block or report other users from any conversation.</li>
              <li>
                You can <strong>permanently delete your account</strong> at any time from the Profile
                screen. Deletion removes your profile, photos, matches, and messages.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2">Data retention &amp; security</h2>
            <p>
              We keep your information while your account is active and delete it when you delete your
              account, except where we must retain limited records to comply with legal obligations or
              resolve safety reports. Session tokens are stored securely on your device (iOS Keychain).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2">Age requirement</h2>
            <p>Wingman is intended for users 18 and older. We do not knowingly collect information from anyone under 18.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2">Contact</h2>
            <p>
              Questions about this policy or your data? Email{' '}
              <a href="mailto:support@wingman33.com" className="text-[#e0447f] font-semibold">support@wingman33.com</a>.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
