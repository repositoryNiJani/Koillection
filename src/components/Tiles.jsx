import { LARGE } from '../game/fish.js';
import { SpriteIcon } from './FishCard.jsx';
import { TRIES_PER_DAY } from '../game/state.js';

export function FoodTile({ food, grindFood, alert }) {
  const total = food + grindFood;
  return (
    <section className="tile tile-peach food">
      <h2>Food</h2>
      <p className="big-number" aria-live="polite">{total}</p>
      <p className="hint-line">available</p>
      {grindFood > 0 && (
        <p className="soft tiny">{grindFood} of it is grind food and spoils tonight.</p>
      )}
      {alert && <p className="alert-line">{alert}</p>}
    </section>
  );
}

export function TriesTile({ left }) {
  return (
    <section className="tile tile-butter tries">
      <h2>Tries</h2>
      <p className="big-number" aria-label={`${left} of ${TRIES_PER_DAY} tries left today`}>{left}</p>
      <p className="hint-line">left today</p>
    </section>
  );
}

export function GithubTile({ gh, pending, onConnect, onRetry }) {
  return (
    <section className="tile tile-mint github">
      <h2>GitHub</h2>
      {gh ? (
        <>
          <p className="hint-line">Committing to</p>
          <p className="repo">{gh.login}/{gh.repo}</p>
          {pending > 0 && (
            <button className="btn small" onClick={onRetry}>Retry {pending} waiting</button>
          )}
        </>
      ) : (
        <>
          <p className="hint-line">Practice mode</p>
          <p className="soft tiny">Connect GitHub so correct answers count on your graph.</p>
          <button className="btn small" onClick={onConnect}>Connect GitHub</button>
        </>
      )}
    </section>
  );
}

export function ColdBoxTile({ trophies, graveyard, onOpen }) {
  const shown = trophies.slice(-3);
  return (
    <section className="tile tile-plain coldbox">
      <h2>Cold box</h2>
      <p className="big-number">{trophies.length}</p>
      <p className="hint-line">{trophies.length === 1 ? 'trophy saved' : 'trophies saved'}</p>
      {shown.length > 0 && (
        <div className="trophy-row">
          {shown.map((t) => (
            <span key={t.id} className="trophy-chip">
              <SpriteIcon stage={LARGE} varietyId={t.varietyId} scaleId={t.scaleId} scale={2} />
              <span>{t.name}</span>
            </span>
          ))}
        </div>
      )}
      <p className="soft tiny">{graveyard.length} lost</p>
      <button className="btn small" onClick={onOpen}>View cold box</button>
    </section>
  );
}
