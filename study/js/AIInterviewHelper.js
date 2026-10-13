/**
 * LedgerMate Study Hub – AIInterviewHelper.js
 * ─────────────────────────────────────────────────────────────
 * Voice-Powered AI Mock Interviewer, Speech Coach & Complexity Analyzer
 * Features:
 *  • Web Speech API (SpeechRecognition / webkitSpeechRecognition) live transcription
 *  • Text-to-Speech Examiner Voice (speechSynthesis)
 *  • Real-time Speech Analytics: Words Per Minute (WPM) & Filler Word Counter ("um", "like", "basically")
 *  • Dual Evaluation Engine: Google Gemini 1.5 Flash AI + Offline Heuristic Rubric
 *  • Behavioral STAR Methodology Coach & Code Complexity Analyzer
 *  • 1-Click Transcript & Feedback Export
 *
 * Exposes: window.AIInterviewHelper
 * ─────────────────────────────────────────────────────────────
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.AIInterviewHelper = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ── Preset Interview Questions ──────────────────────────────────────────
  var INTERVIEW_PRESETS = [
    {
      id: 'p1',
      category: 'System Architecture',
      q: 'How does Apache Kafka guarantee message ordering across distributed consumers?',
      idealKeypoints: ['partitions', 'partition key', 'single consumer per partition in group', 'offset tracking', 'rebalancing']
    },
    {
      id: 'p2',
      category: 'Java & Concurrency',
      q: 'How does ConcurrentHashMap scale concurrent writes without locking the entire table in Java 8+?',
      idealKeypoints: ['CAS Compare-And-Swap', 'bucket-level synchronized on node head', 'volatile array', 'no segment locking']
    },
    {
      id: 'p3',
      category: 'Behavioral STAR',
      q: 'Tell me about a time you handled a critical production incident or major system outage.',
      idealKeypoints: ['situation and severity', 'triage and mitigation', 'root cause analysis RCA', 'post-mortem action items']
    },
    {
      id: 'p4',
      category: 'Behavioral STAR',
      q: 'Describe a disagreement with a team member or architect on technical design and how you reached consensus.',
      idealKeypoints: ['technical disagreement context', 'objective data/benchmarks', 'constructive compromise', 'successful delivery']
    },
    {
      id: 'p5',
      category: 'Data & Scaling',
      q: 'How do you prevent cache breakdown, penetration, and avalanche in high-throughput Redis setups?',
      idealKeypoints: ['mutex lock', 'bloom filter', 'randomized TTL expiry jitter', 'circuit breaking']
    }
  ];

  // ── Filler Words Pattern ────────────────────────────────────────────────
  var FILLER_REGEX = /\b(um|uh|er|ah|like|basically|actually|you know|sort of|kind of|i mean)\b/gi;

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

  /**
   * Real-time Speech Metrics (WPM, Filler Words, Conciseness)
   */
  function analyzeSpeechMetrics(transcript, durationSeconds) {
    var cleanText = (transcript || '').trim();
    if (!cleanText) {
      return {
        wordCount: 0,
        wpm: 0,
        pacingQuality: 'neutral',
        pacingLabel: 'No speech detected',
        fillerCount: 0,
        fillersFound: {},
        fillerPercentage: 0
      };
    }

    var words = cleanText.split(/\s+/).filter(Boolean);
    var wordCount = words.length;
    var durationMins = Math.max(durationSeconds || 1, 1) / 60;
    var wpm = Math.round(wordCount / durationMins);

    var pacingQuality = 'optimal';
    var pacingLabel = 'Optimal Pacing (120–150 WPM)';
    if (wpm < 100) {
      pacingQuality = 'slow';
      pacingLabel = 'Deliberate / Slow Pace (<100 WPM)';
    } else if (wpm > 170) {
      pacingQuality = 'fast';
      pacingLabel = 'Too Fast (>170 WPM) — Pause between points';
    }

    var matches = cleanText.match(FILLER_REGEX) || [];
    var fillersFound = {};
    matches.forEach(function (f) {
      var k = f.toLowerCase();
      fillersFound[k] = (fillersFound[k] || 0) + 1;
    });

    var fillerCount = matches.length;
    var fillerPct = wordCount > 0 ? Number(((fillerCount / wordCount) * 100).toFixed(1)) : 0;

    return {
      wordCount: wordCount,
      wpm: wpm,
      pacingQuality: pacingQuality,
      pacingLabel: pacingLabel,
      fillerCount: fillerCount,
      fillersFound: fillersFound,
      fillerPercentage: fillerPct
    };
  }

  /**
   * Offline Heuristic Evaluation for STAR and Technical Questions
   */
  function evaluateResponseOffline(question, transcript, durationSecs) {
    var metrics = analyzeSpeechMetrics(transcript, durationSecs);
    var text = transcript.toLowerCase();

    // Check STAR structure
    var hasSituation = /situation|context|problem|background|scenario|at my previous|project/i.test(text);
    var hasTask = /task|responsibility|goal|assigned|objective|challenge|needed to/i.test(text);
    var hasAction = /action|implemented|created|designed|optimized|refactored|wrote|led|executed|fixed/i.test(text);
    var hasResult = /result|outcome|impact|reduced|increased|improved|latency|saved|achieved|%/i.test(text);

    var starScore = (hasSituation ? 25 : 0) + (hasTask ? 25 : 0) + (hasAction ? 25 : 0) + (hasResult ? 25 : 0);

    // Delivery score (0 to 10)
    var deliveryScore = 10;
    if (metrics.fillerCount > 5) deliveryScore -= 3;
    else if (metrics.fillerCount > 2) deliveryScore -= 1.5;
    if (metrics.pacingQuality !== 'optimal') deliveryScore -= 1.5;
    if (metrics.wordCount < 40) deliveryScore -= 2;
    deliveryScore = Math.max(1, Math.min(10, Number(deliveryScore.toFixed(1))));

    // Content score (0 to 10)
    var contentScore = 5;
    if (metrics.wordCount >= 60) contentScore += 2;
    if (starScore >= 75) contentScore += 2;
    if (/\b(architecture|performance|database|distributed|thread|scale|metric|commit)\b/i.test(text)) contentScore += 1;
    contentScore = Math.max(1, Math.min(10, contentScore));

    var overallScore = Number(((contentScore * 0.6) + (deliveryScore * 0.4)).toFixed(1));

    return {
      overallScore: overallScore,
      contentScore: contentScore,
      deliveryScore: deliveryScore,
      starCompletenessPct: starScore,
      metrics: metrics,
      breakdown: {
        situation: hasSituation,
        task: hasTask,
        action: hasAction,
        result: hasResult
      },
      tips: [
        metrics.fillerCount > 3 ? 'Reduce verbal crutches (' + Object.keys(metrics.fillersFound).join(', ') + ') by pausing instead of speaking during pauses.' : 'Clean verbal flow with minimal filler words.',
        hasResult ? 'Good inclusion of measurable outcomes and business impact.' : 'Strengthen your Result section with quantifiable metrics (e.g. "% improvement", "ms latency reduction").',
        metrics.pacingQuality === 'fast' ? 'Slow down your delivery slightly to allow the interviewer to digest key architectural trade-offs.' : 'Delivery pacing was conversational and natural.'
      ]
    };
  }

  // ── Modal UI ─────────────────────────────────────────────────────────────
  function showHelperModal(initialQuestion) {
    if (typeof document === 'undefined') return;
    var existing = document.getElementById('study-ai-helper-modal');
    if (existing) existing.remove();

    var isRecording = false;
    var recognition = null;
    var recordingTimer = null;
    var secondsElapsed = 0;
    var transcriptAccumulated = '';

    var modal = document.createElement('div');
    modal.id = 'study-ai-helper-modal';
    modal.className = 'modal-overlay show';
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.85);z-index:99999;display:flex;align-items:center;justify-content:center;padding:12px;backdrop-filter:blur(6px);font-family:Inter,sans-serif;color:#e8eaf6;';

    modal.innerHTML = `
      <div style="background:#151922;border:1px solid #262f45;border-radius:18px;max-width:820px;width:100%;max-height:92vh;display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(0,0,0,.8);overflow:hidden;">
        <!-- Header -->
        <div style="padding:14px 20px;border-bottom:1px solid #262f45;display:flex;justify-content:space-between;align-items:center;background:#111420;flex-wrap:wrap;gap:8px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="width:34px;height:34px;border-radius:10px;background:linear-gradient(135deg,#ec4899,#8b5cf6);display:flex;align-items:center;justify-content:center;font-size:18px;">🎙️</div>
            <div>
              <div style="font-size:14px;font-weight:700;">Voice Mock Interviewer & STAR Speech Coach</div>
              <div style="font-size:11px;color:#8896b8;">Practice verbal answers hands-free with pacing & filler analysis</div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:10px;">
            <button id="study-ai-key-btn" style="background:none;border:1px solid #2d3650;border-radius:6px;padding:4px 8px;color:#a78bfa;font-size:11px;cursor:pointer;">⚙️ Gemini Key</button>
            <button id="study-ai-close" style="background:none;border:none;color:#8896b8;font-size:22px;cursor:pointer;line-height:1;">&times;</button>
          </div>
        </div>

        <!-- Mode Tabs -->
        <div style="display:flex;padding:10px 18px 0;gap:8px;background:#111420;border-bottom:1px solid #262f45;">
          <button id="study-ai-tab-voice" style="padding:8px 16px;background:#1a2030;border:1px solid #2d3650;border-bottom:none;border-radius:8px 8px 0 0;color:#e8eaf6;font-weight:700;font-size:12px;cursor:pointer;">🎙️ Voice Mock Interview</button>
          <button id="study-ai-tab-algo" style="padding:8px 16px;background:transparent;border:none;color:#8896b8;font-weight:600;font-size:12px;cursor:pointer;">⚡ Algorithm Complexity</button>
        </div>

        <!-- TAB 1: VOICE MOCK INTERVIEWER -->
        <div id="study-ai-pane-voice" style="padding:18px 20px;flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:14px;">
          <!-- Question Presets & Prompt -->
          <div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;flex-wrap:wrap;gap:6px;">
              <label style="font-size:11px;font-weight:700;color:#8896b8;text-transform:uppercase;letter-spacing:0.8px;">Interview Question:</label>
              <div style="display:flex;gap:6px;">
                <select id="voice-preset-select" style="background:#0d111a;border:1px solid #262f45;border-radius:6px;padding:3px 8px;color:#cbd5e1;font-size:11px;outline:none;">
                  <option value="">-- Choose Sample Question --</option>
                  ${INTERVIEW_PRESETS.map(function (p) {
                    return `<option value="${p.id}">[${p.category}] ${p.q.slice(0, 48)}...</option>`;
                  }).join('')}
                </select>
                <button id="voice-speak-q-btn" title="Examiner speaks question aloud" style="background:rgba(79,142,247,0.15);border:1px solid rgba(79,142,247,0.3);border-radius:6px;padding:3px 8px;color:#4f8ef7;font-size:11px;cursor:pointer;display:inline-flex;align-items:center;gap:4px;">
                  🔊 Listen to Examiner
                </button>
              </div>
            </div>
            <textarea id="voice-question-input" rows="2" placeholder="Type or select an interview question to practice..." style="width:100%;background:#0d111a;border:1px solid #262f45;border-radius:10px;padding:10px 12px;color:#f1f5f9;font-size:13px;line-height:1.5;resize:vertical;outline:none;box-sizing:border-box;">${initialQuestion || INTERVIEW_PRESETS[0].q}</textarea>
          </div>

          <!-- Speech Audio Controls & Live Waves -->
          <div style="background:rgba(255,255,255,0.02);border:1px solid #262f45;border-radius:14px;padding:14px 16px;">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:12px;">
              <div style="display:flex;align-items:center;gap:10px;">
                <button id="voice-record-btn" style="padding:10px 20px;background:linear-gradient(135deg,#ec4899,#f43f5e);border:none;border-radius:10px;color:#fff;font-weight:700;font-size:13px;cursor:pointer;display:inline-flex;align-items:center;gap:8px;box-shadow:0 4px 14px rgba(244,63,94,0.35);transition:all .15s;">
                  <span id="voice-rec-icon">🎤</span>
                  <span id="voice-rec-label">Start Speaking</span>
                </button>
                <div id="voice-timer-badge" style="font-size:12px;font-weight:700;color:#8896b8;background:#111420;border:1px solid #262f45;padding:6px 12px;border-radius:8px;font-family:monospace;">
                  ⏱️ 00:00
                </div>
              </div>

              <!-- Live Audio Wave Indicators -->
              <div id="voice-waveform" style="display:none;align-items:center;gap:3px;height:24px;">
                <span class="vwave-bar" style="width:3px;height:12px;background:#ec4899;border-radius:2px;animation:vwave 0.8s infinite ease-in-out alternate;"></span>
                <span class="vwave-bar" style="width:3px;height:22px;background:#f43f5e;border-radius:2px;animation:vwave 0.6s infinite ease-in-out alternate;"></span>
                <span class="vwave-bar" style="width:3px;height:16px;background:#a855f7;border-radius:2px;animation:vwave 0.9s infinite ease-in-out alternate;"></span>
                <span class="vwave-bar" style="width:3px;height:8px;background:#ec4899;border-radius:2px;animation:vwave 0.7s infinite ease-in-out alternate;"></span>
                <span style="font-size:11px;color:#f43f5e;font-weight:700;margin-left:4px;">LISTENING...</span>
              </div>
            </div>

            <!-- Speech Live Transcript -->
            <div>
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                <label style="font-size:11px;font-weight:600;color:#8896b8;">Live Verbal Transcript (speaks or edit here):</label>
                <div style="font-size:11px;color:#8896b8;" id="voice-live-stats">0 words · 0 WPM · 0 fillers</div>
              </div>
              <textarea id="voice-transcript-input" rows="4" placeholder="Speak into your microphone or paste your answer here... Transcript appears live in real time." style="width:100%;background:#090c13;border:1px solid #262f45;border-radius:10px;padding:12px;color:#e8eaf6;font-size:13px;line-height:1.6;outline:none;box-sizing:border-box;resize:vertical;"></textarea>
            </div>
          </div>

          <!-- Evaluation Action Buttons -->
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <button id="voice-eval-gemini-btn" style="padding:9px 18px;background:linear-gradient(135deg,#8b5cf6,#4f8ef7);border:none;border-radius:8px;color:#fff;font-weight:700;font-size:12.5px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;">
              <span>✨</span>
              <span>Gemini 1.5 Flash AI Evaluation</span>
            </button>
            <button id="voice-eval-offline-btn" style="padding:9px 16px;background:#1a2030;border:1px solid #2d3650;border-radius:8px;color:#e8eaf6;font-weight:600;font-size:12px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;">
              <span>⚡</span>
              <span>Offline STAR & Pacing Rubric</span>
            </button>
            <button id="voice-export-btn" style="padding:9px 14px;background:none;border:1px solid #262f45;border-radius:8px;color:#8896b8;font-size:12px;cursor:pointer;margin-left:auto;">
              📋 Copy Transcript
            </button>
          </div>

          <!-- Critique Results Container -->
          <div id="voice-critique-box" style="display:none;background:rgba(255,255,255,0.02);border:1px solid #262f45;border-radius:14px;padding:16px;"></div>
        </div>

        <!-- TAB 2: ALGORITHM ANALYZER -->
        <div id="study-ai-pane-algo" style="padding:18px 20px;flex:1;overflow-y:auto;display:none;flex-direction:column;gap:12px;">
          <div>
            <label style="font-size:11px;font-weight:600;color:#8896b8;margin-bottom:6px;display:block;">Paste your code or algorithm solution:</label>
            <textarea id="study-ai-code-input" rows="6" placeholder="function solve(arr) { ... }" style="width:100%;background:#0d111a;border:1px solid #262f45;border-radius:10px;padding:10px;color:#e8eaf6;font-family:'JetBrains Mono',monospace;font-size:12px;outline:none;resize:vertical;box-sizing:border-box;"></textarea>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button id="study-ai-gemini-algo-btn" style="padding:8px 16px;background:linear-gradient(135deg,#8b5cf6,#4f8ef7);border:none;border-radius:8px;color:#fff;font-weight:700;font-size:12px;cursor:pointer;">
              ✨ Explain with Gemini 1.5 Flash AI
            </button>
            <button id="study-ai-analyze-btn" style="padding:8px 14px;background:#1a2030;border:1px solid #2d3650;border-radius:8px;color:#e8eaf6;font-weight:600;font-size:12px;cursor:pointer;">
              ⚡ Offline Complexity Analyzer
            </button>
          </div>
          <div id="study-ai-algo-results" style="display:none;background:rgba(255,255,255,0.02);border:1px solid #262f45;border-radius:12px;padding:14px;"></div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Close Button
    document.getElementById('study-ai-close').onclick = function () {
      stopRecording();
      modal.remove();
    };

    // Tab Switching
    var tabVoice = document.getElementById('study-ai-tab-voice');
    var tabAlgo = document.getElementById('study-ai-tab-algo');
    var paneVoice = document.getElementById('study-ai-pane-voice');
    var paneAlgo = document.getElementById('study-ai-pane-algo');

    tabVoice.onclick = function () {
      tabVoice.style.background = '#1a2030'; tabVoice.style.color = '#e8eaf6';
      tabAlgo.style.background = 'transparent'; tabAlgo.style.color = '#8896b8';
      paneVoice.style.display = 'flex'; paneAlgo.style.display = 'none';
    };

    tabAlgo.onclick = function () {
      tabAlgo.style.background = '#1a2030'; tabAlgo.style.color = '#e8eaf6';
      tabVoice.style.background = 'transparent'; tabVoice.style.color = '#8896b8';
      paneAlgo.style.display = 'flex'; paneVoice.style.display = 'none';
    };

    // API Key config
    document.getElementById('study-ai-key-btn').onclick = function () {
      var cur = localStorage.getItem('gemini_api_key') || '';
      var entered = prompt('Enter your Google Gemini 1.5 Flash API Key:', cur);
      if (entered !== null) {
        localStorage.setItem('gemini_api_key', entered.trim());
        if (typeof showToast === 'function') showToast('Gemini API key updated!', 'success');
      }
    };

    // Question Preset selector
    var presetSelect = document.getElementById('voice-preset-select');
    var questionInput = document.getElementById('voice-question-input');
    presetSelect.onchange = function () {
      var found = INTERVIEW_PRESETS.find(function (p) { return p.id === presetSelect.value; });
      if (found) questionInput.value = found.q;
    };

    // Text-to-Speech Examiner Voice
    var speakBtn = document.getElementById('voice-speak-q-btn');
    speakBtn.onclick = function () {
      var text = questionInput.value.trim();
      if (!text) return;
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        var utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
      } else {
        alert('Text-to-speech is not supported on this browser.');
      }
    };

    // Speech-to-Text Recording Engine
    var recBtn = document.getElementById('voice-record-btn');
    var timerBadge = document.getElementById('voice-timer-badge');
    var waveform = document.getElementById('voice-waveform');
    var transcriptInput = document.getElementById('voice-transcript-input');
    var liveStats = document.getElementById('voice-live-stats');

    function updateLiveStats() {
      var m = analyzeSpeechMetrics(transcriptInput.value, secondsElapsed);
      liveStats.textContent = m.wordCount + ' words · ' + m.wpm + ' WPM · ' + m.fillerCount + ' fillers (' + m.pacingQuality + ')';
    }

    transcriptInput.addEventListener('input', updateLiveStats);

    function startRecording() {
      var SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRec) {
        alert('Speech recognition is not natively supported in this browser. You can type or paste your spoken answer directly into the transcript box below!');
        return;
      }

      try {
        recognition = new SpeechRec();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        secondsElapsed = 0;
        transcriptAccumulated = transcriptInput.value ? transcriptInput.value + ' ' : '';

        recognition.onstart = function () {
          isRecording = true;
          recBtn.style.background = 'linear-gradient(135deg,#10b981,#06d6a0)';
          document.getElementById('voice-rec-icon').textContent = '⏹️';
          document.getElementById('voice-rec-label').textContent = 'Finish Speaking';
          waveform.style.display = 'flex';

          recordingTimer = setInterval(function () {
            secondsElapsed++;
            var mins = Math.floor(secondsElapsed / 60);
            var secs = secondsElapsed % 60;
            timerBadge.textContent = '⏱️ ' + String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
            updateLiveStats();
          }, 1000);
        };

        recognition.onresult = function (event) {
          var interim = '';
          for (var i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
              transcriptAccumulated += event.results[i][0].transcript + ' ';
            } else {
              interim += event.results[i][0].transcript;
            }
          }
          transcriptInput.value = (transcriptAccumulated + interim).trim();
          updateLiveStats();
        };

        recognition.onerror = function (e) {
          console.warn('[AIInterviewHelper] Speech recognition error:', e.error);
          stopRecording();
        };

        recognition.onend = function () {
          if (isRecording) stopRecording();
        };

        recognition.start();
      } catch (err) {
        console.error('[AIInterviewHelper] Failed to start speech recognition:', err);
        stopRecording();
      }
    }

    function stopRecording() {
      isRecording = false;
      if (recordingTimer) clearInterval(recordingTimer);
      if (recognition) {
        try { recognition.stop(); } catch (e) {}
        recognition = null;
      }
      recBtn.style.background = 'linear-gradient(135deg,#ec4899,#f43f5e)';
      document.getElementById('voice-rec-icon').textContent = '🎤';
      document.getElementById('voice-rec-label').textContent = 'Start Speaking';
      waveform.style.display = 'none';
      updateLiveStats();
    }

    recBtn.onclick = function () {
      if (isRecording) {
        stopRecording();
      } else {
        startRecording();
      }
    };

    // Render Offline Critique Card
    function renderOfflineCritique(evalData) {
      var critiqueBox = document.getElementById('voice-critique-box');
      critiqueBox.style.display = 'block';

      critiqueBox.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;border-bottom:1px solid #262f45;padding-bottom:10px;flex-wrap:wrap;gap:8px;">
          <div>
            <span style="font-size:14px;font-weight:700;color:#06d6a0;">⚡ Speech & Behavioral Evaluation Scorecard</span>
            <span style="font-size:11px;color:#8896b8;margin-left:8px;">[Offline Rubric]</span>
          </div>
          <div style="font-size:18px;font-weight:800;color:${evalData.overallScore >= 7.5 ? '#06d6a0' : evalData.overallScore >= 5.5 ? '#f59e0b' : '#f43f5e'};">
            ${evalData.overallScore} / 10
          </div>
        </div>

        <!-- Metrics Row -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(130px, 1fr));gap:10px;margin-bottom:16px;">
          <div style="background:rgba(0,0,0,0.3);border:1px solid #262f45;border-radius:10px;padding:10px;">
            <div style="font-size:10px;color:#8896b8;text-transform:uppercase;">Pacing (WPM)</div>
            <div style="font-size:16px;font-weight:700;color:#4f8ef7;margin-top:2px;">${evalData.metrics.wpm} WPM</div>
            <div style="font-size:10px;color:#8896b8;">${evalData.metrics.pacingLabel}</div>
          </div>
          <div style="background:rgba(0,0,0,0.3);border:1px solid #262f45;border-radius:10px;padding:10px;">
            <div style="font-size:10px;color:#8896b8;text-transform:uppercase;">Filler Words</div>
            <div style="font-size:16px;font-weight:700;color:${evalData.metrics.fillerCount > 3 ? '#f43f5e' : '#06d6a0'};margin-top:2px;">${evalData.metrics.fillerCount}</div>
            <div style="font-size:10px;color:#8896b8;">${evalData.metrics.fillerPercentage}% of speech</div>
          </div>
          <div style="background:rgba(0,0,0,0.3);border:1px solid #262f45;border-radius:10px;padding:10px;">
            <div style="font-size:10px;color:#8896b8;text-transform:uppercase;">STAR Structure</div>
            <div style="font-size:16px;font-weight:700;color:#a855f7;margin-top:2px;">${evalData.starCompletenessPct}%</div>
            <div style="font-size:10px;color:#8896b8;">Pillars detected</div>
          </div>
          <div style="background:rgba(0,0,0,0.3);border:1px solid #262f45;border-radius:10px;padding:10px;">
            <div style="font-size:10px;color:#8896b8;text-transform:uppercase;">Delivery Score</div>
            <div style="font-size:16px;font-weight:700;color:#06d6a0;margin-top:2px;">${evalData.deliveryScore} / 10</div>
            <div style="font-size:10px;color:#8896b8;">Fluency & clarity</div>
          </div>
        </div>

        <!-- Actionable Coaching Tips -->
        <div style="background:rgba(6,214,160,0.04);border:1px solid rgba(6,214,160,0.25);border-radius:10px;padding:12px;margin-bottom:12px;">
          <div style="font-size:11px;font-weight:700;color:#06d6a0;text-transform:uppercase;margin-bottom:6px;">🎯 Actionable Coaching Feedback:</div>
          <ul style="margin:0;padding-left:18px;font-size:12px;color:#e2e8f0;line-height:1.6;">
            ${evalData.tips.map(function (t) { return `<li>${t}</li>`; }).join('')}
          </ul>
        </div>
      `;
    }

    // Offline Evaluation Trigger
    document.getElementById('voice-eval-offline-btn').onclick = function () {
      var t = transcriptInput.value.trim();
      var q = questionInput.value.trim();
      if (!t) {
        alert('Please speak or type your answer first!');
        return;
      }
      var evalData = evaluateResponseOffline(q, t, secondsElapsed);
      renderOfflineCritique(evalData);
    };

    // Gemini 1.5 Flash AI Evaluation Trigger
    document.getElementById('voice-eval-gemini-btn').onclick = async function () {
      var t = transcriptInput.value.trim();
      var q = questionInput.value.trim();
      var critiqueBox = document.getElementById('voice-critique-box');

      if (!t) {
        alert('Please speak or type your answer first!');
        return;
      }

      var apiKey = localStorage.getItem('gemini_api_key') || '';
      critiqueBox.style.display = 'block';

      if (!apiKey) {
        critiqueBox.innerHTML = `
          <div style="background:rgba(139,92,246,0.12);border:1px solid #8b5cf6;border-radius:8px;padding:10px 14px;font-size:11.5px;color:#a78bfa;margin-bottom:12px;">
            💡 Tip: Add your Google Gemini API Key via the top "⚙️ Gemini Key" button for personalized FAANG interviewer critique. Showing comprehensive offline rubric:
          </div>
        `;
        var offlineData = evaluateResponseOffline(q, t, secondsElapsed);
        renderOfflineCritique(offlineData);
        return;
      }

      critiqueBox.innerHTML = '<div style="color:#a78bfa;font-size:12px;padding:12px;">🧠 Querying Gemini 1.5 Flash model for comprehensive interview critique...</div>';

      try {
        var metrics = analyzeSpeechMetrics(t, secondsElapsed);
        var endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        var promptText = `You are a Lead Software Architect and Bar Raiser conducting a Senior Engineer interview.
Question asked: "${q}"
Candidate Spoken Answer Transcript: "${t}"
Answer Duration: ${secondsElapsed} seconds. Speaking Pace: ${metrics.wpm} WPM. Filler words detected: ${metrics.fillerCount}.

Please provide:
1. Overall Candidate Rating (1 to 10) and hiring recommendation (Strong Hire / Leaning Hire / Leaning No).
2. Content Accuracy & Depth (technical trade-offs, architecture correctness, STAR structure).
3. Verbal Delivery & Communication Critique (conciseness, pacing, filler words).
4. Ideal 60-Second Model Answer (how a Staff Engineer would answer this). Keep response formatted nicely with HTML tags (<h4>, <strong>, <ul>, <li>).`;

        var response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }]
          })
        });

        if (!response.ok) throw new Error('Gemini API status ' + response.status);
        var resJson = await response.json();
        var reply = resJson?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response from model';

        var formatted = reply
          .replace(/```html/g, '').replace(/```/g, '')
          .replace(/## (.*?)\n/g, '<h4 style="color:#4f8ef7;margin:12px 0 4px;">$1</h4>')
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\n/g, '<br/>');

        critiqueBox.innerHTML = `
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;border-bottom:1px solid #262f45;padding-bottom:10px;">
            <div style="font-size:13px;font-weight:700;color:#06d6a0;">✨ Gemini 1.5 Flash Interviewer Assessment</div>
            <div style="font-size:11px;color:#8896b8;">${metrics.wpm} WPM · ${metrics.fillerCount} fillers</div>
          </div>
          <div style="font-size:12.5px;color:#e8eaf6;line-height:1.65;">${formatted}</div>
        `;
      } catch (err) {
        console.warn('[AIInterviewHelper] Gemini call failed, falling back to offline:', err);
        var fallback = evaluateResponseOffline(q, t, secondsElapsed);
        renderOfflineCritique(fallback);
      }
    };

    // Copy Transcript
    document.getElementById('voice-export-btn').onclick = function () {
      var t = transcriptInput.value.trim();
      var q = questionInput.value.trim();
      var exportContent = `# Mock Interview Answer Transcript\n\n**Question**: ${q}\n\n**Answer**:\n${t}\n\n---\n*Logged via LedgerMate Voice Interview Coach*`;
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(exportContent).then(function () {
          alert('Transcript copied to clipboard!');
        });
      } else {
        alert(exportContent);
      }
    };

    // Code Complexity Offline Analyzer
    document.getElementById('study-ai-analyze-btn').onclick = function () {
      var code = document.getElementById('study-ai-code-input').value.trim();
      var resBox = document.getElementById('study-ai-algo-results');
      if (!code) {
        alert('Please paste code first.');
        return;
      }
      var analysis = analyzeComplexity(code);
      resBox.style.display = 'block';
      resBox.innerHTML = `
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
    };
  }

  return {
    showModal: showHelperModal,
    analyzeComplexity: analyzeComplexity,
    analyzeSpeechMetrics: analyzeSpeechMetrics,
    evaluateResponseOffline: evaluateResponseOffline,
    INTERVIEW_PRESETS: INTERVIEW_PRESETS
  };
});
