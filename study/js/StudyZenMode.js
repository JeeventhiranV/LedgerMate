/**
 * LedgerMate Study Hub – StudyZenMode.js
 * ─────────────────────────────────────────────────────────────
 * Distraction-Free "Zen Study Mode" Focus Deck
 * - Card-by-card active recall interface with single-question isolation
 * - Keyboard shortcuts: Space (reveal), ←/→ (nav), 1/2/3 (recall status), +/- (font size), Esc
 * - Mobile swipe gesture support (touch left/right)
 * - Live bidirectional synchronization with host page cards and StudySync
 * - Direct execution bridge into window.StudyCodeRunner.openWithCode()
 * Exposes: window.StudyZenMode
 * ─────────────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  var DEFAULT_HIGH_YIELD_DECK = [
    {
      num: 'Q1',
      title: 'How does ConcurrentHashMap handle thread safety without full locking?',
      category: 'Core Java & Concurrency',
      difficulty: 'Hard',
      hot: true,
      answerHtml: `<strong>CAS + Fine-Grained Bucket-Level Locking (Java 8+):</strong><br>
ConcurrentHashMap uses <code>CAS (Compare-And-Swap)</code> for atomic operations and synchronized blocks only at the <em>bucket head level</em>, never locking the entire map.<br><br>
<strong>Key Architectural Pillars:</strong>
<ul>
  <li><code>volatile Node[]</code> array: Guarantees visibility across threads without locks.</li>
  <li><strong>Empty Bucket Insertion:</strong> Uses lock-free <code>CAS</code> (Unsafe.compareAndSwapObject) to insert a new head node.</li>
  <li><strong>Occupied Bucket Update:</strong> Synchronizes exclusively on the head node of that specific bin: <code>synchronized(head)</code>.</li>
  <li>Concurrent reads are 100% lock-free via volatile field traversals.</li>
</ul>
<pre><code>// Example ConcurrentHashMap atomic update
ConcurrentHashMap&lt;String, Integer&gt; map = new ConcurrentHashMap&lt;&gt;();
map.compute("visitor_count", (key, val) -&gt; (val == null) ? 1 : val + 1);</code></pre>`,
      codeSnippet: `// Thread-Safe ConcurrentHashMap Atomic Compute
const map = new Map();
function atomicIncrement(key) {
  const current = map.get(key) || 0;
  map.set(key, current + 1);
  return map.get(key);
}
console.log("Visitor 1:", atomicIncrement("visitors"));
console.log("Visitor 2:", atomicIncrement("visitors"));`
    },
    {
      num: 'Q2',
      title: 'How does HashMap handle collisions internally — before and after Java 8?',
      category: 'Java Internals & Data Structures',
      difficulty: 'Medium',
      hot: true,
      answerHtml: `<strong>Before Java 8:</strong> Array of LinkedList buckets. Collision search was <code>O(n)</code> in the worst case.<br><br>
<strong>Java 8+:</strong>
<ul>
  <li>Converts LinkedList to <code>Red-Black Tree (TreeNode)</code> once a bucket reaches <strong>8 nodes</strong> (TREEIFY_THRESHOLD) and map capacity &ge; 64.</li>
  <li>Reduces worst-case search complexity from <code>O(n)</code> to <code>O(log n)</code>.</li>
  <li>Untreeifies back into a LinkedList when bucket size drops below <strong>6 nodes</strong> during resize.</li>
</ul>
<pre><code>// Threshold calculation:
// capacity * loadFactor = 16 * 0.75 = 12 items before array doubles</code></pre>`,
      codeSnippet: `// HashMap Bucket Collision Simulation
const BUCKET_SIZE = 16;
function hash(key) {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) % BUCKET_SIZE;
  return h;
}
console.log("Hash for 'alpha':", hash('alpha'));
console.log("Hash for 'omega':", hash('omega'));`
    },
    {
      num: 'Q3',
      title: 'Explain the 2-Sum problem and its optimal O(n) hash map approach.',
      category: 'DSA & Algorithms',
      difficulty: 'Easy',
      hot: true,
      answerHtml: `<strong>Problem:</strong> Given an array of integers <code>nums</code> and an integer <code>target</code>, find two numbers that sum up to <code>target</code>.<br><br>
<strong>Optimal Technique:</strong> One-pass Hash Table. As you iterate through the list, compute the required complement <code>complement = target - nums[i]</code>. If the complement exists in our map, return the pair; otherwise insert the current element with its index.`,
      codeSnippet: `function twoSum(nums, target) {
  const seen = new Map();
  for (let i = 0; i < nums.length; i++) {
    const diff = target - nums[i];
    if (seen.has(diff)) return [seen.get(diff), i];
    seen.set(nums[i], i);
  }
  return [];
}
console.log("Indices for [2,7,11,15], target 9 ->", twoSum([2,7,11,15], 9));`
    },
    {
      num: 'Q4',
      title: 'What causes Spring Boot circular dependency and how do you resolve it?',
      category: 'Spring Boot & Microservices',
      difficulty: 'Medium',
      hot: true,
      answerHtml: `A circular dependency occurs when Bean A requires Bean B via constructor injection, and Bean B requires Bean A, resulting in <code>BeanCurrentlyInCreationException</code>.<br><br>
<strong>Best Practices for Resolution:</strong>
<ul>
  <li><strong>Architectural Refactoring:</strong> Extract shared logic into a third service (Bean C).</li>
  <li><strong>Event-Driven Decoupling:</strong> Use ApplicationEventPublisher / listener.</li>
  <li><strong>Setter / @Lazy Injection:</strong> Inject a lazy proxy via <code>@Lazy</code> to break the creation cycle.</li>
</ul>`,
      codeSnippet: `// Event-Driven Decoupling Pattern
class EventBus {
  constructor() { this.listeners = {}; }
  on(event, fn) { (this.listeners[event] = this.listeners[event] || []).push(fn); }
  emit(event, data) { (this.listeners[event] || []).forEach(fn => fn(data)); }
}
const bus = new EventBus();
bus.on('ORDER_CREATED', order => console.log("Notification Service received order:", order.id));
bus.emit('ORDER_CREATED', { id: 101, amount: 250 });`
    }
  ];

  var Zen = {
    isOpen: false,
    currentIndex: 0,
    isAnswerVisible: false,
    fontSize: 16, // px
    cards: [],
    touchStartX: 0,
    touchStartY: 0,

    init: function () {
      this._injectStyles();
      this._bindGlobalKeydown();
      this._setupFloatingButton();
    },

    _injectStyles: function () {
      if (document.getElementById('study-zen-styles')) return;
      var style = document.createElement('style');
      style.id = 'study-zen-styles';
      style.textContent = `
        /* 🧘 Study Zen Mode Overlay */
        .zen-overlay {
          position: fixed;
          inset: 0;
          background: rgba(6, 8, 14, 0.94);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          z-index: 999999;
          display: flex;
          flex-direction: column;
          color: #e2e8f0;
          font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.28s cubic-bezier(0.16, 1, 0.3, 1);
          overflow: hidden;
        }
        .zen-overlay.active {
          opacity: 1;
          pointer-events: auto;
        }

        /* Top Bar */
        .zen-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 24px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(10, 14, 24, 0.6);
          flex-shrink: 0;
          gap: 16px;
        }
        .zen-tb-left {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }
        .zen-logo-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 20px;
          background: rgba(16, 185, 129, 0.12);
          border: 1px solid rgba(16, 185, 129, 0.25);
          color: #10b981;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.02em;
        }
        .zen-track-name {
          font-size: 13px;
          font-weight: 600;
          color: #94a3b8;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .zen-tb-center {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          flex: 1;
          max-width: 320px;
        }
        .zen-prog-label {
          font-size: 12px;
          font-weight: 600;
          color: #cbd5e1;
          font-family: 'JetBrains Mono', monospace;
        }
        .zen-prog-track {
          width: 100%;
          height: 5px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 99px;
          overflow: hidden;
        }
        .zen-prog-fill {
          height: 100%;
          background: linear-gradient(90deg, #10b981, #38bdf8);
          border-radius: 99px;
          transition: width 0.25s ease;
        }

        .zen-tb-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .zen-tool-btn {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #cbd5e1;
          border-radius: 8px;
          padding: 6px 10px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .zen-tool-btn:hover {
          background: rgba(255, 255, 255, 0.12);
          color: #fff;
          border-color: rgba(255, 255, 255, 0.25);
        }
        .zen-close-btn {
          background: rgba(239, 68, 68, 0.12);
          border: 1px solid rgba(239, 68, 68, 0.25);
          color: #f87171;
        }
        .zen-close-btn:hover {
          background: rgba(239, 68, 68, 0.25);
          color: #fff;
        }

        /* Body & Center Deck */
        .zen-body {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          overflow-y: auto;
          position: relative;
        }
        .zen-card-container {
          max-width: 860px;
          width: 100%;
          background: #0f1422;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.7);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .zen-card-header {
          padding: 20px 28px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(255, 255, 255, 0.02);
          gap: 12px;
          flex-wrap: wrap;
        }
        .zen-card-meta {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .zen-qnum-pill {
          font-family: 'JetBrains Mono', monospace;
          font-size: 13px;
          font-weight: 700;
          color: #38bdf8;
          background: rgba(56, 189, 248, 0.12);
          padding: 4px 10px;
          border-radius: 8px;
          border: 1px solid rgba(56, 189, 248, 0.25);
        }
        .zen-tag {
          font-size: 11px;
          font-weight: 600;
          padding: 3px 8px;
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.06);
          color: #94a3b8;
        }
        .zen-tag-easy { color: #34d399; background: rgba(52, 211, 153, 0.12); }
        .zen-tag-med { color: #fbbf24; background: rgba(251, 191, 36, 0.12); }
        .zen-tag-hard { color: #f87171; background: rgba(248, 113, 113, 0.12); }
        .zen-tag-hot { color: #fb923c; background: rgba(251, 146, 60, 0.12); }

        .zen-status-badge {
          font-size: 12px;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 8px;
        }
        .zen-status-done {
          background: rgba(16, 185, 129, 0.15);
          color: #10b981;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }
        .zen-status-inprogress {
          background: rgba(245, 158, 11, 0.15);
          color: #f59e0b;
          border: 1px solid rgba(245, 158, 11, 0.3);
        }
        .zen-status-none {
          background: rgba(255, 255, 255, 0.05);
          color: #64748b;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .zen-question-box {
          padding: 28px;
          font-size: 19px;
          font-weight: 700;
          line-height: 1.45;
          color: #f8fafc;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .zen-answer-wrap {
          padding: 24px 28px;
          background: #090c14;
          display: none;
          max-height: 52vh;
          overflow-y: auto;
          line-height: 1.65;
          color: #cbd5e1;
        }
        .zen-answer-wrap.show {
          display: block;
          animation: zenSlideDown 0.22s ease-out;
        }
        @keyframes zenSlideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .zen-answer-wrap p { margin-bottom: 12px; }
        .zen-answer-wrap ul, .zen-answer-wrap ol {
          margin: 8px 0 16px 20px;
        }
        .zen-answer-wrap li { margin-bottom: 6px; }
        .zen-answer-wrap code {
          background: rgba(255, 255, 255, 0.08);
          color: #38bdf8;
          padding: 2px 6px;
          border-radius: 4px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.9em;
        }
        .zen-answer-wrap pre {
          background: #06080e;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          padding: 14px;
          margin: 14px 0;
          overflow-x: auto;
          font-family: 'JetBrains Mono', monospace;
          font-size: 13px;
          line-height: 1.5;
          color: #e2e8f0;
          position: relative;
        }
        .zen-code-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 8px;
          margin-bottom: 14px;
        }
        .zen-code-btn {
          font-size: 11px;
          font-weight: 600;
          padding: 5px 12px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }
        .zen-code-btn.run {
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.3);
          color: #10b981;
        }
        .zen-code-btn.run:hover {
          background: rgba(16, 185, 129, 0.3);
          color: #fff;
        }
        .zen-code-btn.copy {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #94a3b8;
        }
        .zen-code-btn.copy:hover {
          background: rgba(255, 255, 255, 0.12);
          color: #fff;
        }

        .zen-toggle-answer-btn {
          width: 100%;
          padding: 14px;
          background: rgba(56, 189, 248, 0.08);
          border: none;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          color: #38bdf8;
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: background 0.2s;
        }
        .zen-toggle-answer-btn:hover {
          background: rgba(56, 189, 248, 0.15);
        }

        /* Recall Action Buttons inside Card */
        .zen-recall-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 24px;
          background: #0f1422;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          gap: 10px;
          flex-wrap: wrap;
        }
        .zen-recall-label {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #64748b;
        }
        .zen-recall-btns {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .zen-rec-btn {
          font-size: 12px;
          font-weight: 600;
          padding: 7px 14px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          border: 1px solid transparent;
        }
        .zen-rec-reset {
          background: rgba(255, 255, 255, 0.05);
          color: #94a3b8;
          border-color: rgba(255, 255, 255, 0.1);
        }
        .zen-rec-reset:hover { background: rgba(255, 255, 255, 0.1); color: #fff; }
        .zen-rec-inprog {
          background: rgba(245, 158, 11, 0.12);
          color: #f59e0b;
          border-color: rgba(245, 158, 11, 0.25);
        }
        .zen-rec-inprog:hover { background: rgba(245, 158, 11, 0.25); color: #fff; }
        .zen-rec-done {
          background: rgba(16, 185, 129, 0.15);
          color: #10b981;
          border-color: rgba(16, 185, 129, 0.3);
        }
        .zen-rec-done:hover { background: rgba(16, 185, 129, 0.3); color: #fff; }

        /* Bottom Deck Navigation */
        .zen-footer-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 28px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(10, 14, 24, 0.6);
          flex-shrink: 0;
        }
        .zen-nav-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 18px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #cbd5e1;
          cursor: pointer;
          transition: all 0.2s;
        }
        .zen-nav-btn:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.12);
          color: #fff;
          border-color: rgba(255, 255, 255, 0.25);
        }
        .zen-nav-btn:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }
        .zen-shortcuts-pill {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 11px;
          color: #64748b;
        }
        .zen-shortcuts-pill kbd {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 4px;
          padding: 2px 6px;
          font-family: 'JetBrains Mono', monospace;
          color: #cbd5e1;
          font-size: 10px;
        }

        /* Floating Trigger on pages */
        .zen-floating-trigger {
          position: fixed;
          bottom: 24px;
          right: 24px;
          background: linear-gradient(135deg, #059669, #0284c7);
          color: #fff;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 999px;
          padding: 10px 18px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
          z-index: 9999;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .zen-floating-trigger:hover {
          transform: translateY(-2px) scale(1.03);
          box-shadow: 0 12px 30px rgba(5, 150, 105, 0.45);
        }

        @media (max-width: 768px) {
          .zen-topbar { padding: 10px 14px; }
          .zen-shortcuts-pill { display: none; }
          .zen-card-header { padding: 14px 18px; }
          .zen-question-box { padding: 18px; font-size: 16px; }
          .zen-answer-wrap { padding: 18px; }
          .zen-body { padding: 12px; }
          .zen-floating-trigger {
            bottom: 74px;
            right: 14px;
            padding: 8px 14px;
            font-size: 12px;
          }
        }
      `;
      document.head.appendChild(style);
    },

    _setupFloatingButton: function () {
      if (typeof document.querySelector !== 'function') return;
      var isPrepPage = document.querySelector('.q-card, .q-list-item, .dsa-card');
      var path = (window.location && window.location.pathname) ? window.location.pathname : '';
      if (!isPrepPage && !path.includes('/prep/')) return;
      if (document.getElementById('zenFloatingTrigger')) return;

      var btn = document.createElement('button');
      btn.id = 'zenFloatingTrigger';
      btn.className = 'zen-floating-trigger';
      btn.setAttribute('title', 'Enter Zen Focus Study Mode (Alt+Z)');
      btn.innerHTML = '<span>🧘</span> <span>Zen Mode</span>';
      btn.onclick = () => this.open();
      document.body.appendChild(btn);
    },

    _harvestCards: function () {
      var domCards = (typeof document.querySelectorAll === 'function')
        ? Array.from(document.querySelectorAll('.q-card, .q-list-item, .dsa-card'))
        : [];
      if (domCards.length > 0) {
        return domCards.map((el, i) => {
          var numEl = el.querySelector('.q-num, .ql-num, .dsa-num');
          var textEl = el.querySelector('.q-text, .ql-title, .dsa-title, h3');
          var ansEl = el.querySelector('.q-answer, .ql-answer, .dsa-solution, .q-body');
          var tagEls = Array.from(el.querySelectorAll('.q-tag, .tag, .badge, .chip'));
          var btnMark = el.querySelector('.btn-mark, .status-btn');

          var status = 'none';
          if (el.classList.contains('answered') || el.classList.contains('done')) status = 'done';
          else if (el.classList.contains('in-progress') || el.classList.contains('inprogress')) status = 'inprogress';

          var preCode = el.querySelector('pre code, pre');
          var codeText = preCode ? preCode.textContent : '';

          return {
            sourceEl: el,
            num: numEl ? numEl.textContent.trim() : `Q${i + 1}`,
            title: textEl ? textEl.textContent.trim() : `Question ${i + 1}`,
            category: document.title.replace('— LedgerMate', '').trim() || 'Interview Prep',
            difficulty: tagEls.some(t => t.textContent.includes('Hard')) ? 'Hard' :
                        tagEls.some(t => t.textContent.includes('Easy')) ? 'Easy' : 'Medium',
            hot: tagEls.some(t => t.textContent.includes('Hot') || t.textContent.includes('🔥')),
            answerHtml: ansEl ? ansEl.innerHTML : '<p>Click to view solution explanation.</p>',
            codeSnippet: codeText,
            status: status
          };
        });
      }

      // Fallback to high yield questions if on Hub page
      return DEFAULT_HIGH_YIELD_DECK.map(item => Object.assign({ status: 'none' }, item));
    },

    open: function (initialIndex = 0) {
      this.cards = this._harvestCards();
      if (!this.cards.length) return;

      this.currentIndex = Math.max(0, Math.min(initialIndex, this.cards.length - 1));
      this.isAnswerVisible = false;
      this.isOpen = true;

      this._renderOverlay();
      this._updateCardView();

      var overlay = document.getElementById('study-zen-overlay');
      if (overlay) overlay.classList.add('active');
      document.body.style.overflow = 'hidden';

      if (window.HapticFeedback && typeof window.HapticFeedback.medium === 'function') {
        window.HapticFeedback.medium();
      }
    },

    close: function () {
      this.isOpen = false;
      var overlay = document.getElementById('study-zen-overlay');
      if (overlay) overlay.classList.remove('active');
      document.body.style.overflow = '';
    },

    _renderOverlay: function () {
      var existing = document.getElementById('study-zen-overlay');
      if (existing) return;

      var overlay = document.createElement('div');
      overlay.id = 'study-zen-overlay';
      overlay.className = 'zen-overlay';

      overlay.innerHTML = `
        <!-- Top Bar -->
        <header class="zen-topbar">
          <div class="zen-tb-left">
            <div class="zen-logo-pill">🧘 ZEN FOCUS</div>
            <div class="zen-track-name" id="zenTrackName">Study Resources</div>
          </div>
          <div class="zen-tb-center">
            <div class="zen-prog-label" id="zenProgLabel">Card 1 / 10</div>
            <div class="zen-prog-track">
              <div class="zen-prog-fill" id="zenProgFill" style="width: 10%"></div>
            </div>
          </div>
          <div class="zen-tb-right">
            <button class="zen-tool-btn" id="zenFontMinus" title="Decrease Font Size">A-</button>
            <button class="zen-tool-btn" id="zenFontPlus" title="Increase Font Size">A+</button>
            <button class="zen-tool-btn zen-close-btn" id="zenCloseBtn" title="Exit Zen Mode (Esc)">✕ Exit</button>
          </div>
        </header>

        <!-- Body / Main Card Deck -->
        <main class="zen-body" id="zenBodyArea">
          <div class="zen-card-container" id="zenCardBox">
            <div class="zen-card-header">
              <div class="zen-card-meta">
                <span class="zen-qnum-pill" id="zenCardNum">Q1</span>
                <span class="zen-tag" id="zenCardDiff">Medium</span>
                <span class="zen-tag zen-tag-hot" id="zenCardHot" style="display:none">🔥 Hot</span>
              </div>
              <div class="zen-status-badge zen-status-none" id="zenCardStatus">⚪ Pending</div>
            </div>

            <div class="zen-question-box" id="zenQuestionText"></div>

            <button class="zen-toggle-answer-btn" id="zenToggleAnsBtn">
              <span>👁️</span> <span id="zenToggleAnsText">Reveal Answer</span> <kbd style="font-size:10px;opacity:0.7">[Space]</kbd>
            </button>

            <div class="zen-answer-wrap" id="zenAnswerArea"></div>

            <!-- Active Recall Action Bar -->
            <div class="zen-recall-bar">
              <span class="zen-recall-label">Self-Assessment Status:</span>
              <div class="zen-recall-btns">
                <button class="zen-rec-btn zen-rec-reset" id="zenRecReset" title="Key 1">⚪ Reset [1]</button>
                <button class="zen-rec-btn zen-rec-inprog" id="zenRecInProg" title="Key 2">⏳ In Progress [2]</button>
                <button class="zen-rec-btn zen-rec-done" id="zenRecDone" title="Key 3">✅ Mastered [3]</button>
              </div>
            </div>
          </div>
        </main>

        <!-- Footer Navigation -->
        <footer class="zen-footer-nav">
          <button class="zen-nav-btn" id="zenPrevBtn" title="Previous (←)">
            <span>◀</span> <span>Previous</span>
          </button>
          <div class="zen-shortcuts-pill">
            <span><kbd>Space</kbd> Reveal Answer</span>
            <span><kbd>←</kbd> <kbd>→</kbd> Navigate</span>
            <span><kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> Recall</span>
            <span><kbd>Esc</kbd> Exit</span>
          </div>
          <button class="zen-nav-btn" id="zenNextBtn" title="Next (→)">
            <span>Next</span> <span>▶</span>
          </button>
        </footer>
      `;

      document.body.appendChild(overlay);

      // Wire DOM events
      var closeBtn = document.getElementById('zenCloseBtn');
      if (closeBtn) closeBtn.onclick = () => this.close();
      var prevBtn = document.getElementById('zenPrevBtn');
      if (prevBtn) prevBtn.onclick = () => this.prev();
      var nextBtn = document.getElementById('zenNextBtn');
      if (nextBtn) nextBtn.onclick = () => this.next();
      var toggleAnsBtn = document.getElementById('zenToggleAnsBtn');
      if (toggleAnsBtn) toggleAnsBtn.onclick = () => this.toggleAnswer();

      var recReset = document.getElementById('zenRecReset');
      if (recReset) recReset.onclick = () => this.setStatus('none');
      var recInProg = document.getElementById('zenRecInProg');
      if (recInProg) recInProg.onclick = () => this.setStatus('inprogress');
      var recDone = document.getElementById('zenRecDone');
      if (recDone) recDone.onclick = () => this.setStatus('done');

      var fontMinus = document.getElementById('zenFontMinus');
      if (fontMinus) fontMinus.onclick = () => this.adjustFontSize(-2);
      var fontPlus = document.getElementById('zenFontPlus');
      if (fontPlus) fontPlus.onclick = () => this.adjustFontSize(+2);

      // Touch / swipe detection on zenBodyArea
      var bodyArea = document.getElementById('zenBodyArea');
      if (bodyArea) {
        bodyArea.addEventListener('touchstart', (e) => {
          if (!e.changedTouches || !e.changedTouches[0]) return;
          this.touchStartX = e.changedTouches[0].clientX;
          this.touchStartY = e.changedTouches[0].clientY;
        }, { passive: true });

        bodyArea.addEventListener('touchend', (e) => {
          if (!e.changedTouches || !e.changedTouches[0]) return;
          var diffX = e.changedTouches[0].clientX - this.touchStartX;
          var diffY = e.changedTouches[0].clientY - this.touchStartY;
          // Detect clean horizontal swipe (> 55px and more horizontal than vertical)
          if (Math.abs(diffX) > 55 && Math.abs(diffX) > Math.abs(diffY)) {
            if (diffX < 0) this.next();
            else this.prev();
          }
        }, { passive: true });
      }
    },

    _updateCardView: function () {
      if (!this.cards[this.currentIndex]) return;
      var c = this.cards[this.currentIndex];

      var total = this.cards.length;
      var curNum = this.currentIndex + 1;
      var pct = Math.round((curNum / total) * 100);

      var trackNameEl = document.getElementById('zenTrackName');
      if (trackNameEl) trackNameEl.textContent = c.category || 'Preparation Deck';

      var progLabel = document.getElementById('zenProgLabel');
      if (progLabel) progLabel.textContent = `Card ${curNum} of ${total} (${pct}%)`;

      var progFill = document.getElementById('zenProgFill');
      if (progFill) progFill.style.width = pct + '%';

      var cardNum = document.getElementById('zenCardNum');
      if (cardNum) cardNum.textContent = c.num || `Q${curNum}`;

      var cardDiff = document.getElementById('zenCardDiff');
      if (cardDiff) {
        cardDiff.textContent = c.difficulty || 'Medium';
        cardDiff.className = 'zen-tag ' + (
          c.difficulty === 'Hard' ? 'zen-tag-hard' :
          c.difficulty === 'Easy' ? 'zen-tag-easy' : 'zen-tag-med'
        );
      }

      var cardHot = document.getElementById('zenCardHot');
      if (cardHot) cardHot.style.display = c.hot ? 'inline-block' : 'none';

      // Status badge
      var statusBadge = document.getElementById('zenCardStatus');
      if (statusBadge) {
        if (c.status === 'done') {
          statusBadge.textContent = '✅ Mastered';
          statusBadge.className = 'zen-status-badge zen-status-done';
        } else if (c.status === 'inprogress') {
          statusBadge.textContent = '⏳ In Progress';
          statusBadge.className = 'zen-status-badge zen-status-inprogress';
        } else {
          statusBadge.textContent = '⚪ Pending';
          statusBadge.className = 'zen-status-badge zen-status-none';
        }
      }

      // Question text & Typography
      var qText = document.getElementById('zenQuestionText');
      if (qText) {
        qText.textContent = c.title;
        qText.style.fontSize = (this.fontSize + 3) + 'px';
      }

      // Answer content
      var ansArea = document.getElementById('zenAnswerArea');
      if (ansArea) {
        ansArea.innerHTML = c.answerHtml;
        ansArea.style.fontSize = this.fontSize + 'px';

        // Add code execution / copy buttons to pre elements inside answer
        var preElements = ansArea.querySelectorAll('pre');
        preElements.forEach((pre) => {
          if (pre.querySelector('.zen-code-actions')) return;
          var codeText = pre.textContent.replace('copy', '').trim();
          var actionsDiv = document.createElement('div');
          actionsDiv.className = 'zen-code-actions';

          // Copy button
          var copyBtn = document.createElement('button');
          copyBtn.className = 'zen-code-btn copy';
          copyBtn.innerHTML = '📋 Copy';
          copyBtn.onclick = (e) => {
            e.stopPropagation();
            navigator.clipboard.writeText(codeText);
            copyBtn.textContent = '✓ Copied!';
            setTimeout(() => { copyBtn.innerHTML = '📋 Copy'; }, 1500);
          };
          actionsDiv.appendChild(copyBtn);

          // Run Code button
          if (window.StudyCodeRunner) {
            var runBtn = document.createElement('button');
            runBtn.className = 'zen-code-btn run';
            runBtn.innerHTML = '▶ Run Code';
            runBtn.onclick = (e) => {
              e.stopPropagation();
              window.StudyCodeRunner.openWithCode({
                title: c.title,
                code: c.codeSnippet || codeText,
                language: (c.category.toLowerCase().includes('react') || c.category.toLowerCase().includes('dsa')) ? 'javascript' : 'java',
                desc: c.title
              });
            };
            actionsDiv.appendChild(runBtn);
          }

          pre.parentNode.insertBefore(actionsDiv, pre.nextSibling);
        });

        if (this.isAnswerVisible) {
          ansArea.classList.add('show');
        } else {
          ansArea.classList.remove('show');
        }
      }

      var toggleAnsBtn = document.getElementById('zenToggleAnsText');
      if (toggleAnsBtn) {
        toggleAnsBtn.textContent = this.isAnswerVisible ? 'Hide Answer' : 'Reveal Answer';
      }

      // Nav buttons state
      var prevBtn = document.getElementById('zenPrevBtn');
      if (prevBtn) prevBtn.disabled = this.currentIndex <= 0;

      var nextBtn = document.getElementById('zenNextBtn');
      if (nextBtn) nextBtn.disabled = this.currentIndex >= total - 1;
    },

    toggleAnswer: function () {
      this.isAnswerVisible = !this.isAnswerVisible;
      var ansArea = document.getElementById('zenAnswerArea');
      var toggleAnsBtn = document.getElementById('zenToggleAnsText');
      if (ansArea) {
        if (this.isAnswerVisible) ansArea.classList.add('show');
        else ansArea.classList.remove('show');
      }
      if (toggleAnsBtn) {
        toggleAnsBtn.textContent = this.isAnswerVisible ? 'Hide Answer' : 'Reveal Answer';
      }
      if (window.HapticFeedback && typeof window.HapticFeedback.light === 'function') {
        window.HapticFeedback.light();
      }
    },

    next: function () {
      if (this.currentIndex < this.cards.length - 1) {
        this.currentIndex++;
        this.isAnswerVisible = false;
        this._updateCardView();
        if (window.HapticFeedback && typeof window.HapticFeedback.selection === 'function') {
          window.HapticFeedback.selection();
        }
      }
    },

    prev: function () {
      if (this.currentIndex > 0) {
        this.currentIndex--;
        this.isAnswerVisible = false;
        this._updateCardView();
        if (window.HapticFeedback && typeof window.HapticFeedback.selection === 'function') {
          window.HapticFeedback.selection();
        }
      }
    },

    setStatus: function (newStatus) {
      var c = this.cards[this.currentIndex];
      if (!c) return;
      c.status = newStatus;

      // Sync with underlying DOM element if present
      if (c.sourceEl) {
        var el = c.sourceEl;
        el.classList.remove('answered', 'in-progress', 'done');
        var btn = el.querySelector('.btn-mark');
        if (newStatus === 'done') {
          el.classList.add('answered');
          if (btn) { btn.textContent = '✕ Reset'; btn.className = 'btn-mark state-done'; }
        } else if (newStatus === 'inprogress') {
          el.classList.add('in-progress');
          if (btn) { btn.textContent = '✓ Mark Done'; btn.className = 'btn-mark state-inprogress'; }
        } else {
          if (btn) { btn.textContent = '▷ In Progress'; btn.className = 'btn-mark'; }
        }

        // Trigger host page progress / streak functions if they exist
        if (typeof window.updateProgress === 'function') window.updateProgress();
        if (typeof window.updateStudyStreak === 'function') window.updateStudyStreak();
      }

      this._updateCardView();

      if (window.LMToast && typeof window.LMToast.ok === 'function') {
        window.LMToast.ok(`Card marked as ${newStatus === 'done' ? 'Mastered ✅' : newStatus === 'inprogress' ? 'In Progress ⏳' : 'Pending ⚪'}`);
      }
    },

    adjustFontSize: function (delta) {
      this.fontSize = Math.max(12, Math.min(26, this.fontSize + delta));
      var ansArea = document.getElementById('zenAnswerArea');
      var qText = document.getElementById('zenQuestionText');
      if (ansArea) ansArea.style.fontSize = this.fontSize + 'px';
      if (qText) qText.style.fontSize = (this.fontSize + 3) + 'px';
    },

    _bindGlobalKeydown: function () {
      document.addEventListener('keydown', (e) => {
        // Toggle via Alt+Z anytime
        if (e.altKey && (e.key === 'z' || e.key === 'Z')) {
          e.preventDefault();
          if (this.isOpen) this.close();
          else this.open();
          return;
        }

        if (!this.isOpen) return;

        // In Zen Mode keyboard controls:
        if (e.key === 'Escape') {
          e.preventDefault();
          this.close();
        } else if (e.key === ' ' || e.code === 'Space') {
          // If not typing in input/textarea
          if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
            e.preventDefault();
            this.toggleAnswer();
          }
        } else if (e.key === 'ArrowRight' || e.key === 'l' || e.key === 'j') {
          if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
            e.preventDefault();
            this.next();
          }
        } else if (e.key === 'ArrowLeft' || e.key === 'h' || e.key === 'k') {
          if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
            e.preventDefault();
            this.prev();
          }
        } else if (e.key === '1') {
          if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
            e.preventDefault();
            this.setStatus('none');
          }
        } else if (e.key === '2') {
          if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
            e.preventDefault();
            this.setStatus('inprogress');
          }
        } else if (e.key === '3') {
          if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
            e.preventDefault();
            this.setStatus('done');
          }
        }
      });
    }
  };

  // Auto-init on DOMContentLoaded or immediate
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Zen.init());
  } else {
    Zen.init();
  }

  window.StudyZenMode = Zen;
  console.log('[StudyHub] StudyZenMode focus deck loaded.');
})();
