// Compares the player's result with the reference result.
// Column NAMES are ignored (any alias is fine); column ORDER, row count and
// values must match. If the question doesn't ask for an order, rows can come
// back in any order.

function norm(v) {
  if (typeof v === 'number') return Math.round(v * 1e6) / 1e6;
  return v;
}

function normRows(rows) {
  return rows.map((r) => r.map(norm));
}

export function compareResults(expected, actual, ordered) {
  if (actual.columns.length !== expected.columns.length) {
    return {
      ok: false,
      reason: `Your query returns ${actual.columns.length} column(s), but the question needs ${expected.columns.length}.`,
    };
  }
  if (actual.rows.length !== expected.rows.length) {
    return {
      ok: false,
      reason: `Your query returns ${actual.rows.length} row(s), but the expected result has ${expected.rows.length}.`,
    };
  }

  let a = normRows(actual.rows).map((r) => JSON.stringify(r));
  let e = normRows(expected.rows).map((r) => JSON.stringify(r));
  if (!ordered) {
    a = a.slice().sort();
    e = e.slice().sort();
  }

  for (let i = 0; i < e.length; i++) {
    if (a[i] !== e[i]) {
      return {
        ok: false,
        reason: ordered
          ? 'Right number of rows, but some values or their order are different.'
          : 'Right number of rows, but some values are different.',
      };
    }
  }
  return { ok: true, reason: 'Correct!' };
}
