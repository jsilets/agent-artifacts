// The host's own HTML: the library and the viewer. Pages never run in these documents.
// A page runs only inside the sandboxed iframe, from the /raw or /s/<token>/raw route.

export const esc = (s: string | number | null | undefined) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** JSON for a <script type="application/json"> block. */
const data = (v: unknown) => JSON.stringify(v).replace(/</g, '\\u003c');

const day = (iso: string) => iso.slice(0, 10);

const HOST_CSS = `
html, body { height: 100%; margin: 0; background: var(--bg); color: var(--p); font-family: var(--sans); }
a { color: var(--link); text-decoration: none; }
a:hover { text-decoration: underline; }
button, select, input { font: 500 13px var(--sans); color: var(--p); background: var(--bg); border: 0.5px solid var(--b2); border-radius: var(--r-sm); padding: 5px 10px; }
button { cursor: pointer; }
button:hover { background: var(--bg2); }
.h-bar { display: flex; align-items: center; gap: 12px; height: 48px; padding: 0 16px; border-bottom: 0.5px solid var(--b); box-sizing: border-box; }
.h-bar .h-title { font-weight: 600; font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.h-bar .k-stamp { margin: 0; white-space: nowrap; }
.h-grow { flex: 1; min-width: 0; display: flex; align-items: baseline; gap: 12px; overflow: hidden; }
.h-frame { display: block; width: 100%; height: calc(100% - 48px); border: 0; }
.h-panel { position: absolute; right: 16px; top: 52px; width: 420px; max-width: calc(100vw - 32px); background: var(--bg); border: 0.5px solid var(--b2); border-radius: var(--r-md); padding: 12px; box-shadow: 0 8px 24px rgba(0,0,0,.12); }
.h-panel[hidden] { display: none; }
.h-panel h3 { margin: 0 0 8px; font-size: 14px; }
.h-panel ul { list-style: none; margin: 8px 0 0; padding: 0; }
.h-panel li { display: flex; gap: 8px; align-items: center; padding: 6px 0; border-top: 0.5px solid var(--b); font-size: 13px; }
.h-panel li code { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font: 12px var(--mono); }
.h-panel .h-danger { margin-top: 12px; color: var(--ink); }
.h-lib { max-width: 760px; margin: 0 auto; padding: 32px 24px 56px; }
.h-lib h1 { font-size: 24px; margin: 0 0 16px; }
.h-lib input { width: 100%; box-sizing: border-box; padding: 8px 12px; font-size: 14px; }
.h-lib h2 { font: 500 12px var(--mono); color: var(--s); margin: 28px 0 6px; text-transform: none; }
.h-lib ul { list-style: none; margin: 0; padding: 0; }
.h-lib li { display: flex; gap: 12px; align-items: baseline; padding: 8px 0; border-top: 0.5px solid var(--b); }
.h-lib li a { flex: 1; font-weight: 500; }
.h-lib li span { font: 12px var(--mono); color: var(--t); white-space: nowrap; }
.h-empty { color: var(--s); margin-top: 24px; }
`;

function shell(title: string, nonce: string, body: string, script = '', cssPath = '/_/explain.css') {
  return `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${esc(title)}</title>
<link rel="stylesheet" href="${cssPath}">
<script nonce="${nonce}">try { const t = localStorage.getItem('theme'); if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t; } catch {}</script>
<style>${HOST_CSS}</style>
<body>
${body}
${script ? `<script nonce="${nonce}">${script}</script>` : ''}
</body>
</html>`;
}

export interface PageRow {
  slug: string;
  title: string;
  repo: string | null;
  latest: number;
  updated_at: string;
}

export function libraryHtml(pages: PageRow[], nonce: string) {
  const groups = new Map<string, PageRow[]>();
  for (const p of pages) {
    const g = p.repo || p.slug.split('/')[0];
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(p);
  }
  const list = [...groups]
    .map(
      ([g, rows]) => `<section data-group><h2>${esc(g)}</h2><ul>${rows
        .map(
          (p) =>
            `<li data-q="${esc(`${p.title} ${p.slug}`.toLowerCase())}"><a href="/p/${esc(p.slug)}">${esc(p.title)}</a><span>v${p.latest}</span><span>${esc(day(p.updated_at))}</span></li>`,
        )
        .join('')}</ul></section>`,
    )
    .join('');
  const body = `<main class="h-lib">
<h1>Artifacts</h1>
<input id="q" type="search" placeholder="Filter by title" autocomplete="off" autofocus>
${list || '<p class="h-empty">No pages yet. Publish one with <code>agent-artifacts publish &lt;page&gt;</code>.</p>'}
</main>`;
  const script = `
const q = document.getElementById('q');
q.addEventListener('input', () => {
  const v = q.value.trim().toLowerCase();
  document.querySelectorAll('[data-group]').forEach((s) => {
    let any = false;
    s.querySelectorAll('li').forEach((li) => { const on = !v || li.dataset.q.includes(v); li.hidden = !on; any ||= on; });
    s.hidden = !any;
  });
});`;
  return shell('Artifacts', nonce, body, script);
}

export interface VersionRow {
  version: number;
  sha: string | null;
  created_at: string;
}

export interface ViewerInput {
  slug: string;
  title: string;
  repo: string | null;
  version: VersionRow;
  versions: VersionRow[];
  latest: number;
  /** True when the URL names no version, so it follows the latest one. */
  followsLatest: boolean;
}

/** Cycles the theme: auto (follow the OS), light, dark. The frame reloads with ?theme= so the page draws it. */
const THEME_SCRIPT = `
const frame = document.querySelector('iframe');
const btn = document.getElementById('theme');
const NAMES = { auto: 'Theme: auto', light: 'Theme: light', dark: 'Theme: dark' };
let theme = 'auto';
try { theme = localStorage.getItem('theme') || 'auto'; } catch {}
function apply() {
  if (theme === 'auto') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = theme;
  btn.textContent = NAMES[theme] || NAMES.auto;
  frame.src = frame.dataset.src + (theme === 'auto' ? '' : '?theme=' + theme);
}
btn.addEventListener('click', () => {
  theme = { auto: 'light', light: 'dark', dark: 'auto' }[theme] || 'auto';
  try { if (theme === 'auto') localStorage.removeItem('theme'); else localStorage.setItem('theme', theme); } catch {}
  apply();
});
apply();`;

const SANDBOX = 'allow-scripts allow-popups allow-popups-to-escape-sandbox';

function stamp(repo: string | null, v: VersionRow) {
  return [repo, v.sha, `v${v.version}`, day(v.created_at)].filter(Boolean).map(esc).join(' · ');
}

export function viewerHtml(input: ViewerInput, nonce: string) {
  const { slug, title, repo, version, versions, latest } = input;
  const options = versions
    .map((v) => `<option value="${v.version}"${v.version === version.version ? ' selected' : ''}>v${v.version} · ${esc(day(v.created_at))}${v.version === latest ? ' · latest' : ''}</option>`)
    .join('');
  const body = `<header class="h-bar">
  <a href="/" title="All pages">Artifacts</a>
  <div class="h-grow"><span class="h-title">${esc(title)}</span><p class="k-stamp">${stamp(repo, version)}</p></div>
  <select id="ver" aria-label="Version">${options}</select>
  <button id="theme" title="Follow the OS, or force light or dark">Theme: auto</button>
  <button id="copy">Copy link</button>
  <button id="share" aria-expanded="false">Share</button>
</header>
<div class="h-panel" id="panel" hidden>
  <h3>Share links</h3>
  <p class="k-stamp">Anyone with a link can read the page. No login.</p>
  <button id="mk-latest">New link to the latest version</button>
  <button id="mk-this">New link to v${version.version}</button>
  <ul id="shares"></ul>
  <button class="h-danger c-red" id="del">Delete this page and all versions</button>
</div>
<iframe class="h-frame" title="${esc(title)}" sandbox="${SANDBOX}" data-src="/raw/${esc(slug)}/${version.version}"></iframe>
<script type="application/json" id="data">${data({ slug, version: version.version, followsLatest: input.followsLatest })}</script>`;
  const script = THEME_SCRIPT + `
const D = JSON.parse(document.getElementById('data').textContent);
const $ = (id) => document.getElementById(id);
const api = (path, init = {}) => fetch(path, { ...init, headers: { 'content-type': 'application/json', ...(init.headers || {}) } }).then(async (r) => { if (!r.ok) throw new Error(await r.text()); return r.status === 204 ? null : r.json(); });
const copy = (text, btn) => navigator.clipboard.writeText(text).then(() => { const t = btn.textContent; btn.textContent = 'Copied'; setTimeout(() => (btn.textContent = t), 1200); });
$('ver').addEventListener('change', (e) => { location.href = '/p/' + D.slug + '/v/' + e.target.value; });
$('copy').addEventListener('click', (e) => copy(location.origin + '/p/' + D.slug + (D.followsLatest ? '' : '/v/' + D.version), e.target));
async function load() {
  const list = await api('/api/pages/' + D.slug + '/shares');
  const ul = $('shares');
  ul.replaceChildren();
  for (const s of list) {
    const li = document.createElement('li');
    const code = document.createElement('code'); code.textContent = s.url;
    const what = document.createElement('span'); what.className = 'k-stamp'; what.textContent = s.version ? 'v' + s.version : 'latest';
    const c = document.createElement('button'); c.textContent = 'Copy'; c.onclick = () => copy(s.url, c);
    const r = document.createElement('button'); r.textContent = 'Revoke';
    r.onclick = async () => { if (confirm('Revoke this link? It stops working at once.')) { await api('/api/shares/' + s.token, { method: 'DELETE' }); load(); } };
    li.append(what, code, c, r);
    ul.append(li);
  }
}
$('share').addEventListener('click', () => { const p = $('panel'); p.hidden = !p.hidden; $('share').setAttribute('aria-expanded', String(!p.hidden)); if (!p.hidden) load(); });
const make = (version) => api('/api/pages/' + D.slug + '/shares', { method: 'POST', body: JSON.stringify({ version }) }).then((s) => navigator.clipboard.writeText(s.url).catch(() => {})).then(load);
$('mk-latest').addEventListener('click', () => make('latest'));
$('mk-this').addEventListener('click', () => make(D.version));
$('del').addEventListener('click', async () => { if (confirm('Delete ' + D.slug + ', every version and every share link?')) { await api('/api/pages/' + D.slug, { method: 'DELETE' }); location.href = '/'; } });`;
  return shell(title, nonce, body, script);
}

export function sharedHtml(input: { token: string; title: string; repo: string | null; version: VersionRow }, nonce: string) {
  const body = `<header class="h-bar">
  <div class="h-grow"><span class="h-title">${esc(input.title)}</span><p class="k-stamp">${stamp(input.repo, input.version)}</p></div>
  <button id="theme" title="Follow the OS, or force light or dark">Theme: auto</button>
</header>
<iframe class="h-frame" title="${esc(input.title)}" sandbox="${SANDBOX}" data-src="/s/${esc(input.token)}/raw"></iframe>`;
  return shell(input.title, nonce, body, THEME_SCRIPT, '/s/_/explain.css');
}

export function messageHtml(title: string, text: string, nonce: string, cssPath?: string) {
  return shell(title, nonce, `<main class="h-lib"><h1>${esc(title)}</h1><p class="h-empty">${esc(text)}</p></main>`, "", cssPath);
}
