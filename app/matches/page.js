'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import Link from 'next/link';
import { ArrowLeft, Heart, MessageCircle, ChevronDown, ChevronUp, Check, X, Drumstick } from 'lucide-react';

function MatchCard({ match, onAccept, onReject }) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const person = match.profile;
  const mainPhoto = person?.photos?.[0]?.url;
  const matchDate = match.matchedAt
    ? new Date(match.matchedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : '';

  const isPending = match.myStatus === 'pending';
  const isAccepted = match.myStatus === 'accepted';
  const isRejected = match.myStatus === 'rejected';
  const canChat = match.canChat;

  async function handleAccept() {
    setLoading(true);
    await onAccept(match._id);
    setLoading(false);
  }

  async function handleReject() {
    setLoading(true);
    await onReject(match._id);
    setLoading(false);
  }

  function handleChat() {
    router.push(`/chat/${match._id}`);
  }

  function handleViewProfile() {
    router.push(`/matches/view/${match._id}`);
  }

  return (
    <div className={`rounded-3xl border overflow-hidden shadow-sm bg-white ${isRejected ? 'opacity-50' : 'border-slate-100'}`}>
      {/* Main photo + name */}
      <button type="button" onClick={handleViewProfile} className="relative aspect-[3/4] w-full text-left">
        {mainPhoto ? (
          <img src={mainPhoto} alt={person.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gray-500 flex items-center justify-center">
            <span className="text-white text-6xl font-bold">{person?.name?.[0] ?? '?'}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />

        {/* Status badge */}
        <div className="absolute top-4 right-4">
          <div className={`backdrop-blur-sm rounded-full px-3 py-1.5 flex items-center gap-1.5 shadow-sm ${
            canChat ? 'bg-green-100/90' : isAccepted ? 'bg-yellow-100/90' : isRejected ? 'bg-red-100/90' : 'bg-white/90'
          }`}>
            {canChat ? (
              <>
                <MessageCircle className="w-3 h-3 text-green-600" />
                <span className="text-xs font-semibold text-green-700">Ready to chat</span>
              </>
            ) : isAccepted ? (
              <>
                <Check className="w-3 h-3 text-yellow-600" />
                <span className="text-xs font-semibold text-yellow-700">Waiting for them</span>
              </>
            ) : isRejected ? (
              <>
                <X className="w-3 h-3 text-red-600" />
                <span className="text-xs font-semibold text-red-700">Rejected</span>
              </>
            ) : (
              <>
                <Heart className="w-3 h-3 text-black fill-rose-500" />
                <span className="text-xs font-semibold text-slate-700">{matchDate}</span>
              </>
            )}
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-5">
          <h3 className="text-white text-2xl font-bold">
            {person?.name}, {person?.age}
          </h3>
          <p className="text-white/80 text-sm mt-0.5">
            {person?.school || person?.year} · {person?.majors?.join(', ') || person?.major}
          </p>
          {person?.personality_answer && (
            <Badge variant="secondary" className="mt-2 text-xs bg-white/20 text-white border-transparent">
              {person.personality_answer}
            </Badge>
          )}
        </div>
      </button>

      {/* Friend note from wingman */}
      {match.friendNote && (
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
          <p className="text-xs text-slate-500 font-medium mb-1">Note from your friend:</p>
          <p className="text-sm text-slate-700 italic">"{match.friendNote}"</p>
        </div>
      )}

      {/* Matched by */}
      {match.matchedBy?.name && (
        <div className="px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full overflow-hidden flex-shrink-0 bg-gray-600 flex items-center justify-center">
              {match.matchedBy.photo ? (
                <img src={match.matchedBy.photo} alt={match.matchedBy.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-white text-xs font-bold">{match.matchedBy.name[0]}</span>
              )}
            </div>
            <span className="text-xs text-slate-500">
              Matched for you by <span className="font-semibold">{match.matchedBy.name}</span>
            </span>
          </div>
        </div>
      )}

      {/* Expandable prompts */}
      {person?.prompts?.length > 0 && (
        <>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="w-full px-5 py-3 flex items-center justify-between text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors"
          >
            <span>See {person.name}&apos;s prompts</span>
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {expanded && (
            <div className="px-5 pb-4 space-y-3 border-t border-slate-100 pt-3">
              {person.prompts.map((p, i) => (
                <div key={i} className="rounded-xl bg-slate-50 px-4 py-3">
                  <p className="text-gray-600 text-xs font-semibold uppercase tracking-wide mb-1">{p.prompt}</p>
                  <p className="text-slate-700 text-sm leading-snug">{p.prompt_answer}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Action buttons */}
      <div className="px-5 py-4 border-t border-slate-100">
        {isPending ? (
          <div className="flex gap-3">
            <button
              onClick={handleReject}
              disabled={loading}
              className="flex-1 py-3 rounded-2xl border border-slate-200 text-slate-600 text-sm font-semibold flex items-center justify-center gap-2 transition-colors hover:bg-slate-50 disabled:opacity-50"
            >
              <X className="w-4 h-4" />
              Pass
            </button>
            <button
              onClick={handleAccept}
              disabled={loading}
              className="flex-1 py-3 rounded-2xl bg-black hover:bg-gray-800 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              <Heart className="w-4 h-4" />
              Accept
            </button>
          </div>
        ) : canChat ? (
          <button
            onClick={handleChat}
            className="w-full py-3 rounded-2xl bg-black hover:bg-gray-800 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            Message {person?.first_name || person?.name?.split(' ')[0]}
          </button>
        ) : isAccepted ? (
          <p className="text-center text-sm text-slate-500">
            Waiting for {person?.first_name || person?.name?.split(' ')[0]} to accept...
          </p>
        ) : (
          <p className="text-center text-sm text-slate-400">
            You passed on this match
          </p>
        )}
      </div>
    </div>
  );
}

export default function MyMatchesPage() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadMatches();
  }, []);

  async function loadMatches() {
    try {
      const u = JSON.parse(localStorage.getItem('wingman_user') || '{}');
      if (!u.userId) { setLoading(false); return; }
      const res = await fetch(`/api/matches?ownerId=${u.userId}`);
      if (res.ok) {
        const { matches: data } = await res.json();
        setMatches(data ?? []);
      }
    } catch {}
    setLoading(false);
  }

  async function handleAccept(matchId) {
    try {
      const res = await fetch('/api/matches/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ match_id: matchId, action: 'accept' }),
      });
      if (res.ok) {
        const data = await res.json();
        setMatches((prev) =>
          prev.map((m) =>
            m._id === matchId
              ? { ...m, myStatus: 'accepted', canChat: data.canChat }
              : m
          )
        );
        if (data.canChat) {
          toast({ title: 'Match accepted!', description: 'You can now chat with your match.' });
        } else {
          toast({ title: 'Match accepted!', description: 'Waiting for them to accept too.' });
        }
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to accept match', variant: 'destructive' });
    }
  }

  async function handleReject(matchId) {
    try {
      const res = await fetch('/api/matches/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ match_id: matchId, action: 'reject' }),
      });
      if (res.ok) {
        setMatches((prev) =>
          prev.map((m) =>
            m._id === matchId ? { ...m, myStatus: 'rejected', canChat: false } : m
          )
        );
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to reject match', variant: 'destructive' });
    }
  }

  const pendingMatches = matches.filter((m) => m.myStatus === 'pending');
  const acceptedMatches = matches.filter((m) => m.myStatus === 'accepted' && !m.canChat);
  const chatReadyMatches = matches.filter((m) => m.canChat);
  const rejectedMatches = matches.filter((m) => m.myStatus === 'rejected');

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-black/5 px-6 py-5 sticky top-0 bg-background z-10">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Link href="/feed">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-display font-bold text-slate-900">My Matches</h1>
            <p className="text-xs text-slate-400">Matched for you by your friends</p>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-lg mx-auto px-6 py-8 space-y-8 animate-fade-in w-full pb-24">
        {loading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-64 rounded-3xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : matches.length === 0 ? (
          <div className="text-center py-16">
            <Heart className="w-10 h-10 text-orange-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">No matches yet</p>
            <p className="text-slate-400 text-sm mt-1">Your matches will appear here once a friend swipes for you.</p>
          </div>
        ) : (
          <>
            {/* Pending matches */}
            {pendingMatches.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
                  New Matches ({pendingMatches.length})
                </h2>
                <div className="space-y-6">
                  {pendingMatches.map((match) => (
                    <MatchCard key={match._id} match={match} onAccept={handleAccept} onReject={handleReject} />
                  ))}
                </div>
              </section>
            )}

            {/* Ready to chat */}
            {chatReadyMatches.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-green-600 uppercase tracking-wide mb-4">
                  Ready to Chat ({chatReadyMatches.length})
                </h2>
                <div className="space-y-6">
                  {chatReadyMatches.map((match) => (
                    <MatchCard key={match._id} match={match} onAccept={handleAccept} onReject={handleReject} />
                  ))}
                </div>
              </section>
            )}

            {/* Waiting for response */}
            {acceptedMatches.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4">
                  Waiting ({acceptedMatches.length})
                </h2>
                <div className="space-y-6">
                  {acceptedMatches.map((match) => (
                    <MatchCard key={match._id} match={match} onAccept={handleAccept} onReject={handleReject} />
                  ))}
                </div>
              </section>
            )}

            {/* Rejected */}
            {rejectedMatches.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-4">
                  Passed ({rejectedMatches.length})
                </h2>
                <div className="space-y-6">
                  {rejectedMatches.map((match) => (
                    <MatchCard key={match._id} match={match} onAccept={handleAccept} onReject={handleReject} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="border-t border-black/5 px-4 py-4 fixed bottom-0 left-0 right-0 bg-background">
        <div className="max-w-lg mx-auto flex items-center gap-2 rounded-[1.75rem] border border-black/5 bg-background px-3 py-3 warm-nav-shell">
          <Link href="/feed" className="warm-nav-link flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl py-2 text-slate-400 hover:text-slate-700">
            <Drumstick className="w-6 h-6" />
            <span className="text-xs">Feed</span>
          </Link>
          <Link href="/matches" className="warm-nav-link flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl py-2 text-black bg-amber-100/80">
            <Heart className="w-6 h-6" />
            <span className="text-xs font-medium">Matches</span>
          </Link>
          <Link href="/chat" className="warm-nav-link flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl py-2 text-slate-400 hover:text-slate-700">
            <MessageCircle className="w-6 h-6" />
            <span className="text-xs">Chats</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
