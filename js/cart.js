/* Healthy — shopping cart (Vanilla JS + LocalStorage)
   Only product ids and quantities are stored. Names and prices are always
   read from the catalog, so a price change in products.js applies to existing carts. */
(function () {
  'use strict';
  var KEY = 'healthy_cart_v1';
  var byId = new Map(PRODUCTS.map(function (p) { return [p.id, p]; }));
  var items = [];

  function maxQty() { return STORE_CONFIG.maxQtyPerItem || 99; }
  function clampQty(q) {
    q = Math.floor(Number(q));
    if (!isFinite(q) || q < 1) return 0;
    return Math.min(q, maxQty());
  }
  function round2(n) { return Math.round(n * 100) / 100; }
  function fmt(n) {
    var r = round2(n);
    return Number.isInteger(r) ? String(r) : r.toFixed(2).replace(/0$/, '');
  }
  function money(n) { return fmt(n) + ' ' + STORE_CONFIG.currencyLabel; }

  function load() {
    var seen = {};
    try {
      var raw = JSON.parse(localStorage.getItem(KEY) || '[]');
      items = (Array.isArray(raw) ? raw : []).map(function (i) {
        return { id: Number(i && i.id), qty: clampQty(i && i.qty) };
      }).filter(function (i) {
        if (!byId.has(i.id) || i.qty < 1 || seen[i.id]) return false;
        seen[i.id] = true; return true;
      });
    } catch (e) { items = []; }
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (e) { /* storage blocked: cart lives for this page only */ } }
  function emit(detail) { document.dispatchEvent(new CustomEvent('cart:change', { detail: detail || {} })); }
  function find(id) { for (var i = 0; i < items.length; i++) if (items[i].id === id) return items[i]; return null; }

  var Cart = {
    fmt: fmt, money: money, round2: round2,
    product: function (id) { return byId.get(Number(id)); },
    qty: function (id) { var it = find(Number(id)); return it ? it.qty : 0; },
    count: function () { return items.reduce(function (s, i) { return s + i.qty; }, 0); },
    isEmpty: function () { return items.length === 0; },

    /** @returns {{ok:boolean, reason?:string, qty?:number}} */
    add: function (id, n) {
      id = Number(id); n = n || 1;
      var p = byId.get(id);
      if (!p) return { ok: false, reason: 'missing' };
      if (!p.available) return { ok: false, reason: 'unavailable' };
      var it = find(id);
      var next = (it ? it.qty : 0) + n;
      if (next > maxQty()) return { ok: false, reason: 'max', qty: it ? it.qty : 0 };
      if (it) it.qty = next; else items.push({ id: id, qty: next });
      save(); emit({ id: id, type: 'add' });
      return { ok: true, qty: next };
    },
    /** Decrease by one; at quantity 1 the line is removed. @returns removed line or null */
    dec: function (id) {
      id = Number(id);
      var it = find(id);
      if (!it) return null;
      if (it.qty > 1) { it.qty -= 1; save(); emit({ id: id, type: 'dec' }); return null; }
      return Cart.remove(id);
    },
    remove: function (id) {
      id = Number(id);
      var idx = items.findIndex(function (i) { return i.id === id; });
      if (idx < 0) return null;
      var removed = items.splice(idx, 1)[0];
      save(); emit({ id: id, type: 'remove' });
      return removed;
    },
    restore: function (line) {
      if (!line || !byId.has(line.id) || find(line.id)) return;
      items.push({ id: line.id, qty: clampQty(line.qty) || 1 });
      save(); emit({ id: line.id, type: 'restore' });
    },
    clear: function () { items = []; save(); emit({ type: 'clear' }); },

    lines: function () {
      return items.map(function (i) {
        var p = byId.get(i.id);
        return { product: p, qty: i.qty, unit: p.price, total: round2(p.price * i.qty), available: !!p.available };
      });
    },
    hasUnavailable: function () { return Cart.lines().some(function (l) { return !l.available; }); },
    subtotal: function () {
      return round2(Cart.lines().reduce(function (s, l) { return l.available ? s + l.total : s; }, 0));
    },
    /** @param {'delivery'|'pickup'} method */
    totals: function (method) {
      var subtotal = Cart.subtotal();
      var fee = Number(STORE_CONFIG.deliveryFee) || 0;
      var min = STORE_CONFIG.freeDeliveryMinimum;
      var free = min != null && subtotal >= min;
      var delivery = (method === 'pickup' || subtotal === 0 || free) ? 0 : fee;
      var toFree = (method !== 'pickup' && min != null && subtotal > 0 && subtotal < min) ? round2(min - subtotal) : 0;
      return { subtotal: subtotal, delivery: delivery, total: round2(subtotal + delivery), freeDelivery: free && method !== 'pickup', toFree: toFree };
    }
  };

  load();
  // keep several open tabs in sync
  window.addEventListener('storage', function (e) { if (e.key === KEY) { load(); emit({ type: 'sync' }); } });
  window.Cart = Cart;
})();
