# LedgerMate

A comprehensive, production-grade personal finance ecosystem and interview preparation platform with real-time cloud synchronization, multi-user isolation, native Android app support, background reminder engine, and automated CI/CD deployments.

---

## 🌟 Overview

LedgerMate combines wealth management, stock portfolio analytics, credit card tracking, and a dedicated career preparation hub under a single unified platform:

| Product | Entry Point | Core Capabilities |
| :--- | :--- | :--- |
| **📒 LedgerMate** | `/index.html` | Personal finance tracking, live stock portfolio, credit card cycles, loans, wealth milestones, cashflow analytics, and statement parsing |
| **📚 Study Resources** | `/study/index.html` | Interactive interview prep suite — Java, DSA, React, HR questions, in-browser code runner, spaced repetition (SRS), and quizzes |
| **📱 Android Native APK** | `android/` | Native Android application with background `WorkManager` & `AlarmManager` bill reminders, live market Java engine, and one-tap in-app APK auto-upgrades |

Both products share unified Supabase authentication (`/login.html`), encrypted session management, role-based access control, and cross-device offline-first PWA caching.

---

## 🚀 Key Features

### 1. 📱 Android Native App & Background Engine
- **Persistent Background Reminders**:
  - `WorkManager` (`BackgroundReminderWorker.java`): Periodically checks (every 15 minutes) for upcoming/overdue bills, loans, credit card due dates, and budget overruns even when the app is completely closed.
  - `AlarmManager` (`AlarmReceiver.java`): Exact 9:00 AM daily morning alarm waking the device to ensure critical bill alerts are never missed.
  - `BootReceiver.java`: Automatically reschedules alarms and background workers immediately after device reboot (`RECEIVE_BOOT_COMPLETED`).
- **Native Market Data Engine**:
  - Direct Java HTTP bridge (`MainActivity.java`) for real-time Yahoo Finance stock quotes and Gold/Silver spot rates without browser CORS issues or API rate limits.
- **In-App One-Tap Version Upgrades**:
  - `AppUpdateService.js` compares local installed APK `versionCode` against server `version.json`.
  - Downloads updates with real-time streaming progress (0% &rarr; 100%) and launches the Android Package Installer via `FileProvider`.
- **Google OAuth In-App Routing**:
  - Single-window WebView routing with `prompt: 'select_account'` for smooth account switching without external browser popups or Google 400 errors.

---

### 2. 💳 Credit Card Management Module
- **Cycle & Due Tracking**:
  - Automatically calculates billing cycles, statement generation dates, grace periods, and exact due date countdowns.
  - Real-time days-until-due badge and urgent due warnings directly on the main dashboard.
- **Limit & Payment Analytics**:
  - Credit limit utilization gauge with color-coded risk indicators (<30% Safe, 30-70% Warning, >70% High).
  - Quick bill settlement logger with automatic transaction entry and reminder completion.
  - Reward points and cashback tracker per card.

---

### 3. 📈 Stock Portfolio & Live Market Data
- **Real-Time Market Tracking**:
  - Live stock quotes for NSE / BSE tickers and indices with live price tickers and day change percentages.
  - Live ticker marquee header streaming market movements.
- **Comprehensive Portfolio Metrics**:
  - Track buy/sell transactions, quantity, average buy price, current value, total invested, and realized/unrealized P&L.
  - Sector allocation pie charts and portfolio diversification scoring.
  - Gold & Silver daily live commodity rate widget.

---

### 4. 💰 Wealth & Core Finance Management
- **Transactions & Smart Entry**:
  - Income, Expense, and Account Transfer tracking with categories, tags, receipts, and notes.
  - **Voice-to-Text Input** (`VoiceText.js`): Speech-enabled rapid transaction logging.
  - **Transaction Templates**: One-click re-usable templates for routine expenses.
  - **Recurring Scheduler**: Daily, weekly, monthly, and annual automated recurring entries.
  - **Google Drive Integration** (`Drive.js`): Secure cloud receipt storage and document linking.
- **Budgeting & Spending Caps**:
  - Dynamic monthly category budgets with live spend-vs-limit progress indicators.
  - Proactive automated threshold alerts (85% warning, 100% exceeded) via toast, browser, and background native notifications.
- **Loans & Debt Payoff**:
  - Personal lend/borrow tracker with interest calculations, repayment history, and due date alerts.
  - EMI calculator with full amortization tables.
  - **Debt Optimizer** (`DebtOptimizer.js`): Debt Snowball and Avalanche payoff timeline visualizers.
- **Wealth & FI/RE Insights**:
  - Financial Independence (FI) Score calculation, savings rate tracking, and net worth milestone projections.
  - Interactive **Sankey Cashflow Diagram** (`SankeyCashFlow.js`) mapping income &rarr; accounts &rarr; expenses.
  - **Spending Heatmap** (`SpendingHeatmap.js`): GitHub-style 365-day calendar visualization of daily expenses.
- **Productivity Utilities & Tools**:
  - **Bank Statement Parser** (`StatementParser.js`): Ingests CSV and text bank statements with smart transaction auto-detection.
  - **Category Auto-Rules** (`CategoryRules.js`): Custom keyword rules to auto-categorize incoming transactions.
  - **Trip Planner** (`TripPlanner.js`): Multi-day travel itineraries, group expense splitting, and route mapping.
  - **Rich Notes & Folders** (`Notes.js`): Markdown notes with folder organization and version history.
  - **Encrypted Credentials Vault** (`Cred.js`): Secure local vault for sensitive passwords and API keys.
  - **Monthly Summary & Report Generator** (`MonthlySummary.js`): PDF and Excel financial report export via `jsPDF` & `html2canvas`.
  - **Command Palette** (`CommandPalette.js`): Quick keyboard launcher (`Ctrl+K` / `Cmd+K`) for global navigation and search.

---

### 5. 📚 Study Resources — Complete Interview & Career Hub
- **10 Dedicated Preparation & Productivity Modules**:
  1. **Java Prep Kit** (`Java-Prep-kit.html`): Core Java, Multithreading, JVM internals, Collections, Streams, Memory Management, and Design Patterns.
  2. **DSA Master Hub** (`DSA-Prep-Hub.html`): Categorized algorithmic patterns (Two Pointers, Sliding Window, Trees, Graphs, DP, Backtracking).
  3. **DSA CodeBase** (`DSA_CodeBase.html`): Curated LeetCode/HackerRank code repository with full solutions and explanations.
  4. **System Design Hub** (`DSA_SystemDesign.html`): High-Level Design (HLD) & Low-Level Design (LLD) architecture blueprints, microservices, scaling, and caching.
  5. **React Prep Hub** (`React-Prep.html`): Hooks, lifecycle, state management (Redux/Zustand), Virtual DOM, reconciliation, SSR, and modern frontend patterns.
  6. **HR & Behavioral Questions** (`HR-Questions.html`): STAR technique breakdowns, behavioral questions, and leadership principles.
  7. **Interview Prep Kit** (`Interview-Prep-Kit.html`): Cross-domain quick revision cheat sheets and core computer science fundamentals.
  8. **Interview Tracker** (`Interview-Tracker.html`): Job application pipeline manager (Applied, OA, Technical Rounds, HR, Offer).
  9. **Daily Learning Tracker** (`Daily-Learning-Tracker.html`): Day-by-day roadmap and topic progression logger.
  10. **Quick Links Manager** (`Quick-Links-Manager.html`): Bookmark organizer for documentation, coding platforms, and study materials.
- **Interactive Prep Tools**:
  - **In-Browser Code Runner** (`CodeRunner.js`): Real-time interactive JavaScript and Python code execution sandbox.
  - **Spaced Repetition System (SRS)** (`StudySRS.js`): Flashcard review engine based on memory decay curves.
  - **Study Timer / Pomodoro** (`StudyTimer.js`): Focused study sessions with streak tracking (`study_streak` table).
  - **AI Interview Helper** (`AIInterviewHelper.js`) & **Study Quiz Engine** (`StudyQuizEngine.js`).
  - **Community Prep Hub** (`community-hub.js`): Peer discussions and shared preparation notes.

---

### 6. 🔐 Security, Authentication & Admin Panel
- **Multi-Tenant Data Isolation**:
  - Every IndexedDB record written by `StorePatch.js` is partitioned with a `profile` ID matching the user's Supabase UUID.
  - Database-level isolation enforced via Supabase PostgreSQL Row Level Security (RLS).
- **Access Control & Approval Gate**:
  - New user signups default to `active = false` (invite-only access control).
  - Admin users can approve, deactivate, or assign specific module permissions from the Admin Panel.
- **Client Security & Safeguards**:
  - Client-side role escalation prevention (`active` and `role` fields protected in Supabase).
  - Web-to-Java Android Bridge callback IDs sanitized against XSS / injection attacks.
  - Inactivity auto-logout with configurable timeout and optional Biometric / PIN lock screen.
- **Admin Management & Data Portability**:
  - Full system statistics, user audits, and pending approval management.
  - Complete encrypted JSON backup export, file restore, and factory reset utilities.

---

## 🛠️ Tech Stack & Architecture

| Layer | Technologies |
| :--- | :--- |
| **Frontend Web** | Vanilla JavaScript (ES2022), HTML5, CSS3 Custom Properties, Tailwind CSS (Vendor Bundle) |
| **Visualizations** | Chart.js, Canvas API, Custom SVG Sankey & Heatmap Engines |
| **Native Mobile** | Android SDK 34 (Java 17), `WebView`, `WorkManager 2.9.0`, `AlarmManager`, `FileProvider` |
| **Storage & Sync** | IndexedDB (Local Offline-First) + Supabase (PostgreSQL 15, Auth, Row Level Security) |
| **PWA & Offline** | Service Worker (`service-worker.js`) with Cache-First static revalidation & Web App Manifest |
| **CI / CD Pipeline** | GitHub Actions — automated APK building, release signing, GitHub Release publishing, and GitHub Pages deployment |

---

## 📁 Repository Structure

```
LedgerMate/
├── android/                             # Android Native APK Project
│   ├── app/
│   │   ├── build.gradle                 # Gradle build config, dependencies & signing
│   │   ├── release.keystore             # App signing keystore
│   │   └── src/main/
│   │       ├── AndroidManifest.xml      # Permissions, receivers & FileProvider config
│   │       ├── java/com/jeeva/ledgermate/
│   │       │   ├── MainActivity.java            # WebView container & AndroidBridge
│   │       │   ├── BackgroundReminderWorker.java # Periodic background dues evaluator
│   │       │   ├── AlarmReceiver.java           # Daily 9:00 AM exact alarm receiver
│   │       │   └── BootReceiver.java            # Device reboot reschedule receiver
│   │       └── res/xml/file_paths.xml           # FileProvider cache paths for updates
│   └── build.gradle
│
├── .github/
│   ├── workflows/
│   │   ├── build-apk.yml                # CI/CD: Builds APK & publishes to GitHub Releases
│   │   └── deploy.yml                   # CI/CD: Deploys web app to GitHub Pages
│   └── scripts/
│       └── gen_config.py                # Generates version.json & Supabase config
│
├── auth/                                # Authentication & Backend Schemas
│   ├── supabase-config.js               # Injected credentials (gitignored)
│   ├── auth-guard.js                    # Route access guard
│   ├── setup.sql                        # Core DB schemas, user_profiles & RLS
│   ├── ledger-data.sql                  # Multi-user cloud sync schema
│   └── study-progress.sql               # Study progress & streak schemas
│
├── src/
│   ├── scripts/
│   │   ├── Auth/                        # AuthManager, UserStore, Biometrics, StorePatch
│   │   ├── Admin/                       # AdminPanel user & system management
│   │   ├── Core/                        # AppBus event dispatcher
│   │   ├── Common/                      # Notifications, AppUpdateService, GoldRateFetch, Notes
│   │   ├── Modules/
│   │   │   ├── CreditCards/             # CreditCardsService.js, CreditCardsUI.js
│   │   │   ├── Stocks/                  # Portfolio, Registry, MarketData, Calculations
│   │   │   ├── StatementParser.js       # Bank statement ingestion engine
│   │   │   ├── CategoryRules.js         # Automated transaction categorization
│   │   │   ├── DebtOptimizer.js         # Snowball / Avalanche debt planner
│   │   │   ├── SankeyCashFlow.js        # Cashflow Sankey visualization
│   │   │   ├── SpendingHeatmap.js       # Expense calendar heatmap
│   │   │   └── CommandPalette.js        # Ctrl+K global launcher
│   │   ├── Wealth/                      # Wealth.js, Essentials.js, Financial Health
│   │   └── CloudSync.js                 # Realtime cloud synchronizer
│   └── styles/                          # Responsive dark/light theme CSS stylesheets
│
├── study/                               # Study Resources & Interview Prep Suite
│   ├── index.html                       # Study hub home
│   ├── js/                              # CodeRunner, StudySRS, StudyTimer, QuizEngine
│   └── prep/                            # Java, DSA, React, HR & Interview Prep modules
│
├── index.html                           # LedgerMate Web Application Shell
├── login.html                           # Unified Authentication Portal
├── service-worker.js                    # Offline-first Service Worker
├── version.json                         # Build & APK version metadata
└── manifest.json                        # PWA Manifest
```

---

## 🚀 Setup & Deployment

### 1. Supabase Backend Setup
1. Create a Supabase project at [supabase.com](https://supabase.com).
2. In the **SQL Editor**, execute the schemas in order:
   - `auth/setup.sql`
   - `auth/ledger-data.sql`
   - `auth/study-progress.sql`
3. Under **Authentication → Providers**, configure **Email** and **Google OAuth**.
4. Set the redirect URL to: `https://<username>.github.io/LedgerMate/login.html`.

### 2. GitHub Secrets Configuration
In your GitHub repository under **Settings → Secrets and variables → Actions**, add:
- `SUPABASE_URL`: Your Supabase Project URL (`https://xxxx.supabase.co`)
- `SUPABASE_ANON`: Your Supabase Anon/Public API Key
- `KEYSTORE_PASSWORD`: Keystore password for APK signing
- `KEY_ALIAS`: Keystore key alias
- `KEY_PASSWORD`: Keystore private key password

### 3. Deploying & Installing
- **Web App**: Automatically deploys to GitHub Pages on every push to `main`.
- **Android APK**: Automatically compiled, signed, and published under **Releases** (`latest` tag) by the `build-apk.yml` workflow.
- **In-App Updates**: Once the APK is installed, any future push to `main` automatically notifies users inside the app and allows one-tap upgrading!

---

## 👨‍💻 Author

Developed with ❤️ by **Jeeventhiran V**
