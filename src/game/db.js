import initSqlJs from 'sql.js';

// SQLite running inside the browser. Every query runs against a brand-new
// in-memory database that is built from the question's data, so nothing a
// player types can touch anything real.

let SQL = null;

export async function initDb(locateFile) {
  if (SQL) return SQL;
  SQL = await initSqlJs(locateFile ? { locateFile } : {});
  return SQL;
}

export function isDbReady() {
  return SQL !== null;
}

function stripComments(sql) {
  return sql.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();
}

// Returns { columns: string[], rows: any[][] } or throws an Error with a
// friendly message.
export function runQuery(setupSql, sql) {
  if (!SQL) throw new Error('The database is still loading. Try again in a moment.');

  const clean = stripComments(String(sql)).replace(/;\s*$/, '');
  if (!clean) throw new Error('Write a query first.');
  if (!/^(select|with)\b/i.test(clean)) throw new Error('Only SELECT queries are allowed here.');
  if (clean.includes(';')) throw new Error('Use a single query (no extra statements).');

  const db = new SQL.Database();
  try {
    db.run(setupSql);
    const stmt = db.prepare(clean);
    try {
      const columns = stmt.getColumnNames();
      const rows = [];
      while (stmt.step()) rows.push(stmt.get());
      return { columns, rows };
    } finally {
      stmt.free();
    }
  } catch (err) {
    throw new Error(err && err.message ? err.message : String(err));
  } finally {
    db.close();
  }
}
