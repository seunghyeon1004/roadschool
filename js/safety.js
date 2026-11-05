// 3-level driver-safety state machine (input: Vehicle SDK speed + gear).
//   STOPPED : gear P and speed ~0  -> visual cards allowed (rear-seat touch only)
//   LOW     : moving slowly, or stopped but NOT in P (e.g. red light in D) -> voice only, NO new questions
//   DRIVING : normal / highway speed -> voice only, new questions allowed (answered by voice)
// Hysteresis avoids flapping around the thresholds. The strict rule "visuals only in P" is code-level.

export const Mode = Object.freeze({ STOPPED: 'STOPPED', LOW: 'LOW', DRIVING: 'DRIVING' });
export const TH = Object.freeze({ drivingUp: 35, drivingDown: 25, stopEps: 0.5 });  // km/h (prototype values)

export const POLICY = Object.freeze({
  STOPPED: Object.freeze({ visuals: true,  newQuestion: true,  rearTouch: true,  label: '정차(P) · 시각 카드 ON' }),
  LOW:     Object.freeze({ visuals: false, newQuestion: false, rearTouch: false, label: '서행 · 음성 전용 · 새 질문 멈춤' }),
  DRIVING: Object.freeze({ visuals: false, newQuestion: true,  rearTouch: false, label: '주행 · 음성 전용 · 화면 OFF' }),
});

export class SafetyMachine {
  constructor() { this.mode = Mode.STOPPED; this.history = []; }
  update({ speedKmh, gear }, tag = '') {
    const prev = this.mode;
    let next = prev;
    if (gear === 'P' && speedKmh <= TH.stopEps) next = Mode.STOPPED;
    else if (prev === Mode.STOPPED) next = Mode.LOW;                       // left P or started rolling -> never straight to a visual-capable state
    else if (prev === Mode.LOW) next = speedKmh >= TH.drivingUp ? Mode.DRIVING : Mode.LOW;
    else if (prev === Mode.DRIVING) next = speedKmh < TH.drivingDown ? Mode.LOW : Mode.DRIVING;
    if (prev === Mode.STOPPED && next === Mode.LOW && speedKmh >= TH.drivingUp) next = Mode.DRIVING;
    if (next !== prev) { this.mode = next; this.history.push({ from: prev, to: next, speedKmh: Math.round(speedKmh), gear, tag }); }
    return this.mode;
  }
  get policy() { return POLICY[this.mode]; }
}
