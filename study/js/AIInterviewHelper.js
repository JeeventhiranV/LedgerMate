/**
 * LedgerMate Study Hub – AIInterviewHelper.js
 * ─────────────────────────────────────────────────────────────
 * AI Interview Coach, Complexity Analyzer & Behavioral STAR Assistant
 * Exposes: window.AIInterviewHelper
 * ─────────────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  function analyzeComplexity(codeText) {
    var hasNestedLoops = /for\s*\(.*for\s*\(|while\s*\(.*while\s*\(|for\s*\(.*while\s*\(/s.test(codeText);
    var hasSingleLoop = /for\s*\(|while\s*\(|\.forEach|\.map/s.test(codeText);
    var hasRecursion = /function\s+(\w+).*?\1\s*\(/s.test(codeText);
    var hasMapOrSet = /new\s+(Map|Set)|Object\.create|\[\s*\]/s.test(codeText);

    var timeComp = hasNestedLoops ? 'O(N²)' : hasSingleLoop ? 'O(N)' : hasRecursion ? 'O(2ⁿ) or O(log N)' : 'O(1)';
    var spaceComp = hasMapOrSet ? 'O(N)' : hasRecursion ? 'O(N) stack frames' : 'O(1)';

    return {
      time: timeComp,
      space: spaceComp,
      nested: hasNestedLoops,
      dataStructures: hasMapOrSet,
      recursive: hasRecursion
    };
  }

  function showHelperModal() {
    var existing = document.getElementById('study-ai-helper-modal');
    if (existing) existing.remove();

    var modal = document.createElement('div');
    modal.id = 'study-ai-helper-modal';
    modal.className = 'modal-overlay show';
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.85);z-index:99999;display:flex;align-items:center;justify-content:center;padding:12px;backdrop-filter:blur(6px);font-family:Inter,sans-serif;color:#e8eaf6;';

    modal.innerHTML = `
      <div style="background:#151922;border:1px solid #262f45;border-radius:18px;max-width:760px;width:100%;max-height:88vh;display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(0,0,0,.8);overflow:hidden;">
        <div style="padding:14px 18px;border-bottom:1px solid #262f45;display:flex;justify-content:space-between;align-items:center;background:#111420;flex-wrap:wrap;gap:8px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:18px;">🤖</span>
            <span style="font-size:14px;font-weight:700;">AI Interview Coach & Complexity Analyzer</span>
          </div>
          <button id="study-ai-close" style="background:none;border:none;color:#8896b8;font-size:22px;cursor:pointer;">&times;</button>
        </div>

        <!-- Mode Tabs -->
        <div style="display:flex;padding:10px 18px 0;gap:8px;background:#111420;border-bottom:1px solid #262f45;overflow-x:auto;-webkit-overflow-scrolling:touch;">
          <button id="study-ai-tab-algo" style="padding:8px 14px;background:#1a2030;border:1px solid #2d3650;border-bottom:none;border-radius:8px 8px 0 0;color:#e8eaf6;font-weight:600;font-size:12px;cursor:pointer;white-space:nowrap;">Algorithm Analyzer</button>
          <button id="study-ai-tab-star" style="padding:8px 14px;background:transparent;border:none;color:#8896b8;font-weight:600;font-size:12px;cursor:pointer;white-space:nowrap;">Behavioral STAR Coach</button>
        </div>

        <!-- Tab 1: Algorithm Analyzer -->
        <div id="study-ai-pane-algo" style="padding:16px 18px;flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:12px;-webkit-overflow-scrolling:touch;">
          <div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
              <label style="font-size:11px;font-weight:600;color:#8896b8;">Paste your code or algorithm solution:</label>
              <button id="study-ai-key-btn" style="background:none;border:none;color:#a78bfa;font-size:11px;cursor:pointer;text-decoration:underline;">⚙️ Set Gemini API Key</button>
            </div>
            <textarea id="study-ai-code-input" placeholder="function solve(arr) { ... }" style="width:100%;height:120px;background:#0d111a;border:1px solid #262f45;border-radius:10px;padding:10px;color:#e8eaf6;font-family:'JetBrains Mono',monospace;font-size:12px;outline:none;resize:vertical;"></textarea>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button id="study-ai-gemini-btn" style="padding:8px 16px;background:linear-gradient(135deg,#8b5cf6,#4f8ef7);border:none;border-radius:8px;color:#fff;font-weight:700;font-size:12px;cursor:pointer;">
              ✨ Explain with Gemini 1.5 Flash AI
            </button>
            <button id="study-ai-analyze-btn" style="padding:8px 14px;background:var(--surface,#1a2030);border:1px solid #2d3650;border-radius:8px;color:#e8eaf6;font-weight:600;font-size:12px;cursor:pointer;">
              ⚡ Offline Complexity Analyzer
            </button>
          </div>
          <div id="study-ai-algo-results" style="display:none;background:rgba(255,255,255,0.02);border:1px solid #262f45;border-radius:12px;padding:14px;"></div>
        </div>

        <!-- Tab 2: STAR Coach -->
        <div id="study-ai-pane-star" style="padding:16px 18px;flex:1;overflow-y:auto;display:none;flex-direction:column;gap:12px;-webkit-overflow-scrolling:touch;">
          <div style="font-size:11px;color:#8896b8;line-height:1.4;">
            Master behavioral interview questions using the <strong>STAR method</strong> (Situation, Task, Action, Result).
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:8px;">
            <div>
              <label style="font-size:10px;font-weight:600;color:#4f8ef7;">S - Situation</label>
              <textarea id="star-s" placeholder="Context or challenge..." style="width:100%;height:55px;background:#0d111a;border:1px solid #262f45;border-radius:8px;padding:6px;color:#e8eaf6;font-size:11px;"></textarea>
            </div>
            <div>
              <label style="font-size:10px;font-weight:600;color:#f59e0b;">T - Task</label>
              <textarea id="star-t" placeholder="Your specific responsibility..." style="width:100%;height:55px;background:#0d111a;border:1px solid #262f45;border-radius:8px;padding:6px;color:#e8eaf6;font-size:11px;"></textarea>
            </div>
            <div>
              <label style="font-size:10px;font-weight:600;color:#10b981;">A - Action</label>
              <textarea id="star-a" placeholder="What YOU specifically did..." style="width:100%;height:55px;background:#0d111a;border:1px solid #262f45;border-radius:8px;padding:6px;color:#e8eaf6;font-size:11px;"></textarea>
            </div>
            <div>
              <label style="font-size:10px;font-weight:600;color:#00d4b4;">R - Result</label>
              <textarea id="star-r" placeholder="Quantifiable outcome / metrics..." style="width:100%;height:55px;background:#0d111a;border:1px solid #262f45;border-radius:8px;padding:6px;color:#e8eaf6;font-size:11px;"></textarea>
            </div>
          </div>
          <button id="study-ai-star-btn" style="padding:8px 16px;background:linear-gradient(135deg,#10b981,#00d4b4);border:none;border-radius:8px;color:#000;font-weight:700;font-size:12px;cursor:pointer;align-self:flex-start;">
            Evaluate STAR Response
          </button>
          <div id="study-ai-star-results" style="display:none;background:rgba(16,185,129,0.06);border:1px solid rgba(16,185,129,0.3);border-radius:12px;padding:14px;"></div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    document.getElementById('study-ai-close').onclick = () => modal.remove();

    // API Key config prompt
    document.getElementById('study-ai-key-btn').onclick = function () {
      var cur = localStorage.getItem('gemini_api_key') || '';
      var entered = prompt('Enter your Google Gemini 1.5 Flash API Key (stored securely in localStorage):', cur);
      if (entered !== null) {
        localStorage.setItem('gemini_api_key', entered.trim());
        if (typeof showToast === 'function') showToast('Gemini API key updated!', 'success');
      }
    };

    var tabAlgo = document.getElementById('study-ai-tab-algo');
    var tabStar = document.getElementById('study-ai-tab-star');
    var paneAlgo = document.getElementById('study-ai-pane-algo');
    var paneStar = document.getElementById('study-ai-pane-star');

    tabAlgo.onclick = function () {
      tabAlgo.style.background = '#1a2030'; tabAlgo.style.color = '#e8eaf6';
      tabStar.style.background = 'transparent'; tabStar.style.color = '#8896b8';
      paneAlgo.style.display = 'flex'; paneStar.style.display = 'none';
    };

    tabStar.onclick = function () {
      tabStar.style.background = '#1a2030'; tabStar.style.color = '#e8eaf6';
      tabAlgo.style.background = 'transparent'; tabAlgo.style.color = '#8896b8';
      paneStar.style.display = 'flex'; paneAlgo.style.display = 'none';
    };

    // Analyze Algorithm with Gemini 1.5 Flash AI
    document.getElementById('study-ai-gemini-btn').onclick = async function () {
      var code = document.getElementById('study-ai-code-input').value.trim();
      var resBox = document.getElementById('study-ai-algo-results');
      if (!code) {
        if (typeof showToast === 'function') showToast('Please paste code first.', 'warning');
        return;
      }

      var apiKey = localStorage.getItem('gemini_api_key') || '';
      resBox.style.display = 'block';
      resBox.innerHTML = '<div style="color:#a78bfa;font-size:12px;">🧠 Querying Gemini 1.5 Flash AI model...</div>';

      if (!apiKey) {
        // Fallback to offline analysis if no API key
        var analysis = analyzeComplexity(code);
        resBox.innerHTML = `
          <div style="background:rgba(139,92,246,0.1);border:1px solid #8b5cf6;border-radius:8px;padding:8px 12px;margin-bottom:10px;font-size:11px;color:#a78bfa;">
            💡 Tip: Set your Google Gemini API Key via top button for line-by-line AI tutor breakdown. Using offline analyzer:
          </div>
          <h4 style="font-size:13px;font-weight:700;margin-bottom:10px;color:#4f8ef7;">📊 Solution Complexity Analysis</h4>
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(130px, 1fr));gap:10px;margin-bottom:12px;">
            <div style="background:rgba(0,0,0,.3);padding:8px 12px;border-radius:8px;">
              <div style="font-size:10px;color:#8896b8;">Time Complexity</div>
              <div style="font-size:16px;font-weight:800;color:#10b981;font-family:monospace;">${analysis.time}</div>
            </div>
            <div style="background:rgba(0,0,0,.3);padding:8px 12px;border-radius:8px;">
              <div style="font-size:10px;color:#8896b8;">Auxiliary Space</div>
              <div style="font-size:16px;font-weight:800;color:#00d4b4;font-family:monospace;">${analysis.space}</div>
            </div>
          </div>
        `;
        return;
      }

      try {
        var endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        var promptText = `You are a Principal Software Engineer conducting a FAANG coding interview. Analyze this code:\n\`\`\`\n${code}\n\`\`\`\nProvide:
1. Exact Time and Space Complexity with Big-O notation.
2. Line-by-line explanation of the algorithm logic.
3. Edge cases and potential bugs.
4. Optimization suggestions. Keep it crisp, readable and structured in HTML format.`;

        var response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }]
          })
        });

        if (!response.ok) throw new Error('API error ' + response.status);
        var json = await response.json();
        var reply = json?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response from model';

        var formatted = reply
          .replace(/```html/g, '').replace(/```/g, '')
          .replace(/## (.*?)\n/g, '<h4 style="color:#4f8ef7;margin:10px 0 4px;">$1</h4>')
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\n/g, '<br/>');

        resBox.innerHTML = `
          <div style="font-size:12px;color:#10b981;font-weight:700;margin-bottom:8px;">✨ Gemini 1.5 Flash Evaluation</div>
          <div style="font-size:12px;color:#e8eaf6;line-height:1.6;">${formatted}</div>
        `;
      } catch (err) {
        console.warn('[AIInterviewHelper] Gemini call failed, using offline heuristics:', err);
        var analysis2 = analyzeComplexity(code);
        resBox.innerHTML = `
          <div style="color:#ef4444;font-size:11px;margin-bottom:8px;">⚠️ Gemini API call failed (${err.message}). Showing offline analysis:</div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(130px, 1fr));gap:10px;">
            <div style="background:rgba(0,0,0,.3);padding:8px 12px;border-radius:8px;">
              <div style="font-size:10px;color:#8896b8;">Time Complexity</div>
              <div style="font-size:16px;font-weight:800;color:#10b981;font-family:monospace;">${analysis2.time}</div>
            </div>
            <div style="background:rgba(0,0,0,.3);padding:8px 12px;border-radius:8px;">
              <div style="font-size:10px;color:#8896b8;">Auxiliary Space</div>
              <div style="font-size:16px;font-weight:800;color:#00d4b4;font-family:monospace;">${analysis2.space}</div>
            <div style="margin-top:10px;font-size:11px;color:#cbd5e1;">
              <strong>Edge Cases to Check in Interview:</strong>
              <ul style="margin:4px 0 0 16px;color:#8896b8;">
                <li>Empty input array or length &lt; 2</li>
                <li>Duplicate elements / negative numbers / overflow</li>
                <li>Single element corner cases &amp; boundary limits</li>
              </ul>
            </div>
          `;
        }
      };

    // Evaluate STAR
    document.getElementById('study-ai-star-btn').onclick = function () {
      var s = document.getElementById('star-s').value.trim();
      var t = document.getElementById('star-t').value.trim();
      var a = document.getElementById('star-a').value.trim();
      var r = document.getElementById('star-r').value.trim();
      var resBox = document.getElementById('study-ai-star-results');

      var score = (s ? 25 : 0) + (t ? 25 : 0) + (a ? 25 : 0) + (r ? 25 : 0);
      resBox.style.display = 'block';
      resBox.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <strong style="color:#10b981;font-size:14px;">STAR Completeness Score: ${score}%</strong>
          <span style="font-size:12px;color:#8896b8;">${score === 100 ? '⭐ Excellent Structure' : '⚠️ Missing Pillars'}</span>
        </div>
        <p style="font-size:12px;color:#e8eaf6;line-height:1.5;">
          ${score === 100
            ? 'Great job! Your answer clearly distinguishes context (Situation), responsibility (Task), personal contribution (Action), and measurable impact (Result).'
            : 'Make sure to fill in all 4 pillars. Highlight quantifiable metrics in the Result section (e.g., "reduced latency by 40%").'}
        </p>
      `;
    };
  }

  window.AIInterviewHelper = {
    showModal: showHelperModal,
    analyzeComplexity: analyzeComplexity
  };

  console.log('[StudyHub] AIInterviewHelper module initialized.');
})();
