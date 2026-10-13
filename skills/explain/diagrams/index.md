# Diagram templates

This folder has 64 diagram templates from [diagram-design](https://github.com/cathrynlavery/diagram-design) (MIT, Cathryn Lavery). Each template is one `<figure class="k-diagram">` with an inline SVG. The kit draws it in the page colors, in light and dark. [../examples/diagrams.html](../examples/diagrams.html) shows them on one page.

## When to use a template

- Use `.k-flow` for boxes and arrows: architecture, pipelines and request paths. The runtime does the layout, so a flow is faster to write and to change.
- Use a template when the subject has its own geometry: messages over time, lanes, a timeline with real dates, two axes, flows with widths, a chart, or a physical object.
- Prefer the `sequence` and `state` templates to Mermaid.
- Use a table when a 3-column table says the same thing.

## Use a template

1. Choose the template from the table below. Read its file and its layout rules in `ref/`.
2. Copy the whole `<figure>` into a `.k-claim` section. Keep `data-tpl`, the `<style>` block when there is one, and the `<div class="k-art">` around the SVG.
3. Change the text, the data and the geometry. Keep the `viewBox` width. Set its height to the lowest element plus 40.
4. Update the `<title>` and `<desc>` in the SVG, and write the `<figcaption>`. `check` fails while the template caption is still there.
5. Run `agent-pages check`, then look at the page in light and dark, at desktop width and at 390 px.

The figure grows past the text column to 1000 px when the window has room, so the template text draws at its designed size. On a narrow window, the figure scrolls sideways inside its frame. In a deck slide, the figure stays in the slide.

## Colors

Write colors as the template writes them. The kit maps each color of this palette, at any alpha, to a kit token:

| Write | Role | The kit draws |
|---|---|---|
| `#2d3142`, `rgba(45,49,66,a)` | ink: names, strong strokes | the page text color |
| `#4f5d75`, `#5a6580` | muted, soft: sublabels, default arrows | the secondary text color |
| `#bf4520`, `rgba(191,69,32,a)` | accent: 1 or 2 focal elements | the kit coral |
| `#2e5aa8` | link: HTTP and external calls | the kit link blue |
| `#f5f5f5` | paper: background, label masks | the page background |
| `#ffffff` | node fill | white in light, dark gray in dark |
| `#ececec`, `#3d4460`, `#bfc0c0` | paper 2, ink 2, muted 2 | tints of the page colors |

- A color outside the palette stays the same in both themes. Use one only for a category, such as the type colors in `process`.
- A shape filled with ink turns light in dark mode, and its paper-colored text turns dark. diagram-design's own dark versions do the same.
- Put the accent on 1 or 2 elements. The accent marks the focal point, not every important item.
- The kit maps the template fonts: `'Geist'` draws in the kit sans, and `'Geist Mono'` draws in the kit mono.
- The dotted paper is off. Add `data-paper="dots"` to the figure to show it.

## Connector rules

These rules come from diagram-design. `ref/primitives-core.md` has the long form.

1. Orthogonal only. Connect off-axis nodes with right-angle elbows, rounded at radius 8. Use a straight line only when both ends share x or y.
2. Label gap. Put each arrow label on an opaque mask, with a 6 to 10 px gap from its stroke. Keep labels to 14 characters in caps.
3. No overlaps. Offset parallel routes by 12 px or more. Use a small bridge where two routes must cross.
4. Spread attach points. Give each connector on one box edge its own point, 12 px or more apart.
5. No transit behind a box that is not an endpoint. Reroute the connector.
6. Draw a label mask before any node that it could cover.

## What applies in ref/

The files in `ref/` are diagram-design's own guides. Apply their layout grammar, complexity budgets, anti-patterns, semantic patterns and connector rules. In Agent Pages, ignore these parts:

- The style-guide gate, onboarding, brand profiles and font links. The kit sets the colors and the fonts.
- Size presets, PNG export and standalone HTML files. A template is a figure in a page.
- Animation and the "confirm before drawing" message. Follow the explain skill for the page and the handoff.
- A placeholder such as `{ink}` or `{ink @ 0.40}` means the palette color above, at that alpha: `rgba(45,49,66,0.40)`.

## Templates

<!-- templates:start -->
| Template | Shows | Layout rules |
|---|---|---|
| [`architecture`](architecture.html) | Components and connections in one system snapshot. | [type-architecture](ref/type-architecture.md) |
| [`architecture-delta`](architecture-delta.html) | Structural change between a before and an after topology, with a ledger of changes. | [type-architecture-delta](ref/type-architecture-delta.md) |
| [`axonometric-plan`](axonometric-plan.html) | One floor or site seen from above at an angle. | [type-axonometric-plan](ref/type-axonometric-plan.md) |
| [`axonometric-plan-campus`](axonometric-plan-campus.html) | An axonometric plan of a campus, with buildings by phase. | [type-axonometric-plan](ref/type-axonometric-plan.md) |
| [`axonometric-plan-coffee-shop`](axonometric-plan-coffee-shop.html) | An axonometric plan of one room with furniture. | [type-axonometric-plan](ref/type-axonometric-plan.md) |
| [`axonometric-plan-warehouse`](axonometric-plan-warehouse.html) | An axonometric plan of a warehouse floor. | [type-axonometric-plan](ref/type-axonometric-plan.md) |
| [`bar`](bar.html) | A quantitative comparison across categories. | [type-bar](ref/type-bar.md) |
| [`beeswarm`](beeswarm.html) | One variable, one dot for each item. | [type-scatter](ref/type-scatter.md) |
| [`bubble`](bubble.html) | Three variables: x, y and the size of each bubble. | [type-scatter](ref/type-scatter.md) |
| [`bump`](bump.html) | Rank movement across several snapshots. | [type-line](ref/type-line.md) |
| [`data-flow`](data-flow.html) | Role-scoped data flow: who does what at each pipeline step. | [type-data-flow](ref/type-data-flow.md) |
| [`datalake`](datalake.html) | An end-to-end data stack on a container cluster, with icons. | [type-high-level](ref/type-high-level.md) |
| [`db-schema`](db-schema.html) | Physical tables with SQL types, constraints, indexes and column foreign keys. | [type-db-schema](ref/type-db-schema.md) |
| [`dependency`](dependency.html) | What depends on what, with fan-in and cycles that a tree cannot show. | [type-dependency](ref/type-dependency.md) |
| [`deployment`](deployment.html) | Where software runs: zones, hosts, artifacts, replicas and ports. | [type-deployment](ref/type-deployment.md) |
| [`dp-integration`](dp-integration.html) | The integration topology of a data platform: sources, core and consumers. | [type-dp-integration](ref/type-dp-integration.md) |
| [`dp-security-matrix`](dp-security-matrix.html) | Access permissions for each role and component. | [type-dp-security-matrix](ref/type-dp-security-matrix.md) |
| [`er`](er.html) | Entities, fields and relationships. | [type-er](ref/type-er.md) |
| [`exploded`](exploded.html) | The parts of one object pulled apart along one axis. | [type-exploded](ref/type-exploded.md) |
| [`exploded-ai-stack`](exploded-ai-stack.html) | An exploded view of a software stack. | [type-exploded](ref/type-exploded.md) |
| [`exploded-keyboard`](exploded-keyboard.html) | An exploded teardown of a keyboard. | [type-exploded](ref/type-exploded.md) |
| [`exploded-phone`](exploded-phone.html) | An exploded teardown of a phone. | [type-exploded](ref/type-exploded.md) |
| [`exploded-unboxing`](exploded-unboxing.html) | An exploded unboxing, in assembly order. | [type-exploded](ref/type-exploded.md) |
| [`fishbone`](fishbone.html) | The causes of one observed effect, grouped by category. | [type-fishbone](ref/type-fishbone.md) |
| [`flowchart`](flowchart.html) | Decision logic with branches. | [type-flowchart](ref/type-flowchart.md) |
| [`gantt`](gantt.html) | Tasks and phases on a timeline. | [type-gantt](ref/type-gantt.md) |
| [`heatmap`](heatmap.html) | Cross-tabulated data where the fill encodes the value of each cell. | [type-heatmap](ref/type-heatmap.md) |
| [`high-level`](high-level.html) | An end-to-end data stack on a container cluster. | [type-high-level](ref/type-high-level.md) |
| [`high-level-vertical`](high-level-vertical.html) | The high-level stack, top to bottom. | [type-high-level](ref/type-high-level.md) |
| [`it-state`](it-state.html) | A legacy IT landscape by phase or department: the current state. | [type-it-state](ref/type-it-state.md) |
| [`journey`](journey.html) | What a person does across the stages of an experience, and how it feels. | [type-journey](ref/type-journey.md) |
| [`kanban`](kanban.html) | Work in progress by state, with limits and blocked items. | [type-kanban](ref/type-kanban.md) |
| [`layers`](layers.html) | Stacked abstraction levels. | [type-layers](ref/type-layers.md) |
| [`line`](line.html) | Continuous trends over time. | [type-line](ref/type-line.md) |
| [`loop`](loop.html) | A reinforcing cycle where the last step feeds the first. | [type-loop](ref/type-loop.md) |
| [`marimekko`](marimekko.html) | Part of a whole in two dimensions: column width and segment height. | [type-treemap](ref/type-treemap.md) |
| [`medallion`](medallion.html) | Multi-tier data storage with quality levels and access policies. | [type-medallion](ref/type-medallion.md) |
| [`nested`](nested.html) | Hierarchy through containment or scope. | [type-nested](ref/type-nested.md) |
| [`org-chart`](org-chart.html) | Ownership, reporting, routing and escalation for people, agents or teams. | [type-org-chart](ref/type-org-chart.md) |
| [`polar`](polar.html) | One quantitative series across cyclic categories. | [type-polar](ref/type-polar.md) |
| [`process`](process.html) | A multi-actor sequential process with data handoffs. | [type-process](ref/type-process.md) |
| [`pyramid`](pyramid.html) | A ranked hierarchy or a conversion drop-off. | [type-pyramid](ref/type-pyramid.md) |
| [`quadrant`](quadrant.html) | Two-axis positioning or prioritization. | [type-quadrant](ref/type-quadrant.md) |
| [`quadrant-consultant`](quadrant-consultant.html) | A two-axis matrix with named quadrants, consultant style. | [type-quadrant](ref/type-quadrant.md) |
| [`radar`](radar.html) | Several entities scored across 3 to 5 criteria. | [type-radar](ref/type-radar.md) |
| [`ridgeline`](ridgeline.html) | One distribution for each series. | [type-line](ref/type-line.md) |
| [`sankey`](sankey.html) | A quantity that splits and merges across stages. Band width is the amount. | [type-sankey](ref/type-sankey.md) |
| [`scatter`](scatter.html) | The correlation or distribution of two variables. | [type-scatter](ref/type-scatter.md) |
| [`sequence`](sequence.html) | Time-ordered messages between actors. | [type-sequence](ref/type-sequence.md) |
| [`sequence-oauth`](sequence-oauth.html) | A longer sequence: an OAuth exchange with token refresh. | [type-sequence](ref/type-sequence.md) |
| [`slopegraph`](slopegraph.html) | Change between exactly two states. | [type-line](ref/type-line.md) |
| [`state`](state.html) | States, transitions and guards. | [type-state](ref/type-state.md) |
| [`state-lifecycle`](state-lifecycle.html) | One subject through phases, waits, retries, cancellation and terminal outcomes. | [type-state](ref/type-state.md) |
| [`story-map`](story-map.html) | A narrative backbone sliced into releases, with the cut line. | [type-story-map](ref/type-story-map.md) |
| [`streamgraph`](streamgraph.html) | Volume over time for several series, stacked around a center line. | [type-line](ref/type-line.md) |
| [`swimlane`](swimlane.html) | A cross-functional process with handoffs. | [type-swimlane](ref/type-swimlane.md) |
| [`timeline`](timeline.html) | Events positioned in time. | [type-timeline](ref/type-timeline.md) |
| [`tree`](tree.html) | Parent and child relationships. | [type-tree](ref/type-tree.md) |
| [`tree-block-decomposition`](tree-block-decomposition.html) | A hierarchical, ID-addressable decomposition with inputs, outputs and constraints. | [type-tree](ref/type-tree.md) |
| [`treemap`](treemap.html) | Part of a whole where the relative sizes are the story. | [type-treemap](ref/type-treemap.md) |
| [`uml-class`](uml-class.html) | Classes with operations, inheritance and composition. | [type-uml-class](ref/type-uml-class.md) |
| [`venn`](venn.html) | Overlap between sets. | [type-venn](ref/type-venn.md) |
| [`wardley`](wardley.html) | A value chain against evolution. | [type-wardley](ref/type-wardley.md) |
| [`waterfall`](waterfall.html) | A start total bridged to an end total by signed contributions. | [type-waterfall](ref/type-waterfall.md) |
<!-- templates:end -->
