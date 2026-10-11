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
- Ideas, not code: claims that can be true or false, one exhibit for each claim, and the STE word list in `cli/agent-artifacts.mjs`.

## visual-explainer

- Source: https://github.com/nicobailon/visual-explainer
- License: MIT, Copyright (c) 2025 Nico Bailon
- Ideas, not code: "every number gets a picture", "cases become small multiples", "label every arrow with a verb", and the rule that sends a table of 4+ rows to HTML.
