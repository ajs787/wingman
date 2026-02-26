'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Heart, ChevronRight } from 'lucide-react';

function MatchCard({ match }) {
  const { profile, tag, matched_at } = match;
  const mainPhoto = profile?.photos?.[0];

  return (
    <div className="flex items-center gap-4 p-4 rounded-2xl border border-slate-100 hover:border-rose-100 hover:bg-rose-50/10 transition-all">
      <div className="relative w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 bg-slate-100">
        {mainPhoto?.publicUrl ? (
          <Image src={mainPhoto.publicUrl} alt={profile.name} fill className="object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-rose-100 to-pink-100">
            <span className="text-2xl font-bold text-rose-300">{profile?.name?.[0]}</span>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-800">{profile?.name}</p>
        <p className="text-sm text-slate-400">
          {profile?.year} · {profile?.major}
        </p>
        {tag && (
          <Badge variant="soft" className="mt-1 text-xs">{tag}</Badge>
        )}
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-xs text-slate-400">
          {new Date(matched_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </p>
        <Heart className="w-4 h-4 text-rose-300 mx-auto mt-1" />
      </div>
    </div>
  );
}

export default function MatchesPage() {
  const { ownerId } = useParams();
  const router = useRouter();
  const { toast } = useToast();

  const [matches, setMatches] = useState([]);
  const [ownerProfile, setOwnerProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [matchRes, delRes] = await Promise.all([
          fetch(`/api/matches?ownerId=${ownerId}`),
          fetch('/api/delegations'),
        ]);

        if (!matchRes.ok) {
          const { error: e } = await matchRes.json();
          setError(e || 'Could not load matches.');
          return;
        }
        const { matches: m } = await matchRes.json();
        setMatches(m ?? []);

        if (delRes.ok) {
          const { owners } = await delRes.json();
          const owner = owners?.find((o) => o.owner_user_id === ownerId);
          if (owner?.profiles) setOwnerProfile(owner.profiles);
          // If it's your own matches
          if (!owner) {
            const profRes = await fetch('/api/profile');
            if (profRes.ok) {
              const { profile } = await profRes.json();
              if (profile?.id === ownerId) setOwnerProfile(profile);
            }
          }
        }
      } catch {
        setError('Something went wrong.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [ownerId]);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-slate-100 px-6 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Link href="/feed">
            <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Matches</h1>
            {ownerProfile?.name && (
              <p className="text-sm text-slate-500">for {ownerProfile.name}</p>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-6 py-8 animate-fade-in">
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-2xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        )}

        {error && (
          <div className="text-center py-16">
            <p className="text-slate-500">{error}</p>
            <Button variant="outline" className="mt-4" onClick={() => router.push('/feed')}>
              Back to feed
            </Button>
          </div>
        )}

        {!loading && !error && matches.length === 0 && (
          <div className="text-center py-16 rounded-2xl bg-slate-50 border border-dashed border-slate-200">
            <Heart className="w-10 h-10 text-rose-100 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No matches yet</p>
            <p className="text-slate-400 text-sm mt-1 mb-4">
              Keep swiping! Matches form when both sides right-swipe each other.
            </p>
            <Link href={`/feed/${ownerId}`}>
              <Button variant="soft" size="sm">Go to swipe deck</Button>
            </Link>
          </div>
        )}

        {!loading && !error && matches.length > 0 && (
          <div>
            <p className="text-sm text-slate-400 mb-4">
              {matches.length} match{matches.length !== 1 ? 'es' : ''}
            </p>
            <div className="space-y-3">
              {matches.map((m) => (
                <MatchCard key={m.match_id} match={m} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
