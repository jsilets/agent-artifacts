import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const cli = fileURLToPath(new URL('../cli/agent-pages.mjs', import.meta.url));
const page = (content) => `<!doctype html><html lang="en"><meta charset="utf-8">
<title>Learning notes</title><link rel="stylesheet" href="explain.css"><body><main class="k-page">
<h1>Learning notes</h1><p class="k-stamp">learning · May 3, 2026</p>
<p class="k-lede">These notes explain a choice and its limits.</p>${content}</main></body></html>`;
const section = (content) => `<section class="k-claim"><h2>Trade-offs</h2>${content}</section>`;
function workspace(t) {
  const dir = mkdtempSync(join(tmpdir(), 'agent-pages-test-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}
function run(...args) { return spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' }); }
function check(t, html) {
  const file = join(workspace(t), 'page.html');
  writeFileSync(file, html);
  return run('check', file);
}

test('a prose document preserves uncertainty and dates without forced figures', (t) => {
  const result = check(t, page(section('<p>The service might fail. A retry may help. You should check the logs.</p>')));
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr.trim(), 'ok');
});

test('a section can contain a reference table and several supporting figures', (t) => {
  const result = check(t, page(section(`<table class="k-table"><tr><th>Case</th><th>Result</th></tr>
<tr><td>Offline</td><td>The saved copy remains available.</td></tr></table>
<figure><p>Observed requests</p><figcaption>The first run used the cache.</figcaption></figure>
<figure><p>Repeated requests</p><figcaption>The second run did too.</figcaption></figure>`)));
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr.trim(), 'ok');
});

test('word suggestions exclude quoted material and code but still review authored prose', (t) => {
  const quoted = '<blockquote><p>We leverage robust tools.</p></blockquote><p>The source says <q>utilize the tool</q>.</p><pre>utilize()</pre><p>Run <code>leverage()</code>.</p>';
  const result = check(t, page(section(quoted)));
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr.trim(), 'ok');
  const authored = check(t, page(section('<p>We utilize the tool.</p>')));
  assert.equal(authored.status, 0, authored.stderr);
  assert.match(authored.stderr, /utilize/);
});

test('invalid flow attributes and model expressions still fail', (t) => {
  const flow = check(t, page(section('<div class="k-flow"><script type="text/plain">a = Start [invalid-shape]</script></div>')));
  assert.equal(flow.status, 1, flow.stderr);
  assert.match(flow.stderr, /flow 1/);
  const model = check(t, page(section('<div class="k-model"><script type="text/plain" data-defs>answer = unknown + 1</script></div>')));
  assert.equal(model.status, 1, model.stderr);
  assert.match(model.stderr, /model 1/);
});

test('new templates fail until the author replaces their placeholders', (t) => {
  const dir = workspace(t);
  const created = run('new', 'lesson', '--title', 'Learning notes', '--dir', dir);
  assert.equal(created.status, 0, created.stderr);
  const file = created.stdout.trim();
  const unfinished = run('check', file);
  assert.equal(unfinished.status, 1, unfinished.stderr);
  assert.match(unfinished.stderr, /template text/);
  const completed = readFileSync(file, 'utf8')
    .replace('The answer or purpose of the page.', 'A cache saves a copy for later requests.')
    .replace('A useful takeaway or section heading.', 'What a cache stores')
    .replace('Replace this paragraph with the explanation.', 'The copy can become stale when its source changes.');
  writeFileSync(file, completed);
  const packed = run('pack', file, '--inline');
  assert.equal(packed.status, 0, packed.stderr);
  const output = readFileSync(file.replace(/\.html$/, '.packed.html'), 'utf8');
  assert.match(output, /data-host="inline"/);
  assert.doesNotMatch(output, /href="[^"]*explain\.css"/);
});

test('packing still rejects pages above the size limit', (t) => {
  const file = join(workspace(t), 'large.html');
  writeFileSync(file, page(section('<p>A complete explanation.</p>')) + `<!-- ${'x'.repeat(512 * 1024)} -->`);
  const result = run('pack', file);
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /512 KB/);
});
