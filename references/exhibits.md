# Exhibits

The markup for each exhibit. `examples/gallery.html` shows all of them on one page. Every exhibit goes inside a `<figure>` with a one-sentence `<figcaption>`.

Color ramps: `c-gray c-purple c-teal c-coral c-pink c-blue c-green c-amber c-red`. Put a ramp class on a node, card, layer, chip, stat, bar or callout. Dark mode is automatic.

## Page skeleton

```html
<header>
  <h1>How the engine moves data</h1>                  <!-- a title, 3 to 7 words -->
  <p class="k-stamp">repo · sha · date · snapshot</p> <!-- "new" fills it in -->
  <p class="k-lede">The answer in one sentence.</p>
</header>
<section class="k-claim">
  <h2>A claim that can be true or false.</h2>
  <figure> …one exhibit… <figcaption>What to notice.</figcaption></figure>
  <p class="k-note">Optional: 1 or 2 sentences the figure cannot show.</p>
  <details class="k-more"><summary>Optional depth</summary> … </details>
</section>
```

## .k-flow: how data or control moves

The runtime lays out and draws the diagram. You write a text spec. You never compute coordinates.

```html
<div class="k-flow"><script type="text/plain">
  dir LR                                  // LR = left to right; TB (default) = top to bottom
  src = ILGA site / scraped hourly [teal] // id = Label / subtitle [shape, ramp]
  col = Collector / collector.ts [purple]
  db  = Postgres / bills, votes [db, purple]
  q   = Media queue [amber]
  - old = Old cron [gray]                 // marks: + new, - gone, ~ changed, ! highlight
    Runs at 02:00 only.                   // an indented line is detail, shown on hover
  src -> col : polls every 15 min         // -> solid · --> dashed (sometimes) · => bold (main path)
  col -> db : upserts                     // <-> two-way · label after the colon: a verb
  col --> q : on new video
  group "Ingest": src col                 // dashed box around nodes
</script></div>
```

- Shapes: `box` (default) `pill` `db` `diamond` `circle` `note` `hex` `actor`.
- To place nodes yourself, use grid rows. Every node then needs a cell; `.` is an empty cell.
  ```
  | src | col | db |
  | .   | q   | .  |
  ```
- If arrow labels collide or sit far from their arrows, place the nodes with grid rows. A grid almost always fixes it.
- 12 nodes at most. About 18 characters for a label line and 24 for a subtitle; the layout wraps longer text.

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

## .k-grid: 2 to 5 cases, compared

```html
<div class="k-grid">
  <div class="k-card c-green"><span class="k-chip c-green">redirects work</span><h3>Postgres is down</h3><p>Cached links still redirect.</p></div>
  <div class="k-card c-red"><span class="k-chip c-red">slow</span><h3>KV is down</h3><p>Every click goes to Postgres.</p></div>
</div>
```

Give each card the same parts in the same order. A card without a ramp class is neutral.

## .k-table: 6 or more rows

```html
<div class="k-scroll"><table class="k-table">
  <tr><th>Source</th><th>Format</th><th class="num">Rows</th><th>Status</th></tr>
  <tr><td>Bill status</td><td>XML</td><td class="num">12,400</td><td><span class="k-chip c-green">live</span></td></tr>
</table></div>
```

5 columns at most. Cells hold values, not sentences. Right-align numbers with `class="num"`.

## .k-scale: a score for each item

```html
<div class="k-scale">
  <b>Advances through the next gate</b><span class="k-dots c-teal" data-score="4/5">4/5</span><span>Committee calendars post 7 days ahead.</span>
  <b>Who defects on a vote</b><span class="k-dots c-teal" data-score="1/5">1/5</span><span>Too few contested votes to learn from.</span>
</div>
```

Three cells for each row: the item, the score and one reason. Say in the caption what the score measures.

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

`--v` is the bar length from 0 to 100. This is the one inline style that the lint accepts.

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

## Mermaid: sequences and states only

```html
<pre class="mermaid">
sequenceDiagram
  Browser->>Edge: GET /abc
  Edge->>KV: read
  KV-->>Edge: miss
</pre>
```

The runtime loads Mermaid from a CDN and colors it from the kit. Use `.k-flow` for every other diagram.

## Hand-drawn SVG: only when no exhibit fits

Use it for a picture with its own geometry, such as a timeline with real dates or a physical layout. These rules come from OpenIntelligentUI.

- `<svg viewBox="0 0 680 H" width="100%">`. Keep content between x=40 and x=640. H is the lowest element's bottom edge plus 40.
- Boxes: `<g class="c-teal"><rect class="box" … rx="8"/><text class="th" …>Title</text><text class="ts" …>subtitle</text></g>`.
- Arrows: `<path class="arr" d="…"/>`. A path for an arrow always has `fill="none"`. The `.arr` class sets it.
- Text: `th` is 14px medium, `t` is 14px regular, `ts` is 12px. Use sentence case. Center text in a box with `text-anchor="middle" dominant-baseline="central"`.
- A box needs a width of about (characters × 8) + 48 px for 14px text.
- One-line boxes are 44 px tall, two-line boxes 56 px. Leave 60 px between boxes. Put 4 or 5 nodes in a row at most.
- An arrow never crosses a box or a label. Route it with right-angle bends.
- Add `role="img"` and an `aria-label` to the `<svg>`.
