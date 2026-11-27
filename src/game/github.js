// Commits solved answers to the player's own GitHub repository.
//
// PROTOTYPE NOTE: this uses a personal access token pasted by the player and
// kept in this browser's localStorage. For a public release, replace it with
// GitHub OAuth and do the commit from a small server so tokens never sit in the
// browser. The rest of the game doesn't need to change - only this file.
//
// Why commits count toward the contribution graph: they must be on the
// repository's default branch, in a repo the player owns, and made with an
// email address linked to their GitHub account. Committing through the REST API
// with the player's own token satisfies all three.

const API = 'https://api.github.com';
const GH_KEY = 'sqlfish.github.v1';

function headers(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
  };
}

async function ghError(res, fallback) {
  let detail = '';
  try {
    const body = await res.json();
    detail = body && body.message ? `: ${body.message}` : '';
  } catch {
    /* no json body */
  }
  return new Error(`${fallback} (HTTP ${res.status}${detail})`);
}

function toBase64(text) {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

export function loadGithub() {
  try {
    return JSON.parse(localStorage.getItem(GH_KEY)) || null;
  } catch {
    return null;
  }
}

export function saveGithub(cfg) {
  try {
    if (cfg) localStorage.setItem(GH_KEY, JSON.stringify(cfg));
    else localStorage.removeItem(GH_KEY);
  } catch {
    /* ignore */
  }
}

export async function whoAmI(token) {
  const res = await fetch(`${API}/user`, { headers: headers(token) });
  if (!res.ok) throw await ghError(res, 'GitHub did not accept that token');
  const user = await res.json();
  return user.login;
}

// Makes sure the journal repo exists (creates it, public, if it doesn't).
export async function ensureRepo(token, owner, repo) {
  const res = await fetch(`${API}/repos/${owner}/${repo}`, { headers: headers(token) });
  if (res.ok) return false;
  if (res.status !== 404) throw await ghError(res, 'Could not check the repository');

  const create = await fetch(`${API}/user/repos`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({
      name: repo,
      description: 'My daily SQL practice, committed by Koillection.',
      auto_init: true, // creates the default branch so commits can land on it
      private: false,
    }),
  });
  if (!create.ok) throw await ghError(create, 'Could not create the repository');
  return true;
}

// Creates (or updates) one file = one commit on the default branch.
export async function putFile({ token, owner, repo, path, content, message }) {
  const url = `${API}/repos/${owner}/${repo}/contents/${path}`;
  const body = { message, content: toBase64(content) };

  let res = await fetch(url, { method: 'PUT', headers: headers(token), body: JSON.stringify(body) });

  if (res.status === 422 || res.status === 409) {
    // file already exists - fetch its sha and update it instead
    const existing = await fetch(url, { headers: headers(token) });
    if (existing.ok) {
      const info = await existing.json();
      res = await fetch(url, {
        method: 'PUT',
        headers: headers(token),
        body: JSON.stringify({ ...body, sha: info.sha }),
      });
    }
  }

  if (!res.ok) throw await ghError(res, 'Commit failed');
  const data = await res.json();
  return data.commit && data.commit.html_url;
}

// What a solved question looks like in the player's repo.
export function buildCommit({ question, sql, now }) {
  const date = question.day;
  const slug = question.templateId.replace(/_/g, '-');
  const path = `sql-fish/${date}/q${question.index}-${slug}.sql`;
  const header = [
    `-- Koillection | ${date} | question ${question.index} | level ${question.difficulty}`,
    `-- ${question.title}`,
    `-- ${question.prompt}`,
    `-- Concepts: ${question.concepts.join(', ')}`,
    `-- Solved: ${new Date(now).toISOString()}`,
    '',
  ].join('\n');
  return {
    path,
    content: `${header}${sql.trim().replace(/;?\s*$/, ';')}\n`,
    message: `Solved: ${question.title} (${date} q${question.index})`,
  };
}
