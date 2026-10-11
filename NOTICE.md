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
- Changes: `TONES` uses this kit's color ramps. `parseFlow` and `layoutFlow` are local constants instead of properties of a namespace. The SVG drawing code and everything else in the file are new.
- Ideas, not code: factual takeaway headings and the initial word suggestions in `cli/agent-pages.mjs`. The skill now permits prose sections and multiple supporting exhibits.

## visual-explainer

- Source: https://github.com/nicobailon/visual-explainer
- License: MIT, Copyright (c) 2025 Nico Bailon
- Ideas, not code: numerical comparisons, matching layouts for cases, and labeled diagram arrows. Earlier versions also adopted "every number gets a picture" and a 4+ row threshold for HTML. The current skill chooses the form by the reader's task.

## plain-writing-skill

- Source: https://github.com/docwriter-org/plain-writing-skill (`skills/plain-writing/SKILL.md`, `evals/README.md`)
- Ideas, not copied text or code: concrete before-and-after examples, paragraph organization, and removal of empty emphasis. The local examples also address visual emphasis. Reader review checks factual fidelity and comprehension in addition to style adherence.
