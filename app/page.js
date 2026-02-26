'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Heart, Users, Shield } from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-slate-100">
        <span className="text-xl font-semibold tracking-tight text-rose-500">
          WingRu
        </span>
        <Link href="/login">
          <Button variant="outline" size="sm">
            Sign in
          </Button>
        </Link>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24 animate-fade-in">
        <div className="inline-flex items-center gap-2 bg-rose-50 text-rose-500 text-xs font-semibold px-3 py-1.5 rounded-full mb-6 tracking-wide uppercase">
          <span className="w-1.5 h-1.5 bg-rose-400 rounded-full" />
          Rutgers Only
        </div>
        <h1 className="text-5xl sm:text-7xl font-bold tracking-tight text-slate-900 max-w-3xl leading-[1.1] mb-6">
          Your friends
          <br />
          <span className="bg-gradient-to-r from-rose-500 via-pink-500 to-purple-500 bg-clip-text text-transparent">
            swipe for you.
          </span>
        </h1>
        <p className="text-xl text-slate-500 max-w-xl mb-10 leading-relaxed">
          WingRu is the Rutgers-only dating app where you delegate your friends
          to find your match. Mutual approval required.
        </p>
        <Link href="/login">
          <Button size="xl" className="rounded-2xl px-12 shadow-lg shadow-rose-200">
            Get started with Rutgers email
          </Button>
        </Link>
        <p className="mt-4 text-sm text-slate-400">
          @rutgers.edu or @scarletmail.rutgers.edu only
        </p>
      </section>

      {/* Features */}
      <section className="py-20 px-6 bg-slate-50/60">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-center text-3xl font-semibold text-slate-800 mb-14">
            How it works
          </h2>
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              {
                icon: <Users className="w-8 h-8 text-rose-400" />,
                title: 'Friends Swipe',
                desc: 'Invite a friend via a one-time code. They browse the deck on your behalf.',
              },
              {
                icon: <Heart className="w-8 h-8 text-pink-400" />,
                title: 'Mutual Approval',
                desc: "A match only forms when both sides' friend teams right-swipe each other.",
              },
              {
                icon: <Shield className="w-8 h-8 text-purple-400" />,
                title: 'Rutgers Only',
                desc: 'Verified Rutgers email required. One account per NetID, always.',
              },
            ].map((f) => (
              <div
                key={f.title}
                className="bg-white rounded-2xl p-7 border border-slate-100 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="mb-4">{f.icon}</div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">{f.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-slate-100 text-center text-sm text-slate-400">
        <p>
          WingRu Est. 2026 {' '}
          <span className="text-rose-400">♥</span>
        </p>
      </footer>
    </div>
  );
}
