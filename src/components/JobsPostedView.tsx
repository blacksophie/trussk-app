import React, { useState } from 'react';
import { motion } from 'motion/react';
import { NICHE } from '../config/niche';
import {
  Briefcase,
  MapPin,
  Calendar,
  Users,
  Trash2,
  Search,
  Plus,
  ChevronRight,
  Clock,
  TrendingUp,
  Zap,
  MoreHorizontal,
} from 'lucide-react';
import { Job } from '../types';

interface JobsPostedViewProps {
  jobs: Job[];
  onSelectJob: (job: Job) => void;
  onDeleteJob: (id: string) => void;
  onNewRole?: () => void;
  onSeedDatabase?: () => void;
}

const INDUSTRY_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  'Heavy Civil':       { bg: 'bg-orange-50',  text: 'text-orange-600',  dot: 'bg-orange-400' },
  'Infrastructure':    { bg: 'bg-blue-50',    text: 'text-blue-600',    dot: 'bg-blue-400' },
  'Road & Bridge':     { bg: 'bg-emerald-50', text: 'text-emerald-600', dot: 'bg-emerald-400' },
  'Heavy Highway':     { bg: 'bg-violet-50',  text: 'text-violet-600',  dot: 'bg-violet-400' },
  'Marine Construction':{ bg: 'bg-cyan-50',   text: 'text-cyan-600',    dot: 'bg-cyan-400' },
};

function getIndustryStyle(industry: string) {
  return INDUSTRY_COLORS[industry] || { bg: 'bg-gray-50', text: 'text-gray-600', dot: 'bg-gray-400' };
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

export const JobsPostedView: React.FC<JobsPostedViewProps> = ({ jobs, onSelectJob, onDeleteJob, onNewRole }) => {
  const [search, setSearch] = useState('');
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const filtered = jobs.filter(j =>
    j.title.toLowerCase().includes(search.toLowerCase()) ||
    j.location.toLowerCase().includes(search.toLowerCase()) ||
    j.industry.toLowerCase().includes(search.toLowerCase())
  );

  const totalCandidates = jobs.length * 14; // mock

  return (
    <div className="w-full h-full bg-[#fafafa] overflow-y-auto scrollbar-hide">

      {/* Page Header */}
      <div className="bg-white border-b border-gray-100 px-8 py-5">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-6">
          <div>
            <h1 className="text-base font-semibold text-gray-900 tracking-tight">Active Jobs</h1>
            <p className="text-xs text-gray-400 mt-0.5">Manage your open roles and candidate pipelines</p>
          </div>

          {/* Stats */}
          <div className="hidden md:flex items-center gap-6">
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-900 leading-none">{jobs.length}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Open Roles</p>
            </div>
            <div className="w-px h-8 bg-gray-100" />
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-900 leading-none">{totalCandidates}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Candidates</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search roles..."
                className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-brand/40 focus:bg-white transition-all w-44"
              />
            </div>
            <button onClick={onNewRole} className="flex items-center gap-1.5 px-3 py-2 bg-brand text-white text-xs font-medium rounded-lg hover:bg-brand/90 transition-all shadow-sm shadow-brand/20">
              <Plus className="w-3.5 h-3.5" />
              New Role
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-8 py-6">
        {filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
          >
            {/* Empty state header band */}
            <div className="h-1 w-full bg-gradient-to-r from-brand/60 via-brand/20 to-transparent" />
            <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
              <div className="w-14 h-14 bg-brand/5 border border-brand/10 rounded-2xl flex items-center justify-center mb-5 shadow-inner">
                <Briefcase className="w-6 h-6 text-brand/50" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">No roles posted yet</h3>
              <p className="text-xs text-gray-400 max-w-xs leading-relaxed mb-6">
                Post your first job and {NICHE.appName} will automatically identify and rank the best candidates for you.
              </p>
              <button onClick={onNewRole} className="flex items-center gap-2 px-4 py-2.5 bg-brand text-white text-xs font-medium rounded-lg hover:bg-brand/90 transition-all shadow-sm shadow-brand/20">
                <Plus className="w-3.5 h-3.5" />
                Post your first role
              </button>
            </div>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {filtered.map((job, index) => {
              const style = getIndustryStyle(job.industry);
              const candidateCount = 12 + (index * 3);
              const isHovered = hoveredId === job.id;

              return (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => onSelectJob(job)}
                  onMouseEnter={() => setHoveredId(job.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className="group bg-white rounded-xl border border-gray-100 hover:border-brand/25 shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden"
                >
                  {/* Top accent line on hover */}
                  <div className={`h-[2px] w-full transition-all duration-300 ${isHovered ? 'bg-brand' : 'bg-transparent'}`} />

                  <div className="flex items-center gap-5 px-5 py-4">

                    {/* Icon */}
                    <div className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0 group-hover:bg-brand/5 group-hover:border-brand/20 transition-all">
                      <Briefcase className="w-4 h-4 text-gray-400 group-hover:text-brand transition-colors" />
                    </div>

                    {/* Title + meta */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-semibold text-gray-900 truncate group-hover:text-brand transition-colors">
                          {job.title}
                        </h3>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                          <span className="text-[10px] text-green-500 font-medium">Active</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-gray-400">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {job.location}
                        </span>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {timeAgo(job.postedAt)}
                        </span>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {candidateCount} candidates
                        </span>
                      </div>
                    </div>

                    {/* Industry badge */}
                    <div className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full ${style.bg} flex-shrink-0`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                      <span className={`text-[10px] font-medium ${style.text}`}>{job.industry}</span>
                    </div>

                    {/* Pipeline health */}
                    <div className="hidden lg:flex flex-col gap-1.5 w-28 flex-shrink-0">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-gray-400">Pipeline</span>
                        <span className="text-[10px] font-semibold text-brand">84%</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-brand rounded-full w-[84%]" />
                      </div>
                    </div>

                    <div className="hidden md:flex items-center gap-1.5 flex-shrink-0">
                      <Zap className="w-3.5 h-3.5 text-brand" />
                      <span className="text-[10px] font-medium text-gray-500">Active</span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={e => { e.stopPropagation(); onSelectJob(job); }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-brand hover:bg-brand/5 transition-all"
                      >
                        <TrendingUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          if (confirm('Remove this role?')) onDeleteJob(job.id);
                        }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <button className="p-1.5 rounded-lg text-gray-300 hover:text-gray-600 transition-all">
                        <MoreHorizontal className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <ChevronRight className="w-4 h-4 text-gray-200 group-hover:text-brand group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
