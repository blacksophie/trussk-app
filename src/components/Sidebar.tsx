import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users,
  MessageSquare,
  Settings,
  ChevronRight,
  LogOut,
  ChevronLeft,
  Sparkles,
  LayoutGrid,
  Calendar as CalendarIcon,
  Link2,
} from 'lucide-react';
import { View, Candidate, Interview } from '../types';
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

export default function Sidebar({ currentView, onViewChange, isOpen, onClose, interviews = [] }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const user = auth.currentUser;
  const { toast } = useToast();

  const workspaceItems = [
    { id: View.POST_JOB, label: 'Post Jobs', icon: Sparkles },
    { id: View.JOBS_POSTED, label: 'Active Jobs', icon: LayoutGrid },
    { id: View.CALENDAR, label: 'Calendar', icon: CalendarIcon },
    { id: View.INTEGRATIONS, label: 'Integrations', icon: Link2 },
  ];

  const todayStr = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();
  const interviewsItems = interviews
    .filter(iv => iv.date === todayStr)
    .map(iv => ({
      id: iv.id,
      label: iv.candidateName,
      secondary: `${iv.type} · ${iv.time}`,
      time: iv.time,
      avatarUrl: iv.candidateAvatarUrl,
      initials: iv.candidateInitials,
    }));

  const supportItems = [
    { id: 'feedback', label: 'Feedback', icon: MessageSquare, tag: 'BETA' },
    { id: View.POST_JOB, label: 'Settings', icon: Settings },
  ];

  const handleSignOut = () => {
    signOut(auth);
    toast('Signed out', 'info');
  };

  const NavItem = ({ item, isActive = false }: { item: any; isActive?: boolean; key?: any }) => (
    <button
      onClick={() => {
        if (item.id in View || Object.values(View).includes(item.id)) {
          onViewChange(item.id as View);
        }
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
      {!isCollapsed && (
        <div className="flex items-center gap-2 relative z-10">
          {item.count !== undefined && (
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${isActive ? 'bg-white/20 text-white' : 'bg-white/5 border border-white/5 text-gray-500'}`}>
              {item.count}
            </span>
          )}
          {item.tag && (
            <span className="bg-brand/10 border border-brand/20 px-2 py-0.5 rounded-md text-[10px] font-semibold text-brand">
              {item.tag}
            </span>
          )}
        </div>
      )}
    </button>
  );

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-60 md:hidden"
          />
        )}
      </AnimatePresence>

      <motion.div 
        animate={{ width: isCollapsed ? 64 : 240 }}
        className={`
          fixed inset-y-0 left-0 bg-[#121212] flex flex-col z-70 transition-transform duration-300 md:relative md:translate-x-0 border-r border-white/5 p-4
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Toggle Button */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-12 w-6 h-6 rounded-full bg-brand items-center justify-center text-white z-20 hidden md:flex hover:scale-110 transition-transform shadow-[0_2px_10px_rgba(255,107,0,0.4)]"
        >
          {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>

        {/* Logo */}
        {!isCollapsed && (
          <div className="px-3 mb-6 pt-1">
            <h1 className="text-base font-semibold text-white tracking-tighter italic">TRUSSK</h1>
          </div>
        )}

        <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide space-y-6">
          {/* Workspace */}
          <div className="space-y-1">
            {workspaceItems.map((item) => (
              <NavItem key={item.id} item={item} isActive={currentView === item.id} />
            ))}
          </div>

          {/* Support */}
          <div>
            {!isCollapsed && <p className="px-3 mb-3 text-[11px] font-semibold text-white uppercase tracking-widest">Support</p>}
            <div className="space-y-1">
              {supportItems.map((item) => (
                <NavItem key={item.id} item={item} />
              ))}
            </div>
          </div>

          {/* Todays Interviews — only shown when interviews exist */}
          <div className={interviewsItems.length === 0 ? 'hidden' : ''}>
            {!isCollapsed && (
              <div className="px-3 mb-4 flex items-center justify-between">
                <p className="text-[11px] font-semibold text-white uppercase tracking-widest">Todays Interviews</p>
                <span className="text-[11px] font-semibold text-white uppercase tracking-tighter">
                  {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>
            )}
            <div className="space-y-1">
              {isCollapsed ? (
                interviewsItems.map((item, i) => (
                  <button key={i} className="w-full flex justify-center py-3 text-gray-500 hover:text-white">
                    <div className="w-6 h-6 rounded-lg overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center">
                      {item.avatarUrl ? <img src={item.avatarUrl} className="w-full h-full object-cover" /> : <Users className="w-3 h-3" />}
                    </div>
                  </button>
                ))
              ) : (
                interviewsItems.map((item) => (
                  <button key={item.id} className="w-full flex items-center justify-between px-3 py-3 rounded-xl hover:bg-white/4 text-gray-400 hover:text-white transition-all group">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-7 h-7 rounded-lg overflow-hidden bg-white/5 border border-white/10 shrink-0 flex items-center justify-center text-[9px] font-semibold text-gray-500 group-hover:border-brand/40 group-hover:text-brand">
                        {item.avatarUrl ? (
                          <img src={item.avatarUrl} className="w-full h-full object-cover" />
                        ) : (
                          <span>{item.initials}</span>
                        )}
                      </div>
                      <div className="text-left min-w-0">
                        <span className="block text-sm font-bold tracking-tight truncate text-white">{item.label}</span>
                        {item.secondary && <span className="block text-[10px] text-gray-600 truncate group-hover:text-gray-400">{item.secondary}</span>}
                      </div>
                    </div>
                    {item.time && <span className="text-xs font-semibold text-brand tracking-widest shrink-0">{item.time}</span>}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        {!isCollapsed && (
          <div className="mt-auto pt-8 focus-visible:outline-none">

            {/* User Profile */}
            <div className="flex items-center gap-3 mb-6 p-2 rounded-2xl hover:bg-white/4 cursor-pointer transition-all active:scale-[0.98] group">
              <div className="relative">
                <div className="w-7 h-7 rounded-full bg-brand/20 flex items-center justify-center text-brand font-bold overflow-hidden border border-white/10 shadow-xl group-hover:border-brand/40">
                  {user?.photoURL ? (
                    <img src={user.photoURL} alt="p" className="w-full h-full object-cover" />
                  ) : (
                    user?.displayName?.[0] || 'G'
                  )}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-[#121212]" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <h4 className="text-xs font-bold text-white tracking-tight leading-tight group-hover:text-brand transition-colors">{user?.displayName || 'George Mogga'}</h4>
                <p className="text-[10px] text-gray-500 truncate">{user?.email || 'georgemogga1@gmail.com'}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-700 group-hover:text-white" />
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
            <LogOut className="w-4.5 h-4.5" />
          </button>
        )}
      </motion.div>
    </>
  );
}
