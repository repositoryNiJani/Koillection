import { useMemo, useRef, useState } from 'react';
import { buildQuestion } from '../game/questions.js';
import { runQuery } from '../game/db.js';
import { compareResults } from '../game/compare.js';
import { triesLeft } from '../game/state.js';

function ResultTable({ result, limit = 12 }) {
  if (!result) return null;
  const shown = result.rows.slice(0, limit);
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>{result.columns.map((c, i) => <th key={i}>{c}</th>)}</tr>
        </thead>
        <tbody>
          {shown.map((r, i) => (
            <tr key={i}>{r.map((v, j) => <td key={j}>{v === null ? 'NULL' : String(v)}</td>)}</tr>
          ))}
        </tbody>
      </table>
      {result.rows.length > limit && <p className="soft tiny pad">And {result.rows.length - limit} more rows.</p>}
      {result.rows.length === 0 && <p className="soft tiny pad">No rows.</p>}
    </div>
  );
}

function DataTabs({ tables }) {
  const [name, setName] = useState(tables[0].name);
  const table = tables.find((t) => t.name === name) || tables[0];
  return (
    <div className="data">
      <div className="data-head">
        <span className="soft">Data you can query</span>
        <div className="seg" role="tablist" aria-label="Tables">
          {tables.map((t) => (
            <button
              key={t.name}
              role="tab"
              aria-selected={t.name === table.name}
              className={`seg-btn ${t.name === table.name ? 'on' : ''}`}
              onClick={() => setName(t.name)}
            >
              {t.name} <span className="soft">({t.rows.length})</span>
            </button>
          ))}
        </div>
      </div>
      <ResultTable result={{ columns: table.columns.map((c) => c.name), rows: table.rows }} limit={60} />
    </div>
  );
}

export default function Challenge({ state, onResult, githubReady }) {
  const { daily, userId } = state;
  const question = useMemo(
    () => buildQuestion({ userId, day: daily.day, index: daily.index, level: daily.level }),
    [userId, daily.day, daily.index, daily.level],
  );

  const [sql, setSql] = useState('');
  const [output, setOutput] = useState(null); // { result?, error?, verdict? }
  const [lastIndex, setLastIndex] = useState(daily.index);
  const dialogRef = useRef(null);

  // new question -> clear the editor, but keep the "Correct!" message visible
  if (lastIndex !== daily.index) {
    setLastIndex(daily.index);
    setSql('');
    setOutput(output && output.verdict && output.verdict.ok ? { verdict: output.verdict } : null);
  }

  const left = triesLeft(state);

  const run = () => {
    try {
      setOutput({ result: runQuery(question.setupSql, sql) });
    } catch (err) {
      setOutput({ error: err.message });
    }
  };

  const submit = () => {
    let result;
    try {
      result = runQuery(question.setupSql, sql);
    } catch (err) {
      // a broken query is just a typo - it does not cost a try
      setOutput({ error: `${err.message} This did not use a try.` });
      return;
    }
    const verdict = compareResults(question.expected, result, question.ordered);
    setOutput({ result, verdict });
    onResult({ correct: verdict.ok, question, sql });
  };

  return (
    <>
      <button className="btn primary ready-button" onClick={() => dialogRef.current?.showModal()}>
        Ready
      </button>
      <dialog
        ref={dialogRef}
        className="question-dialog"
        onClick={(event) => {
          if (event.target === dialogRef.current) dialogRef.current.close();
        }}
      >
        <section className="tile tile-plain challenge" aria-labelledby="challenge-title">
          <div className="challenge-head">
            <div className="question-title">
              <h2 id="challenge-title">Question {daily.index}</h2>
              <div className="chips">
                <span className="chip level">Level {question.difficulty}</span>
                {question.concepts.map((c) => <span key={c} className="chip">{c}</span>)}
              </div>
            </div>
            <button className="btn small" onClick={() => dialogRef.current?.close()} aria-label="Close question">
              Close
            </button>
          </div>

          <p className="prompt">{question.prompt}</p>

          <DataTabs key={question.id} tables={question.tables} />

          <label className="editor-label" htmlFor="sql-editor">Your query</label>
          <textarea
            id="sql-editor"
            className="editor"
            value={sql}
            onChange={(e) => setSql(e.target.value)}
            placeholder="SELECT ..."
            spellCheck={false}
            rows={6}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') run();
            }}
          />

          <div className="actions">
            <button className="btn" onClick={run} disabled={!sql.trim()}>Run query</button>
            <button className="btn primary" onClick={submit} disabled={!sql.trim() || left <= 0}>
              Submit answer
            </button>
            <span className="soft tiny">Running is free. Submitting uses 1 try. Ctrl+Enter also runs.</span>
          </div>

          {left <= 0 && (
            <p className="notice">You've used all 5 tries today. Fresh questions arrive tomorrow.</p>
          )}

          {output && output.error && <p className="notice bad" role="alert">{output.error}</p>}
          {output && output.verdict && (
            <p className={`notice ${output.verdict.ok ? 'good' : 'bad'}`} role="status">
              {output.verdict.ok
                ? githubReady
                  ? 'Correct! You earned 1 food and the answer is being committed to GitHub.'
                  : 'Correct! You earned 1 food. Connect GitHub to make your answers count on your graph.'
                : output.verdict.reason}
            </p>
          )}
          {output && output.result && (
            <div className="your-result">
              <p className="soft tiny">Your result ({output.result.rows.length} {output.result.rows.length === 1 ? 'row' : 'rows'})</p>
              <ResultTable result={output.result} />
            </div>
          )}
        </section>
      </dialog>
    </>
  );
}
