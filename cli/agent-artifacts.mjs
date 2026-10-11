#!/usr/bin/env node
// agent-artifacts: make, check and pack explain pages. Node 18+, no dependencies.
//
//   agent-artifacts new <slug> [--title "Title"] [--dir <out dir>]   write a page skeleton, print its path
//   agent-artifacts check <page.html>                                 lint; exit 1 on errors
//   agent-artifacts pack <page.html> [-o out.html] [--inline]          lint, then inline the kit into one file
//   agent-artifacts serve <page.html> [--port 8765]                    serve the page's folder on 127.0.0.1, print the URL
//
// --inline marks the page for an inline host (T3 Code html_render): it gets less padding.

import { readFileSync, writeFileSync, mkdirSync, existsSync, realpathSync, statSync } from 'node:fs';
import { dirname, join, resolve, basename } from 'node:path';
import { execFileSync } from 'node:child_process';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const KIT = join(dirname(fileURLToPath(import.meta.url)), '..', 'kit');
const SCRATCH = join(homedir(), '.agent', 'explain');
const MAX_BYTES = 512 * 1024; // html_render limit

const ctx = { globalThis: {} }; ctx.globalThis = ctx; vm.createContext(ctx);
vm.runInContext(readFileSync(join(KIT, 'explain.js'), 'utf8'), ctx);
const E = ctx.Explain;

const [cmd, ...rest] = process.argv.slice(2);
const flag = (n) => { const i = rest.indexOf(n); if (i < 0) return null; const v = rest[i + 1]; rest.splice(i, 2); return v; };
const has = (n) => { const i = rest.indexOf(n); if (i < 0) return false; rest.splice(i, 1); return true; };
const git = (args, cwd) => { try { return execFileSync('git', args, { cwd, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { return ''; } };

function read(p) { if (!p || !existsSync(p)) { console.error(`no such file: ${p}`); process.exit(2); } return readFileSync(p, 'utf8'); }

function cmdNew() {
  const title = flag('--title'), dir = flag('--dir');
  const slug = (rest[0] || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (!slug) { console.error('give a slug: agent-artifacts new engine-overview'); process.exit(2); }
  const top = git(['rev-parse', '--show-toplevel'], process.cwd());
  const repo = top ? basename(top) : basename(process.cwd());
  const sha = git(['rev-parse', '--short', 'HEAD'], process.cwd()) || 'no-git';
  const branch = git(['rev-parse', '--abbrev-ref', 'HEAD'], process.cwd()) || '-';
  const date = new Date().toISOString().slice(0, 10);
  const out = resolve(dir || join(SCRATCH, repo), `${date}-${slug}.html`);
  mkdirSync(dirname(out), { recursive: true });
  if (existsSync(out)) { console.error(`exists, not overwritten: ${out}`); process.exit(1); }
  const t = title || slug.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());
  const html = readFileSync(join(KIT, 'template.html'), 'utf8')
    .replace('href="explain.css"', `href="${join(KIT, 'explain.css')}"`).replace('src="explain.js"', `src="${join(KIT, 'explain.js')}"`)
    .replaceAll('{{TITLE}}', t).replaceAll('{{REPO}}', repo).replaceAll('{{SHA}}', sha).replaceAll('{{BRANCH}}', branch).replaceAll('{{DATE}}', date);
  writeFileSync(out, html);
  console.log(out);
}

function cmdPack() {
  const out = flag('-o'), inline = has('--inline'), src = rest[0];
  let html = read(src);
  if (report(lint(html, src))) { console.error('pack stopped: fix the errors first'); process.exit(1); }
  const css = readFileSync(join(KIT, 'explain.css'), 'utf8'), js = readFileSync(join(KIT, 'explain.js'), 'utf8');
  html = html.replace(/<link[^>]+href="[^"]*explain\.css"[^>]*>/, () => `<style>\n${css}\n</style>`)
    .replace(/<script[^>]+src="[^"]*explain\.js"[^>]*><\/script>/, '')
    .replace(/<\/body>/i, () => `<script>\n${js.replace(/<\/script/gi, '<\\/script')}\n</script>\n</body>`);
  if (inline) html = html.replace(/<html([^>]*)>/i, '<html$1 data-host="inline">');
  const bytes = Buffer.byteLength(html);
  if (bytes > MAX_BYTES) { console.error(`error: packed page is ${(bytes / 1024).toFixed(0)} KB; html_render takes 512 KB at most`); process.exit(1); }
  const dest = out || src.replace(/\.html$/, '') + '.packed.html';
  writeFileSync(dest, html);
  console.log(`${dest}  (${(bytes / 1024).toFixed(0)} KB)`);
}

// ─── Lint ───────────────────────────────────────────────────────────
// Errors break the page or its rules. Warnings are budgets: fix them or accept them knowingly.
const STE = { utilize: 'use', utilizes: 'uses', leverage: 'use', leverages: 'uses', facilitate: 'help', facilitates: 'helps', 'in order to': 'to', subsequently: 'then', 'prior to': 'before', additionally: 'also', furthermore: 'also', moreover: 'also', however: 'but', comprehensive: 'full', robust: 'strong', seamless: 'smooth', seamlessly: 'smoothly', numerous: 'many', commence: 'start', terminate: 'stop', demonstrate: 'show', demonstrates: 'shows', indicate: 'show', indicates: 'shows', ensure: 'make sure', ensures: 'makes sure', perform: 'do', performs: 'does', obtain: 'get', should: 'must or can', might: 'can', may: 'can', delve: 'look', crucial: 'important', essentially: '(cut it)', basically: '(cut it)', 'it is worth noting': '(cut it)', 'in conclusion': '(cut it)', 'in summary': '(cut it)', 'under the hood': 'inside', 'at the end of the day': '(cut it)' };

const strip = (s) => s.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<pre[\s\S]*?<\/pre>/gi, ' ').replace(/<code[\s\S]*?<\/code>/gi, ' X ').replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;|&#\d+;/g, ' ').replace(/\s+/g, ' ').trim();
const sentences = (t) => t.split(/(?<=[.!?])\s+(?=[A-Z0-9"“])/).map((s) => s.trim()).filter((s) => /\w/.test(s));
const nwords = (s) => s.split(/\s+/).filter((w) => /\w/.test(w)).length;

function lint(html, file) {
  const errs = [], warns = [];
  const err = (m) => errs.push(m), warn = (m) => warns.push(m);

  // Where the page lives
  try {
    const dir = dirname(realpathSync(file));
    const top = git(['rev-parse', '--show-toplevel'], dir);
    if (top && !dir.startsWith(join(homedir(), '.agent')) && !dir.startsWith(realpathSync(join(KIT, '..')))) warn(`the page is inside the repo ${top}. Explain pages go in ${SCRATCH} unless the user asked to keep one in the repo`);
  } catch {}

  // Shape
  if (!/<!--\s*SNAPSHOT:/.test(html)) err('missing the SNAPSHOT comment at the top. Start from "agent-artifacts new"');
  if (!/class="k-stamp"/.test(html)) err('missing the .k-stamp line under the h1');
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (!h1) err('missing the h1 title');
  const lede = html.match(/<p class="k-lede">([\s\S]*?)<\/p>/);
  if (!lede) err('missing the .k-lede: the answer in one sentence');
  else { const t = strip(lede[1]); if (/^The answer in one sentence\.?$/.test(t)) err('the .k-lede still holds the template text'); if (sentences(t).length > 2 || nwords(t) > 35) warn(`the lede has ${nwords(t)} words. Give the answer in one sentence`); }

  const claims = [...html.matchAll(/<section class="k-claim[^"]*"[^>]*>([\s\S]*?)<\/section>/g)].map((m) => m[1]);
  if (!claims.length) err('no <section class="k-claim">. The page is a list of claims, one figure each');
  if (claims.length > 7) warn(`${claims.length} claims. Keep 7 at most: merge, cut, or move depth into <details class="k-more">`);
  let prose = 0;
  claims.forEach((c, i) => {
    const no = `claim ${i + 1}`;
    const h2 = c.match(/<h2[^>]*>([\s\S]*?)<\/h2>/);
    if (!h2) { err(`${no}: no h2. The h2 is the claim`); return; }
    const t = strip(h2[1]), w = nwords(t);
    if (/^A takeaway sentence/.test(t)) err(`${no}: the h2 still holds the template text`);
    if (w <= 3) warn(`${no}: "${t}" names a topic. Write the takeaway as a sentence that can be true or false`);
    if (w > 16) warn(`${no}: the h2 has ${w} words. Keep a claim to about 12`);
    if (/^(?:two|three|four|five|six|seven|2|3|4|5|6|7)\s/i.test(t)) warn(`${no}: "${t}" starts with a count. Keep the count only if it is the finding; otherwise state what the items have in common`);
    if (/:\s/.test(t)) warn(`${no}: "${t}" has a colon. State the claim as one plain sentence`);
    if (/,\s*(?:and|but)\s+only\b|\bnot just\b|\brather than\b|,\s*not\s/i.test(t)) warn(`${no}: "${t}" adds a second clause or a contrast. Keep the one fact that the figure proves`);
    if (/;/.test(t) || (t.replace(/(\d),(\d)/g, '$1$2').match(/,/g) || []).length >= 2) warn(`${no}: "${t}" has several clauses. One heading states one fact`);
    const top = c.replace(/<details[\s\S]*?<\/details>/g, '');
    const figs = (top.match(/<figure[\s>]/g) || []).length;
    if (figs === 0) err(`${no} "${t.slice(0, 50)}": no <figure>. Each claim gets one exhibit`);
    if (figs > 1) warn(`${no} "${t.slice(0, 50)}": ${figs} figures. A second exhibit means a second claim`);
    const paras = [...top.replace(/<figure[\s\S]*?<\/figure>/g, '').matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)].map((m) => strip(m[1]));
    if (paras.length > 2) warn(`${no}: ${paras.length} paragraphs. Keep 2 at most; say the rest in the figure`);
    paras.forEach((p) => { prose += nwords(p); if (sentences(p).length > 3) warn(`${no}: a paragraph has ${sentences(p).length} sentences. Keep 3 at most`); });
  });
  if (claims.length && prose / claims.length > 70) warn(`prose outside figures averages ${Math.round(prose / claims.length)} words per claim. The figures must carry the page`);

  // Words
  const body = html.replace(/<!--[\s\S]*?-->/g, '').replace(/<head[\s\S]*?<\/head>/i, '');
  const text = strip(body);
  const proseEls = [...body.matchAll(/<(p|figcaption|li|h2|h3|td)[^>]*>([\s\S]*?)<\/\1>/g)].map((m) => strip(m[2]));
  proseEls.flatMap(sentences).forEach((s) => { const w = nwords(s); if (w > 28) warn(`a sentence has ${w} words: "${s.slice(0, 70)}…"`); });
  if (/—/.test(text)) warn('the prose has an em dash. Write two sentences instead');
  const low = ' ' + text.toLowerCase() + ' ';
  const found = Object.keys(STE).filter((k) => new RegExp(`[^a-z]${k}[^a-z]`).test(low));
  if (found.length) warn('words to replace: ' + found.map((k) => `"${k}" → ${STE[k]}`).join(', '));
  if (/(?:→|->)[^<]{1,40}(?:→|->)/.test(text)) warn('the text has a chain of arrows. That is a flow: draw it with .k-flow');

  // Look
  if (/style="[^"]*(?:color|background|font|border)/i.test(body)) warn('an inline style sets a color, font or border. Use the c-* classes and the kit components');
  if (/<style[\s>]/i.test(body)) warn('the page has its own <style> block. Use the kit classes; add CSS only for a figure the kit cannot draw');
  [...body.matchAll(/<table[\s\S]*?<\/table>/g)].forEach((m, i) => {
    const cols = Math.max(0, ...[...m[0].matchAll(/<tr[\s\S]*?<\/tr>/g)].map((r) => (r[0].match(/<t[dh][\s>]/g) || []).length));
    const rows = (m[0].match(/<tr[\s>]/g) || []).length;
    if (cols > 5) warn(`table ${i + 1} has ${cols} columns. Cut columns, or split it`);
    if (rows > 16) warn(`table ${i + 1} has ${rows} rows. Group the rows, or put the tail in <details class="k-more">`);
  });

  // Flows
  [...html.matchAll(/class="k-flow"[^>]*>\s*<script type="text\/plain">([\s\S]*?)<\/script>/g)].forEach((m, i) => {
    const f = E.parseFlow(E.dedent(m[1]));
    f.errors.forEach((e) => err(`flow ${i + 1}: ${e}`));
    const n = Object.keys(f.nodes).length;
    if (n > 12) warn(`flow ${i + 1} has ${n} nodes. Keep 12 at most: split it, or group parts`);
    if (f.edges.length && f.edges.filter((e) => !e.label).length > f.edges.length / 2) warn(`flow ${i + 1}: most arrows have no label. Label each arrow with a verb: "writes", "polls every 15 min"`);
    if (!f.errors.length && n) { const L = E.layoutFlow(f); if (L.W > 1100) warn(`flow ${i + 1} is ${Math.round(L.W)}px wide and will shrink a lot. Use dir TB, a grid, or shorter labels`); }
  });

  // Models
  [...html.matchAll(/<div class="k-model"[\s\S]*?<script type="text\/plain" data-defs>([\s\S]*?)<\/script>/g)].forEach((m, i) => {
    const block = m[0];
    const vars = {};
    [...block.matchAll(/<input[^>]*data-var="(\w+)"[^>]*>/g)].forEach((x) => { const v = x[0].match(/value="([^"]+)"/); if (!v) err(`model ${i + 1}: input "${x[1]}" has no value`); vars[x[1]] = +(v ? v[1] : 0); });
    try {
      const all = E.evalDefs(m[1], vars);
      [...block.matchAll(/data-(?:out|bar)="([^"]+)"/g)].forEach((x) => { try { const v = E.evalExpr(x[1], all); if (!Number.isFinite(v)) warn(`model ${i + 1}: "${x[1]}" is not a finite number at the default inputs`); } catch (e) { err(`model ${i + 1}: ${e.message}`); } });
    } catch (e) { err(`model ${i + 1}: ${e.message}`); }
  });

  return { errs, warns };
}

function report({ errs, warns }) {
  errs.forEach((m) => console.error('error: ' + m));
  warns.forEach((m) => console.error('warn:  ' + m));
  if (!errs.length && !warns.length) console.error('ok');
  return errs.length > 0;
}

async function cmdServe() {
  const port = +(flag('--port') || 8765), file = resolve(rest[0] || ''), root = dirname(file);
  read(file);
  const { createServer } = await import('node:http');
  createServer((req, res) => {
    const p = resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (!p.startsWith(root) || !existsSync(p) || !statSync(p).isFile()) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'content-type': p.endsWith('.html') ? 'text/html; charset=utf-8' : p.endsWith('.css') ? 'text/css' : p.endsWith('.js') ? 'text/javascript' : 'application/octet-stream' });
    res.end(readFileSync(p));
  }).listen(port, '127.0.0.1', () => console.log(`http://127.0.0.1:${port}/${basename(file)}`));
}

if (cmd === 'new') cmdNew();
else if (cmd === 'check') process.exit(report(lint(read(rest[0]), rest[0])) ? 1 : 0);
else if (cmd === 'pack') cmdPack();
else if (cmd === 'serve') cmdServe();
else { console.error('usage: agent-artifacts new <slug> [--title T] [--dir D] | check <page> | pack <page> [-o out] [--inline] | serve <page> [--port N]'); process.exit(2); }
