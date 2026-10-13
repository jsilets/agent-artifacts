# Exhibits

The markup for kit components. `examples/gallery.html` shows them on one page. `diagrams/` holds 64 diagram templates, and `examples/diagrams.html` shows them. Wrap a self-contained exhibit in `<figure>` with a useful `<figcaption>`. Prose, lists, and reference tables can stand outside figures. Select components by the reader's task, not by item counts.

Use components to expose relationships and make comparisons easy to scan. Keep diagrams that save the reader from reconstructing connections across paragraphs. A supporting value often belongs in an existing label, caption, cell, or sentence. The gallery demonstrates available components; it is not a checklist for each page.

Color ramps: `c-gray c-purple c-teal c-coral c-pink c-blue c-green c-amber c-red`. Put a ramp class on a node, card, layer, chip, stat, bar or callout. Dark mode is automatic.

## Page skeleton

```html
<header>
  <h1>How the engine moves data</h1>
  <p class="k-stamp">repo · Oct 10, 2026</p> <!-- "new" fills it in -->
  <p class="k-lede">The answer or purpose of the page.</p>
</header>
<section class="k-claim">
  <h2>A useful takeaway or section heading.</h2>
  <p>The explanation can stand alone or introduce supporting exhibits.</p>
  <!-- Add figures only when they help the reader understand this section. -->
  <details class="k-more"><summary>Optional depth</summary> … </details>
</section>
```

## .k-flow: how data or control moves

The runtime lays out and draws the diagram. You write a text spec. You never compute coordinates.

```html
<div class="k-flow"><script type="text/plain">
  dir LR                                  // LR = left to right; TB (default) = top to bottom
  legend                                  // a legend row for the marks and arrows that the flow uses
  src = State site / scraped hourly [teal, tag:ext] // id = Label / subtitle [shape, ramp, tag:name]
  col = Collector / collector.ts [purple, tag:job]
  db  = Postgres / bills, votes [db, purple, tag:store]
  q   = Media queue [amber]
  - old = Old cron [gray]                 // marks: + new, - gone, ~ changed, ! focal (accent)
    Runs at 02:00 only.                   // an indented line is detail, shown on hover
  src => col : polls every 15 min         // -> solid · --> dashed (sometimes) · => main path (accent)
  col -> db : upserts                     // <-> two-way · label after the colon: action or condition
  col --> q : on new video
  zone "Ingest · every 15 min": src col   // a filled band with a caps label
  group "Storage": db                     // a dashed box with a caps label
</script></div>
```

- Shapes: `box` (default) `pill` `db` `diamond` `circle` `note` `hex` `actor`.
- A `tag:name` puts a small caps type tag on the node, such as `ext`, `api` or `store`. Use 12 characters at most. Tag every node or none.
- Use `=>` for the one path the reader should follow, and `!` for 1 or 2 focal nodes. Both take the accent color, so keep them rare.
- Use `zone` for a stage or a time scale, such as "Real time · seconds". Use `group` for a boundary, such as a deploy unit. The runtime puts each label in a corner that no arrow crosses.
- Add `legend` when the flow mixes solid, dashed and main-path arrows or has a focal node.
- Add `data-paper="dots"` to the `.k-flow` element for a dotted background. The default has none.
- To place nodes yourself, use grid rows. Every node then needs a cell; `.` is an empty cell.
  ```
  | src | col | db |
  | .   | q   | .  |
  ```
- If arrow labels collide or sit far from their arrows, place the nodes with grid rows. A grid almost always fixes it.
- Above 12 nodes, the lint suggests splitting or grouping the flow. Treat this as a readability check, not a fixed limit.
- Label arrows when the action or condition would otherwise be unclear. The lint warns when most arrows have no label.
- Aim for about 18 characters for a label line and 24 for a subtitle; the layout wraps longer text.

## .k-layers: parts and owners

```html
<div class="k-layers">
  <div class="k-layer c-teal"><b>Edge<small>reads only</small></b><div><span class="k-chip">worker.ts</span><span class="k-chip">KV</span></div></div>
  <div class="k-layer c-purple"><b>API<small>reads and writes</small></b><div><span class="k-chip">api/links.ts</span></div></div>
</div>
```

Order the layers from the user down to the storage.

## .k-steps: stage by stage

```html
<div class="k-steps">
  <div class="k-step"><h3>1 · The API writes the row</h3> <!-- optional figure --> <p>One or two sentences.</p></div>
  <div class="k-step"><h3>2 · …</h3><p>…</p></div>
</div>
```

The runtime adds Back and Next buttons, the arrow keys and a "1 / 3" counter. A step can hold a small `.k-flow` that shows that stage.

## .k-grid: cases with matching structure

```html
<div class="k-grid">
  <div class="k-card c-green"><span class="k-chip c-green">redirects work</span><h3>Postgres is down</h3><p>Cached links still redirect.</p></div>
  <div class="k-card c-red"><span class="k-chip c-red">slow</span><h3>KV is down</h3><p>Every click goes to Postgres.</p></div>
</div>
```

Give each card the same parts in the same order. A card without a ramp class is neutral.

## .k-table: values or attributes to compare

```html
<div class="k-scroll"><table class="k-table">
  <tr><th>Source</th><th>Format</th><th class="num">Rows</th><th>Status</th></tr>
  <tr><td>Bill status</td><td>XML</td><td class="num">12,400</td><td><span class="k-chip c-green">live</span></td></tr>
</table></div>
```

Use a table even for a small comparison when matching columns help the reader. Keep cells concise; short sentences are valid. Right-align numbers with `class="num"`. The lint flags more than 5 columns or 16 rows for a layout review, not automatic removal.

## .k-scale: a score for each item

```html
<div class="k-scale">
  <b>Advances through the next gate</b><span class="k-dots c-teal" data-score="4/5">4/5</span><span>Committee calendars post 7 days ahead.</span>
  <b>Who defects on a vote</b><span class="k-dots c-teal" data-score="1/5">1/5</span><span>Too few contested votes to learn from.</span>
</div>
```

Three cells for each row: the item, the score and one reason. Define the scoring criteria and the source of each score. Use prose when a numeric score would imply unsupported precision.

## .k-stats and .k-bars: numbers

```html
<div class="k-stats">
  <div class="k-stat c-teal"><output>94%</output><span>cache hit rate</span></div>
</div>
<div class="k-bars">
  <b>Hits</b><span class="c-teal" style="--v:94"></span><output>940</output>
  <b>Misses</b><span class="c-purple" style="--v:6"></span><output>60</output>
</div>
```

`--v` is the bar length from 0 to 100. Use the same scale for comparable bars and show units. A stat tile emphasizes a value; bars show comparisons. A number can also stay in prose or a table.

## .k-model: inputs the reader moves

```html
<div class="k-model">
  <div class="k-in">
    <label><span>Entry multiple <output data-show="entry" data-fmt="x1"></output></span>
      <input type="range" data-var="entry" min="6" max="14" step="0.5" value="10"></label>
    <label><span>Debt share <output data-show="lev" data-fmt="%0"></output></span>
      <input type="range" data-var="lev" min="0.3" max="0.8" step="0.05" value="0.6"></label>
  </div>
  <div class="k-out">
    <div class="k-stat c-teal"><output data-out="moic" data-fmt="x2"></output><span>money multiple</span></div>
    <div class="k-bars">
      <b>Debt</b><span class="c-coral" data-bar="lev*100"></span><output data-out="debt" data-fmt="$0" data-unit="M"></output>
    </div>
  </div>
  <script type="text/plain" data-defs>
    ebitda = 20
    ev = ebitda * entry
    debt = ev * lev
    equity = ev - debt
    moic = (ebitda * 1.5 * entry - debt * 0.5) / equity
  </script>
</div>
```

- `data-defs` holds `name = expression` lines, in order. Expressions use numbers, names, `+ - * / ^`, parentheses, and `min max abs round floor ceil sqrt pow log exp`.
- `data-show` prints an input. `data-out` prints an expression. `data-bar` sets a bar length from 0 to 100.
- Formats: `x2` → 2.35×, `%1` → 0.123 as 12.3%, `$0` → $1,234, `n1` → 1,234.5. `data-unit` adds a suffix.
- The runtime adds a Reset button. `check` evaluates every expression at the default inputs.
- Label every assumed number as an assumption in the caption. Do not invent data and show it as real.

## .k-diagram: a template for other geometry

When the subject has its own geometry, start from a template in `diagrams/`: a sequence, swimlane, timeline, quadrant, Sankey, state machine, ER model, Gantt, chart, or one of the others. Read [../diagrams/index.md](../diagrams/index.md) first. It lists the templates, the palette, and the rules for adapting one.

```html
<figure class="k-diagram" data-tpl="sequence">
<div class="k-art">
<svg viewBox="0 0 1000 584" role="img" aria-labelledby="sequence-title sequence-desc"> … copied from diagrams/sequence.html … </svg>
</div>
<figcaption>What the reader should see in the diagram.</figcaption>
</figure>
```

- Copy the whole figure, then change the text, the data and the geometry. Keep the template colors; the kit maps them to the page theme.
- The figure grows past the text column to 1000 px when the window has room. Do not put it inside a `.k-scroll` or a grid.
- Add `data-paper="dots"` to the figure for the dotted background. The default has none.

## Mermaid: only when no template fits

```html
<pre class="mermaid">
sequenceDiagram
  Browser->>Edge: GET /abc
  Edge->>KV: read
  KV-->>Edge: miss
</pre>
```

The runtime loads Mermaid from a CDN and colors it from the kit. Prefer the `sequence` and `state` templates. They match the kit and need no CDN.

## Hand-drawn SVG: only when no exhibit or template fits

Use it for a chart or diagram with its own geometry that no template covers. These layout defaults come from OpenIntelligentUI. Follow the connector rules in [../diagrams/index.md](../diagrams/index.md). Adapt the dimensions when needed and inspect the result.

- `<svg viewBox="0 0 680 H" width="100%">`. Keep content between x=40 and x=640. H is the lowest element's bottom edge plus 40.
- Boxes: `<g class="c-teal"><rect class="box" … rx="8"/><text class="th" …>Title</text><text class="ts" …>subtitle</text></g>`.
- Arrows: `<path class="arr" d="…"/>`. A path for an arrow always has `fill="none"`. The `.arr` class sets it.
- Text: `th` is 14px medium, `t` is 14px regular, `ts` is 12px. Use sentence case. Center text in a box with `text-anchor="middle" dominant-baseline="central"`.
- A box needs a width of about (characters × 8) + 48 px for 14px text.
- One-line boxes are 44 px tall, two-line boxes 56 px. Leave 60 px between boxes. Put 4 or 5 nodes in a row at most.
- An arrow never crosses a box or a label. Route it with right-angle bends.
- Add `role="img"` and an `aria-label` to the `<svg>`.
