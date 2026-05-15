import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { NICHE } from '../config/niche';
import { ArrowLeft, ArrowUp, MapPin, Briefcase, Clock, DollarSign, CheckCircle2, Star, Linkedin } from 'lucide-react';

interface ClarifyJobViewProps {
  jobDescription: string;
  onConfirm: (finalDescription: string, jobTitle?: string) => void;
  onBack: () => void;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface JobPost {
  title: string;
  location: string;
  employmentType: string;
  experienceLevel: string;
  industry: string;
  salary: string;
  summary: string;
  responsibilities: string[];
  requirements: string[];
  niceToHave: string[];
}

interface ApiResponse {
  message: string;
  readyToSearch: boolean;
  outOfScope: boolean;
  jobPost?: JobPost;
}

const EMPTY_JOB_POST: JobPost = {
  title: '', location: '', employmentType: '', experienceLevel: '',
  industry: '', salary: '', summary: '', responsibilities: [], requirements: [], niceToHave: [],
};

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2">
      <div className="w-7 h-7 rounded-full bg-brand flex items-center justify-center flex-shrink-0 text-white text-xs font-semibold">T</div>
      <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm shadow-sm px-4 py-3">
        <div className="flex gap-1 items-center h-4">
          {[0, 1, 2].map(i => (
            <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-gray-300"
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function Placeholder({ width = 'w-3/4' }: { width?: string }) {
  return <div className={`h-3 ${width} bg-gray-100 rounded-full`} />;
}

export default function ClarifyJobView({ jobDescription, onConfirm, onBack }: ClarifyJobViewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [readyToSearch, setReadyToSearch] = useState(false);
  const [outOfScope, setOutOfScope] = useState(false);
  const [jobPost, setJobPost] = useState<JobPost>(EMPTY_JOB_POST);
  const [jobTitle, setJobTitle] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const hasInitialized = useRef(false);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const callApi = useCallback(async (msgs: Message[]) => {
    console.log('[ClarifyJobView] callApi called with', msgs.length, 'messages');
    setIsLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: msgs.map(m => ({ role: m.role, content: m.content })),
          jobDescription,
        }),
      });
      const data: ApiResponse = await res.json();

      const aiMessage: Message = { id: `ai-${Date.now()}`, role: 'assistant', content: data.message };
      setMessages(prev => [...prev, aiMessage]);

      if (data.jobPost) {
        setJobPost(prev => ({
          title: data.jobPost!.title || prev.title,
          location: data.jobPost!.location || prev.location,
          employmentType: data.jobPost!.employmentType || prev.employmentType,
          experienceLevel: data.jobPost!.experienceLevel || prev.experienceLevel,
          industry: data.jobPost!.industry || prev.industry,
          salary: data.jobPost!.salary || prev.salary,
          summary: data.jobPost!.summary || prev.summary,
          responsibilities: data.jobPost!.responsibilities?.length ? data.jobPost!.responsibilities : prev.responsibilities,
          requirements: data.jobPost!.requirements?.length ? data.jobPost!.requirements : prev.requirements,
          niceToHave: data.jobPost!.niceToHave?.length ? data.jobPost!.niceToHave : prev.niceToHave,
        }));
        if (data.jobPost.title && !jobTitle) setJobTitle(data.jobPost.title);
      }

      if (data.readyToSearch) setReadyToSearch(true);
      if (data.outOfScope) setOutOfScope(true);
    } catch {
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`, role: 'assistant',
        content: "I'm having trouble connecting right now. Please try again.",
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [jobDescription, jobTitle]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;
    const firstMsg: Message = { id: `user-init-${Date.now()}`, role: 'user', content: jobDescription };
    setMessages([firstMsg]);
    callApi([firstMsg]);
  }, [jobDescription, callApi]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;
    if (!jobTitle && text.length < 80 && !text.includes('\n')) setJobTitle(text);
    const userMsg: Message = { id: `user-${Date.now()}`, role: 'user', content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput('');
    await callApi(updated);
  }, [input, isLoading, messages, callApi, jobTitle]);

  const hasContent = jobPost.title || jobPost.summary || jobPost.location;

  return (
    <div className="w-full h-full flex overflow-hidden bg-[#fafafa]">

      {/* LEFT: Chat */}
      <div className="flex flex-col w-full md:w-1/2 bg-white border-r border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 flex-shrink-0">
          <button onClick={onBack} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-all">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Role Verification</h2>
            <p className="text-[10px] text-gray-400">{NICHE.appName} AI is reviewing your role</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[10px] text-gray-400">Live</span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto scrollbar-hide px-4 py-4 space-y-4">
          <AnimatePresence>
            {messages.filter(m => !(m.role === 'user' && m.id.includes('user-init'))).map(msg => (
              <motion.div key={msg.id}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-brand flex items-center justify-center flex-shrink-0 text-white text-xs font-semibold">T</div>
                )}
                <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-brand text-white rounded-tr-sm'
                    : 'bg-white border border-gray-100 shadow-sm text-gray-800 rounded-tl-sm'
                }`}>
                  {msg.content}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {isLoading && <TypingIndicator />}

          {/* CTA — appears in chat when ready */}
          <AnimatePresence>
            {readyToSearch && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                className="border border-brand/20 bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-full bg-brand/10 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-brand" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Job post is ready</p>
                    <p className="text-[10px] text-gray-400">We'll search our database for the best-matched candidates.</p>
                  </div>
                </div>
                <button
                  onClick={() => onConfirm(jobDescription, jobPost.title || jobTitle || undefined)}
                  className="w-full py-2.5 bg-brand text-white text-sm font-semibold rounded-xl hover:bg-brand/90 transition-all shadow-md shadow-brand/20 active:scale-[0.98]"
                >
                  Find Candidates →
                </button>
                <div className="flex items-center justify-center gap-1.5 mt-2.5">
                  <Linkedin className="w-3 h-3 text-[#0077b5]" />
                  <p className="text-[10px] text-gray-400">LinkedIn post <span className="text-gray-300">— coming soon</span></p>
                </div>
              </motion.div>
            )}
            {outOfScope && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="border border-gray-100 bg-white rounded-2xl p-4 text-center shadow-sm">
                <p className="text-xs text-gray-400 mb-3">This role may be outside {NICHE.appName}'s scope.</p>
                <button onClick={onBack} className="px-4 py-2 border border-gray-200 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-50 transition-all">
                  ← Go back
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-gray-100 flex-shrink-0">
          <div className={`flex items-center gap-2 bg-gray-50 border rounded-xl px-3 py-2 transition-all ${isLoading || readyToSearch || outOfScope ? 'opacity-50' : 'border-gray-200 focus-within:border-brand/30 focus-within:bg-white'}`}>
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSend(); } }}
              placeholder={readyToSearch ? 'Review your job post →' : `Reply to ${NICHE.appName} AI...`}
              disabled={isLoading || readyToSearch || outOfScope}
              className="flex-1 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
            />
            <motion.button
              onClick={handleSend}
              disabled={!input.trim() || isLoading || readyToSearch || outOfScope}
              whileHover={input.trim() && !isLoading ? { scale: 1.1 } : {}}
              whileTap={input.trim() && !isLoading ? { scale: 0.9 } : {}}
              className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${input.trim() && !isLoading ? 'bg-brand text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
            >
              <ArrowUp className="w-3.5 h-3.5" strokeWidth={2.5} />
            </motion.button>
          </div>
        </div>
      </div>

      {/* RIGHT: Job Post Preview */}
      <div className="hidden md:flex flex-col w-1/2 overflow-y-auto scrollbar-hide">
        <div className="px-6 py-5 flex-shrink-0 border-b border-gray-100 bg-white">
          <p className="text-sm font-semibold text-gray-700">Job Post Preview</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Updates as you answer questions</p>
        </div>

        <div className="flex-1 px-6 py-5 space-y-5">
          {/* Header card */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center flex-shrink-0">
                <span className="text-brand text-lg font-bold">T</span>
              </div>
              <div className="flex-1 min-w-0">
                {hasContent ? (
                  <motion.h2 key={jobPost.title} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="text-base font-semibold text-gray-900 leading-tight mb-1">
                    {jobPost.title || <Placeholder width="w-2/3" />}
                  </motion.h2>
                ) : <Placeholder width="w-2/3" />}
                <div className="flex flex-wrap gap-2 mt-2">
                  {[
                    { icon: MapPin, value: jobPost.location, placeholder: 'Location' },
                    { icon: Briefcase, value: jobPost.employmentType, placeholder: 'Employment type' },
                    { icon: Clock, value: jobPost.experienceLevel, placeholder: 'Experience level' },
                    { icon: DollarSign, value: jobPost.salary, placeholder: 'Salary range' },
                  ].map(({ icon: Icon, value, placeholder }) => (
                    <div key={placeholder} className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium border ${value ? 'bg-gray-50 border-gray-100 text-gray-600' : 'bg-gray-50/50 border-dashed border-gray-100 text-gray-300'}`}>
                      <Icon className="w-3 h-3" />
                      {value || placeholder}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {jobPost.industry && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-brand/5 border border-brand/10 rounded-full text-[10px] font-medium text-brand">
                {jobPost.industry}
              </div>
            )}
          </div>

          {/* About the Role */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-xs font-semibold text-gray-900 mb-3">About the Role</h3>
            {jobPost.summary ? (
              <motion.p key={jobPost.summary.slice(0, 20)} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="text-sm text-gray-600 leading-relaxed">
                {jobPost.summary}
              </motion.p>
            ) : (
              <div className="space-y-2"><Placeholder /><Placeholder width="w-5/6" /><Placeholder width="w-4/6" /></div>
            )}
          </div>

          {/* Responsibilities */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-xs font-semibold text-gray-900 mb-3">Responsibilities</h3>
            {jobPost.responsibilities.length > 0 ? (
              <ul className="space-y-2">
                {jobPost.responsibilities.map((r, i) => (
                  <motion.li key={i} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                    className="flex items-start gap-2 text-sm text-gray-600">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand mt-1.5 flex-shrink-0" />
                    {r}
                  </motion.li>
                ))}
              </ul>
            ) : (
              <div className="space-y-2"><Placeholder /><Placeholder width="w-5/6" /><Placeholder width="w-4/5" /></div>
            )}
          </div>

          {/* Requirements */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-xs font-semibold text-gray-900 mb-3">Requirements</h3>
            {jobPost.requirements.length > 0 ? (
              <ul className="space-y-2">
                {jobPost.requirements.map((r, i) => (
                  <motion.li key={i} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                    className="flex items-start gap-2 text-sm text-gray-600">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                    {r}
                  </motion.li>
                ))}
              </ul>
            ) : (
              <div className="space-y-2"><Placeholder /><Placeholder width="w-4/5" /><Placeholder width="w-3/4" /></div>
            )}
          </div>

          {/* Nice to Have */}
          {jobPost.niceToHave.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-xs font-semibold text-gray-900 mb-3">Nice to Have</h3>
              <ul className="space-y-2">
                {jobPost.niceToHave.map((r, i) => (
                  <motion.li key={i} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                    className="flex items-start gap-2 text-sm text-gray-600">
                    <Star className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
                    {r}
                  </motion.li>
                ))}
              </ul>
            </div>
          )}


          <div className="h-6" />
        </div>
      </div>
    </div>
  );
}
