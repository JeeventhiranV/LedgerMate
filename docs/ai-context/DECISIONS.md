# LedgerMate — Architecture Decision Records (ADRs)

> **Historical Context, Strategic Architecture Decisions, Rationale, and Evaluated Alternatives**  
> *Last Verified: October 2026 | Engine: Vanilla JS ES2022 + Supabase PostgreSQL 15 + Android SDK 34*

---

## ADR-001: Offline-First Hybrid Architecture (IndexedDB + Single-Row Cloud JSONB Sync)

### Context & Problem Statement
Personal finance applications require instant response times, complete offline functionality, and resilient multi-device sync without incurring prohibitive cloud database egress or request quotas for individual keystrokes and micro-transactions.

### Decision
1. Use client-side **IndexedDB (`ledgermate_db`, v19)** as the primary operational database.
2. Maintain local state with optimistic UI updates.
3. Consolidate all local tables into an aggregate JSON package via `window.FinalJson()`.
4. Compress the payload using native browser GZIP (`CompressionStream`) and sync to a single PostgreSQL row in `public.ledger_data (user_id, data: jsonb)` debounced over a 4-second delay.

### Consequences & Trade-offs
- **Pros**:
  - Zero network latency for all read/write interactions.
  - Full application functionality on offline flights, commutes, or unstable connections.
  - Dramatically lowers Supabase egress bandwidth (compressing 1–2 MB payloads down to ~40 KB).
  - Trivial disaster recovery: importing a single JSON file completely restores all 31 tables.
- **Cons**:
  - Relies on last-write-wins at the whole-database level; simultaneous concurrent edits on two online devices within 4 seconds resolve to the last uploaded snapshot.

---

## ADR-002: Vanilla JavaScript (Zero Build Step & Bundler-Free Runtime)

### Context & Problem Statement
Modern Single Page Applications often introduce heavy frameworks (React, Angular, Vue) accompanied by complex build chains (Webpack, Vite, Rollup, Babel, npm dependencies). For an app embedded in an Android WebView and deployed to static GitHub Pages, excessive bundle weight and build overhead slow down development iteration and app startup.

### Decision
Implement the entire application in pure modern **Vanilla JavaScript (ES2022)**, utilizing native DOM APIs, custom web components/templates, and Tailwind CSS.

### Consequences & Trade-offs
- **Pros**:
  - Instant application cold boot inside Android WebView (no 3MB framework script initialization).
  - Zero compilation step: edits can be tested immediately in a browser without waiting for bundler builds.
  - Zero dependency vulnerability churn or breaking npm upgrades for core logic.
  - Deploys seamlessly to GitHub Pages as static HTML/CSS/JS.
- **Cons**:
  - Requires disciplined code modularization and naming conventions (`window.LM_*`).
  - Developers must manually manage DOM updates rather than relying on virtual DOM diffing.

---

## ADR-003: Transparent Client-Side Multi-Tenancy via `StorePatch.js`

### Context & Problem Statement
The codebase originated as a single-user offline application where `Common.js` performed unqualified `getAll(store)` and `put(store, item)`. When multi-user authentication with Supabase was introduced, refactoring thousands of call sites across multiple modules would have introduced high regression risk.

### Decision
Implement `src/scripts/Auth/StorePatch.js` as an interception monkey-patch loaded immediately after `Common.js`. It dynamically wraps `window.getAll`, `window.put`, and `window.del` to automatically scope every record to `record.profile = currentUserId` and filter queries accordingly.

### Consequences & Trade-offs
- **Pros**:
  - Clean separation of concerns: legacy code remains unaltered while multi-tenancy is guaranteed.
  - Administrator accounts can dynamically bypass the filter to inspect and troubleshoot records.
  - Prevents data leakage between different user accounts sharing the same physical device or browser profile.
- **Cons**:
  - Requires strict script load order (`AuthManager.js` → `Common.js` → `StorePatch.js` → Feature Modules).

---

## ADR-004: Native Android Bridge with Scoped Storage & WorkManager

### Context & Problem Statement
Pure web PWAs are severely limited on mobile devices: background workers are suspended by aggressive OS battery optimization, local file system access is heavily sandboxed, and hardware biometrics require web user activation.

### Decision
Package the application within a native Android wrapper (`android/`) with a custom `@JavascriptInterface` (`AndroidBridge`):
1. **Background Reminders**: Use AndroidX `WorkManager` (`BackgroundReminderWorker.java`) and exact alarms (`AlarmReceiver.java`) to deliver notifications even when the app is terminated.
2. **Automated Backups**: Use the Android Storage Access Framework (`ACTION_OPEN_DOCUMENT_TREE`) to allow users to select an external backup folder on their device.
3. **Biometrics**: Wrap AndroidX `BiometricPrompt` for hardware fingerprint/face authentication.
4. **Market Data Scraping**: Execute Yahoo Finance and Gold price queries natively to bypass CORS.

### Consequences & Trade-offs
- **Pros**:
  - 100% reliable reminder delivery unaffected by browser tab closures.
  - Seamless hardware integration (biometrics, screen security `FLAG_SECURE`).
  - True offline file backup to user-accessible phone storage (e.g. Google Drive sync folder or SD card).
- **Cons**:
  - Native code must be maintained alongside web code.
  - Android APK builds require Gradle and Java 17.

---

## ADR-005: Dual-Head Architecture (LedgerMate + Study Hub)

### Context & Problem Statement
The developer required a unified platform for personal wealth tracking and technical interview / career development preparation. Building two completely separate repositories would lead to duplicated auth, styling, and sync code.

### Decision
Maintain both domains in a single monorepo:
- **Finance Head**: `/index.html`
- **Study Hub Head**: `/study/index.html`
Both heads share authentication tokens (`auth/auth-guard.js`), Supabase configuration (`supabase-config.js`), and user profiles, while exposing specialized UI layouts.

### Consequences & Trade-offs
- **Pros**:
  - Single login session unlocks both financial management and technical study materials.
  - Unified CI/CD deployment pipeline on GitHub Pages and Android APK.
- **Cons**:
  - Requires clear directory separation (`src/scripts/` vs `study/js/`) to prevent cross-domain script leakage.

---

## ADR-006: Typography Modernization to Plus Jakarta Sans

### Context & Problem Statement
Standard system fonts lacked the geometric legibility required for high-density financial numbers, transaction tables, and technical study documentation.

### Decision
Standardize the primary typography across the entire application on **Plus Jakarta Sans**, loaded via Google Fonts with system sans-serif fallbacks.

### Consequences & Trade-offs
- **Pros**:
  - Modern, crisp aesthetic matching contemporary fintech products.
  - Excellent geometric legibility for numeric figures and dashboard KPIs.
- **Cons**:
  - Small initial webfont download (cached permanently by Service Worker).

---

## ADR-007: Zero-Deletion In-Place GZIP Backup Archiving

### Context & Problem Statement
Automated daily local backups previously risked filling device storage or deleting older backups prematurely through aggressive pruning policies, causing potential loss of historical financial records.

### Decision
Implement in-place GZIP compression for older backups:
1. Active current backup remains as uncompressed `.json` in the user's selected directory for easy inspection.
2. Older backups are compressed to `.json.gz` and moved to a dedicated `Backups/` subfolder.
3. Never silently delete old backups (`prunedCount = 0`).

### Consequences & Trade-offs
- **Pros**:
  - Saves 90%+ disk space while maintaining 100% data retention history.
  - Zero data loss guarantee for user financial records.
- **Cons**:
  - Requires native Android `GZIPOutputStream` handling inside `MainActivity.java`.
