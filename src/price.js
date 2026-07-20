'use strict';
// Prismotoren — éin kjelde til sanning for alle prisar.
// Regel: «beste pris vinn». Kampanjar kan gjelde alle eller berre medlemmer.
// Kvar utrekning returnerer eit spor (trace) som forklarer prisen.

function campaignApplies(campaign, product, now) {
  if (!campaign.active) return false;
  if (campaign.from && now < new Date(campaign.from + 'T00:00:00')) return false;
  if (campaign.to && now > new Date(campaign.to + 'T23:59:59')) return false;
  const scope = campaign.scope || { type: 'alle' };
  if (scope.type === 'alle') return true;
  if (scope.type === 'kategori') return scope.category === product.category;
  if (scope.type === 'produkter') return (scope.slugs || []).includes(product.slug);
  return false;
}

/**
 * Reknar ut pris for eitt produkt.
 * @param {object} product  Produkt med .price (ordinær pris)
 * @param {string|null} tier  'medlem' | 'solv' | 'gull' | null (ikkje innlogga)
 * @param {Array} campaigns  Alle kampanjar
 * @param {object} club  Kundeklubb-konfigurasjon (tiers med bonusPercent)
 * @returns {{ ordinary, final, discountPercent, memberOnly, campaignName, points, trace }}
 */
function resolvePrice(product, tier, campaigns, club, now = new Date()) {
  const ordinary = product.price;
  const trace = [{ rule: 'Ordinær pris', price: ordinary }];

  let best = { price: ordinary, name: null, memberOnly: false };
  for (const c of campaigns) {
    if (!campaignApplies(c, product, now)) continue;
    if (c.audience === 'medlem' && !tier) continue; // medlemskampanje krev medlemskap
    const p = Math.round(ordinary * (1 - c.percent / 100));
    trace.push({
      rule: `Kampanje: ${c.name} (−${c.percent} %)${c.audience === 'medlem' ? ' – kun medlemmer' : ''}`,
      price: p,
      applied: false,
    });
    if (p < best.price) best = { price: p, name: c.name, memberOnly: c.audience === 'medlem' };
  }

  // Merk vinnaren i sporet
  for (const t of trace) {
    if (t.price === best.price && best.name && t.rule.includes(best.name)) t.applied = true;
  }
  if (!best.name) trace[0].applied = true;

  // Bonuspoeng: 1 poeng per krone av betalt pris (kjelde: kundeklubb-info).
  // pointsValue = kva poenga er verde i bonussjekk (1000 poeng = checkPer1000 kr).
  const points = tier ? Math.round(best.price * (club.pointsPerKrone || 1)) : 0;
  const tierConf = tier && club.tiers[tier] ? club.tiers[tier] : null;
  const bonusPercent = tierConf ? tierConf.bonusPercent : 0;
  const pointsValue = tierConf ? Math.round(points * (tierConf.checkPer1000 || 0) / 1000) : 0;

  return {
    ordinary,
    final: best.price,
    discountPercent: best.price < ordinary ? Math.round((1 - best.price / ordinary) * 100) : 0,
    memberOnly: best.memberOnly,
    campaignName: best.name,
    points,
    pointsValue,
    bonusPercent,
    trace,
  };
}

/** Pris for alle produkt i ei liste (til produktkort). */
function priceMap(products, tier, campaigns, club, now = new Date()) {
  const map = {};
  for (const p of products) map[p.slug] = resolvePrice(p, tier, campaigns, club, now);
  return map;
}

module.exports = { resolvePrice, priceMap, campaignApplies };
