/**
 * LedgerMate – StockPortfolioService.js
 * ─────────────────────────────────────────────────────────────
 * State Management, CRUD Operations, Validation, and Dual-Layer
 * Supabase & LocalStorage Sync for Indian Stock Portfolios.
 * Exposes: window.LM_StockPortfolioService
 * ─────────────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  var _userId = null;
  var _portfolios = [];
  var _activePortfolioId = null;
  var _holdings = [];         // [{ id, portfolio_id, symbol, company_name, exchange, sector, notes }]
  var _transactions = [];     // [{ id, holding_id, portfolio_id, transaction_type, quantity, price, brokerage, taxes, transaction_date, notes }]
  var _initialized = false;
  var _isSyncing = false;

  function getStorageKey(uid) {
    return 'lm_u_' + (uid || 'guest') + '_stock_portfolio_data';
  }

  function generateUUID() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'stk_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Load local backup data from localStorage
   */
  function loadLocalData(uid) {
    try {
      var raw = localStorage.getItem(getStorageKey(uid));
      if (raw) {
        var parsed = JSON.parse(raw);
        _portfolios = parsed.portfolios || [];
        _activePortfolioId = parsed.activePortfolioId || (_portfolios[0] ? _portfolios[0].id : null);
        _holdings = parsed.holdings || [];
        _transactions = parsed.transactions || [];
        return true;
      }
    } catch (e) {
      console.warn('[StockPortfolioService] Failed to load local data:', e);
    }
    return false;
  }

  /**
   * Save current state to localStorage
   */
  function saveLocalData() {
    try {
      var payload = {
        portfolios: _portfolios,
        activePortfolioId: _activePortfolioId,
        holdings: _holdings,
        transactions: _transactions,
        updated_at: new Date().toISOString()
      };
      localStorage.setItem(getStorageKey(_userId), JSON.stringify(payload));
    } catch (e) {
      console.error('[StockPortfolioService] Save local data error:', e);
    }
  }

  /**
   * Ensure default portfolio exists
   */
  function ensureDefaultPortfolio() {
    if (!_portfolios || _portfolios.length === 0) {
      var defaultPort = {
        id: generateUUID(),
        user_id: _userId,
        name: 'Main Portfolio',
        currency: 'INR',
        is_default: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      _portfolios = [defaultPort];
      _activePortfolioId = defaultPort.id;
      saveLocalData();
    } else if (!_activePortfolioId || !_portfolios.some(p => p.id === _activePortfolioId)) {
      _activePortfolioId = _portfolios[0].id;
    }
  }

  /**
   * Helper to get initialized Supabase client instance
   */
  function getSupabaseClient() {
    if (typeof _supabase !== 'undefined' && _supabase && typeof _supabase.from === 'function') {
      return _supabase;
    }
    if (typeof window !== 'undefined' && window._supabase && typeof window._supabase.from === 'function') {
      return window._supabase;
    }
    if (typeof window !== 'undefined' && window.supabase && typeof window.supabase.from === 'function') {
      return window.supabase;
    }
    return null;
  }

  /**
   * Sync from Supabase if connected
   */
  async function syncFromSupabase() {
    var sb = getSupabaseClient();
    if (!sb || !_userId || _userId === 'guest') return;

    try {
      _isSyncing = true;

      // 1. Fetch portfolios
      var portRes = await sb
        .from('stock_portfolios')
        .select('*')
        .order('created_at', { ascending: true });

      if (portRes.data && portRes.data.length > 0) {
        _portfolios = portRes.data;
        if (!_activePortfolioId || !_portfolios.some(p => p.id === _activePortfolioId)) {
          var def = _portfolios.find(p => p.is_default) || _portfolios[0];
          _activePortfolioId = def.id;
        }
      } else {
        // Create initial default portfolio in Supabase
        var newPort = {
          id: generateUUID(),
          user_id: _userId,
          name: 'Main Portfolio',
          currency: 'INR',
          is_default: true
        };
        await sb.from('stock_portfolios').insert(newPort);
        _portfolios = [newPort];
        _activePortfolioId = newPort.id;
      }

      // 2. Fetch holdings
      var holdRes = await sb
        .from('stock_holdings')
        .select('*')
        .order('symbol', { ascending: true });

      if (holdRes.data) {
        _holdings = holdRes.data;
      }

      // 3. Fetch transactions
      var txRes = await sb
        .from('stock_transactions')
        .select('*')
        .order('transaction_date', { ascending: true });

      if (txRes.data) {
        _transactions = txRes.data;
      }

      saveLocalData();
    } catch (err) {
      console.warn('[StockPortfolioService] Supabase sync fallback to local:', err);
    } finally {
      _isSyncing = false;
    }
  }

  /**
   * Push change to Supabase in background
   */
  async function pushToSupabase(table, action, record, matchKey) {
    var sb = getSupabaseClient();
    if (!sb || !_userId || _userId === 'guest') return;
    try {
      if (action === 'insert') {
        await sb.from(table).insert(record);
      } else if (action === 'update') {
        var key = matchKey || 'id';
        await sb.from(table).update(record).eq(key, record[key]);
      } else if (action === 'delete') {
        var dKey = matchKey || 'id';
        await sb.from(table).delete().eq(dKey, record[dKey] || record);
      }
    } catch (e) {
      console.warn('[StockPortfolioService] Supabase push error for ' + table + ':', e);
    }
  }

  var LM_StockPortfolioService = {
    /**
     * Initialize service and hydrate data
     */
    init: async function (userId) {
      _userId = userId || (window.LM_Auth?.getCurrentUserId()) || 'guest';
      loadLocalData(_userId);
      ensureDefaultPortfolio();
      _initialized = true;

      // Hydrate from Supabase asynchronously
      await syncFromSupabase();

      // Fetch market quotes for active holdings
      this.refreshMarketQuotes(false);

      if (window.LM_Bus) {
        window.LM_Bus.emit('lm:stocks:ready', { userId: _userId });
      }

      return true;
    },

    /**
     * Get active portfolio
     */
    getActivePortfolio: function () {
      ensureDefaultPortfolio();
      return _portfolios.find(p => p.id === _activePortfolioId) || _portfolios[0];
    },

    /**
     * Switch active portfolio
     */
    setActivePortfolio: function (portfolioId) {
      if (_portfolios.some(p => p.id === portfolioId)) {
        _activePortfolioId = portfolioId;
        saveLocalData();
        if (window.LM_Bus) window.LM_Bus.emit('lm:stocks:changed');
        return true;
      }
      return false;
    },

    /**
     * Get all portfolios
     */
    getPortfolios: function () {
      ensureDefaultPortfolio();
      return _portfolios.slice();
    },

    /**
     * Create new portfolio
     */
    createPortfolio: async function (name) {
      var trimmed = (name || '').trim();
      if (!trimmed) throw new Error('Portfolio name cannot be empty');

      var newP = {
        id: generateUUID(),
        user_id: _userId,
        name: trimmed,
        currency: 'INR',
        is_default: _portfolios.length === 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      _portfolios.push(newP);
      _activePortfolioId = newP.id;
      saveLocalData();
      pushToSupabase('stock_portfolios', 'insert', newP);

      if (window.LM_Bus) window.LM_Bus.emit('lm:stocks:changed');
      return newP;
    },

    /**
     * Get all holdings for active portfolio with financial metrics
     */
    getHoldingsWithMetrics: function () {
      var port = this.getActivePortfolio();
      if (!port) return [];

      var portHoldings = _holdings.filter(h => h.portfolio_id === port.id);
      var result = [];

      portHoldings.forEach(function (h) {
        var txs = _transactions.filter(t => t.holding_id === h.id);
        var quote = window.LM_MarketDataService
          ? window.LM_MarketDataService.getCachedQuote(h.symbol, h.exchange)
          : null;

        var metrics = window.LM_StockCalculations.calculateHoldingMetrics(txs, quote);

        result.push({
          id: h.id,
          portfolio_id: h.portfolio_id,
          symbol: h.symbol,
          company_name: h.company_name,
          exchange: h.exchange || 'NSE',
          sector: h.sector || 'General',
          notes: h.notes || '',
          metrics: metrics,
          transactions: txs
        });
      });

      return result;
    },

    /**
     * Get single holding with metrics by ID
     */
    getHoldingById: function (holdingId) {
      var h = _holdings.find(item => item.id === holdingId);
      if (!h) return null;

      var txs = _transactions.filter(t => t.holding_id === h.id);
      var quote = window.LM_MarketDataService
        ? window.LM_MarketDataService.getCachedQuote(h.symbol, h.exchange)
        : null;

      var metrics = window.LM_StockCalculations.calculateHoldingMetrics(txs, quote);

      return {
        id: h.id,
        portfolio_id: h.portfolio_id,
        symbol: h.symbol,
        company_name: h.company_name,
        exchange: h.exchange || 'NSE',
        sector: h.sector || 'General',
        notes: h.notes || '',
        metrics: metrics,
        transactions: txs
      };
    },

    /**
     * Record a new BUY or SELL transaction
     */
    addTransaction: async function (data) {
      if (!data) throw new Error('Transaction data required');

      var port = this.getActivePortfolio();
      if (!port) throw new Error('No active portfolio selected');

      var symbol = (data.symbol || '').trim().toUpperCase();
      if (!symbol) throw new Error('Stock symbol is required');

      var companyName = (data.company_name || data.name || symbol).trim();
      var exchange = (data.exchange || 'NSE').trim().toUpperCase();
      var sector = (data.sector || 'General').trim();
      var txType = (data.transaction_type || data.type || 'BUY').trim().toUpperCase();
      if (txType !== 'BUY' && txType !== 'SELL') throw new Error('Transaction type must be BUY or SELL');

      var qty = Number(data.quantity);
      if (!Number.isFinite(qty) || qty <= 0) throw new Error('Quantity must be greater than 0');

      var price = Number(data.price);
      if (!Number.isFinite(price) || price <= 0) throw new Error('Price per share must be greater than 0');

      var brokerage = Math.max(0, Number(data.brokerage) || 0);
      var taxes = Math.max(0, Number(data.taxes) || 0);
      var txDate = data.transaction_date || new Date().toISOString().split('T')[0];
      var notes = (data.notes || '').trim();

      // Find or create holding
      var holding = _holdings.find(h =>
        h.portfolio_id === port.id &&
        h.symbol.toUpperCase() === symbol &&
        h.exchange.toUpperCase() === exchange
      );

      var isNewHolding = false;
      if (!holding) {
        if (txType === 'SELL') {
          throw new Error('Cannot SELL a stock that does not exist in your portfolio');
        }

        holding = {
          id: generateUUID(),
          portfolio_id: port.id,
          user_id: _userId,
          symbol: symbol,
          company_name: companyName,
          exchange: exchange,
          sector: sector,
          notes: '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        _holdings.push(holding);
        isNewHolding = true;
      } else {
        // Update sector or company name if empty
        if ((!holding.sector || holding.sector === 'General') && sector !== 'General') {
          holding.sector = sector;
        }
        if (holding.company_name === holding.symbol && companyName !== symbol) {
          holding.company_name = companyName;
        }
      }

      // Check overselling validation for SELL orders
      if (txType === 'SELL') {
        var existingTxs = _transactions.filter(t => t.holding_id === holding.id);
        var curMetrics = window.LM_StockCalculations.calculateHoldingMetrics(existingTxs, null);
        if (qty > curMetrics.quantity) {
          throw new Error(
            'Cannot sell ' + qty + ' shares. You currently own only ' +
            curMetrics.quantity + ' shares of ' + symbol + '.'
          );
        }
      }

      var newTx = {
        id: generateUUID(),
        holding_id: holding.id,
        portfolio_id: port.id,
        user_id: _userId,
        transaction_type: txType,
        quantity: qty,
        price: price,
        brokerage: brokerage,
        taxes: taxes,
        transaction_date: txDate,
        notes: notes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      _transactions.push(newTx);
      saveLocalData();

      // Register in StockRegistry if new
      if (window.LM_StockRegistry) {
        window.LM_StockRegistry.registerStock({
          symbol: symbol,
          name: companyName,
          exchange: exchange,
          sector: sector
        });
      }

      // Background push to Supabase
      if (isNewHolding) {
        pushToSupabase('stock_holdings', 'insert', holding);
      } else {
        pushToSupabase('stock_holdings', 'update', holding);
      }
      pushToSupabase('stock_transactions', 'insert', newTx);

      // Trigger market price fetch for this symbol
      if (window.LM_MarketDataService) {
        window.LM_MarketDataService.fetchQuote(symbol, exchange, true);
      }

      if (window.LM_Bus) {
        window.LM_Bus.emit('lm:stocks:changed');
        window.LM_Bus.emit('lm:data:changed');
      }

      return { holding: holding, transaction: newTx };
    },

    /**
     * Update an existing transaction
     */
    updateTransaction: async function (txId, data) {
      var txIndex = _transactions.findIndex(t => t.id === txId);
      if (txIndex === -1) throw new Error('Transaction not found');

      var tx = _transactions[txIndex];
      var qty = Number(data.quantity);
      if (!Number.isFinite(qty) || qty <= 0) throw new Error('Quantity must be greater than 0');

      var price = Number(data.price);
      if (!Number.isFinite(price) || price <= 0) throw new Error('Price per share must be greater than 0');

      var brokerage = Math.max(0, Number(data.brokerage) || 0);
      var taxes = Math.max(0, Number(data.taxes) || 0);
      var txDate = data.transaction_date || tx.transaction_date;
      var notes = typeof data.notes === 'string' ? data.notes.trim() : tx.notes;
      var txType = (data.transaction_type || tx.transaction_type || 'BUY').toUpperCase();

      // Temporarily mock updated list to validate total quantity >= 0
      var testList = _transactions.slice();
      testList[txIndex] = Object.assign({}, tx, {
        transaction_type: txType,
        quantity: qty,
        price: price,
        brokerage: brokerage,
        taxes: taxes,
        transaction_date: txDate
      });

      var holdingTxs = testList.filter(t => t.holding_id === tx.holding_id);
      var testMetrics = window.LM_StockCalculations.calculateHoldingMetrics(holdingTxs, null);
      if (testMetrics.quantity < 0) {
        throw new Error('This edit would result in negative stock quantity (' + testMetrics.quantity + ').');
      }

      // Apply update
      tx.transaction_type = txType;
      tx.quantity = qty;
      tx.price = price;
      tx.brokerage = brokerage;
      tx.taxes = taxes;
      tx.transaction_date = txDate;
      tx.notes = notes;
      tx.updated_at = new Date().toISOString();

      saveLocalData();
      pushToSupabase('stock_transactions', 'update', tx);

      if (window.LM_Bus) {
        window.LM_Bus.emit('lm:stocks:changed');
        window.LM_Bus.emit('lm:data:changed');
      }

      return tx;
    },

    /**
     * Delete a single transaction
     */
    deleteTransaction: async function (txId) {
      var txIndex = _transactions.findIndex(t => t.id === txId);
      if (txIndex === -1) throw new Error('Transaction not found');

      var tx = _transactions[txIndex];
      var holdingId = tx.holding_id;

      // Verify that removing this transaction doesn't produce negative quantity for subsequent sells
      var remainingTxs = _transactions.filter(t => t.id !== txId && t.holding_id === holdingId);
      var metrics = window.LM_StockCalculations.calculateHoldingMetrics(remainingTxs, null);
      if (metrics.quantity < 0) {
        throw new Error('Cannot delete this BUY transaction as subsequent SELL orders depend on these shares.');
      }

      _transactions.splice(txIndex, 1);

      // If holding has 0 transactions left, optionally remove the holding record
      if (remainingTxs.length === 0) {
        var hIdx = _holdings.findIndex(h => h.id === holdingId);
        if (hIdx !== -1) {
          var removedH = _holdings.splice(hIdx, 1)[0];
          pushToSupabase('stock_holdings', 'delete', removedH);
        }
      }

      saveLocalData();
      pushToSupabase('stock_transactions', 'delete', { id: txId });

      if (window.LM_Bus) {
        window.LM_Bus.emit('lm:stocks:changed');
        window.LM_Bus.emit('lm:data:changed');
      }

      return true;
    },

    /**
     * Delete an entire holding and all its transactions
     */
    deleteHolding: async function (holdingId) {
      var hIdx = _holdings.findIndex(h => h.id === holdingId);
      if (hIdx === -1) throw new Error('Holding not found');

      var holding = _holdings[hIdx];
      _holdings.splice(hIdx, 1);
      _transactions = _transactions.filter(t => t.holding_id !== holdingId);

      saveLocalData();
      pushToSupabase('stock_holdings', 'delete', holding);

      if (window.LM_Bus) {
        window.LM_Bus.emit('lm:stocks:changed');
        window.LM_Bus.emit('lm:data:changed');
      }

      return true;
    },

    /**
     * Get all transactions with stock metadata
     */
    getAllTransactions: function () {
      var port = this.getActivePortfolio();
      if (!port) return [];

      var portTxs = _transactions.filter(t => t.portfolio_id === port.id);
      var holdingMap = {};
      _holdings.forEach(h => { holdingMap[h.id] = h; });

      return portTxs.map(function (tx) {
        var h = holdingMap[tx.holding_id] || {};
        var gross = (Number(tx.quantity) || 0) * (Number(tx.price) || 0);
        var charges = (Number(tx.brokerage) || 0) + (Number(tx.taxes) || 0);
        var net = tx.transaction_type === 'BUY' ? (gross + charges) : (gross - charges);

        return {
          id: tx.id,
          holding_id: tx.holding_id,
          portfolio_id: tx.portfolio_id,
          symbol: h.symbol || 'UNKNOWN',
          company_name: h.company_name || h.symbol || 'Unknown Stock',
          exchange: h.exchange || 'NSE',
          sector: h.sector || 'General',
          transaction_type: tx.transaction_type,
          quantity: Number(tx.quantity),
          price: Number(tx.price),
          brokerage: Number(tx.brokerage || 0),
          taxes: Number(tx.taxes || 0),
          gross_amount: Math.round(gross * 100) / 100,
          net_amount: Math.round(net * 100) / 100,
          transaction_date: tx.transaction_date,
          notes: tx.notes || '',
          created_at: tx.created_at
        };
      }).sort(function (a, b) {
        return new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime();
      });
    },

    /**
     * Get portfolio summary metrics
     */
    getPortfolioSummary: function () {
      var holdingsWithMetrics = this.getHoldingsWithMetrics();
      return window.LM_StockCalculations.calculatePortfolioSummary(holdingsWithMetrics);
    },

    /**
     * Refresh market quotes for all active holdings
     */
    refreshMarketQuotes: async function (force) {
      if (!window.LM_MarketDataService) return {};
      var portHoldings = this.getHoldingsWithMetrics();
      if (!portHoldings || portHoldings.length === 0) return {};

      var items = portHoldings.map(h => ({ symbol: h.symbol, exchange: h.exchange }));
      var quotes = await window.LM_MarketDataService.fetchBatchQuotes(items, force);

      if (window.LM_Bus) {
        window.LM_Bus.emit('lm:stocks:quotes_updated', quotes);
      }

      return quotes;
    }
  };

  window.LM_StockPortfolioService = LM_StockPortfolioService;
})();
