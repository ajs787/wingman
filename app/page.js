'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Heart, Users, Shield, Bird } from 'lucide-react';
import ThemeToggle from '@/components/theme-toggle';

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-slate-950">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Bird className="w-6 h-6 text-black dark:text-slate-100" />
          <span className="text-xl font-semibold tracking-tight text-black dark:text-slate-100">
            Penguin
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/login">
            <Button variant="outline" size="sm" className="dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800">Log in</Button>
          </Link>
          <Link href="/login?mode=signup">
            <Button size="sm" className="dark:bg-white dark:!text-slate-900 dark:hover:bg-slate-200">Sign up</Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24 animate-fade-in">
        <div className="inline-flex items-center gap-2 bg-gray-100 text-gray-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6 tracking-wide uppercase dark:bg-slate-800 dark:text-slate-200">
          <span className="w-1.5 h-1.5 bg-gray-600 rounded-full dark:bg-slate-300" />
          Friend-powered dating
        </div>
        <h1 className="text-5xl sm:text-7xl font-bold tracking-tight text-slate-900 dark:text-slate-100 max-w-3xl leading-[1.1] mb-6">
          Your friends
          <br />
          <span className="text-black dark:text-white">
            swipe for you.
          </span>
        </h1>
        <p className="text-xl text-slate-500 dark:text-slate-300 max-w-xl mb-10 leading-relaxed">
          Penguin is the dating app where you delegate your friends
          to find your match. Mutual approval required.
        </p>
        <div className="flex items-center gap-3">
          <Link href="/login?mode=signup">
            <Button size="xl" className="rounded-2xl px-10 shadow-lg shadow-gray-400 dark:shadow-none dark:bg-white dark:!text-slate-900 dark:hover:bg-slate-200">
              Sign up
            </Button>
          </Link>
          <Link href="/login">
            <Button size="xl" variant="outline" className="rounded-2xl px-10 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800">
              Log in
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 bg-slate-50/60 dark:bg-slate-900">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-center text-3xl font-semibold text-slate-800 dark:text-slate-100 mb-14">
            How it works
          </h2>
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              {
                icon: <Users className="w-8 h-8 text-gray-600 dark:text-slate-300" />,
                title: 'Friends Swipe',
                desc: 'Invite a friend via a one-time code. They browse the deck on your behalf.',
              },
              {
                icon: <Heart className="w-8 h-8 text-gray-600 dark:text-slate-300" />,
                title: 'Mutual Approval',
                desc: "A match only forms when both sides' friend teams right-swipe each other.",
              },
              {
                icon: <Shield className="w-8 h-8 text-gray-600 dark:text-slate-300" />,
                title: 'Real People Only',
                desc: 'Sign up with your email. One account per person, always.',
              },
            ].map((f) => (
              <div
                key={f.title}
                className="bg-white dark:bg-slate-800 rounded-2xl p-7 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="mb-4">{f.icon}</div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">{f.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-300 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-slate-100 dark:border-slate-800 text-center text-sm text-slate-400 dark:text-slate-500">
        <p>Penguin Est. 03.22.26</p>
      </footer>
    </div>
  );
}
