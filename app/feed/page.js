'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Users, Plus, Heart, ChevronRight, UserCircle, Sparkles } from 'lucide-react';

function getCurrentNetid() {
  try {
    const u = JSON.parse(localStorage.getItem('wingru_current_user') || '{}');
    return u.netid || 'default';
  } catch { return 'default'; }
}

export default function FeedPage() {
  const router = useRouter();
  const [friends, setFriends] = useState([]);
  const [myProfile, setMyProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const netid = getCurrentNetid();
      const delegations = JSON.parse(localStorage.getItem(`wingru_delegations_${netid}`) || '[]');
      setFriends(delegations);
      const profile = JSON.parse(localStorage.getItem(`wingru_profile_${netid}`) || 'null');
      setMyProfile(profile);
    } catch {}
    setLoading(false);
  }, []);

  function handleSignOut() {
    localStorage.removeItem('wingru_current_user');
    fetch('/api/auth/logout', { method: 'POST' }).finally(() => {
      router.push('/');
    });
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-slate-100 px-6 py-5">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <span className="text-xl font-bold text-rose-500">WingRu</span>
          <div className="flex items-center gap-1">
            <Link href="/settings">
              <Button variant="ghost" size="icon" title="Edit profile">
                <UserCircle className="w-5 h-5 text-slate-500" />
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-slate-500">
              Sign out
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-6 py-8 animate-fade-in">
        {/* Greeting */}
        {myProfile?.name && (
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900">Hey, {myProfile.name} 👋</h1>
            <p className="text-slate-500 mt-1">Who are you swiping for today?</p>
          </div>
        )}

        {/* My Matches */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-rose-400" />
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">My Matches</h2>
          </div>
          <Link href="/matches">
            <div className="flex items-center justify-between p-4 rounded-2xl border border-rose-100 bg-rose-50/30 hover:border-rose-300 hover:bg-rose-50/60 transition-all group cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="flex -space-x-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-sm">
                    <img src="/kevin1.jpg" alt="Kevin" className="w-full h-full object-cover" />
                  </div>
                  <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-sm">
                    <img src="/fred1.jpg" alt="Fred" className="w-full h-full object-cover" />
                  </div>
                </div>
                <div>
                  <p className="font-semibold text-slate-800">2 new matches</p>
                  <p className="text-xs text-slate-400">Kevin and Fred liked you back</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-rose-300 group-hover:text-rose-500 transition-colors" />
            </div>
          </Link>
        </section>

        {/* Who to swipe for */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-rose-400" />
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
              <Heart className="w-8 h-8 text-rose-200 mx-auto mb-3" />
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
                  key={friend.id}
                  onClick={() => router.push(`/feed/${friend.id}`)}
                  className="w-full flex items-center justify-between p-4 rounded-2xl border border-slate-100 hover:border-rose-200 hover:bg-rose-50/20 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-rose-400 to-pink-500 flex-shrink-0">
                      {friend.photo ? (
                        <img src={friend.photo} alt={friend.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white font-bold text-lg">
                          {friend.name?.[0]?.toUpperCase() || '?'}
                        </div>
                      )}
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-slate-800">{friend.name}</p>
                      <p className="text-xs text-slate-400">
                        {friend.year} · {friend.major}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-rose-400 transition-colors" />
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
    </div>
  );
}
