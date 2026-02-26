'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { ArrowLeft, Heart, Sparkles, MessageCircle, ChevronDown, ChevronUp } from 'lucide-react';

const MY_MATCHES = [
  {
    id: 'match-kevin',
    name: 'Kevin',
    age: 21,
    year: 'Junior',
    major: 'Finance',
    personality: 'Extrovert 🎉',
    photos: ['/kevin1.jpg', '/kevin2.jpg'],
    tag: 'Funny 😂',
    matchedDate: 'Feb 20',
    compatibility: 85,
    aiReason:
      'Based on shared social energy and mutual appreciation for good food and low-key hangouts, you two align really well. Kevin\'s extroverted Finance-bro energy pairs well with a night-owl CS girl who keeps it real.',
    matchedBy: {
      name: 'Priya',
      photo: '/friend1.jpg',
    },
    friendNote:
      'I literally thought of you the second I saw him. Same vibe, same humor. I feel like you two would never run out of things to talk about.',
    prompts: [
      { q: "The way to my heart is...", a: "good food, bad movies, and decent company" },
      { q: "I'm secretly really good at...", a: "parallel parking on the first try" },
    ],
  },
  {
    id: 'match-fred',
    name: 'Fred',
    age: 22,
    year: 'Senior',
    major: 'Communications',
    personality: 'Ambivert ⚖️',
    photos: ['/fred1.jpg', '/fred2.jpg'],
    tag: 'Green flag 💚',
    matchedDate: 'Feb 21',
    compatibility: 72,
    aiReason:
      'Both of you value authenticity and spontaneity over routine. Fred\'s laid-back ambivert energy complements a night owl who has strong opinions — expect great late-night conversation.',
    matchedBy: {
      name: 'Priya',
      photo: '/friend1.jpg',
    },
    friendNote:
      'He\'s lowkey really sweet and super easy to talk to. I think you\'d like him a lot after like five minutes of conversation.',
    prompts: [
      { q: "We'll get along if...", a: "you're down for late-night Insomnia runs" },
      { q: "My go-to stress reliever...", a: "long drives with no destination" },
    ],
  },
];

function CompatibilityBar({ pct }) {
  return (
    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
      <div
        className="h-full rounded-full bg-gradient-to-r from-rose-400 to-pink-400 transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function MatchCard({ match }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-3xl border border-slate-100 overflow-hidden shadow-sm bg-white">
      {/* Main photo + name */}
      <div className="relative aspect-[3/4]">
        <img
          src={match.photos[0]}
          alt={match.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />

        {/* Matched badge */}
        <div className="absolute top-4 right-4">
          <div className="bg-white/90 backdrop-blur-sm rounded-full px-3 py-1.5 flex items-center gap-1.5 shadow-sm">
            <Heart className="w-3 h-3 text-rose-500 fill-rose-500" />
            <span className="text-xs font-semibold text-slate-700">{match.matchedDate}</span>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-5">
          <h3 className="text-white text-2xl font-bold">
            {match.name}, {match.age}
          </h3>
          <p className="text-white/80 text-sm mt-0.5">
            {match.year} · {match.major}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="secondary" className="text-xs bg-white/20 text-white border-transparent">
              {match.personality}
            </Badge>
            {match.tag && (
              <Badge variant="secondary" className="text-xs bg-white/20 text-white border-transparent">
                {match.tag}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* AI Compatibility */}
      <div className="px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-rose-400" />
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">AI Compatibility</span>
        </div>
        <div className="flex items-end gap-3 mb-3">
          <span className="text-4xl font-black text-rose-500 leading-none">{match.compatibility}%</span>
          <div className="flex-1 mb-1">
            <CompatibilityBar pct={match.compatibility} />
          </div>
        </div>
        <p className="text-sm text-slate-500 leading-relaxed">{match.aiReason}</p>
      </div>

      {/* Friend note */}
      <div className="px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-5 h-5 rounded-full overflow-hidden flex-shrink-0">
            <img src={match.matchedBy.photo} alt={match.matchedBy.name} className="w-full h-full object-cover" />
          </div>
          <span className="text-xs font-semibold text-slate-500">{match.matchedBy.name} says:</span>
        </div>
        <p className="text-sm text-slate-700 italic leading-relaxed">
          &ldquo;{match.friendNote}&rdquo;
        </p>
      </div>

      {/* Expandable prompts */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full px-5 py-3 flex items-center justify-between text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors"
      >
        <span>See {match.name}&apos;s prompts</span>
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {expanded && (
        <div className="px-5 pb-4 space-y-3 border-t border-slate-100 pt-3">
          {match.prompts.map((p, i) => (
            <div key={i} className="rounded-xl bg-slate-50 px-4 py-3">
              <p className="text-rose-400 text-xs font-semibold uppercase tracking-wide mb-1">{p.q}</p>
              <p className="text-slate-700 text-sm leading-snug">{p.a}</p>
            </div>
          ))}
        </div>
      )}

      {/* CTA */}
      <div className="px-5 py-4 border-t border-slate-100">
        <button
          type="button"
          className="w-full py-3 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
          Say hey to {match.name}
        </button>
      </div>
    </div>
  );
}

export default function MyMatchesPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-slate-100 px-6 py-5 sticky top-0 bg-white z-10">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Link href="/feed">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900">My Matches</h1>
            <p className="text-xs text-slate-400">matched for you by your friends</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-6 py-8 space-y-6 animate-fade-in">
        <p className="text-sm text-slate-400">
          {MY_MATCHES.length} match{MY_MATCHES.length !== 1 ? 'es' : ''} so far
        </p>

        {MY_MATCHES.map((match) => (
          <MatchCard key={match.id} match={match} />
        ))}
      </div>
    </div>
  );
}
