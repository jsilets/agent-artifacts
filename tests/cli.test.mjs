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

// The kit runtime: the flow parser, the layout, and the palette map for diagram templates.
const kit = fileURLToPath(new URL('../kit/explain.js', import.meta.url));
await import(kit);
const E = globalThis.Explain;

test('flows read tags, zones and a legend', () => {
  const m = E.parseFlow('dir LR\nlegend\na = Edge / worker.ts [teal, tag:edge]\nb = Store [db, tag:kv]\nzone "Real time": a b\ngroup "Deploy": b\na => b : reads');
  assert.deepEqual(m.errors, []);
  assert.equal(m.legend, true);
  assert.equal(m.nodes.a.tag, 'EDGE');
  assert.deepEqual(m.groups.map((g) => [g.label, g.zone]), [['Real time', true], ['Deploy', false]]);
  assert.match(E.parseFlow('a = A [tag:waytoolongforatag]').errors[0], /tag:name/);
});

test('a group label moves to a corner that no arrow crosses', () => {
  // The arrow from d enters i from the top, through the top-left corner of the zone around i.
  const m = E.parseFlow('dir LR\n| d | . |\n| . | . |\n| i | o |\nd = Detect\ni = Investigate\no = Outcome\nd --> i : unclear\ni -> o\nzone "Look-back · days to months": i');
  const L = E.layoutFlow(m), g = L.groups[0];
  const crossed = (x0, y0, x1, y1) => L.routes.flatMap((r) => r.segs).some(([ax, ay, bx, by]) => Math.max(ax, bx) >= x0 && Math.min(ax, bx) <= x1 && Math.max(ay, by) >= y0 && Math.min(ay, by) <= y1);
  const x0 = g.anchor === 'start' ? g.lx - 3 : g.lx - g.lw, x1 = g.anchor === 'start' ? g.lx + g.lw : g.lx + 3;
  assert.equal(g.clash, false);
  assert.equal(crossed(x0, g.ly, x1, g.ly + g.lh), false);
});

test('the diagram palette maps any alpha and leaves other colors alone', () => {
  assert.equal(E.diagramColor('#2d3142'), 'var(--d-ink)');
  assert.equal(E.diagramColor('rgba(191,69,32,.08)'), 'color-mix(in srgb, var(--d-accent) 8%, transparent)');
  assert.equal(E.diagramColor('white'), 'var(--d-node)');
  assert.equal(E.diagramColor('#7c8f6f'), null);
  assert.equal(E.diagramColor('none'), null);
});

test('a diagram template fails check until its caption is replaced', (t) => {
  const tpl = readFileSync(fileURLToPath(new URL('../skills/explain/diagrams/sequence.html', import.meta.url)), 'utf8');
  const raw = check(t, page(section(tpl)));
  assert.equal(raw.status, 1, raw.stderr);
  assert.match(raw.stderr, /diagram 1: the figcaption still holds the template text/);
  const done = check(t, page(section(tpl.replace(/<figcaption>[^<]*<\/figcaption>/, '<figcaption>The edge asks the origin once.</figcaption>'))));
  assert.equal(done.status, 0, done.stderr);
  assert.doesNotMatch(done.stderr, /own <style>|inline style/);
});

test('flows warn when only some nodes have a tag', (t) => {
  const result = check(t, page(section('<div class="k-flow"><script type="text/plain">a = A [tag:api]\nb = B\na -> b : calls</script></div>')));
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stderr, /1 of 2 nodes have a tag/);
});
