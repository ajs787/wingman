'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { HandHeart, HeartHandshake, UserRoundCheck } from 'lucide-react';
import ThemeToggle from '@/components/theme-toggle';
import { BrandLockup, BrandMark, Wordmark } from '@/components/brand';

const FEATURES = [
  {
    icon: HandHeart,
    title: 'Friends swipe',
    desc: 'Invite a friend with a one-time code. They browse the deck on your behalf.',
  },
  {
    icon: HeartHandshake,
    title: 'Mutual approval',
    desc: "A match only forms when both sides' friend teams right-swipe each other.",
  },
  {
    icon: UserRoundCheck,
    title: 'Real people only',
    desc: 'Sign up with your school email. One account per person, always.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/80 px-6 py-4 backdrop-blur sm:px-8">
        <BrandLockup markSize={38} wordClassName="text-2xl" />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/login">
            <Button variant="outline" size="md" className="rounded-full">Log in</Button>
          </Link>
          <Link href="/login?mode=signup">
            <Button size="md" className="btn-gradient rounded-full border-0 shadow-lg shadow-primary/25">Sign up</Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="animate-fade-in relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 py-28 text-center sm:py-36">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-12 h-80 w-80 -translate-x-1/2 rounded-full bg-white/15 blur-3xl" />
          <div className="absolute left-1/2 top-44 h-72 w-72 -translate-x-1/2 rounded-full bg-[#f1bf58]/15 blur-3xl" />
        </div>

        <div className="relative mb-8">
          <BrandMark size={96} />
        </div>

        <p className="eyebrow relative mb-5">you&rsquo;re the matchmaker</p>

        <h1 className="relative mb-6 max-w-3xl font-display text-5xl font-black leading-[1.02] tracking-tight text-foreground sm:text-7xl">
          Your friends <span className="text-[#ffc2da]">swipe for you.</span>
        </h1>

        <p className="relative mb-10 max-w-xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
          The first dating app where your crew finds your match &mdash; and a spark only happens when both sides swipe right.
        </p>

        <div className="relative flex flex-col items-center gap-3 sm:flex-row">
          <Link href="/login?mode=signup">
            <Button size="xl" className="btn-gradient rounded-2xl border-0 px-10 shadow-lg shadow-primary/30">Get started</Button>
          </Link>
          <Link href="/login">
            <Button size="xl" variant="outline" className="rounded-2xl px-10">I have an account</Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border bg-card px-6 py-28 sm:py-32">
        <div className="mx-auto max-w-4xl">
          <p className="eyebrow mb-3 text-center">how it works</p>
          <h2 className="mb-14 text-center font-display text-3xl font-extrabold text-foreground sm:text-4xl">
            Three swipes to a spark
          </h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="rounded-[1.85rem] border border-border bg-background p-7 shadow-[0_18px_60px_-28px_rgba(119,77,24,0.20)] transition-all hover:-translate-y-1 hover:shadow-[0_24px_78px_-34px_rgba(119,77,24,0.28)]"
                >
                  <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
                    <Icon className="h-8 w-8 text-white" strokeWidth={1.75} />
                  </div>
                  <div className="text-center">
                    <h3 className="mb-2 font-display text-lg font-bold text-foreground">{f.title}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-background py-10 text-center">
        <div className="mb-2 flex items-center justify-center gap-2">
          <BrandMark size={22} />
          <Wordmark className="text-lg" />
        </div>
        <p className="font-mono text-sm text-muted-foreground">Est. 03.22.26</p>
      </footer>
    </div>
  );
}
