// Prototype route: 서울(잠실) -> 강릉(경포) via 올림픽대로 / 중부고속도로 / 영동고속도로.
// Waypoint coordinates are APPROXIMATE (rounded, schematic) and only used to drive the demo.
// Speeds / traffic jams / the rest stop are SCRIPTED example values, not measured data.

export const WAYPOINTS = [
  { id: 'start',   name: '서울 잠실',            lat: 37.5190, lon: 127.0900, after: 60 },
  { id: 'jam1',    name: '올림픽대로(강동 방면)', lat: 37.5500, lon: 127.1500, after: 18 },
  { id: 'jam1end', name: '올림픽대로(하남 방면)', lat: 37.5420, lon: 127.1850, after: 110 },
  { id: 'hanam',   name: '하남',                 lat: 37.5480, lon: 127.2150, after: 110 },
  { id: 'gwangju', name: '광주',                 lat: 37.4250, lon: 127.2600, after: 110 },
  { id: 'hobeop',  name: '호법JC 부근',          lat: 37.1300, lon: 127.4300, after: 110 },
  { id: 'yeoju',   name: '여주 부근',            lat: 37.2650, lon: 127.6000, after: 110 },
  { id: 'munmak',  name: '문막 부근',            lat: 37.3100, lon: 127.8200, after: 110 },
  { id: 'wonju',   name: '원주 만종JC 부근',     lat: 37.3750, lon: 127.9700, after: 110 },
  { id: 'rest',    name: '횡성 휴게소',          lat: 37.4950, lon: 128.0400, after: 110, stop: 600 },
  { id: 'dunnae',  name: '둔내 부근',            lat: 37.4900, lon: 128.2600, after: 110 },
  { id: 'jinbu',   name: '진부(평창) 부근',      lat: 37.6400, lon: 128.5600, after: 100 },
  { id: 'hoenggye',name: '횡계(대관령) 부근',    lat: 37.6800, lon: 128.7100, after: 22 },
  { id: 'dh',      name: '대관령 구간(서행 예시)', lat: 37.7000, lon: 128.7450, after: 70 },
  { id: 'gjc',     name: '강릉 진입',            lat: 37.7450, lon: 128.8300, after: 70 },
  { id: 'dest',    name: '강릉 경포 (경포호·오죽헌 일대)', lat: 37.7900, lon: 128.9000, after: 0, stop: 1 },
];
export const DESTINATION = { name: '강릉 경포 (경포호·오죽헌 일대)', lat: 37.79, lon: 128.9 };
const ROAD_FACTOR = 1.08;   // straight-line -> rough road length

const R = 6371000, rad = (d) => d * Math.PI / 180;
export function haversine(a, b) {
  const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
export function bearing(a, b) {
  const y = Math.sin(rad(b.lon - a.lon)) * Math.cos(rad(b.lat));
  const x = Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) - Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(rad(b.lon - a.lon));
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

// cumulative road distance at each waypoint
export const WP_DIST = [0];
for (let i = 1; i < WAYPOINTS.length; i++) WP_DIST.push(WP_DIST[i - 1] + haversine(WAYPOINTS[i - 1], WAYPOINTS[i]) * ROAD_FACTOR);
export const TOTAL_M = WP_DIST[WP_DIST.length - 1];

export function posAtDist(d) {
  d = Math.max(0, Math.min(TOTAL_M, d));
  let i = 1; while (i < WP_DIST.length - 1 && WP_DIST[i] < d) i++;
  const a = WAYPOINTS[i - 1], b = WAYPOINTS[i];
  const f = (d - WP_DIST[i - 1]) / (WP_DIST[i] - WP_DIST[i - 1] || 1);
  return { lat: a.lat + (b.lat - a.lat) * f, lon: a.lon + (b.lon - a.lon) * f, bearing: bearing(a, b), seg: i - 1 };
}
export function distOfPoint(p) { // nearest route distance to a point (coarse scan)
  let best = 1e18, bd = 0;
  for (let d = 0; d <= TOTAL_M; d += 400) { const q = posAtDist(d); const h = haversine(p, q); if (h < best) { best = h; bd = d; } }
  return bd;
}

// ---- scripted drive timeline, 1 sample per simulated second -----------------
export function buildTimeline() {
  const dist = [], speed = [], gear = [];
  let d = 0, v = 0, g = 'P', t = 0, state = 'startdwell', hold = 20;
  const stops = []; // [{dist, dwell}]
  WAYPOINTS.forEach((w, i) => { if (w.stop) stops.push({ d: WP_DIST[i], dwell: w.stop }); });
  let stopIdx = 0, nextDwell0 = 0;
  const targetAt = (dd) => { let i = 1; while (i < WP_DIST.length - 1 && WP_DIST[i] <= dd) i++; return WAYPOINTS[i - 1].after / 3.6; };
  for (let guard = 0; guard < 40000; guard++, t++) {
    dist.push(d); speed.push(v * 3.6); gear.push(g);
    if (state === 'startdwell') { if (--hold <= 0) { g = 'D'; state = 'prep'; hold = 4; } continue; }
    if (state === 'prep') { if (--hold <= 0) state = 'drive'; continue; }
    if (state === 'stopped') { // arrival: gear D for 4s, then P, then 90s of parked samples
      if (--hold <= 0) { g = 'P'; for (let k = 0; k < 90; k++) { dist.push(d); speed.push(0); gear.push('P'); } break; }
      continue;
    }
    if (state === 'dwell') { hold--; if (hold === nextDwell0 - 4) g = 'P'; if (hold <= 4 && g === 'P') g = 'D'; if (hold <= 0) { state = 'drive'; } continue; }
    // drive
    let target = targetAt(d);
    const nextStop = stops[stopIdx];
    if (nextStop) { const rem = nextStop.d - d; const brake = v * v / (2 * 2.0) + 6; if (rem <= brake) target = Math.min(target, Math.max(1.5, Math.sqrt(2 * 2.0 * Math.max(rem, 0)))); }
    const dv = target > v ? Math.min(target - v, 1.6) : Math.max(target - v, -2.2);
    v = Math.max(0, v + dv);
    if (nextStop && d + v >= nextStop.d - 1.5 && v < 4) { d = nextStop.d; v = 0; stopIdx++; if (stopIdx >= stops.length) { state = 'stopped'; hold = 4; } else { state = 'dwell'; hold = nextDwell0 = nextStop.dwell; } continue; }
    d = Math.min(TOTAL_M, d + v);
  }
  return { dist, speed, gear, T: dist.length - 1 };
}
