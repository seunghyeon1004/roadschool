import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EPISODES, MISSIONS, grade } from '../js/content.js';
const qs = EPISODES.flatMap((e) => e.beats.filter((b) => b.type === 'ask'));
test('every episode belongs to a mission and has demo answers that grade correct last', () => {
  for (const e of EPISODES) assert.ok(MISSIONS.some((m) => m.episodes.includes(e.id)), e.id);
  for (const q of qs) { const last = q.demo.at(-1); assert.equal(grade(q, last), 'correct', `${q.id}: ${last}`); }
});
test('wrong answers are wrong', () => {
  const by = Object.fromEntries(qs.map((q) => [q.id, q]));
  assert.equal(grade(by['q-flow'], '낮은 곳에서 높은 곳이요'), 'wrong');
  assert.equal(grade(by['q-flow'], '높은 곳에서 낮은 곳이요'), 'correct');
  assert.equal(grade(by['q-sea'], '동해요?'), 'wrong');
  assert.equal(grade(by['q-sea'], '서해!'), 'correct');
  assert.equal(grade(by['q-temp'], '몰라요'), 'dontknow');
  assert.equal(grade(by['q-temp'], '음...'), 'unclear');
  assert.equal(grade(by['q-yulgok'], '이순신'), 'wrong');
});
