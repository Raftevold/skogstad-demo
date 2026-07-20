'use strict';
// Cache-busting for statiske filer: URL-ane får ein innhaldshash (?v=abc123),
// slik at lang nettlesar-cache er trygt — ny filversjon gir automatisk ny URL.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const versions = {};

function version(rel) {
  if (versions[rel]) return versions[rel];
  try {
    const file = path.join(PUBLIC_DIR, ...rel.replace(/^\//, '').split('/'));
    versions[rel] = crypto.createHash('md5').update(fs.readFileSync(file)).digest('hex').slice(0, 10);
  } catch {
    versions[rel] = '0';
  }
  return versions[rel];
}

function asset(rel) {
  return `${rel}?v=${version(rel)}`;
}

module.exports = { asset };
