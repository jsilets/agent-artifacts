# Slides

A deck is a page whose `<main>` has the class `k-deck`. The kit shows it as slides on a fixed 1920×1080 canvas and scales the canvas to fit the window. The host stores decks with the same commands, versions, search, and share links as pages.

```bash
agent-pages new rollout-review --deck --title "Edge reads cut redirect latency by 81%"
agent-pages check <deck>
agent-pages publish <deck>
```

## Write for a deck read alone

A deck has no speaker notes. Each slide must make sense to a reader without a presenter. Keep each slide to one point, and prefer a figure, a chart, or a table to a list. `check` warns at 80 words on a slide.

## Markup

```html
<main class="k-deck">
  <section class="k-claim k-slide" id="problem" data-layout="bullets">
    <h2>Every click waited on Postgres.</h2>
    <ul>
      <li>The redirect handler read each link from the primary database.</li>
      <li class="k-build">p50 latency was 210 ms in the test region.</li>
    </ul>
  </section>
</main>
```

- Each slide is a `<section class="k-claim k-slide">` with a unique `id`. The `id` is the slide's link, so use a short word, not a number.
- Each slide needs `data-layout`. The layouts are in the next table.
- Every slide except `title` and `quote` needs an `h2`. Write it as the takeaway, the same as a page heading. Keep it to 14 words or fewer.
- The first slide uses the `title` layout with the `h1`, the `.k-lede`, and the `.k-stamp`.
- `.k-build` on an element hides it until the next key press. Use it only when the order of the points matters to the reader.

## Layouts

| `data-layout` | Content | Limits from `check` |
|---|---|---|
| `title` | `h1`, `.k-lede`, `.k-stamp`. First slide only. | |
| `section` | `h2` and an optional `p`. Starts a part of the deck. | |
| `statement` | One large `h2` and an optional `p`. One claim with no evidence on the slide. | |
| `bullets` | `h2` and one `ul` or `ol`. | 6 items |
| `split` | `h2` and two `div` children, side by side. Use it for before and after, or for two options. | |
| `figure` | `h2` and one `<figure>` that fills the rest of the slide. | |
| `table` | `h2` and one `.k-table` in a `.k-scroll`. | 8 rows |
| `stat` | `h2` and one `.k-stats` group. | |
| `quote` | `blockquote` and a `p` with the source. No `h2`. | |
| `code` | `h2` and one `pre`. | 16 lines |

Kit exhibits work inside slides: `.k-flow`, `.k-stats`, `.k-table`, charts, and models. The kit enlarges them 2.5 times on slides, so build them at their page size. `check` warns when more than 3 slides in a row use the same layout, or more than 4 for `bullets` and `figure`. Change the layout or merge the slides.

## Fit every slide on the canvas

A slide never scrolls. Content that does not fit is cut off. Do not fix overflow with CSS. `check` warns on custom CSS that hides overflow (`overflow: hidden`, `line-clamp`, or an ellipsis) and on viewport units such as `vw` and `vh`. Mark an intended crop, such as a cropped photo, with `data-k-crop`.

The kit measures each slide in the browser after fonts and images load:

- `publish` prints `audit: every slide fits`, or one line for each slide that overflows. Each line gives the overflow in pixels and the size of the fix. Fix those slides and publish again.
- Locally, run `agent-pages serve <deck>` and open the URL with `&audit` after the hash, for example `#1&audit`. The kit outlines each slide that overflows. The console has a `[k-deck:overflow]` line for each slide that overflows. `document.documentElement.dataset.kAuditResult` holds `pass` or `fail:<count>`.

| Overflow | Fix |
|---|---|
| Up to 40 px | Shorten a line or a label. |
| Up to 90 px | Cut a point. |
| Up to 160 px | Change the layout. |
| More than 160 px | Split the slide in two. |

The audit also reports elements that clip their content and text that shows smaller than 24 px on the canvas.

## Views and links

A floating toolbar under the slide has the thumbnails button, the arrows, a strip of ticks, and the slide position. On a phone, the toolbar has only the arrows with the slide position between them. The strip has one tick for each slide. `title` and `section` slides have taller ticks, so the strip shows the parts of the deck. The current tick fills in steps as its builds show. Hover over a tick to see the slide heading, and click it to go to that slide. A deck with more than 15 slides shows a solid progress bar instead of ticks. A click on the bar goes to that point in the deck. Each control has a tooltip with its key.

The hash selects the slide and the view: `#<id or number>[/<build>][&view=slide|scroll][&thumbs=0|1]`.

| View | Key | What it shows |
|---|---|---|
| One slide at a time (`slide`) | | One slide on the canvas. This is the default at 600 px and wider. |
| Scroll through all slides (`scroll`) | D | All slides in one column. This is the default below 600 px. |

The toolbar has no button for the view. Use the D key or `&view=scroll` in the hash.

The thumbnails sidebar shows all slides next to either view. It is on by default at 1000 px and wider, and the reader can turn it on or off with the thumbnails button or the T key. It does not show below 700 px.

Arrow keys, Space, Page Up, and Page Down move through builds and slides. In the slide view, the mouse wheel or a trackpad swipe moves one step, and one swipe never skips more than one step. Home and End go to the first and last slide. Present in the host header, or the F key, shows the current slide full screen on black. The controls show while the pointer moves. In the host, the More menu has "Download PDF". The host makes the PDF with one page for each slide. The kit print style gives the same result from a local browser.

## Size

`pack` stops at 512 KB because the inline `html_render` preview takes no more. The kit uses about 71 KB of that. `publish` allows 5 MB. Images in a deck add up fast, so give each image a width of 1920 px or less and use WebP or SVG. When a deck is over 512 KB, preview it with `agent-pages serve` instead of `pack --inline`.

## Check the deck

Inspect the deck one slide at a time at 1280×720 with the thumbnails, and at 390 px wide, in light and dark modes. Step through every build. Read the deck once in the scroll view, where it must make sense as a document.
