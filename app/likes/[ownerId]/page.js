'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import Link from 'next/link';
import { ArrowLeft, Heart, X, Check, MessageCircle, Send, Mail } from 'lucide-react';

// Thread between the two sides' wingmen about one potential match.
function WingmanThread({ row, onClose }) {
  const [messages, setMessages] = useState([]);
  const [mySide, setMySide] = useState(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/likes/${row._id}/thread`);
        if (res.ok && !cancelled) {
          const data = await res.json();
          setMessages(data.messages ?? []);
          setMySide(data.mySide ?? null);
        }
      } catch {}
      if (!cancelled) setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [row._id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  async function send() {
    const trimmed = content.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/likes/${row._id}/thread`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: trimmed }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, data.message]);
        setContent('');
      }
    } catch {}
    setSending(false);
  }

  const candidateName = row.candidate?.first_name || row.candidate?.name || 'them';

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-6" onClick={onClose}>
      <div
        className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-800">Wingman huddle</h3>
            <p className="text-xs text-slate-400">Both crews, talking about {candidateName}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 min-h-[200px]">
          {loading ? (
            <p className="text-sm text-slate-400 text-center py-8">Loading...</p>
          ) : messages.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">
              No messages yet. Ask the other side&apos;s wingmen anything before you decide.
            </p>
          ) : (
            messages.map((message) => (
              <div key={message._id} className={`flex ${message.mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${message.mine ? 'bg-[#e0447f] text-white' : 'bg-slate-100 text-slate-800'}`}>
                  {!message.mine && (
                    <p className="text-[11px] font-semibold opacity-60 mb-0.5">
                      {message.sender?.name || 'Wingman'} · {message.side === mySide ? 'your side' : 'their side'}
                    </p>
                  )}
                  <p className="text-sm leading-snug">{message.body}</p>
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        <div className="px-4 py-3 border-t border-slate-100 flex items-center gap-2">
          <input
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
            placeholder={`Talk about ${candidateName}...`}
            maxLength={500}
            className="flex-1 rounded-full border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#e0447f]"
          />
          <button
            onClick={send}
            disabled={sending || !content.trim()}
            className="w-10 h-10 rounded-full bg-[#e0447f] text-white flex items-center justify-center disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// One incoming like: the candidate proposed to the owner, every wingman who sent it
// (with their plain/prompt/photo notes), decisions so far, and accept/reject actions.
function IncomingLikeCard({ row, ownerName, onDecide, onThread }) {
  const candidate = row.candidate || {};
  const mainPhoto = candidate.photos?.[0]?.url;
  const senders = row.senders || [];
  const decisions = row.decisions || [];
  const accepted = row.status === 'accepted';

  return (
    <div className="rounded-3xl border border-slate-100 bg-white overflow-hidden shadow-sm">
      <div className="relative aspect-[4/3] w-full">
        {mainPhoto ? (
          <img src={mainPhoto} alt={candidate.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gray-500 flex items-center justify-center">
            <span className="text-white text-5xl font-bold">{candidate.name?.[0] ?? '?'}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/5 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="text-white text-xl font-bold">{candidate.name}{candidate.age ? `, ${candidate.age}` : ''}</h3>
          <p className="text-white/80 text-xs mt-0.5">
            {candidate.school || candidate.year} · {candidate.majors?.join(', ') || candidate.major}
          </p>
        </div>
        {accepted && (
          <div className="absolute top-3 right-3 rounded-full bg-green-100/90 px-3 py-1.5 flex items-center gap-1.5">
            <Check className="w-3 h-3 text-green-600" />
            <span className="text-xs font-semibold text-green-700">Matched</span>
          </div>
        )}
      </div>

      {/* Who sent it, and what they said */}
      <div className="px-5 py-4 space-y-3 border-b border-slate-100">
        <p className="text-xs text-slate-500 font-medium">
          Their wingmen think they&apos;d be great for {ownerName}:
        </p>
        {senders.map((sender, senderIdx) => (
          <div key={`${sender.wingman?._id || 'w'}-${senderIdx}`} className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-gray-500 flex items-center justify-center">
              {sender.wingman?.photo ? (
                <img src={sender.wingman.photo} alt={sender.wingman.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-white text-xs font-bold">{sender.wingman?.name?.[0] ?? 'W'}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-700">{sender.wingman?.name || 'A wingman'}</p>
              {sender.comment_type === 'prompt' && sender.comment_ref && (
                <p className="text-xs text-[#e0447f] font-medium">replying to &ldquo;{sender.comment_ref}&rdquo;</p>
              )}
              {sender.comment_type === 'photo' && (
                <p className="text-xs text-[#e0447f] font-medium">replying to photo {Number(sender.comment_ref) + 1 || ''}</p>
              )}
              <p className="text-sm text-slate-600 italic">{sender.comment ? `“${sender.comment}”` : 'Sent a like'}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Decisions so far */}
      {decisions.length > 0 && (
        <div className="px-5 py-3 border-b border-slate-100 flex flex-wrap gap-2">
          {decisions.map((decision, decisionIdx) => (
            <span
              key={`${decision.wingman?._id || 'd'}-${decisionIdx}`}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-white ${
                decision.decision === 'accept' ? 'bg-green-600' : 'bg-red-500'
              }`}
            >
              {decision.decision === 'accept' ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
              {decision.wingman?.name?.split(' ')[0] || 'Wingman'}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="px-5 py-4 flex gap-3">
        <button
          onClick={onThread}
          className="flex-1 py-2.5 rounded-2xl border border-slate-200 text-slate-600 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-slate-50"
        >
          <MessageCircle className="w-4 h-4" />
          Ask their crew
        </button>
        {!accepted && (
          <>
            <button
              onClick={() => onDecide(row, 'reject')}
              disabled={row.myDecision === 'reject'}
              className="flex-1 py-2.5 rounded-2xl border border-slate-200 text-slate-600 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-slate-50 disabled:opacity-50"
            >
              <X className="w-4 h-4" />
              {row.myDecision === 'reject' ? 'Passed' : 'Pass'}
            </button>
            <button
              onClick={() => onDecide(row, 'accept')}
              className="flex-1 py-2.5 rounded-2xl bg-[#e0447f] hover:bg-[#c2356b] text-white text-sm font-semibold flex items-center justify-center gap-2"
            >
              <Heart className="w-4 h-4" />
              Match them
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// Review page for likes sent TO an owner — visible to the owner and their wingmen.
// One reject doesn't kill a like; any accept turns it into a pending match the two
// actual users then confirm.
export default function IncomingLikesPage() {
  const { ownerId } = useParams();
  const router = useRouter();
  const { toast } = useToast();

  const [rows, setRows] = useState([]);
  const [ownerName, setOwnerName] = useState('your friend');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [threadRow, setThreadRow] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const [incomingRes, delegRes, profileRes] = await Promise.all([
          fetch(`/api/likes/incoming?ownerId=${ownerId}`),
          fetch('/api/delegations'),
          fetch('/api/profile'),
        ]);
        if (incomingRes.ok) {
          const data = await incomingRes.json();
          setRows(data.incoming ?? []);
        } else {
          const data = await incomingRes.json().catch(() => ({}));
          setError(data.error || 'Could not load incoming likes.');
        }
        // Resolve whose likes we're reviewing (a friend's, or my own).
        if (delegRes.ok) {
          const { owners } = await delegRes.json();
          const owner = (owners ?? []).find((o) => o._id === ownerId);
          if (owner?.name) setOwnerName(owner.first_name || owner.name);
        }
        if (profileRes.ok) {
          const { profile } = await profileRes.json();
          if (profile?._id === ownerId) setOwnerName(profile.first_name || profile.name || 'you');
        }
      } catch {
        setError('Something went wrong.');
      }
      setLoading(false);
    }
    load();
  }, [ownerId]);

  async function decide(row, action) {
    try {
      const res = await fetch('/api/likes/decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ potential_match_id: row._id, action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ title: 'Could not save decision', description: data.error || 'Try again.', variant: 'destructive' });
        return;
      }
      setRows((prev) => prev.map((item) => (
        item._id === row._id
          ? { ...item, status: data.status, myDecision: action, matchId: data.matchId || item.matchId }
          : item
      )));
      if (action === 'accept' && data.matchCreated) {
        toast({
          title: "You made a match! 💘",
          description: `${row.candidate?.name || 'They'} and ${ownerName} are matched — it's in both of their matches to confirm.`,
        });
      }
    } catch {
      toast({ title: 'Could not save decision', description: 'Try again.', variant: 'destructive' });
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-black/5 px-6 py-4 sticky top-0 bg-background z-10">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-display font-bold text-slate-900">Incoming likes</h1>
            <p className="text-xs text-slate-400">Likes sent to {ownerName} — you decide</p>
          </div>
          <Mail className="w-5 h-5 text-slate-400" />
        </div>
      </div>

      <div className="max-w-lg mx-auto px-6 py-8 space-y-6 animate-fade-in pb-16">
        {loading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-64 rounded-3xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <p className="text-slate-500">{error}</p>
            <Link href="/feed">
              <Button variant="outline" className="mt-4">Back to feed</Button>
            </Link>
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-16">
            <Mail className="w-10 h-10 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">No incoming likes yet</p>
            <p className="text-slate-400 text-sm mt-1">
              When someone&apos;s wingman likes {ownerName}, it lands here for review.
            </p>
          </div>
        ) : (
          rows.map((row) => (
            <IncomingLikeCard
              key={row._id}
              row={row}
              ownerName={ownerName}
              onDecide={decide}
              onThread={() => setThreadRow(row)}
            />
          ))
        )}
      </div>

      {threadRow && <WingmanThread row={threadRow} onClose={() => setThreadRow(null)} />}
    </div>
  );
}
