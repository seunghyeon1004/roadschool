import { EPISODES, LEARN_AT_STOP } from './content.js';
import { mapSvg } from './ui-parts.js';
import { TOTAL_M } from './route.js';

const Q = new URLSearchParams(location.search);
const LBL = { correct: '한 번에 맞혔어요', 'hint-correct': '힌트 후 맞혔어요', revealed: '다시 볼 질문', skipped: '서행이라 건너뜀 · 복습에 등장' };

function seed() { // example data (clearly marked) used when no trip was run in this browser
  const r = (id, res) => { const ep = EPISODES.find((e) => e.id === id); const qs = ep.beats.filter((b) => b.type === 'ask').map((q, i) => ({ id: q.id, prompt: q.prompt, answer: q.label, result: res[i] || 'correct', attempts: 0 })); return { epId: id, title: ep.title, place: ep.place, concept: ep.concept, curriculum: ep.curriculum, pin: ep.pin, qs }; };
  return { v: 1, simulated: true, example: true, route: '강릉 경포 (경포호·오죽헌 일대)', stars: 11, generatedAt: new Date().toISOString(),
    learned: [r('han-seoul', ['correct', 'hint-correct', 'correct']), r('namhan-yeoju', ['correct', 'correct', 'correct']), r('pyeongchang', ['correct']), r('daegwallyeong', ['hint-correct', 'skipped']), r('east-west-sea', ['correct', 'correct']), r('ojukheon', ['correct'])],
    review: [{ q: '산줄기의 서쪽은 영서라고 불러요. 그럼 동쪽은 뭐라고 부를까요?', answer: '영동', why: '서행 구간이라 질문을 건너뜀' }, { q: '그럼 한강물은 마지막에 어느 바다로 갈까요?', answer: '서해', why: '힌트 후 맞힘 · 귀갓길에 다시 만나요' }],
    missions: [{ id: 1, title: '한강 따라가기', complete: true }, { id: 2, title: '산을 넘는 길', complete: true }, { id: 3, title: '바다 도착 전 퀴즈', complete: true }] };
}
let data = null;
if (!Q.has('demo')) { try { data = JSON.parse(localStorage.getItem('roadschool.report') || 'null'); } catch (e) {} }
if (!data || !data.learned?.length) data = seed();

const learnedSet = new Set(data.learned.map((l) => l.epId));
const totalQ = data.learned.reduce((n, l) => n + l.qs.length, 0);
const okQ = data.learned.reduce((n, l) => n + l.qs.filter((q) => q.result === 'correct' || q.result === 'hint-correct').length, 0);
const date = new Date(data.generatedAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });

const learned = data.learned.map((l) => `<div class="ep"><div class="t">${l.place}</div><div class="m">${l.concept} · ${l.curriculum}</div>${l.qs.map((q) => `<div class="q"><em class="r-${q.result}">${LBL[q.result] || q.result}</em><span>${q.prompt}</span></div>`).join('')}</div>`).join('');
const review = (data.review || []).length ? `<ul class="rev">${data.review.map((r) => `<li>${r.q}<br><small>정답: ${r.answer} · ${r.why}</small></li>`).join('')}</ul>` : '<div class="priv">다시 볼 질문이 없어요.</div>';

document.getElementById('m').innerHTML = `
<div class="top"><i></i>로드스쿨<span class="sim">${data.example ? '예시 데이터' : 'SIM'}</span></div>
<div><h1>오늘 배운 지도</h1><div class="sub">${date} · 서울 잠실 → ${data.route}</div></div>
<div class="card map">${mapSvg({ dist: TOTAL_M, learned: data.learned, missed: new Set(), done: learnedSet, w: 1000, h: 640, labels: true, showCar: false, fs: 1.55 })}</div>
<div class="stats"><div class="stat"><b>${data.stars}</b><span>모은 별</span></div><div class="stat"><b>${data.learned.length}</b><span>만난 장소</span></div><div class="stat"><b>${okQ}/${totalQ}</b><span>맞힌 질문</span></div></div>
<div class="card"><h2>지나온 길에서 배운 것</h2>${learned}</div>
<div class="card"><h2>다시 볼 질문 (귀갓길 복습 에피소드로 등장)</h2>${review}</div>
<div class="card"><h2>현장 체험 추천 한 가지</h2><div class="go">${LEARN_AT_STOP}</div></div>
<div class="priv">이 화면은 프로토타입의 시뮬레이션 결과입니다. 설계상 아이의 음성은 저장하지 않고 학습 결과(맞힘/틀림)만 남기며, 부모 동의를 기반으로 합니다. 교육과정 영역 표기는 연계 예시입니다.</div>`;
