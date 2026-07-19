'use strict';
document.documentElement.classList.add('js');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Scroll-avsløring (kun transform/opacity) ---------- */
(function () {
  const els = document.querySelectorAll('.reveal');
  if (!els.length) return;
  if (reducedMotion || !('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('is-visible'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  els.forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight * 0.9) { el.classList.add('is-visible'); }
    else io.observe(el);
  });
})();

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
function cartBadge() {
  const n = cartRead().reduce((s, it) => s + it.qty, 0);
  document.querySelectorAll('[data-cart-count]').forEach((el) => {
    el.textContent = String(n);
    el.hidden = n === 0;
  });
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
        <img src="${l.image}-300.jpg" alt="" width="92" height="92" loading="lazy">
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
