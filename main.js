// Bunte Ecke · shop demo. No backend: reservations end in a confirmation and an optional WhatsApp hand-off.
const CONFIG = {
  name: 'Bunte Ecke',
  phone: '+4327583319',
  whatsapp: '436767582070',
  // opening hours per weekday (0 = Sunday)
  hours: { 0: [], 1: [[8, 12], [15, 18]], 2: [[8, 12], [15, 18]], 3: [[8, 12], [15, 18]], 4: [[8, 12], [15, 18]], 5: [[8, 12], [15, 18]], 6: [[8, 12]] },
};

const REC = /[?&]rec\b/.test(location.search);
if (REC) document.documentElement.classList.add('rec');
const now = () => (REC ? new Date(2026, 9, 22, 10, 30) : new Date());

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const eur = n => '€ ' + n.toFixed(2).replace('.', ',');
const P = window.PRODUCTS;
const byId = id => P.find(p => p.id === +id);
const WD = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const WD_LONG = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

/* ---------- opening hours ---------- */
(function hours() {
  const d = now(), h = d.getHours() + d.getMinutes() / 60, today = CONFIG.hours[d.getDay()];
  const row = $(`#hours tr[data-d="${d.getDay()}"]`);
  if (row) row.classList.add('today');
  const open = today.some(([a, b]) => h >= a && h < b);
  const nextSpan = today.find(([a]) => h < a);
  $('#tb-open').textContent = open ? `Jetzt geöffnet · bis ${today.find(([a, b]) => h >= a && h < b)[1]} Uhr`
    : nextSpan ? `Öffnet heute um ${nextSpan[0]} Uhr` : 'Mo–Fr 8–12 & 15–18 Uhr · Sa 8–12 Uhr';
})();

/* ---------- folder spines ---------- */
const SPINES = [
  { t: 'Schultaschen', c: 'var(--blue)', img: 'img/p/schultaschenset-kolibri-kaja-space-neon.webp', p: '28 Sets online', go: { cat: 'Schultaschen & Rucksäcke' } },
  { t: 'Schulbedarf', c: 'var(--orange)', img: 'img/shop/zettel.webp', p: 'Hefte, Stifte, Mappen', go: { cat: 'Schulbedarf' } },
  { t: 'Bücher', c: 'var(--green)', img: 'img/shop/buch.webp', p: 'Kinderbuch bis Kochbuch', go: { cat: 'Bücher' } },
  { t: 'Büro & Papier', c: 'var(--cyan)', img: 'img/shop/buero.webp', p: 'Ordner, Papier, Büroartikel', go: { more: 'buero' } },
  { t: 'Spiele', c: 'var(--red)', img: 'img/shop/spiele.webp', p: 'Brett- und Kartenspiele', go: { more: 'spiele' } },
  { t: 'Basteln & Nähen', c: 'var(--sun)', img: 'img/shop/basteln.webp', p: 'Farben, Wolle, Zubehör', go: { more: 'basteln' }, dark: true },
  { t: 'Taufe & Kommunion', c: 'var(--pink)', img: 'img/shop/kommunion.webp', p: 'Kerzen, Karten, Geschenke', go: { more: 'taufe' } },
  { t: 'Druckerpatronen', c: 'var(--ink)', img: 'img/shop/patronen.webp', p: 'HP, Canon, Epson, Brother', go: { more: 'patronen' } },
  { t: 'Babymode', c: 'var(--lime)', img: 'img/shop/baby.webp', p: 'Kindertextilien', go: { more: 'baby' }, dark: true },
  { t: 'Stempel', c: '#7a4e9c', img: 'img/shop/stempel.webp', p: 'Firmen- und Datumsstempel', go: { more: 'stempel' } },
];
const spinesEl = $('#spines');
spinesEl.innerHTML = SPINES.map((s, i) => `
  <button class="spine${i === 0 ? ' is-open' : ''}${s.dark ? ' dark-t' : ''}" style="--c:${s.c}" data-i="${i}" aria-label="${s.t}">
    <span class="label"><span>${s.t}</span></span><span class="ring"></span>
    <span class="open"><h3>${s.t}</h3><p>${s.p}</p><img src="${s.img}" alt="" loading="eager"><span class="go">${s.go.cat ? 'Im Shop ansehen' : 'Mehr dazu'}</span></span>
  </button>`).join('');
$$('.spine').forEach(b => {
  b.addEventListener('mouseenter', () => { $$('.spine').forEach(x => x.classList.toggle('is-open', x === b)); });
  b.addEventListener('click', () => {
    const s = SPINES[b.dataset.i];
    if (s.go.cat) { setCat(s.go.cat); scrollToEl('#shop'); }
    else { scrollToEl('#more-grid'); const t = $(`.tile[data-k="${s.go.more}"]`); if (t) { t.animate([{ boxShadow: '0 0 0 0 rgba(234,96,31,.0)' }, { boxShadow: '0 0 0 6px rgba(234,96,31,.55)' }, { boxShadow: '0 0 0 0 rgba(234,96,31,0)' }], { duration: 1400, delay: 500 }); } }
  });
});

/* ---------- shop grid ---------- */
const state = { cat: 'Alle', motiv: 'Alle', q: '', sort: 'pop', all: false };
// products photographed on black go further down in the default order
const DARK_PHOTO = [463, 427];
const CATS = ['Alle', 'Schultaschen & Rucksäcke', 'Schulbedarf', 'Bücher'];
const CAT_LABEL = { 'Alle': 'Alles', 'Schultaschen & Rucksäcke': 'Schultaschen-Sets', 'Schulbedarf': 'Schulbedarf', 'Bücher': 'Bücher' };
const MOTIVE = ['Alle', 'Tiere', 'Fahrzeuge', 'Phantasy', 'Leuchtend'];
const motivOf = p => {
  const m = [];
  if (/Tiere/.test(p.motiv) || /Horse|Pferd|Dog|Dino|Manta|Shark|Dolphin|Kolibri|Einhorn|Kitty|Triceratops/.test(p.name)) m.push('Tiere');
  if (/Fahrzeuge/.test(p.motiv) || /Car|Truck|Tractor|Bagger/.test(p.name)) m.push('Fahrzeuge');
  if (/Phantasy/.test(p.motiv) || /Ninja|Dragon|Star|Einhorn/.test(p.name)) m.push('Phantasy');
  if (/NEON|Flash|SHINE/i.test(p.name + ' ' + p.serie)) m.push('Leuchtend');
  return m;
};
P.forEach(p => { p.m = motivOf(p); });

function chips() {
  $('#chips-cat').innerHTML = CATS.map(c => `<button class="chip${state.cat === c ? ' on' : ''}" data-cat="${c}" role="tab">${CAT_LABEL[c]} <span class="n">${c === 'Alle' ? P.length : P.filter(p => p.cat === c).length}</span></button>`).join('');
  $('#chips-motiv').innerHTML = MOTIVE.map(m => `<button class="chip${state.motiv === m ? ' on' : ''}" data-motiv="${m}">${m === 'Alle' ? 'Alle Motive' : m}</button>`).join('');
}
function setCat(c) { state.cat = c; chips(); render(); }
$('#chips-cat').addEventListener('click', e => { const b = e.target.closest('[data-cat]'); if (b) setCat(b.dataset.cat); });
$('#chips-motiv').addEventListener('click', e => { const b = e.target.closest('[data-motiv]'); if (b) { state.motiv = b.dataset.motiv; chips(); render(); } });
$('#sort').addEventListener('change', e => { state.sort = e.target.value; render(); });
$('#q').addEventListener('input', e => { state.q = e.target.value.trim().toLowerCase(); render(); if (state.q && !REC) scrollToEl('#shop'); });

const plus = '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>';
const check = '<svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';
function list() {
  let r = P.filter(p => (state.cat === 'Alle' || p.cat === state.cat) && (state.motiv === 'Alle' || p.m.includes(state.motiv)));
  if (state.q) r = r.filter(p => (p.name + ' ' + p.serie + ' ' + p.motiv + ' ' + p.farbe + ' ' + p.cat).toLowerCase().includes(state.q));
  if (state.sort === 'pop') r = [...r].sort((a, b) => DARK_PHOTO.includes(a.id) - DARK_PHOTO.includes(b.id));
  if (state.sort === 'asc') r = [...r].sort((a, b) => a.price - b.price);
  if (state.sort === 'desc') r = [...r].sort((a, b) => b.price - a.price);
  if (state.sort === 'az') r = [...r].sort((a, b) => a.name.localeCompare(b.name, 'de'));
  return r;
}
function cleanName(n) { return n.replace(/^Schultaschenset\s+|^Cloud Schultaschenset\s+/i, m => (/Cloud/i.test(m) ? 'Cloud ' : '')); }
const FIRST = 12;
function render() {
  const full = list();
  const r = state.all || full.length <= FIRST + 2 ? full : full.slice(0, FIRST);
  $('#more-wrap').hidden = r.length === full.length;
  $('#show-n').textContent = full.length;
  $('#grid').innerHTML = r.map((p, i) => `
    <li class="card" style="animation-delay:${Math.min(i, 11) * 35}ms" data-id="${p.id}">
      <button class="ph" data-view="${p.id}" aria-label="${p.name} ansehen"><img src="${p.img}" alt="${p.name}" loading="eager"></button>
      ${p.serie ? `<span class="serie${/NEON|FLASH|SHINE/i.test(p.serie + p.name) ? ' neon' : ''}">${p.serie.replace(/ Schleich| Spiegelburg/i, '')}</span>` : ''}
      <h3>${p.name}</h3>
      <p class="meta">${[p.teile ? p.teile + '-teilig' : '', p.farbe].filter(Boolean).join(' · ') || CAT_LABEL[p.cat] || p.cat}</p>
      <div class="buy"><span class="price-tag">${eur(p.price).replace(',', ',')}</span><button class="add" data-add="${p.id}" aria-label="${p.name} in den Korb">${plus}</button></div>
    </li>`).join('');
  $('#result-count').textContent = `${full.length} Artikel${state.cat !== 'Alle' ? ' in ' + CAT_LABEL[state.cat] : ''}${state.motiv !== 'Alle' ? ' · ' + state.motiv : ''}`;
  $('#empty').hidden = full.length > 0;
}
$('#show-all').addEventListener('click', () => { state.all = true; render(); });
chips(); render();

document.addEventListener('click', e => {
  const v = e.target.closest('[data-view]'); if (v) openPV(v.dataset.view);
  const a = e.target.closest('[data-add]'); if (a) { addToCart(a.dataset.add, a); }
});

/* ---------- quick view ---------- */
const pv = $('#pv');
let pvId = null;
function openPV(id) {
  const p = byId(id); pvId = p.id;
  $('#pv-img').src = p.img; $('#pv-img').alt = p.name;
  $('#pv-serie').textContent = [p.serie && 'Serie ' + p.serie, p.teile && p.teile + '-teiliges Set'].filter(Boolean).join(' · ') || CAT_LABEL[p.cat];
  $('#pv-name').textContent = p.name;
  $('#pv-price').textContent = eur(p.price);
  const feats = [...p.ausstattung.slice(0, 5), ...p.ergonomie.slice(0, 2)];
  $('#pv-feat').innerHTML = (feats.length ? feats : (p.farbe ? ['Farbe: ' + p.farbe] : [])).map(f => `<li>${f}</li>`).join('');
  pv.classList.add('open'); pv.setAttribute('aria-hidden', 'false');
}
function closePV() { pv.classList.remove('open'); pv.setAttribute('aria-hidden', 'true'); }
pv.addEventListener('click', e => { if (e.target.closest('[data-close]')) closePV(); });
$('#pv-add').addEventListener('click', e => { addToCart(pvId, $('#pv-img')); setTimeout(closePV, REC ? 0 : 350); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') { closePV(); closeDrawer(); } });

/* ---------- cart ---------- */
let cart = [];
try { if (!REC) cart = JSON.parse(localStorage.getItem('be-cart') || '[]'); } catch (e) { cart = []; }
const save = () => { try { if (!REC) localStorage.setItem('be-cart', JSON.stringify(cart)); } catch (e) {} };
const count = () => cart.reduce((s, c) => s + c.q, 0);
const total = () => cart.reduce((s, c) => s + byId(c.id).price * c.q, 0);

function addToCart(id, fromEl) {
  id = +id;
  const c = cart.find(x => x.id === id);
  if (c) c.q++; else cart.push({ id, q: 1 });
  save(); updateCart(true);
  flyToCart(id, fromEl);
  const btn = fromEl && fromEl.classList && fromEl.classList.contains('add') ? fromEl : null;
  if (btn) { btn.classList.add('ok'); btn.innerHTML = check; if (!REC) setTimeout(() => { btn.classList.remove('ok'); btn.innerHTML = plus; }, 1400); }
  toast(`${byId(id).name} liegt im Korb`);
}
function flyToCart(id, fromEl) {
  const src = fromEl && (fromEl.closest('.card') ? fromEl.closest('.card').querySelector('.ph img') : fromEl);
  if (!src || !src.getBoundingClientRect) return;
  const a = src.getBoundingClientRect();
  const target = getComputedStyle($('.mbar')).display !== 'none' ? $('#mbar-cart') : $('#cart-open');
  const b = target.getBoundingClientRect();
  const img = document.createElement('img');
  img.src = byId(id).img;
  const size = Math.min(a.width, 180);
  Object.assign(img.style, { position: 'fixed', left: a.left + a.width / 2 - size / 2 + 'px', top: a.top + a.height / 2 - size / 2 + 'px', width: size + 'px', height: size + 'px', objectFit: 'contain', zIndex: 99, pointerEvents: 'none', borderRadius: '12px' });
  document.body.appendChild(img);
  const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
  img.animate([
    { transform: 'translate(0,0) scale(1)', opacity: 1 },
    { transform: `translate(${dx * 0.55}px, ${dy * 0.55 - 80}px) scale(.55)`, opacity: 1, offset: 0.55 },
    { transform: `translate(${dx}px, ${dy}px) scale(.12)`, opacity: 0 },
  ], { duration: 750, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' });
  if (!REC) setTimeout(() => img.remove(), 800);
}
function updateCart(bump) {
  const n = count();
  $('#cart-count').textContent = n; $('#mbar-count').textContent = n;
  if (bump) { const b = $('#cart-open'); b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); }
  $('#cart-list').innerHTML = cart.map(c => { const p = byId(c.id); return `
    <li class="ci"><img src="${p.img}" alt=""><div><h4>${p.name}</h4>
    <span class="qty"><button data-q="-1" data-id="${p.id}" aria-label="weniger">−</button><span>${c.q}</span><button data-q="1" data-id="${p.id}" aria-label="mehr">+</button></span></div>
    <span class="p">${eur(p.price * c.q)}</span></li>`; }).join('');
  $('#cart-empty').hidden = cart.length > 0;
  $('#cart-sum').textContent = eur(total());
  $('#c-sum').textContent = eur(total());
  $('#c-items').textContent = `${n} Artikel · Abholung`;
  $('#to-step1').disabled = !cart.length; $('#to-step1').style.opacity = cart.length ? 1 : .45;
}
$('#cart-list').addEventListener('click', e => {
  const b = e.target.closest('[data-q]'); if (!b) return;
  const c = cart.find(x => x.id === +b.dataset.id); c.q += +b.dataset.q;
  cart = cart.filter(x => x.q > 0); save(); updateCart();
});
updateCart();

/* ---------- drawer + click & collect ---------- */
const drawer = $('#drawer');
function openDrawer() { goStep(0); drawer.classList.add('open'); drawer.setAttribute('aria-hidden', 'false'); }
function closeDrawer() {
  const wasDone = $('.dr-step[data-step="2"]').classList.contains('on');
  drawer.classList.remove('open'); drawer.setAttribute('aria-hidden', 'true');
  if (wasDone) { cart = []; save(); updateCart(); }
}
$('#cart-open').addEventListener('click', openDrawer);
$('#mbar-cart').addEventListener('click', openDrawer);
drawer.addEventListener('click', e => { if (e.target.closest('[data-dclose]')) closeDrawer(); });
function goStep(i) {
  $$('.dr-step').forEach(s => s.classList.toggle('on', +s.dataset.step === i));
  $$('#steps span').forEach((s, k) => s.classList.toggle('on', k <= i));
}
$('#to-step1').addEventListener('click', () => { if (cart.length) goStep(1); });
$('#back0').addEventListener('click', () => goStep(0));

// next five opening days (from tomorrow), Saturday only mornings
const pick = { day: null, slot: 'vormittags' };
(function days() {
  const out = []; const d = now(); d.setHours(12, 0, 0, 0);
  while (out.length < 5) { d.setDate(d.getDate() + 1); if (CONFIG.hours[d.getDay()].length) out.push(new Date(d)); }
  $('#days').innerHTML = out.map((x, i) => `<button data-i="${i}" class="${i === 0 ? 'on' : ''}"><small>${WD[x.getDay()]}</small><b>${x.getDate()}.</b><small>${x.toLocaleString('de-AT', { month: 'short' })}</small></button>`).join('');
  pick.day = out[0]; pick.days = out;
  // same days for the school list form
  $('#l-day').innerHTML = out.map((x, i) => `<option value="${i}">${WD_LONG[x.getDay()]}, ${x.getDate()}.${x.getMonth() + 1}.</option>`).join('');
})();
$('#days').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  $$('#days button').forEach(x => x.classList.toggle('on', x === b));
  pick.day = pick.days[+b.dataset.i];
  const sat = pick.day.getDay() === 6, pm = $('#slots [data-s="nachmittags"]');
  pm.disabled = sat; pm.style.opacity = sat ? .4 : 1;
  if (sat) { pick.slot = 'vormittags'; $$('#slots button').forEach(x => x.classList.toggle('on', x.dataset.s === 'vormittags')); }
});
$('#slots').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || b.disabled) return;
  pick.slot = b.dataset.s; $$('#slots button').forEach(x => x.classList.toggle('on', x === b));
});
function validate(nameEl, telEl, msgEl, show) {
  const name = nameEl.value.trim(), tel = telEl.value.replace(/\D/g, '');
  let m = '';
  if (name.length < 2) m = 'Bitte gib deinen Namen an.';
  else if (tel.length < 6) m = 'Bitte gib eine Telefonnummer an, damit wir dich erreichen.';
  if (show) msgEl.textContent = m;
  return !m;
}
window.__bkValidate = () => { $('#c-msg').textContent = ''; $('#l-msg').textContent = ''; };
$('#to-step2').addEventListener('click', () => {
  if (!validate($('#c-name'), $('#c-tel'), $('#c-msg'), true)) return;
  const no = 'BE-' + (REC ? '2417' : String(1000 + Math.floor(Math.random() * 9000)));
  const when = `${WD_LONG[pick.day.getDay()]}, ${pick.day.getDate()}.${pick.day.getMonth() + 1}., ${pick.slot}`;
  $('#d-no').textContent = no;
  $('#d-who').textContent = $('#c-name').value.trim();
  $('#d-when').textContent = 'Abholung ' + when;
  $('#d-sum').textContent = `${count()} Artikel · ${eur(total())}`;
  const lines = cart.map(c => `${c.q}× ${byId(c.id).name} (${eur(byId(c.id).price)})`).join('\n');
  const text = `Reservierung ${no}\n${lines}\nSumme ${eur(total())}\nAbholung: ${when}\nName: ${$('#c-name').value.trim()}\nTel: ${$('#c-tel').value.trim()}`;
  $('#d-wa').href = `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(text)}`;
  goStep(2);
});

/* ---------- school list ---------- */
const drop = $('#drop'), file = $('#list-file');
const showFile = f => { if (!f) return; $('#drop-name').textContent = f.name; drop.classList.add('has'); };
file.addEventListener('change', () => showFile(file.files[0]));
['dragenter', 'dragover'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.add('over'); }));
['dragleave', 'drop'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.remove('over'); }));
drop.addEventListener('drop', e => { const f = e.dataTransfer.files[0]; if (f) { showFile(f); } });
window.__fakeFile = n => showFile({ name: n }); // recording only
$('#list-form').addEventListener('submit', e => {
  e.preventDefault();
  const msg = $('#l-msg'); msg.classList.remove('ok');
  if (!drop.classList.contains('has')) { msg.textContent = 'Bitte wähle ein Foto der Schulliste aus.'; return; }
  if (!validate($('#l-name'), $('#l-tel'), msg, true)) return;
  const day = pick.days[+$('#l-day').value];
  const text = `Schulliste für ${$('#l-class').value.trim() || 'mein Kind'}\nAbholung ab ${WD_LONG[day.getDay()]}, ${day.getDate()}.${day.getMonth() + 1}.\nName: ${$('#l-name').value.trim()}\nTel: ${$('#l-tel').value.trim()}\n(Foto der Liste schicke ich gleich hier mit)`;
  msg.classList.add('ok');
  msg.innerHTML = `Danke! Wir richten alles her und melden uns. <a href="https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(text)}" target="_blank" rel="noopener">Foto jetzt per WhatsApp schicken</a>`;
  const paper = $('.list-paper'); paper.classList.add('go'); setTimeout(() => paper.classList.add('done'), REC ? 0 : 900);
  if (REC) paper.classList.add('done');
});

/* ---------- more assortments (ask in store) ---------- */
const MORE = [
  { k: 'patronen', t: 'Druckerpatronen', p: 'Original und kompatibel für HP, Canon, Epson, Brother', img: 'img/shop/patronen.webp', c: 'var(--ink)' },
  { k: 'stempel', t: 'Stempel', p: 'Trodat-Stempel mit Ihrem Text, auf Bestellung', img: 'img/shop/stempel.webp', c: '#7a4e9c' },
  { k: 'buero', t: 'Büro & Papier', p: 'Ordner, Register, Kopierpapier', img: 'img/shop/buero.webp', c: 'var(--cyan)' },
  { k: 'spiele', t: 'Spiele', p: 'Klassiker und Neuheiten für die ganze Familie', img: 'img/shop/spiele.webp', c: 'var(--red)' },
  { k: 'taufe', t: 'Taufe, Kommunion, Firmung', p: 'Kerzen, Alben, Karten und Geschenke', img: 'img/shop/taufe.webp', c: 'var(--pink)' },
  { k: 'baby', t: 'Babymode', p: 'Kindertextilien in der Bunten Ecke', img: 'img/shop/baby.webp', c: 'var(--lime)' },
  { k: 'basteln', t: 'Basteln & Nähen', p: 'Acrylfarben, Handarbeit, Nähzubehör', img: 'img/shop/basteln.webp', c: 'var(--sun)' },
  { k: 'geschenk', t: 'Geschenke & Souvenirs', p: 'Kleine Freuden für jeden Anlass', img: 'img/shop/geschenk.webp', c: 'var(--orange)' },
];
$('#more-grid').innerHTML = MORE.map(m => `
  <a class="tile" data-k="${m.k}" style="--c:${m.c}" href="https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent('Hallo Bunte Ecke, ich hätte eine Frage zu ' + m.t + ': ')}" target="_blank" rel="noopener">
    <span class="ti"><img src="${m.img}" alt="${m.t}"></span>
    <span class="tb"><h3>${m.t}</h3><p>${m.p}</p><span class="ask">Anfragen</span></span>
  </a>`).join('');

/* ---------- misc ---------- */
function toast(t) {
  const el = $('#toast'); el.textContent = t;
  // keyframe animation instead of a timer, so the recorder can step it
  el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');
}
function scrollToEl(sel) {
  const el = $(sel); if (!el) return;
  if (REC) return; // recorder drives scrolling
  window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - (sel === '#shop' ? 70 : 100), behavior: 'smooth' });
}
// hero film: pause for reduced motion; in recording mode the recorder seeks it frame by frame
const vid = $('#hero-vid');
if (REC || matchMedia('(prefers-reduced-motion: reduce)').matches) { vid.removeAttribute('autoplay'); vid.pause(); }
window.__seekVideo = t => new Promise(res => {
  const target = t % (vid.duration || 15);
  if (Math.abs(vid.currentTime - target) < 0.001) return res();
  const done = () => { vid.removeEventListener('seeked', done); res(); };
  vid.addEventListener('seeked', done); vid.currentTime = target;
  setTimeout(done, 400);
});
if (REC) {
  // block outgoing links during recording
  document.addEventListener('click', e => { const a = e.target.closest('a[href^="http"], a[href^="tel"], a[href^="mailto"], a[href^="#"]'); if (a) e.preventDefault(); }, true);
  window.__frame = () => {}; window.__layout = () => {}; window.__start = () => {};
}
