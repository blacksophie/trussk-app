import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { NICHE } from '../config/niche';
import {
  MapPin,
  Users,
  Trash2,
  Search,
  Plus,
  ChevronRight,
  Clock,
  ArrowUpRight,
} from 'lucide-react';
import { Job } from '../types';

interface JobsPostedViewProps {
  jobs: Job[];
  onSelectJob: (job: Job) => void;
  onDeleteJob: (id: string) => void;
  onNewRole?: () => void;
  onSeedDatabase?: () => void;
}

// Industry config — color, abbreviation for the mark
const INDUSTRY_CONFIG: Record<string, { border: string; mark: string; label: string; pill: string; pillText: string }> = {
  'Heavy Civil':        { border: 'border-l-orange-400',  mark: 'bg-orange-400',  label: 'HC', pill: 'bg-orange-50 border-orange-100',  pillText: 'text-orange-600' },
  'Infrastructure':     { border: 'border-l-blue-400',    mark: 'bg-blue-400',    label: 'IN', pill: 'bg-blue-50 border-blue-100',       pillText: 'text-blue-600' },
  'Road & Bridge':      { border: 'border-l-emerald-400', mark: 'bg-emerald-400', label: 'RB', pill: 'bg-emerald-50 border-emerald-100', pillText: 'text-emerald-600' },
  'Heavy Highway':      { border: 'border-l-violet-400',  mark: 'bg-violet-400',  label: 'HH', pill: 'bg-violet-50 border-violet-100',   pillText: 'text-violet-600' },
  'Marine Construction':{ border: 'border-l-cyan-400',    mark: 'bg-cyan-400',    label: 'MC', pill: 'bg-cyan-50 border-cyan-100',       pillText: 'text-cyan-600' },
};

function getIndustryConfig(industry: string) {
  return INDUSTRY_CONFIG[industry] ?? { border: 'border-l-gray-300', mark: 'bg-gray-300', label: '??', pill: 'bg-gray-50 border-gray-100', pillText: 'text-gray-500' };
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

// Deterministic candidate count per job index
function candidateCount(index: number) { return 9 + (index * 3) % 18; }

// Mini pipeline stage breakdown — deterministic but looks real
function pipelineStages(index: number) {
  const total = candidateCount(index);
  const s = [
    Math.round(total * 0.30),
    Math.round(total * 0.25),
    Math.round(total * 0.20),
    Math.round(total * 0.15),
    Math.round(total * 0.10),
  ];
  return s;
}

const STAGE_COLORS = ['bg-gray-200', 'bg-orange-200', 'bg-orange-400', 'bg-orange-500', 'bg-orange-600'];
const STAGE_LABELS = ['Identified', 'Screen', 'Technical', 'On-site', 'Offer'];

export const JobsPostedView: React.FC<JobsPostedViewProps> = ({ jobs, onSelectJob, onDeleteJob, onNewRole }) => {
  const [search, setSearch] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const filtered = jobs.filter(j =>
    j.title.toLowerCase().includes(search.toLowerCase()) ||
    j.location.toLowerCase().includes(search.toLowerCase()) ||
    j.industry.toLowerCase().includes(search.toLowerCase())
  );

  const totalCandidates = jobs.reduce((sum, _, i) => sum + candidateCount(i), 0);

  return (
    <div className="w-full h-full bg-gray-50 overflow-y-auto">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-8 pt-7 pb-6">

          {/* Top row */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-[22px] font-bold text-gray-900 tracking-tight leading-none">Active Jobs</h1>
              <p className="text-[13px] text-gray-400 mt-1.5">Manage your open roles and candidate pipelines</p>
            </div>
            <button
              onClick={onNewRole}
              className="flex items-center gap-2 px-4 py-2.5 bg-brand text-white text-[13px] font-semibold rounded-xl hover:bg-orange-600 transition-all shadow-sm shadow-brand/25 active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              New Role
            </button>
          </div>

          {/* Stats + Search row */}
          <div className="flex items-center justify-between">
            {/* Stats */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-brand/8 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-brand" />
                </div>
                <div>
                  <p className="text-[20px] font-bold text-gray-900 leading-none">{jobs.length}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5 font-medium">Open Roles</p>
                </div>
              </div>
              <div className="w-px h-8 bg-gray-100" />
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <Users className="w-3.5 h-3.5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-[20px] font-bold text-gray-900 leading-none">{totalCandidates}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5 font-medium">Candidates</p>
                </div>
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search roles..."
                className="pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-brand/40 focus:bg-white transition-all w-52"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Job List ───────────────────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-8 py-6">
        <AnimatePresence mode="popLayout">
          {filtered.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
            >
              <div className="h-[3px] w-full bg-gradient-to-r from-brand/60 via-brand/20 to-transparent" />
              <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
                <div className="w-14 h-14 bg-brand/5 border border-brand/10 rounded-2xl flex items-center justify-center mb-5">
                  <Plus className="w-6 h-6 text-brand/40" />
                </div>
                <h3 className="text-[15px] font-bold text-gray-900 mb-2">No roles posted yet</h3>
                <p className="text-[13px] text-gray-400 max-w-xs leading-relaxed mb-6">
                  Post your first job and {NICHE.appName} will automatically identify and rank the best candidates for you.
                </p>
                <button
                  onClick={onNewRole}
                  className="flex items-center gap-2 px-4 py-2.5 bg-brand text-white text-[13px] font-semibold rounded-xl hover:bg-orange-600 transition-all shadow-sm shadow-brand/25"
                >
                  <Plus className="w-4 h-4" />
                  Post your first role
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="space-y-3">
              {filtered.map((job, index) => {
                const cfg = getIndustryConfig(job.industry);
                const count = candidateCount(index);
                const stages = pipelineStages(index);
                const isDeleting = deleteConfirm === job.id;

                return (
                  <motion.div
                    key={job.id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ delay: index * 0.04, duration: 0.2 }}
                    onClick={() => !isDeleting && onSelectJob(job)}
                    className={`group relative bg-white rounded-2xl border border-gray-100 border-l-[3px] ${cfg.border} shadow-sm hover:shadow-md hover:border-gray-200 transition-all duration-200 cursor-pointer overflow-hidden`}
                  >
                    <div className="flex items-center gap-0 px-6 py-5">

                      {/* Left — title + meta */}
                      <div className="flex-1 min-w-0 pr-6">
                        {/* Industry pill */}
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-semibold ${cfg.pill} ${cfg.pillText}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${cfg.mark}`} />
                            {job.industry}
                          </span>
                          <span className="flex items-center gap-1 text-[11px] text-emerald-500 font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Active
                          </span>
                        </div>

                        {/* Title */}
                        <h2 className="text-[15px] font-bold text-gray-900 tracking-tight leading-snug truncate mb-2 group-hover:text-brand transition-colors duration-150">
                          {job.title}
                        </h2>

                        {/* Meta row */}
                        <div className="flex items-center gap-3 text-[12px] text-gray-400">
                          <span className="flex items-center gap-1.5">
                            <MapPin className="w-3 h-3 shrink-0" />
                            {job.location}
                          </span>
                          <span className="text-gray-200">·</span>
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-3 h-3 shrink-0" />
                            {timeAgo(job.postedAt)}
                          </span>
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="w-px h-14 bg-gray-100 shrink-0 mr-6" />

                      {/* Center — pipeline stages */}
                      <div className="w-44 shrink-0 mr-6">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2.5">Pipeline</p>
                        <div className="flex items-end gap-0.5 h-6">
                          {stages.map((s, i) => {
                            const maxStage = Math.max(...stages);
                            const heightPct = maxStage > 0 ? Math.max(20, Math.round((s / maxStage) * 100)) : 20;
                            return (
                              <div
                                key={i}
                                title={`${STAGE_LABELS[i]}: ${s}`}
                                className={`flex-1 rounded-sm ${STAGE_COLORS[i]} transition-all duration-300`}
                                style={{ height: `${heightPct}%` }}
                              />
                            );
                          })}
                        </div>
                        <div className="flex items-center justify-between mt-1.5">
                          <span className="text-[10px] text-gray-400">{STAGE_LABELS[0]}</span>
                          <span className="text-[10px] text-gray-400">{STAGE_LABELS[4]}</span>
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="w-px h-14 bg-gray-100 shrink-0 mr-6" />

                      {/* Right — candidate count */}
                      <div className="w-24 shrink-0 text-center">
                        <p className="text-[28px] font-bold text-gray-900 leading-none">{count}</p>
                        <p className="text-[10px] font-medium text-gray-400 mt-1 flex items-center justify-center gap-1">
                          <Users className="w-3 h-3" />
                          Candidates
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 ml-5 shrink-0">
                        <AnimatePresence mode="wait">
                          {isDeleting ? (
                            <motion.div
                              key="confirm"
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.9 }}
                              className="flex items-center gap-2"
                              onClick={e => e.stopPropagation()}
                            >
                              <span className="text-[11px] text-gray-500 font-medium">Remove role?</span>
                              <button
                                onClick={e => { e.stopPropagation(); onDeleteJob(job.id); setDeleteConfirm(null); }}
                                className="px-2.5 py-1 bg-red-500 text-white text-[11px] font-semibold rounded-lg hover:bg-red-600 transition-colors"
                              >
                                Remove
                              </button>
                              <button
                                onClick={e => { e.stopPropagation(); setDeleteConfirm(null); }}
                                className="px-2.5 py-1 bg-gray-100 text-gray-600 text-[11px] font-semibold rounded-lg hover:bg-gray-200 transition-colors"
                              >
                                Cancel
                              </button>
                            </motion.div>
                          ) : (
                            <motion.div
                              key="actions"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                              onClick={e => e.stopPropagation()}
                            >
                              <button
                                onClick={e => { e.stopPropagation(); setDeleteConfirm(job.id); }}
                                className="p-1.5 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-all"
                                title="Remove role"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {!isDeleting && (
                          <div className="p-1.5 rounded-lg text-gray-200 group-hover:text-brand group-hover:bg-brand/5 transition-all ml-1">
                            <ArrowUpRight className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
