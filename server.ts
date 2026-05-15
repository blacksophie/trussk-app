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

  // ── Niche config (set via environment variables per white-label deployment) ──
  const NICHE_APP_NAME   = process.env.NICHE_APP_NAME   ?? 'Trussk';
  const NICHE_DISPLAY    = process.env.NICHE_DISPLAY    ?? 'Heavy Civil & Infrastructure';
  const NICHE_INDUSTRIES = (process.env.NICHE_INDUSTRIES ?? 'Heavy Civil Engineering,Infrastructure (roads, bridges, utilities, drainage),Road & Bridge construction,Heavy Highway construction,Marine Construction').split(',').map(s => s.trim());

  // Chat / Clarification API Route
  const CHAT_SYSTEM_PROMPT = `You are the AI assistant for ${NICHE_APP_NAME}, a specialized recruiting platform for ${NICHE_DISPLAY} only.

${NICHE_APP_NAME}'s scope covers ONLY these industries:
${NICHE_INDUSTRIES.map(i => `- ${i}`).join('\n')}

Your job:
1. Analyze if the role is within scope.
2. If OUT OF SCOPE: Kindly explain ${NICHE_APP_NAME} only covers ${NICHE_DISPLAY}, list the categories, ask if they have a matching role. Set outOfScope: true.
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

startServer();
