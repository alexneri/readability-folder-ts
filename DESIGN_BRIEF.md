# Design Brief: Readability Score Tester — Homepage

A brief for **Claude Design** to produce a marketing/landing homepage for the
open-source CLI tool `@alexneri/readability-ts`.

---

## 1. Project snapshot

| | |
|---|---|
| **Product name** | Readability Score Tester (Folder) |
| **Package** | `@alexneri/readability-ts` |
| **Current version** | 0.8.0 |
| **Type** | Open-source Node.js CLI, written in TypeScript |
| **Author** | Alexander Neri |
| **License** | GPL-3.0-or-later |
| **Repository** | github.com/alexneri/readability-folder-ts |
| **Distribution** | npm (global install) |

### One-line pitch
> Score the readability of every Markdown and AsciiDoc file in a folder — in one command.

### Elevator pitch (for hero block)
A zero-config CLI that walks a documentation folder, runs the Flesch–Kincaid
readability test on every `.md` and `.adoc` file, and tells you exactly how
hard your docs are to read — with sentence, word, syllable, and acronym
breakdowns to back it up.

### Target audience
- **Technical writers** maintaining large documentation sets
- **DevRel and developer-experience teams** auditing docs quality
- **Open-source maintainers** keeping READMEs approachable
- **Editors and content ops** who think in folders, not single files

### Voice & tone
Practical, dev-friendly, no-nonsense. Think "Prettier for prose readability."
Confident without being salesy. Code- and CLI-first.

---

## 2. Visual direction

### Mood
Quiet, editorial, terminal-adjacent. Documentation is the subject matter, so
the page should feel like a piece of well-typeset documentation itself.

### Palette (suggested)
- **Background**: off-white / paper (`#FAF8F3`) or deep slate dark mode (`#0F1115`)
- **Ink**: near-black (`#15171A`) for body text
- **Accent**: a single saturated highlight — suggest **highlighter yellow**
  (`#FFE45C`) or **reading-pen green** (`#7BC97A`) — used sparingly for scores,
  CTAs, and inline marks
- **Muted**: warm grey (`#6B6B6B`) for meta text

### Typography
- **Headings**: a confident serif (Fraunces, Source Serif, or Newsreader) — it
  reinforces the "readability" theme
- **Body**: a clean humanist sans (Inter, Geist, or system-ui)
- **Code & CLI**: a monospace with good ligatures (JetBrains Mono, Geist Mono)

### Visual motifs to use
- A **score chip** — a circular or pill badge showing a number like `72.4`
  with its rating underneath. Reuse it as the page's signature element.
- **Highlighter underline** behind key phrases — evokes editing a draft.
- A **mock terminal** in the hero showing the progress bar mid-run.
- Subtle paper-grain texture is welcome; avoid stock illustrations.

### Layout
- Single-column, generous line-length (≈ 65ch for prose), large vertical
  rhythm. Dark mode toggle in the top nav.

---

## 3. Required sections (must-haves)

The page must contain these four blocks, in this order, with a sticky in-page
nav linking to each.

### 3.1 App information
**Goal:** Tell a visitor in 10 seconds what this is and why it exists.

Content to include:
- Product name + one-line pitch
- Hero CTA: `npm install @alexneri/readability-ts -g` — one-click copy
- Secondary CTA: "View on GitHub"
- Badges row: npm version, license (GPL-3.0), Node ≥ 18, "CLI"
- A short paragraph (the elevator pitch above)
- A 3-up feature grid:
  1. **Recursive** — scans every nested folder
  2. **Multi-format** — `.md` and `.adoc` out of the box
  3. **Beyond a single score** — also reports sentence count, word count,
     average word length, avg syllables, code-block presence, and acronym count
- A live-style score chip showing a sample score (e.g. `72.4 — Plain English`)

### 3.2 App updates feed
**Goal:** Show the project is alive and what shipped recently.

Render as a **vertical timeline** with date, version tag, and a short
description. Use this as the seed content (sourced from the git history):

| Date | Version | Update |
|---|---|---|
| 2024-11-25 | **v0.8.0** | **Markdown support + richer metrics.** Added `.md` file support and extended the report with sentence count, word count, average word length, average syllables, code-block presence, and acronym count — both in `scores.txt` and the per-file header comment. |
| 2024-11-21 | — | Documentation refresh: clearer install and usage flow in the README. |
| 2024-11-20 | **v0.1.0** | **Published to npm.** Installable globally as `readability-ts`; converted from a script into a proper CLI command. |
| 2024-11-20 | — | Initial working release: recursive scan of `.adoc` files with Flesch–Kincaid scoring and `scores.txt` output. |

Include a **"What's next"** sub-block surfacing the roadmap from the README:
- More tests
- More documentation
- More supported file formats
- More supported languages
- More readability tests (beyond Flesch–Kincaid)

End with a "Request a feature" link to the GitHub issues page.

### 3.3 How it works
**Goal:** Demystify the pipeline. Reader should be able to explain it to a
teammate after reading.

Render as a **4-step horizontal flow** with iconography, then expand each
step in prose below.

1. **Scan** — Recursively walks the folder you point it at, collecting every
   `.adoc` and `.md` file.
2. **Clean** — Strips AsciiDoc/Markdown markup (headings like `==`, rule lines
   `----`, fenced code blocks, attribute lists `[...]`) so the score reflects
   prose, not syntax.
3. **Score** — Applies the Flesch–Kincaid formula
   `206.835 − 1.015 × (words/sentences) − 84.6 × (syllables/words)`,
   clamped to 0–100, plus counts sentences, words, syllables, and acronyms.
4. **Annotate & summarise** — Prepends a comment block with the score and
   stats to the top of each file, then writes a combined `scores.txt` summary
   at the root of the scanned folder.

Include a **rating-scale legend** as a horizontal gradient bar, with each
band labelled:

| Score | Rating |
|---|---|
| 90–100 | Very easy (6th grade) |
| 80–89  | Fairly easy (7th grade) |
| 70–79  | Plain English (8–9th grade) |
| 60–69  | Fairly difficult (10–12th grade) |
| 50–59  | Difficult (College) |
| 30–49  | Very difficult (College grad) |
| 0–29   | Extremely difficult (Professional) |

Add a small footnote linking to the Wikipedia article on Flesch–Kincaid and
the original 1948 research paper (links are in the README's "Further reading"
section).

### 3.4 How to use
**Goal:** Get a new user running in under a minute.

Two parallel install paths, presented as **tabs**:

**Tab 1 — npm (recommended)**
```bash
npm install @alexneri/readability-ts -g
```

**Tab 2 — From source**
```bash
git clone git@github.com:alexneri/readability-folder-ts.git
cd readability-folder-ts
npm install
npm link
```

Then a **"Run it" block**, copy-pasteable:

```bash
# Scan a specific folder
readability-ts /path/to/folder

# Or scan the current folder
readability-ts
```

Follow with a **"What you'll see"** panel — a styled mock terminal showing:

```
Progress: [==========================               ] 52%

Readability scores computed! Total files processed: 47 in 1.83 seconds.
Summary of scores saved to scores.txt
```

And a **"What gets written"** panel — a styled file preview showing the
comment prepended to a file:

```
// Readability score: 72.41
// 8th & 9th grade - Plain English. Easily understood by 13- to 15-year-old students.
// File length: 142, Sentence count: 38, Word count: 612, Average word length: 4.81,
//   Average syllables per word: 1.52, Code present: Yes, Acronyms: 7
```

Close the section with a small **"Troubleshooting"** disclosure list:
- "No `.adoc` or `.md` files found." → confirm the path
- Permissions error → the tool writes back to each file; ensure write access

---

## 4. Supporting sections (nice-to-have)

- **FAQ** (3–5 questions): Why Flesch–Kincaid? Does it modify my files? Will
  it ever support `.rst` / `.txt` / `.html`? Is the score localised? How do I
  uninstall?
- **Sponsor band** — a slim strip linking to the GitHub sponsor page
  (`github.com/sponsors/alexneri`), framed as "If this saved you an
  afternoon, throw a coffee."
- **Footer** — license (GPL-3.0), author credit, repo, issues, npm, sponsor.

---

## 5. Interaction notes

- All shell snippets get a one-click **Copy** button.
- The score chip in the hero can animate on load: count up from 0 to the
  sample value, then settle.
- Rating-scale legend: hovering a band reveals the full rating sentence.
- Updates timeline: each entry is collapsible if the description is long.
- Respect `prefers-reduced-motion` — no count-up if disabled.

## 6. Accessibility & responsiveness

- WCAG AA contrast for all text, including code blocks.
- Score chip must not rely on colour alone — the numeric value and rating
  label carry the meaning.
- Mobile: single column, sticky in-page nav collapses to a section selector.
- Code blocks scroll horizontally on small screens; never wrap mid-token.

## 7. Out of scope

- No web-based scoring tool on the page (this is a CLI; the page sells the
  CLI). A future hosted version may justify a playground later.
- No login, no analytics walls, no newsletter modal.

---

## 8. Deliverables expected from Claude Design

1. Desktop and mobile hi-fi mockups of the homepage.
2. Component spec for the **score chip** and the **rating-scale legend** —
   they should be reusable.
3. Dark and light theme variants.
4. Copy is open to refinement; treat the text above as canonical content but
   tighten where it improves scan-ability.
