'use strict';
/* Adminpanel-hjelparar: bekreft sletting, repeterbare rader, kampanje-omfang */

document.querySelectorAll('form[data-confirm]').forEach((form) => {
  form.addEventListener('submit', (e) => {
    if (!window.confirm(form.dataset.confirm)) e.preventDefault();
  });
});

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
