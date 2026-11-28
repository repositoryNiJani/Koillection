import { KoiPattern, SpriteIcon } from './FishCard.jsx';
import { comboChance, effectiveTier, formatHatchChance, koiScale, koiVariety, KOI_RARITY_TIERS, KOI_SCALES, KOI_VARIETIES, LARGE } from '../game/fish.js';

const fmtDate = (ts) => new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

export default function ColdBox({ trophies, graveyard }) {
  return (
    <div className="page-stack">
      <section className="tile tile-plain">
        <h2>Cold box</h2>
        {trophies.length === 0 ? (
          <p className="soft">
            No trophies yet. When your pond is full and a fish is fully grown, you can keep it here as an achievement.
          </p>
        ) : (
          <ul className="trophy-grid">
            {trophies.map((t) => (
              <li key={t.id} className="trophy">
                <span className="trophy-art"><SpriteIcon stage={LARGE} varietyId={t.varietyId} scaleId={t.scaleId} scale={4} /></span>
                <b className="variety-label">
                  {koiVariety(t.varietyId).type}, {koiScale(t.scaleId).name}, <span className={`tier-label tier-${effectiveTier(t).id}`}>{effectiveTier(t).name}</span> - {t.name} - {formatHatchChance(comboChance(t))} hatch chance
                </b>
                <span className="soft tiny variety-colors">
                  <KoiPattern varietyId={t.varietyId} />
                  {koiVariety(t.varietyId).colors.map((color) => color.name).join(' + ')}
                </span>
                <span className="soft tiny">Generation {t.generation}</span>
                <span className="soft tiny">{t.totalMeals} meals, grew in {t.daysToGrow} days</span>
                <span className="soft tiny">Retired {fmtDate(t.retiredAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="tile tile-water rarity-guide">
        <h2>Koi rarity guide</h2>
        <p className="soft rarity-guide-intro">
          The color pattern sets a koi's starting tier. Its scales can raise that tier; Gin Rin raises it by one step,
          up to Divine. Each variety below shows its individual chance within its color tier.
        </p>
        <ul className="rarity-grid">
          {KOI_RARITY_TIERS.map((tier) => {
            const available = KOI_VARIETIES.filter((variety) => variety.tierId === tier.id);
            return (
              <li key={tier.id} className={`rarity-tier tier-${tier.id}`}>
                <div className="rarity-tier-head">
                  <b>{tier.name}</b>
                  <span>{tier.chance}% overall</span>
                </div>
                <p className="rarity-tier-range">Rarity band: {tier.range}</p>
                <p><b>Color patterns:</b> {tier.combinations}</p>
                <details className="rarity-available">
                  <summary>
                    {available.length
                      ? `${available.length} patterns · ${tier.chance}% combined chance`
                      : 'No varieties available yet'}
                  </summary>
                  {available.length > 0 && (
                    <ul>
                      {available.map((variety) => (
                        <li key={variety.id}>
                          {variety.type} — {formatHatchChance(variety.hatchChance)} — {variety.colors.map((color) => color.name).join(' + ')}
                        </li>
                      ))}
                    </ul>
                  )}
                </details>
              </li>
            );
          })}
        </ul>
        <h3 className="scales-heading">Scales</h3>
        <ul className="rarity-grid">
          {KOI_SCALES.map((scale) => (
            <li key={scale.id} className="rarity-tier">
              <div className="rarity-tier-head">
                <b>{scale.name}</b>
                <span>{scale.chance}% chance</span>
              </div>
              <p>{scale.description}</p>
              <p className="rarity-available">
                Tier bonus: {scale.tierBonus ? `+${scale.tierBonus}` : 'None'}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="tile tile-plain">
        <h2>Graveyard</h2>
        {graveyard.length === 0 ? (
          <p className="soft">Nobody has starved. Keep feeding them!</p>
        ) : (
          <ul className="grave-list">
            {graveyard.slice().reverse().map((g, i) => (
              <li key={i}>
                <b>{g.name}</b> <span className="soft">starved on {fmtDate(g.diedAt)} (generation {g.generation})</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
