/* Confluence · เครื่องวิเคราะห์การเทรด — Vanilla JS (ไม่มี framework)
   ไลบรารีภายนอก: Lightweight Charts (กราฟ), Fabric.js (สมุดวาดกราฟ) — โหลดจาก CDN ใน index.html */
(() => {
'use strict';

// ───────────────────────── config & constants
const CFG = Object.assign({ symbols:['XAUUSD'], source:'fastapi', apiBase:'https://confluence-api-23ix.onrender.com', refreshMin:15 }, window.CONFIG || {});
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
const NAV = [['dash','ฟีดสัญญาณ','dash'],['oracle','ห้องโหร','spark'],['sketch','สมุดวาดกราฟ','pencil'],['risk','คำนวณความเสี่ยง','calc'],['journal','สมุดเทรด','book'],['settings','ตั้งค่า','sliders']];
const TABS = [['dash','ฟีด','dash'],['oracle','โหร','spark'],['sketch','วาด','pencil'],['settings','ตั้งค่า','sliders']];

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
  undo:'<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>', redo:'<path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>',
  trash:'<path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
  download:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>'
};
const ic = (n, s = 16) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n]}</svg>`;
const CORNERS = '<i class="c tl"></i><i class="c tr"></i><i class="c bl"></i><i class="c br"></i>';

// ───────────────────────── state
const S = {
  screen:'dash', soon:'', sel:null, theme: ls.get('cta-theme-v', 'system'), resolved:'dark',
  data:{}, status:'idle', errMsg:'', lastOk:0, hist: ls.get('cta-history', []), running:false,
  auto: ls.get('cta-auto-v', true), ivMin: ls.get('cta-interval', CFG.refreshMin), src: ls.get('cta-src-v', CFG.source),
  tf:'1h', csym:null, candleState:'idle', bal:'10,000', risk:'1.0',
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
function decorate(d) {
  const SY = symInfo(d.symbol), ts = new Date(d.timestamp), tsOk = !isNaN(ts), p = d.current_price, cs = d.composite_score;
  const isTrap = d.grade === 'D' || d.grade === 'F', dir = cs > 0 ? 'bull' : cs < 0 ? 'bear' : 'flat', kl = d.key_levels || {};
  const warns = [];
  if (isTrap) warns.push([`เกรด ${d.grade} · ระวังกับดัก ไม่ควรเข้าเทรด`, 'var(--grade-f)']);
  if (d.state === 'DIVERGENCE_WARNING') warns.push([`เทคนิค ${sgn(d.tech_score)} กับโหราศาสตร์ ${sgn(d.eso_score)} ชี้คนละทาง`, 'var(--warn)']);
  if (d.state === 'NO_CONVICTION') warns.push(['คะแนนไม่ชัดเจน · รอสัญญาณรอบถัดไป', 'var(--warn)']);
  if (cs < 0) warns.push(['แผนเทรดตั้งต้นเป็นฝั่งซื้อ แต่คะแนนรวมเป็นลบ', 'var(--warn)']);
  if (kl.resistance > p && kl.resistance < p + TP_OFF) warns.push([`แนวต้าน ${fmt(kl.resistance, SY.dp)} อยู่ก่อนถึง TP`, 'var(--warn)']);
  if (kl.support < p && kl.support > p - SL_OFF) warns.push([`แนวรับ ${fmt(kl.support, SY.dp)} อยู่เหนือ SL`, 'var(--t3)']);
  if (tsOk && S.now - ts > 30 * 60000) warns.push([`ข้อมูลเก่า ${Math.round((S.now - ts) / 60000)} นาที`, 'var(--warn)']);
  const ladder = [
    ['แนวต้าน', kl.resistance, 'var(--t2)', 1, 'var(--t2)'], ['TP · +30', p + TP_OFF, 'var(--bull)', 2, 'var(--bull)'],
    ['เข้า · ราคาปัจจุบัน', p, 'var(--acc)', 2, 'var(--t1)'], ['SL · −15', p - SL_OFF, 'var(--bear)', 2, 'var(--bear)'], ['แนวรับ', kl.support, 'var(--t2)', 1, 'var(--t2)']
  ].filter(x => typeof x[1] === 'number').sort((a, b) => b[1] - a[1]);
  return {
    raw:d, sym:d.symbol, SY, price:fmt(p, SY.dp), grade:d.grade, isTrap, cs, tech:d.tech_score, eso:d.eso_score,
    time: tsOk ? thTime(ts) : '—', dateTime: tsOk ? thDate(ts) + ' · ' + thTime(ts) : '—', archetype: d.archetype || '—',
    stateLbl: STATE_TH[d.state] || d.state, dc: dir === 'bull' ? 'var(--bull)' : dir === 'bear' ? 'var(--bear)' : 'var(--neutral)',
    dirLbl: dir === 'bull' ? '▲ ขาขึ้น' : dir === 'bear' ? '▼ ขาลง' : '◆ เป็นกลาง',
    stateC: d.grade === 'A' ? 'var(--grade-a)' : isTrap ? 'var(--grade-f)' : d.state === 'DIVERGENCE_WARNING' ? 'var(--warn)' : 'var(--t2)',
    comps: COMP.map(([k, n]) => [n, +(d.component_scores || {})[k] || 0]),
    warns, ladder, moon: moonInfo(tsOk ? ts : new Date(), (d.archetype || '').split('+')[0].trim()), coin: coinInfo(d.archetype),
    trapNote: `สถานะ ${STATE_TH[d.state] || d.state} · คะแนนรวม ${sgn(cs)} · เทคนิค ${sgn(d.tech_score)} / โหร ${sgn(d.eso_score)} — ไม่ควรเข้าเทรดตามแผนนี้`
  };
}
const sigs = () => Object.values(S.data).map(decorate);
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
  $('#rail').innerHTML = NAV.map(([k, l, i]) => `<button data-act="go:${k}"${cur === k ? ' aria-current="page"' : ''}>${ic(i)}<span>${l}</span></button>`).join('') +
    `<div class="src"><span class="kicker">แหล่งข้อมูล</span><span style="display:flex;align-items:center;gap:6px;font-size:13px"><span class="dot" style="background:${$('#eng-dot').style.background}"></span>${S.src === 'binance' ? 'Binance · คำนวณในเบราว์เซอร์' : esc(apiBase().replace(/^https?:\/\//, ''))}</span><span class="muted xs">ล่าสุด ${S.lastOk ? thTime(new Date(S.lastOk)) : '—'}</span></div>`;
  $('#tabbar').innerHTML = TABS.map(([k, l, i]) => `<button data-act="go:${k}"${cur === k ? ' aria-current="page"' : ''}>${ic(i, 20)}<span>${l}</span></button>`).join('');
}
function show(id) { ['v-state','v-dash','v-detail','v-oracle','v-sketch','v-soon'].forEach(v => $('#' + v).hidden = v !== id); }

function renderView() {
  const has = Object.keys(S.data).length > 0, scr = S.screen;
  if (scr === 'sketch') { show('v-sketch'); renderSketch(); return; }
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
  const riskUsd = num(S.bal) * num(S.risk) / 100, lot = riskUsd / (SL_OFF * sel.SY.pv);
  return { lot: lot >= 100 ? fmt(lot, 0) : lot.toFixed(2), loss: '$' + fmt(riskUsd, riskUsd < 1000 ? 2 : 0) };
}
function renderDetail() {
  const s = selSig(); if (!s) return;
  const c = calcPlan(s), p = s.raw.current_price;
  const quad = s.tech >= 0 ? (s.eso >= 0 ? 2 : 4) : (s.eso >= 0 ? 1 : 3), on = 'color-mix(in oklch, var(--acc) 10%, transparent)';
  const mx = (110 + clamp(s.tech, -100, 100) * .9).toFixed(1), my = (100 - clamp(s.eso, -100, 100) * .9).toFixed(1);
  const mline = (quad === 2 ? 'เทคนิค ▲ · โหร ▲ → สอดคล้องขาขึ้น' : quad === 3 ? 'เทคนิค ▼ · โหร ▼ → สอดคล้องขาลง' : 'เทคนิคกับโหรชี้คนละทาง → ขัดแย้ง') + ' · ' + s.stateLbl;
  $('#v-detail').innerHTML = `
  <div class="sticky-bar">
    <button class="btn btn-ghost" data-act="go:dash" aria-label="กลับไปที่ฟีด">${ic('back')}กลับ</button>
    <div style="font-size:15px"><b>${s.sym}</b><span class="muted"> · ${s.dateTime}</span></div>
    <div class="grow"></div>
    <button class="btn btn-ghost" data-act="ignore">${ic('bellOff')}ไม่สนใจ</button>
    <button class="btn btn-icon" data-act="alert" aria-label="ตั้งแจ้งเตือน" title="ตั้งแจ้งเตือน">${ic('bell')}</button>
    <button class="btn btn-icon" data-act="copy" aria-label="คัดลอกแผน" title="คัดลอกแผน">${ic('copy')}</button>
    <button class="btn btn-primary" data-act="log">${ic('pen')}บันทึกการตัดสินใจ</button>
  </div>
  <div class="page">
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
        <div class="card-title"><span class="h">คะแนนแต่ละชั้น</span><span class="muted xs">component_scores</span></div>
        ${s.comps.map(([n, v]) => `<div style="display:flex;flex-direction:column;gap:6px"><div class="row"><span>${n}</span><span style="color:${vc(v)};font-weight:500">${countHTML(v)}</span></div><div role="img" aria-label="${n} ${v}">${barHTML(v)}</div></div>`).join('')}
        <div class="scale" style="border-top:1px solid var(--bd-s);padding-top:8px"><span>−100 ลบ</span><span>0</span><span>บวก +100</span></div>
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
          <div class="card-title"><span class="h">แผนเทรด · บันไดราคา</span><span class="muted xs">SL −15 · TP +30</span></div>
          ${s.ladder.map(([l, v, c, h, lc]) => `<div class="ladder"><span class="mk" style="height:${h}px;background:${c}"></span><span style="color:${lc};font-weight:${l.startsWith('เข้า') ? 600 : 400}">${l}</span><b style="font-weight:500">${fmt(v, s.SY.dp)}</b><span class="muted xs" style="text-align:right">${l.startsWith('เข้า') ? '' : sgn(+(v - p).toFixed(s.SY.dp))}</span></div>`).join('')}
          <div class="fields">
            <label>ยอดเงิน (USD)<input class="input" inputmode="decimal" data-inp="bal" value="${esc(S.bal)}"></label>
            <label>ความเสี่ยง %<input class="input" inputmode="decimal" data-inp="risk" value="${esc(S.risk)}"></label>
          </div>
          <div class="stats"><div><span>ขนาดล็อต</span><b id="calc-lot" style="color:var(--acc)">${c.lot}</b></div><div><span>ขาดทุนสูงสุด</span><b id="calc-loss">${c.loss}</b></div><div><span>R:R</span><b>1 : 2</b></div></div>
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
  startStars();
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
  priceLines.forEach(l => series.removePriceLine(l)); priceLines = [];
  const d = S.data[S.csym];
  if (d) {
    const SY = symInfo(d.symbol), p = d.current_price, t2 = cssColor('--t2');
    series.applyOptions({ priceFormat:{ type:'price', precision:SY.dp, minMove:Math.pow(10, -SY.dp) } });
    priceLines = [[d.key_levels.resistance,'แนวต้าน',t2,2],[p + TP_OFF,'TP',cssColor('--bull'),0],[p,'เข้า',cssColor('--acc'),0],[p - SL_OFF,'SL',cssColor('--bear'),0],[d.key_levels.support,'แนวรับ',t2,2]]
      .map(([price, title, color, lineStyle]) => series.createPriceLine({ price, title, color, lineStyle, lineWidth:1, axisLabelVisible:true }));
  }
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
  let shot;
  try { chart.applyOptions({ autoSize:false }); chart.resize(W, H - 40, true); shot = chart.takeScreenshot(); } finally { chart.applyOptions({ autoSize:true }); }
  const out = document.createElement('canvas'); out.width = W; out.height = H;
  const x = out.getContext('2d'), d = S.data[S.csym], tfL = (TFS.find(t => t[0] === S.tf) || [, ''])[1], now = new Date();
  x.fillStyle = cssColor('--bg'); x.fillRect(0, 0, W, H); x.drawImage(shot, 0, 40, W, H - 40);
  x.textBaseline = 'middle'; x.fillStyle = cssColor('--t1'); x.font = '600 20px Barlow, "Noto Sans Thai", sans-serif';
  x.fillText(`${S.csym} · ${tfL}${d ? ' · ' + fmt(d.current_price, symInfo(d.symbol).dp) + ' · เกรด ' + d.grade : ''}`, 16, 21);
  x.fillStyle = cssColor('--t3'); x.font = '400 14px Barlow, "Noto Sans Thai", sans-serif'; x.textAlign = 'right'; x.fillText('ฟรีซเมื่อ ' + thDate(now) + ' · ' + thTime(now), W - 16, 21);
  const img = out.toDataURL('image/png');
  const s = { id:'sh' + Date.now(), img, thumb:img, sym:S.csym, tf:tfL, at:Date.now(), objs:null };
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
  
  // 🌟 แก้ไขตรงนี้: ใช้ calcOffset + renderAll แทน requestRenderAll
  fc.calcOffset();
  fc.renderAll();
  
  if (S.screen === 'sketch') {
    document.querySelectorAll('[data-act^="tool:"]').forEach(btn => {
      const isActive = btn.dataset.act === `tool:${t}`;
      btn.style.background = isActive ? 'var(--e3)' : 'transparent';
      btn.style.color = isActive ? 'var(--t1)' : 'var(--t2)';
    });
  }
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
    if (s.objs && s.objs.length) fabric.util.enlivenObjects(s.objs, objs => { silent = true; objs.forEach(o => fc.add(o)); silent = false; fc.renderAll(); done(); });
    else done();
  });
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
  if (['dash','detail','oracle','sketch'].includes(scr)) { S.screen = scr; S.soon = ''; } else { S.screen = 'soon'; S.soon = scr; }
  S.menu = null; window.scrollTo(0, 0); render(true);
  if (scr === 'dash' && chart) setTimeout(() => chart.timeScale().fitContent(), 0);
}
function setSym(k) { if (S.csym === k) { S.menu = null; render(); return; } S.csym = k; S.sel = k; S.menu = null; candles = null; render(true); fetchCandles(); }
function setSource(v) { S.src = v; S.menu = null; ls.set('cta-src-v', v); S.data = {}; S.status = 'loading'; render(); toast('แหล่งข้อมูล: ' + (v === 'binance' ? 'Binance' : 'FastAPI')); runNow(false, true); }
function toggleAuto() { S.auto = !S.auto; ls.set('cta-auto-v', S.auto); if (S.auto) reAt = Date.now() + S.ivMin * 60000; renderTop(); toast(S.auto ? `เปิดการวิเคราะห์อัตโนมัติ · ทุก ${S.ivMin} นาที` : 'ปิดการวิเคราะห์อัตโนมัติแล้ว'); }
function setInterval_(m) { S.menu = null; if (S.ivMin !== m) { S.ivMin = m; ls.set('cta-interval', m); reAt = Date.now() + m * 60000; toast('วิเคราะห์อัตโนมัติ' + (m === 60 ? 'ทุก 1 ชั่วโมง' : 'ทุก ' + m + ' นาที') + (S.auto ? '' : ' · สวิตช์อัตโนมัติยังปิดอยู่')); } renderTop(); }
function copyPlan() { const s = selSig(); if (!s) return; const p = s.raw.current_price, dp = s.SY.dp;
  navigator.clipboard?.writeText(`${s.sym} เกรด ${s.grade} · เข้า ${fmt(p, dp)} · SL ${fmt(p - SL_OFF, dp)} · TP ${fmt(p + TP_OFF, dp)} · ล็อต ${calcPlan(s).lot}`).catch(() => {}); toast('คัดลอกแผนเทรดแล้ว'); }
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
    case 'auto': toggleAuto(); break;
    case 'src': setSource(arg); break;
    case 'iv': setInterval_(+arg); break;
    case 'sym': setSym(arg); break;
    case 'tf': if (S.tf !== arg) { S.tf = arg; renderDash(); fetchCandles(); } break;
    case 'select': S.sel = arg; renderDash(); break;
    case 'open': S.sel = arg; go('detail'); break;
    case 'freeze': freeze(); break;
        case 'log': 
      const currentSignal = selSig();
      if (currentSignal) {
        fetch('https://confluence-api-23ix.onrender.com/api/journal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            symbol: currentSignal.sym,
            grade: currentSignal.grade,
            action: 'enter',
            price: currentSignal.raw.current_price
          })
        })
        .then(res => res.json())
        .then(data => toast(`บันทึกแล้ว: ${data.message}`))
        .catch(err => toast(`บันทึกไม่สำเร็จ: ${err.message}`));
      }
      break;
    case 'alert': toast(`ตั้งแจ้งเตือนแล้ว · ${S.sel} เมื่อเกรดเปลี่ยน`); break;
    case 'ignore': toast(`ไม่สนใจ ${S.sel} ในเซสชันนี้`); go('dash'); break;
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
    case 'shot': saveShot(); S.shotId = arg; renderSketch(); break;
    case 'shot-del': S.shots = S.shots.filter(x => x.id !== S.shotId); S.shotId = S.shots[0] ? S.shots[0].id : null; persistShots(); renderSketch(); toast('ลบภาพแล้ว'); break;
  }
});
document.addEventListener('dblclick', e => { const el = e.target.closest('[data-dbl]'); if (el) { S.sel = el.dataset.dbl.split(':')[1]; go('detail'); } });
document.addEventListener('input', e => {
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
setInterval(() => { S.now = Date.now(); renderTop(); if (S.auto && !S.running && Date.now() >= reAt) runNow(true); }, 1000);
setInterval(() => { if (S.csym) fetchCandles(true); }, 60000);
})();
