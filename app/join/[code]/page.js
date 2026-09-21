'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { BrandMark, Wordmark } from '@/components/brand';

// One-tap invite landing. A friend shares wingman33.com/join/ABCD2345; this
// redeems it for a signed-in user, or bounces a signed-out visitor through
// sign-up and back here (via ?next=) so they land already connected.
export default function JoinPage() {
  const router = useRouter();
  const params = useParams();
  const code = String(params?.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);

  const [state, setState] = useState('working'); // working | done | error
  const [message, setMessage] = useState('');
  const [ownerName, setOwnerName] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function redeem() {
      if (code.length !== 8) {
        setState('error');
        setMessage('That invite link looks incomplete. Ask your friend to resend it.');
        return;
      }

      try {
        const res = await fetch('/api/invite/redeem', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        });

        // Signed out — send them to sign-up and return here afterwards.
        if (res.status === 401) {
          router.push(`/login?mode=signup&next=${encodeURIComponent(`/join/${code}`)}`);
          return;
        }

        const data = await res.json().catch(() => ({}));
        if (cancelled) return;

        if (!res.ok) {
          setState('error');
          setMessage(data.error || 'That invite code is no longer valid.');
          return;
        }

        setOwnerName(data.owner?.name || 'your friend');
        setState('done');

        // Straight into the app: onboarding if they have no profile yet.
        const me = await fetch('/api/profile').then((r) => (r.ok ? r.json() : null)).catch(() => null);
        const hasProfile = !!me?.profile?.name;
        setTimeout(() => router.push(hasProfile ? '/feed' : '/onboarding'), 1600);
      } catch {
        if (!cancelled) {
          setState('error');
          setMessage('Something went wrong. Please try again.');
        }
      }
    }

    redeem();
    return () => { cancelled = true; };
  }, [code, router]);

  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
      <Link href="/" className="mb-8 flex flex-col items-center gap-3">
        <BrandMark size={72} />
        <Wordmark className="text-3xl" />
      </Link>

      {state === 'working' && (
        <>
          <h1 className="text-2xl font-display font-bold text-foreground">Adding you as a wingman…</h1>
          <p className="mt-2 text-sm text-muted-foreground">Hang tight.</p>
        </>
      )}

      {state === 'done' && (
        <>
          <h1 className="text-2xl font-display font-bold text-foreground">You&rsquo;re in! 🍗</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            You&rsquo;re now {ownerName}&rsquo;s wingman. Taking you to the app…
          </p>
        </>
      )}

      {state === 'error' && (
        <>
          <h1 className="text-2xl font-display font-bold text-foreground">That link didn&rsquo;t work</h1>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">{message}</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link href="/feed"><Button size="lg">Go to Wingman</Button></Link>
            <Link href="/delegate"><Button size="lg" variant="outline">Enter a code manually</Button></Link>
          </div>
        </>
      )}
    </main>
  );
}
