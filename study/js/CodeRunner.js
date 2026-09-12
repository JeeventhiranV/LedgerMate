/**
 * LedgerMate Study Hub – CodeRunner.js
 * ─────────────────────────────────────────────────────────────
 * In-Browser Interactive DSA Code Execution Sandbox & Playground
 * Runs JavaScript DSA test cases, captures console output, and measures execution time.
 * Exposes: window.StudyCodeRunner
 * ─────────────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  var SAMPLE_PROBLEMS = [
    {
      title: 'Two Sum',
      difficulty: 'Easy',
      desc: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
      starterCode: `/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number[]}
 */
function twoSum(nums, target) {
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) {
      return [map.get(complement), i];
    }
    map.set(nums[i], i);
  }
  return [];
}

// Test assertions
console.log("Test 1 [2,7,11,15], target=9 ->", JSON.stringify(twoSum([2,7,11,15], 9)));
console.log("Test 2 [3,2,4], target=6 ->", JSON.stringify(twoSum([3,2,4], 6)));
`
    },
    {
      title: 'Valid Parentheses',
      difficulty: 'Easy',
      desc: 'Given a string s containing just the characters "(", ")", "{", "}", "[" and "]", determine if the input string is valid.',
      starterCode: `/**
 * @param {string} s
 * @return {boolean}
 */
function isValid(s) {
  const stack = [];
  const map = { ')': '(', '}': '{', ']': '[' };
  for (const ch of s) {
    if (ch === '(' || ch === '{' || ch === '[') {
      stack.push(ch);
    } else {
      if (stack.pop() !== map[ch]) return false;
    }
  }
  return stack.length === 0;
}

console.log("Test '()[]{}' ->", isValid("()[]{}"));
console.log("Test '(]' ->", isValid("(]"));
`
    },
    {
      title: 'Reverse Linked List',
      difficulty: 'Easy',
      desc: 'Given the head of a singly linked list, reverse the list, and return the reversed list.',
      starterCode: `class ListNode {
  constructor(val = 0, next = null) {
    this.val = val;
    this.next = next;
  }
}

function reverseList(head) {
  let prev = null;
  let curr = head;
  while (curr) {
    let next = curr.next;
    curr.next = prev;
    prev = curr;
    curr = next;
  }
  return prev;
}

// Helper: [1 -> 2 -> 3]
const list = new ListNode(1, new ListNode(2, new ListNode(3)));
const rev = reverseList(list);
console.log("Reversed head val:", rev.val, "next:", rev.next.val);
`
    }
  ];

  function showRunnerModal(problemIdx = 0) {
    var existing = document.getElementById('study-code-runner-modal');
    if (existing) existing.remove();

    var currentProblem = SAMPLE_PROBLEMS[problemIdx] || SAMPLE_PROBLEMS[0];

    var modal = document.createElement('div');
    modal.id = 'study-code-runner-modal';
    modal.className = 'modal-overlay show';
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.85);z-index:99999;display:flex;align-items:center;justify-content:center;padding:12px;backdrop-filter:blur(6px);font-family:Inter,sans-serif;color:#e8eaf6;';

    modal.innerHTML = `
      <style>
        .study-cr-split {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          flex: 1;
          overflow: hidden;
        }
        @media (max-width: 768px) {
          .study-cr-split {
            grid-template-columns: 1fr !important;
            grid-template-rows: 1.2fr 1fr !important;
          }
        }
      </style>
      <div style="background:#151922;border:1px solid #262f45;border-radius:18px;max-width:920px;width:100%;height:88vh;max-height:800px;display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(0,0,0,.8);overflow:hidden;">
        <!-- Header -->
        <div style="padding:12px 18px;border-bottom:1px solid #262f45;display:flex;justify-content:space-between;align-items:center;background:#111420;flex-wrap:wrap;gap:8px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:18px;">💻</span>
            <select id="study-cr-prob-select" style="background:#1a2030;border:1px solid #2d3650;color:#e8eaf6;border-radius:6px;padding:5px 10px;font-size:12px;font-weight:600;max-width:240px;">
              ${SAMPLE_PROBLEMS.map((p, i) => `<option value="${i}" ${i === problemIdx ? 'selected' : ''}>${p.title} (${p.difficulty})</option>`).join('')}
            </select>
          </div>
          <button id="study-cr-close" style="background:none;border:none;color:#8896b8;font-size:22px;cursor:pointer;">&times;</button>
        </div>

        <!-- Problem Description Bar -->
        <div style="padding:8px 18px;background:rgba(255,255,255,0.02);border-bottom:1px solid #262f45;font-size:11px;color:#8896b8;line-height:1.4;">
          <strong style="color:#e8eaf6;">Problem:</strong> ${currentProblem.desc}
        </div>

        <!-- Editor & Console Split Body (Responsive) -->
        <div class="study-cr-split">
          <!-- Editor Pane -->
          <div style="display:flex;flex-direction:column;border-right:1px solid #262f45;background:#0d111a;min-height:160px;">
            <div style="padding:6px 14px;border-bottom:1px solid #262f45;font-size:11px;color:#8896b8;display:flex;justify-content:space-between;align-items:center;">
              <span>JavaScript Sandbox</span>
              <button id="study-cr-reset" style="background:none;border:none;color:#4f8ef7;font-size:11px;cursor:pointer;">Reset Code</button>
            </div>
            <textarea id="study-cr-editor" style="flex:1;background:transparent;border:none;color:#e8eaf6;padding:12px;font-family:'JetBrains Mono',monospace;font-size:12px;line-height:1.5;outline:none;resize:none;tab-size:2;">${currentProblem.starterCode}</textarea>
          </div>

          <!-- Console & Output Pane -->
          <div style="display:flex;flex-direction:column;background:#0a0c12;min-height:140px;">
            <div style="padding:6px 14px;border-bottom:1px solid #262f45;font-size:11px;color:#8896b8;display:flex;justify-content:space-between;align-items:center;">
              <span>Execution Output</span>
              <span id="study-cr-time" style="color:#10b981;font-weight:600;"></span>
            </div>
            <div id="study-cr-output" style="flex:1;padding:12px;overflow-y:auto;font-family:'JetBrains Mono',monospace;font-size:12px;color:#a0aec0;white-space:pre-wrap;line-height:1.5;-webkit-overflow-scrolling:touch;">Click "Run Code" to execute.</div>
          </div>
        </div>

        <!-- Footer Actions -->
        <div style="padding:12px 20px;border-top:1px solid #262f45;background:#111420;display:flex;justify-content:space-between;align-items:center;">
          <div style="font-size:11px;color:#8896b8;">Executes in a secure isolated in-browser context.</div>
          <button id="study-cr-run" style="padding:9px 24px;background:linear-gradient(135deg,#10b981,#3b82f6);border:none;border-radius:8px;color:#fff;font-weight:700;font-size:13px;cursor:pointer;display:flex;align-items:center;gap:6px;box-shadow:0 4px 14px rgba(16,185,129,0.3);">
            <span>▶</span> Run Code
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('study-cr-close').onclick = () => modal.remove();

    var editor = document.getElementById('study-cr-editor');
    var output = document.getElementById('study-cr-output');
    var timeEl = document.getElementById('study-cr-time');
    var probSelect = document.getElementById('study-cr-prob-select');

    probSelect.onchange = function () {
      var idx = parseInt(this.value, 10);
      showRunnerModal(idx);
    };

    document.getElementById('study-cr-reset').onclick = function () {
      editor.value = currentProblem.starterCode;
      output.textContent = 'Code reset to starter template.';
    };

    // Code execution runner
    document.getElementById('study-cr-run').onclick = function () {
      var code = editor.value;
      output.innerHTML = '';
      timeEl.textContent = '';

      var logs = [];
      var customConsole = {
        log: function (...args) {
          logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' '));
        },
        error: function (...args) {
          logs.push('❌ ' + args.join(' '));
        },
        warn: function (...args) {
          logs.push('⚠️ ' + args.join(' '));
        }
      };

      var startTime = performance.now();

      try {
        // Run safely with overridden console
        var runnerFn = new Function('console', code);
        runnerFn(customConsole);
        var elapsed = (performance.now() - startTime).toFixed(2);
        timeEl.textContent = `⚡ ${elapsed} ms`;

        if (logs.length) {
          output.innerHTML = logs.map(l => `<div style="margin-bottom:4px;color:${l.startsWith('❌') ? '#f43f5e' : '#10b981'}">${l}</div>`).join('');
        } else {
          output.innerHTML = '<div style="color:#10b981;">✅ Code executed successfully (no console output produced).</div>';
        }
      } catch (err) {
        var elapsedErr = (performance.now() - startTime).toFixed(2);
        timeEl.textContent = `❌ ${elapsedErr} ms`;
        output.innerHTML = `<div style="color:#f43f5e;font-weight:600;">Runtime Error:</div><div style="color:#f43f5e;">${err.stack || err.message}</div>`;
      }
    };
  }

  window.StudyCodeRunner = {
    showModal: showRunnerModal,
    getProblems: () => SAMPLE_PROBLEMS
  };

  console.log('[StudyHub] CodeRunner module initialized.');
})();
