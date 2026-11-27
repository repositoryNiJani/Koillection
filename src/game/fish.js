// All the fish rules live here as plain functions, so they are easy to
// change and easy to test. Every function takes the current state and returns
// { state, event } without touching the old state.
// `event` is { type, message } - the UI shows the message as a toast.

import { DAY_MS, dayKey } from './time.js';

// ---- Tweak the game here -------------------------------------------------
export const MAX_FISH = 6; // pond capacity
export const STARVE_MS = 3 * DAY_MS; // a fish dies if it isn't fed for 3 days
export const STAGES = ['Egg', 'Baby', 'Medium', 'Kid', 'Large'];
export const LARGE = 4; // index of the last stage
export const MEALS_TO_GROW = [1, 2, 3, 4]; // meals needed to leave Egg, Baby, Medium, Kid
export const GRIND_FOOD = 2; // food you get from grinding a Large fish
export const SPLIT_CHILD_STAGE = 0; // the new fish starts as an Egg
export const PARENT_STAGE_AFTER_SPLIT = 1; // the parent drops back to Baby
// --------------------------------------------------------------------------

export const KOI_RARITY_TIERS = [
  { id: 'common', name: 'Common', chance: 70, range: '50%-100%', combinations: 'Solid colors or familiar pairs: gold; white + red; white + black.' },
  { id: 'rare', name: 'Rare', chance: 20, range: '10%-<50%', combinations: 'Two colors with an accent: blue + white + red; gray + brown.' },
  { id: 'epic', name: 'Epic', chance: 9.04, range: '1%-<10%', combinations: 'Three distinct colors: black + red + white; silver + red + gold.' },
  { id: 'legendary', name: 'Legendary', chance: 0.9, range: '0.1%-<1%', combinations: 'Metallic mixes: gold + black; platinum + red + white.' },
  { id: 'mythic', name: 'Mythic', chance: 0.05, range: '0.01%-<0.1%', combinations: 'Unusual three-color patterns: blue + silver + red.' },
  { id: 'divine', name: 'Divine', chance: 0.01, range: '0.00001%-<0.01%', combinations: 'Rare metallic palettes: platinum + gold + black; black + white.' },
];

const KOI_VARIETY_DEFINITIONS = [
  { id: 'kohaku', type: 'Kohaku', tierId: 'common', weight: 1, colors: [{ name: 'White', hex: '#fffaf0' }, { name: 'Red', hex: '#dc443d' }], filter: 'hue-rotate(-15deg) saturate(1.2)' },
  { id: 'taisho-sanshoku', type: 'Taisho Sanshoku', tierId: 'rare', weight: 1, colors: [{ name: 'White', hex: '#fffaf0' }, { name: 'Red', hex: '#dc443d' }, { name: 'Black', hex: '#26323d' }], filter: 'hue-rotate(-15deg) saturate(1.2)' },
  { id: 'showa-sanshoku', type: 'Showa Sanshoku', tierId: 'epic', weight: 1, colors: [{ name: 'Black', hex: '#26323d' }, { name: 'Red', hex: '#dc443d' }, { name: 'White', hex: '#fffaf0' }], filter: 'hue-rotate(-15deg) saturate(1.2) contrast(1.08)' },
  { id: 'tancho', type: 'Tancho', tierId: 'epic', weight: 1, colors: [{ name: 'White', hex: '#fffaf0' }, { name: 'Red', hex: '#dc443d' }], filter: 'hue-rotate(-15deg) saturate(1.2)' },
  { id: 'shiro-utsuri', type: 'Shiro Utsuri', tierId: 'rare', weight: 1, colors: [{ name: 'Black', hex: '#26323d' }, { name: 'White', hex: '#fffaf0' }], filter: 'grayscale(1) contrast(1.2)' },
  { id: 'bekko', type: 'Bekko', tierId: 'common', weight: 1, colors: [{ name: 'White', hex: '#fffaf0' }, { name: 'Black', hex: '#26323d' }], filter: 'grayscale(1)' },
  { id: 'aka-matsuba', type: 'Aka Matsuba', tierId: 'rare', weight: 1, colors: [{ name: 'Red', hex: '#bc3d32' }, { name: 'Charcoal', hex: '#3e3434' }], filter: 'hue-rotate(-18deg) saturate(1.2)' },
  { id: 'asagi', type: 'Asagi', tierId: 'rare', weight: 1, colors: [{ name: 'Blue', hex: '#5594bd' }, { name: 'Red', hex: '#dc443d' }, { name: 'White', hex: '#fffaf0' }], filter: 'hue-rotate(175deg) saturate(1.15)' },
  { id: 'shusui', type: 'Shusui', tierId: 'epic', weight: 1, colors: [{ name: 'Blue', hex: '#5594bd' }, { name: 'White', hex: '#fffaf0' }, { name: 'Red', hex: '#dc443d' }], filter: 'hue-rotate(175deg) saturate(1.2)' },
  { id: 'koromo', type: 'Koromo', tierId: 'epic', weight: 1, colors: [{ name: 'White', hex: '#fffaf0' }, { name: 'Red', hex: '#dc443d' }, { name: 'Blue', hex: '#5594bd' }], filter: 'hue-rotate(150deg) saturate(1.1)' },
  { id: 'goshiki', type: 'Goshiki', tierId: 'epic', weight: 1, colors: [{ name: 'Gray', hex: '#89919a' }, { name: 'Red', hex: '#dc443d' }, { name: 'Black', hex: '#26323d' }], filter: 'grayscale(0.35) saturate(1.15)' },
  { id: 'kujaku', type: 'Kujaku', tierId: 'epic', weight: 1, colors: [{ name: 'Silver', hex: '#c4cbd0' }, { name: 'Red', hex: '#dc443d' }, { name: 'Gold', hex: '#d9a83b' }], filter: 'saturate(1.25)' },
  { id: 'gin-matsuba', type: 'Gin Matsuba', tierId: 'legendary', weight: 1, colors: [{ name: 'Silver', hex: '#c4cbd0' }, { name: 'Charcoal', hex: '#3e3434' }], filter: 'grayscale(1) brightness(1.2)' },
  { id: 'ogon', type: 'Ogon', tierId: 'legendary', weight: 1, colors: [{ name: 'Gold', hex: '#d9a83b' }], filter: 'sepia(0.8) saturate(2.2) hue-rotate(350deg)' },
  { id: 'platinum-ogon', type: 'Platinum Ogon', tierId: 'mythic', weight: 1, colors: [{ name: 'Platinum', hex: '#d9e0e5' }], filter: 'grayscale(1) brightness(1.45)' },
  { id: 'hariwake', type: 'Hariwake', tierId: 'rare', weight: 1, colors: [{ name: 'Platinum', hex: '#d9e0e5' }, { name: 'Gold', hex: '#d9a83b' }], filter: 'hue-rotate(18deg) saturate(1.25)' },
  { id: 'yamato-nishiki', type: 'Yamato Nishiki', tierId: 'mythic', weight: 1, colors: [{ name: 'Silver', hex: '#c4cbd0' }, { name: 'Red', hex: '#dc443d' }, { name: 'Black', hex: '#26323d' }], filter: 'saturate(1.15)' },
  { id: 'kin-showa', type: 'Kin Showa', tierId: 'divine', weight: 1, colors: [{ name: 'Gold', hex: '#d9a83b' }, { name: 'Black', hex: '#26323d' }, { name: 'Red', hex: '#dc443d' }], filter: 'sepia(0.45) saturate(1.6)' },
  { id: 'kin-ki-utsuri', type: 'Kin Ki Utsuri', tierId: 'legendary', weight: 1, colors: [{ name: 'Gold', hex: '#d9a83b' }, { name: 'Black', hex: '#26323d' }], filter: 'sepia(0.65) saturate(1.8)' },
  { id: 'kikusui', type: 'Kikusui', tierId: 'rare', weight: 1, colors: [{ name: 'Platinum', hex: '#d9e0e5' }, { name: 'Red', hex: '#dc443d' }], filter: 'hue-rotate(-5deg) saturate(1.15)' },
  { id: 'chagoi', type: 'Chagoi', tierId: 'common', weight: 1, colors: [{ name: 'Tea brown', hex: '#9a6b45' }], filter: 'sepia(0.7) saturate(0.9) brightness(0.85)' },
  { id: 'ochiba-shigure', type: 'Ochiba Shigure', tierId: 'rare', weight: 1, colors: [{ name: 'Gray', hex: '#89919a' }, { name: 'Tea brown', hex: '#9a6b45' }], filter: 'sepia(0.3) saturate(0.75)' },
  { id: 'benigoi', type: 'Benigoi', tierId: 'common', weight: 1, colors: [{ name: 'Red', hex: '#dc443d' }], filter: 'hue-rotate(-15deg) saturate(1.3)' },
  { id: 'kigoi', type: 'Kigoi', tierId: 'common', weight: 1, colors: [{ name: 'Yellow', hex: '#e8c948' }], filter: 'hue-rotate(22deg) saturate(1.35)' },
  { id: 'karasugoi', type: 'Karasugoi', tierId: 'legendary', weight: 1, colors: [{ name: 'Black', hex: '#26323d' }], filter: 'grayscale(1) brightness(0.45)' },
  { id: 'kumonryu', type: 'Kumonryu', tierId: 'divine', weight: 1, colors: [{ name: 'Black', hex: '#26323d' }, { name: 'White', hex: '#fffaf0' }], filter: 'grayscale(1) contrast(1.35)' },
];

const KOI_TIER_WEIGHTS = new Map(KOI_RARITY_TIERS.map((tier) => [
  tier.id,
  KOI_VARIETY_DEFINITIONS
    .filter((variety) => variety.tierId === tier.id)
    .reduce((sum, variety) => sum + variety.weight, 0),
]));

export const KOI_VARIETIES = KOI_VARIETY_DEFINITIONS.map((variety) => {
  const tier = KOI_RARITY_TIERS.find((item) => item.id === variety.tierId);
  return {
    ...variety,
    hatchChance: tier.chance * variety.weight / KOI_TIER_WEIGHTS.get(variety.tierId),
  };
});

const KOI_BY_ID = new Map(KOI_VARIETIES.map((variety) => [variety.id, variety]));
const KOI_WEIGHT = KOI_VARIETIES.reduce((sum, variety) => sum + variety.hatchChance, 0);

export function formatHatchChance(chance) {
  const digits = chance >= 1 ? 2 : chance >= 0.1 ? 3 : chance >= 0.01 ? 4 : 5;
  return `${Number(chance.toFixed(digits))}%`;
}

export function chooseKoiVariety(random = Math.random) {
  let choice = random() * KOI_WEIGHT;
  for (const variety of KOI_VARIETIES) {
    choice -= variety.hatchChance;
    if (choice < 0) return variety;
  }
  return KOI_VARIETIES[KOI_VARIETIES.length - 1];
}

export function koiVariety(id) {
  return KOI_BY_ID.get(id) || KOI_VARIETIES[0];
}

function stableRandom(seed) {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash = Math.imul(hash ^ seed.charCodeAt(i), 16777619);
  }
  return (hash >>> 0) / 4294967296;
}

export function ensureKoiVarieties(state) {
  const fillMissing = (items = []) => items.map((item) => (
    koiVariety(item.varietyId).id === item.varietyId
      ? item
      : { ...item, varietyId: chooseKoiVariety(() => stableRandom(`${state.userId || ''}:${item.id}:${item.name}:${item.bornAt || item.retiredAt || item.diedAt || 0}`)).id }
  ));
  return {
    ...state,
    fish: fillMissing(state.fish),
    trophies: fillMissing(state.trophies),
    graveyard: fillMissing(state.graveyard),
  };
}

const NAMES = [
  'Mochi', 'Nori', 'Sakura', 'Kohaku', 'Ume', 'Tama', 'Pandesal', 'Mango', 'Lumpia', 'Bangus',
  'Kiko', 'Bubbles', 'Ginger', 'Biscuit', 'Peach', 'Taro', 'Suki', 'Pepper', 'Dumpling', 'Koko',
];

const clone = (s) => structuredClone(s);
const fail = (state, message) => ({ state, event: { type: 'error', message } });

function pickName(state) {
  const used = new Set(state.fish.map((f) => f.name));
  const free = NAMES.filter((n) => !used.has(n));
  if (free.length) return free[(state.nextFishId * 7) % free.length];
  return `Koi ${state.nextFishId}`;
}

export function makeFish(state, now, stage = 0) {
  const fish = {
    id: state.nextFishId,
    name: pickName(state),
    stage,
    meals: 0, // meals eaten in the current stage
    totalMeals: 0,
    generation: 1,
    bornAt: now,
    lastFed: now, // the 3-day countdown starts here
    reachedLargeAt: null,
    varietyId: chooseKoiVariety().id,
  };
  state.nextFishId += 1;
  return fish;
}

export function canRetire(state, fish) {
  return fish.stage === LARGE && state.fish.length >= MAX_FISH;
}

export function foodAvailable(state) {
  return state.food + state.grindFood;
}

export function msUntilStarve(fish, now) {
  return STARVE_MS - (now - fish.lastFed);
}

// Removes fish that went 3 days without food, and expires leftover grind food.
export function tick(state, now) {
  const s = clone(state);
  const events = [];

  s.fish = s.fish.filter((f) => {
    if (now - f.lastFed >= STARVE_MS) {
      s.graveyard.push({
        name: f.name,
        stage: f.stage,
        generation: f.generation,
        diedAt: f.lastFed + STARVE_MS,
        varietyId: f.varietyId,
      });
      events.push({ type: 'died', message: `${f.name} starved. It wasn't fed for 3 days.` });
      return false;
    }
    return true;
  });

  const today = dayKey(now);
  if (s.grindFoodDay !== today) {
    if (s.grindFood > 0) {
      events.push({ type: 'spoiled', message: 'The leftover grind food spoiled overnight.' });
    }
    s.grindFood = 0;
    s.grindFoodDay = today;
  }

  return { state: s, events };
}

// Give one food to one fish. Eating can make it grow, and a Large fish splits
// into two if there is room in the pond.
export function feed(state, fishId, now) {
  const s = clone(state);
  const fish = s.fish.find((f) => f.id === fishId);
  if (!fish) return fail(state, 'That fish is not in the pond anymore.');
  if (foodAvailable(s) <= 0) return fail(state, 'No food left. Solve a question to earn some!');

  // Grind food spoils at the end of the day, so use it first.
  if (s.grindFood > 0) s.grindFood -= 1;
  else s.food -= 1;

  fish.lastFed = now;
  fish.totalMeals += 1;
  let event = { type: 'fed', message: `${fish.name} ate happily.` };

  if (fish.stage < LARGE) {
    fish.meals += 1;
    if (fish.meals >= MEALS_TO_GROW[fish.stage]) {
      fish.stage += 1;
      fish.meals = 0;
      event = { type: 'grew', message: `${fish.name} grew into a ${STAGES[fish.stage]}!` };
      if (fish.stage === LARGE) fish.reachedLargeAt = now;
    }
  }

  if (fish.stage === LARGE && s.fish.length < MAX_FISH) {
    const child = makeFish(s, now, SPLIT_CHILD_STAGE);
    fish.stage = PARENT_STAGE_AFTER_SPLIT;
    fish.meals = 0;
    fish.generation += 1;
    fish.bornAt = now;
    fish.reachedLargeAt = null;
    s.fish.push(child);
    s.stats.splits += 1;
    event = {
      type: 'split',
      message: `${fish.name} split in two! Say hi to ${child.name}, a new ${STAGES[SPLIT_CHILD_STAGE].toLowerCase()}.`,
    };
  }

  return { state: s, event };
}

// Pond full + Large fish -> turn it into food (not committed to GitHub).
export function grind(state, fishId, now) {
  const s = clone(state);
  const fish = s.fish.find((f) => f.id === fishId);
  if (!fish) return fail(state, 'That fish is not in the pond anymore.');
  if (!canRetire(s, fish)) return fail(state, 'Only a Large fish in a full pond can be ground.');

  s.fish = s.fish.filter((f) => f.id !== fishId);
  s.grindFood += GRIND_FOOD;
  s.grindFoodDay = dayKey(now);
  s.stats.ground += 1;
  return {
    state: s,
    event: {
      type: 'ground',
      message: `${fish.name} was ground into ${GRIND_FOOD} food. It spoils at the end of today, and it is not committed to GitHub.`,
    },
  };
}

// Pond full + Large fish -> move it to the cold box as a pure achievement.
export function makeTrophy(state, fishId, now) {
  const s = clone(state);
  const fish = s.fish.find((f) => f.id === fishId);
  if (!fish) return fail(state, 'That fish is not in the pond anymore.');
  if (!canRetire(s, fish)) return fail(state, 'Only a Large fish in a full pond can become a trophy.');

  s.fish = s.fish.filter((f) => f.id !== fishId);
  s.trophies.push({
    id: fish.id,
    name: fish.name,
    varietyId: fish.varietyId,
    generation: fish.generation,
    totalMeals: fish.totalMeals,
    daysToGrow: Math.max(
      0,
      Math.round(((fish.reachedLargeAt ?? now) - fish.bornAt) / DAY_MS),
    ),
    retiredAt: now,
  });
  return {
    state: s,
    event: { type: 'trophy', message: `${fish.name} is now a trophy in your cold box.` },
  };
}

// If every fish is gone, start over with a fresh egg.
export function hatchEgg(state, now) {
  const s = clone(state);
  if (s.fish.length > 0) return fail(state, 'Your pond still has fish.');
  s.fish.push(makeFish(s, now, 0));
  return { state: s, event: { type: 'hatch', message: 'A new egg appeared in the pond.' } };
}
