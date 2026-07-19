# Skogstad Sport – demo-nettside (konseptforslag)

**Dette er ikkje Skogstad Sport AS si offisielle nettside.** Sida er eit uavhengig
konseptforslag/demo bygd for å vise korleis ein moderne nettbutikk for Skogstad kan
løyse medlemsprisar, kampanjar, fart og innhaldsredigering. Alle produktbilete
tilhøyrer Skogstad Sport AS.

## Teknologi

- **Node.js + Express + EJS** – server-rendra HTML utan tunge rammeverk → svært gode Core Web Vitals
- **PostgreSQL** (Render) i produksjon, lokal JSON-fil under utvikling – same datalag (`src/store.js`)
- **Prismotor** (`src/price.js`): éi kjelde til sanning for alle prisar. Kampanjar (alle/medlem),
  medlemsnivå og «beste pris vinn»-regel med fullt utrekningsspor
- **Admin-CMS** på `/admin`: tekstar, produkt, kampanjar, bilete (lagra i DB), butikkar,
  kundeklubb, varsellinje, SEO – utan kode
- **sharp** for biletoptimalisering (AVIF/WebP) og komprimering av opplasta bilete

## Køyre lokalt

```bash
npm install
npm start          # http://localhost:3000 (lokal fil-lagring, ingen DB nødvendig)
```

Utan `ADMIN_PASSWORD` blir eit mellombels admin-passord skrive til konsollen ved oppstart.

## Miljøvariablar (produksjon)

| Variabel | Forklaring |
|---|---|
| `DATABASE_URL` | Postgres-tilkopling (Render Internal Database URL) |
| `ADMIN_PASSWORD` | Passord for `/admin` (alternativt `ADMIN_PASSWORD_HASH`, bcrypt) |
| `SESSION_SECRET` | Hemmeleg nøkkel for admin-økter |
| `DEMO_MODE` | `true` (standard) = noindex på alle sider. Sett `false` fyrst ved godkjend lansering |

## Bilete

`scripts/optimize-images.mjs` genererer AVIF/WebP/JPG i fleire storleikar frå
kjeldebilete (lokal mappe `../research/images`, ikkje i repoet). Ferdig-genererte
bilete ligg i `public/images` og er sjekka inn.
