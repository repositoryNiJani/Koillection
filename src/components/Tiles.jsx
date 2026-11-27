import { formatHatchChance, koiVariety, LARGE } from '../game/fish.js';
import { SpriteIcon } from './FishCard.jsx';
import { TRIES_PER_DAY } from '../game/state.js';

export function FoodTile({ food, grindFood, selected, alert }) {
  const total = food + grindFood;
  let hint;
  if (total <= 0) hint = 'Answer a question to earn food.';
  else if (selected) hint = `Press Feed to give ${selected.name} a meal.`;
  else hint = 'Tap a fish to choose who eats.';

  return (
    <section className="tile tile-peach food">
      <h2>Food</h2>
      <p className="big-number" aria-live="polite">{total}</p>
      <p className="hint-line">{hint}</p>
      {grindFood > 0 && (
        <p className="soft tiny">{grindFood} of it is grind food and spoils tonight.</p>
      )}
      {alert && <p className="alert-line">{alert}</p>}
    </section>
  );
}

export function TriesTile({ left, solved }) {
  return (
    <section className="tile tile-butter tries">
      <h2>Tries</h2>
      <div className="pips" role="img" aria-label={`${left} of ${TRIES_PER_DAY} tries left today`}>
        {Array.from({ length: TRIES_PER_DAY }, (_, i) => (
          <span key={i} className={`pip ${i < left ? 'on' : ''}`} />
        ))}
      </div>
      <p className="hint-line">{left} left today</p>
      <p className="soft tiny">{solved} solved so far. Resets at midnight.</p>
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
      {trophies.length === 0 ? (
        <p className="soft">Retire a fully grown fish here when your pond is full. Trophies are kept forever.</p>
      ) : (
        <div className="trophy-row">
          {shown.map((t) => (
            <span key={t.id} className="trophy-chip">
              <SpriteIcon stage={LARGE} varietyId={t.varietyId} scale={2} />
              <span>{t.name} · {formatHatchChance(koiVariety(t.varietyId).hatchChance)}</span>
            </span>
          ))}
        </div>
      )}
      <p className="soft tiny">
        {trophies.length} {trophies.length === 1 ? 'trophy' : 'trophies'}, {graveyard.length} lost
      </p>
      <button className="btn small" onClick={onOpen}>Open cold box</button>
    </section>
  );
}

export function Onboarding({ onDismiss }) {
  return (
    <section className="tile tile-water onboard">
      <div>
        <h2>Welcome to your pond</h2>
        <p className="soft">Real SQL practice keeps your koi alive and your GitHub graph green.</p>
      </div>
      <ol className="steps">
        <li><b>Answer</b> today's SQL question. You get 5 tries a day.</li>
        <li><b>Earn food</b> for every correct answer. It is committed to GitHub as a real commit.</li>
        <li><b>Feed your koi</b> before 3 days pass. Fed koi grow, and fully grown koi split in two.</li>
      </ol>
      <button className="btn" onClick={onDismiss}>Got it</button>
    </section>
  );
}
