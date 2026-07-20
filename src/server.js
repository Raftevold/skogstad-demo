'use strict';
const path = require('path');
const express = require('express');
const compression = require('compression');
const store = require('./store');
const { seedIfEmpty } = require('./seed');
const { resolvePrice, priceMap } = require('./price');
const { themeCss } = require('./theme');
const { asset } = require('./assets');
const adminRouter = require('./admin');

const app = express();
const PORT = process.env.PORT || 3000;
// DEMO_MODE styrer noindex. Sett DEMO_MODE=false ved godkjend lansering.
const DEMO_MODE = process.env.DEMO_MODE !== 'false';

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));
app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(compression());
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(express.json({ limit: '1mb' }));

// Statisk innhald med lang cache (filnamn er stabile i demoen)
app.use(express.static(path.join(__dirname, '..', 'public'), {
  maxAge: '30d',
  setHeaders(res, filePath) {
    if (/\.(avif|webp|jpg|png|svg|woff2|css|js)$/.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=2592000');
    }
  },
}));

// Tryggingshovud + noindex i demo-modus
app.use((req, res, next) => {
  res.locals.asset = asset;
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Content-Security-Policy',
    "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; font-src 'self'; frame-ancestors 'self'; base-uri 'self'; form-action 'self'");
  if (DEMO_MODE) res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  next();
});

// Enkel cookie-parsar (unngår ekstra avhengigheit)
app.use((req, res, next) => {
  req.cookies = {};
  const raw = req.headers.cookie;
  if (raw) {
    for (const part of raw.split(';')) {
      const i = part.indexOf('=');
      if (i > -1) req.cookies[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
    }
  }
  next();
});

// Innhalds-cache (5 s) så kvar sidevising berre treng eitt DB-kall
let contentCache = { at: 0, data: null };
async function loadContent() {
  if (Date.now() - contentCache.at < 5000 && contentCache.data) return contentCache.data;
  const data = await store.getAllContent();
  contentCache = { at: Date.now(), data };
  return data;
}
app.invalidateContentCache = () => { contentCache = { at: 0, data: null }; };

const VALID_TIERS = ['medlem', 'solv', 'gull'];

// Felles data til alle sider
app.use(async (req, res, next) => {
  try {
    const c = await loadContent();
    res.locals.site = c.site || {};
    res.locals.notice = c.notice || { enabled: false };
    res.locals.seoMap = c.seo || {};
    res.locals.club = c.club || { tiers: {} };
    res.locals.content = c;
    res.locals.path = req.path;
    res.locals.demoMode = DEMO_MODE;
    res.locals.tier = VALID_TIERS.includes(req.cookies.demo_tier) ? req.cookies.demo_tier : null;
    res.locals.cookieNoticeSeen = req.cookies.cookie_ok === '1';
    res.locals.themeCss = themeCss(c.theme);
    // Produktbilete: innebygde stiar har genererte storleiksvariantar, opplasta (/media/) har éi fil
    res.locals.imgSrc = (base, size, ext) => (String(base).startsWith('/media/') ? base : `${base}-${size}.${ext}`);
    res.locals.imgHasVariants = (base) => !String(base).startsWith('/media/');
    next();
  } catch (e) { next(e); }
});

function seo(res, page, extra = {}) {
  const s = res.locals.seoMap[page] || {};
  return { title: s.title || 'Skogstad Sport', description: s.description || '', page, ...extra };
}

// ---------- Demo-modus: byt medlemsnivå ----------
app.get('/demo/medlem/:tier', (req, res) => {
  const t = req.params.tier;
  const back = (req.get('referer') && new URL(req.get('referer'), 'http://x').pathname) || '/';
  if (t === 'av') {
    res.setHeader('Set-Cookie', 'demo_tier=; Path=/; Max-Age=0; SameSite=Lax');
  } else if (VALID_TIERS.includes(t)) {
    res.setHeader('Set-Cookie', `demo_tier=${t}; Path=/; Max-Age=86400; SameSite=Lax`);
  }
  res.redirect(back);
});

app.get('/cookie-ok', (req, res) => {
  res.setHeader('Set-Cookie', 'cookie_ok=1; Path=/; Max-Age=31536000; SameSite=Lax');
  const back = (req.get('referer') && new URL(req.get('referer'), 'http://x').pathname) || '/';
  res.redirect(back);
});

// ---------- Offentlege sider ----------
app.get('/', async (req, res, next) => {
  try {
    const products = await store.listProducts();
    const campaigns = await store.listCampaigns();
    const featured = products.filter((p) => p.featured).slice(0, 8);
    const prices = priceMap(featured, res.locals.tier, campaigns, res.locals.club);
    res.render('home', { ...seo(res, 'home'), home: res.locals.content.home || {}, featured, prices });
  } catch (e) { next(e); }
});

const CATEGORIES = {
  barn: 'Barn 1–8 år', junior: 'Junior 10–16 år', dame: 'Dame', herre: 'Herre',
};

function sortProducts(products, prices, sortering) {
  if (sortering === 'pris-lav') return [...products].sort((a, b) => prices[a.slug].final - prices[b.slug].final);
  if (sortering === 'pris-hoy') return [...products].sort((a, b) => prices[b.slug].final - prices[a.slug].final);
  return products;
}

app.get('/produkter', async (req, res, next) => {
  try {
    const all = await store.listProducts();
    const campaigns = await store.listCampaigns();
    const prices = priceMap(all, res.locals.tier, campaigns, res.locals.club);
    const products = sortProducts(all, prices, req.query.sortering);
    res.render('products', {
      ...seo(res, 'produkter'), products, prices, categories: CATEGORIES,
      activeCategory: null, heading: 'Alle produkter', sortering: req.query.sortering || '',
    });
  } catch (e) { next(e); }
});

app.get('/produkter/:kategori', async (req, res, next) => {
  try {
    const kat = req.params.kategori;
    if (!CATEGORIES[kat]) return next();
    const all = await store.listProducts();
    const inCat = all.filter((p) => p.category === kat);
    const campaigns = await store.listCampaigns();
    const prices = priceMap(inCat, res.locals.tier, campaigns, res.locals.club);
    const products = sortProducts(inCat, prices, req.query.sortering);
    res.render('products', {
      ...seo(res, 'produkter'), title: `${CATEGORIES[kat]} | Skogstad Sport`,
      products, prices, categories: CATEGORIES, activeCategory: kat, heading: CATEGORIES[kat],
      sortering: req.query.sortering || '',
    });
  } catch (e) { next(e); }
});

// Produktsøk (til søk-overlayet i headeren)
app.get('/api/sok', async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim().toLowerCase();
    if (q.length < 2) return res.json({ ok: true, results: [] });
    const all = await store.listProducts();
    const campaigns = await store.listCampaigns();
    const hits = all.filter((p) => {
      const hay = `${p.name} ${p.subtitle} ${p.color} ${CATEGORIES[p.category] || ''}`.toLowerCase();
      return q.split(/\s+/).every((word) => hay.includes(word));
    }).slice(0, 8);
    const prices = priceMap(hits, res.locals.tier, campaigns, res.locals.club);
    res.json({
      ok: true,
      results: hits.map((p) => ({
        slug: p.slug, name: p.name, color: p.color, image: p.image,
        category: CATEGORIES[p.category] || p.category,
        price: prices[p.slug].final, ordinary: prices[p.slug].ordinary,
      })),
    });
  } catch (e) { next(e); }
});

app.get('/produkt/:slug', async (req, res, next) => {
  try {
    const product = await store.getProduct(req.params.slug);
    if (!product || !product.active) return next();
    const campaigns = await store.listCampaigns();
    const price = resolvePrice(product, res.locals.tier, campaigns, res.locals.club);
    // Pris for alle nivå — til «sjå kva medlemmer betaler»-blokka
    const tierPrices = {};
    for (const t of VALID_TIERS) tierPrices[t] = resolvePrice(product, t, campaigns, res.locals.club);
    const anonPrice = resolvePrice(product, null, campaigns, res.locals.club);
    // «Flere fra kategorien» — same kategori, utan produktet sjølv
    const all = await store.listProducts();
    const related = all.filter((p) => p.category === product.category && p.slug !== product.slug).slice(0, 4);
    const relatedPrices = priceMap(related, res.locals.tier, campaigns, res.locals.club);
    res.render('product', {
      ...seo(res, 'produkter'),
      title: `${product.name} | Skogstad Sport`,
      description: (product.description || '').slice(0, 155),
      product, price, tierPrices, anonPrice, categories: CATEGORIES, related, relatedPrices,
    });
  } catch (e) { next(e); }
});

app.get('/handlekurv', (req, res) => {
  res.render('cart', seo(res, 'handlekurv'));
});

app.get('/kundeklubb', (req, res) => {
  res.render('club', { ...seo(res, 'kundeklubb'), clubConf: res.locals.club });
});

app.get('/om-oss', (req, res) => {
  res.render('about', { ...seo(res, 'om-oss'), about: res.locals.content.about || { timeline: [] } });
});

app.get('/baerekraft', (req, res) => {
  res.render('sustainability', { ...seo(res, 'baerekraft'), sus: res.locals.content.sustainability || { points: [] } });
});

app.get('/butikker', (req, res) => {
  res.render('stores', { ...seo(res, 'butikker'), stores: res.locals.content.stores || [] });
});

app.get('/kundeservice', (req, res) => {
  res.render('contact', { ...seo(res, 'kundeservice'), sent: req.query.sendt === '1' });
});

app.get('/for-skogstad', (req, res) => {
  res.render('pitch', seo(res, 'for-skogstad'));
});

// Juridiske sider
app.get('/kjopsvilkar', (req, res) => res.render('legal-terms', seo(res, 'kjopsvilkar')));
app.get('/personvern', (req, res) => res.render('legal-privacy', seo(res, 'personvern')));
app.get('/informasjonskapsler', (req, res) => res.render('legal-cookies', seo(res, 'informasjonskapsler')));

// ---------- API ----------
const rateBuckets = new Map();
function rateLimit(key, max, windowMs) {
  const now = Date.now();
  const bucket = rateBuckets.get(key) || [];
  const fresh = bucket.filter((t) => now - t < windowMs);
  if (fresh.length >= max) { rateBuckets.set(key, fresh); return false; }
  fresh.push(now);
  rateBuckets.set(key, fresh);
  return true;
}

app.post('/api/kontakt', async (req, res) => {
  const { navn, epost, emne, melding, nettside } = req.body || {};
  if (nettside) return res.json({ ok: true }); // honningfelle for bots
  if (!navn || !epost || !melding) return res.status(400).json({ ok: false, error: 'Fyll ut navn, e-post og melding.' });
  if (!rateLimit('kontakt:' + req.ip, 5, 10 * 60 * 1000)) {
    return res.status(429).json({ ok: false, error: 'For mange meldinger – prøv igjen senere.' });
  }
  await store.addMessage('kontakt', {
    navn: String(navn).slice(0, 200), epost: String(epost).slice(0, 200),
    emne: String(emne || '').slice(0, 200), melding: String(melding).slice(0, 5000),
  });
  res.json({ ok: true });
});

app.post('/api/klubb-innmelding', async (req, res) => {
  const { navn, epost, nettside } = req.body || {};
  if (nettside) return res.json({ ok: true });
  if (!navn || !epost) return res.status(400).json({ ok: false, error: 'Fyll ut navn og e-post.' });
  if (!rateLimit('klubb:' + req.ip, 5, 10 * 60 * 1000)) {
    return res.status(429).json({ ok: false, error: 'For mange forsøk – prøv igjen senere.' });
  }
  await store.addMessage('klubb-innmelding', { navn: String(navn).slice(0, 200), epost: String(epost).slice(0, 200) });
  res.json({ ok: true });
});

app.post('/api/handlekurv/quote', async (req, res, next) => {
  try {
    const items = Array.isArray(req.body.items) ? req.body.items.slice(0, 50) : [];
    const campaigns = await store.listCampaigns();
    const club = res.locals.club;
    const tier = res.locals.tier;
    const lines = [];
    let sum = 0, ordinarySum = 0, points = 0;
    for (const it of items) {
      const p = await store.getProduct(String(it.slug));
      if (!p || !p.active) continue;
      const qty = Math.max(1, Math.min(20, parseInt(it.qty, 10) || 1));
      const price = resolvePrice(p, tier, campaigns, club);
      lines.push({
        slug: p.slug, name: p.name, image: p.image, color: p.color,
        size: String(it.size || '').slice(0, 10), qty, price,
        lineTotal: price.final * qty,
      });
      sum += price.final * qty;
      ordinarySum += price.ordinary * qty;
      points += price.points * qty;
    }
    const freeShipping = tier && club.tiers[tier] && club.tiers[tier].freeShipping;
    res.json({
      ok: true, lines, sum, ordinarySum, saved: ordinarySum - sum, points,
      tier, tierLabel: tier ? club.tiers[tier].label : null,
      freeShipping: !!freeShipping,
    });
  } catch (e) { next(e); }
});

// ---------- Opplasta bilete frå DB ----------
app.get('/media/:name', async (req, res, next) => {
  try {
    const img = await store.getImage(req.params.name);
    if (!img) return next();
    res.setHeader('Content-Type', img.mime);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(img.bytes);
  } catch (e) { next(e); }
});

// ---------- SEO-infrastruktur ----------
const SITEMAP_PATHS = ['/', '/produkter', '/produkter/barn', '/produkter/junior', '/produkter/dame', '/produkter/herre',
  '/kundeklubb', '/om-oss', '/baerekraft', '/butikker', '/kundeservice', '/kjopsvilkar', '/personvern', '/informasjonskapsler'];

app.get('/sitemap.xml', async (req, res) => {
  const base = `${req.protocol}://${req.get('host')}`;
  const products = await store.listProducts();
  const urls = [...SITEMAP_PATHS, ...products.map((p) => `/produkt/${p.slug}`)];
  res.setHeader('Content-Type', 'application/xml');
  res.send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${base}${u}</loc></url>`).join('\n')}\n</urlset>`);
});

app.get('/robots.txt', (req, res) => {
  res.setHeader('Content-Type', 'text/plain');
  if (DEMO_MODE) {
    res.send('# Demo-modus: sida skal ikkje indekserast\nUser-agent: *\nDisallow: /\n');
  } else {
    const base = `${req.protocol}://${req.get('host')}`;
    res.send(`User-agent: *\nDisallow: /admin\nDisallow: /handlekurv\n\nSitemap: ${base}/sitemap.xml\n`);
  }
});

app.get('/healthz', (req, res) => res.json({ ok: true, db: store.usePg ? 'postgres' : 'fil' }));

// ---------- Admin ----------
app.use('/admin', adminRouter(app));

// ---------- 404 og feil ----------
app.use((req, res) => {
  res.status(404).render('404', { title: 'Fant ikke siden | Skogstad Sport', description: '', page: '404' });
});

app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  console.error(err);
  res.status(500);
  if (res.locals.site) {
    try { return res.render('404', { title: 'Noe gikk galt | Skogstad Sport', description: '', page: 'error', is500: true }); } catch {}
  }
  res.send('Noe gikk galt.');
});

// ---------- Oppstart ----------
(async () => {
  await store.init();
  await seedIfEmpty();
  app.listen(PORT, () => {
    console.log(`Skogstad demo køyrer på http://localhost:${PORT} (DB: ${store.usePg ? 'postgres' : 'lokal fil'}, demo-modus: ${DEMO_MODE})`);
  });
})();
