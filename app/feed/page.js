'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { Users, Plus, Heart, ChevronRight, UserCircle, Sparkles, Flame, MessageCircle, Settings, Mail, Trophy, Share2 } from 'lucide-react';
import { BrandMark, Wordmark } from '@/components/brand';

export default function FeedPage() {
  const router = useRouter();
  const [friends, setFriends] = useState([]);
  const [myProfile, setMyProfile] = useState(null);
  const [matchCount, setMatchCount] = useState(0);
  const [pendingMatchCount, setPendingMatchCount] = useState(0);
  const [incomingCount, setIncomingCount] = useState(0);
  const [myRank, setMyRank] = useState(null);
  const [crew, setCrew] = useState([]);
  const [loading, setLoading] = useState(true);
  // Inline invite-code redemption, so adding a friend never needs a detour.
  const [inviteCode, setInviteCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [codeError, setCodeError] = useState('');
  const [codeSuccess, setCodeSuccess] = useState('');
  // The user's OWN link, so a wingman-less feed has a real action on it.
  const [myInviteCode, setMyInviteCode] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [profileRes, delegationsRes, rankRes] = await Promise.all([
          fetch('/api/profile'),
          fetch('/api/delegations'),
          fetch('/api/wingman/rank'),
        ]);
        if (rankRes.ok) {
          const { rank } = await rankRes.json();
          setMyRank(rank ?? null);
        }
        if (profileRes.ok) {
          const { profile } = await profileRes.json();
          setMyProfile(profile);
          if (profile?._id) {
            const [matchRes, incomingRes, crewRes] = await Promise.all([
              fetch(`/api/matches?ownerId=${profile._id}`),
              fetch(`/api/likes/incoming?ownerId=${profile._id}`),
              fetch(`/api/wingman/rank?ownerId=${profile._id}`),
            ]);
            if (matchRes.ok) {
              const { matches } = await matchRes.json();
              setMatchCount(matches?.length ?? 0);
              setPendingMatchCount(matches?.filter(m => m.myStatus === 'pending')?.length ?? 0);
            }
            if (incomingRes.ok) {
              const { incoming } = await incomingRes.json();
              setIncomingCount(incoming?.filter((row) => row.status === 'pending')?.length ?? 0);
            }
            if (crewRes.ok) {
              const { leaderboard } = await crewRes.json();
              setCrew(leaderboard ?? []);
            }
          }
        }
        if (delegationsRes.ok) {
          const { owners } = await delegationsRes.json();
          setFriends(owners ?? []);
        }

        // Make sure there's always a link to share — mint one if needed.
        try {
          const cur = await fetch('/api/invite/current').then((r) => (r.ok ? r.json() : null));
          if (cur?.code?.code) {
            setMyInviteCode(cur.code.code);
          } else {
            const gen = await fetch('/api/invite/auto-generate', { method: 'POST' });
            if (gen.ok) {
              const { invite } = await gen.json();
              setMyInviteCode(invite?.code || '');
            }
          }
        } catch {}
      } catch {}
      setLoading(false);
    }
    load();
  }, []);

  async function shareMyLink() {
    if (!myInviteCode) return;
    const url = `${window.location.origin}/join/${myInviteCode}`;
    const text = `be my wingman on Wingman — swipe for me here: ${url}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Be my wingman', text, url });
        return;
      } catch {
        // dismissed — fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCodeSuccess('Invite link copied — send it to a friend.');
      setCodeError('');
    } catch {}
  }

  async function handleRedeemCode(e) {
    e.preventDefault();
    setCodeError('');
    setCodeSuccess('');
    const trimmed = inviteCode.trim().toUpperCase();
    if (!trimmed) return;

    setRedeeming(true);
    try {
      const res = await fetch('/api/invite/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCodeError(data.error || 'Invalid invite code. Please check and try again.');
        return;
      }
      setCodeSuccess(`You're now ${data.owner?.name ? `${data.owner.name}'s` : 'their'} wingman.`);
      setInviteCode('');
      // Refresh so the new friend appears in "Swipe for a friend" right away.
      const refreshed = await fetch('/api/delegations');
      if (refreshed.ok) {
        const { owners } = await refreshed.json();
        setFriends(owners ?? []);
      }
    } catch {
      setCodeError('Something went wrong. Please try again.');
    } finally {
      setRedeeming(false);
    }
  }

  function handleSignOut() {
    try { localStorage.removeItem('wingman_user'); } catch {}
    fetch('/api/auth/logout', { method: 'POST' }).finally(() => {
      router.push('/');
    });
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-black/5 px-6 py-5 bg-background sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BrandMark size={30} />
            <Wordmark className="text-2xl" />
          </div>
          <div className="flex items-center gap-1">
            <Link href="/settings">
              <Button variant="ghost" size="icon" title="Edit profile">
                <UserCircle className="w-5 h-5 text-muted-foreground" />
              </Button>
            </Link>
            <Link href="/account">
              <Button variant="ghost" size="icon" title="Account settings">
                <Settings className="w-5 h-5 text-muted-foreground" />
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-muted-foreground">
              Sign out
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-lg mx-auto px-6 py-8 animate-fade-in w-full">
        {/* Greeting */}
        {myProfile?.name && (
          <div className="mb-8">
            <h1 className="text-2xl font-display font-bold text-foreground">Hey, {myProfile.first_name || myProfile.name}</h1>
            <p className="text-muted-foreground mt-1">Who are you swiping for today?</p>
          </div>
        )}

        {/* My Matches */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-orange-500" />
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">My Matches</h2>
          </div>
          <Link href="/matches">
            <div className="flex items-center justify-between p-4 rounded-[1.5rem] bg-card card-pop card-lift hover:bg-white/5 group cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Heart className="w-8 h-8 text-orange-400" />
                </div>
                <div>
                    <p className="font-display font-bold text-foreground">
                    {matchCount > 0 ? `${matchCount} match${matchCount !== 1 ? 'es' : ''}` : 'No matches yet'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {pendingMatchCount > 0
                      ? `${pendingMatchCount} waiting for your response`
                      : matchCount > 0
                      ? 'See who liked you back'
                      : 'Your matches will appear here'}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-white transition-colors" />
            </div>
          </Link>

          {/* Incoming likes for my wingmen (and me) to review */}
          {myProfile?._id && (
            <Link href={`/likes/${myProfile._id}`}>
              <div className="mt-3 flex items-center justify-between p-4 rounded-[1.5rem] bg-card card-pop card-lift hover:bg-white/5 group cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Mail className="w-8 h-8 text-orange-400" />
                  </div>
                  <div>
                    <p className="font-display font-bold text-foreground">
                      {incomingCount > 0 ? `${incomingCount} incoming like${incomingCount !== 1 ? 's' : ''}` : 'Incoming likes'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {incomingCount > 0 ? 'New likes for your crew to look at' : 'Likes sent your way land here'}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-white transition-colors" />
              </div>
            </Link>
          )}
        </section>

        {/* Who to swipe for */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-orange-500" />
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Swipe for a friend</h2>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-20 rounded-2xl bg-white/10 animate-pulse" />
              ))}
            </div>
          ) : friends.length === 0 ? (
            <div className="rounded-[1.5rem] bg-card card-pop p-6 text-center">
              <Heart className="w-8 h-8 text-orange-300 mx-auto mb-3" />
              <p className="font-display font-bold text-foreground">Nobody&apos;s swiping for you yet</p>
              <p className="text-muted-foreground text-sm mt-1 mb-5">
                Wingman starts when a friend has your back. Send them your link &mdash; one tap and
                they&apos;re your wingman.
              </p>
              <Button onClick={shareMyLink} size="lg" className="w-full gap-2" disabled={!myInviteCode}>
                <Share2 className="w-4 h-4" />
                Share my invite link
              </Button>
              <p className="text-muted-foreground text-xs mt-4">
                Got a code from a friend instead? Enter it below to swipe for them.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {friends.map((friend) => (
                <button
                  key={friend._id}
                  onClick={() => router.push(`/feed/${friend._id}`)}
                  className="w-full flex items-center justify-between p-4 rounded-[1.5rem] bg-card card-pop card-lift hover:bg-white/5 group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-600 flex-shrink-0">
                      {friend.photos?.[0]?.url ? (
                        <img src={friend.photos[0].url} alt={friend.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white font-bold text-lg">
                          {friend.name?.[0]?.toUpperCase() || '?'}
                        </div>
                      )}
                    </div>
                    <div className="text-left">
                      <p className="font-display font-bold text-foreground">{friend.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {friend.school || friend.year} · {friend.majors?.join(', ') || friend.major}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/70 group-hover:text-white transition-colors" />
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Enter an invite code inline — redeeming here keeps the whole
            "become someone's wingman" flow on one screen. */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Plus className="w-4 h-4 text-orange-500" />
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Enter invite code</h2>
          </div>
          <div className="rounded-[1.5rem] bg-card card-pop p-5">
            <p className="text-sm text-muted-foreground mb-4">
              Got a code from a friend? Enter it to become their wingman.
            </p>
            <form onSubmit={handleRedeemCode} className="flex gap-2">
              <Input
                value={inviteCode}
                onChange={(e) => {
                  // Codes are 8 chars from an unambiguous A-Z/2-9 alphabet.
                  setInviteCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8));
                  setCodeError('');
                  setCodeSuccess('');
                }}
                placeholder="ABCD2345"
                maxLength={8}
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                aria-label="Invite code"
                className="h-12 flex-1 font-mono tracking-[0.2em] uppercase placeholder:tracking-normal"
              />
              <Button type="submit" className="h-12 px-5" disabled={redeeming || inviteCode.trim().length !== 8}>
                {redeeming ? 'Adding…' : 'Redeem'}
              </Button>
            </form>
            {codeError && <p className="mt-3 text-sm text-red-200">{codeError}</p>}
            {codeSuccess && <p className="mt-3 text-sm text-foreground font-medium">{codeSuccess}</p>}
          </div>
        </section>

        {/* My wingman rank: gamification/social-proof content, kept below the
            primary "who to swipe for" action so returning users reach the core
            task immediately instead of scrolling past a leaderboard first. */}
        {myRank && (
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-4 h-4 text-orange-500" />
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">My Wingman Rank</h2>
            </div>
            <div className="rounded-[1.5rem] bg-card card-pop p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xl font-display font-extrabold text-foreground">{myRank.tier}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {Math.round((myRank.acceptRate ?? 0.5) * 100)}% of your likes get accepted
                  </p>
                </div>
                <div className="w-16 h-16 rounded-full bg-[#e0447f] flex flex-col items-center justify-center">
                  <span className="text-white text-xl font-bold leading-none">{myRank.score}</span>
                  <span className="text-white/70 text-[10px] font-mono">pts</span>
                </div>
              </div>
              <div className="grid grid-cols-4 divide-x divide-black/5 border-t border-black/5 pt-3 text-center">
                {[
                  { label: 'Sent', value: myRank.sent ?? 0 },
                  { label: 'Accepted', value: myRank.accepted ?? 0 },
                  { label: 'Matches', value: myRank.confirmedMatches ?? 0 },
                  { label: 'Assists', value: myRank.assists ?? 0 },
                ].map((stat) => (
                  <div key={stat.label}>
                    <p className="font-bold text-foreground">{stat.value}</p>
                    <p className="text-[11px] text-muted-foreground">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Crew leaderboard: my wingmen, ranked by score */}
            {crew.length > 0 && (
              <div className="mt-3 rounded-[1.5rem] bg-card card-pop p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">My crew</p>
                <div className="space-y-2">
                  {crew.map((entry, position) => (
                    <div key={entry.wingman?._id || position} className="flex items-center gap-3">
                      <span className="w-5 text-center text-sm font-bold text-muted-foreground">{position + 1}</span>
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-500 flex items-center justify-center flex-shrink-0">
                        {entry.wingman?.photo ? (
                          <img src={entry.wingman.photo} alt={entry.wingman.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-white text-xs font-bold">{entry.wingman?.name?.[0] ?? 'W'}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{entry.wingman?.name}</p>
                        <p className="text-[11px] text-muted-foreground">{entry.tier} · {entry.confirmedMatches ?? 0} matches made</p>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#e0447f] px-2.5 py-1 text-xs font-bold text-white">
                        <Flame className="w-3 h-3" />
                        {entry.score ?? 0}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

      </div>

      {/* Bottom Navigation */}
      <div className="border-t border-black/5 px-4 py-4 sticky bottom-0 bg-background">
        <div className="max-w-lg mx-auto flex items-center gap-2 rounded-[1.75rem] border border-black/5 bg-card px-3 py-3 warm-nav-shell">
          <Link href="/feed" className="warm-nav-link flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl py-2 text-white bg-black/20">
            <Flame className="w-6 h-6" />
            <span className="text-xs font-medium">Feed</span>
          </Link>
          <Link href="/matches" className="warm-nav-link flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl py-2 text-white/60 hover:text-white relative">
            <Heart className="w-6 h-6" />
            <span className="text-xs">Matches</span>
          </Link>
          <Link href="/chat" className="warm-nav-link flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl py-2 text-white/60 hover:text-white">
            <MessageCircle className="w-6 h-6" />
            <span className="text-xs">Chats</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
