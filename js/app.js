import { WAYPOINTS, WP_DIST, TOTAL_M, DESTINATION, buildTimeline, posAtDist, haversine, distOfPoint } from './route.js';
import { EPISODES, MISSIONS } from './content.js';
import { SafetyMachine, POLICY, Mode } from './safety.js';
import { Engine } from './engine.js';
import { DriveSource, Vehicle, FusedLocation, NaviHelper, TextToSpeech, SpeechToText, onSdkLog, sdkLog, logSdk } from './sdk-sim.js';
import { mapSvg, icon } from './ui-parts.js';

const Q = new URLSearchParams(location.search);
const VIEW = Q.get('view') === 'tablet' ? 'tablet' : 'car';
const CLEAN = Q.has('clean');
const STAGE = VIEW === 'tablet' ? { w: 1180, h: 820 } : { w: 1920, h: 720 };
if (CLEAN) document.body.classList.add('clean');

// ---------- simulated SDK wiring ----------
const tl = buildTimeline();
const src = new DriveSource();
const vehicle = new Vehicle(src), fused = new FusedLocation(src), navi = new NaviHelper(src, DESTINATION);
const tts = new TextToSpeech({ mute: Q.get('mute') === '1', fast: Number(Q.get('fast') || 1) });
const stt = new SpeechToText();
const safety = new SafetyMachine();
const sim = { t: 0, playing: false, ts: Number(Q.get('ts') || 30), started: false };
const dev = { override: false, speed: 0, gear: 'P' };

const engine = new Engine({ tts, stt, safety, onChange: () => { dirty = true; saveReport(); }, autoChild: Q.get('auto') === '1', fast: Number(Q.get('fast') || 1) });
let dirty = true, lastSig = '';

// ---------- precompute trigger times / distances ----------
const epDist = {}, epT = {};
EPISODES.forEach((ep) => {
  if (ep.kind === 'arrival') { epT[ep.id] = tl.T - 90 - ep.trigger.etaSec - 4; epDist[ep.id] = TOTAL_M; return; }
  epDist[ep.id] = distOfPoint(ep.trigger);
  for (let t = 0; t <= tl.T; t += 5) { const p = posAtDist(tl.dist[t]); if (haversine(p, ep.trigger) <= ep.trigger.r) { epT[ep.id] = t; break; } }
});
window.__epT = epT;
const arriveT = tl.T - 90;                       // first parked sample at the destination
const etaAt = (t) => Math.max(0, arriveT - t);

function stateAt(t) {
  const i = Math.min(tl.T, Math.floor(t)), f = t - i, j = Math.min(tl.T, i + 1);
  const dist = tl.dist[i] + (tl.dist[j] - tl.dist[i]) * f;
  const p = posAtDist(dist);
  return { dist, speed: tl.speed[i], gear: tl.gear[i], ...p };
}

function applySim() {
  const s = stateAt(sim.t);
  src.s = { speedKmh: s.speed, gear: s.gear, lat: s.lat, lon: s.lon, bearing: s.bearing, remainingSec: etaAt(sim.t), remainingM: Math.max(0, TOTAL_M - s.dist) };
  return s;
}

const ctxFor = (s) => ({
  t: sim.t, etaSec: etaAt(sim.t),
  dist: (a) => haversine({ lat: s.lat, lon: s.lon }, a),
  passed: (ep) => ep.kind !== 'arrival' && s.dist > epDist[ep.id] + ep.trigger.r + 1500,
  get gapSec() {
    const nexts = EPISODES.filter((e) => !engine.done.has(e.id) && !engine.missed.has(e.id) && e.id !== engine.session?.ep.id && (epT[e.id] ?? 0) > sim.t).map((e) => epT[e.id] - sim.t);
    return Math.max(60, Math.min(nexts.length ? Math.min(...nexts) : 1e9, etaAt(sim.t)));
  },
  prefetch: (ep) => {
    const ahead = EPISODES.filter((e) => (epDist[e.id] ?? 0) > s.dist && epDist[e.id] - s.dist < 40000 && e.id !== ep.id).map((e) => e.id);
    navi.getRoutePreview(40000, ahead);
  },
});

let cur = null;
function frame() {
  cur = applySim();
  if (sim.playing) {
    const v = vehicle.snapshot(); fused.getLastLocation();
    safety.update(v, `t=${Math.round(sim.t)}`);
  } else safety.update({ speedKmh: vehicle.getSpeedKmh(), gear: vehicle.getGear() });
  if (sim.started && sim.playing) engine.tick(ctxFor(cur));
  if (sim.playing && sim.t >= arriveT && !engine.busy && !engine.tripDone) { engine.arrive().then(() => { saveReport(true); }); }
  render();
  invariant();
}

let last = performance.now();
setInterval(() => {
  const now = performance.now(), dt = (now - last) / 1000; last = now;
  if (sim.playing && sim.t < tl.T) sim.t = Math.min(tl.T, sim.t + dt * sim.ts);
  frame();
}, 100);

// ---------- invariant: no visual elements while not STOPPED ----------
let invariantOk = true, invariantChecks = 0;
function invariant() {
  invariantChecks++;
  const vis = document.querySelectorAll('#stage [data-visual]').length;
  invariantOk = POLICY[safety.mode].visuals || vis === 0;
  if (!invariantOk) console.error('SAFETY INVARIANT VIOLATED: visual elements while', safety.mode);
}

// ---------- report ----------
function saveReport(force) {
  if (!(sim.started)) return;
  try { localStorage.setItem('roadschool.report', JSON.stringify(engine.report(DESTINATION))); } catch (e) {}
}

// ---------- render ----------
const $stage = document.getElementById('stage'), $wrap = document.getElementById('stagewrap');
function fit() {
  const w = $wrap.clientWidth; const h = CLEAN ? window.innerHeight : w * STAGE.h / STAGE.w;
  const sc = CLEAN ? Math.min(window.innerWidth / STAGE.w, window.innerHeight / STAGE.h) : w / STAGE.w;
  $wrap.style.height = h + 'px';
  $stage.style.width = STAGE.w + 'px'; $stage.style.height = STAGE.h + 'px';
  const ox = CLEAN ? (window.innerWidth - STAGE.w * sc) / 2 : 0, oy = CLEAN ? (window.innerHeight - STAGE.h * sc) / 2 : 0;
  $stage.style.transform = `translate(${ox}px,${oy}px) scale(${sc})`;
}
window.addEventListener('resize', fit); fit();

const fmtEta = (s) => { const m = Math.round(s / 60); return m >= 60 ? [Math.floor(m / 60) + '', '시간 ' + (m % 60) + '분'] : [m + '', '분']; };
const chipFor = (mode, v) => mode === Mode.STOPPED ? `<span class="chip stop"><span class="dot"></span>P 정차 · 시각 카드 ON</span>` : mode === Mode.LOW ? `<span class="chip low"><span class="dot"></span>서행 ${Math.round(v.speedKmh)}km/h · 음성 전용</span>` : `<span class="chip drv"><span class="dot"></span>주행 ${Math.round(v.speedKmh)}km/h · 화면 OFF</span>`;

function bar(mode, v) {
  const [a, b] = fmtEta(etaAt(sim.t));
  return `<div class="bar"><div class="logo"><i>${icon('road', 24)}</i>로드스쿨<small>RoadSchool</small></div><span class="simtag">SIM</span><div class="sp"></div>${chipFor(mode, v)}${VIEW === 'tablet' ? `<span class="chip">도착까지 ${a}${b}</span>` : ''}</div>`;
}

function missionsHtml() {
  return MISSIONS.map((m, i) => { const st = engine.missionState()[i]; return `<div class="mi ${st.complete ? 'done' : ''}"><span class="n">${st.complete ? '✓' : m.id}</span>${m.title}<span class="pg">${st.finished}/${st.total}</span></div>`; }).join('');
}
function epCard() {
  const s = engine.session;
  const last = engine.learned.at(-1);
  if (s) return `<div class="ep"><div class="t">${s.ep.title}</div><div>${s.ep.place}</div><span class="tag">${s.ep.concept}</span><span class="tag tier">${engine.tierInfo?.label} 에피소드 · ETA 맞춤</span><div class="note" style="margin-top:8px">${s.ep.curriculum}</div></div>`;
  if (last) return `<div class="ep"><div class="t">방금 배운 곳: ${last.place}</div><span class="tag">${last.concept}</span><div class="note" style="margin-top:8px">${last.curriculum}</div></div>`;
  return `<div class="ep"><div class="t">출발 준비 완료</div><div>목적지 ${DESTINATION.name}</div><div class="note" style="margin-top:8px">출발하면 화면은 꺼지고 로드쌤이 음성으로 수업해요.</div></div>`;
}

function voiceScreen(mode) {
  const sp = engine.speaking ? 'speaking' : '';
  if (mode === Mode.LOW) return `<div class="voice ${sp}"><div class="pulse">${'<b></b>'.repeat(9)}</div><div class="lab">잠깐 쉬어가요</div><div class="sub">서행 중이라 새 질문은 멈췄어요 · 이야기만 마무리해요</div><div class="tiny">음성 전용 모드 · 화면 요소 없음</div></div>`;
  return `<div class="voice ${sp}"><div class="pulse">${'<b></b>'.repeat(9)}</div><div class="lab">음성 수업 중</div><div class="sub">&nbsp;</div><div class="tiny">주행 중 · 화면 OFF · 음성 전용</div></div>`;
}

function tabletQuestion() {
  const c = engine.cur;
  if (!c) return `<div class="ep"><div class="t">${engine.session ? engine.session.ep.title : '다음 장소를 기다리는 중'}</div><div class="note">${engine.session ? '로드쌤의 이야기를 듣고 있어요' : '창밖을 구경하세요! 곧 새로운 장소가 나와요.'}</div></div>`;
  return `<div class="q"><div class="qt">${c.q.prompt}</div><div class="opts">${c.options.map((o) => `<button class="opt" data-visual data-ans="${o}">${o}</button>`).join('')}</div><div class="note">말로 대답해도 되고, 정차 중에는 눌러서 대답할 수 있어요 (뒷좌석 화면)</div></div>`;
}

function mapHtml(v) { return mapSvg({ dist: cur.dist, learned: engine.learned, missed: engine.missed, done: engine.done, current: engine.session?.ep.id, car: { lat: cur.lat, lon: cur.lon }, w: VIEW === 'tablet' ? 1108 : 1130, h: VIEW === 'tablet' ? 330 : 600, bb: VIEW === 'tablet' ? { lat0: 37.9, lat1: 37.05, lon0: 126.9, lon1: 129.1 } : null }); }

function render() {
  const mode = safety.mode, v = { speedKmh: vehicle.getSpeedKmh(), gear: vehicle.getGear() };
  const sig = [mode, VIEW, engine.session?.ep.id, engine.cur?.q.id, engine.done.size, engine.missed.size, engine.stars, engine.speaking, sim.started, engine.tripDone, Math.round(v.speedKmh / 5), Math.floor(etaAt(sim.t) / 60), Math.floor(cur.dist / 800)].join('|');
  if (sig !== lastSig || dirty) {
    lastSig = sig; dirty = false;
    let html;
    if (mode !== Mode.STOPPED) {
      html = `<div class="${VIEW === 'tablet' ? 'tab' : 'car'}" style="background:#000">${voiceScreen(mode)}</div>`;
    } else if (VIEW === 'car') {
      html = `<div class="car">${bar(mode, v)}<div class="body">
        <div class="card mapcard" data-visual><div class="cap">지금까지 지나온 길</div>${mapHtml()}</div>
        <div class="side" data-visual>
          <div class="card"><h3>도착까지</h3><div class="eta"><span class="big">${fmtEta(etaAt(sim.t)).join('</span><span class="unit">')}</span></div><div class="remain">남은 미션 <b>${engine.remainingMissions}</b>개 <span class="stars" style="margin-left:auto">★ ${engine.stars}</span></div></div>
          <div class="card"><h3>오늘의 미션 3개</h3><div class="mis">${missionsHtml()}</div></div>
          <div class="card" style="flex:1">${epCard()}</div>
        </div></div></div>`;
    } else {
      html = `<div class="tab">${bar(mode, v)}<div class="body">
        <div class="card mapcard" data-visual><div class="cap">오늘 배운 지도</div>${mapHtml()}</div>
        <div style="display:grid;grid-template-columns:1.25fr 1fr;gap:22px;min-height:0" data-visual>
          <div class="card">${tabletQuestion()}</div>
          <div class="card"><h3>도착까지 남은 미션 ${engine.remainingMissions}개 · ★ ${engine.stars}</h3><div class="mis">${missionsHtml()}</div></div>
        </div></div></div>`;
    }
    $stage.innerHTML = html;
    $stage.querySelectorAll('[data-ans]').forEach((b) => b.addEventListener('click', () => { engine.answerByTouch(b.dataset.ans); }));
  }
  updateDev();
}

// ---------- developer / simulation panel (not part of the in-car product) ----------
const $dev = document.getElementById('dev');
if (!CLEAN) {
  $dev.innerHTML = `
  <section><h4>Trip simulation</h4>
    <div class="row"><button id="b-go">▶ 출발 (sim)</button><button id="b-pause">⏸</button><button id="b-reset">↺ 처음부터</button>
      <select id="s-ts"><option>10</option><option>30</option><option>60</option><option>120</option><option>300</option></select> ×</div>
    <div class="row"><select id="s-jump"><option value="">장소로 점프…</option>${EPISODES.map((e) => `<option value="${e.id}">${e.place}</option>`).join('')}</select><a id="a-rep" href="report.html" target="_blank" style="color:#35d6c2">오늘 배운 지도 열기</a></div>
    <div class="row"><label><input type="checkbox" id="c-auto"> 아이 자동 대답(데모)</label> <label>화면: <select id="s-view"><option value="car">차량 디스플레이</option><option value="tablet">뒷좌석 태블릿</option></select></label></div>
    <div id="d-state"></div></section>
  <section><h4>Vehicle SDK override (SIM)</h4>
    <div class="row"><label><input type="checkbox" id="c-ov"> 수동 값 사용</label>
      <select id="s-gear"><option>P</option><option>D</option></select>
      <input type="range" id="r-speed" min="0" max="120" value="0"> <span id="v-speed">0 km/h</span></div>
    <div class="row"><button data-pre="P,0">정차 P</button><button data-pre="D,0">D 대기(신호)</button><button data-pre="D,18">서행 18</button><button data-pre="D,100">주행 100</button></div>
    <div id="d-safe"></div></section>
  <section><h4>Child STT (SIM)</h4>
    <div id="d-q" style="margin-bottom:6px">대기 중</div>
    <div class="row"><input type="text" id="t-ans" placeholder="아이의 대답을 입력" size="22"><button id="b-send">전송</button></div>
    <div class="row" id="quick"></div></section>
  <section><h4>SDK calls (all SIMULATED)</h4><div class="log" id="l-sdk"></div></section>
  <section><h4>Voice transcript (실차에서는 소리로만)</h4><div class="log" id="l-tr"></div></section>`;
  const $ = (id) => document.getElementById(id);
  $('s-ts').value = String(sim.ts); $('s-view').value = VIEW; $('c-auto').checked = engine.autoChild;
  $('b-go').onclick = start; $('b-pause').onclick = () => { sim.playing = !sim.playing; };
  $('b-reset').onclick = () => { location.href = location.pathname + location.search; };
  $('s-ts').onchange = (e) => { sim.ts = Number(e.target.value); };
  $('s-view').onchange = (e) => { const u = new URL(location.href); u.searchParams.set('view', e.target.value); location.href = u; };
  $('c-auto').onchange = (e) => { engine.autoChild = e.target.checked; };
  $('c-ov').onchange = (e) => { vehicle.override = e.target.checked ? { speedKmh: Number($('r-speed').value), gear: $('s-gear').value } : null; };
  const ov = () => { if (vehicle.override) vehicle.override = { speedKmh: Number($('r-speed').value), gear: $('s-gear').value }; $('v-speed').textContent = $('r-speed').value + ' km/h'; };
  $('r-speed').oninput = ov; $('s-gear').onchange = ov;
  document.querySelectorAll('[data-pre]').forEach((b) => b.onclick = () => { const [g, s] = b.dataset.pre.split(','); $('c-ov').checked = true; $('s-gear').value = g; $('r-speed').value = s; vehicle.override = { speedKmh: Number(s), gear: g }; $('v-speed').textContent = s + ' km/h'; });
  $('s-jump').onchange = (e) => { if (!e.target.value) return; start(); sim.t = Math.max(0, (epT[e.target.value] ?? 0) - 6); e.target.value = ''; };
  const send = () => { const v = $('t-ans').value; if (v && !engine.answerByVoiceSim(v)) engine.note('시스템', '(지금은 듣고 있지 않아요)'); $('t-ans').value = ''; };
  $('b-send').onclick = send; $('t-ans').onkeydown = (e) => { if (e.key === 'Enter') send(); };
  onSdkLog(() => {});
}
function start() {
  if (sim.started) { sim.playing = true; return; }
  sim.started = true; sim.playing = true;
  engine.intro({ etaSec: etaAt(0) });
}
document.addEventListener('keydown', (e) => { if (e.key === ' ' && e.target === document.body) { e.preventDefault(); start(); } });

let lastDev = 0;
function updateDev() {
  if (CLEAN) return; const now = performance.now(); if (now - lastDev < 400) return; lastDev = now;
  const $ = (id) => document.getElementById(id);
  const m = safety.mode;
  $('d-state').innerHTML = `t=${Math.floor(sim.t / 60)}분 · 위치 ${cur.lat.toFixed(3)}, ${cur.lon.toFixed(3)} · 남은 ${Math.round((TOTAL_M - cur.dist) / 1000)}km · ETA ${Math.round(etaAt(sim.t) / 60)}분<br>${engine.lastEvent || ''}`;
  $('d-safe').innerHTML = `Vehicle: <b>${Math.round(vehicle.getSpeedKmh())} km/h, ${vehicle.getGear()}</b> → mode <b>${m}</b> (${POLICY[m].label})<br>안전 불변식(시각 요소는 P에서만): <b class="${invariantOk ? 'ok' : 'bad'}">${invariantOk ? 'OK' : 'VIOLATED'}</b> · 전환 ${safety.history.length}회 · 검사 ${invariantChecks}회`;
  const c = engine.cur;
  $('d-q').innerHTML = c ? `<b>질문</b> ${c.q.prompt}<br><span class="${stt.listening ? 'ok' : ''}">${stt.listening ? '● 듣는 중 (STT sim)' : '말하는 중…'}</span>` : (engine.session ? `에피소드 진행 중: ${engine.session.ep.title} (${engine.tierInfo?.label})` : '대기 중 · 질문 없음');
  $('quick').innerHTML = c ? [...c.options, '몰라요', '음…'].map((o) => `<button data-q="${o}">${o}</button>`).join('') : '';
  document.querySelectorAll('#quick [data-q]').forEach((b) => b.onclick = () => engine.answerByVoiceSim(b.dataset.q));
  $('l-sdk').innerHTML = sdkLog.slice(-16).map((e) => `<span class="s">[SIM ${e.api}]</span> ${e.call} ${e.result ? '→ ' + e.result : ''}`).join('\n');
  const tr = engine.transcript.slice(-12); const el = $('l-tr');
  el.innerHTML = tr.map((e) => `<span class="${e.who === '아이' ? 'c' : e.who === '시스템' ? 's' : 'a'}">${e.who}</span> ${e.text}`).join('\n'); el.scrollTop = el.scrollHeight;
}

// test / capture hooks
window.RS = { sim, engine, safety, vehicle, stt, tts, tl, epT, start, dev, state: () => ({ t: sim.t, mode: safety.mode, speed: vehicle.getSpeedKmh(), gear: vehicle.getGear(), stars: engine.stars, done: [...engine.done], cur: engine.cur?.q.id || null, session: engine.session?.ep.id || null, invariantOk, tripDone: engine.tripDone }) };
if (Q.get('autostart') === '1') setTimeout(start, 400);
frame();
