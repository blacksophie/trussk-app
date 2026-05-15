export enum View {
  POST_JOB = 'post-job',
  CANDIDATE_LIST = 'candidate-list',
  CANDIDATE_DETAIL = 'candidate-detail',
  JOBS_POSTED = 'jobs-posted',
  OUTREACH = 'outreach',
  CALENDAR = 'calendar',
  MARKET_INTEL = 'market-intel',
  INTEGRATIONS = 'integrations',
}

export type Stage = 'Identified' | 'Initial Screen' | 'Technical' | 'On-site' | 'Offer' | 'Cold';

export interface Candidate {
  id?: string;
  rank: number;
  priority: string;
  firstName: string;
  lastName?: string;
  fullName: string;
  title: string;
  company: string;
  companyNameForEmails?: string;
  location: string;
  tenure: string;
  yearsExperience: string;
  currentPosition: string;
  linkedInUrl: string;
  email: string;
  emailStatus?: string;
  emailConfidence?: string;
  emailSource?: string;
  phone: string;
  workPhone?: string;
  mobilePhone?: string;
  corporatePhone?: string;
  driveTime: string;
  tenureStart?: string;
  workHistory?: string;
  projects?: string;
  education?: string;
  fitNotes: string;
  validationNotes?: string;
  outreachVariant: string;
  personalization: string;
  score: number;
  about?: string;
  certifications?: string;
  topSkills?: string;
  personalEmail?: string;
  avatarUrl?: string;
  liActivity?: string;
  stage: Stage;
  // Enterprise/Apollo Fields
  seniority?: string;
  departments?: string;
  subDepartments?: string;
  contactOwner?: string;
  industry?: string;
  keywords?: string;
  website?: string;
  companyLinkedinUrl?: string;
  city?: string;
  state?: string;
  country?: string;
  companyAddress?: string;
  companyPhone?: string;
  technologies?: string;
  annualRevenue?: number | string;
  totalFunding?: string;
  latestFunding?: string;
  latestFundingAmount?: string;
  lastRaisedAt?: string;
  demoed?: boolean;
  apolloContactId?: string;
  apolloAccountId?: string;
  primaryIntentTopic?: string;
  primaryIntentScore?: number;
  secondaryIntentTopic?: string;
  secondaryIntentScore?: number;
}

export interface Job {
  id: string;
  title: string;
  location: string;
  description: string;
  postedAt: string;
  industry: string;
}

export interface Message {
  id: string;
  sender: string;
  avatar?: string;
  content: string;
  time: string;
  isMe: boolean;
}

export interface Interview {
  id?: string;
  candidateId: string;
  candidateName: string;
  candidateAvatarUrl?: string;
  candidateInitials: string;
  type: 'Video Interview' | 'Phone Screen';
  locationType: 'Video' | 'Phone';
  date: string; // YYYY-MM-DD
  time: string; // e.g. "10:30 AM"
  duration: string; // e.g. "60 min"
  meetingUrl?: string;
  notes?: string;
  userId: string;
  jobId?: string;
  createdAt?: any;
}

export interface OutreachThread {
  id: string;
  candidateName: string;
  candidateEmail: string;
  candidateInitial: string;
  subject: string;
  lastMessage: string;
  time: string;
  status: 'Replied' | 'Sent' | 'Interested' | 'Not Interested' | 'Draft';
  type: 'email' | 'sms' | 'linkedin';
  messages: Message[];
}
