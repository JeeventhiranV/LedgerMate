# LedgerMate — Project Index

> **Quick Reference Navigation & System Map for AI Agents and Developers**  
> *Last Verified: October 2026 | Engine: Vanilla JS ES2022 + Tailwind CSS + IndexedDB v19 + Supabase PG15 + Android SDK 34*

---

## 1. Executive Summary

**LedgerMate** is an offline-first, privacy-focused personal wealth management and career preparation suite. It combines comprehensive personal finance tracking (cash flows, investments, Indian stock portfolio, credit cards, vehicles, bills, and emergency funds) with a full-featured technical learning hub (**Study Resources Hub**).

- **Architecture Style**: Dual-Head Offline-First SPA + Android Native WebView Bridge + Supabase PostgreSQL Cloud Sync.
- **Client Runtime**: Pure ES2022 Vanilla JavaScript, Tailwind CSS (vendor bundle), Chart.js, HTML5 Canvas, IndexedDB.
- **Backend / Cloud**: Supabase PostgreSQL 15, Supabase Auth, Row Level Security (RLS), Supabase Edge Functions (Deno/TypeScript), GitHub Pages hosting.
- **Native Android Wrapper**: Java 17, Android SDK 34, AndroidX Biometrics, WorkManager background reminder workers, Scoped Storage document picker, FLAG_SECURE screen shielding.

---

## 2. Core Documentation Links

Navigate directly to specialized documentation in `docs/ai-context/`:

| Document | Purpose & Scope |
| :--- | :--- |
| **[`ARCHITECTURE.md`](./ARCHITECTURE.md)** | System topologies, dual-head layout, data flow, StorePatch multi-tenancy, Android bridge, and sync cycles. |
| **[`FILE_MAP.md`](./FILE_MAP.md)** | Complete directory hierarchy, file responsibilities, dependencies, callers, and test locations. |
| **[`DATABASE_AND_APIS.md`](./DATABASE_AND_APIS.md)** | 31 IndexedDB object stores, Supabase tables, RLS policies, `FinalJson()` schema, and third-party APIs. |
| **[`FEATURE_STATUS.md`](./FEATURE_STATUS.md)** | Inventory of all finance, study, security, and Android native features with operational status. |
| **[`CODING_RULES.md`](./CODING_RULES.md)** | Established architectural conventions, coding rules, store patching patterns, and UI design standards. |
| **[`KNOWN_ISSUES.md`](./KNOWN_ISSUES.md)** | Technical debt registry, legacy hotspots (`Common.js`), edge-case risks, and mitigations. |
| **[`DECISIONS.md`](./DECISIONS.md)** | Architecture Decision Records (ADRs) explaining technical choices, trade-offs, and historical context. |
| **[`WORK_LOG.md`](./WORK_LOG.md)** | Chronological work log, milestone tracking, and task history across development sessions. |

---

## 3. Primary Entry Points

### A. Web Applications
- **Finance Portal (LedgerMate)**: `index.html` (Shell, view routing, modals, module loading)
- **Shared Authentication**: `login.html` (Dual-column fintech authentication, biometrics, guest mode)
- **Study Hub Dashboard**: `study/index.html` (Domain/category navigator, learning metrics, quick launch)
- **Study Topic Workspace**: `study/topic.html` (Dynamic custom topic workbench, markdown editor, PDF viewer)
- **Study Auth Gateway**: `study/login.html` (Redirects to unified `/login.html?app=study`)
- **PWA Service Worker**: `service-worker.js` (Offline asset caching, stale-while-revalidate strategy)
- **Widget / Mini View**: `widget.html` (Embedded financial glance)

### B. Core JavaScript Controllers
- **Central State & Operations**: `src/scripts/Common.js` (IndexedDB schema, transactions, budgeting, backup export)
- **Event Bus**: `src/scripts/Core/AppBus.js` (`window.LM_Bus` decoupled pub/sub emitter)
- **Multi-Tenant Scoping**: `src/scripts/Auth/StorePatch.js` (Transparent user isolation for IndexedDB)
- **Cloud Synchronization**: `src/scripts/CloudSync.js` (Debounced GZIP base64 push/pull to Supabase `ledger_data`)
- **Study Hub Controller**: `study/js/StudyCustomWorkspace.js` & `study/js/StudySync.js`

### C. Android Native Container
- **Main Activity & Bridge**: `android/app/src/main/java/com/jeeva/ledgermate/MainActivity.java`
- **Background Worker**: `android/app/src/main/java/com/jeeva/ledgermate/BackgroundReminderWorker.java` (WorkManager 15-min periodic checker)
- **Alarm Receiver**: `android/app/src/main/java/com/jeeva/ledgermate/AlarmReceiver.java` (Daily 9:00 AM alarm scheduler)
- **Boot Receiver**: `android/app/src/main/java/com/jeeva/ledgermate/BootReceiver.java` (System reboot listener)

---

## 4. Key Subsystems & Workflows

```
┌────────────────────────────────────────────────────────────────────────┐
│                        User Client / Android App                       │
├───────────────────────────────────┬────────────────────────────────────┤
│       Finance Head (index.html)   │      Study Hub (study/index.html)  │
│  - Transactions & Budgets         │  - Custom Workspaces & Topics      │
│  - Indian Stock Portfolio         │  - 10 Dedicated Prep Kits (prep/) │
│  - Credit Cards & Dues Optimizer  │  - DSA CodeRunner & Answers        │
│  - Vehicles, Fuel & Maintenance   │  - Spaced Repetition (SRS) Cards   │
│  - Bill Splits & Receipt Vault    │  - Community Hub & Live Rooms      │
└─────────────────┬─────────────────┴──────────────────┬─────────────────┘
                  │                                    │
       StorePatch.js / Common.js                StudySync.js
                  │                                    │
      ┌───────────▼────────────┐            ┌──────────▼───────────┐
      │  IndexedDB (v19 Stores)│            │ localStorage & Cache │
      └───────────┬────────────┘            └──────────┬───────────┘
                  │                                    │
       CloudSync.js (FinalJson)                        │
          [Gzip Compressed]                            │
                  ▼                                    ▼
      ┌────────────────────────────────────────────────────────────┐
      │              Supabase PostgreSQL 15 & Auth                 │
      │  - ledger_data (compressed JSONB payload per profile)      │
      │  - study_custom_* relational schema tables                 │
      │  - user_profiles, community_*, interview_*                 │
      └────────────────────────────────────────────────────────────┘
```

---

## 5. Development & Build Commands

- **Local Web Server**:
  ```bash
  python3 -m http.server 8000
  # Open http://localhost:8000/ or http://localhost:8000/study/
  ```
- **Build Android APK**:
  ```bash
  cd android && ./gradlew assembleRelease
  # Output: android/app/build/outputs/apk/release/app-release.apk
  ```
- **Run Verification Tests (Scratch)**:
  ```bash
  node scratch/<test_name>.js
  ```
- **CI/CD Pipelines**:
  - `.github/workflows/deploy.yml`: Generates `supabase-config.js` via `gen_config.py`, updates SW cache hash, deploys to GitHub Pages.
  - `.github/workflows/build-apk.yml`: Compiles signed release APK, calculates version code, publishes to GitHub Releases (`latest`), and triggers `deploy.yml`.

---

## 6. Maintenance Guidelines

1. **Safety First**: Never modify application code (`.js`, `.html`, `.css`, `.java`) during documentation tasks.
2. **Consult Knowledge Base**: Always reference `docs/ai-context/` before proposing structural modifications.
3. **Keep Synchronized**: Update `WORK_LOG.md` and related doc files upon implementing meaningful code updates.
