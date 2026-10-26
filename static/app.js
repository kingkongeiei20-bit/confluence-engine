/* Confluence · เครื่องวิเคราะห์การเทรด — Vanilla JS (ไม่มี framework)
   ไลบรารีภายนอก: Lightweight Charts (กราฟ), Fabric.js (สมุดวาดกราฟ) — โหลดจาก CDN ใน index.html */
(() => {
'use strict';

// ───────────────────────── config & constants
const CFG = Object.assign({ symbols:['XAUUSD'], source:'binance', apiBase:'', refreshMin:15 }, window.CONFIG || {});
const SYMS = {
  XAUUSD: { pair:'PAXGUSDT', feed:'PAXG/USDT', name:'ทองคำ / ดอลลาร์', dp:2, pv:100 },
  EURUSD: { pair:'EURUSDT', feed:'EUR/USDT', name:'ยูโร / ดอลลาร์', dp:4, pv:100000 },
  BTCUSD: { pair:'BTCUSDT', feed:'BTC/USDT', name:'บิตคอยน์ / ดอลลาร์', dp:2, pv:1 }
};
const symInfo = s => SYMS[s] || { pair:null, feed:'', name:s, dp:2, pv:1 };
const STATE_TH = { FULL_CONFLUENCE:'สอดคล้องครบ', DIVERGENCE_WARNING:'สัญญาณขัดแย้ง', NO_CONVICTION:'ไม่มีความมั่นใจ' };
const COMP = [['structure','โครงสร้างราคา'],['momentum','โมเมนตัม'],['levels','แนวรับ–แนวต้าน'],['volatility','ความผันผวน'],['session','ช่วงเวลาตลาด']];
const GDOTS = { A:5, B:4, C:3, D:2, F:1 };
const MOON_TH = { 'new moon':'จันทร์ดับ','waxing crescent':'ข้างขึ้น · เสี้ยว','first quarter':'ข้างขึ้น · ครึ่งดวง','waxing gibbous':'ข้างขึ้น · เกือบเต็มดวง','full moon':'จันทร์เพ็ญ','waning gibbous':'ข้างแรม · เกือบเต็มดวง','last quarter':'ข้างแรม · ครึ่งดวง','third quarter':'ข้างแรม · ครึ่งดวง','waning crescent':'ข้างแรม · เสี้ยว' };
const TFS = [['1m','M1'],['5m','M5'],['15m','M15'],['1h','H1'],['4h','H4'],['1d','D1']];
const INTERVALS = [1, 5, 15, 30, 60];
const SYN = 29.530588853, SL_OFF = 15, TP_OFF = 30;
const NAV = [['dash','แดชบอร์ด','dash'],['tech','ห้องเทคนิค','gauge'],['oracle','ห้องโหร','spark'],['sketch','สมุดวาดกราฟ','pencil'],['risk','บัญชี & ความเสี่ยง','calc'],['journal','สมุดเทรด','book'],['settings','ตั้งค่า','sliders']];
const TABS = [['dash','แดชบอร์ด','dash'],['journal','สมุดเทรด','book'],['sketch','กราฟ','pencil'],['settings','ตั้งค่า','sliders']];

// ───────────────────────── helpers
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const sgn = v => v > 0 ? '+' + v : v < 0 ? '−' + Math.abs(v) : '0';
const vc = v => v > 0 ? 'var(--bull)' : v < 0 ? 'var(--bear)' : 'var(--neutral)';
const fmt = (v, dp) => Number(v).toLocaleString('en-US', { minimumFractionDigits:dp, maximumFractionDigits:dp });
const num = s => parseFloat(String(s).replace(/,/g, '')) || 0;
const mmss = s => { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const thTime = d => d.toLocaleTimeString('th-TH', { hour:'2-digit', minute:'2-digit', timeZone:'Asia/Bangkok' }) + ' น.';
const thDate = d => d.toLocaleDateString('th-TH', { weekday:'short', day:'numeric', month:'short', year:'numeric', timeZone:'Asia/Bangkok' });
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const ls = { get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
             set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } } };

// Lucide icons (stroke 1.5)
const ICONS = {
  dash:'<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
  spark:'<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>',
  pencil:'<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/>',
  calc:'<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8M16 14v4M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M8 18h.01M12 18h.01"/>',
  book:'<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
  sliders:'<path d="M21 4h-7M10 4H3M21 12h-9M8 12H3M21 20h-5M12 20H3M14 2v4M8 10v4M16 18v4"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2m-7.07-17.07 1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
  moon:'<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  refresh:'<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
  clock:'<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  chevD:'<path d="m6 9 6 6 6-6"/>', chevR:'<path d="m9 18 6-6-6-6"/>', back:'<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
  check:'<path d="M20 6 9 17l-5-5"/>', x:'<path d="M18 6 6 18M6 6l12 12"/>',
  alert:'<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4M12 17h.01"/>',
  bell:'<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  bellOff:'<path d="M8.7 3A6 6 0 0 1 18 8a21.3 21.3 0 0 0 .6 5"/><path d="M17 17H3s3-2 3-9a4.67 4.67 0 0 1 .3-1.7"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0M2 2l20 20"/>',
  copy:'<rect x="8" y="8" width="14" height="14" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  pen:'<path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"/>',
  wifiOff:'<path d="M12 20h.01M8.5 16.429a5 5 0 0 1 7 0M5 12.859a10 10 0 0 1 5.17-2.69M19 12.859a10 10 0 0 0-2.007-1.523M2 8.82a15 15 0 0 1 4.177-2.643M22 8.82a15 15 0 0 0-11.288-3.764M2 2l20 20"/>',
  snow:'<path d="M2 12h20M12 2v20m8-6-4-4 4-4M4 8l4 4-4 4M16 4l-4 4-4-4M8 20l4-4 4 4"/>',
  pointer:'<path d="M4.037 4.688a.495.495 0 0 1 .651-.651l16 6.5a.5.5 0 0 1-.063.947l-6.124 1.58a2 2 0 0 0-1.438 1.435l-1.579 6.126a.5.5 0 0 1-.947.063z"/>',
  slash:'<path d="M19 5 5 19"/>', minus:'<path d="M3 12h18M3 8v8M21 8v8"/>', arrowUR:'<path d="M7 7h10v10M7 17 17 7"/>',
  square:'<rect x="3" y="3" width="18" height="18"/>', type:'<path d="M4 7V4h16v3M9 20h6M12 4v16"/>',
  eraser:'<path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21M22 21H7M5 11l9 9"/>',
  ghost:'<path d="M9 10h.01M15 10h.01"/><path d="M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z"/>',
  undo:'<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>', redo:'<path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>',
  trash:'<path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
  gauge:'<path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>',
  download:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>'
};
const ic = (n, s = 16) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n]}</svg>`;
const CORNERS = '<i class="c tl"></i><i class="c tr"></i><i class="c bl"></i><i class="c br"></i>';

// ───────────────────────── state
const S = {
  screen:'dash', soon:'', sel:null, theme: ls.get('cta-theme-v', 'system'), resolved:'dark',
  data:{}, status:'idle', errMsg:'', lastOk:0, hist: ls.get('cta-history', []), running:false,
  auto: ls.get('cta-auto-v', true), ivMin: ls.get('cta-interval', CFG.refreshMin), src: ls.get('cta-src-v2', CFG.source),
  tf:'1h', csym:null, candleState:'idle', bal:'10,000', risk:'1.0', rk:{ entry:'', sl:'' }, showMarks: ls.get('cta-marks', true), markN:0, orTab: ls.get('cta-ortab', 'hour'), setTab:'general', exp:{ sel:null, ink:true, scope:'all', sh:true, range:'all' }, demo: ls.get('cta-demo-v2', !CFG.apiBase && !/^(localhost|127\.0\.0\.1)$/.test(location.hostname)), acct: Object.assign({ bal:'50', riskPct:'5' }, ls.get('cta-acct', {})), atr:null,
  menu:null, shots: ls.get('cta-sketch', []), shotId:null, tool:'pen', colorIx:0, widthIx:1, now:Date.now()
};
if (!INTERVALS.includes(S.ivMin)) S.ivMin = 15;
if (S.shots.length) S.shotId = S.shots[0].id;
let reAt = Date.now() + S.ivMin * 60000;
const apiBase = () => (CFG.apiBase || (/^(localhost|127\.0\.0\.1)$/.test(location.hostname) && /^https?:$/.test(location.protocol) ? location.origin : 'http://localhost:8000')).replace(/\/+$/, '');

// ───────────────────────── data sources
async function fetchFastAPI(sym) {
  const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 10000);
  try {
    const r = await fetch(`${apiBase()}/api/signal?symbol=${encodeURIComponent(sym)}`, { headers:{ Accept:'application/json' }, signal:ctl.signal });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const j = await r.json();
    if (!(j && typeof j.symbol === 'string' && typeof j.current_price === 'number' && 'ABCDF'.includes(j.grade) && j.key_levels && j.component_scores)) throw new Error('รูปแบบข้อมูลไม่ตรง SignalData');
    return j;
  } catch (e) {
    throw new Error(e.name === 'AbortError' ? 'หมดเวลา 10 วินาที' : e.message === 'Failed to fetch' ? 'Failed to fetch (เซิร์ฟเวอร์ไม่ตอบ หรือถูก CORS บล็อก)' : e.message);
  } finally { clearTimeout(to); }
}

async function binanceKlines(pair, tf, limit) {
  let last = '';
  for (const host of ['https://data-api.binance.vision', 'https://api.binance.com']) {
    try { const r = await fetch(`${host}/api/v3/klines?symbol=${pair}&interval=${tf}&limit=${limit}`); if (!r.ok) { last = 'HTTP ' + r.status; continue; }
      const j = await r.json(); if (Array.isArray(j) && j.length) return j; } catch (e) { last = e.message; }
  }
  throw new Error(last || 'ดึงแท่งเทียนไม่ได้');
}

// โหมดสาธิต: คำนวณ SignalData จากราคาจริงของ Binance ในเบราว์เซอร์ (สูตรตัวอย่าง ไม่ใช่สูตรของ backend)
async function binanceSignal(sym) {
  const SY = symInfo(sym); if (!SY.pair) throw new Error('ไม่มีคู่เทียบบน Binance');
  const k = await binanceKlines(SY.pair, '1h', 120);
  if (k.length < 60) throw new Error('ข้อมูลไม่พอ');
  const H = k.map(x => +x[2]), L = k.map(x => +x[3]), C = k.map(x => +x[4]), n = C.length, p = C[n - 1];
  const ema = (arr, len) => { const a = 2 / (len + 1); let e = arr[0]; for (let i = 1; i < arr.length; i++) e = arr[i] * a + e * (1 - a); return e; };
  const tr = C.map((c, i) => i ? Math.max(H[i] - L[i], Math.abs(H[i] - C[i - 1]), Math.abs(L[i] - C[i - 1])) : H[i] - L[i]);
  const atr = tr.slice(-14).reduce((a, b) => a + b, 0) / 14, atrAvg = tr.reduce((a, b) => a + b, 0) / n;
  let g = 0, l = 0; for (let i = n - 14; i < n; i++) { const d = C[i] - C[i - 1]; d > 0 ? g += d : l -= d; }
  const rsi = l === 0 ? 100 : 100 - 100 / (1 + g / l);
  const res = Math.max(...H.slice(-48)), sup = Math.min(...L.slice(-48)), thH = (new Date().getUTCHours() + 7) % 24;
  const comp = {
    structure: Math.round(clamp((ema(C, 20) - ema(C, 50)) / atr * 40, -100, 100)),
    momentum: Math.round(clamp((rsi - 50) * 2.2, -100, 100)),
    levels: Math.round(clamp((.5 - (p - sup) / Math.max(1e-9, res - sup)) * 200, -100, 100)),
    volatility: Math.round(clamp((1 - atr / Math.max(1e-9, atrAvg)) * 120, -100, 100)),
    session: thH >= 19 ? 60 : thH >= 14 ? 30 : thH >= 7 ? -10 : -40
  };
  const tech = Math.round(clamp(comp.structure * .3 + comp.momentum * .3 + comp.levels * .2 + comp.volatility * .1 + comp.session * .1, -100, 100));
  const now = new Date(), age = moonAge(now), f = (1 - Math.cos(2 * Math.PI * age / SYN)) / 2, waxing = age < SYN / 2;
  const moonEn = age < 1.85 || age > 27.68 ? 'New Moon' : age < 5.54 ? 'Waxing Crescent' : age < 9.23 ? 'First Quarter' : age < 12.92 ? 'Waxing Gibbous' : age < 16.61 ? 'Full Moon' : age < 20.3 ? 'Waning Gibbous' : age < 23.99 ? 'Last Quarter' : 'Waning Crescent';
  let seed = 0; const key = sym + now.toISOString().slice(0, 13); for (let i = 0; i < key.length; i++) seed = (seed * 31 + key.charCodeAt(i)) >>> 0;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  let heads = 0; for (let i = 0; i < 99; i++) if (rnd() < .5) heads++;
  const eso = Math.round(clamp((waxing ? 1 : -1) * f * 30 + (heads - 49.5) / 49.5 * 125, -100, 100));
  const cs = Math.round(tech * .7 + eso * .3), same = Math.sign(tech) === Math.sign(eso) && tech !== 0;
  const state = same && Math.abs(cs) >= 35 ? 'FULL_CONFLUENCE' : !same && Math.abs(tech) >= 20 && Math.abs(eso) >= 20 ? 'DIVERGENCE_WARNING' : 'NO_CONVICTION';
  let grade = cs >= 60 ? 'A' : cs >= 40 ? 'B' : cs >= 10 ? 'C' : cs >= -20 ? 'D' : 'F';
  if (state === 'DIVERGENCE_WARNING' && (grade === 'A' || grade === 'B')) grade = 'C';
  const r2 = v => +v.toFixed(SY.dp);
  return { symbol:sym, current_price:r2(p), timestamp:now.toISOString(), grade, state, composite_score:cs, tech_score:tech, eso_score:eso,
    archetype:`${moonEn} + Coin:${heads}`, key_levels:{ resistance:r2(res), support:r2(sup), current:r2(p) }, component_scores:comp };
}

async function runNow(auto, first) {
  if (S.running) return;
  S.running = true; if (first) S.status = 'loading'; renderTop(); if (first) renderView();
  const fetchOne = S.src === 'binance' ? binanceSignal : fetchFastAPI;
  const res = await Promise.allSettled(CFG.symbols.map(fetchOne));
  const data = {}, errs = [];
  res.forEach((r, i) => r.status === 'fulfilled' ? (data[r.value.symbol || CFG.symbols[i]] = r.value) : errs.push(CFG.symbols[i] + ': ' + r.reason.message));
  S.running = false; reAt = Date.now() + S.ivMin * 60000;
  const okN = Object.keys(data).length;
  if (!okN) { S.status = 'error'; S.errMsg = errs[0] || 'ไม่ทราบสาเหตุ'; if (!first) toast('ดึงข้อมูลไม่สำเร็จ'); render(); return; }
  const entries = Object.values(data).map(d => ({ sym:d.symbol, ts:d.timestamp, grade:d.grade, score:d.composite_score, state:d.state, price:d.current_price }));
  S.hist = [...entries, ...S.hist.filter(h => !entries.some(e => e.sym === h.sym && e.ts === h.ts))].slice(0, 20);
  ls.set('cta-history', S.hist);
  S.data = data; S.status = errs.length ? 'partial' : 'ok'; S.errMsg = errs[0] || ''; S.lastOk = Date.now();
  if (!S.sel || !data[S.sel]) S.sel = Object.keys(data)[0];
  const prevC = S.csym; if (!S.csym || !data[S.csym]) S.csym = S.sel;
  S.pulse = true;
  render(true);
  if (S.csym !== prevC || !candles) fetchCandles(); else syncChart();
  if (!first) toast(`${auto ? 'วิเคราะห์อัตโนมัติเสร็จ' : 'วิเคราะห์เสร็จ'} · ${okN} สัญญาณ`);
}

// ───────────────────────── derived view model
function moonAge(d) { const jd = d.getTime() / 86400000 + 2440587.5; return ((jd - 2451550.1) % SYN + SYN) % SYN; }
function moonInfo(ts, apiName) {
  const age = moonAge(ts), f = (1 - Math.cos(2 * Math.PI * age / SYN)) / 2, waxing = age < SYN / 2;
  const r = 40, rx = Math.abs(1 - 2 * f) * r, limb = waxing ? 1 : 0, term = waxing ? (f < .5 ? 0 : 1) : (f < .5 ? 1 : 0);
  const path = f < .01 ? '' : `M50,10 A${r},${r} 0 0 ${limb} 50,90 A${rx.toFixed(2)},${r} 0 0 ${term} 50,10 Z`;
  const day = Math.min(15, Math.max(1, Math.ceil(waxing ? age : age - SYN / 2)));
  return { path, en:apiName || '—', th: MOON_TH[(apiName || '').trim().toLowerCase()] || apiName || '—', glyph: waxing ? '☽\uFE0E' : '☾\uFE0E',
    lunar:(waxing ? 'ขึ้น ' : 'แรม ') + day + ' ค่ำ', illum:Math.round(f * 100) + '%', age:age.toFixed(1) + ' วัน', next:(waxing ? SYN / 2 - age : SYN - age).toFixed(1) + ' วัน',
    aria:`ดวงจันทร์ สว่าง ${Math.round(f * 100)}% ${waxing ? 'ข้างขึ้น' : 'ข้างแรม'}` };
}
function coinInfo(arch) {
  const m = /coin\s*:\s*(-?\d+)/i.exec(arch || ''), raw = m ? +m[1] : null, heads = raw == null ? 0 : clamp(raw, 0, 99);
  const bias = raw == null ? 0 : Math.round((heads - 49.5) / 49.5 * 100);
  return { has: raw != null, raw: raw == null ? '—' : raw, heads, tails: 99 - heads,
    bias: raw == null ? '—' : bias > 0 ? 'หัว +' + bias + '%' : bias < 0 ? 'ก้อย +' + Math.abs(bias) + '%' : 'สมดุล', biasC: bias > 0 ? 'var(--cel)' : 'var(--t2)',
    txt: raw == null ? 'ไม่มีข้อมูล' : `หัว ${heads} / ก้อย ${99 - heads}` };
}
// แผนเทรด: ใช้ sl/tp/atr จาก API ก่อน → ATR → ค่าคงที่ (สำรอง)
const apiAtr = sym => { const d = S.data[sym || 'XAUUSD']; return d && typeof d.atr === 'number' && d.atr > 0 ? d.atr : (S.atr && S.atr.v) || null; };
const atrSrc = sym => { const d = S.data[sym || 'XAUUSD']; return d && typeof d.atr === 'number' && d.atr > 0 ? 'API' : S.atr && S.atr.v ? 'Binance' : ''; };
function planOf(d) {
  const p = typeof d.entry === 'number' ? d.entry : d.current_price;
  if (typeof d.sl === 'number' && typeof d.tp === 'number') return { entry:p, sl:d.sl, tp:d.tp, short:d.sl > p, src:'API' };
  const a = typeof d.atr === 'number' && d.atr > 0 ? d.atr : (d.symbol === 'XAUUSD' && S.atr && S.atr.v) || null, short = d.composite_score < 0, k = short ? -1 : 1;
  if (a) return { entry:p, sl:p - k * a * SL_ATR, tp:p + k * a * TP_ATR, short, src:'ATR' };
  return { entry:p, sl:p - k * SL_OFF, tp:p + k * TP_OFF, short, src:'คงที่' };
}
function decorate(d) {
  const SY = symInfo(d.symbol), ts = new Date(d.timestamp), tsOk = !isNaN(ts), p = d.current_price, cs = d.composite_score;
  const isTrap = d.grade === 'D' || d.grade === 'F', dir = cs > 0 ? 'bull' : cs < 0 ? 'bear' : 'flat', kl = d.key_levels || {};
  const pl = planOf(d), slD = Math.abs(pl.entry - pl.sl), tpD = Math.abs(pl.tp - pl.entry);
  const warns = [];
  if (d.allowed === false) warns.push([`ความเสี่ยงสูง: ${d.block_reason || 'หลังบ้านไม่อนุญาตให้เข้าไม้นี้'}`, 'var(--warn)']);
  if (isTrap) warns.push([`เกรด ${d.grade} · ระวังกับดัก ไม่ควรเข้าเทรด`, 'var(--grade-f)']);
  if (d.state === 'DIVERGENCE_WARNING') warns.push([`เทคนิค ${sgn(d.tech_score)} กับโหราศาสตร์ ${sgn(d.eso_score)} ชี้คนละทาง`, 'var(--warn)']);
  if (d.state === 'NO_CONVICTION') warns.push(['คะแนนไม่ชัดเจน · รอสัญญาณรอบถัดไป', 'var(--warn)']);
  if (pl.short) { if (kl.support < p && kl.support > pl.tp) warns.push([`แนวรับ ${fmt(kl.support, SY.dp)} อยู่ก่อนถึง TP`, 'var(--warn)']); if (kl.resistance > p && kl.resistance < pl.sl) warns.push([`แนวต้าน ${fmt(kl.resistance, SY.dp)} อยู่ใต้ SL`, 'var(--t3)']); }
  else { if (kl.resistance > p && kl.resistance < pl.tp) warns.push([`แนวต้าน ${fmt(kl.resistance, SY.dp)} อยู่ก่อนถึง TP`, 'var(--warn)']); if (kl.support < p && kl.support > pl.sl) warns.push([`แนวรับ ${fmt(kl.support, SY.dp)} อยู่เหนือ SL`, 'var(--t3)']); }
  if (tsOk && S.now - ts > 30 * 60000) warns.push([`ข้อมูลเก่า ${Math.round((S.now - ts) / 60000)} นาที`, 'var(--warn)']);
  const ladder = [
    ['แนวต้าน', kl.resistance, 'var(--t2)', 1, 'var(--t2)'], ['TP · ' + (pl.short ? '−' : '+') + fmt(tpD, SY.dp), pl.tp, 'var(--bull)', 2, 'var(--bull)'],
    ['เข้า · ' + (pl.short ? 'Short' : 'Long'), pl.entry, 'var(--acc)', 2, 'var(--t1)'], ['SL · ' + (pl.short ? '+' : '−') + fmt(slD, SY.dp), pl.sl, 'var(--bear)', 2, 'var(--bear)'], ['แนวรับ', kl.support, 'var(--t2)', 1, 'var(--t2)']
  ].filter(x => typeof x[1] === 'number').sort((a, b) => b[1] - a[1]);
  return {
    raw:d, sym:d.symbol, SY, price:fmt(p, SY.dp), grade:d.grade, isTrap, cs, tech:d.tech_score, eso:d.eso_score,
    time: tsOk ? thTime(ts) : '—', dateTime: tsOk ? thDate(ts) + ' · ' + thTime(ts) : '—', archetype: d.archetype || '—',
    stateLbl: STATE_TH[d.state] || d.state, dc: dir === 'bull' ? 'var(--bull)' : dir === 'bear' ? 'var(--bear)' : 'var(--neutral)',
    dirLbl: dir === 'bull' ? '▲ ขาขึ้น' : dir === 'bear' ? '▼ ขาลง' : '◆ เป็นกลาง',
    stateC: d.grade === 'A' ? 'var(--grade-a)' : isTrap ? 'var(--grade-f)' : d.state === 'DIVERGENCE_WARNING' ? 'var(--warn)' : 'var(--t2)',
    comps: COMP.map(([k, n]) => [n, +(d.component_scores || {})[k] || 0]),
    plan:pl, slD, tpD, allowed:d.allowed, blockReason:d.block_reason || '', atr: typeof d.atr === 'number' ? d.atr : null,
    warns, ladder, moon: moonInfo(tsOk ? ts : new Date(), (d.archetype || '').split('+')[0].trim()), coin: coinInfo(d.archetype),
    trapNote: `สถานะ ${STATE_TH[d.state] || d.state} · คะแนนรวม ${sgn(cs)} · เทคนิค ${sgn(d.tech_score)} / โหร ${sgn(d.eso_score)} — ไม่ควรเข้าเทรดตามแผนนี้`
  };
}
const sigs = () => Object.values(S.data).map(decorate);
const allowHTML = s => !s || s.allowed == null ? '' : s.allowed === false
  ? '<div class="banner warn" role="alert"><span class="ic">' + ic('alert', 20) + '</span><div><b>ความเสี่ยงสูง: ' + esc(s.blockReason || 'หลังบ้านไม่อนุญาตให้เข้าไม้นี้') + '</b><span style="color:var(--t2)">allowed: false · ' + esc(s.sym) + ' · ' + s.time + '</span></div></div>'
  : '<div class="banner" style="border:1px solid color-mix(in oklch,var(--bull) 45%,transparent)"><span class="ic" style="color:var(--bull)">' + ic('check', 20) + '</span><div><b>เข้าได้ตามกฎ</b><span style="color:var(--t2)">allowed: true · ' + esc(s.sym) + ' · ' + s.time + '</span></div></div>';
const selSig = () => { const all = sigs(); return all.find(x => x.sym === S.sel) || all[0] || null; };

// ───────────────────────── template pieces
const gradeHTML = (g, size = '', pulse = false) => `<div class="grade ${size} g-${g}${pulse && g === 'A' && !reduced() ? ' pulse' : ''}">${g}</div>`;
const barHTML = (v, h = 6) => { const k = clamp(Math.abs(v) / 100, 0, 1);
  return `<div class="sbar" style="height:${h}px"><div class="fill" data-k="${k}" style="left:${v >= 0 ? '50%' : '0'};transform-origin:${v >= 0 ? 'left' : 'right'};background:${vc(v)};transform:scaleX(${k})"></div><i class="mid"></i></div>`; };
const countHTML = v => `<span data-count="${v}">${sgn(v)}</span>`;
const duoRows = s => [['เทค', 'คะแนนเทคนิค', s.tech], ['โหร', 'คะแนนโหราศาสตร์', s.eso]];

// ───────────────────────── render
function render(fresh) { renderTop(); renderNav(); renderView(); if (fresh) animateIn(); S.pulse = false; }

function engText() {
  if (S.running) return 'กำลังวิเคราะห์…';
  if (S.status === 'error') return `เชื่อมต่อ ${S.src === 'binance' ? 'Binance' : 'FastAPI'} ไม่ได้`;
  if (S.auto) return `อัตโนมัติทุก ${S.ivMin === 60 ? '1 ชั่วโมง' : S.ivMin + ' นาที'} · อีก ${mmss((reAt - S.now) / 1000)}`;
  return 'วิเคราะห์เอง · ล่าสุด ' + (S.lastOk ? thTime(new Date(S.lastOk)) : '—');
}
function renderTop() {
  $('#eng-text').textContent = engText();
  $('#eng-dot').style.background = S.running ? 'var(--acc)' : S.status === 'error' ? 'var(--bear)' : S.auto ? 'var(--bull)' : 'var(--t3)';
  $('#eng-line').hidden = !S.running;
  $('#eng-chev').innerHTML = ic('chevD'); $('#eng-chev').style.transform = S.menu === 'eng' ? 'rotate(180deg)' : '';
  $('#eng-btn').setAttribute('aria-expanded', S.menu === 'eng');
  const rb = $('#run-btn'); rb.disabled = S.running; rb.innerHTML = ic(S.running ? 'clock' : 'refresh') + `<span id="run-label">${S.running ? 'กำลังวิเคราะห์…' : 'วิเคราะห์ตอนนี้'}</span>`;
  const tb = $('#theme-btn'), dark = S.resolved === 'dark';
  tb.innerHTML = ic(dark ? 'sun' : 'moon'); tb.setAttribute('aria-label', dark ? 'สลับเป็นโหมดสว่าง' : 'สลับเป็นโหมดมืด'); tb.title = tb.getAttribute('aria-label');
  const m = $('#eng-menu'); m.hidden = S.menu !== 'eng';
  if (!m.hidden) m.innerHTML = `
    <button role="menuitemcheckbox" aria-checked="${S.auto}" data-act="auto"><span class="grow">วิเคราะห์อัตโนมัติ</span><span class="switch${S.auto ? ' on' : ''}"><i></i></span></button>
    <div class="sep"></div><div class="label">แหล่งข้อมูล</div>
    ${[['binance','Binance','ราคาจริง · คำนวณคะแนนในเบราว์เซอร์'],['fastapi','FastAPI','GET ' + apiBase().replace(/^https?:\/\//, '') + '/api/signal']].map(([k, l, sub]) =>
      `<button role="menuitemradio" aria-checked="${S.src === k}" data-act="src:${k}"><span class="grow">${l}<span class="sub">${esc(sub)}</span></span><span class="ck">${S.src === k ? ic('check') : ''}</span></button>`).join('')}
    <div class="sep"></div><div class="label">รอบการวิเคราะห์</div>
    ${INTERVALS.map(v => `<button role="menuitemradio" aria-checked="${S.ivMin === v}" data-act="iv:${v}"><span class="grow">${v === 60 ? 'ทุก 1 ชั่วโมง' : 'ทุก ' + v + ' นาที'}</span><span class="ck">${S.ivMin === v ? ic('check') : ''}</span></button>`).join('')}`;
}
function renderNav() {
  const cur = S.screen === 'detail' ? 'dash' : S.screen === 'soon' ? S.soon : S.screen;
  const GRP = { dash:'วิเคราะห์', sketch:'เครื่องมือ', settings:'ระบบ' };
  $('#rail').innerHTML = NAV.map(([k, l, i]) => (GRP[k] ? `<span class="rail-grp">${GRP[k]}</span>` : '') + `<button data-act="go:${k}"${cur === k ? ' aria-current="page"' : ''}>${ic(i, 18)}<span>${l}</span></button>`).join('') +
    `<div class="src"><span class="kicker">แหล่งข้อมูล</span><span style="display:flex;align-items:center;gap:6px;font-size:13px"><span class="dot" style="background:${$('#eng-dot').style.background}"></span>${S.src === 'binance' ? 'Binance · คำนวณในเบราว์เซอร์' : esc(apiBase().replace(/^https?:\/\//, ''))}</span><span class="muted xs">ล่าสุด ${S.lastOk ? thTime(new Date(S.lastOk)) : '—'}</span></div>`;
  $('#tabbar').innerHTML = TABS.map(([k, l, i]) => `<button data-act="go:${k}"${cur === k ? ' aria-current="page"' : ''}>${ic(i, 20)}<span>${l}</span></button>`).join('');
}
function show(id) { ['v-state','v-dash','v-detail','v-tech','v-oracle','v-sketch','v-journal','v-settings','v-risk','v-soon'].forEach(v => $('#' + v).hidden = v !== id); }

function renderView() {
  const has = Object.keys(S.data).length > 0, scr = S.screen;
  if (scr === 'sketch') { show('v-sketch'); renderSketch(); return; }
  if (scr === 'journal') { show('v-journal'); renderJournal(); return; }
  if (scr === 'settings') { show('v-settings'); renderSettings(); return; }
  if (scr === 'risk') { show('v-risk'); renderRisk(); return; }
  if (scr === 'soon') { show('v-soon'); const l = (NAV.find(n => n[0] === S.soon) || [, ''])[1];
    $('#v-soon').innerHTML = `<div class="state"><div class="state-box center"><div style="font:600 28px var(--font-heading)">${l}</div><div class="muted sm">ยังไม่มีในรอบนี้</div><button class="btn" data-act="go:dash">กลับไปที่ฟีด</button></div></div>`; return; }
  if (!has) {
    show('v-state');
    const name = S.src === 'binance' ? 'Binance' : 'FastAPI';
    if (S.status === 'error') {
      const call = S.src === 'binance' ? 'GET data-api.binance.vision/api/v3/klines?symbol=' + symInfo(CFG.symbols[0]).pair : `GET ${apiBase()}/api/signal?symbol=${CFG.symbols[0]}`;
      const hint = S.src === 'binance' ? 'ตรวจการเชื่อมต่ออินเทอร์เน็ต หรือ Binance อาจถูกจำกัดในเครือข่ายนี้' : 'ตรวจว่า FastAPI รันอยู่ และเปิด CORS ให้หน้านี้ (ถ้าเปิดหน้าเว็บจากที่อื่นที่ไม่ใช่เครื่องเดียวกับ API)';
      $('#v-state').innerHTML = `<div class="state"><div class="bp state-box" style="padding:32px 36px">${CORNERS}
        <div style="width:40px;height:40px;border:1px solid var(--bear);color:var(--bear);display:grid;place-items:center">${ic('wifiOff', 20)}</div>
        <div style="font:600 26px/1.2 var(--font-heading)">เชื่อมต่อ ${name} ไม่ได้</div>
        <div style="font-size:14px;color:var(--t2)">${hint}</div>
        <div class="code">${esc(call)} · ${esc(S.errMsg)}</div>
        <div style="display:flex;gap:10px"><button class="btn btn-primary" data-act="run">${ic('refresh')}ลองใหม่</button>${S.src === 'fastapi' ? '<button class="btn btn-ghost" data-act="src:binance">สลับไปใช้ข้อมูล Binance</button>' : ''}</div>
      </div></div>`;
    } else if (S.status === 'ok' || S.status === 'partial') {
      $('#v-state').innerHTML = `<div class="state"><div class="state-box center">
        <svg width="240" height="120" viewBox="0 0 220 120" aria-hidden="true"><polyline points="20,80 60,36 110,56 150,22 196,64 150,100 96,104 60,36" style="fill:none;stroke:var(--t3);stroke-width:1;stroke-dasharray:520;stroke-dashoffset:520;animation:draw 1.8s cubic-bezier(.25,1,.5,1) forwards"></polyline>${[[20,80],[60,36],[110,56],[150,22],[196,64],[150,100],[96,104]].map(([x,y]) => `<circle cx="${x}" cy="${y}" r="2.5" style="fill:var(--cel)"></circle>`).join('')}</svg>
        <div style="font:600 28px var(--font-heading)">ตลาดเงียบ · ยังไม่มีสัญญาณ</div>
        <div class="muted sm">แหล่งข้อมูลตอบกลับแต่ไม่มีสัญญาณของ ${esc(CFG.symbols.join(', '))}</div>
        <button class="btn" data-act="run">${ic('refresh')}วิเคราะห์ตอนนี้</button></div></div>`;
    } else {
      $('#v-state').innerHTML = `<div class="page" role="status" aria-label="กำลังโหลด"><div class="skel" style="width:260px;height:30px"></div><div class="skel" style="height:340px"></div>
        <div class="grid-2"><div class="skel" style="height:200px"></div><div class="skel" style="height:200px"></div></div><div class="muted sm">กำลังดึงข้อมูลจาก ${name}</div></div>`;
    }
    return;
  }
  if (scr === 'detail') { show('v-detail'); renderDetail(); }
  else if (scr === 'tech') { show('v-tech'); renderTech(); }
  else if (scr === 'oracle') { show('v-oracle'); renderOracle(); }
  else { show('v-dash'); renderDash(); }
}

function renderDash() {
  const all = sigs(), sel = selSig();
  $('#today').textContent = 'ภาพรวม · ' + thDate(new Date());
  $('#dash-last').textContent = 'วิเคราะห์ล่าสุด ' + (S.lastOk ? thTime(new Date(S.lastOk)) : '—');
  $('#stale').innerHTML = S.status === 'error' || S.status === 'partial'
    ? `<div class="banner warn"><span class="ic">${ic('alert')}</span><span class="grow">อัปเดตล่าสุดล้มเหลว (${esc(S.errMsg)}) · กำลังแสดงข้อมูลเมื่อ ${S.lastOk ? thTime(new Date(S.lastOk)) : '—'}</span><button class="btn btn-ghost" data-act="run">ลองใหม่</button></div>` : '';
  // chart header
  const cd = S.data[S.csym] ? decorate(S.data[S.csym]) : null;
  $('#sym-label').textContent = S.csym || '—';
  $('#sym-chev').innerHTML = ic('chevD'); $('#sym-chev').style.color = 'var(--t3)';
  $('#chart-price').textContent = cd ? cd.price : '—';
  $('#chart-time').textContent = cd ? 'ราคาจากแหล่งสัญญาณ · ' + cd.time : '';
  $('#freeze-btn').innerHTML = ic('snow');
  const mb = $('#marks-btn'); mb.setAttribute('aria-checked', S.showMarks);
  mb.title = J.status === 'error' ? 'ดึง /api/journal ไม่ได้ · ' + J.err : 'แสดงจุดเข้าเทรดจากสมุดเทรด';
  mb.innerHTML = '<span style="width:16px;height:16px;border:1px solid ' + (S.showMarks ? 'var(--acc);background:var(--acc);color:var(--bg)' : 'var(--bd-x)') + ';display:grid;place-items:center">' + (S.showMarks ? ic('check', 12) : '') + '</span>แสดงจุดเข้าเทรด' + (S.showMarks && J.status === 'ok' ? '<span class="muted xs">' + S.markN + '</span>' : '');
  $('#tf-group').innerHTML = TFS.map(([k, l]) => `<button data-act="tf:${k}" aria-pressed="${S.tf === k}">${l}</button>`).join('');
  const sm = $('#sym-menu'); sm.hidden = S.menu !== 'sym'; $('#sym-dd .sym-btn').setAttribute('aria-expanded', S.menu === 'sym');
  if (!sm.hidden) sm.innerHTML = CFG.symbols.map(k => `<button role="option" aria-selected="${S.csym === k}" aria-checked="${S.csym === k}" data-act="sym:${k}"><b style="width:66px">${k}</b><span class="grow muted sm">${esc(symInfo(k).name)}</span><span class="ck">${S.csym === k ? ic('check') : ''}</span></button>`).join('');
  const SY = symInfo(S.csym);
  $('#candle-src').textContent = SY.pair ? `แท่งเทียน: ${SY.feed} (Binance) ใช้อ้างอิงทิศทาง` : 'ไม่มีแท่งเทียน';
  const msg = { loading:'กำลังโหลดแท่งเทียน…', idle:'กำลังโหลดแท่งเทียน…', fail:'ดึงแท่งเทียนจาก Binance ไม่ได้', none:`ไม่มีแหล่งแท่งเทียนสำหรับ ${S.csym}` }[S.candleState];
  $('#chart-msg').hidden = S.candleState === 'ok'; $('#chart-msg').textContent = msg || '';
  ensureChart();
  // signals
  $('#sig-list').innerHTML = all.map(s => `
    <button class="sig-row${s.grade === 'C' ? ' dimC' : ''}" data-act="select:${s.sym}" data-dbl="open:${s.sym}" aria-pressed="${s.sym === S.sel}">
      ${s.isTrap ? '<span class="hazard"></span>' : ''}${gradeHTML(s.grade, '', S.pulse)}
      <div style="min-width:0;display:flex;flex-direction:column;gap:3px">
        <div><b style="font-size:16px">${s.sym}</b> <span class="sm" style="color:var(--t2)">${s.price}</span></div>
        <div class="sm ellip"><span style="color:${s.dc};font-weight:500">${s.dirLbl}</span><span class="muted"> · ${s.time} · ${s.stateLbl}</span></div>
      </div>
      <div class="num" style="font-size:26px;text-align:right;color:${s.dc}">${countHTML(s.cs)}</div>
      <div class="duo-wrap" style="display:flex;flex-direction:column;gap:6px">${duoRows(s).map(([n, , v]) => `<div class="duo"><span>${n}</span>${barHTML(v, 4)}<span style="text-align:right;color:var(--t2)">${countHTML(v)}</span></div>`).join('')}</div>
      <span class="muted">${ic('chevR')}</span>
    </button>`).join('');
  // preview
  $('#preview').innerHTML = !sel ? '' : `${CORNERS}
    <div style="display:flex;flex-direction:column;gap:16px" class="${sel.grade === 'C' ? 'dimC' : ''}">
      <span class="h">ตัวอย่าง</span>
      <div style="display:flex;align-items:center;gap:14px">${gradeHTML(sel.grade, 'lg')}
        <div class="grow"><div style="font-size:18px;font-weight:600">${sel.sym} <span class="muted sm" style="font-weight:400">${sel.time}</span></div><div class="sm" style="color:${sel.dc}">${sel.dirLbl} · ${sel.stateLbl}</div></div>
        <div class="num" style="font-size:40px;color:${sel.dc}">${countHTML(sel.cs)}</div></div>
      ${duoRows(sel).map(([, full, v]) => `<div style="display:flex;flex-direction:column;gap:6px"><div class="row sm"><span style="color:var(--t2)">${full}</span><span style="color:${vc(v)}">${countHTML(v)}</span></div>${barHTML(v)}<div class="scale"><span>−100</span><span>0</span><span>+100</span></div></div>`).join('')}
      <div class="muted sm"><span style="color:var(--cel)">✶</span> ${esc(sel.archetype)}</div>
      <div style="display:flex;gap:10px"><button class="btn btn-primary grow" data-act="open:${sel.sym}">ดูรายละเอียด${ic('chevR')}</button><button class="btn" data-act="log">${ic('pen')}บันทึก</button></div>
    </div>`;
  // history
  $('#hist-count').textContent = `บันทึกจากผลที่ดึงได้จริง · ${S.hist.length} รายการ`;
  $('#hist').innerHTML = !S.hist.length ? '<div class="empty-row">ยังไม่มีประวัติ</div>' : S.hist.slice(0, 8).map(h => { const d = new Date(h.ts);
    return `<div class="hist-row"><span class="muted">${isNaN(d) ? '—' : thTime(d)}</span><span style="font-weight:500">${esc(h.sym)}</span>${gradeHTML(h.grade, 'sm')}<span style="color:${vc(h.score)};font-weight:500">${sgn(h.score)}</span><span style="color:var(--t2)">${STATE_TH[h.state] || esc(h.state)}</span><span class="muted sm">${fmt(h.price, symInfo(h.sym).dp)}</span></div>`; }).join('');
}

function calcPlan(sel) {
  const riskUsd = num(S.acct.bal) * num(S.acct.riskPct) / 100, exact = sel.slD > 0 ? riskUsd / (sel.slD * sel.SY.pv) : 0;
  const lot = Math.max(MIN_LOT, Math.floor(exact * 100 + 1e-9) / 100), real = lot * sel.slD * sel.SY.pv;
  return { lot: lot >= 100 ? fmt(lot, 0) : lot.toFixed(2), loss: '$' + fmt(real, real < 1000 ? 2 : 0) };
}
function renderDetail() {
  const s = selSig(); if (!s) return;
  const c = calcPlan(s), p = s.raw.current_price;
  const quad = s.tech >= 0 ? (s.eso >= 0 ? 2 : 4) : (s.eso >= 0 ? 1 : 3), on = 'color-mix(in oklch, var(--acc) 10%, transparent)';
  const mx = (110 + clamp(s.tech, -100, 100) * .9).toFixed(1), my = (100 - clamp(s.eso, -100, 100) * .9).toFixed(1);
  const mline = (quad === 2 ? 'เทคนิค ▲ · โหร ▲ → สอดคล้องขาขึ้น' : quad === 3 ? 'เทคนิค ▼ · โหร ▼ → สอดคล้องขาลง' : 'เทคนิคกับโหรชี้คนละทาง → ขัดแย้ง') + ' · ' + s.stateLbl;
  $('#v-detail').innerHTML = `
  <div class="sticky-bar">
    <button class="btn btn-ghost" data-act="go:dash" aria-label="กลับไปที่แดชบอร์ด">${ic('back')}กลับ</button>
    <div style="font-size:15px"><b>${s.sym}</b><span class="muted"> · ${s.dateTime}</span></div>
    <div class="grow"></div>
    <div class="d-actions">
    <button class="btn btn-ghost" data-act="ignore">${ic('bellOff')}ไม่สนใจ</button>
    <button class="btn btn-icon" data-act="alert" aria-label="ตั้งแจ้งเตือน" title="ตั้งแจ้งเตือน">${ic('bell')}</button>
    <button class="btn btn-icon" data-act="copy" aria-label="คัดลอกแผน" title="คัดลอกแผน">${ic('copy')}</button>
    <button class="btn btn-primary" data-act="log">${ic('pen')}บันทึกการตัดสินใจ</button>
    </div>
  </div>
  <div class="page">
    ${allowHTML(s)}
    ${s.isTrap ? `<div class="banner trap" role="alert"><span class="hazard"></span><span class="ic">${ic('alert', 20)}</span><div><b>คำเตือน: กับดัก · เกรด ${s.grade}</b><span style="color:var(--t2)">${esc(s.trapNote)}</span></div></div>` : ''}
    <div class="bp hero ${s.grade === 'A' ? 'A' : s.isTrap && !reduced() ? 'trap' : ''}${s.grade === 'C' ? ' dimC' : ''}">${CORNERS}
      <div class="hero-in">
        <div style="display:flex;align-items:center;gap:18px">${gradeHTML(s.grade, 'xl', S.pulse)}
          <div style="display:flex;flex-direction:column;gap:8px"><span class="kicker">เกรด</span><div class="dots g-${s.grade}" style="background:none;border:0;box-shadow:none">${[0,1,2,3,4].map(i => `<i class="${i < GDOTS[s.grade] ? 'on' : ''}"></i>`).join('')}</div></div></div>
        <div style="display:flex;flex-direction:column;gap:10px"><span class="kicker">คะแนนรวม (−100 ถึง +100)</span>
          <div style="display:flex;align-items:center;gap:18px"><span class="num" style="font-size:56px;color:${s.dc};min-width:110px">${countHTML(s.cs)}</span><div class="grow">${barHTML(s.cs, 8)}</div></div></div>
        <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end;text-align:right">
          <span style="font:600 26px var(--font-heading);color:${s.dc}">${s.dirLbl}</span>
          <span style="font:600 15px var(--font-heading);color:${s.stateC}">${s.stateLbl}</span>
          <span class="muted sm">ราคา <span style="color:var(--t1)">${s.price}</span> · ${s.time}</span></div>
      </div>
    </div>
    <div class="grid-3">
      <div class="bp card">${CORNERS}
        <div class="card-title"><span class="h">สรุปเทคนิค</span><a href="#" data-act="go:tech" class="xs">เปิดห้องเทคนิค</a></div>
        <div style="display:flex;align-items:baseline;gap:12px"><span class="num" style="font-size:44px;color:${vc(s.tech)}">${countHTML(s.tech)}</span><span class="muted sm">tech_score · น้ำหนัก 70%</span></div>
        <div>${barHTML(s.tech)}</div>
        ${s.comps.slice().sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 3).map(([n, v]) => `<div class="row" style="border-top:1px solid var(--bd-s);padding-top:8px"><span style="color:var(--t2)">${n}</span><span style="color:${vc(v)};font-weight:500">${sgn(v)}</span></div>`).join('')}
        <span class="muted xs">3 ชั้นที่แรงที่สุด · ดูครบ 5 ชั้น แนวรับ-ต้าน และหลายกรอบเวลาในห้องเทคนิค</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:20px">
        <div class="bp card">${CORNERS}
          <div class="card-title"><span class="h">เมทริกซ์ความสอดคล้อง</span><span class="muted xs">เทคนิค × โหร</span></div>
          <svg viewBox="0 0 220 220" width="100%" height="230" role="img" aria-label="เทคนิค ${s.tech} โหราศาสตร์ ${s.eso}" style="overflow:visible">
            ${[[20,10,1],[110,10,2],[20,100,3],[110,100,4]].map(([x,y,q]) => `<rect x="${x}" y="${y}" width="90" height="90" style="fill:${quad === q ? on : 'transparent'}"></rect>`).join('')}
            <rect x="20" y="10" width="180" height="180" style="fill:none;stroke:var(--bd)"></rect>
            <line x1="110" y1="10" x2="110" y2="190" style="stroke:var(--bd-x)"></line><line x1="20" y1="100" x2="200" y2="100" style="stroke:var(--bd-x)"></line>
            <text x="196" y="24" text-anchor="end" style="fill:var(--t3);font:500 10px var(--font-body)">ครบ · ขาขึ้น</text><text x="24" y="184" style="fill:var(--t3);font:500 10px var(--font-body)">ครบ · ขาลง</text>
            <text x="24" y="24" style="fill:var(--t3);font:500 10px var(--font-body)">ขัดแย้ง</text><text x="196" y="184" text-anchor="end" style="fill:var(--t3);font:500 10px var(--font-body)">ขัดแย้ง</text>
            <text x="110" y="206" text-anchor="middle" style="fill:var(--t3);font:600 10px var(--font-heading)">เทคนิค →</text><text x="8" y="100" text-anchor="middle" transform="rotate(-90 8 100)" style="fill:var(--t3);font:600 10px var(--font-heading)">โหร →</text>
            <line x1="110" y1="100" x2="${mx}" y2="${my}" style="stroke:var(--acc);stroke-dasharray:3 3"></line>
            <circle cx="${mx}" cy="${my}" r="7" style="fill:color-mix(in oklch,var(--acc) 25%,transparent);stroke:var(--acc);stroke-width:1.5"></circle>
          </svg>
          <div class="sm" style="color:var(--t2);text-align:center">${mline}</div>
        </div>
        <div class="bp card">${CORNERS}
          <div class="card-title"><span class="h" style="color:var(--warn)">คำเตือน</span><span class="muted xs">${s.warns.length}</span></div>
          ${s.warns.length ? s.warns.map(([t, c]) => `<div class="warn-line"><span style="color:${c};margin-top:2px">${ic('alert')}</span><span>${esc(t)}</span></div>`).join('')
            : `<div class="warn-line" style="color:var(--t2)"><span style="color:var(--bull)">${ic('check')}</span>ไม่มีคำเตือนจากข้อมูลรอบนี้</div>`}
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:20px">
        <div class="bp card">${CORNERS}
          <div class="card-title"><span class="h">แผนเทรด · บันไดราคา</span><span class="muted xs">ที่มา ${s.plan.src}${s.atr != null || apiAtr(s.sym) ? ' · ATR(14): ' + fmt(s.atr ?? apiAtr(s.sym), 2) : ''}</span></div>
          ${s.ladder.map(([l, v, c, h, lc]) => `<div class="ladder"><span class="mk" style="height:${h}px;background:${c}"></span><span style="color:${lc};font-weight:${l.startsWith('เข้า') ? 600 : 400}">${l}</span><b style="font-weight:500">${fmt(v, s.SY.dp)}</b><span class="muted xs" style="text-align:right">${l.startsWith('เข้า') ? '' : sgn(+(v - p).toFixed(s.SY.dp))}</span></div>`).join('')}
          <div class="fields">
            <label>ยอดเงิน (USD)<input class="input" inputmode="decimal" data-acct="bal" value="${esc(S.acct.bal)}"></label>
            <label>ความเสี่ยง %<input class="input" inputmode="decimal" data-acct="riskPct" value="${esc(S.acct.riskPct)}"></label>
          </div>
          <div class="stats"><div><span>ขนาดล็อต</span><b id="calc-lot" style="color:var(--acc)">${c.lot}</b></div><div><span>ขาดทุนสูงสุด</span><b id="calc-loss">${c.loss}</b></div><div><span>R:R</span><b>1 : ${s.slD > 0 ? (s.tpD / s.slD).toFixed(1) : '—'}</b></div></div>
        </div>
        <div class="bp card">${CORNERS}
          <div class="card-title"><span class="h" style="color:var(--cel)">Oracle archetype</span><a href="#" data-act="go:oracle" class="xs">เปิดห้องโหร</a></div>
          <div style="font-size:16px;font-weight:500">${esc(s.archetype)}</div>
          <div class="row"><span><span style="color:var(--cel)">${s.moon.glyph}</span> ${esc(s.moon.th)}</span><span class="muted">${s.moon.lunar}</span></div>
          <div class="row"><span><span style="color:var(--cel)">◎</span> เหรียญ 99 รอบ</span><span class="muted">${s.coin.txt}</span></div>
        </div>
      </div>
    </div>
  </div>`;
}

// ───────────────────────── ห้องเทคนิค
const MTF = [['5m','M5'],['15m','M15'],['1h','H1'],['4h','H4'],['1d','D1']];
const ema = (a, n) => { const k = 2 / (n + 1); let e = a[0]; return a.map(v => e = v * k + e * (1 - k)); };
function rsi(c, n = 14) { let g = 0, l = 0; for (let i = 1; i <= n; i++) { const d = c[i] - c[i - 1]; d > 0 ? g += d : l -= d; } g /= n; l /= n;
  for (let i = n + 1; i < c.length; i++) { const d = c[i] - c[i - 1]; g = (g * (n - 1) + Math.max(d, 0)) / n; l = (l * (n - 1) + Math.max(-d, 0)) / n; } return l ? 100 - 100 / (1 + g / l) : 100; }
function atrOf(k, n = 14) { const H = k.map(x => +x[2]), L = k.map(x => +x[3]), C = k.map(x => +x[4]);
  const tr = C.map((c, i) => i ? Math.max(H[i] - L[i], Math.abs(H[i] - C[i - 1]), Math.abs(L[i] - C[i - 1])) : H[i] - L[i]); return tr.slice(-n).reduce((a, b) => a + b, 0) / n; }
async function fetchMTF(sym) {
  const pair = symInfo(sym).pair; if (!pair) { S.mtf = { sym, st:'na' }; return; }
  if (S.mtf && S.mtf.sym === sym && (S.mtf.st === 'loading' || Date.now() - (S.mtf.at || 0) < 60000)) return;
  S.mtf = { ...(S.mtf && S.mtf.sym === sym ? S.mtf : {}), sym, st:'loading' };
  try {
    const rows = await Promise.all(MTF.map(async ([tf, lab]) => {
      const k = await binanceKlines(pair, tf, 120), C = k.map(x => +x[4]), e20 = ema(C, 20), e50 = ema(C, 50), n = C.length - 1;
      const up = C[n] > e20[n] && e20[n] > e50[n], dn = C[n] < e20[n] && e20[n] < e50[n];
      return { tf, lab, trend: up ? 1 : dn ? -1 : 0, rsi: rsi(C), atr: atrOf(k), chg: (C[n] / C[n - 1] - 1) * 100, e20: e20[n], e50: e50[n], close: C[n] };
    }));
    S.mtf = { sym, st:'ok', rows, at: Date.now() };
  } catch (e) { S.mtf = { ...S.mtf, st:'error', err: e.message }; }
  if (S.screen === 'tech') renderTechMTF();
}
function sessionNow() {
  const h = thHour(), m = new Date().getUTCMinutes();
  const list = [['asia','เอเชีย','07:00–14:00', h >= 7 && h < 14], ['london','ลอนดอน','14:00–20:00', h >= 14 && h < 20], ['ny','นิวยอร์ก','20:00–05:00', inNY(h)]];
  const cur = list.find(x => x[3]) || ['off','ช่วงเงียบ','05:00–07:00', true];
  return { list, cur, h, m };
}
function renderTech() {
  const s = selSig(); if (!s) return;
  const raw = s.raw, kl = raw.key_levels || {}, p = raw.current_price, dp = s.SY.dp;
  const range = kl.resistance - kl.support, pos = range > 0 ? clamp((p - kl.support) / range, 0, 1) : .5;
  const a = S.atr && S.atr.v, ses = sessionNow();
  const techWarns = s.warns.filter(([t]) => !/โหร/.test(t));
  const agree = Math.sign(s.tech) === Math.sign(s.eso) && s.tech !== 0;
  $('#v-tech').innerHTML = `<div class="page">
    <div class="page-head">
      <div style="display:flex;flex-direction:column;gap:8px">
        <div class="kicker">Technical Readout · ${s.sym} · ${s.time}</div>
        <h1 style="font-size:40px;font-weight:500">ห้องเทคนิค</h1>
        <div style="font-size:15px;color:var(--t2)">ราคา <span style="color:var(--t1)">${s.price}</span> · ${s.dirLbl} · เกรด ${s.grade}</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:2px"><span class="muted xs">tech_score · น้ำหนัก 70%</span><span class="num" style="font-size:48px;color:${vc(s.tech)}">${countHTML(s.tech)}</span></div>
    </div>
    ${s.isTrap ? `<div class="banner trap" role="alert"><span class="hazard"></span><span class="ic">${ic('alert', 20)}</span><div><b>เกรด ${s.grade} · ระวังกับดัก</b><span style="color:var(--t2)">${esc(s.trapNote)}</span></div></div>` : ''}
    <div class="grid-3">
      <div class="bp card">${CORNERS}
        <div class="card-title"><span class="h">คะแนนแต่ละชั้น</span><span class="muted xs">component_scores</span></div>
        ${s.comps.map(([n, v]) => `<div style="display:flex;flex-direction:column;gap:6px"><div class="row"><span>${n}</span><span style="color:${vc(v)};font-weight:500">${countHTML(v)}</span></div><div role="img" aria-label="${n} ${v}">${barHTML(v)}</div></div>`).join('')}
        <div class="scale" style="border-top:1px solid var(--bd-s);padding-top:8px"><span>−100 ลบ</span><span>0</span><span>บวก +100</span></div>
      </div>
      <div class="bp card">${CORNERS}
        <div class="card-title"><span class="h">แนวรับ – แนวต้าน</span><span class="muted xs">key_levels</span></div>
        <div style="display:grid;grid-template-columns:auto minmax(0,1fr);gap:16px;align-items:stretch;min-height:200px">
          <div style="position:relative;width:10px;border:1px solid var(--bd);background:linear-gradient(to top,color-mix(in oklch,var(--bull) 20%,transparent),transparent 40%,transparent 60%,color-mix(in oklch,var(--bear) 20%,transparent))">
            <span style="position:absolute;left:-5px;right:-5px;height:2px;background:var(--acc);bottom:calc(${(pos * 100).toFixed(1)}% - 1px)"></span></div>
          <div style="display:flex;flex-direction:column;justify-content:space-between;gap:10px">
            ${[['แนวต้าน', kl.resistance, 'var(--bear)'], ['ราคาตอนนี้', p, 'var(--acc)'], ['แนวรับ', kl.support, 'var(--bull)']].map(([l, v, c], i) => `<div style="display:flex;flex-direction:column;gap:2px">
              <span class="muted xs">${l}</span><b style="font:500 22px var(--font-heading);color:${i === 1 ? 'var(--t1)' : c}">${fmt(v, dp)}</b>
              ${i === 1 ? `<span class="xs muted">อยู่ ${Math.round(pos * 100)}% ของกรอบ</span>` : `<span class="xs" style="color:var(--t2)">ห่าง ${fmt(Math.abs(v - p), dp)}${a ? ' · ' + (Math.abs(v - p) / a).toFixed(1) + ' ATR' : ''}</span>`}</div>`).join('')}
          </div>
        </div>
        <span class="muted xs">กรอบกว้าง ${fmt(range, dp)}${a ? ' · ' + (range / a).toFixed(1) + ' ATR(H1)' : ''}</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:20px;min-width:0">
        <div class="bp card">${CORNERS}
          <div class="card-title"><span class="h">ช่วงตลาด</span><span class="muted xs">เวลาไทย · ${thTime(new Date()).slice(0, 5)}</span></div>
          ${ses.list.map(([k, l, t, on]) => `<div class="row" style="padding:6px 0;border-top:1px solid var(--bd-s)"><span style="display:flex;gap:8px;align-items:center;${on ? 'color:var(--t1);font-weight:600' : 'color:var(--t3)'}"><span style="width:8px;height:8px;${on ? 'background:' + (k === 'ny' ? 'var(--warn)' : 'var(--acc)') : 'border:1px solid var(--bd-x)'}"></span>${l}</span><span class="xs ${on ? '' : 'muted'}">${t}${k === 'ny' ? ' · กฎ: ห้ามเทรด' : ''}</span></div>`).join('')}
          <div class="row" style="border-top:1px solid var(--bd-s);padding-top:8px"><span style="color:var(--t2)">ATR(14) H1</span><b style="font-weight:500">${a ? fmt(a, 2) : '—'}</b></div>
        </div>
        <div class="bp card">${CORNERS}
          <div class="card-title"><span class="h" style="color:var(--warn)">คำเตือนเทคนิค</span><span class="muted xs">${techWarns.length}</span></div>
          ${techWarns.length ? techWarns.map(([t, c]) => `<div class="warn-line"><span style="color:${c};margin-top:2px">${ic('alert')}</span><span>${esc(t)}</span></div>`).join('')
            : `<div class="warn-line" style="color:var(--t2)"><span style="color:var(--bull)">${ic('check')}</span>ไม่มีคำเตือนเทคนิครอบนี้</div>`}
        </div>
      </div>
    </div>
    <div class="bp">${CORNERS}
      <div class="card-head"><span class="h">หลายกรอบเวลา</span><span class="muted xs" id="mtf-meta"></span></div>
      <div id="mtf"></div>
    </div>
    <div class="bp glass" style="padding:20px 24px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr)) auto;gap:32px;align-items:center">${CORNERS}
      ${duoRows(s).map(([, full, v]) => `<div style="display:flex;flex-direction:column;gap:8px"><div class="row"><span style="color:var(--t2)">${full}</span><span style="color:${vc(v)};font-weight:500">${countHTML(v)}</span></div>${barHTML(v)}</div>`).join('')}
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px"><span class="muted xs">เทคนิค × โหร</span><span style="font:600 20px var(--font-heading);color:${agree ? 'var(--bull)' : 'var(--warn)'}">${agree ? 'ไปทางเดียวกัน' : 'ชี้คนละทาง'}</span><a href="#" data-act="go:oracle" class="xs">เปิดห้องโหร</a></div>
    </div>
  </div>`;
  if (!S.atr || (S.atr.st !== 'loading' && Date.now() - (S.atr.at || 0) > 300000)) fetchATR();
  renderTechMTF(); fetchMTF(s.sym);
}
function renderTechMTF() {
  const box = $('#mtf'); if (!box) return;
  const m = S.mtf, s = selSig();
  if (!m || m.sym !== (s && s.sym) || (m.st === 'loading' && !m.rows)) { box.innerHTML = '<div class="empty-row">กำลังดึงแท่งเทียน 5 กรอบเวลา…</div>'; return; }
  if (m.st === 'na') { box.innerHTML = '<div class="empty-row">สินทรัพย์นี้ไม่มีข้อมูลจาก Binance</div>'; return; }
  if (!m.rows) { box.innerHTML = '<div class="empty-row">ดึงข้อมูลไม่ได้ · ' + esc(m.err || '') + '</div>'; return; }
  const up = m.rows.filter(r => r.trend > 0).length, dn = m.rows.filter(r => r.trend < 0).length;
  $('#mtf-meta').textContent = 'ขาขึ้น ' + up + ' · ขาลง ' + dn + ' · ไซด์เวย์ ' + (m.rows.length - up - dn) + ' · ' + thTime(new Date(m.at)).slice(0, 5);
  const T = t => t > 0 ? ['▲ ขาขึ้น', 'var(--bull)'] : t < 0 ? ['▼ ขาลง', 'var(--bear)'] : ['◆ ไซด์เวย์', 'var(--t2)'];
  box.innerHTML = '<div style="display:grid;grid-template-columns:repeat(5,minmax(0,1fr))">' + m.rows.map((r, i) => { const [tl, tc] = T(r.trend), rc = r.rsi >= 70 ? 'var(--bear)' : r.rsi <= 30 ? 'var(--bull)' : 'var(--t1)';
    return '<div style="padding:14px 16px;display:flex;flex-direction:column;gap:8px;min-width:0;' + (i ? 'border-left:1px solid var(--bd-s)' : '') + '">' +
      '<div class="row"><b style="font:600 18px var(--font-heading)">' + r.lab + '</b><span class="xs" style="color:' + vc(r.chg) + '">' + (r.chg >= 0 ? '+' : '−') + Math.abs(r.chg).toFixed(2) + '%</span></div>' +
      '<span style="font:600 15px var(--font-heading);color:' + tc + '">' + tl + '</span>' +
      '<div class="row xs"><span class="muted">RSI 14</span><span style="color:' + rc + ';font-weight:500">' + r.rsi.toFixed(0) + (r.rsi >= 70 ? ' · ซื้อมาก' : r.rsi <= 30 ? ' · ขายมาก' : '') + '</span></div>' +
      '<div style="height:4px;background:var(--e3);position:relative"><span style="position:absolute;top:0;bottom:0;left:0;width:' + r.rsi.toFixed(0) + '%;background:' + rc + '"></span></div>' +
      '<div class="row xs"><span class="muted">ATR 14</span><span>' + fmt(r.atr, 2) + '</span></div>' +
      '<div class="row xs"><span class="muted">EMA20 / 50</span><span>' + fmt(r.e20, 0) + ' / ' + fmt(r.e50, 0) + '</span></div></div>'; }).join('') + '</div>' +
    '<div class="muted xs" style="padding:10px 16px;border-top:1px solid var(--bd-s)">แนวโน้ม = ราคาปิดเทียบ EMA20 และ EMA50 · คำนวณจากแท่งเทียน Binance ' + esc(symInfo(m.sym).pair) + ' ในเบราว์เซอร์ · อัปเดตทุก 1 นาทีเมื่อเปิดหน้านี้</div>';
}

function renderOracle() {
  const s = selSig(); if (!s) return;
  $('#oracle').innerHTML = `
    <div class="page-head">
      <div style="display:flex;flex-direction:column;gap:8px">
        <div class="kicker" style="color:var(--cel)">Celestial &amp; Coin Readout · ${s.sym} · ${s.time}</div>
        <h1 style="font-size:40px;font-weight:500">ห้องโหร</h1>
        <div style="font-size:15px;color:var(--t2)">อ่านจาก archetype: <span style="color:var(--t1)">${esc(s.archetype)}</span></div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:2px"><span class="muted xs">eso_score</span><span class="num" style="font-size:48px;color:${vc(s.eso)}">${countHTML(s.eso)}</span></div>
    </div>
    ${s.isTrap ? `<div class="banner trap" role="alert"><span class="hazard"></span><span class="ic">${ic('alert', 20)}</span><div><b>เกรด ${s.grade} · ระวังกับดัก</b><span style="color:var(--t2)">${esc(s.trapNote)}</span></div></div>` : ''}
    <div class="oracle-grid">
      <div class="bp glass" style="padding:24px;display:flex;flex-direction:column;gap:20px">${CORNERS}
        <div class="card-title"><span class="h" style="font-size:15px">ดิถีจันทร์</span><span class="muted sm">คำนวณจาก timestamp</span></div>
        <div style="display:flex;align-items:center;gap:24px">
          <svg width="120" height="120" viewBox="0 0 100 100" role="img" aria-label="${s.moon.aria}"><circle cx="50" cy="50" r="40" style="fill:var(--e2);stroke:var(--bd-x)"></circle><path d="${s.moon.path}" style="fill:var(--cel)"></path></svg>
          <div style="display:flex;flex-direction:column;gap:6px"><span style="font:600 28px/1.1 var(--font-heading)">${esc(s.moon.th)}</span><span class="muted sm">${esc(s.moon.en)}</span><span style="color:var(--cel)">${s.moon.lunar}</span></div>
        </div>
        <div class="stats"><div><span>ความสว่าง</span><b style="font-size:22px">${s.moon.illum}</b></div><div><span>อายุจันทร์</span><b style="font-size:22px">${s.moon.age}</b></div><div><span>ถึงเพ็ญ/ดับ</span><b style="font-size:22px">${s.moon.next}</b></div></div>
        <div style="display:flex;flex-direction:column;gap:14px;flex:1;border-top:1px solid var(--bd-s);padding-top:16px">
          <div class="seg" role="tablist" aria-label="ข้อมูลเสริม" style="align-self:flex-start;flex-wrap:wrap">${OR_TABS.map(([k, l]) => `<button role="tab" data-act="or-tab:${k}" aria-pressed="${S.orTab === k}" aria-selected="${S.orTab === k}">${l}</button>`).join('')}</div>
          <div id="orx" style="flex:1;display:flex;flex-direction:column;gap:12px;min-height:220px"></div>
        </div>
      </div>
      <div class="bp glass" style="padding:24px;display:flex;flex-direction:column;gap:18px">${CORNERS}
        <div class="card-title"><span class="h" style="font-size:15px">ผลเหรียญ 99 รอบ</span><span class="muted sm">Coin:${s.coin.raw}</span></div>
        <div class="coins" id="coins" role="img" aria-label="ออกหัว ${s.coin.heads} ก้อย ${s.coin.tails}">${Array.from({ length:99 }, () => '<i></i>').join('')}</div>
        <div class="stats"><div><span>หัว</span><b style="color:var(--cel)">${s.coin.has ? s.coin.heads : '—'}</b></div><div><span>ก้อย</span><b>${s.coin.has ? s.coin.tails : '—'}</b></div><div><span>ความเอียง</span><b style="color:${s.coin.biasC}">${s.coin.bias}</b></div></div>
      </div>
    </div>
    <div class="bp glass" style="padding:20px 24px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr)) auto;gap:32px;align-items:center">${CORNERS}
      ${duoRows(s).map(([, full, v]) => `<div style="display:flex;flex-direction:column;gap:8px"><div class="row"><span style="color:var(--t2)">${full}</span><span style="color:${vc(v)};font-weight:500">${countHTML(v)}</span></div>${barHTML(v)}</div>`).join('')}
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:2px"><span class="muted xs">สถานะ</span><span style="font:600 20px var(--font-heading);color:${s.stateC}">${s.stateLbl}</span></div>
    </div>`;
  const cells = $('#coins').children, heads = s.coin.has ? s.coin.heads : 0;
  if (reduced()) { for (let i = 0; i < heads; i++) cells[i].classList.add('h'); }
  else for (let i = 0; i < heads; i++) setTimeout(() => cells[i] && cells[i].classList.add('h'), i * 8);
  renderOrx(s);
  startStars();
}

// ───────────────────────── ห้องโหร: ข้อมูลเสริม 3 แท็บ
const OR_TABS = [['hour','ยามดาว'],['phase','สถิติตามดิถี'],['radar','วงล้อพลังงาน']];
// ลำดับคัลเดียน · ดาวประจำวัน อา–ส
const PLANETS = { sun:['☉','ดาวอาทิตย์','แรง · เทรนด์ชัด'], moon:['☽','ดาวจันทร์','แกว่ง · อารมณ์ตลาด'], mars:['♂','ดาวอังคาร','ผันผวน · ระวังไส้เทียน'],
  mercury:['☿','ดาวพุธ','เร็ว · ข่าวเยอะ'], jupiter:['♃','ดาวพฤหัส','ขยายตัว · ไปต่อ'], venus:['♀','ดาวศุกร์','นิ่ง · ค่อนข้างปลอดภัย'], saturn:['♄','ดาวเสาร์','หน่วง · ไซด์เวย์'] };
const CHALDEAN = ['saturn','jupiter','mars','sun','venus','mercury','moon'];
const DAY_RULER = ['sun','moon','mars','mercury','jupiter','venus','saturn'];
const DAY_TH = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์'];
// ยามละ 1 ชม. เริ่ม 06:00 น. เวลาไทย (ประมาณจากพระอาทิตย์ขึ้นกรุงเทพฯ)
function planetaryAt(ms) {
  const th = new Date(ms + 7 * 3600e3), h = th.getUTCHours();
  const dayShift = h < 6 ? -1 : 0, wd = (th.getUTCDay() + dayShift + 7) % 7, hourIdx = (h - 6 + 24) % 24;
  const day = DAY_RULER[wd], hour = CHALDEAN[(CHALDEAN.indexOf(day) + hourIdx) % 7];
  return { day, hour, wd, hourIdx, start: Math.floor(ms / 3600e3) * 3600e3 };
}
const moonBucket = age => age < 1.85 || age >= SYN - 1.85 ? 'new' : age < 12.9 ? 'wax' : age < 16.6 ? 'full' : 'wane';
const BUCKETS = [['new','เดือนดับ'],['wax','ข้างขึ้น'],['full','จันทร์เพ็ญ'],['wane','ข้างแรม']];
function renderOrx(s) {
  const box = $('#orx'); if (!box || !s) return;
  const raw = S.data[s.sym] || {}, tab = S.orTab;
  if (tab === 'hour') {
    const now = Date.now(), p = planetaryAt(now), api = raw.planetary_day || raw.planetary || null;
    const dayK = (typeof api === 'string' && PLANETS[api.toLowerCase()]) ? api.toLowerCase() : p.day;
    const dayScore = typeof raw.planetary_score === 'number' ? raw.planetary_score : null;
    const left = Math.max(0, p.start + 3600e3 - now), mm = Math.ceil(left / 60000);
    const P = k => PLANETS[k], next = Array.from({ length:6 }, (_, i) => { const q = planetaryAt(p.start + (i + 1) * 3600e3 + 1); return [thTime(new Date(p.start + (i + 1) * 3600e3)).slice(0, 5), q.hour]; });
    box.innerHTML =
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
      [['ดาวประจำวัน' + DAY_TH[p.wd], dayK, dayScore != null ? sgn(dayScore) + ' คะแนน' : ''], ['ดาวประจำยามนี้', p.hour, 'เหลืออีก ' + mm + ' นาที']].map(([l, k, extra]) =>
        '<div style="border:1px solid var(--bd);padding:12px 14px;display:flex;flex-direction:column;gap:4px;min-width:0"><span class="muted xs">' + l + '</span>' +
        '<div style="display:flex;align-items:baseline;gap:8px"><span style="font-size:26px;line-height:1;color:var(--cel)">' + P(k)[0] + '</span><b style="font:600 20px var(--font-heading)">' + P(k)[1] + '</b></div>' +
        '<span class="sm" style="color:var(--t2)">' + P(k)[2] + '</span>' + (extra ? '<span class="muted xs">' + extra + '</span>' : '') + '</div>').join('') + '</div>' +
      '<div style="display:flex;flex-direction:column;gap:6px"><span class="muted xs">ยามถัดไป</span><div style="display:grid;grid-template-columns:repeat(6,minmax(0,1fr));border:1px solid var(--bd)">' +
      next.map(([t, k], i) => '<div style="padding:8px 4px;display:flex;flex-direction:column;align-items:center;gap:2px;' + (i ? 'border-left:1px solid var(--bd-s);' : '') + (k === 'mars' ? 'color:var(--warn)' : '') + '" title="' + P(k)[1] + ' · ' + P(k)[2] + '"><span class="xs muted">' + t + '</span><span style="font-size:18px;line-height:1.2">' + P(k)[0] + '</span></div>').join('') + '</div></div>' +
      '<span class="muted xs">ยามละ 1 ชั่วโมง นับจาก 06:00 น. ตามลำดับคัลเดียน' + (api ? ' · ดาวประจำวันจาก API' : ' · คำนวณในหน้าบ้าน') + '</span>';
    return;
  }
  if (tab === 'phase') {
    if (J.status !== 'ok') {
      box.innerHTML = '<span class="muted sm">' + (J.status === 'error' ? 'ดึงสมุดเทรดไม่ได้ · ' + esc(J.err) : 'กำลังโหลดสมุดเทรด…') + '</span>';
      if (J.status !== 'loading') fetchJournal().then(() => { if (S.screen === 'oracle' && S.orTab === 'phase') renderOrx(selSig()); });
      return;
    }
    const since = Date.now() - 182 * 864e5, cur = moonBucket(moonAge(new Date()));
    const rows = J.rows.filter(r => String(r.status).toUpperCase() === 'CLOSED' && !r.is_shadow && String(r.type).toLowerCase() === 'short' && Date.parse(r.timestamp_open) >= since);
    const B = BUCKETS.map(([k, l]) => { const g = rows.filter(r => moonBucket(moonAge(new Date(r.timestamp_open))) === k);
      const w = g.filter(r => r.r_multiple > 0).length, lo = g.filter(r => r.r_multiple < 0).length;
      return { k, l, n:g.length, w, lo, wr: w + lo ? w / (w + lo) * 100 : null, r: g.reduce((a, r) => a + (+r.r_multiple || 0), 0) }; });
    box.innerHTML = '<div style="display:flex;flex-direction:column">' + B.map(b =>
      '<div style="display:grid;grid-template-columns:92px minmax(0,1fr) 54px 64px;gap:10px;align-items:center;padding:9px 0;border-top:1px solid var(--bd-s)">' +
      '<span style="' + (b.k === cur ? 'color:var(--cel);font-weight:600' : 'color:var(--t2)') + '">' + b.l + (b.k === cur ? ' · ตอนนี้' : '') + '</span>' +
      '<span style="height:6px;background:var(--e3);position:relative"><span style="position:absolute;inset:0 auto 0 0;width:' + (b.wr ?? 0) + '%;background:' + (b.wr == null ? 'transparent' : b.wr >= 50 ? 'var(--bull)' : 'var(--bear)') + '"></span></span>' +
      '<b style="font:500 17px var(--font-heading);text-align:right;color:' + (b.wr == null ? 'var(--t3)' : b.wr >= 50 ? 'var(--bull)' : 'var(--bear)') + '">' + (b.wr == null ? '—' : Math.round(b.wr) + '%') + '</b>' +
      '<span class="muted xs" style="text-align:right">' + b.n + ' ไม้ · ' + (b.r >= 0 ? '+' : '−') + Math.abs(b.r).toFixed(1) + 'R</span></div>').join('') + '</div>' +
      '<span class="muted xs">Win rate ของไม้ Short ที่ปิดแล้ว 6 เดือนล่าสุด แยกตามดิถีตอนเปิดไม้ · ไม่รวม Shadow · ' + rows.length + ' ไม้' + (S.demo ? ' · ข้อมูลตัวอย่าง' : '') + (rows.length && rows.length < 20 ? ' · ยังน้อย อย่าเพิ่งเชื่อ' : '') + '</span>';
    return;
  }
  // radar: Tech, Moon, Coin, Volatility (−100…+100)
  const m = s.moon, age = moonAge(new Date(raw.timestamp || Date.now())), f = (1 - Math.cos(2 * Math.PI * age / SYN)) / 2;
  const moonV = typeof raw.moon_score === 'number' ? raw.moon_score : Math.round((age < SYN / 2 ? 1 : -1) * f * 100);
  const coinV = typeof raw.coin_score === 'number' ? raw.coin_score : (s.coin.has ? Math.round((s.coin.heads - 49.5) / 49.5 * 100) : 0);
  const volV = +((raw.component_scores || {}).volatility) || 0;
  const ax = [['เทคนิค', s.tech], ['จันทร์', moonV], ['เหรียญ', coinV], ['ความผันผวน', volV]];
  const C = 110, R = 80, pt = (i, k) => { const a = -Math.PI / 2 + i * Math.PI / 2; return [C + Math.cos(a) * R * k, C + Math.sin(a) * R * k]; };
  const ring = k => ax.map((_, i) => pt(i, k).join(',')).join(' ');
  const poly = ax.map(([, v], i) => pt(i, (clamp(v, -100, 100) + 100) / 200).join(',')).join(' ');
  const lab = [[C, 12, 'middle'], [C * 2 - 4, C + 4, 'end'], [C, C * 2 - 2, 'middle'], [4, C + 4, 'start']];
  box.innerHTML = '<div style="display:grid;grid-template-columns:minmax(0,220px) minmax(0,1fr);gap:16px;align-items:center">' +
    '<svg viewBox="0 0 220 220" width="100%" role="img" aria-label="' + ax.map(([l, v]) => l + ' ' + v).join(' · ') + '" style="max-width:220px;overflow:visible">' +
      [.25, .5, .75, 1].map(k => '<polygon points="' + ring(k) + '" style="fill:none;stroke:' + (k === .5 ? 'var(--bd-x)' : 'var(--bd-s)') + ';' + (k === .5 ? 'stroke-dasharray:3 3' : '') + '"></polygon>').join('') +
      ax.map((_, i) => '<line x1="' + C + '" y1="' + C + '" x2="' + pt(i, 1)[0] + '" y2="' + pt(i, 1)[1] + '" style="stroke:var(--bd-s)"></line>').join('') +
      '<polygon points="' + poly + '" style="fill:color-mix(in oklch,var(--cel) 18%,transparent);stroke:var(--cel);stroke-width:1.5"></polygon>' +
      ax.map(([, v], i) => { const [x, y] = pt(i, (clamp(v, -100, 100) + 100) / 200); return '<circle cx="' + x + '" cy="' + y + '" r="3.5" style="fill:' + vc(v) + '"></circle>'; }).join('') +
      ax.map(([l], i) => '<text x="' + lab[i][0] + '" y="' + lab[i][1] + '" text-anchor="' + lab[i][2] + '" style="font:500 11px var(--font-body);fill:var(--t3)">' + l + '</text>').join('') +
    '</svg>' +
    '<div style="display:flex;flex-direction:column">' + ax.map(([l, v]) => '<div class="row" style="padding:8px 0;border-top:1px solid var(--bd-s)"><span style="color:var(--t2)">' + l + '</span><b style="font:500 18px var(--font-heading);color:' + vc(v) + '">' + sgn(v) + '</b></div>').join('') + '</div></div>' +
    '<span class="muted xs">วงประ = 0 · ขอบนอก = +100 · กลาง = −100' + (typeof raw.moon_score === 'number' ? '' : ' · จันทร์คิดจากความสว่างและข้างขึ้น/แรม') + '</span>';
}

// count-up + bar grow on fresh render
function animateIn() {
  if (reduced()) return;
  const root = document.querySelector('main');
  root.querySelectorAll('.fill[data-k]').forEach(el => { const k = el.dataset.k; el.style.transition = 'none'; el.style.transform = 'scaleX(0)'; el.getBoundingClientRect(); el.style.transition = ''; el.style.transform = `scaleX(${k})`; });
  const els = [...root.querySelectorAll('[data-count]')], t0 = performance.now();
  const step = now => { const t = Math.min(1, (now - t0) / 600), e = 1 - Math.pow(1 - t, 4);
    els.forEach(el => { el.textContent = sgn(Math.round(+el.dataset.count * e)); }); if (t < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}

// ───────────────────────── chart (Lightweight Charts)
let chart = null, series = null, priceLines = [], candles = null;
const cssColor = (() => { let cx; return (v, a = 1) => {
  cx = cx || document.createElement('canvas').getContext('2d', { willReadFrequently:true });
  cx.clearRect(0, 0, 2, 2); cx.fillStyle = '#000'; cx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue(v).trim(); cx.fillRect(0, 0, 1, 1);
  const d = cx.getImageData(0, 0, 1, 1).data; return `rgba(${d[0]},${d[1]},${d[2]},${(a * d[3] / 255).toFixed(3)})`; }; })();
function chartOpts() {
  const t3 = cssColor('--t3'), bd = cssColor('--bd'), ch = { color:cssColor('--bd-x'), width:1, style:3, labelBackgroundColor:cssColor('--e3') };
  return { layout:{ background:{ type:'solid', color:'rgba(0,0,0,0)' }, textColor:t3, fontFamily:'Barlow, "Noto Sans Thai", sans-serif', fontSize:11 },
    grid:{ vertLines:{ color:cssColor('--bd', .35) }, horzLines:{ color:cssColor('--bd', .35) } },
    rightPriceScale:{ borderColor:bd, scaleMargins:{ top:.12, bottom:.08 } }, timeScale:{ borderColor:bd, timeVisible:true, secondsVisible:false, rightOffset:4 },
    crosshair:{ mode:0, vertLine:ch, horzLine:ch } };
}
function seriesOpts() { const u = cssColor('--bull'), d = cssColor('--bear'); return { upColor:u, downColor:d, borderVisible:false, wickUpColor:u, wickDownColor:d, priceLineVisible:false }; }
function ensureChart() {
  if (chart || !window.LightweightCharts) { if (!window.LightweightCharts) setTimeout(ensureChart, 200); return; }
  chart = LightweightCharts.createChart($('#chart'), { autoSize:true, ...chartOpts() });
  series = chart.addCandlestickSeries(seriesOpts());
  syncChart(true);
}
function syncChart(fit) {
  if (!series) return;
  series.setData(candles || []);
  loadTradeMarkers();
  priceLines.forEach(l => series.removePriceLine(l)); priceLines = [];
  const d = S.data[S.csym];
  if (d) {
    const SY = symInfo(d.symbol), p = d.current_price, t2 = cssColor('--t2');
    series.applyOptions({ priceFormat:{ type:'price', precision:SY.dp, minMove:Math.pow(10, -SY.dp) } });
    priceLines = [[d.key_levels.resistance,'แนวต้าน',t2,2],[planOf(d).tp,'TP',cssColor('--bull'),0],[planOf(d).entry,'เข้า',cssColor('--acc'),0],[planOf(d).sl,'SL',cssColor('--bear'),0],[d.key_levels.support,'แนวรับ',t2,2]]
      .map(([price, title, color, lineStyle]) => series.createPriceLine({ price, title, color, lineStyle, lineWidth:1, axisLabelVisible:true }));
  }
  const at = $('#chart-atr'); if (at) { const a = d && (typeof d.atr === 'number' ? d.atr : apiAtr(S.csym)); at.hidden = !a; if (a) { at.textContent = 'ATR(14): ' + fmt(a, 2) + ' · ' + (typeof (d && d.atr) === 'number' ? 'API' : 'Binance'); } }
  if (fit && candles) chart.timeScale().fitContent();
}
async function fetchCandles(silent) {
  const sym = S.csym, tf = S.tf, SY = symInfo(sym);
  if (!sym || !SY.pair) { candles = null; S.candleState = 'none'; if (S.screen === 'dash') renderDash(); syncChart(); return; }
  if (!silent) { S.candleState = 'loading'; if (S.screen === 'dash' && !$('#v-dash').hidden) renderDash(); }
  try {
    const k = await binanceKlines(SY.pair, tf, 150);
    if (sym !== S.csym || tf !== S.tf) return;
    candles = k.map(x => ({ time:Math.floor(x[0] / 1000) + 25200, open:+x[1], high:+x[2], low:+x[3], close:+x[4] })); // +7 ชม. = เวลาไทย
    S.candleState = 'ok';
  } catch (e) { if (silent) return; candles = null; S.candleState = 'fail'; }
  if (!$('#v-dash').hidden) renderDash();
  syncChart(!silent);
}

// ───────────────────────── oracle stars
let starsRaf = 0, stars = null;
function startStars() {
  cancelAnimationFrame(starsRaf);
  const cv = $('#stars');
  const loop = () => {
    if ($('#v-oracle').hidden) return;
    const w = cv.clientWidth, h = cv.clientHeight, dpr = devicePixelRatio || 1;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); stars = null; }
    if (!stars) stars = Array.from({ length:Math.round(clamp(w * h / 22000, 30, 50)) }, () => ({ x:Math.random() * w, y:Math.random() * h, vx:(Math.random() - .5) * .1, vy:(Math.random() - .5) * .1, r:.6 + Math.random() * 1.1, a:.18 + Math.random() * .3, g:Math.random() < .12 }));
    const ctx = cv.getContext('2d'), css = getComputedStyle(document.documentElement), star = css.getPropertyValue('--t1').trim(), gold = css.getPropertyValue('--cel').trim();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
    if (!reduced() && !document.hidden) stars.forEach(s => { s.x = (s.x + s.vx + w) % w; s.y = (s.y + s.vy + h) % h; });
    ctx.strokeStyle = star; ctx.lineWidth = .6;
    for (let i = 0; i < stars.length; i++) for (let j = i + 1; j < stars.length; j++) { const d = Math.hypot(stars[i].x - stars[j].x, stars[i].y - stars[j].y);
      if (d < 120) { ctx.globalAlpha = .08 * (1 - d / 120); ctx.beginPath(); ctx.moveTo(stars[i].x, stars[i].y); ctx.lineTo(stars[j].x, stars[j].y); ctx.stroke(); } }
    stars.forEach(s => { ctx.globalAlpha = s.a; ctx.fillStyle = s.g ? gold : star; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.283); ctx.fill(); });
    ctx.globalAlpha = 1;
    starsRaf = requestAnimationFrame(loop);
  };
  starsRaf = requestAnimationFrame(loop);
}

// ───────────────────────── sketch (Fabric.js)
let fc = null, hist = [], redoStack = [], silent = false, drag = null, saveT = 0;
const COLORS = [['--cel','ทอง'],['--bull','เขียว'],['--bear','แดง'],['--acc','ม่วง'],['--t1','ขาว/ดำ']];
const WIDTHS = [[2,'1px','บาง'],[3,'2px','กลาง'],[6,'4px','หนา']];
const TOOLS = [['select','เลือก','pointer','V'],['pen','ปากกา','pencil','P'],['line','เส้น','slash','L'],['hline','แนวราคา','minus','H'],['arrow','ลูกศร','arrowUR','A'],['rect','กรอบ','square','R'],['text','ข้อความ','type','T'],['eraser','ยางลบ','eraser','E']];
const colorVal = () => cssColor(COLORS[S.colorIx][0]);
const widthVal = () => WIDTHS[S.widthIx][0];
const curShot = () => S.shots.find(x => x.id === S.shotId);
function persistShots() { let list = S.shots; while (list.length && !ls.set('cta-sketch', list)) list = list.slice(0, -1); }

function freeze() {
  if (!chart || !candles) { toast('ยังไม่มีกราฟให้ฟรีซ'); return; }
  const W = 1200, H = 600;
  const TOP = 40, CH = H - TOP, d0 = S.data[S.csym];
  let shot, auto = null;
  try {
    chart.applyOptions({ autoSize:false }); chart.resize(W, CH, true);
    // พิกัดจริงจากกราฟ (หลัง resize เป็นขนาดภาพ ก่อนแคปเจอร์)
    if (d0) {
      const pl = planOf(d0), kl = d0.key_levels || {}, last = candles[candles.length - 1];
      const cy = p => { const v = typeof p === 'number' ? series.priceToCoordinate(p) : null; return v == null ? null : TOP + clamp(v, 0, CH); };
      const paneW = chart.timeScale().width(), xn = chart.timeScale().timeToCoordinate(last.time);
      auto = { dp: symInfo(d0.symbol).dp, paneW, x_now: xn == null ? paneW - 40 : clamp(xn, 0, paneW),
        entry: pl.entry, tp: pl.tp, sl: pl.sl, res: kl.resistance, sup: kl.support,
        y_entry: cy(pl.entry), y_tp: cy(pl.tp), y_sl: cy(pl.sl), y_res: cy(kl.resistance), y_sup: cy(kl.support) };
    }
    shot = chart.takeScreenshot();
  } finally { chart.applyOptions({ autoSize:true }); }
  const out = document.createElement('canvas'); out.width = W; out.height = H;
  const x = out.getContext('2d'), d = S.data[S.csym], tfL = (TFS.find(t => t[0] === S.tf) || [, ''])[1], now = new Date();
  x.fillStyle = cssColor('--bg'); x.fillRect(0, 0, W, H); x.drawImage(shot, 0, 40, W, H - 40);
  x.textBaseline = 'middle'; x.fillStyle = cssColor('--t1'); x.font = '600 20px Barlow, "Noto Sans Thai", sans-serif';
  x.fillText(`${S.csym} · ${tfL}${d ? ' · ' + fmt(d.current_price, symInfo(d.symbol).dp) + ' · เกรด ' + d.grade : ''}`, 16, 21);
  x.fillStyle = cssColor('--t3'); x.font = '400 14px Barlow, "Noto Sans Thai", sans-serif'; x.textAlign = 'right'; x.fillText('ฟรีซเมื่อ ' + thDate(now) + ' · ' + thTime(now), W - 16, 21);
  const img = out.toDataURL('image/png');
  const s = { id:'sh' + Date.now(), img, thumb:img, sym:S.csym, tf:tfL, at:Date.now(), objs:null, auto };
  S.shots = [s, ...S.shots].slice(0, 8); S.shotId = s.id; S.tool = 'pen'; persistShots();
  go('sketch'); toast('ฟรีซกราฟแล้ว · วาดได้เลย');
}
function renderSketch() {
  const cur = curShot();
  $('#sk-back').innerHTML = ic('back') + 'กลับ';
  $('#sk-meta').textContent = cur ? `${cur.sym} · ${cur.tf} · ฟรีซเมื่อ ${thDate(new Date(cur.at))} ${thTime(new Date(cur.at))}` : 'ฟรีซกราฟจากหน้าฟีด แล้วมาวาดเขียนที่นี่';
  $('#sk-head-actions').innerHTML = cur ? `<button class="btn btn-ghost" data-act="shot-del">${ic('trash')}ลบภาพนี้</button><button class="btn btn-primary" data-act="download">${ic('download')}ดาวน์โหลด PNG</button>` : '';
  $('#sk-empty').hidden = !!cur; $('#sk-main').hidden = !cur; $('#sk-empty-ic').innerHTML = ic('snow', 20);
  if (!cur) return;
  $('#sk-tools').innerHTML = TOOLS.map(([k, l, i, key]) => `<button data-act="tool:${k}" aria-pressed="${S.tool === k}" title="${l} (${key})" style="${S.tool === k ? 'background:var(--e3)' : ''}">${ic(i)}${l}</button>`).join('');
  $('#sk-colors').innerHTML = COLORS.map(([v, l], i) => `<button role="radio" aria-checked="${S.colorIx === i}" aria-label="${l}" title="${l}" data-act="color:${i}"><span style="background:var(${v})"></span></button>`).join('');
  $('#sk-widths').innerHTML = WIDTHS.map(([, h, l], i) => `<button role="radio" aria-pressed="${S.widthIx === i}" aria-label="เส้น${l}" title="เส้น${l}" data-act="width:${i}" style="${S.widthIx === i ? 'background:var(--e3)' : ''}"><span style="height:${h}"></span></button>`).join('');
  updateUndoBtns();
  $('#sk-dup').innerHTML = ic('copy'); $('#sk-del').innerHTML = ic('trash');
  $('#sk-count').textContent = 'ภาพที่ฟรีซไว้ · ' + S.shots.length;
  $('#sk-shots').innerHTML = S.shots.map(x => `<button data-act="shot:${x.id}" aria-pressed="${x.id === S.shotId}"><span class="th" style="background-image:url(${x.thumb || x.img})"></span><small>${esc(x.sym)} · ${x.tf} · ${thTime(new Date(x.at))}</small></button>`).join('');
  ensureFabric();
}
function updateUndoBtns() {
  const u = $('#sk-undo'), r = $('#sk-redo');
  u.innerHTML = ic('undo') + 'ย้อนกลับ'; r.innerHTML = ic('redo') + 'ทำซ้ำ';
  u.disabled = hist.length < 2; r.disabled = !redoStack.length;
}
function ensureFabric() {
  if (!window.fabric) { setTimeout(ensureFabric, 200); return; }
  if (!fc) {
    const host = $('#fabric-host'), cv = document.createElement('canvas'); host.appendChild(cv);
    fc = new fabric.Canvas(cv, { width:1200, height:600, preserveObjectStacking:true, selectionColor:'rgba(150,140,240,.08)', selectionBorderColor:cssColor('--acc') });
    fc.on('mouse:down', o => {
      const t = S.tool; if (t === 'select' || t === 'pen') return;
      const p = fc.getPointer(o.e);
      if (t === 'eraser') { if (o.target) { silent = true; fc.remove(o.target); silent = false; pushHist(); } return; }
      if (t === 'text') { const tx = new fabric.IText('ข้อความ', { left:p.x, top:p.y, fill:colorVal(), fontSize:22, fontFamily:'Barlow, "Noto Sans Thai", sans-serif' });
        fc.add(tx); setTool('select'); fc.setActiveObject(tx); tx.enterEditing(); tx.selectAll(); return; }
      if (t === 'hline') { fc.add(makeShape('hline', p.x, p.y, p.x, p.y)); return; }
      drag = { x:p.x, y:p.y, obj:null, end:p };
    });
    fc.on('mouse:move', o => { if (!drag) return; const p = fc.getPointer(o.e);
      silent = true; if (drag.obj) fc.remove(drag.obj); drag.obj = makeShape(S.tool, drag.x, drag.y, p.x, p.y); drag.obj.set({ selectable:false, evented:false }); drag.end = p; fc.add(drag.obj); silent = false; fc.requestRenderAll(); });
    fc.on('mouse:up', () => { const d = drag; drag = null; if (!d || !d.obj) return;
      silent = true; fc.remove(d.obj); silent = false; if (Math.hypot(d.end.x - d.x, d.end.y - d.y) > 4) fc.add(makeShape(S.tool, d.x, d.y, d.end.x, d.end.y)); });
    ['object:added','object:modified','object:removed'].forEach(ev => fc.on(ev, () => { if (!silent) pushHist(); }));
    fc.on('text:editing:exited', pushHist);
    window.addEventListener('resize', fitFabric);
    fc._shotId = null;
  }
  if (fc._shotId !== S.shotId) loadShot();
  setTimeout(fitFabric, 0);
}
function fitFabric() { const host = $('#fabric-host'); if (!fc || !host.clientWidth) return; const w = host.clientWidth; fc.setDimensions({ width:w + 'px', height:Math.round(w / 2) + 'px' }, { cssOnly:true }); fc.calcOffset(); }
function makeShape(t, x1, y1, x2, y2) {
  const base = { stroke:colorVal(), strokeWidth:widthVal(), strokeLineCap:'round', strokeLineJoin:'round', fill:'' };
  if (t === 'rect') return new fabric.Rect({ ...base, fill:'transparent', left:Math.min(x1, x2), top:Math.min(y1, y2), width:Math.abs(x2 - x1), height:Math.abs(y2 - y1), strokeUniform:true });
  if (t === 'hline') return new fabric.Line([0, y1, 1200, y1], { ...base, strokeDashArray:[8, 6], lockMovementX:true });
  if (t === 'arrow') { const a = Math.atan2(y2 - y1, x2 - x1), L = 12 + widthVal() * 2.5;
    return new fabric.Path(`M ${x1} ${y1} L ${x2} ${y2} M ${x2 - L * Math.cos(a - .45)} ${y2 - L * Math.sin(a - .45)} L ${x2} ${y2} L ${x2 - L * Math.cos(a + .45)} ${y2 - L * Math.sin(a + .45)}`, base); }
  return new fabric.Line([x1, y1, x2, y2], base);
}
function setTool(t) {
  S.tool = t; if (!fc) return;
  fc.isDrawingMode = t === 'pen';
  if (t === 'pen') { fc.freeDrawingBrush = new fabric.PencilBrush(fc); fc.freeDrawingBrush.color = colorVal(); fc.freeDrawingBrush.width = widthVal(); }
  fc.selection = t === 'select'; fc.defaultCursor = t === 'select' ? 'default' : 'crosshair';
  fc.forEachObject(o => { o.selectable = t === 'select'; o.evented = t === 'select' || t === 'eraser'; o.hoverCursor = t === 'eraser' ? 'not-allowed' : 'move'; });
  if (t !== 'select') fc.discardActiveObject();
  fc.requestRenderAll();
  if (S.screen === 'sketch') renderSketch();
}
function setStyle(ci, wi) {
  S.colorIx = ci; S.widthIx = wi;
  if (fc) {
    if (fc.isDrawingMode) { fc.freeDrawingBrush.color = colorVal(); fc.freeDrawingBrush.width = widthVal(); }
    const o = fc.getActiveObject();
    if (o) { (o.type === 'activeSelection' ? o.getObjects() : [o]).forEach(x => x.type === 'i-text' ? x.set({ fill:colorVal() }) : x.set({ stroke:colorVal(), strokeWidth:widthVal() })); fc.requestRenderAll(); pushHist(); }
  }
  renderSketch();
}
const snapObjs = () => JSON.stringify(fc.getObjects().map(o => o.toObject()));
function loadShot() {
  const s = curShot(); if (!fc) return;
  silent = true; fc.clear(); hist = []; redoStack = []; silent = false; fc._shotId = S.shotId;
  if (!s) return;
  fc.setBackgroundImage(s.img, () => {
    fc.renderAll();
    const done = () => { hist = [snapObjs()]; setTool(S.tool); updateUndoBtns(); };
    if (!s.objs && s.auto) { silent = true; drawAuto(s.auto); silent = false; fc.renderAll(); s.objs = fc.getObjects().map(o => o.toObject()); delete s.auto; persistShots(); done(); }
    else if (s.objs && s.objs.length) fabric.util.enlivenObjects(s.objs, objs => { silent = true; objs.forEach(o => fc.add(o)); silent = false; fc.renderAll(); done(); });
    else done();
  });
}
// วาดเส้นพยากรณ์ + โซนแนวรับ/ต้าน + ป้ายราคา ลงบนภาพฟรีซ (ลาก/ลบได้ทุกชิ้น)
function drawAuto(a) {
  const W = fc.width, edit = { selectable:true, evented:true, hoverCursor:'move' }, x0 = a.x_now, xR = a.paneW || W, ZH = 20;
  const zone = (y, fill, stroke) => y == null ? null : new fabric.Rect({ left:x0, top:y - ZH / 2, width:Math.max(8, xR - x0), height:ZH, fill, stroke, strokeWidth:1, strokeDashArray:[2, 3], ...edit });
  const objs = [
    zone(a.y_res, 'rgba(239, 68, 68, 0.1)', 'rgba(239, 68, 68, 0.45)'),
    zone(a.y_sup, 'rgba(16, 185, 129, 0.1)', 'rgba(16, 185, 129, 0.45)'),
    a.y_entry != null && a.y_tp != null ? new fabric.Line([x0, a.y_entry, xR, a.y_tp], { stroke:'#10b981', strokeWidth:2, strokeDashArray:[5, 5], ...edit }) : null,
    a.y_entry != null ? new fabric.Circle({ left:x0, top:a.y_entry, radius:4, originX:'center', originY:'center', fill:'#10b981', ...edit }) : null
  ];
  const label = (txt, y, bg) => y == null ? null : new fabric.Text(' ' + txt + ' ', { left:xR - 8, top:y, originX:'right', originY:'center', fontSize:15, fontWeight:600,
    fontFamily:'Barlow, "Noto Sans Thai", sans-serif', fill:'#ffffff', backgroundColor:bg, ...edit });
  objs.push(label('TP: ' + fmt(a.tp, a.dp), a.y_tp, '#059669'), label('Entry: ' + fmt(a.entry, a.dp), a.y_entry, '#475569'), label('SL: ' + fmt(a.sl, a.dp), a.y_sl, '#dc2626'));
  // กันป้ายทับกันเมื่อราคาใกล้กันมาก
  const L = objs.slice(-3).filter(Boolean).sort((p, q) => p.top - q.top);
  for (let i = 1; i < L.length; i++) if (L[i].top - L[i - 1].top < 22) L[i].set('top', L[i - 1].top + 22);
  objs.filter(Boolean).forEach(o => fc.add(o));
  fc.renderAll();
}
function pushHist() {
  if (!fc) return;
  hist.push(snapObjs()); if (hist.length > 60) hist.shift();
  if (!restoring) redoStack = [];
  const t = S.tool; if (t !== 'select') fc.forEachObject(o => { o.selectable = false; o.evented = t === 'eraser'; });
  updateUndoBtns();
  clearTimeout(saveT); saveT = setTimeout(saveShot, 400);
}
let restoring = false;
function restore(snap) {
  const objs = JSON.parse(snap); restoring = true;
  silent = true; fc.getObjects().slice().forEach(o => fc.remove(o));
  fabric.util.enlivenObjects(objs, list => { list.forEach(o => fc.add(o)); silent = false; restoring = false; setTool(S.tool); fc.renderAll(); updateUndoBtns(); clearTimeout(saveT); saveT = setTimeout(saveShot, 400); });
}
function undo() { if (!fc || hist.length < 2) return; redoStack.push(hist.pop()); restore(hist[hist.length - 1]); }
function redo() { if (!fc || !redoStack.length) return; const s = redoStack.pop(); hist.push(s); restore(s); }
function saveShot() {
  const s = curShot(); if (!fc || !s) return;
  s.objs = fc.getObjects().map(o => o.toObject());
  try { s.thumb = fc.toDataURL({ format:'png', multiplier:.15 }); } catch (e) {}
  persistShots();
  const th = document.querySelector(`#sk-shots [data-act="shot:${s.id}"] .th`); if (th) th.style.backgroundImage = `url(${s.thumb})`;
}
function delSel() { if (!fc) return; const o = fc.getActiveObject(); if (!o) { toast('ยังไม่ได้เลือกอะไร · ใช้เครื่องมือ "เลือก" ก่อน'); return; }
  silent = true; (o.type === 'activeSelection' ? o.getObjects() : [o]).forEach(x => fc.remove(x)); fc.discardActiveObject(); silent = false; pushHist(); fc.requestRenderAll(); }
function dupSel() { if (!fc) return; const o = fc.getActiveObject(); if (!o) { toast('ยังไม่ได้เลือกอะไร · ใช้เครื่องมือ "เลือก" ก่อน'); return; }
  o.clone(c => { fc.discardActiveObject(); c.set({ left:c.left + 20, top:c.top + 20, evented:true, selectable:true }); silent = true;
    if (c.type === 'activeSelection') { c.canvas = fc; c.forEachObject(x => fc.add(x)); c.setCoords(); } else fc.add(c);
    silent = false; fc.setActiveObject(c); fc.requestRenderAll(); pushHist(); }); }

// ───────────────────────── journal (GET /api/journal → json.data[])
const J = { status:'idle', rows:[], err:'', at:0, filter:'all' };
let jSeq = 0;
function demoJournal() {
  const p0 = (S.data.XAUUSD && S.data.XAUUSD.current_price) || (candles && candles.length ? candles[candles.length - 1].close : 4000);
  let seed = 7; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const H = 3600e3, base = Math.floor(Date.now() / H) * H, rows = [];
  const res = ['WIN','LOSS','WIN','TIMEOUT','LOSS','WIN','WIN','LOSS','WIN','LOSS','WIN','TIMEOUT','WIN','LOSS'];
  res.forEach((r, i) => {
    const open = base - (4 + i * 5 + Math.floor(rnd() * 3)) * H, dur = (1 + Math.floor(rnd() * 4)) * H;
    const short = i % 5 !== 3, risk = 6 + rnd() * 4, e = +(p0 + (rnd() - .5) * 60).toFixed(2), sgnD = short ? -1 : 1;
    const R = r === 'WIN' ? 2 : r === 'LOSS' ? -1 : +((rnd() - .4) * 1.2).toFixed(2);
    rows.push({ id: 1000 + i, timestamp_open: new Date(open).toISOString(), timestamp_close: new Date(open + dur).toISOString(), symbol:'XAUUSD',
      type: short ? 'short' : 'long', grade: i % 4 === 2 ? 'A' : 'B', entry_price:e, sl:+(e - sgnD * risk).toFixed(2), tp:+(e + sgnD * risk * 2).toFixed(2),
      exit_price:+(e + sgnD * risk * R).toFixed(2), status:'CLOSED', result:r, r_multiple:R,
      mfe_r:+Math.max(.1, R > 0 ? R + rnd() * .4 : rnd() * .8).toFixed(2), mae_r:+(R < 0 ? 1 : rnd() * .7).toFixed(2), is_shadow: i % 4 === 2, tech_score: Math.round((short ? -1 : 1) * (25 + rnd() * 60)), eso_score: Math.round((rnd() - .5) * 120) });
  });
  const e = +(p0 + 4).toFixed(2);
  rows.unshift({ id: 999, timestamp_open: new Date(base - 2 * H).toISOString(), timestamp_close:null, symbol:'XAUUSD', type:'short', grade:'B',
    entry_price:e, sl:+(e + 8).toFixed(2), tp:+(e - 16).toFixed(2), exit_price:null, status:'OPEN', result:null, r_multiple:null, mfe_r:null, mae_r:null, is_shadow:false });
  return rows;
}
async function fetchJournal() {
  if (S.demo) { ++jSeq; J.rows = demoJournal(); J.status = 'ok'; J.err = ''; J.at = Date.now(); loadTradeMarkers(); if (S.screen === 'journal') renderJournal(); return; }
  const seq = ++jSeq; J.status = 'loading'; if (S.screen === 'journal') renderJournal();
  const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 10000);
  try {
    const r = await fetch(`${apiBase()}/api/journal`, { headers:{ Accept:'application/json' }, signal:ctl.signal });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const json = await r.json();
    if (!json || !Array.isArray(json.data)) throw new Error('รูปแบบข้อมูลไม่ตรง (ไม่พบ json.data เป็น Array)');
    if (seq !== jSeq) return;
    J.rows = json.data; J.status = 'ok'; J.err = ''; J.at = Date.now();
    loadTradeMarkers();
  } catch (e) {
    if (seq !== jSeq) return;
    J.status = 'error';
    J.err = e.name === 'AbortError' ? 'หมดเวลา 10 วินาที' : e.message === 'Failed to fetch' ? 'Failed to fetch (เซิร์ฟเวอร์ไม่ตอบ หรือถูก CORS บล็อก)' : e.message;
  } finally { clearTimeout(to); }
  if (S.screen === 'journal') renderJournal();
}
const jTime = ts => { if (!ts) return '—'; const d = new Date(ts); if (isNaN(d)) return '—';
  return d.toLocaleDateString('th-TH', { day:'numeric', month:'short', timeZone:'Asia/Bangkok' }) + ' ' + thTime(d); };
const jPx = (v, sym) => typeof v === 'number' ? fmt(v, symInfo(sym).dp) : '—';
const jR = v => typeof v === 'number' ? (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(2) + 'R' : '—';
const jSide = t => String(t).toLowerCase() === 'short' ? '<span style="color:var(--bear);font-weight:500">▼ Short</span>' : '<span style="color:var(--bull);font-weight:500">▲ Long</span>';
const jShadow = on => on ? `<span class="tag" title="ไม้เงา · บันทึกเพื่อทดสอบ ไม่ได้เข้าเทรดจริง" style="color:var(--t2)">${ic('ghost', 12)}Shadow</span>` : '';
const jRes = r => { const k = String(r || '').toUpperCase();
  const m = { WIN:['ชนะ','var(--bull)','check'], LOSS:['แพ้','var(--bear)','x'], TIMEOUT:['หมดเวลา','var(--t2)','clock'] }[k];
  return m ? `<span style="display:inline-flex;align-items:center;gap:4px;color:${m[1]};font-weight:500">${ic(m[2], 14)}${m[0]}</span>` : '<span class="muted">—</span>'; };
function renderJournal() {
  $('#j-src').textContent = S.demo ? 'ข้อมูลตัวอย่าง · ปิดได้ในหน้าตั้งค่า' : 'GET ' + apiBase().replace(/^https?:\/\//, '') + '/api/journal';
  $('#j-src').style.color = S.demo ? 'var(--warn)' : '';
  const csv = $('#j-csv'); if (csv) { csv.href = apiBase() + '/api/export_csv'; csv.innerHTML = ic('download') + 'ดาวน์โหลด CSV'; csv.title = 'GET ' + apiBase() + '/api/export_csv'; }
  $('#j-last').textContent = J.at ? 'อัปเดต ' + thTime(new Date(J.at)) : '';
  const rb = $('#j-reload'); rb.disabled = J.status === 'loading'; rb.innerHTML = ic(J.status === 'loading' ? 'clock' : 'refresh') + (J.status === 'loading' ? 'กำลังโหลด…' : 'โหลดใหม่');
  const body = $('#j-body');
  if (J.status === 'error' && !J.rows.length) {
    body.innerHTML = `<div class="bp" style="padding:28px 32px;display:flex;flex-direction:column;gap:12px;max-width:640px">${CORNERS}
      <div style="display:flex;align-items:center;gap:10px;color:var(--bear)">${ic('wifiOff', 20)}<span style="font:600 22px var(--font-heading);color:var(--t1)">ดึงสมุดเทรดไม่ได้</span></div>
      <div class="sm" style="color:var(--t2)">ตรวจว่า FastAPI รันอยู่และมี endpoint /api/journal</div>
      <div class="code">GET ${esc(apiBase())}/api/journal · ${esc(J.err)}</div>
      <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn btn-primary" data-act="j-reload">${ic('refresh')}ลองใหม่</button><button class="btn btn-ghost" data-act="demo">ดูด้วยข้อมูลตัวอย่าง</button></div></div>`;
    return;
  }
  if (J.status !== 'ok' && !J.rows.length) {
    body.innerHTML = `<div style="display:flex;flex-direction:column;gap:20px" role="status" aria-label="กำลังโหลด"><div class="grid-3">${'<div class="skel" style="height:150px"></div>'.repeat(3)}</div><div class="skel" style="height:260px"></div></div>`;
    return;
  }
  if (!J.rows.length) {
    body.innerHTML = `<div class="bp" style="padding:48px 32px">${CORNERS}<div class="state-box center" style="margin:0 auto">
      <div style="width:44px;height:44px;border:1px solid var(--bd-x);display:grid;place-items:center;color:var(--acc)">${ic('book', 20)}</div>
      <div style="font:600 24px var(--font-heading)">ยังไม่มีประวัติการเทรดในระบบ</div></div></div>`;
    return;
  }
  const byTime = k => (a, b) => (Date.parse(b[k]) || 0) - (Date.parse(a[k]) || 0);
  const open = J.rows.filter(r => String(r.status).toUpperCase() === 'OPEN').sort(byTime('timestamp_open'));
  const closed = J.rows.filter(r => String(r.status).toUpperCase() === 'CLOSED').sort(byTime('timestamp_close'));
  const lv = (l, v, c) => `<div style="display:flex;flex-direction:column;gap:2px"><span class="muted xs">${l}</span><b style="font:500 18px var(--font-heading);color:${c}">${v}</b></div>`;
  // ── summary (ไม่รวมไม้ Shadow) · PnL($) = r_multiple × Risk_Amount
  const riskAmt = acctRiskAmt(), real = closed.filter(r => !r.is_shadow), shN = closed.length - real.length;
  const day = d => new Date(d).toLocaleDateString('en-CA', { timeZone:'Asia/Bangkok' }), today = day(Date.now());
  const sumR = list => list.reduce((a, r) => a + (typeof r.r_multiple === 'number' ? r.r_multiple : 0), 0);
  const todayList = real.filter(r => r.timestamp_close && day(r.timestamp_close) === today);
  const tR = sumR(todayList), aR = sumR(real);
  const res = k => real.filter(r => String(r.result).toUpperCase() === k).length, W = res('WIN'), L = res('LOSS'), T = res('TIMEOUT');
  const wr = W + L ? W / (W + L) * 100 : null;
  const usd = v => (v > 0 ? '+' : v < 0 ? '−' : '') + '$' + fmt(Math.abs(v), 2), rr = v => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(2) + 'R';
  const sc = (k, big, bigC, sub) => `<div class="bp card" style="gap:8px">${CORNERS}<span class="kicker">${k}</span><span class="num" style="font-size:40px;color:${bigC}">${big}</span><span class="sm" style="color:var(--t2)">${sub}</span></div>`;
  const th = 'text-align:left;font:600 12px var(--font-heading);color:var(--t3);padding:10px 12px;border-bottom:1px solid var(--bd);white-space:nowrap';
  const td = 'padding:10px 12px;border-top:1px solid var(--bd-s);white-space:nowrap';
  // ── analytics (ไม้จริง เรียงตามเวลาปิด)
  const asc = real.slice().sort((a, b) => (Date.parse(a.timestamp_close) || 0) - (Date.parse(b.timestamp_close) || 0));
  let cum = 0, peak = 0, mdd = 0; const pts = [0];
  asc.forEach(r => { cum += typeof r.r_multiple === 'number' ? r.r_multiple : 0; pts.push(cum); peak = Math.max(peak, cum); mdd = Math.max(mdd, peak - cum); });
  const winsL = real.filter(r => r.r_multiple > 0), lossL = real.filter(r => r.r_multiple < 0), avgOf = (l, k) => l.length ? l.reduce((a, r) => a + (+r[k] || 0), 0) / l.length : 0;
  const rs = real.map(r => +r.r_multiple || 0), best = rs.length ? Math.max(...rs) : 0, worst = rs.length ? Math.min(...rs) : 0;
  let streak = 0, stK = ''; for (const r of asc.slice().reverse()) { const k = r.r_multiple > 0 ? 'W' : r.r_multiple < 0 ? 'L' : ''; if (!k) continue; if (!stK) stK = k; if (k !== stK) break; streak++; }
  const EW = 600, EH = 170, lo = Math.min(0, ...pts), hi = Math.max(0, ...pts), span = hi - lo || 1;
  const ex = i => (pts.length > 1 ? i / (pts.length - 1) : 0) * EW, ey = v => 8 + (hi - v) / span * (EH - 16);
  const line = pts.map((v, i) => ex(i).toFixed(1) + ',' + ey(v).toFixed(1)).join(' ');
  const eqC = cum >= 0 ? 'var(--bull)' : 'var(--bear)';
  const BK = [['≤ −1R', r => r <= -1], ['−1 ถึง 0', r => r > -1 && r < 0], ['0 ถึง 1', r => r >= 0 && r < 1], ['1 ถึง 2', r => r >= 1 && r < 2], ['≥ 2R', r => r >= 2]].map(([l, f]) => [l, rs.filter(f).length]);
  const bMax = Math.max(1, ...BK.map(b => b[1]));
  const st = (l, v, c) => `<div style="display:flex;flex-direction:column;gap:2px;padding:10px 12px;border-top:1px solid var(--bd-s)"><span class="muted xs">${l}</span><b style="font:500 20px var(--font-heading);color:${c || 'var(--t1)'}">${v}</b></div>`;
  const analytics = real.length ? `<div class="grid-2" style="margin-bottom:24px;align-items:stretch">
    <div class="bp card">${CORNERS}
      <div class="card-title"><span class="h">เส้นกำไรสะสม</span><span class="muted xs">${real.length} ไม้ · หน่วย R</span></div>
      <svg viewBox="0 0 ${EW} ${EH}" width="100%" height="${EH}" preserveAspectRatio="none" role="img" aria-label="กำไรสะสม ${rr(cum)}" style="overflow:visible">
        <line x1="0" x2="${EW}" y1="${ey(0)}" y2="${ey(0)}" style="stroke:var(--bd-x);stroke-dasharray:4 4" vector-effect="non-scaling-stroke"></line>
        <polygon points="0,${ey(0)} ${line} ${EW},${ey(0)}" style="fill:color-mix(in oklch,${eqC} 12%,transparent)"></polygon>
        <polyline points="${line}" style="fill:none;stroke:${eqC};stroke-width:1.5" vector-effect="non-scaling-stroke"></polyline>
      </svg>
      <div class="row sm"><span class="muted">เริ่ม 0R</span><span>ล่าสุด <b style="color:${eqC};font-weight:600">${rr(cum)} · ${usd(cum * riskAmt)}</b></span></div>
    </div>
    <div class="bp card" style="gap:0">${CORNERS}
      <div class="card-title" style="padding-bottom:10px"><span class="h">สถิติ</span><span class="muted xs">ไม่รวม Shadow</span></div>
      <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr))">
        ${st('ค่าคาดหวัง / ไม้', rr(real.length ? aR / real.length : 0), vc(aR))}${st('ชนะเฉลี่ย', rr(avgOf(winsL, 'r_multiple')), 'var(--bull)')}${st('แพ้เฉลี่ย', rr(avgOf(lossL, 'r_multiple')), 'var(--bear)')}
        ${st('Drawdown สูงสุด', '−' + mdd.toFixed(2) + 'R', mdd ? 'var(--bear)' : '')}${st('ดีสุด / แย่สุด', rr(best) + ' / ' + rr(worst))}${st('ติดกันล่าสุด', streak ? (stK === 'W' ? 'ชนะ ' : 'แพ้ ') + streak + ' ไม้' : '—', stK === 'W' ? 'var(--bull)' : stK === 'L' ? 'var(--bear)' : '')}
        ${st('MFE เฉลี่ย', '+' + avgOf(real, 'mfe_r').toFixed(2) + 'R', 'var(--bull)')}${st('MAE เฉลี่ย', '−' + Math.abs(avgOf(real, 'mae_r')).toFixed(2) + 'R', 'var(--bear)')}${st('หมดเวลา', T + ' ไม้')}
      </div>
      <div style="border-top:1px solid var(--bd-s);padding-top:12px;display:flex;flex-direction:column;gap:6px">
        <span class="muted xs">การกระจายของ R</span>
        ${BK.map(([l, n], i) => `<div style="display:grid;grid-template-columns:64px 1fr 22px;gap:8px;align-items:center;font-size:12px"><span class="muted">${l}</span><div style="height:8px;background:var(--e3)"><div style="height:100%;width:${n / bMax * 100}%;background:${i < 2 ? 'var(--bear)' : 'var(--bull)'};opacity:${i === 2 ? .55 : 1}"></div></div><span style="text-align:right">${n}</span></div>`).join('')}
      </div>
    </div>
  </div>` : '';
  const FL = [['all','ทั้งหมด'],['WIN','ชนะ'],['LOSS','แพ้'],['TIMEOUT','หมดเวลา'],['shadow','Shadow']];
  const fOk = r => J.filter === 'all' ? true : J.filter === 'shadow' ? !!r.is_shadow : String(r.result).toUpperCase() === J.filter;
  const closedF = closed.filter(fOk);
  const H = ['เปิดเมื่อ','ปิดเมื่อ','สินทรัพย์','ฝั่ง','เกรด','เข้า','SL','TP','ออก','ผล','R','MFE','MAE',''];
  body.innerHTML = `
    ${J.status === 'error' ? `<div class="banner warn" style="margin-bottom:20px"><span class="ic">${ic('alert')}</span><span class="grow">โหลดใหม่ไม่สำเร็จ (${esc(J.err)}) · กำลังแสดงข้อมูลเดิม</span></div>` : ''}
    <div class="grid-3" style="margin-bottom:24px">
      ${sc("Today's PnL · วันนี้", usd(tR * riskAmt), vc(tR), `<span style="color:${vc(tR)}">${rr(tR)}</span> · ปิดวันนี้ ${todayList.length} ไม้`)}
      ${sc('Total PnL · สะสม', usd(aR * riskAmt), vc(aR), `<span style="color:${vc(aR)}">${rr(aR)}</span> · ${real.length} ไม้ · เสี่ยง $${fmt(riskAmt, 2)}/ไม้`)}
      ${sc('Win Rate', wr == null ? '—' : wr.toFixed(1) + '%', wr == null ? 'var(--t3)' : wr >= 50 ? 'var(--bull)' : 'var(--bear)', `<span style="color:var(--bull)">ชนะ ${W}</span> / <span style="color:var(--bear)">แพ้ ${L}</span>${T ? ' · หมดเวลา ' + T : ''}`)}
    </div>
    ${shN ? `<div class="muted xs" style="margin:-14px 0 20px">สรุปไม่รวมไม้ Shadow ${shN} ไม้ · ยอดเงินและ % ความเสี่ยงตั้งได้ในหน้าบัญชี &amp; ความเสี่ยง</div>` : ''}
    ${analytics}
    <div style="display:flex;flex-direction:column;gap:12px">
      <div class="card-title"><span class="h">ไม้ที่กำลังเปิดอยู่</span><span class="muted xs">OPEN · ${open.length}</span></div>
      ${open.length ? `<div class="grid-3">${open.map(r => `
        <div class="bp card">${CORNERS}
          <div style="display:flex;align-items:center;gap:10px">${'ABCDF'.includes(r.grade) && r.grade ? gradeHTML(r.grade) : ''}
            <div class="grow"><div style="font-size:16px;font-weight:600">${esc(r.symbol)}</div><div class="sm">${jSide(r.type)}</div></div>${jShadow(r.is_shadow)}</div>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">${lv('เข้า', jPx(r.entry_price, r.symbol), 'var(--t1)')}${lv('SL', jPx(r.sl, r.symbol), 'var(--bear)')}${lv('TP', jPx(r.tp, r.symbol), 'var(--bull)')}</div>
          <div class="row xs muted"><span>เปิดเมื่อ ${jTime(r.timestamp_open)}</span><span>#${esc(r.id)}</span></div>
        </div>`).join('')}</div>`
      : '<div class="bp" style="padding:16px">' + CORNERS + '<span class="muted sm">ไม่มีไม้ที่เปิดอยู่</span></div>'}
    </div>
    <div class="bp" style="margin-top:24px">${CORNERS}
      <div class="card-head" style="flex-wrap:wrap;align-items:center"><span class="h">ประวัติที่ปิดแล้ว <span class="muted xs" style="font-weight:400">${closedF.length}/${closed.length}</span></span><div class="seg" role="group" aria-label="กรอง">${FL.map(([k, l]) => `<button data-act="jf:${k}" aria-pressed="${J.filter === k}">${l}</button>`).join('')}</div></div>
      ${closedF.length ? `<div class="jt-wrap" style="overflow-x:auto"><table class="jt" style="width:100%;border-collapse:collapse;font-size:14px;font-variant-numeric:tabular-nums">
        <thead><tr>${H.map((h, i) => `<th style="${th}${i >= 5 && i <= 8 || i >= 10 && i <= 12 ? ';text-align:right' : ''}">${h}</th>`).join('')}</tr></thead>
        <tbody>${closedF.map(r => { const rc = r.r_multiple > 0 ? 'var(--bull)' : r.r_multiple < 0 ? 'var(--bear)' : 'var(--t2)';
          return `<tr>
            <td data-l="เปิดเมื่อ" style="${td};color:var(--t2)">${jTime(r.timestamp_open)}</td><td data-l="ปิดเมื่อ" style="${td};color:var(--t2)">${jTime(r.timestamp_close)}</td>
            <td data-l="สินทรัพย์" style="${td};font-weight:500">${esc(r.symbol)}</td><td data-l="ฝั่ง" style="${td}">${jSide(r.type)}</td>
            <td data-l="เกรด" style="${td}">${'ABCDF'.includes(r.grade) && r.grade ? gradeHTML(r.grade, 'sm') : '—'}</td>
            <td data-l="เข้า" style="${td};text-align:right">${jPx(r.entry_price, r.symbol)}</td><td data-l="SL" style="${td};text-align:right;color:var(--t2)">${jPx(r.sl, r.symbol)}</td>
            <td data-l="TP" style="${td};text-align:right;color:var(--t2)">${jPx(r.tp, r.symbol)}</td><td data-l="ออก" style="${td};text-align:right">${jPx(r.exit_price, r.symbol)}</td>
            <td data-l="ผล" style="${td}">${jRes(r.result)}</td>
            <td data-l="R · PnL" style="${td};text-align:right;color:${rc};font:500 17px var(--font-heading)" title="${typeof r.r_multiple === 'number' && !r.is_shadow ? usd(r.r_multiple * riskAmt) : ''}">${jR(r.r_multiple)}</td>
            <td data-l="MFE" style="${td};text-align:right;color:var(--bull)">${typeof r.mfe_r === 'number' ? '+' + r.mfe_r.toFixed(2) + 'R' : '—'}</td><td data-l="MAE" style="${td};text-align:right;color:var(--bear)">${typeof r.mae_r === 'number' ? '−' + Math.abs(r.mae_r).toFixed(2) + 'R' : '—'}</td>
            <td data-l="" class="jt-sh" style="${td}">${jShadow(r.is_shadow)}</td></tr>`; }).join('')}</tbody></table></div>`
      : '<div class="empty-row">' + (closed.length ? 'ไม่มีไม้ตามตัวกรองนี้' : 'ยังไม่มีไม้ที่ปิดแล้ว') + '</div>'}
    </div>`;
}

// ───────────────────────── trade markers (จาก /api/journal)
// แท่งเทียนเลื่อนเวลา +7 ชม. (TH_OFF) เพื่อแสดงเวลาไทย → marker ต้องเลื่อนเท่ากัน แล้วจับให้ตรงเวลาเปิดแท่ง
const TH_OFF = 25200;
function loadTradeMarkers() {
  if (!series) return;
  if (S.demo && candles && candles.length && J.rows.length && !J.demoPx) { J.demoPx = 1; J.rows = demoJournal(); if (S.screen === 'journal') renderJournal(); }
  if (!S.showMarks || !candles || !candles.length || !J.rows.length) { series.setMarkers([]); S.markN = 0; return; }
  const bull = cssColor('--bull'), bear = cssColor('--bear'), bullS = cssColor('--bull', .45), bearS = cssColor('--bear', .45);
  const first = candles[0].time, last = candles[candles.length - 1].time;
  const snap = t => { let lo = 0, hi = candles.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; candles[m].time <= t ? lo = m : hi = m - 1; } return candles[lo].time; };
  const marks = J.rows
    .filter(tr => ['OPEN','CLOSED'].includes(String(tr.status).toUpperCase()) && (!tr.symbol || tr.symbol === S.csym))
    .map(tr => {
      const ms = new Date(tr.timestamp_open).getTime(); if (isNaN(ms)) return null;
      const t = Math.floor(ms / 1000) + TH_OFF; if (t < first || t > last + 86400) return null;
      const short = String(tr.type).toLowerCase() === 'short', sh = !!tr.is_shadow, base = short ? 'S' : 'B';
      return { time:snap(t), position: short ? 'aboveBar' : 'belowBar', shape: short ? 'arrowDown' : 'arrowUp',
        color: short ? (sh ? bearS : bear) : (sh ? bullS : bull), text: sh ? base + ' (Shadow)' : base, id:String(tr.id ?? '') };
    })
    .filter(Boolean)
    .sort((a, b) => a.time - b.time);
  series.setMarkers(marks);
  if (S.markN !== marks.length) { S.markN = marks.length; if (S.screen === 'dash' && !$('#v-dash').hidden) renderDash(); }
}

// ───────────────────────── account & strategy
const SL_ATR = 1.5, TP_ATR = 3.0, ATR_TF = '1h', ATR_LEN = 14, MIN_LOT = .01, LOT_OZ = 100;
const acctRiskAmt = () => num(S.acct.bal) * num(S.acct.riskPct) / 100;
const thHour = () => (new Date().getUTCHours() + 7) % 24;
const inNY = h => h >= 20 || h < 5; // NY ≈ 20:00–05:00 น.
async function fetchATR() {
  if (S.atr && S.atr.st === 'loading') return;
  S.atr = { ...(S.atr || {}), st:'loading' };
  try {
    const k = await binanceKlines(symInfo('XAUUSD').pair, ATR_TF, 100);
    const H = k.map(x => +x[2]), L = k.map(x => +x[3]), C = k.map(x => +x[4]);
    const tr = C.map((c, i) => i ? Math.max(H[i] - L[i], Math.abs(H[i] - C[i - 1]), Math.abs(L[i] - C[i - 1])) : H[i] - L[i]);
    S.atr = { v: tr.slice(-ATR_LEN).reduce((a, b) => a + b, 0) / ATR_LEN, at: Date.now(), st:'ok' };
  } catch (e) { S.atr = { ...(S.atr || {}), st:'error', err:e.message }; }
  if (S.screen === 'risk') { if (S.rk.wantAtr) rkStrategySL(); else updateRisk(); }
}
function updateAcct() {
  const s = selSig();
  if ($('#calc-lot') && s) { const c = calcPlan(s); $('#calc-lot').textContent = c.lot; $('#calc-loss').textContent = c.loss; }
  if (S.screen === 'risk') updateRisk();
  const sa = $('#set-amt'); if (sa) sa.textContent = 'เสี่ยง $' + fmt(acctRiskAmt(), 2) + ' ต่อไม้';
}

// ───────────────────────── settings
function renderSettings() {
  if (S.setTab === 'export') { renderExport(); return; }
  const seg = (items, cur, act) => '<div class="seg lg" role="group">' + items.map(([v, l, i]) => '<button data-act="' + act + ':' + v + '" aria-pressed="' + (cur === v) + '">' + (i ? ic(i, 14) : '') + l + '</button>').join('') + '</div>';
  const card = (title, rows) => '<div class="bp card">' + CORNERS + '<div class="card-title"><span class="h">' + title + '</span></div><div>' + rows + '</div></div>';
  const row = (b, sub, ctl) => '<div class="set-row"><div class="lbl"><b>' + b + '</b>' + (sub ? '<span>' + sub + '</span>' : '') + '</div>' + ctl + '</div>';
  const tog = (act, on) => '<button class="toggle" data-act="' + act + '" role="switch" aria-checked="' + on + '"><span class="switch' + (on ? ' on' : '') + '"><i></i></span>' + (on ? 'เปิด' : 'ปิด') + '</button>';
  const skN = S.shots.length;
  $('#v-settings').innerHTML = '<div class="page">' +
    settingsHead() +
    '<div class="set-grid">' +
    '<div class="bp card">' + CORNERS + '<div class="card-title"><span class="h">บัญชี</span><span class="muted xs" id="set-amt">เสี่ยง $' + fmt(acctRiskAmt(), 2) + ' ต่อไม้</span></div><div>' +
      row('ยอดเงิน', 'USD · ใช้ในสมุดเทรดและหน้าบัญชี & ความเสี่ยง', '<input class="input" style="width:180px" inputmode="decimal" autocomplete="off" data-acct="bal" value="' + esc(S.acct.bal) + '">') +
      row('ความเสี่ยงต่อไม้', '% ของยอดเงิน', '<input class="input" style="width:180px" inputmode="decimal" autocomplete="off" data-acct="riskPct" value="' + esc(S.acct.riskPct) + '">') + '</div></div>' +
    card('การแสดงผล',
      row('ธีม', 'ตามระบบ = เปลี่ยนตามการตั้งค่าของเครื่อง', seg([['light','สว่าง','sun'],['dark','มืด','moon'],['system','ตามระบบ','']], S.theme, 'theme-set')) +
      row('จุดเข้าเทรดบนกราฟ', 'ลูกศร B / S จากสมุดเทรด', tog('marks', S.showMarks))) +
    card('การวิเคราะห์',
      row('แหล่งข้อมูล', S.src === 'binance' ? 'ราคาจริงจาก Binance · คำนวณคะแนนในเบราว์เซอร์' : 'GET ' + esc(apiBase()) + '/api/signal', seg([['binance','Binance'],['fastapi','FastAPI']], S.src, 'src')) +
      row('รอบการวิเคราะห์', 'ใช้เมื่อเปิดวิเคราะห์อัตโนมัติ', seg(INTERVALS.map(v => [String(v), v === 60 ? '1 ชม.' : v + ' นาที']), String(S.ivMin), 'iv')) +
      row('วิเคราะห์อัตโนมัติ', S.auto ? 'เปิดอยู่ · ทุก ' + (S.ivMin === 60 ? '1 ชั่วโมง' : S.ivMin + ' นาที') : 'ปิดอยู่ · กด "วิเคราะห์ตอนนี้" เอง', tog('auto', S.auto))) +
    card('ข้อมูลในเครื่อง',
      row('ข้อมูลตัวอย่างสมุดเทรด', S.demo ? 'เปิดอยู่ · สมุดเทรดและลูกศรบนกราฟใช้ข้อมูลจำลอง' : 'ปิดอยู่ · ดึงจาก ' + esc(apiBase()) + '/api/journal', tog('demo', S.demo)) +
      row('สมุดวาดกราฟ', skN ? 'มีภาพที่ฟรีซไว้ ' + skN + ' ภาพ พร้อมรอยวาด' : 'ไม่มีภาพที่ฟรีซไว้', '<button class="btn" data-act="sk-clear"' + (skN ? '' : ' disabled') + '>' + ic('trash') + 'ล้างข้อมูลสมุดวาดกราฟ</button>')) +
    card('การเชื่อมต่อ', row('FastAPI', esc(apiBase()), '<span class="muted xs">แก้ได้ที่ window.CONFIG.apiBase ใน index.html</span>')) +
    '<div class="bp card m-only">' + CORNERS + '<div class="card-title"><span class="h">หน้าอื่น</span></div><div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn" data-act="go:tech">' + ic('gauge') + 'ห้องเทคนิค</button><button class="btn" data-act="go:oracle">' + ic('spark') + 'ห้องโหร</button><button class="btn" data-act="go:risk">' + ic('calc') + 'บัญชี &amp; ความเสี่ยง</button></div></div>' +
    '</div></div>';
}
function settingsHead() {
  return '<div class="page-head"><div><div class="kicker">ค่าทั้งหมดบันทึกในเบราว์เซอร์นี้</div><h1>ตั้งค่า</h1></div>' +
    '<div class="seg lg" role="tablist">' + [['general','ทั่วไป','sliders'],['export','ส่งออกข้อมูล','download']].map(([k, l, i]) => '<button role="tab" data-act="set-tab:' + k + '" aria-pressed="' + (S.setTab === k) + '">' + ic(i, 14) + l + '</button>').join('') + '</div></div>';
}
// ───────────────────────── export (ทดลอง · ยังไม่เชื่อมระบบหลัก)
function shotPNG(s, ink) {
  return new Promise(res => {
    if (!ink || !s.objs || !s.objs.length || !window.fabric) return res(s.img);
    const sc = new fabric.StaticCanvas(null, { width:1200, height:600 });
    sc.setBackgroundImage(s.img, () => fabric.util.enlivenObjects(s.objs, objs => { objs.forEach(o => sc.add(o)); sc.renderAll(); const u = sc.toDataURL({ format:'png' }); sc.dispose(); res(u); }));
  });
}
async function exportShots(ids) {
  if (S.screen === 'sketch') saveShot();
  const list = S.shots.filter(x => ids.includes(x.id)); if (!list.length) { toast('ยังไม่ได้เลือกภาพ'); return; }
  for (let i = 0; i < list.length; i++) {
    const s = list[i], url = await shotPNG(s, S.exp.ink), a = document.createElement('a');
    a.href = url; a.download = 'chart-' + s.sym + '-' + s.tf + '-' + new Date(s.at + 7 * 3600e3).toISOString().slice(0, 16).replace(/[-:T]/g, '') + '.png'; a.click();
    if (i < list.length - 1) await new Promise(r => setTimeout(r, 300));
  }
  toast('ส่งออก ' + list.length + ' ภาพแล้ว');
}
const thStamp = v => { const t = Date.parse(v); return isNaN(t) ? '' : new Date(t + 7 * 3600e3).toISOString().slice(0, 16).replace('T', ' '); };
const sessionOf = v => { const t = Date.parse(v); if (isNaN(t)) return ''; const h = (new Date(t).getUTCHours() + 7) % 24; return h >= 7 && h < 14 ? 'Asian' : h >= 14 && h < 20 ? 'London' : inNY(h) ? 'NY' : 'Off'; };
const n2 = v => typeof v === 'number' ? +v.toFixed(2) : (v ?? '');
// [key, หัวคอลัมน์, กลุ่ม, ค่า]
const CSV_COLS = [
  ['open','Open Time','basic', r => thStamp(r.timestamp_open)],
  ['close','Close Time','basic', r => thStamp(r.timestamp_close)],
  ['dur','Duration (min)','basic', r => { const a = Date.parse(r.timestamp_open), b = Date.parse(r.timestamp_close); return isNaN(a) || isNaN(b) ? '' : Math.round((b - a) / 60000); }],
  ['sym','Symbol','basic', r => r.symbol ?? ''],
  ['type','Type','basic', r => r.type ? (String(r.type).toLowerCase() === 'short' ? 'Short' : 'Long') : ''],
  ['grade','Grade','basic', r => r.grade ?? ''],
  ['shadow','Is Shadow','basic', r => r.is_shadow ? 'TRUE' : 'FALSE'],
  ['entry','Entry Price','price', r => n2(r.entry_price)],
  ['sl','SL','price', r => n2(r.sl)],
  ['tp','TP','price', r => n2(r.tp)],
  ['exit','Exit Price','price', r => n2(r.exit_price)],
  ['result','Result','price', r => r.result || (String(r.status).toUpperCase() === 'OPEN' ? 'OPEN' : '')],
  ['r','R-Multiple','price', r => n2(r.r_multiple)],
  ['pnl','PnL (USD)','price', r => r.pnl_usd],
  ['mfe','MFE (R)','deep', r => n2(r.mfe_r)],
  ['mae','MAE (R)','deep', r => typeof r.mae_r === 'number' ? -Math.abs(+r.mae_r.toFixed(2)) : ''],
  ['ses','Session','deep', r => sessionOf(r.timestamp_open)],
  ['tech','Tech Score','deep', r => r.tech_score ?? ''],
  ['eso','Eso Score','deep', r => r.eso_score ?? ''],
  ['id','Trade ID','deep', r => r.id ?? '']
];
const CSV_GRP = [['basic','ข้อมูลพื้นฐาน','var(--bull)'],['price','ราคาและผลลัพธ์','var(--warn)'],['deep','ข้อมูลเชิงลึก','var(--acc)']];
function csvRows() {
  const e = S.exp, since = e.range === 'all' ? 0 : Date.now() - (e.range === '30' ? 30 : 7) * 864e5, amt = acctRiskAmt();
  return J.rows.filter(r => (e.scope === 'all' || String(r.status).toUpperCase() === e.scope) && (e.sh || !r.is_shadow) && (Date.parse(r.timestamp_open) || 0) >= since)
    .map(r => ({ ...r, pnl_usd: typeof r.r_multiple === 'number' && !r.is_shadow ? +(r.r_multiple * amt).toFixed(2) : '' }));
}
function csvText(rows) {
  const q = v => { if (v == null) return ''; const s = String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  return [CSV_COLS.map(c => c[1]).join(','), ...rows.map(r => CSV_COLS.map(c => q(c[3](r))).join(','))].join('\r\n');
}
function csvDownload() {
  const rows = csvRows(); if (!rows.length) { toast('ไม่มีไม้ตามเงื่อนไขนี้'); return; }
  const blob = new Blob(['\ufeff' + csvText(rows)], { type:'text/csv;charset=utf-8' }), a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'journal-' + new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10) + '.csv'; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000); toast('ดาวน์โหลด CSV ' + rows.length + ' ไม้แล้ว');
}
function renderExport() {
  const e = S.exp, sel = e.sel || new Set(S.shots.map(x => x.id)), nSel = S.shots.filter(x => sel.has(x.id)).length;
  const seg = (items, cur, act) => '<div class="seg" role="group">' + items.map(([v, l]) => '<button data-act="' + act + ':' + v + '" aria-pressed="' + (cur === v) + '">' + l + '</button>').join('') + '</div>';
  const tog = (act, on, l) => '<button class="toggle" data-act="' + act + '" role="switch" aria-checked="' + on + '"><span class="switch' + (on ? ' on' : '') + '"><i></i></span>' + l + '</button>';
  if (J.status !== 'ok' && J.status !== 'loading') fetchJournal().then(() => { if (S.screen === 'settings' && S.setTab === 'export') renderExport(); });
  const rows = J.status === 'ok' ? csvRows() : [], prev = rows.slice(0, 5);
  $('#v-settings').innerHTML = '<div class="page">' + settingsHead() +
    '<div class="banner" style="border:1px solid var(--bd)"><span class="ic" style="color:var(--t2)">' + ic('alert') + '</span><span style="color:var(--t2)">หน้านี้ยังเป็นเวอร์ชันทดลอง ยังไม่ได้เชื่อมกับระบบหลัก · ไฟล์สร้างในเบราว์เซอร์ทั้งหมด</span></div>' +
    '<div class="bp card">' + CORNERS + '<div class="card-title"><span class="h">ภาพจากสมุดวาดกราฟ</span><span class="muted xs">PNG · 1200 × 600 · ' + S.shots.length + ' ภาพ</span></div>' +
      (S.shots.length ?
        '<div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap"><button class="btn btn-ghost" data-act="exp-all">' + (nSel === S.shots.length ? 'ยกเลิกทั้งหมด' : 'เลือกทั้งหมด') + '</button>' + tog('exp-ink', e.ink, 'รวมรอยวาด') + '<div class="grow"></div>' +
        '<button class="btn btn-primary" data-act="exp-dl"' + (nSel ? '' : ' disabled') + '>' + ic('download') + 'ดาวน์โหลดที่เลือก (' + nSel + ')</button></div>' +
        '<div class="exp-grid">' + S.shots.map(x => { const on = sel.has(x.id);
          return '<div class="exp-item' + (on ? ' on' : '') + '"><button class="exp-th" data-act="exp-pick:' + x.id + '" aria-pressed="' + on + '" aria-label="เลือกภาพ ' + esc(x.sym) + ' ' + esc(x.tf) + '" style="background-image:url(' + (x.thumb || x.img) + ')"><span class="exp-ck">' + (on ? ic('check', 12) : '') + '</span></button>' +
            '<div class="exp-meta"><div style="display:flex;flex-direction:column;min-width:0"><b>' + esc(x.sym) + ' · ' + esc(x.tf) + '</b><span class="muted xs">' + thDate(new Date(x.at)) + ' · ' + thTime(new Date(x.at)).slice(0, 5) + (x.objs && x.objs.length ? ' · วาด ' + x.objs.length + ' ชิ้น' : '') + '</span></div>' +
            '<button class="btn btn-icon btn-ghost" data-act="exp-one:' + x.id + '" aria-label="ดาวน์โหลดภาพนี้" title="ดาวน์โหลดภาพนี้">' + ic('download') + '</button></div></div>'; }).join('') + '</div>'
      : '<div class="empty-row" style="border:0;padding:8px 0;display:flex;align-items:center;gap:16px">ยังไม่มีภาพที่ฟรีซไว้<button class="btn" data-act="go:dash">ไปฟรีซกราฟ</button></div>') +
    '</div>' +
    '<div class="bp card">' + CORNERS + '<div class="card-title"><span class="h">ประวัติการเทรด</span><span class="muted xs">CSV · UTF-8 · ' + (S.demo ? 'ข้อมูลตัวอย่าง' : 'GET /api/journal') + '</span></div>' +
      '<div class="exp-opts"><div><span class="muted xs">สถานะ</span>' + seg([['all','ทั้งหมด'],['CLOSED','ปิดแล้ว'],['OPEN','เปิดอยู่']], e.scope, 'csv-scope') + '</div>' +
        '<div><span class="muted xs">ช่วงเวลา</span>' + seg([['all','ทั้งหมด'],['30','30 วัน'],['7','7 วัน']], e.range, 'csv-range') + '</div>' +
        '<div><span class="muted xs">ไม้ Shadow</span>' + tog('csv-sh', e.sh, e.sh ? 'รวม' : 'ไม่รวม') + '</div>' +
        '<div class="grow"></div><div style="display:flex;gap:10px;align-self:flex-end"><button class="btn" data-act="csv-copy"' + (rows.length ? '' : ' disabled') + '>' + ic('copy') + 'คัดลอก</button><button class="btn btn-primary" data-act="csv-dl"' + (rows.length ? '' : ' disabled') + '>' + ic('download') + 'ดาวน์โหลด CSV (' + rows.length + ')</button></div></div>' +
      (J.status === 'ok' ? (rows.length ?
        '<div class="csv-legend">' + CSV_GRP.map(([g, l, c]) => '<div><span style="background:' + c + '"></span><b>' + l + '</b><span class="muted xs">' + CSV_COLS.filter(x => x[2] === g).map(x => x[1]).join(' · ') + '</span></div>').join('') + '</div>' +
        '<div style="overflow-x:auto;border:1px solid var(--bd-s)"><table class="jt csv-prev" style="width:100%;border-collapse:collapse"><thead>' +
          '<tr>' + CSV_GRP.map(([g, l, c]) => '<th colspan="' + CSV_COLS.filter(x => x[2] === g).length + '" style="box-shadow:inset 0 2px 0 ' + c + ';color:var(--t2)!important">' + l + '</th>').join('') + '</tr>' +
          '<tr>' + CSV_COLS.map(c => '<th>' + c[1] + '</th>').join('') + '</tr></thead><tbody>' +
          prev.map(r => '<tr>' + CSV_COLS.map(c => { const v = c[3](r), col = c[0] === 'r' || c[0] === 'pnl' ? vc(+v) : c[0] === 'result' ? (v === 'WIN' ? 'var(--bull)' : v === 'LOSS' ? 'var(--bear)' : '') : c[0] === 'ses' && v === 'NY' ? 'var(--warn)' : '';
            return '<td' + (col ? ' style="color:' + col + '"' : '') + '>' + esc(v === '' ? '—' : v) + '</td>'; }).join('') + '</tr>').join('') + '</tbody></table></div>' +
          '<span class="muted xs">ตัวอย่าง ' + prev.length + ' จาก ' + rows.length + ' แถว · ' + CSV_COLS.length + ' คอลัมน์ · PnL = R × $' + fmt(acctRiskAmt(), 2) + ' (ไม่คิดไม้ Shadow) · เวลาเป็นเวลาไทย · Session นับจากเวลาเปิดไม้ · Tech/Eso ว่างถ้า API ยังไม่ส่ง tech_score / eso_score มา</span>'
        : '<div class="empty-row" style="border:0;padding:8px 0">ไม่มีไม้ตามเงื่อนไขนี้</div>')
      : '<div class="empty-row" style="border:0;padding:8px 0">' + (J.status === 'error' ? 'ดึงสมุดเทรดไม่ได้ · ' + esc(J.err) : 'กำลังโหลดสมุดเทรด…') + '</div>') +
    '</div></div>';
}
function clearSketches() {
  if (!S.shots.length || !confirm('ลบภาพที่ฟรีซไว้ทั้งหมด ' + S.shots.length + ' ภาพ? ย้อนกลับไม่ได้')) return;
  try { localStorage.removeItem('cta-sketch'); } catch (e) {}
  S.shots = []; S.shotId = null;
  if (fc) { silent = true; fc.clear(); silent = false; hist = []; redoStack = []; fc._shotId = null; }
  renderSettings(); toast('ล้างข้อมูลสมุดวาดกราฟแล้ว');
}

// ───────────────────────── บัญชี & ความเสี่ยง (XAUUSD: 1 lot = 100 oz)
function riskCalc() {
  const bal = num(S.acct.bal), pct = num(S.acct.riskPct), entry = num(S.rk.entry), sl = num(S.rk.sl);
  const dist = Math.abs(entry - sl), amt = bal * pct / 100, ok = entry > 0 && sl > 0 && dist > 0 && amt > 0;
  const short = sl > entry, dir = short ? -1 : 1;
  const exact = ok ? amt / (dist * LOT_OZ) : 0, lot = Math.floor(exact * 100 + 1e-9) / 100;
  const useLot = lot >= MIN_LOT ? lot : MIN_LOT, realRisk = dist * LOT_OZ * useLot;
  const minRisk = dist * LOT_OZ * MIN_LOT;
  return { ok, bal, pct, entry, sl, dist, amt, short, dir, exact, lot, useLot, realRisk, realPct: bal > 0 ? realRisk / bal * 100 : 0,
    minRisk, minPct: bal > 0 ? minRisk / bal * 100 : 0, tp: entry + dir * dist * (TP_ATR / SL_ATR) };
}
function ruleChecks() {
  const d = S.data.XAUUSD, s = d ? decorate(d) : null, a = apiAtr();
  return [
    ['ทิศทาง', 'SHORT เท่านั้น', s ? (s.cs < 0 ? 'pass' : 'fail') : 'na', s ? 'สัญญาณตอนนี้ ' + s.dirLbl + ' (' + sgn(s.cs) + ')' : 'ยังไม่มีสัญญาณ'],
    ['เกรด', 'B เท่านั้น · ไม่เอา A', s ? (s.grade === 'B' ? 'pass' : 'fail') : 'na', s ? 'เกรดตอนนี้ ' + s.grade : 'ยังไม่มีสัญญาณ'],
    ['ช่วงเวลา', 'ห้ามช่วง NY 20:00–05:00 น.', inNY(thHour()) ? 'fail' : 'pass', 'ตอนนี้ ' + thTime(new Date())],
    ['SL / TP', '1.5 ATR / 3.0 ATR', a ? 'info' : 'na', a ? 'SL ' + fmt(a * SL_ATR, 2) + ' · TP ' + fmt(a * TP_ATR, 2) + ' · ATR(' + ATR_LEN + ') ' + fmt(a, 2) + ' จาก ' + atrSrc() : (S.atr && S.atr.st === 'error' ? 'ดึง ATR ไม่ได้' : 'กำลังดึง ATR…')]
  ];
}
function renderRisk() {
  const d = S.data.XAUUSD;
  if (!S.rk.entry && d) { S.rk.entry = fmt(d.current_price, 2); S.rk.wantAtr = true; }
  if (!S.atr || (S.atr.st !== 'loading' && Date.now() - (S.atr.at || 0) > 300000)) fetchATR();
  if (S.rk.wantAtr && apiAtr()) { rkStrategySL(true); }
  const f = (attr, k, l, sub, val) => '<label style="display:flex;flex-direction:column;gap:6px;font-size:13px;color:var(--t2)">' + l + (sub ? ' <span class="muted xs">' + sub + '</span>' : '') + '<input class="input" style="height:44px;font-size:18px" inputmode="decimal" autocomplete="off" ' + attr + '="' + k + '" value="' + esc(val) + '"></label>';
  const c = riskCalc();
  $('#v-risk').innerHTML = '<div class="page">' +
    '<div class="page-head"><div><div class="kicker">XAUUSD · 1 Lot = 100 oz · ล็อตขั้นต่ำ 0.01</div><h1>บัญชี &amp; ความเสี่ยง</h1></div>' +
      (d ? '<span class="muted sm">ราคาล่าสุด <b style="color:var(--t1);font-weight:500">' + fmt(d.current_price, 2) + '</b> · ' + thTime(new Date(d.timestamp)) + '</span>' : '') + '</div>' +
    '<div id="rk-allow">' + (d ? allowHTML(decorate(d)) : '') + '</div>' +
    '<div class="grid-2" style="align-items:stretch">' +
      '<div style="display:flex;flex-direction:column;gap:20px;min-width:0">' +
        '<div class="bp card" style="gap:14px">' + CORNERS + '<div class="card-title"><span class="h">บัญชี</span><span class="muted xs">ใช้ร่วมกับสมุดเทรด</span></div>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">' + f('data-acct', 'bal', 'ยอดเงิน', 'USD', S.acct.bal) + f('data-acct', 'riskPct', 'ความเสี่ยงต่อไม้', '%', S.acct.riskPct) + '</div>' +
          '<div class="row" style="border-top:1px solid var(--bd-s);padding-top:10px"><span style="color:var(--t2)">เงินที่ยอมเสียต่อไม้</span><b id="rk-amt" style="font:500 22px var(--font-heading)">—</b></div></div>' +
        '<div class="bp card" style="gap:14px">' + CORNERS + '<div class="card-title"><span class="h">ข้อมูลไม้</span>' +
          '<div class="seg" role="group" aria-label="ฝั่ง"><button data-act="rk-side:short" aria-pressed="' + c.short + '">▼ Short</button><button data-act="rk-side:long" aria-pressed="' + !c.short + '">▲ Long</button></div></div>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">' + f('data-rk', 'entry', 'ราคาเข้า', '', S.rk.entry) + f('data-rk', 'sl', 'จุดตัดขาดทุน (SL)', '', S.rk.sl) + '</div>' +
          '<div style="display:flex;gap:10px;flex-wrap:wrap">' + (d ? '<button class="btn" data-act="rk-now">' + ic('refresh') + 'ใช้ราคาปัจจุบัน</button>' : '') +
          '<button class="btn" data-act="rk-atr"' + (apiAtr() ? '' : ' disabled') + '>SL ตามกลยุทธ์ · 1.5 ATR' + (apiAtr() ? ' (' + fmt(apiAtr() * SL_ATR, 2) + ')' : '') + '</button></div>' +
          '<div class="muted xs" id="rk-side"></div></div>' +
      '</div>' +
      '<div style="display:flex;flex-direction:column;gap:20px;min-width:0">' +
        '<div class="bp" id="rk-result" style="padding:24px;display:flex;flex-direction:column;align-items:center;gap:16px">' + CORNERS + '</div>' +
        '<div class="bp card" id="rk-ladder">' + CORNERS + '</div>' +
      '</div>' +
    '</div>' +
    '<div class="bp">' + CORNERS + '<div class="card-head"><span class="h">เช็กกฎกลยุทธ์กับสัญญาณล่าสุด</span><span class="muted xs" id="rk-rules-n"></span></div><div class="rules" id="rk-rules"></div></div>' +
    '</div>';
  updateRisk();
}
function updateRisk() {
  const box = $('#rk-result'); if (!box) return;
  const c = riskCalc(), lim = c.pct, dp = 2;
  $('#rk-amt').textContent = c.amt > 0 ? '$' + fmt(c.amt, 2) : '—';
  $('#rk-side').textContent = c.ok ? (c.short ? 'Short · SL อยู่เหนือราคาเข้า' : 'Long · SL อยู่ใต้ราคาเข้า') + ' · TP ตั้งที่ 2 เท่าของระยะ SL (3.0 / 1.5 ATR)' : 'กรอกราคาเข้าและ SL ที่ไม่เท่ากัน';
  const tooSmall = c.ok && c.lot < MIN_LOT, over = c.ok && c.realPct > lim + 1e-9;
  box.innerHTML = CORNERS + '<span class="kicker">ขนาดล็อตที่ใช้ได้</span>' +
    '<div class="big-lot" style="color:' + (!c.ok ? 'var(--t3)' : tooSmall ? 'var(--warn)' : 'var(--acc)') + '">' + (c.ok ? c.useLot.toFixed(2) : '—') + '</div>' +
    '<span class="muted xs" style="margin-top:-8px">' + (c.ok ? 'คำนวณได้ ' + c.exact.toFixed(4) + ' · ปัดลงทีละ 0.01' : 'ล็อต = เงินที่ยอมเสีย ÷ (ระยะ SL × 100)') + '</span>' +
    '<div class="stats" style="width:100%"><div><span>เสี่ยงจริง</span><b style="color:' + (over ? 'var(--warn)' : 'var(--t1)') + '">' + (c.ok ? '$' + fmt(c.realRisk, 2) : '—') + '</b></div><div><span>% ของพอร์ต</span><b style="color:' + (over ? 'var(--warn)' : 'var(--t1)') + '">' + (c.ok ? c.realPct.toFixed(1) + '%' : '—') + '</b></div><div><span>ระยะ SL</span><b>' + (c.dist > 0 ? fmt(c.dist, dp) : '—') + '</b></div></div>' +
    (c.ok ? '<div class="banner' + (over ? ' warn' : '') + '" style="width:100%;' + (over ? '' : 'border:1px solid var(--bd);') + 'font-size:14px">' + (over ? '<span class="ic">' + ic('alert') + '</span>' : '') +
      '<span>ถ้าเทรด <b style="display:inline;font-size:inherit">0.01 Lot</b> จะเสี่ยง <b style="display:inline;font-size:inherit">$' + fmt(c.minRisk, 2) + '</b> คิดเป็น <b style="display:inline;font-size:inherit;color:' + (c.minPct > lim ? 'var(--warn)' : 'var(--t1)') + '">' + c.minPct.toFixed(1) + '%</b> ของพอร์ต' +
      (tooSmall ? ' · ล็อตที่คำนวณได้ต่ำกว่าขั้นต่ำ เกินความเสี่ยงที่ตั้งไว้ ' + lim + '%' : '') + '</span></div>' : '');
  const lad = $('#rk-ladder');
  const rowL = (l, v, col, pnl, h, b) => '<div style="display:grid;grid-template-columns:10px 1fr auto 70px 80px;gap:10px;align-items:center;font-size:14px;padding:8px 0;border-top:1px solid var(--bd-s)"><span style="width:10px;height:' + h + 'px;background:' + col + '"></span><span style="font-weight:' + (b ? 600 : 400) + '">' + l + '</span><b style="font-weight:500">' + v + '</b><span class="muted xs" style="text-align:right">' + (pnl[0] || '') + '</span><span style="text-align:right;font-weight:500;color:' + (pnl[2] || 'var(--t3)') + '">' + (pnl[1] || '') + '</span></div>';
  const P = v => fmt(v, dp), dd = v => (v > 0 ? '+' : '−') + fmt(Math.abs(v), dp);
  const rows = c.ok ? [
    ['TP · 2R', c.tp, 'var(--bull)', [dd(c.tp - c.entry), '+$' + fmt(c.realRisk * 2, 2), 'var(--bull)'], 2],
    ['เข้า', c.entry, 'var(--acc)', ['', '', ''], 2, true],
    ['SL', c.sl, 'var(--bear)', [dd(c.sl - c.entry), '−$' + fmt(c.realRisk, 2), 'var(--bear)'], 2]
  ].sort((a, b) => b[1] - a[1]) : [];
  lad.innerHTML = CORNERS + '<div class="card-title"><span class="h">แผนราคา</span><span class="muted xs">ที่ ' + (c.ok ? c.useLot.toFixed(2) : '—') + ' Lot · R:R 1 : 2</span></div>' +
    (rows.length ? '<div>' + rows.map(r => rowL(r[0], P(r[1]), r[2], r[3], r[4], r[5])).join('') + '</div>' : '<div class="muted sm">ยังไม่มีราคาเข้าและ SL</div>');
  const rules = ruleChecks(), passN = rules.filter(r => r[2] === 'pass').length, gated = rules.filter(r => r[2] === 'pass' || r[2] === 'fail').length;
  const icn = { pass:['check','var(--bull)','ผ่าน'], fail:['x','var(--bear)','ไม่ผ่าน'], info:['clock','var(--t2)','ค่าตอนนี้'], na:['clock','var(--t3)','รอข้อมูล'] };
  $('#rk-rules-n').textContent = gated ? 'ผ่าน ' + passN + '/' + gated + ' กฎ' : '';
  $('#rk-rules').innerHTML = rules.map(([k, v, st, now]) => { const [i, col, lab] = icn[st];
    return '<div style="padding:14px 16px;display:flex;flex-direction:column;gap:6px;min-width:0"><span class="muted xs">' + k + '</span><b style="font-weight:500">' + v + '</b>' +
      '<span class="sm" style="display:flex;gap:6px;align-items:center;color:' + col + '">' + ic(i, 14) + lab + '</span><span class="muted xs">' + esc(now) + '</span></div>'; }).join('');
}
function rkUseNow() { const d = S.data.XAUUSD; if (!d) return; S.rk.entry = fmt(d.current_price, 2); if (S.atr && S.atr.v) rkStrategySL(true); renderRisk(); }
function rkStrategySL(quiet) {
  const a = apiAtr(), e = num(S.rk.entry); if (!a || !e) return;
  const side = S.rk.side || 'short';
  S.rk.sl = fmt(e + (side === 'short' ? 1 : -1) * a * SL_ATR, 2); S.rk.wantAtr = false;
  if (!quiet) renderRisk();
}
function rkSide(side) {
  S.rk.side = side; const e = num(S.rk.entry), sl = num(S.rk.sl); if (!e) { renderRisk(); return; }
  const dist = sl ? Math.abs(e - sl) : (apiAtr() ? apiAtr() * SL_ATR : SL_OFF);
  S.rk.sl = fmt(side === 'short' ? e + dist : e - dist, 2); renderRisk();
}

// ───────────────────────── theme
const resolveTheme = t => t === 'system' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : t;
function applyTheme(t) {
  S.theme = t; S.resolved = resolveTheme(t); document.documentElement.setAttribute('data-theme', S.resolved);
  ls.set('cta-theme-v', t); try { localStorage.setItem('cta-theme', t); } catch (e) {}
  if (chart) { chart.applyOptions(chartOpts()); series.applyOptions(seriesOpts()); syncChart(); }
  render();
}
function toggleTheme(ev) {
  const t = S.resolved === 'dark' ? 'light' : 'dark';
  if (reduced() || !document.startViewTransition) { document.documentElement.classList.add('theme-fade'); applyTheme(t); setTimeout(() => document.documentElement.classList.remove('theme-fade'), 220); return; }
  const x = ev.clientX, y = ev.clientY, R = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  const vt = document.startViewTransition(() => applyTheme(t));
  vt.ready.then(() => document.documentElement.animate({ clipPath:[`circle(0px at ${x}px ${y}px)`, `circle(${R}px at ${x}px ${y}px)`] }, { duration:480, easing:'cubic-bezier(.25,1,.5,1)', pseudoElement:'::view-transition-new(root)' })).catch(() => {});
}

// ───────────────────────── actions
let toastT = 0;
function toast(msg) { const t = $('#toast'); t.innerHTML = `<span class="ic">${ic('check')}</span>${esc(msg)}`; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 2400); }
function go(scr) {
  if (fc && S.screen === 'sketch' && scr !== 'sketch') saveShot();
  if (['dash','detail','tech','oracle','sketch','journal','settings','risk'].includes(scr)) { S.screen = scr; S.soon = ''; } else { S.screen = 'soon'; S.soon = scr; }
  S.menu = null; $('#main').scrollTo(0, 0); render(true);
  if (scr === 'journal') fetchJournal();
  if (scr === 'dash' && chart) setTimeout(() => chart.timeScale().fitContent(), 0);
}
function setSym(k) { if (S.csym === k) { S.menu = null; render(); return; } S.csym = k; S.sel = k; S.menu = null; candles = null; render(true); fetchCandles(); }
function setSource(v) { S.src = v; S.menu = null; ls.set('cta-src-v2', v); S.data = {}; S.status = 'loading'; render(); toast('แหล่งข้อมูล: ' + (v === 'binance' ? 'Binance' : 'FastAPI')); runNow(false, true); }
function toggleAuto() { S.auto = !S.auto; ls.set('cta-auto-v', S.auto); if (S.auto) reAt = Date.now() + S.ivMin * 60000; renderTop(); toast(S.auto ? `เปิดการวิเคราะห์อัตโนมัติ · ทุก ${S.ivMin} นาที` : 'ปิดการวิเคราะห์อัตโนมัติแล้ว'); }
function setInterval_(m) { S.menu = null; if (S.ivMin !== m) { S.ivMin = m; ls.set('cta-interval', m); reAt = Date.now() + m * 60000; toast('วิเคราะห์อัตโนมัติ' + (m === 60 ? 'ทุก 1 ชั่วโมง' : 'ทุก ' + m + ' นาที') + (S.auto ? '' : ' · สวิตช์อัตโนมัติยังปิดอยู่')); } renderTop(); }
async function postAPI(path, body) {
  const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 10000);
  try {
    const r = await fetch(apiBase() + path, { method:'POST', headers:{ 'Content-Type':'application/json', Accept:'application/json' }, body:JSON.stringify(body), signal:ctl.signal });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.json().catch(() => ({}));
  } finally { clearTimeout(to); }
}
const tradeId = s => s.raw.trade_id ?? s.raw.id ?? (s.sym + '-' + s.raw.timestamp);
async function sendDecision(action) {
  const s = selSig(); if (!s) return;
  const body = { trade_id: tradeId(s), action, symbol:s.sym, grade:s.grade, price:s.plan.entry, sl:s.plan.sl, tp:s.plan.tp, side: s.plan.short ? 'short' : 'long', lot: +calcPlan(s).lot, timestamp:s.raw.timestamp, decided_at:new Date().toISOString() };
  try { await postAPI('/api/decision', body); toast(action === 'take' ? 'บันทึกการตัดสินใจแล้ว · ' + s.sym : 'บันทึกว่าไม่สนใจ ' + s.sym); }
  catch (e) { toast('ส่ง /api/decision ไม่สำเร็จ · ' + e.message); }
}
async function sendAlert() {
  const s = selSig(); if (!s) return;
  try { await postAPI('/api/alert', { trade_id: tradeId(s), symbol:s.sym, grade:s.grade, price:s.plan.entry, timestamp:s.raw.timestamp, created_at:new Date().toISOString() }); toast('ตั้งแจ้งเตือนแล้ว · ' + s.sym); }
  catch (e) { toast('ส่ง /api/alert ไม่สำเร็จ · ' + e.message); }
}
function copyPlan() { const s = selSig(); if (!s) return; const p = s.raw.current_price, dp = s.SY.dp;
  navigator.clipboard?.writeText(`${s.sym} ${s.plan.short ? 'Short' : 'Long'} เกรด ${s.grade} · เข้า ${fmt(s.plan.entry, dp)} · SL ${fmt(s.plan.sl, dp)} · TP ${fmt(s.plan.tp, dp)} · ล็อต ${calcPlan(s).lot}`).catch(() => {}); toast('คัดลอกแผนเทรดแล้ว'); }
function download() { const cur = curShot(); if (!fc || !cur) return; fc.discardActiveObject(); fc.renderAll();
  const a = document.createElement('a'); a.href = fc.toDataURL({ format:'png', multiplier:1 }); a.download = `chart-${cur.sym}-${cur.tf}-${new Date(cur.at).toISOString().slice(0, 16).replace(/[-:T]/g, '')}.png`; document.body.appendChild(a); a.click(); a.remove(); }

document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (!el) { if (S.menu && !e.target.closest('.menu')) { S.menu = null; render(); } return; }
  if (el.tagName === 'A') e.preventDefault();
  const [act, arg] = el.dataset.act.split(':');
  switch (act) {
    case 'go': go(arg); break;
    case 'run': S.menu = null; runNow(); break;
    case 'theme': toggleTheme(e); break;
    case 'eng-menu': S.menu = S.menu === 'eng' ? null : 'eng'; renderTop(); if (!$('#v-dash').hidden) renderDash(); break;
    case 'sym-menu': S.menu = S.menu === 'sym' ? null : 'sym'; renderTop(); renderDash(); break;
    case 'auto': toggleAuto(); if (S.screen === 'settings') renderSettings(); break;
    case 'theme-set': applyTheme(arg); break;
    case 'sk-clear': clearSketches(); break;
    case 'rk-now': rkUseNow(); break;
    case 'rk-atr': if (num(S.rk.sl)) S.rk.side = num(S.rk.sl) < num(S.rk.entry) ? 'long' : 'short'; rkStrategySL(); break;
    case 'rk-side': rkSide(arg); break;
    case 'jf': J.filter = arg; renderJournal(); break;
    case 'src': setSource(arg); break;
    case 'iv': setInterval_(+arg); if (S.screen === 'settings') renderSettings(); break;
    case 'sym': setSym(arg); break;
    case 'tf': if (S.tf !== arg) { S.tf = arg; renderDash(); fetchCandles(); } break;
    case 'select': S.sel = arg; renderDash(); break;
    case 'open': S.sel = arg; go('detail'); break;
    case 'freeze': freeze(); break;
    case 'log': sendDecision('take'); break;
    case 'alert': sendAlert(); break;
    case 'ignore': sendDecision('skip'); go('dash'); break;
    case 'copy': copyPlan(); break;
    case 'tool': setTool(arg); break;
    case 'color': setStyle(+arg, S.widthIx); break;
    case 'width': setStyle(S.colorIx, +arg); break;
    case 'undo': undo(); break;
    case 'redo': redo(); break;
    case 'dup': dupSel(); break;
    case 'del': delSel(); break;
    case 'clear': if (fc) { silent = true; fc.getObjects().slice().forEach(o => fc.remove(o)); silent = false; pushHist(); } break;
    case 'download': download(); break;
    case 'j-reload': fetchJournal(); break;
    case 'set-tab': S.setTab = arg; renderSettings(); break;
    case 'exp-one': exportShots([arg]); break;
    case 'exp-pick': { const sel = S.exp.sel || new Set(S.shots.map(x => x.id)); sel.has(arg) ? sel.delete(arg) : sel.add(arg); S.exp.sel = sel; renderExport(); break; }
    case 'exp-all': { const sel = S.exp.sel || new Set(S.shots.map(x => x.id)); S.exp.sel = sel.size === S.shots.length ? new Set() : new Set(S.shots.map(x => x.id)); renderExport(); break; }
    case 'exp-dl': exportShots([...(S.exp.sel || new Set(S.shots.map(x => x.id)))]); break;
    case 'exp-ink': S.exp.ink = !S.exp.ink; renderExport(); break;
    case 'csv-scope': S.exp.scope = arg; renderExport(); break;
    case 'csv-range': S.exp.range = arg; renderExport(); break;
    case 'csv-sh': S.exp.sh = !S.exp.sh; renderExport(); break;
    case 'csv-dl': csvDownload(); break;
    case 'csv-copy': navigator.clipboard?.writeText(csvText(csvRows())).then(() => toast('คัดลอก CSV แล้ว')).catch(() => toast('คัดลอกไม่ได้')); break;
    case 'or-tab': S.orTab = arg; ls.set('cta-ortab', arg); document.querySelectorAll('[data-act^="or-tab:"]').forEach(b => { const on = b.dataset.act === 'or-tab:' + arg; b.setAttribute('aria-pressed', on); b.setAttribute('aria-selected', on); }); renderOrx(selSig()); break;
    case 'demo': S.demo = !S.demo; ls.set('cta-demo-v2', S.demo); J.rows = []; J.status = 'idle'; fetchJournal(); if (S.screen === 'settings') renderSettings(); toast(S.demo ? 'ใช้ข้อมูลตัวอย่างสมุดเทรด' : 'ใช้ข้อมูลจริงจาก /api/journal'); break;
    case 'marks': S.showMarks = !S.showMarks; ls.set('cta-marks', S.showMarks); loadTradeMarkers(); if (S.screen === 'settings') renderSettings(); else renderDash(); if (S.showMarks && J.status !== 'ok') fetchJournal(); break;
    case 'shot': saveShot(); S.shotId = arg; renderSketch(); break;
    case 'shot-del': S.shots = S.shots.filter(x => x.id !== S.shotId); S.shotId = S.shots[0] ? S.shots[0].id : null; persistShots(); renderSketch(); toast('ลบภาพแล้ว'); break;
  }
});
document.addEventListener('dblclick', e => { const el = e.target.closest('[data-dbl]'); if (el) { S.sel = el.dataset.dbl.split(':')[1]; go('detail'); } });
document.addEventListener('input', e => {
  const ak = e.target.dataset && e.target.dataset.acct;
  if (ak) { S.acct[ak] = e.target.value; ls.set('cta-acct', S.acct); updateAcct(); return; }
  const rk = e.target.dataset && e.target.dataset.rk;
  if (rk) { S.rk[rk] = e.target.value; updateRisk(); return; }
  const k = e.target.dataset && e.target.dataset.inp; if (!k) return;
  S[k] = e.target.value; const s = selSig(); if (!s) return; const c = calcPlan(s);
  $('#calc-lot').textContent = c.lot; $('#calc-loss').textContent = c.loss;
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && S.menu) { S.menu = null; render(); return; }
  const tag = (e.target.tagName || '');
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;
  if (S.screen === 'sketch' && fc) {
    const mod = e.metaKey || e.ctrlKey, k = e.key.toLowerCase(), act = fc.getActiveObject();
    if (act && act.isEditing) return;
    if (mod && (k === 'y' || (k === 'z' && e.shiftKey))) { e.preventDefault(); redo(); return; }
    if (mod && k === 'z') { e.preventDefault(); undo(); return; }
    if (mod && k === 'd') { e.preventDefault(); dupSel(); return; }
    if ((e.key === 'Delete' || e.key === 'Backspace') && act) { e.preventDefault(); delSel(); return; }
    const t = (TOOLS.find(x => x[3].toLowerCase() === k) || [])[0]; if (!mod && t) { setTool(t); return; }
  }
  if (e.key === '[' || e.key === ']') { const ks = Object.keys(S.data); if (!ks.length) return; const i = ks.indexOf(S.sel); S.sel = ks[(i + (e.key === ']' ? 1 : ks.length - 1)) % ks.length];
    if (S.screen === 'dash') renderDash(); else render(true); }
});
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (S.theme === 'system') applyTheme('system'); });

// ───────────────────────── boot
S.resolved = resolveTheme(S.theme); document.documentElement.setAttribute('data-theme', S.resolved);
render();
runNow(false, true);
if (S.showMarks) fetchJournal();
setInterval(() => { S.now = Date.now(); renderTop(); if (S.auto && !S.running && Date.now() >= reAt) runNow(true); }, 1000);
setInterval(() => { if (S.csym) fetchCandles(true); }, 60000);
})();
