'use strict';
/* Adminpanel-hjelparar: meny, bekreft sletting, repeterbare rader, kampanje-omfang,
   auto-slug, bildeveljar/opplasting og tema-førehandsvising. */

// Mobilmeny
const navToggle = document.querySelector('.admin-nav-toggle');
const sidenav = document.querySelector('.admin-sidenav');
if (navToggle && sidenav) {
  navToggle.addEventListener('click', () => {
    const open = sidenav.classList.toggle('is-open');
    navToggle.setAttribute('aria-expanded', String(open));
  });
}

// Bekreft sletting
document.querySelectorAll('form[data-confirm]').forEach((form) => {
  form.addEventListener('submit', (e) => {
    if (!window.confirm(form.dataset.confirm)) e.preventDefault();
  });
});

// Repeterbare rader (tidslinje, butikkar osv.)
document.querySelectorAll('[data-add-row]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const list = btn.parentElement.querySelector('[data-repeat-list]');
    const rows = list.querySelectorAll('.repeat-row');
    const last = rows[rows.length - 1];
    if (!last) return;
    const clone = last.cloneNode(true);
    clone.querySelectorAll('input').forEach((inp) => { inp.value = ''; });
    bindRemove(clone.querySelector('[data-remove-row]'));
    list.appendChild(clone);
    clone.querySelector('input').focus();
  });
});
function bindRemove(btn) {
  if (!btn) return;
  btn.addEventListener('click', () => {
    const list = btn.closest('[data-repeat-list]');
    if (list.querySelectorAll('.repeat-row').length > 1) btn.closest('.repeat-row').remove();
    else btn.closest('.repeat-row').querySelectorAll('input').forEach((inp) => { inp.value = ''; });
  });
}
document.querySelectorAll('[data-remove-row]').forEach(bindRemove);

// Kampanje-omfang
const scopeSelect = document.querySelector('[data-scope-select]');
if (scopeSelect) {
  const update = () => {
    document.querySelectorAll('[data-scope-panel]').forEach((panel) => {
      panel.hidden = panel.dataset.scopePanel !== scopeSelect.value;
    });
  };
  scopeSelect.addEventListener('change', update);
  update();
}

/* ---------- Produktskjema ---------- */

// Auto-slug frå namnet (berre til brukaren sjølv har skrive i slug-feltet)
const slugSource = document.querySelector('[data-slug-source]');
const slugField = document.querySelector('[data-slug-field]');
if (slugSource && slugField) {
  let manual = !!slugField.value;
  slugField.addEventListener('input', () => { manual = slugField.value.length > 0; });
  slugSource.addEventListener('input', () => {
    if (manual) return;
    slugField.value = slugSource.value.toLowerCase()
      .replace(/æ/g, 'ae').replace(/ø/g, 'o').replace(/å/g, 'a')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  });
}

// Hurtigval for storleikar
document.querySelectorAll('[data-sizes]').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.getElementById('p-sizes').value = btn.dataset.sizes;
  });
});

// Bilde-felt + førehandsvising
const imgField = document.querySelector('[data-img-field]');
const imgPreview = document.querySelector('[data-img-preview]');
function setImage(url) {
  if (!imgField) return;
  imgField.value = url;
  const img = imgPreview.querySelector('img');
  const empty = imgPreview.querySelector('.img-preview-empty');
  img.src = url.startsWith('/media/') ? url : url + '-600.jpg';
  img.hidden = false;
  if (empty) empty.hidden = true;
}

// Bildeveljar-modal
const pickerModal = document.querySelector('[data-picker-modal]');
if (pickerModal) {
  const grid = pickerModal.querySelector('[data-picker-grid]');
  let loaded = false;

  async function openPicker() {
    pickerModal.hidden = false;
    if (!loaded) {
      try {
        const res = await fetch('/admin/api/bilder');
        const data = await res.json();
        grid.innerHTML = '';
        const addGroup = (label, urls) => {
          if (!urls.length) return;
          const lab = document.createElement('p');
          lab.className = 'picker-label';
          lab.textContent = label;
          grid.appendChild(lab);
          urls.forEach((u) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'picker-item' + (imgField.value === u ? ' is-selected' : '');
            const im = document.createElement('img');
            im.loading = 'lazy';
            im.alt = '';
            im.src = u.startsWith('/media/') ? u : u + '-300.jpg';
            b.appendChild(im);
            b.addEventListener('click', () => { setImage(u); pickerModal.hidden = true; });
            grid.appendChild(b);
          });
        };
        addGroup('Egne opplastinger', data.uploaded);
        addGroup('Produktbilder (innebygd)', data.builtIn);
        if (!data.uploaded.length && !data.builtIn.length) grid.innerHTML = '<p>Ingen bilder ennå – last opp et.</p>';
        loaded = true;
      } catch {
        grid.innerHTML = '<p>Kunne ikke laste bildene – prøv igjen.</p>';
      }
    }
  }

  document.querySelectorAll('[data-open-picker]').forEach((b) => b.addEventListener('click', openPicker));
  pickerModal.querySelector('[data-close-picker]').addEventListener('click', () => { pickerModal.hidden = true; });
  pickerModal.addEventListener('click', (e) => { if (e.target === pickerModal) pickerModal.hidden = true; });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') pickerModal.hidden = true; });

  // Direkte opplasting frå produktskjemaet
  const uploadInput = document.querySelector('[data-img-upload]');
  const status = document.querySelector('[data-upload-status]');
  if (uploadInput) {
    uploadInput.addEventListener('change', async () => {
      const file = uploadInput.files[0];
      if (!file) return;
      status.textContent = 'Laster opp …';
      const fd = new FormData();
      fd.append('bilde', file);
      fd.append('navn', file.name);
      try {
        const res = await fetch('/admin/api/bilder', { method: 'POST', body: fd });
        const data = await res.json();
        if (data.ok) {
          setImage(data.url);
          status.textContent = 'Bildet er lastet opp, komprimert og valgt ✓';
          loaded = false; // last galleriet på nytt neste gong
        } else {
          status.textContent = data.error || 'Opplastingen feilet.';
        }
      } catch {
        status.textContent = 'Opplastingen feilet – prøv igjen.';
      }
      uploadInput.value = '';
    });
  }
}

/* ---------- Tema ---------- */
const themeForm = document.querySelector('[data-theme-form]');
if (themeForm) {
  const preview = document.querySelector('[data-theme-preview]');
  const customPanel = document.querySelector('[data-custom-panel]');
  const modeField = document.querySelector('[data-mode-field]');
  const colorInputs = {
    primary: themeForm.querySelector('input[name="primary"]'),
    primaryDark: themeForm.querySelector('input[name="primaryDark"]'),
    accent: themeForm.querySelector('input[name="accent"]'),
    bg: themeForm.querySelector('input[name="bg"]'),
  };
  const radiusSel = themeForm.querySelector('select[name="radius"]');

  function luminance(hex) {
    const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }
  const contrastWhite = (hex) => 1.05 / (luminance(hex) + 0.05);

  function applyPreview(t) {
    preview.style.setProperty('--p', t.primary);
    preview.style.setProperty('--pd', t.primaryDark);
    preview.style.setProperty('--ac', t.accent);
    preview.style.setProperty('--bg', t.bg);
    preview.style.setProperty('--r', t.radius + 'px');
  }

  function currentCustom() {
    return {
      primary: colorInputs.primary.value, primaryDark: colorInputs.primaryDark.value,
      accent: colorInputs.accent.value, bg: colorInputs.bg.value, radius: radiusSel.value,
    };
  }

  function updateContrastHints() {
    const checks = [
      ['primary', 'Primærfarge', true], ['primaryDark', 'Mørk flate', true], ['accent', 'Aksent', true],
    ];
    for (const [key, label, vsWhite] of checks) {
      const el = document.querySelector(`[data-contrast="${key}"]`);
      if (!el) continue;
      const c = contrastWhite(colorInputs[key].value);
      el.textContent = c >= 4.5
        ? `Kontrast mot hvit tekst: ${c.toFixed(1)}:1 ✓`
        : `⚠ For lav kontrast mot hvit tekst (${c.toFixed(1)}:1, krav 4,5:1) – temaet kan ikke lagres`;
      el.style.color = c >= 4.5 ? '' : '#93271b';
    }
    const bgEl = document.querySelector('[data-contrast="bg"]');
    if (bgEl) {
      const ok = luminance(colorInputs.bg.value) >= 0.5;
      bgEl.textContent = ok ? 'Lys bakgrunn ✓' : '⚠ Bakgrunnen må være lys – temaet kan ikke lagres';
      bgEl.style.color = ok ? '' : '#93271b';
    }
  }

  themeForm.querySelectorAll('input[name="preset"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      themeForm.querySelectorAll('.tema-preset').forEach((l) => l.classList.toggle('is-active', l.contains(radio) && radio.checked));
      if (radio.value === 'custom') {
        customPanel.hidden = false;
        modeField.value = 'custom';
        applyPreview(currentCustom());
        updateContrastHints();
      } else {
        customPanel.hidden = true;
        modeField.value = '';
        applyPreview({
          primary: radio.dataset.primary, primaryDark: radio.dataset.primarydark,
          accent: radio.dataset.accent, bg: radio.dataset.bg, radius: radio.dataset.radius,
        });
      }
    });
  });

  [...Object.values(colorInputs), radiusSel].forEach((inp) => {
    inp.addEventListener('input', () => { applyPreview(currentCustom()); updateContrastHints(); });
  });

  // Init
  const checked = themeForm.querySelector('input[name="preset"]:checked');
  if (checked && checked.value === 'custom') { applyPreview(currentCustom()); updateContrastHints(); }
  else if (checked) applyPreview({
    primary: checked.dataset.primary, primaryDark: checked.dataset.primarydark,
    accent: checked.dataset.accent, bg: checked.dataset.bg, radius: checked.dataset.radius,
  });
}
