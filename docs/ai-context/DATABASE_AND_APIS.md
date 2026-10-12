# LedgerMate — Database Schemas & API Contracts

> **Complete Specification of IndexedDB Stores, Supabase Tables, RLS Policies, Serialization Formats & External APIs**  
> *Last Verified: October 2026 | Engine: IndexedDB v19 + PostgreSQL 15 + Supabase Auth*

---

## 1. Local Storage: IndexedDB (`ledgermate_db`)

- **Database Name**: `ledgermate_db`
- **Schema Version**: `19` (Managed in `src/scripts/Common.js`)
- **Isolation Mechanism**: Intercepted by `src/scripts/Auth/StorePatch.js`. Records in user-scoped stores are stamped with `profile: currentUserId` and filtered on query.

### Object Store Directory (31 Stores)

| Store Name | Key Path | Auto Increment | Secondary Indexes | Scoped by StorePatch? | Description & Contents |
| :--- | :--- | :---: | :--- | :---: | :--- |
| `transactions` | `id` | Yes | `date`, `profile` | **Yes** | Financial income/expense transactions with category, amount, payment mode, and note. |
| `budgets` | `id` | Yes | `profile` | **Yes** | Monthly expenditure limits partitioned by category and period. |
| `loans` | `id` | Yes | `profile`, `dueDate` | **Yes** | Borrowed or lent amounts, counterparties, interest rates, and due dates. |
| `reminders` | `id` | Yes | `profile`, `date` | **Yes** | Bill and task reminders scheduled for local / native notification dispatch. |
| `dropdowns` | `id` | Yes | *(None)* | **No** (Shared) | Configurable transaction categories, payment modes, and account labels. |
| `settings` | `key` | No | *(None)* | **No** (Shared) | General application configuration, UI preferences, and feature toggles. |
| `users` | `id` | Yes | *(None)* | **No** (Shared) | Local cached user registry and session profile metadata. |
| `savings` | `id` | Yes | `profile` | **Yes** | Fixed deposits, recurring deposits, and designated savings accounts. |
| `investments` | `id` | Yes | `profile` | **Yes** | Mutual funds, bonds, real estate, and general asset holdings. |
| `recurringTransactions` | `id` | Yes | `profile` | **Yes** | Automation rules for recurring salaries, bills, and subscriptions. |
| `auditLog` | `id` | Yes | `profile`, `timestamp` | **Yes** | Legacy activity tracking and change history records. |
| `trips` | `id` | Yes | *(None)* | **Yes** | Travel itineraries, trip budgets, and grouped expense logs. |
| `trip_routes` | `id` | Yes | `tripId` | **Yes** | Multi-leg route waypoints and transportation expenses for trips. |
| `credentials` | `id` | Yes | *(None)* | **Yes** | Encrypted secure password / account credential store (`MasterCrypto.js`). |
| `audit_logs` | `id` | Yes | `profile`, `timestamp` | **Yes** | Unified system audit trail for security-critical actions and sync operations. |
| `notes` | `id` | Yes | `title`, `folderId`, `pinned`, `modified` | **Yes** | Personal encrypted markdown notes and knowledge snippets. |
| `note_versions` | `id` | Yes | `noteId`, `timestamp` | **Yes** | Revision history snapshots for user notes. |
| `note_attachments` | `id` | Yes | `noteId` | **Yes** | Binary / base64 attachment blobs linked to personal notes. |
| `note_folders` | `id` | Yes | `parentId` | **Yes** | Hierarchical folder tree organizing user notes. |
| `emi_loans` | `id` | Yes | *(None)* | **Yes** | Detailed amortization schedules, tenure, interest, and monthly EMI payments. |
| `net_worth_snapshots`| `id` | Yes | `date` | **Yes** | Historical monthly snapshots recording total assets, liabilities, and net worth. |
| `allocation_targets` | `id` | No | *(None)* | **Yes** | Asset allocation percentages (Equity %, Debt %, Gold %, Cash %). |
| `sip_plan` | `id` | Yes | *(None)* | **Yes** | Systematic Investment Plans with SIP date, mutual fund name, and debit amount. |
| `essentials_settings`| `id` | Yes | `key`, `profile` | **Yes** | Baseline survival expenditure rules for Emergency Fund runway calculation. |
| `savings_goals` | `id` | Yes | `profile`, `targetDate` | **Yes** | Target milestone savings (target amount, saved amount, deadline). |
| `subscriptions` | `id` | Yes | `profile` | **Yes** | Active digital subscriptions (Netflix, Spotify, etc.) with renewal dates. |
| `fd_rd` | `id` | Yes | `profile` | **Yes** | Fixed Deposit and Recurring Deposit accounts with maturity date and interest. |
| `tx_templates` | `id` | Yes | `profile` | **Yes** | Pre-configured transaction templates for single-tap quick entry. |
| `dashboard_config` | `id` | No | *(None)* | **No** (Shared) | Customized dashboard widget layout, order, and visibility toggles. |
| `credit_cards` | `id` | No | `profile`, `statement_day`, `due_day` | **Yes** | Credit card profiles, limits, statement cut-off, due dates, and rewards. |
| `vehicles` | `id` | No | `profile`, `regNumber`, `type` | **Yes** | Vehicle profiles, fuel logs, service history, and document expiries. |
| `receipt_attachments`| `id` | No | `userId`, `transactionId`, `profile` | **Yes** | Offline local receipt image cache linked to financial transactions. |

---

## 2. Cloud Storage: Supabase PostgreSQL 15

### A. Core Finance & Tenancy Schema

#### 1. `public.ledger_data` (Primary Backup & Sync)
```sql
CREATE TABLE IF NOT EXISTS public.ledger_data (
    user_id     UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    data        JSONB NOT NULL,
    updated_at  TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
```
- **Payload Format**: Either uncompressed JSON or GZIP Base64 compressed structure:
  ```json
  {
    "_compressed": true,
    "_format": "gzip-b64",
    "_v": 2,
    "payload": "<Base64-encoded GZIP binary string>"
  }
  ```
- **RLS Policy**:
  - `SELECT`: `auth.uid() = user_id` (or `is_admin() = true`).
  - `INSERT / UPDATE`: `auth.uid() = user_id`.

#### 2. `public.user_profiles` & `public.access_requests`
```sql
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username    TEXT UNIQUE,
    email       TEXT UNIQUE,
    full_name   TEXT,
    role        TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user', 'guest')),
    is_active   BOOLEAN DEFAULT false,
    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now()
);
```
- **Auto-Approval Trigger**: The initial account registered in the system is automatically assigned `role = 'admin'` and `is_active = true`. Subsequent accounts default to `is_active = false` until approved by an administrator.

#### 3. Indian Stock Equities Tables
- `public.stock_portfolios`: Portfolio container `(id, user_id, name, currency, created_at)`.
- `public.stock_holdings`: Current equity positions `(id, portfolio_id, symbol, exchange, quantity, avg_buy_price)`.
- `public.stock_transactions`: Buy/Sell transaction ledger `(id, portfolio_id, symbol, type, quantity, price, executed_at)`.
- `public.stock_price_cache`: Shared live quote cache `(symbol, price, change, change_percent, updated_at)`.

---

### B. Study Module Relational Schema

Unlike the single-blob approach in Finance, the Study Hub uses dedicated relational tables in PostgreSQL:

| Table Name | Key Columns | Description & Role |
| :--- | :--- | :--- |
| `study_custom_domains` | `id, user_id, name, slug, icon, color, sort_order` | Top-level study domains (e.g. "Software Architecture", "DevOps"). |
| `study_custom_categories` | `id, domain_id, user_id, name, slug, icon` | Intermediate grouping categories within domains. |
| `study_custom_topics` | `id, category_id, user_id, title, notes, status, priority` | Specific subject topics containing markdown notes and links. |
| `study_materials` | `id, topic_id, user_id, file_name, file_url, file_type, size_bytes` | Document attachments uploaded to the `study-materials` storage bucket. |
| `study_progress` | `id, user_id, topic_id, completed, confidence_score, updated_at` | Learning completion checkpoints and mastery self-ratings. |
| `study_streak` | `id, user_id, current_streak, longest_streak, last_active_date` | Consecutive daily study activity tracking. |
| `study_flashcards` | `id, topic_id, user_id, front, back, interval_days, ease_factor, reps` | SRS flashcards powered by the SM-2 spaced repetition algorithm. |
| `study_live_rooms` | `id, host_user_id, room_code, title, is_active, participant_count` | Real-time collaborative Pomodoro rooms using Supabase Realtime channels. |
| `interview_applications` | `id, user_id, company, position, status, applied_date, salary_range` | Full-cycle job application pipeline tracking. |
| `interview_rounds` | `id, application_id, round_name, scheduled_date, feedback, outcome` | Individual interview stages (Technical screening, System Design, HR). |
| `community_discussions` | `id, user_id, title, content, tags, upvotes_count, replies_count` | Q&A forum and collaborative discussion posts. |
| `community_messages` | `id, room_id, sender_id, message_text, created_at` | Real-time chat messages in study discussion rooms. |

---

## 3. Data Serialization: `FinalJson()` Contract

When generating a full local backup or pushing to `ledger_data`, `window.FinalJson()` in `src/scripts/Common.js` builds an aggregate JSON package containing:

```json
{
  "transactions": [],
  "budgets": [],
  "loans": [],
  "reminders": [],
  "dropdowns": {},
  "settings": {},
  "appSettings": {},
  "users": [],
  "savings": [],
  "investments": [],
  "trips": [],
  "routes": [],
  "credentials": [],
  "notes": [],
  "note_folders": [],
  "note_attachments": [],
  "note_versions": [],
  "emi_loans": [],
  "net_worth_snapshots": [],
  "allocation_targets": [],
  "sip_plan": [],
  "essentials_settings": {},
  "savings_goals": [],
  "subscriptions": [],
  "fd_rd": [],
  "tx_templates": [],
  "dashboard_config": {},
  "recurringTransactions": [],
  "audit_logs": [],
  "stock_portfolio_data": {},
  "credit_cards": [],
  "vehicles": [],
  "category_rules": [],
  "custom_stocks": [],
  "emergency_fund": {},
  "gold_data": {},
  "bill_splits": [],
  "receipt_attachments": [],
  "study_data": {
    "custom_workspace": {},
    "user_prefs": {},
    "tombstones": {},
    "progress": {},
    "streak": {},
    "quiz_history": {},
    "srs_cards": {},
    "timer_logs": {}
  },
  "user_feedback": {},
  "activity_logs": [],
  "meta": {
    "exportedAt": "2026-10-12T18:00:00.000Z",
    "exportedBy": "jeeva",
    "profileId": "user-uuid",
    "version": "2.0"
  }
}
```

---

## 4. External Integrations & APIs

### A. Live Stock Quotes (Yahoo Finance Bridge)
- **Native Android Flow**: `AndroidBridge.fetchStockQuotes(symbolsJson, callbackId)`.
  - Android Java engine initiates an HTTP request directly to Yahoo Finance query endpoints (`https://query1.finance.yahoo.com/v7/finance/quote?symbols=...`).
  - Manages session cookies and crumb tokens natively, bypassing browser CORS restrictions.
- **Web Browser Fallback**: Queries a CORS proxy or cached Supabase `stock_price_cache` table.

### B. Live Gold & Silver Rates (MCX & Retail)
- **Native Android Flow**: `AndroidBridge.fetchGoldRates(city, callbackId)`.
  - Scrapes 22 Karat and 24 Karat retail gold prices and 1 Kg silver rates from GoodReturns / BankBazaar.
- **Local Fallback**: Employs cached historical gold rates stored in `localStorage('lm_gold_data')`.

### C. Web Push Notifications
- **Supabase Edge Function**: `supabase/functions/send-push/index.ts`.
  - Uses VAPID authentication (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`).
  - Sends encrypted Web Push payloads to subscribed endpoints stored in `push_subscriptions` table.
- **Android Native Channel**: Reminders are delivered directly through Android Notification Manager on the `ledgermate_reminders` notification channel.

### D. OTA In-App Updates
- **Metadata Check**: Reads `https://github.com/JeeventhiranV/LedgerMate/releases/download/latest/version.json`.
- **Package Installation**: Android bridge streams `app-release.apk` and presents the system package installer via `FileProvider`.
