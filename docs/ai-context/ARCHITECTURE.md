# LedgerMate — Architecture Guide

> **Deep-Dive System Architecture, Data Flows, Multi-Tenancy, Native Bridge & Sync Protocol**  
> *Last Verified: October 2026 | Engine: Vanilla JS ES2022 + Supabase PostgreSQL 15 + Android SDK 34*

---

## 1. High-Level Architectural Topology

LedgerMate operates as an **offline-first, privacy-respecting client application** with an optional cloud synchronization layer. It uses a **Dual-Head Architecture** where two distinct product domains share authentication, theme management, and synchronization protocols while remaining independently operable.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            User Client Layer                                │
├─────────────────────────────────────────┬───────────────────────────────────┤
│    Head A: LedgerMate Finance           │    Head B: Study Resources Hub    │
│    Entry: /index.html                   │    Entry: /study/index.html       │
│    • Ledger, Budgets & Cash Flow        │    • Dynamic Workspaces & Topics  │
│    • Indian Stock Portfolio             │    • 10 Dedicated Prep Kits       │
│    • Credit Card & Due Optimizer        │    • Live Study Room & Timer      │
│    • Vehicle Fuel & Maintenance         │    • Spaced Repetition (SRS)      │
│    • Bill Splitting & Receipt OCR       │    • Community Forum & Chat       │
├─────────────────────────────────────────┴───────────────────────────────────┤
│                             Cross-Cutting Web Core                          │
│   • Auth Guard (/auth/auth-guard.js) & Biometric WebAuthn Gateway           │
│   • Event Bus (LM_Bus /src/scripts/Core/AppBus.js)                          │
│   • Multi-Tenant Storage Partitioning (StorePatch.js)                       │
│   • Service Worker Caching (/service-worker.js)                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                          Android Native Bridge Layer                        │
│   • AndroidBridge (@JavascriptInterface in MainActivity.java)               │
│   • WorkManager 15-min Periodic Checker (BackgroundReminderWorker.java)     │
│   • Daily 9:00 AM Alarm (AlarmReceiver.java) & Reboot Hook (BootReceiver)   │
│   • Hardware BiometricPrompt & WindowManager FLAG_SECURE                    │
│   • Scoped Storage DocumentTree Backup & In-Place GZIP Archiving            │
│   • In-App OTA APK Updater Engine & Release Verification                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                         Data Persistence & Cloud Sync                       │
│   • Local Primary: IndexedDB (ledgermate_db v19, 31 stores) + localStorage  │
│   • Aggregator: window.FinalJson() (31 Stores + 10 State Arrays + Meta)     │
│   • Cloud Primary: Supabase PostgreSQL 15                                   │
│     - ledger_data: Debounced single-row Gzip JSONB sync per user_id         │
│     - study_custom_*: Relational schemas for domains, topics, & progress    │
│     - Storage Bucket: study-materials (public/authenticated attachments)    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Authentication, Authorization & Multi-Tenancy

### A. Authentication Gateway
- **Central Login**: `login.html` provides a modern fintech split-screen UI.
  - Left column: Branded visual hero, capability badges, live trust metrics.
  - Right column: Email/password authentication, biometric quick unlock (`Biometrics.js`), and guest/offline bypass.
- **Study Hub Redirect**: Visiting `study/login.html` preserves intent and seamlessly redirects to `/login.html?app=study`.
- **Global Auth Guard**: Every HTML view includes `/auth/auth-guard.js`. It validates active Supabase sessions, verifies account activation status, displays pending access notices, and injects global navigation elements and haptic listeners.

### B. Transparent Store Partitioning (`StorePatch.js`)
Multi-tenancy is enforced on the client side using a transparent monkey-patch pattern:
- **Load Order**: `AuthManager.js` → `Common.js` → `StorePatch.js` → Feature Modules.
- **Interception**:
  - `getAll(storeName)`: Intercepts queries to 25 user-scoped stores (e.g. `transactions`, `budgets`, `vehicles`, `credit_cards`). Filters records so that only items where `record.profile === currentUserId` (or legacy records matching username/email) are returned. Admin accounts bypass filters to inspect all data.
  - `put(storeName, record)`: Injects `record.profile = currentUserId` before persisting to IndexedDB. Dispatches `LM_Bus.emit('lm:data:changed', { store })` to queue cloud synchronization.
  - `del(storeName, key)`: Dispatches deletion signals to trigger debounced sync.
- **Shared Stores**: `dropdowns`, `settings`, and `users` bypass isolation to allow shared category definitions.

---

## 3. Data Flow & Synchronization Lifecycle

### A. Offline-First Operation
1. All user mutations write directly to local IndexedDB (`ledgermate_db`) and localStorage synchronously or via IndexedDB transactions.
2. The user interface updates optimistically with zero network latency.
3. Network failures do not impede application usage.

### B. LedgerMate Cloud Sync Protocol (`CloudSync.js`)
1. **Change Detection**: When `StorePatch.js` mutates an isolated store, it fires `LM_Bus.emit('lm:data:changed')`.
2. **Debounce Queue**: `CloudSync.js` starts a 4-second debounce timer (`_saveTimer`).
3. **Snapshot Serializer**: Upon timer expiration, `window.FinalJson()` serializes:
   - All 31 IndexedDB object stores.
   - 10 supplementary localStorage keys (`stock_portfolio_data`, `credit_cards`, `vehicles`, `category_rules`, `custom_stocks`, `emergency_fund`, `gold_data`, `bill_splits`, `receipt_attachments`, `study_data`).
   - Metadata timestamp and profile hash.
4. **Native GZIP Compression**:
   - `compressPayload()` runs the JSON string through `CompressionStream('gzip')`.
   - Converts the binary stream into a Base64-encoded envelope:
     ```json
     {
       "_compressed": true,
       "_format": "gzip-b64",
       "_v": 2,
       "payload": "<base64-stream>"
     }
     ```
   - Achieves ~90–95% payload reduction (typically shrinking 500 KB–2 MB payloads down to 30–80 KB).
5. **Supabase Upsert**: Upserts into `public.ledger_data` matching `user_id = auth.uid()`:
   ```sql
   INSERT INTO public.ledger_data (user_id, data, updated_at)
   VALUES (uid, compressed_json, now())
   ON CONFLICT (user_id) DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at;
   ```
6. **Cloud Restore**: On new session boot, `CloudSync.restore()` fetches `ledger_data`, checks decompression support via `DecompressionStream('gzip')`, parses JSON, and merges records via `Common.js` `mergeRestore()`.

### C. Study Module Sync Protocol (`StudySync.js`)
Unlike the single-blob approach in LedgerMate finance, the Study Hub uses a **relational synchronization strategy**:
- Syncs distinct tables: `study_custom_domains`, `study_custom_categories`, `study_custom_topics`, `study_materials`, `study_progress`, `study_streak`, and `study_playlists`.
- Maintains local tombstones (`lm_study_deleted_tombstones_v2`) to propagate item deletions across multiple devices without resurrecting deleted topics.
- Backs up workspace metadata into `FinalJson().study_data` for consolidated full-system disaster recovery.

---

## 4. Android Native Bridge Architecture

When loaded inside the Android WebView, `MainActivity.java` registers a JavaScript interface exposed at `window.AndroidBridge`:

```java
webView.addJavascriptInterface(new AndroidBridge(), "AndroidBridge");
```

### Key Native Capabilities:
1. **Background Dues & Notifications**:
   - Web frontend periodically syncs upcoming dues via `AndroidBridge.syncRemindersToNative(duesJson)`.
   - Native storage writes dues to `SharedPreferences`.
   - `BackgroundReminderWorker.java` (Android WorkManager) checks dues every 15 minutes in the background, even when the WebView is destroyed or device is idle.
   - `AlarmReceiver.java` fires every morning at 09:00 AM to deliver rich notifications for bills and credit card payments due today or in the next 3 days.
2. **Stock & Gold Market Bridge**:
   - Bypasses browser CORS restrictions by executing native HTTP requests on background Java thread pools (`executorService`).
   - `fetchStockQuotes(symbolsJson, callbackId)`: Fetches Yahoo Finance quote data with session cookies and crumb handling.
   - `fetchGoldRates(city, callbackId)`: Scrapes live MCX / 22K & 24K retail gold rates from GoodReturns / BankBazaar.
3. **Biometric Security**:
   - `canAuthenticateBiometrics(callbackId)`: Queries hardware capability via AndroidX `BiometricManager`.
   - `authenticateBiometrics(title, subtitle, callbackId)`: Displays native fingerprint / face authentication dialog.
4. **Scoped Storage Backups & Compression**:
   - `selectBackupFolder(callbackId)`: Launches Android `ACTION_OPEN_DOCUMENT_TREE` with persistent URI permissions.
   - `writeBackupFile(uri, fileName, json, callbackId)`: Writes uncompressed backup to configured storage.
   - `performBackupArchivingAndCompression(dir)`: Scans older backup files, compresses them using native `GZIPOutputStream`, stores them in a `Backups/` subfolder, and preserves data history without silent deletions.
5. **OTA APK Self-Update Engine**:
   - `fetchLatestReleaseMetaAsync(callbackId)`: Checks GitHub Releases `version.json`.
   - `downloadAndInstallApk(url, callbackId)`: Streams APK to application cache with percentage callbacks.
   - `installPendingUpdate(callbackId)`: Triggers system package installer via `FileProvider`.
6. **Screen Protection**:
   - `setScreenSecurityEnabled(boolean)`: Toggles `WindowManager.LayoutParams.FLAG_SECURE` to prevent screenshots and task switcher leaks of sensitive financial data.

---

## 5. Decoupled Communication: Event Bus (`LM_Bus`)

Modules communicate using a pub/sub event bus defined in `src/scripts/Core/AppBus.js`:

| Event Channel | Emitter | Listener(s) | Description |
| :--- | :--- | :--- | :--- |
| `lm:data:changed` | `StorePatch.js` | `CloudSync.js` | Signals record insertion, mutation, or deletion; queues 4s debounced cloud push. |
| `lm:sync:mode-changed` | `CloudSync.js` | Settings UI | Fired when toggling between Cloud and Offline modes. |
| `lm:cloud:saved` | `CloudSync.js` | UI Header / Status badge | Confirms successful cloud sync persistence. |
| `lm:cloud:failed` | `CloudSync.js` | Toast / Status badge | Signals sync network failure or Supabase error. |
| `lm:stock:updated` | `StockPortfolioService` | Portfolio UI & Charts | Broadcasts portfolio value recalculation upon price refresh. |
| `lm:card:due-updated` | `CreditCardsService` | Dashboard / Reminders | Triggers recalculation of upcoming credit card statement dues. |
| `lm:study:progress` | `StudySync.js` | Topic pages / Streak UI | Broadcasts progress updates, completed topics, and streak increments. |

---

## 6. Frontend Layout & Responsive System

- **Single Page Architecture (SPA)**: Navigation operates via `showPage(pageId)`.
  - Hides all `.page-view` sections within `#pageContent`.
  - Removes `.hidden` from target view container.
  - Updates active navigation styles and executes page-specific bootstrap handlers (e.g. `renderDashboard()`, `loadInvestments()`, `renderCreditCardsUI()`).
- **Responsive Navigation**:
  - **Desktop (>= 768px)**: Collapsible sidebar navigation (`#desktopNav`) with labeled icons.
  - **Mobile (< 768px)**: Fixed bottom tab bar (`#mobileNav`) with haptic touch response and quick action triggers.
- **Design Tokens**:
  - Slate dark color palette (`bg-slate-950`, `bg-slate-900`, `border-slate-800`).
  - Typography: **Plus Jakarta Sans** paired with system sans fallbacks for high-clarity numeric data.
