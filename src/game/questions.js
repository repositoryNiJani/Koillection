import { makeRng } from './rng.js';
import { THEMES, toSetupSql } from './datasets.js';
import { TEMPLATES } from './templates.js';
import { runQuery } from './db.js';

// Player level goes up as they solve more questions, which unlocks harder templates.
const LEVEL_STEPS = [0, 6, 15, 30]; // total correct answers needed for level 1,2,3,4
export function levelFor(totalCorrect) {
  let level = 1;
  for (let i = 1; i < LEVEL_STEPS.length; i++) if (totalCorrect >= LEVEL_STEPS[i]) level = i + 1;
  return level;
}

// Builds question number `index` of the day for one user.
// Seeded by (user, day, index), so it never changes during the day and it
// differs between users. `level` is stored by the caller so a question doesn't
// change if the player levels up while looking at it.
export function buildQuestion({ userId, day, index, level }) {
  for (let attempt = 0; attempt < 12; attempt++) {
    const rng = makeRng(`${userId}|${day}|${index}|${attempt}`);

    // Prefer templates at the player's level, but still mix in easier ones.
    const pool = [];
    for (const t of TEMPLATES) {
      if (t.difficulty > level) continue;
      const weight = t.difficulty === level ? 3 : 1;
      for (let i = 0; i < weight; i++) pool.push(t);
    }
    const template = rng.pick(pool);

    const tables = THEMES[template.theme](rng);
    const setupSql = toSetupSql(tables);
    const { prompt, sql, ordered } = template.build(rng, tables);

    let expected;
    try {
      expected = runQuery(setupSql, sql);
    } catch (err) {
      throw new Error(`Template ${template.id} has a broken reference query: ${err.message}`);
    }
    if (expected.rows.length === 0) continue; // boring question, roll again

    return {
      id: `${day}#${index}`,
      day,
      index,
      level,
      templateId: template.id,
      title: template.title,
      difficulty: template.difficulty,
      concepts: template.concepts,
      prompt: `${prompt} Return the columns in this order: ${expected.columns.join(', ')}.`,
      tables,
      setupSql,
      referenceSql: sql,
      ordered,
      expected,
    };
  }
  throw new Error('Could not generate a question. Please report this.');
}
