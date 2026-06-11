# LedgerMate

A multi-user personal finance tracker with cloud sync, admin-controlled access, and a bundled Study Resources app — all deployed as a static PWA on GitHub Pages.

---

## Overview

LedgerMate is a full-featured web app with two products under one login:

| App | URL path | Description |
|-----|----------|-------------|
| **LedgerMate** | `/index.html` | Personal finance tracker — transactions, budgets, loans, investments, net worth |
| **Study Resources** | `/study/index.html` | Interview prep hub — Java, DSA, React, HR, Interview Kit |

Both share the same Supabase authentication. Users sign in at the root `/login.html` and are directed to the appropriate app. New users require admin approval before they can access either app.

---

## Features

### Authentication & Access Control
- Email/password and Google OAuth sign-in
- Admin-approval gate — new users start as `active = false`; an admin must activate them
- Pending users see a clear "account pending approval" message at the login screen
- Session persistence, auto token refresh, and cross-tab sign-out sync
- Inactivity auto-logout with configurable timeout
- PIN lock screen (optional second factor)
- Password reset via email

### LedgerMate — Finance Tracker

**Transactions & Budgets**
- Income / expense entries with category, tags, and notes
- Transaction templates for repeating entries
- Recurring transaction scheduler
- Budget tracking with spend-vs-limit progress
- Monthly summary with category breakdown

**Loans & Debt**
- Personal loans (tracked with interest, payments, balance)
- EMI loan calculator with amortization schedule
- Debt payoff projections (Essentials tab)

**Savings & Investments**
- Savings goals with progress tracking
- FD / RD (Fixed Deposit / Recurring Deposit) tracker
- Investments portfolio (stocks, mutual funds, etc.)
- Net worth snapshots over time
- SIP plan tracker
- Asset allocation targets

**Subscriptions**
- Subscription tracker with billing cycle and renewal alerts

**Wealth & Essentials**
- Financial health dashboard — FI score, debt ratio, savings rate
- FI timeline and wealth milestone predictions
- Retirement projection (4% rule)
- Spending insights — category trends, month-over-month deltas, anomalies
- Tabs: Health | Goals | Retirement | Debt Payoff

**Utilities**
- Live gold rate fetching
- Trip planner with route tracking
- Smart search across all data
- Voice-to-text data entry
- Notifications / reminders
- Analytics with Chart.js (doughnut charts, spending breakdown)

**Notes & Vault**
- Rich notes with folder organization, versions, and attachments
- Credentials vault (encrypted local storage for passwords/keys)

### Study Resources — Interview Prep

Five prep modules, each with progress tracking per question/item:

| Module | Content |
|--------|---------|
| Java Prep Kit | Java concepts, code examples |
| DSA Master Hub | Data structures & algorithm questions |
| React Prep Hub | React hooks, patterns, interview questions |
| HR Questions | Behavioural / soft-skills questions |
| Interview Prep Kit | Cross-domain preparation |

- Per-item status: `done` / `in progress`
- Favourite items
- Personal notes per question
- Daily streak tracking (stored in Supabase `study_streak`)

### Admin Panel

Accessible to admin users via the settings icon in LedgerMate.

**Users tab**
- View all users (pending / active sections)
- Create new users with role, activation status, and module access restrictions
- Approve / deactivate accounts
- Toggle admin / user role
- Delete user — shows a confirmation modal listing exactly what will be removed, then:
  1. Wipes local IndexedDB records tagged with the user's profile ID
  2. Deletes `ledger_data` from Supabase (cloud sync data)
  3. Deletes `user_profiles` and `auth.users` entry via SECURITY DEFINER RPC

**Other tabs**
- Statistics — user counts, pending approvals, your own data counts
- App Settings — app name, default currency, theme, session timeout
- Backup — export JSON, import/restore, sync to cloud, factory reset

### Cloud Sync

All LedgerMate data is synced to Supabase (`ledger_data` table) automatically:

| Trigger | Behaviour |
|---------|-----------|
| Any `put()` to a user data store | Emits `lm:data:changed` → debounced 3–4 s save |
| Periodic fallback | Saves every 60 s if dirty |
| Tab hidden / beforeunload | Best-effort immediate save |
| Logout | `saveOnLogout()` awaited before session is wiped |
| Manual ☁️ button | Immediate save with spinner feedback |

On login, cloud data is loaded first (full replace of local IndexedDB), so data follows the user across devices.

### PWA — Offline-First

- Service worker caches all static assets (HTML, CSS, JS, icons)
- Cache-first strategy with background revalidation
- Installable on desktop and mobile (Web App Manifest)
- Full offline access to cached data; changes queue until reconnected

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Vanilla HTML, JavaScript (ES2020), CSS |
| Styling | Tailwind CSS (local vendor bundle) + custom CSS |
| Charts | Chart.js (local vendor bundle) |
| PDF export | jsPDF + html2canvas |
| Local database | IndexedDB (native browser API) |
| Cloud database | Supabase (PostgreSQL + RLS) |
| Auth | Supabase JS v2 — email/password, Google OAuth |
| PWA | Service Worker (`lm-v2.0.2`) + `manifest.json` |
| Hosting | GitHub Pages |
| CI/CD | GitHub Actions — auto-deploys on push to `main` |

---

## Project Structure

```
LedgerMate/
├── login.html                    # Unified login — LedgerMate + Study Resources
├── index.html                    # LedgerMate app shell
├── widget.html                   # Home screen widget
├── service-worker.js             # PWA offline caching
├── manifest.json                 # PWA manifest
│
├── auth/
│   ├── supabase-config.js        # Generated at deploy (gitignored locally)
│   ├── auth-guard.js             # Study pages auth guard
│   ├── setup.sql                 # user_profiles, access_requests, delete_user RPC
│   ├── ledger-data.sql           # ledger_data table (cloud sync)
│   └── study-progress.sql        # study_progress + study_streak tables
│
├── src/
│   ├── scripts/
│   │   ├── Auth/
│   │   │   ├── AuthManager.js    # Session, login, logout, PIN lock
│   │   │   ├── StorePatch.js     # Multi-user IndexedDB isolation + lm:data:changed emit
│   │   │   └── UserStore.js
│   │   ├── Admin/
│   │   │   └── AdminPanel.js     # User management, settings, backup
│   │   ├── Core/
│   │   │   └── AppBus.js         # Event bus (lm:data:changed, lm:cloud:saved, …)
│   │   ├── Common/
│   │   │   ├── Notes.js
│   │   │   ├── Cred.js           # Credentials vault
│   │   │   ├── TripPlanner.js
│   │   │   ├── MonthlySummary.js
│   │   │   ├── GoldRateFetch.js
│   │   │   ├── Notifications.js
│   │   │   ├── Search.js
│   │   │   └── Dropdown.js
│   │   ├── Wealth/
│   │   │   ├── Wealth.js         # Net worth, assets, allocations
│   │   │   └── Essentials.js     # FI score, health, predictions, goals
│   │   ├── Charts/
│   │   │   └── Doughnut.js
│   │   ├── SpeechText/
│   │   │   └── VoiceText.js
│   │   ├── Investments.js
│   │   ├── CloudSync.js          # Supabase save / load / auto-save
│   │   └── Common.js             # IndexedDB helpers (put, getAll, del)
│   └── styles/
│       ├── style.css
│       ├── common.css
│       ├── auth.css
│       └── Notes.css
│
├── study/
│   ├── index.html                # Study hub home
│   ├── login.html                # Redirect stub → /login.html?app=study
│   └── prep/
│       ├── Java-Prep-kit.html
│       ├── DSA-Prep-Hub.html
│       ├── React-Prep.html
│       ├── HR-Questions.html
│       └── Interview-Prep-Kit.html
│
└── assets/
    ├── icons/
    └── vendor/                   # chart.umd.min.js, tailwind.min.js, jspdf, html2canvas
```

---

## Setup

### 1. Supabase project

1. Create a project at [supabase.com](https://supabase.com)
2. In **SQL Editor**, run (in order):
   - `auth/setup.sql` — creates `user_profiles`, `access_requests`, RLS policies, `delete_user` RPC
   - `auth/ledger-data.sql` — creates `ledger_data` cloud sync table
   - `auth/study-progress.sql` — creates `study_progress` and `study_streak` tables
3. In **Authentication → Providers**, enable:
   - Email (enabled by default)
   - Google — add Client ID and Client Secret from Google Cloud Console
4. In **Authentication → URL Configuration**, add your site URL to **Redirect URLs**:
   - `https://<your-username>.github.io/<repo>/login.html`

### 2. Local development

Create `auth/supabase-config.js` (this file is gitignored):

```js
var SUPABASE_URL  = 'https://xxxx.supabase.co';
var SUPABASE_ANON = 'your-anon-key';
var _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    persistSession    : true,
    autoRefreshToken  : true,
    detectSessionInUrl: true
  }
});
```

Then open `index.html` directly in a browser (no build step required).

### 3. GitHub Pages deployment

1. Go to your repository **Settings → Secrets and variables → Actions**
2. Add two repository secrets:
   - `SUPABASE_URL` — your Supabase project URL
   - `SUPABASE_ANON` — your Supabase anon public key
3. Push to `main` — GitHub Actions generates `auth/supabase-config.js` from secrets and deploys automatically

### 4. First run

- The **first user to sign up** is automatically promoted to `admin` with `active = true`
- All subsequent signups start as `active = false` — the admin must approve them from the Admin Panel
- To disable public signups (invite-only): Supabase Dashboard → Authentication → Settings → disable "Enable sign-ups"

---

## Data Architecture

```
Browser (IndexedDB)                  Supabase (PostgreSQL)
─────────────────────                ──────────────────────────────
transactions                         auth.users
budgets                                └─ user_profiles   (role, active, modules)
loans                                  └─ ledger_data     (full JSON snapshot)
savings / savings_goals                └─ study_progress  (per-item status)
investments / sip_plan                 └─ study_streak    (daily streak)
fd_rd                                  └─ access_requests (self-registration)
subscriptions
emi_loans
trips / trip_routes
notes / note_folders
credentials
net_worth_snapshots
audit_logs
dropdowns / settings
```

Multi-user isolation in IndexedDB: every record written by `StorePatch.js` gets a `profile` field set to the current user's Supabase UUID. `getAll()` filters to the current user's records automatically (admins see all).

---

## Author

Developed by **Jeeventhiran V**
