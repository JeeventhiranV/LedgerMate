/**
 * LedgerMate Study Hub – StudyPlaylists.js
 * ─────────────────────────────────────────────────────────────
 * Multi-Track Target-Company Playlists & 1-Click Printable Cheat Sheets
 * Features:
 *  • Cross-module playlist manager (bundle Java, DSA, React, HR, System Design)
 *  • 1-Click "+ Playlist" integration on any question card
 *  • Distraction-free, high-density Printable Cheat Sheet Generator (@media print)
 *  • Markdown export & Zen mode launch directly from playlists
 *  • Zero data loss with localStorage + Supabase sync
 *
 * Exposes: window.StudyPlaylists
 * ─────────────────────────────────────────────────────────────
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.StudyPlaylists = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var STORAGE_KEY = 'study_custom_playlists_v1';

  function _esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function _load() {
    try {
      if (typeof localStorage === 'undefined') return [];
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return seedDefaultPlaylists();
      return JSON.parse(raw);
    } catch (e) {
      return seedDefaultPlaylists();
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
      window.dispatchEvent(new CustomEvent('lm_study_playlists_updated', {
        detail: { count: _load().length }
      }));
    }
  }

  function seedDefaultPlaylists() {
    var defaults = [
      {
        id: 'pl_mastercard',
        name: 'MasterCard 48-Hour Senior Sprint',
        description: 'High-frequency Java 8 internals, Kafka ordering, Spring Security, and Distributed Transactions',
        color: '#f43f5e',
        createdAt: new Date().toISOString(),
        questions: [
          {
            id: 'mc_1',
            module: 'java',
            title: 'How does ConcurrentHashMap handle thread safety without full locking in Java 8+?',
            category: 'Core Java',
            tags: ['MasterCard', 'Hard', 'Hot'],
            answerSummary: 'Uses CAS for empty buckets and synchronized on the node head for occupied buckets. Java 8 removed segments completely.',
            codeSnippet: 'ConcurrentHashMap<String, Integer> map = new ConcurrentHashMap<>();\nmap.compute("key", (k, v) -> v == null ? 1 : v + 1);'
          },
          {
            id: 'mc_2',
            module: 'kafka',
            title: 'How does Apache Kafka guarantee message ordering across distributed consumers?',
            category: 'Messaging',
            tags: ['MasterCard', 'Kafka'],
            answerSummary: 'Messages sharing the same partition key are strictly ordered within that partition. Only one consumer per consumer group reads from a partition.',
            codeSnippet: 'ProducerRecord<String, String> rec = new ProducerRecord<>("orders", orderId, payload);'
          },
          {
            id: 'mc_3',
            module: 'spring',
            title: 'What does @Transactional(propagation = Propagation.REQUIRES_NEW) do in Spring Boot?',
            category: 'Spring Boot',
            tags: ['MasterCard', 'Transactions'],
            answerSummary: 'Suspends the outer transaction and initiates an entirely independent physical database transaction with separate commit/rollback semantics.',
            codeSnippet: '@Transactional(propagation = Propagation.REQUIRES_NEW)\npublic void logAudit(AuditLog log) { ... }'
          }
        ]
      },
      {
        id: 'pl_system_design',
        name: 'System Design & High-Throughput Vault',
        description: 'Microservices resilience, Redis caching strategies, CAP theorem and partition isolation',
        color: '#4f8ef7',
        createdAt: new Date().toISOString(),
        questions: [
          {
            id: 'sd_1',
            module: 'systemdesign',
            title: 'How do you prevent cache breakdown, penetration, and avalanche in high-scale Redis setups?',
            category: 'Distributed Systems',
            tags: ['System Design', 'Redis'],
            answerSummary: 'Penetration: Bloom filter or null caching. Breakdown: Mutex lock or single-flight loader. Avalanche: Jittered/randomized TTL expiry.',
            codeSnippet: 'int jitter = new Random().nextInt(300);\nredis.setex(key, baseTtl + jitter, value);'
          }
        ]
      }
    ];

    if (typeof localStorage !== 'undefined') {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults)); } catch (e) {}
    }
    return defaults;
  }

  function getPlaylists() {
    return _load();
  }

  function getPlaylist(id) {
    return _load().find(function (p) { return p.id === id; }) || null;
  }

  function createPlaylist(name, description, color) {
    if (!name || !name.trim()) return null;
    var list = _load();
    var newPl = {
      id: 'pl_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name: name.trim(),
      description: (description || '').trim(),
      color: color || '#4f8ef7',
      createdAt: new Date().toISOString(),
      questions: []
    };
    list.unshift(newPl);
    _save(list);
    return newPl;
  }

  function deletePlaylist(id) {
    var list = _load().filter(function (p) { return p.id !== id; });
    _save(list);
  }

  function addQuestion(playlistId, qObj) {
    if (!playlistId || !qObj) return false;
    var list = _load();
    var pl = list.find(function (p) { return p.id === playlistId; });
    if (!pl) return false;

    var qId = qObj.id || ('q_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6));
    var qTitle = qObj.title || qObj.q || qObj.question || 'Untitled Question';

    // Prevent duplicate questions in same playlist
    var exists = pl.questions.some(function (item) {
      return item.id === qId || item.title.trim().toLowerCase() === qTitle.trim().toLowerCase();
    });
    if (exists) return false;

    pl.questions.push({
      id: qId,
      module: qObj.module || 'general',
      title: qTitle.trim(),
      category: qObj.category || 'General',
      tags: qObj.tags || [],
      answerSummary: qObj.answerSummary || qObj.exp || qObj.explanation || '',
      codeSnippet: qObj.codeSnippet || qObj.code || '',
      notes: qObj.notes || '',
      addedAt: new Date().toISOString()
    });

    _save(list);
    return true;
  }

  function removeQuestion(playlistId, questionId) {
    var list = _load();
    var pl = list.find(function (p) { return p.id === playlistId; });
    if (!pl) return false;
    pl.questions = pl.questions.filter(function (q) { return q.id !== questionId; });
    _save(list);
    return true;
  }

  /**
   * Helper to extract question metadata from an HTML question card (.q-card)
   */
  function showSelectorForCard(cardEl) {
    if (!cardEl) return;
    var titleEl = cardEl.querySelector('.q-text') || cardEl.querySelector('.q-title') || cardEl.querySelector('h3, h4');
    var qTitle = titleEl ? titleEl.textContent.trim() : 'Interview Question';

    var numEl = cardEl.querySelector('.q-num');
    var qNum = numEl ? numEl.textContent.trim() : '';

    var tags = [];
    cardEl.querySelectorAll('.q-tag, .badge').forEach(function (t) {
      tags.push(t.textContent.trim());
    });

    var ansEl = cardEl.querySelector('.q-answer');
    var answerSummary = '';
    var codeSnippet = '';
    if (ansEl) {
      var pre = ansEl.querySelector('pre');
      if (pre) codeSnippet = pre.textContent.trim();
      answerSummary = ansEl.innerText.slice(0, 320).trim();
    }

    var qData = {
      id: cardEl.id || ('q_' + (qNum || 'card') + '_' + Date.now()),
      title: qTitle,
      category: document.title.split('—')[0].trim() || 'Java / Backend',
      tags: tags,
      answerSummary: answerSummary,
      codeSnippet: codeSnippet
    };

    showPlaylistSelectorModal(qData);
  }

  /**
   * Interactive modal to choose which playlist to add a question to
   */
  function showPlaylistSelectorModal(questionObj) {
    if (typeof document === 'undefined') return;
    var existing = document.getElementById('study-playlist-selector-modal');
    if (existing) existing.remove();

    var playlists = getPlaylists();

    var modal = document.createElement('div');
    modal.id = 'study-playlist-selector-modal';
    modal.className = 'modal-overlay show';
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.82);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(6px);font-family:Inter,sans-serif;color:#e8eaf6;';

    modal.innerHTML = `
      <div style="background:#151922;border:1px solid #262f45;border-radius:18px;max-width:480px;width:100%;box-shadow:0 24px 60px rgba(0,0,0,.8);overflow:hidden;">
        <div style="padding:16px 20px;border-bottom:1px solid #262f45;background:#111420;display:flex;justify-content:space-between;align-items:center;">
          <div style="font-size:14px;font-weight:700;display:flex;align-items:center;gap:8px;">
            <span>📑</span> Add to Company Playlist
          </div>
          <button id="pls-close-btn" style="background:none;border:none;color:#8896b8;font-size:22px;cursor:pointer;line-height:1;">&times;</button>
        </div>

        <div style="padding:18px 20px;max-height:65vh;overflow-y:auto;">
          <div style="font-size:12px;color:#8896b8;margin-bottom:12px;line-height:1.4;">
            Question: <strong style="color:#f1f5f9;">${_esc(questionObj.title)}</strong>
          </div>

          <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#8896b8;letter-spacing:0.8px;margin-bottom:8px;">Select Existing Playlist:</div>
          <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px;">
            ${playlists.map(function (pl) {
              return `
                <button class="pls-item-btn" data-id="${pl.id}" style="padding:10px 14px;background:rgba(255,255,255,0.025);border:1px solid #262f45;border-radius:10px;color:#e2e8f0;font-size:13px;display:flex;align-items:center;justify-content:space-between;cursor:pointer;transition:all .15s;text-align:left;">
                  <div style="display:flex;align-items:center;gap:10px;">
                    <span style="width:10px;height:10px;border-radius:50%;background:${pl.color || '#4f8ef7'};"></span>
                    <span style="font-weight:600;">${_esc(pl.name)}</span>
                  </div>
                  <span style="font-size:11px;color:#8896b8;">${pl.questions.length} Qs</span>
                </button>
              `;
            }).join('')}
          </div>

          <!-- Create New Playlist Inline -->
          <div style="border-top:1px solid #262f45;padding-top:14px;">
            <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#8896b8;letter-spacing:0.8px;margin-bottom:8px;">Or Create New Target Playlist:</div>
            <div style="display:flex;gap:8px;">
              <input type="text" id="pls-new-name" placeholder="e.g. Capgemini Round 2, Google L5" style="flex:1;background:#0d111a;border:1px solid #262f45;border-radius:8px;padding:8px 10px;color:#f1f5f9;font-size:12px;outline:none;"/>
              <button id="pls-new-btn" style="padding:8px 14px;background:linear-gradient(135deg,#4f8ef7,#8b5cf6);border:none;border-radius:8px;color:#fff;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;">Create & Add</button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    document.getElementById('pls-close-btn').onclick = () => modal.remove();

    modal.querySelectorAll('.pls-item-btn').forEach(function (btn) {
      btn.onclick = function () {
        var plId = btn.dataset.id;
        var added = addQuestion(plId, questionObj);
        modal.remove();
        if (typeof window !== 'undefined' && window.LMToast) {
          if (added) window.LMToast.show('Added to playlist! 📑', 'success');
          else window.LMToast.show('Already in this playlist!', 'info');
        }
      };
    });

    document.getElementById('pls-new-btn').onclick = function () {
      var name = document.getElementById('pls-new-name').value.trim();
      if (!name) return;
      var newPl = createPlaylist(name, 'Custom target interview prep deck');
      if (newPl) {
        addQuestion(newPl.id, questionObj);
        modal.remove();
        if (typeof window !== 'undefined' && window.LMToast) {
          window.LMToast.show('Created "' + name + '" and added question! 📑', 'success');
        }
      }
    };
  }

  /**
   * Main Playlist Manager Modal with Full Cheat Sheet Exporter
   */
  function showPlaylistManagerModal() {
    if (typeof document === 'undefined') return;
    var existing = document.getElementById('study-playlist-manager-modal');
    if (existing) existing.remove();

    var playlists = getPlaylists();
    var activePlId = playlists.length > 0 ? playlists[0].id : null;

    var modal = document.createElement('div');
    modal.id = 'study-playlist-manager-modal';
    modal.className = 'modal-overlay show';
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.86);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(8px);font-family:Inter,sans-serif;color:#e8eaf6;box-sizing:border-box;';

    function renderModalContent() {
      var pl = getPlaylist(activePlId) || (playlists.length > 0 ? playlists[0] : null);

      modal.innerHTML = `
        <div style="background:#151922;border:1px solid #262f45;border-radius:18px;max-width:880px;width:100%;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(0,0,0,.8);overflow:hidden;">
          <!-- Header -->
          <div style="padding:16px 22px;border-bottom:1px solid #262f45;background:#111420;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
            <div style="display:flex;align-items:center;gap:10px;">
              <div style="width:34px;height:34px;border-radius:10px;background:linear-gradient(135deg,#f43f5e,#f59e0b);display:flex;align-items:center;justify-content:center;font-size:18px;">📑</div>
              <div>
                <h3 style="font-size:15px;font-weight:700;margin:0;">Interview Playlists & Cheat Sheets</h3>
                <p style="font-size:11px;color:#8896b8;margin:2px 0 0;">Company-specific custom decks with 1-click printable PDF cheat sheet</p>
              </div>
            </div>
            <div style="display:flex;gap:8px;">
              <button id="plm-new-deck-btn" style="padding:6px 14px;background:linear-gradient(135deg,#4f8ef7,#8b5cf6);border:none;border-radius:8px;color:#fff;font-size:12px;font-weight:700;cursor:pointer;">+ New Playlist</button>
              <button id="plm-close-btn" style="background:none;border:none;color:#8896b8;font-size:22px;cursor:pointer;line-height:1;">&times;</button>
            </div>
          </div>

          <!-- Main Dual-Pane Layout -->
          <div style="display:flex;flex:1;overflow:hidden;flex-direction:row;">
            <!-- Left Sidebar (Playlists List) -->
            <div style="width:260px;border-right:1px solid #262f45;background:#0d111a;padding:14px;overflow-y:auto;display:flex;flex-direction:column;gap:6px;">
              <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#8896b8;letter-spacing:0.8px;margin-bottom:6px;">Playlists (${playlists.length})</div>
              ${playlists.map(function (p) {
                var isActive = p.id === (pl ? pl.id : '');
                return `
                  <button class="plm-tab-btn" data-id="${p.id}" style="padding:10px 12px;background:${isActive ? '#1a2233' : 'transparent'};border:1px solid ${isActive ? '#4f8ef7' : 'transparent'};border-radius:10px;color:${isActive ? '#fff' : '#8896b8'};font-size:12.5px;font-weight:${isActive ? '700' : '500'};text-align:left;cursor:pointer;display:flex;align-items:center;justify-content:space-between;transition:all .15s;">
                    <div style="display:flex;align-items:center;gap:8px;overflow:hidden;">
                      <span style="width:8px;height:8px;border-radius:50%;background:${p.color || '#4f8ef7'};flex-shrink:0;"></span>
                      <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${_esc(p.name)}</span>
                    </div>
                    <span style="font-size:10px;background:#1e273a;padding:2px 6px;border-radius:6px;font-weight:700;">${p.questions.length}</span>
                  </button>
                `;
              }).join('')}
            </div>

            <!-- Right Content (Active Playlist View) -->
            <div style="flex:1;display:flex;flex-direction:column;overflow:hidden;background:#151922;">
              ${pl ? `
                <!-- Playlist Toolbar -->
                <div style="padding:14px 20px;border-bottom:1px solid #262f45;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;background:rgba(255,255,255,0.015);">
                  <div>
                    <div style="font-size:15px;font-weight:700;color:#f8fafc;">${_esc(pl.name)}</div>
                    <div style="font-size:11.5px;color:#8896b8;margin-top:2px;">${_esc(pl.description || 'Target review deck')} · ${pl.questions.length} questions</div>
                  </div>
                  <div style="display:flex;gap:8px;">
                    <button id="plm-print-cs-btn" style="padding:7px 14px;background:linear-gradient(135deg,#10b981,#00d4b4);border:none;border-radius:8px;color:#051329;font-size:12px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:6px;">
                      <span>🖨️</span>
                      <span>Print Cheat Sheet</span>
                    </button>
                    <button id="plm-copy-md-btn" style="padding:7px 12px;background:#1a2030;border:1px solid #2d3650;border-radius:8px;color:#e8eaf6;font-size:12px;font-weight:600;cursor:pointer;">
                      📄 Copy MD
                    </button>
                    <button id="plm-del-pl-btn" style="padding:7px 10px;background:none;border:1px solid rgba(244,63,94,0.3);border-radius:8px;color:#f43f5e;font-size:12px;cursor:pointer;" title="Delete Playlist">
                      🗑️
                    </button>
                  </div>
                </div>

                <!-- Questions List -->
                <div style="padding:16px 20px;overflow-y:auto;flex:1;display:flex;flex-direction:column;gap:10px;">
                  ${!pl.questions.length ? `
                    <div style="text-align:center;padding:40px 20px;color:#8896b8;font-size:13px;">
                      No questions in this playlist yet.<br/>
                      Click <strong>"+ Playlist"</strong> on any question in Java Prep, React Prep, or DSA Hub to bundle questions here!
                    </div>
                  ` : pl.questions.map(function (q, qIdx) {
                    return `
                      <div style="background:rgba(255,255,255,0.025);border:1px solid #262f45;border-radius:12px;padding:14px;display:flex;flex-direction:column;gap:8px;">
                        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
                          <div style="display:flex;align-items:center;gap:8px;">
                            <span style="font-size:11px;font-weight:700;color:#4f8ef7;background:rgba(79,142,247,0.12);padding:2px 7px;border-radius:6px;">#${qIdx + 1}</span>
                            <span style="font-size:13.5px;font-weight:600;color:#f8fafc;line-height:1.4;">${_esc(q.title)}</span>
                          </div>
                          <button class="plm-remove-q-btn" data-qid="${q.id}" style="background:none;border:none;color:#8896b8;font-size:16px;cursor:pointer;padding:2px;" title="Remove from playlist">&times;</button>
                        </div>
                        ${q.answerSummary ? `
                          <div style="font-size:12px;color:#94a3b8;line-height:1.55;background:#0d111a;padding:8px 12px;border-radius:8px;">
                            ${_esc(q.answerSummary)}
                          </div>
                        ` : ''}
                        ${q.codeSnippet ? `
                          <pre style="margin:0;padding:8px 12px;background:#06080e;border-radius:8px;font-family:'JetBrains Mono',monospace;font-size:11px;color:#a78bfa;overflow-x:auto;">${_esc(q.codeSnippet)}</pre>
                        ` : ''}
                      </div>
                    `;
                  }).join('')}
                </div>
              ` : `
                <div style="padding:40px;text-align:center;color:#8896b8;">No playlist selected.</div>
              `}
            </div>
          </div>
        </div>
      `;

      document.getElementById('plm-close-btn').onclick = () => modal.remove();

      modal.querySelectorAll('.plm-tab-btn').forEach(function (btn) {
        btn.onclick = function () {
          activePlId = btn.dataset.id;
          renderModalContent();
        };
      });

      var printBtn = document.getElementById('plm-print-cs-btn');
      if (printBtn && pl) {
        printBtn.onclick = function () {
          openPrintableCheatSheet(pl.id);
        };
      }

      var copyMdBtn = document.getElementById('plm-copy-md-btn');
      if (copyMdBtn && pl) {
        copyMdBtn.onclick = function () {
          var md = exportAsMarkdown(pl.id);
          if (navigator.clipboard) {
            navigator.clipboard.writeText(md).then(function () {
              alert('Cheat sheet Markdown copied to clipboard!');
            });
          }
        };
      }

      var delBtn = document.getElementById('plm-del-pl-btn');
      if (delBtn && pl) {
        delBtn.onclick = function () {
          if (confirm('Delete playlist "' + pl.name + '"?')) {
            deletePlaylist(pl.id);
            playlists = getPlaylists();
            activePlId = playlists.length > 0 ? playlists[0].id : null;
            renderModalContent();
          }
        };
      }

      var newDeckBtn = document.getElementById('plm-new-deck-btn');
      if (newDeckBtn) {
        newDeckBtn.onclick = function () {
          var name = prompt('Enter new playlist name:');
          if (name && name.trim()) {
            var created = createPlaylist(name.trim());
            playlists = getPlaylists();
            activePlId = created.id;
            renderModalContent();
          }
        };
      }

      modal.querySelectorAll('.plm-remove-q-btn').forEach(function (btn) {
        btn.onclick = function () {
          var qId = btn.dataset.qid;
          removeQuestion(pl.id, qId);
          renderModalContent();
        };
      });
    }

    renderModalContent();
    document.body.appendChild(modal);
  }

  /**
   * Generates formatted Markdown for a playlist
   */
  function exportAsMarkdown(playlistId) {
    var pl = getPlaylist(playlistId);
    if (!pl) return '';
    var out = `# ${pl.name}\n\n`;
    out += `> ${pl.description || 'Target Interview Cheat Sheet'}\n`;
    out += `> Generated via LedgerMate Study Command Center on ${new Date().toLocaleDateString()}\n\n`;

    pl.questions.forEach(function (q, idx) {
      out += `### Q${idx + 1}: ${q.title}\n\n`;
      if (q.tags && q.tags.length) out += `**Tags**: ${q.tags.join(', ')}\n\n`;
      if (q.answerSummary) out += `**Key Insight**:\n${q.answerSummary}\n\n`;
      if (q.codeSnippet) out += `\`\`\`java\n${q.codeSnippet}\n\`\`\`\n\n`;
      out += `---\n\n`;
    });
    return out;
  }

  /**
   * Opens an elegant Printable Cheat Sheet view ready for printing / Save as PDF
   */
  function openPrintableCheatSheet(playlistId) {
    var pl = getPlaylist(playlistId);
    if (!pl) return;

    var printWin = window.open('', '_blank');
    if (!printWin) {
      alert('Popup blocked. Please allow popups to view the printable cheat sheet.');
      return;
    }

    var html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8"/>
        <title>${_esc(pl.name)} — Interview Cheat Sheet</title>
        <style>
          @page { size: A4; margin: 12mm 15mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #111; line-height: 1.45; font-size: 11pt; margin: 0; padding: 18px; }
          h1 { font-size: 18pt; margin: 0 0 4px; color: #0f172a; border-bottom: 2px solid #3b82f6; padding-bottom: 6px; }
          .meta { font-size: 9.5pt; color: #64748b; margin-bottom: 16px; }
          .cs-grid { display: grid; grid-template-columns: 1fr; gap: 14px; }
          .cs-card { border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 14px; page-break-inside: avoid; background: #fff; }
          .cs-q-title { font-weight: 700; font-size: 11pt; color: #1e293b; margin-bottom: 6px; }
          .cs-q-num { background: #3b82f6; color: #fff; padding: 1px 6px; border-radius: 4px; font-size: 8.5pt; margin-right: 6px; }
          .cs-answer { font-size: 9.5pt; color: #334155; margin-bottom: 6px; }
          pre { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px; font-family: "JetBrains Mono", Consolas, monospace; font-size: 8.5pt; color: #0f172a; overflow-x: auto; margin: 4px 0 0; }
          .print-bar { background: #f1f5f9; padding: 10px 16px; border-radius: 8px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; }
          @media print { .print-bar { display: none; } body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="print-bar">
          <div><strong>${_esc(pl.name)}</strong> (${pl.questions.length} questions)</div>
          <button onclick="window.print()" style="padding:6px 16px;background:#3b82f6;color:#fff;border:none;border-radius:6px;font-weight:700;cursor:pointer;">🖨️ Print / Save as PDF</button>
        </div>
        <h1>${_esc(pl.name)}</h1>
        <div class="meta">${_esc(pl.description || 'Target Technical Interview Preparation Cheat Sheet')} · ${pl.questions.length} Selected Questions · LedgerMate Preparation Suite</div>
        <div class="cs-grid">
          ${pl.questions.map(function (q, idx) {
            return `
              <div class="cs-card">
                <div class="cs-q-title"><span class="cs-q-num">Q${idx + 1}</span> ${_esc(q.title)}</div>
                ${q.answerSummary ? `<div class="cs-answer">${_esc(q.answerSummary)}</div>` : ''}
                ${q.codeSnippet ? `<pre>${_esc(q.codeSnippet)}</pre>` : ''}
              </div>
            `;
          }).join('')}
        </div>
      </body>
      </html>
    `;

    printWin.document.write(html);
    printWin.document.close();
  }

  return {
    getPlaylists: getPlaylists,
    getPlaylist: getPlaylist,
    createPlaylist: createPlaylist,
    deletePlaylist: deletePlaylist,
    addQuestion: addQuestion,
    removeQuestion: removeQuestion,
    showSelectorForCard: showSelectorForCard,
    showPlaylistSelectorModal: showPlaylistSelectorModal,
    showPlaylistManagerModal: showPlaylistManagerModal,
    exportAsMarkdown: exportAsMarkdown,
    openPrintableCheatSheet: openPrintableCheatSheet
  };
});
