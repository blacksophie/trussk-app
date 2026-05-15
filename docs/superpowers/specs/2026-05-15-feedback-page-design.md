# Feedback Page — Design Spec

**Date:** 2026-05-15
**Status:** Approved for implementation

---

## Overview

A structured feedback form for Trussk users. Submissions are stored in Firestore tagged with user, company, and niche context — making the data useful across white-label deployments from day one. No emojis; Lucide icons only. Tone is professional and direct.

---

## Firestore Schema

Collection: `feedback/{docId}`

```
userId:      string        — Firebase uid
userEmail:   string        — from auth.currentUser
category:    'bug' | 'feature' | 'candidate_quality' | 'coverage' | 'general'
rating:      1 | 2 | 3 | 4 | 5   — overall satisfaction
message:     string        — required, min 10 chars
niche:       string        — 'heavy_civil' (hardcoded for now; env-configurable later)
submittedAt: Timestamp
```

Firestore rules: `feedback` collection — allow create if `isSignedIn()`, allow read only if `isOwner(resource.data.userId)`.

---

## Page Layout

### Header
- Title: "Feedback"
- Subtitle: "Help us build the best recruiting tool for heavy civil. Your input shapes what we build next."

### Section 1 — Satisfaction Rating
Label: "How is Trussk working for you?"
Five labelled buttons in a row:

| Value | Label |
|-------|-------|
| 1 | Poor |
| 2 | Fair |
| 3 | Good |
| 4 | Very Good |
| 5 | Excellent |

Selected state: orange background + white text. Unselected: white + gray border. No emojis, no faces.

### Section 2 — Category
Label: "What is this about?"
Five pill buttons with Lucide icons:

| Category | Icon | Label |
|----------|------|-------|
| bug | `AlertCircle` | Bug Report |
| feature | `Lightbulb` | Feature Request |
| candidate_quality | `Users` | Candidate Quality |
| coverage | `Briefcase` | Role Coverage |
| general | `MessageSquare` | General |

### Section 3 — Message
Label: "Tell us more"
Textarea — required, min 10 chars. Placeholder changes per category:
- bug: "Describe what happened and where in the app."
- feature: "What would you like to see added or improved?"
- candidate_quality: "Which role or search did this relate to?"
- coverage: "What trade, role, or market can't you find candidates for?"
- general: "Anything on your mind."

### Section 4 — Submit
Full-width orange button: "Submit Feedback"
Disabled + spinner while saving. On success: transitions to success state.

### Success State
- CheckCircle icon (green tint)
- "Thank you. Your feedback has been received."
- Smaller text: "We review every submission and use it to prioritise what we build next."
- "Submit another" link — resets the form

### Recent Submissions (bottom of page)
Heading: "Your recent submissions"
If none: omit section entirely.
If present: list of up to 3 cards showing category icon + label + date + rating badge.

---

## Component

Single file: `src/components/FeedbackView.tsx`

Reads user from `auth.currentUser`. On submit, writes to Firestore. No API route needed (client SDK with security rules).

---

## Routing

`View` enum already has no `FEEDBACK` value. Add `FEEDBACK = 'feedback'` to `src/types.ts`.
Sidebar already renders `'feedback'` as a string — update to `View.FEEDBACK`.
App.tsx: add render block for `View.FEEDBACK`.

---

## Design Tokens (match existing app)

- Background: `bg-gray-50`
- Card: `bg-white rounded-xl border border-gray-100 shadow-sm p-5`
- Brand: `#f97316` / `bg-brand` / `text-brand`
- Body text: `text-gray-900` (14px)
- Labels: `text-[12px] font-medium text-gray-600 uppercase tracking-wider`
- Max width: `max-w-2xl mx-auto`

---

## Out of Scope

- Admin dashboard for viewing all feedback
- Email notifications on submission
- Status tracking (open/resolved)
- Upvoting others' feedback
