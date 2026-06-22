'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft, Ban, MoreVertical, Send } from 'lucide-react';

const REPORT_REASONS = [
  'harassment',
  'spam',
  'fake_profile',
  'inappropriate_content',
  'underage',
  'hate_speech',
  'scam',
  'other',
];

export default function ChatPage() {
  const { matchId } = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const actionsMenuRef = useRef(null);

  const [messages, setMessages] = useState([]);
  const [otherUser, setOtherUser] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('harassment');
  const [reportDetails, setReportDetails] = useState('');
  const [reportAutoBlock, setReportAutoBlock] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);

  useEffect(() => {
    loadMessages();
    // Poll for new messages every 5 seconds
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [matchId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!actionsMenuOpen) return;

    function handleOutsideClick(e) {
      if (!actionsMenuRef.current?.contains(e.target)) {
        setActionsMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [actionsMenuOpen]);

  async function loadMessages() {
    try {
      const res = await fetch(`/api/chat?matchId=${matchId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages ?? []);
        setOtherUser(data.otherUser);
      } else if (res.status === 403) {
        // Match not accepted yet
        router.push('/matches');
      }
    } catch {}
    setLoading(false);
  }

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  async function handleSend(e) {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    const content = newMessage.trim();
    setNewMessage('');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId, content }),
      });

      if (res.ok) {
        const { message } = await res.json();
        setMessages((prev) => [...prev, message]);
      } else {
        setNewMessage(content); // Restore message on failure
      }
    } catch {
      setNewMessage(content);
    }

    setSending(false);
    inputRef.current?.focus();
  }

  async function handleReportSubmit(e) {
    e.preventDefault();
    if (!otherUser?._id || !reportReason || reportDetails.trim().length < 5 || reporting) return;

    setReporting(true);
    try {
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportedUserId: otherUser._id,
          reason: reportReason,
          details: reportDetails.trim(),
          matchId,
          conversationId: matchId,
          autoBlock: reportAutoBlock,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast({ title: 'Could not submit report', description: data.error || 'Try again.', variant: 'destructive' });
        return;
      }

      toast({
        title: 'Report submitted',
        description: reportAutoBlock ? 'We submitted your report and blocked this user.' : 'Thanks, our team will review this report.',
      });

      setReportOpen(false);
      setReportDetails('');
      setReportAutoBlock(false);

      if (reportAutoBlock) {
        router.push('/chat');
      }
    } catch {
      toast({ title: 'Could not submit report', description: 'Network error.', variant: 'destructive' });
    } finally {
      setReporting(false);
    }
  }

  async function handleBlock() {
    if (!otherUser?._id || blocking) return;
    const ok = window.confirm('Block this user? You will no longer see each other.');
    if (!ok) return;

    setBlocking(true);
    try {
      const res = await fetch('/api/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blockedUserId: otherUser._id, reason: 'Blocked from matched chat' }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast({ title: 'Could not block user', description: data.error || 'Try again.', variant: 'destructive' });
        return;
      }

      toast({ title: 'User blocked', description: 'This conversation is now hidden.' });
      router.push('/chat');
    } catch {
      toast({ title: 'Could not block user', description: 'Network error.', variant: 'destructive' });
    } finally {
      setBlocking(false);
    }
  }

  function formatTime(date) {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  function formatDate(date) {
    const d = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  }

  // Group messages by date
  const groupedMessages = messages.reduce((groups, msg) => {
    const date = new Date(msg.createdAt).toDateString();
    if (!groups[date]) groups[date] = [];
    groups[date].push(msg);
    return groups;
  }, {});

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-black/5 px-4 py-3 sticky top-0 bg-background z-10">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Link href="/chat">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          {otherUser && (
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-600 flex-shrink-0">
                {otherUser.photo ? (
                  <img src={otherUser.photo} alt={otherUser.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white font-bold">
                    {otherUser.name?.[0] ?? '?'}
                  </div>
                )}
              </div>
              <div>
                <h1 className="font-semibold text-slate-900">{otherUser.name}</h1>
                <p className="text-xs text-slate-400">Your match</p>
              </div>
            </div>
          )}
          {otherUser && (
            <div className="relative" ref={actionsMenuRef}>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setActionsMenuOpen((prev) => !prev)}
                aria-label="Open chat actions"
              >
                <MoreVertical className="w-4 h-4" />
              </Button>

              {actionsMenuOpen && (
                <div className="absolute right-0 top-11 w-44 rounded-xl border border-slate-200 bg-white shadow-lg p-1 z-20">
                  <button
                    type="button"
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
                    onClick={() => {
                      setActionsMenuOpen(false);
                      setReportOpen(true);
                    }}
                  >
                    <AlertTriangle className="w-4 h-4" />
                    Report
                  </button>
                  <button
                    type="button"
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 disabled:opacity-60"
                    onClick={() => {
                      setActionsMenuOpen(false);
                      handleBlock();
                    }}
                    disabled={blocking}
                  >
                    <Ban className="w-4 h-4" />
                    {blocking ? 'Blocking...' : 'Block'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-lg mx-auto space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <p className="text-slate-400">Loading messages...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-slate-500 mb-2">No messages yet</p>
              <p className="text-sm text-slate-400">Say hey to start the conversation!</p>
            </div>
          ) : (
            Object.entries(groupedMessages).map(([dateKey, dateMessages]) => (
              <div key={dateKey}>
                {/* Date separator */}
                <div className="flex items-center justify-center my-4">
                  <span className="px-3 py-1 bg-slate-100 rounded-full text-xs text-slate-500 font-medium">
                    {formatDate(dateMessages[0].createdAt)}
                  </span>
                </div>

                {/* Messages for this date */}
                <div className="space-y-2">
                  {dateMessages.map((msg, i) => {
                    const showTime = i === dateMessages.length - 1 ||
                      dateMessages[i + 1]?.isMe !== msg.isMe;

                    return (
                      <div
                        key={msg._id}
                        className={`flex flex-col ${msg.isMe ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[75%] px-4 py-2.5 rounded-2xl ${
                            msg.isMe
                              ? 'bg-black text-white rounded-br-md'
                              : 'bg-slate-100 text-slate-800 rounded-bl-md'
                          }`}
                        >
                          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                            {msg.content}
                          </p>
                        </div>
                        {showTime && (
                          <p className="text-xs mt-1 px-1 text-slate-400">
                            {formatTime(msg.createdAt)}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-black/5 px-4 py-3 sticky bottom-0 bg-background">
        <form onSubmit={handleSend} className="max-w-lg mx-auto flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e);
                }
              }}
              placeholder="Type a message..."
              rows={1}
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 resize-none focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm"
              style={{ maxHeight: '120px' }}
            />
          </div>
          <Button
            type="submit"
            disabled={!newMessage.trim() || sending}
            size="icon"
            className="h-12 w-12 rounded-full flex-shrink-0"
          >
            <Send className="w-5 h-5" />
          </Button>
        </form>
      </div>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report {otherUser?.name || 'user'}</DialogTitle>
            <DialogDescription>
              Reports are private. The other person will not see who reported them.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleReportSubmit} className="space-y-4">
            <div>
              <p className="text-sm text-slate-600 mb-1">Reason</p>
              <Select value={reportReason} onValueChange={setReportReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_REASONS.map((reason) => (
                    <SelectItem key={reason} value={reason}>
                      {reason.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <p className="text-sm text-slate-600 mb-1">Details</p>
              <textarea
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                placeholder="Share what happened (minimum 5 characters)"
                className="w-full min-h-[110px] px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={reportAutoBlock}
                onChange={(e) => setReportAutoBlock(e.target.checked)}
              />
              Also block this user immediately
            </label>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setReportOpen(false)} disabled={reporting}>
                Cancel
              </Button>
              <Button type="submit" disabled={reporting || reportDetails.trim().length < 5}>
                {reporting ? 'Submitting...' : 'Submit report'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
