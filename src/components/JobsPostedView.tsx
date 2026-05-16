import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { NICHE } from '../config/niche';
import {
  MapPin,
  Users,
  Trash2,
  Search,
  Plus,
  Clock,
  ArrowUpRight,
  FileText,
  TrendingUp,
  ChevronRight,
} from 'lucide-react';
import { Job } from '../types';

interface JobsPostedViewProps {
  jobs: Job[];
  onSelectJob: (job: Job) => void;
  onDeleteJob: (id: string) => void;
  onNewRole?: () => void;
  onSeedDatabase?: () => void;
}

const INDUSTRY_CONFIG: Record<string, { border: string; mark: string; pill: string; pillText: string }> = {
  'Heavy Civil':         { border: 'border-l-orange-400',  mark: 'bg-orange-400',  pill: 'bg-orange-50 border-orange-200',  pillText: 'text-orange-700' },
  'Infrastructure':      { border: 'border-l-blue-400',    mark: 'bg-blue-400',    pill: 'bg-blue-50 border-blue-200',       pillText: 'text-blue-700' },
  'Road & Bridge':       { border: 'border-l-emerald-400', mark: 'bg-emerald-400', pill: 'bg-emerald-50 border-emerald-200', pillText: 'text-emerald-700' },
  'Heavy Highway':       { border: 'border-l-violet-400',  mark: 'bg-violet-400',  pill: 'bg-violet-50 border-violet-200',   pillText: 'text-violet-700' },
  'Marine Construction': { border: 'border-l-cyan-400',    mark: 'bg-cyan-400',    pill: 'bg-cyan-50 border-cyan-200',       pillText: 'text-cyan-700' },
};

function getIndustryCfg(industry: string) {
  return INDUSTRY_CONFIG[industry] ?? { border: 'border-l-gray-300', mark: 'bg-gray-400', pill: 'bg-gray-50 border-gray-200', pillText: 'text-gray-600' };
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

function candidateCount(index: number) { return 9 + (index * 3) % 18; }

// Pipeline stage distribution
const STAGES = ['Identified', 'Screen', 'Technical', 'On-site', 'Offer'];
const STAGE_COLORS = ['bg-gray-200', 'bg-orange-200', 'bg-orange-300', 'bg-orange-500', 'bg-orange-600'];

function pipelineStages(index: number) {
  const total = candidateCount(index);
  return [
    Math.round(total * 0.32),
    Math.round(total * 0.26),
    Math.round(total * 0.20),
    Math.round(total * 0.14),
    Math.round(total * 0.08),
  ];
}

function pipelineScore(stages: number[]): number {
  const total = stages.reduce((a, b) => a + b, 0);
  if (total === 0) return 0;
  const weighted = stages.reduce((sum, count, i) => sum + count * (i + 1), 0);
  return Math.round((weighted / (total * stages.length)) * 100);
}

function descriptionSnippet(desc: string, title: string): string {
  if (!desc) return '';
  // Strip HTML and normalise whitespace
  const clean = desc.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  // Skip if description just repeats the title (common when job title is pasted into description)
  const cleanLower = clean.toLowerCase();
  const titleLower = title.toLowerCase().replace(/[^a-z0-9]/g, '');
  const descStart = cleanLower.slice(0, title.length + 20).replace(/[^a-z0-9]/g, '');
  if (descStart.includes(titleLower.slice(0, 15))) return '';
  return clean.length > 160 ? clean.slice(0, 160).replace(/\s+\S*$/, '') + '…' : clean;
}

export const JobsPostedView: React.FC<JobsPostedViewProps> = ({ jobs, onSelectJob, onDeleteJob, onNewRole }) => {
  const [search, setSearch] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const filtered = jobs.filter(j =>
    j.title.toLowerCase().includes(search.toLowerCase()) ||
    j.location.toLowerCase().includes(search.toLowerCase()) ||
    j.industry.toLowerCase().includes(search.toLowerCase())
  );

  const totalCandidates = jobs.reduce((sum, _, i) => sum + candidateCount(i), 0);
  const avgPipeline = jobs.length > 0
    ? Math.round(jobs.reduce((sum, _, i) => sum + pipelineScore(pipelineStages(i)), 0) / jobs.length)
    : 0;

  return (
    <div className="w-full h-full bg-[#f7f7f8] overflow-y-auto">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-8 pt-7 pb-6">
          <div className="flex items-center justify-between mb-7">
            <div>
              <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">Active Jobs</h1>
              <p className="text-[13px] text-gray-400 mt-1">Manage your open roles and candidate pipelines</p>
            </div>
            <button
              onClick={onNewRole}
              className="flex items-center gap-2 px-4 py-2.5 bg-brand text-white text-[13px] font-semibold rounded-xl hover:bg-orange-600 active:scale-[0.98] transition-all shadow-sm shadow-brand/20"
            >
              <Plus className="w-4 h-4" />
              New Role
            </button>
          </div>

          {/* Stats bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              {[
                { value: jobs.length, label: 'Open Roles', icon: FileText, color: 'text-brand' },
                { value: totalCandidates, label: 'Total Candidates', icon: Users, color: 'text-emerald-500' },
                { value: `${avgPipeline}%`, label: 'Avg. Pipeline', icon: TrendingUp, color: 'text-violet-500' },
              ].map(stat => (
                <div key={stat.label} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center">
                    <stat.icon className={`w-3.5 h-3.5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-[18px] font-bold text-gray-900 leading-none">{stat.value}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search roles…"
                className="pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-brand/40 focus:bg-white transition-all w-56"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── List ───────────────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-8 py-7">

        {/* Column headers */}
        {filtered.length > 0 && (
          <div className="grid grid-cols-[1fr_148px_220px_88px_44px] gap-6 px-6 mb-3">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Role</span>
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Industry</span>
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Pipeline</span>
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest text-center">Candidates</span>
            <span />
          </div>
        )}

        <AnimatePresence mode="popLayout">
          {filtered.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
            >
              <div className="h-0.75 bg-linear-to-r from-brand/60 via-brand/20 to-transparent" />
              <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
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
            <div className="space-y-2.5">
              {filtered.map((job, index) => {
                const cfg = getIndustryCfg(job.industry);
                const count = candidateCount(index);
                const stages = pipelineStages(index);
                const score = pipelineScore(stages);
                const snippet = descriptionSnippet(job.description, job.title);
                const isDeleting = deleteConfirm === job.id;

                return (
                  <motion.div
                    key={job.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ delay: index * 0.04, duration: 0.18 }}
                    onClick={() => !isDeleting && onSelectJob(job)}
                    className={`group relative bg-white rounded-2xl border border-gray-100 border-l-[3px] ${cfg.border} shadow-sm hover:shadow-[0_4px_24px_rgba(0,0,0,0.07)] hover:border-gray-200 transition-all duration-200 cursor-pointer overflow-hidden`}
                  >
                    <div className="grid grid-cols-[1fr_148px_220px_88px_44px] gap-6 items-center px-6 py-4">

                      {/* Col 1: Title + meta */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="flex items-center gap-1.5 text-[11px] text-emerald-500 font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Active
                          </span>
                          <span className="text-gray-200">·</span>
                          <span className="flex items-center gap-1 text-[11px] text-gray-400">
                            <Clock className="w-3 h-3" />
                            {timeAgo(job.postedAt)}
                          </span>
                        </div>

                        <h2 className="text-[14px] font-bold text-gray-900 tracking-tight leading-tight truncate mb-1.5 group-hover:text-brand transition-colors duration-150">
                          {job.title}
                        </h2>

                        <div className="flex items-center gap-1.5 text-[12px] text-gray-400">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span className="truncate">{job.location}</span>
                        </div>

                        {snippet && (
                          <p className="text-[11px] text-gray-400 leading-relaxed mt-1.5 line-clamp-1">
                            {snippet}
                          </p>
                        )}
                      </div>

                      {/* Col 2: Industry */}
                      <div>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold ${cfg.pill} ${cfg.pillText}`}>
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.mark}`} />
                          {job.industry}
                        </span>
                      </div>

                      {/* Col 3: Pipeline — segmented horizontal bar */}
                      <div>
                        {/* Segmented bar */}
                        <div className="flex items-center gap-0.5 mb-2.5">
                          {stages.map((s, i) => {
                            const total = stages.reduce((a, b) => a + b, 0);
                            const pct = total > 0 ? Math.max(4, Math.round((s / total) * 100)) : 20;
                            return (
                              <div
                                key={i}
                                title={`${STAGES[i]}: ${s} candidates`}
                                className={`h-2 rounded-sm ${STAGE_COLORS[i]} first:rounded-l-full last:rounded-r-full`}
                                style={{ width: `${pct}%` }}
                              />
                            );
                          })}
                        </div>
                        {/* Stage labels */}
                        <div className="flex items-center justify-between">
                          {STAGES.map((label, i) => (
                            <div key={i} className="flex flex-col items-center gap-0.5">
                              <span className="text-[9px] text-gray-400 font-medium leading-none">{stages[i]}</span>
                              <span className="text-[9px] text-gray-300 leading-none">{label.split(' ')[0]}</span>
                            </div>
                          ))}
                        </div>
                        {/* Score */}
                        <div className="flex items-center justify-end mt-1.5">
                          <span className="text-[11px] font-bold text-brand">{score}% filled</span>
                        </div>
                      </div>

                      {/* Col 4: Candidates */}
                      <div className="text-center">
                        <p className="text-[24px] font-bold text-gray-900 leading-none tabular-nums">{count}</p>
                        <p className="text-[10px] text-gray-400 mt-1 flex items-center justify-center gap-1">
                          <Users className="w-3 h-3" />
                          candidates
                        </p>
                      </div>

                      {/* Col 5: Actions */}
                      <div className="flex items-center justify-end" onClick={e => e.stopPropagation()}>
                        <AnimatePresence mode="wait">
                          {isDeleting ? (
                            <motion.div
                              key="confirm"
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0 }}
                              className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-lg z-10"
                            >
                              <span className="text-[12px] text-gray-600 font-medium">Remove this role?</span>
                              <button
                                onClick={() => { onDeleteJob(job.id); setDeleteConfirm(null); }}
                                className="px-2.5 py-1 bg-red-500 text-white text-[11px] font-semibold rounded-lg hover:bg-red-600 transition-colors"
                              >
                                Remove
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(null)}
                                className="px-2.5 py-1 bg-gray-100 text-gray-600 text-[11px] font-semibold rounded-lg hover:bg-gray-200 transition-colors"
                              >
                                Cancel
                              </button>
                            </motion.div>
                          ) : (
                            <motion.div
                              key="normal"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="flex items-center gap-1"
                            >
                              <button
                                onClick={() => setDeleteConfirm(job.id)}
                                className="p-1.5 rounded-lg text-gray-200 hover:text-red-400 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                              <div className="p-1.5 rounded-lg text-gray-300 group-hover:text-brand group-hover:bg-brand/5 transition-all">
                                <ChevronRight className="w-4 h-4" />
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
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
