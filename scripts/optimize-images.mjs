// Genererer optimaliserte bilete (AVIF/WebP/JPG) frå research/images til public/images.
// Køyrast éin gong lokalt: npm run optimize-images
import sharp from 'sharp';
import { mkdir, copyFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(here, '..', '..', 'research', 'images');
const OUT = path.join(here, '..', 'public', 'images');
await mkdir(OUT, { recursive: true });

const AVIF = { quality: 55 };
const WEBP = { quality: 78 };
const JPEG = { quality: 80, mozjpeg: true };

async function make(input, outBase, resize, extract) {
  let img = sharp(path.join(SRC, input)).rotate();
  if (extract) img = img.extract(extract);
  img = img.resize(resize);
  await img.clone().avif(AVIF).toFile(path.join(OUT, `${outBase}.avif`));
  await img.clone().webp(WEBP).toFile(path.join(OUT, `${outBase}.webp`));
  await img.clone().jpeg(JPEG).toFile(path.join(OUT, `${outBase}.jpg`));
  console.log('ok', outBase);
}

// Fleire av kjeldebileta har innbakt kampanjetekst. Vi beskjer tekstfrie
// regionar (extract) slik at demoen får reine bilete.

// Hero: hero-sommer.jpg (2200x1100) har «-40%»-stripe øvst til venstre.
await make('hero-sommer.jpg', 'hero-sommer-1920', { width: 1920 }, { left: 700, top: 230, width: 1500, height: 870 });
await make('hero-sommer.jpg', 'hero-sommer-mobil', { width: 720, height: 900, fit: 'cover' }, { left: 1250, top: 0, width: 950, height: 1100 });

// Kategorikort (4:5) – tekstfrie topp-regionar av kampanjebileta (1200x1500)
await make('tile-7.jpg', 'tile-7-800', { width: 800, height: 1000, fit: 'cover' }, { left: 280, top: 0, width: 640, height: 800 });      // barn
await make('tile-16.jpg', 'kat-junior-800', { width: 800, height: 1000, fit: 'cover' }, { left: 280, top: 0, width: 640, height: 800 }); // junior
await make('tile-14-1.jpg', 'tile-14-1-800', { width: 800, height: 1000, fit: 'cover' }, { left: 280, top: 0, width: 640, height: 800 }); // dame
await make('tile-15-1.jpg', 'kat-herre-800', { width: 800, height: 1000, fit: 'cover' }, { left: 280, top: 0, width: 640, height: 800 }); // herre

// Seksjonsbilete
await make('hero-sommer.jpg', 'kat-medlem-800', { width: 800, height: 600, fit: 'cover' }, { left: 1250, top: 120, width: 950, height: 713 });   // kundeklubb
await make('tile-sommer.jpg', 'tile-15-1-800', { width: 800, height: 1000, fit: 'cover' }, { left: 100, top: 450, width: 840, height: 1050 });   // historie (framsida)
await make('hero-sommer.jpg', 'tile-16-800', { width: 800, height: 1000, fit: 'cover' }, { left: 550, top: 330, width: 616, height: 770 });      // om oss
await make('tile-5-1.jpg', 'tile-5-1-800', { width: 800, height: 1000, fit: 'cover' }, { left: 160, top: 400, width: 880, height: 1100 });       // berekraft

// Produktbilete (kvadrat i tre storleikar)
const prods = ['prod-roros', 'prod-alvdal', 'prod-gon', 'prod-falkenuten', 'prod-orje', 'prod-lonahorgi',
  'prod-skarfjellet', 'prod-vika', 'prod-stabekk', 'prod-gol', 'prod-haukasen-jakke', 'prod-ringstind'];
for (const p of prods) {
  for (const size of [900, 600, 300]) {
    await make(`${p}.jpg`, `${p}-${size}`, { width: size, height: size, fit: 'cover' });
  }
}

// Logoar (SVG kopierast rått)
await copyFile(path.join(SRC, 'logo-skogstad.svg'), path.join(OUT, 'logo-skogstad.svg'));
await copyFile(path.join(SRC, 'logo-icon.svg'), path.join(OUT, 'logo-icon.svg'));
console.log('Ferdig.');
