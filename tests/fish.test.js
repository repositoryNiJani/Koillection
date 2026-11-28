import test from 'node:test';
import assert from 'node:assert/strict';
import {
  chooseKoiScale, chooseKoiVariety, effectiveTier, ensureKoiScales, ensureKoiVarieties, feed, grind, makeTrophy, tick, hatchEgg, makeFish,
  KOI_RARITY_TIERS, KOI_SCALES, KOI_VARIETIES,
  MAX_FISH, STARVE_MS, LARGE, MEALS_TO_GROW, GRIND_FOOD,
} from '../src/game/fish.js';
import { DAY_MS } from '../src/game/time.js';

const T0 = new Date('2026-11-25T08:00:00').getTime();

function freshState() {
  const state = {
    food: 0, grindFood: 0, grindFoodDay: '2026-11-25',
    fish: [], trophies: [], graveyard: [], stats: { splits: 0, ground: 0 }, nextFishId: 1,
  };
  state.fish.push(makeFish(state, T0, 0));
  return state;
}

function giveFood(state, n) {
  return { ...state, food: state.food + n };
}

function feedN(state, id, n, now = T0) {
  let s = state;
  for (let i = 0; i < n; i++) s = feed(s, id, now).state;
  return s;
}

test('koi varieties hatch at their displayed percentage chances', () => {
  const totalChance = KOI_VARIETIES.reduce((sum, variety) => sum + variety.hatchChance, 0);
  const tierChance = KOI_RARITY_TIERS.reduce((sum, tier) => sum + tier.chance, 0);
  assert.ok(Math.abs(totalChance - 100) < 1e-8);
  assert.ok(Math.abs(tierChance - 100) < 1e-8);
  for (const tier of KOI_RARITY_TIERS) {
    const members = KOI_VARIETIES.filter((variety) => variety.tierId === tier.id);
    const memberChance = members.reduce((sum, variety) => sum + variety.hatchChance, 0);
    assert.ok(members.length > 0, `${tier.name} has at least one koi variety`);
    assert.ok(Math.abs(memberChance - tier.chance) < 1e-8, `${tier.name} odds add up to its tier chance`);
  }

  assert.equal(chooseKoiVariety(() => 0).id, KOI_VARIETIES[0].id);
  assert.equal(chooseKoiVariety(() => 0.99999995).id, 'kumonryu');
  assert.equal(KOI_VARIETIES.find((variety) => variety.id === 'kohaku').hatchChance, 14);
  assert.equal(KOI_VARIETIES.find((variety) => variety.id === 'kumonryu').tierId, 'divine');
  assert.equal(KOI_VARIETIES.find((variety) => variety.id === 'kumonryu').hatchChance, 0.005);
  assert.equal(KOI_RARITY_TIERS.some((tier) => tier.id === 'eternal'), false);

  const fish = freshState().fish[0];
  assert.ok(KOI_VARIETIES.some((variety) => variety.id === fish.varietyId));
});

test('existing fish and trophies receive a stable variety when upgraded', () => {
  const oldState = {
    userId: 'old-save',
    fish: [{ id: 1, name: 'Mango', bornAt: T0 }],
    trophies: [{ id: 2, name: 'Nori', retiredAt: T0 }],
    graveyard: [],
  };
  const upgraded = ensureKoiVarieties(oldState);

  assert.ok(KOI_VARIETIES.some((variety) => variety.id === upgraded.fish[0].varietyId));
  assert.ok(KOI_VARIETIES.some((variety) => variety.id === upgraded.trophies[0].varietyId));
  assert.equal(ensureKoiVarieties(oldState).fish[0].varietyId, upgraded.fish[0].varietyId);
  assert.equal(oldState.fish[0].varietyId, undefined);
});

test('koi scales have the expected weighted picks', () => {
  assert.equal(KOI_SCALES.reduce((sum, scale) => sum + scale.chance, 0), 100);
  assert.equal(chooseKoiScale(() => 0).id, KOI_SCALES[0].id);
  assert.equal(chooseKoiScale(() => 0.999999).id, KOI_SCALES[KOI_SCALES.length - 1].id);
});

test('scale bonuses adjust the effective tier and cap at divine', () => {
  assert.equal(effectiveTier({ varietyId: 'kohaku', scaleId: 'gin-rin' }).id, 'rare');
  assert.equal(effectiveTier({ varietyId: 'kumonryu', scaleId: 'gin-rin' }).id, 'divine');
  assert.equal(effectiveTier({ varietyId: 'kohaku', scaleId: 'normal' }).id, 'common');
});

test('old fish, trophies, and graveyard entries get stable scales without mutation', () => {
  const oldState = {
    userId: 'old-save',
    fish: [{ id: 1, name: 'Mango', bornAt: T0 }],
    trophies: [{ id: 2, name: 'Nori', retiredAt: T0 }],
    graveyard: [{ id: 3, name: 'Sakura', diedAt: T0 }],
  };
  const before = structuredClone(oldState);
  const upgraded = ensureKoiScales(oldState);
  const scales = [...upgraded.fish, ...upgraded.trophies, ...upgraded.graveyard].map((item) => item.scaleId);

  assert.ok(scales.every((id) => KOI_SCALES.some((scale) => scale.id === id)));
  assert.deepEqual(
    [...ensureKoiScales(oldState).fish, ...ensureKoiScales(oldState).trophies, ...ensureKoiScales(oldState).graveyard]
      .map((item) => item.scaleId),
    scales,
  );
  assert.deepEqual(oldState, before);
});

test('feeding grows a fish stage by stage', () => {
  let s = giveFood(freshState(), 20);
  const id = s.fish[0].id;
  let r = feed(s, id, T0);
  assert.equal(r.state.fish[0].stage, 1, 'egg hatches after 1 meal');
  assert.equal(r.event.type, 'grew');
  assert.equal(r.state.food, 19);

  s = feedN(r.state, id, 2);
  assert.equal(s.fish[0].stage, 2, 'baby -> medium after 2 meals');
});

test('no food means no feeding', () => {
  const s = freshState();
  const r = feed(s, s.fish[0].id, T0);
  assert.equal(r.event.type, 'error');
  assert.equal(r.state, s);
});

test('a fish that reaches Large splits when there is room', () => {
  let s = giveFood(freshState(), 50);
  const id = s.fish[0].id;
  const mealsToLarge = MEALS_TO_GROW.reduce((a, b) => a + b, 0);
  s = feedN(s, id, mealsToLarge - 1);
  assert.equal(s.fish[0].stage, LARGE - 1);
  const r = feed(s, id, T0);
  assert.equal(r.event.type, 'split');
  assert.equal(r.state.fish.length, 2);
  const parent = r.state.fish.find((f) => f.id === id);
  const child = r.state.fish.find((f) => f.id !== id);
  assert.equal(parent.stage, 1, 'parent drops back to baby');
  assert.equal(child.stage, 0, 'child starts as an egg');
  assert.equal(parent.generation, 2);
});

function fullPondWithLarge() {
  let s = giveFood(freshState(), 0);
  s.fish = [];
  for (let i = 0; i < MAX_FISH; i++) s.fish.push(makeFish(s, T0, 2));
  s.fish[0].stage = LARGE;
  s.fish[0].reachedLargeAt = T0 + 5 * DAY_MS;
  return s;
}

test('in a full pond a Large fish stays Large (no split)', () => {
  let s = giveFood(fullPondWithLarge(), 3);
  const id = s.fish[0].id;
  const r = feed(s, id, T0);
  assert.equal(r.state.fish.length, MAX_FISH);
  assert.equal(r.state.fish.find((f) => f.id === id).stage, LARGE);
  assert.equal(r.event.type, 'fed');
});

test('grinding gives uncommitted grind food, frees a slot, and only works in a full pond', () => {
  const s = fullPondWithLarge();
  const id = s.fish[0].id;

  // not Large -> refused
  assert.equal(grind(s, s.fish[1].id, T0).event.type, 'error');

  const r = grind(s, id, T0);
  assert.equal(r.event.type, 'ground');
  assert.equal(r.state.fish.length, MAX_FISH - 1);
  assert.equal(r.state.grindFood, GRIND_FOOD);
  assert.equal(r.state.food, 0, 'grind food is separate from earned food');
  assert.equal(r.state.stats.ground, 1);

  // pond no longer full -> can't grind again
  const another = r.state.fish[0];
  another.stage = LARGE;
  assert.equal(grind(r.state, another.id, T0).event.type, 'error');
});

test('a slot freed by grinding lets another Large fish split when fed with grind food', () => {
  let s = fullPondWithLarge();
  s.fish[1].stage = LARGE;
  const [a, b] = [s.fish[0].id, s.fish[1].id];
  s = grind(s, a, T0).state; // 5 fish now, 2 grind food
  const r = feed(s, b, T0);
  assert.equal(r.event.type, 'split');
  assert.equal(r.state.fish.length, MAX_FISH);
  assert.equal(r.state.grindFood, GRIND_FOOD - 1);
});

test('trophy removes the fish into the cold box and gives no food', () => {
  const s = fullPondWithLarge();
  const id = s.fish[0].id;
  s.fish[0].scaleId = 'gin-rin';
  const r = makeTrophy(s, id, T0 + 6 * DAY_MS);
  assert.equal(r.event.type, 'trophy');
  assert.equal(r.state.fish.length, MAX_FISH - 1);
  assert.equal(r.state.trophies.length, 1);
  assert.equal(r.state.trophies[0].name, s.fish[0].name);
  assert.equal(r.state.trophies[0].varietyId, s.fish[0].varietyId);
  assert.equal(r.state.trophies[0].scaleId, 'gin-rin');
  assert.equal(r.state.food + r.state.grindFood, 0);
  assert.equal(makeTrophy(s, s.fish[1].id, T0).event.type, 'error');
});

test('a fish dies after 3 days without food, feeding resets the timer', () => {
  let s = giveFood(freshState(), 5);
  const id = s.fish[0].id;
  s.fish[0].scaleId = 'mirror';

  let t = tick(s, T0 + STARVE_MS - 1000);
  assert.equal(t.state.fish.length, 1, 'still alive just before 3 days');

  s = feed(s, id, T0 + 2 * DAY_MS).state;
  t = tick(s, T0 + STARVE_MS + 1000);
  assert.equal(t.state.fish.length, 1, 'feeding restarted the 3-day clock');

  t = tick(s, T0 + 2 * DAY_MS + STARVE_MS + 1000);
  assert.equal(t.state.fish.length, 0);
  assert.equal(t.state.graveyard.length, 1);
  assert.equal(t.state.graveyard[0].scaleId, 'mirror');
  assert.equal(t.events[0].type, 'died');

  const hatched = hatchEgg(t.state, T0 + 6 * DAY_MS);
  assert.equal(hatched.state.fish.length, 1);
  assert.equal(hatchEgg(hatched.state, T0).event.type, 'error');
});

test('an egg does not starve before hatching, then its starvation timer starts', () => {
  const state = giveFood(freshState(), 1);
  const eggId = state.fish[0].id;
  const late = T0 + STARVE_MS * 2;
  const unhatched = tick(state, late);

  assert.equal(unhatched.state.fish.length, 1);
  assert.equal(unhatched.state.graveyard.length, 0);

  const hatched = feed(unhatched.state, eggId, late).state;
  assert.equal(hatched.fish[0].stage, 1);
  assert.equal(tick(hatched, late + STARVE_MS - 1).state.fish.length, 1);
  assert.equal(tick(hatched, late + STARVE_MS).state.fish.length, 0);
});

test('leftover grind food spoils the next day and is used before earned food', () => {
  let s = fullPondWithLarge();
  s = grind(s, s.fish[0].id, T0).state;
  s.food = 1;
  const eaten = feed(s, s.fish[1].id, T0).state;
  assert.equal(eaten.grindFood, GRIND_FOOD - 1);
  assert.equal(eaten.food, 1, 'earned food untouched while grind food remains');

  const nextDay = tick({ ...s, grindFoodDay: '2026-11-25' }, T0 + DAY_MS + 3600000);
  assert.equal(nextDay.state.grindFood, 0);
  assert.equal(nextDay.state.food, 1, 'earned food does not spoil');
});
