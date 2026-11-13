/* Healthy — products page: search, category filter, availability, offers, sorting (state lives in the URL) */
(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  var grid = $('#products-grid'); if (!grid) return;
  var U = window.UI, params = new URLSearchParams(location.search);
  var hasOffers = PRODUCTS.some(function (p) { return p.available && U.isSale(p); });
  var state = {
    q: params.get('q') || '',
    cat: params.get('cat') || 'all',
    sort: ['price-asc', 'price-desc'].indexOf(params.get('sort')) > -1 ? params.get('sort') : 'default',
    avail: params.get('avail') === '1',
    offers: params.get('offers') === '1' && hasOffers
  };
  if (state.cat !== 'all' && !U.CAT[state.cat]) state.cat = 'all';

  var qIn = $('#f-q'), clearQ = $('#f-q-clear'), sortSel = $('#f-sort'), availCb = $('#f-avail'), chips = $('#f-chips'), count = $('#f-count'), empty = $('#f-empty'), resetBtns = document.querySelectorAll('[data-reset]'), title = $('#f-title');

  // chips
  var chipDefs = [{ id: 'all', label: 'الكل' }].concat(CATEGORIES.map(function (c) { return { id: c.id, label: c.name }; }));
  if (hasOffers) chipDefs.push({ id: 'offers', label: 'العروض' });
  chips.innerHTML = chipDefs.map(function (c) {
    return '<button type="button" class="chip" data-chip="' + c.id + '">' + U.esc(c.label) + '</button>';
  }).join('');

  function matches(p) {
    if (state.offers && !(p.available && U.isSale(p))) return false;
    if (state.cat !== 'all' && p.category !== state.cat) return false;
    if (state.avail && !p.available) return false;
    if (state.q) {
      var hay = U.norm(p.name + ' ' + p.description + ' ' + p.size + ' ' + U.CAT[p.category].name);
      if (U.norm(state.q).split(' ').some(function (w) { return hay.indexOf(w) < 0; })) return false;
    }
    return true;
  }
  function isFiltered() { return state.q || state.cat !== 'all' || state.avail || state.offers || state.sort !== 'default'; }

  function syncUrl() {
    var p = new URLSearchParams();
    if (state.q) p.set('q', state.q);
    if (state.cat !== 'all') p.set('cat', state.cat);
    if (state.sort !== 'default') p.set('sort', state.sort);
    if (state.avail) p.set('avail', '1');
    if (state.offers) p.set('offers', '1');
    var s = p.toString();
    history.replaceState(null, '', location.pathname + (s ? '?' + s : ''));
  }

  function render() {
    var list = PRODUCTS.filter(matches);
    if (state.sort === 'price-asc') list.sort(function (a, b) { return a.price - b.price; });
    if (state.sort === 'price-desc') list.sort(function (a, b) { return b.price - a.price; });
    U.renderGrid(grid, list);
    var none = list.length === 0;
    grid.hidden = none; empty.hidden = !none;
    count.textContent = none ? 'لا توجد منتجات' : list.length + (list.length === 1 ? ' منتج' : ' منتجات');
    var active = state.offers ? 'offers' : state.cat;
    document.querySelectorAll('[data-chip]').forEach(function (c) {
      var on = c.dataset.chip === active; c.classList.toggle('is-active', on); c.setAttribute('aria-pressed', on);
    });
    title.textContent = state.offers ? 'العروض' : (state.cat !== 'all' ? U.CAT[state.cat].name : 'كل المنتجات');
    qIn.value = state.q; sortSel.value = state.sort; availCb.checked = state.avail; clearQ.hidden = !state.q;
    resetBtns.forEach(function (b) { if (b.closest('#f-empty')) return; b.hidden = !isFiltered(); });
    document.title = title.textContent + ' | Healthy';
    syncUrl();
  }

  qIn.addEventListener('input', function () { state.q = qIn.value.trim(); render(); });
  clearQ.addEventListener('click', function () { state.q = ''; render(); qIn.focus(); });
  sortSel.addEventListener('change', function () { state.sort = sortSel.value; render(); });
  availCb.addEventListener('change', function () { state.avail = availCb.checked; render(); });
  chips.addEventListener('click', function (e) {
    var c = e.target.closest('[data-chip]'); if (!c) return;
    var id = c.dataset.chip;
    state.offers = id === 'offers'; state.cat = (id === 'offers' ? 'all' : id);
    render();
  });
  resetBtns.forEach(function (b) { b.addEventListener('click', function () {
    state = { q: '', cat: 'all', sort: 'default', avail: false, offers: false }; render();
  }); });
  document.querySelector('#f-form').addEventListener('submit', function (e) { e.preventDefault(); });
  render();
})();
