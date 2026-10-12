---
name: explain
description: Create Agent Pages HTML explanations, lessons, documents, and presentations for a stated audience. Choose prose, tables, charts, diagrams, and interactive examples within the page by the reader's task. Use for explaining concepts or systems, teaching unfamiliar material, comparing options, and preparing material for others to read.
---

# explain

Create the explanation as an HTML page with the Agent Pages kit. Choose its content, emphasis, and then the form of each part. A short explanation can be a short page of prose. Honor an explicit request for another output format.

## Start with the reader

Infer the audience, prior knowledge, and purpose from the request. Ask only when missing information would materially change the result. Adapt the page to its use:

- **Teaching.** Explain necessary terms and the mechanism. Use a concrete example when it helps. An extended lesson can include a practice question with an answer the reader can check.
- **Documents.** Include the context, evidence, decisions, and required actions an independent reader needs. Preserve an existing outline unless restructuring is requested or necessary.
- **Presentations.** Keep each slide to one point, and give it enough explanation to make sense without a presenter. Decks have no speaker notes. Follow the requested template. Make a deck with `agent-pages new --deck` and read [references/slides.md](references/slides.md) first.

A shared page must make sense without this chat. Keep essential context in the page and production details out of it.

## Choose content and emphasis

Separate facts, assumptions, illustrative examples, and recommendations. Cite evidence where readers need to verify a claim. Do not invent data or present an illustration as a measurement.

Give the main answer the most prominence. Keep prerequisites, examples, and caveats when they help the reader understand or apply it. Cut incidental details that do not affect accuracy or action.

A separate paragraph, heading, card, chart, or diagram gives a point extra emphasis. Match that emphasis to its importance. Reduce oversized treatment of minor facts while preserving visuals that make the main explanation easier to understand. A complex central idea can deserve several diagrams and substantial prose. A supporting fact often needs only a sentence, label, caption, or table cell.

For example, a service's 15-minute refresh interval can be one label in a system overview. A separate paragraph and large "15 min" card would overemphasize it. A lesson about stale results can justify a timeline of source changes and refreshes. Label example times as illustrative. Omit the interval from installation instructions if it affects neither a step nor an expected result.

## Choose the form within the page

Choose the relationship the reader needs to see before choosing a component. Prefer diagrams for connections, transformations, sequence, and branches. Tables suit lookup and comparison of matching attributes. A table or set of cards does not explain a process merely by containing its parts. Use prose for meaning, reasons, and conditions the visual cannot convey clearly.

| Reader's task | Useful form |
|---|---|
| Understand a definition, reason, or trade-off | Prose with an example when needed. |
| Follow instructions | A numbered list, with a diagram where location or movement matters. |
| Look up values or compare matching attributes | A table with concise cells, including small comparisons. |
| See magnitude, share, or change over time | A chart with units, labels, and an appropriate scale. |
| Understand connections, sequence, or state | A diagram with enough text to explain its meaning. |
| Explore how an input affects a result | An interactive model with visible assumptions and limits. |

A number can stay in a sentence. A large number tile highlights a value but does not show a comparison. Use interaction to explore inputs or reveal a complex sequence; keep short sequences visible together. Use precise terms such as table, chart, and diagram.

For a system overview, start with a connected map of the main paths. Show sources → processing → outputs as connected groups. Show progression and readiness as stages with explicit status labels. Detail views should connect to the overview. Keep exact values in reference tables when useful. Move supporting timings, code references, and failure mechanics into expandable details. Keep essential conditions visible.

## Write clearly and preserve meaning

Use common words, consistent terms, and complete sentences. Define unfamiliar technical terms before the reader needs them. Lead paragraphs with their main point, then add supporting evidence or reasoning. Connect related ideas and remove empty emphasis.

Apply ASD-STE100 sentence principles, not a restrictive word list. Put one idea in each sentence. Aim for about 20 words for an instruction and 25 for a description. Use active voice and simple tenses that preserve timing. Sentence lengths and readability scores are review aids, not correctness tests.

Preserve uncertainty, conditions, and obligation. "Might fail", "can fail", and "must fail" mean different things. Keep quotations, code, identifiers, and technical names exact. Check rewrites against their source; do not add causes, outcomes, measurements, or guarantees to make the writing sound concrete. Verify a necessary missing fact or identify the gap.

Prefer takeaway headings, such as "Only the API writes to Postgres." Question or topic headings can suit navigation and reference material. Do not pad a heading to meet a word count.

## Remove repetition across the whole page

Give each fact a primary place. Review headings, prose, tables, diagrams, captions, and summaries together. Cut restatements that add no reasoning, evidence, condition, or useful application. A change of wording or format does not make a repeated point new.

Let each element do a distinct job. A heading can state the finding, a chart show its evidence, and a caption identify its source or limits. Do not routinely narrate every label or table row in prose. Repeat only for a concrete reader need, such as accessible text, a condition at the point of action, or an independently read summary. Keep that repetition brief. A worked example should teach the reader how to apply the idea.

For example, keep a tax-column omission risk in the risk paragraph. Put the measured export times and test limits in the evidence table. Remove table rows that merely repeat the risk paragraph. A short recommendation can refer to the risk without restating the evidence list.

## Review the result

Scan the rendered page before reading every paragraph or cell. Can a reader find the main answer, trace relationships, and compare important differences? Replace prose or tables that make the reader reconstruct a clearer visual structure. Then read the full page as someone without this conversation. Verify meaning, evidence, conditions, and accessible equivalents. Remove repetition and move supporting detail out of the main reading path. A page without overflow can still be hard to understand.

For substantial work, use a separate reader review when available and appropriate. Give the reviewer the page and realistic questions without the conversation or intended answers. Check factual fidelity, comprehension, and emphasis, not just style adherence. Self-review is not an independent reader test.

## Make, check, and show the HTML

Read [references/exhibits.md](references/exhibits.md) for markup and consult [examples/gallery.html](examples/gallery.html) for component examples. The CLI and `kit/explain.css` and `kit/explain.js` live in the Agent Pages repo.

Use the kit for consistent appearance. Add custom styling only for a needed chart or diagram the kit cannot express. Keep colors consistent, labels readable, and status understandable without color. Give diagrams a textual equivalent.

Use `<section class="k-claim">` with an `h2` for each content section. The class supports layout, search, and host links. A section can hold prose, lists, tables, or multiple supporting exhibits. Wrap a self-contained exhibit in `<figure>` with a useful `<figcaption>`.

```bash
agent-pages new engine-overview --title "How the engine moves data"
# Replace the template text with the explanation.
agent-pages check <page>
agent-pages pack <page> --inline
```

`new` defaults to `~/.agent/explain/<repo>/<date>-<slug>.html`. Use the requested destination when specified. A lasting document can live in its repository.

Keep the template's `SNAPSHOT` comment for code explanations; it records the source checkout at creation. Verify mutable facts before reusing an old page. Remove the comment when that checkout is unrelated to the content. Set `.k-stamp` to a relevant project or topic and date. Identify draft status or review dates when useful.

Fix `check` errors. Review warnings in context; lint does not judge factual accuracy or teaching quality. `pack` inlines the kit and enforces a 512 KB limit. Mermaid still loads its renderer from a CDN.

Inspect the packed page with the available browser tools. In T3 Code, start with `preview_status`, then `preview_open` when needed. Run `agent-pages serve <packed page>` and navigate to its URL. If inline preview and rendering tools are available, use their documented interfaces.

Check labels, arrows, overflow, and controls at desktop and narrow mobile widths, including 390 px, in light and dark modes. Test representative and boundary inputs in interactive models. State unavailable checks; do not claim visual inspection from lint results. Show the page through the preview or a file link. Keep the chat handoff to its location, material limitations, and any needed user action.

## Publish and share

Follow the user's established publishing preference. If private publication is already authorized, publish completed pages and completed revisions without asking again. Otherwise, keep the artifact local until publication is requested. Intermediate edits do not each need an upload.

Use `agent-pages publish <page>` with the unpacked file; the command packs it for the host. Include the returned URL in the reply. Use `--share` only when public sharing is authorized. Private publication and public sharing are separate actions.

If publication exits with code 3, report the host or access configuration problem. Stop retries until it is resolved.
