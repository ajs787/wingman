'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Check, Sparkles, Crown, Infinity as InfinityIcon, Eye, Users, Zap } from 'lucide-react';

const PRO_BENEFITS = [
  { icon: InfinityIcon, title: 'Unlimited likes', desc: 'Your wingmen never run out of daily likes.' },
  { icon: Eye, title: 'See who liked your friend', desc: 'Reveal everyone already interested before you swipe.' },
  { icon: Users, title: 'Swipe for up to 25 friends', desc: 'Be a wingman for your whole crew, not just 3.' },
  { icon: Sparkles, title: 'Full compatibility breakdown', desc: 'See exactly why each match is a fit.' },
  { icon: Zap, title: 'Weekly Spotlight boost', desc: "Put your friends at the top of others' decks." },
];

export default function WingmanProPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [sub, setSub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  async function load() {
    try {
      const res = await fetch('/api/subscription');
      if (res.ok) {
        const data = await res.json();
        setSub(data.subscription);
      }
    } catch {}
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function activate() {
    setWorking(true);
    try {
      const res = await fetch('/api/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'activate' }),
      });
      const data = await res.json();
      if (res.ok) {
        setSub(data.subscription);
        toast({ title: 'Welcome to Wingman Pro! 🎉', description: 'Unlimited likes and Pro perks are now active.' });
      } else {
        toast({ title: 'Could not activate', description: data.error || 'Try again.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Could not activate', description: 'Network error.', variant: 'destructive' });
    } finally {
      setWorking(false);
    }
  }

  async function cancel() {
    setWorking(true);
    try {
      const res = await fetch('/api/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      });
      const data = await res.json();
      if (res.ok) {
        setSub(data.subscription);
        toast({ title: 'Pro cancelled', description: "You're back on Wingman Basic." });
      } else {
        toast({ title: 'Could not cancel', description: data.error || 'Try again.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Could not cancel', description: 'Network error.', variant: 'destructive' });
    } finally {
      setWorking(false);
    }
  }

  const isPro = sub?.isPro;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-black/5 px-6 py-5 sticky top-0 bg-background z-10">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Link href="/account">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-display font-bold text-slate-900">Wingman Pro</h1>
            <p className="text-xs text-slate-400">Superpowers for your whole crew</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-6 py-8 space-y-8 animate-fade-in">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-amber-400 via-orange-400 to-orange-500 p-8 text-center shadow-[0_24px_70px_-30px_rgba(234,88,12,0.6)]">
          <div className="absolute -top-10 -right-8 h-40 w-40 rounded-full bg-white/20 blur-2xl" />
          <div className="relative">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/25 backdrop-blur-sm ring-1 ring-white/40">
              <Crown className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-3xl font-display font-extrabold text-white tracking-tight">Wingman Pro</h2>
            <p className="mt-2 text-white/90 text-sm max-w-xs mx-auto">
              Give every friend you swipe for the best shot at a match.
            </p>
            <p className="mt-4 text-white font-bold text-2xl">$9.99<span className="text-base font-medium text-white/80">/mo</span></p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-2xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {isPro && (
              <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-500/30 dark:bg-emerald-500/10">
                <Check className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
                  Pro is active{sub?.proSince ? ` since ${new Date(sub.proSince).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}.
                </p>
              </div>
            )}

            {/* Benefits */}
            <div className="space-y-3">
              {PRO_BENEFITS.map((b) => (
                <div
                  key={b.title}
                  className="flex items-start gap-4 rounded-2xl border border-black/5 bg-background p-4 shadow-[0_14px_40px_-30px_rgba(119,77,24,0.4)]"
                >
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-amber-100 text-orange-500 dark:bg-orange-400/15 dark:text-orange-300">
                    <b.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-display font-bold text-slate-800">{b.title}</p>
                    <p className="text-sm text-slate-500 mt-0.5">{b.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="space-y-3">
              {isPro ? (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={cancel}
                  disabled={working}
                >
                  {working ? 'Working…' : 'Cancel Pro'}
                </Button>
              ) : (
                <Button
                  size="xl"
                  className="w-full rounded-2xl bg-black text-[hsl(38_43%_92%)] hover:bg-slate-800 dark:!bg-[hsl(38_43%_92%)] dark:!text-slate-950"
                  onClick={activate}
                  disabled={working}
                >
                  {working ? 'Activating…' : 'Upgrade to Pro'}
                </Button>
              )}
              <p className="text-center text-xs text-slate-400">
                Demo build — no payment is processed. Billing connects to Stripe or Apple In-App Purchase before launch.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
