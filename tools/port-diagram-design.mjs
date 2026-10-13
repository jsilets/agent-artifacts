#!/usr/bin/env node
// port-diagram-design.mjs: copies the diagram-design templates and references into skills/explain/diagrams.
//   node tools/port-diagram-design.mjs <diagram-design checkout>
// diagram-design is MIT, by Cathryn Lavery: https://github.com/cathrynlavery/diagram-design
//
// For each example-<name>.html in skills/diagram-design/assets (not the -dark, -full or -animated copies):
//   1. It keeps the top-level <svg> elements and drops the page around them (title, eyebrow, cards).
//   2. It keeps the CSS rules that style the SVG, scopes them to .k-diagram[data-tpl="<name>"],
//      and replaces each palette color with a kit token. explain.js maps the palette colors in attributes.
//   3. It replaces var(--x) in attributes with the value from the template's :root, because an SVG
//      presentation attribute cannot hold var().
// It writes diagrams/<name>.html (a figure to copy), diagrams/ref/*.md, the template table in diagrams/index.md
// (between the templates:start and templates:end markers), and examples/diagrams.html (all templates).
import { readFileSync, writeFileSync, readdirSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
createRequire(import.meta.url)(join(root, 'kit/explain.js'));
const { diagramColor } = globalThis.Explain;
const src = process.argv[2];
if (!src || !existsSync(join(src, 'skills/diagram-design/assets'))) { console.error('usage: node tools/port-diagram-design.mjs <diagram-design checkout>'); process.exit(2); }
const assets = join(src, 'skills/diagram-design/assets'), refs = join(src, 'skills/diagram-design/references');
const out = join(root, 'skills/explain/diagrams');

// Examples that show an import tool or depend on HTML chrome outside the SVG.
const SKIP = new Set(['import-drawio', 'import-excalidraw', 'import-mermaid', 'loop-terminal']);
// The reference for each template. Most names match a type-<name>.md file.
const REF = { 'beeswarm': 'scatter', 'bubble': 'scatter', 'bump': 'line', 'ridgeline': 'line', 'slopegraph': 'line', 'streamgraph': 'line', 'marimekko': 'treemap', 'datalake': 'high-level', 'high-level-vertical': 'high-level', 'sequence-oauth': 'sequence', 'quadrant-consultant': 'quadrant', 'state-lifecycle': 'state', 'tree-block-decomposition': 'tree' };
const refOf = (n) => REF[n] || n.replace(/^(axonometric-plan|exploded)-.*$/, '$1');

/** The top-level <svg>…</svg> blocks of an HTML string, nesting included. */
function topSvgs(html) {
  const found = [], re = /<\/?svg\b[^>]*>/g; let depth = 0, start = -1, m;
  while ((m = re.exec(html))) {
    if (m[0][1] !== '/') { if (depth++ === 0) start = m.index; }
    else if (--depth === 0) found.push(html.slice(start, m.index + m[0].length));
  }
  return found;
}

/** Removes @media, @keyframes and other at-rule blocks, braces included. */
function dropAtRules(css) {
  let outCss = '', i = 0;
  while (i < css.length) {
    const at = css.indexOf('@', i);
    if (at < 0) { outCss += css.slice(i); break; }
    outCss += css.slice(i, at);
    const semi = css.indexOf(';', at), brace = css.indexOf('{', at);
    if (brace < 0 || (semi >= 0 && semi < brace)) { i = semi + 1; continue; }
    let d = 0, j = brace;
    for (; j < css.length; j++) { if (css[j] === '{') d++; else if (css[j] === '}' && --d === 0) break; }
    i = j + 1;
  }
  return outCss;
}

function convert(name, html) {
  const styles = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n');
  const vars = {};
  [...styles.matchAll(/:root\s*\{([^}]*)\}/g)].forEach((m) => [...m[1].matchAll(/(--[\w-]+)\s*:\s*([^;]+)/g)].forEach((v) => { vars[v[1]] = v[2].trim(); }));
  const FONT = { '--sans': 'var(--sans)', '--mono': 'var(--mono)', '--serif': 'var(--sans)' };
  const resolve = (v, depth = 0) => v.replace(/var\((--[\w-]+)(?:\s*,\s*([^)]+))?\)/g, (x, k, fb) => FONT[k] || (vars[k] != null && depth < 5 ? resolve(vars[k], depth + 1) : fb || x));
  const colors = (v) => v.replace(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b|rgba?\([^)]*\)|\bwhite\b/g, (c) => diagramColor(c) || c);

  const body = html.match(/<body[^>]*>([\s\S]*)<\/body>/)[1];
  let svgs = topSvgs(body).map((svg) => svg
    .replace(/<svg\b([^>]*)>/, (x, a) => '<svg' + a.replace(/\s(?:width|height|style)="[^"]*"/g, '') + '>')
    .replace(/\s(fill|stroke|stop-color|flood-color|color)="(var\([^"]*\))"/g, (x, a, v) => ` ${a}="${resolve(v)}"`)
    .replace(/\sstyle="([^"]*)"/g, (x, v) => ` style="${colors(resolve(v))}"`));
  svgs = svgs.map((svg) => /\srole=/.test(svg.slice(0, svg.indexOf('>'))) ? svg : svg.replace('<svg', '<svg role="img"'));

  // CSS: keep the rules for classes that the SVG uses.
  const used = new Set(svgs.flatMap((svg) => [...svg.matchAll(/\sclass="([^"]+)"/g)].flatMap((m) => m[1].split(/\s+/))));
  const scope = `.k-diagram[data-tpl="${name}"]`;
  const rules = [];
  dropAtRules(styles.replace(/\/\*[\s\S]*?\*\//g, '')).replace(/([^{}]+)\{([^{}]*)\}/g, (x, sel, decl) => {
    const keep = sel.split(',').map((s) => s.trim()).filter((s) => {
      if (!s || s === ':root' || /^(?:svg|\*|html|body)$/.test(s)) return false;
      const cls = [...s.matchAll(/\.([\w-]+)/g)].map((m) => m[1]);
      return cls.length > 0 && cls.every((c) => used.has(c)) && !/^(?:body|main|h1|h2|p|html)\b/.test(s);
    });
    if (!keep.length) return '';
    const d = colors(resolve(decl.trim())).replace(/\s+/g, ' ');
    rules.push(`${keep.map((s) => `${scope} ${s.replace(/^svg\s+/, 'svg ')}`).join(', ')} { ${d} }`);
    return '';
  });
  return { svgs, css: rules.join('\n') };
}

// Short descriptions, from the diagram-design type guide.
const DESC = {
  'architecture': 'Components and connections in one system snapshot.',
  'architecture-delta': 'Structural change between a before and an after topology, with a ledger of changes.',
  'axonometric-plan': 'One floor or site seen from above at an angle.',
  'axonometric-plan-campus': 'An axonometric plan of a campus, with buildings by phase.',
  'axonometric-plan-coffee-shop': 'An axonometric plan of one room with furniture.',
  'axonometric-plan-warehouse': 'An axonometric plan of a warehouse floor.',
  'bar': 'A quantitative comparison across categories.',
  'beeswarm': 'One variable, one dot for each item.',
  'bubble': 'Three variables: x, y and the size of each bubble.',
  'bump': 'Rank movement across several snapshots.',
  'data-flow': 'Role-scoped data flow: who does what at each pipeline step.',
  'datalake': 'An end-to-end data stack on a container cluster, with icons.',
  'db-schema': 'Physical tables with SQL types, constraints, indexes and column foreign keys.',
  'dependency': 'What depends on what, with fan-in and cycles that a tree cannot show.',
  'deployment': 'Where software runs: zones, hosts, artifacts, replicas and ports.',
  'dp-integration': 'The integration topology of a data platform: sources, core and consumers.',
  'dp-security-matrix': 'Access permissions for each role and component.',
  'er': 'Entities, fields and relationships.',
  'exploded': 'The parts of one object pulled apart along one axis.',
  'exploded-ai-stack': 'An exploded view of a software stack.',
  'exploded-keyboard': 'An exploded teardown of a keyboard.',
  'exploded-phone': 'An exploded teardown of a phone.',
  'exploded-unboxing': 'An exploded unboxing, in assembly order.',
  'fishbone': 'The causes of one observed effect, grouped by category.',
  'flowchart': 'Decision logic with branches.',
  'gantt': 'Tasks and phases on a timeline.',
  'heatmap': 'Cross-tabulated data where the fill encodes the value of each cell.',
  'high-level': 'An end-to-end data stack on a container cluster.',
  'high-level-vertical': 'The high-level stack, top to bottom.',
  'it-state': 'A legacy IT landscape by phase or department: the current state.',
  'journey': 'What a person does across the stages of an experience, and how it feels.',
  'kanban': 'Work in progress by state, with limits and blocked items.',
  'layers': 'Stacked abstraction levels.',
  'line': 'Continuous trends over time.',
  'loop': 'A reinforcing cycle where the last step feeds the first.',
  'marimekko': 'Part of a whole in two dimensions: column width and segment height.',
  'medallion': 'Multi-tier data storage with quality levels and access policies.',
  'nested': 'Hierarchy through containment or scope.',
  'org-chart': 'Ownership, reporting, routing and escalation for people, agents or teams.',
  'polar': 'One quantitative series across cyclic categories.',
  'process': 'A multi-actor sequential process with data handoffs.',
  'pyramid': 'A ranked hierarchy or a conversion drop-off.',
  'quadrant': 'Two-axis positioning or prioritization.',
  'quadrant-consultant': 'A two-axis matrix with named quadrants, consultant style.',
  'radar': 'Several entities scored across 3 to 5 criteria.',
  'ridgeline': 'One distribution for each series.',
  'sankey': 'A quantity that splits and merges across stages. Band width is the amount.',
  'scatter': 'The correlation or distribution of two variables.',
  'sequence': 'Time-ordered messages between actors.',
  'sequence-oauth': 'A longer sequence: an OAuth exchange with token refresh.',
  'slopegraph': 'Change between exactly two states.',
  'state': 'States, transitions and guards.',
  'state-lifecycle': 'One subject through phases, waits, retries, cancellation and terminal outcomes.',
  'story-map': 'A narrative backbone sliced into releases, with the cut line.',
  'streamgraph': 'Volume over time for several series, stacked around a center line.',
  'swimlane': 'A cross-functional process with handoffs.',
  'timeline': 'Events positioned in time.',
  'tree': 'Parent and child relationships.',
  'tree-block-decomposition': 'A hierarchical, ID-addressable decomposition with inputs, outputs and constraints.',
  'treemap': 'Part of a whole where the relative sizes are the story.',
  'uml-class': 'Classes with operations, inheritance and composition.',
  'venn': 'Overlap between sets.',
  'wardley': 'A value chain against evolution.',
  'waterfall': 'A start total bridged to an end total by signed contributions.',
};

const figure = (name, conv, caption) => [
  `<figure class="k-diagram" data-tpl="${name}">`,
  conv.css ? `<style>\n${conv.css}\n</style>` : '',
  `<div class="k-art">\n${conv.svgs.join('\n')}\n</div>`,
  `<figcaption>${caption}</figcaption>`,
  `</figure>`,
].filter(Boolean).join('\n');

// Remove the files that an earlier run wrote. index.md is hand-written, so it stays.
if (existsSync(out)) readdirSync(out).filter((f) => f.endsWith('.html') || f === 'ref' || f.startsWith('LICENSE')).forEach((f) => rmSync(join(out, f), { recursive: true, force: true }));
mkdirSync(join(out, 'ref'), { recursive: true });
const names = readdirSync(assets).filter((f) => /^example-.*\.html$/.test(f) && !/-(dark|full|animated)\.html$/.test(f)).map((f) => f.slice(8, -5)).filter((n) => !SKIP.has(n)).sort();
const missing = names.filter((n) => !DESC[n]);
if (missing.length) { console.error('no description for: ' + missing.join(', ')); process.exit(1); }
const ported = {};
for (const name of names) {
  const conv = convert(name, readFileSync(join(assets, `example-${name}.html`), 'utf8'));
  if (!conv.svgs.length) { console.error(`${name}: no svg`); process.exit(1); }
  ported[name] = conv;
  const ref = `ref/type-${refOf(name)}.md`;
  if (!existsSync(join(refs, `type-${refOf(name)}.md`))) { console.error(`${name}: no reference ${ref}`); process.exit(1); }
  writeFileSync(join(out, `${name}.html`), `<!-- ${name}: ${DESC[name]}\n     Layout rules: ${ref}. Copy the figure into a .k-claim section, then change the text, the data and the geometry.\n     From diagram-design (MIT, Cathryn Lavery). See ../../../NOTICE.md. -->\n` + figure(name, conv, 'Replace this caption with what the reader should see in the diagram.') + '\n');
}

// References: the type guides and the files they link to. Links to files that Agent Pages does not copy become plain text.
const KEEP_REFS = readdirSync(refs).filter((f) => /^type-.*\.md$/.test(f) || ['primitives-core.md', 'layout-budget.md', 'semantic-patterns.md', 'primitive-annotation.md', 'primitive-icons.md', 'style-guide.md'].includes(f));
const kept = new Set(KEEP_REFS);
const HEAD = '<!-- From diagram-design (MIT, Cathryn Lavery). In Agent Pages, read ../index.md first: it says which parts of this file apply. -->\n\n';
for (const f of KEEP_REFS) {
  let md = readFileSync(join(refs, f), 'utf8');
  md = md.replace(/\[([^\]]+)\]\((?:references\/)?([a-z0-9-]+\.md)(#[^)]*)?\)/g, (x, text, file, hash) => kept.has(file) ? `[${text}](${file}${hash || ''})` : text)
    .replace(/\[([^\]]+)\]\((?:\.\.\/)?(?:assets\/)?(example-[a-z0-9-]+\.html)\)/g, (x, text, file) => { const n = file.slice(8, -5); return ported[n] ? `[${text}](../${n}.html)` : text; });
  writeFileSync(join(out, 'ref', f), HEAD + md);
}
writeFileSync(join(out, 'LICENSE-diagram-design'), readFileSync(join(src, 'LICENSE'), 'utf8'));

const index = join(out, 'index.md');
if (existsSync(index)) {
  const table = ['| Template | Shows | Layout rules |', '|---|---|---|', ...names.map((n) => `| [\`${n}\`](${n}.html) | ${DESC[n]} | [type-${refOf(n)}](ref/type-${refOf(n)}.md) |`)].join('\n');
  const md = readFileSync(index, 'utf8').replace(/<!-- templates:start -->[\s\S]*?<!-- templates:end -->/, `<!-- templates:start -->\n${table}\n<!-- templates:end -->`);
  writeFileSync(index, md);
}

// The gallery: every template on one page. The exploded keyboard is 190 KB, so the gallery leaves it out to stay under the publish limit.
const GALLERY_SKIP = new Set(['exploded-keyboard']);
const sections = names.filter((n) => !GALLERY_SKIP.has(n)).map((n) => `<section class="k-claim" id="${n}">\n<h2>${n}</h2>\n<p>${DESC[n]} Template: <code>diagrams/${n}.html</code>.</p>\n${figure(n, ported[n], DESC[n])}\n</section>`);
const page = readFileSync(join(root, 'kit/template.html'), 'utf8')
  .replace(/<!-- SNAPSHOT:[^>]*-->\n/, '')
  .replace(/\{\{TITLE\}\}/g, 'Diagram templates')
  .replace('{{REPO}} · {{DAY}}', 'agent-pages · diagram-design templates')
  .replace('The answer or purpose of the page.', `Agent Pages has ${names.length} diagram templates from diagram-design. This page shows ${sections.length} of them in the kit colors.`)
  .replace(/<section class="k-claim">[\s\S]*<\/section>/, sections.join('\n\n'))
  .replace(/href="explain\.css"/, 'href="../../../kit/explain.css"').replace(/src="explain\.js"/, 'src="../../../kit/explain.js"');
writeFileSync(join(root, 'skills/explain/examples/diagrams.html'), page);
console.log(`${names.length} templates, ${KEEP_REFS.length} references`);
console.log(names.join(' '));
