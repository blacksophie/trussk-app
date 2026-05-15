# Strip to Candidates + Cal.com Scheduling

**Date:** 2026-05-14
**Status:** Approved for implementation

---

## Overview

Remove email outreach and calendar features from the app entirely. Trussk 4.0 will focus on the candidate pipeline. Meeting scheduling is handled via an embedded Cal.com widget rather than a custom Google Calendar + Gmail OAuth integration. This reduces surface area before first client and eliminates the Google OAuth token-expiry UX problem.

---

## What Gets Removed

### Frontend

| File | Action |
|------|--------|
| `src/components/OutreachView.tsx` | Delete |
| `src/components/CalendarView.tsx` | Delete |
| `src/components/ScheduleInterviewModal.tsx` | Rewrite — becomes Cal.com full-screen overlay (see below) |
| `src/data/outreach.ts` | Delete |

### Types & Routing (`src/types.ts`, `src/App.tsx`)

- Remove `View.OUTREACH` and `View.CALENDAR` from the `View` enum
- Remove all import references, conditional render blocks, and sidebar nav items for Outreach and Calendar

### Sidebar (`src/components/Sidebar.tsx`)

Remove Outreach and Calendar nav items. Final nav order:

```
Post Jobs
Active Jobs
─────────────
Integrations
─────────────
SUPPORT
Feedback
Settings
```

### Firebase / Auth (`src/lib/firebase.ts`)

- Remove Gmail scopes: `gmail.readonly`, `gmail.send`
- Remove Calendar scopes: `calendar.readonly`, `calendar.events`
- Remove `access_type: offline` and `prompt: consent` custom parameters from `googleProvider` (no longer needed — we are not capturing an OAuth access token)
- Remove `signInWithMicrosoft`, `msalInstance`, `msalConfig`, `MICROSOFT_SCOPES`, and all MSAL imports
- Remove `saveTokenToDB` — no longer storing OAuth access tokens
- Google sign-in (`signInWithGoogle`) stays, used for Firebase Auth only

### Backend (`server.ts` and `api.ts`)

Remove the following API routes from both files:

| Route | Reason |
|-------|--------|
| `GET /api/fetch-threads` | Gmail inbox proxy — removed |
| `POST /api/send-candidate-email` | Gmail send proxy — removed |
| `GET /api/fetch-calendar` | Google Calendar proxy — removed |
| `POST /api/create-meeting` | Google Meet / Teams meeting creation — removed |

Remove the `verifyAndGetTokens` helper from both files (only used by the above routes).

Remove from `server.ts`:
- `verifyIdTokenRest`, `fsGet`, `fsList`, `fsSet`, `fromFsFields`, `fsFields` helpers (REST Firestore wrappers only used by the removed auth helper and routes)
- `sanitiseThread`, `sanitiseEvent` helpers
- `FB_API_KEY`, `FB_PROJECT`, `FS_BASE` constants

Remove from `api.ts`:
- `sanitiseThread`, `sanitiseEvent` helpers

Keep: `adminDb` initialisation block (still used by other routes if any remain), `parse-document`, `market-intelligence`, and any AI-sourcing routes.

### Firestore

No migration needed. The `users/{uid}/tokens/google` and `users/{uid}/tokens/microsoft` subcollections can be left in place (orphaned data, harmless) or cleaned up manually.

Remove the `app_threads` subcollection rule from `firestore.rules` to keep rules tidy.

---

## What Gets Added / Changed

### Integrations Tab (`src/components/IntegrationsView.tsx`)

Rewrite to a single-purpose Cal.com setup card:

```
┌─────────────────────────────────────────────────────┐
│  Integrations                                        │
│  Connect your scheduling tool so candidates can      │
│  book interviews directly.                           │
│                                                      │
│  ┌─────────────────────────────────────────────────┐ │
│  │ 📅 Cal.com                                      │ │
│  │ Your booking URL                                │ │
│  │ [https://cal.com/your-username          ] [Save]│ │
│  │ Paste your Cal.com link. Candidates will see    │ │
│  │ this when you schedule an interview.            │ │
│  └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

- Input accepts any URL (cal.com/username, custom domain, etc.)
- On Save: writes `calUrl` to `users/{uid}` in Firestore (merge)
- On mount: reads `calUrl` from Firestore and pre-fills the input
- Shows a green "Saved" confirmation badge after save
- Validation: must start with `https://`

### Schedule Interview — Full-Screen Overlay

Replace `ScheduleInterviewModal.tsx` with a full-screen overlay component `CalScheduleOverlay.tsx`.

**Trigger:** existing "Schedule Interview" button in `CandidateWorkspace.tsx`.

**Overlay layout:**

```
┌──────────────────────────────────────────────────────┐
│  Scheduling interview with  Jane Smith  ·  Sr. Super  ×│
├──────────────────────────────────────────────────────┤
│                                                      │
│   [ Cal.com iframe fills this space ]                │
│                                                      │
│                                                      │
└──────────────────────────────────────────────────────┘
```

- Top bar: candidate name + role (read from props), × close button
- Body: `<iframe src={calUrl} />` — 100% width, fills remaining height
- If `calUrl` is not set for this user: show a message "Add your Cal.com URL in Integrations to enable scheduling" with a button that navigates to the Integrations tab
- Framer Motion: fade + scale-in (`scale: 0.98 → 1.0`) on open, reverse on close
- Pressing Escape closes the overlay

### Firestore Schema Addition

```
users/{uid}
  calUrl: string   // e.g. "https://cal.com/george"
```

Add to Firestore rules — writable only by owner, no new collection needed (field added to existing `users/{uid}` doc):

```
match /users/{userId} {
  allow read, write: if isOwner(userId);
  // calUrl field is covered by this existing rule — no change needed
}
```

---

## Data Flow

```
User clicks "Schedule Interview" on candidate
  → CandidateWorkspace reads calUrl from app state (loaded at App level from Firestore)
  → CalScheduleOverlay opens (full-screen)
  → iframe loads calUrl
  → Candidate books via Cal.com
  → Overlay closed manually by recruiter (× or Escape)
```

`calUrl` is loaded once at the App level when the user signs in (alongside the existing jobs/interviews/candidates subscriptions) and passed down as a prop. No per-component Firestore reads needed.

---

## Files to Create / Modify / Delete

| File | Action |
|------|--------|
| `src/components/OutreachView.tsx` | **Delete** |
| `src/components/CalendarView.tsx` | **Delete** |
| `src/components/ScheduleInterviewModal.tsx` | **Delete** |
| `src/components/CalScheduleOverlay.tsx` | **Create** |
| `src/components/IntegrationsView.tsx` | **Rewrite** |
| `src/components/Sidebar.tsx` | **Modify** — remove Outreach + Calendar items |
| `src/components/CandidateWorkspace.tsx` | **Modify** — swap modal for CalScheduleOverlay |
| `src/App.tsx` | **Modify** — remove views, load calUrl from Firestore |
| `src/types.ts` | **Modify** — remove View.OUTREACH, View.CALENDAR |
| `src/lib/firebase.ts` | **Modify** — strip OAuth scopes + MSAL |
| `src/data/outreach.ts` | **Delete** |
| `server.ts` | **Modify** — remove 4 routes + helpers |
| `api.ts` | **Modify** — remove 4 routes + helpers |
| `firestore.rules` | **Modify** — remove app_threads rule |

---

## Out of Scope

- Cal.com API integration (webhooks, booking confirmation events) — not needed for MVP
- Storing interview records in Firestore from Cal.com — Cal.com handles this
- Any email sending functionality — deferred entirely
- Microsoft / Outlook integration — removed, not coming back in this cycle
