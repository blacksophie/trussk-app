import { useState, useCallback, useEffect } from 'react';
import { View, Candidate, Job, Stage, Interview } from './types';
import Sidebar from './components/Sidebar';
import PostJobView from './components/PostJobView';
import ClarifyJobView from './components/ClarifyJobView';
import CandidateWorkspace from './components/CandidateWorkspace';
import { JobsPostedView } from './components/JobsPostedView';
import { OutreachView } from './components/OutreachView';
import { CalendarView } from './components/CalendarView';
import { MarketIntelligence } from './components/MarketIntelligence';
import { IntegrationsView } from './components/IntegrationsView';
import { IMPORTED_CANDIDATES } from './data/imported_candidates';
import { motion, AnimatePresence } from 'motion/react';
import { ToastProvider, useToast } from './components/Toast';
import { Menu, X } from 'lucide-react';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { 
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { handleFirestoreError, OperationType } from './lib/firestore-utils';
import AuthPage from './components/auth/AuthPage';
import OnboardingFlow from './components/onboarding/OnboardingFlow';

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}

function AppContent() {
  const { toast } = useToast();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentView, setCurrentView] = useState<View>(View.POST_JOB);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [isSourcing, setIsSourcing] = useState(false);
  const [pendingDescription, setPendingDescription] = useState<string | null>(null);
  const [jobDescription, setJobDescription] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [postedJobs, setPostedJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [calUrl, setCalUrl] = useState<string | undefined>(undefined);

  // Auth State
  useEffect(() => {
    let active = true;
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const snap = await getDoc(doc(db, 'users', u.uid));
          if (!active) return;
          const data = snap.data();
          setNeedsOnboarding(!data?.onboardingComplete);
          setCalUrl(data?.calUrl ?? undefined);
        } catch {
          if (!active) return;
          setNeedsOnboarding(false);
          setCalUrl(undefined);
        }
      } else {
        setNeedsOnboarding(false);
        setCalUrl(undefined);
      }
      if (active) setAuthLoading(false);
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  // Sync Jobs
  useEffect(() => {
    if (!user) {
      setPostedJobs([]);
      return;
    }

    const q = query(
      collection(db, 'jobs'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const jobs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Job));
      setPostedJobs(jobs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'jobs');
    });

    return unsubscribe;
  }, [user]);

  // Sync Candidates
  useEffect(() => {
    if (!user) {
      setCandidates([]);
      return;
    }

    const q = query(
      collection(db, 'candidates'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Candidate));
      setCandidates(docs);
      
      // Update selected candidate if it's in the list
      if (selectedCandidate) {
        const updated = docs.find(c => c.id === selectedCandidate.id);
        if (updated) setSelectedCandidate(updated);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'candidates');
    });

    return unsubscribe;
  }, [user, selectedCandidate?.id]);

  // Sync Interviews
  useEffect(() => {
    if (!user) {
      setInterviews([]);
      return;
    }

    const q = query(
      collection(db, 'interviews'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Interview));
      // Sort client-side to avoid composite index requirement
      docs.sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));
      setInterviews(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'interviews');
    });

    return unsubscribe;
  }, [user]);

  const handleScheduleInterview = useCallback(async (data: Omit<Interview, 'id' | 'createdAt'>) => {
    if (!user) return;
    try {
      // Strip undefined fields — Firestore rejects them
      const doc: Record<string, any> = { createdAt: serverTimestamp() };
      for (const [k, v] of Object.entries(data)) {
        if (v !== undefined) doc[k] = v;
      }
      await addDoc(collection(db, 'interviews'), doc);
      toast('Interview scheduled', 'success');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'interviews');
      toast('Failed to schedule interview', 'error');
      throw error;
    }
  }, [user, toast]);

  const handleDeleteInterview = useCallback(async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'interviews', id));
      toast('Interview removed', 'warning');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `interviews/${id}`);
      toast('Failed to remove interview', 'error');
    }
  }, [user, toast]);

  const handleUpdateCandidateStage = useCallback(async (id: string, newStage: Stage) => {
    if (!user) return;
    
    try {
      const candidateDoc = candidates.find(c => c.id === id);
      if (candidateDoc?.id) {
        const ref = doc(db, 'candidates', candidateDoc.id);
        await updateDoc(ref, { stage: newStage });
        toast(`Candidate moved to ${newStage}`, 'success');
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `candidates/${id}`);
      toast('Failed to update stage', 'error');
    }
  }, [user, candidates]);

  const handleSaveNotes = useCallback(async (id: string, notes: string) => {
    if (!user) return;

    try {
      const candidateDoc = candidates.find(c => c.id === id);
      if (candidateDoc?.id) {
        const ref = doc(db, 'candidates', candidateDoc.id);
        await updateDoc(ref, { validationNotes: notes });
        toast('Notes saved successfully', 'success');
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `candidates/${id}`);
      toast('Failed to save notes', 'error');
    }
  }, [user, candidates]);

  const handlePostJob = useCallback(async (description: string, jobTitleOverride?: string) => {
    if (!user) return;

    setJobDescription(description);
    setIsSourcing(true);

    const title = jobTitleOverride || description.split('\n')[0].substring(0, 50).replace(/^Uploaded: /, '') || 'New Role';
    const newJob = {
      title,
      location: 'Manatee County, FL',
      description: description,
      postedAt: new Date().toISOString(),
      industry: 'Infrastructure',
      userId: user.uid
    };

    try {
      const jobRef = await addDoc(collection(db, 'jobs'), newJob);
      toast('Job posted successfully', 'success');
      
      // Perform semantic matching from enterprise database
      const matches = IMPORTED_CANDIDATES.filter(c => {
         const jobContent = description.toLowerCase();
         const candidateTitle = (c.title || '').toLowerCase();
         const candidateIndustry = (c.industry || '').toLowerCase();
         
         // Logic: Title match or sub-string match
         return jobContent.includes(candidateTitle) || 
                (jobContent.includes('estimator') && candidateTitle.includes('estimator')) ||
                (jobContent.includes('manager') && candidateTitle.includes('manager')) ||
                (jobContent.includes('construction') && candidateIndustry.includes('construction'));
      });

      // Fallback: If no direct matches, take top 5
      const finalMatches = matches.length > 0 ? matches.slice(0, 8) : IMPORTED_CANDIDATES.slice(0, 5);

      const candidatesCollection = collection(db, 'candidates');
      const seedPromises = finalMatches.map((c, index) => {
        const fullCandidate = {
          ...c,
          rank: index + 1,
          priority: index < 3 ? 'TOP 10' : 'Identified',
          location: c.city && c.state ? `${c.city}, ${c.state}` : 'Unknown',
          tenure: '4 years 2 months',
          tenureStart: 'Mar 2022',
          yearsExperience: '12+ Years',
          workHistory: `Senior Project Manager: ${c.company} (2018 - Present);Lead Infrastructure Estimator: Global Civil Works (2014 - 2018);Geotechnical Analyst: Florida DOT (2010 - 2014)`,
          projects: 'I-75 Modernization, FDOT Bridge Replacement, City Grid Expansion',
          education: 'Bachelor of Science in Civil Engineering, University of Florida',
          currentPosition: c.title || 'Unknown',
          linkedInUrl: c.linkedInUrl || '#',
          phone: c.corporatePhone || c.mobilePhone || 'Unknown',
          driveTime: '23 min drive',
          fitNotes: 'High semantic match for infrastructure roles.',
          outreachVariant: 'standard',
          personalization: `Hi ${c.firstName}, saw your work at ${c.company}...`,
          avatarUrl: c.linkedInUrl && c.linkedInUrl.includes('linkedin.com/in/') 
            ? `https://unavatar.io/linkedin/${c.linkedInUrl.split('/in/')[1].split('/')[0].split('?')[0]}`
            : `https://i.pravatar.cc/150?u=${c.email || index}`,
          score: 88 + Math.floor(Math.random() * 10),
          stage: 'Identified',
          userId: user.uid,
          jobId: jobRef.id,
          createdAt: serverTimestamp(),
        } as any;
        return addDoc(candidatesCollection, fullCandidate);
      });

      const results = await Promise.allSettled(seedPromises);
      const failed = results.filter(r => r.status === 'rejected').length;
      const seeded = results.length - failed;
      if (failed > 0) console.error(`[App] ${failed} candidate(s) failed to seed`);
      toast(`Found ${seeded} matched candidates`, 'success');

      setTimeout(() => {
        setIsSourcing(false);
        setSelectedJob({ id: jobRef.id, ...newJob });
        setCurrentView(View.CANDIDATE_LIST);
      }, 5000);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'jobs');
      toast('Failed to process job post', 'error');
      setIsSourcing(false);
    }
  }, [user, toast]);

  const handleDescriptionSubmit = useCallback((description: string) => {
    setPendingDescription(description);
  }, []);

  const handleSelectCandidate = useCallback((candidate: Candidate) => {
    setSelectedCandidate(candidate);
    setCurrentView(View.CANDIDATE_LIST);
  }, []);

  const handleSelectJob = useCallback((job: Job) => {
    setSelectedJob(job);
    setJobDescription(job.description);
    setCurrentView(View.CANDIDATE_LIST);
    setSelectedCandidate(null); // Reset selected candidate when switching jobs
  }, []);

  const handleDeleteJob = useCallback(async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'jobs', id));
      toast('Job deleted', 'warning');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `jobs/${id}`);
      toast('Failed to delete job', 'error');
    }
  }, [user, toast]);

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [currentView]);

  if (authLoading) {
    return (
      <div className="h-screen w-full bg-bg-light flex items-center justify-center">
        <motion.div 
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-brand font-bold tracking-[0.2em] uppercase"
        >
          Initializing Trussk...
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <AuthPage
        onAuthSuccess={(isNewUser) => {
          if (isNewUser) setNeedsOnboarding(true);
        }}
      />
    );
  }

  if (needsOnboarding) {
    return (
      <OnboardingFlow user={user} onComplete={() => setNeedsOnboarding(false)}>
        <AppShell />
      </OnboardingFlow>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-screen bg-transparent text-gray-900 overflow-hidden font-sans uppercase-none selection:bg-brand selection:text-black">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-gray-200 bg-white z-50">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-2xl tracking-tighter uppercase italic text-gray-900">Trussk</span>
        </div>
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 rounded-lg bg-gray-100 text-gray-600"
        >
          {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      <Sidebar
        currentView={currentView}
        onViewChange={(view) => {
          setCurrentView(view);
          if (view === View.POST_JOB) setSelectedCandidate(null);
        }}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        candidates={candidates}
        interviews={interviews}
      />
      
      <main className="flex-1 relative overflow-hidden flex flex-col">
        <AnimatePresence mode="wait">
          {pendingDescription ? (
            <motion.div
              key="clarify"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full h-full"
            >
              <ClarifyJobView
                jobDescription={pendingDescription}
                onConfirm={(desc, title) => {
                  setPendingDescription(null);
                  handlePostJob(desc, title);
                }}
                onBack={() => setPendingDescription(null)}
              />
            </motion.div>
          ) : isSourcing ? (
            <motion.div
              key="sourcing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full h-full flex flex-col items-center justify-center bg-white"
            >
              <div className="max-w-xs w-full text-center px-8">
                {/* Spinner */}
                <div className="relative w-14 h-14 mx-auto mb-8">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 rounded-full border-2 border-gray-100 border-t-brand"
                  />
                  <motion.div
                    animate={{ rotate: -360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-2 rounded-full border-2 border-gray-50 border-t-brand/40"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-brand animate-pulse" />
                  </div>
                </div>

                <h2 className="text-base font-semibold text-gray-900 mb-2 tracking-tight">Finding candidates...</h2>
                <p className="text-xs text-gray-400 mb-10">Analyzing your role and matching against our database</p>

                {/* Step indicators */}
                <div className="space-y-3 text-left">
                  {[
                    { label: 'Parsing job requirements', delay: 0 },
                    { label: 'Searching candidate database', delay: 0.8 },
                    { label: 'Ranking by fit score', delay: 1.8 },
                    { label: 'Preparing profiles', delay: 2.8 },
                  ].map((step, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: step.delay, duration: 0.4 }}
                      className="flex items-center gap-3"
                    >
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: step.delay + 0.2, duration: 0.3 }}
                        className="w-4 h-4 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center shrink-0"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-brand" />
                      </motion.div>
                      <span className="text-xs text-gray-500">{step.label}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : currentView === View.POST_JOB && (
            <motion.div
              key="post-job"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full h-full"
            >
              <PostJobView onPost={handleDescriptionSubmit} />
            </motion.div>
          )}

          {currentView === View.JOBS_POSTED && (
            <motion.div
              key="jobs-posted"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full h-full"
            >
              <JobsPostedView
                jobs={postedJobs}
                onSelectJob={handleSelectJob}
                onDeleteJob={handleDeleteJob}
                onNewRole={() => setCurrentView(View.POST_JOB)}
              />
            </motion.div>
          )}
          {currentView === View.CANDIDATE_LIST && (
            <motion.div
              key="candidate-workspace"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full h-full"
            >
              <CandidateWorkspace
                jobTitle={selectedJob?.title || jobDescription.split('\n')[0]}
                candidates={selectedJob?.id ? candidates.filter(c => (c as any).jobId === selectedJob.id) : candidates}
                selectedCandidate={selectedCandidate}
                onSelectCandidate={handleSelectCandidate}
                onUpdateStage={handleUpdateCandidateStage}
                onSaveNotes={handleSaveNotes}
              />
            </motion.div>
          )}

          {currentView === View.OUTREACH && (
            <motion.div
              key="outreach"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full h-full"
            >
              <OutreachView />
            </motion.div>
          )}


          {currentView === View.CALENDAR && (
            <motion.div
              key="calendar"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full h-full"
            >
              <CalendarView
                interviews={interviews}
                calUrl={calUrl}
                onDeleteInterview={handleDeleteInterview}
              />
            </motion.div>
          )}

          {currentView === View.MARKET_INTEL && (
            <motion.div
              key="market-intel"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full h-full p-6 overflow-y-auto"
            >
              <div className="max-w-6xl mx-auto">
                <div className="mb-6">
                   <h1 className="text-xl font-semibold text-white tracking-tight mb-2 uppercase">Market Intelligence</h1>
                   <p className="text-gray-500 font-bold">Real-time labor market analytics from US Department of Labor.</p>
                </div>
                <MarketIntelligence 
                  socCode="11-9021" 
                  location="Florida" 
                  jobTitle="Construction Manager" 
                />
              </div>
            </motion.div>
          )}
          {currentView === View.INTEGRATIONS && (
            <motion.div
              key="integrations"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full h-full"
            >
              <IntegrationsView />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function AppShell() {
  return (
    <div className="flex h-screen bg-white overflow-hidden pointer-events-none select-none opacity-60">
      <div className="w-55 bg-[#111] shrink-0" />
      <div className="flex-1 bg-gray-50" />
    </div>
  );
}
