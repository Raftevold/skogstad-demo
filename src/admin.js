'use strict';
const crypto = require('crypto');
const express = require('express');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const sharp = require('sharp');
const store = require('./store');

const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
let bootPassword = null;
if (!process.env.ADMIN_PASSWORD_HASH && !process.env.ADMIN_PASSWORD) {
  bootPassword = crypto.randomBytes(9).toString('base64url');
  console.log(`[admin] Ingen ADMIN_PASSWORD sett – mellombels passord for denne økta: ${bootPassword}`);
}

function sign(value) {
  return crypto.createHmac('sha256', SESSION_SECRET).update(value).digest('base64url');
}
function makeSession() {
  const exp = Date.now() + 12 * 3600 * 1000;
  return `${exp}.${sign('adm' + exp)}`;
}
function validSession(token) {
  if (!token) return false;
  const [exp, sig] = token.split('.');
  if (!exp || !sig) return false;
  if (Number(exp) < Date.now()) return false;
  const expect = sign('adm' + exp);
  return sig.length === expect.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expect));
}

async function checkPassword(pw) {
  if (!pw) return false;
  if (process.env.ADMIN_PASSWORD_HASH) return bcrypt.compare(pw, process.env.ADMIN_PASSWORD_HASH);
  const expected = process.env.ADMIN_PASSWORD || bootPassword;
  const a = Buffer.from(String(pw)); const b = Buffer.from(String(expected));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

module.exports = function adminRouter(app) {
  const r = express.Router();

  // Same-origin-vern for alle POST-kall i admin
  r.use((req, res, next) => {
    if (req.method === 'POST') {
      const origin = req.get('origin') || req.get('referer') || '';
      const host = req.get('host');
      if (origin && !origin.includes(host)) return res.status(403).send('Ugyldig opphav');
    }
    next();
  });

  r.get('/login', (req, res) => {
    if (validSession(req.cookies.adm)) return res.redirect('/admin');
    res.render('admin/login', { error: null });
  });

  r.post('/login', async (req, res) => {
    const ok = await checkPassword(req.body.passord);
    if (!ok) return res.status(401).render('admin/login', { error: 'Feil passord.' });
    res.setHeader('Set-Cookie', `adm=${makeSession()}; Path=/; Max-Age=43200; HttpOnly; SameSite=Strict${req.secure ? '; Secure' : ''}`);
    res.redirect('/admin');
  });

  r.get('/logout', (req, res) => {
    res.setHeader('Set-Cookie', 'adm=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict');
    res.redirect('/admin/login');
  });

  // Alt under her krev innlogging
  r.use((req, res, next) => {
    if (!validSession(req.cookies.adm)) return res.redirect('/admin/login');
    res.locals.saved = req.query.lagret === '1';
    next();
  });

  r.get('/', async (req, res) => {
    const [products, campaigns, messages, images] = await Promise.all([
      store.listProducts(false), store.listCampaigns(), store.listMessages(), store.listImages(),
    ]);
    res.render('admin/dashboard', {
      counts: { products: products.length, campaigns: campaigns.length, messages: messages.length, images: images.length },
      notice: res.locals.notice,
    });
  });

  // ---------- Tekstinnhald ----------
  r.get('/innhold', async (req, res) => {
    res.render('admin/content', {
      home: res.locals.content.home, about: res.locals.content.about, sus: res.locals.content.sustainability,
    });
  });

  r.post('/innhold/home', async (req, res) => {
    const cur = (await store.getContent('home')) || {};
    const b = req.body;
    const next = { ...cur };
    for (const k of ['heroTitle', 'heroSubtitle', 'heroCtaText', 'heroCtaLink', 'heroCta2Text', 'heroCta2Link',
      'favTitle', 'favText', 'clubTitle', 'clubText', 'historyTitle', 'historyText', 'jaktTitle', 'jaktText', 'storesTitle', 'storesText']) {
      if (k in b) next[k] = String(b[k]);
    }
    if (Array.isArray(b.uspTitle)) {
      next.usps = b.uspTitle.map((t, i) => ({
        icon: (cur.usps && cur.usps[i] && cur.usps[i].icon) || 'mountain',
        title: String(t), text: String(b.uspText[i] || ''),
      })).filter((u) => u.title);
    }
    await store.setContent('home', next);
    app.invalidateContentCache();
    res.redirect('/admin/innhold?lagret=1');
  });

  r.post('/innhold/about', async (req, res) => {
    const b = req.body;
    const timeline = Array.isArray(b.tlYear)
      ? b.tlYear.map((y, i) => ({ year: String(y), text: String(b.tlText[i] || '') })).filter((t) => t.year)
      : [];
    await store.setContent('about', { intro: String(b.intro || ''), timeline });
    app.invalidateContentCache();
    res.redirect('/admin/innhold?lagret=1');
  });

  r.post('/innhold/sustainability', async (req, res) => {
    const b = req.body;
    const points = Array.isArray(b.pTitle)
      ? b.pTitle.map((t, i) => ({ title: String(t), text: String(b.pText[i] || '') })).filter((p) => p.title)
      : [];
    await store.setContent('sustainability', { intro: String(b.intro || ''), points });
    app.invalidateContentCache();
    res.redirect('/admin/innhold?lagret=1');
  });

  // ---------- Produkt ----------
  r.get('/produkter', async (req, res) => {
    const products = await store.listProducts(false);
    res.render('admin/products', { products });
  });

  r.get('/produkter/ny', (req, res) => res.render('admin/product-edit', { p: null }));

  r.get('/produkter/:id', async (req, res) => {
    const p = await store.getProductById(req.params.id);
    if (!p) return res.redirect('/admin/produkter');
    res.render('admin/product-edit', { p });
  });

  r.post('/produkter/lagre', async (req, res) => {
    const b = req.body;
    const prod = {
      id: b.id ? Number(b.id) : undefined,
      slug: String(b.slug || '').trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || ('produkt-' + Date.now()),
      name: String(b.name || '').trim(),
      subtitle: String(b.subtitle || ''),
      category: ['barn', 'junior', 'dame', 'herre'].includes(b.category) ? b.category : 'dame',
      color: String(b.color || ''),
      price: Math.max(0, parseInt(b.price, 10) || 0),
      image: String(b.image || ''),
      sizes: String(b.sizes || '').split(',').map((s) => s.trim()).filter(Boolean),
      featured: b.featured === 'on',
      placeholder: b.placeholder === 'on',
      description: String(b.description || ''),
      specs: String(b.specs || '').split('\n').map((s) => s.trim()).filter(Boolean),
      sort: parseInt(b.sort, 10) || 0,
      active: b.active === 'on',
    };
    await store.saveProduct(prod);
    res.redirect('/admin/produkter?lagret=1');
  });

  r.post('/produkter/:id/slett', async (req, res) => {
    await store.deleteProduct(req.params.id);
    res.redirect('/admin/produkter?lagret=1');
  });

  // ---------- Kampanjar ----------
  r.get('/kampanjer', async (req, res) => {
    const campaigns = await store.listCampaigns();
    const products = await store.listProducts(false);
    res.render('admin/campaigns', { campaigns, products });
  });

  r.get('/kampanjer/ny', async (req, res) => {
    const products = await store.listProducts(false);
    res.render('admin/campaign-edit', { c: null, products });
  });

  r.get('/kampanjer/:id', async (req, res) => {
    const campaigns = await store.listCampaigns();
    const c = campaigns.find((x) => x.id === Number(req.params.id));
    if (!c) return res.redirect('/admin/kampanjer');
    const products = await store.listProducts(false);
    res.render('admin/campaign-edit', { c, products });
  });

  r.post('/kampanjer/lagre', async (req, res) => {
    const b = req.body;
    const scopeType = ['alle', 'kategori', 'produkter'].includes(b.scopeType) ? b.scopeType : 'alle';
    const camp = {
      id: b.id ? Number(b.id) : undefined,
      name: String(b.name || '').trim() || 'Kampanje',
      percent: Math.min(90, Math.max(1, parseInt(b.percent, 10) || 10)),
      audience: b.audience === 'medlem' ? 'medlem' : 'alle',
      active: b.active === 'on',
      from: String(b.from || ''), to: String(b.to || ''),
      scope: {
        type: scopeType,
        category: String(b.scopeCategory || ''),
        slugs: Array.isArray(b.scopeSlugs) ? b.scopeSlugs : (b.scopeSlugs ? [b.scopeSlugs] : []),
      },
    };
    await store.saveCampaign(camp);
    res.redirect('/admin/kampanjer?lagret=1');
  });

  r.post('/kampanjer/:id/slett', async (req, res) => {
    await store.deleteCampaign(req.params.id);
    res.redirect('/admin/kampanjer?lagret=1');
  });

  // ---------- Bilete ----------
  r.get('/bilder', async (req, res) => {
    const images = await store.listImages();
    res.render('admin/images', { images });
  });

  r.post('/bilder/last-opp', upload.single('bilde'), async (req, res) => {
    if (!req.file) return res.redirect('/admin/bilder');
    const base = (req.body.navn || req.file.originalname || 'bilde')
      .toLowerCase().replace(/\.[a-z0-9]+$/, '').replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'bilde';
    const name = `${base}-${Date.now().toString(36)}.webp`;
    const bytes = await sharp(req.file.buffer).rotate().resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
    await store.saveImage(name, 'image/webp', bytes);
    res.redirect('/admin/bilder?lagret=1');
  });

  r.post('/bilder/:name/slett', async (req, res) => {
    await store.deleteImage(req.params.name);
    res.redirect('/admin/bilder?lagret=1');
  });

  // ---------- Meldingar ----------
  r.get('/meldinger', async (req, res) => {
    const messages = await store.listMessages();
    res.render('admin/messages', { messages });
  });

  r.post('/meldinger/:id/slett', async (req, res) => {
    await store.deleteMessage(req.params.id);
    res.redirect('/admin/meldinger?lagret=1');
  });

  // ---------- Butikkar ----------
  r.get('/butikker', (req, res) => {
    res.render('admin/stores', { stores: res.locals.content.stores || [] });
  });

  r.post('/butikker', async (req, res) => {
    const b = req.body;
    const stores = Array.isArray(b.name)
      ? b.name.map((n, i) => ({ name: String(n), place: String(b.place[i] || ''), note: String(b.note[i] || '') })).filter((s) => s.name)
      : [];
    await store.setContent('stores', stores);
    app.invalidateContentCache();
    res.redirect('/admin/butikker?lagret=1');
  });

  // ---------- SEO ----------
  r.get('/seo', (req, res) => res.render('admin/seo', { seoMap: res.locals.seoMap }));

  r.post('/seo', async (req, res) => {
    const b = req.body;
    const seoMap = { ...(await store.getContent('seo', {})) };
    if (Array.isArray(b.page)) {
      b.page.forEach((pg, i) => {
        seoMap[pg] = { title: String(b.title[i] || ''), description: String(b.description[i] || '') };
      });
    }
    await store.setContent('seo', seoMap);
    app.invalidateContentCache();
    res.redirect('/admin/seo?lagret=1');
  });

  // ---------- Varsellinje ----------
  r.get('/varsel', (req, res) => res.render('admin/notice', { notice: res.locals.notice }));

  r.post('/varsel', async (req, res) => {
    await store.setContent('notice', {
      enabled: req.body.enabled === 'on',
      text: String(req.body.text || '').slice(0, 200),
      link: String(req.body.link || '').slice(0, 300),
    });
    app.invalidateContentCache();
    res.redirect('/admin/varsel?lagret=1');
  });

  // ---------- Kundeklubb ----------
  r.get('/klubb', (req, res) => res.render('admin/club', { clubConf: res.locals.club }));

  r.post('/klubb', async (req, res) => {
    const b = req.body;
    const cur = (await store.getContent('club')) || {};
    await store.setContent('club', {
      ...cur,
      welcomePercent: Math.min(50, Math.max(0, parseInt(b.welcomePercent, 10) || 15)),
      tiers: {
        medlem: { label: 'Medlem', bonusPercent: num(b.medlemBonus, 5), checkPer1000: num(b.medlemCheck, 50), freeShipping: b.medlemShip === 'on' },
        solv: { label: 'Sølv', bonusPercent: num(b.solvBonus, 7), checkPer1000: num(b.solvCheck, 70), freeShipping: b.solvShip === 'on' },
        gull: { label: 'Gull', bonusPercent: num(b.gullBonus, 10), checkPer1000: num(b.gullCheck, 100), freeShipping: b.gullShip === 'on' },
      },
      pointsPerKrone: 1,
    });
    app.invalidateContentCache();
    res.redirect('/admin/klubb?lagret=1');
  });

  function num(v, d) { const n = parseInt(v, 10); return Number.isFinite(n) ? n : d; }

  // ---------- Innstillingar ----------
  r.get('/innstillinger', (req, res) => res.render('admin/settings', { s: res.locals.site }));

  r.post('/innstillinger', async (req, res) => {
    const b = req.body;
    const cur = (await store.getContent('site')) || {};
    await store.setContent('site', {
      ...cur,
      name: String(b.name || cur.name), tagline: String(b.tagline || ''),
      phone: String(b.phone || ''), email: String(b.email || ''),
      orgnr: String(b.orgnr || ''), address: String(b.address || ''),
      social: {
        facebook: String(b.facebook || ''), instagram: String(b.instagram || ''),
        linkedin: String(b.linkedin || ''), youtube: String(b.youtube || ''), tiktok: String(b.tiktok || ''),
      },
    });
    app.invalidateContentCache();
    res.redirect('/admin/innstillinger?lagret=1');
  });

  return r;
};
