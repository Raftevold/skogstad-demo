'use strict';
// Standardinnhald for demoen. Alt faktainnhald er henta frå kjelder dokumentert
// i research/KILDER.md. Tekst merka [PLACEHOLDER] er ikkje verifisert fakta.

const store = require('./store');

const DEFAULT_CONTENT = {
  site: {
    name: 'Skogstad Sport',
    tagline: 'Tailored by nature',
    phone: '+47 57 87 67 70',
    email: 'kundeservice@skogstadsport.no',
    orgnr: '932 980 177 MVA',
    address: 'Gamlevegen 47, 6793 Innvik',
    social: {
      facebook: 'https://www.facebook.com/skogstadsport',
      instagram: 'https://www.instagram.com/skogstadsport/',
      linkedin: 'https://no.linkedin.com/company/skogstad-sport',
      youtube: 'https://www.youtube.com/@skogstadsport1937',
      tiktok: 'https://www.tiktok.com/@skogstadsport',
    },
  },
  notice: {
    enabled: true,
    text: 'SOMMERSALG – opptil 40 % på utvalgte varer',
    link: '/produkter?kampanje=sommersalg',
  },
  seo: {
    home: { title: 'Skogstad Sport | Turklær og fritidsklær siden 1937', description: 'Norsk familiebedrift fra Innvik i Nordfjord. Turklær og fritidsklær til hele familien – med medlemspriser som alltid stemmer.' },
    produkter: { title: 'Alle produkter | Skogstad Sport', description: 'Turklær og fritidsklær til barn, junior, dame og herre. Riktig pris – også for medlemmer.' },
    kundeklubb: { title: 'Skogstad-klubben | Skogstad Sport', description: 'Bli medlem: 15 % velkomstrabatt, bonuspoeng på alle kjøp og medlemspriser som alltid stemmer – i butikk og på nett.' },
    'om-oss': { title: 'Vår historie siden 1937 | Skogstad Sport', description: 'Fra skredder Halstein Skogstad i Innvik til tredje generasjon. 100 % familieeid norsk friluftsmerke.' },
    baerekraft: { title: 'Et steg i riktig retning | Skogstad Sport', description: 'Miljøfyrtårn-sertifisert. Reparasjon, ansvarlig produksjon og plagg som varer.' },
    butikker: { title: 'Finn butikk | Skogstad Sport', description: '17 Skogstad-butikker over hele Norge – fra Innvik til Lillestrøm.' },
    kundeservice: { title: 'Kundeservice og kontakt | Skogstad Sport', description: 'Vi er her for å hjelpe deg. Kontakt oss om retur, reklamasjon, levering eller medlemskap.' },
    kjopsvilkar: { title: 'Kjøpsvilkår | Skogstad Sport', description: 'Kjøpsvilkår for skogstadsport.no: levering, angrerett, retur og reklamasjon.' },
    personvern: { title: 'Personvernerklæring | Skogstad Sport', description: 'Hvordan vi behandler personopplysninger på denne demo-nettsiden.' },
    informasjonskapsler: { title: 'Informasjonskapsler | Skogstad Sport', description: 'Denne siden bruker kun nødvendige informasjonskapsler – ingen sporing.' },
    'for-skogstad': { title: 'Konseptet bak denne demoen | Skogstad Sport', description: 'Slik løser den nye arkitekturen medlemspriser, kampanjer og fart – uavhengig av ERP og plattform.' },
    handlekurv: { title: 'Handlekurv | Skogstad Sport', description: 'Din handlekurv med full prisoversikt.' },
  },
  home: {
    heroTitle: 'Skapt for tur. Siden 1937.',
    heroSubtitle: 'Turklær og fritidsklær til hele familien – fra en familiebedrift i Innvik i Nordfjord.',
    heroCtaText: 'Se sommerens favoritter',
    heroCtaLink: '/produkter',
    heroCta2Text: 'Bli medlem – få 15 %',
    heroCta2Link: '/kundeklubb',
    usps: [
      { icon: 'mountain', title: 'Norsk familiebedrift', text: 'Tredje generasjon Skogstad – 100 % familieeid siden 1937.' },
      { icon: 'shield', title: 'Skogstad-garanti', text: 'Kvalitet som tåler norsk vær. 2 års reklamasjonsrett – 5 år på varige varer.' },
      { icon: 'tag', title: 'Medlemspris som stemmer', text: 'Én prismotor for butikk og nett. Medlemmer ser alltid riktig pris.' },
      { icon: 'leaf', title: 'Et steg i riktig retning', text: 'Miljøfyrtårn-sertifisert, reparasjonstjeneste og plagg laget for å vare.' },
    ],
    favTitle: 'Sommerens favoritter',
    favText: 'Utvalgte turplagg til hele familien – nå med opptil 40 % rabatt.',
    clubTitle: 'Skogstad-klubben: alltid riktig pris',
    clubText: 'Som medlem får du 15 % velkomstrabatt, bonuspoeng på alle kjøp og egne medlemspriser – automatisk, i alle kanaler. Prøv demo-bryteren øverst på siden og se prisene endre seg.',
    historyTitle: 'Fra skredderverksted til hele Norges turgarderobe',
    historyText: 'I 1937 startet skredderen Halstein Skogstad i det små i Innvik i Nordfjord. I dag ledes familiebedriften av tredje generasjon – med samme mål: klær som tåler norsk vær.',
    jaktTitle: 'Klar for jaktsesongen',
    jaktText: 'Haukåsen-kolleksjonen: stillegående, slitesterk og bygget for lange dager i terrenget.',
    storesTitle: 'Besøk oss i butikk',
    storesText: '17 butikker over hele landet – fra Innvik til Lillestrøm. Medlemsfordelene dine gjelder selvsagt også der.',
  },
  about: {
    intro: 'Skogstad er en norsk familiebedrift fra Innvik i Nordfjord. Siden 1937 har vi laget sports- og fritidsklær for hele familien – formet av naturen på Vestlandet.',
    timeline: [
      { year: '1937', text: 'Skredderen Halstein Skogstad etablerer H. Skogstad Konfeksjon i Innvik. I løpet av få år har verkstedet rundt 15 ansatte.' },
      { year: '1978', text: 'Anton Skogstad, andre generasjon, tar over som daglig leder og dreier produksjonen mot sports- og turklær.' },
      { year: '1981', text: 'Selskapet skifter navn til Skogstad Sport AS og tar i bruk moderne vanntett tekstilteknologi.' },
      { year: '1984', text: 'Nye, moderne lokaler i Innvik med opp mot 35 ansatte.' },
      { year: '1997', text: 'Produksjonen flyttes til Kina for å utnytte spisskompetanse på teknisk bekledning.' },
      { year: '2002', text: 'Henning Skogstad, tredje generasjon, flytter til Kina i 11 år og bygger opp leverandørkjede og kvalitetskontroll.' },
      { year: '2013', text: 'Henning tar over som daglig leder. Skogstad er fortsatt 100 % familieeid.' },
      { year: 'I dag', text: '157 ansatte, 17 egne butikker over hele Norge og nettbutikk. Hovedkontoret ligger fortsatt i Innvik.' },
    ],
  },
  sustainability: {
    intro: 'Bærekraft i Skogstad handler om å ta bedre valg – for naturen, for menneskene som lager klærne våre og for deg som bruker dem.',
    points: [
      { title: 'Miljøfyrtårn-sertifisert', text: 'Skogstad er sertifisert Miljøfyrtårn og jobber systematisk med miljøledelse i hele driften.' },
      { title: 'Reparasjon fremfor nykjøp', text: 'Vi tilbyr reparasjonstjeneste slik at plaggene dine varer lenger. Godt for lommeboka, best for naturen.' },
      { title: 'Ansvarlig leverandørkjede', text: 'Tett oppfølging av produksjon og leverandører – bygget på over 20 års tilstedeværelse der klærne lages.' },
      { title: 'Plagg som varer', text: 'Skogstad-garantien: Kvalitet som tåler norsk vær, sesong etter sesong.' },
    ],
  },
  club: {
    welcomePercent: 15,
    pointsPerKrone: 1,
    tiers: {
      medlem: { label: 'Medlem', bonusPercent: 5, checkPer1000: 50, freeShipping: false },
      solv: { label: 'Sølv', bonusPercent: 7, checkPer1000: 70, freeShipping: true },
      gull: { label: 'Gull', bonusPercent: 10, checkPer1000: 100, freeShipping: true },
    },
  },
  stores: [
    { name: 'Skogstad Innvik', place: 'Innvik', note: 'Hovedkontor og butikk' },
    { name: 'Skogstad Stryn', place: 'Stryn', note: '' },
    { name: 'Skogstad Olden', place: 'Olden', note: '' },
    { name: 'Skogstad Nordfjordeid', place: 'Nordfjordeid', note: '' },
    { name: 'Skogstad Førde', place: 'Førde', note: '' },
    { name: 'Skogstad Ørsta', place: 'Ørsta', note: '' },
    { name: 'Skogstad Lom', place: 'Lom', note: '' },
    { name: 'Skogstad Gol', place: 'Gol', note: '' },
    { name: 'Skogstad Lillehammer', place: 'Lillehammer', note: '' },
    { name: 'Skogstad Hamar', place: 'Hamar', note: '' },
    { name: 'Skogstad Gulskogen', place: 'Drammen (Gulskogen)', note: '' },
    { name: 'Skogstad Sandefjord', place: 'Sandefjord', note: '' },
    { name: 'Skogstad Stavanger', place: 'Stavanger', note: '' },
    { name: 'Skogstad Kristiansund', place: 'Kristiansund', note: '' },
    { name: 'Skogstad Kanebogen', place: 'Harstad (Kanebogen)', note: '' },
    { name: 'Skogstad Metro', place: 'Lørenskog (Metro)', note: '' },
    { name: 'Skogstad Lillestrøm', place: 'Lillestrøm', note: '' },
  ],
};

const DEFAULT_PRODUCTS = [
  {
    slug: 'j-skarfjellet-teknisk-skalljakke', name: 'J Skarfjellet, teknisk skalljakke', subtitle: '2,5-lags teknisk skalljakke',
    category: 'junior', color: 'Gardenia', price: 1599, image: '/images/prod-skarfjellet',
    sizes: ['10', '12', '14', '16'], featured: true,
    description: '2,5-lags teknisk skalljakke med mekanisk stretch for optimal bevegelsesfrihet. Vanntett, vindtett og pustende med tapede sømmer.',
    specs: ['Vanntetthet: WP 20 000 mm', 'Pusteevne: WVP 15 000 g/m²/24t', 'Tapede sømmer', 'YKK AquaGuard-glidelåser', 'Justerbar hette med hakebeskytter', 'Refleksdetaljer', 'Vekt ca. 390 g (str. 14)'],
  },
  {
    slug: 'w-gon-pilefleece', name: 'W Gon, pilefleece', subtitle: 'Pilefleece genser',
    category: 'dame', color: 'Cedar Wood', price: 1399, image: '/images/prod-gon',
    sizes: ['XS', 'S', 'M', 'L', 'XL'], featured: true,
    description: 'Myk og varm pilefleece som holder deg god og varm på tur og i hverdagen.',
    specs: ['Pilefleece med høy varmeevne', 'Glidelås i front', 'Normal passform'],
  },
  {
    slug: 'w-falkenuten-shorts', name: 'W Falkenuten, shorts', subtitle: 'Turshorts',
    category: 'dame', color: 'Gardenia', price: 799, image: '/images/prod-falkenuten',
    sizes: ['34', '36', '38', '40', '42', '44'], featured: true,
    description: 'Lett og slitesterk turshorts til varme dager på stien.',
    specs: ['Lett og hurtigtørkende', 'God bevegelsesfrihet', 'Lommer med glidelås'],
  },
  {
    slug: 'w-orje-bomullsskjorte', name: 'W Ørje, bomullsskjorte', subtitle: 'Økologisk bomull',
    category: 'dame', color: 'Chinchilla', price: 899, image: '/images/prod-orje',
    sizes: ['XS', 'S', 'M', 'L', 'XL'], featured: false,
    description: 'Skjorte i økologisk bomull – like fin på tur som på kafé.',
    specs: ['100 % økologisk bomull', 'Normal passform'],
  },
  {
    slug: 'j-lonahorgi-turbukse', name: 'J Lønahorgi, turbukse', subtitle: 'Turbukse junior',
    category: 'junior', color: 'Vetvier', price: 799, image: '/images/prod-lonahorgi',
    sizes: ['10', '12', '14', '16'], featured: true,
    description: 'Slitesterk turbukse for aktive juniorer, med god bevegelsesfrihet.',
    specs: ['Mekanisk stretch', 'Forsterkede knær', 'Justerbar i livet'],
  },
  {
    slug: 'j-roros-turbukse', name: 'J Røros, turbukse', subtitle: 'Turbukse junior',
    category: 'junior', color: 'Black', price: 599, image: '/images/prod-roros',
    sizes: ['10', '12', '14', '16'], featured: true,
    description: 'Allsidig turbukse som tåler både skolegård og fjelltur.',
    specs: ['Slitesterkt materiale', 'Praktiske lommer'],
  },
  {
    slug: 'k-alvdal-microfleece-sett', name: 'K Alvdal, microfleece sett', subtitle: 'Microfleece sett barn',
    category: 'barn', color: 'Cloud Blue', price: 499, image: '/images/prod-alvdal',
    sizes: ['86', '92', '98', '104', '110', '116', '122', '128'], featured: true,
    description: 'Mykt og deilig microfleece-sett – perfekt mellomlag for de minste.',
    specs: ['Microfleece', 'Sett med jakke og bukse', 'Lett og varmt'],
  },
  {
    slug: 'm-vika-turshorts', name: 'M Vika, turshorts', subtitle: 'Cord turshorts',
    category: 'herre', color: 'Chinchilla', price: 899, image: '/images/prod-vika',
    sizes: ['S', 'M', 'L', 'XL', 'XXL'], featured: true,
    description: 'Turshorts i cord med moderne snitt og solid komfort.',
    specs: ['Slitesterk cord', 'Hurtigtørkende', 'Lommer med glidelås'],
  },
  {
    slug: 'j-stabekk-turshorts', name: 'J Stabekk, turshorts', subtitle: 'Cord turshorts junior',
    category: 'junior', color: 'Parisian Night', price: 799, image: '/images/prod-stabekk',
    sizes: ['10', '12', '14', '16'], featured: false,
    description: 'Turshorts i cord for junior – laget for lek og tur.',
    specs: ['Slitesterk cord', 'Justerbar i livet'],
  },
  {
    slug: 'm-gol-pilefleece', name: 'M Gol, pilefleece', subtitle: 'Pilefleece genser',
    category: 'herre', color: 'Chinchilla', price: 1399, image: '/images/prod-gol',
    sizes: ['S', 'M', 'L', 'XL', 'XXL'], featured: true,
    description: 'Varm pilefleece-genser – en klassiker i turgarderoben.',
    specs: ['Pilefleece med høy varmeevne', 'Glidelås i front'],
  },
  {
    slug: 'm-haukasen-jakke', name: 'M Haukåsen, jakke', subtitle: '2-lags teknisk jaktjakke',
    category: 'herre', color: 'Burnt Olive', price: 2799, image: '/images/prod-haukasen-jakke',
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'], featured: false,
    description: 'Teknisk jaktjakke som kombinerer funksjonalitet, komfort og slitestyrke i skiftende vær. Stillegående børstet fôr og gjennomtenkte jaktdetaljer.',
    specs: ['Vanntetthet: WP 15 000 mm', 'Tapede sømmer', 'Ventilasjonsglidelåser', 'Sklisikkert materiale på skuldrene', 'Lommer tilpasset jaktradio', 'Forsterket på utsatte områder'],
  },
  {
    slug: 'w-ringstind', name: 'W Ringstind', subtitle: '[PLACEHOLDER – produktinfo ikke hentet]',
    category: 'dame', color: 'Black', price: 999, image: '/images/prod-ringstind',
    sizes: ['XS', 'S', 'M', 'L', 'XL'], featured: false, placeholder: true,
    description: '[PLACEHOLDER] Pris og produktdetaljer for dette produktet er ikke hentet fra kildene og må fylles inn av Skogstad.',
    specs: [],
  },
];

// Kampanjar: Sommersalg-prisane speglar faktiske prisar på skogstadsport.no 2026-07-20.
const DEFAULT_CAMPAIGNS = [
  {
    name: 'Sommersalg -30%', percent: 30, audience: 'alle', active: true,
    scope: { type: 'produkter', slugs: ['w-gon-pilefleece', 'w-falkenuten-shorts', 'w-orje-bomullsskjorte', 'j-lonahorgi-turbukse', 'm-vika-turshorts', 'm-gol-pilefleece'] },
    from: '', to: '',
  },
  {
    name: 'Sommersalg -40%', percent: 40, audience: 'alle', active: true,
    scope: { type: 'produkter', slugs: ['j-skarfjellet-teknisk-skalljakke', 'j-stabekk-turshorts'] },
    from: '', to: '',
  },
  {
    name: 'Medlemstilbud: fleece [DEMO-EKSEMPEL]', percent: 40, audience: 'medlem', active: true,
    scope: { type: 'produkter', slugs: ['w-gon-pilefleece', 'm-gol-pilefleece'] },
    from: '', to: '', demo: true,
  },
];

async function seedIfEmpty() {
  const existing = await store.getContent('site');
  if (!existing) {
    for (const [key, value] of Object.entries(DEFAULT_CONTENT)) {
      await store.setContent(key, value);
    }
  }
  const prods = await store.listProducts(false);
  if (prods.length === 0) {
    let sort = 0;
    for (const p of DEFAULT_PRODUCTS) {
      await store.saveProduct({ ...p, sort: sort++, active: true });
    }
  }
  const camps = await store.listCampaigns();
  if (camps.length === 0) {
    for (const c of DEFAULT_CAMPAIGNS) await store.saveCampaign(c);
  }
}

module.exports = { seedIfEmpty, DEFAULT_CONTENT };
