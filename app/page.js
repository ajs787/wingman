'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Heart, Users, Shield, Bird, Drumstick } from 'lucide-react';
import ThemeToggle from '@/components/theme-toggle';

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-transparent">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 sm:px-8 py-5 border-b border-black/5 bg-background sticky top-0 z-20">
        <div className="flex items-center gap-1">
          <Drumstick className="w-6 h-6 text-black" />
          <span className="text-2xl font-display font-bold tracking-wide text-black dark:text-[hsl(38_43%_92%)] -mt-1">
            wingman
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/login">
            <Button
              variant="outline"
              size="md"
              className="border-black/90 bg-background text-slate-950 hover:bg-amber-50 dark:!border-orange-400 dark:!bg-orange-400 dark:!text-[hsl(38_43%_92%)] dark:hover:bg-orange-500"
            >
              Log in
            </Button>
          </Link>
          <Link href="/login?mode=signup">
            <Button
              size="md"
              className="border border-black/10 bg-slate-950 text-[hsl(38_43%_92%)] shadow-lg shadow-amber-200/40 hover:bg-slate-800 dark:!border-[hsl(38_43%_92%)] dark:!bg-[hsl(38_43%_92%)] dark:!text-slate-950 dark:hover:bg-amber-50"
            >
              Sign up
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-40 animate-fade-in relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute left-1/2 top-20 h-72 w-72 -translate-x-1/2 rounded-full bg-amber-200/30 dark:bg-amber-200/18 blur-3xl" />
        </div>
        <h1 className="relative text-5xl sm:text-7xl font-display font-extrabold tracking-tight text-slate-950 dark:text-[hsl(38_43%_92%)] max-w-3xl leading-[1.02] mb-6">
          <span className="relative inline-block text-slate-950 dark:text-orange-400">
            Your friends
            <Bird className="absolute -top-5 -right-3 w-10 h-10 sm:w-12 sm:h-12 text-slate-950 dark:text-orange-400 transform -rotate-12 scale-x-[-1]" />
          </span>
          <br />
          <span className="text-orange-500 dark:text-[hsl(38_43%_92%)]">
            swipe for you.
          </span>
        </h1>
        <p className="relative text-xl text-slate-600 dark:text-[hsl(38_43%_92%)]/80 max-w-xl mb-10 leading-relaxed">
          The first dating app where your friends find your match for you. Mutual approval required.
        </p>
        <div className="relative flex items-center gap-3">
          <Link href="/login?mode=signup">
            <Button size="xl" className="rounded-2xl px-10 shadow-lg shadow-amber-200/50 bg-black text-[hsl(38_43%_92%)] hover:bg-slate-800 dark:!bg-[hsl(38_43%_92%)] dark:!text-slate-950 dark:!border-[hsl(38_43%_92%)] dark:hover:bg-amber-50">
              Sign up
            </Button>
          </Link>
          <Link href="/login">
            <Button size="xl" variant="outline" className="rounded-2xl px-10 border-black/90 bg-background text-slate-950 hover:bg-amber-50 dark:!border-orange-400 dark:!bg-orange-400 dark:!text-[hsl(38_43%_92%)] dark:hover:bg-orange-500">
              Log in
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="py-40 px-6 bg-background border-t border-black/5">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-center text-3xl font-display font-bold text-slate-900 dark:text-[hsl(38_43%_92%)] mb-14">
            How it works
          </h2>
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              {
                icon: <Users className="w-8 h-8 text-orange-500" />,
                title: 'Friends Swipe',
                desc: 'Invite a friend via a one-time code. They browse the deck on your behalf.',
              },
              {
                icon: <Heart className="w-8 h-8 text-orange-500" />,
                title: 'Mutual Approval',
                desc: "A match only forms when both sides' friend teams right-swipe each other.",
              },
              {
                icon: <Shield className="w-8 h-8 text-orange-500" />,
                title: 'Real People Only',
                desc: 'Sign up with your email. One account per person, always.',
              },
            ].map((f) => (
              <div
                key={f.title}
                className="bg-background rounded-[1.85rem] p-7 border border-black/5 shadow-[0_18px_60px_-28px_rgba(119,77,24,0.20)] hover:-translate-y-1 hover:shadow-[0_24px_78px_-34px_rgba(119,77,24,0.26)] transition-all dark:bg-slate-950 dark:border-slate-800 dark:shadow-[0_18px_64px_-32px_rgba(0,0,0,0.55)]"
              >
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl text-orange-400 shadow-sm ring-2 ring-orange-400 dark:bg-orange-400/15 dark:text-orange-300 dark:ring-orange-300/20">
                  {f.icon}
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-display font-bold text-slate-900 dark:text-[hsl(38_43%_92%)] mb-2">{f.title}</h3>
                  <p className="text-sm text-slate-600 dark:text-[hsl(38_43%_92%)]/75 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-black/5 text-center text-sm text-slate-500 bg-background dark:bg-slate-950 dark:text-slate-400">
        <p>Wingman Est. 03.22.26</p>
      </footer>
    </div>
  );
}
