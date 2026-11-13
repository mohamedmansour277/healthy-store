/* Healthy — shared UI: header, sheets, search, toast, product cards, cart sync, homepage rendering */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var CAT = {}; CATEGORIES.forEach(function (c) { CAT[c.id] = c; });

  /* ---------- utils ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  // Arabic-friendly normalisation for search: strips tashkeel, unifies alef/yaa/taa-marbuta, maps Arabic digits
  function norm(s) {
    return String(s || '').toLowerCase()
      .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
      .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
      .replace(/[٠-٩]/g, function (d) { return String(d.charCodeAt(0) - 1632); })
      .replace(/\s+/g, ' ').trim();
  }
  function isSale(p) { return !!(p.onSale && p.oldPrice && p.oldPrice > p.price); }
  function pct(p) { return Math.round((1 - p.price / p.oldPrice) * 100); }
  function waNumber() { var n = String(STORE_CONFIG.whatsappNumber || '').replace(/\D/g, ''); return /^\d{10,15}$/.test(n) ? n : ''; }

  /* ---------- toast + live region ---------- */
  var toastEl, toastTimer;
  function toast(msg, opt) {
    opt = opt || {};
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast'; toastEl.setAttribute('role', 'status');
      document.body.appendChild(toastEl);
    }
    clearTimeout(toastTimer);
    toastEl.innerHTML = '<span class="toast__msg">' + esc(msg) + '</span>' +
      (opt.action ? '<button type="button" class="toast__act">' + esc(opt.action.label) + '</button>' : '');
    var btn = $('.toast__act', toastEl);
    if (btn) btn.onclick = function () { opt.action.onClick(); hide(); };
    toastEl.classList.add('is-on');
    function hide() { toastEl.classList.remove('is-on'); }
    toastTimer = setTimeout(hide, opt.timeout || (opt.action ? 6000 : 2600));
  }
  function announce(msg) { var l = $('#sr-live'); if (l) { l.textContent = ''; setTimeout(function () { l.textContent = msg; }, 30); } }

  /* ---------- product card ---------- */
  function actionHTML(p) {
    if (!p.available) return '<button class="act-add" type="button" disabled><span>غير متوفر حاليًا</span></button>';
    var q = Cart.qty(p.id);
    if (!q) return '<button class="act-add" type="button" data-add="' + p.id + '" aria-label="أضف ' + esc(p.name) + ' إلى السلة"><i class="bi bi-bag-plus" aria-hidden="true"></i><span>أضف للسلة</span></button>';
    var atMax = q >= (STORE_CONFIG.maxQtyPerItem || 99);
    return '<div class="act-step" role="group" aria-label="كمية ' + esc(p.name) + '">' +
      '<button type="button" data-dec="' + p.id + '" aria-label="' + (q === 1 ? 'حذف ' + esc(p.name) + ' من السلة' : 'تقليل الكمية') + '"><i class="bi ' + (q === 1 ? 'bi-trash3' : 'bi-dash-lg') + '" aria-hidden="true"></i></button>' +
      '<output><b>' + q + '</b><span> في السلة</span></output>' +
      '<button type="button" data-inc="' + p.id + '" aria-label="زيادة الكمية"' + (atMax ? ' disabled' : '') + '><i class="bi bi-plus-lg" aria-hidden="true"></i></button></div>';
  }
  function stockHTML(p) {
    return p.available ? '<span class="stock stock--in"><i></i>متوفر</span>' : '<span class="stock stock--out"><i></i>غير متوفر حاليًا</span>';
  }
  function productCard(p) {
    var sale = isSale(p), c = CAT[p.category] || { name: '' };
    return '<article class="p-card' + (p.available ? '' : ' is-out') + (sale ? ' is-sale' : '') + '" data-tint="' + esc(p.category) + '">' +
      '<div class="p-card__media">' +
        '<img src="' + esc(p.image) + '" alt="' + esc(p.name + ' - ' + p.size) + '" width="400" height="400" loading="lazy" decoding="async">' +
        '<span class="badge-cat">' + esc(c.name) + '</span>' +
        (sale ? '<span class="badge-sale">خصم ' + pct(p) + '%</span>' : '') +
      '</div>' +
      '<div class="p-card__body">' +
        '<h3 class="p-card__name">' + esc(p.name) + '</h3>' +
        '<div class="p-card__meta"><span class="chip-size">' + esc(p.size) + '</span>' + stockHTML(p) + '</div>' +
        '<p class="p-card__desc">' + esc(p.description) + '</p>' +
        '<div class="p-card__foot">' +
          '<div class="price-row"><span class="price"><b>' + Cart.fmt(p.price) + '</b> <small>' + STORE_CONFIG.currencyLabel + '</small></span>' +
          (sale ? '<s class="price-old" aria-label="السعر قبل الخصم">' + Cart.fmt(p.oldPrice) + '</s>' : '') + '</div>' +
          '<div class="act" data-act="' + p.id + '">' + actionHTML(p) + '</div>' +
        '</div>' +
      '</div></article>';
  }
  function renderGrid(el, list) { el.innerHTML = list.map(productCard).join(''); }
  function refreshActions() {
    $$('[data-act]').forEach(function (el) {
      var p = Cart.product(el.getAttribute('data-act'));
      if (p) el.innerHTML = actionHTML(p);
    });
  }

  /* add / inc / dec / remove — one delegated handler for every page */
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-add],[data-inc],[data-dec],[data-remove]');
    if (!b || b.disabled) return;
    var id = Number(b.dataset.add || b.dataset.inc || b.dataset.dec || b.dataset.remove);
    var p = Cart.product(id); if (!p) return;
    var wasAdd = b.hasAttribute('data-add') || b.hasAttribute('data-inc');
    if (wasAdd) {
      var r = Cart.add(id);
      if (!r.ok) { toast(r.reason === 'max' ? 'وصلت للحد الأقصى للكمية (' + STORE_CONFIG.maxQtyPerItem + ').' : 'المنتج غير متوفر حاليًا.'); return; }
      announce(p.name + '، الكمية ' + r.qty + ' في السلة');
      focusAfter('[data-inc="' + id + '"]');
    } else {
      var removed = b.hasAttribute('data-remove') ? Cart.remove(id) : Cart.dec(id);
      if (removed) {
        announce('تم حذف ' + p.name + ' من السلة');
        toast('تم حذف ' + p.name + ' من السلة', { action: { label: 'تراجع', onClick: function () { Cart.restore(removed); } } });
        focusAfter('[data-add="' + id + '"]', '#cart-heading');
      } else focusAfter('[data-dec="' + id + '"]');
    }
  });
  function focusAfter(sel, fallback) {
    var el = $(sel) || (fallback && $(fallback));
    if (el) el.focus({ preventScroll: true });
  }

  /* ---------- cart badge + floating cart pill ---------- */
  var lastCount = null;
  function syncCart() {
    var n = Cart.count();
    $$('[data-cart-count]').forEach(function (el) {
      el.textContent = n > 99 ? '99+' : n; el.hidden = n === 0;
      if (lastCount !== null && n > lastCount) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
    });
    $$('[data-cart-label]').forEach(function (el) { el.setAttribute('aria-label', n ? 'السلة، ' + n + ' منتج' : 'السلة فارغة'); });
    var pill = $('#cart-pill');
    if (pill) {
      var show = n > 0 && document.body.dataset.page !== 'cart';
      pill.classList.toggle('is-on', show); pill.tabIndex = show ? 0 : -1; pill.setAttribute('aria-hidden', show ? 'false' : 'true');
      $('[data-pill-total]', pill).textContent = Cart.money(Cart.subtotal());
      $('[data-pill-items]', pill).textContent = n + (n === 1 ? ' منتج' : ' منتجات');
    }
    lastCount = n;
  }
  document.addEventListener('cart:change', function () { refreshActions(); syncCart(); });

  /* ---------- overlays: sheets + search ---------- */
  var openId = null, lastTrigger = null;
  function overlay(id) { return document.getElementById(id); }
  function openOverlay(id, trigger) {
    var el = overlay(id); if (!el) return;
    if (openId) closeOverlay();
    openId = id; lastTrigger = trigger || document.activeElement;
    el.classList.add('is-open'); el.setAttribute('aria-hidden', 'false');
    document.body.classList.add('no-scroll');
    var f = $('[data-autofocus]', el) || $('a,button,input', $('.ov__panel', el));
    setTimeout(function () { if (f) f.focus({ preventScroll: true }); }, 60);
    if (id === 'search-panel') renderSearch('');
  }
  function closeOverlay() {
    if (!openId) return;
    var el = overlay(openId);
    el.classList.remove('is-open'); el.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('no-scroll');
    if (lastTrigger && lastTrigger.focus) lastTrigger.focus({ preventScroll: true });
    openId = null;
  }
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-open]');
    if (t) { e.preventDefault(); openOverlay(t.dataset.open, t); return; }
    if (e.target.closest('[data-close]')) { closeOverlay(); return; }
    // navigating from inside a sheet should close it (same-page anchors)
    var a = e.target.closest('.ov a[href^="#"], .ov a[href*="#"]');
    if (a) closeOverlay();
  });
  document.addEventListener('keydown', function (e) {
    if (!openId) return;
    if (e.key === 'Escape') { closeOverlay(); return; }
    if (e.key === 'Tab') { // keep focus inside the open panel
      var f = $$('a[href],button:not([disabled]),input,select', $('.ov__panel', overlay(openId))).filter(function (x) { return x.offsetParent !== null; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  /* search panel */
  function renderSearch(q) {
    var box = $('#search-results'); if (!box) return;
    var nq = norm(q), list, title;
    if (nq) {
      list = PRODUCTS.filter(function (p) { return norm(p.name + ' ' + p.description + ' ' + (CAT[p.category] || {}).name).indexOf(nq) > -1; });
      title = list.length ? 'نتائج البحث (' + list.length + ')' : '';
    } else { list = PRODUCTS.filter(function (p) { return p.featured; }).slice(0, 4); title = 'الأكثر طلبًا'; }
    if (!list.length) { box.innerHTML = '<p class="search-empty">مش لقينا منتجات مطابقة لبحثك.</p>'; return; }
    box.innerHTML = '<p class="search-title">' + title + '</p><ul class="search-list">' + list.slice(0, 6).map(function (p) {
      return '<li class="search-row" data-tint="' + esc(p.category) + '"><span class="search-row__img"><img src="' + esc(p.image) + '" alt="" width="56" height="56" loading="lazy"></span>' +
        '<span class="search-row__txt"><b>' + esc(p.name) + '</b><small>' + esc(p.size) + ' · ' + Cart.money(p.price) + (p.available ? '' : ' · غير متوفر') + '</small></span>' +
        '<span class="act act--mini" data-act="' + p.id + '">' + actionHTML(p) + '</span></li>';
    }).join('') + '</ul>' + (nq && list.length > 6 ? '<a class="search-all" href="products.html?q=' + encodeURIComponent(q) + '">عرض كل النتائج (' + list.length + ')</a>' : '');
  }
  var sIn = $('#search-input');
  if (sIn) sIn.addEventListener('input', function () { renderSearch(sIn.value); });

  /* ---------- header scroll state, reveal, misc ---------- */
  var header = $('.site-header');
  function onScroll() { if (header) header.classList.toggle('is-scrolled', window.scrollY > 8); }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  function initReveal() {
    var els = $$('.reveal');
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { els.forEach(function (e) { e.classList.add('is-in'); }); return; }
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add('is-in'); io.unobserve(x.target); } });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
    els.forEach(function (e) { io.observe(e); });
  }

  /* ---------- apply STORE_CONFIG to the page ---------- */
  function applyConfig() {
    var a = $('[data-announce-text]'); if (a && STORE_CONFIG.announcement) a.textContent = STORE_CONFIG.announcement;
    $$('[data-demo]').forEach(function (e) { e.hidden = !STORE_CONFIG.demoMode; });
    var hours = STORE_CONFIG.workingHours || 'مواعيد العمل سيتم إضافتها قريبًا';
    var detail = STORE_CONFIG.addressDetail || 'العنوان التفصيلي سيتم إضافته قريبًا';
    $$('[data-bind="address"]').forEach(function (e) { e.textContent = STORE_CONFIG.address; });
    $$('[data-bind="addressDetail"]').forEach(function (e) { e.textContent = detail; e.classList.toggle('is-placeholder', !STORE_CONFIG.addressDetail); });
    $$('[data-bind="hours"]').forEach(function (e) { e.textContent = hours; e.classList.toggle('is-placeholder', !STORE_CONFIG.workingHours); });
    $$('[data-maps-link]').forEach(function (e) {
      if (STORE_CONFIG.mapsUrl) { e.href = STORE_CONFIG.mapsUrl; e.target = '_blank'; e.rel = 'noopener'; }
      else { e.hidden = true; }
    });
    $$('[data-maps-missing]').forEach(function (e) { e.hidden = !!STORE_CONFIG.mapsUrl; });
    $$('[data-social]').forEach(function (e) {
      var url = STORE_CONFIG.social && STORE_CONFIG.social[e.dataset.social];
      if (url) { var l = document.createElement('a'); l.className = e.className; l.href = url; l.target = '_blank'; l.rel = 'noopener'; l.setAttribute('aria-label', e.getAttribute('aria-label') || ''); l.innerHTML = e.innerHTML; e.replaceWith(l); }
    });
    $$('[data-year]').forEach(function (e) { e.textContent = new Date().getFullYear(); });
    // WhatsApp links
    var n = waNumber();
    $$('[data-wa-link]').forEach(function (e) {
      if (n) { e.href = 'https://wa.me/' + n; e.target = '_blank'; e.rel = 'noopener'; }
      else { e.href = '#'; e.addEventListener('click', function (ev) { ev.preventDefault(); toast('رقم واتساب المتجر لم يُضبط بعد (js/config.js).'); }); }
    });
    // offers: only when real active offers exist
    var offers = PRODUCTS.filter(function (p) { return p.available && isSale(p); });
    $$('[data-offers-link]').forEach(function (e) { e.hidden = !offers.length; });
    var cta = $('[data-offers-cta]');
    if (cta && !offers.length) { cta.href = '#categories'; cta.querySelector('span').textContent = 'تصفح الأقسام'; }
    return offers;
  }

  /* ---------- homepage ---------- */
  function initHome(offers) {
    $$('[data-cat-count]').forEach(function (e) {
      var n = PRODUCTS.filter(function (p) { return p.category === e.dataset.catCount; }).length;
      e.textContent = n + (n === 1 ? ' منتج' : ' منتجات');
    });
    var best = $('#best-grid'); if (best) renderGrid(best, PRODUCTS.filter(function (p) { return p.featured; }).slice(0, 8));
    var og = $('#offers-grid'), os = $('#offers');
    if (os) {
      if (offers.length) { renderGrid(og, offers.slice(0, 6)); os.hidden = false; } else os.remove();
    }
  }

  /* ---------- contact form -> WhatsApp ---------- */
  var cf = $('#wa-form');
  if (cf) cf.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = cf.elements.name.value.trim(), msg = cf.elements.message.value.trim();
    if (!msg) { cf.elements.message.focus(); toast('اكتب رسالتك أولًا.'); return; }
    var n = waNumber();
    if (!n) { toast('رقم واتساب المتجر لم يُضبط بعد (js/config.js).'); return; }
    var text = 'مرحبًا Healthy 👋\n' + (name ? 'الاسم: ' + name + '\n' : '') + '\n' + msg;
    window.open('https://wa.me/' + n + '?text=' + encodeURIComponent(text), '_blank', 'noopener');
  });

  /* ---------- boot ---------- */
  window.UI = { toast: toast, announce: announce, esc: esc, norm: norm, isSale: isSale, productCard: productCard, renderGrid: renderGrid, refreshActions: refreshActions, waNumber: waNumber, CAT: CAT };
  var offers = applyConfig();
  if (document.body.dataset.page === 'home') initHome(offers);
  syncCart(); initReveal();
})();
