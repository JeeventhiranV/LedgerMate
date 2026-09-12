/**
 * StudyQuizEngine.js — Production-Ready Interactive Assessment & Quiz Platform
 * ─────────────────────────────────────────────────────────────────────────────
 * Features:
 *  • Multi-Topic Question Bank (Java, DSA, React, System Design, HR)
 *  • Timed Assessment Modes: Sprint (10 Qs), Deep Dive (15 Qs), Mock Exam (20 Qs)
 *  • Real-time Grading, Explanation Cards & Score Analysis
 *  • Supabase History Sync (study_quiz_attempts)
 *  • Responsive Modal & Touch-Friendly Option Selectors
 * Exposes: window.StudyQuiz
 * ─────────────────────────────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  var _quizModal = null;
  var _activeSession = null;
  var _timerInterval = null;

  // ── Question Bank ────────────────────────────────────────────────────────
  var QUESTION_BANK = {
    java: [
      {
        q: "In Java, what happens when two different objects produce the exact same hashCode()?",
        options: [
          "Java throws a DuplicateHashException at runtime",
          "They are stored in the same bucket in a HashMap using a linked list or Red-Black tree",
          "The second object overwrites the first in the Map",
          "HashMap forces both objects to be equal via .equals()"
        ],
        answer: 1,
        exp: "Hash collisions are resolved in HashMap via chaining (separate chaining). Since Java 8, if a bucket contains 8+ entries, it converts to a Red-Black Tree (TreeNode) for O(log N) lookup."
      },
      {
        q: "Which garbage collector in Java 17+ is designed for ultra-low latency (< 1ms pause time) even on multi-terabyte heaps?",
        options: ["Serial GC", "Parallel GC", "ZGC (Z Garbage Collector)", "G1 GC"],
        answer: 2,
        exp: "ZGC performs almost all GC work concurrently (concurrent marking and compaction using load barriers and colored pointers) with sub-millisecond pause times."
      },
      {
        q: "What is the primary difference between synchronized and ReentrantLock in Java?",
        options: [
          "synchronized supports fair locking while ReentrantLock does not",
          "ReentrantLock allows tryLock() with timeout and interruptible lock acquisition",
          "synchronized works across multiple JVMs while ReentrantLock is single-JVM",
          "ReentrantLock does not require unlocking in a finally block"
        ],
        answer: 1,
        exp: "ReentrantLock provides advanced capabilities: tryLock(timeout), lockInterruptibly(), fair lock allocation, and multiple Condition instances for fine-grained signaling."
      },
      {
        q: "What does the @Transactional(propagation = Propagation.REQUIRES_NEW) annotation do in Spring Boot?",
        options: [
          "Joins the existing transaction or throws an exception if none exists",
          "Suspends the existing transaction and starts a completely new, independent physical transaction",
          "Rolls back only if an unchecked exception occurs",
          "Executes without any transaction context"
        ],
        answer: 1,
        exp: "REQUIRES_NEW always starts a new transaction. If an outer transaction is active, it is suspended until the inner transaction commits or rolls back."
      },
      {
        q: "Why is String immutable in Java?",
        options: [
          "Security (class loading/network parameters), Thread Safety, and String Pool caching efficiency",
          "Because Java strings are stored on the CPU stack instead of the heap",
          "To prevent JVM garbage collection",
          "To allow automatic conversion to integer arrays"
        ],
        answer: 0,
        exp: "Immutability allows String Pool sharing without thread synchronization, caches hash codes for fast Map lookups, and secures sensitive inputs like DB URLs and usernames."
      },
      {
        q: "In Java 21, what are Virtual Threads primarily optimized for?",
        options: [
          "Heavy CPU-bound mathematical simulations",
          "High-throughput I/O-bound concurrent network/database operations",
          "Direct hardware GPU rendering",
          "Low-level kernel device drivers"
        ],
        answer: 1,
        exp: "Virtual Threads (Project Loom) are lightweight user-mode threads scheduled by the JVM on carrier OS threads. They unmount when blocking on I/O, allowing millions of concurrent requests."
      },
      {
        q: "What is the key difference between fail-fast and fail-safe iterators in Java Collections?",
        options: [
          "Fail-fast works on concurrent collections while fail-safe works on ArrayList",
          "Fail-fast throws ConcurrentModificationException immediately if collection is modified; fail-safe works on a clone",
          "Fail-fast never throws exceptions while fail-safe terminates the JVM",
          "Fail-safe iterators lock the entire collection during iteration"
        ],
        answer: 1,
        exp: "Fail-fast iterators (e.g. HashMap, ArrayList) check modCount and throw ConcurrentModificationException. Fail-safe iterators (e.g. CopyOnWriteArrayList, ConcurrentHashMap) iterate over a snapshot."
      }
    ],
    dsa: [
      {
        q: "What is the optimal time complexity to find the K-th largest element in an unsorted array of size N?",
        options: ["O(N log N) using Quicksort", "O(N) average time using Quickselect or Min-Heap with size K (O(N log K))", "O(N^2) using Bubble Sort", "O(1) using Hash Map"],
        answer: 1,
        exp: "Quickselect achieves O(N) average time complexity. Using a Min-Heap of capacity K provides a guaranteed O(N log K) time with O(K) extra space."
      },
      {
        q: "Which data structure is most suitable for implementing LRU (Least Recently Used) Cache with O(1) get and put?",
        options: ["Max-Heap + Array", "Doubly Linked List + Hash Map", "Binary Search Tree + Stack", "Trie + Queue"],
        answer: 1,
        exp: "A Hash Map provides O(1) node lookup by key, while a Doubly Linked List enables O(1) removal and insertion of the most/least recently used nodes at the head/tail."
      },
      {
        q: "In a Graph, which algorithm finds the single-source shortest path with negative edge weights without negative cycles?",
        options: ["Dijkstra's Algorithm", "Bellman-Ford Algorithm", "Kruskal's Algorithm", "Prim's Algorithm"],
        answer: 1,
        exp: "Bellman-Ford operates in O(V * E) and relaxes all edges V-1 times. It handles negative weights and detects negative weight cycles, whereas Dijkstra fails on negative edges."
      },
      {
        q: "What is the space complexity of Depth-First Search (DFS) on a binary tree of height H?",
        options: ["O(N^2)", "O(H) due to call stack recursion", "O(1) always", "O(2^H)"],
        answer: 1,
        exp: "DFS utilizes the call stack proportional to the maximum recursion depth, which equals the height of the tree H (O(log N) for balanced trees, O(N) for skewed trees)."
      },
      {
        q: "Which technique is optimal for detecting a cycle in a Singly Linked List in O(1) auxiliary space?",
        options: ["HashSet tracking visited pointers", "Floyd's Tortoise and Hare (Slow & Fast pointers)", "Reverse Linked List comparison", "Binary Search on Node values"],
        answer: 1,
        exp: "Floyd's cycle-finding algorithm moves a slow pointer 1 step and a fast pointer 2 steps. If a cycle exists, they collide in O(N) time and O(1) extra space."
      }
    ],
    react: [
      {
        q: "In React 18+, what is the purpose of the useDeferredValue and useTransition hooks?",
        options: [
          "To automatically cache Redux store state in LocalStorage",
          "To mark non-urgent UI updates as interruptible so urgent user interactions (like typing) remain responsive",
          "To replace all async/await network calls",
          "To prevent components from ever re-rendering"
        ],
        answer: 1,
        exp: "Concurrent React allows background rendering of slow updates (useTransition / useDeferredValue) without blocking user input."
      },
      {
        q: "Why should you never mutate React state directly (e.g., state.push(item))?",
        options: [
          "React compares object references (shallow comparison) to detect state changes and schedule re-renders",
          "JavaScript will throw a ReadOnlyMemoryError",
          "Browser localStorage will get corrupted",
          "DOM nodes are destroyed permanently"
        ],
        answer: 0,
        exp: "React relies on immutable state updates to detect reference changes (prev !== next). Direct mutation retains the same reference and fails to trigger a re-render."
      },
      {
        q: "What does the useCallback hook cache across re-renders?",
        options: ["The return value of an expensive calculation", "The function definition instance itself", "The DOM node reference", "The component CSS styles"],
        answer: 1,
        exp: "useCallback memoizes a callback function instance between renders based on its dependency array, preventing unnecessary re-renders of memoized child components (React.memo)."
      }
    ],
    lld: [
      {
        q: "In System Design, what does the CAP theorem state about distributed databases?",
        options: [
          "A system can achieve Consistency, Availability, and Partition Tolerance simultaneously",
          "In the presence of a network partition (P), a distributed system must choose between Consistency (C) and Availability (A)",
          "Performance is always inversely proportional to Capacity",
          "Cloud databases must use ACID transactions"
        ],
        answer: 1,
        exp: "Network partitions are unavoidable in distributed systems. Therefore, during a partition, the system must choose between returning an error/waiting (Consistency) or returning stale data (Availability)."
      },
      {
        q: "What is the primary role of an idempotent consumer in Apache Kafka architecture?",
        options: [
          "To encrypt messages at rest",
          "To guarantee that processing the same message multiple times produces the exact same system state without duplicate side-effects",
          "To increase partition count automatically",
          "To prevent network timeouts"
        ],
        answer: 1,
        exp: "Kafka provides at-least-once delivery by default. Idempotency (e.g. unique request IDs, DB upserts) ensures repeated messages don't create duplicate orders or transactions."
      }
    ],
    hr: [
      {
        q: "What does the STAR framework stand for when answering behavioral interview questions?",
        options: [
          "Strategy, Theory, Action, Result",
          "Situation, Task, Action, Result",
          "System, Technology, Architecture, Roadmap",
          "Scope, Timeline, Allocation, Review"
        ],
        answer: 1,
        exp: "STAR (Situation, Task, Action, Result) is the gold standard for structuring behavioral answers concisely with measurable outcomes."
      }
    ]
  };

  // ── Helpers ──────────────────────────────────────────────────────────────
  function _esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function _getQuestions(topic, count) {
    var pool = [];
    if (topic === 'all' || topic === 'mixed') {
      Object.keys(QUESTION_BANK).forEach(function (k) {
        pool = pool.concat(QUESTION_BANK[k]);
      });
    } else if (QUESTION_BANK[topic]) {
      pool = QUESTION_BANK[topic].slice();
    } else {
      pool = QUESTION_BANK.java.concat(QUESTION_BANK.dsa);
    }
    // Shuffle
    var shuffled = pool.sort(function () { return 0.5 - Math.random(); });
    return shuffled.slice(0, Math.min(count || 10, shuffled.length));
  }

  // ── Modal & UI Creation ──────────────────────────────────────────────────
  function _createModal() {
    if (_quizModal) return _quizModal;

    var el = document.createElement('div');
    el.id = 'lm-quiz-modal';
    el.className = 'modal-overlay';
    el.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.82);z-index:9999;display:none;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(6px);box-sizing:border-box;';

    document.body.appendChild(el);
    _quizModal = el;
    return el;
  }

  function _renderQuizHome() {
    var modal = _createModal();
    modal.style.display = 'flex';

    modal.innerHTML = `
      <div style="background:var(--card,#111827);border:1px solid var(--border,#262f45);border-radius:18px;max-width:680px;width:100%;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(0,0,0,.7);color:var(--text,#e8eaf6);font-family:Inter,sans-serif;overflow:hidden;">
        <!-- Header -->
        <div style="padding:18px 22px;border-bottom:1px solid var(--border,#262f45);display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,0.02);">
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#4f8ef7,#8b5cf6);display:flex;align-items:center;justify-content:center;font-size:18px;">🎯</div>
            <div>
              <h3 style="font-size:16px;font-weight:700;margin:0;letter-spacing:-0.2px;">Study Quiz & Assessment Center</h3>
              <p style="font-size:11px;color:var(--text2,#8896b8);margin:2px 0 0 0;">Timed assessments with instant grading and explanations</p>
            </div>
          </div>
          <button id="lm-quiz-close" style="background:none;border:none;color:var(--text2,#8896b8);font-size:22px;cursor:pointer;padding:4px;line-height:1;">&times;</button>
        </div>

        <!-- Body -->
        <div style="padding:22px;overflow-y:auto;flex:1;">
          <div style="font-size:12px;font-weight:700;color:var(--text2,#8896b8);text-transform:uppercase;letter-spacing:0.8px;margin-bottom:10px;">1. Choose Topic</div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:10px;margin-bottom:20px;">
            <div class="qz-topic-card active" data-topic="all" style="background:rgba(79,142,247,0.12);border:1px solid #4f8ef7;border-radius:12px;padding:12px;cursor:pointer;transition:all .2s;">
              <div style="font-size:18px;margin-bottom:4px;">🌐</div>
              <div style="font-size:13px;font-weight:700;">Mixed Mock Exam</div>
              <div style="font-size:11px;color:var(--text2,#8896b8);">All Topics Combined</div>
            </div>
            <div class="qz-topic-card" data-topic="java" style="background:rgba(255,255,255,0.03);border:1px solid var(--border,#262f45);border-radius:12px;padding:12px;cursor:pointer;transition:all .2s;">
              <div style="font-size:18px;margin-bottom:4px;">☕</div>
              <div style="font-size:13px;font-weight:700;">Java & Spring Boot</div>
              <div style="font-size:11px;color:var(--text2,#8896b8);">Core, JVM, Multithreading</div>
            </div>
            <div class="qz-topic-card" data-topic="dsa" style="background:rgba(255,255,255,0.03);border:1px solid var(--border,#262f45);border-radius:12px;padding:12px;cursor:pointer;transition:all .2s;">
              <div style="font-size:18px;margin-bottom:4px;">🧠</div>
              <div style="font-size:13px;font-weight:700;">DSA & Algorithms</div>
              <div style="font-size:11px;color:var(--text2,#8896b8);">Trees, DP, Graphs, Arrays</div>
            </div>
            <div class="qz-topic-card" data-topic="lld" style="background:rgba(255,255,255,0.03);border:1px solid var(--border,#262f45);border-radius:12px;padding:12px;cursor:pointer;transition:all .2s;">
              <div style="font-size:18px;margin-bottom:4px;">🏗</div>
              <div style="font-size:13px;font-weight:700;">System Design</div>
              <div style="font-size:11px;color:var(--text2,#8896b8);">Kafka, Redis, Patterns</div>
            </div>
            <div class="qz-topic-card" data-topic="react" style="background:rgba(255,255,255,0.03);border:1px solid var(--border,#262f45);border-radius:12px;padding:12px;cursor:pointer;transition:all .2s;">
              <div style="font-size:18px;margin-bottom:4px;">⚛️</div>
              <div style="font-size:13px;font-weight:700;">React & Frontend</div>
              <div style="font-size:11px;color:var(--text2,#8896b8);">Hooks, Performance, SSR</div>
            </div>
            <div class="qz-topic-card" data-topic="hr" style="background:rgba(255,255,255,0.03);border:1px solid var(--border,#262f45);border-radius:12px;padding:12px;cursor:pointer;transition:all .2s;">
              <div style="font-size:18px;margin-bottom:4px;">🤝</div>
              <div style="font-size:13px;font-weight:700;">Behavioral & HR</div>
              <div style="font-size:11px;color:var(--text2,#8896b8);">STAR Method, Leadership</div>
            </div>
          </div>

          <div style="font-size:12px;font-weight:700;color:var(--text2,#8896b8);text-transform:uppercase;letter-spacing:0.8px;margin-bottom:10px;">2. Assessment Mode</div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:10px;margin-bottom:20px;">
            <div class="qz-mode-card active" data-mode="sprint" style="background:rgba(79,142,247,0.12);border:1px solid #4f8ef7;border-radius:12px;padding:12px;cursor:pointer;">
              <div style="font-size:13px;font-weight:700;">⚡ Rapid Sprint</div>
              <div style="font-size:11px;color:var(--text2,#8896b8);margin-top:2px;">5 Questions · 3 Minutes</div>
            </div>
            <div class="qz-mode-card" data-mode="standard" style="background:rgba(255,255,255,0.03);border:1px solid var(--border,#262f45);border-radius:12px;padding:12px;cursor:pointer;">
              <div style="font-size:13px;font-weight:700;">🎯 Topic Deep Dive</div>
              <div style="font-size:11px;color:var(--text2,#8896b8);margin-top:2px;">10 Questions · 8 Minutes</div>
            </div>
            <div class="qz-mode-card" data-mode="mock" style="background:rgba(255,255,255,0.03);border:1px solid var(--border,#262f45);border-radius:12px;padding:12px;cursor:pointer;">
              <div style="font-size:13px;font-weight:700;">🏆 Mock Interview</div>
              <div style="font-size:11px;color:var(--text2,#8896b8);margin-top:2px;">15 Questions · 12 Minutes</div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div style="padding:14px 22px;border-top:1px solid var(--border,#262f45);display:flex;justify-content:space-between;align-items:center;background:rgba(0,0,0,0.2);">
          <button id="lm-quiz-history-btn" style="background:none;border:1px solid var(--border,#262f45);border-radius:8px;padding:8px 14px;color:var(--text2,#8896b8);font-size:12px;cursor:pointer;">📊 Past Attempts</button>
          <button id="lm-quiz-start-btn" style="background:linear-gradient(135deg,#4f8ef7,#8b5cf6);border:none;border-radius:8px;padding:9px 22px;color:#fff;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 4px 14px rgba(79,142,247,0.35);">▶ Start Assessment</button>
        </div>
      </div>
    `;

    var selectedTopic = 'all';
    var selectedMode = 'sprint';

    modal.querySelectorAll('.qz-topic-card').forEach(function (card) {
      card.addEventListener('click', function () {
        modal.querySelectorAll('.qz-topic-card').forEach(function (c) {
          c.classList.remove('active');
          c.style.background = 'rgba(255,255,255,0.03)';
          c.style.borderColor = 'var(--border,#262f45)';
        });
        card.classList.add('active');
        card.style.background = 'rgba(79,142,247,0.12)';
        card.style.borderColor = '#4f8ef7';
        selectedTopic = card.dataset.topic;
      });
    });

    modal.querySelectorAll('.qz-mode-card').forEach(function (card) {
      card.addEventListener('click', function () {
        modal.querySelectorAll('.qz-mode-card').forEach(function (c) {
          c.classList.remove('active');
          c.style.background = 'rgba(255,255,255,0.03)';
          c.style.borderColor = 'var(--border,#262f45)';
        });
        card.classList.add('active');
        card.style.background = 'rgba(79,142,247,0.12)';
        card.style.borderColor = '#4f8ef7';
        selectedMode = card.dataset.mode;
      });
    });

    document.getElementById('lm-quiz-close').addEventListener('click', function () {
      modal.style.display = 'none';
    });

    document.getElementById('lm-quiz-history-btn').addEventListener('click', function () {
      _renderHistory();
    });

    document.getElementById('lm-quiz-start-btn').addEventListener('click', function () {
      var count = selectedMode === 'sprint' ? 5 : selectedMode === 'standard' ? 10 : 15;
      var duration = selectedMode === 'sprint' ? 180 : selectedMode === 'standard' ? 480 : 720;
      _startSession(selectedTopic, count, duration);
    });
  }

  // ── Start Active Quiz Session ────────────────────────────────────────────
  function _startSession(topic, count, durationSecs) {
    var questions = _getQuestions(topic, count);
    if (!questions.length) {
      if (window.LMToast) LMToast.err('No questions available for this topic');
      return;
    }

    _activeSession = {
      topic: topic,
      questions: questions,
      currentIndex: 0,
      userAnswers: new Array(questions.length).fill(null),
      timeRemaining: durationSecs,
      totalDuration: durationSecs,
      startedAt: Date.now()
    };

    if (_timerInterval) clearInterval(_timerInterval);
    _timerInterval = setInterval(function () {
      if (!_activeSession) { clearInterval(_timerInterval); return; }
      _activeSession.timeRemaining--;
      _updateTimerUI();
      if (_activeSession.timeRemaining <= 0) {
        clearInterval(_timerInterval);
        _finishSession();
      }
    }, 1000);

    _renderActiveQuestion();
  }

  function _fmtTime(secs) {
    var m = Math.floor(Math.max(0, secs) / 60);
    var s = Math.max(0, secs) % 60;
    return (m < 10 ? '0' + m : m) + ':' + (s < 10 ? '0' + s : s);
  }

  function _updateTimerUI() {
    var timerEl = document.getElementById('lm-quiz-timer-display');
    if (!timerEl || !_activeSession) return;
    timerEl.textContent = _fmtTime(_activeSession.timeRemaining);
    if (_activeSession.timeRemaining <= 60) {
      timerEl.style.color = '#f43f5e';
    }
  }

  function _renderActiveQuestion() {
    var modal = _createModal();
    var s = _activeSession;
    var q = s.questions[s.currentIndex];
    var currentAns = s.userAnswers[s.currentIndex];

    modal.innerHTML = `
      <div style="background:var(--card,#111827);border:1px solid var(--border,#262f45);border-radius:18px;max-width:720px;width:100%;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(0,0,0,.7);color:var(--text,#e8eaf6);font-family:Inter,sans-serif;overflow:hidden;">
        <!-- Header -->
        <div style="padding:16px 22px;border-bottom:1px solid var(--border,#262f45);display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,0.02);">
          <div style="font-size:13px;font-weight:700;color:var(--teal,#00d4b4);">
            Question ${s.currentIndex + 1} of ${s.questions.length}
          </div>
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="display:flex;align-items:center;gap:6px;background:rgba(255,255,255,0.04);padding:4px 10px;border-radius:8px;border:1px solid var(--border,#262f45);">
              <span>⏱</span>
              <span id="lm-quiz-timer-display" style="font-family:'JetBrains Mono',monospace;font-weight:700;font-size:13px;color:#4f8ef7;">${_fmtTime(s.timeRemaining)}</span>
            </div>
            <button id="lm-quiz-exit-btn" style="background:none;border:none;color:var(--text2,#8896b8);font-size:20px;cursor:pointer;padding:2px;">&times;</button>
          </div>
        </div>

        <!-- Question Body -->
        <div style="padding:22px;overflow-y:auto;flex:1;">
          <h4 style="font-size:15px;font-weight:600;line-height:1.5;margin:0 0 18px 0;color:#fff;">${_esc(q.q)}</h4>

          <!-- Options -->
          <div style="display:flex;flex-direction:column;gap:10px;">
            ${q.options.map(function (opt, idx) {
              var isSelected = currentAns === idx;
              var bg = isSelected ? 'rgba(79,142,247,0.15)' : 'rgba(255,255,255,0.03)';
              var border = isSelected ? '#4f8ef7' : 'var(--border,#262f45)';
              var letter = String.fromCharCode(65 + idx);
              return `
                <div class="qz-option-btn" data-opt="${idx}" style="display:flex;align-items:center;gap:12px;padding:12px 16px;background:${bg};border:1px solid ${border};border-radius:12px;cursor:pointer;transition:all .15s;">
                  <div style="width:24px;height:24px;border-radius:6px;background:${isSelected ? '#4f8ef7' : 'rgba(255,255,255,0.08)'};color:#fff;font-weight:700;font-size:11px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${letter}</div>
                  <div style="font-size:13px;line-height:1.4;color:${isSelected ? '#fff' : 'var(--text2,#c5cee0)'};">${_esc(opt)}</div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Footer Controls -->
        <div style="padding:14px 22px;border-top:1px solid var(--border,#262f45);display:flex;justify-content:space-between;align-items:center;background:rgba(0,0,0,0.2);">
          <button id="lm-quiz-prev-btn" style="background:none;border:1px solid var(--border,#262f45);border-radius:8px;padding:8px 16px;color:var(--text2,#8896b8);font-size:12px;cursor:pointer;" ${s.currentIndex === 0 ? 'disabled style="opacity:0.4;cursor:default;"' : ''}>← Previous</button>
          <div style="display:flex;gap:8px;">
            ${s.currentIndex === s.questions.length - 1 ? `
              <button id="lm-quiz-submit-btn" style="background:linear-gradient(135deg,#06d6a0,#00b4d8);border:none;border-radius:8px;padding:8px 20px;color:#07091a;font-size:13px;font-weight:700;cursor:pointer;">Finish Assessment ✓</button>
            ` : `
              <button id="lm-quiz-next-btn" style="background:linear-gradient(135deg,#4f8ef7,#8b5cf6);border:none;border-radius:8px;padding:8px 20px;color:#fff;font-size:13px;font-weight:700;cursor:pointer;">Next →</button>
            `}
          </div>
        </div>
      </div>
    `;

    modal.querySelectorAll('.qz-option-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var opt = parseInt(btn.dataset.opt, 10);
        s.userAnswers[s.currentIndex] = opt;
        _renderActiveQuestion();
      });
    });

    document.getElementById('lm-quiz-exit-btn').addEventListener('click', function () {
      if (confirm('Exit assessment in progress? Your answers will not be saved.')) {
        if (_timerInterval) clearInterval(_timerInterval);
        _activeSession = null;
        modal.style.display = 'none';
      }
    });

    var prevBtn = document.getElementById('lm-quiz-prev-btn');
    if (prevBtn && s.currentIndex > 0) {
      prevBtn.addEventListener('click', function () {
        s.currentIndex--;
        _renderActiveQuestion();
      });
    }

    var nextBtn = document.getElementById('lm-quiz-next-btn');
    if (nextBtn) {
      nextBtn.addEventListener('click', function () {
        if (s.currentIndex < s.questions.length - 1) {
          s.currentIndex++;
          _renderActiveQuestion();
        }
      });
    }

    var submitBtn = document.getElementById('lm-quiz-submit-btn');
    if (submitBtn) {
      submitBtn.addEventListener('click', function () {
        _finishSession();
      });
    }
  }

  // ── Finish & Review Scorecard ────────────────────────────────────────────
  function _finishSession() {
    if (_timerInterval) clearInterval(_timerInterval);
    var s = _activeSession;
    if (!s) return;

    var correct = 0;
    var total = s.questions.length;
    var timeSpent = Math.round((Date.now() - s.startedAt) / 1000);

    s.questions.forEach(function (q, idx) {
      if (s.userAnswers[idx] === q.answer) {
        correct++;
      }
    });

    var pct = Math.round((correct / total) * 100);

    // Save attempt to Supabase
    if (window.StudySync && typeof window.StudySync.saveQuizAttempt === 'function') {
      window.StudySync.saveQuizAttempt({
        module: s.topic,
        topic: s.topic.toUpperCase(),
        score: correct,
        total_questions: total,
        time_taken_seconds: timeSpent,
        details: { percentage: pct, answers: s.userAnswers }
      });
    }

    // Save to local storage cache for offline
    try {
      var hist = JSON.parse(localStorage.getItem('lm_quiz_history_v1') || '[]');
      hist.unshift({
        topic: s.topic,
        score: correct,
        total: total,
        pct: pct,
        timeSpent: timeSpent,
        date: new Date().toISOString()
      });
      localStorage.setItem('lm_quiz_history_v1', JSON.stringify(hist.slice(0, 30)));
    } catch (e) {}

    var modal = _createModal();
    modal.innerHTML = `
      <div style="background:var(--card,#111827);border:1px solid var(--border,#262f45);border-radius:18px;max-width:720px;width:100%;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(0,0,0,.7);color:var(--text,#e8eaf6);font-family:Inter,sans-serif;overflow:hidden;">
        <!-- Header -->
        <div style="padding:16px 22px;border-bottom:1px solid var(--border,#262f45);display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,0.02);">
          <div style="font-size:15px;font-weight:700;display:flex;align-items:center;gap:8px;">
            <span>🏆</span> Assessment Result
          </div>
          <button id="lm-quiz-score-close" style="background:none;border:none;color:var(--text2,#8896b8);font-size:22px;cursor:pointer;padding:2px;">&times;</button>
        </div>

        <!-- Score Overview -->
        <div style="padding:20px 22px;overflow-y:auto;flex:1;">
          <div style="text-align:center;padding:16px 0 24px;border-bottom:1px solid var(--border,#262f45);">
            <div style="font-size:48px;font-weight:800;font-family:'Syne',sans-serif;color:${pct >= 70 ? '#06d6a0' : pct >= 50 ? '#f59e0b' : '#f43f5e'};margin-bottom:4px;">${pct}%</div>
            <div style="font-size:14px;font-weight:600;color:#fff;">You answered ${correct} out of ${total} correctly</div>
            <div style="font-size:12px;color:var(--text2,#8896b8);margin-top:4px;">Time completed: ${_fmtTime(timeSpent)}</div>
          </div>

          <!-- Question-by-Question Review -->
          <div style="margin-top:20px;">
            <div style="font-size:12px;font-weight:700;color:var(--text2,#8896b8);text-transform:uppercase;letter-spacing:0.8px;margin-bottom:12px;">Review Answers & Explanations</div>
            <div style="display:flex;flex-direction:column;gap:14px;">
              ${s.questions.map(function (q, idx) {
                var uAns = s.userAnswers[idx];
                var isRight = uAns === q.answer;
                return `
                  <div style="background:rgba(255,255,255,0.02);border:1px solid ${isRight ? 'rgba(6,214,160,0.3)' : 'rgba(244,63,94,0.3)'};border-radius:12px;padding:14px;">
                    <div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px;">
                      <span style="font-size:14px;">${isRight ? '✅' : '❌'}</span>
                      <div style="font-size:13px;font-weight:600;color:#fff;line-height:1.4;">${_esc(q.q)}</div>
                    </div>
                    <div style="font-size:12px;color:var(--text2,#8896b8);margin-bottom:4px;">
                      <strong>Your Answer:</strong> ${uAns !== null ? _esc(q.options[uAns]) : '<em>Skipped</em>'}
                    </div>
                    ${!isRight ? `
                      <div style="font-size:12px;color:#06d6a0;margin-bottom:6px;">
                        <strong>Correct Answer:</strong> ${_esc(q.options[q.answer])}
                      </div>
                    ` : ''}
                    <div style="font-size:11px;color:var(--text3,#94a3b8);background:rgba(0,0,0,0.25);padding:8px 10px;border-radius:6px;margin-top:6px;line-height:1.45;">
                      💡 <strong>Explanation:</strong> ${_esc(q.exp)}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div style="padding:14px 22px;border-top:1px solid var(--border,#262f45);display:flex;justify-content:flex-end;gap:10px;background:rgba(0,0,0,0.2);">
          <button id="lm-quiz-retry-btn" style="background:linear-gradient(135deg,#4f8ef7,#8b5cf6);border:none;border-radius:8px;padding:8px 20px;color:#fff;font-size:13px;font-weight:700;cursor:pointer;">Try Another Quiz</button>
        </div>
      </div>
    `;

    document.getElementById('lm-quiz-score-close').addEventListener('click', function () {
      modal.style.display = 'none';
      _activeSession = null;
    });

    document.getElementById('lm-quiz-retry-btn').addEventListener('click', function () {
      _renderQuizHome();
    });
  }

  // ── History View ─────────────────────────────────────────────────────────
  function _renderHistory() {
    var modal = _createModal();
    var hist = [];
    try {
      hist = JSON.parse(localStorage.getItem('lm_quiz_history_v1') || '[]');
    } catch (e) {}

    modal.innerHTML = `
      <div style="background:var(--card,#111827);border:1px solid var(--border,#262f45);border-radius:18px;max-width:640px;width:100%;max-height:85vh;display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(0,0,0,.7);color:var(--text,#e8eaf6);font-family:Inter,sans-serif;overflow:hidden;">
        <div style="padding:16px 22px;border-bottom:1px solid var(--border,#262f45);display:flex;justify-content:space-between;align-items:center;">
          <h3 style="font-size:15px;font-weight:700;margin:0;">📊 Assessment History</h3>
          <button id="lm-quiz-hist-close" style="background:none;border:none;color:var(--text2,#8896b8);font-size:22px;cursor:pointer;">&times;</button>
        </div>
        <div style="padding:18px 22px;overflow-y:auto;flex:1;">
          ${!hist.length ? `
            <div style="text-align:center;padding:40px 0;color:var(--text2,#8896b8);font-size:13px;">No quiz attempts logged yet. Complete your first assessment to track accuracy trends!</div>
          ` : `
            <div style="display:flex;flex-direction:column;gap:8px;">
              ${hist.map(function (item) {
                var d = new Date(item.date).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                return `
                  <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 14px;background:rgba(255,255,255,0.02);border:1px solid var(--border,#262f45);border-radius:10px;">
                    <div>
                      <div style="font-size:13px;font-weight:700;color:#fff;text-transform:capitalize;">${item.topic} Quiz</div>
                      <div style="font-size:11px;color:var(--text2,#8896b8);margin-top:2px;">${d} · Time: ${_fmtTime(item.timeSpent)}</div>
                    </div>
                    <div style="text-align:right;">
                      <div style="font-size:16px;font-weight:800;color:${item.pct >= 70 ? '#06d6a0' : '#f59e0b'};">${item.pct}%</div>
                      <div style="font-size:11px;color:var(--text3,#64748b);">${item.score}/${item.total} correct</div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>
        <div style="padding:14px 22px;border-top:1px solid var(--border,#262f45);display:flex;justify-content:flex-end;">
          <button id="lm-quiz-back-btn" style="background:linear-gradient(135deg,#4f8ef7,#8b5cf6);border:none;border-radius:8px;padding:8px 18px;color:#fff;font-size:12px;font-weight:700;cursor:pointer;">← Back to Quiz Home</button>
        </div>
      </div>
    `;

    document.getElementById('lm-quiz-hist-close').addEventListener('click', function () {
      modal.style.display = 'none';
    });
    document.getElementById('lm-quiz-back-btn').addEventListener('click', function () {
      _renderQuizHome();
    });
  }

  // ── Public API ───────────────────────────────────────────────────────────
  window.StudyQuiz = {
    showModal: _renderQuizHome,
    startTopic: function (topic) {
      _startSession(topic || 'all', 10, 480);
    },
    openHistory: _renderHistory
  };

  console.log('[LM] StudyQuizEngine initialized.');
})();
