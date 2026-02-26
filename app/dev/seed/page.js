'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function DevSeedPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  async function runSeed() {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/dev/seed', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Seed failed.');
        return;
      }
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (process.env.NODE_ENV === 'production') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500">Not available in production.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <div className="text-4xl mb-3">🌱</div>
          <h1 className="text-2xl font-bold text-slate-900">Dev Seed</h1>
          <p className="text-slate-500 mt-2 text-sm">
            Creates 10 demo profiles and sets up 2 delegations for your current user.
            Only available in development.
          </p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <p className="text-amber-700 text-sm font-medium">⚠️ Development only</p>
          <p className="text-amber-600 text-xs mt-1">
            This will create dummy auth users and profiles in your Supabase project.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-100">
            {error}
          </div>
        )}

        {result && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 space-y-2">
            <p className="text-green-700 font-semibold text-sm">✅ Seed complete!</p>
            <p className="text-green-600 text-sm">Profiles created: {result.created}</p>
            <p className="text-green-600 text-sm">Delegations: {result.delegations_created}</p>
            {result.delegated_for?.length > 0 && (
              <p className="text-green-600 text-sm">
                You can now swipe for: {result.delegated_for.join(', ')}
              </p>
            )}
            {result.errors?.length > 0 && (
              <details className="mt-2">
                <summary className="text-amber-600 text-xs cursor-pointer">
                  {result.errors.length} warnings
                </summary>
                <ul className="mt-1 space-y-1">
                  {result.errors.map((e, i) => (
                    <li key={i} className="text-xs text-amber-600">{e}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}

        <div className="flex gap-3">
          <Button onClick={runSeed} disabled={loading} className="flex-1">
            {loading ? 'Seeding...' : 'Run seed'}
          </Button>
          <Button variant="outline" onClick={() => router.push('/feed')}>
            Go to feed
          </Button>
        </div>
      </div>
    </div>
  );
}
