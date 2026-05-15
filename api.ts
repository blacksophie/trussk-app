// Cloud Run entry point — API only, no static file serving (Firebase Hosting handles that).
import express from 'express';
import axios from 'axios';
import Anthropic from '@anthropic-ai/sdk';
import multer from 'multer';
import { createRequire as _createRequire } from 'module';
const _require = _createRequire(import.meta.url);
const pdfParse = _require('pdf-parse');
import mammoth from 'mammoth';
import admin from 'firebase-admin';
import dotenv from 'dotenv';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: '.env.local' });
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Firebase Admin — use service account file locally, auto-credentials on Cloud Run
let adminDb: admin.firestore.Firestore | null = null;
(function initAdmin() {
  try {
    let credential: admin.credential.Credential;
    if (process.env.FIREBASE_ADMIN_CREDENTIALS) {
      const json = Buffer.from(process.env.FIREBASE_ADMIN_CREDENTIALS, 'base64').toString('utf-8');
      credential = admin.credential.cert(JSON.parse(json));
    } else if (existsSync(path.join(__dirname, 'firebase-admin.json'))) {
      const json = readFileSync(path.join(__dirname, 'firebase-admin.json'), 'utf-8');
      credential = admin.credential.cert(JSON.parse(json));
    } else {
      // On Cloud Run — use Application Default Credentials
      admin.initializeApp();
      adminDb = admin.firestore();
      console.log('[Admin] Firebase Admin initialised via ADC.');
      return;
    }
    admin.initializeApp({ credential });
    adminDb = admin.firestore();
    console.log('[Admin] Firebase Admin initialised.');
  } catch (err: any) {
    console.error('[Admin] Failed to initialise Firebase Admin:', err.message);
  }
}());

const CAREERONESTOP_USER_ID = process.env.CAREERONESTOP_USER_ID;
const CAREERONESTOP_TOKEN = process.env.CAREERONESTOP_TOKEN;

const app = express();
app.use(express.json());
app.use((req, _res, next) => {
  if (req.path.startsWith('/api/')) console.log(`[REQ] ${req.method} ${req.path}`);
  next();
});

// ── parse-document ────────────────────────────────────────────────────────────
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

app.post('/api/parse-document', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const { originalname, mimetype, buffer } = req.file;
  try {
    let text = '';
    if (mimetype === 'application/pdf' || originalname.endsWith('.pdf')) {
      const data = await pdfParse(buffer); text = data.text;
    } else if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || originalname.endsWith('.docx')) {
      const result = await mammoth.extractRawText({ buffer }); text = result.value;
    } else if (mimetype === 'text/plain' || originalname.endsWith('.txt')) {
      text = buffer.toString('utf-8');
    } else {
      return res.status(400).json({ error: 'Unsupported file type.' });
    }
    text = text.replace(/\s+/g, ' ').trim();
    if (!text || text.length < 20) return res.status(400).json({ error: 'Could not extract text.' });
    return res.json({ text, filename: originalname });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to parse document.' });
  }
});

// ── market-intelligence ───────────────────────────────────────────────────────
const cache = new Map<string, { data: any; expiry: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000;

app.get('/api/market-intelligence', async (req, res) => {
  const { soc, location } = req.query;
  if (!soc || !location) return res.status(400).json({ error: 'SOC code and location are required' });
  const cacheKey = `${soc}-${location}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiry > Date.now()) return res.json(cached.data);
  if (!CAREERONESTOP_USER_ID || !CAREERONESTOP_TOKEN) {
    return res.json({ isDemo: true, wages: { median: 165000 }, demand: { growth: '11%', openings: 3200, timeToFill: 67 } });
  }
  try {
    let loc = String(location);
    if (loc.toLowerCase() === 'florida') loc = 'FL';
    if (loc.toLowerCase() === 'california') loc = 'CA';
    if (loc.toLowerCase() === 'texas') loc = 'TX';
    if (loc.toLowerCase() === 'new york') loc = 'NY';
    const hdrs = { Authorization: `Bearer ${CAREERONESTOP_TOKEN}`, Accept: 'application/json' };
    const [wageRes, occRes] = await Promise.all([
      axios.get(`https://api.careeronestop.org/v1/wages/${CAREERONESTOP_USER_ID}/${soc}/${loc}/0/0/0/0/0/0/0/0/0/0`, { headers: hdrs }),
      axios.get(`https://api.careeronestop.org/v1/occupation/${CAREERONESTOP_USER_ID}/${soc}/${loc}/0/0/0/0/0/0/0/0`, { headers: hdrs }),
    ]);
    const combined = { wages: wageRes.data, occupation: occRes.data, marketAnalysis: { percentileRank: 87, timeToFillEstimate: 67, demandScore: 'High' } };
    cache.set(cacheKey, { data: combined, expiry: Date.now() + CACHE_TTL });
    return res.json(combined);
  } catch (e: any) {
    return res.json({ isDemo: true, error: e.message });
  }
});

// ── chat ──────────────────────────────────────────────────────────────────────
const CHAT_SYSTEM_PROMPT = `You are the AI assistant for Trussk, a specialized recruiting platform for heavy civil construction only.

Trussk's scope covers ONLY these industries:
- Heavy Civil Engineering
- Infrastructure (roads, bridges, utilities, drainage)
- Road & Bridge construction
- Heavy Highway construction
- Marine Construction

Your job:
1. Analyze if the role is within scope.
2. If OUT OF SCOPE: Kindly explain Trussk only covers heavy civil construction, list the 5 categories, ask if they have a matching role. Set outOfScope: true.
3. If IN SCOPE: From the very first message, extract as much structured job data as possible and populate the jobPost object. Then ask the user to give the post a name and ask 1-2 clarifying questions for any missing key fields.
4. After each user reply, update the jobPost with any new information.
5. Once jobPost has title, location, summary, and at least 2 requirements: set readyToSearch: true.
6. Keep chat messages under 100 words. Be warm and professional.

Always respond in this exact JSON format (no markdown, no code fences):
{
  "message": "your conversational response here",
  "readyToSearch": false,
  "outOfScope": false,
  "jobPost": { "title": "", "location": "", "employmentType": "", "experienceLevel": "", "industry": "", "salary": "", "summary": "", "responsibilities": [], "requirements": [], "niceToHave": [] }
}`;

app.post('/api/chat', async (req, res) => {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: 'messages array is required' });
  const processed = messages.map((m: any, i: number) => ({
    role: m.role, content: i === 0 && m.role === 'user' && m.content.length > 4000 ? m.content.slice(0, 4000) + '\n\n[truncated]' : m.content,
  }));
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' });
    const response = await anthropic.messages.create({ model: 'claude-sonnet-4-6', max_tokens: 1500, system: CHAT_SYSTEM_PROMPT, messages: processed });
    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return res.status(500).json({ error: 'Invalid AI response', message: 'Formatting issue, please try again.', readyToSearch: false, outOfScope: false });
    const parsed = JSON.parse(match[0]);
    return res.json({ message: parsed.message || '', readyToSearch: Boolean(parsed.readyToSearch), outOfScope: Boolean(parsed.outOfScope), jobPost: parsed.jobPost || null });
  } catch (e: any) {
    return res.status(500).json({ error: 'Failed', message: "I'm having trouble connecting. Please try again.", readyToSearch: false, outOfScope: false });
  }
});

// ── shared auth helper ────────────────────────────────────────────────────────
async function verifyAndGetTokens(req: express.Request, res: express.Response): Promise<{ uid: string; accessToken: string } | null> {
  if (!adminDb) { res.status(503).json({ error: 'admin_unavailable' }); return null; }
  const rawAuth = req.headers.authorization ?? '';
  const idToken = rawAuth.startsWith('Bearer ') ? rawAuth.slice(7) : null;
  if (!idToken) { res.status(401).json({ error: 'missing_token', message: 'Authorization header required.' }); return null; }
  let uid: string;
  try { const d = await admin.auth().verifyIdToken(idToken); uid = d.uid; }
  catch { res.status(401).json({ error: 'invalid_token', message: 'Firebase ID token is invalid or expired.' }); return null; }
  let accessToken: string;
  try {
    const snap = await adminDb.doc(`users/${uid}/tokens/google`).get();
    if (!snap.exists) { res.status(401).json({ error: 'no_google_token', message: 'Google account not connected.' }); return null; }
    accessToken = (snap.data() as { accessToken: string }).accessToken;
  } catch { res.status(503).json({ error: 'firestore_error', message: 'Could not retrieve token.' }); return null; }
  return { uid, accessToken };
}

// ── send-candidate-email ──────────────────────────────────────────────────────
app.post('/api/send-candidate-email', async (req, res) => {
  const auth = await verifyAndGetTokens(req, res);
  if (!auth) return;
  const { uid, accessToken } = auth;
  const { candidateEmail, subject, body } = req.body as { candidateEmail: string; subject: string; body: string };
  if (!candidateEmail || !subject || !body) return res.status(400).json({ error: 'missing_fields', message: 'candidateEmail, subject, and body are required.' });
  if (/[\r\n]/.test(candidateEmail) || /[\r\n]/.test(subject)) return res.status(400).json({ error: 'invalid_fields', message: 'Fields may not contain line breaks.' });
  const rawEmail = [`From: me`, `To: ${candidateEmail}`, `Subject: ${subject}`, `Content-Type: text/plain; charset=utf-8`, ``, body].join('\r\n');
  const encoded = Buffer.from(rawEmail).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  try {
    const { data } = await axios.post('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', { raw: encoded }, { headers: { Authorization: `Bearer ${accessToken}` } });
    const { threadId } = data;
    if (!threadId) return res.status(500).json({ error: 'gmail_error', message: 'Email sent but thread ID was missing.' });
    await adminDb!.doc(`users/${uid}/app_threads/${threadId}`).set({ candidateEmail, subject, sentAt: admin.firestore.FieldValue.serverTimestamp() });
    return res.json({ success: true, threadId });
  } catch (err: any) {
    const s = err.response?.status;
    if (s === 401) return res.status(401).json({ error: 'token_expired', message: 'Google access token expired.' });
    if (s === 403) return res.status(403).json({ error: 'insufficient_scope' });
    return res.status(500).json({ error: 'gmail_error', message: 'Failed to send email.' });
  }
});

// ── fetch-threads ─────────────────────────────────────────────────────────────
app.get('/api/fetch-threads', async (req, res) => {
  const auth = await verifyAndGetTokens(req, res);
  if (!auth) return;
  const { uid, accessToken } = auth;
  const { threadId } = req.query as Record<string, string>;
  try {
    if (threadId) {
      const { data } = await axios.get(`https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}`, { headers: { Authorization: `Bearer ${accessToken}` }, params: { format: 'full' } });
      return res.json(sanitiseThread(data));
    } else {
      const snapshot = await adminDb!.collection(`users/${uid}/app_threads`).get();
      if (snapshot.empty) return res.json({ threads: [], resultSizeEstimate: 0 });
      const threadIds = snapshot.docs.map(d => d.id);
      const results = await Promise.all(threadIds.map(tid =>
        axios.get(`https://gmail.googleapis.com/gmail/v1/users/me/threads/${tid}`, { headers: { Authorization: `Bearer ${accessToken}` }, params: { format: 'full' } })
          .then(r => { const t = sanitiseThread(r.data); const m = t.messages?.[0]; if (!m) return null; return { id: t.id, threadId: t.id, snippet: t.snippet, internalDate: m.internalDate, labelIds: m.labelIds ?? [], headers: m.headers ?? [] }; })
          .catch(err => { const s = err.response?.status; if (s === 401 || s === 403) throw err; return null; })
      ));
      const threads = results.filter(Boolean);
      return res.json({ threads, resultSizeEstimate: threads.length });
    }
  } catch (err: any) {
    const s = err.response?.status;
    if (s === 401) return res.status(401).json({ error: 'token_expired' });
    if (s === 403) return res.status(403).json({ error: 'insufficient_scope' });
    return res.status(500).json({ error: 'gmail_error' });
  }
});

// ── fetch-calendar ────────────────────────────────────────────────────────────
app.get('/api/fetch-calendar', async (req, res) => {
  const auth = await verifyAndGetTokens(req, res);
  if (!auth) return;
  const { accessToken } = auth;
  const { calendarId = 'primary', maxResults = '10', timeMin = new Date().toISOString() } = req.query as Record<string, string>;
  try {
    const { data } = await axios.get(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { maxResults: Math.min(parseInt(maxResults, 10) || 10, 50), timeMin, singleEvents: true, orderBy: 'startTime' },
    });
    return res.json({ events: (data.items ?? []).map(sanitiseEvent), nextPageToken: data.nextPageToken ?? null });
  } catch (err: any) {
    const s = err.response?.status;
    if (s === 401) return res.status(401).json({ error: 'token_expired' });
    if (s === 403) return res.status(403).json({ error: 'insufficient_scope' });
    return res.status(500).json({ error: 'calendar_error' });
  }
});

// ── helpers ───────────────────────────────────────────────────────────────────
function decodeBody(payload: any): string {
  if (!payload) return '';
  const decode = (d: string) => d ? Buffer.from(d.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8') : '';
  function collect(part: any, type: string): string {
    if (!part) return '';
    if (part.mimeType === type && part.body?.data) return decode(part.body.data);
    if (Array.isArray(part.parts)) for (const p of part.parts) { const f = collect(p, type); if (f) return f; }
    return '';
  }
  const plain = collect(payload, 'text/plain');
  if (plain.trim()) return plain;
  const html = collect(payload, 'text/html');
  return html ? html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim() : '';
}

function sanitiseThread(thread: any) {
  if (!thread || typeof thread !== 'object') return thread;
  return {
    id: thread.id, snippet: thread.snippet, historyId: thread.historyId,
    messages: Array.isArray(thread.messages) ? thread.messages.map((m: any) => ({
      id: m.id, threadId: m.threadId, labelIds: m.labelIds, snippet: m.snippet, internalDate: m.internalDate,
      headers: (m.payload?.headers ?? []).filter((h: any) => ['Subject', 'From', 'Date', 'To', 'Cc'].includes(h.name)),
      body: decodeBody(m.payload),
    })) : undefined,
  };
}

function sanitiseEvent(e: any) {
  return { id: e.id, summary: e.summary, description: e.description, start: e.start, end: e.end, attendees: (e.attendees ?? []).map((a: any) => ({ email: a.email, displayName: a.displayName, responseStatus: a.responseStatus })), hangoutLink: e.hangoutLink, conferenceData: e.conferenceData, status: e.status };
}

// ── start ─────────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '8080', 10);
app.listen(PORT, '0.0.0.0', () => console.log(`API server running on port ${PORT}`));
