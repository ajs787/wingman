'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Key } from 'lucide-react';
import { BASIC_MAX_ACTIVE_DELEGATIONS } from '@/lib/constants';

export default function DelegatePage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState('');

  async function handleRedeem(e) {
    e.preventDefault();
    setError('');
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;

    setLoading(true);
    try {
      const res = await fetch('/api/invite/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          data.error ||
          'Invalid invite code. Please check and try again.'
        );
      } else {
        setSuccess(data.owner);
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white px-6">
        <div className="w-full max-w-sm text-center animate-fade-in">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-gray-100 bg-gray-600 flex items-center justify-center">
              {success.photos?.[0]?.url ? (
                <img src={success.photos[0].url} alt={success.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-white font-bold text-xl">{success.name?.[0]?.toUpperCase() || '?'}</span>
              )}
            </div>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">You&apos;re in!</h1>
          <p className="text-slate-500 mb-1">You&apos;re now swiping for</p>
          <p className="text-xl font-bold text-black mb-6">{success.name}</p>
          <p className="text-sm text-slate-400 mb-8">
            Go to the feed and select their name to start finding them a match.
          </p>
          <Button size="lg" onClick={() => router.push('/feed')}>
            Go to feed
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="p-6">
        <button type="button" onClick={() => router.push('/feed')} className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to feed
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm animate-fade-in">
          <div className="flex justify-center mb-8">
            <div className="w-12 h-12 rounded-2xl bg-gray-600 flex items-center justify-center shadow-lg shadow-gray-200">
              <Key className="w-6 h-6 text-white" />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-slate-900 text-center mb-2">
            Enter invite code
          </h1>
          <p className="text-slate-500 text-center text-sm mb-8">
            Got a code from a friend? Enter it here to become their wingman.
          </p>
          <p className="text-slate-400 text-center text-xs mb-6">
            Basic version limit: up to {BASIC_MAX_ACTIVE_DELEGATIONS} friends at a time.
          </p>

          <form onSubmit={handleRedeem} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Invite code</Label>
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="XXXXXXXX"
                maxLength={12}
                className="h-12 text-center text-xl font-mono tracking-widest"
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-100">
                {error}
              </div>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={loading || code.trim().length < 6}>
              {loading ? 'Redeeming...' : 'Redeem code'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
