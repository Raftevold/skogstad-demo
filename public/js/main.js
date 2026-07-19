'use strict';
document.documentElement.classList.add('js');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Scroll-avsløring med stega forsinking (kun transform/opacity) ---------- */
(function () {
  const els = document.querySelectorAll('.reveal');
  if (!els.length) return;
  if (reducedMotion || !('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('is-visible'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target;
      // Stega forsinking: søsken i same rutenett kjem eitt og eitt
      const siblings = [...el.parentElement.children].filter((c) => c.classList.contains('reveal'));
      const idx = siblings.indexOf(el);
      const delay = Math.min(idx * 70, 350);
      el.style.transitionDelay = delay + 'ms';
      el.classList.add('is-visible');
      setTimeout(() => { el.style.transitionDelay = ''; }, delay + 700);
      io.unobserve(el);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  els.forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight * 0.9) { el.classList.add('is-visible'); }
    else io.observe(el);
  });
})();

/* ---------- Subtil hero-parallakse (kun transform, av ved redusert rørsle) ---------- */
(function () {
  const content = document.querySelector('.hero-content');
  if (!content || reducedMotion || window.innerWidth < 700) return;
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = Math.min(window.scrollY, 700);
      content.style.transform = `translateY(${y * 0.16}px)`;
      content.style.opacity = String(Math.max(0, 1 - y / 640));
      ticking = false;
    });
  }, { passive: true });
})();

/* ---------- Mjuk innfasing av late bilete ---------- */
(function () {
  if (reducedMotion) return;
  document.querySelectorAll('img[loading="lazy"]').forEach((img) => {
    if (img.complete) return;
    img.classList.add('img-fade');
    img.addEventListener('load', () => img.classList.add('is-loaded'), { once: true });
    img.addEventListener('error', () => img.classList.add('is-loaded'), { once: true });
  });
})();

/* ---------- Produktsøk ---------- */
(function () {
  const overlay = document.querySelector('[data-search-overlay]');
  if (!overlay) return;
  const input = overlay.querySelector('[data-search-input]');
  const resultsEl = overlay.querySelector('[data-search-results]');
  let lastFocus = null;
  let debounceT = null;

  function open() {
    lastFocus = document.activeElement;
    overlay.hidden = false;
    input.focus();
  }
  function close() {
    overlay.hidden = true;
    if (lastFocus) lastFocus.focus();
  }
  document.querySelectorAll('[data-open-search]').forEach((b) => b.addEventListener('click', open));
  overlay.querySelector('[data-close-search]').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !overlay.hidden) close(); });

  async function search(q) {
    if (q.trim().length < 2) { resultsEl.innerHTML = ''; return; }
    try {
      const res = await fetch('/api/sok?q=' + encodeURIComponent(q));
      const data = await res.json();
      if (!data.results.length) {
        resultsEl.innerHTML = '<p class="search-empty">Ingen treff på «' + esc(q) + '» – prøv et annet ord.</p>';
        return;
      }
      resultsEl.innerHTML = data.results.map((r) => `
        <a class="search-result" href="/produkt/${esc(r.slug)}">
          <img src="${r.image.startsWith('/media/') ? esc(r.image) : esc(r.image) + '-300.jpg'}" alt="" width="56" height="56" loading="lazy">
          <span><span class="search-result-name">${esc(r.name)}</span><span class="search-result-meta">${esc(r.category)} · ${esc(r.color)}</span></span>
          <span class="search-result-price ${r.price < r.ordinary ? 'is-sale' : ''}">${r.price},-</span>
        </a>`).join('');
    } catch {
      resultsEl.innerHTML = '<p class="search-empty">Søket feilet – prøv igjen.</p>';
    }
  }
  input.addEventListener('input', () => {
    clearTimeout(debounceT);
    debounceT = setTimeout(() => search(input.value), 180);
  });
})();

/* ---------- Sortering: send skjema ved val ---------- */
document.querySelectorAll('[data-auto-submit]').forEach((sel) => {
  sel.addEventListener('change', () => sel.form.submit());
});

/* ---------- Mobilmeny ---------- */
(function () {
  const btn = document.querySelector('.nav-toggle');
  const nav = document.getElementById('hovednav');
  if (!btn || !nav) return;
  btn.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    btn.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) {
      nav.classList.remove('is-open');
      btn.setAttribute('aria-expanded', 'false');
      btn.focus();
    }
  });
})();

/* ---------- Medlemsbrytar (demo) ---------- */
(function () {
  const btn = document.getElementById('memberBtn');
  const menu = document.querySelector('.member-menu');
  if (!btn || !menu) return;
  function close() { menu.classList.remove('is-open'); btn.setAttribute('aria-expanded', 'false'); }
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = menu.classList.toggle('is-open');
    btn.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('click', (e) => { if (!menu.contains(e.target) && e.target !== btn) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  document.querySelectorAll('[data-open-member]').forEach((el) => {
    el.addEventListener('click', () => {
      btn.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' });
      menu.classList.add('is-open');
      btn.setAttribute('aria-expanded', 'true');
      btn.focus();
    });
  });
})();

/* ---------- Handlekurv (localStorage) ---------- */
const CART_KEY = 'skogstad_demo_cart';
function cartRead() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch { return []; }
}
function cartWrite(items) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  cartBadge();
}
let prevCartCount = null;
function cartBadge() {
  const n = cartRead().reduce((s, it) => s + it.qty, 0);
  document.querySelectorAll('[data-cart-count]').forEach((el) => {
    el.textContent = String(n);
    el.hidden = n === 0;
    if (prevCartCount !== null && n > prevCartCount) {
      el.classList.remove('bump');
      void el.offsetWidth; // restart animasjonen
      el.classList.add('bump');
    }
  });
  prevCartCount = n;
}
cartBadge();

function toast(msg) {
  const el = document.querySelector('[data-toast]');
  if (!el) return;
  el.textContent = msg;
  el.hidden = false;
  requestAnimationFrame(() => el.classList.add('is-visible'));
  clearTimeout(toast._t);
  toast._t = setTimeout(() => {
    el.classList.remove('is-visible');
    setTimeout(() => { el.hidden = true; }, 300);
  }, 2600);
}

/* Legg i handlekurv frå produktside */
(function () {
  const form = document.querySelector('[data-add-to-cart]');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const slug = form.dataset.slug;
    const size = (form.querySelector('input[name="size"]:checked') || {}).value || '';
    const qty = Math.max(1, Math.min(20, parseInt(form.querySelector('input[name="qty"]').value, 10) || 1));
    const items = cartRead();
    const existing = items.find((it) => it.slug === slug && it.size === size);
    if (existing) existing.qty = Math.min(20, existing.qty + qty);
    else items.push({ slug, size, qty });
    cartWrite(items);
    toast('Lagt i handlekurven: ' + form.dataset.name);
  });
})();

/* Handlekurv-sida */
(function () {
  const linesEl = document.querySelector('[data-cart-lines]');
  if (!linesEl) return;
  const summaryEl = document.querySelector('[data-cart-summary]');
  const emptyEl = document.querySelector('[data-cart-empty]');

  async function render() {
    const items = cartRead();
    if (!items.length) {
      linesEl.innerHTML = '';
      summaryEl.hidden = true;
      emptyEl.hidden = false;
      linesEl.closest('.cart-layout').style.display = 'none';
      return;
    }
    let data;
    try {
      const res = await fetch('/api/handlekurv/quote', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      data = await res.json();
    } catch {
      linesEl.innerHTML = '<p>Kunne ikke hente prisene – prøv å laste siden på nytt.</p>';
      return;
    }
    linesEl.innerHTML = data.lines.map((l, i) => `
      <div class="cart-line">
        <img src="${l.image.startsWith('/media/') ? l.image : l.image + '-300.jpg'}" alt="" width="92" height="92" loading="lazy">
        <div>
          <p class="cart-line-name">${esc(l.name)}</p>
          <p class="cart-line-meta">${esc(l.color)}${l.size ? ' · Str. ' + esc(l.size) : ''} · ${l.qty} stk</p>
          <p class="cart-line-price">
            <span class="${l.price.discountPercent > 0 ? 'is-sale' : ''}">${l.lineTotal},-</span>
            ${l.price.discountPercent > 0 ? `<s class="price-before">${l.price.ordinary * l.qty},-</s>` : ''}
            ${l.price.campaignName ? `<br><small>${esc(l.price.campaignName.replace(' [DEMO-EKSEMPEL]', ''))}${l.price.memberOnly ? ' (medlemspris)' : ''}</small>` : ''}
          </p>
        </div>
        <button class="btn btn-small btn-secondary cart-line-remove" data-remove="${i}">Fjern</button>
      </div>
    `).join('');
    linesEl.querySelectorAll('[data-remove]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const items2 = cartRead();
        items2.splice(Number(btn.dataset.remove), 1);
        cartWrite(items2);
        render();
      });
    });
    summaryEl.hidden = false;
    emptyEl.hidden = true;
    q('[data-sum-ordinary]').textContent = data.ordinarySum + ',-';
    const savedRow = q('[data-sum-saved-row]');
    savedRow.hidden = data.saved <= 0;
    q('[data-sum-saved]').textContent = '−' + data.saved + ',-';
    q('[data-sum-shipping]').textContent = data.freeShipping ? 'Fri frakt (' + data.tierLabel + ')' : 'Beregnes i kassen';
    q('[data-sum-total]').textContent = data.sum + ',-';
    const pts = q('[data-sum-points]');
    pts.hidden = !data.tier;
    if (data.tier) pts.textContent = 'Du tjener ' + data.points + ' bonuspoeng på dette kjøpet.';
    const tierEl = q('[data-sum-tier]');
    tierEl.hidden = !!data.tier;
    if (!data.tier) tierEl.textContent = 'Tips: bruk «Se medlemspris»-bryteren øverst for å se medlemsprisene dine.';
  }
  function q(sel) { return document.querySelector(sel); }
  render();

  const modal = document.querySelector('[data-checkout-modal]');
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-checkout]')) { modal.hidden = false; modal.querySelector('button').focus(); }
    if (e.target.closest('[data-close-modal]') || e.target === modal) modal.hidden = true;
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal) modal.hidden = true; });
})();

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ---------- AJAX-skjema (kontakt + kundeklubb) ---------- */
document.querySelectorAll('[data-ajax-form]').forEach((form) => {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const status = form.querySelector('.form-status');
    const btn = form.querySelector('button[type="submit"]');
    status.textContent = 'Sender …';
    status.className = 'form-status';
    btn.disabled = true;
    const payload = Object.fromEntries(new FormData(form).entries());
    try {
      const res = await fetch(form.dataset.endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.ok) {
        status.textContent = form.dataset.success;
        status.classList.add('is-ok');
        form.reset();
      } else {
        status.textContent = data.error || 'Noe gikk galt – prøv igjen.';
        status.classList.add('is-error');
      }
    } catch {
      status.textContent = 'Nettverksfeil – prøv igjen.';
      status.classList.add('is-error');
    }
    btn.disabled = false;
  });
});
