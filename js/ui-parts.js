import { WAYPOINTS, posAtDist, TOTAL_M } from './route.js';
import { EPISODES } from './content.js';

// Schematic map (NOT survey-accurate): coastline / rivers / ridge are simplified polylines for orientation only.
const BB0 = { lat0: 37.92, lat1: 37.02, lon0: 126.95, lon1: 129.15 };
let BB = BB0;
export function proj(lat, lon, W = 1000, H = 470) { return [(lon - BB.lon0) / (BB.lon1 - BB.lon0) * W, (BB.lat0 - lat) / (BB.lat0 - BB.lat1) * H]; }
const pts = (arr, W, H) => arr.map(([la, lo]) => proj(la, lo, W, H).map((n) => n.toFixed(1)).join(',')).join(' ');
const SHORT = { 'han-seoul': ['한강', 'start', 14, -16], 'namhan-yeoju': ['여주', 'start', 16, 8], 'pyeongchang': ['평창', 'start', 4, 36], 'daegwallyeong': ['대관령', 'end', -16, -14], 'east-west-sea': ['강릉 진입', 'start', 16, 38], 'ojukheon': ['오죽헌', 'start', 22, -12] };

const COAST = [[37.95, 128.76], [37.89, 128.83], [37.81, 128.92], [37.70, 129.03], [37.52, 129.12], [37.0, 129.4]];
const HAN = [[37.62, 126.65], [37.60, 126.80], [37.56, 126.95], [37.52, 127.05], [37.53, 127.2], [37.54, 127.31]];
const NAMHAN = [[37.54, 127.31], [37.47, 127.5], [37.30, 127.64], [37.10, 127.8], [37.0, 127.93]];
const RIDGE = [[37.95, 128.5], [37.80, 128.65], [37.68, 128.72], [37.45, 128.85], [37.2, 129.0], [37.0, 129.1]];

export function icon(name, s = 24) {
  const p = { road: '<path d="M7 3 4 21M17 3l3 18M12 4v3M12 10v4M12 17v3" stroke="#06231f" stroke-width="2.4" stroke-linecap="round" fill="none"/>' }[name] || '';
  return `<svg width="${s}" height="${s}" viewBox="0 0 24 24">${p}</svg>`;
}
const star = (x, y, r, fill) => { const a = []; for (let i = 0; i < 10; i++) { const rr = i % 2 ? r * 0.45 : r; const ang = -Math.PI / 2 + i * Math.PI / 5; a.push((x + rr * Math.cos(ang)).toFixed(1) + ',' + (y + rr * Math.sin(ang)).toFixed(1)); } return `<polygon points="${a.join(' ')}" fill="${fill}" stroke="#7a5a00" stroke-width="1"/>`; };

export function mapSvg({ dist = 0, learned = [], missed = new Set(), done = new Set(), current = null, car = null, w = 1000, h = 470, labels = true, showCar = true, bb = null, fs = 1 } = {}) {
  BB = bb || BB0;
  const seaPoly = pts(COAST, w, h) + ` ${w},${h} ${w},0 ${proj(37.95, 128.76, w, h)[0]},0`;
  const full = WAYPOINTS.map((p) => proj(p.lat, p.lon, w, h).join(',')).join(' ');
  const trav = []; for (let d = 0; d <= dist; d += 2500) { const p = posAtDist(d); trav.push(proj(p.lat, p.lon, w, h).join(',')); }
  if (car) trav.push(proj(car.lat, car.lon, w, h).join(','));
  const learnedIds = new Set(learned.map((l) => l.epId));
  const pins = EPISODES.map((e) => {
    const [x, y] = proj(e.pin.lat, e.pin.lon, w, h); const got = learnedIds.has(e.id); const miss = missed.has(e.id);
    const fill = got ? '#ffc857' : miss ? '#56637d' : current === e.id ? '#35d6c2' : '#2f4a7a';
    return `<g><circle cx="${x}" cy="${y}" r="${got ? 13 : 10}" fill="${fill}" stroke="#0a111d" stroke-width="3"/>${got ? star(x, y - 0.5, 9, '#fff3c4') : ''}${labels ? (() => { const [t, an, ox, oy] = SHORT[e.id] || [e.place, 'start', 16, 6]; return `<text x="${x + ox}" y="${y + oy}" text-anchor="${an}" font-size="21" font-weight="700" fill="${got ? '#ffe9a8' : '#9fb2d6'}" stroke="#0a111d" stroke-width="4" paint-order="stroke">${t}</text>`; })() : ''}</g>`;
  }).join('');
  const [dx, dy] = proj(37.79, 128.9, w, h), [sx, sy] = proj(37.519, 127.09, w, h);
  const carMk = showCar && car ? (() => { const [x, y] = proj(car.lat, car.lon, w, h); return `<g><circle cx="${x}" cy="${y}" r="20" fill="#35d6c2" opacity=".25"><animate attributeName="r" values="12;26;12" dur="2s" repeatCount="indefinite"/></circle><circle cx="${x}" cy="${y}" r="9" fill="#35d6c2" stroke="#fff" stroke-width="3"/></g>`; })() : '';
  const svg = `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="경로 지도(개략)">
  <rect width="${w}" height="${h}" fill="#17233a"/>
  <polygon points="${seaPoly}" fill="#103054"/>
  <polyline points="${pts(RIDGE, w, h)}" fill="none" stroke="#3a4b6a" stroke-width="14" stroke-linecap="round" stroke-dasharray="2 18" opacity=".9"/>
  <polyline points="${pts(HAN, w, h)}" fill="none" stroke="#3c8bd9" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
  <polyline points="${pts(NAMHAN, w, h)}" fill="none" stroke="#3c8bd9" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
  <polyline points="${full}" fill="none" stroke="#3a4a6b" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
  <polyline points="${trav.join(' ')}" fill="none" stroke="#35d6c2" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
  ${labels ? `<text x="${proj(37.6, 129.1, w, h)[0]}" y="${proj(37.6, 129.1, w, h)[1]}" text-anchor="end" font-size="26" fill="#4d78ad" font-weight="700">동해</text>

  <text x="${proj(37.585, 127.0, w, h)[0]}" y="${proj(37.585, 127.0, w, h)[1] - 14}" font-size="21" fill="#6fb0f0" font-weight="700">한강</text>
  <text x="${proj(37.2, 127.78, w, h)[0]}" y="${proj(37.2, 127.78, w, h)[1]}" font-size="21" fill="#6fb0f0" font-weight="700">남한강</text>
  <text x="${proj(37.3, 128.95, w, h)[0]}" y="${proj(37.3, 128.95, w, h)[1]}" text-anchor="end" font-size="19" fill="#6e7f9f">태백산맥(개략)</text>` : ''}
  <g><circle cx="${sx}" cy="${sy}" r="7" fill="#e9eff9"/><text x="${sx - 8}" y="${sy + 34}" font-size="21" fill="#cbd7ee" font-weight="700">서울 잠실</text></g>
  <g><rect x="${dx - 9}" y="${dy - 9}" width="18" height="18" rx="4" fill="#ff7a59" stroke="#fff" stroke-width="2"/><text x="${dx - 14}" y="${dy - 24}" text-anchor="end" font-size="21" fill="#ffd2c6" font-weight="800">도착 강릉</text></g>
  ${pins}${carMk}</svg>`;
  return fs === 1 ? svg : svg.replace(/font-size="(\d+)"/g, (m, n) => `font-size="${Math.round(n * fs)}"`);
}