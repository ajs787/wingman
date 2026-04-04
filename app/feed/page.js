'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import ThemeToggle from '@/components/theme-toggle';
import Link from 'next/link';
import { Users, Plus, Heart, ChevronRight, UserCircle, Sparkles, Bird, MessageCircle, Settings } from 'lucide-react';

export default function FeedPage() {
  const router = useRouter();
  const [friends, setFriends] = useState([]);
  const [myProfile, setMyProfile] = useState(null);
  const [matchCount, setMatchCount] = useState(0);
  const [pendingMatchCount, setPendingMatchCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [profileRes, delegationsRes] = await Promise.all([
          fetch('/api/profile'),
          fetch('/api/delegations'),
        ]);
        if (profileRes.ok) {
          const { profile } = await profileRes.json();
          setMyProfile(profile);
          // Load my matches count
          if (profile?._id) {
            const matchRes = await fetch(`/api/matches?ownerId=${profile._id}`);
            if (matchRes.ok) {
              const { matches } = await matchRes.json();
              setMatchCount(matches?.length ?? 0);
              setPendingMatchCount(matches?.filter(m => m.myStatus === 'pending')?.length ?? 0);
            }
          }
        }
        if (delegationsRes.ok) {
          const { owners } = await delegationsRes.json();
          setFriends(owners ?? []);
        }
      } catch {}
      setLoading(false);
    }
    load();
  }, []);

  function handleSignOut() {
    try { localStorage.removeItem('penguin_user'); } catch {}
    fetch('/api/auth/logout', { method: 'POST' }).finally(() => {
      router.push('/');
    });
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="border-b border-slate-100 px-6 py-5">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bird className="w-6 h-6 text-black" />
            <span className="text-xl font-bold text-black">Penguin</span>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Link href="/settings">
              <Button variant="ghost" size="icon" title="Edit profile">
                <UserCircle className="w-5 h-5 text-slate-500" />
              </Button>
            </Link>
            <Link href="/account">
              <Button variant="ghost" size="icon" title="Account settings">
                <Settings className="w-5 h-5 text-slate-500" />
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-slate-500">
              Sign out
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-lg mx-auto px-6 py-8 animate-fade-in w-full">
        {/* Greeting */}
        {myProfile?.name && (
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900">Hey, {myProfile.first_name || myProfile.name}</h1>
            <p className="text-slate-500 mt-1">Who are you swiping for today?</p>
          </div>
        )}

        {/* My Matches */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-gray-600" />
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">My Matches</h2>
          </div>
          <Link href="/matches">
            <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100 transition-all group cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Heart className="w-8 h-8 text-gray-400" />
                  {pendingMatchCount > 0 && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-black rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">{pendingMatchCount}</span>
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-semibold text-slate-800">
                    {matchCount > 0 ? `${matchCount} match${matchCount !== 1 ? 'es' : ''}` : 'No matches yet'}
                  </p>
                  <p className="text-xs text-slate-400">
                    {pendingMatchCount > 0
                      ? `${pendingMatchCount} waiting for your response`
                      : matchCount > 0
                      ? 'See who liked you back'
                      : 'Your matches will appear here'}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-black transition-colors" />
            </div>
          </Link>
        </section>

        {/* Who to swipe for */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-gray-600" />
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Swipe for a friend</h2>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-20 rounded-2xl bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : friends.length === 0 ? (
            <div className="text-center py-12 rounded-2xl bg-slate-50 border border-dashed border-slate-200">
              <Heart className="w-8 h-8 text-gray-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No friends added yet</p>
              <p className="text-slate-400 text-sm mt-1 mb-4">Enter a friend&apos;s invite code to get started</p>
              <Link href="/delegate">
                <Button variant="outline" size="sm" className="gap-2">
                  <Plus className="w-4 h-4" /> Enter invite code
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {friends.map((friend) => (
                <button
                  key={friend._id}
                  onClick={() => router.push(`/feed/${friend._id}`)}
                  className="w-full flex items-center justify-between p-4 rounded-2xl border border-slate-100 hover:border-gray-200 hover:bg-gray-50/20 transition-all group"
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
                      <p className="font-semibold text-slate-800">{friend.name}</p>
                      <p className="text-xs text-slate-400">
                        {friend.school || friend.year} · {friend.majors?.join(', ') || friend.major}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-gray-600 transition-colors" />
                </button>
              ))}
            </div>
          )}
        </section>

        {/* CTA to enter code */}
        <Link href="/delegate">
          <Button variant="outline" className="w-full gap-2">
            <Plus className="w-4 h-4" />
            Enter a friend&apos;s code
          </Button>
        </Link>
      </div>

      {/* Bottom Navigation */}
      <div className="border-t border-slate-100 px-6 py-4 sticky bottom-0 bg-white">
        <div className="max-w-lg mx-auto flex items-center justify-around">
          <Link href="/feed" className="flex flex-col items-center gap-1 text-black">
            <Bird className="w-6 h-6" />
            <span className="text-xs font-medium">Feed</span>
          </Link>
          <Link href="/matches" className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-600 relative">
            <Heart className="w-6 h-6" />
            {pendingMatchCount > 0 && (
              <div className="absolute -top-1 right-0 w-4 h-4 bg-black rounded-full flex items-center justify-center">
                <span className="text-white text-[10px] font-bold">{pendingMatchCount}</span>
              </div>
            )}
            <span className="text-xs">Matches</span>
          </Link>
          <Link href="/chat" className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-600">
            <MessageCircle className="w-6 h-6" />
            <span className="text-xs">Chats</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
