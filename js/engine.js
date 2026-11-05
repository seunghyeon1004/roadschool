// Lesson engine: location-triggered episode -> TTS story -> STT quiz -> hint/grade -> mission progress.
// All driver-safety decisions come from SafetyMachine.POLICY (code-level rule), never from the UI.
import { EPISODES, MISSIONS, tierRank, grade } from './content.js';
import { POLICY } from './safety.js';

const sentences = (t) => t.split(/(?<=[.!?])\s+/).filter(Boolean);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export class Engine {
  constructor({ tts, stt, safety, onChange, autoChild = false, fast = 1 }) {
    Object.assign(this, { tts, stt, safety, onChange, autoChild, fast });
    this.reset();
  }
  reset() {
    this.session = null;          // { ep, tier, truncated }
    this.cur = null;              // current question { q, attempt }
    this.done = new Set();        // finished episode ids
    this.missed = new Set();
    this.learned = [];            // report records
    this.review = [];             // questions to revisit
    this.stars = 0;
    this.transcript = [];
    this.busy = false;
    this.speaking = false;
    this.lastEvent = '';
    this.tierInfo = null;
    this.introDone = false;
    this.tripDone = false;
    this.tts.stop?.();
    this.stt.stopListening?.();
  }
  get mode() { return this.safety.mode; }
  get policy() { return POLICY[this.safety.mode]; }
  emit() { this.onChange?.(); }
  note(who, text) { this.transcript.push({ who, text }); if (this.transcript.length > 80) this.transcript.shift(); this.emit(); }

  async say(text, who = '로드쌤') {
    for (const s of sentences(text)) {
      this.speaking = true; this.note(who, s);
      await this.tts.speak(s, { rate: 1.0, pitch: 1.25 });
      this.speaking = false; this.emit();
    }
  }

  missionState() {
    return MISSIONS.map((m) => {
      const eps = m.episodes;
      const finished = eps.filter((e) => this.done.has(e) || this.missed.has(e)).length;
      return { ...m, finished, total: eps.length, complete: finished === eps.length };
    });
  }
  get remainingMissions() { return this.missionState().filter((m) => !m.complete).length; }

  // ---- inputs from the child: STT result, or rear-seat tap (only while STOPPED) -------------------
  answerByVoiceSim(text) { return this.stt.simulateUtterance(text); }
  answerByTouch(text) { if (!POLICY[this.mode].rearTouch) return false; return this.stt.simulateUtterance(text); }

  async intro(ctx) {
    if (this.busy || this.introDone) return;
    this.busy = true; this.introDone = true;
    const mins = Math.round(ctx.etaSec / 60);
    const h = Math.floor(mins / 60), m = mins % 60;
    await this.say(`안녕, 나는 로드쌤이야! 오늘은 ${this.destName}까지 약 ${h > 0 ? h + '시간 ' : ''}${m}분 걸려요. 미션은 모두 세 개예요. 하나, 한강 따라가기. 둘, 산을 넘는 길. 셋, 바다 도착 전 퀴즈. 출발하면 창밖을 잘 보세요!`);
    this.busy = false; this.emit();
  }

  /** Called ~5x per second by the app. ctx = { t, loc, etaSec, gapSec, bearing, anchors }. */
  tick(ctx) {
    if (this.busy || this.tripDone) return;
    for (const ep of EPISODES) {
      if (this.done.has(ep.id) || this.missed.has(ep.id)) continue;
      const inRange = ep.kind === 'arrival' ? ctx.etaSec <= ep.trigger.etaSec : ctx.dist(ep.trigger) <= ep.trigger.r;
      if (!inRange) {
        if (ctx.passed(ep)) { this.missed.add(ep.id); this.lastEvent = `놓친 장소: ${ep.place} (이어지는 구조라 계속 진행)`; this.emit(); }
        continue;
      }
      if (!this.introDone) return;
      if (this.mode === 'LOW') return;                 // do not begin a new story at crawling speed
      const tier = ep.kind === 'arrival' ? 'S' : ctx.gapSec < 360 ? 'S' : ctx.gapSec < 780 ? 'M' : 'L';
      this.runEpisode(ep, tier, ctx);
      return;
    }
  }

  async runEpisode(ep, tier, ctx) {
    this.busy = true;
    const beats = ep.beats.filter((b) => tierRank(b.min) <= tierRank(tier));
    const rec = { epId: ep.id, title: ep.title, place: ep.place, concept: ep.concept, curriculum: ep.curriculum, pin: ep.pin, qs: [], tier, mode0: this.mode };
    this.session = { ep, tier, truncated: false, rec };
    this.tierInfo = { tier, label: { S: '3분형', M: '7분형', L: '15분형' }[tier], gapMin: Math.round(ctx.gapSec / 60) };
    this.lastEvent = `FusedLocation: '${ep.place}' 감지 -> ${this.tierInfo.label} 에피소드 선택 (다음 장소/도착까지 약 ${this.tierInfo.gapMin}분)`;
    ctx.prefetch?.(ep);
    this.note('시스템', this.lastEvent);
    for (const b of beats) {
      if (b.type === 'say' || b.type === 'wrap') { await this.say(b.text); continue; }
      if (!this.policy.newQuestion) {                    // LOW: finish the story, never ask a new question
        this.session.truncated = true;
        rec.qs.push({ id: b.id, prompt: b.prompt, answer: b.label, result: 'skipped', attempts: 0 });
        this.review.push({ epId: ep.id, q: b.prompt, answer: b.label, why: '서행 구간이라 질문을 건너뜀' });
        this.note('시스템', `서행 모드: 새 질문 '${b.id}' 보류 -> 다시 볼 질문으로 이동`);
        continue;
      }
      rec.qs.push(await this.ask(ep, b));
    }
    this.done.add(ep.id); this.learned.push(rec);
    this.session.ending = true;
    const ms = this.missionState().find((m) => m.id === ep.mission);
    if (ms.complete) await this.say(`미션 ${ms.id}, ${ms.title} 완료! ${this.remainingMissions > 0 ? '남은 미션은 ' + this.remainingMissions + '개예요.' : '오늘의 미션을 모두 끝냈어요!'}`);
    this.session = null; this.cur = null; this.busy = false; this.emit();
  }

  async ask(ep, q) {
    const rec = { id: q.id, prompt: q.prompt, answer: q.label, result: null, attempts: 0 };
    this.cur = { q, attempt: 0, options: q.options };
    await this.say(q.prompt);
    let unclear = 0;
    for (;;) {
      this.emit();
      const r = await this.listen(q, rec.attempts);
      if (r.aborted) { rec.result = 'skipped'; break; }
      let g = r.timeout ? 'dontknow' : grade(q, r.text);
      if (!r.timeout) this.note('아이', r.text);
      if (g === 'unclear') { if (++unclear <= 2) { await this.say('잘 못 들었어요. 다시 한 번 말해 줄래요?'); continue; } g = 'dontknow'; }
      if (g === 'correct') {
        rec.result = rec.attempts === 0 ? 'correct' : 'hint-correct'; this.stars++;
        await this.say(rec.attempts === 0 ? '맞아요! 정말 잘했어요. 별 하나 받았어요!' : '맞아요! 힌트 덕분에 해냈네요. 별 하나 받았어요!');
        break;
      }
      rec.attempts++;
      if (rec.attempts === 1) { await this.say((g === 'wrong' ? '아쉬워요, 괜찮아요. ' : '괜찮아요, 천천히 생각해 봐요. ') + q.hint); continue; }
      rec.result = 'revealed';
      this.review.push({ epId: ep.id, q: q.prompt, answer: q.label, why: '힌트 후에도 어려웠어요' });
      await this.say(`괜찮아요. 정답은 ${q.label}이에요. 나중에 다시 만나요.`);
      break;
    }
    this.cur = null; this.emit();
    return rec;
  }

  listen(q, attempt) {
    const p = this.stt.startListening({ timeoutMs: 25000 });
    if (this.autoChild) {
      const demo = q.demo || [q.label];
      const text = demo[Math.min(attempt, demo.length - 1)];
      sleep(2200 / this.fast).then(() => this.stt.simulateUtterance(text));
    }
    return p;
  }

  async arrive() {
    if (this.tripDone) return;
    this.tripDone = true;
    this.busy = true;
    await this.say(`도착했어요! 오늘 별을 ${this.stars}개 모았어요. 오늘 배운 지도는 부모님 휴대폰으로 보내 드릴게요.`);
    this.busy = false; this.emit();
  }

  report(route) {
    return { v: 1, simulated: true, route: route.name, generatedAt: new Date().toISOString(), stars: this.stars,
      learned: this.learned, review: this.review, missions: this.missionState().map((m) => ({ id: m.id, title: m.title, complete: m.complete })) };
  }
}
