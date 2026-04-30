'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Heart } from 'lucide-react';

export default function MatchProfileViewPage() {
  const { matchId } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [match, setMatch] = useState(null);

  useEffect(() => {
    async function loadMatch() {
      try {
        const user = JSON.parse(localStorage.getItem('wingman_user') || '{}');
        if (!user.userId) {
          setError('Could not load your session.');
          return;
        }

        const res = await fetch(`/api/matches?ownerId=${user.userId}`);
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || 'Could not load match profile.');
          return;
        }

        const data = await res.json();
        const found = (data.matches || []).find((row) => row._id === matchId);
        if (!found) {
          setError('Match not found.');
          return;
        }
        setMatch(found);
      } catch {
        setError('Something went wrong.');
      } finally {
        setLoading(false);
      }
    }

    loadMatch();
  }, [matchId]);

  const person = useMemo(() => match?.profile || null, [match]);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="border-b border-slate-100 px-6 py-4 sticky top-0 bg-white z-10">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Link href="/matches">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-slate-900">{person?.name || 'Profile'}</h1>
            <p className="text-xs text-slate-400">Full match profile</p>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-lg mx-auto w-full px-6 py-6 space-y-4">
        {loading ? (
          <div className="space-y-3">
            <div className="h-80 rounded-3xl bg-slate-100 animate-pulse" />
            <div className="h-28 rounded-2xl bg-slate-100 animate-pulse" />
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-slate-500">{error}</p>
            <Link href="/matches">
              <Button variant="outline" className="mt-4">Back to matches</Button>
            </Link>
          </div>
        ) : (
          <>
            {(person?.photos || []).map((photo, idx) => (
              <div key={`${photo.url}-${idx}`} className="space-y-3">
                {photo.prompt && (
                  <div className="rounded-2xl border border-slate-200 bg-white px-6 py-6">
                    <p className="text-slate-600 text-sm font-semibold mb-2">{photo.prompt}</p>
                    <p className="text-slate-900 text-2xl font-serif leading-tight">{photo.prompt_answer}</p>
                  </div>
                )}
                {photo.url && (
                  <div className="relative aspect-[3/4] rounded-3xl overflow-hidden bg-slate-100">
                    <img src={photo.url} alt={`${person?.name || 'Match'} photo ${idx + 1}`} className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            ))}

            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-5 py-4 space-y-2">
              <h2 className="text-base font-semibold text-slate-800">About</h2>
              <p className="text-sm text-slate-700">{person?.name}{person?.age ? `, ${person.age}` : ''}</p>
              <p className="text-sm text-slate-500">{person?.school || person?.year} · {person?.majors?.join(', ') || person?.major}</p>
              {person?.personality_answer && (
                <p className="text-sm text-slate-600">Personality: {person.personality_answer}</p>
              )}
            </div>

            {person?.hidden_prompt && person?.hidden_prompt_answer && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Unlocked after matching</p>
                <p className="text-sm text-slate-600 font-medium mb-1">{person.hidden_prompt}</p>
                <p className="text-slate-900 text-lg font-serif leading-snug">{person.hidden_prompt_answer}</p>
              </div>
            )}

            {match?.friendNote && (
              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-5 py-4">
                <p className="text-xs text-slate-500 font-medium mb-1">Note from your friend:</p>
                <p className="text-sm text-slate-700 italic">"{match.friendNote}"</p>
              </div>
            )}

            <Link href="/matches" className="block pt-2">
              <Button variant="outline" className="w-full gap-2">
                <Heart className="w-4 h-4" /> Back to matches
              </Button>
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
