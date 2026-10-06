// WiresHQ static site builder. Zero dependencies. Run: node build.js  ->  output in ./dist
const fs = require('fs'), path = require('path'), crypto = require('crypto');

const cfg = JSON.parse(fs.readFileSync('config.json', 'utf8'));
const OUT = 'dist', base = cfg.siteUrl.replace(/\/$/, ''), NOW = Date.now(), PER_PAGE = 24, TZ = cfg.timezone || '+00:00';
const warn = m => console.warn('WARNING: ' + m);
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const slugify = s => s.toLowerCase().trim().replace(/[^a-z0-9\u0600-\u06ff]+/g, '-').replace(/^-+|-+$/g, '');
const list = s => (s || '').split(',').map(x => x.trim()).filter(Boolean);
const href = (...p) => '/' + p.map(encodeURIComponent).join('/') + '/';
const exists = (...p) => fs.existsSync(path.join(...p));
const dirOf = url => decodeURIComponent(url.slice(1, -1)); // '/c/sports/' -> 'c/sports' (percent-escapes decoded for the file system)
const copyDir = (a, b) => { fs.mkdirSync(b, { recursive: true }); fs.readdirSync(a, { withFileTypes: true }).forEach(e => e.isDirectory() ? copyDir(path.join(a, e.name), path.join(b, e.name)) : fs.copyFileSync(path.join(a, e.name), path.join(b, e.name))); };
const abs = x => /^https?:\/\//i.test(x) ? x : base + (x.startsWith('/') ? '' : '/') + x;

// ---------- languages, dictionary, categories ----------
const LANGS = ['en', 'ar'], DIR = { en: 'ltr', ar: 'rtl' }, OTHER = { en: 'ar', ar: 'en' }, LOCALE = { en: 'en_US', ar: 'ar_AR' };
const u = (L, ...p) => p.length ? (L === 'ar' ? href('ar', ...p) : href(...p)) : (L === 'ar' ? '/ar/' : '/');
const T = {
  en: {
    tagline: cfg.tagline, description: cfg.description, skip: 'Skip to content', categories: 'Categories', search: 'Search', searchPlaceholder: 'Search stories',
    searchSite: 'Search {site}', closeSearch: 'Close search', darkTheme: 'Dark theme', langName: 'العربية', breakingNews: 'Breaking news', breaking: 'Breaking', live: 'Live',
    pause: 'Pause', play: 'Play', trending: 'Trending now', seeAll: 'See all', minRead: '{n} min read', by: 'By', newsroom: '{site} Newsroom', share: 'Share',
    copyLink: 'Copy link', linkCopied: 'Link copied', shareStory: 'Share this story', related: 'Related stories', newer: 'Newer', older: 'Older', pageOf: 'Page {n} of {m}',
    pagination: 'Pagination', advertisement: 'Advertisement', correction: 'Correction', emptyTitle: 'No stories here yet',
    emptyText: 'New stories land here as soon as they are published. Check back soon.', backHome: 'Back to home', notFoundTitle: 'This page could not be found',
    notFoundText: 'The link may be old or mistyped. Try search, or head back to the latest stories.', latest: 'Latest stories', loading: 'Loading', company: 'Company',
    policies: 'Policies', about: 'About', contact: 'Contact', editorial: 'Editorial policy and corrections', privacy: 'Privacy policy',
    footerAds: 'Ads are labeled and kept apart from editorial content.', rights: 'All rights reserved.', homeH1: '{site}: {tagline}', labelDesc: 'Stories labeled “{label}”.',
    categoryMeta: '{desc} Latest {name} stories from {site}.', newsOf: '{name} News', pageN: '{x}, Page {n}', updated: 'Updated', lastUpdated: 'Last updated',
    searchTitle: 'Search', searchIdle: 'Type a few words to find stories.', searchResults: 'Results for “{q}”: {n}',
    searchNone: 'No stories match “{q}”. Try a shorter or different word.', searchNoJs: 'Search needs JavaScript. Browse the categories instead.',
    searchFail: 'Search could not load. Try again later.', moreFrom: 'More from {site}', table: 'Table', videoTitle: 'Video: {t}', videoCaption: 'The full video on our channel.',
    pageNotFound: 'Page not found'
  },
  ar: {
    tagline: cfg.taglineAr, description: cfg.descriptionAr, skip: 'تخطَّ إلى المحتوى', categories: 'الأقسام', search: 'بحث', searchPlaceholder: 'ابحث عن خبر',
    searchSite: 'ابحث في {site}', closeSearch: 'إغلاق البحث', darkTheme: 'الوضع الداكن', langName: 'English', breakingNews: 'أخبار عاجلة', breaking: 'عاجل', live: 'مباشر',
    pause: 'إيقاف', play: 'تشغيل', trending: 'الأكثر رواجًا', seeAll: 'عرض الكل', minRead: '{n} د للقراءة', by: 'بقلم', newsroom: 'فريق تحرير {site}', share: 'مشاركة',
    copyLink: 'نسخ الرابط', linkCopied: 'تم نسخ الرابط', shareStory: 'مشاركة هذه القصة', related: 'قصص ذات صلة', newer: 'الأحدث', older: 'الأقدم', pageOf: 'صفحة {n} من {m}',
    pagination: 'التنقل بين الصفحات', advertisement: 'إعلان', correction: 'تصحيح', emptyTitle: 'لا توجد قصص هنا بعد',
    emptyText: 'تظهر القصص الجديدة هنا فور نشرها. عاود الزيارة قريبًا.', backHome: 'العودة إلى الرئيسية', notFoundTitle: 'تعذّر العثور على هذه الصفحة',
    notFoundText: 'قد يكون الرابط قديمًا أو مكتوبًا بشكل خاطئ. جرّب البحث أو عد إلى أحدث القصص.', latest: 'أحدث القصص', loading: 'جارٍ التحميل', company: 'المؤسسة',
    policies: 'السياسات', about: 'من نحن', contact: 'اتصل بنا', editorial: 'السياسة التحريرية والتصحيحات', privacy: 'سياسة الخصوصية',
    footerAds: 'الإعلانات مُعنونة ومفصولة عن المحتوى التحريري.', rights: 'جميع الحقوق محفوظة.', homeH1: '{site}: {tagline}', labelDesc: 'قصص موسومة بـ «{label}».',
    categoryMeta: '{desc} أحدث قصص {name} من {site}.', newsOf: 'أخبار {name}', pageN: '{x}، صفحة {n}', updated: 'آخر تحديث', lastUpdated: 'آخر تحديث',
    searchTitle: 'بحث', searchIdle: 'اكتب بضع كلمات للعثور على قصص.', searchResults: 'نتائج «{q}»: {n}',
    searchNone: 'لا توجد قصص مطابقة لـ «{q}». جرّب كلمة أقصر أو مختلفة.', searchNoJs: 'يحتاج البحث إلى JavaScript. تصفّح الأقسام بدلًا من ذلك.',
    searchFail: 'تعذّر تحميل البحث. حاول لاحقًا.', moreFrom: 'المزيد من {site}', table: 'جدول', videoTitle: 'فيديو: {t}', videoCaption: 'الفيديو الكامل على قناتنا.',
    pageNotFound: 'الصفحة غير موجودة'
  }
};
// tr = plain text, t = HTML-escaped text. {site} is always filled in.
const tr = (L, k, v = {}) => String(T[L][k]).replace(/\{(\w+)\}/g, (m, n) => n === 'site' ? cfg.siteName : n === 'tagline' ? T[L].tagline : (v[n] ?? m));
const t = (L, k, v) => esc(tr(L, k, v));

const CATS = [
  { slug: 'sports', cls: 'cat-sports', icon: 'i-sports', en: 'Sports', ar: 'الرياضة', alias: ['sport'],
    descEn: 'Football, cricket, live scores and tournaments.', descAr: 'كرة القدم والكريكيت والنتائج المباشرة والبطولات.' },
  { slug: 'entertainment', cls: 'cat-entertainment', icon: 'i-entertainment', en: 'Entertainment', ar: 'الترفيه', alias: [],
    descEn: 'Films, TV series, streaming and new releases.', descAr: 'الأفلام والمسلسلات والبث والإصدارات الجديدة.' },
  { slug: 'celebrity', cls: 'cat-celebrity', icon: 'i-celebrity', en: 'Celebrity', ar: 'المشاهير', alias: ['celebrities'],
    descEn: 'Stars, musicians, politicians and public figures.', descAr: 'النجوم والموسيقيون والسياسيون والشخصيات العامة.' },
  { slug: 'tech-ai', cls: 'cat-tech', icon: 'i-tech', en: 'Tech & AI', ar: 'التقنية والذكاء الاصطناعي', alias: ['tech', 'ai', 'technology', 'التقنية', 'الذكاء-الاصطناعي'],
    descEn: 'New phones, AI tools and gadgets.', descAr: 'الهواتف الجديدة وأدوات الذكاء الاصطناعي والأجهزة.' },
  { slug: 'economy-finance', cls: 'cat-economy', icon: 'i-economy', en: 'Economy & Finance', ar: 'الاقتصاد والمال', alias: ['economy', 'finance', 'business', 'الاقتصاد', 'المال'],
    descEn: 'Inflation, markets, gold, crypto, tariffs and exchange rates.', descAr: 'التضخم والأسواق والذهب والعملات الرقمية والرسوم الجمركية وأسعار الصرف.' }
];
const catMap = {};
CATS.forEach(c => [c.slug, c.en, c.ar, ...c.alias].forEach(a => { catMap[slugify(a)] = c; }));
const catOf = v => catMap[slugify(v || '')] || null;
const CONTROL = ['lead', 'trending', 'breaking', 'live']; // control labels: never shown, no label pages

// ---------- dates ----------
const MON = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  enL: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  ar: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
};
function when(str) {
  const m = String(str || '').match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2}))?/);
  if (!m || +m[2] < 1 || +m[2] > 12) return null;
  const date = `${m[1]}-${m[2]}-${m[3]}`, time = m[4] ? `${m[4].padStart(2, '0')}:${m[5]}` : '';
  const ms = Date.parse(`${date}T${time || '00:00'}:00${TZ}`), chk = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  if (isNaN(ms) || chk.getUTCMonth() !== +m[2] - 1 || chk.getUTCDate() !== +m[3]) return null;
  return { date, time, ms, key: `${date} ${time || '00:00'}`, attr: time ? `${date}T${time}` : date, iso: `${date}T${time || '00:00'}:00${TZ}`, y: +m[1], mo: +m[2] - 1, dd: +m[3] };
}
const fmt = (L, w, o = {}) => {
  let s = `${w.dd} ${(L === 'ar' ? MON.ar : o.long ? MON.enL : MON.en)[w.mo]}`;
  if (o.year !== false) s += ` ${w.y}`;
  if (o.time && w.time) s += (L === 'ar' ? '، ' : ', ') + w.time;
  return s;
};

// ---------- story parsing ----------
const ytId = x => { const m = String(x || '').match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([\w-]{11})/); return m ? m[1] : ''; };
const plain = x => x.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/\s+/g, ' ').trim();

// Splits a story body into typed blocks: h (## ###), q (> quote), ul, ol, table, p.
function blocksOf(body) {
  const out = [];
  body.split(/\n{2,}/).forEach(raw => {
    let lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
    const h = lines[0] && lines[0].match(/^(#{2,3}) (.+)/);
    if (h) { out.push({ k: 'h', n: h[1].length, text: h[2] }); lines = lines.slice(1); }
    if (!lines.length) return;
    const tl = /^table:/i.test(lines[0]) ? lines.slice(1) : lines;
    if (lines.every(l => l.startsWith('> '))) out.push({ k: 'q', text: lines.map(l => l.slice(2)).join(' ') });
    else if (lines.every(l => l.startsWith('- '))) out.push({ k: 'ul', items: lines.map(l => l.slice(2)) });
    else if (lines.every(l => /^\d+[.)] /.test(l))) out.push({ k: 'ol', items: lines.map(l => l.replace(/^\d+[.)] /, '')) });
    else if (tl.length >= 2 && tl.every(l => l.startsWith('|'))) out.push({ k: 'table', cap: tl === lines ? '' : lines[0].slice(6).trim(), rows: tl });
    else out.push({ k: 'p', text: lines.join('\n') });
  });
  return out;
}

function parse(file) {
  const raw = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  const i = raw.indexOf('\n---');
  const head = i < 0 ? '' : raw.slice(0, i), body = (i < 0 ? raw : raw.slice(i + 4)).trim();
  const m = {};
  head.split('\n').forEach(l => { const k = l.indexOf(':'); if (k > 0) m[l.slice(0, k).trim().toLowerCase()] = l.slice(k + 1).trim(); });
  const slug = slugify(m.slug || m.title || path.basename(file, '.txt'));
  const date = when(m.date) || when(fs.statSync(file).mtime.toISOString().slice(0, 10));
  if (!m.date) warn(`${file}: no date line. The file date changes on every fresh deploy, so add a date: line.`);
  if (m.date && !when(m.date)) warn(`${file}: unreadable date "${m.date}", using the file date.`);
  let lang = (m.lang || cfg.lang || 'en').toLowerCase().slice(0, 2);
  if (!LANGS.includes(lang)) { warn(`${file}: unknown lang "${m.lang}", using en.`); lang = 'en'; }
  const all = list(m.labels).map(l => l.toLowerCase());
  const labels = list(m.labels).filter(l => !CONTROL.includes(l.toLowerCase()) && slugify(l));
  const blocks = blocksOf(body), first = blocks.find(b => b.k === 'p');
  const desc = first ? plain(first.text) : '';
  const fo = (m.focus || '').match(/^(\d{1,3})\s+(\d{1,3})$/);
  const corr = m.correction ? m.correction.split('|').map(x => x.trim()) : null;
  const words = body.split(/\s+/).filter(Boolean).length;
  const video = ytId(m.video);
  if (m.video && !video) warn(`${file}: video line is not a YouTube URL, ignored.`);
  return {
    file, title: m.title || slug, slug, lang, cat: catOf(m.category), catRaw: m.category || '', labels,
    keywords: m.keywords || labels.join(', '), image: m.image || '', date, updated: when(m.updated),
    correction: corr ? (corr.length > 1 ? { date: corr[0], text: corr.slice(1).join(' | ') } : { date: '', text: corr[0] }) : null,
    video, short: /\/shorts\//.test(m.video || ''), fx: fo ? Math.min(100, +fo[1]) : null, fy: fo ? Math.min(100, +fo[2]) : null, credit: m.credit || '',
    flags: { lead: all.includes('lead'), trending: all.includes('trending'), breaking: all.includes('breaking'), live: all.includes('live') },
    body, blocks, desc: desc.length > 155 ? desc.slice(0, 154).replace(/\s+\S*$/, '') + '…' : desc,
    mins: Math.max(1, Math.ceil(words / (lang === 'ar' ? 180 : 225)))
  };
}

// ---------- load content ----------
function loadPages() {
  const P = { en: {}, ar: {} };
  const fill = (s, fn) => s.replace(/\{\{publisher\}\}/g, fn(cfg.publisher || cfg.siteName)).replace(/\{\{email\}\}/g, fn(cfg.email || ''));
  LANGS.forEach(L => {
    const dir = L === 'ar' ? path.join('pages', 'ar') : 'pages';
    if (!exists(dir)) return;
    fs.readdirSync(dir).filter(f => f.endsWith('.html') && f !== '404.html').sort().forEach(f => {
      const raw = fs.readFileSync(path.join(dir, f), 'utf8').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
      const i = raw.indexOf('\n---');
      const m = {};
      (i < 0 ? '' : raw.slice(0, i)).split('\n').forEach(l => { const k = l.indexOf(':'); if (k > 0) m[l.slice(0, k).trim().toLowerCase()] = fill(l.slice(k + 1).trim(), x => x); });
      const slug = f.replace(/\.html$/, '');
      P[L][slug] = { slug, lang: L, title: m.title || slug, desc: m.description || '', intro: m.intro || '', updated: when(m.updated), body: fill((i < 0 ? raw : raw.slice(i + 4)).trim(), esc) };
    });
  });
  return P;
}
const PAGES = loadPages();
const reserved = new Set(['c', 'label', 'search', 'ar', 'fonts', '404', ...Object.keys(PAGES.en), ...Object.keys(PAGES.ar)]);

const stories = [], seen = new Set();
(exists('stories') ? fs.readdirSync('stories').filter(f => f.endsWith('.txt')).sort() : []).forEach(f => {
  const s = parse(path.join('stories', f));
  if (!s.cat) return warn(`${s.file}: unknown category "${s.catRaw}". Story SKIPPED. Use one of: ${CATS.map(c => c.en).join(', ')}.`);
  if (!s.slug) return warn(`${s.file}: the title has no letters or digits, so the link would be empty. Add a slug: line. Story SKIPPED.`);
  if (reserved.has(s.slug)) return warn(`${s.file}: slug "${s.slug}" is reserved. Story SKIPPED.`);
  if (seen.has(s.lang + '/' + s.slug)) return warn(`${s.file}: duplicate slug "${s.slug}". Story SKIPPED.`);
  seen.add(s.lang + '/' + s.slug);
  stories.push(s);
});
stories.sort((a, b) => b.date.key.localeCompare(a.date.key));
const ed = { en: stories.filter(s => s.lang === 'en'), ar: stories.filter(s => s.lang === 'ar') };
const sUrl = s => u(s.lang, s.slug);

// ---------- ads ----------
const adHead = cfg.adsenseClient ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${esc(cfg.adsenseClient)}" crossorigin="anonymous"></script>` : '';
const ad = (kind, L) => {
  const slot = (cfg.adSlots && cfg.adSlots[kind]) || cfg.adSlot;
  if (!cfg.adsenseClient || !slot) return '';
  const side = kind === 'side';
  return `<div class="ad ad--${kind}"><span class="ad__label">${t(L, 'advertisement')}</span><ins class="adsbygoogle" style="display:block" data-ad-client="${esc(cfg.adsenseClient)}" data-ad-slot="${esc(slot)}" data-ad-format="${side ? 'rectangle' : 'auto'}" data-full-width-responsive="${side ? 'false' : 'true'}"></ins><script>(adsbygoogle=window.adsbygoogle||[]).push({});</script></div>`;
};

// ---------- sprites and scripts ----------
const SPRITE_LOGO = `<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs><symbol id="whq-wordmark" viewBox="0 10 330 65"><g fill="none" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" style="stroke:var(--whq-ink,#1C2131)"><path d="M5 15 19 65 33 15 47 65 61 15"/><path d="M77 31V65"/><path d="M94 65V31M94 44Q94 31 109 31"/><path d="M120 48H150C150 38.6 143.3 31 135 31 126.7 31 120 38.6 120 48 120 57.4 126.7 65 135 65 141.5 65 146.5 62.3 150 57"/><path d="M191 38C188 34 184.5 31 180 31 173.5 31 170 34.5 170 39 170 44 174.5 45.5 180 47.5 186 49.5 191.5 51 191.5 57 191.5 62 186.5 65 180 65 174 65 169.5 62.5 167 58"/></g><circle cx="77" cy="16" r="6" style="fill:var(--whq-ink,#1C2131)"/><g fill="none" stroke-width="13" stroke-linecap="round" stroke-linejoin="round" style="stroke:var(--whq-hq,#F0583F)"><path d="M215 16.5V63.5M249 16.5V63.5M215 40H249"/><path d="M294.5 16.5C307.5 16.5 318 27 318 40 318 53 307.5 63.5 294.5 63.5 281.5 63.5 271 53 271 40 271 27 281.5 16.5 294.5 16.5ZM311 56.5 322.5 68"/></g></symbol><symbol id="whq-mark" viewBox="0 0 64 64"><rect width="64" height="64" rx="15" style="fill:var(--whq-tile,#1C2131)"/><path d="M10 16 21 48 32 16 43 48 54 16" fill="none" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" style="stroke:var(--whq-glyph,#E6E8EE)"/><circle cx="54" cy="16" r="6" style="fill:var(--whq-node,#F0583F)"/></symbol></defs></svg>`;
const SPRITE_ICONS = `<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs><symbol id="i-sports" viewBox="0 0 24 24"><path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 5.5H4v1.5a3 3 0 0 0 3 3M17 5.5h3v1.5a3 3 0 0 1-3 3"/><path d="M12 14v4M8 20h8"/></symbol><symbol id="i-entertainment" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M10.5 9.5v5l4.5-2.5z"/></symbol><symbol id="i-celebrity" viewBox="0 0 24 24"><path d="M12 2.9 14.47 9.3 21.32 9.67 15.99 14 17.76 20.63 12 16.9 6.24 20.63 8.01 14 2.68 9.67 9.53 9.3z"/></symbol><symbol id="i-tech" viewBox="0 0 24 24"><rect x="7" y="7" width="10" height="10" rx="2"/><path d="M10 3.5V7M14 3.5V7M10 17v3.5M14 17v3.5M3.5 10H7M3.5 14H7M17 10h3.5M17 14h3.5"/><path d="M12 12h.01"/></symbol><symbol id="i-economy" viewBox="0 0 24 24"><path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/></symbol><symbol id="i-search" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M16 16l5 5"/></symbol><symbol id="i-menu" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"/></symbol><symbol id="i-share" viewBox="0 0 24 24"><path d="M12 15V4M8 8l4-4 4 4"/><path d="M5 12v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/></symbol><symbol id="i-clock" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></symbol><symbol id="i-sun" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/></symbol><symbol id="i-moon" viewBox="0 0 24 24"><path d="M20.5 13.5A8.5 8.5 0 1 1 10.5 3.5 7.2 7.2 0 0 0 20.5 13.5z"/></symbol><symbol id="i-globe" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.6 2.6 3.9 5.6 3.9 9s-1.3 6.4-3.9 9c-2.6-2.6-3.9-5.6-3.9-9S9.4 5.6 12 3z"/></symbol><symbol id="i-live" viewBox="0 0 24 24"><circle cx="12" cy="12" r="1.3"/><path d="M8.5 8.5a5 5 0 0 0 0 7M15.5 8.5a5 5 0 0 1 0 7"/><path d="M5.7 5.7a9 9 0 0 0 0 12.6M18.3 5.7a9 9 0 0 1 0 12.6"/></symbol><symbol id="i-close" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></symbol><symbol id="i-arrow" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></symbol><symbol id="i-alert" viewBox="0 0 24 24"><path d="M12 4 21 20H3z"/><path d="M12 10v4.2M12 17.2h.01"/></symbol></defs></svg>`;
const THEME_INIT = `<script>try{var t=localStorage.getItem('whq-theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}</script>`;
const BEHAVIOR = `<script>
(function(){var d=document,r=d.documentElement,s=d.getElementById('search');
var dark=function(){return r.dataset.theme?r.dataset.theme==='dark':matchMedia('(prefers-color-scheme:dark)').matches};
var sync=function(){d.querySelectorAll('[data-theme-toggle]').forEach(function(b){b.setAttribute('aria-pressed',dark())})};
sync();
if(navigator.share)d.querySelectorAll('[data-share]').forEach(function(b){b.hidden=false});
if(navigator.clipboard)d.querySelectorAll('[data-copy]').forEach(function(b){b.hidden=false});
d.addEventListener('click',function(e){
  var t=e.target.closest('[data-theme-toggle],[data-open-search],[data-close],[data-share],[data-copy]');
  if(!t){if(s&&e.target===s)s.close();return}
  if(t.hasAttribute('data-theme-toggle')){r.dataset.theme=dark()?'light':'dark';try{localStorage.setItem('whq-theme',r.dataset.theme)}catch(x){}sync()}
  else if(t.hasAttribute('data-open-search')){if(s&&s.showModal){e.preventDefault();s.showModal()}}
  else if(t.hasAttribute('data-close')){s.close()}
  else if(t.hasAttribute('data-share')){navigator.share({title:d.title,url:location.href}).catch(function(){})}
  else{navigator.clipboard.writeText(location.href).then(function(){var o=t.textContent,l=d.querySelector('.share [role=status]');t.textContent=t.dataset.done;if(l)l.textContent=t.dataset.done;setTimeout(function(){t.textContent=o;if(l)l.textContent=''},2000)})}
});
})();
</script>`;
const SEARCH_JS = String.raw`(function(){
var d=document,C=__CFG__,inp=d.getElementById('sq'),out=d.getElementById('results'),st=d.getElementById('search-status'),form=d.querySelector('.search-form'),idx=null,tm=0;
function n(s){return String(s).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f\u064b-\u065f\u0670\u0640]/g,'').replace(/[\u0623\u0625\u0622\u0671]/g,'\u0627').replace(/\u0649/g,'\u064a').replace(/\u0629/g,'\u0647')}
function e(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function skel(){return '<div class="card" role="status"><span class="sr-only">'+e(C.loading)+'</span><div class="skeleton skeleton--media" aria-hidden="true"></div><div class="card__body" aria-hidden="true"><div class="skeleton skeleton--line skeleton--short"></div><div class="skeleton skeleton--line skeleton--title"></div><div class="skeleton skeleton--line"></div><div class="skeleton skeleton--line skeleton--short"></div></div></div>'}
function row(r){return '<article class="item item--noimg '+e(r.k)+'"><div><h2 class="item__title"><a class="stretch" href="'+e(r.u)+'">'+e(r.t)+'</a></h2><div class="meta"><span class="meta__cat">'+e(r.c)+'</span><time datetime="'+e(r.d)+'">'+e(r.ds)+'</time></div></div></article>'}
function load(cb){fetch('/search-index.json').then(function(r){return r.json()}).then(function(a){a.forEach(function(r){r.n=n(r.s)});idx=a;cb()}).catch(function(){out.innerHTML='';st.textContent=C.fail})}
function run(){
  var q=inp.value.trim();
  if(!q){out.innerHTML='';st.textContent=C.idle;return}
  if(!idx){out.innerHTML=skel();st.textContent='';load(run);return}
  var w=n(q).split(/\s+/).filter(Boolean);
  var hits=idx.filter(function(r){return r.l===C.lang}).map(function(r){var t=n(r.t),sc=0;for(var i=0;i<w.length;i++){if(t.indexOf(w[i])>-1)sc+=3;else if(r.n.indexOf(w[i])>-1)sc+=1;else return null}return{r:r,sc:sc}}).filter(Boolean).sort(function(a,b){return b.sc-a.sc||(a.r.d<b.r.d?1:-1)}).slice(0,30);
  out.innerHTML=hits.map(function(h){return row(h.r)}).join('');
  st.textContent=hits.length?C.results.replace('{q}',function(){return q}).replace('{n}',hits.length):C.none.replace('{q}',function(){return q});
}
inp.value=new URLSearchParams(location.search).get('q')||'';
inp.addEventListener('input',function(){clearTimeout(tm);tm=setTimeout(run,150)});
form.addEventListener('submit',function(ev){ev.preventDefault();var q=inp.value.trim();history.replaceState(null,'',location.pathname+(q?'?q='+encodeURIComponent(q):''));run()});
run();
})();`;
const searchScript = L => '<script>' + SEARCH_JS.replace('__CFG__', () => JSON.stringify({ lang: L, loading: tr(L, 'loading'), idle: tr(L, 'searchIdle'), results: tr(L, 'searchResults'), none: tr(L, 'searchNone'), fail: tr(L, 'searchFail') }).replace(/</g, '\\u003c')) + '</script>';

// ---------- small template helpers ----------
const ic = (id, cls = '') => `<svg class="icon${cls ? ' ' + cls : ''}" aria-hidden="true"><use href="#${id}"/></svg>`;
const focusStyle = s => s.fx === null ? '' : ` style="--fx:${s.fx}%;--fy:${s.fy}%"`;
const badge = s => (s.flags.live || s.flags.breaking) && s.image
  ? `<span class="badge badge--live media-badge"><span class="live-dot" aria-hidden="true"></span>${t(s.lang, s.flags.live ? 'live' : 'breaking')}</span>` : '';
const timeTag = (s, o) => `<time datetime="${s.date.attr}">${fmt(s.lang, s.date, o)}</time>`;
const readTime = s => `<span class="meta__item">${ic('i-clock')}${t(s.lang, 'minRead', { n: s.mins })}</span>`;
const chip = s => `<span class="chip">${ic(s.cat.icon)}${esc(s.cat[s.lang])}</span>`;

const card = (s, o = {}) => `<article class="card ${s.cat.cls}${s.image ? '' : ' card--noimg'}">
${s.image ? `<div class="card__media"><img src="${esc(s.image)}" alt="" width="1280" height="720" loading="lazy" decoding="async"${focusStyle(s)}>${badge(s)}</div>` : ''}<div class="card__body">
<div class="meta">${chip(s)}</div>
<h${o.h || 3} class="card__title"><a class="stretch" href="${sUrl(s)}">${esc(s.title)}</a></h${o.h || 3}>
<p class="card__text">${esc(s.desc)}</p>
<div class="meta">${timeTag(s)}${readTime(s)}</div>
</div></article>`;

const empty = L => `<section class="empty">${ic('i-search')}<h2 class="t-h3">${t(L, 'emptyTitle')}</h2><p>${t(L, 'emptyText')}</p><a class="btn" href="${u(L)}">${t(L, 'backHome')}</a></section>`;

// grid(items, { L, h, adAt: [6, 18] }): cards, with an ad slot after the cards listed in adAt.
const grid = (items, o = {}) => items.length
  ? `<div class="grid${o.cls ? ' ' + o.cls : ''}">${items.map((s, i) => card(s, o) + ((o.adAt || []).includes(i + 1) ? ad('grid', o.L) : '')).join('\n')}</div>`
  : empty(o.L);

const lead = s => `<article class="lead ${s.cat.cls}">
${s.image ? `<div class="lead__media"><img src="${esc(s.image)}" alt="" width="1280" height="720" decoding="async" fetchpriority="high"${focusStyle(s)}>${badge(s)}</div>` : `<div class="lead__media fallback" aria-hidden="true">${ic(s.cat.icon)}</div>`}
<div class="lead__body">
<div class="meta">${chip(s)}${timeTag(s)}</div>
<h2 class="lead__title t-display"><a class="stretch" href="${sUrl(s)}">${esc(s.title)}</a></h2>
<p class="lead__text">${esc(s.desc)}</p>
<div class="meta">${readTime(s)}</div>
</div></article>`;

const item = (s, rank) => `<article class="item ${s.cat.cls}"><span class="item__rank" aria-hidden="true">${rank}</span><div><h3 class="item__title"><a class="stretch" href="${sUrl(s)}">${esc(s.title)}</a></h3><div class="meta"><span class="meta__cat">${esc(s.cat[s.lang])}</span>${timeTag(s, { year: false })}</div></div></article>`;

// Trending = stories labeled "trending" (newest first), then the newest others; up to 5.
const trendingFor = (L, exclude) => {
  const pool = ed[L].filter(s => s !== exclude);
  return pool.filter(s => s.flags.trending).concat(pool.filter(s => !s.flags.trending)).slice(0, 5);
};
const rail = (L, items) => items.length ? `<section class="trending" aria-labelledby="trending-h">
<h2 class="rail-head" id="trending-h"><span class="live-dot" aria-hidden="true"></span>${t(L, 'trending')}</h2>
<ol class="trending__list">${items.map((s, i) => `<li>${item(s, i + 1)}</li>`).join('\n')}</ol></section>` : '';
const aside = (L, items) => {
  const inner = rail(L, items) + ad('side', L);
  return inner ? `<aside class="aside" aria-label="${t(L, 'moreFrom')}">${inner}</aside>` : '';
};

// Related = most shared labels first, newest breaks ties; fills with same-category stories.
function related(s) {
  const pool = ed[s.lang], mine = new Set(s.labels.map(l => l.toLowerCase()));
  const scored = pool.filter(o => o !== s)
    .map(o => ({ o, n: o.labels.filter(l => mine.has(l.toLowerCase())).length })).filter(x => x.n > 0)
    .sort((a, b) => b.n - a.n || b.o.date.key.localeCompare(a.o.date.key)).map(x => x.o);
  const fill = pool.filter(o => o !== s && o.cat === s.cat && !scored.includes(o));
  return scored.concat(fill).slice(0, 4);
}

// ---------- article body ----------
const inline = x => esc(x).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\[([^\]]+)\]\(((?:https?:\/\/|\/)[^\s)]+)\)/g, '<a href="$2">$1</a>').replace(/\n/g, '<br>');
const numeric = x => /^[-+\u2212]?[$€£]?\d[\d,.]*%?$/.test(x);

function tableHtml(b, id, L) {
  const rows = b.rows.filter(l => !/^\|[\s:|-]+\|?$/.test(l)).map(l => l.replace(/^\||\|$/g, '').split('|').map(c => c.trim()));
  const head = rows[0], body = rows.slice(1);
  const num = head.map((_, c) => c > 0 && body.length > 0 && body.every(r => numeric(r[c] || '')));
  const label = b.cap ? `aria-labelledby="${id}"` : `aria-label="${t(L, 'table')}"`;
  return `<div class="table-wrap" role="region" ${label} tabindex="0"><table>${b.cap ? `<caption id="${id}">${inline(b.cap)}</caption>` : ''}<thead><tr>${head.map((c, i) => `<th scope="col"${num[i] ? ' class="num"' : ''}>${inline(c)}</th>`).join('')}</tr></thead><tbody>${body.map(r => `<tr>${head.map((_, i) => i === 0 ? `<th scope="row">${inline(r[i] || '')}</th>` : `<td${num[i] ? ' class="num"' : ''}>${inline(r[i] || '')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
const embed = s => `<figure class="embed${s.short ? ' embed--short' : ''}"><div class="embed__frame"><iframe src="https://www.youtube-nocookie.com/embed/${s.video}" title="${t(s.lang, 'videoTitle', { t: s.title })}" loading="lazy" allow="encrypted-media; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></div><figcaption class="caption">${t(s.lang, 'videoCaption')}</figcaption></figure>`;

// Video block goes after paragraph 1, the in-article ad after paragraph 2 (only if the story has 2+ paragraphs).
function render(s) {
  let p = 0, tid = 0, videoDone = !s.video;
  const out = s.blocks.map(b => {
    if (b.k === 'h') return `<h${b.n}>${esc(b.text)}</h${b.n}>`;
    if (b.k === 'q') {
      const i = b.text.lastIndexOf(' -- '), who = i > 0 ? b.text.slice(i + 4) : '';
      return `<blockquote class="pullquote"><p>${inline(i > 0 ? b.text.slice(0, i) : b.text)}</p>${esc(who)}</blockquote>`;
    }
    if (b.k === 'ul' || b.k === 'ol') return `<${b.k}>${b.items.map(x => `<li>${inline(x)}</li>`).join('')}</${b.k}>`;
    if (b.k === 'table') return tableHtml(b, 't' + (++tid), s.lang);
    p++;
    return `<p>${inline(b.text)}</p>` + (p === 1 && !videoDone ? (videoDone = true, embed(s)) : '') + (p === 2 ? ad('article', s.lang) : '');
  });
  if (!videoDone) out.push(embed(s));
  return out.join('\n');
}

// ---------- page frame ----------
const pageHref = (slug, L) => PAGES[L][slug] ? u(L, slug) : PAGES.en[slug] ? u('en', slug) : '';
const navLinks = (L, active) => CATS.map(c => `<a href="${u(L, 'c', c.slug)}"${c.slug === active ? ' aria-current="page"' : ''}>${esc(c[L])}</a>`).join('\n');
const logo = L => `<a class="logo" href="${u(L)}" aria-label="${esc(cfg.siteName)}"><svg class="logo-wordmark" viewBox="0 0 330 65" aria-hidden="true"><use href="#whq-wordmark"/></svg></a>`;

const tickerFor = L => {
  const items = ed[L].filter(s => (s.flags.live || s.flags.breaking) && s.date.ms <= NOW && s.date.ms >= NOW - 48 * 3600e3).slice(0, 6);
  if (!items.length) return '';
  const li = items.map(s => `<li><a href="${sUrl(s)}">${s.date.time ? `<time datetime="${s.date.attr}">${s.date.time}</time>` : ''}${esc(s.title)}</a></li>`).join('\n');
  return `<div class="ticker on-ink" role="region" aria-label="${t(L, 'breakingNews')}" style="--ticker-dur:${Math.max(40, items.length * 8)}s">
<div class="ticker__live"><span class="badge badge--live"><span class="live-dot" aria-hidden="true"></span>${t(L, 'live')}</span></div>
<div class="ticker__viewport"><div class="ticker__track">
<ul class="ticker__list">${li}</ul>
<ul class="ticker__list" aria-hidden="true" inert>${li}</ul>
</div></div>
<label class="ticker__pause"><input type="checkbox"><span class="p-off">${t(L, 'pause')}</span><span class="p-on">${t(L, 'play')}</span></label>
</div>`;
};

const footer = L => {
  const link = (slug, key) => { const h = pageHref(slug, L); return h ? `<li><a href="${h}">${t(L, key)}</a></li>` : ''; };
  return `<footer class="site-footer"><div class="container">
<div class="footer-grid">
<div class="footer-brand">${logo(L)}<p>${esc(T[L].tagline)}.</p></div>
<nav aria-labelledby="f-cat"><h2 class="footer-title" id="f-cat">${t(L, 'categories')}</h2><ul class="footer-list">${CATS.map(c => `<li><a href="${u(L, 'c', c.slug)}">${esc(c[L])}</a></li>`).join('')}</ul></nav>
<nav aria-labelledby="f-co"><h2 class="footer-title" id="f-co">${t(L, 'company')}</h2><ul class="footer-list">${link('about', 'about')}${link('contact', 'contact')}</ul></nav>
<nav aria-labelledby="f-pol"><h2 class="footer-title" id="f-pol">${t(L, 'policies')}</h2><ul class="footer-list">${link('editorial-policy', 'editorial')}${link('privacy', 'privacy')}</ul></nav>
</div>
<div class="footer-legal"><p>&copy; ${new Date().getFullYear()} ${esc(cfg.siteName)}. ${t(L, 'rights')}</p><p>${t(L, 'footerAds')}</p></div>
</div></footer>`;
};

const hasStatic = f => exists('static', f);
// Branded 1200x630 card for a category (static/og-<slug>.png), else static/og-default.png, else nothing.
const ogBranded = (L, catSlug) => {
  const f = catSlug && hasStatic(`og-${catSlug}.png`) ? `og-${catSlug}.png` : hasStatic('og-default.png') ? 'og-default.png' : '';
  return f ? { url: `${base}/${f}`, w: 1200, h: 630, alt: `${cfg.siteName}: ${T[L].tagline}` } : null;
};
const xHandle = (String((cfg.social || {}).x || '').match(/(?:x|twitter)\.com\/@?(\w+)/i) || [])[1];
const FONT_PRELOAD = { en: ['nunito-latin-wght.woff2'], ar: ['nunito-latin-wght.woff2', 'noto-sans-arabic-arabic-wght.woff2'] };

const page = ({ L, title, desc, url, body, keywords = '', og = null, ogType = 'website', robots = 'index,follow,max-image-preview:large', ld = [], ticker = false, active = '', alt = null, canonical = true, meta = '', extraScript = '' }) => {
  const switchTo = alt && alt[OTHER[L]] ? alt[OTHER[L]] : u(OTHER[L]);
  const hl = alt && alt.en && alt.ar && url === alt[L]
    ? `<link rel="alternate" hreflang="en" href="${base}${alt.en}"><link rel="alternate" hreflang="ar" href="${base}${alt.ar}"><link rel="alternate" hreflang="x-default" href="${base}${alt.en}">` : '';
  const art = meta || '';
  return `<!doctype html>
<html lang="${L}" dir="${DIR[L]}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}">${keywords ? `<meta name="keywords" content="${esc(keywords)}">` : ''}
<meta name="robots" content="${robots}">${canonical ? `<link rel="canonical" href="${base}${url}">` : ''}${hl}
<meta name="color-scheme" content="light dark"><meta name="theme-color" content="${esc(cfg.themeColor.light)}" media="(prefers-color-scheme: light)"><meta name="theme-color" content="${esc(cfg.themeColor.dark)}" media="(prefers-color-scheme: dark)">
<meta property="og:site_name" content="${esc(cfg.siteName)}"><meta property="og:type" content="${ogType}"><meta property="og:locale" content="${LOCALE[L]}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${base}${url}">${art}
${og ? `<meta property="og:image" content="${esc(og.url)}">${og.w ? `<meta property="og:image:width" content="${og.w}"><meta property="og:image:height" content="${og.h}">` : ''}<meta property="og:image:alt" content="${esc(og.alt)}">` : ''}
<meta name="twitter:card" content="summary_large_image">${xHandle ? `<meta name="twitter:site" content="@${xHandle}">` : ''}<meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(desc)}">${og ? `<meta name="twitter:image" content="${esc(og.url)}"><meta name="twitter:image:alt" content="${esc(og.alt)}">` : ''}
<link rel="icon" href="/favicon.ico" sizes="48x48"><link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="/apple-touch-icon.png"><link rel="manifest" href="/site.webmanifest">
${FONT_PRELOAD[L].map(f => `<link rel="preload" href="/fonts/${f}" as="font" type="font/woff2" crossorigin>`).join('')}
${THEME_INIT}<link rel="stylesheet" href="/style.css?v=${CSS_HASH}">${adHead}${ld.length ? `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': ld }).replace(/</g, '\\u003c')}</script>` : ''}</head>
<body>
${SPRITE_LOGO}
${SPRITE_ICONS}
<a class="skip" href="#main">${t(L, 'skip')}</a>
<header class="site-header"><div class="container site-header__bar">
${logo(L)}
<nav class="nav" aria-label="${t(L, 'categories')}">
${navLinks(L, active)}
</nav>
<div class="tools">
<a class="icon-btn" href="${u(L, 'search')}" data-open-search aria-label="${t(L, 'search')}">${ic('i-search')}</a>
<button class="icon-btn" type="button" data-theme-toggle aria-pressed="false" aria-label="${t(L, 'darkTheme')}">${ic('i-moon', 'ico-moon')}${ic('i-sun', 'ico-sun')}</button>
<a class="icon-btn lang" href="${switchTo}" hreflang="${OTHER[L]}" lang="${OTHER[L]}">${ic('i-globe')}<span class="lang__text">${t(L, 'langName')}</span></a>
</div></div></header>
<nav class="strip" aria-label="${t(L, 'categories')}"><div class="nav">
${navLinks(L, active)}
</div></nav>
<dialog class="search" id="search" aria-label="${t(L, 'searchSite')}">
<form class="search__panel" role="search" action="${u(L, 'search')}" method="get">
<label class="sr-only" for="q">${t(L, 'searchSite')}</label>
<input class="input" id="q" type="search" name="q" placeholder="${t(L, 'searchPlaceholder')}" autocomplete="off" enterkeyhint="search">
<button class="btn" type="submit">${t(L, 'search')}</button>
<button class="icon-btn" type="button" data-close aria-label="${t(L, 'closeSearch')}">${ic('i-close')}</button>
</form></dialog>
${ticker ? tickerFor(L) : ''}
<main id="main">
${body}
</main>
${footer(L)}
${BEHAVIOR}${extraScript}
</body></html>`;
};

const write = (p, html) => { const f = path.join(OUT, p, 'index.html'); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, html); };
const writeFile = (p, data) => { const f = path.join(OUT, p); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, data); };

// ---------- JSON-LD ----------
const ORG = {
  '@type': 'Organization', '@id': base + '/#org', name: cfg.siteName, url: base + '/',
  logo: { '@type': 'ImageObject', url: base + '/icon-512.png', width: 512, height: 512 },
  sameAs: Object.values(cfg.social || {}).filter(Boolean)
};
const WEBSITE = L => ({
  '@type': 'WebSite', '@id': base + '/#website', url: base + '/', name: cfg.siteName, inLanguage: L, publisher: { '@id': base + '/#org' },
  potentialAction: { '@type': 'SearchAction', target: { '@type': 'EntryPoint', urlTemplate: `${base}${L === 'ar' ? '/ar' : ''}/search/?q={search_term_string}` }, 'query-input': 'required name=search_term_string' }
});

// ---------- build ----------
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
const css = fs.readFileSync('style.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]+|[ \t]+$/gm, '').replace(/\n{2,}/g, '\n');
const CSS_HASH = crypto.createHash('md5').update(css).digest('hex').slice(0, 8);
fs.writeFileSync(path.join(OUT, 'style.css'), css);
if (exists('fonts')) copyDir('fonts', path.join(OUT, 'fonts'));
else warn('fonts/ folder not found. The site will use fallback fonts (see README, step 3).');
if (exists('static')) copyDir('static', OUT);
['favicon.ico', 'favicon.svg', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'og-default.png', ...CATS.map(c => `og-${c.slug}.png`), 'site.webmanifest', '_headers']
  .forEach(f => { if (!hasStatic(f)) warn(`static/${f} is missing.`); });

const indexable = {}; // urls for the sitemap: url -> lastmod
const labelMaps = { en: {}, ar: {} };
ed.en.concat(ed.ar).forEach(s => s.labels.forEach(l => (labelMaps[s.lang][slugify(l)] ||= { name: l, items: [] }).items.push(s)));

// Home (one per edition)
LANGS.forEach(L => {
  const S = ed[L], lead1 = S.find(s => s.flags.lead) || S[0];
  const sections = lead1 ? CATS.map(c => ({ c, items: S.filter(s => s.cat === c && s !== lead1).slice(0, 6) })).filter(x => x.items.length) : [];
  const body = `<div class="container">
<h1 class="sr-only">${t(L, 'homeH1')}</h1>
${lead1 ? `<div class="lead-row">\n${lead(lead1)}\n${rail(L, trendingFor(L, lead1))}\n</div>` : empty(L)}
${sections.map(({ c, items }) => `<section class="section ${c.cls}" aria-labelledby="sec-${c.slug}">
<div class="section-head"><h2 id="sec-${c.slug}">${ic(c.icon)}${esc(c[L])}</h2><a class="more" href="${u(L, 'c', c.slug)}">${t(L, 'seeAll')}<span class="sr-only"> ${esc(c[L])}</span>${ic('i-arrow', 'flip')}</a></div>
${grid(items, { L, cls: 'grid--3', adAt: items.length >= 6 && (c.slug === 'entertainment' || c.slug === 'tech-ai') ? [6] : [] })}
</section>`).join('\n')}
</div>`;
  write(L === 'ar' ? 'ar' : '', page({
    L, title: `${cfg.siteName} | ${T[L].tagline}`, desc: T[L].description, url: u(L), body, ticker: true, og: ogBranded(L, ''),
    robots: S.length ? undefined : 'noindex,follow', alt: { en: '/', ar: '/ar/' }, ld: [ORG, WEBSITE(L)]
  }));
  if (S.length) indexable[u(L)] = '';
});

// Story pages
stories.forEach(s => {
  const L = s.lang, c = s.cat, url = sUrl(s), full = base + url, su = encodeURIComponent(full);
  const image = s.image ? { url: abs(s.image), alt: s.title } : ogBranded(L, c.slug);
  const ld = [{
    '@type': 'NewsArticle', '@id': full + '#article', mainEntityOfPage: { '@type': 'WebPage', '@id': full }, headline: s.title.slice(0, 110), description: s.desc,
    datePublished: s.date.iso, dateModified: (s.updated || s.date).iso, inLanguage: L, articleSection: c.en, keywords: s.keywords || undefined,
    image: image ? [image.url] : undefined, author: { '@type': 'Organization', name: tr(L, 'newsroom'), url: base + (pageHref('editorial-policy', L) || '/') },
    publisher: { '@id': base + '/#org' }
  }, ORG];
  const editorial = pageHref('editorial-policy', L);
  const byName = esc(tr(L, 'newsroom'));
  const labels = s.labels.map(l => `<a class="label" href="${u(L, 'label', slugify(l))}">${esc(l)}</a>`).join('');
  const rel = related(s);
  const corr = s.correction ? `<div class="notice notice--warning" role="note">${ic('i-alert')}<p><strong>${t(L, 'correction')}${s.correction.date ? (L === 'ar' ? '، ' : ', ') + esc(s.correction.date) : ''}:</strong> ${inline(s.correction.text)}</p></div>` : '';
  const body = `<div class="container layout layout--aside">
<div class="story">
<article class="${c.cls}">
<header class="article-head">
<a class="chip" href="${u(L, 'c', c.slug)}">${ic(c.icon)}${esc(c[L])}</a>
<h1>${esc(s.title)}</h1>
<div class="meta meta--lg">
<span>${t(L, 'by')} ${editorial ? `<a href="${editorial}">${byName}</a>` : byName}</span>
<time datetime="${s.date.attr}">${fmt(L, s.date, { long: true })}</time>
${s.updated ? `<span class="meta__item">${ic('i-clock')}${t(L, 'updated')} <time datetime="${s.updated.attr}">${fmt(L, s.updated, { long: true, time: true })}</time></span>` : ''}
<span class="meta__item">${ic('i-clock')}${t(L, 'minRead', { n: s.mins })}</span>
</div>
<div class="row share" role="group" aria-label="${t(L, 'shareStory')}">
<span class="share__label">${ic('i-share')}${t(L, 'share')}</span>
<button class="btn btn--ghost btn--sm" type="button" data-share hidden>${t(L, 'share')}</button>
<a class="btn btn--ghost btn--sm" href="https://wa.me/?text=${su}" target="_blank" rel="noopener">WhatsApp</a>
<a class="btn btn--ghost btn--sm" href="https://www.facebook.com/sharer/sharer.php?u=${su}" target="_blank" rel="noopener">Facebook</a>
<a class="btn btn--ghost btn--sm" href="https://twitter.com/intent/tweet?url=${su}" target="_blank" rel="noopener">X</a>
<button class="btn btn--ghost btn--sm" type="button" data-copy data-done="${t(L, 'linkCopied')}" hidden>${t(L, 'copyLink')}</button>
<span class="sr-only" role="status"></span>
</div>
</header>
${s.image ? `<figure class="hero"><img src="${esc(s.image)}" alt="${esc(s.title)}" width="1280" height="720" decoding="async" fetchpriority="high"${focusStyle(s)}>${badge(s)}${s.credit ? `<figcaption class="caption">${esc(s.credit)}</figcaption>` : ''}</figure>` : ''}
${corr}
<div class="prose">
${render(s)}
</div>
${labels ? `<div class="labels">${labels}</div>` : ''}
</article>
${rel.length ? `<section class="related" aria-labelledby="rel-h"><div class="section-head"><h2 id="rel-h">${t(L, 'related')}</h2></div>${grid(rel, { L })}</section>` : ''}
</div>
${aside(L, trendingFor(L, s))}
</div>`;
  const art = `<meta property="article:published_time" content="${s.date.iso}"><meta property="article:modified_time" content="${(s.updated || s.date).iso}"><meta property="article:section" content="${esc(c.en)}">`;
  write(L === 'ar' ? `ar/${s.slug}` : s.slug, page({ L, title: `${s.title} | ${cfg.siteName}`, desc: s.desc, url, keywords: s.keywords, body, og: image, ogType: 'article', meta: art, ld, active: c.slug }));
  indexable[url] = (s.updated || s.date).date;
});

// Category + label listings (24 per page, /page/N/ for N >= 2)
const pageUrl = (b, n) => n === 1 ? b : `${b}page/${n}/`;
const pager = (L, n, total, b) => total < 2 ? '' : `<nav class="pager" aria-label="${t(L, 'pagination')}">${n > 1
  ? `<a class="btn btn--ghost" rel="prev" href="${pageUrl(b, n - 1)}">${ic('i-arrow', 'mirror')}${t(L, 'newer')}</a>`
  : `<span class="btn btn--ghost" aria-disabled="true">${ic('i-arrow', 'mirror')}${t(L, 'newer')}</span>`}<span class="pager__page">${t(L, 'pageOf', { n, m: total })}</span>${n < total
  ? `<a class="btn btn--ghost" rel="next" href="${pageUrl(b, n + 1)}">${t(L, 'older')}${ic('i-arrow', 'flip')}</a>`
  : `<span class="btn btn--ghost" aria-disabled="true">${t(L, 'older')}${ic('i-arrow', 'flip')}</span>`}</nav>`;

function listing({ L, kind, slug, headHtml, items, titleBase, desc, alt, active, robots, ogCat }) {
  const b = u(L, kind, slug), total = Math.max(1, Math.ceil(items.length / PER_PAGE)), side = aside(L, trendingFor(L));
  for (let n = 1; n <= total; n++) {
    const chunk = items.slice((n - 1) * PER_PAGE, n * PER_PAGE);
    const title = n === 1 ? titleBase : tr(L, 'pageN', { x: titleBase, n });
    const body = `<div class="container"><div class="layout layout--aside"><div>
${headHtml}
${grid(chunk, { L, h: 2, adAt: [6, 18] })}
${items.length ? pager(L, n, total, b) : ''}
</div>${side}</div></div>`;
    const url = pageUrl(b, n);
    write(dirOf(url), page({ L, title: `${title} | ${cfg.siteName}`, desc, url, body, ticker: true, active, robots, alt, og: ogBranded(L, ogCat) }));
    if (!robots) indexable[url] = '';
  }
}

LANGS.forEach(L => {
  CATS.forEach(c => {
    const items = ed[L].filter(s => s.cat === c);
    listing({
      L, kind: 'c', slug: c.slug, items, titleBase: tr(L, 'newsOf', { name: c[L] }), active: c.slug, ogCat: c.slug,
      desc: tr(L, 'categoryMeta', { desc: L === 'ar' ? c.descAr : c.descEn, name: c[L] }),
      alt: { en: u('en', 'c', c.slug), ar: u('ar', 'c', c.slug) }, robots: items.length ? undefined : 'noindex,follow',
      headHtml: `<div class="page-head ${c.cls}"><div class="section-head"><h1 class="t-h1">${ic(c.icon)}${esc(c[L])}</h1></div><p>${esc(L === 'ar' ? c.descAr : c.descEn)}</p></div>`
    });
  });
  Object.entries(labelMaps[L]).forEach(([k, v]) => {
    const thin = v.items.length < 3;
    listing({
      L, kind: 'label', slug: k, items: v.items, titleBase: v.name, desc: tr(L, 'labelDesc', { label: v.name }), robots: thin ? 'noindex,follow' : undefined,
      headHtml: `<div class="page-head"><div class="section-head"><h1 class="t-h1"><span aria-hidden="true">#</span><bdi>${esc(v.name)}</bdi></h1></div><p>${t(L, 'labelDesc', { label: v.name })}</p></div>`
    });
  });
});

// Static pages (pages/*.html and pages/ar/*.html)
LANGS.forEach(L => Object.values(PAGES[L]).forEach(p => {
  const url = u(L, p.slug), alt = {};
  LANGS.forEach(x => { if (PAGES[x][p.slug]) alt[x] = u(x, p.slug); });
  const body = `<div class="container"><div class="page-narrow">
<header class="page-head"><h1>${esc(p.title)}</h1>${p.intro ? `<p>${esc(p.intro)}</p>` : ''}${p.updated ? `<div class="meta"><span>${t(L, 'lastUpdated')} <time datetime="${p.updated.attr}">${fmt(L, p.updated, { long: true })}</time></span></div>` : ''}</header>
<div class="prose">
${p.body}
</div></div></div>`;
  write(dirOf(url), page({ L, title: `${p.title} | ${cfg.siteName}`, desc: p.desc || T[L].description, url, body, alt, og: ogBranded(L, ''), ld: p.slug === 'about' ? [ORG] : [] }));
  indexable[url] = p.updated ? p.updated.date : '';
}));

// Search pages + index
LANGS.forEach(L => {
  const url = u(L, 'search');
  const body = `<div class="container"><div class="page-narrow">
<header class="page-head"><h1>${t(L, 'searchTitle')}</h1></header>
<form class="search-form" role="search" action="${url}" method="get">
<label class="sr-only" for="sq">${t(L, 'searchSite')}</label>
<input class="input" id="sq" type="search" name="q" placeholder="${t(L, 'searchPlaceholder')}" autocomplete="off" enterkeyhint="search">
<button class="btn" type="submit">${t(L, 'search')}</button>
</form>
<p class="search-status" id="search-status" role="status"></p>
<div class="results" id="results"></div>
<noscript><div class="notice notice--warning" role="note">${ic('i-alert')}<p>${t(L, 'searchNoJs')}</p></div></noscript>
</div></div>`;
  write(dirOf(url), page({
    L, title: `${tr(L, 'searchTitle')} | ${cfg.siteName}`, desc: tr(L, 'searchTitle') + ' ' + cfg.siteName + '.', url, body, robots: 'noindex,follow',
    alt: { en: u('en', 'search'), ar: u('ar', 'search') }, extraScript: searchScript(L)
  }));
});
writeFile('search-index.json', JSON.stringify(stories.map(s => ({
  t: s.title, u: sUrl(s), c: s.cat[s.lang], k: s.cat.cls, d: s.date.attr, ds: fmt(s.lang, s.date, { year: false }), l: s.lang,
  s: [s.keywords, s.labels.join(' '), s.desc, s.cat.en, s.cat.ar].join(' ').toLowerCase()
}))));

// 404 pages (the nearest 404.html is served, so /ar/... gets the Arabic one)
LANGS.forEach(L => writeFile(L === 'ar' ? 'ar/404.html' : '404.html', page({
  L, title: `${tr(L, 'pageNotFound')} | ${cfg.siteName}`, desc: tr(L, 'notFoundTitle') + '.', url: u(L), canonical: false, robots: 'noindex',
  body: `<div class="container"><section class="notfound"><p class="notfound__code" dir="ltr" aria-hidden="true">404</p><h1 class="t-h2">${t(L, 'notFoundTitle')}</h1><p>${t(L, 'notFoundText')}</p><div class="row"><a class="btn" href="${u(L)}">${t(L, 'latest')}</a><a class="btn btn--ghost" href="${u(L, 'search')}" data-open-search>${t(L, 'search')}</a></div></section></div>`
})));

// SEO + ads files
writeFile('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${Object.entries(indexable).map(([k, v]) => `<url><loc>${esc(base + k)}</loc>${v ? `<lastmod>${v}</lastmod>` : ''}</url>`).join('')}</urlset>`);
writeFile('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${base}/sitemap.xml\n`);
if (cfg.adsenseClient) writeFile('ads.txt', `google.com, ${cfg.adsenseClient.replace('ca-', '')}, DIRECT, f08c47fec0942fa0\n`);
const labelCount = Object.keys(labelMaps.en).length + Object.keys(labelMaps.ar).length;
console.log(`Built ${stories.length} stories (${ed.en.length} en, ${ed.ar.length} ar), ${CATS.length * 2} category pages, ${labelCount} labels, ${Object.keys(indexable).length} sitemap URLs -> ${OUT}/`);
