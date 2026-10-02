/**
 * LedgerMate & Study Hub – HelpFeedbackModal.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Centralized Knowledge Base & Interactive FAQ + Reviews, Suggestions & Complaints
 * - High-performance glassmorphism centered popup with dual-tab interface.
 * - Module-wise static FAQ covering Transactions, Loans, Wealth, Stocks, Gold,
 *   Credit Cards, Bill Splitter, OCR, FIRE Simulator, Zero-Knowledge Crypto, Study Hub.
 * - Database-backed Reviews, Suggestions, and Complaints with full nested replies.
 * ─────────────────────────────────────────────────────────────────────────────
 */

(function () {
  'use strict';

  let _activeModal = null;
  let _activeTab = 'faq'; // 'faq' | 'feedback'
  let _selectedCategory = 'all';
  let _feedbackFilter = 'all';
  let _searchQuery = '';
  let _cachedFeedbackList = [];
  let _cachedCommentsMap = {};
  let _loadingFeedback = false;

  // ── Static Module-Wise FAQs ─────────────────────────────────────────────────
  const FAQ_MODULES = [
    {
      id: 'transactions',
      name: 'Transactions & Cash Flow',
      icon: '💸',
      color: '#10b981',
      badge: 'Core Ledger',
      questions: [
        {
          q: 'How do I add and categorize Income, Expenses, and Transfers?',
          a: 'Tap the **+** Quick Add floating button or use keyboard shortcut `N` anywhere in the dashboard. Choose transaction type (**Expense 💸**, **Income 💰**, or **Transfer 🔄**), select the account (Cash, Bank, Credit Card, Wallet), specify the category, and enter the amount. Transfers automatically move balances between accounts without affecting net income/expense calculations.'
        },
        {
          q: 'How does the Category Rules Engine automatically tag transactions?',
          a: 'When you import bank CSV statements or type recurring merchant names (e.g. "Swiggy", "Uber", "Netflix"), the Category Rules Engine matches merchant keywords and auto-assigns the correct category, tags, and account automatically. You can configure custom rules in **Settings → Category Rules**.'
        },
        {
          q: 'How do I filter, search, and export transaction data?',
          a: 'Navigate to the **Transactions** ledger to search by merchant, note, or tag. Filter by date ranges (7d, 30d, 90d, 1y, Custom) and accounts. You can export filtered or complete financial records in standard **CSV** or encrypted **JSON** formats at any time.'
        }
      ]
    },
    {
      id: 'loans',
      name: 'Loans & EMI Manager',
      icon: '🏦',
      color: '#3b82f6',
      badge: 'Debt Analytics',
      questions: [
        {
          q: 'How do I track Personal, Home, Vehicle loans, and EMIs?',
          a: 'In the **Loans & Liabilities** module, enter the principal loan amount, annual interest rate (reducing or flat), tenure in months, and start date. LedgerMate computes your exact monthly EMI, total interest payable, remaining principal balance, and scheduled payoff date.'
        },
        {
          q: 'How does the Debt Payoff Planner (Snowball vs. Avalanche) work?',
          a: 'The **Debt Payoff Planner** analyzes all your active loans and credit card debts. The **Debt Avalanche method** prioritizes paying off highest-interest liabilities first to save maximum money on interest, while the **Debt Snowball method** targets smallest balances first for rapid psychological momentum.'
        },
        {
          q: 'How do loan EMI payment reminders work?',
          a: 'LedgerMate automatically schedules native push notifications and background Android alarms 3 days, 1 day, and on the morning of your EMI due dates so you never miss a payment or incur penalty charges.'
        }
      ]
    },
    {
      id: 'wealth',
      name: 'Wealth & Net Worth Vault',
      icon: '📊',
      color: '#8b5cf6',
      badge: 'Net Worth',
      questions: [
        {
          q: 'How is total Net Worth calculated in real-time?',
          a: 'Your Net Worth is calculated dynamically as: **Total Assets (Bank Accounts + Cash + Stocks Portfolio + Mutual Funds + Gold/Silver Bullion + Fixed Deposits + Real Estate) MINUS Total Liabilities (Active Loans + Credit Card Outstanding + Borrowed Dues)**. It updates instantly whenever transactions or market rates change.'
        },
        {
          q: 'What are Asset Allocation Targets and Rebalancing Alerts?',
          a: 'Set your ideal portfolio allocation ratios (e.g., 50% Equity Stocks, 20% Gold Bullion, 20% Debt/FDs, 10% Cash Emergency Fund). LedgerMate displays visual radar/donut distribution charts and warns you when any asset class deviates beyond your tolerance bands.'
        },
        {
          q: 'How does the Monthly Net Worth Snapshot tracking work?',
          a: 'On the 1st of every month (or on-demand), LedgerMate saves a timestamped financial snapshot. This powers the historical Net Worth Sparkline chart and Month-over-Month (MoM) asset growth analytics.'
        }
      ]
    },
    {
      id: 'stocks',
      name: 'Indian Stock Portfolio (NSE/BSE)',
      icon: '📈',
      color: '#f59e0b',
      badge: 'Equities',
      questions: [
        {
          q: 'Where do live NSE/BSE stock prices and quotes come from?',
          a: 'Stock quotes are fetched directly from live institutional market feeds (Yahoo Finance / NSE endpoints) with zero latency. Indian tickers (e.g. `RELIANCE`, `TCS`, `INFY`, `HDFCBANK`) automatically append `.NS` for real-time live trading quotes, day high/low, and percentage changes.'
        },
        {
          q: 'How are Realized vs. Unrealized Profit & Loss (P&L) tracked?',
          a: 'Whenever you record a Buy order, your average holding price is calculated. Unrealized P&L tracks live market fluctuations on open holdings. When you record a Sell order, the exact capital gains are locked into your Realized P&L ledger for tax accounting.'
        },
        {
          q: 'Can I track Mutual Funds, SIPs, and US Equities?',
          a: 'Yes! You can record SIP investments with recurring frequencies and track international stocks (e.g. `AAPL`, `GOOGL`, `NVDA`, `TSLA`) alongside Indian equities with automatic currency conversions.'
        }
      ]
    },
    {
      id: 'gold',
      name: 'Gold & Silver Bullion Rates',
      icon: '🪙',
      color: '#eab308',
      badge: 'Live Bullion',
      questions: [
        {
          q: 'How are 24K, 22K, 18K Gold and 999 Silver prices computed?',
          a: 'Prices are computed using multi-tier global bullion feeds (Fawazahmed Currency API + Cloudflare Bullion Mirror + Binance PAXG/USDT spot rates + live USD/INR FX). A standard ~10.85% landed import duty and GST multiplier is applied to reflect local Indian retail spot rates per gram.'
        },
        {
          q: 'Does LedgerMate support city-wise gold rate differentials in India?',
          a: 'Yes! City premiums are calibrated for major hubs including **Chennai, Mumbai, Delhi, Bengaluru, Hyderabad, Kolkata, Ahmedabad, Pune, Jaipur, and Kochi** to match your local jeweler associations.'
        },
        {
          q: 'How does physical and digital Gold valuation integrate with Net Worth?',
          a: 'Enter your total holdings in grams or sovereigns. Your gold & silver asset values update automatically every day based on live bullion market prices, feeding directly into your total Net Worth calculation.'
        }
      ]
    },
    {
      id: 'credit_cards',
      name: 'Credit Cards & 50-Day Grace Period',
      icon: '💳',
      color: '#06b6d4',
      badge: 'Card Optimizer',
      questions: [
        {
          q: 'How does the 50-day interest-free grace period tracker work?',
          a: 'By inputting your card\'s statement generation date and payment due date, LedgerMate calculates the exact remaining interest-free credit window (up to 50 days) for every swipe today, helping you maximize cashflow float.'
        },
        {
          q: 'What is the Card Reward & Cashback Optimizer?',
          a: 'The optimizer dynamically compares all your credit cards across spending categories (Dining, Travel, Fuel, Groceries, Online Shopping) and recommends the card with the highest reward rate and maximum remaining grace period.'
        },
        {
          q: 'How do bill dues reminders and statement cycles work?',
          a: 'Track total credit limits, current outstanding balances, utilization ratios (< 30% recommended for high CIBIL scores), and receive automated payment alerts before due dates.'
        }
      ]
    },
    {
      id: 'splitter_ocr',
      name: 'Bill Splitter & AI Receipt OCR',
      icon: '📸',
      color: '#ec4899',
      badge: 'AI & Group Tools',
      questions: [
        {
          q: 'How does optimal debt graph simplification work in Bill Splitter?',
          a: 'When splitting group trips or restaurant bills, LedgerMate uses a minimum-cash-flow graph algorithm to cancel out cyclic debts (e.g. if A owes B, B owes C, and C owes A), reducing the number of total payments to the absolute minimum.'
        },
        {
          q: 'How do instant UPI Deep Links (`upi://pay`) work?',
          a: 'Each settlement tile generates a direct UPI deep link (`upi://pay?pa=VPA&am=AMOUNT&pn=NAME`). Tapping it opens Google Pay, PhonePe, Paytm, or CRED with recipient and amount pre-filled.'
        },
        {
          q: 'How does AI Receipt & Invoice OCR auto-fill transactions?',
          a: 'Upload or take a photo of any receipt. The on-device AI OCR engine extracts the merchant name, invoice date, tax, and total amount, compressess the image into a lightweight WebP (< 80KB), and pre-fills the transaction modal in one tap.'
        }
      ]
    },
    {
      id: 'fire_simulator',
      name: 'Monte Carlo FIRE Simulator',
      icon: '🎲',
      color: '#a855f7',
      badge: 'Retirement & FIRE',
      questions: [
        {
          q: 'What is the Monte Carlo FIRE Simulator?',
          a: 'The simulator runs 1,000 statistical market trials using geometric Brownian motion and sequence-of-returns volatility to predict the exact probability that your wealth will sustain your early retirement (FIRE) across 30 to 50 years.'
        },
        {
          q: 'What metrics and confidence intervals are computed?',
          a: 'It computes your FIRE Target Number (25x-33x annual expenses), Safe Withdrawal Rate (SWR 3.5%-4.0%), Median Expected Portfolio at age 60/80, 95th percentile best-case, and 10th percentile stress-test worst-case scenarios.'
        }
      ]
    },
    {
      id: 'security_sync',
      name: 'Security, Vault Lock & Cloud Sync',
      icon: '🔒',
      color: '#6366f1',
      badge: 'Zero-Knowledge',
      questions: [
        {
          q: 'How does Master PBKDF2 + AES-256-GCM Zero-Knowledge Encryption work?',
          a: 'When Vault Lock is enabled, sensitive credentials and financial records are encrypted on your device using AES-256-GCM with 100,000 PBKDF2 derivation rounds before syncing to Supabase. Even database administrators cannot read your encrypted records.'
        },
        {
          q: 'How do Biometric Unlock (Fingerprint / Face ID) and PIN work?',
          a: 'On Android and supported browsers, LedgerMate integrates with Android BiometricManager and WebAuthn for instant fingerprint/face unlock. A 4-digit PIN serves as a secure fallback.'
        },
        {
          q: 'How does Supabase Free Tier delta sync with Gzip compression work?',
          a: 'Cloud sync uses gzip compression and header-only etag polling. Instead of transferring megabytes on every change, tiny delta payloads (< 80KB) are transmitted, using 95% less bandwidth and database quota.'
        }
      ]
    },
    {
      id: 'study_hub',
      name: 'Study Hub, 3D Flashcards & Gemini AI',
      icon: '🎓',
      color: '#3b82f6',
      badge: 'Prep OS',
      questions: [
        {
          q: 'What is the 3D Spaced Repetition (SM-2 / Anki) Flashcard algorithm?',
          a: 'The SM-2 algorithm schedules revision intervals based on your recall quality (1-5). Cards flip with smooth 3D perspective animations (`rotateY(180deg)`), optimizing memory retention while minimizing review time.'
        },
        {
          q: 'How do I use the Google Gemini 1.5 Flash AI Interview Coach for DSA?',
          a: 'In Study Hub, tap the AI Assistant button. Gemini 1.5 Flash analyzes your JavaScript/Java DSA code, detects algorithmic edge cases, computes Big-O Time/Space complexity, and provides hint-driven coaching.'
        },
        {
          q: 'How do Synchronized Live Study Rooms and group Pomodoros work?',
          a: 'Powered by Supabase Realtime presence channels, you can join live focus study rooms with peers, see active study streaks, and synchronize shared 25-minute Pomodoro focus cycles in real time.'
        }
      ]
    },
    {
      id: 'android_updates',
      name: 'Android App, Auto Updates & Backups',
      icon: '📱',
      color: '#10b981',
      badge: 'Native & CI/CD',
      questions: [
        {
          q: 'How do Android Home Screen App Shortcuts work?',
          a: 'Long-press the LedgerMate icon on your Android home screen to access quick shortcuts: **Quick Add Expense 💸**, **Scan Receipt 📸**, **Split Bill 👥**, **Credit Cards 💳**, and **Study Hub 🎓**.'
        },
        {
          q: 'How does the automatic in-app APK updater work?',
          a: 'Whenever you push code to GitHub `main`, GitHub Actions compiles the APK with a deterministic build number. When you open LedgerMate, it detects the update, bypasses CDN cache with versioned download URLs, and launches the package installer.'
        },
        {
          q: 'How do automated local backups work on Android?',
          a: 'Using Android Storage Access Framework (SAF), you can select any local folder (e.g. Google Drive, SD Card). LedgerMate auto-saves timestamped backups with 30-day retention and a 100-file cap.'
        }
      ]
    }
  ];

  // ── Database Interaction for Reviews / Feedback ─────────────────────────────
  function getSupabaseClient() {
    return (typeof window._supabase !== 'undefined' && window._supabase) ? window._supabase : null;
  }

  function getUserInfo() {
    let uid = 'guest_' + Math.random().toString(36).substring(2, 9);
    let name = 'Guest User';
    let email = '';

    if (window.LM_Auth && typeof window.LM_Auth.getCurrentUser === 'function') {
      const u = window.LM_Auth.getCurrentUser();
      if (u) {
        uid = u.userId || u.id || uid;
        name = u.displayName || u.username || name;
        email = u.email || '';
      }
    }
    return { uid, name, email };
  }

  async function fetchFeedbackListFromDB() {
    _loadingFeedback = true;
    const sb = getSupabaseClient();
    if (sb) {
      try {
        const { data, error } = await sb
          .from('user_feedback')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data)) {
          _cachedFeedbackList = data;
          localStorage.setItem('lm_cached_feedback_feed', JSON.stringify(data));
          _loadingFeedback = false;
          return data;
        }
      } catch (e) {
        console.warn('[HelpFeedback] Supabase feedback fetch error (using local cache):', e);
      }
    }

    // LocalStorage Fallback
    try {
      const local = JSON.parse(localStorage.getItem('lm_local_feedback_v1') || '[]');
      const cached = JSON.parse(localStorage.getItem('lm_cached_feedback_feed') || '[]');
      const merged = [...local, ...cached];
      // Deduplicate by ID
      const seen = new Set();
      _cachedFeedbackList = merged.filter(item => {
        if (!item || !item.id || seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      });
    } catch (e) {
      _cachedFeedbackList = [];
    }
    _loadingFeedback = false;
    return _cachedFeedbackList;
  }

  async function fetchCommentsForFeedback(feedbackId) {
    if (!feedbackId) return [];
    const sb = getSupabaseClient();
    if (sb) {
      try {
        const { data, error } = await sb
          .from('feedback_comments')
          .select('*')
          .eq('feedback_id', feedbackId)
          .order('created_at', { ascending: true });

        if (!error && Array.isArray(data)) {
          _cachedCommentsMap[feedbackId] = data;
          return data;
        }
      } catch (e) {
        console.warn('[HelpFeedback] Fetch comments error:', e);
      }
    }

    // LocalStorage fallback for comments
    try {
      const allLocal = JSON.parse(localStorage.getItem('lm_local_feedback_comments_v1') || '[]');
      const filtered = allLocal.filter(c => c.feedback_id === feedbackId);
      _cachedCommentsMap[feedbackId] = filtered;
      return filtered;
    } catch (e) {
      return [];
    }
  }

  async function submitFeedbackToDB(feedbackObj) {
    const sb = getSupabaseClient();
    let savedObj = {
      id: 'fb_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      ...feedbackObj,
      upvotes: 0,
      upvoted_by: [],
      status: 'open',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (sb) {
      try {
        const { data, error } = await sb
          .from('user_feedback')
          .insert([feedbackObj])
          .select()
          .single();

        if (!error && data) {
          savedObj = data;
        }
      } catch (e) {
        console.warn('[HelpFeedback] Supabase submit error (saving locally):', e);
      }
    }

    // Also persist to local list for offline instant access
    try {
      const local = JSON.parse(localStorage.getItem('lm_local_feedback_v1') || '[]');
      local.unshift(savedObj);
      localStorage.setItem('lm_local_feedback_v1', JSON.stringify(local));
    } catch (e) {}

    _cachedFeedbackList.unshift(savedObj);
    return savedObj;
  }

  async function submitCommentToDB(feedbackId, commentText) {
    const user = getUserInfo();
    const isAdm = window.LM_Auth && typeof window.LM_Auth.isAdmin === 'function' ? window.LM_Auth.isAdmin() : false;

    const newComment = {
      feedback_id: feedbackId,
      user_id: user.uid,
      user_name: user.name,
      user_email: user.email,
      comment_text: commentText.trim(),
      is_official_reply: isAdm,
      created_at: new Date().toISOString()
    };

    const sb = getSupabaseClient();
    let savedComment = {
      id: 'cm_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      ...newComment
    };

    if (sb) {
      try {
        const { data, error } = await sb
          .from('feedback_comments')
          .insert([newComment])
          .select()
          .single();

        if (!error && data) savedComment = data;
      } catch (e) {
        console.warn('[HelpFeedback] Comment submit error:', e);
      }
    }

    // Save locally
    try {
      const allLocal = JSON.parse(localStorage.getItem('lm_local_feedback_comments_v1') || '[]');
      allLocal.push(savedComment);
      localStorage.setItem('lm_local_feedback_comments_v1', JSON.stringify(allLocal));
    } catch (e) {}

    if (!_cachedCommentsMap[feedbackId]) _cachedCommentsMap[feedbackId] = [];
    _cachedCommentsMap[feedbackId].push(savedComment);
    return savedComment;
  }

  async function toggleUpvoteFeedback(feedbackId) {
    const user = getUserInfo();
    const item = _cachedFeedbackList.find(x => x.id === feedbackId);
    if (!item) return;

    item.upvoted_by = Array.isArray(item.upvoted_by) ? item.upvoted_by : [];
    const hasUpvoted = item.upvoted_by.includes(user.uid);

    if (hasUpvoted) {
      item.upvoted_by = item.upvoted_by.filter(id => id !== user.uid);
      item.upvotes = Math.max(0, (item.upvotes || 1) - 1);
    } else {
      item.upvoted_by.push(user.uid);
      item.upvotes = (item.upvotes || 0) + 1;
    }

    const sb = getSupabaseClient();
    if (sb) {
      try {
        await sb
          .from('user_feedback')
          .update({ upvotes: item.upvotes, upvoted_by: item.upvoted_by, updated_at: new Date().toISOString() })
          .eq('id', feedbackId);
      } catch (e) {}
    }

    // Update local cache
    try {
      localStorage.setItem('lm_cached_feedback_feed', JSON.stringify(_cachedFeedbackList));
      const local = JSON.parse(localStorage.getItem('lm_local_feedback_v1') || '[]');
      const lIdx = local.findIndex(x => x.id === feedbackId);
      if (lIdx >= 0) {
        local[lIdx].upvotes = item.upvotes;
        local[lIdx].upvoted_by = item.upvoted_by;
        localStorage.setItem('lm_local_feedback_v1', JSON.stringify(local));
      }
    } catch (e) {}
  }

  // ── Modal Styles ─────────────────────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('lm-help-feedback-modal-styles')) return;
    const style = document.createElement('style');
    style.id = 'lm-help-feedback-modal-styles';
    style.textContent = `
      .lm-help-overlay {
        position: fixed !important;
        inset: 0 !important;
        z-index: 2147483645 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        padding: 16px !important;
        background: rgba(4, 8, 18, 0.85) !important;
        backdrop-filter: blur(14px) !important;
        -webkit-backdrop-filter: blur(14px) !important;
        box-sizing: border-box !important;
        animation: lmHelpFadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards !important;
      }
      [data-theme="light"] .lm-help-overlay {
        background: rgba(15, 23, 42, 0.65) !important;
      }
      .lm-help-card {
        position: relative !important;
        width: 100% !important;
        max-width: 820px !important;
        max-height: 88vh !important;
        background: #0f1523 !important;
        background: linear-gradient(175deg, #141c2e 0%, #0c121e 100%) !important;
        border: 1px solid rgba(255, 255, 255, 0.12) !important;
        border-radius: 24px !important;
        box-shadow: 0 25px 70px -10px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.06), 0 0 50px rgba(0, 212, 180, 0.1) !important;
        color: #f1f5f9 !important;
        font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif !important;
        display: flex !important;
        flex-direction: column !important;
        overflow: hidden !important;
        animation: lmHelpSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards !important;
      }
      [data-theme="light"] .lm-help-card {
        background: #ffffff !important;
        background: linear-gradient(175deg, #ffffff 0%, #f8fafc 100%) !important;
        border: 1px solid rgba(0, 0, 0, 0.12) !important;
        color: #0f172a !important;
        box-shadow: 0 25px 70px -10px rgba(15, 23, 42, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.06), 0 0 40px rgba(0, 212, 180, 0.12) !important;
      }
      .lm-help-topbar {
        padding: 20px 24px 16px !important;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        background: rgba(255, 255, 255, 0.02) !important;
      }
      [data-theme="light"] .lm-help-topbar {
        border-bottom-color: rgba(0, 0, 0, 0.08) !important;
        background: rgba(0, 0, 0, 0.02) !important;
      }
      .lm-help-brand {
        display: flex !important;
        align-items: center !important;
        gap: 12px !important;
      }
      .lm-help-brand-icon {
        width: 40px !important;
        height: 40px !important;
        border-radius: 12px !important;
        background: linear-gradient(135deg, #00d4b4 0%, #3b82f6 100%) !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        font-size: 20px !important;
        box-shadow: 0 6px 16px rgba(0, 212, 180, 0.3) !important;
      }
      .lm-help-title {
        margin: 0 !important;
        font-size: 18px !important;
        font-weight: 800 !important;
        letter-spacing: -0.3px !important;
        color: #ffffff !important;
      }
      [data-theme="light"] .lm-help-title {
        color: #0f172a !important;
      }
      .lm-help-subtitle {
        margin: 0 !important;
        font-size: 12px !important;
        color: #94a3b8 !important;
      }
      [data-theme="light"] .lm-help-subtitle {
        color: #64748b !important;
      }
      .lm-help-close {
        width: 34px !important;
        height: 34px !important;
        border-radius: 50% !important;
        border: 1px solid rgba(255, 255, 255, 0.12) !important;
        background: rgba(255, 255, 255, 0.06) !important;
        color: #94a3b8 !important;
        font-size: 15px !important;
        font-weight: 700 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        cursor: pointer !important;
        transition: all 0.2s ease !important;
      }
      .lm-help-close:hover {
        background: rgba(255, 255, 255, 0.18) !important;
        color: #ffffff !important;
        transform: scale(1.06) !important;
      }
      .lm-help-tabs {
        display: flex !important;
        padding: 12px 24px 0 !important;
        gap: 8px !important;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
        background: rgba(255, 255, 255, 0.01) !important;
      }
      [data-theme="light"] .lm-help-tabs {
        border-bottom-color: rgba(0, 0, 0, 0.08) !important;
      }
      .lm-help-tab-btn {
        padding: 10px 18px !important;
        border-radius: 12px 12px 0 0 !important;
        background: none !important;
        border: none !important;
        border-bottom: 2px solid transparent !important;
        color: #94a3b8 !important;
        font-size: 13.5px !important;
        font-weight: 700 !important;
        cursor: pointer !important;
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
        transition: all 0.2s ease !important;
      }
      .lm-help-tab-btn:hover {
        color: #f1f5f9 !important;
        background: rgba(255, 255, 255, 0.04) !important;
      }
      .lm-help-tab-btn.active {
        color: #00d4b4 !important;
        border-bottom-color: #00d4b4 !important;
        background: rgba(0, 212, 180, 0.08) !important;
      }
      [data-theme="light"] .lm-help-tab-btn.active {
        color: #0d9488 !important;
        border-bottom-color: #0d9488 !important;
        background: rgba(13, 148, 136, 0.08) !important;
      }
      .lm-help-content {
        flex: 1 !important;
        overflow-y: auto !important;
        padding: 20px 24px !important;
        box-sizing: border-box !important;
      }
      .lm-help-search-row {
        margin-bottom: 16px !important;
        position: relative !important;
      }
      .lm-help-search-input {
        width: 100% !important;
        padding: 12px 16px 12px 42px !important;
        border-radius: 14px !important;
        background: rgba(255, 255, 255, 0.05) !important;
        border: 1px solid rgba(255, 255, 255, 0.12) !important;
        color: #f1f5f9 !important;
        font-size: 13px !important;
        box-sizing: border-box !important;
        outline: none !important;
        transition: all 0.2s !important;
      }
      .lm-help-search-input:focus {
        border-color: #00d4b4 !important;
        box-shadow: 0 0 0 3px rgba(0, 212, 180, 0.2) !important;
      }
      [data-theme="light"] .lm-help-search-input {
        background: #f1f5f9 !important;
        border-color: #cbd5e1 !important;
        color: #0f172a !important;
      }
      .lm-help-search-icon {
        position: absolute !important;
        left: 14px !important;
        top: 50% !important;
        transform: translateY(-50%) !important;
        font-size: 16px !important;
        color: #94a3b8 !important;
        pointer-events: none !important;
        line-height: 1 !important;
        z-index: 2 !important;
      }
      .lm-help-pills-row {
        display: flex !important;
        flex-direction: row !important;
        flex-wrap: nowrap !important;
        align-items: center !important;
        justify-content: flex-start !important;
        gap: 8px !important;
        overflow-x: auto !important;
        overflow-y: hidden !important;
        -webkit-overflow-scrolling: touch !important;
        padding: 4px 2px 14px 2px !important;
        margin: 0 0 16px 0 !important;
        scrollbar-width: thin !important;
        width: 100% !important;
        max-width: 100% !important;
        box-sizing: border-box !important;
      }
      .lm-help-pills-row::-webkit-scrollbar {
        height: 6px !important;
      }
      .lm-help-pills-row::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.18) !important;
        border-radius: 99px !important;
      }
      [data-theme="light"] .lm-help-pills-row::-webkit-scrollbar-thumb {
        background: rgba(0, 0, 0, 0.18) !important;
      }
      .lm-help-pill {
        flex: 0 0 auto !important;
        flex-shrink: 0 !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 6px !important;
        padding: 7px 14px !important;
        border-radius: 99px !important;
        font-size: 12.5px !important;
        font-weight: 600 !important;
        line-height: 1.2 !important;
        background: rgba(255, 255, 255, 0.05) !important;
        border: 1px solid rgba(255, 255, 255, 0.12) !important;
        color: #94a3b8 !important;
        cursor: pointer !important;
        white-space: nowrap !important;
        word-break: keep-all !important;
        transition: all 0.2s ease !important;
        box-sizing: border-box !important;
        height: auto !important;
        min-height: unset !important;
        min-width: max-content !important;
        max-width: none !important;
        margin: 0 !important;
        text-decoration: none !important;
        user-select: none !important;
        outline: none !important;
      }
      [data-theme="light"] .lm-help-pill {
        background: #f1f5f9 !important;
        border-color: #cbd5e1 !important;
        color: #475569 !important;
      }
      .lm-help-pill:hover {
        background: rgba(255, 255, 255, 0.1) !important;
        color: #ffffff !important;
        border-color: rgba(255, 255, 255, 0.25) !important;
      }
      [data-theme="light"] .lm-help-pill:hover {
        background: #e2e8f0 !important;
        color: #0f172a !important;
        border-color: #94a3b8 !important;
      }
      .lm-help-pill.active {
        background: rgba(0, 212, 180, 0.16) !important;
        color: #00d4b4 !important;
        border-color: rgba(0, 212, 180, 0.5) !important;
        box-shadow: 0 0 12px rgba(0, 212, 180, 0.25) !important;
        font-weight: 700 !important;
      }
      [data-theme="light"] .lm-help-pill.active {
        background: rgba(13, 148, 136, 0.14) !important;
        color: #0d9488 !important;
        border-color: rgba(13, 148, 136, 0.4) !important;
        box-shadow: 0 0 12px rgba(13, 148, 136, 0.2) !important;
      }
      .lm-faq-group {
        margin-bottom: 24px !important;
        width: 100% !important;
        box-sizing: border-box !important;
        clear: both !important;
      }
      .lm-faq-group-header {
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
        margin: 16px 0 12px 0 !important;
        width: 100% !important;
        box-sizing: border-box !important;
      }
      .lm-faq-group-title {
        margin: 0 !important;
        font-size: 15px !important;
        font-weight: 700 !important;
        color: #e2e8f0 !important;
        line-height: 1.3 !important;
      }
      [data-theme="light"] .lm-faq-group-title {
        color: #1e293b !important;
      }
      .lm-faq-badge {
        font-size: 11px !important;
        padding: 3px 9px !important;
        border-radius: 99px !important;
        background: rgba(255, 255, 255, 0.08) !important;
        color: #94a3b8 !important;
        font-weight: 600 !important;
        line-height: 1 !important;
        display: inline-block !important;
      }
      [data-theme="light"] .lm-faq-badge {
        background: #e2e8f0 !important;
        color: #475569 !important;
      }
      .lm-faq-item {
        background: rgba(255, 255, 255, 0.03) !important;
        border: 1px solid rgba(255, 255, 255, 0.08) !important;
        border-radius: 14px !important;
        margin-bottom: 10px !important;
        overflow: hidden !important;
        transition: all 0.2s !important;
        width: 100% !important;
        box-sizing: border-box !important;
        clear: both !important;
      }
      [data-theme="light"] .lm-faq-item {
        background: #f8fafc !important;
        border-color: #e2e8f0 !important;
      }
      .lm-faq-question-row {
        padding: 14px 18px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        cursor: pointer !important;
        font-size: 13.5px !important;
        font-weight: 600 !important;
        color: #f1f5f9 !important;
        gap: 12px !important;
        width: 100% !important;
        box-sizing: border-box !important;
        user-select: none !important;
        line-height: 1.4 !important;
      }
      [data-theme="light"] .lm-faq-question-row {
        color: #0f172a !important;
      }
      .lm-faq-question-row:hover {
        background: rgba(255, 255, 255, 0.04) !important;
      }
      [data-theme="light"] .lm-faq-question-row:hover {
        background: #f1f5f9 !important;
      }
      .lm-faq-arrow {
        font-size: 12px !important;
        color: #94a3b8 !important;
        transition: transform 0.25s ease !important;
        flex-shrink: 0 !important;
        line-height: 1 !important;
      }
      .lm-faq-item.open .lm-faq-arrow {
        transform: rotate(180deg) !important;
        color: #00d4b4 !important;
      }
      .lm-faq-answer {
        display: none !important;
        padding: 0 18px 16px !important;
        font-size: 13px !important;
        line-height: 1.65 !important;
        color: #cbd5e1 !important;
        border-top: 1px solid rgba(255, 255, 255, 0.05) !important;
        box-sizing: border-box !important;
      }
      [data-theme="light"] .lm-faq-answer {
        color: #475569 !important;
        border-top-color: #e2e8f0 !important;
      }
      .lm-faq-item.open .lm-faq-answer {
        display: block !important;
        animation: lmHelpFadeIn 0.2s ease !important;
      }
      /* Feedback Form & Thread Styles */
      .lm-fb-new-card {
        background: rgba(255, 255, 255, 0.03) !important;
        border: 1px solid rgba(255, 255, 255, 0.1) !important;
        border-radius: 16px !important;
        padding: 18px !important;
        margin-bottom: 24px !important;
      }
      [data-theme="light"] .lm-fb-new-card {
        background: #f8fafc !important;
        border-color: #cbd5e1 !important;
      }
      .lm-fb-cat-select {
        display: flex !important;
        gap: 8px !important;
        flex-wrap: wrap !important;
        margin-bottom: 14px !important;
      }
      .lm-fb-type-btn {
        padding: 6px 12px !important;
        border-radius: 10px !important;
        font-size: 12px !important;
        font-weight: 700 !important;
        border: 1px solid rgba(255, 255, 255, 0.12) !important;
        background: rgba(255, 255, 255, 0.04) !important;
        color: #94a3b8 !important;
        cursor: pointer !important;
      }
      .lm-fb-type-btn.active {
        background: #00d4b4 !important;
        color: #042f2c !important;
        border-color: #00d4b4 !important;
      }
      .lm-fb-stars-row {
        display: flex !important;
        align-items: center !important;
        gap: 6px !important;
        margin-bottom: 12px !important;
        font-size: 20px !important;
        cursor: pointer !important;
      }
      .lm-fb-input {
        width: 100% !important;
        padding: 10px 14px !important;
        border-radius: 12px !important;
        background: rgba(255, 255, 255, 0.05) !important;
        border: 1px solid rgba(255, 255, 255, 0.12) !important;
        color: #f1f5f9 !important;
        font-size: 13px !important;
        margin-bottom: 12px !important;
        box-sizing: border-box !important;
        outline: none !important;
      }
      [data-theme="light"] .lm-fb-input {
        background: #ffffff !important;
        border-color: #cbd5e1 !important;
        color: #0f172a !important;
      }
      .lm-fb-textarea {
        width: 100% !important;
        min-height: 80px !important;
        resize: vertical !important;
        padding: 10px 14px !important;
        border-radius: 12px !important;
        background: rgba(255, 255, 255, 0.05) !important;
        border: 1px solid rgba(255, 255, 255, 0.12) !important;
        color: #f1f5f9 !important;
        font-size: 13px !important;
        margin-bottom: 14px !important;
        box-sizing: border-box !important;
        outline: none !important;
      }
      [data-theme="light"] .lm-fb-textarea {
        background: #ffffff !important;
        border-color: #cbd5e1 !important;
        color: #0f172a !important;
      }
      .lm-fb-submit-btn {
        padding: 10px 20px !important;
        border-radius: 12px !important;
        background: linear-gradient(135deg, #00d4b4 0%, #10b981 100%) !important;
        border: none !important;
        color: #042f2c !important;
        font-size: 13px !important;
        font-weight: 700 !important;
        cursor: pointer !important;
        display: inline-flex !important;
        align-items: center !important;
        gap: 6px !important;
        box-shadow: 0 4px 14px rgba(0, 212, 180, 0.3) !important;
      }
      /* Item Cards */
      .lm-fb-item-card {
        background: rgba(255, 255, 255, 0.03) !important;
        border: 1px solid rgba(255, 255, 255, 0.08) !important;
        border-radius: 16px !important;
        padding: 18px !important;
        margin-bottom: 16px !important;
      }
      [data-theme="light"] .lm-fb-item-card {
        background: #ffffff !important;
        border-color: #e2e8f0 !important;
      }
      .lm-fb-item-header {
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        margin-bottom: 8px !important;
      }
      .lm-fb-user-badge {
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
      }
      .lm-fb-user-avatar {
        width: 28px !important;
        height: 28px !important;
        border-radius: 50% !important;
        background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%) !important;
        color: #ffffff !important;
        font-size: 12px !important;
        font-weight: 700 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
      }
      .lm-fb-comments-box {
        margin-top: 14px !important;
        padding-top: 12px !important;
        border-top: 1px solid rgba(255, 255, 255, 0.06) !important;
      }
      [data-theme="light"] .lm-fb-comments-box {
        border-top-color: #e2e8f0 !important;
      }
      .lm-fb-comment-bubble {
        background: rgba(255, 255, 255, 0.04) !important;
        border: 1px solid rgba(255, 255, 255, 0.06) !important;
        border-radius: 12px !important;
        padding: 10px 14px !important;
        margin-bottom: 8px !important;
        font-size: 12.5px !important;
      }
      [data-theme="light"] .lm-fb-comment-bubble {
        background: #f1f5f9 !important;
        border-color: #e2e8f0 !important;
      }
      .lm-fb-comment-bubble.admin-reply {
        background: rgba(0, 212, 180, 0.08) !important;
        border-color: rgba(0, 212, 180, 0.25) !important;
      }
      @keyframes lmHelpFadeIn {
        0% { opacity: 0; }
        100% { opacity: 1; }
      }
      @keyframes lmHelpSlideUp {
        0% { opacity: 0; transform: translateY(16px) scale(0.97); }
        100% { opacity: 1; transform: translateY(0) scale(1); }
      }
    `;
    document.head.appendChild(style);
  }

  // ── Render Modal UI ──────────────────────────────────────────────────────────
  function renderModalUI() {
    if (_activeModal) {
      try { _activeModal.remove(); } catch (e) {}
      _activeModal = null;
    }

    injectStyles();

    const overlay = document.createElement('div');
    overlay.className = 'lm-help-overlay';
    overlay.id = 'lmHelpFeedbackModal';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');

    overlay.innerHTML = `
      <div class="lm-help-card" id="lmHelpCard">
        <div class="lm-help-topbar">
          <div class="lm-help-brand">
            <div class="lm-help-brand-icon">💎</div>
            <div>
              <h3 class="lm-help-title">Help &amp; Feedback Center</h3>
              <p class="lm-help-subtitle">LedgerMate Finance OS · Knowledge Base &amp; Discussions</p>
            </div>
          </div>
          <button class="lm-help-close" id="lmHelpCloseBtn" title="Close">✕</button>
        </div>

        <div class="lm-help-tabs">
          <button class="lm-help-tab-btn ${_activeTab === 'faq' ? 'active' : ''}" id="lmTabFaqBtn">
            <span>📚</span> Knowledge Base &amp; FAQs
          </button>
          <button class="lm-help-tab-btn ${_activeTab === 'feedback' ? 'active' : ''}" id="lmTabFeedbackBtn">
            <span>💬</span> Reviews, Suggestions &amp; Complaints
          </button>
        </div>

        <div class="lm-help-content" id="lmHelpContent">
          <!-- Dynamic Content Rendered Here -->
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    _activeModal = overlay;

    // Prevent modal card clicks from closing overlay
    overlay.querySelector('#lmHelpCard').addEventListener('click', e => e.stopPropagation());
    overlay.querySelector('#lmHelpCloseBtn').addEventListener('click', closeModal);
    overlay.addEventListener('click', closeModal);

    overlay.querySelector('#lmTabFaqBtn').addEventListener('click', () => {
      _activeTab = 'faq';
      renderModalUI();
    });
    overlay.querySelector('#lmTabFeedbackBtn').addEventListener('click', () => {
      _activeTab = 'feedback';
      renderModalUI();
    });

    if (_activeTab === 'faq') {
      renderFAQTab();
    } else {
      renderFeedbackTab();
    }
  }

  function closeModal() {
    if (_activeModal) {
      try { _activeModal.remove(); } catch (e) {}
      _activeModal = null;
    }
  }

  // ── Render FAQ Tab ───────────────────────────────────────────────────────────
  function renderFAQTab() {
    const container = document.getElementById('lmHelpContent');
    if (!container) return;

    let searchInput = container.querySelector('#lmFaqSearchInput');
    let pillsRow = container.querySelector('.lm-help-pills-row');
    let accordionList = container.querySelector('#lmFaqAccordionList');

    if (!searchInput || !pillsRow || !accordionList) {
      container.innerHTML = `
        <div class="lm-help-search-row">
          <span class="lm-help-search-icon">🔍</span>
          <input type="text" class="lm-help-search-input" id="lmFaqSearchInput" placeholder="Search across all modules, shortcuts, features & guides..." value="${_searchQuery}">
        </div>

        <div class="lm-help-pills-row" id="lmHelpPillsRow">
          <button class="lm-help-pill ${_selectedCategory === 'all' ? 'active' : ''}" data-cat="all">🌟 All Modules</button>
          ${FAQ_MODULES.map(m => `
            <button class="lm-help-pill ${_selectedCategory === m.id ? 'active' : ''}" data-cat="${m.id}">
              ${m.icon} ${m.name}
            </button>
          `).join('')}
        </div>

        <div id="lmFaqAccordionList" style="width:100%;box-sizing:border-box;"></div>
      `;

      searchInput = container.querySelector('#lmFaqSearchInput');
      pillsRow = container.querySelector('.lm-help-pills-row');
      accordionList = container.querySelector('#lmFaqAccordionList');

      searchInput.addEventListener('input', (e) => {
        _searchQuery = e.target.value;
        updateFAQListOnly();
      });

      pillsRow.querySelectorAll('.lm-help-pill').forEach(btn => {
        btn.addEventListener('click', () => {
          _selectedCategory = btn.getAttribute('data-cat');
          pillsRow.querySelectorAll('.lm-help-pill').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          updateFAQListOnly();
        });
      });
    }

    updateFAQListOnly();
  }

  function updateFAQListOnly() {
    const accordionList = document.getElementById('lmFaqAccordionList');
    if (!accordionList) return;

    let filteredModules = FAQ_MODULES;
    if (_selectedCategory !== 'all') {
      filteredModules = FAQ_MODULES.filter(m => m.id === _selectedCategory);
    }

    const qLower = _searchQuery.toLowerCase().trim();
    let totalRendered = 0;

    const html = filteredModules.map(mod => {
      const matchedQuestions = mod.questions.filter(item => {
        if (!qLower) return true;
        return item.q.toLowerCase().includes(qLower) || item.a.toLowerCase().includes(qLower);
      });

      if (matchedQuestions.length === 0) return '';
      totalRendered += matchedQuestions.length;

      return `
        <div class="lm-faq-group">
          <div class="lm-faq-group-header">
            <span style="font-size:18px;line-height:1;">${mod.icon}</span>
            <h4 class="lm-faq-group-title">${mod.name}</h4>
            <span class="lm-faq-badge">${mod.badge}</span>
          </div>

          ${matchedQuestions.map((qItem, idx) => `
            <div class="lm-faq-item" id="faq_${mod.id}_${idx}">
              <div class="lm-faq-question-row" onclick="this.parentElement.classList.toggle('open')">
                <span>${qItem.q}</span>
                <span class="lm-faq-arrow">▼</span>
              </div>
              <div class="lm-faq-answer">
                ${formatMarkdown(qItem.a)}
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }).join('');

    if (totalRendered === 0) {
      accordionList.innerHTML = `
        <div style="text-align:center;padding:40px 20px;color:#94a3b8;">
          <div style="font-size:36px;margin-bottom:10px;">🔍</div>
          <div style="font-size:15px;font-weight:700;color:#f1f5f9;margin-bottom:6px;">No guides found</div>
          <div style="font-size:13px;">No questions match "${_searchQuery}". Try selecting "All Modules" or clearing search.</div>
        </div>
      `;
    } else {
      accordionList.innerHTML = html;
    }
  }

  function formatMarkdown(txt) {
    if (!txt) return '';
    return txt
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\`(.*?)\`/g, '<code style="background:rgba(255,255,255,0.1);padding:1px 5px;border-radius:4px;">$1</code>');
  }

  // ── Render Feedback Tab ──────────────────────────────────────────────────────
  let _selectedFeedbackRating = 5;
  let _selectedFeedbackType = 'review';

  async function renderFeedbackTab() {
    const container = document.getElementById('lmHelpContent');
    if (!container) return;

    container.innerHTML = `
      <div class="lm-fb-new-card">
        <h4 style="margin:0 0 12px;font-size:15px;font-weight:700;color:#ffffff;">✍️ Post a Review, Suggestion or Complaint</h4>
        
        <div class="lm-fb-cat-select">
          <button class="lm-fb-type-btn ${_selectedFeedbackType === 'review' ? 'active' : ''}" data-type="review">⭐ Review</button>
          <button class="lm-fb-type-btn ${_selectedFeedbackType === 'suggestion' ? 'active' : ''}" data-type="suggestion">💡 Suggestion</button>
          <button class="lm-fb-type-btn ${_selectedFeedbackType === 'complaint' ? 'active' : ''}" data-type="complaint">⚠️ Complaint</button>
          <button class="lm-fb-type-btn ${_selectedFeedbackType === 'bug_report' ? 'active' : ''}" data-type="bug_report">🐛 Bug Report</button>
          <button class="lm-fb-type-btn ${_selectedFeedbackType === 'feature_request' ? 'active' : ''}" data-type="feature_request">✨ Feature Request</button>
        </div>

        <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;flex-wrap:wrap;">
          <div>
            <span style="font-size:12px;color:#94a3b8;font-weight:600;margin-bottom:4px;display:block;">Rating:</span>
            <div class="lm-fb-stars-row" id="lmFbStarsRow">
              ${[1, 2, 3, 4, 5].map(n => `
                <span data-star="${n}" style="color:${n <= _selectedFeedbackRating ? '#f59e0b' : '#64748b'};">★</span>
              `).join('')}
            </div>
          </div>

          <div style="flex:1;min-width:180px;">
            <span style="font-size:12px;color:#94a3b8;font-weight:600;margin-bottom:4px;display:block;">Related Module:</span>
            <select class="lm-fb-input" id="lmFbModuleSelect" style="margin-bottom:0;">
              <option value="general">🌟 General Experience</option>
              <option value="transactions">💸 Transactions & Ledger</option>
              <option value="loans">🏦 Loans & EMIs</option>
              <option value="wealth">📊 Wealth & Assets</option>
              <option value="stocks">📈 Indian Stocks & Portfolio</option>
              <option value="gold">🪙 Gold & Bullion</option>
              <option value="credit_cards">💳 Credit Cards</option>
              <option value="bill_splitter">👥 Bill Splitter</option>
              <option value="receipt_ocr">📸 AI Receipt OCR</option>
              <option value="fire_simulator">🎲 FIRE Simulator</option>
              <option value="study_hub">🎓 Study Hub & Flashcards</option>
              <option value="security_sync">🔒 Security & Cloud Sync</option>
            </select>
          </div>
        </div>

        <input type="text" class="lm-fb-input" id="lmFbTitleInput" placeholder="Title / Subject (e.g. Amazing FIRE simulator or Request for new Gold city...)" required>
        <textarea class="lm-fb-textarea" id="lmFbDescInput" placeholder="Describe your review, suggestion, or complaint in detail..." required></textarea>

        <div style="display:flex;justify-content:flex-end;">
          <button class="lm-fb-submit-btn" id="lmFbSubmitBtn">
            <span>🚀</span> Submit Feedback
          </button>
        </div>
      </div>

      <!-- Feed Filter Row -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px;">
        <h4 style="margin:0;font-size:15px;font-weight:700;color:#ffffff;">💬 Community Feedback &amp; Discussion</h4>
        <div style="display:flex;gap:6px;">
          <button class="lm-help-pill ${_feedbackFilter === 'all' ? 'active' : ''}" data-fbfilter="all">All</button>
          <button class="lm-help-pill ${_feedbackFilter === 'review' ? 'active' : ''}" data-fbfilter="review">Reviews</button>
          <button class="lm-help-pill ${_feedbackFilter === 'suggestion' ? 'active' : ''}" data-fbfilter="suggestion">Suggestions</button>
          <button class="lm-help-pill ${_feedbackFilter === 'complaint' ? 'active' : ''}" data-fbfilter="complaint">Complaints</button>
        </div>
      </div>

      <div id="lmFbFeedList">
        <div style="text-align:center;padding:24px;color:#94a3b8;">Loading community tickets...</div>
      </div>
    `;

    // Wire up Form Events
    container.querySelectorAll('.lm-fb-cat-select button').forEach(btn => {
      btn.addEventListener('click', () => {
        _selectedFeedbackType = btn.getAttribute('data-type');
        container.querySelectorAll('.lm-fb-cat-select button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    container.querySelectorAll('#lmFbStarsRow span').forEach(star => {
      star.addEventListener('click', () => {
        _selectedFeedbackRating = parseInt(star.getAttribute('data-star'), 10);
        container.querySelectorAll('#lmFbStarsRow span').forEach((s, idx) => {
          s.style.color = (idx + 1 <= _selectedFeedbackRating) ? '#f59e0b' : '#64748b';
        });
      });
    });

    container.querySelectorAll('[data-fbfilter]').forEach(btn => {
      btn.addEventListener('click', () => {
        _feedbackFilter = btn.getAttribute('data-fbfilter');
        container.querySelectorAll('[data-fbfilter]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderFeedbackFeed();
      });
    });

    const submitBtn = container.querySelector('#lmFbSubmitBtn');
    submitBtn.addEventListener('click', async () => {
      const title = container.querySelector('#lmFbTitleInput').value.trim();
      const desc = container.querySelector('#lmFbDescInput').value.trim();
      const moduleVal = container.querySelector('#lmFbModuleSelect').value;

      if (!title || !desc) {
        if (typeof showToast === 'function') showToast('Please enter both title and description.', 'warning');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting...';

      const user = getUserInfo();
      const appVer = window.LM_DEPLOY_ID || 'v1.0.292';

      await submitFeedbackToDB({
        user_id: user.uid,
        user_name: user.name,
        user_email: user.email,
        category: _selectedFeedbackType,
        module: moduleVal,
        rating: _selectedFeedbackRating,
        title: title,
        description: desc,
        app_version: appVer,
        device_info: navigator.userAgent.substring(0, 100)
      });

      if (typeof showToast === 'function') showToast('🎉 Thank you! Feedback submitted successfully.', 'success');
      container.querySelector('#lmFbTitleInput').value = '';
      container.querySelector('#lmFbDescInput').value = '';
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span>🚀</span> Submit Feedback';
      renderFeedbackFeed();
    });

    // Fetch and display feed
    await fetchFeedbackListFromDB();
    renderFeedbackFeed();
  }

  async function renderFeedbackFeed() {
    const feedContainer = document.getElementById('lmFbFeedList');
    if (!feedContainer) return;

    let items = _cachedFeedbackList;
    if (_feedbackFilter !== 'all') {
      items = items.filter(x => x.category === _feedbackFilter);
    }

    if (items.length === 0) {
      feedContainer.innerHTML = `
        <div style="text-align:center;padding:32px 16px;background:rgba(255,255,255,0.02);border:1px dashed rgba(255,255,255,0.1);border-radius:16px;color:#94a3b8;">
          <div style="font-size:28px;margin-bottom:8px;">💡</div>
          <p style="margin:0;font-size:13px;font-weight:600;">No feedback tickets found for this filter.</p>
          <p style="margin:4px 0 0;font-size:12px;color:#64748b;">Be the first to share your thoughts, review, or suggestions above!</p>
        </div>
      `;
      return;
    }

    const typeIcons = {
      review: '⭐ Review',
      suggestion: '💡 Suggestion',
      complaint: '⚠️ Complaint',
      bug_report: '🐛 Bug Report',
      feature_request: '✨ Feature Request'
    };

    feedContainer.innerHTML = items.map(item => {
      const initial = (item.user_name || 'U').charAt(0).toUpperCase();
      const stars = '★'.repeat(item.rating || 5) + '☆'.repeat(Math.max(0, 5 - (item.rating || 5)));
      const dateStr = item.created_at ? new Date(item.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently';

      return `
        <div class="lm-fb-item-card" id="fb_card_${item.id}">
          <div class="lm-fb-item-header">
            <div class="lm-fb-user-badge">
              <div class="lm-fb-user-avatar">${initial}</div>
              <div>
                <div style="font-size:13px;font-weight:700;color:#f1f5f9;">${item.user_name || 'Anonymous'}</div>
                <div style="font-size:11px;color:#94a3b8;">${dateStr} · <span style="color:#00d4b4;">${typeIcons[item.category] || item.category}</span></div>
              </div>
            </div>

            <div style="display:flex;align-items:center;gap:8px;">
              <span style="color:#f59e0b;font-size:13px;letter-spacing:1px;">${stars}</span>
              <span style="font-size:10.5px;padding:2px 8px;border-radius:99px;font-weight:700;background:rgba(59,130,246,0.15);color:#3b82f6;border:1px solid rgba(59,130,246,0.3);text-transform:uppercase;">
                ${item.status || 'open'}
              </span>
            </div>
          </div>

          <h4 style="margin:8px 0 4px;font-size:14.5px;font-weight:700;color:#ffffff;">${item.title}</h4>
          <p style="margin:0 0 12px;font-size:13px;color:#cbd5e1;line-height:1.5;white-space:pre-wrap;">${item.description}</p>

          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;">
            <div style="display:flex;gap:8px;">
              <button class="lm-help-pill" onclick="window.LM_HelpModal.upvoteFeedback('${item.id}')" title="Upvote / Helpful">
                <span>👍</span> <span>${item.upvotes || 0}</span>
              </button>
              <button class="lm-help-pill" onclick="window.LM_HelpModal.toggleComments('${item.id}')">
                <span>💬</span> Reply &amp; Comments
              </button>
            </div>
            <span style="font-size:11px;color:#64748b;">Module: ${item.module || 'General'}</span>
          </div>

          <!-- Comments Thread Container -->
          <div class="lm-fb-comments-box" id="fb_comments_${item.id}" style="display:none;">
            <div id="fb_comments_list_${item.id}" style="margin-bottom:10px;">
              <div style="font-size:12px;color:#94a3b8;">Loading replies...</div>
            </div>

            <div style="display:flex;gap:8px;">
              <input type="text" class="lm-fb-input" id="fb_reply_input_${item.id}" placeholder="Write a reply or comment..." style="margin-bottom:0;padding:8px 12px;font-size:12px;">
              <button class="lm-fb-submit-btn" style="padding:8px 14px;font-size:12px;" onclick="window.LM_HelpModal.postComment('${item.id}')">
                Reply
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // ── Comments Handling ────────────────────────────────────────────────────────
  async function toggleComments(feedbackId) {
    const box = document.getElementById(`fb_comments_${feedbackId}`);
    if (!box) return;
    const isHidden = (box.style.display === 'none' || !box.style.display);
    box.style.display = isHidden ? 'block' : 'none';

    if (isHidden) {
      await loadCommentsUI(feedbackId);
    }
  }

  async function loadCommentsUI(feedbackId) {
    const listEl = document.getElementById(`fb_comments_list_${feedbackId}`);
    if (!listEl) return;

    const comments = await fetchCommentsForFeedback(feedbackId);
    if (comments.length === 0) {
      listEl.innerHTML = '<div style="font-size:12px;color:#64748b;font-style:italic;">No replies yet. Be the first to reply!</div>';
      return;
    }

    listEl.innerHTML = comments.map(c => {
      const initial = (c.user_name || 'U').charAt(0).toUpperCase();
      const isAdmin = c.is_official_reply === true;
      const cDate = c.created_at ? new Date(c.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' }) : '';

      return `
        <div class="lm-fb-comment-bubble ${isAdmin ? 'admin-reply' : ''}">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
            <div style="display:flex;align-items:center;gap:6px;">
              <strong style="color:#f1f5f9;font-size:12px;">${c.user_name || 'User'}</strong>
              ${isAdmin ? '<span style="font-size:10px;padding:1px 6px;border-radius:99px;background:rgba(0,212,180,0.2);color:#00d4b4;font-weight:700;">🛡️ Official Admin</span>' : ''}
            </div>
            <span style="font-size:10.5px;color:#64748b;">${cDate}</span>
          </div>
          <div style="color:#cbd5e1;line-height:1.4;">${c.comment_text}</div>
        </div>
      `;
    }).join('');
  }

  async function postComment(feedbackId) {
    const input = document.getElementById(`fb_reply_input_${feedbackId}`);
    if (!input || !input.value.trim()) return;

    const text = input.value.trim();
    input.value = '';

    await submitCommentToDB(feedbackId, text);
    if (typeof showToast === 'function') showToast('Reply posted!', 'info');
    await loadCommentsUI(feedbackId);
  }

  // ── Public API ───────────────────────────────────────────────────────────────
  const HelpModalAPI = {
    open: function (tab) {
      _activeTab = tab === 'feedback' ? 'feedback' : 'faq';
      renderModalUI();
    },
    openFAQ: function (category) {
      _activeTab = 'faq';
      if (category) _selectedCategory = category;
      renderModalUI();
    },
    openFeedback: function () {
      _activeTab = 'feedback';
      renderModalUI();
    },
    close: closeModal,
    toggleComments: toggleComments,
    postComment: postComment,
    upvoteFeedback: async function (feedbackId) {
      await toggleUpvoteFeedback(feedbackId);
      renderFeedbackFeed();
    }
  };

  window.LM_HelpModal = HelpModalAPI;
  window.HelpFeedbackModal = HelpModalAPI;

})();
