# Closed-Loop Inbox — Design Spec
**Date:** 2026-05-14  
**Status:** Approved  

---

## Problem

The current `/api/fetch-threads` route calls Gmail's `messages.list` API, which returns the user's entire personal inbox. Unrelated emails (airline promotions, personal messages, etc.) appear alongside candidate conversations. There is also no route to send emails from within the app.

---

## Goal

The app inbox shows **only** emails that originated from within Trussk. Recruiters compose outreach directly from the app; the resulting Gmail `threadId` is stored in Firestore. Every inbox refresh fetches only those known threads from Gmail — mathematically impossible for unrelated email to appear.

---

## Approach

Axios + Firestore Admin only — consistent with every existing route in `server.ts`. No new npm dependencies.

---

## Section 1 — `POST /api/send-candidate-email`

**Purpose:** Send an outreach email and permanently register the resulting Gmail thread with the app.

**Auth:** Firebase ID token in `Authorization: Bearer` header. `uid` is derived from the verified token — never from the request body.

**Request body:**
```json
{
  "candidateEmail": "jane@example.com",
  "subject": "Senior PM role — Tampa Bridge Project",
  "body": "Hi Jane, ..."
}
```

**Flow:**
1. Verify Firebase ID token → extract `uid`.
2. Read `users/{uid}/tokens/google` from Firestore → get `accessToken`.
3. Build RFC 2822 raw email string:
   ```
   From: me
   To: {candidateEmail}
   Subject: {subject}
   Content-Type: text/plain; charset=utf-8

   {body}
   ```
4. Base64url-encode the raw string.
5. `POST https://gmail.googleapis.com/gmail/v1/users/me/messages/send` with `{ raw: "<encoded>" }`.
6. Extract `threadId` from the Gmail response.
7. Write Firestore doc: `users/{uid}/app_threads/{threadId}` → `{ candidateEmail, subject, sentAt: serverTimestamp() }`.
8. Return `{ success: true, threadId }`.

**Error responses** (matching existing vocabulary):
| Condition | HTTP | `error` code |
|---|---|---|
| Missing/invalid Firebase token | 401 | `missing_token` / `invalid_token` |
| No Google token in Firestore | 401 | `no_google_token` |
| Gmail returns 401 | 401 | `token_expired` |
| Gmail returns 403 | 403 | `insufficient_scope` |
| Admin SDK unavailable | 503 | `admin_unavailable` |

---

## Section 2 — `GET /api/fetch-threads` (rewrite)

**Purpose:** Return only the threads the app created — no general inbox data.

**Auth:** Same Firebase ID token pattern.

**What changes:** The old `messages.list` + batch-metadata block is deleted. The single-thread path (`?threadId=<id>`) used by the detail view is **kept unchanged**.

**New list flow:**
1. Verify Firebase ID token → `uid`.
2. Read `users/{uid}/tokens/google` → `accessToken`.
3. Fetch all documents in `users/{uid}/app_threads/` via `adminDb.collection(...)`.
4. If collection is empty → return `{ threads: [] }` immediately (no Gmail call).
5. Extract array of `threadId`s from the docs.
6. `Promise.all` — for each `threadId`, call `GET https://gmail.googleapis.com/gmail/v1/users/me/threads/{threadId}?format=full`.
7. Pass each result through the existing `sanitiseThread()` helper (no changes to that function).
8. Return `{ threads: sanitized[], resultSizeEstimate: count }`.

**Why this is safe:** Only threads written by `POST /api/send-candidate-email` ever appear in `app_threads`. Candidate replies land in the same Gmail thread automatically (same `threadId`), so they appear on the next fetch without any extra work.

---

## Section 3 — Compose button + panel in `OutreachView`

**Location:** A compose icon button (pencil or `Edit` icon) placed next to the existing refresh button in the inbox panel header.

**Behavior:**
- Clicking sets `composing = true` in local state.
- On desktop: the right detail pane renders the compose panel instead of "Select a message to read".
- On mobile: same slide-in behavior as the current message detail view.

**Compose panel fields:**
| Field | Type | Notes |
|---|---|---|
| To | `<input type="email">` | Free-text; required |
| Subject | `<input type="text">` | Required |
| Body | `<textarea>` | Required |

**Send flow:**
1. POST `/api/send-candidate-email` with `{ candidateEmail, subject, body }` + ID token header.
2. Send button shows spinner while in-flight; inputs are disabled.
3. On success: set `composing = false`, call `load()` to refresh the thread list (new thread now in Firestore → appears in inbox).
4. On error: show inline error message inside the compose panel. Draft stays visible so the recruiter can retry without re-typing.

**State:** All compose state (`composing`, `toEmail`, `subject`, `body`, `sending`, `sendError`) lives in `OutreachView` local state — no new context, no prop drilling.

**Styling:** Matches existing component conventions — orange brand colour for the Send button (`bg-brand`), gray cancel link, `text-[13px]` inputs with `border-gray-100 rounded-lg` styling.

---

## Data Model

```
users/
  {uid}/
    tokens/
      google              # existing — { accessToken, ... }
    app_threads/
      {threadId}          # new — { candidateEmail, subject, sentAt }
```

`app_threads` is a flat collection keyed by `threadId`. No indexes needed — the fetch route reads the whole collection (recruiters send tens of threads, not thousands).

---

## Out of Scope

- Reply from within the inbox (the existing Reply button stub remains a stub).
- Token refresh — existing behaviour: the app surfaces a `token_expired` error and the user re-authenticates. No change.
- Read/unread tracking — labels are passed through as today.
- Pagination of `app_threads` — not needed at current scale.
