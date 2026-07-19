'use strict';
// Datalag med to drivarar: PostgreSQL (DATABASE_URL sett, t.d. på Render)
// eller lokal JSON-fil (utvikling). Same async API uansett drivar.

const fs = require('fs');
const path = require('path');

const usePg = !!process.env.DATABASE_URL;

// ---------- PostgreSQL-drivar ----------
let pool = null;
if (usePg) {
  const { Pool } = require('pg');
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
    max: 5,
  });
}

// ---------- Fil-drivar (kun lokal utvikling) ----------
const DEV_FILE = path.join(__dirname, '..', 'data', 'dev-store.json');
let devData = null;
function devLoad() {
  if (devData) return devData;
  try {
    devData = JSON.parse(fs.readFileSync(DEV_FILE, 'utf8'));
  } catch {
    devData = { content: {}, products: [], campaigns: [], messages: [], images: {}, seq: 1 };
  }
  return devData;
}
let devSaveTimer = null;
function devSave() {
  devLoad();
  fs.mkdirSync(path.dirname(DEV_FILE), { recursive: true });
  clearTimeout(devSaveTimer);
  devSaveTimer = setTimeout(() => {
    fs.writeFileSync(DEV_FILE, JSON.stringify(devData));
  }, 50);
}

// ---------- Skjema ----------
async function init() {
  if (!usePg) { devLoad(); return; }
  await pool.query(`
    CREATE TABLE IF NOT EXISTS content (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL
    );
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      data JSONB NOT NULL,
      sort INT NOT NULL DEFAULT 0,
      active BOOLEAN NOT NULL DEFAULT TRUE
    );
    CREATE TABLE IF NOT EXISTS campaigns (
      id SERIAL PRIMARY KEY,
      data JSONB NOT NULL
    );
    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      kind TEXT NOT NULL DEFAULT 'kontakt',
      data JSONB NOT NULL
    );
    CREATE TABLE IF NOT EXISTS images (
      name TEXT PRIMARY KEY,
      mime TEXT NOT NULL,
      bytes BYTEA NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

// ---------- Content (nøkkel → JSON) ----------
async function getContent(key, fallback = null) {
  if (usePg) {
    const r = await pool.query('SELECT value FROM content WHERE key=$1', [key]);
    return r.rows[0] ? r.rows[0].value : fallback;
  }
  const d = devLoad();
  return key in d.content ? d.content[key] : fallback;
}

async function setContent(key, value) {
  if (usePg) {
    await pool.query(
      'INSERT INTO content(key,value) VALUES($1,$2) ON CONFLICT (key) DO UPDATE SET value=$2',
      [key, JSON.stringify(value)]
    );
    return;
  }
  const d = devLoad();
  d.content[key] = value;
  devSave();
}

async function getAllContent() {
  if (usePg) {
    const r = await pool.query('SELECT key, value FROM content');
    const out = {};
    for (const row of r.rows) out[row.key] = row.value;
    return out;
  }
  return { ...devLoad().content };
}

// ---------- Produkt ----------
async function listProducts(onlyActive = true) {
  if (usePg) {
    const r = await pool.query(
      onlyActive
        ? 'SELECT id, slug, data, sort, active FROM products WHERE active ORDER BY sort, id'
        : 'SELECT id, slug, data, sort, active FROM products ORDER BY sort, id'
    );
    return r.rows.map(rowToProduct);
  }
  const d = devLoad();
  return d.products
    .filter((p) => (onlyActive ? p.active : true))
    .sort((a, b) => a.sort - b.sort || a.id - b.id)
    .map((p) => ({ ...p.data, id: p.id, slug: p.slug, sort: p.sort, active: p.active }));
}

function rowToProduct(row) {
  return { ...row.data, id: row.id, slug: row.slug, sort: row.sort, active: row.active };
}

async function getProduct(slug) {
  if (usePg) {
    const r = await pool.query('SELECT id, slug, data, sort, active FROM products WHERE slug=$1', [slug]);
    return r.rows[0] ? rowToProduct(r.rows[0]) : null;
  }
  const d = devLoad();
  const p = d.products.find((x) => x.slug === slug);
  return p ? { ...p.data, id: p.id, slug: p.slug, sort: p.sort, active: p.active } : null;
}

async function getProductById(id) {
  if (usePg) {
    const r = await pool.query('SELECT id, slug, data, sort, active FROM products WHERE id=$1', [id]);
    return r.rows[0] ? rowToProduct(r.rows[0]) : null;
  }
  const d = devLoad();
  const p = d.products.find((x) => x.id === Number(id));
  return p ? { ...p.data, id: p.id, slug: p.slug, sort: p.sort, active: p.active } : null;
}

async function saveProduct(prod) {
  const { id, slug, sort = 0, active = true, ...rest } = prod;
  const data = rest;
  if (usePg) {
    if (id) {
      await pool.query('UPDATE products SET slug=$1, data=$2, sort=$3, active=$4 WHERE id=$5', [
        slug, JSON.stringify(data), sort, active, id,
      ]);
      return id;
    }
    const r = await pool.query(
      'INSERT INTO products(slug,data,sort,active) VALUES($1,$2,$3,$4) RETURNING id',
      [slug, JSON.stringify(data), sort, active]
    );
    return r.rows[0].id;
  }
  const d = devLoad();
  if (id) {
    const p = d.products.find((x) => x.id === Number(id));
    if (p) Object.assign(p, { slug, data, sort, active });
    devSave();
    return id;
  }
  const newId = d.seq++;
  d.products.push({ id: newId, slug, data, sort, active });
  devSave();
  return newId;
}

async function deleteProduct(id) {
  if (usePg) { await pool.query('DELETE FROM products WHERE id=$1', [id]); return; }
  const d = devLoad();
  d.products = d.products.filter((x) => x.id !== Number(id));
  devSave();
}

// ---------- Kampanjar ----------
async function listCampaigns() {
  if (usePg) {
    const r = await pool.query('SELECT id, data FROM campaigns ORDER BY id');
    return r.rows.map((row) => ({ ...row.data, id: row.id }));
  }
  return devLoad().campaigns.map((c) => ({ ...c.data, id: c.id }));
}

async function saveCampaign(camp) {
  const { id, ...data } = camp;
  if (usePg) {
    if (id) { await pool.query('UPDATE campaigns SET data=$1 WHERE id=$2', [JSON.stringify(data), id]); return id; }
    const r = await pool.query('INSERT INTO campaigns(data) VALUES($1) RETURNING id', [JSON.stringify(data)]);
    return r.rows[0].id;
  }
  const d = devLoad();
  if (id) {
    const c = d.campaigns.find((x) => x.id === Number(id));
    if (c) c.data = data;
    devSave();
    return id;
  }
  const newId = d.seq++;
  d.campaigns.push({ id: newId, data });
  devSave();
  return newId;
}

async function deleteCampaign(id) {
  if (usePg) { await pool.query('DELETE FROM campaigns WHERE id=$1', [id]); return; }
  const d = devLoad();
  d.campaigns = d.campaigns.filter((x) => x.id !== Number(id));
  devSave();
}

// ---------- Meldingar ----------
async function addMessage(kind, data) {
  if (usePg) {
    await pool.query('INSERT INTO messages(kind, data) VALUES($1,$2)', [kind, JSON.stringify(data)]);
    return;
  }
  const d = devLoad();
  d.messages.push({ id: d.seq++, created_at: new Date().toISOString(), kind, data });
  devSave();
}

async function listMessages() {
  if (usePg) {
    const r = await pool.query('SELECT id, created_at, kind, data FROM messages ORDER BY id DESC LIMIT 200');
    return r.rows;
  }
  return [...devLoad().messages].reverse();
}

async function deleteMessage(id) {
  if (usePg) { await pool.query('DELETE FROM messages WHERE id=$1', [id]); return; }
  const d = devLoad();
  d.messages = d.messages.filter((x) => x.id !== Number(id));
  devSave();
}

// ---------- Bilete (opplasta via admin) ----------
async function saveImage(name, mime, bytes) {
  if (usePg) {
    await pool.query(
      'INSERT INTO images(name,mime,bytes) VALUES($1,$2,$3) ON CONFLICT (name) DO UPDATE SET mime=$2, bytes=$3',
      [name, mime, bytes]
    );
    return;
  }
  const d = devLoad();
  d.images[name] = { mime, b64: bytes.toString('base64'), created_at: new Date().toISOString() };
  devSave();
}

async function getImage(name) {
  if (usePg) {
    const r = await pool.query('SELECT mime, bytes FROM images WHERE name=$1', [name]);
    return r.rows[0] ? { mime: r.rows[0].mime, bytes: r.rows[0].bytes } : null;
  }
  const img = devLoad().images[name];
  return img ? { mime: img.mime, bytes: Buffer.from(img.b64, 'base64') } : null;
}

async function listImages() {
  if (usePg) {
    const r = await pool.query("SELECT name, mime, octet_length(bytes) AS size, created_at FROM images ORDER BY created_at DESC");
    return r.rows;
  }
  const d = devLoad();
  return Object.entries(d.images).map(([name, v]) => ({
    name, mime: v.mime, size: Buffer.from(v.b64, 'base64').length, created_at: v.created_at,
  }));
}

async function deleteImage(name) {
  if (usePg) { await pool.query('DELETE FROM images WHERE name=$1', [name]); return; }
  const d = devLoad();
  delete d.images[name];
  devSave();
}

module.exports = {
  usePg, init,
  getContent, setContent, getAllContent,
  listProducts, getProduct, getProductById, saveProduct, deleteProduct,
  listCampaigns, saveCampaign, deleteCampaign,
  addMessage, listMessages, deleteMessage,
  saveImage, getImage, listImages, deleteImage,
};
