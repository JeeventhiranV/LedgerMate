/**
 * LedgerMate Study Hub – StudySRS.js
 * ─────────────────────────────────────────────────────────────
 * Spaced Repetition System (SRS) using the SuperMemo-2 (SM-2) Algorithm.
 * Schedules questions for memory retention based on user recall grade (1-4).
 * Exposes: window.StudySRS
 * ─────────────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'study_srs_cards_v1';

  /*
   * SuperMemo-2 (SM-2) algorithm:
   * EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
   * EF min = 1.3
   * Intervals:
   * - rep 1: 1 day
   * - rep 2: 6 days
   * - rep n: I(n-1) * EF
   */
  function calculateNextReview(card, qualityGrade) {
    var ef = card.ef || 2.5;
    var rep = card.repetition || 0;
    var interval = card.interval || 0;

    // Quality: 1=Again (failed), 2=Hard, 3=Good, 4=Easy (mapped to 1-5 scale)
    var q = qualityGrade === 1 ? 1 : qualityGrade === 2 ? 3 : qualityGrade === 3 ? 4 : 5;

    if (q >= 3) {
      if (rep === 0) {
        interval = 1;
      } else if (rep === 1) {
        interval = 6;
      } else {
        interval = Math.round(interval * ef);
      }
      rep++;
    } else {
      rep = 0;
      interval = 1;
    }

    ef = ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
    if (ef < 1.3) ef = 1.3;

    var nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + interval);

    return {
      id: card.id,
      module: card.module,
      question: card.question,
      answer: card.answer,
      ef: Number(ef.toFixed(2)),
      repetition: rep,
      interval: interval,
      dueDate: nextDate.toISOString().slice(0, 10),
      lastReviewed: new Date().toISOString()
    };
  }

  function getCards() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  }

  function saveCards(cards) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
    } catch (e) {}
  }

  function getDueCards() {
    var today = new Date().toISOString().slice(0, 10);
    var cards = getCards();
    return cards.filter(c => !c.dueDate || c.dueDate <= today);
  }

  // Seed standard flashcards from prep modules if empty
  function seedDefaultFlashcards() {
    var existing = getCards();
    if (existing.length) return existing;

    var initial = [
      { id: 'srs_1', module: 'java', question: 'What is the difference between Comparable and Comparator in Java?', answer: 'Comparable provides a single natural sorting order via compareTo(Object). Comparator provides multiple custom sorting sequences via compare(Object, Object) in a separate class or lambda.', ef: 2.5, repetition: 0, interval: 0, dueDate: new Date().toISOString().slice(0,10) },
      { id: 'srs_2', module: 'dsa', question: 'How do you detect a cycle in a Linked List in O(1) space?', answer: "Use Floyd's Cycle-Finding Algorithm (Fast & Slow Pointers). Slow moves 1 step, Fast moves 2 steps. If they meet, a cycle exists.", ef: 2.5, repetition: 0, interval: 0, dueDate: new Date().toISOString().slice(0,10) },
      { id: 'srs_3', module: 'react', question: 'What is the difference between useMemo and useCallback?', answer: 'useMemo returns a memoized VALUE (result of a function). useCallback returns a memoized CALLBACK FUNCTION instance across re-renders.', ef: 2.5, repetition: 0, interval: 0, dueDate: new Date().toISOString().slice(0,10) },
      { id: 'srs_4', module: 'java', question: 'How does HashMap handle collisions internally in Java 8+?', answer: 'Uses separate chaining with LinkedLists. When bucket size exceeds 8 (TREEIFY_THRESHOLD) and capacity >= 64, the linked list converts into a Red-Black Balanced Binary Search Tree (O(log N) lookup).', ef: 2.5, repetition: 0, interval: 0, dueDate: new Date().toISOString().slice(0,10) },
      { id: 'srs_5', module: 'systemdesign', question: 'Explain CAP theorem in distributed systems.', answer: 'A distributed system can guarantee at most 2 out of 3: Consistency (every read gets latest write), Availability (every request receives a non-error response), and Partition Tolerance (system continues functioning despite network drops).', ef: 2.5, repetition: 0, interval: 0, dueDate: new Date().toISOString().slice(0,10) }
    ];

    saveCards(initial);
    return initial;
  }

  // Flashcard Review Interactive Modal
  function showSRSModal() {
    var existing = document.getElementById('study-srs-modal');
    if (existing) existing.remove();

    seedDefaultFlashcards();
    var dueCards = getDueCards();
    var currentIdx = 0;
    var isFlipped = false;

    var modal = document.createElement('div');
    modal.id = 'study-srs-modal';
    modal.className = 'modal-overlay show';
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.8);z-index:99999;display:flex;align-items:center;justify-content:center;padding:12px;backdrop-filter:blur(6px);font-family:Inter,sans-serif;color:#e8eaf6;';

    function renderCardView() {
      if (!dueCards.length || currentIdx >= dueCards.length) {
        modal.innerHTML = `
          <div style="background:#151922;border:1px solid #262f45;border-radius:18px;max-width:520px;width:100%;padding:32px 20px;text-align:center;box-shadow:0 24px 60px rgba(0,0,0,.7);">
            <div style="font-size:44px;margin-bottom:12px;">🎉</div>
            <h3 style="font-size:18px;font-weight:700;color:#10b981;">All Caught Up!</h3>
            <p style="font-size:12px;color:#8896b8;margin:8px 0 20px;line-height:1.5;">You have completed all scheduled flashcards for today. Great job boosting long-term memory!</p>
            <button id="study-srs-done-btn" style="padding:9px 22px;background:linear-gradient(135deg,#10b981,#3b82f6);border:none;border-radius:10px;color:#fff;font-weight:600;font-size:13px;cursor:pointer;">Close</button>
          </div>
        `;
        document.getElementById('study-srs-done-btn').onclick = () => modal.remove();
        return;
      }

      var card = dueCards[currentIdx];

      modal.innerHTML = `
        <div style="background:#151922;border:1px solid #262f45;border-radius:18px;max-width:620px;width:100%;max-height:88vh;display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(0,0,0,.7);overflow:hidden;">
          <div style="padding:14px 18px;border-bottom:1px solid #262f45;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="font-size:16px;">🧠</span>
              <span style="font-size:13px;font-weight:700;">Spaced Flashcards</span>
              <span style="font-size:10px;background:rgba(79,142,247,0.15);color:#4f8ef7;padding:2px 6px;border-radius:6px;font-weight:600;">${currentIdx + 1} / ${dueCards.length}</span>
            </div>
            <button id="study-srs-close" style="background:none;border:none;color:#8896b8;font-size:22px;cursor:pointer;">&times;</button>
          </div>

          <div id="study-srs-card" style="padding:24px 20px;min-height:200px;flex:1;overflow-y:auto;display:flex;flex-direction:column;justify-content:center;cursor:pointer;background:${isFlipped ? 'rgba(16,185,129,0.04)' : 'rgba(255,255,255,0.02)'};transition:all .2s;-webkit-overflow-scrolling:touch;">
            <div style="font-size:10px;text-transform:uppercase;color:#8896b8;letter-spacing:1px;font-weight:700;margin-bottom:10px;">
              ${isFlipped ? '💡 ANSWER' : '❓ QUESTION (Tap card to flip)'}
            </div>
            <div style="font-size:15px;line-height:1.6;font-weight:${isFlipped ? '400' : '600'};color:#f1f5f9;">
              ${isFlipped ? card.answer : card.question}
            </div>
            ${!isFlipped ? '<div style="margin-top:16px;font-size:11px;color:#4f8ef7;">Tap anywhere to reveal answer ➔</div>' : ''}
          </div>

          <div style="padding:12px 18px;border-top:1px solid #262f45;background:#111420;display:flex;justify-content:space-between;align-items:center;gap:6px;flex-wrap:wrap;">
            ${!isFlipped ? `
              <button id="study-srs-flip-btn" style="width:100%;padding:9px;background:linear-gradient(135deg,#4f8ef7,#8b5cf6);border:none;border-radius:8px;color:#fff;font-weight:600;font-size:13px;cursor:pointer;">Reveal Answer</button>
            ` : `
              <button class="study-srs-rate" data-grade="1" style="flex:1;min-width:65px;padding:8px 4px;background:rgba(244,63,94,0.15);border:1px solid rgba(244,63,94,0.4);border-radius:8px;color:#f43f5e;font-weight:600;font-size:11px;cursor:pointer;">Again (1d)</button>
              <button class="study-srs-rate" data-grade="2" style="flex:1;min-width:65px;padding:8px 4px;background:rgba(245,158,11,0.15);border:1px solid rgba(245,158,11,0.4);border-radius:8px;color:#f59e0b;font-weight:600;font-size:11px;cursor:pointer;">Hard</button>
              <button class="study-srs-rate" data-grade="3" style="flex:1;min-width:65px;padding:8px 4px;background:rgba(59,130,246,0.15);border:1px solid rgba(59,130,246,0.4);border-radius:8px;color:#3b82f6;font-weight:600;font-size:11px;cursor:pointer;">Good</button>
              <button class="study-srs-rate" data-grade="4" style="flex:1;min-width:65px;padding:8px 4px;background:rgba(16,185,129,0.15);border:1px solid rgba(16,185,129,0.4);border-radius:8px;color:#10b981;font-weight:600;font-size:11px;cursor:pointer;">Easy</button>
            `}
          </div>
        </div>
      `;

      document.getElementById('study-srs-close').onclick = () => modal.remove();

      var cardEl = document.getElementById('study-srs-card');
      if (cardEl) {
        cardEl.onclick = () => {
          if (!isFlipped) {
            isFlipped = true;
            renderCardView();
          }
        };
      }

      var flipBtn = document.getElementById('study-srs-flip-btn');
      if (flipBtn) {
        flipBtn.onclick = () => {
          isFlipped = true;
          renderCardView();
        };
      }

      modal.querySelectorAll('.study-srs-rate').forEach(btn => {
        btn.onclick = function () {
          var grade = parseInt(this.dataset.grade, 10);
          var updated = calculateNextReview(card, grade);

          // Update card in store
          var allCards = getCards();
          var targetIdx = allCards.findIndex(c => c.id === card.id);
          if (targetIdx >= 0) {
            allCards[targetIdx] = updated;
          } else {
            allCards.push(updated);
          }
          saveCards(allCards);

          currentIdx++;
          isFlipped = false;
          renderCardView();
        };
      });
    }

    document.body.appendChild(modal);
    renderCardView();
  }

  window.StudySRS = {
    getDueCards: getDueCards,
    showModal: showSRSModal,
    seedDefaults: seedDefaultFlashcards
  };

  console.log('[StudyHub] StudySRS Spaced Repetition module initialized.');
})();
