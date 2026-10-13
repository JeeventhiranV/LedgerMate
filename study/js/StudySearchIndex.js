/**
 * StudySearchIndex.js — Universal Search Index for LedgerMate Study Hub
 * ─────────────────────────────────────────────────────────────────────────
 * Indexes across:
 *  • 10 Preparation Modules & Interactive Learning Tools
 *  • 120 Core Java, Spring Boot, Microservices & Kafka Questions
 *  • 171 DSA Problem Solutions from DSA CodeBase & dsa-answers.js
 *  • 85 LLD & System Design Topics from dsa-systemdesign-content.js
 *  • 31 Frontend & React 19 Questions
 *  • 48 HR & Behavioural Questions (STAR Method)
 *  • 83 Level-Wise PDF Cheat Sheets from pdfs.json
 *  • High-Frequency Actions (Start Quiz, Focus Timer, Code Playground, Theme, etc.)
 * Exposes: window.StudySearchIndex
 * ─────────────────────────────────────────────────────────────────────────
 */
(function (window) {
  'use strict';

  var _items = [];
  var _initialized = false;

  // ── Core Static Database ────────────────────────────────────────────────
  var STATIC_MODULES = [
    {
      id: 'mod-java',
      type: 'module',
      category: 'java',
      title: 'Java Interview Prep Kit 2026',
      sub: 'Core Java, Spring Boot, Kafka, JPA, Microservices & JVM (120+ Qs)',
      url: 'prep/Java-Prep-kit.html',
      icon: '☕',
      badge: '120 Qs',
      tags: ['java', 'spring', 'springboot', 'kafka', 'microservices', 'jpa', 'jvm', 'multithreading', 'concurrency']
    },
    {
      id: 'mod-dsa-codebase',
      type: 'module',
      category: 'dsa',
      title: 'DSA Codebase (171+ LeetCode Solutions)',
      sub: 'Arrays, Two Pointers, Trees, Graphs, DP & Heaps with Java 17 optimal code',
      url: 'prep/DSA_CodeBase.html',
      icon: '📖',
      badge: '171 Problems',
      tags: ['dsa', 'algorithms', 'leetcode', 'arrays', 'strings', 'trees', 'graphs', 'dp', 'dynamic programming']
    },
    {
      id: 'mod-dsa-animator',
      type: 'module',
      category: 'dsa',
      title: 'DSA Algorithm Animator & Visualizer',
      sub: 'Interactive step-by-step visual walkthroughs of algorithm patterns',
      url: 'prep/DSA-Prep-Hub.html',
      icon: '🧠',
      badge: 'Visualizer',
      tags: ['visualizer', 'animator', 'patterns', 'sorting', 'binary search', 'two pointers']
    },
    {
      id: 'mod-system-design',
      type: 'module',
      category: 'system_design',
      title: 'LLD & System Design Interview Handbook',
      sub: '85 Modules: Rate Limiter, LRU Cache, Parking Lot, Kafka, Redis & Concurrency',
      url: 'prep/DSA_SystemDesign.html',
      icon: '🏗️',
      badge: '85 Modules',
      tags: ['lld', 'hld', 'system design', 'rate limiter', 'lru cache', 'parking lot', 'architecture', 'scalability']
    },
    {
      id: 'mod-react',
      type: 'module',
      category: 'react',
      title: 'Frontend & React 19 Interview Hub',
      sub: 'Hooks, Fiber engine, Concurrent mode, Next.js, Web Vitals & State',
      url: 'prep/React-Prep.html',
      icon: '⚛️',
      badge: '31 Qs',
      tags: ['react', 'nextjs', 'javascript', 'frontend', 'hooks', 'typescript', 'web vitals', 'performance']
    },
    {
      id: 'mod-hr',
      type: 'module',
      category: 'hr',
      title: 'HR & Management Behavioural Answers',
      sub: 'STAR framework answers for leadership, conflict resolution & teamwork',
      url: 'prep/HR-Questions.html',
      icon: '🤝',
      badge: '48 Qs',
      tags: ['hr', 'behavioural', 'star', 'interview', 'leadership', 'soft skills', 'conflict']
    },
    {
      id: 'mod-pdf-kit',
      type: 'module',
      category: 'pdfs',
      title: 'Level-Wise PDF Library & Cheat Sheets',
      sub: '83 Curated cheat sheets across 0–3, 3–5, 5–8 and 8+ years experience tracks',
      url: 'prep/Interview-Prep-Kit.html',
      icon: '📚',
      badge: '83 PDFs',
      tags: ['pdf', 'cheat sheet', 'library', 'preliminary', 'notes', 'interview tips']
    },
    {
      id: 'mod-tracker',
      type: 'module',
      category: 'actions',
      title: 'Interview Application Tracker (Kanban)',
      sub: 'Track job pipeline, technical rounds, salary offers & interviewer notes',
      url: 'prep/Interview-Tracker.html',
      icon: '🎯',
      badge: 'Kanban',
      tags: ['tracker', 'kanban', 'jobs', 'applications', 'pipeline', 'offers', 'salary']
    },
    {
      id: 'mod-daily',
      type: 'module',
      category: 'actions',
      title: 'Daily Learning Tracker & Streaks',
      sub: 'Focus hours, solve velocity metrics, habit logs & revision schedules',
      url: 'prep/Daily-Learning-Tracker.html',
      icon: '📊',
      badge: 'Streaks',
      tags: ['habits', 'streaks', 'daily tracker', 'velocity', 'pomodoro', 'hours']
    },
    {
      id: 'mod-links',
      type: 'module',
      category: 'actions',
      title: 'Quick Links & Technical Docs Manager',
      sub: 'Bookmarks of official docs, whitepapers, YouTube playlists & GitHub repos',
      url: 'prep/Quick-Links-Manager.html',
      icon: '🔗',
      badge: 'Bookmarks',
      tags: ['bookmarks', 'links', 'docs', 'references', 'github', 'youtube']
    }
  ];

  var QUICK_ACTIONS = [
    {
      id: 'act-quiz',
      type: 'action',
      category: 'actions',
      title: 'Start Practice Quiz Sprint',
      sub: 'Timed 10-question sprint across Java, DSA, React, and System Design',
      action: function () { if (window.StudyQuiz) window.StudyQuiz.showModal(); },
      icon: '🎯',
      badge: 'Action',
      tags: ['quiz', 'test', 'sprint', 'assessment', 'practice', 'exam']
    },
    {
      id: 'act-srs',
      type: 'action',
      category: 'actions',
      title: 'Open SRS Flashcards Deck',
      sub: 'Spaced repetition flashcards review for long-term active recall',
      action: function () { if (window.StudySRS) window.StudySRS.showModal(); },
      icon: '🧠',
      badge: 'Action',
      tags: ['flashcards', 'srs', 'recall', 'memory', 'spaced repetition', 'cards']
    },
    {
      id: 'act-code',
      type: 'action',
      category: 'actions',
      title: 'Open Code Runner Playground',
      sub: 'In-browser JavaScript & algorithm code execution sandbox',
      action: function () { if (window.StudyCodeRunner) window.StudyCodeRunner.showModal(); },
      icon: '💻',
      badge: 'Action',
      tags: ['code', 'runner', 'sandbox', 'playground', 'execute', 'dsa code']
    },
    {
      id: 'act-ai',
      type: 'action',
      category: 'actions',
      title: 'Launch Voice Mock Interview Coach',
      sub: 'Simulate technical and behavioural interview rounds with voice speech recognition',
      action: function () { if (window.AIInterviewHelper) window.AIInterviewHelper.showModal(); },
      icon: '🎙️',
      badge: 'Action',
      tags: ['ai', 'voice', 'coach', 'mock', 'interview', 'speech', 'simulation']
    },
    {
      id: 'act-mistakes',
      type: 'action',
      category: 'actions',
      title: 'Start Mistake Revision Sprint',
      sub: 'Review queued weak-spot questions and quiz mistakes via SM-2 recall',
      action: function () { if (window.StudyMistakeVault) window.StudyMistakeVault.showSprintModal(); },
      icon: '🔥',
      badge: 'Action',
      tags: ['mistakes', 'revision', 'weak points', 'vault', 'sm2', 'review']
    },
    {
      id: 'act-playlists',
      type: 'action',
      category: 'actions',
      title: 'Open Company Playlists & Cheat Sheets',
      sub: 'Manage target-company question decks and generate printable PDF cheat sheets',
      action: function () { if (window.StudyPlaylists) window.StudyPlaylists.showPlaylistManagerModal(); },
      icon: '📑',
      badge: 'Action',
      tags: ['playlists', 'cheat sheet', 'company', 'pdf', 'deck', 'print']
    },
    {
      id: 'act-timer',
      type: 'action',
      category: 'actions',
      title: 'Toggle Focus Pomodoro Timer',
      sub: 'Start or pause your current study focus sprint',
      action: function () { var b = document.getElementById('stFab'); if (b) b.click(); },
      icon: '⏱️',
      badge: 'Action',
      tags: ['timer', 'pomodoro', 'focus', 'clock', 'sprint', 'time']
    },
    {
      id: 'act-theme',
      type: 'action',
      category: 'actions',
      title: 'Toggle Theme (Dark / Light)',
      sub: 'Switch between Dark and Light mode themes',
      action: function () {
        var current = document.documentElement.getAttribute('data-theme') || 'dark';
        var next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        try {
          ['ledgerMate_theme','prep_theme','sr_theme','dsa_theme','ql_theme','react_prep_theme','theme'].forEach(function(k){
            localStorage.setItem(k, next);
          });
        } catch(e){}
      },
      icon: '🌗',
      badge: 'Action',
      tags: ['theme', 'dark', 'light', 'mode', 'display', 'colors']
    },
    {
      id: 'act-finance',
      type: 'action',
      category: 'actions',
      title: 'Switch to LedgerMate Finance Portal',
      sub: 'Return to personal finance dashboard, bank balances & expenses',
      url: '../index.html',
      icon: '💰',
      badge: 'Portal',
      tags: ['finance', 'ledgermate', 'money', 'dashboard', 'switch', 'expenses', 'budget']
    }
  ];

  var HIGH_YIELD_JAVA = [
    { title: 'How does ConcurrentHashMap work without full locking? (Java 8+ CAS)', url: 'prep/Java-Prep-kit.html#core-java', sub: 'Core Java · CAS + Node-level locking', diff: 'Hard', tags: ['concurrenthashmap', 'cas', 'thread-safety', 'locking'] },
    { title: 'HashMap internal working: Bucket treeification & collision handling', url: 'prep/Java-Prep-kit.html#core-java', sub: 'Core Java · Red-Black Tree threshold (8)', diff: 'Medium', tags: ['hashmap', 'treeify', 'collision', 'put'] },
    { title: 'Java Memory Model (JMM): Stack vs Heap, Metaspace & GC Generations', url: 'prep/Java-Prep-kit.html#memory-gc', sub: 'Memory & GC · Eden, Survivor, Tenured, ZGC, G1', diff: 'Hard', tags: ['memory', 'heap', 'stack', 'metaspace', 'gc', 'garbage collection'] },
    { title: 'Virtual Threads (Project Loom) in Java 21: Carrier Threads vs Platform Threads', url: 'prep/Java-Prep-kit.html#java21', sub: 'Java 21 · High throughput I/O concurrency', diff: 'Hard', tags: ['virtual threads', 'loom', 'concurrency', 'java 21'] },
    { title: 'Spring Boot Auto-Configuration: How @EnableAutoConfiguration works internally', url: 'prep/Java-Prep-kit.html#spring-boot', sub: 'Spring Boot · spring.factories & @ConditionalOnClass', diff: 'Hard', tags: ['spring boot', 'autoconfiguration', 'conditional'] },
    { title: 'Spring Transaction Management: Propagation.REQUIRES_NEW vs REQUIRED', url: 'prep/Java-Prep-kit.html#spring-boot', sub: 'Spring Boot · Proxy-based transaction rollback', diff: 'Medium', tags: ['transactional', 'propagation', 'rollback', 'spring'] },
    { title: 'Kafka Producer & Consumer Internals: Partitions, Rebalance & Exactly-Once Semantics', url: 'prep/Java-Prep-kit.html#kafka', sub: 'Messaging · Consumer groups, ISR & Idempotence', diff: 'Hard', tags: ['kafka', 'consumer group', 'partitions', 'exactly once'] },
    { title: 'Microservices Circuit Breaker Pattern with Resilience4j', url: 'prep/Java-Prep-kit.html#microservices', sub: 'Microservices · CLOSED, OPEN, HALF-OPEN states', diff: 'Medium', tags: ['circuit breaker', 'resilience4j', 'fault tolerance'] },
    { title: 'JPA N+1 Problem: Detection & Resolution using JOIN FETCH & EntityGraph', url: 'prep/Java-Prep-kit.html#jpa', sub: 'JPA / Hibernate · Lazy loading performance fixes', diff: 'Medium', tags: ['jpa', 'hibernate', 'n+1', 'join fetch', 'entitygraph'] },
    { title: 'CompletableFuture: Async chaining with supplyAsync, thenApply & allOf', url: 'prep/Java-Prep-kit.html#multithreading', sub: 'Multithreading · Non-blocking composition', diff: 'Medium', tags: ['completablefuture', 'async', 'concurrency', 'threads'] }
  ];

  var HIGH_YIELD_REACT = [
    { title: 'React 19 Server Components (RSC) vs Client Components', url: 'prep/React-Prep.html', sub: 'React 19 · Zero-bundle-size server execution', diff: 'Hard', tags: ['react', 'rsc', 'server components', 'client'] },
    { title: 'useMemo vs useCallback: Performance optimization vs Reference Equality', url: 'prep/React-Prep.html', sub: 'Hooks · Dependency arrays and re-render prevention', diff: 'Medium', tags: ['usememo', 'usecallback', 'hooks', 're-render'] },
    { title: 'React Reconciliation (Fiber Architecture) & Virtual DOM Diffing', url: 'prep/React-Prep.html', sub: 'Internals · Work loop, double buffering & lanes', diff: 'Hard', tags: ['fiber', 'reconciliation', 'virtual dom', 'diffing'] },
    { title: 'Next.js 15 App Router: Server Actions, ISR, SSG and Streaming', url: 'prep/React-Prep.html', sub: 'Next.js · Hydration, suspense and streaming SSR', diff: 'Hard', tags: ['nextjs', 'ssr', 'ssg', 'isr', 'server actions'] }
  ];

  var HIGH_YIELD_HR = [
    { title: 'Tell me about a complex technical conflict you resolved in your team', url: 'prep/HR-Questions.html', sub: 'STAR Method · Collaboration & architecture alignment', diff: 'Medium', tags: ['conflict', 'star', 'teamwork', 'leadership'] },
    { title: 'Describe a production outage you caused or triaged: Post-mortem & learnings', url: 'prep/HR-Questions.html', sub: 'STAR Method · Root cause analysis & blameless culture', diff: 'Hard', tags: ['outage', 'production', 'post-mortem', 'failure'] },
    { title: 'Why are you leaving your current company and why this role?', url: 'prep/HR-Questions.html', sub: 'Career Narrative · Growth, impact and tech stack alignment', diff: 'Medium', tags: ['motivation', 'career', 'why leave', 'growth'] }
  ];

  var HIGH_YIELD_DSA = [
    { num: 1, title: 'Two Sum (Optimal O(n) Hash Map)', url: 'prep/DSA_CodeBase.html#1', sub: 'Arrays & Hashing · Complement Lookup', diff: 'Easy', tags: ['two sum', 'arrays', 'hash table', 'dsa', 'leetcode'] },
    { num: 20, title: 'Valid Parentheses (Stack Matching)', url: 'prep/DSA_CodeBase.html#20', sub: 'Stack · Balanced brackets', diff: 'Easy', tags: ['valid parentheses', 'stack', 'brackets', 'dsa'] },
    { num: 146, title: 'LRU Cache (HashMap + Doubly Linked List)', url: 'prep/DSA_CodeBase.html#146', sub: 'Design & Linked List · O(1) get and put', diff: 'Medium', tags: ['lru cache', 'doubly linked list', 'design', 'dsa'] },
    { num: 206, title: 'Reverse Linked List (Iterative & Recursive)', url: 'prep/DSA_CodeBase.html#206', sub: 'Linked List · In-place pointer reversal', diff: 'Easy', tags: ['reverse linked list', 'linked list', 'pointers', 'dsa'] },
    { num: 56, title: 'Merge Intervals (Sort & Overlap Interval Greedy)', url: 'prep/DSA_CodeBase.html#56', sub: 'Intervals · Array sorting & merging', diff: 'Medium', tags: ['merge intervals', 'intervals', 'arrays', 'sorting'] },
    { num: 200, title: 'Number of Islands (BFS & DFS Grid Traversal)', url: 'prep/DSA_CodeBase.html#200', sub: 'Graphs · Matrix flood fill', diff: 'Medium', tags: ['number of islands', 'graphs', 'bfs', 'dfs', 'grid'] }
  ];

  var HIGH_YIELD_SD = [
    { id: 'rate-limiter', title: 'Rate Limiter Architecture (Token Bucket & Leaky Bucket)', url: 'prep/DSA_SystemDesign.html#rate-limiter', sub: 'System Design · Redis distributed rate limiting', diff: 'Medium', tags: ['rate limiter', 'token bucket', 'redis', 'system design'] },
    { id: 'caching', title: 'Distributed Cache Design with Redis & Consistent Hashing', url: 'prep/DSA_SystemDesign.html#caching', sub: 'System Design · Eviction policies & cache stampede', diff: 'Hard', tags: ['cache', 'redis', 'consistent hashing', 'distributed'] },
    { id: 'tinyurl', title: 'URL Shortener (TinyURL) High Scale Architecture', url: 'prep/DSA_SystemDesign.html#tinyurl', sub: 'System Design · Base62 encoding, KGS & database sharding', diff: 'Medium', tags: ['tinyurl', 'url shortener', 'base62', 'system design'] }
  ];

  function _initIndex() {
    if (_initialized) return;
    _items = [];

    // 1. Static Modules & Tools
    STATIC_MODULES.forEach(function (m) {
      _items.push({
        id: m.id,
        type: 'module',
        category: m.category,
        title: m.title,
        sub: m.sub,
        url: m.url,
        icon: m.icon,
        badge: m.badge,
        tags: m.tags || []
      });
    });

    // 2. Quick Actions
    QUICK_ACTIONS.forEach(function (a) {
      _items.push({
        id: a.id,
        type: 'action',
        category: 'actions',
        title: a.title,
        sub: a.sub,
        url: a.url || null,
        action: a.action,
        icon: a.icon,
        badge: a.badge,
        tags: a.tags || []
      });
    });

    // 3. High-Yield Java Questions
    HIGH_YIELD_JAVA.forEach(function (q, i) {
      _items.push({
        id: 'java-q-' + i,
        type: 'question',
        category: 'java',
        title: q.title,
        sub: q.sub,
        url: q.url,
        icon: '☕',
        badge: q.diff,
        tags: q.tags || []
      });
    });

    // 4. DSA Problems (base high yield + window.DSA_ANSWERS if loaded)
    HIGH_YIELD_DSA.forEach(function (q) {
      _items.push({
        id: 'dsa-' + q.num,
        type: 'question',
        category: 'dsa',
        title: '#' + q.num + ' ' + q.title,
        sub: q.sub,
        url: q.url,
        icon: '🧠',
        badge: q.diff,
        tags: q.tags || []
      });
    });

    if (window.DSA_ANSWERS && typeof window.DSA_ANSWERS === 'object') {
      Object.keys(window.DSA_ANSWERS).forEach(function (num) {
        if (_items.some(function (it) { return it.id === 'dsa-' + num; })) return;
        var prob = window.DSA_ANSWERS[num];
        if (prob && prob.title) {
          _items.push({
            id: 'dsa-' + num,
            type: 'question',
            category: 'dsa',
            title: '#' + num + ' ' + prob.title,
            sub: (prob.topic || 'DSA') + ' · ' + (prob.difficulty || 'Medium'),
            url: 'prep/DSA_CodeBase.html#' + num,
            icon: '🧠',
            badge: prob.difficulty || 'DSA',
            tags: ['dsa', 'leetcode', String(num), (prob.topic || '').toLowerCase()]
          });
        }
      });
    }

    // 5. System Design & LLD Topics (base high yield + window.SD_TOPICS if loaded)
    HIGH_YIELD_SD.forEach(function (q) {
      _items.push({
        id: 'sd-' + q.id,
        type: 'question',
        category: 'system_design',
        title: '🏗️ ' + q.title,
        sub: q.sub,
        url: q.url,
        icon: '🏗️',
        badge: q.diff,
        tags: q.tags || []
      });
    });

    if (Array.isArray(window.SD_TOPICS)) {
      window.SD_TOPICS.forEach(function (cat) {
        if (Array.isArray(cat.topics)) {
          cat.topics.forEach(function (t) {
            if (_items.some(function (it) { return it.id === 'sd-' + t.id; })) return;
            _items.push({
              id: 'sd-' + t.id,
              type: 'question',
              category: 'system_design',
              title: (t.icon || '🏗️') + ' ' + t.title,
              sub: cat.title + ' · ' + (t.priority || 'Must-Know'),
              url: 'prep/DSA_SystemDesign.html#' + t.id,
              icon: t.icon || '🏗️',
              badge: t.priority || 'Design',
              tags: ['system design', 'lld', 'hld', t.id, (cat.title || '').toLowerCase()]
            });
          });
        }
      });
    }

    // 6. High-Yield React Questions
    HIGH_YIELD_REACT.forEach(function (q, i) {
      _items.push({
        id: 'react-q-' + i,
        type: 'question',
        category: 'react',
        title: q.title,
        sub: q.sub,
        url: q.url,
        icon: '⚛️',
        badge: q.diff,
        tags: q.tags || []
      });
    });

    // 7. High-Yield HR Questions
    HIGH_YIELD_HR.forEach(function (q, i) {
      _items.push({
        id: 'hr-q-' + i,
        type: 'question',
        category: 'hr',
        title: q.title,
        sub: q.sub,
        url: q.url,
        icon: '🤝',
        badge: q.diff,
        tags: q.tags || []
      });
    });

    _initialized = true;
  }

  /**
   * Fuzzy keyword search with category filtering
   * @param {string} query
   * @param {string} [categoryFilter='all']
   * @param {number} [limit=25]
   */
  function search(query, categoryFilter, limit) {
    _initIndex();
    categoryFilter = categoryFilter || 'all';
    limit = limit || 25;

    var q = String(query || '').trim().toLowerCase();
    if (!q) {
      // Return top recommended modules and actions if query is empty
      return _items
        .filter(function (it) {
          return categoryFilter === 'all' || it.category === categoryFilter;
        })
        .slice(0, limit);
    }

    var tokens = q.split(/\s+/).filter(Boolean);

    var scored = [];
    _items.forEach(function (item) {
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return;

      var titleLower = item.title.toLowerCase();
      var subLower = (item.sub || '').toLowerCase();
      var tagStr = item.tags.join(' ');

      var score = 0;
      var matchesAll = true;

      for (var i = 0; i < tokens.length; i++) {
        var token = tokens[i];
        if (titleLower.indexOf(token) !== -1) {
          score += 10;
          if (titleLower.startsWith(token)) score += 5;
        } else if (subLower.indexOf(token) !== -1) {
          score += 5;
        } else if (tagStr.indexOf(token) !== -1) {
          score += 3;
        } else {
          matchesAll = false;
          break;
        }
      }

      if (matchesAll) {
        if (item.type === 'action') score += 2;
        if (item.type === 'module') score += 1;
        scored.push({ item: item, score: score });
      }
    });

    scored.sort(function (a, b) {
      return b.score - a.score;
    });

    return scored.slice(0, limit).map(function (s) { return s.item; });
  }

  window.StudySearchIndex = {
    init: _initIndex,
    search: search,
    getAllItems: function () { _initIndex(); return _items; },
    indexAll: function () { _initIndex(); return _items; }
  };

})(window);
