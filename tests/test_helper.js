/**
 * LedgerMate Automated Test Suite Helper
 * Provides test runners, assertions, and headless browser mock environments.
 */
const assert = require('assert');

class TestSuite {
  constructor(name) {
    this.name = name;
    this.passed = 0;
    this.failed = 0;
    this.total = 0;
    this.startTime = Date.now();
    console.log(`\n============================================================`);
    console.log(`🧪 Suite: ${this.name}`);
    console.log(`============================================================`);
  }

  async it(description, fn) {
    this.total++;
    try {
      await fn();
      console.log(`  ✅ PASS: ${description}`);
      this.passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${description}`);
      console.error(`     Error: ${err.message}`);
      if (err.stack) {
        const stackLines = err.stack.split('\n').slice(1, 3).join('\n');
        console.error(`     ${stackLines}`);
      }
      this.failed++;
      process.exitCode = 1;
    }
  }

  async itAsync(description, fn) {
    return this.it(description, fn);
  }

  summary() {
    const duration = ((Date.now() - this.startTime) / 1000).toFixed(2);
    console.log(`------------------------------------------------------------`);
    if (this.failed === 0) {
      console.log(`✨ Suite "${this.name}" PASSED: ${this.passed}/${this.total} tests (${duration}s)\n`);
    } else {
      console.error(`💥 Suite "${this.name}" FAILED: ${this.failed} failed, ${this.passed} passed (${duration}s)\n`);
    }
    process.exit(this.failed === 0 ? 0 : 1);
  }
}

/**
 * Creates an in-memory mock browser environment (window, document, localStorage)
 */
function setupMockBrowser() {
  const localStorageStore = {};
  const sessionStorageStore = {};

  const mockStorage = (store) => ({
    getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); },
    get length() { return Object.keys(store).length; },
    key: (i) => Object.keys(store)[i] || null,
    _store: store
  });

  global.window = global;
  global.localStorage = mockStorage(localStorageStore);
  global.sessionStorage = mockStorage(sessionStorageStore);

  // Minimal DOM Mock
  class MockElement {
    constructor(tagName = 'div', id = '', className = '') {
      this.tagName = tagName.toUpperCase();
      this.id = id;
      this.className = className;
      this.children = [];
      this._innerHTML = '';
      this.dataset = {};
      this.style = {};
      this.attributes = {};
    }

    get classList() {
      const self = this;
      return {
        contains: (cls) => (self.className || '').split(/\s+/).includes(cls),
        add: (cls) => {
          const set = new Set((self.className || '').split(/\s+/).filter(Boolean));
          set.add(cls);
          self.className = Array.from(set).join(' ');
        },
        remove: (cls) => {
          const set = new Set((self.className || '').split(/\s+/).filter(Boolean));
          set.delete(cls);
          self.className = Array.from(set).join(' ');
        },
        toggle: (cls, force) => {
          if (force === true) self.classList.add(cls);
          else if (force === false) self.classList.remove(cls);
          else if (self.classList.contains(cls)) self.classList.remove(cls);
          else self.classList.add(cls);
        }
      };
    }

    get innerHTML() { return this._innerHTML; }
    set innerHTML(html) { this._innerHTML = html; }
    get textContent() { return this._innerHTML.replace(/<[^>]*>/g, ''); }
    set textContent(txt) { this._innerHTML = txt; }

    querySelector() { return null; }
    querySelectorAll() { return []; }
    appendChild(child) { this.children.push(child); return child; }
    removeChild(child) {
      this.children = this.children.filter(c => c !== child);
      return child;
    }
    addEventListener() {}
    removeEventListener() {}
    setAttribute(k, v) { this.attributes[k] = v; }
    getAttribute(k) { return this.attributes[k] || null; }
  }

  global.document = {
    readyState: 'complete',
    createElement: (tag) => new MockElement(tag),
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
    body: new MockElement('body'),
    documentElement: new MockElement('html')
  };

  global.navigator = {
    onLine: true,
    userAgent: 'Node.js Test Runner'
  };

  global.CustomEvent = class CustomEvent {
    constructor(type, params = {}) {
      this.type = type;
      this.detail = params.detail || null;
    }
  };

  global.Event = class Event {
    constructor(type) {
      this.type = type;
    }
  };

  global.location = {
    href: 'http://localhost:3000/index.html',
    origin: 'http://localhost:3000',
    pathname: '/index.html',
    reload: () => {}
  };

  return {
    window: global.window,
    document: global.document,
    localStorage: global.localStorage,
    sessionStorage: global.sessionStorage
  };
}

module.exports = {
  TestSuite,
  setupMockBrowser,
  assert
};
