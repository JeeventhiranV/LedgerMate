# LedgerMate — Feature Status Inventory

> **Comprehensive Status and Verification Log of All Application Capabilities**  
> *Last Verified: October 2026 | Engine: Vanilla JS ES2022 + Supabase PostgreSQL 15 + Android SDK 34*

---

## 1. Feature Status Summary Table

| Functional Domain | Implemented Features | Partial / Dependent | Missing / Experimental |
| :--- | :---: | :---: | :---: |
| **Personal Finance & Ledger** | 8 | 0 | 0 |
| **Wealth & Investments** | 6 | 0 | 0 |
| **Indian Stock Portfolio** | 6 | 0 | 0 |
| **Credit Cards & Dues** | 5 | 0 | 0 |
| **Vehicle Tracking** | 5 | 0 | 0 |
| **Receipts & Bill Splitting** | 4 | 0 | 0 |
| **Study Resources Hub** | 8 | 0 | 0 |
| **Interview Prep Suite** | 8 | 0 | 0 |
| **Android Native Bridge** | 7 | 0 | 0 |
| **Auth, Sync & Security** | 6 | 0 | 0 |

---

## 2. Personal Finance & Ledger Management

### ✅ 1. Income & Expense Bookkeeping
- **Status**: Production-Ready / Operational
- **Files**: `index.html`, `src/scripts/Common.js`, `src/scripts/Auth/StorePatch.js`
- **Capabilities**: Full CRUD on transactions, automatic balance recalculations, category tags, payment modes (Cash, UPI, Credit Card, Bank Transfer), multi-month date filters, and CSV/JSON export.

### ✅ 2. Category Budgets & Overspend Monitoring
- **Status**: Production-Ready / Operational
- **Files**: `src/scripts/Common.js`
- **Capabilities**: Monthly expenditure caps per category, real-time progress indicators, threshold alerts at 80% and 100%, and multi-currency formatting.

### ✅ 3. Recurring Transactions Engine
- **Status**: Production-Ready / Operational
- **Files**: `src/scripts/Common.js`, `recurringTransactions` store
- **Capabilities**: Automated insertion of recurring subscriptions, utility bills, and salary income based on frequency rules (Daily, Weekly, Monthly, Yearly).

### ✅ 4. Cash Flow & Category Rules
- **Status**: Production-Ready / Operational
- **Files**: `src/scripts/Modules/CategoryRules.js`, `src/scripts/Modules/SankeyCashFlow.js`
- **Capabilities**: Pattern matching on transaction descriptions to auto-assign categories; interactive Sankey diagram visualizing cash inflows, savings, and expense categories.

### ✅ 5. Spending Heatmap & Calendar View
- **Status**: Production-Ready / Operational
- **Files**: `src/scripts/Modules/SpendingHeatmap.js`
- **Capabilities**: Calendar-style GitHub commit-like heatmap displaying daily spending density across months with tooltip summaries.

---

## 3. Wealth & Investments

### ✅ 1. Net Worth Snapshot & Trend Analytics
- **Status**: Production-Ready / Operational
- **Files**: `src/scripts/Wealth/Wealth.js`, `net_worth_snapshots` store
- **Capabilities**: Aggregates cash, bank balances, mutual funds, gold, equity portfolios, and subtracts credit card liabilities and loans to produce historical monthly net worth trends.

### ✅ 2. Asset Allocation & Rebalancing Calculator
- **Status**: Production-Ready / Operational
- **Files**: `src/scripts/Wealth/Wealth.js`, `src/scripts/Charts/Doughnut.js`
- **Capabilities**: Target vs. actual allocation donut charts (Equity, Debt, Gold, Cash) with recommended rebalancing transactions.

### ✅ 3. SIP & Compound Interest Planner
- **Status**: Production-Ready / Operational
- **Files**: `src/scripts/Wealth/Wealth.js`, `sip_plan` store
- **Capabilities**: Forward wealth projection calculator modeling expected returns, inflation adjustments, and monthly SIP contributions.

### ✅ 4. Emergency Fund & Essentials Tracker
- **Status**: Production-Ready / Operational
- **Files**: `src/scripts/Wealth/Essentials.js`, `essentials_settings` store
- **Capabilities**: Computes monthly baseline survival costs and calculates current emergency fund runway in months.

### ✅ 5. Live Gold & Silver Market Tracking
- **Status**: Production-Ready / Operational
- **Files**: `src/scripts/Common/GoldRateFetch.js`, `android/app/.../MainActivity.java`
- **Capabilities**: Real-time 22K/24K gold and silver pricing in INR scraped natively via AndroidBridge or API proxy with historical trend caching.

### ✅ 6. Monte Carlo FIRE Simulator
- **Status**: Production-Ready / Operational
- **Files**: `src/scripts/Modules/MonteCarloFIRE.js`
- **Capabilities**: Runs 1,000 probabilistic iterations against historical asset returns to calculate portfolio longevity and safe withdrawal rates (FIRE score).

---

## 4. Indian Stock Portfolio

### ✅ 1. Stock Registry & Search
- **Status**: Production-Ready / Operational
- **Files**: `src/scripts/Modules/Stocks/StockRegistry.js`
- **Capabilities**: Searchable index of NSE and BSE listed equities with ticker symbols, company names, and market sectors.

### ✅ 2. Live Market Quotes Bridge
- **Status**: Production-Ready / Operational
- **Files**: `src/scripts/Modules/Stocks/MarketDataService.js`, `MainActivity.java`
- **Capabilities**: Live price updates via Yahoo Finance native Android bridge with rate limiting and session crumb caching.

### ✅ 3. Buy/Sell Transaction Journal & P&L
- **Status**: Production-Ready / Operational
- **Files**: `src/scripts/Modules/Stocks/StockPortfolioService.js`, `StockCalculations.js`
- **Capabilities**: Weighted average cost calculation, realized P&L, unrealized gain/loss percentages, and total portfolio valuation.

---

## 5. Credit Cards & Dues Management

### ✅ 1. Multi-Card Portfolio & Utilization
- **Status**: Production-Ready / Operational
- **Files**: `src/scripts/Modules/CreditCards/CreditCardsService.js`, `CreditCardsUI.js`
- **Capabilities**: Tracks credit limits, outstanding balances, statement generation days, payment due dates, and individual credit utilization ratios.

### ✅ 2. Statement & Interest-Free Window Calculator
- **Status**: Production-Ready / Operational
- **Files**: `src/scripts/Modules/CreditCards/CreditCardsService.js`
- **Capabilities**: Calculates days remaining until statement generation and recommends which card currently offers the longest interest-free grace period.

### ✅ 3. Card Reward & Cashback Optimizer
- **Status**: Production-Ready / Operational
- **Files**: `src/scripts/Modules/CreditCards/CardOptimizer.js`
- **Capabilities**: Evaluates merchant category (Dining, Travel, Fuel, Online) and ranks cards by expected reward rate.

### ✅ 4. Automated Dues Synchronization
- **Status**: Production-Ready / Operational
- **Files**: `CreditCardsService.js`, `MainActivity.java`, `BackgroundReminderWorker.java`
- **Capabilities**: Syncs upcoming credit card dues to Android native SharedPreferences for background reminder alerts.

---

## 6. Vehicle Tracking (Bikes & Cars)

### ✅ 1. Vehicle Profiles & Garage Management
- **Status**: Production-Ready / Operational
- **Files**: `src/scripts/Modules/Vehicles/VehicleService.js`, `VehicleUI.js`
- **Capabilities**: Full CRUD on multiple vehicles (motorcycles, cars, EVs) including make, model, registration number, fuel type, and current odometer reading.

### ✅ 2. Fuel Log & Mileage Analytics
- **Status**: Production-Ready / Operational
- **Files**: `VehicleService.js`, `VehicleUI.js`
- **Capabilities**: Logs fuel quantity, total cost, price per liter, and odometer reading to calculate fuel efficiency (km/L) and cost per kilometer.

### ✅ 3. Service Reminders & Document Expiries
- **Status**: Production-Ready / Operational
- **Files**: `VehicleService.js`, `VehicleUI.js`
- **Capabilities**: Tracks insurance, pollution (PUC), fitness certificate, and periodic maintenance intervals based on kilometers driven or elapsed time.

---

## 7. Receipts Vault & Bill Splitting

### ✅ 1. Receipt OCR (Tesseract.js)
- **Status**: Production-Ready / Operational
- **Files**: `src/scripts/Modules/ReceiptOCR.js`
- **Capabilities**: Client-side image recognition parsing receipt images to automatically extract merchant name, date, and invoice total.

### ✅ 2. Offline Receipt Vault
- **Status**: Production-Ready / Operational
- **Files**: `src/scripts/Modules/ReceiptVault.js`, `receipt_attachments` store
- **Capabilities**: Local storage of receipt photos linked directly to transactions with full-screen zoom and preview.

### ✅ 3. Group Bill Splitter & Debt Settlement
- **Status**: Production-Ready / Operational
- **Files**: `src/scripts/Modules/BillSplitter.js`, `shared_bill_splits`
- **Capabilities**: Multi-person expense splitting with uneven split options and simplified debt matrix calculation (minimizes total inter-person transfers).

---

## 8. Study Resources Hub & Prep Kits

### ✅ 1. Dynamic Domain & Topic Hierarchy
- **Status**: Production-Ready / Operational
- **Files**: `study/index.html`, `study/topic.html`, `study/js/StudyCustomWorkspace.js`
- **Capabilities**: User-defined study domains, categories, and topics with markdown notes, code snippets, and external links.

### ✅ 2. PDF Resource Viewer
- **Status**: Production-Ready / Operational
- **Files**: `study/js/StudyFileViewer.js`, `study/data/pdfs.json`, `study/resources/`
- **Capabilities**: Integrated viewer for comprehensive PDF guides across experience levels (0–3, 3–5, 5–8, 8+ years) with native Android intent fallback.

### ✅ 3. Spaced Repetition (SRS) Flashcards
- **Status**: Production-Ready / Operational
- **Files**: `study/js/StudySRS.js`
- **Capabilities**: Algorithmic flashcard review engine utilizing the SuperMemo SM-2 interval algorithm to schedule topic reviews.

### ✅ 4. In-Browser Code Playground
- **Status**: Production-Ready / Operational
- **Files**: `study/js/CodeRunner.js`
- **Capabilities**: Safe in-browser execution sandbox for JavaScript algorithms with captured console output and execution time metrics.

### ✅ 5. Interview Application Pipeline Tracker
- **Status**: Production-Ready / Operational
- **Files**: `study/prep/Interview-Tracker.html`, `interview_applications`
- **Capabilities**: Kanban and tabular job search tracker managing company applications, interview rounds, dates, and offer details.

### ✅ 6. 10 Dedicated Prep Kits
- **Status**: Production-Ready / Operational
- **Files**: `study/prep/*.html`
- **Capabilities**: Curated modules for Java 8+, Spring Boot, React, DSA Problem Hub, System Design, HR Behavioral Questions, and Daily Study Logs.

### ✅ 7. Modern Plus Jakarta Sans Typography
- **Status**: Production-Ready / Operational
- **Files**: `study/styles/study-hub.css`, `study/styles/study-workspace.css`, `study/prep/DSA-Prep-Hub.html`
- **Capabilities**: Fully upgraded typography system using Plus Jakarta Sans for clean readability across study dashboards and code blocks.

---

## 9. Android Native Bridge & Services

### ✅ 1. WorkManager Periodic Background Reminder
- **Status**: Production-Ready / Operational
- **Files**: `BackgroundReminderWorker.java`
- **Capabilities**: Executes every 15 minutes in the background to inspect saved financial dues and fire system notifications.

### ✅ 2. Daily Morning Reminder Alarm
- **Status**: Production-Ready / Operational
- **Files**: `AlarmReceiver.java`, `BootReceiver.java`
- **Capabilities**: Inflexible exact alarm waking the device at 09:00 AM daily to notify the user of payments due today or in the next 3 days.

### ✅ 3. Scoped Storage Backup & In-Place GZIP Archiving
- **Status**: Production-Ready / Operational
- **Files**: `MainActivity.java`, `src/scripts/Common/LocalBackupService.js`
- **Capabilities**: Prompts user for a backup folder via Android SAF document tree, saves daily JSON backups, and archives older backups into a compressed `Backups/*.json.gz` subfolder without data loss.

### ✅ 4. Hardware Biometrics (BiometricPrompt)
- **Status**: Production-Ready / Operational
- **Files**: `MainActivity.java`, `src/scripts/Auth/Biometrics.js`
- **Capabilities**: Authenticates users using system biometric hardware (fingerprint/face unlock) to access sensitive financial data.

### ✅ 5. In-App OTA Update Engine
- **Status**: Production-Ready / Operational
- **Files**: `MainActivity.java`, `AppUpdateService.js`, `version.json`
- **Capabilities**: Checks latest GitHub release, downloads `app-release.apk` with background progress bar, and triggers native package installation.

### ✅ 6. WindowManager FLAG_SECURE
- **Status**: Production-Ready / Operational
- **Files**: `MainActivity.java`
- **Capabilities**: Dynamically blocks screen recording and screenshots to protect financial credentials and balance displays.
