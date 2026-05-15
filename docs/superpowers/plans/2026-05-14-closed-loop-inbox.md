# Closed-Loop Inbox Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the general Gmail inbox with an app-only inbox that shows exclusively threads originated from within Trussk, and add a compose panel to start new candidate conversations.

**Architecture:** Two server routes (a new send route + a rewritten fetch route) backed by a Firestore `app_threads` collection that acts as the source of truth for which Gmail threads belong to the app. The frontend adds local compose state and a panel that replaces the empty right pane.

**Tech Stack:** Express + axios (existing pattern), Firebase Admin SDK (existing), React local state, Tailwind CSS (existing conventions).

---

## File Map

| File | Change |
|---|---|
| `server.ts` | Add `POST /api/send-candidate-email`; replace `else` block in `GET /api/fetch-threads` |
| `src/components/OutreachView.tsx` | Add compose state, compose button, compose panel |

---

## Task 1: Add `POST /api/send-candidate-email` to `server.ts`

**Files:**
- Modify: `server.ts` — insert new route after the `/api/fetch-threads` route (before the `/api/fetch-calendar` route)

- [ ] **Step 1: Insert the route**

Open `server.ts`. Find the comment block that begins `// GET /api/fetch-calendar` (around line 444). Insert the following block **immediately before** it:

```typescript
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

    const tokenSnap = await adminDb.doc(`users/${uid}/tokens/google`).get();
    if (!tokenSnap.exists) {
      return res.status(401).json({
        error: 'no_google_token',
        message: 'Google account not connected. Visit the Integrations tab and sign in with Google.',
      });
    }
    const { accessToken } = tokenSnap.data() as { accessToken: string };

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
```

- [ ] **Step 2: Verify the server starts cleanly**

```bash
npm run dev
```

Expected: server starts on port 3000, no TypeScript compile errors in the terminal.

- [ ] **Step 3: Verify the route rejects missing fields**

In a second terminal (server must be running):

```bash
curl -s -X POST http://localhost:3000/api/send-candidate-email \
  -H "Content-Type: application/json" \
  -d '{}' | jq .
```

Expected response:
```json
{ "error": "missing_token", "message": "Authorization header required." }
```

(The auth check fires before the field check — this confirms the route is registered.)

- [ ] **Step 4: Commit**

```bash
git add server.ts
git commit -m "feat(server): add POST /api/send-candidate-email with Firestore thread registration"
```

---

## Task 2: Rewrite the list path in `GET /api/fetch-threads`

**Files:**
- Modify: `server.ts` — replace the `else` branch inside `GET /api/fetch-threads`

- [ ] **Step 1: Find and delete the old list block**

Inside `GET /api/fetch-threads` (around line 378), locate the `else` block that begins:

```typescript
      } else {
        // List messages with metadata so the UI gets Subject/From/Date in one call
        const { data } = await axios.get(
          'https://gmail.googleapis.com/gmail/v1/users/me/messages',
```

Delete the entire `else { ... }` block (everything from `} else {` through the closing `}` that pairs with it, including the `return res.json(...)` inside). Replace it with:

```typescript
      } else {
        // Closed-loop: fetch only threads the app sent, registered in Firestore.
        const snapshot = await adminDb!.collection(`users/${uid}/app_threads`).get();

        if (snapshot.empty) {
          return res.json({ threads: [], resultSizeEstimate: 0 });
        }

        const threadIds = snapshot.docs.map(d => d.id);

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
              .then(r => sanitiseThread(r.data))
              .catch(() => null)
          )
        );

        return res.json({
          threads: results.filter(Boolean),
          resultSizeEstimate: threadIds.length,
        });
      }
```

- [ ] **Step 2: Verify the server still starts cleanly**

```bash
npm run dev
```

Expected: starts on port 3000, no TypeScript errors.

- [ ] **Step 3: Verify an empty Firestore collection returns an empty list**

You need a valid Firebase ID token. The easiest way while the app is running is to open the browser DevTools console on `http://localhost:3000`, sign in, then run:

```javascript
const token = await firebase.auth().currentUser.getIdToken();
console.log(token);
```

Copy the token, then:

```bash
curl -s http://localhost:3000/api/fetch-threads \
  -H "Authorization: Bearer <paste-token-here>" | jq .
```

Expected when `app_threads` is empty:
```json
{ "threads": [], "resultSizeEstimate": 0 }
```

Expected after sending at least one email via the compose UI (Task 3): the thread(s) appear in the list.

- [ ] **Step 4: Commit**

```bash
git add server.ts
git commit -m "feat(server): rewrite fetch-threads list path to use Firestore app_threads"
```

---

## Task 3: Add compose button and panel to `OutreachView`

**Files:**
- Modify: `src/components/OutreachView.tsx`

- [ ] **Step 1: Add `Edit` and `Send` to the lucide-react import**

At the top of `OutreachView.tsx`, the existing import is:

```typescript
import {
  Search, Mail, RefreshCw, AlertCircle, Loader2,
  ChevronLeft, Archive, Trash2, MoreHorizontal, Reply, Star,
} from 'lucide-react';
```

Replace it with:

```typescript
import {
  Search, Mail, RefreshCw, AlertCircle, Loader2,
  ChevronLeft, Archive, Trash2, MoreHorizontal, Reply, Star,
  Edit, Send,
} from 'lucide-react';
```

- [ ] **Step 2: Add compose state variables**

Inside `OutreachView` (the function body), directly after the existing `useState` declarations (the block ending with `const [starred, setStarred] = useState<Set<string>>(new Set());`), add:

```typescript
  const [composing, setComposing] = useState(false);
  const [toEmail, setToEmail] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
```

- [ ] **Step 3: Add the `sendEmail` handler**

Directly after the `openMessage` function (which ends around line 149), add:

```typescript
  const sendEmail = async () => {
    setSending(true);
    setSendError(null);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error('Not signed in');
      const res = await fetch('/api/send-candidate-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          candidateEmail: toEmail,
          subject: composeSubject,
          body: composeBody,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? 'Send failed');
      // Success — reset compose state and reload the inbox
      setComposing(false);
      setToEmail('');
      setComposeSubject('');
      setComposeBody('');
      load();
    } catch (e: any) {
      setSendError(e.message ?? 'Failed to send');
    } finally {
      setSending(false);
    }
  };
```

- [ ] **Step 4: Add the compose button to the inbox header**

In the JSX, find the refresh button:

```tsx
            <button onClick={load} disabled={loading} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-40">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
```

Replace it with (refresh button + new compose button side by side):

```tsx
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  setComposing(true);
                  setSelected(null);
                  setFullThread(null);
                  setSendError(null);
                }}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button onClick={load} disabled={loading} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-40">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
```

- [ ] **Step 5: Add the compose panel to the right pane**

In the right panel section, find the block that renders the empty state when no message is selected:

```tsx
          {!selected ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 bg-gray-50">
              <div className="w-14 h-14 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center justify-center">
                <Mail className="w-6 h-6 text-gray-300" />
              </div>
              <p className="text-[13px] font-medium text-gray-500">Select a message to read</p>
            </div>
```

Replace it with:

```tsx
          {composing ? (
            <div className="flex-1 flex flex-col p-6 gap-4 overflow-y-auto">
              <h2 className="text-[15px] font-semibold text-gray-900">New Message</h2>
              <div className="flex flex-col gap-3 max-w-2xl">
                <div>
                  <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1 block">To</label>
                  <input
                    type="email"
                    value={toEmail}
                    onChange={e => setToEmail(e.target.value)}
                    placeholder="candidate@email.com"
                    disabled={sending}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-[13px] placeholder-gray-400 focus:outline-none focus:border-gray-200 focus:bg-white transition-all disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1 block">Subject</label>
                  <input
                    type="text"
                    value={composeSubject}
                    onChange={e => setComposeSubject(e.target.value)}
                    placeholder="Senior PM — Tampa Bridge Project"
                    disabled={sending}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-[13px] placeholder-gray-400 focus:outline-none focus:border-gray-200 focus:bg-white transition-all disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1 block">Message</label>
                  <textarea
                    value={composeBody}
                    onChange={e => setComposeBody(e.target.value)}
                    placeholder="Hi Jane, I came across your profile and think you'd be a great fit..."
                    rows={12}
                    disabled={sending}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-[13px] placeholder-gray-400 focus:outline-none focus:border-gray-200 focus:bg-white transition-all resize-none disabled:opacity-50"
                  />
                </div>
              </div>
              {sendError && (
                <p className="text-[12px] text-red-500 max-w-2xl">{sendError}</p>
              )}
              <div className="flex items-center gap-3 max-w-2xl">
                <button
                  onClick={sendEmail}
                  disabled={sending || !toEmail || !composeSubject || !composeBody}
                  className="flex items-center gap-1.5 text-[13px] font-medium text-white bg-brand px-4 py-2 rounded-lg hover:bg-brand/90 transition-colors disabled:opacity-40"
                >
                  {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  {sending ? 'Sending…' : 'Send'}
                </button>
                <button
                  onClick={() => { setComposing(false); setSendError(null); }}
                  disabled={sending}
                  className="text-[13px] text-gray-400 hover:text-gray-700 transition-colors disabled:opacity-40"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : !selected ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 bg-gray-50">
              <div className="w-14 h-14 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center justify-center">
                <Mail className="w-6 h-6 text-gray-300" />
              </div>
              <p className="text-[13px] font-medium text-gray-500">Select a message to read</p>
            </div>
```

- [ ] **Step 6: Run the TypeScript check**

```bash
npm run lint
```

Expected: exits with no errors.

- [ ] **Step 7: Smoke test in the browser**

1. Open `http://localhost:3000`, navigate to the Outreach / Inbox view.
2. Confirm the pencil (Edit) icon appears in the inbox header next to the refresh button.
3. Click it — the right pane should show the compose panel with To / Subject / Message fields.
4. Confirm the Send button is disabled while any field is empty.
5. Fill in all three fields — Send button becomes active.
6. Click Cancel — compose panel closes, empty state returns.

- [ ] **Step 8: End-to-end test — send an email**

1. Make sure you are signed in with Google (Integrations tab).
2. Click compose, fill in a real email address you control, a subject, and a body.
3. Click Send.
4. Observe: spinner appears, then compose panel closes and the inbox reloads.
5. Check the inbox list — the new thread should appear.
6. Click it — the full thread detail should render with the sent message body.
7. Check Firebase Console → Firestore → `users/{uid}/app_threads` — confirm a new document exists with `candidateEmail`, `subject`, and `sentAt`.

- [ ] **Step 9: Commit**

```bash
git add src/components/OutreachView.tsx
git commit -m "feat(ui): add compose button and panel to OutreachView for closed-loop inbox"
```

---

## Self-Review

**Spec coverage:**
- ✅ `POST /api/send-candidate-email` — Task 1
- ✅ `uid` from verified token, never from body — Task 1 Step 1
- ✅ Google access token from `users/{uid}/tokens/google` — Task 1 Step 1
- ✅ RFC 2822 raw email, base64url-encoded — Task 1 Step 1
- ✅ `threadId` extracted from Gmail response — Task 1 Step 1
- ✅ Firestore write to `users/{uid}/app_threads/{threadId}` with `candidateEmail`, `subject`, `sentAt` — Task 1 Step 1
- ✅ Error codes match existing vocabulary — Task 1 Step 1
- ✅ `GET /api/fetch-threads` list path replaced with Firestore query — Task 2
- ✅ Empty collection fast-path — Task 2 Step 1
- ✅ `Promise.all` + `sanitiseThread` — Task 2 Step 1
- ✅ Single-thread `?threadId=` path unchanged — not touched in Task 2
- ✅ Compose button in inbox header — Task 3 Step 4
- ✅ Compose panel: To / Subject / Body fields — Task 3 Step 5
- ✅ Send disabled while fields empty — Task 3 Step 5 (disabled condition)
- ✅ Spinner while in-flight — Task 3 Step 5
- ✅ Inline error (draft preserved) — Task 3 Step 5
- ✅ On success: close compose + reload inbox — Task 3 Step 3

**Placeholder scan:** No TBDs, no "implement later", no vague steps. All code is complete.

**Type consistency:** `toEmail` / `composeSubject` / `composeBody` used consistently in state declarations (Step 2), `sendEmail` handler (Step 3), and JSX (Step 5). `sending` / `sendError` consistent across all three locations.
