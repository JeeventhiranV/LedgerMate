# LedgerMate — Repository File Map

> **Complete Structural Directory & File Catalog with Roles, Callers, and Dependencies**  
> *Last Verified: October 2026 | Engine: Vanilla JS ES2022 + Supabase PostgreSQL 15 + Android SDK 34*

---

## 1. Root Application Files

| File | Type / Language | Description & Primary Responsibility | Direct Callers / Importers |
| :--- | :--- | :--- | :--- |
| `index.html` | HTML5 / Vanilla | Primary web entry point for LedgerMate Finance. Hosts the SPA layout, tab navigation, modals, and asset imports. | End-users, Android WebView |
| `login.html` | HTML5 / Vanilla | Modern fintech dual-column authentication portal supporting email/password, biometrics, and guest offline access. | `auth/auth-guard.js`, `index.html`, `study/login.html` |
| `manifest.json` | Web App Manifest | PWA installation descriptor (icons, theme color `#0f172a`, standalone display). | Browsers, `index.html` |
| `twa-manifest.json` | JSON | Trusted Web Activity metadata and package configurations. | Android TWA tooling |
| `service-worker.js` | JavaScript ES2022 | PWA Service Worker implementing stale-while-revalidate asset caching for offline resilience. | `index.html`, `login.html`, `study/index.html` |
| `version.json` | JSON | Release manifest containing current semantic build code, release notes, and APK download link. | `AppUpdateService.js`, `MainActivity.java` |
| `widget.html` | HTML5 / Vanilla | Lightweight standalone micro-view for embeddable quick balance / transaction checking. | Standalone embeds |
| `supabase_schema_upgrades.sql` | PostgreSQL SQL | Cumulative SQL migration script containing table extensions, foreign keys, and indexes. | Supabase SQL Editor |

---

## 2. Authentication & Authorization (`auth/`)

| File | Responsibility | Callers / Dependencies |
| :--- | :--- | :--- |
| `auth/auth-guard.js` | Global session guard included on every HTML view. Checks Supabase auth session, redirects unauthenticated users, injects bottom navigation bar, and adds haptics. | Included in all HTML entry points |
| `auth/setup.sql` | Initial PostgreSQL bootstrap script: creates `user_profiles`, `access_requests`, `is_admin()` helper, and `handle_new_user()` auto-approval trigger. | Supabase initialization |
| `auth/supabase-config.js` | Initializes and exposes the global Supabase client instance `_supabase`. Injected by `.github/scripts/gen_config.py` in CI. | `auth-guard.js`, `CloudSync.js`, `StudySync.js` |
| `auth/ledger-data.sql` | Schema for the single-row `ledger_data` sync table with Row Level Security (RLS) restricting read/write to `auth.uid() = user_id`. | Supabase DB setup |
| `auth/study-progress.sql` | Relational table definitions for study module metrics (`study_progress`, `study_streak`). | Supabase DB setup |
| `auth/study-features.sql` | Tables for study playlists, goals, custom notes, and quiz histories. | Supabase DB setup |
| `auth/interview-tracker.sql` | Relational schema for job applications and interview rounds (`interview_applications`, `interview_rounds`). | Supabase DB setup |
| `auth/community-hub.sql` | Schema for community discussions, answers, likes, votes, and real-time chat rooms. | Supabase DB setup |

---

## 3. Core & Shared Scripts (`src/scripts/`)

### A. Core Engine & State Management
- `src/scripts/Common.js`: The central powerhouse (~8,859 lines). Initializes IndexedDB (`openDB`), manages in-memory `state`, registers transaction handlers, handles budget calculations, and builds the full `FinalJson()` backup payload.
- `src/scripts/Core/AppBus.js`: Lightweight event emitter (`window.LM_Bus`) providing decoupled pub/sub event channels (`lm:data:changed`, `lm:sync:mode-changed`, `lm:stock:updated`).
- `src/scripts/CloudSync.js`: Manages cloud backup to Supabase `ledger_data`. Handles 4-second debounced saves, GZIP Base64 compression via `CompressionStream`, decompression via `DecompressionStream`, and manual restore.

### B. Authentication Subsystem (`src/scripts/Auth/`)
- `AuthManager.js`: High-level session coordinator managing login states, role assignments, and profile metadata.
- `Biometrics.js`: WebAuthn API client wrapper allowing fingerprint/face authentication on supported browsers.
- `MasterCrypto.js`: AES-GCM client-side encryption utility for sensitive credentials and notes.
- `StorePatch.js`: Transparent monkey-patch for `getAll`, `put`, and `del`. Injects `profile: currentUserId` into all record operations to enforce multi-tenancy.
- `UserStore.js`: Local credential and user profile caching layer.

### C. Financial & Wealth Modules (`src/scripts/Modules/` & `src/scripts/Wealth/`)
- `CreditCards/CreditCardsService.js`: State store and calculation engine for credit cards, billing cycles, interest-free periods, and dues.
- `CreditCards/CreditCardsUI.js`: Renders credit card cards, payment modals, and statement status.
- `CreditCards/CardOptimizer.js`: Analyzes spending categories and recommends the optimal credit card for maximum reward/cashback yields.
- `Stocks/StockPortfolioService.js`: Portfolio state management for Indian equities (holdings, transactions, invested vs current value).
- `Stocks/StockPortfolioUI.js`: Renders equity holdings table, performance summaries, and transaction logging modals.
- `Stocks/StockCalculations.js`: Calculates weighted average cost, realized/unrealized P&L, and portfolio XIRR.
- `Stocks/StockRegistry.js`: Master dictionary of NSE/BSE listed tickers with sector categorization.
- `Stocks/MarketDataService.js`: Fetches live market quotes via AndroidBridge or web fallback proxies.
- `Vehicles/VehicleService.js`: CRUD manager for vehicle profiles, odometer logs, fuel efficiency, and maintenance records.
- `Vehicles/VehicleUI.js`: Renders vehicle cards, mileage charts, service reminders, and document expiry warnings.
- `Wealth/Wealth.js`: Master wealth dashboard calculator (Net Worth aggregate, asset allocation donut chart, SIP calculator).
- `Wealth/Essentials.js`: Emergency fund calculator, monthly baseline cost tracker, and runway estimation.
- `BillSplitter.js`: Multi-person expense splitting engine with optimal settlement transaction calculation.
- `ReceiptOCR.js`: Client-side OCR parsing receipts using Tesseract.js to extract merchant, date, and total amount.
- `ReceiptVault.js`: Offline attachment cache and thumbnail viewer for transaction receipts.
- `CategoryRules.js`: Auto-categorization rules engine mapping merchant keywords to transaction categories.
- `DebtOptimizer.js`: Debt payoff strategy simulator comparing Avalanche vs. Snowball payoff timelines.
- `LiveMarket.js`: Market ticker widget displaying live indices (NIFTY 50, SENSEX, Gold, Silver).
- `MonteCarloFIRE.js`: Probabilistic Monte Carlo simulation engine projecting retirement portfolio survival.
- `SankeyCashFlow.js`: D3/Canvas Sankey generator visualizing income allocation across expense categories and savings.
- `SpendingHeatmap.js`: Calendar heatmap rendering daily spending density across months.
- `StatementParser.js`: Bank statement parser supporting CSV and PDF extraction.

### D. Utilities & Services (`src/scripts/Common/`)
- `AppUpdateService.js`: Checks `version.json` against current client version and prompts for update or triggers native download.
- `LocalBackupService.js`: Orchestrates scoped storage automated daily backups via AndroidBridge.
- `GoldRateFetch.js`: Fetches 22K/24K gold and silver rates via AndroidBridge or API proxy.
- `HapticFeedback.js`: Triggers subtle haptic feedback patterns using `navigator.vibrate`.
- `CommandPalette.js`: Quick action modal (`Ctrl+K` / `Cmd+K`) for rapid navigation and search.
- `Notes.js`: Markdown personal notes manager with folder hierarchy and encryption support.
- `TripPlanner.js`: Travel budget calculator with route legs, packing lists, and shared expenses.
- `SharedToast.js`: Unified toast notification dispatcher (`showToast(msg, type)`).
- `Notifications.js`: Push notification scheduler and Web Notification permission manager.

---

## 4. Study Module Subsystem (`study/`)

### A. Pages & Layouts
- `study/index.html`: Main dashboard for learning resources, domain navigator, custom workspaces, and study metrics.
- `study/topic.html`: Dynamic workbench for exploring topics, reading notes, launching code playgrounds, and opening attachments.
- `study/login.html`: Gateway redirecting to unified `/login.html?app=study`.

### B. JavaScript Controllers (`study/js/`)
- `StudyCustomWorkspace.js`: Core controller managing dynamic custom domains, categories, topics, and materials.
- `StudyTopicPage.js`: Logic controller for `study/topic.html`, handling markdown rendering, SRS flashcards, and timers.
- `StudySync.js`: Cloud synchronization client for relational study tables in Supabase with deletion tombstone handling.
- `CodeRunner.js`: In-browser JavaScript and algorithm execution sandbox with console output capture.
- `StudySRS.js`: Spaced Repetition System implementing the SM-2 algorithmic interval schedule for flashcards.
- `StudyQuizEngine.js`: Interactive quiz engine with question randomized pools, instant grading, and review logs.
- `StudyTimer.js`: Pomodoro study timer with session interval logging and persistence.
- `LiveStudyRoom.js`: Collaborative study room using Supabase Realtime broadcast channels.
- `community-hub.js`: Community forum module for Q&A, answer upvotes, and discussion threads.
- `AIInterviewHelper.js`: Automated AI-assisted mock interview questions and response evaluation.
- `StudyFileViewer.js`: Embedded viewer supporting PDFs, code files, and study notes.
- `lm-toast.js`: Standalone lightweight toast utility for the study module views.

### C. Preparation Kits (`study/prep/`)
- `DSA-Prep-Hub.html`: Curated Data Structures & Algorithms learning tracker with topic filters.
- `Interview-Prep-Kit.html`: Full-stack interview preparation guides and categorized question banks.
- `Interview-Tracker.html`: Job application pipeline tracker (Applied, Screening, Technical, HR, Offer).
- `Java-Prep-kit.html`: Java 8+, Spring Boot, Microservices, and Hibernate interview question hub.
- `React-Prep.html`: React, Redux, Next.js, and frontend architecture preparation kit.
- `Daily-Learning-Tracker.html`: Daily skill log with hours studied and topic tracking.
- `Quick-Links-Manager.html`: Bookmark manager for technical articles, GitHub repos, and documentation.
- `DSA_CodeBase.html`: Code snippet library for classic algorithmic problems.
- `DSA_SystemDesign.html`: System design cheat sheets, scalability patterns, and architecture templates.
- `HR-Questions.html`: Behavioral questions, STAR format answer templates, and salary negotiation guides.

---

## 5. Android Native Wrapper (`android/`)

- `android/app/src/main/java/com/jeeva/ledgermate/MainActivity.java`: Primary Activity hosting the Android WebView. Exposes the `AndroidBridge` interface with 25+ native capabilities.
- `android/app/src/main/java/com/jeeva/ledgermate/BackgroundReminderWorker.java`: AndroidX WorkManager worker executing periodic 15-minute background checks for pending financial dues.
- `android/app/src/main/java/com/jeeva/ledgermate/AlarmReceiver.java`: Exact alarm receiver scheduled daily at 09:00 AM to deliver reminder notifications.
- `android/app/src/main/java/com/jeeva/ledgermate/BootReceiver.java`: Listens for `ACTION_BOOT_COMPLETED` and reschedules background workers and alarms after device restart.
- `android/app/build.gradle`: Gradle build configuration declaring compileSdk 34, minSdk 26, targetSdk 34, Java 17 compatibility, and AndroidX dependencies.

---

## 6. Build, Automation & CI/CD (`.github/`)

- `.github/workflows/deploy.yml`: Deploys the web application to GitHub Pages. Executes `.github/scripts/gen_config.py` to populate `auth/supabase-config.js` and stamps the Service Worker cache hash.
- `.github/workflows/build-apk.yml`: Compiles signed release APK using Gradle and Java 17. Calculates deterministic build number, publishes assets to GitHub Releases (`latest`), and triggers `deploy.yml`.
- `.github/scripts/gen_config.py`: Python utility that injects repository secrets (`SUPABASE_URL`, `SUPABASE_ANON_KEY`) into JavaScript runtime files during CI deployment.
