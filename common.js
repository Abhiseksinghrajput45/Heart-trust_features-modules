const LOGO = "images/logo.png";   

// Shortcut for document.querySelector
const $ = s => document.querySelector(s);

// Menu: [file name, English label, Odia label]
const PAGES = [
  ['index','Home','ମୂଳପୃଷ୍ଠା'],
  ['about','About','ଆମ ବିଷୟରେ'],
  ['healthcare','Healthcare','ସ୍ୱାସ୍ଥ୍ୟ'],
  ['agriculture','Agriculture','କୃଷି'],
  ['environment','Environment','ପରିବେଶ'],
  ['education','Education','ଶିକ୍ଷା'],
  ['community-support','Community Support','ସମୁଦାୟ ସହାୟତା'],
  ['get-involved','Get Involved','ଯୋଗ ଦିଅନ୍ତୁ'],
  ['news-events','News & Events','ଖବର'],
  ['impact','Impact','ପ୍ରଭାବ'],
  ['contact','Contact','ଯୋଗାଯୋଗ'],
  ['admin','Admin','ଆଡମିନ']
];

// Sample health camps (v = village, d = date, t = type)
let camps = [
  {v:'Umerkote',d:'2026-10-20',t:'General + Eye'},
  {v:'Jharigam',d:'2026-10-24',t:'Maternal & Child'},
  {v:'Papadahandi',d:'2026-10-29',t:'Anaemia Screening'},
  {v:'Tentulikhunti',d:'2026-11-03',t:'General + Dental'},
  {v:'Kosagumuda',d:'2026-11-08',t:'Diabetes & BP'}
];

// ---------- Supabase (database) ----------
let sb = null;

// Connect to Supabase if the library and your keys are available (explains in the console if not)
function initSb(){
  if (typeof supabase === 'undefined') return console.warn('[HEART] Supabase library did not load (check internet / ad-blocker).');
  if (typeof SUPABASE_URL === 'undefined') return console.warn('[HEART] supabase-config.js not found next to the pages.');
  if (SUPABASE_URL.includes('YOUR-PROJECT') || SUPABASE_ANON_KEY.includes('YOUR-ANON')) return console.warn('[HEART] Open supabase-config.js and paste your Project URL and anon key.');
  sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  console.info('[HEART] Supabase connected:', SUPABASE_URL);
}
function loadScript(src){
  return new Promise(res => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = res; document.head.appendChild(s); });
}
// Load the Supabase library and config automatically if a page does not include them
async function ensureSupabase(){
  if (typeof supabase === 'undefined') await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/dist/umd/supabase.min.js');
  if (typeof SUPABASE_URL === 'undefined') await loadScript('supabase-config.js');
  initSb();
}

// Load published camps from the database (falls back to sample camps if Supabase is not set up)
async function loadCamps(){
  if (!sb) return;
  const { data, error } = await sb.from('camps').select('village,camp_type,camp_date').eq('published', true).order('camp_date');
  if (error) console.error('[HEART] Could not load camps (did you run supabase.sql?):', error.message);
  camps = error ? [] : data.map(r => ({ v: r.village, t: r.camp_type, d: r.camp_date }));
}

// Escape text before showing user-submitted data on a page
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// Read every field inside a card/form into an object {label: value}
function readForm(root){
  const data = {};
  root.querySelectorAll('input,select,textarea').forEach((el,i) => {
    const lab = el.closest('label') || (el.previousElementSibling && el.previousElementSibling.tagName === 'LABEL' ? el.previousElementSibling : null) || el.parentElement.querySelector(':scope > label');
    let name = ((lab ? (lab.dataset.en || lab.textContent) : (el.dataset.enPh || el.placeholder)) || el.id || 'field' + (i+1)).replace(/:.*$/, '').trim();
    if (name in data) name += ' (' + (i+1) + ')';
    data[name] = el.type === 'checkbox' ? el.checked : el.value.trim();
  });
  return data;
}

// Save a form to the database. btn = the clicked button (or null), extra = additional data
async function send(btn, type, okMsg, extra){
  const root = btn ? btn.closest('.card,.lead') : null;
  if (root && ![...root.querySelectorAll('input:not([type=checkbox]):not([type=range]),textarea')].some(e => e.value.trim()))
    return toast('Please fill in the form first');
  const data = Object.assign(root ? readForm(root) : {}, extra || {});
  const ticket = 'HT-' + Math.random().toString(36).slice(2,8).toUpperCase();
  if (!sb) return toast(okMsg + ' (demo – Supabase not connected)');
  const { error } = await sb.from('submissions').insert({ ticket, form_type: type, data, page: location.pathname.split('/').pop() });
  if (error) { console.error(error); return toast('Sorry, could not send. Please try again.'); }
  toast(T(okMsg) + '. ' + T('Reference') + ': ' + ticket);
  if (root) {
    root.querySelectorAll('input:not([type=checkbox]):not([type=range]),textarea').forEach(e => e.value = '');
    if (root.id === 'mb') closeM();
  }
}

// Small popup form (name, mobile, message)
function quick(type, title){
  modal(`<h3>${title}</h3><label>Name</label><input><label>Mobile</label><input inputmode="numeric">
    <label>Message</label><textarea rows="3"></textarea>
    <div class="row" style="margin-top:1rem"><button class="btn o" onclick="closeM()">Cancel</button>
    <button class="btn" onclick="send(this,'${type}','Enquiry sent')">Send</button></div>`);
}

// Look up the status of a request by its reference ID
async function track(){
  const t = $('#rid').value.trim();
  if (!t) return toast('Enter your reference ID');
  if (!sb) return toast('Demo – Supabase not connected');
  const { data, error } = await sb.rpc('track_request', { t });
  toast(error || !data ? 'No request found for that ID' : 'Status: ' + data);
}

const fd = d => new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'short'});

function toast(m){const e=$('#toast');e.textContent=m;e.style.display='block';setTimeout(()=>e.style.display='none',2500)}
function modal(h){$('#mb').innerHTML=h;$('#modal').classList.add('on')}
function closeM(){$('#modal').classList.remove('on')}

function regModal(c){
  modal(`<h3>${T('Register')} – ${c.v}</h3><p class="mut">${fd(c.d)} · ${c.t}</p>
  <label>Name</label><input><label>Mobile</label><input inputmode="numeric">
  <div class="row" style="margin-top:1rem">
    <button class="btn o" onclick="closeM()">Cancel</button>
    <button class="btn" onclick='send(this,"camp_registration","Registered",${JSON.stringify({village:c.v,camp_date:c.d,camp_type:c.t})})'>Confirm</button>
  </div>`);
}

const camp = c => `<div class="item"><div><b>${c.v}</b> <span class="badge">${c.t}</span>
  <div class="mut">📅 ${fd(c.d)}</div></div>
  <button class="btn" onclick='regModal(${JSON.stringify(c)})'>Register</button></div>`;

const phase = (n,l) => `<span class="badge ${n>2?'a':'t'}">Phase ${n}${l?' · '+l:''}</span>`;

// Language and theme are remembered between pages
let lang = localStorage.getItem('lang') || 'en';
document.documentElement.lang = lang === 'or' ? 'or' : 'en';
const T = s => (lang === 'or' && typeof OD !== 'undefined' && OD[s]) || s;   // translate one phrase
const theme = localStorage.getItem('theme') || (matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light');
document.documentElement.dataset.theme = theme;

// ---------- Odia translation (uses the OD dictionary from odia.js) ----------
function trText(n){
  const t = n.nodeValue.replace(/\s+/g, ' ').trim();
  if (!t || !OD[t]) return;
  const p = n.parentNode;
  if (p && p.nodeType === 1) {
    if (p.nodeName === 'OPTION' && !p.hasAttribute('value')) p.setAttribute('value', t);  // keep English value for the database
    if (p.nodeName === 'LABEL' && !p.dataset.en) p.dataset.en = t;                          // keep English field name
  }
  n.nodeValue = n.nodeValue.replace(/\S[\s\S]*\S|\S/, () => OD[t]);
}
function translate(root){
  if (lang !== 'or' || typeof OD === 'undefined') return;
  if (root.nodeType === 3) return trText(root);
  if (root.nodeType !== 1) return;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: n => /^(SCRIPT|STYLE)$/.test(n.parentNode.nodeName) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
  const nodes = []; let n; while ((n = w.nextNode())) nodes.push(n);
  nodes.forEach(trText);
  root.querySelectorAll('[placeholder]').forEach(e => {
    const p = e.getAttribute('placeholder');
    if (OD[p]) { e.dataset.enPh = e.dataset.enPh || p; e.setAttribute('placeholder', OD[p]); }
  });
}
function watchTranslate(){
  if (lang !== 'or') return;
  translate(document.body);
  new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(nd => translate(nd)))).observe(document.body, { childList: true, subtree: true });
}

// Switch English <-> Odia (done in a function so 'lang' means our variable, not the button's own lang attribute)
function toggleLang(){
  lang = lang === 'en' ? 'or' : 'en';
  localStorage.setItem('lang', lang);
  location.reload();
}

function setTheme(){
  const n = document.documentElement.dataset.theme == 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = n;
  localStorage.setItem('theme', n);
  $('#tg').textContent = n == 'dark' ? '☀' : '☾';
}

function cookieChoice(v){ localStorage.setItem('ck', v); $('.ck').remove(); }

// Build ticker, header, footer, popup, toast and cookie banner
function shell(){
  const cur = document.body.dataset.page;
  const L = id => { const p = PAGES.find(x => x[0] == id); return lang == 'en' ? p[1] : p[2]; };
  const link = id => `<a href="${id}.html" class="${id==cur?'on':''}">${L(id)}</a>`;
  const dd = (en,or,ids) => `<div class="dd ${ids.includes(cur)?'on':''}"><button>${lang=='en'?en:or} ▾</button>
    <div class="dm">${ids.map(i=>`<a href="${i}.html">${L(i)}</a>`).join('')}</div></div>`;

  if (lang === 'or') document.head.insertAdjacentHTML('beforeend', '<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Oriya:wght@400;600&display=swap" rel="stylesheet">');
  document.head.insertAdjacentHTML('beforeend',
    '<link href="https://fonts.googleapis.com/css2?family=Fraunces:wght@500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">');

  // Header (logo only, no text)
  document.body.insertAdjacentHTML('afterbegin', `<header><div class="bar">
    <a class="logo" href="index.html"><img src="${LOGO}" alt="HEART Trust logo"></a>
    <button class="mt" onclick="$('nav').classList.toggle('open')">☰</button>
    <nav>
      ${link('about')}
      ${dd('Programmes','କାର୍ଯ୍ୟକ୍ରମ',['healthcare','agriculture','environment','education'])}
      ${dd('Community','ସମୁଦାୟ',['community-support','get-involved'])}
      ${link('impact')}${link('news-events')}${link('contact')}
    </nav>
    <div class="rt">
      <button class="lang" onclick="toggleLang()">${lang=='en'?'ଓଡ଼ିଆ':'EN'}</button>
      <button class="tg" id="tg" onclick="setTheme()" aria-label="Theme">${theme=='dark'?'☀':'☾'}</button>
      <a class="cta" href="book.html">LET'S TALK →</a>
    </div></div></header>`);

  // Scrolling ticker above the header (phone and email are at the end)
  const today = new Date().toISOString().slice(0,10);
  const up = camps.filter(c => c.d >= today).slice(0,6);
  const items = up.length
    ? up.map(c => `<span><b>${c.v.toUpperCase()}</b>${T(c.t)}, ${fd(c.d)}</span>`).join('')
    : '<span><b>HEART TRUST</b>Camp dates will be announced here</span>';
  document.body.insertAdjacentHTML('afterbegin', `<div class="top"><div class="mq"><div>${items}${items}</div></div>
    <div class="ct">On the ground<a href="tel:+447948608853">+44 7948 608853</a><a href="mailto:info@heartindia.org">info@heartindia.org</a></div></div>`);

  // Footer + popup + toast
  document.body.insertAdjacentHTML('beforeend', `<footer class="ft"><div class="fi"><div class="fg">
    <div><a class="logo" href="index.html"><img src="${LOGO}" alt="HEART Trust logo">HEART Trust</a>
      <p>An integrated community development organisation for tribal communities in Nabarangpur, Odisha: health, nutrition, agriculture, education and livelihoods.</p></div>
    <div><h4>Programmes</h4><a href="healthcare.html">Healthcare</a><a href="agriculture.html">Agriculture</a><a href="environment.html">Environment</a><a href="education.html">Education</a></div>
    <div><h4>Community</h4><a href="community-support.html">Community Support</a><a href="get-involved.html">Get Involved</a><a href="news-events.html">News &amp; Events</a><a href="impact.html">Impact</a></div>
    <div><h4>Company</h4><a href="about.html">About us</a><a href="contact.html">Contact us</a><a href="admin.html">Staff login</a></div>
    </div>
    <div class="fb"><span>© 2026 HEART Trust · Nabarangpur, Odisha · Demo – forms send no data.</span>
    <span><a href="#" onclick="localStorage.removeItem('ck');location.reload();return false">Cookie settings</a></span></div>
    </div></footer>
    <div class="modal" id="modal" onclick="if(event.target.id=='modal')closeM()"><div class="card" id="mb"></div></div>
    <div class="toast" id="toast"></div>`);
document.body.insertAdjacentHTML('afterbegin', '<a class="skip" href="#main">Skip to main content</a>');
  const mn = document.querySelector('main'); if (mn && !mn.id) mn.id = 'main';
  // Cookie banner (until the visitor chooses)
  if (!localStorage.getItem('ck')) document.body.insertAdjacentHTML('beforeend', `<div class="ck"><div>
    <div class="tx"><h3>We value your privacy</h3>
      <p>We use strictly necessary cookies to make this site work. With your permission we'd also like to use optional cookies to remember your settings. Optional cookies stay off unless you turn them on.</p></div>
    <div class="bt">
      <button class="btn" onclick="cookieChoice('reject')">Reject all</button>
      <button class="btn" onclick="cookieChoice('accept')">Accept all</button>
      <button class="ml" onclick="toast('Preferences (demo)')">Manage preferences</button>
    </div></div></div>`);
}

// Make sure the Odia dictionary is loaded on every page (even if the page forgot the <script> line)
function ensureOdia(){
  if (lang !== 'or' || typeof OD !== 'undefined') return Promise.resolve();
  return new Promise(res => {
    const s = document.createElement('script');
    s.src = 'odia.js'; s.onload = res; s.onerror = res;
    document.head.appendChild(s);
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  await ensureOdia();
  await ensureSupabase();
  await loadCamps();
  shell();
  try { if (window.init) await init(); }
  catch (e) { console.error('[HEART] page init failed:', e); }
  watchTranslate();
});
// ---------- BOOKING PAGE for the "LET'S TALK" button ----------
// ...
const BOOKING_URL = "https://calendly.com/YOUR-ACCOUNT/YOUR-MEETING";
dcccccc
