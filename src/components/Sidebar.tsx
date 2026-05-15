import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MessageSquare,
  Settings,
  ChevronRight,
  LogOut,
  ChevronLeft,
  Sparkles,
  LayoutGrid,
  Calendar as CalendarIcon,
  Link2,
  Video,
  Phone,
  Clock,
  CalendarDays,
} from 'lucide-react';
import { View, Candidate, Interview } from '../types';
import { NICHE } from '../config/niche';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { useToast } from './Toast';

interface SidebarProps {
  currentView: View;
  onViewChange: (view: View) => void;
  isOpen: boolean;
  onClose: () => void;
  candidates?: Candidate[];
  interviews?: Interview[];
}

// ── Time helpers ──────────────────────────────────────────────────────────────

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseDateTime(date: string, time: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  const match = time.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return new Date(0);
  let h = parseInt(match[1]);
  const min = parseInt(match[2]);
  const mer = match[3].toUpperCase();
  if (mer === 'PM' && h !== 12) h += 12;
  if (mer === 'AM' && h === 12) h = 0;
  return new Date(y, m - 1, d, h, min);
}

function parseDurationMins(duration: string): number {
  const m = duration.match(/(\d+)/);
  return m ? parseInt(m[1]) : 60;
}

function minutesUntil(dt: Date): number {
  return Math.round((dt.getTime() - Date.now()) / 60000);
}

function formatCountdown(mins: number): string {
  if (mins <= 0) return 'Now';
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function formatTime(time: string): string {
  // "10:30 AM" → "10:30 AM"  (already formatted, just clean whitespace)
  return time.trim();
}

// ── Upcoming interview calculation ────────────────────────────────────────────

interface RichInterview extends Interview {
  startTime: Date;
  endTime: Date;
  minsUntil: number;
}

function useUpcomingInterviews(interviews: Interview[]): {
  upcoming: RichInterview[];
  todayRemaining: RichInterview[];
  nextUp: RichInterview | null;
} {
  const [now, setNow] = useState(() => new Date());

  // Refresh every 60 seconds so past interviews drop off automatically
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  return useMemo(() => {
    const enriched: RichInterview[] = interviews
      .map(iv => {
        const start = parseDateTime(iv.date, iv.time);
        const end = new Date(start.getTime() + parseDurationMins(iv.duration ?? '60 min') * 60_000);
        return { ...iv, startTime: start, endTime: end, minsUntil: minutesUntil(start) };
      })
      .filter(iv => iv.endTime > now)                            // drop finished
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime()); // soonest first

    const today = todayStr();
    const todayRemaining = enriched.filter(iv => iv.date === today);
    const upcoming = enriched.slice(0, 3);
    const nextUp = upcoming[0] ?? null;

    return { upcoming, todayRemaining, nextUp };
  }, [interviews, now]);
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Sidebar({ currentView, onViewChange, isOpen, onClose, interviews = [] }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const user = auth.currentUser;
  const { toast } = useToast();

  const { upcoming, todayRemaining, nextUp } = useUpcomingInterviews(interviews);
  const today = todayStr();
  const noInterviewsToday = todayRemaining.length === 0;

  const workspaceItems = [
    { id: View.POST_JOB,    label: 'Post Jobs',   icon: Sparkles },
    { id: View.JOBS_POSTED, label: 'Active Jobs',  icon: LayoutGrid },
    { id: View.CALENDAR,    label: 'Calendar',     icon: CalendarIcon },
    { id: View.INTEGRATIONS,label: 'Integrations', icon: Link2 },
  ];

  const supportItems = [
    { id: View.FEEDBACK, label: 'Feedback', icon: MessageSquare, tag: 'BETA' },
    { id: View.SETTINGS, label: 'Settings',  icon: Settings },
  ];

  const handleSignOut = () => {
    signOut(auth);
    toast('Signed out', 'info');
  };

  const NavItem = ({ item, isActive = false }: { item: any; isActive?: boolean }) => (
    <button
      onClick={() => {
        if (Object.values(View).includes(item.id)) onViewChange(item.id as View);
        onClose();
      }}
      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all active:scale-[0.98] group relative ${
        isActive ? 'bg-brand text-white shadow-[0_4px_15px_rgba(255,99,33,0.3)]' : 'text-gray-400 hover:text-white hover:bg-white/4'
      }`}
    >
      <div className="flex items-center gap-3 relative z-10">
        <item.icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-brand'}`} />
        {!isCollapsed && <span className="text-xs font-bold tracking-tight">{item.label}</span>}
      </div>
      {!isCollapsed && item.tag && (
        <span className="bg-brand/10 border border-brand/20 px-2 py-0.5 rounded-md text-[10px] font-semibold text-brand">
          {item.tag}
        </span>
      )}
    </button>
  );

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-60 md:hidden"
          />
        )}
      </AnimatePresence>

      <motion.div
        animate={{ width: isCollapsed ? 64 : 240 }}
        className={`fixed inset-y-0 left-0 bg-[#121212] flex flex-col z-70 transition-transform duration-300 md:relative md:translate-x-0 border-r border-white/5 p-4 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Collapse toggle */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-12 w-6 h-6 rounded-full bg-brand items-center justify-center text-white z-20 hidden md:flex hover:scale-110 transition-transform shadow-[0_2px_10px_rgba(255,107,0,0.4)]"
        >
          {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>

        {/* Logo */}
        {!isCollapsed && (
          <div className="px-3 mb-6 pt-1">
            <h1 className="text-base font-semibold text-white tracking-tighter italic">{NICHE.appName.toUpperCase()}</h1>
          </div>
        )}

        <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide space-y-6">

          {/* Workspace nav */}
          <div className="space-y-1">
            {workspaceItems.map(item => (
              <NavItem key={item.id} item={item} isActive={currentView === item.id} />
            ))}
          </div>

          {/* Support nav */}
          <div>
            {!isCollapsed && <p className="px-3 mb-3 text-[11px] font-semibold text-white uppercase tracking-widest">Support</p>}
            <div className="space-y-1">
              {supportItems.map(item => (
                <NavItem key={item.id} item={item} isActive={currentView === item.id} />
              ))}
            </div>
          </div>

          {/* ── Today's Interviews ─────────────────────────────────────── */}
          {!isCollapsed && (
            <div>
              {/* Section header */}
              <div className="px-3 mb-3 flex items-center justify-between">
                <p className="text-[11px] font-semibold text-white uppercase tracking-widest">Interviews</p>
                <span className="text-[10px] font-semibold text-gray-500">
                  {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>

              <AnimatePresence mode="popLayout">
                {noInterviewsToday ? (
                  /* No interviews today */
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="mx-1 px-3 py-3.5 rounded-xl border border-white/5 bg-white/2"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-white/4 flex items-center justify-center shrink-0">
                        <CalendarDays className="w-3.5 h-3.5 text-gray-600" />
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-gray-500">No Interviews Today</p>
                        {upcoming.length > 0 && (
                          <p className="text-[10px] text-gray-600 mt-0.5">
                            Next: {upcoming[0].candidateName.split(' ')[0]} · {upcoming[0].date === today ? formatTime(upcoming[0].time) : new Date(upcoming[0].startTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  /* Interview cards — max 3, soonest first */
                  <div className="space-y-1.5">
                    {upcoming.map((iv, i) => {
                      const isNext = nextUp?.id === iv.id && iv.date === today;
                      const isToday = iv.date === today;
                      const mins = iv.minsUntil;
                      const isSoon = isToday && mins > 0 && mins <= 30;
                      const isVeryClose = isToday && mins > 0 && mins <= 10;

                      return (
                        <motion.div
                          key={iv.id ?? i}
                          layout
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -8 }}
                          transition={{ delay: i * 0.05 }}
                          onClick={() => onViewChange(View.CALENDAR)}
                          className={`mx-1 px-3 py-2.5 rounded-xl cursor-pointer transition-all group relative overflow-hidden ${
                            isNext
                              ? 'bg-brand/10 border border-brand/25 hover:bg-brand/15'
                              : 'border border-white/5 bg-white/2 hover:bg-white/5 hover:border-white/10'
                          }`}
                        >
                          {/* Pulsing left accent for next-up */}
                          {isNext && (
                            <div className="absolute left-0 top-0 bottom-0 w-0.75 bg-brand rounded-l-xl" />
                          )}

                          {/* Very close — subtle shimmer */}
                          {isVeryClose && (
                            <motion.div
                              animate={{ opacity: [0.3, 0.6, 0.3] }}
                              transition={{ duration: 2, repeat: Infinity }}
                              className="absolute inset-0 bg-brand/5 rounded-xl pointer-events-none"
                            />
                          )}

                          <div className="flex items-start gap-2.5 relative">
                            {/* Avatar */}
                            <div className={`w-7 h-7 rounded-lg overflow-hidden shrink-0 flex items-center justify-center text-[9px] font-bold border ${
                              isNext ? 'border-brand/30 bg-brand/10 text-brand' : 'border-white/10 bg-white/5 text-gray-500'
                            }`}>
                              {iv.candidateAvatarUrl
                                ? <img src={iv.candidateAvatarUrl} className="w-full h-full object-cover" alt="" />
                                : <span>{iv.candidateInitials}</span>
                              }
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1 mb-0.5">
                                <p className={`text-[12px] font-bold truncate leading-none ${isNext ? 'text-white' : 'text-gray-300'}`}>
                                  {iv.candidateName}
                                </p>
                                {/* Countdown badge */}
                                {isToday && (
                                  <span className={`text-[10px] font-bold shrink-0 px-1.5 py-0.5 rounded-md leading-none ${
                                    isVeryClose
                                      ? 'bg-red-500/20 text-red-400'
                                      : isSoon
                                      ? 'bg-orange-500/20 text-orange-400'
                                      : isNext
                                      ? 'text-brand'
                                      : 'text-gray-600'
                                  }`}>
                                    {mins <= 0 ? 'Now' : formatCountdown(mins)}
                                  </span>
                                )}
                                {!isToday && (
                                  <span className="text-[10px] text-gray-600 shrink-0">
                                    {new Date(iv.startTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1.5">
                                {iv.locationType === 'Video'
                                  ? <Video className={`w-2.5 h-2.5 shrink-0 ${isNext ? 'text-brand/70' : 'text-gray-600'}`} />
                                  : <Phone className={`w-2.5 h-2.5 shrink-0 ${isNext ? 'text-brand/70' : 'text-gray-600'}`} />
                                }
                                <p className={`text-[10px] truncate ${isNext ? 'text-brand/70' : 'text-gray-600'}`}>
                                  {iv.type}
                                </p>
                              </div>

                              <div className="flex items-center gap-1 mt-1">
                                <Clock className={`w-2.5 h-2.5 shrink-0 ${isNext ? 'text-brand/50' : 'text-gray-700'}`} />
                                <p className={`text-[10px] font-semibold ${isNext ? 'text-brand/80' : 'text-gray-500'}`}>
                                  {formatTime(iv.time)} · {iv.duration}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* "UP NEXT" label */}
                          {isNext && isToday && (
                            <div className="mt-2 flex items-center gap-1">
                              <motion.div
                                animate={{ opacity: [1, 0.4, 1] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                                className="w-1.5 h-1.5 rounded-full bg-brand shrink-0"
                              />
                              <span className="text-[9px] font-bold text-brand uppercase tracking-widest">
                                {mins <= 0 ? 'In Progress' : isSoon ? 'Starting Soon' : 'Up Next'}
                              </span>
                            </div>
                          )}
                        </motion.div>
                      );
                    })}

                    {/* Count of hidden future interviews */}
                    {interviews.filter(iv => {
                      const end = new Date(parseDateTime(iv.date, iv.time).getTime() + parseDurationMins(iv.duration ?? '60 min') * 60000);
                      return end > new Date();
                    }).length > 3 && (
                      <p className="text-center text-[10px] text-gray-700 py-1">
                        +{interviews.filter(iv => {
                          const end = new Date(parseDateTime(iv.date, iv.time).getTime() + parseDurationMins(iv.duration ?? '60 min') * 60000);
                          return end > new Date();
                        }).length - 3} more upcoming
                      </p>
                    )}
                  </div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Collapsed — icon-only for interviews */}
          {isCollapsed && upcoming.length > 0 && (
            <div className="space-y-1">
              {upcoming.slice(0, 3).map((iv, i) => (
                <button
                  key={i}
                  onClick={() => onViewChange(View.CALENDAR)}
                  className={`w-full flex justify-center py-2 ${iv.id === nextUp?.id ? 'text-brand' : 'text-gray-600'}`}
                >
                  <div className={`w-6 h-6 rounded-lg overflow-hidden flex items-center justify-center border ${iv.id === nextUp?.id ? 'border-brand/40 bg-brand/10' : 'border-white/10 bg-white/5'}`}>
                    {iv.candidateAvatarUrl
                      ? <img src={iv.candidateAvatarUrl} className="w-full h-full object-cover" alt="" />
                      : <span className="text-[8px] font-bold">{iv.candidateInitials}</span>
                    }
                  </div>
                </button>
              ))}
            </div>
          )}

        </div>

        {/* Bottom — user profile */}
        {!isCollapsed && (
          <div className="mt-auto pt-6 focus-visible:outline-none">
            <div
              onClick={() => onViewChange(View.SETTINGS)}
              className="flex items-center gap-3 mb-5 p-2 rounded-2xl hover:bg-white/4 cursor-pointer transition-all active:scale-[0.98] group"
            >
              <div className="relative">
                <div className="w-7 h-7 rounded-full bg-brand/20 flex items-center justify-center text-brand font-bold overflow-hidden border border-white/10 shadow-xl group-hover:border-brand/40">
                  {user?.photoURL
                    ? <img src={user.photoURL} alt="p" className="w-full h-full object-cover" />
                    : user?.displayName?.[0] ?? user?.email?.[0]?.toUpperCase() ?? 'U'
                  }
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-[#121212]" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <h4 className="text-xs font-bold text-white tracking-tight leading-tight group-hover:text-brand transition-colors truncate">
                  {user?.displayName || user?.email?.split('@')[0] || 'User'}
                </h4>
                <p className="text-[10px] text-gray-500 truncate">{user?.email}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-700 group-hover:text-white shrink-0" />
            </div>

            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 text-[10px] font-semibold text-gray-500 hover:text-white transition-all uppercase tracking-widest"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        )}

        {isCollapsed && (
          <button
            onClick={handleSignOut}
            className="mt-auto w-full flex justify-center py-4 text-gray-600 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </motion.div>
    </>
  );
}
