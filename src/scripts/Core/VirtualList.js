/**
 * LedgerMate – VirtualList.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Zero-dependency, 60fps high-performance DOM windowing component.
 * Enables buttery-smooth scrolling across 10,000+ items with fixed DOM footprint.
 *
 * Usage:
 *   const vl = new LM_VirtualList({
 *     container: document.getElementById('recentList'),
 *     items: state.transactions,
 *     itemHeight: 72,
 *     overscan: 6,
 *     renderItem: (tx, idx) => createTxElement(tx),
 *     emptyMessage: '<div class="tx-empty-msg">No transactions</div>'
 *   });
 * ─────────────────────────────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  class LM_VirtualList {
    constructor(options = {}) {
      this.container = options.container;
      if (!this.container) {
        throw new Error('[LM_VirtualList] container element is required');
      }

      this.items = Array.isArray(options.items) ? options.items : [];
      this.itemHeight = Number(options.itemHeight) || 72;
      this.overscan = Number(options.overscan) >= 0 ? Number(options.overscan) : 6;
      this.renderItem = typeof options.renderItem === 'function' ? options.renderItem : (item => String(item));
      this.onScroll = typeof options.onScroll === 'function' ? options.onScroll : null;
      this.emptyMessage = options.emptyMessage || '<div class="tx-empty-msg">No items found</div>';

      this._startIndex = -1;
      this._endIndex = -1;
      this._rafId = null;
      this._isDestroyed = false;

      this._initDOM();
      this._attachEvents();
      this.render();
    }

    _initDOM() {
      this.container.innerHTML = '';

      // Wrapper to prevent margin collapse and hold spacers
      this._wrapper = document.createElement('div');
      this._wrapper.className = 'lm-vl-viewport-wrapper';
      this._wrapper.style.position = 'relative';
      this._wrapper.style.width = '100%';
      this._wrapper.style.minHeight = '100%';

      this._topSpacer = document.createElement('div');
      this._topSpacer.className = 'lm-vl-spacer-top';
      this._topSpacer.style.width = '100%';
      this._topSpacer.style.height = '0px';

      this._content = document.createElement('div');
      this._content.className = 'lm-vl-rendered-content';
      this._content.style.width = '100%';

      this._bottomSpacer = document.createElement('div');
      this._bottomSpacer.className = 'lm-vl-spacer-bottom';
      this._bottomSpacer.style.width = '100%';
      this._bottomSpacer.style.height = '0px';

      this._wrapper.appendChild(this._topSpacer);
      this._wrapper.appendChild(this._content);
      this._wrapper.appendChild(this._bottomSpacer);
      this.container.appendChild(this._wrapper);
    }

    _attachEvents() {
      this._scrollHandler = () => {
        if (this._isDestroyed) return;
        if (this._rafId) return;

        if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
          this._rafId = window.requestAnimationFrame(() => {
            this._rafId = null;
            this.render();
            if (this.onScroll) this.onScroll(this.getScrollStats());
          });
        } else {
          this.render();
          if (this.onScroll) this.onScroll(this.getScrollStats());
        }
      };

      // Determine scroll target (container itself if scrollable, or window)
      const target = this._getScrollTarget();
      target.addEventListener('scroll', this._scrollHandler, { passive: true });
      if (typeof window !== 'undefined') {
        window.addEventListener('resize', this._scrollHandler, { passive: true });
      }
    }

    _getScrollTarget() {
      if (typeof window === 'undefined') return this.container;
      const overflowY = window.getComputedStyle ? window.getComputedStyle(this.container).overflowY : '';
      if (overflowY === 'auto' || overflowY === 'scroll') {
        return this.container;
      }
      return window;
    }

    _getScrollTop() {
      const target = this._getScrollTarget();
      if (typeof window !== 'undefined' && target === window) {
        return window.scrollY || document.documentElement.scrollTop || 0;
      }
      return this.container.scrollTop || 0;
    }

    _getViewportHeight() {
      const target = this._getScrollTarget();
      if (typeof window !== 'undefined' && target === window) {
        return window.innerHeight || 600;
      }
      return this.container.clientHeight || 600;
    }

    _getContainerTopOffset() {
      if (typeof window === 'undefined' || !this.container.getBoundingClientRect) return 0;
      const rect = this.container.getBoundingClientRect();
      const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
      return rect.top + scrollTop;
    }

    render() {
      if (this._isDestroyed) return;

      const total = this.items.length;
      if (total === 0) {
        this._topSpacer.style.height = '0px';
        this._bottomSpacer.style.height = '0px';
        if (typeof this.emptyMessage === 'string') {
          this._content.innerHTML = this.emptyMessage;
        } else if (this.emptyMessage && (this.emptyMessage.nodeType || (typeof HTMLElement !== 'undefined' && this.emptyMessage instanceof HTMLElement))) {
          this._content.innerHTML = '';
          this._content.appendChild(this.emptyMessage);
        }
        this._startIndex = -1;
        this._endIndex = -1;
        return;
      }

      const viewportHeight = this._getViewportHeight();
      const scrollTop = this._getScrollTop();
      const isWindowScroll = (this._getScrollTarget() === window);

      let relativeScrollTop = scrollTop;
      if (isWindowScroll) {
        const containerTop = this._getContainerTopOffset();
        relativeScrollTop = Math.max(0, scrollTop - containerTop);
      }

      // Calculate slice indices
      const rawStart = Math.floor(relativeScrollTop / this.itemHeight);
      const visibleCount = Math.ceil(viewportHeight / this.itemHeight);

      const startIndex = Math.max(0, rawStart - this.overscan);
      const endIndex = Math.min(total, rawStart + visibleCount + this.overscan);

      // Skip render if slice hasn't changed
      if (startIndex === this._startIndex && endIndex === this._endIndex) {
        return;
      }

      this._startIndex = startIndex;
      this._endIndex = endIndex;

      // Update spacer heights
      const topHeight = startIndex * this.itemHeight;
      const bottomHeight = Math.max(0, (total - endIndex) * this.itemHeight);

      this._topSpacer.style.height = topHeight + 'px';
      this._bottomSpacer.style.height = bottomHeight + 'px';

      // Render visible items
      const fragment = document.createDocumentFragment ? document.createDocumentFragment() : null;
      this._content.innerHTML = '';

      for (let i = startIndex; i < endIndex; i++) {
        const item = this.items[i];
        const rendered = this.renderItem(item, i);

        const isNode = rendered && (rendered.nodeType || (typeof HTMLElement !== 'undefined' && rendered instanceof HTMLElement));
        if (isNode) {
          if (fragment) fragment.appendChild(rendered);
          else this._content.appendChild(rendered);
        } else if (typeof rendered === 'string') {
          const temp = document.createElement('div');
          temp.innerHTML = rendered.trim();
          const child = temp.firstElementChild || temp;
          if (fragment) fragment.appendChild(child);
          else this._content.appendChild(child);
        }
      }

      if (fragment) {
        this._content.appendChild(fragment);
      }
    }

    updateItems(newItems = []) {
      this.items = Array.isArray(newItems) ? newItems : [];
      this._startIndex = -1;
      this._endIndex = -1;
      this.render();
    }

    scrollToIndex(index) {
      if (index < 0 || index >= this.items.length) return;
      const targetScroll = index * this.itemHeight;
      const target = this._getScrollTarget();
      if (typeof window !== 'undefined' && target === window) {
        const containerTop = this._getContainerTopOffset();
        window.scrollTo({ top: containerTop + targetScroll, behavior: 'smooth' });
      } else {
        this.container.scrollTo({ top: targetScroll, behavior: 'smooth' });
      }
    }

    getScrollStats() {
      return {
        totalItems: this.items.length,
        startIndex: this._startIndex,
        endIndex: this._endIndex,
        itemHeight: this.itemHeight,
        scrollTop: this._getScrollTop()
      };
    }

    destroy() {
      this._isDestroyed = true;
      if (this._rafId && typeof window !== 'undefined') {
        window.cancelAnimationFrame(this._rafId);
      }
      const target = this._getScrollTarget();
      if (target && this._scrollHandler) {
        target.removeEventListener('scroll', this._scrollHandler);
      }
      if (typeof window !== 'undefined' && this._scrollHandler) {
        window.removeEventListener('resize', this._scrollHandler);
      }
      if (this.container) {
        this.container.innerHTML = '';
      }
    }
  }

  // Browser global
  if (typeof window !== 'undefined') {
    window.LM_VirtualList = LM_VirtualList;
  }

  // Node export
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = LM_VirtualList;
  }
})();
