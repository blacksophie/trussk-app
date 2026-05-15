import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, MoreHorizontal, UserCheck, Linkedin, ExternalLink, Mail, Phone, ShieldCheck, ArrowUpDown, ChevronDown, SortAsc, SortDesc, Briefcase, ChevronRight } from 'lucide-react';
import { Candidate } from '../types';

type SortKey = 'score' | 'priority' | 'name';
type SortOrder = 'asc' | 'desc';

interface CandidateListViewProps {
  jobTitle?: string;
  candidates: Candidate[];
  onSelectCandidate: (candidate: Candidate) => void;
  onBack: () => void;
}

export default function CandidateListView({ jobTitle, candidates, onSelectCandidate, onBack }: CandidateListViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('score');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [isSortOpen, setIsSortOpen] = useState(false);

  const getPriorityValue = (priority: string) => {
    if (priority.includes('TOP 5')) return 100;
    if (priority.includes('TOP 10')) return 90;
    if (priority.includes('TOP 20')) return 80;
    if (priority.includes('DROPPED') || priority.includes('DROP')) return 0;
    return 50;
  };

  const filteredAndSortedCandidates = useMemo(() => {
    let result = [...candidates];

    // Filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(c => 
        c.fullName.toLowerCase().includes(query) || 
        c.title.toLowerCase().includes(query) || 
        c.company.toLowerCase().includes(query)
      );
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'score') {
        comparison = a.score - b.score;
      } else if (sortBy === 'priority') {
        comparison = getPriorityValue(a.priority) - getPriorityValue(b.priority);
      } else if (sortBy === 'name') {
        comparison = a.fullName.localeCompare(b.fullName);
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [candidates, searchQuery, sortBy, sortOrder]);

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  const sortOptions: { key: SortKey; label: string }[] = [
    { key: 'score', label: 'Match Score' },
    { key: 'priority', label: 'Priority' },
    { key: 'name', label: 'Candidate Name' },
  ];
  return (
    <div className="w-full h-full flex flex-col p-4 md:p-8 pb-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <button 
            onClick={onBack}
            className="text-sm text-gray-500 hover:text-white transition-colors mb-2 flex items-center gap-2"
          >
            ← <span className="hidden md:inline">Back to Job Board</span><span className="md:hidden">Back</span>
          </button>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            Candidates <span className="text-gray-500">{candidates.length}</span>
          </h1>
          <p className="text-xs md:text-sm text-gray-500 truncate max-w-[200px] md:max-w-none">{jobTitle || 'Heavy Civil Project'}</p>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search candidates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#111111] border border-white/10 rounded-xl py-2.5 pl-12 pr-4 text-sm text-gray-200 focus:outline-none focus:border-brand/40 transition-colors font-bold uppercase tracking-widest"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:flex-none">
              <button 
                onClick={() => setIsSortOpen(!isSortOpen)}
                className="w-full md:w-48 flex items-center justify-between gap-2 px-4 py-2.5 bg-[#111111] border border-white/10 rounded-xl text-xs font-semibold text-gray-400 uppercase tracking-[0.1em] hover:border-white/20 transition-all transition-colors"
              >
                <div className="flex items-center gap-2">
                  <ArrowUpDown className="w-3.5 h-3.5 text-brand" />
                  <span>Sort: {sortOptions.find(o => o.key === sortBy)?.label}</span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isSortOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {isSortOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-20" 
                      onClick={() => setIsSortOpen(false)} 
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute top-full left-0 right-0 mt-2 bg-[#111111] border border-white/10 rounded-xl shadow-2xl z-30 overflow-hidden"
                    >
                      {sortOptions.map((option) => (
                        <button
                          key={option.key}
                          onClick={() => {
                            setSortBy(option.key);
                            setIsSortOpen(false);
                          }}
                          className={`w-full px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.15em] transition-colors ${
                            sortBy === option.key ? 'bg-brand text-black' : 'text-gray-400 hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            <button 
              onClick={toggleSortOrder}
              className="p-2.5 bg-[#111111] border border-white/10 rounded-xl text-gray-400 hover:text-brand hover:border-brand/40 transition-all shadow-sm"
              title={sortOrder === 'asc' ? 'Sort Ascending' : 'Sort Descending'}
            >
              {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto scrollbar-hide border border-white/5 rounded-t-xl">
        {/* Desktop Table View */}
        <div className="hidden md:block">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-[#0a0a0a] z-10">
              <tr className="border-b border-white/5 uppercase text-[10px] tracking-wider text-gray-500 font-bold">
                <th className="px-6 py-4 font-semibold">Priority</th>
                <th className="px-6 py-4 font-semibold">Candidate</th>
                <th className="px-6 py-4 font-semibold text-center md:text-left">Work History</th>
                <th className="px-6 py-4 font-semibold">Match Score</th>
                <th className="px-6 py-4 font-semibold">Stage</th>
                <th className="px-6 py-4 font-semibold">Outreach Status</th>
                <th className="px-6 py-4 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedCandidates.map((candidate) => (
                <tr 
                  key={candidate.id}
                  onClick={() => onSelectCandidate(candidate)}
                  className="group border-b border-white/5 hover:bg-white/[0.02] transition-colors cursor-pointer"
                >
                  <td className="px-6 py-5">
                     <div className={`inline-flex px-2 py-0.5 rounded text-[9px] font-semibold uppercase tracking-[0.1em] border ${
                      candidate.priority.includes('TOP 5') 
                        ? 'bg-brand border-white/20 text-black' 
                        : candidate.priority.includes('TOP 10')
                        ? 'bg-white/10 border-white/20 text-white'
                        : candidate.priority.includes('DROPPED') || candidate.priority.includes('DROP')
                        ? 'bg-red-500/20 border-red-500/30 text-red-500'
                        : 'bg-white/5 border-white/10 text-gray-500'
                    }`}>
                      {candidate.priority}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 font-bold text-sm group-hover:border-brand/40 group-hover:text-brand transition-all overflow-hidden">
                        {candidate.avatarUrl || (candidate.linkedInUrl && candidate.linkedInUrl.includes('linkedin.com/in/')) ? (
                          <img 
                            src={candidate.avatarUrl || `https://unavatar.io/linkedin/${candidate.linkedInUrl.split('/in/')[1].split('/')[0].split('?')[0]}`} 
                            alt={candidate.fullName} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span>{candidate.firstName?.[0] ?? ''}{candidate.fullName?.split(' ').pop()?.[0] ?? ''}</span>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-white group-hover:text-brand transition-colors text-sm">{candidate.fullName}</p>
                          <a 
                            href={candidate.linkedInUrl} 
                            target="_blank" 
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-1 rounded hover:bg-white/10 text-gray-600 hover:text-[#0077B5] transition-all"
                          >
                            <Linkedin className="w-2.5 h-2.5" />
                          </a>
                        </div>
                        <p className="text-[11px] text-gray-500">{candidate.title}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="space-y-0.5">
                      <p className="text-xs text-gray-300 font-semibold">{candidate.company}</p>
                      <p className="text-[10px] text-gray-500 uppercase font-medium">{candidate.yearsExperience} Experience</p>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-semibold ${
                        candidate.score > 90 ? 'text-green-500' : candidate.score > 70 ? 'text-amber-500' : 'text-gray-600'
                      }`}>
                        {candidate.score}%
                      </span>
                      <div className="w-16 h-1 bg-white/5 rounded-full overflow-hidden hidden lg:block">
                        <div 
                          className={`h-full rounded-full ${
                            candidate.score > 90 ? 'bg-green-500' : candidate.score > 70 ? 'bg-amber-500' : 'bg-gray-600'
                          }`}
                          style={{ width: `${candidate.score}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="inline-flex px-2 py-1 rounded bg-white/5 border border-white/10 text-[10px] font-bold text-gray-400 uppercase tracking-tight">
                      {candidate.stage}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                      candidate.email || candidate.phone ? 'bg-blue-500/10 border-blue-500/20 text-blue-500' : 'bg-white/5 border-white/10 text-gray-500'
                    }`}>
                      {candidate.email || candidate.phone ? (
                        <>
                          <div className="w-1 h-1 rounded-full bg-blue-500" />
                          Ready
                        </>
                      ) : 'Pending Data'}
                    </div>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <button className="p-2 text-gray-600 hover:text-white transition-colors">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-white/5 pb-20">
          {filteredAndSortedCandidates.map((candidate) => (
            <div 
              key={candidate.id}
              onClick={() => onSelectCandidate(candidate)}
              className="p-5 active:bg-white/[0.03] transition-all cursor-pointer group relative"
            >
              <div className="flex items-start justify-between mb-5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 font-semibold text-lg group-active:border-brand/40 group-active:text-brand transition-all overflow-hidden">
                    {candidate.avatarUrl || (candidate.linkedInUrl && candidate.linkedInUrl.includes('linkedin.com/in/')) ? (
                      <img 
                        src={candidate.avatarUrl || `https://unavatar.io/linkedin/${candidate.linkedInUrl.split('/in/')[1].split('/')[0].split('?')[0]}`} 
                        alt={candidate.fullName} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>{candidate.firstName[0]}{candidate.fullName.split(' ').pop()?.[0]}</span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-white text-base tracking-tight flex items-center gap-2">
                      {candidate.fullName}
                      <AnimatePresence>
                        {candidate.score > 90 && (
                          <motion.div 
                            initial={{ scale: 0 }} 
                            animate={{ scale: 1 }} 
                            className="w-1.5 h-1.5 rounded-full bg-green-500" 
                          />
                        )}
                      </AnimatePresence>
                    </h3>
                    <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">{candidate.title}</p>
                  </div>
                </div>
                <div className={`px-2.5 py-1 rounded-lg text-[9px] font-semibold uppercase tracking-[0.15em] border shadow-sm ${
                  candidate.priority.includes('TOP 5') 
                    ? 'bg-brand border-white/20 text-black shadow-brand/10' 
                    : candidate.priority.includes('TOP 10')
                    ? 'bg-white/10 border-white/20 text-white'
                    : candidate.priority.includes('DROPPED')
                    ? 'bg-red-500/10 border-red-500/20 text-red-500'
                    : 'bg-white/5 border-white/10 text-gray-500'
                }`}>
                  {candidate.priority}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="bg-[#111111] border border-white/5 rounded-2xl p-3.5 flex flex-col gap-1.5">
                   <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-[0.2em]">Match</p>
                   <div className="flex items-end gap-1.5">
                     <p className={`text-xl font-semibold italic leading-none ${
                        candidate.score > 90 ? 'text-green-500' : candidate.score > 70 ? 'text-amber-500' : 'text-gray-400'
                      }`}>{candidate.score}%</p>
                   </div>
                </div>
                <div className="bg-[#111111] border border-white/5 rounded-2xl p-3.5 flex flex-col gap-1.5">
                   <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-[0.2em]">Stage</p>
                   <p className="text-sm font-semibold text-white uppercase tracking-tight truncate">{candidate.stage}</p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                   <div className="flex items-center gap-2">
                     <Briefcase className="w-3 h-3 text-brand/60" />
                     <p className="text-xs font-bold text-gray-300">{candidate.company}</p>
                   </div>
                   <div className="flex items-center gap-2 pl-5">
                     <p className="text-[10px] text-gray-500 uppercase font-semibold tracking-widest">{candidate.yearsExperience}</p>
                   </div>
                </div>
                
                <div className="flex items-center gap-1.5 text-brand group-hover:translate-x-1 transition-transform">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.2em]">View</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>

              {/* Verified Badge Overlay if applicable */}
              {(candidate.email || candidate.phone) && (
                <div className="absolute top-3 left-3">
                   <div className="w-2.5 h-2.5 bg-blue-500 rounded-full border-2 border-black" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
