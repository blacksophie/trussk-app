"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.api = void 0;
const admin = __importStar(require("firebase-admin"));
const functions = __importStar(require("firebase-functions"));
const express_1 = __importDefault(require("express"));
const axios_1 = __importDefault(require("axios"));
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const multer_1 = __importDefault(require("multer"));
const mammoth_1 = __importDefault(require("mammoth"));
// pdf-parse is CommonJS only
const pdfParse = require('pdf-parse');
// ---------------------------------------------------------------------------
// Firebase Admin — auto-initialises in Cloud Functions environment.
// ---------------------------------------------------------------------------
admin.initializeApp();
const adminDb = admin.firestore();
const CAREERONESTOP_USER_ID = process.env.CAREERONESTOP_USER_ID;
const CAREERONESTOP_TOKEN = process.env.CAREERONESTOP_TOKEN;
const app = (0, express_1.default)();
app.use(express_1.default.json());
// ---------------------------------------------------------------------------
// POST /api/parse-document
// ---------------------------------------------------------------------------
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
app.post('/api/parse-document', upload.single('file'), async (req, res) => {
    if (!req.file)
        return res.status(400).json({ error: 'No file uploaded' });
    const { originalname, mimetype, buffer } = req.file;
    try {
        let text = '';
        if (mimetype === 'application/pdf' || originalname.endsWith('.pdf')) {
            const data = await pdfParse(buffer);
            text = data.text;
        }
        else if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            originalname.endsWith('.docx')) {
            const result = await mammoth_1.default.extractRawText({ buffer });
            text = result.value;
        }
        else if (mimetype === 'text/plain' || originalname.endsWith('.txt')) {
            text = buffer.toString('utf-8');
        }
        else {
            return res.status(400).json({ error: 'Unsupported file type. Please upload a PDF, DOCX, or TXT file.' });
        }
        text = text.replace(/\s+/g, ' ').trim();
        if (!text || text.length < 20) {
            return res.status(400).json({ error: 'Could not extract text from this file.' });
        }
        return res.json({ text, filename: originalname });
    }
    catch (err) {
        return res.status(500).json({ error: 'Failed to parse document.' });
    }
});
// ---------------------------------------------------------------------------
// GET /api/market-intelligence
// ---------------------------------------------------------------------------
const cache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000;
app.get('/api/market-intelligence', async (req, res) => {
    const { soc, location } = req.query;
    if (!soc || !location)
        return res.status(400).json({ error: 'SOC code and location are required' });
    const cacheKey = `${soc}-${location}`;
    const cached = cache.get(cacheKey);
    if (cached && cached.expiry > Date.now())
        return res.json(cached.data);
    if (!CAREERONESTOP_USER_ID || !CAREERONESTOP_TOKEN) {
        return res.json({
            isDemo: true,
            wages: { median: 165000, pct10: 120000, pct90: 210000, description: 'Demo data' },
            demand: { growth: '11%', openings: 3200, timeToFill: 67 },
        });
    }
    try {
        let loc = String(location);
        if (loc.toLowerCase() === 'florida')
            loc = 'FL';
        if (loc.toLowerCase() === 'california')
            loc = 'CA';
        if (loc.toLowerCase() === 'texas')
            loc = 'TX';
        if (loc.toLowerCase() === 'new york')
            loc = 'NY';
        const headers = { Authorization: `Bearer ${CAREERONESTOP_TOKEN}`, Accept: 'application/json' };
        const [wageRes, occRes] = await Promise.all([
            axios_1.default.get(`https://api.careeronestop.org/v1/wages/${CAREERONESTOP_USER_ID}/${soc}/${loc}/0/0/0/0/0/0/0/0/0/0`, { headers }),
            axios_1.default.get(`https://api.careeronestop.org/v1/occupation/${CAREERONESTOP_USER_ID}/${soc}/${loc}/0/0/0/0/0/0/0/0`, { headers }),
        ]);
        const combinedData = { wages: wageRes.data, occupation: occRes.data, marketAnalysis: { percentileRank: 87, timeToFillEstimate: 67, demandScore: 'High' } };
        cache.set(cacheKey, { data: combinedData, expiry: Date.now() + CACHE_TTL });
        return res.json(combinedData);
    }
    catch (error) {
        return res.json({
            isDemo: true,
            error: error.message,
            wages: [
                { name: '10th', value: 122000, label: 'Entry' },
                { name: 'Median', value: 168000, label: 'Market Avg' },
                { name: '90th', value: 215000, label: 'Industry Elite' },
            ],
            analysis: { percentile: 88, timeToFill: 64, demand: 'High', growth: '12%' },
        });
    }
});
// ---------------------------------------------------------------------------
// POST /api/chat
// ---------------------------------------------------------------------------
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
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: 'messages array is required' });
    }
    const processedMessages = messages.map((m, i) => ({
        role: m.role,
        content: i === 0 && m.role === 'user' && m.content.length > 4000
            ? m.content.slice(0, 4000) + '\n\n[Document truncated for brevity]'
            : m.content,
    }));
    try {
        const anthropic = new sdk_1.default({ apiKey: process.env.ANTHROPIC_API_KEY || '' });
        const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 1500,
            system: CHAT_SYSTEM_PROMPT,
            messages: processedMessages.map((m) => ({
                role: m.role,
                content: m.content,
            })),
        });
        const text = response.content[0].type === 'text' ? response.content[0].text : '';
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch)
            return res.status(500).json({ error: 'Invalid AI response format', message: 'Sorry, I had a formatting issue. Please try again.', readyToSearch: false, outOfScope: false });
        const parsed = JSON.parse(jsonMatch[0]);
        return res.json({ message: parsed.message || '', readyToSearch: Boolean(parsed.readyToSearch), outOfScope: Boolean(parsed.outOfScope), jobPost: parsed.jobPost || null });
    }
    catch (error) {
        return res.status(500).json({ error: 'Failed to generate response', message: "I'm having trouble connecting right now. Please try again in a moment.", readyToSearch: false, outOfScope: false });
    }
});
// ---------------------------------------------------------------------------
// Shared auth helper
// ---------------------------------------------------------------------------
async function verifyAndGetTokens(req, res) {
    var _a;
    const rawAuth = (_a = req.headers.authorization) !== null && _a !== void 0 ? _a : '';
    const idToken = rawAuth.startsWith('Bearer ') ? rawAuth.slice(7) : null;
    if (!idToken) {
        res.status(401).json({ error: 'missing_token', message: 'Authorization header required.' });
        return null;
    }
    let uid;
    try {
        const decoded = await admin.auth().verifyIdToken(idToken);
        uid = decoded.uid;
    }
    catch {
        res.status(401).json({ error: 'invalid_token', message: 'Firebase ID token is invalid or expired.' });
        return null;
    }
    let accessToken;
    try {
        const tokenSnap = await adminDb.doc(`users/${uid}/tokens/google`).get();
        if (!tokenSnap.exists) {
            res.status(401).json({ error: 'no_google_token', message: 'Google account not connected. Visit the Integrations tab and sign in with Google.' });
            return null;
        }
        accessToken = tokenSnap.data().accessToken;
    }
    catch (fsErr) {
        res.status(503).json({ error: 'firestore_error', message: 'Could not retrieve token. Try again.' });
        return null;
    }
    return { uid, accessToken };
}
// ---------------------------------------------------------------------------
// POST /api/send-candidate-email
// ---------------------------------------------------------------------------
app.post('/api/send-candidate-email', async (req, res) => {
    var _a, _b, _c;
    const auth = await verifyAndGetTokens(req, res);
    if (!auth)
        return;
    const { uid, accessToken } = auth;
    const { candidateEmail, subject, body } = req.body;
    if (!candidateEmail || !subject || !body) {
        return res.status(400).json({ error: 'missing_fields', message: 'candidateEmail, subject, and body are required.' });
    }
    if (/[\r\n]/.test(candidateEmail) || /[\r\n]/.test(subject)) {
        return res.status(400).json({ error: 'invalid_fields', message: 'Fields may not contain line breaks.' });
    }
    const rawEmail = [`From: me`, `To: ${candidateEmail}`, `Subject: ${subject}`, `Content-Type: text/plain; charset=utf-8`, ``, body].join('\r\n');
    const encoded = Buffer.from(rawEmail).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    try {
        const { data } = await axios_1.default.post('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', { raw: encoded }, { headers: { Authorization: `Bearer ${accessToken}` } });
        const { threadId } = data;
        if (!threadId) {
            console.error('[send-candidate-email] Gmail returned no threadId:', data);
            return res.status(500).json({ error: 'gmail_error', message: 'Email sent but thread ID was missing.' });
        }
        await adminDb.doc(`users/${uid}/app_threads/${threadId}`).set({ candidateEmail, subject, sentAt: admin.firestore.FieldValue.serverTimestamp() });
        return res.json({ success: true, threadId });
    }
    catch (err) {
        const status = (_a = err.response) === null || _a === void 0 ? void 0 : _a.status;
        if (status === 401)
            return res.status(401).json({ error: 'token_expired', message: 'Google access token has expired. Sign out and sign in again to refresh.' });
        if (status === 403)
            return res.status(403).json({ error: 'insufficient_scope', message: 'Gmail API returned 403. Ensure gmail.send scope was granted during sign-in.' });
        console.error('[send-candidate-email] Gmail API error:', (_c = (_b = err.response) === null || _b === void 0 ? void 0 : _b.data) !== null && _c !== void 0 ? _c : err.message);
        return res.status(500).json({ error: 'gmail_error', message: 'Failed to send email.' });
    }
});
// ---------------------------------------------------------------------------
// GET /api/fetch-threads
// ---------------------------------------------------------------------------
app.get('/api/fetch-threads', async (req, res) => {
    var _a, _b, _c;
    const auth = await verifyAndGetTokens(req, res);
    if (!auth)
        return;
    const { uid, accessToken } = auth;
    const { threadId } = req.query;
    try {
        if (threadId) {
            const { data } = await axios_1.default.get(`https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}`, { headers: { Authorization: `Bearer ${accessToken}` }, params: { format: 'full' } });
            return res.json(sanitiseThread(data));
        }
        else {
            const snapshot = await adminDb.collection(`users/${uid}/app_threads`).get();
            if (snapshot.empty)
                return res.json({ threads: [], resultSizeEstimate: 0 });
            const threadIds = snapshot.docs.map(d => d.id);
            // Fetch all registered threads — app_threads is bounded by emails sent via this app.
            const results = await Promise.all(threadIds.map(tid => axios_1.default
                .get(`https://gmail.googleapis.com/gmail/v1/users/me/threads/${tid}`, { headers: { Authorization: `Bearer ${accessToken}` }, params: { format: 'full' } })
                .then(r => {
                var _a, _b, _c;
                const thread = sanitiseThread(r.data);
                const firstMsg = (_a = thread.messages) === null || _a === void 0 ? void 0 : _a[0];
                if (!firstMsg)
                    return null;
                return { id: thread.id, threadId: thread.id, snippet: thread.snippet, internalDate: firstMsg.internalDate, labelIds: (_b = firstMsg.labelIds) !== null && _b !== void 0 ? _b : [], headers: (_c = firstMsg.headers) !== null && _c !== void 0 ? _c : [] };
            })
                .catch((err) => {
                var _a;
                const status = (_a = err.response) === null || _a === void 0 ? void 0 : _a.status;
                if (status === 401 || status === 403)
                    throw err;
                console.warn(`[fetch-threads] Could not fetch thread ${tid}:`, err.message);
                return null;
            })));
            const threads = results.filter(Boolean);
            return res.json({ threads, resultSizeEstimate: threads.length });
        }
    }
    catch (err) {
        const status = (_a = err.response) === null || _a === void 0 ? void 0 : _a.status;
        if (status === 401)
            return res.status(401).json({ error: 'token_expired', message: 'Google access token has expired.' });
        if (status === 403)
            return res.status(403).json({ error: 'insufficient_scope', message: 'Gmail API returned 403.' });
        console.error('[fetch-threads] Gmail API error:', (_c = (_b = err.response) === null || _b === void 0 ? void 0 : _b.data) !== null && _c !== void 0 ? _c : err.message);
        return res.status(500).json({ error: 'gmail_error', message: 'Failed to fetch Gmail threads.' });
    }
});
// ---------------------------------------------------------------------------
// GET /api/fetch-calendar
// ---------------------------------------------------------------------------
app.get('/api/fetch-calendar', async (req, res) => {
    var _a, _b, _c;
    const auth = await verifyAndGetTokens(req, res);
    if (!auth)
        return;
    const { accessToken } = auth;
    const { calendarId = 'primary', maxResults = '10', timeMin = new Date().toISOString() } = req.query;
    try {
        const { data } = await axios_1.default.get(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`, {
            headers: { Authorization: `Bearer ${accessToken}` },
            params: { maxResults: Math.min(parseInt(maxResults, 10) || 10, 50), timeMin, singleEvents: true, orderBy: 'startTime' },
        });
        return res.json({ events: ((_a = data.items) !== null && _a !== void 0 ? _a : []).map(sanitiseEvent), nextPageToken: (_b = data.nextPageToken) !== null && _b !== void 0 ? _b : null });
    }
    catch (err) {
        const status = (_c = err.response) === null || _c === void 0 ? void 0 : _c.status;
        if (status === 401)
            return res.status(401).json({ error: 'token_expired' });
        if (status === 403)
            return res.status(403).json({ error: 'insufficient_scope' });
        return res.status(500).json({ error: 'calendar_error' });
    }
});
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function decodeBody(payload) {
    if (!payload)
        return '';
    const decode = (data) => {
        if (!data)
            return '';
        return Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
    };
    function collect(part, type) {
        var _a;
        if (!part)
            return '';
        if (part.mimeType === type && ((_a = part.body) === null || _a === void 0 ? void 0 : _a.data))
            return decode(part.body.data);
        if (Array.isArray(part.parts))
            for (const p of part.parts) {
                const found = collect(p, type);
                if (found)
                    return found;
            }
        return '';
    }
    const plain = collect(payload, 'text/plain');
    if (plain.trim())
        return plain;
    const html = collect(payload, 'text/html');
    if (html) {
        return html
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n\n').replace(/<\/div>/gi, '\n')
            .replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
            .replace(/\n{3,}/g, '\n\n').trim();
    }
    return '';
}
function sanitiseThread(thread) {
    if (!thread || typeof thread !== 'object')
        return thread;
    return {
        id: thread.id,
        snippet: thread.snippet,
        historyId: thread.historyId,
        messages: Array.isArray(thread.messages)
            ? thread.messages.map((m) => {
                var _a, _b;
                return ({
                    id: m.id, threadId: m.threadId, labelIds: m.labelIds, snippet: m.snippet, internalDate: m.internalDate,
                    headers: ((_b = (_a = m.payload) === null || _a === void 0 ? void 0 : _a.headers) !== null && _b !== void 0 ? _b : []).filter((h) => ['Subject', 'From', 'Date', 'To', 'Cc'].includes(h.name)),
                    body: decodeBody(m.payload),
                });
            })
            : undefined,
    };
}
function sanitiseEvent(event) {
    var _a;
    return {
        id: event.id, summary: event.summary, description: event.description,
        start: event.start, end: event.end,
        attendees: ((_a = event.attendees) !== null && _a !== void 0 ? _a : []).map((a) => ({ email: a.email, displayName: a.displayName, responseStatus: a.responseStatus })),
        hangoutLink: event.hangoutLink, conferenceData: event.conferenceData, status: event.status,
    };
}
// ---------------------------------------------------------------------------
// Export as Cloud Function
// ---------------------------------------------------------------------------
exports.api = functions.https.onRequest(app);
//# sourceMappingURL=index.js.map