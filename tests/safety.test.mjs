import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SafetyMachine, Mode, POLICY } from '../js/safety.js';
import { buildTimeline } from '../js/route.js';

test('P + 0 km/h -> STOPPED; D at 0 km/h is NOT stopped (red light)', () => {
  const s = new SafetyMachine();
  assert.equal(s.update({ speedKmh: 0, gear: 'P' }), Mode.STOPPED);
  assert.equal(s.update({ speedKmh: 0, gear: 'D' }), Mode.LOW);
  assert.equal(s.update({ speedKmh: 0, gear: 'D' }), Mode.LOW);
});
test('hysteresis between LOW and DRIVING', () => {
  const s = new SafetyMachine(); s.update({ speedKmh: 0, gear: 'D' });
  assert.equal(s.update({ speedKmh: 30, gear: 'D' }), Mode.LOW);
  assert.equal(s.update({ speedKmh: 36, gear: 'D' }), Mode.DRIVING);
  assert.equal(s.update({ speedKmh: 28, gear: 'D' }), Mode.DRIVING);
  assert.equal(s.update({ speedKmh: 24, gear: 'D' }), Mode.LOW);
});
test('policy: visuals only when STOPPED; no new question in LOW', () => {
  assert.equal(POLICY.STOPPED.visuals, true);
  assert.equal(POLICY.LOW.visuals, false); assert.equal(POLICY.DRIVING.visuals, false);
  assert.equal(POLICY.LOW.newQuestion, false); assert.equal(POLICY.DRIVING.newQuestion, true);
  assert.equal(POLICY.LOW.rearTouch || POLICY.DRIVING.rearTouch, false);
});
test('whole scripted drive: visuals are on only in samples where gear=P and speed~0', () => {
  const tl = buildTimeline(); const s = new SafetyMachine(); let bad = 0, vis = 0, modes = new Set();
  for (let i = 0; i <= tl.T; i++) {
    const m = s.update({ speedKmh: tl.speed[i], gear: tl.gear[i] }); modes.add(m);
    if (POLICY[m].visuals) { vis++; if (!(tl.gear[i] === 'P' && tl.speed[i] <= 0.5)) bad++; }
  }
  assert.equal(bad, 0); assert.ok(vis > 0); assert.equal(modes.size, 3);
  console.log(`drive samples=${tl.T + 1}, visual-enabled=${vis}, violations=${bad}, transitions=${s.history.length}`);
});
