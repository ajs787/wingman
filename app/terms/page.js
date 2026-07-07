export const metadata = {
  title: 'Terms of Service · Wingman',
  description: 'The terms and community rules for using Wingman.',
};

const UPDATED = 'July 7, 2026';

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-6 py-14">
        <a href="/" className="text-sm text-[#e0447f] font-semibold">← Wingman</a>
        <h1 className="mt-4 text-3xl font-display font-extrabold text-slate-900">Terms of Service</h1>
        <p className="mt-1 text-sm text-slate-400">Last updated {UPDATED}</p>

        <div className="mt-8 space-y-7 text-[15px] leading-relaxed text-slate-700">
          <p>
            Welcome to Wingman. By creating an account or using the app you agree to these Terms. If you do
            not agree, do not use Wingman.
          </p>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2">Eligibility</h2>
            <p>
              You must be at least 18 years old to use Wingman. You are responsible for the accuracy of your
              profile and for the activity of any friends you authorize to swipe on your behalf.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2">Community rules &amp; zero tolerance</h2>
            <p>
              Wingman has <strong>zero tolerance for objectionable content or abusive behavior</strong>. You
              agree not to post, send, or share content that is harassing, hateful, threatening, sexually
              explicit, discriminatory, or otherwise objectionable, and not to impersonate others or create
              fake profiles.
            </p>
            <p className="mt-2">
              We review reports of objectionable content and abusive users. Content or accounts that violate
              these rules may be removed and the responsible user ejected from the service, typically within
              24 hours of a report.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2">Reporting &amp; blocking</h2>
            <p>
              Every conversation includes tools to <strong>report</strong> objectionable content and{' '}
              <strong>block</strong> abusive users. Reports are confidential. To report content outside the
              app, email{' '}
              <a href="mailto:support@wingman33.com" className="text-[#e0447f] font-semibold">support@wingman33.com</a>{' '}
              and we will respond promptly.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2">Your content</h2>
            <p>
              You retain ownership of the photos and text you upload. You grant Wingman a limited license to
              host and display that content within the app so the service can function. You are responsible
              for the content you share.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2">Account termination</h2>
            <p>
              You may delete your account at any time from the Profile screen. We may suspend or terminate
              accounts that violate these Terms or that we reasonably believe pose a safety risk.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2">Disclaimer</h2>
            <p>
              Wingman is provided &ldquo;as is.&rdquo; We do not conduct criminal background checks on users.
              Always use good judgment and prioritize your safety when meeting people. To the extent
              permitted by law, Wingman is not liable for interactions between users.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2">Contact</h2>
            <p>
              Questions about these Terms? Email{' '}
              <a href="mailto:support@wingman33.com" className="text-[#e0447f] font-semibold">support@wingman33.com</a>.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
