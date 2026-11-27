import { useState } from 'react';
import { whoAmI, ensureRepo, saveGithub } from '../game/github.js';

export default function Settings({ gh, setGh, pendingCount, onRetry, onConnected, onReset }) {
  const [token, setToken] = useState('');
  const [repo, setRepo] = useState(gh?.repo || 'sql-fish-journal');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const connect = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const login = await whoAmI(token.trim());
      const created = await ensureRepo(token.trim(), login, repo.trim());
      const cfg = { token: token.trim(), login, repo: repo.trim() };
      saveGithub(cfg);
      setGh(cfg);
      onConnected(login);
      setToken('');
      setMsg({ ok: true, text: created ? `Connected as ${login}. Created ${login}/${repo.trim()}.` : `Connected as ${login}.` });
    } catch (err) {
      setMsg({ ok: false, text: err.message });
    } finally {
      setBusy(false);
    }
  };

  const disconnect = () => {
    saveGithub(null);
    setGh(null);
    setMsg({ ok: true, text: 'Disconnected. New answers will not be committed.' });
  };

  return (
    <div className="page-stack">
      <section className="tile tile-mint">
        <h2>GitHub</h2>
        {gh ? (
          <>
            <p>
              Connected as <b>{gh.login}</b>. Correct answers are committed to <b>{gh.login}/{gh.repo}</b>.
            </p>
            {pendingCount > 0 && (
              <p className="notice bad">
                {pendingCount} {pendingCount === 1 ? 'answer is' : 'answers are'} waiting to be committed.{' '}
                <button className="btn small" onClick={onRetry}>Retry now</button>
              </p>
            )}
            <button className="btn" onClick={disconnect}>Disconnect GitHub</button>
          </>
        ) : (
          <>
            <p className="soft">
              Create a fine-grained personal access token on GitHub (Settings, then Developer settings). Give it
              <b> Contents: Read and write</b> on your journal repo. Add <b>Administration: Read and write</b> only if the
              app should create the repo for you. The token stays in this browser.
            </p>
            <label className="field">
              <span>Token</span>
              <input type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="github_pat_..." />
            </label>
            <label className="field">
              <span>Repository name</span>
              <input value={repo} onChange={(e) => setRepo(e.target.value)} />
            </label>
            <button className="btn primary" disabled={busy || !token.trim() || !repo.trim()} onClick={connect}>
              {busy ? 'Connecting…' : 'Connect GitHub'}
            </button>
          </>
        )}
        {msg && <p className={`notice ${msg.ok ? 'good' : 'bad'}`} role="status">{msg.text}</p>}
      </section>

      <section className="tile tile-plain">
        <h2>Reset game</h2>
        <p className="soft">Deletes your pond, trophies and progress in this browser. Commits already on GitHub stay there.</p>
        <button
          className="btn danger"
          onClick={() => {
            if (confirm('Delete your pond, trophies and progress in this browser? This cannot be undone.')) onReset();
          }}
        >
          Reset game
        </button>
      </section>
    </div>
  );
}
