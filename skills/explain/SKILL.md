---
name: explain
description: Explain a system, a concept or a result to the user with pictures first and few words. Use when the user asks how something works, for an overview or architecture, to explain or teach a concept, to compare options, or to show results; and whenever an answer would need more than about 5 sentences, a table of 4+ rows, or numbers that depend on inputs. Gives a ladder from a plain answer, to one Mermaid block in chat, to one HTML page drawn with a fixed kit and shown inline in T3 Code.
---

# explain

The user reads pictures faster than paragraphs. Your default is a wall of text. This skill replaces that default.

```
<this skill's directory>/
  references/exhibits.md   ← the markup for each exhibit. Read it before you write a page.
  examples/gallery.html    ← every exhibit on one page. Copy its parts.
agent-artifacts            ← the CLI on PATH: new · check · pack · serve · publish
```

The CLI and the kit (`kit/explain.css`, `kit/explain.js`) live in the agent-artifacts repo. Every page links the kit. Never restyle the kit in a page.

## 1. Pick the lightest output that works

| The answer is | Give |
|---|---|
| One fact, a yes or no, a command, or code | Plain text. 5 sentences at most. |
| One relationship: a flow, a sequence, a state change | One ```` ```mermaid ```` block in chat and 1 or 2 sentences. T3 Code draws it. |
| Two or more ideas, numbers, a comparison, or anything the user must explore | A page from the kit (sections 2 to 7). |

If you are not sure, ask yourself: "Would a good engineer draw this on a whiteboard?" If yes, do not answer in text.

## 2. Decide what the reader needs

Choose the content before the form. A page that shows the wrong points in a good layout is still a bad page.

1. Name the reader and the one question. Example: "Josh wants to know how the engine gets its data and what it can predict." If the user did not say, infer it from the request and the conversation. Ask only if two readings give different pages.
2. List every candidate point: from the code, from the conversation, and from any earlier page or doc on the topic.
3. Give each point one role:

| Role | Where it goes |
|---|---|
| The reader needs it to answer the question | A claim |
| It supports one claim | Inside that claim's figure, or in `k-more` under it |
| It is a single fact | One sentence: in the chat reply, or inside a claim. Never its own section. |
| The user must decide it | A question in the chat reply. Never a page section. |
| It is not about the question | Cut it |

4. Give space by weight. The point that answers the question gets the first claim and the largest figure. A minor point never gets the same size as a major one.
5. Do the cut test on each claim: "If I delete this, can the reader still answer the question?" If yes, delete it.

Decisions that you own, such as how to store an export, are not for the reader. Leave them out of the page.

When you redo an existing page or doc, do not keep its outline. Start again from the question. In the chat reply, list what you cut in one line, so the user can ask for any of it back.

## 3. Write the claims

A page is a list of claims. Each claim is a sentence that can be true or false. Each claim gets exactly one exhibit.

1. Write the lede: the answer to the user's question in one sentence.
2. Write 2 to 7 claims as `h2` sentences. "Only the API writes to Postgres." Not "Database layer".
3. Read the lede and the claims aloud, in order, with nothing else. They must tell the whole answer. If they do not, fix them now. Do not start the exhibits until they do.
4. Put depth that only some readers need in `<details class="k-more">` under a claim.

Order the claims from the outside in. First what the user can see or do, then how it works, then where it is in the code (`<span class="k-path">file:line</span>`).

## 4. Pick one exhibit for each claim

The question that the claim answers picks the exhibit. The markup for each one is in `references/exhibits.md`.

| The claim answers | Exhibit | Do not use |
|---|---|---|
| How does data or control move? | `.k-flow`. Label every arrow with a verb: "writes", "polls every 15 min". | A row of boxes with "→" between them |
| What are the parts, and which part owns what? | `.k-layers`, or `.k-flow` with `group` | A table of components |
| What happens in order, stage by stage? | `.k-steps`, or `.k-flow` with `dir LR` | A numbered list of paragraphs |
| How do 2 to 5 cases differ? | `.k-grid` of `.k-card`: the same parts on each card | A table of sentences |
| How do 6 or more items compare on the same columns? | `.k-table` with `.k-chip` status, 5 columns at most | Long text in the cells |
| How good or how ready is each item? | `.k-scale` with `data-score="3/5"` and one reason for each row | Adjectives |
| How big is a number, or how do numbers compare? | `.k-stats` or `.k-bars`. Every number gets a picture. | A number inside a sentence |
| How does the result change when an input changes? | `.k-model` with sliders. Use it only when the reader has a real input to move. | A table of scenarios |
| Who calls whom, in what order, with replies? | `<pre class="mermaid">sequenceDiagram` | A flow with numbered arrows |
| What states does a thing have? | `<pre class="mermaid">stateDiagram-v2` | Prose |
| What is the one fact the reader must not miss? | `.k-callout` | Bold text in a paragraph |

Rules for every exhibit:
- Draw the mechanism, not the name. A box that says "cache" teaches nothing. A request that goes through the cache and back teaches.
- Use 2 or 3 color ramps in one figure. Color shows meaning, and it is the same meaning on the whole page.
- Status colors are fixed: `c-green` is live or done, `c-amber` is partial, `c-gray` is not built, `c-red` is broken.
- A flow has 12 nodes at most. If it needs more, split it into an overview and a zoom.
- One exhibit can combine kit parts that show one thing, such as `.k-stats` above `.k-bars` for the same numbers. Two figures that show two things are two claims.
- A number in a note is fine when it is a condition or a date. A number that is the point gets a picture.
- Use only the kit classes. Do not set colors, fonts or sizes in a page. A page with its own `<style>` block is wrong unless the kit cannot draw the figure. For that case, see the SVG rules in `references/exhibits.md`.

## 5. Write the words

The figures carry the page. The words say what each figure proves, in the plain way an engineer briefs a colleague.

### Headings

Each `h2` is the answer to one question: "What does this figure show?"

- Write one sentence of 6 to 12 words that states one fact.
- Make a real part the subject, with the name it has in the code and in the figure. Use a plain verb.
- Put the specific fact in the heading: a name, a number, a limit, a direction or a condition.
- Use a count only when the count is the finding. Otherwise, state what the items have in common.
- Use only the specific words that also appear in the figure.
- Test each heading: "Could this heading go on a page about a different system without a change?" If yes, replace it with the most specific fact that the figure shows.

These headings follow the rules. Each one comes from the figure under it:

<examples>
Figure: a flow from the browser to the edge and KV, with a dashed path to the API and Postgres.
Heading: "A click reaches Postgres only when the edge cache misses."

Figure: three bands. Only the API band says "reads and writes".
Heading: "Only the Links API writes to Postgres."

Figure: a table of four routes with calls per day. GET /:id has 2,400,000 of 2,421,140.
Heading: "GET /:id carries 99% of all requests."

Figure: a stepper from the API write to the edge cache.
Heading: "A new link reaches every edge within 60 seconds."

Figure: a slider model of hit rate against average redirect time.
Heading: "At a 94% hit rate, the average redirect takes 7.1 ms."
</examples>

### Captions, notes and the lede

- The lede answers the reader's question in one sentence.
- A `figcaption` is one sentence that tells the reader where to look and what they see there.
- A note under a figure is 1 or 2 sentences. It says only what the figure cannot show, such as a cause or a condition.
- When a sentence describes the picture, make it a label in the picture.
- The page holds the lede, the claims and the figures. The claims, read in order, are the summary.

### Every sentence

Write in ASD-STE100 Simplified Technical English. Put one idea in each sentence. Use at most 20 words for an instruction and 25 for a description. Use active voice and the present tense. Use the same term for the same thing each time, and use the plainest common word for everything that is not a technical name.

### Rewrite pass

When the page is complete, do one more pass on the words only. For each claim, look at its figure and answer "What does this figure show?" in one sentence. If your answer differs from the `h2`, the answer becomes the new `h2`. Then run `check`, which also flags common problems in headings.

## 6. Where the page goes: a snapshot, not a document

An explain page shows the code at one commit on one date. It goes stale the next day. Agents that find a stale page in a repo read it as a plan or as the truth. So:

- `agent-artifacts new <slug>` writes the page to `~/.agent/explain/<repo>/<date>-<slug>.html`. That folder is outside every repo. This is the default.
- Write a page into a repo only when the user asks for that. Then the page keeps its `SNAPSHOT` comment and its `.k-stamp` line, which tell agents not to plan from it.
- Never write "next steps", "TODO" or "not built yet, build this next" as a claim. To show what does not exist, use a `c-gray` "not built" chip, and state it as a fact of that commit.
- When a decision is worth keeping, it does not go in the page. Tell the user, and offer to record it as an ADR or in `CONTEXT.md`.

## 7. Make, check, look, show

```bash
agent-artifacts new engine-overview --title "How the engine moves data"   # prints the path
# write the page: claims first, then exhibits
agent-artifacts check <page>               # errors stop you; warnings are budgets
agent-artifacts pack <page> --inline       # one file, under 512 KB; writes <page>.packed.html
agent-artifacts publish <page>             # sends the page to the host; prints its URL
```

1. Run `check`. Fix every error. Fix each warning, or keep it only if you can say why.
2. Look at the page before the user does.
   - In T3 Code, call `html_preview` with the packed HTML. Read the screenshot, the console output and `contentHeight`.
   - Without `html_preview`, run `agent-artifacts serve <packed page>` in the background, then use `preview_open` and `preview_snapshot`.
   - Check that no label is clipped, no arrow crosses a label, and nothing overflows at 390 px wide. Check dark mode too.
3. Show the page.
   - In T3 Code, call `html_render` with the packed HTML, a title, and `contentHeight` as the height. The page appears above your reply.
   - Without `html_render`, give the path and open it in the preview.
4. Publish the page with `agent-artifacts publish <page>`. Give the unpacked page, because `publish` packs it for the host. Publish every page, and publish it again after each change: each publish makes a new version of the same slug. Put the URL that it prints in the reply.
   - Make a share link (`--share`) only when the user asks for one. A share link lets anyone read the page with no login.
   - If `publish` exits with code 3, the host or its credentials are not set. Say so in the reply, and do not retry.
5. The chat reply is 1 or 2 sentences that add what the page does not say. After them, add the one-line list of cuts (for a redo) and the questions for the user. Do not announce the page, and do not repeat it.
6. If you cannot get a screenshot, say so in the reply. Do not claim that you checked the look.

## Before you show it

```
□ every claim passes the cut test; single facts and decisions are in the chat, not in sections
□ the lede answers the question in one sentence
□ the claims, read alone, tell the whole answer
□ each claim has exactly one figure, and the figure proves the claim
□ every arrow has a verb; every number has a picture
□ no prose paragraph repeats what a figure shows
□ check passes; you looked at the screenshot in light and dark mode
□ the page is in ~/.agent/explain, unless the user asked for the repo
□ the page is published, and the reply gives its URL; no share link unless the user asked
```
