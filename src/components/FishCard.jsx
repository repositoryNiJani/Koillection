import { useEffect, useRef } from 'react';
import {
  STAGES, LARGE, MEALS_TO_GROW, GRIND_FOOD, effectiveTier, koiScale, koiVariety, msUntilStarve, STARVE_MS,
} from '../game/fish.js';
import { fmtDuration } from '../game/time.js';
import { SPRITE_W, SPRITE_H } from './Pond.jsx';

// One stage of the koi sprite sheet, drawn with CSS so it stays crisp.
export function SpriteIcon({ stage, varietyId, scaleId, scale = 3, className = '' }) {
  const variety = koiVariety(varietyId);
  return (
    <span
      className={`sprite ${stage > 0 && scaleId === 'gin-rin' ? 'sparkle' : ''} ${className}`}
      role="img"
      aria-label={`${STAGES[stage]} koi`}
      style={{
        width: SPRITE_W * scale,
        height: SPRITE_H * scale,
        backgroundSize: `${SPRITE_W * 5 * scale}px ${SPRITE_H * scale}px`,
        backgroundPosition: `${-stage * SPRITE_W * scale}px 0`,
        filter: stage === 0 ? 'none' : variety.filter,
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

// A compact, keyboard-friendly way to select fish in the pond.
export function Roster({ fish, selectedId, onSelect }) {
  return (
    <ul className="roster" aria-label="Fish in your pond">
      {fish.map((f) => (
        <li key={f.id}>
          <button
            className={`slot ${f.id === selectedId ? 'is-selected' : ''}`}
            aria-pressed={f.id === selectedId}
            title={`${f.name}, ${f.stage === 0 ? '???' : `${koiVariety(f.varietyId).type}, ${koiScale(f.scaleId).name}, ${effectiveTier(f).name}`}`}
            onClick={() => onSelect(f.id === selectedId ? null : f.id)}
          >
            <SpriteIcon stage={f.stage} varietyId={f.varietyId} scaleId={f.scaleId} scale={2} />
            <span className="slot-name">{f.name}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export function FishDetail({ fish, now, food, pondFull, onClose, onFeed, onGrind, onTrophy }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    if (fish && dialogRef.current && !dialogRef.current.open) dialogRef.current.showModal();
  }, [fish]);

  if (!fish) return null;

  const left = msUntilStarve(fish, now);
  const { ratio, mood } = moodOf(fish, now);
  const grown = fish.stage >= LARGE;
  const growthLine = grown
    ? 'Fully grown'
    : `${fish.meals} of ${MEALS_TO_GROW[fish.stage]} meals to become ${STAGES[fish.stage + 1].toLowerCase()}`;
  const growth = grown ? 1 : fish.meals / MEALS_TO_GROW[fish.stage];
  const canRetire = grown && pondFull;
  const moodText = { ok: 'Happy', hungry: 'Getting hungry', starving: 'Starving' }[mood];
  const revealed = fish.stage > 0;
  const variety = koiVariety(fish.varietyId);
  const scale = koiScale(fish.scaleId);
  const tier = effectiveTier(fish);

  return (
    <dialog
      ref={dialogRef}
      className="fish-dialog"
      aria-labelledby="fish-detail-title"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) dialogRef.current.close();
      }}
    >
      <section className="tile tile-plain fish-detail-modal">
        <div className="fish-modal-head">
          <div className="detail-head">
            <div className="detail-art">
              <SpriteIcon stage={fish.stage} varietyId={fish.varietyId} scaleId={fish.scaleId} scale={4} />
            </div>
            <div>
              <h2 id="fish-detail-title">{fish.name}</h2>
              <p className="variety-label">
                {revealed
                  ? <>{variety.type}, {scale.name}, <span className={`tier-label tier-${tier.id}`}>{tier.name}</span></>
                  : '???'}
              </p>
              <p className="soft tiny variety-colors">
                {revealed
                  ? <><KoiPattern varietyId={fish.varietyId} /> {variety.colors.map((color) => color.name).join(' + ')}</>
                  : '???'}
              </p>
              <p className="soft tiny">{STAGES[fish.stage]} koi · generation {fish.generation}</p>
            </div>
          </div>
          <button className="btn small" type="button" onClick={() => dialogRef.current?.close()}>
            Close
          </button>
        </div>

        <div className="fish-stats">
          <div className="fish-stat">
            <span className="soft">Food remaining</span>
            <b>{food}</b>
          </div>
          <div className="fish-stat fish-growth">
            <div className="meter-label">
              <span>Growth</span>
              <span className="soft">{growthLine}</span>
            </div>
            <div className="meter"><div className="meter-fill growth" style={{ width: `${growth * 100}%` }} /></div>
          </div>
        </div>

        <div className="meter-row fish-hunger">
          <div className="meter-label">
            <span className={`mood ${mood}`}>{moodText}</span>
            <span className="soft">{fish.stage === 0 ? 'Safe until it hatches' : `Starves in ${fmtDuration(left)}`}</span>
          </div>
          <div className="meter"><div className={`meter-fill ${mood}`} style={{ width: `${ratio * 100}%` }} /></div>
        </div>

        <button className="btn primary block" disabled={food <= 0} onClick={() => onFeed(fish.id)}>
          Feed {fish.name}
        </button>
        {food <= 0 && <p className="soft tiny">Answer a question to earn food.</p>}

        {canRetire && (
          <div className="retire">
            <p>Your pond is full, so {fish.name} can't split. Choose what happens next.</p>
            <div className="retire-grid">
              <button className="btn peach" onClick={() => onGrind(fish.id)}>
                Grind for {GRIND_FOOD} food
              </button>
              <button className="btn butter" onClick={() => onTrophy(fish.id)}>
                Make a trophy
              </button>
            </div>
            <p className="soft tiny">
              Grinding gives food that spoils tonight. A trophy stays in your cold box.
            </p>
          </div>
        )}
      </section>
    </dialog>
  );
}
