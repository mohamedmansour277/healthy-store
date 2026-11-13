/* Healthy — cart page, checkout form and WhatsApp order hand-off */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  if (document.body.dataset.page !== 'cart') return;
  var U = window.UI, form = $('#checkout-form'), CKEY = 'healthy_customer_v1';
  var lastOrder = null;

  /* ---------- helpers ---------- */
  function method() { return form.elements.method.value === 'pickup' ? 'pickup' : 'delivery'; }
  function digits(s) { return String(s).replace(/[٠-٩]/g, function (d) { return d.charCodeAt(0) - 1632; }); }
  /** Returns a local Egyptian mobile number (01XXXXXXXXX) or '' when invalid */
  function normPhone(raw) {
    var p = digits(raw).replace(/[\s\-().]/g, '');
    if (/^\+?0?020/.test(p)) p = p.replace(/^\+?0?020/, '0');
    else if (/^\+?20/.test(p) && p.replace(/\D/g, '').length === 12) p = '0' + p.replace(/^\+?20/, '');
    return /^01[0125]\d{8}$/.test(p) ? p : '';
  }

  /* ---------- render lines + summary ---------- */
  function lineHTML(l) {
    var p = l.product, out = !l.available;
    return '<li class="cart-line' + (out ? ' is-out' : '') + '" data-tint="' + U.esc(p.category) + '">' +
      '<span class="cart-line__img"><img src="' + U.esc(p.image) + '" alt="' + U.esc(p.name) + '" width="88" height="88" loading="lazy"></span>' +
      '<div class="cart-line__info">' +
        '<h3>' + U.esc(p.name) + '</h3>' +
        '<p class="cart-line__sub">' + U.esc(p.size) + ' · ' + Cart.money(p.price) + (U.isSale(p) ? ' <s>' + Cart.fmt(p.oldPrice) + '</s>' : '') + '</p>' +
        (out ? '<p class="cart-line__warn"><i class="bi bi-exclamation-circle" aria-hidden="true"></i> غير متوفر حاليًا — احذفه لإتمام الطلب</p>' : '') +
        '<div class="cart-line__row">' +
          (out ? '' : '<div class="act-step act-step--sm" role="group" aria-label="كمية ' + U.esc(p.name) + '">' +
            '<button type="button" data-dec="' + p.id + '" aria-label="' + (l.qty === 1 ? 'حذف ' + U.esc(p.name) : 'تقليل الكمية') + '"><i class="bi ' + (l.qty === 1 ? 'bi-trash3' : 'bi-dash-lg') + '" aria-hidden="true"></i></button>' +
            '<output><b>' + l.qty + '</b></output>' +
            '<button type="button" data-inc="' + p.id + '" aria-label="زيادة الكمية"' + (l.qty >= STORE_CONFIG.maxQtyPerItem ? ' disabled' : '') + '><i class="bi bi-plus-lg" aria-hidden="true"></i></button></div>') +
          '<strong class="cart-line__total">' + (out ? '' : Cart.money(l.total)) + '</strong>' +
          '<button type="button" class="link-btn" data-remove="' + p.id + '" aria-label="حذف ' + U.esc(p.name) + ' من السلة"><i class="bi bi-x-lg" aria-hidden="true"></i><span>حذف</span></button>' +
        '</div></div></li>';
  }
  function render() {
    var lines = Cart.lines(), has = lines.length > 0;
    $('#cart-empty').hidden = has || !$('#order-done').hidden; $('#cart-filled').hidden = !has;
    var n = Cart.count();
    $('#cart-sub').textContent = has ? n + (n === 1 ? ' منتج' : ' منتجات') + ' في سلتك' : '';
    $('#clear-cart').hidden = !has;
    $('#cart-lines').innerHTML = lines.map(lineHTML).join('');
    $('#unavailable-warning').hidden = !Cart.hasUnavailable();
    updateSummary();
  }
  function updateSummary() {
    var m = method(), t = Cart.totals(m);
    $$('[data-sum="subtotal"]').forEach(function (e) { e.textContent = Cart.money(t.subtotal); });
    $$('[data-sum="total"]').forEach(function (e) { e.textContent = Cart.money(t.total); });
    $$('[data-sum="delivery"]').forEach(function (e) { e.textContent = m === 'pickup' ? 'لا يوجد' : (t.delivery === 0 && t.freeDelivery ? 'مجانًا' : Cart.money(t.delivery)); });
    var hint = $('[data-free-hint]');
    if (t.toFree > 0) { hint.hidden = false; hint.textContent = 'أضف ' + Cart.money(t.toFree) + ' لتحصل على توصيل مجاني.'; } else hint.hidden = true;
    $$('[data-fee-label]').forEach(function (e) { e.textContent = Cart.money(Number(STORE_CONFIG.deliveryFee) || 0); });
    var disabled = Cart.isEmpty();
    $$('[data-submit]').forEach(function (b) { b.disabled = disabled; });
  }
  document.addEventListener('cart:change', render);

  $('#clear-cart').addEventListener('click', function () {
    if (!Cart.count()) return;
    var snapshot = Cart.lines().map(function (l) { return { id: l.product.id, qty: l.qty }; });
    Cart.clear();
    U.toast('تم تفريغ السلة', { action: { label: 'تراجع', onClick: function () { snapshot.forEach(Cart.restore); } } });
  });

  /* ---------- delivery method toggle + remembered customer ---------- */
  function applyMethod() {
    var home = method() === 'delivery';
    $$('[data-home-only]').forEach(function (e) { e.hidden = !home; });
    form.elements.area.required = home; form.elements.address.required = home;
    clearError('area'); clearError('address');
    updateSummary();
  }
  $$('input[name="method"]', form).forEach(function (r) { r.addEventListener('change', function () { applyMethod(); saveCustomer(); }); });

  var areaSel = form.elements.area;
  areaSel.innerHTML = (STORE_CONFIG.deliveryAreas.length > 1 ? '<option value="">اختر المنطقة</option>' : '') +
    STORE_CONFIG.deliveryAreas.map(function (a) { return '<option value="' + U.esc(a) + '">' + U.esc(a) + '</option>'; }).join('');

  function saveCustomer() {
    try { localStorage.setItem(CKEY, JSON.stringify({ name: form.elements.name.value, phone: form.elements.phone.value, area: form.elements.area.value, address: form.elements.address.value, method: method() })); } catch (e) {}
  }
  (function restore() {
    try {
      var c = JSON.parse(localStorage.getItem(CKEY) || 'null'); if (!c) return;
      form.elements.name.value = c.name || ''; form.elements.phone.value = c.phone || '';
      form.elements.address.value = c.address || '';
      if (c.area) form.elements.area.value = c.area;
      if (c.method === 'pickup') form.elements.method.value = 'pickup';
    } catch (e) {}
  })();

  /* ---------- validation ---------- */
  var MSG = {
    name: 'من فضلك اكتب اسمك (حرفان على الأقل).',
    phone: 'اكتب رقم موبايل مصري صحيح، مثال: 01012345678',
    area: 'اختر منطقة التوصيل.',
    address: 'اكتب العنوان بالتفصيل: الشارع ورقم المبنى وعلامة مميزة.'
  };
  function check(field) {
    var v = form.elements[field].value.trim();
    if (field === 'name') return v.length >= 2;
    if (field === 'phone') return !!normPhone(v);
    if (field === 'area') return method() === 'pickup' || !!v;
    if (field === 'address') return method() === 'pickup' || v.length >= 8;
    return true;
  }
  function setError(field) {
    var el = form.elements[field], box = $('[data-err="' + field + '"]');
    el.setAttribute('aria-invalid', 'true'); el.closest('.field').classList.add('has-error');
    box.textContent = MSG[field]; box.hidden = false;
  }
  function clearError(field) {
    var el = form.elements[field], box = $('[data-err="' + field + '"]');
    if (!el || !box) return;
    el.removeAttribute('aria-invalid'); el.closest('.field').classList.remove('has-error'); box.hidden = true;
  }
  ['name', 'phone', 'area', 'address'].forEach(function (f) {
    form.elements[f].addEventListener('blur', function () { if (form.elements[f].value.trim() || form.elements[f].hasAttribute('aria-invalid')) { check(f) ? clearError(f) : setError(f); } });
    form.elements[f].addEventListener('input', function () { if (form.elements[f].hasAttribute('aria-invalid') && check(f)) clearError(f); saveCustomer(); });
    form.elements[f].addEventListener('change', saveCustomer);
  });

  /* ---------- WhatsApp message ---------- */
  var LINE = '━━━━━━━━━━━━━━';
  function buildMessage(order) {
    var m = [];
    m.push('مرحبًا ' + STORE_CONFIG.name + ' 👋', '', 'أريد تأكيد الطلب التالي:', '', LINE, '', 'المنتجات:', '');
    order.lines.forEach(function (l, i) {
      m.push((i + 1) + '. ' + l.product.name + ' (' + l.product.size + ')',
             '   الكمية: ' + l.qty,
             '   السعر: ' + Cart.money(l.unit),
             '   الإجمالي: ' + Cart.money(l.total), '');
    });
    m.push(LINE, '');
    if (order.method === 'delivery') {
      m.push('إجمالي المنتجات: ' + Cart.money(order.totals.subtotal),
             'رسوم التوصيل: ' + (order.totals.delivery ? Cart.money(order.totals.delivery) : 'مجانًا'));
    }
    m.push('الإجمالي: ' + Cart.money(order.totals.total), '', 'بيانات العميل:', '',
           'الاسم: ' + order.name, 'رقم الهاتف: ' + order.phone, '');
    if (order.method === 'delivery') m.push('العنوان: ' + order.area + ' - ' + order.address, '');
    m.push('طريقة الاستلام: ' + (order.method === 'delivery' ? 'توصيل للمنزل' : 'استلام من الفرع'),
           'طريقة الدفع: نقدًا عند الاستلام');
    if (order.notes) m.push('', 'ملاحظات: ' + order.notes);
    m.push('', 'برجاء تأكيد الطلب' + (order.method === 'delivery' ? ' وموعد التوصيل.' : ' وموعد الاستلام.'), '', 'شكرًا لكم ❤️');
    return m.join('\n');
  }

  /* ---------- submit ---------- */
  function showErrors(list) {
    var box = $('#form-errors');
    box.innerHTML = '<b>راجع البيانات التالية:</b><ul>' + list.map(function (e) { return '<li>' + U.esc(e) + '</li>'; }).join('') + '</ul>';
    box.hidden = false;
  }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var errs = [], first = null;
    $('#form-errors').hidden = true;
    if (Cart.isEmpty()) { U.toast('السلة فارغة. أضف منتجات أولًا.'); return; }
    if (Cart.hasUnavailable()) { errs.push('في السلة منتج غير متوفر. احذفه للمتابعة.'); first = $('[data-remove]'); }
    ['name', 'phone', 'area', 'address'].forEach(function (f) {
      if (check(f)) clearError(f); else { setError(f); errs.push(MSG[f]); if (!first && !form.elements[f].closest('[hidden]')) first = form.elements[f]; }
    });
    if (errs.length) { showErrors(errs); (first || $('#form-errors')).scrollIntoView({ behavior: 'smooth', block: 'center' }); if (first) first.focus({ preventScroll: true }); return; }

    var m = method();
    var order = {
      lines: Cart.lines().filter(function (l) { return l.available; }),
      totals: Cart.totals(m), method: m,
      name: form.elements.name.value.trim(), phone: normPhone(form.elements.phone.value),
      area: form.elements.area.value, address: form.elements.address.value.trim(), notes: form.elements.notes.value.trim()
    };
    var text = buildMessage(order), number = U.waNumber();
    lastOrder = { text: text, url: number ? 'https://wa.me/' + number + '?text=' + encodeURIComponent(text) : '' };
    saveCustomer();
    showDone(!!number);
    if (number) window.open(lastOrder.url, '_blank', 'noopener');
  });

  /* ---------- hand-off panel ---------- */
  function showDone(hasNumber) {
    $('#cart-filled').hidden = true; $('#cart-empty').hidden = true; $('#order-done').hidden = false;
    $('#done-ready').hidden = !hasNumber; $('#done-nonumber').hidden = hasNumber;
    $('#done-msg').value = lastOrder.text;
    var open = $('#done-open'); open.hidden = !hasNumber; if (hasNumber) open.href = lastOrder.url;
    document.body.classList.add('is-done');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    $('#done-title').focus({ preventScroll: true });
  }
  function hideDone() { $('#order-done').hidden = true; document.body.classList.remove('is-done'); render(); window.scrollTo({ top: 0 }); }
  $('#done-edit').addEventListener('click', hideDone);
  $('#done-new').addEventListener('click', function () { Cart.clear(); hideDone(); U.toast('تم تفريغ السلة. يمكنك بدء طلب جديد.'); });
  $('#done-copy').addEventListener('click', function () {
    var ta = $('#done-msg');
    function ok() { U.toast('تم نسخ الرسالة.'); }
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(ta.value).then(ok, function () { ta.select(); document.execCommand('copy'); ok(); });
    else { ta.select(); try { document.execCommand('copy'); ok(); } catch (e) { U.toast('انسخ الرسالة يدويًا من الصندوق.'); } }
  });

  applyMethod(); render();
  window.__checkout = { buildMessage: buildMessage, normPhone: normPhone }; // exposed for testing
})();
