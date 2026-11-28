import { dayKey } from './time.js';
import { levelFor } from './questions.js';
import { ensureKoiScales, ensureKoiVarieties, makeFish } from './fish.js';

export const TRIES_PER_DAY = 5;
const STATE_KEY = 'sqlfish.state.v1';

function randomId() {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return 'u_' + Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function createInitialState(now = Date.now()) {
  const state = {
    version: 1,
    userId: randomId(), // swapped for the GitHub login once connected
    food: 0,
    grindFood: 0,
    grindFoodDay: dayKey(now),
    fish: [],
    trophies: [],
    graveyard: [],
    pendingCommits: [], // correct answers that still need to reach GitHub
    totalCorrect: 0,
    stats: { splits: 0, ground: 0 },
    nextFishId: 1,
    daily: null,
  };
  state.fish.push(makeFish(state, now, 0));
  return ensureDay(state, now);
}

// Starts a fresh day: 5 tries, back to question #1.
export function ensureDay(state, now = Date.now()) {
  const today = dayKey(now);
  if (state.daily && state.daily.day === today) return state;
  return {
    ...state,
    daily: {
      day: today,
      used: 0,
      index: 1,
      level: levelFor(state.totalCorrect),
      solved: 0,
    },
  };
}

export function triesLeft(state) {
  return Math.max(0, TRIES_PER_DAY - state.daily.used);
}

// Every submitted answer costs a try. A correct answer earns 1 food and moves
// on to the next question; a wrong one keeps the same question.
export function recordAttempt(state, correct) {
  if (triesLeft(state) <= 0) return state;
  const s = structuredClone(state);
  s.daily.used += 1;
  if (correct) {
    s.food += 1;
    s.totalCorrect += 1;
    s.daily.solved += 1;
    s.daily.index += 1;
    s.daily.level = levelFor(s.totalCorrect);
  }
  return s;
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.version === 1) return ensureDay(ensureKoiScales(ensureKoiVarieties(parsed)));
    }
  } catch {
    /* fall through to a fresh game */
  }
  return createInitialState();
}

export function saveState(state) {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch {
    /* storage full or blocked - the game still works for this session */
  }
}

export function resetState() {
  try {
    localStorage.removeItem(STATE_KEY);
  } catch {
    /* ignore */
  }
  return createInitialState();
}
