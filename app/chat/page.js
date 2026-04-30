'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, MessageCircle, Heart, Drumstick } from 'lucide-react';

function ChatPreview({ chat, onClick }) {
  const timeAgo = (date) => {
    if (!date) return '';
    const diff = Date.now() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d`;
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors rounded-xl"
    >
      {/* Avatar */}
      <div className="relative">
        <div className="w-14 h-14 rounded-full overflow-hidden bg-gray-600 flex-shrink-0">
          {chat.otherUser.photo ? (
            <img src={chat.otherUser.photo} alt={chat.otherUser.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white font-bold text-xl">
              {chat.otherUser.name?.[0] ?? '?'}
            </div>
          )}
        </div>
        {chat.unreadCount > 0 && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-black rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">{chat.unreadCount}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center justify-between gap-2">
          <h3 className={`font-semibold truncate ${chat.unreadCount > 0 ? 'text-slate-900' : 'text-slate-700'}`}>
            {chat.otherUser.name}
          </h3>
          <span className="text-xs text-slate-400 flex-shrink-0">{timeAgo(chat.updatedAt)}</span>
        </div>
        {chat.lastMessage ? (
          <p className={`text-sm truncate ${chat.unreadCount > 0 ? 'text-slate-700 font-medium' : 'text-slate-500'}`}>
            {chat.lastMessage.isMe ? 'You: ' : ''}{chat.lastMessage.content}
          </p>
        ) : (
          <p className="text-sm text-slate-400 italic">Start the conversation</p>
        )}
      </div>
    </button>
  );
}

export default function ChatListPage() {
  const router = useRouter();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadChats() {
      try {
        const res = await fetch('/api/chat/list');
        if (res.ok) {
          const { chats: data } = await res.json();
          setChats(data ?? []);
        }
      } catch {}
      setLoading(false);
    }
    loadChats();
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-black/5 px-6 py-5 sticky top-0 bg-background z-10">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Link href="/feed">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-display font-bold text-slate-900">Messages</h1>
            <p className="text-xs text-slate-400">Chat with your matches</p>
          </div>
          <Link href="/matches">
            <Button variant="outline" size="sm" className="gap-2">
              <Heart className="w-4 h-4" />
              Matches
            </Button>
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 max-w-lg mx-auto w-full">
        {loading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 p-4">
                <div className="w-14 h-14 rounded-full bg-slate-100 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-24 bg-slate-100 rounded animate-pulse" />
                  <div className="h-3 w-40 bg-slate-100 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : chats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <MessageCircle className="w-12 h-12 text-slate-300 mb-4" />
            <h2 className="text-lg font-semibold text-slate-700 mb-2">No conversations yet</h2>
            <p className="text-sm text-slate-500 mb-6">
              Accept a match to start chatting
            </p>
            <Link href="/matches">
              <Button variant="outline" className="gap-2">
                <Heart className="w-4 h-4" />
                View Matches
              </Button>
            </Link>
          </div>
        ) : (
          <div className="py-2">
            {chats.map((chat) => (
              <ChatPreview
                key={chat.matchId}
                chat={chat}
                onClick={() => router.push(`/chat/${chat.matchId}`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="border-t border-black/5 px-4 py-4 sticky bottom-0 bg-background">
        <div className="max-w-lg mx-auto flex items-center gap-2 rounded-[1.75rem] border border-black/5 bg-background px-3 py-3 warm-nav-shell">
          <Link href="/feed" className="warm-nav-link flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl py-2 text-slate-400 hover:text-slate-700">
            <Drumstick className="w-6 h-6" />
            <span className="text-xs">Feed</span>
          </Link>
          <Link href="/matches" className="warm-nav-link flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl py-2 text-slate-400 hover:text-slate-700">
            <Heart className="w-6 h-6" />
            <span className="text-xs">Matches</span>
          </Link>
          <Link href="/chat" className="warm-nav-link flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl py-2 text-black bg-amber-100/80">
            <MessageCircle className="w-6 h-6" />
            <span className="text-xs font-medium">Chats</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
