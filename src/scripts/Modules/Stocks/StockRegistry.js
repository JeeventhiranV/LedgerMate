/**
 * LedgerMate – StockRegistry.js
 * ─────────────────────────────────────────────────────────────
 * Comprehensive Indian Stock Registry & Search Engine.
 * Covers Nifty 50, Nifty Next 50, Sensex, and popular NSE/BSE equities.
 * Exposes: window.LM_StockRegistry
 * ─────────────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  var INDIAN_STOCKS = [
    // ── NIFTY 50 / BLUECHIP EQUITIES ──
    { symbol: 'RELIANCE', name: 'Reliance Industries Ltd', exchange: 'NSE', bseCode: '500325', sector: 'Energy & Petrochemicals' },
    { symbol: 'TCS', name: 'Tata Consultancy Services Ltd', exchange: 'NSE', bseCode: '532540', sector: 'Information Technology' },
    { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd', exchange: 'NSE', bseCode: '500180', sector: 'Banking & Financials' },
    { symbol: 'INFY', name: 'Infosys Ltd', exchange: 'NSE', bseCode: '500209', sector: 'Information Technology' },
    { symbol: 'ICICIBANK', name: 'ICICI Bank Ltd', exchange: 'NSE', bseCode: '532174', sector: 'Banking & Financials' },
    { symbol: 'BHARTIARTL', name: 'Bharti Airtel Ltd', exchange: 'NSE', bseCode: '532454', sector: 'Telecommunications' },
    { symbol: 'SBIN', name: 'State Bank of India', exchange: 'NSE', bseCode: '500112', sector: 'Banking & Financials' },
    { symbol: 'ITC', name: 'ITC Ltd', exchange: 'NSE', bseCode: '500875', sector: 'FMCG' },
    { symbol: 'LT', name: 'Larsen & Toubro Ltd', exchange: 'NSE', bseCode: '500510', sector: 'Infrastructure & Engineering' },
    { symbol: 'HINDUNILVR', name: 'Hindustan Unilever Ltd', exchange: 'NSE', bseCode: '500696', sector: 'FMCG' },
    { symbol: 'BAJFINANCE', name: 'Bajaj Finance Ltd', exchange: 'NSE', bseCode: '500034', sector: 'Financial Services' },
    { symbol: 'HCLTECH', name: 'HCL Technologies Ltd', exchange: 'NSE', bseCode: '532281', sector: 'Information Technology' },
    { symbol: 'MARUTI', name: 'Maruti Suzuki India Ltd', exchange: 'NSE', bseCode: '532500', sector: 'Automobile' },
    { symbol: 'SUNPHARMA', name: 'Sun Pharmaceutical Industries Ltd', exchange: 'NSE', bseCode: '524715', sector: 'Healthcare & Pharma' },
    { symbol: 'TATAMOTORS', name: 'Tata Motors Ltd', exchange: 'NSE', bseCode: '500570', sector: 'Automobile' },
    { symbol: 'KOTAKBANK', name: 'Kotak Mahindra Bank Ltd', exchange: 'NSE', bseCode: '500247', sector: 'Banking & Financials' },
    { symbol: 'AXISBANK', name: 'Axis Bank Ltd', exchange: 'NSE', bseCode: '532215', sector: 'Banking & Financials' },
    { symbol: 'NTPC', name: 'NTPC Ltd', exchange: 'NSE', bseCode: '532555', sector: 'Power & Energy' },
    { symbol: 'ONGC', name: 'Oil & Natural Gas Corporation Ltd', exchange: 'NSE', bseCode: '500312', sector: 'Energy & Petrochemicals' },
    { symbol: 'TITAN', name: 'Titan Company Ltd', exchange: 'NSE', bseCode: '500114', sector: 'Consumer Discretionary' },
    { symbol: 'ADANIENT', name: 'Adani Enterprises Ltd', exchange: 'NSE', bseCode: '512599', sector: 'Metals & Mining' },
    { symbol: 'ADANIPORTS', name: 'Adani Ports and Special Economic Zone Ltd', exchange: 'NSE', bseCode: '532921', sector: 'Infrastructure & Logistics' },
    { symbol: 'BAJAJFINSV', name: 'Bajaj Finserv Ltd', exchange: 'NSE', bseCode: '532978', sector: 'Financial Services' },
    { symbol: 'POWERGRID', name: 'Power Grid Corporation of India Ltd', exchange: 'NSE', bseCode: '532898', sector: 'Power & Energy' },
    { symbol: 'TATASTEEL', name: 'Tata Steel Ltd', exchange: 'NSE', bseCode: '500470', sector: 'Metals & Mining' },
    { symbol: 'M&M', name: 'Mahindra & Mahindra Ltd', exchange: 'NSE', bseCode: '500520', sector: 'Automobile' },
    { symbol: 'COALINDIA', name: 'Coal India Ltd', exchange: 'NSE', bseCode: '533278', sector: 'Energy & Mining' },
    { symbol: 'WIPRO', name: 'Wipro Ltd', exchange: 'NSE', bseCode: '507685', sector: 'Information Technology' },
    { symbol: 'ASIANPAINT', name: 'Asian Paints Ltd', exchange: 'NSE', bseCode: '500820', sector: 'Consumer & Paints' },
    { symbol: 'ULTRACEMCO', name: 'UltraTech Cement Ltd', exchange: 'NSE', bseCode: '532538', sector: 'Materials & Cement' },
    { symbol: 'JSWSTEEL', name: 'JSW Steel Ltd', exchange: 'NSE', bseCode: '500228', sector: 'Metals & Mining' },
    { symbol: 'NESTLEIND', name: 'Nestle India Ltd', exchange: 'NSE', bseCode: '500790', sector: 'FMCG' },
    { symbol: 'GRASIM', name: 'Grasim Industries Ltd', exchange: 'NSE', bseCode: '500300', sector: 'Materials & Chemicals' },
    { symbol: 'TECHM', name: 'Tech Mahindra Ltd', exchange: 'NSE', bseCode: '532755', sector: 'Information Technology' },
    { symbol: 'HINDALCO', name: 'Hindalco Industries Ltd', exchange: 'NSE', bseCode: '500440', sector: 'Metals & Mining' },
    { symbol: 'CIPLA', name: 'Cipla Ltd', exchange: 'NSE', bseCode: '500087', sector: 'Healthcare & Pharma' },
    { symbol: 'DRREDDY', name: "Dr. Reddy's Laboratories Ltd", exchange: 'NSE', bseCode: '500124', sector: 'Healthcare & Pharma' },
    { symbol: 'HEROMOTOCO', name: 'Hero MotoCorp Ltd', exchange: 'NSE', bseCode: '500182', sector: 'Automobile' },
    { symbol: 'BRITANNIA', name: 'Britannia Industries Ltd', exchange: 'NSE', bseCode: '500825', sector: 'FMCG' },
    { symbol: 'EICHERMOT', name: 'Eicher Motors Ltd', exchange: 'NSE', bseCode: '505200', sector: 'Automobile' },
    { symbol: 'APOLLOHOSP', name: 'Apollo Hospitals Enterprise Ltd', exchange: 'NSE', bseCode: '508869', sector: 'Healthcare' },
    { symbol: 'TATACONSUM', name: 'Tata Consumer Products Ltd', exchange: 'NSE', bseCode: '500800', sector: 'FMCG' },
    { symbol: 'DIVISLAB', name: "Divi's Laboratories Ltd", exchange: 'NSE', bseCode: '532488', sector: 'Healthcare & Pharma' },
    { symbol: 'INDUSINDBK', name: 'IndusInd Bank Ltd', exchange: 'NSE', bseCode: '532187', sector: 'Banking & Financials' },
    { symbol: 'BPCL', name: 'Bharat Petroleum Corporation Ltd', exchange: 'NSE', bseCode: '500547', sector: 'Energy & Petrochemicals' },
    { symbol: 'SBILIFE', name: 'SBI Life Insurance Company Ltd', exchange: 'NSE', bseCode: '540719', sector: 'Insurance & Financials' },
    { symbol: 'HDFCLIFE', name: 'HDFC Life Insurance Company Ltd', exchange: 'NSE', bseCode: '540777', sector: 'Insurance & Financials' },
    { symbol: 'BAJAJ-AUTO', name: 'Bajaj Auto Ltd', exchange: 'NSE', bseCode: '532977', sector: 'Automobile' },
    { symbol: 'SHRIRAMFIN', name: 'Shriram Finance Ltd', exchange: 'NSE', bseCode: '511218', sector: 'Financial Services' },
    { symbol: 'TRENT', name: 'Trent Ltd', exchange: 'NSE', bseCode: '500251', sector: 'Retail & Consumer' },
    { symbol: 'BEL', name: 'Bharat Electronics Ltd', exchange: 'NSE', bseCode: '500049', sector: 'Defense & Aerospace' },

    // ── NIFTY NEXT 50 & HIGH GROWTH LEADERS ──
    { symbol: 'HAL', name: 'Hindustan Aeronautics Ltd', exchange: 'NSE', bseCode: '541154', sector: 'Defense & Aerospace' },
    { symbol: 'ZOMATO', name: 'Zomato Ltd (Eternal)', exchange: 'NSE', bseCode: '543320', sector: 'Consumer Internet' },
    { symbol: 'JIOFIN', name: 'Jio Financial Services Ltd', exchange: 'NSE', bseCode: '543940', sector: 'Financial Services' },
    { symbol: 'VEDL', name: 'Vedanta Ltd', exchange: 'NSE', bseCode: '500295', sector: 'Metals & Mining' },
    { symbol: 'TATAPOWER', name: 'Tata Power Company Ltd', exchange: 'NSE', bseCode: '500400', sector: 'Power & Energy' },
    { symbol: 'IRFC', name: 'Indian Railway Finance Corporation Ltd', exchange: 'NSE', bseCode: '543257', sector: 'Financial Services' },
    { symbol: 'PFC', name: 'Power Finance Corporation Ltd', exchange: 'NSE', bseCode: '532810', sector: 'Financial Services' },
    { symbol: 'RECLTD', name: 'REC Ltd', exchange: 'NSE', bseCode: '532955', sector: 'Financial Services' },
    { symbol: 'IOC', name: 'Indian Oil Corporation Ltd', exchange: 'NSE', bseCode: '530965', sector: 'Energy & Petrochemicals' },
    { symbol: 'GAIL', name: 'GAIL (India) Ltd', exchange: 'NSE', bseCode: '532155', sector: 'Energy & Utilities' },
    { symbol: 'DLF', name: 'DLF Ltd', exchange: 'NSE', bseCode: '532868', sector: 'Real Estate' },
    { symbol: 'VBL', name: 'Varun Beverages Ltd', exchange: 'NSE', bseCode: '540180', sector: 'FMCG & Beverages' },
    { symbol: 'SIEMENS', name: 'Siemens Ltd', exchange: 'NSE', bseCode: '500550', sector: 'Capital Goods' },
    { symbol: 'ABB', name: 'ABB India Ltd', exchange: 'NSE', bseCode: '500002', sector: 'Capital Goods' },
    { symbol: 'CHOLAFIN', name: 'Cholamandalam Investment and Finance Co', exchange: 'NSE', bseCode: '511243', sector: 'Financial Services' },
    { symbol: 'BANKBARODA', name: 'Bank of Baroda', exchange: 'NSE', bseCode: '532134', sector: 'Banking & Financials' },
    { symbol: 'PNB', name: 'Punjab National Bank', exchange: 'NSE', bseCode: '532461', sector: 'Banking & Financials' },
    { symbol: 'CANBK', name: 'Canara Bank', exchange: 'NSE', bseCode: '532486', sector: 'Banking & Financials' },
    { symbol: 'UNIONBANK', name: 'Union Bank of India', exchange: 'NSE', bseCode: '532477', sector: 'Banking & Financials' },
    { symbol: 'IDFCFIRSTB', name: 'IDFC First Bank Ltd', exchange: 'NSE', bseCode: '539437', sector: 'Banking & Financials' },
    { symbol: 'FEDERALBNK', name: 'The Federal Bank Ltd', exchange: 'NSE', bseCode: '500469', sector: 'Banking & Financials' },
    { symbol: 'INDHOTEL', name: 'The Indian Hotels Company Ltd (Taj)', exchange: 'NSE', bseCode: '500850', sector: 'Hospitality & Tourism' },
    { symbol: 'POLYCAB', name: 'Polycab India Ltd', exchange: 'NSE', bseCode: '542652', sector: 'Capital Goods & Cables' },
    { symbol: 'HAVELLS', name: 'Havells India Ltd', exchange: 'NSE', bseCode: '517354', sector: 'Consumer Electronics' },
    { symbol: 'GODREJCP', name: 'Godrej Consumer Products Ltd', exchange: 'NSE', bseCode: '532424', sector: 'FMCG' },
    { symbol: 'DABUR', name: 'Dabur India Ltd', exchange: 'NSE', bseCode: '500096', sector: 'FMCG' },
    { symbol: 'MARICO', name: 'Marico Ltd', exchange: 'NSE', bseCode: '531642', sector: 'FMCG' },
    { symbol: 'PIDILITIND', name: 'Pidilite Industries Ltd (Fevicol)', exchange: 'NSE', bseCode: '500331', sector: 'Chemicals & Adhesives' },
    { symbol: 'BERGEPAINT', name: 'Berger Paints India Ltd', exchange: 'NSE', bseCode: '509480', sector: 'Consumer & Paints' },
    { symbol: 'LTIM', name: 'LTIMindtree Ltd', exchange: 'NSE', bseCode: '540005', sector: 'Information Technology' },
    { symbol: 'PERSISTENT', name: 'Persistent Systems Ltd', exchange: 'NSE', bseCode: '533179', sector: 'Information Technology' },
    { symbol: 'COFORGE', name: 'Coforge Ltd', exchange: 'NSE', bseCode: '532541', sector: 'Information Technology' },
    { symbol: 'KPITTECH', name: 'KPIT Technologies Ltd', exchange: 'NSE', bseCode: '542651', sector: 'Information Technology' },
    { symbol: 'TATAELXSI', name: 'Tata Elxsi Ltd', exchange: 'NSE', bseCode: '500408', sector: 'Information Technology' },
    { symbol: 'TATACOMM', name: 'Tata Communications Ltd', exchange: 'NSE', bseCode: '500483', sector: 'Telecommunications' },
    { symbol: 'TATATECH', name: 'Tata Technologies Ltd', exchange: 'NSE', bseCode: '544028', sector: 'Information Technology' },
    { symbol: 'BOSCHLTD', name: 'Bosch Ltd', exchange: 'NSE', bseCode: '500530', sector: 'Auto Ancillaries' },
    { symbol: 'MOTHERSON', name: 'Samvardhana Motherson International Ltd', exchange: 'NSE', bseCode: '517334', sector: 'Auto Ancillaries' },
    { symbol: 'TVSMOTOR', name: 'TVS Motor Company Ltd', exchange: 'NSE', bseCode: '532343', sector: 'Automobile' },
    { symbol: 'ASHOKLEY', name: 'Ashok Leyland Ltd', exchange: 'NSE', bseCode: '500477', sector: 'Automobile' },
    { symbol: 'LUPIN', name: 'Lupin Ltd', exchange: 'NSE', bseCode: '500257', sector: 'Healthcare & Pharma' },
    { symbol: 'AUROPHARMA', name: 'Aurobindo Pharma Ltd', exchange: 'NSE', bseCode: '524804', sector: 'Healthcare & Pharma' },
    { symbol: 'MANKIND', name: 'Mankind Pharma Ltd', exchange: 'NSE', bseCode: '543904', sector: 'Healthcare & Pharma' },
    { symbol: 'MAXHEALTH', name: 'Max Healthcare Institute Ltd', exchange: 'NSE', bseCode: '543220', sector: 'Healthcare' },
    { symbol: 'BSE', name: 'BSE Ltd', exchange: 'NSE', bseCode: '540376', sector: 'Financial Exchanges' },
    { symbol: 'CDSL', name: 'Central Depository Services (India) Ltd', exchange: 'NSE', bseCode: '540528', sector: 'Financial Exchanges' },
    { symbol: 'CAMS', name: 'Computer Age Management Services Ltd', exchange: 'NSE', bseCode: '543232', sector: 'Financial Services' },
    { symbol: 'SUZLON', name: 'Suzlon Energy Ltd', exchange: 'NSE', bseCode: '532667', sector: 'Renewable Energy' },
    { symbol: 'IREDA', name: 'Indian Renewable Energy Dev Agency', exchange: 'NSE', bseCode: '544026', sector: 'Renewable Energy' },
    { symbol: 'NHPC', name: 'NHPC Ltd', exchange: 'NSE', bseCode: '533098', sector: 'Power & Energy' },
    { symbol: 'SJVN', name: 'SJVN Ltd', exchange: 'NSE', bseCode: '533206', sector: 'Power & Energy' },
    { symbol: 'RVNL', name: 'Rail Vikas Nigam Ltd', exchange: 'NSE', bseCode: '542649', sector: 'Railways & Infrastructure' },
    { symbol: 'IRCON', name: 'Ircon International Ltd', exchange: 'NSE', bseCode: '541956', sector: 'Railways & Infrastructure' },
    { symbol: 'MAZDOCK', name: 'Mazagon Dock Shipbuilders Ltd', exchange: 'NSE', bseCode: '543237', sector: 'Defense & Shipbuilding' },
    { symbol: 'COCHINSHIP', name: 'Cochin Shipyard Ltd', exchange: 'NSE', bseCode: '540678', sector: 'Defense & Shipbuilding' },
    { symbol: 'BDL', name: 'Bharat Dynamics Ltd', exchange: 'NSE', bseCode: '541143', sector: 'Defense & Aerospace' },
    { symbol: 'PAYTM', name: 'One97 Communications Ltd (Paytm)', exchange: 'NSE', bseCode: '543396', sector: 'Fintech' },
    { symbol: 'NYKAA', name: 'FSN E-Commerce Ventures Ltd (Nykaa)', exchange: 'NSE', bseCode: '543384', sector: 'Consumer Internet' },
    { symbol: 'POLICYBZR', name: 'PB Fintech Ltd (Policybazaar)', exchange: 'NSE', bseCode: '543390', sector: 'Fintech' },
    { symbol: 'DEEPAKNTR', name: 'Deepak Nitrite Ltd', exchange: 'NSE', bseCode: '506401', sector: 'Specialty Chemicals' },
    { symbol: 'SRF', name: 'SRF Ltd', exchange: 'NSE', bseCode: '503806', sector: 'Specialty Chemicals' },
    { symbol: 'NAVINFLUOR', name: 'Navin Fluorine International Ltd', exchange: 'NSE', bseCode: '532504', sector: 'Specialty Chemicals' }
  ];

  // Custom user-added stocks stored in localStorage
  var CUSTOM_STOCKS_KEY = 'lm_custom_stocks';

  function getCustomStocks() {
    try {
      var raw = localStorage.getItem(CUSTOM_STOCKS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveCustomStock(stock) {
    if (!stock || !stock.symbol) return false;
    var list = getCustomStocks();
    var exists = list.some(function (s) {
      return s.symbol.toUpperCase() === stock.symbol.toUpperCase() && s.exchange === stock.exchange;
    });
    if (!exists) {
      list.push({
        symbol: stock.symbol.toUpperCase().trim(),
        name: (stock.name || stock.symbol).trim(),
        exchange: (stock.exchange || 'NSE').toUpperCase(),
        sector: stock.sector || 'General'
      });
      try {
        localStorage.setItem(CUSTOM_STOCKS_KEY, JSON.stringify(list));
      } catch (e) {}
    }
    return true;
  }

  function getAllStocks() {
    var custom = getCustomStocks();
    return INDIAN_STOCKS.concat(custom);
  }

  var LM_StockRegistry = {
    /**
     * Fast search across Symbol, Company Name, and Sector.
     */
    search: function (query, limit) {
      if (!query || typeof query !== 'string') return [];
      var q = query.trim().toUpperCase();
      var max = limit || 15;
      if (!q) return [];

      var all = getAllStocks();
      var exactMatch = [];
      var startsWithSymbol = [];
      var startsWithName = [];
      var containsSymbol = [];
      var containsName = [];

      all.forEach(function (s) {
        var sym = (s.symbol || '').toUpperCase();
        var name = (s.name || '').toUpperCase();

        if (sym === q) {
          exactMatch.push(s);
        } else if (sym.startsWith(q)) {
          startsWithSymbol.push(s);
        } else if (name.startsWith(q)) {
          startsWithName.push(s);
        } else if (sym.includes(q)) {
          containsSymbol.push(s);
        } else if (name.includes(q)) {
          containsName.push(s);
        }
      });

      var combined = exactMatch
        .concat(startsWithSymbol)
        .concat(startsWithName)
        .concat(containsSymbol)
        .concat(containsName);

      // De-duplicate by symbol + exchange
      var seen = {};
      var result = [];
      for (var i = 0; i < combined.length; i++) {
        var item = combined[i];
        var key = item.symbol + '_' + item.exchange;
        if (!seen[key]) {
          seen[key] = true;
          result.push(item);
          if (result.length >= max) break;
        }
      }

      return result;
    },

    /**
     * Find a stock by symbol and optional exchange
     */
    getBySymbol: function (symbol, exchange) {
      if (!symbol) return null;
      var sym = symbol.trim().toUpperCase();
      var ex = (exchange || 'NSE').toUpperCase();
      var all = getAllStocks();

      var match = all.find(function (s) {
        return s.symbol.toUpperCase() === sym && (!exchange || s.exchange.toUpperCase() === ex);
      });

      if (!match) {
        // Try symbol only
        match = all.find(function (s) {
          return s.symbol.toUpperCase() === sym;
        });
      }

      return match || {
        symbol: sym,
        name: sym,
        exchange: ex,
        sector: 'General'
      };
    },

    /**
     * List all distinct sectors
     */
    getSectors: function () {
      var all = getAllStocks();
      var map = {};
      all.forEach(function (s) {
        if (s.sector) map[s.sector] = true;
      });
      return Object.keys(map).sort();
    },

    /**
     * Register a newly added stock dynamically
     */
    registerStock: function (stock) {
      return saveCustomStock(stock);
    },

    /**
     * Return popular Nifty 50 stocks
     */
    getPopularStocks: function () {
      return INDIAN_STOCKS.slice(0, 15);
    },

    /**
     * Reference baseline quote for Indian stocks when external feeds are blocked
     * (Disabled to prevent obsolete static baseline numbers from overriding live prices)
     */
    getReferenceQuote: function (symbol, exchange) {
      return null;
    },

    /**
     * Get user custom stocks for export
     */
    getCustomStocks: getCustomStocks,

    /**
     * Import user custom stocks from backup
     */
    importCustomStocks: function (list) {
      if (!Array.isArray(list)) return;
      try {
        localStorage.setItem(CUSTOM_STOCKS_KEY, JSON.stringify(list));
      } catch (e) {}
    }
  };

  window.LM_StockRegistry = LM_StockRegistry;
})();
