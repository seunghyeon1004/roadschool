// Episode content for the prototype (3 missions, 8 episodes). Korean, ~초등 3~6 level.
// Curriculum tags are LOOSE area labels (2022 개정 교육과정 초등 사회·과학 영역 연계 예시), not exact 성취기준 codes.
// Facts were limited to well-established geography/culture knowledge; no statistics are used.
// tier ranks: S (3분형) < M (7분형) < L (15분형).  The prototype uses shortened sample beats per tier.

export const MISSIONS = [
  { id: 1, title: '한강 따라가기',        icon: 'river',  episodes: ['han-seoul', 'namhan-yeoju'] },
  { id: 2, title: '산을 넘는 길',         icon: 'mount',  episodes: ['pyeongchang', 'daegwallyeong'] },
  { id: 3, title: '바다 도착 전 퀴즈',    icon: 'sea',    episodes: ['east-west-sea', 'ojukheon'] },
];

const T = { S: 0, M: 1, L: 2 };
export const tierRank = (t) => T[t];

// q.ok / q.bad are regex SOURCES tested against the normalized (space-stripped) child utterance.
// Candidate expansion (동의어/발음 유사어) lives in these patterns. Wrong patterns are checked first.
export const EPISODES = [
  {
    id: 'han-seoul', mission: 1, title: '한강은 어디로 흘러갈까?', place: '서울 · 한강', pin: { lat: 37.548, lon: 127.215 },
    trigger: { lat: 37.548, lon: 127.215, r: 2500 }, dir: 'E',
    concept: '하천 · 상류와 하류', curriculum: '초등 사회 우리 국토 · 과학 물의 이동 영역(연계 예시)',
    beats: [
      { min: 'S', type: 'say', text: '지금 한강 가까이를 달리고 있어요. 서울을 가로지르는 넓은 강이 바로 한강이에요. 강물은 높은 곳에서 낮은 곳으로 흘러요. 강이 시작되는 쪽을 상류, 바다와 가까운 쪽을 하류라고 해요.' },
      { min: 'S', type: 'ask', id: 'q-flow', prompt: '문제 나갑니다! 강물은 높은 곳에서 낮은 곳으로 흐를까요, 낮은 곳에서 높은 곳으로 흐를까요?',
        label: '높은 곳에서 낮은 곳', options: ['높은 곳에서 낮은 곳', '낮은 곳에서 높은 곳'],
        bad: ['낮.*높', '밑.*위', '아래.*위'], ok: ['높.*낮', '위.*(아래|밑)', '아래로', '낮은곳으로', '밑으로'],
        hint: '힌트예요. 계단 위에서 물을 부으면 어느 쪽으로 떨어질까요?', demo: ['높은 곳에서 낮은 곳이요'] },
      { min: 'M', type: 'say', text: '한강은 강원도 태백의 작은 샘, 검룡소에서 시작한다고 알려져 있어요. 그 물이 먼 길을 흘러서 지금 우리 옆을 지나가는 거예요.' },
      { min: 'M', type: 'ask', id: 'q-sea', prompt: '그럼 한강물은 마지막에 어느 바다로 갈까요? 동해, 서해, 남해 중에서 골라 보세요.',
        label: '서해', options: ['동해', '서해', '남해'],
        bad: ['동해', '남해'], ok: ['서해'],
        hint: '한 번 더 생각해 봐요. 한강은 해가 지는 쪽으로 흘러가요. 해가 지는 쪽에 있는 바다예요.', demo: ['동해요?', '서해!'] },
      { min: 'L', type: 'say', text: '강이 바다와 만나는 곳을 하구라고 해요. 강물이 실어 온 흙과 모래가 하구에 쌓이면서 땅이 넓어지기도 해요.' },
      { min: 'L', type: 'ask', id: 'q-deposit', prompt: '강물이 흙을 실어 와서 쌓아 놓는 일을 침식이라고 할까요, 퇴적이라고 할까요?',
        label: '퇴적', options: ['침식', '퇴적'], bad: ['침식'], ok: ['퇴적', '쌓'],
        hint: '쌓일 퇴, 쌓을 적. 쌓인다는 뜻이 들어 있어요.', demo: ['퇴적이요'] },
      { min: 'S', type: 'wrap', text: '한강은 서쪽 서해로 흘러가요. 우리는 반대로, 강의 위쪽으로 올라가는 길이에요.' },
    ],
  },
  {
    id: 'namhan-yeoju', mission: 1, title: '두 강이 만나 한강이 돼요', place: '여주 · 남한강', pin: { lat: 37.265, lon: 127.6 },
    trigger: { lat: 37.265, lon: 127.6, r: 12000 }, dir: 'E',
    concept: '하천 · 지류와 합류', curriculum: '초등 사회 지역의 모습 · 우리 국토 영역(연계 예시)',
    beats: [
      { min: 'S', type: 'say', text: '지금은 여주 가까이예요. 이 근처에는 남한강이 흘러요. 그런데 한강은 처음부터 한 줄기가 아니에요. 남한강과 북한강, 두 강이 양평의 두물머리에서 만나 한강이 된답니다.' },
      { min: 'S', type: 'ask', id: 'q-merge', prompt: '남한강과 북한강, 두 강이 만나서 하나가 되면 이름이 뭐가 될까요?',
        label: '한강', options: ['한강', '낙동강', '금강'], bad: ['낙동', '금강', '섬진'], ok: ['한강', '한가'],
        hint: '서울을 지나는 커다란 강 이름이에요.', demo: ['한강이요'] },
      { min: 'M', type: 'say', text: '여러 갈래의 물이 합쳐지면 강물의 양은 많아지고 강도 넓어져요. 이렇게 큰 강으로 흘러 들어가는 작은 강을 지류라고 해요.' },
      { min: 'M', type: 'ask', id: 'q-more', prompt: '물줄기가 합쳐지면 강물의 양은 많아질까요, 적어질까요?',
        label: '많아져요', options: ['많아져요', '적어져요'], bad: ['적', '줄'], ok: ['많', '늘', '커'],
        hint: '컵 두 개의 물을 한 그릇에 부으면 어떻게 될까요?', demo: ['많아져요'] },
      { min: 'L', type: 'say', text: '여주에는 세종대왕이 잠들어 계신 영릉도 있어요.' },
      { min: 'L', type: 'ask', id: 'q-sejong', prompt: '한글을 만드신 임금님은 누구일까요?',
        label: '세종대왕', options: ['세종대왕', '이순신', '광개토대왕'], bad: ['이순신', '광개토', '정조'], ok: ['세종'],
        hint: '만 원짜리 지폐에 나오는 분이에요.', demo: ['세종대왕!'] },
      { min: 'S', type: 'wrap', text: '작은 물줄기가 모여 큰 강이 돼요. 첫 번째 미션, 한강 따라가기를 잘 해냈어요.' },
    ],
  },
  {
    id: 'pyeongchang', mission: 2, title: '눈과 얼음의 도시를 찾아라', place: '평창 · 진부', pin: { lat: 37.64, lon: 128.56 },
    trigger: { lat: 37.64, lon: 128.56, r: 12000 }, dir: 'E',
    concept: '지역의 특성 · 산지 마을', curriculum: '초등 사회 우리 고장·지역의 모습 영역(연계 예시)',
    beats: [
      { min: 'S', type: 'say', text: '여기서부터는 높은 산이 많은 강원도 땅이에요. 지금 지나는 평창은 2018년에 동계올림픽이 열린 곳이에요. 그때 스케이트, 아이스하키, 컬링 경기는 바닷가 도시에서 열렸어요. 우리가 오늘 가는 곳이기도 해요.' },
      { min: 'S', type: 'ask', id: 'q-dest', prompt: '스케이트와 컬링 경기가 열렸던 오늘의 목적지, 바닷가 도시 이름이 뭘까요?',
        label: '강릉', options: ['강릉', '부산', '제주'], bad: ['부산', '제주', '인천'], ok: ['강릉', '강능'],
        hint: '오늘 우리가 가는 동해안 도시예요. 첫 글자가 강으로 시작해요.', demo: ['강릉이요'] },
      { min: 'M', type: 'say', text: '산이 많은 곳에서는 평평한 땅이 적어서, 사람들은 골짜기나 분지에 마을을 만들고 살았어요. 눈이 많이 오는 날씨는 겨울 스포츠에 잘 맞는 환경이 되었어요.' },
      { min: 'S', type: 'wrap', text: '산이 많은 땅의 모습이 마을과 생활을 바꾸어 놓아요.' },
    ],
  },
  {
    id: 'daegwallyeong', mission: 2, title: '산을 넘으면 날씨가 달라요', place: '대관령', pin: { lat: 37.68, lon: 128.71 },
    trigger: { lat: 37.68, lon: 128.71, r: 10000 }, dir: 'E',
    concept: '산지 · 기온과 날씨', curriculum: '초등 사회 국토의 지형 · 과학 날씨 영역(연계 예시)',
    beats: [
      { min: 'S', type: 'say', text: '지금 대관령 가까이 왔어요. 대관령은 태백산맥을 넘는 고개예요. 태백산맥은 동해를 따라 길게 이어진 산줄기예요. 산줄기의 서쪽은 영서, 동쪽은 영동이라고 불러요.' },
      { min: 'S', type: 'ask', id: 'q-temp', prompt: '높은 산을 오를수록 공기는 따뜻해질까요, 차가워질까요?',
        label: '차가워져요', options: ['따뜻해져요', '차가워져요'], bad: ['따뜻', '더워', '뜨거'], ok: ['차가', '추워', '시원', '낮아', '차갑'],
        hint: '높은 산꼭대기에 눈이 오래 남아 있는 모습을 떠올려 봐요.', demo: ['몰라요', '차가워져요'] },
      { min: 'M', type: 'say', text: '그래서 같은 날에도 산 위와 산 아래의 날씨가 달라요. 겨울에 바다에서 불어오는 바람이 높은 산을 만나면, 영동 지방에는 눈이 많이 내리기도 해요.' },
      { min: 'M', type: 'ask', id: 'q-east', prompt: '산줄기의 서쪽은 영서라고 불러요. 그럼 동쪽은 뭐라고 부를까요?',
        label: '영동', options: ['영동', '영남'], bad: ['영남', '영서', '영북'], ok: ['영동', '영둥'],
        hint: '동쪽 동 자를 써요. 영서의 반대말이에요.', demo: ['영동이요'] },
      { min: 'L', type: 'say', text: '대관령에는 구불구불한 옛길이 있었어요. 굽이가 아흔아홉 개나 된다고 전해져요. 지금은 터널과 다리 덕분에 훨씬 빨리 넘을 수 있어요.' },
      { min: 'S', type: 'wrap', text: '산을 넘는 길 미션을 마쳤어요. 이제 바다가 가까워져요.' },
    ],
  },
  {
    id: 'east-west-sea', mission: 3, title: '동해와 서해는 뭐가 다를까?', place: '강릉 진입 · 동해', pin: { lat: 37.745, lon: 128.83 },
    trigger: { lat: 37.745, lon: 128.83, r: 9000 }, dir: 'E',
    concept: '해안 · 갯벌과 모래 해변', curriculum: '초등 사회 국토의 자연환경 · 과학 지구 영역(연계 예시)',
    beats: [
      { min: 'S', type: 'say', text: '바다 냄새가 나기 시작하나요? 곧 동해 바다가 보여요. 서해는 밀물과 썰물의 차이가 커서 넓은 갯벌이 생기고, 동해는 그 차이가 작아서 모래 해변이 많아요.' },
      { min: 'S', type: 'ask', id: 'q-mud', prompt: '넓은 갯벌을 볼 수 있는 바다는 동해일까요, 서해일까요?',
        label: '서해', options: ['동해', '서해'], bad: ['동해'], ok: ['서해'],
        hint: '아까 한강물이 마지막에 도착하는 바다였어요.', demo: ['서해요'] },
      { min: 'M', type: 'say', text: '강릉에는 경포호라는 큰 호수가 있어요. 바다 바로 옆에 있는데, 모래 둑이 바다와 호수를 갈라 놓았어요. 이런 호수를 석호라고 해요.' },
      { min: 'M', type: 'ask', id: 'q-lagoon', prompt: '바닷가 옆에서 모래 둑 때문에 바다와 갈라진 호수를 뭐라고 할까요? 석호, 폭포 중에 골라 보세요.',
        label: '석호', options: ['석호', '폭포'], bad: ['폭포'], ok: ['석호', '서코', '석오'],
        hint: '폭포는 물이 떨어지는 곳이죠. 호수 이름이에요. 석으로 시작해요.', demo: ['석호요'] },
      { min: 'S', type: 'wrap', text: '같은 바다라도 동쪽과 서쪽은 모습이 달라요.' },
    ],
  },
  {
    id: 'ojukheon', mission: 3, kind: 'arrival', title: '도착 예습: 오죽헌', place: '강릉 · 오죽헌', pin: { lat: 37.779, lon: 128.878 },
    trigger: { lat: 37.79, lon: 128.9, r: 99999, etaSec: 330 }, dir: 'E',
    concept: '문화유산 · 인물', curriculum: '초등 사회 문화유산·지역의 역사 영역(연계 예시)',
    beats: [
      { min: 'S', type: 'say', text: '곧 도착이에요! 강릉에는 오죽헌이라는 오래된 집이 있어요. 검은 대나무, 오죽이 자라서 붙은 이름이에요. 이곳은 율곡 이이가 태어난 집으로 알려져 있어요.' },
      { min: 'S', type: 'ask', id: 'q-yulgok', prompt: '오죽헌에서 태어난 학자는 누구일까요?',
        label: '율곡 이이', options: ['율곡 이이', '이순신', '세종대왕'], bad: ['이순신', '세종', '정약용'], ok: ['율곡', '이이', '율곡이이'],
        hint: '오천 원짜리 지폐에 나오는 분이에요.', demo: ['율곡 이이요'] },
      { min: 'S', type: 'wrap', text: '도착하면 진짜 오죽을 찾아보세요. 오늘 지나온 길을 지도로 정리해서 부모님께 보내 드릴게요.' },
    ],
  },
];

export const LEARN_AT_STOP = '현장 체험 한 가지: 오죽헌에서 검은 대나무, 오죽을 직접 찾아보기 (관람 시간·휴관일은 방문 전에 확인하세요)';

// ---- answer grading -----------------------------------------------------------
export const norm = (s) => (s || '').toLowerCase().replace(/[\s.,!?~'"·]/g, '');
export function grade(q, text) {
  const n = norm(text);
  if (!n) return 'unclear';
  if (/^(몰라|모르|글쎄|잘모)/.test(n) || /(몰라요|모르겠)/.test(n)) return 'dontknow';
  const last = (pats) => pats.reduce((m, p) => { const r = new RegExp(p).exec(n); return r ? Math.max(m, r.index + r[0].length) : m; }, -1);
  const okAt = last(q.ok), badAt = last(q.bad);
  if (okAt < 0 && badAt < 0) return 'unclear';
  if (okAt >= 0 && badAt < 0) return 'correct';
  if (badAt >= 0 && okAt < 0) return 'wrong';
  return okAt >= badAt ? 'correct' : 'wrong';   // child self-corrects: the last thing said wins
}
