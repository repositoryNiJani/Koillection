import test from 'node:test';
import assert from 'node:assert/strict';
import { initDb, runQuery } from '../src/game/db.js';
import { buildQuestion, levelFor } from '../src/game/questions.js';
import { compareResults } from '../src/game/compare.js';
import { TEMPLATES } from '../src/game/templates.js';

test.before(async () => {
  await initDb();
});

test('levels unlock with total correct answers', () => {
  assert.equal(levelFor(0), 1);
  assert.equal(levelFor(6), 2);
  assert.equal(levelFor(15), 3);
  assert.equal(levelFor(30), 4);
  assert.equal(levelFor(500), 4);
});

test('every template builds a runnable, non-empty question across many seeds', () => {
  const seen = new Set();
  for (let u = 0; u < 25; u++) {
    for (let index = 1; index <= 8; index++) {
      for (const level of [1, 2, 3, 4]) {
        const q = buildQuestion({ userId: `user${u}`, day: '2026-11-25', index, level });
        seen.add(q.templateId);
        assert.ok(q.expected.rows.length > 0, `${q.templateId} returned no rows`);
        assert.ok(q.difficulty <= level, 'question is harder than the level allows');
        // reference answer must pass its own check
        const again = runQuery(q.setupSql, q.referenceSql);
        assert.ok(compareResults(q.expected, again, q.ordered).ok);
      }
    }
  }
  assert.equal(seen.size, TEMPLATES.length, 'some templates were never generated');
});

test('same user + day + index gives the same question', () => {
  const a = buildQuestion({ userId: 'jani', day: '2026-11-25', index: 2, level: 2 });
  const b = buildQuestion({ userId: 'jani', day: '2026-11-25', index: 2, level: 2 });
  assert.equal(a.prompt, b.prompt);
  assert.equal(a.setupSql, b.setupSql);
});

test('different users get different questions on the same day', () => {
  const prompts = new Set();
  for (let u = 0; u < 30; u++) {
    const q = buildQuestion({ userId: `user${u}`, day: '2026-11-25', index: 1, level: 2 });
    prompts.add(q.setupSql);
  }
  assert.ok(prompts.size >= 28, `only ${prompts.size}/30 distinct datasets`);
});

test('the next day gives a different question', () => {
  const a = buildQuestion({ userId: 'jani', day: '2026-11-25', index: 1, level: 2 });
  const b = buildQuestion({ userId: 'jani', day: '2026-11-26', index: 1, level: 2 });
  assert.notEqual(a.setupSql, b.setupSql);
});

test('a different but equivalent query is accepted; a wrong one is rejected', () => {
  const q = buildQuestion({ userId: 'x', day: '2026-11-25', index: 1, level: 1 });
  // find a template we can rewrite: students_top_n -> ORDER BY with subquery-free LIMIT
  const topN = Array.from({ length: 200 }, (_, i) =>
    buildQuestion({ userId: `t${i}`, day: '2026-11-25', index: 1, level: 1 }),
  ).find((x) => x.templateId === 'students_top_n');
  assert.ok(topN);
  const sameResult = topN.referenceSql.replace('SELECT name, grade', 'SELECT name AS n, grade AS g');
  assert.ok(compareResults(topN.expected, runQuery(topN.setupSql, sameResult), topN.ordered).ok);

  const wrong = 'SELECT name, grade FROM students ORDER BY name LIMIT 1';
  const res = compareResults(topN.expected, runQuery(topN.setupSql, wrong), topN.ordered);
  assert.equal(res.ok, false);
  assert.ok(q);
});

test('only SELECT/WITH queries are allowed', () => {
  const q = buildQuestion({ userId: 'x', day: '2026-11-25', index: 1, level: 1 });
  assert.throws(() => runQuery(q.setupSql, 'DROP TABLE students'), /Only SELECT/);
  assert.throws(() => runQuery(q.setupSql, 'SELECT 1; DROP TABLE students'), /single query/);
  assert.throws(() => runQuery(q.setupSql, '   '), /Write a query/);
  assert.throws(() => runQuery(q.setupSql, 'SELECT nope FROM nowhere'), /no such table/);
});

test('unordered questions accept any row order, ordered ones do not', () => {
  const expected = { columns: ['a'], rows: [[1], [2], [3]] };
  const shuffled = { columns: ['b'], rows: [[3], [1], [2]] };
  assert.ok(compareResults(expected, shuffled, false).ok);
  assert.equal(compareResults(expected, shuffled, true).ok, false);
  assert.equal(compareResults(expected, { columns: ['a', 'b'], rows: [[1, 1]] }, true).ok, false);
});
