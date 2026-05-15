import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  Filter,
  ChevronRight,
  ChevronLeft,
  MoreHorizontal,
  Mail,
  Send,
  Linkedin,
  Clock,
  MapPin,
  Briefcase,
  Star,
  CheckCircle2,
  ShieldCheck,
  ExternalLink,
  Plus,
  MessageSquare,
  FileText,
  Layers,
  Users,
  Save,
  Sparkles,
  Activity,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  Shield,
  Zap,
  BarChart3
} from 'lucide-react';
import { Candidate, Stage } from '../types';
import { COMPANY_SIGNALS } from '../data/signals';

interface CandidateWorkspaceProps {
  jobTitle?: string;
  candidates: Candidate[];
  selectedCandidate: Candidate | null;
  onSelectCandidate: (candidate: Candidate) => void;
  onUpdateStage: (id: string, stage: Stage) => void;
  onSaveNotes: (id: string, notes: string) => void;
}

export default function CandidateWorkspace({
  jobTitle,
  candidates,
  selectedCandidate,
  onSelectCandidate,
  onUpdateStage,
  onSaveNotes
}: CandidateWorkspaceProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'details' | 'resume' | 'pipeline' | 'interviews' | 'intel'>('details');
  const [localNotes, setLocalNotes] = useState<string>('');

  const companySignal = useMemo(() => {
    if (!selectedCandidate) return null;
    return COMPANY_SIGNALS.find(s =>
      selectedCandidate.company.toLowerCase().includes(s.company.toLowerCase()) ||
      s.company.toLowerCase().includes(selectedCandidate.company.toLowerCase())
    );
  }, [selectedCandidate?.company]);

  React.useEffect(() => {
    if (selectedCandidate) {
      setLocalNotes(selectedCandidate.validationNotes || '');
    }
  }, [selectedCandidate?.id, selectedCandidate?.validationNotes]);

  const filteredCandidates = useMemo(() => {
    return candidates.filter(c =>
      c.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.company.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [candidates, searchQuery]);

  React.useEffect(() => {
    if (!selectedCandidate && filteredCandidates.length > 0) {
      onSelectCandidate(filteredCandidates[0]);
    }
  }, [filteredCandidates, selectedCandidate, onSelectCandidate]);

  return (
    <div className="flex h-full w-full overflow-hidden bg-[#fafafa]">
      {/* Left panel — candidate list */}
      <div className="w-72 flex-shrink-0 border-r border-gray-100 bg-white flex flex-col">
        <div className="p-4 pb-3">
          <p className="text-[11px] text-gray-400 font-medium mb-3">
            {candidates.length} candidates
          </p>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300" />
            <input
              type="text"
              placeholder="Search candidates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-100 rounded-lg text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:border-brand/30 bg-[#fafafa]"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide">
          <div className="px-2 pb-4 space-y-0.5">
            {filteredCandidates.map((candidate) => {
              const isActive = selectedCandidate?.id === candidate.id;
              return (
                <button
                  key={candidate.id}
                  onClick={() => onSelectCandidate(candidate)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left border-l-2 ${
                    isActive
                      ? 'bg-white border-l-brand shadow-sm'
                      : 'border-l-transparent hover:bg-gray-50'
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 text-gray-500 font-semibold text-xs overflow-hidden">
                    {candidate.avatarUrl || (candidate.linkedInUrl && candidate.linkedInUrl.includes('linkedin.com/in/')) ? (
                      <img
                        src={candidate.avatarUrl || `https://unavatar.io/linkedin/${candidate.linkedInUrl.split('/in/')[1].split('/')[0].split('?')[0]}`}
                        alt={candidate.fullName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <>{candidate.firstName?.[0] ?? ''}{candidate.lastName?.[0] ?? ''}</>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1.5">
                      <p className={`text-sm font-medium truncate ${isActive ? 'text-gray-900' : 'text-gray-700'}`}>
                        {candidate.fullName}
                      </p>
                      <span className="flex items-center gap-0.5 text-[10px] text-amber-500 font-medium flex-shrink-0">
                        <Star className="w-2.5 h-2.5 fill-current" />
                        {(candidate.score / 20).toFixed(1)}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400 font-medium truncate mt-0.5">
                      {candidate.title}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main detail panel */}
      <div className="flex-1 flex flex-col bg-[#fafafa] overflow-hidden relative">
        {selectedCandidate ? (
          <>
            {/* Header */}
            <div className="px-5 pt-4 pb-0 border-b border-gray-100 bg-white">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-sm font-semibold text-gray-400 overflow-hidden">
                    {selectedCandidate.avatarUrl || (selectedCandidate.linkedInUrl && selectedCandidate.linkedInUrl.includes('linkedin.com/in/')) ? (
                      <img
                        src={selectedCandidate.avatarUrl || `https://unavatar.io/linkedin/${selectedCandidate.linkedInUrl.split('/in/')[1].split('/')[0].split('?')[0]}`}
                        alt={selectedCandidate.fullName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <>{selectedCandidate.firstName?.[0] ?? ''}{selectedCandidate.lastName?.[0] ?? ''}</>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <h1 className="text-base font-semibold text-gray-900">{selectedCandidate.fullName}</h1>
                      <span className="bg-green-50 text-green-600 text-[10px] font-medium rounded-full px-2 py-0.5">Active</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs text-gray-400">{selectedCandidate.title}</p>
                      <span className="text-gray-200">·</span>
                      <p className="text-xs text-gray-400">{selectedCandidate.company}</p>
                      <span className="text-gray-200">·</span>
                      <span className="flex items-center gap-0.5 text-xs text-amber-500 font-medium">
                        <Star className="w-3 h-3 fill-current" />
                        {(selectedCandidate.score / 20).toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex border border-gray-100 rounded-lg overflow-hidden">
                    <button className="p-2 hover:bg-gray-50 transition-colors border-r border-gray-100">
                      <ChevronLeft className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                    <button className="p-2 hover:bg-gray-50 transition-colors">
                      <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                  </div>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-100 hover:bg-gray-50 transition-all text-xs font-medium text-gray-600">
                    <MessageSquare className="w-3.5 h-3.5" />
                    Message
                  </button>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-100 hover:bg-gray-50 transition-all text-xs font-medium text-gray-600">
                    <Mail className="w-3.5 h-3.5" />
                    Email
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex items-center gap-5">
                {[
                  { id: 'details', label: 'Details', icon: FileText },
                  { id: 'intel', label: 'Intel', icon: Sparkles },
                  { id: 'resume', label: 'Resume', icon: FileText },
                  { id: 'pipeline', label: 'Pipeline', icon: Layers },
                  { id: 'interviews', label: 'Interviews', icon: Users },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`pb-3.5 text-xs font-medium transition-all relative flex items-center gap-1.5 ${
                      activeTab === tab.id ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    {tab.id === 'intel' && <Sparkles className="w-3 h-3" />}
                    {tab.label}
                    {activeTab === tab.id && (
                      <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-[2px] bg-brand rounded-full" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Content area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">

              {/* ── PIPELINE TAB ── */}
              {activeTab === 'pipeline' && (
                <div className="space-y-3">
                  {/* Progress bar */}
                  <div className="flex items-center w-full gap-0.5">
                    {['Screening', 'Technical', 'Interview', 'Test', 'Offer'].map((s, i, arr) => {
                      const stages: Stage[] = ['Cold', 'Identified', 'Initial Screen', 'Technical', 'On-site', 'Offer'];
                      const currentIdx = stages.indexOf(selectedCandidate.stage);
                      const displayToActual = [1, 2, 3, 4, 5];
                      const actualStageIdx = displayToActual[i];
                      const isDone = actualStageIdx < currentIdx;
                      const isCurrent = actualStageIdx === currentIdx;

                      return (
                        <div
                          key={s}
                          className="flex-1 relative h-9 cursor-pointer"
                          onClick={() => onUpdateStage(selectedCandidate.id || '', stages[actualStageIdx] as Stage)}
                        >
                          <div
                            className={`h-full w-full flex items-center justify-center text-[10px] font-medium transition-all
                              ${isCurrent ? 'bg-brand text-white shadow-[0_4px_12px_rgba(255,99,33,0.25)]' : isDone ? 'bg-brand/10 text-brand' : 'bg-white border border-gray-100 text-gray-400'}
                              ${i === 0 ? 'rounded-l-lg' : ''}
                              ${i === arr.length - 1 ? 'rounded-r-lg' : ''}
                            `}
                            style={{
                              clipPath: i === 0
                                ? 'polygon(0% 0%, 95% 0%, 100% 50%, 95% 100%, 0% 100%)'
                                : i === arr.length - 1
                                ? 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 5% 50%)'
                                : 'polygon(0% 0%, 95% 0%, 100% 50%, 95% 100%, 0% 100%, 5% 50%)'
                            }}
                          >
                            {s}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Detail card */}
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                    <h3 className="text-xs font-medium text-gray-500 mb-3 pb-3 border-b border-gray-50">Detail</h3>
                    <div className="grid grid-cols-2 gap-y-4">
                      <div>
                        <p className="text-[10px] text-gray-400 font-medium mb-1.5">Current Status</p>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-full bg-green-50 text-green-600 text-[10px] font-medium">Active</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 font-medium mb-1.5">Assignee</p>
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-brand/10 flex items-center justify-center text-[9px] font-semibold text-brand">U</div>
                          <span className="text-sm font-medium text-gray-700">Me (Admin)</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 font-medium mb-1.5">Stage</p>
                        <span className="text-sm font-medium text-gray-700">{selectedCandidate.stage}</span>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 font-medium mb-1.5">Channel</p>
                        <span className="text-sm font-medium text-gray-700">Direct Search</span>
                      </div>
                    </div>
                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={() => {
                          const stages: Stage[] = ['Cold', 'Identified', 'Initial Screen', 'Technical', 'On-site', 'Offer'];
                          const next = stages[stages.indexOf(selectedCandidate.stage) + 1] || selectedCandidate.stage;
                          onUpdateStage(selectedCandidate.id || '', next);
                        }}
                        className="px-4 py-2 rounded-lg border border-gray-100 text-gray-600 text-xs font-medium hover:bg-brand hover:text-white hover:border-brand transition-all"
                      >
                        Advance Stage
                      </button>
                    </div>
                  </div>

                  {/* Notes section */}
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                    <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-50">
                      <h3 className="text-xs font-medium text-gray-500">Notes</h3>
                      <button
                        onClick={() => onSaveNotes(selectedCandidate.id || '', localNotes)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-brand text-white rounded-lg text-[11px] font-medium hover:opacity-90 active:scale-95 transition-all"
                      >
                        <Save className="w-3 h-3" />
                        Save
                      </button>
                    </div>

                    <div className="space-y-3">
                      <textarea
                        value={localNotes}
                        onChange={(e) => setLocalNotes(e.target.value)}
                        placeholder="Add assessment for this candidate..."
                        className="w-full h-36 bg-[#fafafa] border border-gray-100 rounded-lg p-3 text-sm text-gray-700 focus:outline-none focus:border-brand/30 resize-none placeholder:text-gray-300"
                      />

                      <div className="flex items-center justify-between text-[10px] text-gray-400 font-medium px-1">
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                          Updated in real-time
                        </div>
                      </div>

                      <div className="pt-3 border-t border-gray-50 flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-brand/10 flex items-center justify-center text-[10px] font-semibold text-brand">JD</div>
                        <div>
                          <p className="text-xs font-medium text-gray-700">Josh Daniel <span className="text-gray-400 font-normal">· Recruiting Principal</span></p>
                          <p className="text-[10px] text-gray-400">14 May 2026</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── INTEL TAB ── */}
              {activeTab === 'intel' && (
                <div className="space-y-3 pb-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                    <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-50">
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-brand" />
                        <h3 className="text-xs font-medium text-gray-500">Company Signals</h3>
                      </div>
                      {companySignal && (
                        <span className={`text-[10px] font-medium px-2.5 py-1 rounded-full ${
                          companySignal.urgencyTier === 'HIGH' ? 'bg-red-50 text-red-500' : 'bg-orange-50 text-orange-500'
                        }`}>
                          {companySignal.urgencyTier} urgency
                        </span>
                      )}
                    </div>

                    {!companySignal ? (
                      <div className="p-6 text-center bg-[#fafafa] rounded-lg border border-dashed border-gray-100">
                        <AlertTriangle className="w-5 h-5 text-gray-200 mx-auto mb-2" />
                        <p className="text-xs text-gray-400">No signals detected for {selectedCandidate.company}</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                            <p className="text-[10px] text-gray-400 font-medium mb-2">Urgency driver</p>
                            <p className="text-sm text-gray-700 leading-relaxed">{companySignal.urgencyReason}</p>
                          </div>
                          <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                            <p className="text-[10px] text-gray-400 font-medium mb-2">Operational pressure</p>
                            <p className="text-sm text-gray-700 leading-relaxed">{companySignal.burnoutSignals}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="p-3 bg-white rounded-lg border border-gray-100">
                            <div className="flex items-center gap-1.5 mb-2">
                              <DollarSign className="w-3.5 h-3.5 text-green-500" />
                              <p className="text-[10px] text-gray-400 font-medium">Comp signal</p>
                            </div>
                            <p className="text-sm font-medium text-gray-700 mb-1">{companySignal.compRating}</p>
                            <p className="text-[11px] text-gray-400 leading-tight">{companySignal.compensationSignal}</p>
                          </div>
                          <div className="p-3 bg-white rounded-lg border border-gray-100">
                            <div className="flex items-center gap-1.5 mb-2">
                              <Zap className="w-3.5 h-3.5 text-blue-500" />
                              <p className="text-[10px] text-gray-400 font-medium">Stability</p>
                            </div>
                            <p className="text-sm font-medium text-gray-700 mb-1">Ownership: {companySignal.ownershipInstability.split(' ')[0]}</p>
                            <p className="text-[11px] text-gray-400 leading-tight">{companySignal.ownershipInstability}</p>
                          </div>
                          <div className="p-3 bg-white rounded-lg border border-gray-100">
                            <div className="flex items-center gap-1.5 mb-2">
                              <TrendingUp className="w-3.5 h-3.5 text-orange-500" />
                              <p className="text-[10px] text-gray-400 font-medium">Growth ceiling</p>
                            </div>
                            <p className="text-sm font-medium text-gray-700 mb-1">Ceiling: {companySignal.ceilingSignals.split(' ')[0]}</p>
                            <p className="text-[11px] text-gray-400 leading-tight">{companySignal.ceilingSignals}</p>
                          </div>
                        </div>

                        {/* Glassdoor card */}
                        <div className="p-4 rounded-xl bg-gray-900 text-white overflow-hidden relative">
                          <div className="absolute top-4 right-4">
                            <span className="text-xl font-semibold text-brand">{companySignal.glassdoorRating}</span>
                            <p className="text-[10px] text-gray-500 text-right">Glassdoor</p>
                          </div>
                          <div className="relative z-10">
                            <p className="text-[10px] text-gray-500 font-medium mb-2">Employee sentiment</p>
                            <p className="text-sm font-medium italic leading-snug mb-4 max-w-2xl text-gray-200">"{companySignal.glassdoorComplaints}"</p>
                            <div className="pt-3 border-t border-white/5 flex flex-col md:flex-row gap-4">
                              <div className="flex-1">
                                <p className="text-[10px] text-gray-500 font-medium mb-1.5">Strategic news</p>
                                <p className="text-sm text-gray-300">{companySignal.financialNews}</p>
                              </div>
                              <div className="flex-1">
                                <p className="text-[10px] text-gray-500 font-medium mb-1.5">Project success</p>
                                <p className="text-sm text-gray-300">{companySignal.projectWins}</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Outreach */}
                        <div className="pt-3 border-t border-gray-50">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <div className="flex items-center gap-1.5 mb-2">
                                <Send className="w-3.5 h-3.5 text-brand" />
                                <h4 className="text-xs font-medium text-gray-500">Outreach</h4>
                              </div>
                              <div className="space-y-2">
                                <div>
                                  <p className="text-[10px] text-gray-400 font-medium mb-1">Conversation starter</p>
                                  <p className="text-sm text-gray-700 italic leading-relaxed">"{companySignal.conversationStarter}"</p>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                  <p className="text-[10px] text-gray-400 font-medium mb-1">Subject line</p>
                                  <p className="text-xs text-gray-700 font-mono">{companySignal.emailSubject}</p>
                                </div>
                              </div>
                            </div>
                            <div className="p-3 rounded-lg bg-brand/5 border border-brand/10">
                              <div className="flex items-center gap-1.5 mb-2">
                                <MessageSquare className="w-3.5 h-3.5 text-brand" />
                                <p className="text-[10px] text-brand font-medium">Voicemail script</p>
                              </div>
                              <p className="text-sm text-gray-700 italic leading-relaxed">{companySignal.voicemailScript}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </section>
                </div>
              )}

              {/* ── DETAILS TAB ── */}
              {activeTab === 'details' && (
                <div className="space-y-3 pb-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  {/* Overview stat cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-sm">
                      <div className="flex items-center gap-2 mb-2.5">
                        <div className="p-2 bg-brand/5 rounded-lg">
                          <Briefcase className="w-4 h-4 text-brand" />
                        </div>
                        <span className="text-[10px] text-gray-400 font-medium">Total experience</span>
                      </div>
                      <p className="text-base font-semibold text-gray-900">{selectedCandidate.yearsExperience}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">Sector authority</p>
                    </div>
                    <div className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-sm">
                      <div className="flex items-center gap-2 mb-2.5">
                        <div className="p-2 bg-blue-50 rounded-lg">
                          <Clock className="w-4 h-4 text-blue-500" />
                        </div>
                        <span className="text-[10px] text-gray-400 font-medium">Company tenure</span>
                      </div>
                      <p className="text-base font-semibold text-gray-900">{selectedCandidate.tenure}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">Started {selectedCandidate.tenureStart || 'N/A'}</p>
                    </div>
                    <div className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-sm">
                      <div className="flex items-center gap-2 mb-2.5">
                        <div className="p-2 bg-green-50 rounded-lg">
                          <MapPin className="w-4 h-4 text-green-500" />
                        </div>
                        <span className="text-[10px] text-gray-400 font-medium">Work region</span>
                      </div>
                      <p className="text-base font-semibold text-gray-900 truncate">{selectedCandidate.location}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{selectedCandidate.driveTime || 'Local candidate'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                    {/* Left: summary + projects */}
                    <div className="lg:col-span-2 space-y-3">
                      {/* Work history */}
                      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                        <div className="flex items-center gap-2 mb-3">
                          <FileText className="w-3.5 h-3.5 text-brand" />
                          <h3 className="text-xs font-medium text-gray-500">Work History</h3>
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed">
                          {selectedCandidate.workHistory || selectedCandidate.about || "No detailed work history summary available for this candidate."}
                        </p>
                      </div>

                      {/* Projects */}
                      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                        <div className="flex items-center gap-2 mb-3">
                          <Layers className="w-3.5 h-3.5 text-brand" />
                          <h3 className="text-xs font-medium text-gray-500">Projects</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {selectedCandidate.projects ? (
                            selectedCandidate.projects.split(',').map((project, idx) => (
                              <div key={idx} className="p-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-brand/20 transition-colors cursor-default">
                                <div className="flex items-center gap-1.5 mb-1.5">
                                  <div className="w-1 h-1 rounded-full bg-brand" />
                                  <span className="text-[10px] text-gray-400 font-medium">Project</span>
                                </div>
                                <p className="text-sm font-medium text-gray-700 leading-tight">{project.trim()}</p>
                              </div>
                            ))
                          ) : (
                            <div className="md:col-span-2 p-4 bg-gray-50 rounded-lg border border-dashed border-gray-100 flex flex-col items-center justify-center text-center">
                              <Layers className="w-6 h-6 text-gray-200 mb-1.5" />
                              <p className="text-xs text-gray-400">No specific projects listed</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: contact, skills, education */}
                    <div className="space-y-3">
                      {/* Contact panel */}
                      <div className="bg-gray-900 p-3.5 rounded-xl text-white">
                        <h3 className="text-[10px] text-gray-500 font-medium mb-3">Contact</h3>
                        <div className="space-y-2">
                          <a href={`mailto:${selectedCandidate.email}`} className="flex items-center justify-between p-2.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg transition-all group">
                            <div className="flex items-center gap-2 overflow-hidden">
                              <Mail className="w-3.5 h-3.5 text-brand flex-shrink-0" />
                              <span className="text-xs text-gray-300 truncate">{selectedCandidate.email}</span>
                            </div>
                            <ExternalLink className="w-3 h-3 text-white/20 group-hover:text-white/60 flex-shrink-0" />
                          </a>
                          <div className="flex items-center p-2.5 bg-white/5 border border-white/5 rounded-lg">
                            <div className="flex items-center gap-2">
                              <MessageSquare className="w-3.5 h-3.5 text-brand" />
                              <span className="text-xs text-gray-300">{selectedCandidate.phone || selectedCandidate.mobilePhone || 'No phone'}</span>
                            </div>
                          </div>
                          <a href={selectedCandidate.linkedInUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-2.5 bg-[#0077b5]/10 hover:bg-[#0077b5]/20 border border-[#0077b5]/20 rounded-lg transition-all group">
                            <div className="flex items-center gap-2">
                              <Linkedin className="w-3.5 h-3.5 text-[#0077b5]" />
                              <span className="text-xs text-[#0077b5]">LinkedIn Profile</span>
                            </div>
                            <ExternalLink className="w-3 h-3 text-[#0077b5]/40 group-hover:text-[#0077b5]" />
                          </a>
                        </div>
                      </div>

                      {/* Skills */}
                      <div className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-sm">
                        <h3 className="text-xs font-medium text-gray-500 mb-3">Skills</h3>
                        <div className="flex flex-wrap gap-1.5">
                          {(selectedCandidate.topSkills || selectedCandidate.certifications || "Generalist").split(',').map((skill, idx) => (
                            <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-600 rounded-md text-[10px] font-medium">
                              {skill.trim()}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Education */}
                      <div className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-sm">
                        <h3 className="text-xs font-medium text-gray-500 mb-3">Education</h3>
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-amber-50 rounded-lg flex-shrink-0">
                            <Star className="w-3.5 h-3.5 text-amber-500 fill-current" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-700 leading-tight">
                              {selectedCandidate.education || "B.S. Civil Engineering"}
                            </p>
                            <div className="flex items-center gap-1 mt-1.5">
                              <ShieldCheck className="w-3 h-3 text-green-500" />
                              <p className="text-[10px] text-gray-400 font-medium">Verified credential</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center mb-3 shadow-sm">
              <Users className="w-5 h-5 text-gray-200" />
            </div>
            <h3 className="text-sm font-medium text-gray-700 mb-1">Select a candidate</h3>
            <p className="text-xs text-gray-400 max-w-xs">Choose someone from the list to view their profile and pipeline details.</p>
          </div>
        )}
      </div>
    </div>
  );
}
