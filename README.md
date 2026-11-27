# 🐟 SQL Fish

Practice SQL every day, feed your pixel koi, and make your GitHub contribution graph green **honestly**:
every correct answer is committed to your own repo.

## Run it

```bash
npm install
npm run dev      # open the URL it prints
npm test         # question generator + fish rules (17 tests)
npm run build    # production build into dist/
```

Node 18+ recommended.

## How the game works

| Rule | Where it lives |
|---|---|
| 5 tries per day. Every submitted answer costs 1 try. A correct answer = 1 food + a GitHub commit + the next question. A wrong answer keeps the same question. Typos (SQL errors) and **Run** are free. | `src/game/state.js` |
| Questions are **generated**, never hardcoded: a template + a random little database, seeded by `user + day + question number`. Same user/day = same question; another user or another day = a different one. | `src/game/templates.js`, `datasets.js`, `questions.js` |
| Answers are checked by **running** your query and the reference query on the same data. Any query that returns the same result passes (column names don't matter; row order only matters when the question asks for an order). | `src/game/compare.js`, `db.js` |
| Level 1-4 unlocks harder templates as your total correct answers grow (6 / 15 / 30). | `questions.js` |
| 5 growth stages: Egg → Baby → Medium → Kid → Large (1 / 2 / 3 / 4 meals). | `fish.js` |
| You choose which fish eats each food. A fish not fed for **3 days dies**. | `fish.js` |
| A fish reaching **Large** with room in the pond **splits**: it drops back to Baby and a new Egg appears. | `fish.js` |
| Pond cap = **6 fish**. At the cap a Large fish stays Large and you choose: **Grind** (2 grind food, *not* committed, spoils at the end of the day, frees a slot) or **Trophy** (goes to the cold box, no food). | `fish.js` |

All the numbers (cap, hunger time, meals per stage, grind food, what a split produces) are constants at the top of
`src/game/fish.js`.

### Add a new question type

Add one object to `TEMPLATES` in `src/game/templates.js`: `id`, `title`, `theme`, `difficulty`, `concepts`, and a
`build(rng, tables)` that returns `{ prompt, sql, ordered }`. `npm test` automatically checks that it runs and never
returns an empty result.

## Connect GitHub

Open **Settings** and paste a **fine-grained personal access token** with *Contents: Read and write* on your journal
repo (the app can create `sql-fish-journal` for you if the token also allows repository administration). Each solved
question becomes one commit like `sql-fish/2026-11-25/q1-students-by-city.sql` on the default branch.

For commits to count on your graph: the repo must be one you own, commits must land on the default branch, and your
GitHub account needs a verified email (commits made through the API with your own token use your account). If GitHub
is unreachable, answers are queued and retried.

## Art

`public/koi_sprites.png` – 5 stages, each 24×16, facing left, in one 120×16 row.
`public/pond_background.png` – 160×96. Replace either file with your own redesign keeping the same sizes (or change
the constants at the top of `src/components/Pond.jsx`).

## Known limits (prototype)

- **Everything is stored in your browser** (`localStorage`). Clearing site data resets your pond, and someone could edit
  their own save. That's fine for practice, but a public version needs accounts and a database.
- The GitHub token also lives in the browser. For a public release, switch to **GitHub OAuth** and make the commits
  from a small server. Only `src/game/github.js` needs to change.
- Question seeds are per user, so copying a friend's answer won't work, but nothing stops someone from searching the
  web. Real commits of your own solutions are the point.

## Project layout

```
src/
  game/        rng, datasets, templates, questions, db (sql.js), compare, fish rules, state, github
  components/  Pond (canvas), FishCard (roster + fish detail), Tiles (food, tries, GitHub, cold box), Challenge, ColdBox, Settings
  App.jsx      wires the game together
tests/         node --test
```
