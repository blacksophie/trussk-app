import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, Mail, RefreshCw, AlertCircle, Loader2,
  ChevronLeft, Archive, Trash2, MoreHorizontal, Reply, Star,
  Edit, Send,
} from 'lucide-react';
import { auth } from '../lib/firebase';

// ─── Types ────────────────────────────────────────────────────────────────────

interface GmailHeader { name: string; value: string; }
interface GmailMessage {
  id: string;
  threadId?: string;
  snippet: string;
  internalDate?: string;
  labelIds?: string[];
  payload?: { headers?: GmailHeader[] };
  headers?: GmailHeader[]; // sanitised form from server
  body?: string;           // decoded full body from server
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function hdr(msg: GmailMessage, name: string): string {
  const list = msg.headers ?? msg.payload?.headers ?? [];
  return list.find(h => h.name.toLowerCase() === name.toLowerCase())?.value ?? '';
}

function parseFrom(from: string): { name: string; email: string } {
  const m = from.match(/^(.*?)\s*<(.+?)>$/);
  if (m) return { name: m[1].trim().replace(/^"|"$/g, ''), email: m[2] };
  return { name: from, email: from };
}

function initials(name: string): string {
  return name.split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?';
}

function avatarColor(name: string): string {
  const colors = [
    'bg-orange-100 text-orange-700',
    'bg-blue-100 text-blue-700',
    'bg-emerald-100 text-emerald-700',
    'bg-violet-100 text-violet-700',
    'bg-rose-100 text-rose-700',
    'bg-amber-100 text-amber-700',
    'bg-cyan-100 text-cyan-700',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function formatDate(internalDate?: string, dateStr?: string): string {
  const ms = internalDate ? parseInt(internalDate, 10) : dateStr ? new Date(dateStr).getTime() : 0;
  if (!ms) return '';
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatFullDate(internalDate?: string, dateStr?: string): string {
  const ms = internalDate ? parseInt(internalDate, 10) : dateStr ? new Date(dateStr).getTime() : 0;
  if (!ms) return '';
  return new Date(ms).toLocaleString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function isUnread(msg: GmailMessage): boolean {
  return msg.labelIds?.includes('UNREAD') ?? false;
}

// ─── API ─────────────────────────────────────────────────────────────────────

async function apiFetch(path: string) {
  const idToken = await auth.currentUser?.getIdToken();
  if (!idToken) throw new Error('not_signed_in');
  const res = await fetch(path, { headers: { Authorization: `Bearer ${idToken}` } });
  const json = await res.json();
  if (!res.ok) throw Object.assign(new Error(json.message ?? 'Request failed'), { code: json.error });
  return json;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const sz = size === 'sm' ? 'w-7 h-7 text-[10px]' : size === 'lg' ? 'w-10 h-10 text-sm' : 'w-8 h-8 text-xs';
  return (
    <div className={`${sz} ${avatarColor(name)} rounded-full flex items-center justify-center font-semibold flex-shrink-0`}>
      {initials(name)}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export const OutreachView: React.FC = () => {
  const [messages, setMessages] = useState<GmailMessage[]>([]);
  const [selected, setSelected] = useState<GmailMessage | null>(null);
  const [fullThread, setFullThread] = useState<any | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [starred, setStarred] = useState<Set<string>>(new Set());
  const [composing, setComposing] = useState(false);
  const [toEmail, setToEmail] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch('/api/fetch-threads?maxResults=20');
      setMessages(data.threads ?? []);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openMessage = async (msg: GmailMessage) => {
    setComposing(false);
    // Show the message immediately — don't wait for the full thread
    setSelected(msg);
    setFullThread(null);
    setLoadingThread(true);

    const fetchId = msg.threadId ?? msg.id;
    if (!fetchId) { setLoadingThread(false); return; }

    try {
      const data = await apiFetch(`/api/fetch-threads?threadId=${fetchId}`);
      // Only update if this message is still selected (avoid stale responses)
      setFullThread(data);
    } catch {
      // Fall back to rendering the list-level message data we already have
      setFullThread({ id: msg.id, snippet: msg.snippet, messages: [msg] });
    } finally {
      setLoadingThread(false);
    }
  };

  const sendEmail = async () => {
    setSending(true);
    setSendError(null);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error('Not signed in');
      const res = await fetch('/api/send-candidate-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          candidateEmail: toEmail,
          subject: composeSubject,
          body: composeBody,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? 'Send failed');
      setComposing(false);
      setToEmail('');
      setComposeSubject('');
      setComposeBody('');
      load();
    } catch (e: any) {
      setSendError(e.message ?? 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  const filtered = messages.filter(m => {
    if (!search) return true;
    const q = search.toLowerCase();
    const subject = hdr(m, 'Subject').toLowerCase();
    const from = hdr(m, 'From').toLowerCase();
    return subject.includes(q) || from.includes(q) || m.snippet?.toLowerCase().includes(q);
  });

  // ── Error state ─────────────────────────────────────────────────────────────
  if (!loading && error) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-white gap-4">
        <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center">
          <AlertCircle className="w-5 h-5 text-red-400" />
        </div>
        <div className="text-center max-w-xs">
          <p className="text-sm font-semibold text-gray-800 mb-1">Could not load inbox</p>
          <p className="text-xs text-gray-400 leading-relaxed">{error}</p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 text-xs font-medium text-brand border border-brand/30 px-3 py-1.5 rounded-lg hover:bg-orange-50 transition-colors">
          <RefreshCw className="w-3 h-3" /> Try again
        </button>
      </div>
    );
  }

  // ── Layout ──────────────────────────────────────────────────────────────────
  return (
    <div className="w-full h-full flex bg-white overflow-hidden">

      {/* ── Left panel: message list ─────────────────────────────────────── */}
      <div className={`w-full md:w-[340px] lg:w-[380px] flex-shrink-0 flex flex-col border-r border-gray-100 ${selected ? 'hidden md:flex' : 'flex'}`}>

        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-[15px] font-semibold text-gray-900">Inbox</h1>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {loading ? 'Loading…' : `${messages.length} messages · Gmail`}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  setComposing(true);
                  setSelected(null);
                  setFullThread(null);
                  setSendError(null);
                }}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button onClick={load} disabled={loading} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-40">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search messages…"
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-lg text-[13px] placeholder-gray-400 focus:outline-none focus:border-gray-200 focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="w-5 h-5 text-gray-300 animate-spin" />
              <p className="text-xs text-gray-400">Loading from Gmail…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <Mail className="w-7 h-7 text-gray-200" />
              <p className="text-xs text-gray-400">No messages found</p>
            </div>
          ) : (
            filtered.map(msg => {
              const from = parseFrom(hdr(msg, 'From'));
              const subject = hdr(msg, 'Subject') || '(no subject)';
              const date = formatDate(msg.internalDate, hdr(msg, 'Date'));
              const unread = isUnread(msg);
              const isSelected = selected?.id === msg.id;

              return (
                <button
                  key={msg.id}
                  onClick={() => openMessage(msg)}
                  className={`w-full text-left px-4 py-3.5 border-b border-gray-50 transition-colors flex gap-3 items-start ${
                    isSelected ? 'bg-orange-50 border-l-2 border-l-brand' : 'hover:bg-gray-50 border-l-2 border-l-transparent'
                  }`}
                >
                  <Avatar name={from.name || from.email} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2 mb-0.5">
                      <span className={`text-[13px] truncate ${unread ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                        {from.name || from.email}
                      </span>
                      <span className="text-[11px] text-gray-400 flex-shrink-0">{date}</span>
                    </div>
                    <p className={`text-[12px] truncate mb-0.5 ${unread ? 'font-medium text-gray-800' : 'text-gray-600'}`}>
                      {subject}
                    </p>
                    <p className="text-[11px] text-gray-400 truncate leading-relaxed">
                      {msg.snippet}
                    </p>
                  </div>
                  {unread && <div className="w-1.5 h-1.5 rounded-full bg-brand flex-shrink-0 mt-1.5" />}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── Right panel: message detail ──────────────────────────────────── */}
      <div className={`flex-1 flex flex-col min-w-0 ${!selected && !composing ? 'hidden md:flex' : 'flex'}`}>
          {composing ? (
            <div className="flex-1 flex flex-col p-6 gap-4 overflow-y-auto">
              <h2 className="text-[15px] font-semibold text-gray-900">New Message</h2>
              <div className="flex flex-col gap-3 max-w-2xl">
                <div>
                  <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1 block">To</label>
                  <input
                    type="email"
                    value={toEmail}
                    onChange={e => setToEmail(e.target.value)}
                    placeholder="candidate@email.com"
                    disabled={sending}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-[13px] placeholder-gray-400 focus:outline-none focus:border-gray-200 focus:bg-white transition-all disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1 block">Subject</label>
                  <input
                    type="text"
                    value={composeSubject}
                    onChange={e => setComposeSubject(e.target.value)}
                    placeholder="Senior PM — Tampa Bridge Project"
                    disabled={sending}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-[13px] placeholder-gray-400 focus:outline-none focus:border-gray-200 focus:bg-white transition-all disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1 block">Message</label>
                  <textarea
                    value={composeBody}
                    onChange={e => setComposeBody(e.target.value)}
                    placeholder="Hi Jane, I came across your profile and think you'd be a great fit..."
                    rows={12}
                    disabled={sending}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-[13px] placeholder-gray-400 focus:outline-none focus:border-gray-200 focus:bg-white transition-all resize-none disabled:opacity-50"
                  />
                </div>
              </div>
              {sendError && (
                <p className="text-[12px] text-red-500 max-w-2xl">{sendError}</p>
              )}
              <div className="flex items-center gap-3 max-w-2xl">
                <button
                  onClick={sendEmail}
                  disabled={sending || !toEmail || !composeSubject || !composeBody}
                  className="flex items-center gap-1.5 text-[13px] font-medium text-white bg-brand px-4 py-2 rounded-lg hover:bg-brand/90 transition-colors disabled:opacity-40"
                >
                  {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  {sending ? 'Sending…' : 'Send'}
                </button>
                <button
                  onClick={() => {
                    setComposing(false);
                    setSendError(null);
                    setToEmail('');
                    setComposeSubject('');
                    setComposeBody('');
                  }}
                  disabled={sending}
                  className="text-[13px] text-gray-400 hover:text-gray-700 transition-colors disabled:opacity-40"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : !selected ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 bg-gray-50">
              <div className="w-14 h-14 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center justify-center">
                <Mail className="w-6 h-6 text-gray-300" />
              </div>
              <p className="text-[13px] font-medium text-gray-500">Select a message to read</p>
            </div>
          ) : (
            <div key={selected.id} className="flex-1 flex flex-col min-h-0 animate-fadeIn">
              {/* Detail toolbar */}
              <div className="flex items-center justify-between px-6 py-3.5 border-b border-gray-100 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <button onClick={() => { setSelected(null); setFullThread(null); }}
                    className="md:hidden flex items-center gap-1 text-[12px] text-gray-500 hover:text-gray-800 mr-1">
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>
                  <button onClick={() => setStarred(s => { const n = new Set(s); n.has(selected.id) ? n.delete(selected.id) : n.add(selected.id); return n; })}
                    className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                    <Star className={`w-4 h-4 ${starred.has(selected.id) ? 'fill-amber-400 text-amber-400' : 'text-gray-400'}`} />
                  </button>
                  <button className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-700">
                    <Archive className="w-4 h-4" />
                  </button>
                  <button className="p-1.5 rounded-lg hover:bg-red-50 transition-colors text-gray-400 hover:text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-700">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>
                <button className="flex items-center gap-1.5 text-[12px] font-medium text-brand bg-orange-50 border border-orange-200 px-3 py-1.5 rounded-lg hover:bg-orange-100 transition-colors">
                  <Reply className="w-3.5 h-3.5" /> Reply
                </button>
              </div>

              {/* Message content */}
              <div className="flex-1 overflow-y-auto px-6 py-6">
                {loadingThread ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-5 h-5 text-gray-300 animate-spin" />
                  </div>
                ) : (() => {
                  const msgs: GmailMessage[] = fullThread?.messages ?? [selected];
                  const firstMsg = msgs[0];
                  const subject = hdr(firstMsg, 'Subject') || '(no subject)';

                  return (
                    <>
                      {/* Subject */}
                      <h2 className="text-[18px] font-semibold text-gray-900 mb-6 leading-snug">{subject}</h2>

                      {/* Message bubbles */}
                      <div className="space-y-6">
                        {msgs.map((msg, i) => {
                          const from = parseFrom(hdr(msg, 'From'));
                          const date = formatFullDate(msg.internalDate, hdr(msg, 'Date'));

                          return (
                            <div key={msg.id ?? i} className="flex gap-3">
                              <Avatar name={from.name || from.email} size="md" />
                              <div className="flex-1 min-w-0">
                                {/* Sender row */}
                                <div className="flex items-baseline justify-between gap-2 mb-1">
                                  <div>
                                    <span className="text-[13px] font-semibold text-gray-900">{from.name || from.email}</span>
                                    {from.name && (
                                      <span className="text-[11px] text-gray-400 ml-2">&lt;{from.email}&gt;</span>
                                    )}
                                  </div>
                                  <span className="text-[11px] text-gray-400 flex-shrink-0">{date}</span>
                                </div>

                                {/* Body */}
                                <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3.5 text-[13px] text-gray-700 leading-relaxed whitespace-pre-wrap">
                                  {msg.body || msg.snippet || '(no content)'}
                                </div>

                                {/* Labels */}
                                {(msg.labelIds ?? []).filter(l => !['UNREAD', 'INBOX', 'CATEGORY_PERSONAL', 'CATEGORY_PROMOTIONS', 'CATEGORY_SOCIAL', 'CATEGORY_UPDATES'].includes(l)).map(label => (
                                  <span key={label} className="inline-block mt-2 mr-1 text-[10px] font-medium px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">
                                    {label}
                                  </span>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          )}
      </div>
    </div>
  );
};
