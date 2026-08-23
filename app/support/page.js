export const metadata = {
  title: 'Support · Wingman',
  description: 'Get help with Wingman — contact support, account help, safety, and verification.',
};

const SUPPORT_EMAIL = 'support@wingman33.com';

function Section({ title, children }) {
  return (
    <section>
      <h2 className="text-lg font-bold text-slate-900 mb-2">{title}</h2>
      <div className="space-y-2 text-slate-600 text-sm leading-relaxed">{children}</div>
    </section>
  );
}

export default function SupportPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-6 py-14">
        <a href="/" className="text-sm text-[#e0447f] font-semibold">← Wingman</a>
        <h1 className="mt-4 text-3xl font-display font-extrabold text-slate-900">Support</h1>
        <p className="mt-1 text-sm text-slate-400">We&apos;re here to help.</p>

        {/* Prominent contact card — Apple's reviewers look for a working way to reach support. */}
        <div className="mt-8 rounded-2xl border border-black/5 bg-white p-6 shadow-[0_16px_45px_-30px_rgba(119,77,24,0.30)]">
          <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Contact us</p>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="mt-1 block text-2xl font-display font-extrabold text-[#e0447f] break-all"
          >
            {SUPPORT_EMAIL}
          </a>
          <p className="mt-2 text-sm text-slate-500">
            Email us any time — we typically reply within 1&ndash;2 business days.
          </p>
        </div>

        <div className="mt-10 space-y-8">
          <Section title="What is Wingman?">
            <p>
              Wingman is a college dating app where your friends help set you up. Your friends
              (&ldquo;wingmen&rdquo;) swipe on your behalf and vouch for people they think you&apos;d click
              with, and you do the same for them. When a friend on each side approves, the two of you
              match and can chat.
            </p>
          </Section>

          <Section title="Account &amp; sign-in">
            <p>
              Wingman is for verified college students. Sign up with your school (.edu) email — we send
              a 6-digit code to confirm it&apos;s really you. If your code doesn&apos;t arrive, check your
              spam folder, then email us and we&apos;ll help.
            </p>
          </Section>

          <Section title="Deleting your account">
            <p>
              You can permanently delete your account and all associated data any time from the app:
              open the <strong>Profile</strong> tab and tap <strong>Delete my account</strong>. This
              removes your profile, matches, and messages and cannot be undone. Prefer we do it for you?
              Email <a href={`mailto:${SUPPORT_EMAIL}`} className="text-[#e0447f] font-semibold">{SUPPORT_EMAIL}</a>{' '}
              from your account&apos;s email address.
            </p>
          </Section>

          <Section title="Safety — reporting &amp; blocking">
            <p>
              Your safety comes first. You can <strong>report</strong> or <strong>block</strong> anyone
              from their profile or from a chat — tap the <strong>&ldquo;&hellip;&rdquo;</strong> menu.
              Reports are reviewed by our team and we act on violations, including removing accounts,
              within 24 hours. To report something urgent, email us with the details.
            </p>
          </Section>

          <Section title="Still need help?">
            <p>
              Email <a href={`mailto:${SUPPORT_EMAIL}`} className="text-[#e0447f] font-semibold">{SUPPORT_EMAIL}</a>{' '}
              and include your account email and a description of the issue. See also our{' '}
              <a href="/privacy" className="text-[#e0447f] font-semibold">Privacy Policy</a> and{' '}
              <a href="/terms" className="text-[#e0447f] font-semibold">Terms of Service</a>.
            </p>
          </Section>
        </div>
      </div>
    </main>
  );
}
