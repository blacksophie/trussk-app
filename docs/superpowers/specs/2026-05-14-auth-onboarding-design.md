# Auth & Onboarding Redesign — Trussk 4.0

**Date:** 2026-05-14  
**Status:** Approved for implementation

---

## Overview

Rebuild the auth and onboarding experience to match the Himalayas-style reference design: clean white split-panel for auth, full-screen centered cards for onboarding steps, and a welcome modal overlay on first entry to the dashboard. Replace purple with Trussk orange (`#f97316`). New users go through a 3-step onboarding flow; returning users land directly on the dashboard.

---

## Screens & Flow

### Auth Flow

```
Landing
├── Sign Up
│   ├── [Google OAuth] → onboarding (new user)
│   ├── [Microsoft OAuth - UI only] → onboarding (new user)
│   └── [Email] → Password Step → onboarding (new user)
└── Sign In
    ├── [Google OAuth] → dashboard
    ├── [Microsoft OAuth - UI only] → dashboard
    └── [Email] → Password Step → dashboard
```

### Onboarding Flow (new users only)

```
Step 1: Company Info  →  Step 2: Invite Team  →  Step 3: Welcome Modal (on dashboard)
```

Returning users skip onboarding entirely. Detection: check Firestore `users/{uid}.onboardingComplete` flag.

---

## Component Architecture

Extract everything out of `App.tsx` into dedicated components:

```
src/
  components/
    auth/
      AuthPage.tsx          — top-level auth state machine
      SignUpForm.tsx         — sign up screen (split layout)
      SignInForm.tsx         — sign in screen (split layout)
      PasswordStep.tsx       — password entry step (reused by both flows)
      AuthSplitLayout.tsx    — shared left/right split wrapper
    onboarding/
      OnboardingFlow.tsx     — manages 3-step onboarding state
      CompanyInfoStep.tsx    — step 1: company name, industry, size, role
      InviteTeamStep.tsx     — step 2: invite co-workers
      WelcomeModal.tsx       — step 3: modal overlay on dashboard
```

`App.tsx` renders either `<AuthPage>` (no user) or `<OnboardingFlow>` (new user) or the main dashboard (returning user).

---

## Design Spec

### Split Layout (Sign Up / Sign In)

- **Left panel:** white background, `trussk` logo top-left (orange square mark + wordmark), form centered vertically, max-width 360px
- **Right panel:** orange radial gradient (`#f97316` → `#ea580c`), concentric circle rings at 160/300/450/600px diameter, white italic headline + body copy
- Logo mark: orange rounded square (`border-radius: 8px`) with white SVG icon

### Sign Up Screen

- Heading: "Sign up" (30px, 700 weight, `letter-spacing: -0.5px`)
- Subtitle: "Create an account to start hiring infrastructure talent with Trussk."
- **Two SSO buttons side by side** (flex row, each `flex: 1`):
  - "Sign up with Google" — Google favicon
  - "Sign up with Microsoft" — Microsoft favicon (UI only, no-op click for now)
- Divider: "or sign up using email"
- Email field with mail icon
- "Continue →" orange button (full width)
- Footer: "Already have an account? Sign in" (Sign in is orange link)

### Sign In Screen

- Same split layout
- Heading: "Sign in"
- Subtitle: "Welcome back. Sign in to continue managing your pipeline."
- Same Google + Microsoft row (labeled "Sign in with…")
- Email field → Continue → Password Step
- Footer: "Don't have an account? Sign up"

### Password Step

- Replaces the form area (left panel stays the same, right panel stays the same)
- Shows email address above as read-only chip (gray pill, with back arrow to change email)
- Password field with eye toggle (show/hide)
- "Forgot password?" link (right-aligned, small)
- Primary button: "Create account →" (sign up) or "Sign in →" (sign in)
- Framer Motion slide-in from right

### Onboarding Steps — Kastamer-style layout

Each onboarding screen has two panels:
- **Left sidebar** (260px, white, border-right): progress tracker showing all steps with icons — checkmark (green) for done, number (orange) for active, number (gray) for upcoming. Each step shows title + short description. Connector lines between steps turn green as steps complete.
- **Right content area** (flex: 1): form content centered both horizontally and vertically (`display:flex; align-items:center; justify-content:center`), max-width 520px inner block.

**Topbar** across all onboarding screens: Trussk logo left, logged-in email + Log out right.

No info banner.

**Step 1 — Company Info**
- Sidebar steps: ✓ Create Account | ● Company Profile | ○ Invite Your Team | ○ Start Hiring
- Step label: "STEP 1 OF 3" (orange, uppercase, small)
- Title: "Tell us about your company"
- Subtitle: "Help us tailor Trussk to your hiring needs..."
- Fields stacked vertically (full width, 18px gap):
  1. Company Name (text input)
  2. Industry (select: Heavy Civil, Infrastructure, Utilities, General Construction, Other)
  3. Company Size (select: 1–10, 11–50, 51–200, 200+)
  4. Your Role (select: Recruiter, Hiring Manager, Founder / CEO, HR Director)
- Nav: "I'll do this later" (left, gray link) | "Save and continue →" (right, orange button)

**Step 2 — Invite Team**
- Sidebar steps: ✓ Create Account | ✓ Company Profile | ● Invite Your Team | ○ Start Hiring
- Step label: "STEP 2 OF 3"
- Title: "Invite the rest of your team"
- Subtitle: "Invite your co-workers to collaborate on hiring..."
- Section label: "Invite co-workers to Trussk"
- Two invite rows: [✉ email input] [Role select ▾] — "+ Add more" link below
- Role options: Recruiter, Hiring Manager, Admin, Viewer
- Nav: "← Back" + "I'll do this later" (left) | "Send invites →" (right, orange)

**Step 3 — Welcome Modal**
- Full dashboard is visible in the background (dark sidebar with nav items, stat cards, candidate table with avatars + colored badges)
- Light dark overlay: `rgba(0,0,0,0.35)` — dashboard clearly readable through it
- White modal box centered, `border-radius: 16px`, shadow
- 🎉 icon in orange-tinted circle ring
- Title: "Welcome to Trussk"
- Body: "You're all set! Start posting jobs and let AI find, score, and rank the right infrastructure candidates — in minutes."
- CTA: "Post your first job →" (orange) — dismisses modal, sets `onboardingComplete: true` in Firestore
- Framer Motion scale-in (`scale: 0.95 → 1`) + fade

---

## State Management

```typescript
type AuthStep =
  | 'sign-up'           // sign up form
  | 'sign-up-password'  // password entry for sign up
  | 'sign-in'           // sign in form
  | 'sign-in-password'  // password entry for sign in
  | 'onboarding-company'
  | 'onboarding-invite'
  | 'onboarding-welcome'  // rendered inside app shell

type AuthState = {
  step: AuthStep
  email: string          // captured at email step, passed to password step
  isNewUser: boolean
}
```

`isNewUser` is determined by `user.metadata.creationTime === user.metadata.lastSignInTime` after OAuth sign-in, or is always `true` for email/password sign-up.

`onboardingComplete` is stored in Firestore under `users/{uid}` and checked on every sign-in to skip onboarding for returning users.

---

## Firebase / Auth Notes

- **Google OAuth:** Already working via `signInWithPopup`. No changes needed.
- **Microsoft OAuth:** UI renders button, click calls `signInWithMicrosoftPlaceholder()` which shows a toast: "Microsoft sign-in coming soon." Provider will be wired up later in Firebase Console + `microsoft.ts` service file.
- **Email/Password:** `createUserWithEmailAndPassword` (sign up) and `signInWithEmailAndPassword` (sign in). Requires enabling in Firebase Console → Authentication → Sign-in methods → Email/Password.
- **Password reset:** "Forgot password?" calls `sendPasswordResetEmail`.

---

## Firestore Schema

```
users/{uid}
  onboardingComplete: boolean
  companyName: string
  industry: string
  companySize: string
  role: string
  createdAt: timestamp

invites/{uid}/sent/{email}
  email: string
  role: string
  sentAt: timestamp
  status: 'pending'
```

---

## Animations

All transitions use Framer Motion:
- Auth ↔ Password Step: slide left/right (`x: 40` → `x: 0`)
- Auth → Onboarding: fade out / fade in
- Onboarding step transitions: slide left
- Welcome modal: scale from `0.95` to `1.0` with fade

---

## Files to Create / Modify

| File | Action |
|------|--------|
| `src/components/auth/AuthPage.tsx` | Create |
| `src/components/auth/AuthSplitLayout.tsx` | Create |
| `src/components/auth/SignUpForm.tsx` | Create |
| `src/components/auth/SignInForm.tsx` | Create |
| `src/components/auth/PasswordStep.tsx` | Create |
| `src/components/onboarding/OnboardingFlow.tsx` | Create |
| `src/components/onboarding/CompanyInfoStep.tsx` | Create |
| `src/components/onboarding/InviteTeamStep.tsx` | Create |
| `src/components/onboarding/WelcomeModal.tsx` | Create |
| `src/lib/firebase.ts` | Modify — add email/password + Microsoft stub |
| `src/App.tsx` | Modify — swap current auth block for `<AuthPage>` |
