/**
 * LedgerMate Study Hub – StudyMistakeVault.js
 * ─────────────────────────────────────────────────────────────
 * Intelligent Mistake Vault & Spaced Revision Queue
 * Automatically captures missed quiz questions and weak topics,
 * applies SM-2 scheduling for daily active recall, and celebrates
 * mastery graduation when answered correctly twice consecutively.
 *
 * Exposes: window.StudyMistakeVault
 * ─────────────────────────────────────────────────────────────
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.StudyMistakeVault = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var STORAGE_KEY = 'study_mistake_vault_v1';

  function _today() {
    var d = new Date();
    return d.toISOString().slice(0, 10);
  }

  function _esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function _load() {
    try {
      if (typeof localStorage === 'undefined') return [];
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function _save(list) {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      }
      _notify();
    } catch (e) {}
  }

  function _notify() {
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function' && typeof CustomEvent === 'function') {
      window.dispatchEvent(new CustomEvent('lm_mistake_vault_updated', {
        detail: getStats()
      }));
      updateHubBadge();
    }
  }

  function getAll() {
    return _load();
  }

  function getActive() {
    return _load().filter(function (m) { return !m.isMastered; });
  }

  function getDue() {
    var today = _today();
    return _load().filter(function (m) {
      return !m.isMastered && (!m.dueDate || m.dueDate <= today);
    });
  }

  function getMastered() {
    return _load().filter(function (m) { return !!m.isMastered; });
  }

  function getStats() {
    var list = _load();
    var active = list.filter(function (m) { return !m.isMastered; });
    var due = active.filter(function (m) { return !m.dueDate || m.dueDate <= _today(); });
    var mastered = list.filter(function (m) { return !!m.isMastered; });
    var total = list.length;
    var pct = total > 0 ? Math.round((mastered.length / total) * 100) : 100;
    return {
      total: total,
      activeCount: active.length,
      dueCount: due.length,
      masteredCount: mastered.length,
      masteryRatePct: pct
    };
  }

  /**
   * Log an incorrect answer or weak question into the vault.
   */
  function logMistake(topic, questionObj, userAns, correctAns, exp, source) {
    var list = _load();
    var qText = typeof questionObj === 'string' ? questionObj : (questionObj && (questionObj.q || questionObj.question || questionObj.title || ''));
    if (!qText) return null;

    var options = questionObj && Array.isArray(questionObj.options) ? questionObj.options : null;
    var explanation = exp || (questionObj && (questionObj.exp || questionObj.explanation || '')) || '';
    var existingIdx = list.findIndex(function (m) {
      return m.question.trim().toLowerCase() === qText.trim().toLowerCase();
    });

    var today = _today();
    var entry;

    if (existingIdx >= 0) {
      entry = list[existingIdx];
      entry.userAnswer = userAns;
      entry.correctAnswer = correctAns !== undefined ? correctAns : entry.correctAnswer;
      entry.explanation = explanation || entry.explanation;
      entry.options = options || entry.options;
      entry.consecutiveCorrect = 0;
      entry.isMastered = false;
      entry.ef = Math.max(1.3, Number(((entry.ef || 2.5) - 0.2).toFixed(2)));
      entry.repetition = 0;
      entry.interval = 1;
      entry.dueDate = today;
      entry.lastLoggedAt = new Date().toISOString();
      list[existingIdx] = entry;
    } else {
      entry = {
        id: 'mv_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        topic: (topic || 'general').toLowerCase(),
        question: qText.trim(),
        options: options,
        userAnswer: userAns,
        correctAnswer: correctAns,
        explanation: explanation,
        source: source || 'quiz',
        consecutiveCorrect: 0,
        isMastered: false,
        ef: 2.5,
        repetition: 0,
        interval: 1,
        dueDate: today,
        loggedAt: new Date().toISOString(),
        lastReviewedAt: null
      };
      list.unshift(entry);
    }

    _save(list);
    return entry;
  }

  /**
   * Record a review outcome (SM-2 calculation and mastery graduation).
   */
  function recordReviewResult(id, isCorrect) {
    var list = _load();
    var idx = list.findIndex(function (m) { return m.id === id; });
    if (idx === -1) return null;

    var entry = list[idx];
    var today = new Date();

    if (isCorrect) {
      entry.consecutiveCorrect = (entry.consecutiveCorrect || 0) + 1;
      if (entry.consecutiveCorrect >= 2) {
        entry.isMastered = true;
        entry.masteredAt = new Date().toISOString();
      }

      var rep = entry.repetition || 0;
      var ef = entry.ef || 2.5;
      var interval = entry.interval || 1;

      if (rep === 0) {
        interval = 1;
      } else if (rep === 1) {
        interval = 3;
      } else {
        interval = Math.round(interval * ef);
      }
      rep++;
      ef = Math.min(2.8, Number((ef + 0.1).toFixed(2)));

      entry.repetition = rep;
      entry.ef = ef;
      entry.interval = interval;
      today.setDate(today.getDate() + interval);
      entry.dueDate = today.toISOString().slice(0, 10);
    } else {
      entry.consecutiveCorrect = 0;
      entry.isMastered = false;
      entry.repetition = 0;
      entry.interval = 1;
      entry.ef = Math.max(1.3, Number(((entry.ef || 2.5) - 0.2).toFixed(2)));
      today.setDate(today.getDate() + 1);
      entry.dueDate = today.toISOString().slice(0, 10);
    }

    entry.lastReviewedAt = new Date().toISOString();
    list[idx] = entry;
    _save(list);
    return entry;
  }

  function removeMistake(id) {
    var list = _load().filter(function (m) { return m.id !== id; });
    _save(list);
  }

  function clearAll() {
    _save([]);
  }

  /**
   * Updates UI badges across the hub and toolbars.
   */
  function updateHubBadge() {
    if (typeof document === 'undefined') return;
    var stats = getStats();
    var badges = document.querySelectorAll('.mistake-vault-count, .mv-due-badge');
    badges.forEach(function (el) {
      el.textContent = stats.dueCount;
      if (stats.dueCount > 0) {
        el.style.display = 'inline-flex';
      } else {
        el.style.display = stats.activeCount > 0 ? 'inline-flex' : 'none';
        if (stats.activeCount > 0) el.textContent = '0 due';
      }
    });

    var widgetDue = document.getElementById('hubMistakeDueNum');
    if (widgetDue) widgetDue.textContent = stats.dueCount;
    var widgetActive = document.getElementById('hubMistakeActiveNum');
    if (widgetActive) widgetActive.textContent = stats.activeCount;
    var widgetMastered = document.getElementById('hubMistakeMasteredNum');
    if (widgetMastered) widgetMastered.textContent = stats.masteredCount;
    var widgetRate = document.getElementById('hubMistakeRatePct');
    if (widgetRate) widgetRate.textContent = stats.masteryRatePct + '%';
  }

  /**
   * Interactive Distraction-Free Mistake Sprint Modal
   */
  function showSprintModal() {
    if (typeof document === 'undefined') return;
    var existing = document.getElementById('study-mistake-sprint-modal');
    if (existing) existing.remove();

    var due = getDue();
    // If no due mistakes, allow practicing any active mistakes or show all-clear
    var queue = due.length > 0 ? due.slice() : getActive().slice();
    var currentIdx = 0;
    var answered = false;

    var modal = document.createElement('div');
    modal.id = 'study-mistake-sprint-modal';
    modal.className = 'modal-overlay show';
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.86);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(8px);font-family:Inter,sans-serif;color:#e8eaf6;box-sizing:border-box;';

    function closeModal() {
      modal.remove();
      updateHubBadge();
    }

    function renderView() {
      if (!queue.length || currentIdx >= queue.length) {
        modal.innerHTML = `
          <div style="background:#151922;border:1px solid #262f45;border-radius:18px;max-width:520px;width:100%;padding:32px 24px;text-align:center;box-shadow:0 24px 60px rgba(0,0,0,.8);">
            <div style="font-size:46px;margin-bottom:12px;">🏆</div>
            <h3 style="font-size:18px;font-weight:700;color:#06d6a0;margin:0 0 8px;">Mistake Revision Sprint Complete!</h3>
            <p style="font-size:13px;color:#8896b8;margin:0 0 20px;line-height:1.55;">You reviewed all weak-topic cards queued for today. Spaced repetition actively consolidates these pathways in memory!</p>
            <div style="display:flex;gap:10px;justify-content:center;">
              <button id="mv-close-sprint-btn" style="padding:10px 22px;background:linear-gradient(135deg,#06d6a0,#4f8ef7);border:none;border-radius:10px;color:#051329;font-weight:700;font-size:13px;cursor:pointer;">Back to Study Hub</button>
            </div>
          </div>
        `;
        document.getElementById('mv-close-sprint-btn').onclick = closeModal;
        return;
      }

      var item = queue[currentIdx];
      var hasOpts = item.options && item.options.length > 0;

      modal.innerHTML = `
        <div style="background:#151922;border:1px solid #262f45;border-radius:18px;max-width:680px;width:100%;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(0,0,0,.8);overflow:hidden;">
          <!-- Header -->
          <div style="padding:14px 20px;border-bottom:1px solid #262f45;background:#111420;display:flex;justify-content:space-between;align-items:center;">
            <div style="display:flex;align-items:center;gap:10px;">
              <span style="font-size:18px;">🔥</span>
              <div>
                <span style="font-size:13px;font-weight:700;">Mistake Revision Sprint</span>
                <span style="font-size:11px;color:#f59e0b;margin-left:8px;font-weight:600;">[${_esc(item.topic).toUpperCase()}]</span>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:12px;">
              <span style="font-size:11px;font-weight:700;background:rgba(245,158,11,0.15);color:#f59e0b;padding:3px 8px;border-radius:6px;border:1px solid rgba(245,158,11,0.3);">
                Card ${currentIdx + 1} of ${queue.length}
              </span>
              <button id="mv-close-btn" style="background:none;border:none;color:#8896b8;font-size:22px;cursor:pointer;line-height:1;">&times;</button>
            </div>
          </div>

          <!-- Body -->
          <div style="padding:22px 24px;overflow-y:auto;flex:1;">
            <div style="font-size:11px;text-transform:uppercase;color:#8896b8;letter-spacing:0.8px;font-weight:700;margin-bottom:8px;">Weak Spot Question:</div>
            <div style="font-size:15px;line-height:1.6;font-weight:600;color:#f8fafc;margin-bottom:18px;">${_esc(item.question)}</div>

            ${hasOpts ? `
              <div id="mv-options-wrap" style="display:flex;flex-direction:column;gap:9px;margin-bottom:16px;">
                ${item.options.map(function (opt, oIdx) {
                  return `
                    <button class="mv-opt-btn" data-idx="${oIdx}" style="padding:12px 14px;background:rgba(255,255,255,0.025);border:1px solid #2d3650;border-radius:10px;color:#e2e8f0;font-size:13px;text-align:left;cursor:pointer;line-height:1.45;transition:all .15s;display:flex;align-items:center;gap:10px;">
                      <span style="width:22px;height:22px;border-radius:50%;background:#1e2433;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#8896b8;flex-shrink:0;">${String.fromCharCode(65 + oIdx)}</span>
                      <span>${_esc(opt)}</span>
                    </button>
                  `;
                }).join('')}
              </div>
            ` : ''}

            <!-- Reveal / Solution Box -->
            <div id="mv-solution-box" style="display:${hasOpts ? 'none' : 'block'};background:rgba(6,214,160,0.05);border:1px solid rgba(6,214,160,0.25);border-radius:12px;padding:16px;margin-top:14px;">
              <div style="font-size:11px;font-weight:700;color:#06d6a0;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:6px;">💡 Solution & Key Takeaway:</div>
              <div style="font-size:13.5px;color:#f1f5f9;line-height:1.6;">
                ${hasOpts && typeof item.correctAnswer === 'number' && item.options[item.correctAnswer] ? `
                  <div style="font-weight:700;color:#06d6a0;margin-bottom:8px;">Correct Answer: ${_esc(item.options[item.correctAnswer])}</div>
                ` : ''}
                ${_esc(item.explanation || 'Review the core concept carefully before attempting again.')}
              </div>
            </div>
          </div>

          <!-- Footer Actions -->
          <div style="padding:14px 20px;border-top:1px solid #262f45;background:#111420;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
            <div style="font-size:11px;color:#8896b8;">
              Consecutive Masteries: <strong style="color:#06d6a0;">${item.consecutiveCorrect || 0} / 2</strong>
              ${item.consecutiveCorrect >= 1 ? ' · (1 more correct answer to graduate!)' : ''}
            </div>

            <div style="display:flex;gap:8px;">
              <button id="mv-again-btn" style="padding:8px 16px;background:rgba(244,63,94,0.15);border:1px solid rgba(244,63,94,0.35);border-radius:8px;color:#f43f5e;font-weight:700;font-size:12px;cursor:pointer;">
                ❌ Still Tricky (Again)
              </button>
              <button id="mv-correct-btn" style="padding:8px 18px;background:linear-gradient(135deg,#06d6a0,#3b82f6);border:none;border-radius:8px;color:#051329;font-weight:700;font-size:12px;cursor:pointer;">
                ✅ Got It Right!
              </button>
            </div>
          </div>
        </div>
      `;

      document.getElementById('mv-close-btn').onclick = closeModal;

      if (hasOpts) {
        var optBtns = modal.querySelectorAll('.mv-opt-btn');
        optBtns.forEach(function (btn) {
          btn.onclick = function () {
            var selectedIdx = parseInt(btn.dataset.idx, 10);
            answered = true;
            document.getElementById('mv-solution-box').style.display = 'block';

            optBtns.forEach(function (b) {
              b.disabled = true;
              var bIdx = parseInt(b.dataset.idx, 10);
              if (bIdx === item.correctAnswer) {
                b.style.borderColor = '#06d6a0';
                b.style.background = 'rgba(6,214,160,0.15)';
              } else if (bIdx === selectedIdx) {
                b.style.borderColor = '#f43f5e';
                b.style.background = 'rgba(244,63,94,0.15)';
              }
            });
          };
        });
      }

      document.getElementById('mv-again-btn').onclick = function () {
        recordReviewResult(item.id, false);
        currentIdx++;
        renderView();
      };

      document.getElementById('mv-correct-btn').onclick = function () {
        var updated = recordReviewResult(item.id, true);
        if (updated && updated.isMastered && typeof window !== 'undefined' && window.LMToast) {
          window.LMToast.show('🎓 Question Mastered & Graduated from Weak Spots!', 'success');
        }
        currentIdx++;
        renderView();
      };
    }

    renderView();
    document.body.appendChild(modal);
  }

  return {
    getAll: getAll,
    getActive: getActive,
    getDue: getDue,
    getMastered: getMastered,
    getStats: getStats,
    logMistake: logMistake,
    recordReviewResult: recordReviewResult,
    removeMistake: removeMistake,
    clearAll: clearAll,
    updateHubBadge: updateHubBadge,
    showSprintModal: showSprintModal
  };
});
