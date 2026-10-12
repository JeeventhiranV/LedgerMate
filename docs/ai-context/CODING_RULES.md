# LedgerMate — Coding Rules & Architectural Conventions

> **Development Standards, Store Patching Patterns, Native Bridge Safety, and UI Conventions**  
> *Last Verified: October 2026 | Engine: Vanilla JS ES2022 + Tailwind CSS + Android SDK 34*

---

## 1. Core Architecture & Language Conventions

### A. Zero-Build Vanilla JavaScript (ES2022)
- **No Transpilers or Bundlers**: The web frontend executes directly in standard modern web browsers and Android WebView without Webpack, Vite, or Babel build steps.
- **Strict Mode**: Wrap files or modules in an IIFE with `'use strict';` to prevent global namespace pollution:
  ```javascript
  (function () {
    'use strict';
    // Module logic here
  })();
  ```
- **Namespacing**: Expose modules and services under the standard `LM_` prefix on the global `window` object:
  - Good: `window.LM_StockPortfolioService`, `window.LM_CreditCardsService`, `window.LM_CloudSync`.
  - Avoid: Cluttering `window` with generic unbound functions or variables.

### B. Event-Driven Decoupling (`LM_Bus`)
- Direct cross-module function calls should be minimized when reacting to state changes.
- Use `LM_Bus` (`src/scripts/Core/AppBus.js`) to publish and subscribe to application events:
  ```javascript
  // Emitting an event
  if (window.LM_Bus) {
    window.LM_Bus.emit('lm:stock:updated', { portfolioId: 'default' });
  }

  // Subscribing to an event
  if (window.LM_Bus) {
    window.LM_Bus.on('lm:stock:updated', (payload) => {
      this.recalculateSummary(payload);
    });
  }
  ```

---

## 2. Storage & Multi-Tenancy Rules

### A. IndexedDB Access via StorePatch
- **Never bypass `StorePatch.js`**: Always use the global `getAll(storeName)` and `put(storeName, record)` helpers provided by `Common.js` and wrapped by `StorePatch.js`.
- **Do not manually inject profile when using patched `put()`**: `StorePatch.js` automatically assigns `record.profile = currentUserId` if not set.
- **Query Scoping**: When executing custom cursor iterations on IndexedDB transactions, you must filter by `record.profile === currentProfile` unless the user is an admin session (`LM_Auth.isAdmin()`).

### B. Cloud Sync Debounce Requirement
- Do not trigger immediate network sync on every keystroke or single field change.
- Mutations through patched `put()` automatically emit `lm:data:changed`, which `CloudSync.js` aggregates and debounces over a 4-second delay.
- Manual sync triggers should only be invoked on discrete user actions (e.g. clicking "Save to Cloud" or explicitly logging out).

---

## 3. Android Native Bridge Safety Rules

### A. Guard All Bridge Invocations
Never assume the code is running inside an Android WebView container. Always check for the presence of `window.AndroidBridge` and verify method existence:
```javascript
// Good practice:
if (window.AndroidBridge && typeof window.AndroidBridge.fetchStockQuotes === 'function') {
  window.AndroidBridge.fetchStockQuotes(JSON.stringify(symbols), callbackId);
} else {
  // Web fallback: query Supabase price cache or proxy
  this.fetchStockQuotesFallback(symbols);
}
```

### B. Asynchronous Callback Pattern
Most native bridge operations are asynchronous. They accept a `callbackId` and invoke a JavaScript callback on completion:
```javascript
const callbackId = 'cb_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
window[callbackId] = function (responseJson) {
  delete window[callbackId]; // Always clean up temporary callback handler
  const data = JSON.parse(responseJson);
  handleResponse(data);
};
window.AndroidBridge.someNativeMethod(args, callbackId);
```

---

## 4. UI, Styling & Typography Conventions

### A. Color Tokens & Theme Aesthetics
- Dark mode is the primary visual identity of LedgerMate.
- Use standard Tailwind utility classes conforming to the Slate color family:
  - Background surface: `bg-slate-950` (base canvas), `bg-slate-900` (cards/panels), `bg-slate-800/50` (subtle containers).
  - Borders: `border-slate-800` or `border-slate-700/60` for card boundaries.
  - Text: `text-slate-100` (primary titles), `text-slate-300` (body), `text-slate-400` / `text-slate-500` (captions and secondary metadata).
  - Accents: Emerald (`text-emerald-400`, `bg-emerald-500/10`) for income/profits; Rose (`text-rose-400`, `bg-rose-500/10`) for expenses/losses; Indigo/Sky for brand primary actions.

### B. Typography Standard: Plus Jakarta Sans
- All dashboards, study hubs, and financial metric screens use **Plus Jakarta Sans** as the primary font family for enhanced geometric clarity and modern aesthetic:
  ```css
  font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
  ```
- Use tabular/monospaced numbers (`font-mono` or `font-variant-numeric: tabular-nums`) for currency figures, account numbers, and alignment tables to prevent layout shifting.

### C. Mobile Responsiveness & Bottom Navigation
- Always maintain mobile-first responsive design.
- Bottom navigation (`#mobileNav`) must remain visible and accessible on mobile viewports (`< 768px`).
- Sidebar navigation (`#desktopNav`) is used on desktop viewports (`>= 768px`).
- Include haptic feedback on touch interactions:
  ```javascript
  if (window.LM_Haptics) window.LM_Haptics.light();
  ```

---

## 5. Testing & Verification Standards

### A. Scratch Test Scripts
- When creating verification scripts, place them in the scratch directory or execute them in a headless Node.js environment.
- Scripts must test:
  1. Input validation and edge cases (empty strings, null profiles, extreme numbers).
  2. Multi-tenant isolation (user A cannot read user B data).
  3. Compression and decompression parity (`FinalJson` round-trip serialization).

### B. Safe Code Modifications
- When modifying existing code, adhere to minimal contiguous edits.
- Never strip or overwrite unrelated methods, comments, or docstrings.
- Preserve backward compatibility with uncompressed v1 backups when adjusting sync schemas.

---

## 6. Git & Versioning Conventions

- Commit message structure follows Conventional Commits:
  - `feat(<module>): <description>` (e.g. `feat(study): upgrade typography to Plus Jakarta Sans`)
  - `fix(<module>): <description>` (e.g. `fix(updates): trigger deploy.yml after APK build`)
  - `docs(<scope>): <description>` (e.g. `docs(context): establish initial project intelligence base`)
- Version numbering is tracked in `version.json` and mirrored in `android/app/build.gradle` (`versionCode`, `versionName`).
