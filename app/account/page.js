'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import Link from 'next/link';
import { ArrowLeft, Eye, EyeOff, Trash2, AlertTriangle, Crown, ChevronRight } from 'lucide-react';

export default function AccountSettingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [subscription, setSubscription] = useState(null);

  // Settings state
  const [hidden, setHidden] = useState(false);
  const [showAge, setShowAge] = useState(true);
  const [showSchool, setShowSchool] = useState(true);

  useEffect(() => {
    async function loadSettings() {
      try {
        const [res, subRes] = await Promise.all([
          fetch('/api/account'),
          fetch('/api/subscription'),
        ]);
        if (res.ok) {
          const { settings } = await res.json();
          setHidden(settings.hidden ?? false);
          setShowAge(settings.show_age ?? true);
          setShowSchool(settings.show_school ?? true);
        }
        if (subRes.ok) {
          const { subscription: subData } = await subRes.json();
          setSubscription(subData);
        }
      } catch {}
      setLoading(false);
    }
    loadSettings();
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch('/api/account', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hidden,
          show_age: showAge,
          show_school: showSchool,
        }),
      });
      if (res.ok) {
        toast({ title: 'Settings saved', description: 'Your account settings have been updated.' });
      } else {
        const { error } = await res.json();
        toast({ title: 'Error', description: error || 'Failed to save settings.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Something went wrong.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch('/api/account', { method: 'DELETE' });
      if (res.ok) {
        try { localStorage.removeItem('wingman_user'); } catch {}
        router.push('/');
      } else {
        const { error } = await res.json();
        toast({ title: 'Error', description: error || 'Failed to delete account.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Something went wrong.', variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-slate-400">Loading...</p>
      </div>
    );
  }

  const isPro = subscription?.isPro;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-black/5 px-6 py-5 sticky top-0 bg-background z-10">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Link href="/feed">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-display font-bold text-slate-900">Account Settings</h1>
            <p className="text-xs text-slate-400">Privacy and account management</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-6 py-8 space-y-8">

        {/* Wingman Pro */}
        <section>
          <Link href="/wingman-pro">
            <div className={`group flex items-center gap-4 rounded-[1.5rem] p-5 transition-all cursor-pointer ${
              isPro
                ? 'bg-gradient-to-br from-amber-400 via-orange-400 to-orange-500 text-white shadow-[0_20px_55px_-28px_rgba(234,88,12,0.6)]'
                : 'border border-black/5 bg-background hover:border-orange-200 hover:bg-amber-50/60 shadow-[0_16px_45px_-30px_rgba(119,77,24,0.3)]'
            }`}>
              <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl ${
                isPro ? 'bg-white/25 ring-1 ring-white/40' : 'bg-amber-100 dark:bg-orange-400/15'
              }`}>
                <Crown className={`h-6 w-6 ${isPro ? 'text-white' : 'text-orange-500'}`} />
              </div>
              <div className="flex-1">
                <p className={`font-display font-bold ${isPro ? 'text-white' : 'text-slate-800'}`}>
                  {isPro ? 'Wingman Pro' : 'Upgrade to Wingman Pro'}
                </p>
                <p className={`text-xs mt-0.5 ${isPro ? 'text-white/85' : 'text-slate-400'}`}>
                  {isPro ? 'Active · Manage your plan' : 'Unlimited likes, more friends & more'}
                </p>
              </div>
              <ChevronRight className={`h-5 w-5 ${isPro ? 'text-white/80' : 'text-slate-300 group-hover:text-slate-600'}`} />
            </div>
          </Link>
        </section>

        {/* Privacy Settings */}
        <section>
          <h2 className="text-base font-semibold text-slate-800 mb-4">Privacy</h2>
          <div className="space-y-4">
            {/* Hide Profile */}
            <div className="flex items-center justify-between p-4 rounded-2xl border border-black/5 bg-muted/40">
              <div className="flex items-center gap-3">
                {hidden ? <EyeOff className="w-5 h-5 text-slate-500" /> : <Eye className="w-5 h-5 text-slate-500" />}
                <div>
                  <Label className="text-sm font-medium text-slate-800">Hide my profile</Label>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Your profile won&apos;t appear in others&apos; feeds
                  </p>
                </div>
              </div>
              <Switch checked={hidden} onCheckedChange={setHidden} />
            </div>

            {/* Show Age */}
            <div className="flex items-center justify-between p-4 rounded-2xl border border-black/5 bg-muted/40">
              <div>
                <Label className="text-sm font-medium text-slate-800">Show my age</Label>
                <p className="text-xs text-slate-400 mt-0.5">Display your age on your profile</p>
              </div>
              <Switch checked={showAge} onCheckedChange={setShowAge} />
            </div>

            {/* Show School */}
            <div className="flex items-center justify-between p-4 rounded-2xl border border-black/5 bg-muted/40">
              <div>
                <Label className="text-sm font-medium text-slate-800">Show my school</Label>
                <p className="text-xs text-slate-400 mt-0.5">Display your school on your profile</p>
              </div>
              <Switch checked={showSchool} onCheckedChange={setShowSchool} />
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full mt-6">
            {saving ? 'Saving...' : 'Save settings'}
          </Button>
        </section>

        <hr className="border-slate-100" />

        {/* Danger Zone */}
        <section>
          <h2 className="text-base font-semibold text-red-600 mb-4">Danger Zone</h2>

          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full flex items-center gap-3 p-4 rounded-2xl border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
            >
              <Trash2 className="w-5 h-5" />
              <div className="text-left">
                <p className="font-medium">Delete my account</p>
                <p className="text-xs text-red-500 mt-0.5">
                  Permanently remove your account and all data
                </p>
              </div>
            </button>
          ) : (
            <div className="p-6 rounded-2xl border border-red-300 bg-red-50 space-y-4">
              <div className="flex items-center gap-3 text-red-600">
                <AlertTriangle className="w-6 h-6" />
                <h3 className="font-semibold">Are you sure?</h3>
              </div>
              <p className="text-sm text-red-600">
                This action cannot be undone. All your data, matches, and messages will be permanently deleted.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                >
                  {deleting ? 'Deleting...' : 'Delete forever'}
                </Button>
              </div>
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
