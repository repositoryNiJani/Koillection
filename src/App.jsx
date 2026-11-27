import { useCallback, useEffect, useRef, useState } from 'react';
import Pond from './components/Pond.jsx';
import { Roster, FishDetail, SpriteIcon } from './components/FishCard.jsx';
import { FoodTile, TriesTile, GithubTile, ColdBoxTile, Onboarding } from './components/Tiles.jsx';
import Challenge from './components/Challenge.jsx';
import ColdBox from './components/ColdBox.jsx';
import Settings from './components/Settings.jsx';
import Trade from './components/Trade.jsx';
import {
  loadState, saveState, resetState, ensureDay, recordAttempt, triesLeft,
} from './game/state.js';
import {
  feed, grind, makeTrophy, hatchEgg, tick, foodAvailable, msUntilStarve, MAX_FISH, LARGE,
} from './game/fish.js';
import { loadGithub, putFile, buildCommit } from './game/github.js';
import { fmtDuration, DAY_MS } from './game/time.js';

const ONBOARD_KEY = 'sqlfish.onboarded.v1';

export default function App() {
  const [state, setState] = useState(loadState);
  const [gh, setGh] = useState(loadGithub);
  const [tab, setTab] = useState('play');
  const [tradeOpen, setTradeOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [toast, setToast] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [onboarded, setOnboarded] = useState(() => {
    try { return localStorage.getItem(ONBOARD_KEY) === '1'; } catch { return true; }
  });

  const stateRef = useRef(state);
  stateRef.current = state;
  const ghRef = useRef(gh);
  ghRef.current = gh;
  const flushing = useRef(false);

  useEffect(() => saveState(state), [state]);

  // ---- toasts ---------------------------------------------------------
  const notify = useCallback((event) => {
    if (!event) return;
    setToast({ ...event, key: Math.random() });
  }, []);
  useEffect(() => {
    if (!toast) return undefined;
    const id = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(id);
  }, [toast]);

  // ---- time passes: starvation, spoiled grind food, new day ------------
  const runTick = useCallback(() => {
    const t = Date.now();
    const before = stateRef.current;
    const r = tick(before, t);
    const next = ensureDay(r.state, t);
    const changed =
      r.events.length > 0 ||
      next.daily.day !== before.daily.day ||
      next.grindFood !== before.grindFood ||
      next.grindFoodDay !== before.grindFoodDay;
    if (changed) setState(next);
    r.events.forEach(notify);
    setNow(t);
  }, [notify]);

  useEffect(() => {
    runTick(); // catch up on whatever happened while the tab was closed
    const id = setInterval(runTick, 15000);
    return () => clearInterval(id);
  }, [runTick]);

  // ---- GitHub commits ---------------------------------------------------
  const flushCommits = useCallback(async () => {
    const cfg = ghRef.current;
    if (!cfg || flushing.current) return;
    flushing.current = true;
    try {
      for (const commit of stateRef.current.pendingCommits) {
        await putFile({
          token: cfg.token, owner: cfg.login, repo: cfg.repo,
          path: commit.path, content: commit.content, message: commit.message,
        });
        setState((s) => ({ ...s, pendingCommits: s.pendingCommits.filter((c) => c.path !== commit.path) }));
      }
      notify({ type: 'committed', message: 'Committed to GitHub. Your graph will turn green!' });
    } catch (err) {
      notify({ type: 'error', message: `Could not commit yet: ${err.message}. It will retry later.` });
    } finally {
      flushing.current = false;
    }
  }, [notify]);

  useEffect(() => {
    if (gh && state.pendingCommits.length > 0) flushCommits();
    // only when GitHub gets connected or on first load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gh]);

  // ---- answering --------------------------------------------------------
  const handleResult = ({ correct, question, sql }) => {
    const t = Date.now();
    let next = recordAttempt(stateRef.current, correct);
    if (correct && ghRef.current) {
      next = { ...next, pendingCommits: [...next.pendingCommits, buildCommit({ question, sql, now: t })] };
    }
    setState(next);

    if (correct) {
      // jump straight to the fish that needs food most, so feeding is one click
      const hungriest = next.fish.slice().sort((a, b) => a.lastFed - b.lastFed)[0];
      if (hungriest) setSelectedId(hungriest.id);
      notify({ type: 'good', message: `Correct! +1 food. ${hungriest ? `${hungriest.name} is ready to eat.` : ''}` });
      if (ghRef.current) setTimeout(flushCommits, 0);
    } else {
      notify({ type: 'error', message: 'Not quite. This question is still waiting for you.' });
    }
  };

  // ---- fish actions -----------------------------------------------------
  const act = (fn, ...args) => {
    const r = fn(stateRef.current, ...args, Date.now());
    setState(r.state);
    notify(r.event);
    return r;
  };

  const retire = (fn) => (id) => {
    act(fn, id);
    setSelectedId(null);
  };

  const dismissOnboarding = () => {
    setOnboarded(true);
    try { localStorage.setItem(ONBOARD_KEY, '1'); } catch { /* ignore */ }
  };

  const food = foodAvailable(state);
  const selected = state.fish.find((f) => f.id === selectedId) || null;
  const pondFull = state.fish.length >= MAX_FISH;

  // gentle warning for the fish closest to starving
  const closest = state.fish.slice().sort((a, b) => msUntilStarve(a, now) - msUntilStarve(b, now))[0];
  const alert =
    closest && msUntilStarve(closest, now) < DAY_MS
      ? `${closest.name} starves in ${fmtDuration(msUntilStarve(closest, now))}.`
      : null;

  const trophyBadge = state.trophies.length > 0 ? ` (${state.trophies.length})` : '';

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <span className="brand-art"><SpriteIcon stage={LARGE} scale={1.5} /></span>
          <h1>Koillection</h1>
        </div>
        <nav className="seg" aria-label="Sections">
          {[['play', 'Play'], ['trade', 'Trade'], ['cold', `Cold box${trophyBadge}`], ['settings', 'Settings']].map(([id, label]) => (
            <button
              key={id}
              className={`seg-btn ${(id === 'trade' ? tradeOpen : tab === id) ? 'on' : ''}`}
              aria-current={id !== 'trade' && tab === id ? 'page' : undefined}
              aria-haspopup={id === 'trade' ? 'dialog' : undefined}
              aria-expanded={id === 'trade' ? tradeOpen : undefined}
              onClick={() => (id === 'trade' ? setTradeOpen(true) : setTab(id))}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      {toast && (
        <div className={`toast ${toast.type}`} onClick={() => setToast(null)} role="status">
          {toast.message}
        </div>
      )}

      {tab === 'play' && (
        <main className="bento">
          {!onboarded && <Onboarding onDismiss={dismissOnboarding} />}

          <div className="col-main">
            <section className="tile tile-water pond-tile">
              <div className="tile-head">
                <h2>Your pond</h2>
                <span className="count">{state.fish.length} of {MAX_FISH} fish</span>
              </div>
              <Pond fish={state.fish} selectedId={selectedId} onSelect={setSelectedId} />
              <Challenge state={state} onResult={handleResult} githubReady={Boolean(gh)} />
              {state.fish.length === 0 ? (
                <div className="empty-pond">
                  <p>Every fish starved. Start again with a new egg.</p>
                  <button className="btn primary" onClick={() => act(hatchEgg)}>Hatch a new egg</button>
                </div>
              ) : (
                <Roster fish={state.fish} selectedId={selectedId} now={now} onSelect={setSelectedId} />
              )}
            </section>
          </div>

          <div className="col-side">
            <FoodTile food={state.food} grindFood={state.grindFood} selected={selected} alert={alert} />
            <FishDetail
              fish={selected}
              now={now}
              food={food}
              pondFull={pondFull}
              onFeed={(id) => act(feed, id)}
              onGrind={retire(grind)}
              onTrophy={retire(makeTrophy)}
            />
            <div className="pair">
              <TriesTile left={triesLeft(state)} solved={state.daily.solved} />
              <GithubTile
                gh={gh}
                pending={state.pendingCommits.length}
                onConnect={() => setTab('settings')}
                onRetry={flushCommits}
              />
            </div>
            <ColdBoxTile trophies={state.trophies} graveyard={state.graveyard} onOpen={() => setTab('cold')} />
          </div>
        </main>
      )}

      {tab === 'cold' && <ColdBox trophies={state.trophies} graveyard={state.graveyard} />}

      <Trade state={state} open={tradeOpen} onClose={() => setTradeOpen(false)} />

      {tab === 'settings' && (
        <Settings
          gh={gh}
          setGh={setGh}
          pendingCount={state.pendingCommits.length}
          onRetry={flushCommits}
          onConnected={(login) => setState((s) => ({ ...s, userId: `gh:${login}` }))}
          onReset={() => {
            setState(resetState());
            setSelectedId(null);
          }}
        />
      )}
    </div>
  );
}
