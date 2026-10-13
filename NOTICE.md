# Third-party notices

This project contains code and design values from these projects.

## OpenIntelligentUI

- Source: https://github.com/CopilotKit/OpenIntelligentUI (`packages/design-system/src/index.ts`, `apps/agent/skills/svg-diagrams/SKILL.md`)
- License: MIT, Copyright (c) CopilotKit
- Used in: `kit/explain.css` (theme tokens, the nine color ramps for light and dark, SVG text and shape classes, range input style) and the SVG rules in `skills/explain/references/exhibits.md`.
- Changes: the ramps became CSS variables (`--fill --line --ink --sub`) on `.c-*` classes, so HTML and SVG share them.

## html-plan

- Source: https://github.com/anthropics/claude-plugins-community (`html-plan/skills/html-plan/runtime/htmlplan.js`)
- License: the repository's LICENSE file is Apache License 2.0. The plugin's `plugin.json` says MIT. This notice follows the Apache 2.0 terms.
- Used in: `kit/explain.js`, the code between the "From html-plan" and "End of html-plan code" markers: `takeMark`, `parseFlow` and `layoutFlow`.
- Changes: `TONES` uses this kit's color ramps. `parseFlow` and `layoutFlow` are local constants instead of properties of a namespace. `parseFlow` also reads `tag:`, `zone` and `legend`. `layoutFlow` also reserves a row for a tag and places each group label in a corner that no arrow crosses. The SVG drawing code and everything else in the file are new.
- Ideas, not code: factual takeaway headings and the initial word suggestions in `cli/agent-pages.mjs`. The skill now permits prose sections and multiple supporting exhibits.

## diagram-design

- Source: https://github.com/cathrynlavery/diagram-design (`skills/diagram-design/assets/example-*.html`, `skills/diagram-design/references/`)
- License: MIT, Copyright (c) 2025 Cathryn Lavery. A copy is in `skills/explain/diagrams/LICENSE-diagram-design`.
- Used in: `skills/explain/diagrams/` (64 templates and the reference files in `ref/`), `skills/explain/examples/diagrams.html`, and the gallery's sequence figure. `tools/port-diagram-design.mjs` makes these files.
- Changes: each template keeps only its SVG and the CSS rules for it, scoped to its figure. `var()` values in SVG attributes became the values they named. The reference files link only to the files that Agent Pages copies, and each starts with a note.
- Design, not code: the look of `.k-flow` in `kit/explain.js` and `kit/explain.css` (type tags, mono sublabels, mono caps arrow labels, filled zones, the accent on the main path and the focal node, the legend), and the palette map for `.k-diagram`.

## visual-explainer

- Source: https://github.com/nicobailon/visual-explainer
- License: MIT, Copyright (c) 2025 Nico Bailon
- Ideas, not code: numerical comparisons, matching layouts for cases, and labeled diagram arrows. Earlier versions also adopted "every number gets a picture" and a 4+ row threshold for HTML. The current skill chooses the form by the reader's task.

## plain-writing-skill

- Source: https://github.com/docwriter-org/plain-writing-skill (`skills/plain-writing/SKILL.md`, `evals/README.md`)
- Ideas, not copied text or code: concrete before-and-after examples, paragraph organization, and removal of empty emphasis. The local examples also address visual emphasis. Reader review checks factual fidelity and comprehension in addition to style adherence.

## Deck design sources

None of these projects supplied code or text. The deck support in `kit/explain.js`, `kit/explain.css`, `cli/agent-pages.mjs`, and `skills/explain/references/slides.md` uses these ideas:

- b6+ (https://www.w3.org/Talks/Tools/b6plus/), by Bert Bos at W3C: a page that is a document first and slides second.
- frontend-slides (https://github.com/zarazhangrui/frontend-slides), MIT: a fixed slide canvas that the page scales.
- guizang-ppt-skill (https://github.com/op7418/guizang-ppt-skill), AGPL-3.0: a fixed list of named layouts, no long runs of one layout, and overflow measured in pixels with a fix for each size of overflow at 40, 90, and 160 px. This project copies no code or text from it.
