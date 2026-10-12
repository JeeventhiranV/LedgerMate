# LedgerMate — Known Issues, Technical Debt & Risk Log

> **Verified Technical Debt, High-Risk Hotspots, Edge Cases, and Recommended Mitigations**  
> *Last Verified: October 2026 | Engine: Vanilla JS ES2022 + Supabase PostgreSQL 15 + Android SDK 34*

---

## 1. High-Priority Technical Debt

### ⚠️ 1. Monolithic Central Controller: `src/scripts/Common.js`
- **Location**: `src/scripts/Common.js` (~8,859 lines)
- **Description**: `Common.js` originated as the monolithic core of the application. It contains database bootstrap logic (`openDB`), the in-memory `state` object, transaction operations, budgeting logic, DOM rendering functions, legacy navigation, and the `FinalJson()` serialization engine.
- **Risk**: Modifying `Common.js` carries a high risk of regression across unrelated views or causing IndexedDB transaction errors.
- **Mitigation & Future Rule**:
  - Do not add new domain logic directly into `Common.js`.
  - Write new features as modular standalone scripts inside `src/scripts/Modules/` (e.g. `CreditCards/`, `Stocks/`, `Vehicles/`).
  - Wire cross-cutting concerns using the event bus (`LM_Bus.emit` / `LM_Bus.on`).
  - Keep edits in `Common.js` strictly isolated to schema updates or public exports (`window.*`).

---

## 2. Storage & Synchronization Hotspots

### ⚠️ 2. Dual Storage Architecture Discrepancy
- **Description**:
  - **LedgerMate Finance** stores all records locally in IndexedDB (31 stores) and aggregates them into a single compressed JSONB row in the `ledger_data` Supabase table.
  - **Study Hub** stores records in dedicated relational Supabase tables (`study_custom_domains`, `study_custom_categories`, `study_custom_topics`, etc.) while caching active state in `localStorage`.
- **Risk**: A full system backup/restore via `FinalJson()` captures both worlds, but selective topic deletions made offline in the Study Hub could be resurrected by cloud sync if deletion tombstones are cleared prematurely.
- **Mitigation**:
  - `StudySync.js` maintains explicit tombstones (`lm_study_deleted_tombstones_v2`).
  - Never purge tombstones until a successful cloud sync handshake confirms remote deletion.

### ⚠️ 3. Browser CompressionStream Availability
- **Description**: `CloudSync.js` utilizes modern web standards `CompressionStream('gzip')` and `DecompressionStream('gzip')` to compress cloud payloads by ~90–95%.
- **Risk**: Extremely outdated web browsers or legacy WebView instances (pre-Chrome 80 / Safari 16.4) lack stream compression APIs.
- **Mitigation**:
  - `CloudSync.js` includes an automatic fallback that stores raw uncompressed JSON if `CompressionStream` is undefined.
  - Incoming backups are checked for `_compressed === true`; if decompression is unsupported in the current browser, the user is prompted to update their browser or app.

---

## 3. Android Native Bridge & WebView Constraints

### ⚠️ 4. Threading in `@JavascriptInterface`
- **Description**: Methods exposed via `@JavascriptInterface` in `MainActivity.java` execute on a background IPC binder thread, not the Android UI main thread or the WebView JS thread.
- **Risk**: Performing UI interactions (e.g. `Toast`, `BiometricPrompt`, `WindowManager` flag updates) on the binder thread causes Android runtime crashes (`CalledFromWrongThreadException`). Performing blocking network requests on the main thread causes ANRs.
- **Mitigation**:
  - All UI-related calls must be wrapped in `runOnUiThread(() -> { ... })`.
  - All network scraping (Yahoo Finance, Gold rate fetching) must execute on `executorService.execute(() -> { ... })` and return data via `returnToJs(callbackId, json)`.

### ⚠️ 5. Scoped Storage Document Picker Revocation
- **Description**: Android 11+ enforces Storage Access Framework (SAF) scoped storage. `selectBackupFolder()` requests persistable URI permissions via `takePersistableUriPermission`.
- **Risk**: If the user moves, deletes, or unmounts the selected backup directory outside the app, subsequent automated backup attempts will fail with permission errors.
- **Mitigation**:
  - `LocalBackupService.js` and `MainActivity.java` check `dir.exists() && dir.isDirectory()` before writing.
  - If inaccessible, the bridge returns a descriptive error (`"Backup directory not accessible. Please re-select the folder."`) prompting the user to re-link their preferred folder.

---

## 4. Notifications & Push Dependencies

### ⚠️ 6. Web Push vs. Android Native Reminders
- **Description**: Web push notifications require configured VAPID credentials in repository secrets and a deployed Supabase Edge Function (`send-push`).
- **Risk**: In local development or standalone web deployments where edge functions are not configured, web push cannot deliver remote notifications when the browser tab is closed.
- **Mitigation**:
  - The Android APK bypasses this limitation entirely: `BackgroundReminderWorker.java` and `AlarmReceiver.java` operate directly at the OS level using Android WorkManager and exact alarms, delivering 100% reliable local reminders without cloud push dependencies.
