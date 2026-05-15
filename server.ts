import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync } from 'fs';
import dotenv from 'dotenv';
import axios from 'axios';
import Anthropic from '@anthropic-ai/sdk';
import multer from 'multer';
import { createRequire as _createRequire } from 'module';
const _require = _createRequire(import.meta.url);
const pdfParse = _require('pdf-parse');
import mammoth from 'mammoth';
import admin from 'firebase-admin';

dotenv.config({ path: '.env.local' });
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------------------------------------------------------------
// Firebase Admin — initialise once.
// Key resolution order:
//   1. FIREBASE_ADMIN_CREDENTIALS env var (base64-encoded JSON — preferred for deploys)
//   2. ./firebase-admin.json file in the project root (local dev convenience)
// If neither is present the server starts but Gmail proxy routes return 503.
// ---------------------------------------------------------------------------
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
      console.warn('[Admin] firebase-admin.json not found and FIREBASE_ADMIN_CREDENTIALS not set.');
      console.warn('[Admin] Gmail proxy routes (/api/fetch-threads) will return 503 until a key is provided.');
      return;
    }

    admin.initializeApp({ credential });
    adminDb = admin.firestore();
    console.log('[Admin] Firebase Admin SDK initialised.');
  } catch (err: any) {
    console.error('[Admin] Failed to initialise Firebase Admin:', err.message);
  }
}());

const PORT = 3000;
const CAREERONESTOP_USER_ID = process.env.CAREERONESTOP_USER_ID;
const CAREERONESTOP_TOKEN = process.env.CAREERONESTOP_TOKEN;

async function startServer() {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    if (req.path.startsWith('/api/')) console.log(`[REQ] ${req.method} ${req.path}`);
    next();
  });

  // Document parsing endpoint
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

  app.post('/api/parse-document', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const { originalname, mimetype, buffer } = req.file;
    console.log(`[Parse] ${originalname} (${mimetype}, ${buffer.length} bytes)`);

    try {
      let text = '';

      if (mimetype === 'application/pdf' || originalname.endsWith('.pdf')) {
        const data = await pdfParse(buffer);
        text = data.text;
      } else if (
        mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        originalname.endsWith('.docx')
      ) {
        const result = await mammoth.extractRawText({ buffer });
        text = result.value;
      } else if (mimetype === 'text/plain' || originalname.endsWith('.txt')) {
        text = buffer.toString('utf-8');
      } else {
        return res.status(400).json({ error: 'Unsupported file type. Please upload a PDF, DOCX, or TXT file.' });
      }

      text = text.replace(/\s+/g, ' ').trim();
      if (!text || text.length < 20) {
        return res.status(400).json({ error: 'Could not extract text from this file. Please try a different format.' });
      }

      console.log(`[Parse] Extracted ${text.length} characters`);
      return res.json({ text, filename: originalname });
    } catch (err: any) {
      console.error('[Parse] Error:', err.message);
      return res.status(500).json({ error: 'Failed to parse document. Please try again.' });
    }
  });

  // Simple in-memory cache
  const cache = new Map<string, { data: any; expiry: number }>();
  const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

  // Market Intelligence API Route
  app.get('/api/market-intelligence', async (req, res) => {
    const { soc, location } = req.query;

    if (!soc || !location) {
      return res.status(400).json({ error: 'SOC code and location are required' });
    }

    const cacheKey = `${soc}-${location}`;
    const cached = cache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      return res.json(cached.data);
    }

    if (!CAREERONESTOP_USER_ID || !CAREERONESTOP_TOKEN) {
      // Fallback for demo if keys aren't set yet (though they should be)
      return res.json({
        isDemo: true,
        wages: {
          median: 165000,
          pct10: 120000,
          pct90: 210000,
          description: "Construction Managers (11-9021) in Florida Gulf Coast"
        },
        demand: {
          growth: "11%",
          openings: 3200,
          timeToFill: 67
        }
      });
    }

    try {
      // Normalize location (CareerOneStop preferred format)
      let normalizedLocation = String(location);
      if (normalizedLocation.toLowerCase() === 'florida') normalizedLocation = 'FL';
      if (normalizedLocation.toLowerCase() === 'california') normalizedLocation = 'CA';
      if (normalizedLocation.toLowerCase() === 'texas') normalizedLocation = 'TX';
      if (normalizedLocation.toLowerCase() === 'new york') normalizedLocation = 'NY';
      
      // 1. Fetch Wage Data
      // Standard v1 Wages pattern often requires 10 trailing flag parameters
      const wageUrl = `https://api.careeronestop.org/v1/wages/${CAREERONESTOP_USER_ID}/${soc}/${normalizedLocation}/0/0/0/0/0/0/0/0/0/0`;
      console.log(`[Market Intel] Fetching wages: SOC=${soc}, Loc=${normalizedLocation}`);
      
      const wageResponse = await axios.get(wageUrl, {
        headers: {
          'Authorization': `Bearer ${CAREERONESTOP_TOKEN}`,
          'Accept': 'application/json'
        }
      });

      // 2. Fetch Occupation Data (for growth/demand)
      // Occupation Details pattern often requires 8 trailing flag parameters
      const occUrl = `https://api.careeronestop.org/v1/occupation/${CAREERONESTOP_USER_ID}/${soc}/${normalizedLocation}/0/0/0/0/0/0/0/0`;
      console.log(`[Market Intel] Fetching occupation details: SOC=${soc}, Loc=${normalizedLocation}`);
      
      const occResponse = await axios.get(occUrl, {
        headers: {
          'Authorization': `Bearer ${CAREERONESTOP_TOKEN}`,
          'Accept': 'application/json'
        }
      });

      const combinedData = {
        wages: wageResponse.data,
        occupation: occResponse.data,
        // Computed internal metric
        marketAnalysis: {
          percentileRank: 87, // Mocking the logic for percentile calculation based on input offer
          timeToFillEstimate: 67,
          demandScore: 'High'
        }
      };

      cache.set(cacheKey, { data: combinedData, expiry: Date.now() + CACHE_TTL });
      res.json(combinedData);
    } catch (error: any) {
      console.error('CareerOneStop API Error:', error.message);
      
      // Fallback to demo data on API error so the UI doesn't break
      return res.json({
        isDemo: true,
        error: error.message,
        wages: [
          { name: '10th', value: 122000, label: 'Entry' },
          { name: '25th', value: 147000, label: 'Standard' },
          { name: 'Median', value: 168000, label: 'Market Avg' },
          { name: '75th', value: 189000, label: 'Highly Exp' },
          { name: '90th', value: 215000, label: 'Industry Elite' },
        ],
        analysis: {
          percentile: 88,
          timeToFill: 64,
          demand: "High",
          growth: "12%",
          unemployment: "2.3%"
        }
      });
    }
  });

  // Chat / Clarification API Route
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
3. If IN SCOPE: From the very first message, extract as much structured job data as possible and populate the jobPost object. Then ask the user to give the post a name (e.g. "Senior PM – Tampa Bridge Project") and ask 1-2 clarifying questions for any missing key fields (location, experience, requirements, salary).
4. After each user reply, update the jobPost with any new information. Continue asking about missing fields naturally.
5. Once jobPost has title, location, summary, and at least 2 requirements: set readyToSearch: true and say something like "Your job post looks great — ready to find candidates?"
6. Keep chat messages under 100 words. Be warm and professional.

Always respond in this exact JSON format (no markdown, no code fences):
{
  "message": "your conversational response here",
  "readyToSearch": false,
  "outOfScope": false,
  "jobPost": {
    "title": "",
    "location": "",
    "employmentType": "",
    "experienceLevel": "",
    "industry": "",
    "salary": "",
    "summary": "",
    "responsibilities": [],
    "requirements": [],
    "niceToHave": []
  }
}

Rules for jobPost:
- Extract everything possible from the initial description immediately
- Use empty string "" for unknown text fields, empty array [] for unknown list fields
- Never use null
- responsibilities, requirements, niceToHave must always be arrays of strings
- Update and expand jobPost fields with every new message — never shrink them
- Once title, location, summary, and requirements have content, set readyToSearch: true`;

  app.post('/api/chat', async (req, res) => {
    const { messages, jobDescription } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array is required' });
    }

    // Truncate very long first messages (e.g. parsed PDFs) to keep context manageable
    const processedMessages = messages.map((m: { role: string; content: string }, i: number) => ({
      role: m.role,
      content: i === 0 && m.role === 'user' && m.content.length > 4000
        ? m.content.slice(0, 4000) + '\n\n[Document truncated for brevity]'
        : m.content,
    }));

    console.log('[Chat API] Messages count:', processedMessages.length);

    try {
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' });

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
        system: CHAT_SYSTEM_PROMPT,
        messages: processedMessages.map((m: { role: string; content: string }) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      });

      const text = response.content[0].type === 'text' ? response.content[0].text : '';
      console.log('[Chat API] Raw Claude response:', text);

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('[Chat API] No JSON found in response:', text);
        return res.status(500).json({ error: 'Invalid AI response format', message: "Sorry, I had a formatting issue. Please try again.", readyToSearch: false, outOfScope: false });
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return res.json({
        message: parsed.message || '',
        readyToSearch: Boolean(parsed.readyToSearch),
        outOfScope: Boolean(parsed.outOfScope),
        jobPost: parsed.jobPost || null,
      });
    } catch (error: any) {
      console.error('[Chat API] Full error:', JSON.stringify(error?.error || error?.message || error, null, 2));
      return res.status(500).json({
        error: 'Failed to generate response',
        message: "I'm having trouble connecting right now. Please try again in a moment.",
        readyToSearch: false,
        outOfScope: false,
      });
    }
  });

  // ---------------------------------------------------------------------------
  // GET /api/fetch-threads
  // Proxies Gmail thread list (or a single thread) using the caller's stored
  // Google access token. The uid is derived from a verified Firebase ID token
  // in the Authorization header — never trusted from user input.
  //
  // Query params:
  //   threadId? — if provided, fetches that single thread; otherwise lists threads
  //   maxResults? — number of threads to return (default 20, max 50)
  //
  // Authorization: Bearer <firebase-id-token>
  // ---------------------------------------------------------------------------
  app.get('/api/fetch-threads', async (req, res) => {
    if (!adminDb) {
      return res.status(503).json({
        error: 'admin_unavailable',
        message: 'Gmail proxy is not configured. Add firebase-admin.json or FIREBASE_ADMIN_CREDENTIALS.',
      });
    }

    // 1. Verify the caller's Firebase ID token
    const rawAuth = req.headers.authorization ?? '';
    const idToken = rawAuth.startsWith('Bearer ') ? rawAuth.slice(7) : null;

    if (!idToken) {
      return res.status(401).json({ error: 'missing_token', message: 'Authorization header required.' });
    }

    let uid: string;
    try {
      const decoded = await admin.auth().verifyIdToken(idToken);
      uid = decoded.uid;
    } catch {
      return res.status(401).json({ error: 'invalid_token', message: 'Firebase ID token is invalid or expired.' });
    }

    // 2. Retrieve the stored Google access token from Firestore
    const tokenSnap = await adminDb.doc(`users/${uid}/tokens/google`).get();

    if (!tokenSnap.exists) {
      return res.status(401).json({
        error: 'no_google_token',
        message: 'Google account not connected. Visit the Integrations tab and sign in with Google.',
      });
    }

    const { accessToken } = tokenSnap.data() as { accessToken: string };

    // 3. Proxy the Gmail API call
    const { threadId, maxResults = '20' } = req.query as Record<string, string>;
    const max = Math.min(parseInt(maxResults, 10) || 20, 50);

    try {
      if (threadId) {
        // Fetch full thread with decoded body parts
        const { data } = await axios.get(
          `https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
            params: { format: 'full' },
          }
        );
        return res.json(sanitiseThread(data));
      } else {
        // Closed-loop: fetch only threads the app sent, registered in Firestore.
        const snapshot = await adminDb.collection(`users/${uid}/app_threads`).get();

        if (snapshot.empty) {
          return res.json({ threads: [], resultSizeEstimate: 0 });
        }

        const threadIds = snapshot.docs.map(d => d.id);

        // Fetch all registered threads — app_threads is bounded by emails sent via this app.
        const results = await Promise.all(
          threadIds.map(tid =>
            axios
              .get(
                `https://gmail.googleapis.com/gmail/v1/users/me/threads/${tid}`,
                {
                  headers: { Authorization: `Bearer ${accessToken}` },
                  params: { format: 'full' },
                }
              )
              .then(r => {
                const thread = sanitiseThread(r.data);
                const firstMsg = thread.messages?.[0];
                if (!firstMsg) return null;
                // Hoist first-message metadata to the top level so the list view
                // (which expects a flat GmailMessage shape) can read headers,
                // internalDate, and labelIds directly.
                return {
                  id: thread.id,
                  threadId: thread.id,
                  snippet: thread.snippet,
                  internalDate: firstMsg.internalDate,
                  labelIds: firstMsg.labelIds ?? [],
                  headers: firstMsg.headers ?? [],
                };
              })
              .catch((err) => {
                const status = err.response?.status;
                if (status === 401 || status === 403) throw err;
                console.warn(`[fetch-threads] Could not fetch thread ${tid}:`, err.message);
                return null;
              })
          )
        );

        const threads = results.filter(Boolean);
        return res.json({
          threads,
          resultSizeEstimate: threads.length,
        });
      }
    } catch (err: any) {
      const status = err.response?.status;

      if (status === 401) {
        return res.status(401).json({
          error: 'token_expired',
          message: 'Google access token has expired (~1 hour limit). Sign out and sign in again to refresh.',
        });
      }

      if (status === 403) {
        return res.status(403).json({
          error: 'insufficient_scope',
          message: 'Gmail API returned 403. Ensure gmail.readonly scope was granted during sign-in.',
        });
      }

      console.error('[fetch-threads] Gmail API error:', err.response?.data ?? err.message);
      return res.status(500).json({ error: 'gmail_error', message: 'Failed to fetch Gmail threads.' });
    }
  });

  // ---------------------------------------------------------------------------
  // POST /api/send-candidate-email
  // Sends an outreach email via Gmail and registers the resulting threadId in
  // Firestore at users/{uid}/app_threads/{threadId} so the closed-loop inbox
  // can later fetch only app-originated threads.
  //
  // Body: { candidateEmail, subject, body }
  // Authorization: Bearer <firebase-id-token>
  // ---------------------------------------------------------------------------
  app.post('/api/send-candidate-email', async (req, res) => {
    if (!adminDb) {
      return res.status(503).json({
        error: 'admin_unavailable',
        message: 'Gmail proxy is not configured. Add firebase-admin.json or FIREBASE_ADMIN_CREDENTIALS.',
      });
    }

    const rawAuth = req.headers.authorization ?? '';
    const idToken = rawAuth.startsWith('Bearer ') ? rawAuth.slice(7) : null;
    if (!idToken) {
      return res.status(401).json({ error: 'missing_token', message: 'Authorization header required.' });
    }

    let uid: string;
    try {
      const decoded = await admin.auth().verifyIdToken(idToken);
      uid = decoded.uid;
    } catch {
      return res.status(401).json({ error: 'invalid_token', message: 'Firebase ID token is invalid or expired.' });
    }

    let accessToken: string;
    try {
      const tokenSnap = await adminDb.doc(`users/${uid}/tokens/google`).get();
      if (!tokenSnap.exists) {
        return res.status(401).json({
          error: 'no_google_token',
          message: 'Google account not connected. Visit the Integrations tab and sign in with Google.',
        });
      }
      accessToken = (tokenSnap.data() as { accessToken: string }).accessToken;
    } catch (fsErr: any) {
      console.error('[send-candidate-email] Firestore error:', fsErr.message);
      return res.status(503).json({ error: 'firestore_error', message: 'Could not retrieve token. Try again.' });
    }

    const { candidateEmail, subject, body } = req.body as {
      candidateEmail: string;
      subject: string;
      body: string;
    };

    if (!candidateEmail || !subject || !body) {
      return res.status(400).json({
        error: 'missing_fields',
        message: 'candidateEmail, subject, and body are required.',
      });
    }

    if (/[\r\n]/.test(candidateEmail) || /[\r\n]/.test(subject)) {
      return res.status(400).json({
        error: 'invalid_fields',
        message: 'Fields may not contain line breaks.',
      });
    }

    // Build RFC 2822 raw email string
    const rawEmail = [
      `From: me`,
      `To: ${candidateEmail}`,
      `Subject: ${subject}`,
      `Content-Type: text/plain; charset=utf-8`,
      ``,
      body,
    ].join('\r\n');

    // Base64url-encode (Gmail requirement: use - and _ instead of + and /)
    const encoded = Buffer.from(rawEmail)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    try {
      const { data } = await axios.post(
        'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
        { raw: encoded },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      const { threadId } = data;

      if (!threadId) {
        console.error('[send-candidate-email] Gmail returned no threadId:', data);
        return res.status(500).json({ error: 'gmail_error', message: 'Email sent but thread ID was missing.' });
      }

      await adminDb.doc(`users/${uid}/app_threads/${threadId}`).set({
        candidateEmail,
        subject,
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return res.json({ success: true, threadId });
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 401) {
        return res.status(401).json({
          error: 'token_expired',
          message: 'Google access token has expired. Sign out and sign in again to refresh.',
        });
      }
      if (status === 403) {
        return res.status(403).json({
          error: 'insufficient_scope',
          message: 'Gmail API returned 403. Ensure gmail.send scope was granted during sign-in.',
        });
      }
      console.error('[send-candidate-email] Gmail API error:', err.response?.data ?? err.message);
      return res.status(500).json({ error: 'gmail_error', message: 'Failed to send email.' });
    }
  });

  // ---------------------------------------------------------------------------
  // GET /api/fetch-calendar
  // Proxies Google Calendar events using the same ID-token auth pattern.
  //
  // Query params:
  //   calendarId? — defaults to 'primary'
  //   maxResults?  — default 10, max 50
  //   timeMin?     — ISO8601, defaults to now
  // ---------------------------------------------------------------------------
  app.get('/api/fetch-calendar', async (req, res) => {
    if (!adminDb) {
      return res.status(503).json({ error: 'admin_unavailable', message: 'Admin SDK not configured.' });
    }

    const rawAuth = req.headers.authorization ?? '';
    const idToken = rawAuth.startsWith('Bearer ') ? rawAuth.slice(7) : null;
    if (!idToken) return res.status(401).json({ error: 'missing_token' });

    let uid: string;
    try {
      const decoded = await admin.auth().verifyIdToken(idToken);
      uid = decoded.uid;
    } catch {
      return res.status(401).json({ error: 'invalid_token' });
    }

    const tokenSnap = await adminDb.doc(`users/${uid}/tokens/google`).get();
    if (!tokenSnap.exists) {
      return res.status(401).json({ error: 'no_google_token', message: 'Google account not connected.' });
    }
    const { accessToken } = tokenSnap.data() as { accessToken: string };

    const {
      calendarId = 'primary',
      maxResults = '10',
      timeMin = new Date().toISOString(),
    } = req.query as Record<string, string>;

    try {
      const { data } = await axios.get(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          params: {
            maxResults: Math.min(parseInt(maxResults, 10) || 10, 50),
            timeMin,
            singleEvents: true,
            orderBy: 'startTime',
          },
        }
      );
      return res.json({
        events: (data.items ?? []).map(sanitiseEvent),
        nextPageToken: data.nextPageToken ?? null,
      });
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 401) return res.status(401).json({ error: 'token_expired' });
      if (status === 403) return res.status(403).json({ error: 'insufficient_scope' });
      console.error('[fetch-calendar] Google Calendar error:', err.response?.data ?? err.message);
      return res.status(500).json({ error: 'calendar_error' });
    }
  });

  // ---------------------------------------------------------------------------
  // POST /api/create-meeting
  // Creates a Google Meet (via Calendar API) or Teams meeting (via Graph API)
  // using the caller's stored OAuth token. Returns the join URL.
  //
  // Body: { date, time, durationMinutes, candidateName }
  // Authorization: Bearer <firebase-id-token>
  // ---------------------------------------------------------------------------
  app.post('/api/create-meeting', async (req, res) => {
    if (!adminDb) {
      return res.status(503).json({ error: 'admin_unavailable', meetingUrl: null });
    }

    const rawAuth = req.headers.authorization ?? '';
    const idToken = rawAuth.startsWith('Bearer ') ? rawAuth.slice(7) : null;
    if (!idToken) return res.status(401).json({ error: 'missing_token' });

    let uid: string;
    try {
      const decoded = await admin.auth().verifyIdToken(idToken);
      uid = decoded.uid;
    } catch {
      return res.status(401).json({ error: 'invalid_token' });
    }

    const { date, time, durationMinutes = 60, candidateName } = req.body;

    if (!date || !time || !candidateName) {
      return res.status(400).json({ error: 'date, time, and candidateName are required' });
    }

    // Build start/end ISO datetimes from "YYYY-MM-DD" and "10:30 AM"
    const [year, month, day] = date.split('-').map(Number);
    const timeMatch = String(time).match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!timeMatch) return res.status(400).json({ error: 'invalid_time_format' });

    let hours = parseInt(timeMatch[1]);
    const minutes = parseInt(timeMatch[2]);
    const meridiem = timeMatch[3].toUpperCase();
    if (meridiem === 'PM' && hours !== 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;

    const startDate = new Date(year, month - 1, day, hours, minutes);
    const endDate = new Date(startDate.getTime() + durationMinutes * 60000);
    const startIso = startDate.toISOString();
    const endIso = endDate.toISOString();
    const subject = `Interview with ${candidateName}`;

    // Try Google Calendar first
    const googleSnap = await adminDb.doc(`users/${uid}/tokens/google`).get();
    if (googleSnap.exists) {
      const { accessToken } = googleSnap.data() as { accessToken: string };
      try {
        const { data } = await axios.post(
          'https://www.googleapis.com/calendar/v3/calendars/primary/events',
          {
            summary: subject,
            start: { dateTime: startIso, timeZone: 'America/New_York' },
            end: { dateTime: endIso, timeZone: 'America/New_York' },
            conferenceData: {
              createRequest: {
                requestId: `trussk-${Date.now()}`,
                conferenceSolutionKey: { type: 'hangoutsMeet' },
              },
            },
          },
          {
            headers: { Authorization: `Bearer ${accessToken}` },
            params: { conferenceDataVersion: 1 },
          }
        );
        const meetingUrl =
          data.hangoutLink ||
          data.conferenceData?.entryPoints?.[0]?.uri ||
          null;
        console.log('[create-meeting] Google Meet created:', meetingUrl);
        return res.json({ meetingUrl, provider: 'google' });
      } catch (err: any) {
        console.error('[create-meeting] Google error:', err.response?.data ?? err.message);
        // Fall through to Microsoft
      }
    }

    // Try Microsoft Teams
    const msSnap = await adminDb.doc(`users/${uid}/tokens/microsoft`).get();
    if (msSnap.exists) {
      const { accessToken } = msSnap.data() as { accessToken: string };
      try {
        const { data } = await axios.post(
          'https://graph.microsoft.com/v1.0/me/onlineMeetings',
          { startDateTime: startIso, endDateTime: endIso, subject },
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        console.log('[create-meeting] Teams meeting created:', data.joinWebUrl);
        return res.json({ meetingUrl: data.joinWebUrl, provider: 'microsoft' });
      } catch (err: any) {
        console.error('[create-meeting] Microsoft error:', err.response?.data ?? err.message);
      }
    }

    // No provider connected or both failed — caller can use manual link
    return res.json({ meetingUrl: null, provider: null });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production serving
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

// ---------------------------------------------------------------------------
// Body decoder — walks Gmail's MIME tree and returns the best text content.
// Prefers text/plain; falls back to text/html with tags stripped.
// Gmail uses base64url encoding (- and _ instead of + and /).
// ---------------------------------------------------------------------------
function decodeBody(payload: any): string {
  if (!payload) return '';

  // Decode a single base64url data blob
  const decode = (data: string): string => {
    if (!data) return '';
    const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
    return Buffer.from(base64, 'base64').toString('utf-8');
  };

  // Recursively collect parts by mimeType
  function collect(part: any, type: string): string {
    if (!part) return '';
    if (part.mimeType === type && part.body?.data) {
      return decode(part.body.data);
    }
    if (Array.isArray(part.parts)) {
      for (const p of part.parts) {
        const found = collect(p, type);
        if (found) return found;
      }
    }
    return '';
  }

  // Try plain text first
  const plain = collect(payload, 'text/plain');
  if (plain.trim()) return plain;

  // Fall back to HTML with tags stripped
  const html = collect(payload, 'text/html');
  if (html) {
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  return '';
}

// ---------------------------------------------------------------------------
// Sanitisers
// ---------------------------------------------------------------------------
function sanitiseThread(thread: any) {
  if (!thread || typeof thread !== 'object') return thread;
  return {
    id: thread.id,
    snippet: thread.snippet,
    historyId: thread.historyId,
    messages: Array.isArray(thread.messages)
      ? thread.messages.map((m: any) => ({
          id: m.id,
          threadId: m.threadId,
          labelIds: m.labelIds,
          snippet: m.snippet,
          internalDate: m.internalDate,
          headers: (m.payload?.headers ?? []).filter((h: any) =>
            ['Subject', 'From', 'Date', 'To', 'Cc'].includes(h.name)
          ),
          body: decodeBody(m.payload),
        }))
      : undefined,
  };
}

function sanitiseEvent(event: any) {
  return {
    id: event.id,
    summary: event.summary,
    description: event.description,
    start: event.start,
    end: event.end,
    attendees: (event.attendees ?? []).map((a: any) => ({
      email: a.email,
      displayName: a.displayName,
      responseStatus: a.responseStatus,
    })),
    hangoutLink: event.hangoutLink,
    conferenceData: event.conferenceData,
    status: event.status,
  };
}

startServer();
