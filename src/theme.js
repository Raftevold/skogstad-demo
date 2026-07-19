'use strict';
// Tema-motor: ferdige tema + eigne fargar. Genererer CSS-variabel-overstyring
// som blir lagt inn i <head> på alle offentlege sider.

const PRESETS = {
  klassisk: { label: 'Skogstad klassisk', primary: '#1b3a28', primaryDark: '#122419', accent: '#a63d12', bg: '#faf8f4', radius: 14 },
  morkskog: { label: 'Mørk skog', primary: '#16281e', primaryDark: '#0c1510', accent: '#b04a14', bg: '#f4f4ef', radius: 10 },
  fjord: { label: 'Fjord', primary: '#23455c', primaryDark: '#132738', accent: '#a63d12', bg: '#f5f8fa', radius: 14 },
  host: { label: 'Høst / jakt', primary: '#4a3a22', primaryDark: '#2a2113', accent: '#8f4a0e', bg: '#faf6ef', radius: 8 },
  vinter: { label: 'Vinter', primary: '#2b3a44', primaryDark: '#19242b', accent: '#9c3d2e', bg: '#f7f9fb', radius: 18 },
};

const HEX = /^#[0-9a-fA-F]{6}$/;

function mix(hexA, hexB, ratioB) {
  const a = [1, 3, 5].map((i) => parseInt(hexA.slice(i, i + 2), 16));
  const b = [1, 3, 5].map((i) => parseInt(hexB.slice(i, i + 2), 16));
  return '#' + a.map((v, i) => Math.round(v * (1 - ratioB) + b[i] * ratioB).toString(16).padStart(2, '0')).join('');
}

// WCAG-relativ luminans og kontrast mot kvit — brukt til å nekte ulovleg låge kontrastar
function luminance(hex) {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function contrastVsWhite(hex) {
  return 1.05 / (luminance(hex) + 0.05);
}

/** Validerer og normaliserer eit tema frå admin-skjemaet. Returnerer null ved ugyldig. */
function sanitizeTheme(body) {
  if (body.preset && PRESETS[body.preset] && body.mode !== 'custom') {
    return { preset: body.preset, ...strip(PRESETS[body.preset]) };
  }
  const t = {
    preset: 'custom',
    primary: String(body.primary || '').trim(),
    primaryDark: String(body.primaryDark || '').trim(),
    accent: String(body.accent || '').trim(),
    bg: String(body.bg || '').trim(),
    radius: Math.min(24, Math.max(0, parseInt(body.radius, 10) || 14)),
  };
  if (![t.primary, t.primaryDark, t.accent, t.bg].every((h) => HEX.test(h))) return null;
  // Kontrast-vakt: kvit tekst skal vere lesbar (WCAG AA) på primær-, mørk- og aksentfarge
  if (contrastVsWhite(t.primary) < 4.5 || contrastVsWhite(t.primaryDark) < 4.5 || contrastVsWhite(t.accent) < 4.5) return null;
  // Bakgrunnen skal vere lys (mørk tekst)
  if (luminance(t.bg) < 0.5) return null;
  return t;
}

function strip(p) {
  return { primary: p.primary, primaryDark: p.primaryDark, accent: p.accent, bg: p.bg, radius: p.radius };
}

/** CSS-overstyring for eit lagra tema. Tom streng for standardtemaet. */
function themeCss(theme) {
  if (!theme || theme.preset === 'klassisk') return '';
  const { primary, primaryDark, accent, bg, radius } = theme;
  return `:root{--green-950:${primaryDark};--green-900:${primary};--green-800:${mix(primary, '#ffffff', 0.1)};--green-700:${mix(primary, '#ffffff', 0.2)};--green-100:${mix(primary, '#ffffff', 0.88)};--green-50:${mix(primary, '#ffffff', 0.94)};--sand-50:${bg};--sand-100:${mix(bg, '#000000', 0.05)};--accent:${accent};--accent-dark:${mix(accent, '#000000', 0.15)};--radius:${radius}px;--radius-small:${Math.max(4, radius - 6)}px;}`;
}

module.exports = { PRESETS, sanitizeTheme, themeCss, contrastVsWhite, mix };
