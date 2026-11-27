import {
  STAGES, LARGE, MEALS_TO_GROW, MAX_FISH, GRIND_FOOD, formatHatchChance, koiVariety, msUntilStarve, STARVE_MS,
} from '../game/fish.js';
import { fmtDuration } from '../game/time.js';
import { SPRITE_W, SPRITE_H } from './Pond.jsx';

// One stage of the koi sprite sheet, drawn with CSS so it stays crisp.
export function SpriteIcon({ stage, varietyId, scale = 3, className = '' }) {
  const variety = koiVariety(varietyId);
  return (
    <span
      className={`sprite ${className}`}
      role="img"
      aria-label={`${STAGES[stage]} koi`}
      style={{
        width: SPRITE_W * scale,
        height: SPRITE_H * scale,
        backgroundSize: `${SPRITE_W * 5 * scale}px ${SPRITE_H * scale}px`,
        backgroundPosition: `${-stage * SPRITE_W * scale}px 0`,
        filter: variety.filter,
      }}
    />
  );
}

export function KoiPattern({ varietyId }) {
  const variety = koiVariety(varietyId);
  const colors = variety.colors.map((color) => color.hex).join(', ');
  return (
    <span
      className="koi-pattern"
      role="img"
      aria-label={`${variety.colors.map((color) => color.name).join(' and ')} color pattern`}
      style={{ background: `linear-gradient(90deg, ${colors})` }}
    />
  );
}

export function moodOf(fish, now) {
  const ratio = Math.max(0, Math.min(1, msUntilStarve(fish, now) / STARVE_MS));
  const mood = ratio > 0.67 ? 'ok' : ratio > 0.34 ? 'hungry' : 'starving';
  return { ratio, mood };
}

// The 6 pond slots. Filled slots are fish you can pick; empty slots show how much room is left.
export function Roster({ fish, selectedId, now, onSelect }) {
  const slots = Array.from({ length: MAX_FISH }, (_, i) => fish[i] || null);
  return (
    <ul className="roster" aria-label="Fish in your pond">
      {slots.map((f, i) =>
        f ? (
          <li key={f.id}>
            <button
              className={`slot ${f.id === selectedId ? 'is-selected' : ''}`}
              aria-pressed={f.id === selectedId}
              title={`${koiVariety(f.varietyId).type} - ${f.name} - ${formatHatchChance(koiVariety(f.varietyId).hatchChance)} hatch chance`}
              onClick={() => onSelect(f.id === selectedId ? null : f.id)}
            >
              <SpriteIcon stage={f.stage} varietyId={f.varietyId} scale={2} />
              <span className="slot-name">{f.name}</span>
              <span className="slot-chance">
                {formatHatchChance(koiVariety(f.varietyId).hatchChance)} chance
              </span>
              <span className="slot-meter" aria-hidden="true">
                <span className={`slot-fill ${moodOf(f, now).mood}`} style={{ width: `${moodOf(f, now).ratio * 100}%` }} />
              </span>
            </button>
          </li>
        ) : (
          <li key={`empty-${i}`}>
            <div className="slot is-empty" aria-label="Empty slot">
              <span className="slot-name">Empty</span>
            </div>
          </li>
        ),
      )}
    </ul>
  );
}

// Everything you can do with the fish you picked.
export function FishDetail({ fish, now, food, pondFull, onFeed, onGrind, onTrophy }) {
  if (!fish) {
    return (
      <section className="tile tile-plain detail is-empty">
        <h2>Pick a fish</h2>
        <p className="soft">Tap a koi in the pond, or one of the slots under it, to see how it is doing and feed it.</p>
      </section>
    );
  }

  const left = msUntilStarve(fish, now);
  const { ratio, mood } = moodOf(fish, now);
  const grown = fish.stage >= LARGE;
  const growthLine = grown
    ? 'Fully grown'
    : `${fish.meals} of ${MEALS_TO_GROW[fish.stage]} meals to become ${STAGES[fish.stage + 1].toLowerCase()}`;
  const growth = grown ? 1 : fish.meals / MEALS_TO_GROW[fish.stage];
  const canRetire = grown && pondFull;
  const moodText = { ok: 'Happy', hungry: 'Getting hungry', starving: 'Starving' }[mood];
  const variety = koiVariety(fish.varietyId);

  return (
    <section className="tile tile-plain detail">
      <div className="detail-head">
        <div className="detail-art">
          <SpriteIcon stage={fish.stage} varietyId={fish.varietyId} scale={4} />
        </div>
        <div>
          <h2>{fish.name}</h2>
          <p className="variety-label">
            {variety.type} - {fish.name} - {formatHatchChance(variety.hatchChance)} hatch chance
          </p>
          <p className="soft tiny variety-colors">
            <KoiPattern varietyId={fish.varietyId} />
            {variety.colors.map((color) => color.name).join(' + ')}
          </p>
          <p className="soft tiny">{STAGES[fish.stage]} koi, generation {fish.generation}</p>
        </div>
      </div>

      <div className="meter-row">
        <div className="meter-label">
          <span>Growth</span>
          <span className="soft">{growthLine}</span>
        </div>
        <div className="meter"><div className="meter-fill growth" style={{ width: `${growth * 100}%` }} /></div>
      </div>

      <div className="meter-row">
        <div className="meter-label">
          <span className={`mood ${mood}`}>{moodText}</span>
          <span className="soft">Starves in {fmtDuration(left)}</span>
        </div>
        <div className="meter"><div className={`meter-fill ${mood}`} style={{ width: `${ratio * 100}%` }} /></div>
      </div>

      <button className="btn primary block" disabled={food <= 0} onClick={() => onFeed(fish.id)}>
        Feed {fish.name}
      </button>
      {food <= 0 && <p className="soft tiny">No food yet. Answer a question to earn some.</p>}

      {canRetire && (
        <div className="retire">
          <p>
            Your pond is full, so {fish.name} can't split. Choose what happens next.
          </p>
          <div className="retire-grid">
            <button className="btn peach" onClick={() => onGrind(fish.id)}>
              Grind for {GRIND_FOOD} food
            </button>
            <button className="btn butter" onClick={() => onTrophy(fish.id)}>
              Make a trophy
            </button>
          </div>
          <p className="soft tiny">
            Grinding gives food that isn't committed to GitHub and spoils tonight. A trophy is kept in your cold box
            forever.
          </p>
        </div>
      )}
    </section>
  );
}
