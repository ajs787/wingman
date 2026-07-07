// NOTE FOR MAINTAINERS: This document is a strong industry-standard template
// modeled on the public terms of Match Group / Bumble / Apple. It is NOT a
// substitute for review by a licensed attorney. Before relying on it, have
// counsel familiar with dating-app/consumer law and your jurisdiction confirm:
// the legal entity name, governing-law state, and the enforceability of the
// arbitration, class-action-waiver, and liability-cap clauses where your users
// live. Placeholders to confirm are marked with "[[CONFIRM: ...]]".

export const metadata = {
  title: 'Terms of Service · Wingman',
  description: 'The terms, community rules, and legal agreement for using Wingman.',
};

const UPDATED = 'July 7, 2026';

function Section({ n, title, children }) {
  return (
    <section>
      <h2 className="text-lg font-bold text-slate-900 mb-2">{n}. {title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-6 py-14">
        <a href="/" className="text-sm text-[#e0447f] font-semibold">← Wingman</a>
        <h1 className="mt-4 text-3xl font-display font-extrabold text-slate-900">Terms of Service</h1>
        <p className="mt-1 text-sm text-slate-400">Last updated {UPDATED}</p>

        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-[13px] leading-relaxed text-slate-600">
            <strong>Please read these Terms carefully.</strong> They include a binding{' '}
            <strong>arbitration agreement</strong> and a <strong>class-action waiver</strong>{' '}
            (Section 14) that affect how disputes are resolved, a <strong>limitation of
            liability</strong> (Section 12), and a <strong>release</strong> of claims relating to
            other users (Section 10). By using Wingman you agree to all of them.
          </p>
        </div>

        <div className="mt-8 space-y-7 text-[15px] leading-relaxed text-slate-700">
          <p>
            These Terms of Service (&ldquo;Terms&rdquo;) are a binding agreement between you and
            Wingman (&ldquo;Wingman,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;)
            {' '}[[CONFIRM: insert the legal entity, e.g. &ldquo;Wingman, Inc.&rdquo;]] governing your
            use of the Wingman mobile application, website, and related services (together, the
            &ldquo;Service&rdquo;). By creating an account or using the Service, you agree to these
            Terms and to our{' '}
            <a href="/privacy" className="text-[#e0447f] font-semibold">Privacy Policy</a>. If you do
            not agree, do not use the Service.
          </p>

          <Section n="1" title="Eligibility">
            <p>
              You must be at least 18 years old and legally able to enter a contract to use Wingman.
              By using the Service you represent and warrant that you meet these requirements, that
              you are not a convicted sex offender, and that you are not barred from using the
              Service under the laws of your jurisdiction.
            </p>
          </Section>

          <Section n="2" title="The Service and your license">
            <p>
              Wingman helps friends make matches for one another. Subject to these Terms, we grant
              you a limited, personal, non-exclusive, non-transferable, revocable license to use the
              Service for your own personal, non-commercial use. We may modify, suspend, or
              discontinue any part of the Service at any time without liability.
            </p>
          </Section>

          <Section n="3" title="Your account">
            <p>
              You are responsible for your account, your password, and all activity that occurs
              through it — including the activity of friends you authorize to swipe on your behalf
              (your &ldquo;wingmen&rdquo;). Keep your credentials confidential and notify us promptly
              of any unauthorized use. You are responsible for the accuracy of the information you
              provide.
            </p>
          </Section>

          <Section n="4" title="Safety, assumption of risk, and no background checks">
            <p className="uppercase text-[13px] font-semibold tracking-wide text-slate-800">
              Wingman is not responsible for the conduct of any user, on or off the Service.
            </p>
            <p>
              We do <strong>not</strong> conduct criminal background checks or identity verification
              on users, and we do not vouch for any user&rsquo;s identity, statements, or intentions.
              You are solely responsible for your interactions with other users. Use caution and
              common sense: never send money, meet in public places, tell a friend where you are
              going, and stop communicating with anyone who makes you uncomfortable.
            </p>
            <p>
              You understand that meeting and interacting with other people — online or in person —
              carries inherent risks, and <strong>you assume all such risks</strong>. To the fullest
              extent permitted by law, Wingman disclaims all liability for any act or omission of any
              user or third party.
            </p>
          </Section>

          <Section n="5" title="Community rules and zero tolerance">
            <p>
              Wingman has <strong>zero tolerance for objectionable content or abusive behavior</strong>.
              You agree not to post, send, or share content that is unlawful, harassing, hateful,
              threatening, defamatory, sexually explicit, discriminatory, or otherwise objectionable,
              and not to impersonate anyone or create fake or misleading profiles.
            </p>
            <p>
              We review reports of objectionable content and abusive users. Content or accounts that
              violate these rules may be removed and the responsible user ejected from the Service,
              typically within 24 hours of a report.
            </p>
          </Section>

          <Section n="6" title="Reporting and blocking">
            <p>
              Every conversation includes tools to <strong>report</strong> objectionable content and{' '}
              <strong>block</strong> abusive users. Reports are confidential. To report content outside
              the app, email{' '}
              <a href="mailto:support@wingman33.com" className="text-[#e0447f] font-semibold">support@wingman33.com</a>{' '}
              and we will respond promptly.
            </p>
          </Section>

          <Section n="7" title="User content and license to Wingman">
            <p>
              You retain ownership of the photos, text, and other content you submit (&ldquo;User
              Content&rdquo;). You grant Wingman a worldwide, non-exclusive, royalty-free,
              sublicensable license to host, store, reproduce, display, and distribute your User
              Content solely to operate, provide, and improve the Service. You represent that you own
              or have the rights to your User Content and that it does not violate these Terms or any
              law. You are solely responsible for your User Content.
            </p>
          </Section>

          <Section n="8" title="Prohibited conduct">
            <p>You agree not to: use the Service for any unlawful or commercial purpose (including
              solicitation, spam, or advertising); harass, defraud, or harm other users; scrape,
              reverse-engineer, or interfere with the Service; upload malware; circumvent security or
              rate limits; use the Service if you are under 18; or violate any applicable law. We may
              investigate and take any action we deem appropriate, including removing content and
              terminating accounts.
            </p>
          </Section>

          <Section n="9" title="Termination">
            <p>
              You may delete your account at any time from the Profile screen. We may suspend or
              terminate your access at any time, with or without notice, including if we believe you
              have violated these Terms or pose a risk to other users or to Wingman. Sections that by
              their nature should survive termination (including Sections 7 and 10&ndash;16) survive.
            </p>
          </Section>

          <Section n="10" title="Release of claims between users">
            <p className="uppercase text-[13px] font-semibold tracking-wide text-slate-800">
              Because Wingman is largely about interactions you have with other people, you release
              Wingman from claims arising out of those interactions.
            </p>
            <p>
              To the fullest extent permitted by law, you release and forever discharge Wingman and
              its officers, directors, employees, agents, and affiliates from any and all claims,
              demands, damages, losses, and liabilities of every kind, known or unknown, arising out
              of or in any way connected with disputes between you and other users or with any
              user&rsquo;s conduct.
            </p>
            <p>
              If you are a California resident, you waive California Civil Code § 1542, which says:
              &ldquo;A general release does not extend to claims that the creditor or releasing party
              does not know or suspect to exist in his or her favor at the time of executing the
              release, and that, if known by him or her, would have materially affected his or her
              settlement with the debtor or released party.&rdquo; You waive similar protections
              under the laws of other jurisdictions.
            </p>
          </Section>

          <Section n="11" title="Disclaimer of warranties">
            <p className="uppercase text-[13px] leading-relaxed text-slate-800">
              The Service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without
              warranties of any kind, whether express, implied, or statutory, including any implied
              warranties of merchantability, fitness for a particular purpose, title, and
              non-infringement. Wingman does not warrant that the Service will be uninterrupted,
              secure, or error-free, that defects will be corrected, or that you will find a match or
              any particular outcome. Some jurisdictions do not allow the exclusion of certain
              warranties, so some of the above may not apply to you.
            </p>
          </Section>

          <Section n="12" title="Limitation of liability">
            <p className="uppercase text-[13px] leading-relaxed text-slate-800">
              To the fullest extent permitted by law, in no event will Wingman or its officers,
              directors, employees, agents, or affiliates be liable for any indirect, incidental,
              special, consequential, exemplary, or punitive damages, or for any loss of profits,
              data, goodwill, or other intangible losses, arising out of or relating to the Service or
              these Terms, whether based in contract, tort, negligence, strict liability, or
              otherwise, even if advised of the possibility of such damages.
            </p>
            <p className="uppercase text-[13px] leading-relaxed text-slate-800">
              In no event will Wingman&rsquo;s total aggregate liability arising out of or relating to
              the Service or these Terms exceed the greater of (a) the total amount you paid Wingman
              in the 12 months before the event giving rise to the claim, or (b) one hundred U.S.
              dollars (US $100).
            </p>
            <p>
              Some jurisdictions do not allow the exclusion or limitation of certain damages, so some
              of the above limitations may not apply to you. Nothing in these Terms limits liability
              that cannot be limited under applicable law (such as, in some places, liability for
              death or personal injury caused by our negligence, or for fraud).
            </p>
          </Section>

          <Section n="13" title="Indemnification">
            <p>
              You agree to indemnify, defend, and hold harmless Wingman and its officers, directors,
              employees, agents, and affiliates from and against any claims, damages, losses,
              liabilities, costs, and expenses (including reasonable attorneys&rsquo; fees) arising out
              of or related to: your use of the Service; your User Content; your violation of these
              Terms or any law; or your interactions or disputes with any other user or third party.
            </p>
          </Section>

          <Section n="14" title="Dispute resolution, arbitration, and class-action waiver">
            <p className="uppercase text-[13px] font-semibold tracking-wide text-slate-800">
              Please read this section carefully — it affects your legal rights.
            </p>
            <p>
              <strong>Informal resolution first.</strong> Before filing a claim, you agree to try to
              resolve the dispute informally by emailing{' '}
              <a href="mailto:support@wingman33.com" className="text-[#e0447f] font-semibold">support@wingman33.com</a>{' '}
              with a description of your claim. We&rsquo;ll try to resolve it within 60 days.
            </p>
            <p>
              <strong>Binding arbitration.</strong> If we can&rsquo;t resolve it informally, you and
              Wingman agree that any dispute arising out of or relating to these Terms or the Service
              will be resolved by <strong>final and binding individual arbitration</strong>,
              administered by a recognized arbitration provider [[CONFIRM: e.g. AAA or JAMS]] under its
              consumer rules, rather than in court, except that either party may bring an individual
              claim in small-claims court.
            </p>
            <p className="uppercase text-[13px] font-semibold tracking-wide text-slate-800">
              Class-action and jury-trial waiver: you and Wingman agree that each may bring claims
              against the other only in an individual capacity, and not as a plaintiff or class member
              in any purported class, collective, or representative proceeding. You and Wingman waive
              any right to a jury trial.
            </p>
            <p>
              <strong>30-day opt-out.</strong> You may opt out of this arbitration agreement within 30
              days of first accepting these Terms by emailing{' '}
              <a href="mailto:support@wingman33.com" className="text-[#e0447f] font-semibold">support@wingman33.com</a>{' '}
              with your name, account email, and a statement that you opt out. Opting out does not
              affect any other part of these Terms.
            </p>
            <p>
              This arbitration agreement is governed by the Federal Arbitration Act. If any portion of
              this Section is found unenforceable, it will be severed, except that if the
              class-action waiver is found unenforceable as to a particular claim, that claim (and
              only that claim) will proceed in court.
            </p>
          </Section>

          <Section n="15" title="Governing law and venue">
            <p>
              These Terms are governed by the laws of the State of New Jersey, USA
              {' '}[[CONFIRM: your entity&rsquo;s home state]], without regard to conflict-of-laws
              rules. For any dispute not subject to arbitration, you and Wingman consent to the
              exclusive jurisdiction of the state and federal courts located in New Jersey. Nothing in
              this Section overrides mandatory consumer-protection rights you may have in your country
              of residence.
            </p>
          </Section>

          <Section n="16" title="Apple App Store and other app stores">
            <p>
              If you download the app from the Apple App Store, you acknowledge that these Terms are
              between you and Wingman only, not Apple, and that Apple is not responsible for the app or
              its content. Apple has no obligation to provide maintenance or support for the app. To
              the maximum extent permitted by law, Apple has no warranty obligation, and any claims,
              losses, liabilities, damages, costs, or expenses attributable to any failure to conform
              to a warranty are our responsibility, not Apple&rsquo;s. Apple is not responsible for
              addressing any claims by you or a third party relating to the app, including product
              liability, legal or regulatory compliance, or intellectual-property claims. You agree to
              comply with the App Store Terms of Service and any applicable third-party usage rules.
              You represent that you are not located in a country subject to a U.S. Government embargo
              and are not on any U.S. Government restricted-parties list. <strong>Apple and its
              subsidiaries are third-party beneficiaries of these Terms and may enforce them against
              you.</strong>
            </p>
          </Section>

          <Section n="17" title="Changes to these Terms">
            <p>
              We may update these Terms from time to time. If we make material changes, we will take
              reasonable steps to notify you (for example, in-app or by email) and update the
              &ldquo;Last updated&rdquo; date. Your continued use of the Service after changes take
              effect means you accept the updated Terms.
            </p>
          </Section>

          <Section n="18" title="Miscellaneous">
            <p>
              These Terms and the Privacy Policy are the entire agreement between you and Wingman
              regarding the Service. If any provision is held unenforceable, the remaining provisions
              stay in effect. Our failure to enforce any right is not a waiver. You may not assign
              these Terms; we may assign them to an affiliate or in connection with a merger,
              acquisition, or sale of assets. We are not liable for any delay or failure to perform
              caused by events beyond our reasonable control.
            </p>
          </Section>

          <Section n="19" title="Contact">
            <p>
              Questions about these Terms? Email{' '}
              <a href="mailto:support@wingman33.com" className="text-[#e0447f] font-semibold">support@wingman33.com</a>.
            </p>
          </Section>
        </div>
      </div>
    </main>
  );
}
