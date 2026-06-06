# Legend in the Mist — Hero Tracker

A single-file HTML5 **player companion app** for the *Legend in the Mist* RPG (Son of Oak
Game Studio), built as a Progressive Web App for iPhone/iPad and Android. It replaces the
paper Hero Card + Theme Cards + Tracking Cards with a touch-friendly sheet and a
rule-correct **2d6 + Power** dice roller.

> Unofficial fan tool. Rules © Son of Oak Game Studio. All rules content in this app is
> derived **solely from the Legend in the Mist Core Rulebook** (sourced via the project's
> NotebookLM notebook `Legend In The Mist: Core Rulebook`, id `ee1b1502-78a0-4b9e-9e26-a0662816ec0b`).

> ### 📌 Standing rule: keep this file current
> **Every time an update is made to the app, this `CLAUDE.md` MUST be updated in the same
> change** — before the work is considered done. This includes new/changed features, the
> "Implemented Features" list, the Roadmap (move done items out, re-prioritise), the
> "Current state" stats (line count, `CACHE_VERSION`, localStorage keys), and the state model.
> Treat a code change without a matching `CLAUDE.md` update as incomplete.

---

## Project Overview

**Purpose**: Give a *player* (not the Narrator) everything they touch at the table — their
Hero, the Fellowship, live conditions, and dice — in one offline app that does the Power
math for them.

**Target devices**: iPhone, iPad, Android (Safari/Chrome → Add to Home Screen).

**Status**: **v1 shipped.** Full Hero/Theme/Fellowship sheet, status + story-tag tracking,
and a rule-faithful roller (Power counting, burn, Might, statuses, outcome tiers, Rule of
Minimum One, Push-your-luck hint). Character *creation aids* (tropes/theme kits/themebooks)
and *Narrator-side* content (Challenges, bestiary) are intentionally **not** in v1 — see Roadmap.

---

## Architecture

### Current state (verify before quoting — figures drift)

Last verified: **2026-06-06** (Phase 2 + polish + Phase 5 play loop + Phase 3 Special
Improvements + Phase 4 development automation + Phase 6 scene board & camp/sojourn + Phase 7
searchable reference). Re-run to refresh:

```bash
wc -lc character-tracker.html              # size + line count
grep CACHE_VERSION sw.js                    # service-worker cache version (bump on deploy)
grep -o "litm-[a-z0-9-]*" character-tracker.html | sort -u   # localStorage keys
```

As of last verification:
- **`character-tracker.html`**: ~2,190 lines / ~287 KB (includes the embedded Phase-2 dataset +
  Quintessence list + Might table + Core-Book Action-Grimoire examples + the Gerrin tutorial +
  the Action Grimoire supplement catalog, ~190 KB of it `LITM_DATA`).
- **`sw.js` `CACHE_VERSION`**: `litm-v16` (bump on every deploy)
- **SW strategy**: HTML/navigations **network-first** (fresh deploy on next online load),
  static assets cache-first. Mirrors the TOR2E Tracker SW pattern.
- **localStorage keys (4)**:
  - `litm-roster-v1` — array of all heroes (each hero is the full state object)
  - `litm-active-v1` — id of the currently open hero
  - `litm-rolls-v1` — last 40 dice rolls
  - `litm-theme` — `'light'` / `'dark'` / unset = auto (`prefers-color-scheme`)
  - (`litm-hero` appears only as the default export filename stem, not a storage key)

### Stack
- **Pure HTML5 + CSS + vanilla JS** — no frameworks, no runtime dependencies.
- **Single file at runtime**: `character-tracker.html`, mirrored verbatim to `index.html`.
  Still works offline from `file://` with zero config.
- **Storage**: `localStorage` only. No network calls at runtime.
- **A small build step now assembles the file** (Phase 2 added a large rules dataset). The
  shipped HTML is still one self-contained file — see **Build process** below.

### Build process (since Phase 2)
The creation-wizard data is too large to hand-edit inline, so the HTML is assembled from
three sources in `_build/` and injected:
- `_build/base.html` — the hand-written app shell (everything except the Phase-2 block).
- `_build/litm-data.json` — the rules dataset (themebooks, theme kits, special improvements,
  tropes, fellowship kits, relationship tags, general store), **parsed from the Core Book**.
- `_build/quintessences.json` — the **Quintessence** list (name + verbatim effect + a one-line
  `mechanical` note), sourced from the Core Book via NotebookLM (not the PDF parser).
  `inject.py` merges it into `LITM_DATA.quintessences`, so `parse_litm.py` can't clobber it.
- `_build/specials-override.json` — authoritative **Special Improvements** for the five theme
  types whose 5th entry the parser drops (Personality, Influence, Destiny, Companion,
  Possessions). `inject.py` merges these over `LITM_DATA.specials`, so all 20 types have 5.
- `_build/might-table.json` — the **per-Might example-action table** (Climb/Archery/… at
  Origin/Adventure/Greatness), from the Core Book via NotebookLM. Merged into
  `LITM_DATA.mightTable`; rendered in the Reference tab's Might section (`renderMightRef`).
- `_build/grimoire.json` — the Core Book's **Action Grimoire** worked examples (verbatim
  cost+effect spends per scenario, action & reaction). Merged into `LITM_DATA.grimoire`;
  rendered in the Reference tab's Action-Grimoire section grouped by scenario (`renderGrimoireRef`).
- `_build/tutorial.json` — the Core Book's **Gerrin deer-stalker tutorial** (11 steps,
  title + verbatim text). Merged into `LITM_DATA.tutorial`; shown in the paginated tutorial
  overlay (`openTutorial`/`renderTutorial`, `#tutorialOverlay`).
- `_build/action-grimoire.json` — the **Action Grimoire supplement** catalog (a *separate book*
  from the Core Rulebook): sections of action entries, each with action examples, explanation,
  Power helps/hinders, Success effects, Extra Feats, Consequences, Might. Merged into
  `LITM_DATA.actionGrimoire`; shown in the searchable Action-Grimoire browser
  (`openAG`/`renderAG`, `#agOverlay`). **Partial** — being filled in section by section.
- `_build/wizard.js` — the self-contained creation-wizard module (injects its own CSS/DOM,
  hooks the "New Hero" buttons).
- `_build/parse_litm.py` — regenerates `litm-data.json` from the Core Book raw text (the
  NotebookLM `source_get_content` dump of *Legend In The Mist - Core Book.pdf*).
- `_build/inject.py` — **idempotent**: `base.html` + `litm-data.json` + `quintessences.json` +
  `specials-override.json` + `might-table.json` + `grimoire.json` + `tutorial.json` +
  `action-grimoire.json` + `wizard.js` → `character-tracker.html` **and** `index.html`
  (mirrors automatically).

```bash
python3 _build/inject.py     # rebuild character-tracker.html + index.html from sources
# (only if re-extracting data:)  python3 _build/parse_litm.py <corebook.txt> _build/litm-data.json
```

**Editing rules:** change the app shell in `_build/base.html`, the wizard in
`_build/wizard.js`, or the data in `_build/litm-data.json`, then run `inject.py`. Do **not**
hand-edit the injected Phase-2 block inside `character-tracker.html` — it will be overwritten.
(Small shell-only tweaks may still be made directly in the HTML, but keep `base.html` in sync.)

### Why single-file (same rationale as the TOR2E Tracker)
- Works offline from the iOS Files app / `file://` — no server needed.
- "Add to Home Screen" with zero config.
- One file to AirDrop / back up / sync via iCloud.

### ⚠️ Canonical file & mirror rule
`character-tracker.html` is the **canonical** file. After **every** edit, mirror it to
`index.html` (they must be byte-identical):

```bash
cp character-tracker.html index.html
```

The PWA `start_url` is `./index.html`; the dev/preview entry is also `index.html`.

### File layout (within `character-tracker.html`)
1. `<head>` — viewport, PWA meta, inline SVG app icon (data-URI), `manifest.json` link.
2. `<style>` — CSS variables for light/dark; rulebook tag palette (power=yellow,
   weakness=orange, status=green); teal/mist "rustic fantasy" theme.
3. `<header>` — sticky title + 👥 roster + ☰ menu, then a 5-tab nav.
4. `<section.panel>` ×5 — **Hero / Fellowship / Tracking / Roll / Rules**.
5. Overlays — Menu sheet, Roster sheet, Tutorial sheet, hidden import `<input type=file>`, toast.
6. `<script>` — state model, render functions, roller, persistence, theme; then the injected
   **Phase-2 block** (`LITM_DATA` + the creation-wizard IIFE, which appends its own overlay
   DOM and CSS at runtime); then SW register.

### Supporting files
- `index.html` — byte-identical mirror of the canonical file (auto-written by `inject.py`).
- `manifest.json` — PWA manifest (`theme_color` `#2e5d52`, icons).
- `sw.js` — service worker (`CACHE_VERSION`).
- `icon.svg` + `icon-192.png` + `icon-512.png` — app icon (misty stag antlers + "LITM").
- `.claude/launch.json` — local preview server config (`python3 -m http.server`).
- `_build/` — build sources (see **Build process**): `base.html`, `wizard.js`,
  `litm-data.json`, `quintessences.json`, `specials-override.json`, `might-table.json`,
  `grimoire.json`, `tutorial.json`, `action-grimoire.json`, `parse_litm.py`, `inject.py`.

### Data constants in `<script>`
- `THEME_TYPES` — all **20 theme types** grouped by Might:
  - **Origin**: Circumstance, Devotion, Past, People, Personality, Skill or Trade, Trait
  - **Adventure**: Duty, Influence, Knowledge, Prodigious Ability, Relic, Uncanny Being
  - **Greatness**: Destiny, Dominion, Mastery, Monstrosity
  - **Any Might**: Companion, Magic, Possessions
- `MIGHT_OF` — maps each type → `origin|adventure|greatness|any` for the Might badge.
- `LITM_DATA` (injected) — the Phase-2 rules dataset consumed by the wizard:
  - `themebooks` — 20 types × {concept, powerQ[], weakQ[], questIdeas[]}
  - `themekits` — 20 types × ~6 kits × {name, power[], weak[], quest}  (**113 kits**)
  - `specials` — 20 types × Special Improvements {name, desc}, **5 per type (complete)**. The
    PDF parser dropped the 5th for five types (Personality, Influence, Destiny, Companion,
    Possessions); those five are now supplied authoritatively by `_build/specials-override.json`
    (sourced via NotebookLM) and merged over the parsed data in `inject.py`.
  - `tropes` — 28 × {name, themes[3], fourth[3], backpack[]}
  - `fellowshipKits` — 6 × {name, power[], weak[], quest}
  - `relationship` — relationship-tag examples grouped in 4 categories
  - `generalStore` — backpack item suggestions grouped in 6 categories
  - `quintessences` (merged from `_build/quintessences.json`) — **18** × {name, effect,
    mechanical}. Consumed by the Moment-of-Fulfillment picker (`litmQuintessences()`) and the
    searchable Reference tab; `hasQuintessence(name)` substring-matches the hero's free-text
    Quintessences field to drive roller encodings (currently **Beyond Luck**).

### State model (one hero)
```
{ id, playerName, heroName, promise(0–5), fulfillments, quintessences, notes,
  backpack:[{text,type:'story'|'hindering',scratched}],
  themes:[{type,title,power:[{text,scratched}],weak:[{text}],quest,improve,abandon,milestone,
           special(free-text notes),specials:[{name,desc}]}] ×4 (variable),
  fellowship:{…same shape as a theme…},
  relationships:[{name,tag,scratched}],
  statuses:[{name,boxes:[6×bool],limit:1–6}],   // limit defaults to 5 (Hero); legacy/unset → 5
  scene:[{text,type,scratched}],
  sceneBoard:{step:-1|0|1|2, stakes, threats} }
```

---

## Implemented Features

All of the following are **rule-grounded** in the Core Rulebook.

### Hero Creation Wizard (Phase 2) ✅
Opened by any **New Hero** button (menu + roster). Self-contained module in `_build/wizard.js`,
data in `LITM_DATA`. Full-screen stepper with progress bar, Back/Next, light/dark aware.
- **Path chooser** — three rulebook methods:
  - **⚡ Quickest** — pick one of **28 Tropes** (each = 3 themes + a suggested 4th). The wizard
    then walks all 4 themes; each shows its **Theme Kit** (type + kit selectors) with the kit's
    **power-tag** (choose 2) and **weakness-tag** (choose 1) options as tap-chips, plus an
    editable title and Quest (kit default). Trope's backpack suggestions feed the store step.
  - **📖 Detailed** — per theme, pick a type and answer its **Themebook**: the concept blurb,
    the lettered **Power Tag Questions** and **Weakness Tag Questions**, and **Quest Ideas**,
    with inputs to turn answers into the title/power/weakness tags + Quest.
  - **✍️ Simplest** — name + blank sheet (the original v1 behavior).
- **General Store** step — pick one starting **backpack** story tag from trope suggestions +
  6 curated categories (armor/weapons/shields/gear/valuables), or type your own.
- **Fellowship** step — choose one of **6 Fellowship kits** (or skip) and build a
  **per-fellow relationship table** (a row per fellow Hero: name + tag; suggestion chips
  from the rulebook's 4 categories fill the last row).
- **Origin-only nudge** — warns when a chosen theme type is Adventure/Greatness Might, since a
  typical rustic-fantasy start is mostly Origin.
- On finish, builds a full hero (normalising kit strings → sheet tag objects), adds it to the
  roster, opens the Hero tab.

> **Data quality:** the 112→**113** theme kits are parsed from the PDF. The power/weakness
> split is recovered by line-group (power and weakness are separate visual boxes, so a tag
> never wraps across the boundary), and quests are detected as the trailing prose/quoted-saying
> line. After the Phase-2 polish pass this is clean across the board — **one** known wrapped-quest
> artifact remains (Relic → *Heirloom Longsword*, a merged weakness/quest tag), cosmetic and
> editable on the sheet. Themebooks (Detailed path) are clean. To tweak parsing, edit
> `_build/parse_litm.py` and re-run `inject.py`.

## Sheet & Play Features (v1)

### Hero Card
- Player name, Hero name (drives the header title).
- **Promise** track (5 circles). Hint explains Moments of Fulfillment.
- **Moments of Fulfillment** counter (+/−).
- **Quintessences** free-text (permanent rule-breaking qualities).
- **Backpack** story tags — start with one; flip helpful 🟡 / hindering 🟠; scratch ✓
  (single-use removal); add/remove.
- **Notes** free-text.

### Theme Cards (4 by default; add/remove supported for evolution/replacement)
- **Theme type** dropdown (all 20, grouped) with live **Might badge** (Origin/Adventure/Greatness/Any).
- **Title** (the theme's main power tag).
- **Power tags** — add/remove, scratch/recover (✓).
- **Weakness tags** — add/remove (orange; reminder that invoking them marks Improve).
- **Quest** text.
- **Improve / Abandon / Milestone** tracks (3 pips each), per the development rules. Filling a
  track (3rd mark) **auto-opens the matching development flow** (see Theme Development below); a
  **Resolve** button also appears under any track sitting at 3.
- **Special Improvements (Phase 3)** — a real **picker** (not free text): a 🔖 modal lists the
  improvements for the theme's type (from `LITM_DATA.specials`; **5 per type, all 20 complete**),
  each with its rulebook
  benefit; tap to add/remove (each once per theme). Chosen ones show as removable cards on the
  card; eligibility hint ("gain one when the Improve track fills"). A separate **Notes**
  free-text box preserves the old `special` field. Works the same on the Fellowship card.

### Theme Development automation (Phase 4) ✅
A single development overlay (`#devOverlay`, `openDev`/`renderDev`/`endDev`) auto-opens when a
theme fills a track, and resets the track on completion:
- **Improve (3 → improvement)** — gain a new **power tag** (inline input) or route into the
  Special-Improvement picker, or just reset the track.
- **Milestone (3 → evolve)** — light **transformation editor** (revise title / type+Might /
  Quest; tags & Special Improvements carry over) → **marks Promise**.
- **Abandon (3 → replace)** — resets the theme to a blank one (keeps its id so roller refs stay
  valid) → **marks Promise**, plus a **Promise-trading helper**: a checklist of the theme's
  extra parts (power tags beyond 3, weaknesses beyond 1, each Special Improvement), each worth
  **+1 Promise**, with a live "+N Promise" preview.
- **Promise → Moment of Fulfillment** — reaching **5** Promise (via a development flow *or*
  manually tapping the pips) opens the **MoF prompt** (`openMoF`/`renderMoF`): increments
  Fulfillments, resets Promise carrying over the overflow, and runs a **guided Quintessence
  picker** (Phase 3 ✅) — a scrollable list of the **18** Core-Book Quintessences (name +
  verbatim effect from `LITM_DATA.quintessences`); tap to choose (already-owned ones show
  "✓ have" and are disabled), plus a custom/notes box. Claiming appends "Name — effect" (and
  any note) to the Hero's Quintessences field. **Beyond Luck** is **encoded in the roller**:
  when the hero has it (`hasQuintessence`), double ones no longer auto-miss and the outcome
  shows a "✨ Beyond Luck" note.
- Helpers: `markPromise`, `tradeableParts`, `typeOptionsHTML`, `refreshSheet`. Uses only
  existing state fields (promise/fulfillments/quintessences + per-theme tracks) — no new keys.

### Fellowship
- A full shared theme card (type, title, single-use power tags, weakness, quest, tracks,
  special improvements).
- **Fellowship relationships** — name + single-use relationship tag per fellow Hero, scratchable.

### Tracking
- **Statuses** — named, with a **6-box tier track**. Tap to set/clear tier (clearing a box
  also clears boxes to its right). Highlights the current tier. A per-status **Limit selector
  (1–6)** sets when the target is taken out — a Hero defaults to **5** (overcome at 5,
  killed/transformed at 6); lower it for a Challenge/foe. The Limit box is dash-outlined; the
  warning fires at `tier ≥ limit` ("taken out", or "overcome"/"killed or transformed" at the
  Hero defaults). `statusLimit(st)` falls back to 5 for legacy/unset/out-of-range values.
- **Scene story tags** — environment/temporary tags; flip helpful/hindering; remove.
- **Scene board (Phase 6)** — a 🎬 card with the game-loop selector (Establish → Action →
  Consequences), a **stakes** field, and a **challenges/threats** note. Persisted per hero in
  `sceneBoard`. Includes the **Camp / Sojourn…** entry point.

### Camping & Sojourn (Phase 6) ✅
A guided overlay (`#campOverlay`, `openCamp`/`renderCamp`) that actually restores the sheet,
opened from the Scene card or the ☰ menu. Single scrolling sheet:
- **1 · Expire story tags** — checklist of scene tags (checked = expire); removes the chosen ones.
- **2 · Establish the place** — add a haven story tag to the scene.
- **3 · Activities** — 2 (or **3** via the "Took Consequences" toggle), with a used/limit counter:
  **Rest** (un-scratches every scratched power tag — themes/title/fellowship/backpack — and
  reduces each status by 1 tier), **Reflect** (marks Improve on a chosen theme), **Camp Action**
  (logged advisory: count Power, spend half without rolling, or roll on the Roll tab).
- **4 · Recover one Fellowship part** — un-scratch a chosen Fellowship power tag *or* renew a
  scratched relationship tag.
- A running "This camp" log; each action applies to the sheet immediately (`renderAll`).

### Roll (the headline feature) — rule-correct **2d6 + Power**
- Auto-collects every eligible tag from the sheet (theme titles, power tags, weakness tags,
  fellowship tags, backpack + scene story tags) and all active statuses.
- Tap a tag to count it: helpful (+1) → hindering (−1) → off. Weakness tags toggle as a −1.
- **Burn a tag** 🔥 — one helpful tag gives **+3** instead of +1 (and is flagged to scratch).
- **Status math** — only the single highest helpful and single highest hindering status count.
- **Might** segmented control: Extr. Imperiled −6 / Imperiled −3 / Matched / Favored +3 / Extr. Favored +6.
- **Situational** ± stepper for any other foe/environment tags the Narrator invokes.
- Live **Power** readout; animated dice; outcome banner:
  - **10+** Success (no Consequences) · **7–9** Success & Consequences · **6−** Consequences
  - Double 6 = guaranteed Success; double 1 = guaranteed Consequences (regardless of Power) —
    unless the hero has the **Beyond Luck** Quintessence, which removes the double-ones auto-miss.
  - On success: **Power to spend** with **Rule of Minimum One**; **Push-your-luck** hint on 10+.
  - **Weakness invoked → mark Improve** reminder.
- **Roll history** (last 20).

### Play loop (Phase 5) ✅ — closing the loop the roller opens
- **Action / Reaction toggle** at the top of the Roll tab. Reaction outcome follows the
  reaction rules: **10+** spend **Power+1** on any Effect · **7–9** spend Power only to lessen
  · **6−** take the Consequences as-is. (Header/button/hint switch with the mode.)
- **Burn actually scratches** — confirming a roll with a burned tag scratches that tag in
  state (power/story tags; theme titles via `_titleScr`; scene tags removed) and notes it in
  the result. The sheet + roller re-render so the tag shows scratched.
- **Interactive Effect-spender** (`#spendBox`) appears after any successful roll (action or
  reaction) with a live **Power budget**. Effects deduct the rulebook costs and **apply to the
  sheet**:
  - **＋ Status** — give yourself a status at a chosen tier (rules-correct stacking: spills to
    the next free box). Cost = tier.
  - **− Status** — reduce one of your statuses by N (shifts marks left). Cost = N.
  - **＋ Backpack** — add a story tag to your backpack (cost 2; **1** as a single-use tag when
    only 1 Power is left).
  - **Recover** — un-scratch one of your scratched tags. Cost 2.
  - **Detail · 1**, **Feat · 1**, **Other…** (give a foe a status, etc. — logged, deducts a
    chosen cost). A running "Spent:" log is shown; "Done" closes the panel.
  - Helpers: `giveStatusTier`, `reduceStatusByAmt`, `scratchTagById`/`recoverTagById`/
    `scratchedTags`, `openSpend`/`doSpend`/`renderSpend`/`drawSpForm`. Form inputs persist
    across stepper re-renders (values stored on the form-state object).

### Reference tab — searchable (Phase 7) ✅
A **search box** (`filterRef`) filters every reference row live; sections collapse when they
have no match, with a "no entries match" note. Ten `.ref-sec` blocks, all rules-grounded:
**Getting started** (app onboarding — original content), **Counting Power**, **Might · Favored
& Imperiled** (the mechanic: task-Might vs your Might → ±3/±6, grounded in the roller's Might
control, **plus a per-Might example-action table** from `LITM_DATA.mightTable` via
`renderMightRef`), **Roll 2d6 + Power**, **Action Grimoire — spending Power** (the Effect costs
enforced by the spender, **plus the Core-Book's verbatim worked examples** grouped by scenario
from `LITM_DATA.grimoire` via `renderGrimoireRef`), **Reactions**, **Statuses**, **Hero
Development** (incl. Promise → Moment of Fulfillment), **Quintessences** (all 18, name +
verbatim effect), **Camping**. The Might example-table, Action-Grimoire examples, and the
Quintessences list are built at runtime via `renderRefData` (→ `renderMightRef` +
`renderGrimoireRef` + `renderQuintRef`), since `LITM_DATA` is injected after boot. *(The 5E
crossover is deferred — it needs a source not reachable here; see Roadmap Phase 7.)*

### Tutorial — the Gerrin walkthrough (Phase 7) ✅
A paginated **tutorial overlay** (`#tutorialOverlay`, `openTutorial`/`renderTutorial`/
`closeTutorial`) presenting the Core Book's 11-step Gerrin deer-stalker introduction (data in
`LITM_DATA.tutorial`). Back / Next / Finish navigation with a "Step N of 11" counter; each
step's text is split into paragraphs and HTML-escaped. Opened from the **▶ Play the
interactive tutorial** button in the Reference tab's Getting-started section and the **📖
Tutorial** ☰ menu item. Reopening always resets to step 1 (no new localStorage key).

### Action Grimoire browser (supplement) — 🚧 in progress
A searchable **browser overlay** (`#agOverlay`, `openAG`/`renderAG`/`closeAG`, `litmActionGrimoire()`)
for the standalone **Action Grimoire** supplement (a *separate book* from the Core Rulebook). Data
in `LITM_DATA.actionGrimoire` (from `_build/action-grimoire.json`): sections of action entries, each
rendered as a collapsible `<details>` card showing action examples, explanation, Power **helps**/
**hinders**, **Success** effects, **Extra Feats**, **Consequences**, and any **Might** note. A search
box filters across all entry text and auto-expands matches. Opened from a **📜 Browse the Action
Grimoire** button in the Reference tab's Action-Grimoire section and the **📜 Action Grimoire** ☰ menu
item. **Partial dataset** — currently **Crafting** + **Direct Attacks** (6 entries); being filled
in section by section (see Roadmap Phase 7). No new localStorage key.

### App-level
- **Multi-hero roster** (create / switch / delete).
- **Export / import** a hero as JSON.
- **Light/dark** theme (manual + auto), iOS safe-area aware, installable PWA, fully offline.
- **PWA update banner** — when the service worker installs a newer version, a bottom banner
  ("New version ready — tap to update") appears. **Update** posts `SKIP_WAITING` to the waiting
  worker and reloads once on `controllerchange` (guarded so it reloads exactly once); **✕**
  dismisses it. Wired in the SW-registration block (`showUpdateBanner`/`applyUpdate`/
  `dismissUpdate`, `#updateBanner`); detects both an already-`waiting` worker and a fresh
  `updatefound`→`installed` transition (only when the page is already controlled, so first
  install is silent).

---

## Roadmap — *based solely on the game's rules*

Every item below corresponds to a real subsystem in the Core Rulebook. Ordered roughly by
value-to-a-player and build cost. None require invented mechanics.

### Phase 2 — Guided Character & Fellowship Creation ✅ DONE (2026-06-05)
Shipped as the **Hero Creation Wizard** (see Implemented Features). All three creation paths
(Simplest / Quickest-tropes+kits / Detailed-themebooks), General Store, Fellowship kits +
relationship tags, and the Origin-start nudge are in. Data: 28 tropes, 112 theme kits, 20
themebooks, 20 special-improvement sets, 6 fellowship kits — parsed from the Core Book.
- [x] Tropes picker (28, incl. Dales tropes)
- [x] Theme Kits (per-type, choose 2 power + 1 weakness, suggested Quest)
- [x] Themebooks (Detailed Way, 20 questionnaires)
- [x] General Store (curated suggestions + trope backpack)
- [x] Fellowship creation (6 kits + **per-fellow relationship table**: a row per fellow Hero
      with name + tag; suggestion chips fill the last row)
- [x] Origin-start nudge (warns on Adventure/Greatness picks)
- [x] **Polish pass (2026-06-05):** rewrote kit power/weakness parsing in `parse_litm.py`
      (line-group split + glued-marker handling + saying/wrapped-quest detection) — down from
      ~37 artifacts to **1**; added the per-fellow relationship table.
- [ ] *Remaining follow-ups:* the single *Heirloom Longsword* wrapped-quest artifact; expose
      **Special Improvements** (already in `LITM_DATA.specials`) as kit-creation hints.

### Phase 3 — Theme Special Improvements & Quintessences ✅ DONE (2026-06-06)
*Special Improvements **and** the Quintessence picker now ship. The Quintessence list (18,
name + verbatim effect) was sourced from the Core Book via NotebookLM and lives in
`_build/quintessences.json` (merged into `LITM_DATA.quintessences` by `inject.py`).*
- [x] **Special Improvements** — each of the 20 theme types has exactly **5**; selectable
      (each once). Replaced the free-text box with a real **picker** (🔖 modal `#specialOverlay`,
      `openSpecialPicker`/`renderSpecialPicker`/`toggleSpecial`, data via `litmSpecials(type)`)
      that records the chosen improvement and its rule benefit on `theme.specials:[{name,desc}]`.
      Chosen ones render as removable cards; a Notes box preserves the legacy `special` string.
      Works on themes **and** the Fellowship card.
- [x] **Quintessence** picker at a Moment of Fulfillment — the guided MoF picker (`renderMoF`)
      lists all 18 Quintessences (name + verbatim effect), tap-to-choose with already-owned
      ones disabled, plus a custom/notes box; claiming appends "Name — effect" to the Hero's
      Quintessences. Also surfaced in the searchable Reference tab (`renderQuintRef`).
- [x] Encode *Beyond Luck* in the roller — when the hero has it (`hasQuintessence`), double
      ones no longer auto-miss and the outcome shows a "✨ Beyond Luck" note. *(Other
      Quintessences with a `mechanical` note — Larger Than Life, Loyal Companion, Lucky Bastard,
      Virtuoso, etc. — are once-per-session / contextual player choices, left as recorded text
      rather than auto-applied; revisit if a manual-trigger UI is wanted.)*
- [x] *Data-gap follow-up done (2026-06-06):* the **5th** Special Improvement for **Personality,
      Influence, Destiny, Companion, Possessions** (parser dropped one each) is now supplied by
      `_build/specials-override.json` and merged in `inject.py` — all 20 types have 5.

### Phase 4 — Theme Development automation ✅ DONE (2026-06-06)
Shipped as the **theme-development overlay** + **Moment of Fulfillment** prompt (see Implemented
Features → "Theme Development automation"). The MoF reward now runs the guided **Quintessence
picker** (Phase 3 ✅).
- [x] Auto-prompt at the **3rd Improve** (gain improvement, reset track), **3rd Milestone**
      (theme evolves → mark Promise), **3rd Abandon** (theme replaced → mark Promise + trade
      parts for improvements). *(Also a persistent **Resolve** button when a track sits at 3.)*
- [x] **Promise trading** helper — +1 Promise per power tag beyond 3, per weakness beyond 1,
      per Special Improvement traded; triggers the Moment of Fulfillment prompt on filling 5
      (resets Promise carrying over the overflow, bumps Fulfillments, captures a Quintessence).
- [x] **Quests & Transformations** guided flow (evolve vs replace: new title/type/Might,
      revise tags/quest; evolve keeps tags & Special Improvements, replace resets the theme).
- [x] *Follow-up done (2026-06-06):* the free-text Quintessence capture at a Moment of
      Fulfillment is now the guided **Quintessence picker** (Phase 3).

### Phase 5 — Play-loop helpers (player-facing) ✅ MOSTLY DONE (2026-06-05)
Shipped as the **Action/Reaction toggle + burn-scratch + interactive Effect-spender** (see
Implemented Features → "Play loop").
- [x] **Reaction roller** — mode toggle; 10+ Power+1, 7–9 lessen only, 6− take as-is.
- [x] **Effect spender** — interactive "spend your Power" panel; deducts rulebook costs and
      applies results to the sheet (give/reduce status, add backpack tag, recover/scratch tag).
- [x] **Status apply/stack/reduce engine** wired to spending Power (`giveStatusTier` spills to
      the next free box; `reduceStatusByAmt` shifts marks left).
- [x] **Burn-on-roll** scratches the burned tag on roll confirm (`scratchTagById`).
- [ ] **Group / help actions** — combine multiple players' contributed tags; add a Challenge's
      group Might as ± Power. *(Still open — the only Phase-5 item left.)*

### Phase 6 — Scene & session context (still player-side) ✅ MOSTLY DONE (2026-06-06)
Scene board + Camping/Sojourn shipped; only the Journey montage remains.
- [x] **Scene tracker** — current stakes, challenges/threats in view, and the game loop
      (Establish → Action → Consequences) as a lightweight selector. Shipped as the 🎬 Scene
      card on the Tracking tab (persisted in `sceneBoard`).
- [x] **Camping & Sojourn** wizard — expire story tags → establish place → 2 activities (3 with
      Consequences): **Rest** (un-scratch power tags + reduce statuses), **Reflect** (mark
      Improve), **Camp Action** (advisory); then recover a Fellowship power tag or renew a
      relationship tag. Shipped as `#campOverlay` (see Implemented Features → "Camping & Sojourn").
- [ ] **Journey** montage helper — Vignette Challenges resolved with Quick actions. *(Still open
      — the only Phase-6 item left.)*

### Phase 7 — Reference & onboarding ✅ MOSTLY DONE (2026-06-06)
Shipped the **searchable Reference tab** (see Implemented Features → "Reference tab"): live
filter, a Might/Favored/Imperiled mechanic explainer, an Action-Grimoire effects/cost browser,
and a Getting-started onboarding guide — all grounded in rules already encoded in the app. The
remaining items need Core-Book/notebook source text not reachable in this environment.
- [x] **Action Grimoire** browser — searchable effects/cost reference **plus the Core-Book's
      verbatim worked examples** ("Climbing up a ledge", "Taming a wild beast", "Resisting a
      spell of beguilement", …) grouped by scenario, sourced via NotebookLM into
      `_build/grimoire.json` and rendered by `renderGrimoireRef`. ✅ (2026-06-06)
- [x] **Might / Favored / Imperiled** explainer — the mechanic (task-Might vs your Might → ±3/±6),
      **plus the rulebook's per-Might example-action table** (Climb/Archery/Performance/Sneak/
      Craft/Heal at Origin/Adventure/Greatness), sourced via NotebookLM into
      `_build/might-table.json` and rendered by `renderMightRef`. ✅ (2026-06-06)
- [x] Built-in **tutorial** (the Gerrin deer-stalker walkthrough) — a paginated 11-step
      overlay (`openTutorial`, `#tutorialOverlay`) opened from the Getting-started Reference
      section or ☰ menu; data in `_build/tutorial.json` → `LITM_DATA.tutorial`. ✅ (2026-06-06)
      *(Follow-up: optional auto-open on first run; the source dump interleaves narrative and
      rules call-outs, so the text reads as the rulebook pages do.)*
- [ ] **5E D&D crossover** quick-reference (class/race → theme-kit hints).
      *(Blocked: needs the notebook's crossover source.)*
- [ ] 🚧 **Action Grimoire supplement** browser (`#agOverlay`/`renderAG`) — the standalone book's
      full action catalog, searchable. Infrastructure + **Crafting** + **Direct Attacks** shipped
      (2026-06-06); remaining ~17 leaf sections (Tactical Attacks, Support/Movement/Defense,
      Information Gathering, Thievery, Survival, Navigating Danger, Recovery & Healing, the Magic
      sections, Commerce, Community, Influence & Intrigue, Fellowship) + the prose sections are
      being extracted section-by-section from NotebookLM and appended to `_build/action-grimoire.json`.

### Phase 8 — Narrator-adjacent (optional / separate companion)
*Out of scope for a pure player app, but defined in the rules — consider a sibling Narrator
app rather than bloating this one (cf. the TOR2E Loremaster companion).* 
- [ ] **Challenge / adversary profiles** — Might-by-aspect, tags & statuses, Limits, Special
      Features, Vulnerabilities (e.g. the Winter Creature Pack: Wintershade, Mylings, icy
      crossings — already in the notebook).
- [ ] **Frames of Play** — *The Mountain* (single central Series Challenge) and *The
      Crossroads* (multiple evolving **Fronts**) campaign trackers.

### Cross-cutting / tech debt
- [ ] **Share / sync a Fellowship** — the Fellowship theme + relationship tags are shared
      across players; today each hero stores its own copy. Add export/merge of a Fellowship.
- [x] PWA **update banner** ("New version ready — tap to update") posting `SKIP_WAITING` —
      done (2026-06-06). Reloads once on `controllerchange`; first install stays silent.
- [x] Per-status **custom Limit** (Challenges can have Limits 1–6; Heroes are always 5) —
      done (2026-06-06). `limit` field + selector; `statusLimit()` defaults legacy/unset to 5.
- [ ] Undo/redo; autosave indicator.

---

## How to verify locally
```bash
cd "Legend in the Mist"
python3 -m http.server 4178      # then open http://localhost:4178/index.html
```
Or just open `character-tracker.html` directly (`file://`) — it runs without a server; only
the service worker / install prompt needs http(s).

## Conventions
- **Update this `CLAUDE.md` on every change** — features, Roadmap, and "Current state" stats
  must always reflect the live app. A change isn't done until the docs match (see the
  standing rule at the top of this file).
- Keep it **single-file, dependency-free, offline-first**.
- After any code edit: **mirror to `index.html`** and **bump `CACHE_VERSION`** in `sw.js`.
- Any rules content must be traceable to the Core Rulebook (use the NotebookLM notebook).
- Match the sibling **TOR2E Tracker** patterns (SW strategy, theming, localStorage shape).
