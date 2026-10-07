# Legend in the Mist — Hero Tracker

A single-file HTML5 **player companion app** for the *Legend in the Mist* RPG (Son of Oak
Game Studio), built as a Progressive Web App for iPhone/iPad and Android. It replaces the
paper Hero Card + Theme Cards + Tracking Cards with a touch-friendly sheet and a
rule-correct **2d6 + Power** dice roller.

> Unofficial fan tool. Rules © Son of Oak Game Studio. All rules content in this app is
> derived **solely from the Legend in the Mist Core Rulebook** (sourced via the project's
> NotebookLM notebook `Legend In The Mist: Core Rulebook`, id `ee1b1502-78a0-4b9e-9e26-a0662816ec0b`).

> ### 🗣️ Owner working preferences (standing)
> - **Report progress only as percentages** (5%, 10% … 100%) — don't narrate each step; a brief result at 100%.
> - **Always push to `main`** (also mirror to the session branch). Keep replies short and technical.
> - **Always keep the app faithful to the Core Rulebook** — UI changes must never alter rule mechanics.

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

Last verified: **2026-10-01** (Phase 2 + polish + Phase 5 play loop + Phase 3 Special
Improvements + Phase 4 development automation + Phase 6 scene board & camp/sojourn + Phase 7
searchable reference + the Oracle + the Character-Pack ready-made Heroes + Solo Play in-app guide + the UI refresh). Re-run to refresh:

```bash
wc -lc character-tracker.html              # size + line count
grep CACHE_VERSION sw.js                    # service-worker cache version (bump on deploy)
grep -o "litm-[a-z0-9-]*" character-tracker.html | sort -u   # localStorage keys
```

As of last verification:
- **`character-tracker.html`**: ~4,176 lines / ~807 KB (includes the embedded Cinzel font + SVG icon sprite + UI-refresh CSS/JS, the embedded Phase-2 dataset +
  Quintessence list + Might table + Core-Book Action-Grimoire examples + the Gerrin tutorial +
  the Action Grimoire supplement catalog + the Oracle tables + the Character-Pack ready-made
  Heroes + the inline per-tab How-to-use help + the solo play-loop bridges + the interactive
  Profile Builder + the first-run Welcome onboarding + the Run-a-game guide + the "Play with me"
  coach, ~458 KB of it `LITM_DATA`).
- **`sw.js` `CACHE_VERSION`**: `litm-v65` (bump on every deploy)
- **SW strategy**: HTML/navigations **network-first** (fresh deploy on next online load),
  static assets cache-first. Mirrors the TOR2E Tracker SW pattern.
- **localStorage keys (7)**:
  - `litm-roster-v1` — array of all heroes (each hero is the full state object)
  - `litm-active-v1` — id of the currently open hero
  - `litm-rolls-v1` — last 40 dice rolls
  - `litm-theme` — `'light'` / `'dark'` / unset = auto (`prefers-color-scheme`)
  - `litm-solo` — `'1'` when Solo Play Mode is on (reveals the 🔮 Oracle tab); app-level, not per-hero
  - `litm-seen` — `'1'` once the first-run **Welcome** overlay has been dismissed; app-level, not per-hero
  - `litm-ui` — Display settings JSON `{size:'s'|'m'|'l'|'xl', motion:'auto'|'reduce', haptics:bool}`; app-level
  - (`litm-hero` appears only as the default export filename stem, not a storage key)
  - **sessionStorage** `litm-splashed` — `'1'` once the launch splash has shown this browser session (UI only)

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
- `_build/general-store.json` — the **General Store** backpack suggestions (17 categories, ~217
  items): an *expanded curated suggestions aid* (not a verbatim rules table — players can type
  their own). `inject.py` merges it into `LITM_DATA.generalStore`, replacing `parse_litm.py`'s
  smaller hardcoded list.
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
  (`openAG`/`renderAG`, `#agOverlay`) and loadable into the roller (Phase B, `useAGAction`).
  **Complete** — 19 leaf action sections (101 entries) + 2 prose sections.
- `_build/oracle.json` — **The Oracle** (solo/co-op play) supplement: the Question (interpretive
  d66 + d66 sub-columns + yes/no bands), Conflict (7 columns), Premade Profile (areas +
  creatures/persons/places + vignettes), Profile Builder steps, Challenge Action (11 Roles),
  Consequences (d66), and Revelations (d66 × 3 acts) tables. Merged into `LITM_DATA.oracle`;
  rendered on the 🔮 Oracle tab (`renderOracle`/`drawOracle`).
- `_build/premades.json` — the **Character Pack** supplement (a *separate book*): **20 ready-made
  Heroes**, each with a tagline, flavor quote, tier (`dalesfolk`/`powerful`), 4 fully-built themes
  (type, title, 2 base power tags, weakness, 3 advancement power tags, quest, description, Special
  Improvement), a backpack, and example actions. Parsed from the pack markdown by
  `_build/parse_premades.py`. Merged into `LITM_DATA.premades`; consumed by the wizard's
  **📦 Ready-made Hero** path (`renderPremade`/`commitPremade` in `wizard.js`).
- `_build/fonts/cinzel-sub.woff2` — **Cinzel** display font (OFL, `_build/fonts/OFL-Cinzel.txt`), Latin subset,
  wght 600–700 (~21 KB). `inject.py` base64-embeds it at the `__CINZEL_WOFF2_B64__` marker in `base.html`'s
  `@font-face` (headings/titles only; body stays system sans). Offline-safe.
- `_build/icons.json` + `_build/icons/*.svg` — the **inline SVG icon set** (vendored **Lucide** subset, ISC,
  `_build/icons/LICENSE-lucide.txt`, plus hand-drawn `orb`/`antler` and rulebook-colour `dot-*`). `icons.json`
  maps emoji → icon name; `inject.py` builds a `<symbol>` sprite at `<!--__ICON_SPRITE__-->` and emits
  `const ICON_MAP` at `/*__ICON_MAP__*/`. Add an icon: drop the Lucide SVG in `_build/icons/`, map it in `icons.json`.
- `_build/wizard.js` — the self-contained creation-wizard module (injects its own CSS/DOM,
  hooks the "New Hero" buttons).
- `_build/parse_litm.py` — regenerates `litm-data.json` from the Core Book raw text (the
  NotebookLM `source_get_content` dump of *Legend In The Mist - Core Book.pdf*).
- `_build/parse_premades.py` — regenerates `premades.json` from the Character Pack markdown
  (`python3 _build/parse_premades.py <character_pack.md> _build/premades.json`).
- `_build/inject.py` — **idempotent**: `base.html` + `litm-data.json` + `quintessences.json` +
  `specials-override.json` + `general-store.json` + `might-table.json` + `grimoire.json` +
  `tutorial.json` + `action-grimoire.json` + `oracle.json` + `premades.json` + `wizard.js` →
  `character-tracker.html` **and** `index.html` (mirrors automatically).

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
3. `<header>` — sticky crest (hero switcher) + title + undo/redo + ❓ + ☰. Bottom nav (`#nav`):
   **Play** (`track`) · **Hero** (`hero`) · **Journal** (`journal`) · **Lore** (`ref`) · **Oracle** (`oracle`, solo only).
4. `<section.panel>` — `panel-track` (Play, the default), `panel-hero` (sheet incl. Fellowship +
   relationships), `panel-journal`, `panel-ref`, `panel-oracle`, plus `panel-roll` (the ACT flow, opened by ACT/🎲,
   not in the nav) and the now-empty `panel-fellowship` (help text only; `showTab('fellowship')` → Hero + scroll).
5. Overlays — Menu sheet, Roster sheet, Tutorial sheet, hidden import `<input type=file>`, toast.
6. `<script>` — state model, render functions, roller, persistence, theme; then the injected
   **Phase-2 block** (`LITM_DATA` + the creation-wizard IIFE, which appends its own overlay
   DOM and CSS at runtime); then SW register.

### Supporting files
- `index.html` — byte-identical mirror of the canonical file (auto-written by `inject.py`).
- `manifest.json` — PWA manifest (`theme_color` `#2e5d52`, icons).
- `sw.js` — service worker (`CACHE_VERSION`).
- `icon.svg` + `icon-192.png` + `icon-512.png` — app icon (misty stag antlers + "LITM").
- `apple-touch-icon.png` (180, full-bleed — iOS ignores SVG touch icons) + `icon-maskable-192/512.png`
  (art scaled into the 80% safe zone) — referenced by `<link rel=apple-touch-icon>` / `manifest.json`, precached in `sw.js`.
- `_build/fonts/`, `_build/icons/`, `_build/icons.json` — UI-refresh assets (see Build process).
- `.claude/launch.json` — local preview server config (`python3 -m http.server`).
- `_build/` — build sources (see **Build process**): `base.html`, `wizard.js`,
  `litm-data.json`, `quintessences.json`, `specials-override.json`, `general-store.json`,
  `might-table.json`, `grimoire.json`, `tutorial.json`, `action-grimoire.json`, `oracle.json`,
  `premades.json`, `parse_litm.py`, `parse_premades.py`, `inject.py`.

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
  - `generalStore` (merged from `_build/general-store.json`) — backpack item suggestions grouped
    in **17 categories** (~217 items); an expanded curated aid (players can type their own)
  - `quintessences` (merged from `_build/quintessences.json`) — **18** × {name, effect,
    mechanical}. Consumed by the Moment-of-Fulfillment picker (`litmQuintessences()`) and the
    searchable Reference tab; `hasQuintessence(name)` substring-matches the hero's free-text
    Quintessences field to drive roller encodings (currently **Beyond Luck**).
  - `oracle` (merged from `_build/oracle.json`) — **The Oracle** solo/co-op play tables (Question
    yes/no + interpretive d66, Conflict, Premade Profile, Profile Builder, Challenge Action,
    Consequences, Revelations). Consumed by the 🔮 Oracle tab (`litmOracle()`), rendered by
    `renderOracle`/`drawOracle`; the tab is gated by **Solo Play Mode** (`litm-solo`).
  - `premades` (merged from `_build/premades.json`) — **20** ready-made Heroes from the Character
    Pack, each {name, tagline, quote, tier(`dalesfolk`/`powerful`), themes[4]{type,title,power[2],
    weak,advance[3],quest,desc,special{name,desc}}, backpack[], examples[]}. Consumed by the
    wizard's **📦 Ready-made Hero** path (`renderPremade`/`commitPremade`).

### State model (one hero)
```
{ id, playerName, heroName, promise(0–5), fulfillments, quintessences, notes,
  backpack:[{text,type:'story'|'hindering',scratched}],
  themes:[{type,title,power:[{text,scratched}],weak:[{text}],quest,improve,abandon,milestone,
           special(free-text notes),specials:[{name,desc}]}] ×4 (variable),
  fellowship:{…same shape as a theme…},
  relationships:[{name,tag,scratched}],
  statuses:[{name,boxes:[6×bool],limit:1–6,owner:'me'|'foe',target}],   // limit defaults 5 (Hero)/4 (foe); legacy/unset → 5; owner defaults 'me'
  progress:[{name,goal,cur,max}],   // progress/Limit tracks (gap #4); max 2–10, complete at cur≥max
  scene:[{text,type,scratched}],
  sceneBoard:{step:-1|0|1|2, stakes, threats},
  journey:{dest, max(2–10), cur, time, vignettes:[{text,done}]},   // Journey montage (Phase 6)
  oracleLog:[{id,t,kind,result,note}] }   // Oracle results + journal notes (solo/co-op), cap 80
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
    with inputs to turn answers into the title/power/weakness tags + Quest. The type is chosen
    via a **visible themebook picker** — all **20** types shown as tap-chips grouped by Might
    (Origin/Adventure/Greatness/Any), the selected one highlighted (`themebookChipsHTML` in
    `wizard.js`). *(Replaced the easy-to-miss "Theme type" dropdown, which made it look like only
    the default Skill-or-Trade themebook existed.)* The themebook also surfaces its **Theme kits**
    (the ~6 kits for that type from `LITM_DATA.themekits`): a **kit selector** whose chosen kit
    shows its power/weakness tags as **tap-chips** that drop straight into your power/weakness
    inputs (`toggleDetailTag` fills an empty input first, else appends; re-tapping removes),
    **sets the theme title to the kit name** (when empty, or when it still holds the previous
    kit's name — a title you typed yourself is preserved), and prefills the Quest if empty — so
    you get ready-made tags *and* the themebook prompts together. (Switching the themebook type
    clears the selected kit; this mirrors the Quickest path, where the kit name is the title.)
  - **✍️ Simplest** — name + blank sheet (the original v1 behavior).
  - **📦 Ready-made** — pick one of **20 pre-built Heroes** from the **Character Pack** supplement
    (`LITM_DATA.premades`). The picker is **grouped by tier** — *Dalesfolk Heroes* (14 ordinary
    rustic starters) and *Uncanny & Powerful Beings* (6 high-power options: a Thaumaturge,
    revenant, fiendhunter, spriggan, Twilight emissary, and a dragon). Tap a Hero to see a full
    **preview** (flavor quote, all 4 themes with their power/weakness tags · Might, Quest, Special
    Improvement, and advancement tags; backpack; example actions), then **Create Hero ✓**.
    `commitPremade` builds a full-fidelity Hero: 4 themes (title + 2 base power tags + weakness +
    quest + Special Improvement on `theme.specials`), backpack items as story tags, each theme's
    description + advancement tags saved to its notes (`theme.special`), and the tagline + quote +
    example actions saved to the Hero's Notes. Bypasses the name/store/fellowship steps (single
    `premade` step); the Hero name defaults to the character's name and is editable on the sheet.
    Added no new localStorage key. (`renderPremade`/`commitPremade`/`mightLabel` in `wizard.js`.)
- **General Store** step — pick one starting **backpack** story tag from trope suggestions +
  6 curated categories (armor/weapons/shields/gear/valuables), or type your own.
- **Fellowship** step — choose one of **6 Fellowship kits** (or skip). Picking a kit opens a
  **builder**: the kit's ~9 power tags and 4 weakness tags as **tap-chips** (choose which you
  want — power toggles, weakness single-select), plus an editable **title** (defaults to the kit
  name) and **Quest** (defaults to the kit's). `commit` uses the chosen tags (falling back to the
  kit's first 3 power + first weakness only if none were picked) — *(previously it auto-took
  `power.slice(0,3)`/`weak[0]` with no way to choose)*. Also build a **per-fellow relationship
  table** (a row per fellow Hero: name + tag; suggestion chips from the rulebook's 4 categories
  fill the last row).
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
- **Status owner — 🧍 Me vs 👹 Foe** (2026-06-09) — each status carries an **owner** (`'me'`/`'foe'`)
  and an optional **target**. A per-card **Me/Foe segmented toggle** flips ownership (switching to
  Foe defaults the Limit to **4** and reveals a **target** field). `renderStatuses` renders your
  statuses under a *🧍 Your statuses* header, then **foe statuses grouped by target** (a *👹 Bandits*
  header, a *👹 Wolf* header, …; `statusCard` builds each, target uses `oninput`-update +
  `onchange`-regroup to keep focus while typing). Two add buttons: **＋ Add status** (me, `addStatus`)
  and **👹 Add foe status** (`addFoeStatus`). `giveStatusTier(name,tier,owner,target)` matches on
  name **+ owner + (foe) target**, so your `wounded`, a foe's `wounded`, and two different foes'
  `wounded` stay distinct and stack independently. On the **Roll tab**, foe statuses appear marked
  **👹 name (target)** with a dashed chip (`.modchip.foe`) and a tooltip — like all statuses they
  **only count when tapped** (nothing auto-adds), pooling into the single highest helpful/highest
  hindering per the rules (a *hobbled* foe taps in as +tier to your attack). The **Spend panel**
  gains a **👹 Foe status** effect (name + tier + which-foe) that creates/stacks a tracked foe
  status via `giveStatusTier(...,'foe',target)`; Grimoire ATTACK/WEAKEN/DISRUPT/INFLUENCE/SET BACK
  keywords now seed this foe form (`AG_FX`→`type:'foe'`). No new localStorage key.
- **Progress & Limits (gap #4)** — a 🎯 card of named **progress tracks** toward a **Limit**
  (a project's *making-progress*, a chase's *catch/outrun*, *unlock*, *breakthrough*). Each has
  a box track (Limit 2–10 via selector), tap-to-set current, an optional "when filled" goal
  note, and a **✓ reached its Limit** flag at `cur ≥ max`. The roller's **▲ Advance** spend fills
  these. `renderProgress`/`addProgress`/`advanceProgress`; state `progress:[{name,goal,cur,max}]`.
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
  **Rest** — a **pre-checked picker** (`campRest` → `campCtx.restPick`, `restCandidates`, `campRestConfirm`) of what
  would naturally recover after a rest: the Hero's own scratched theme power tags/titles + backpack tags, and the
  Hero's **own** statuses (−1 tier each; foe statuses excluded). One tap **Confirm Rest** for a normal camp; untick
  anything the Narrator rules doesn't recover (broken gear needing a Camp Action, a harsh campsite). Fellowship
  parts are *not* restored here, **Reflect** (marks Improve on a chosen theme), **Camp Action**
  (logged advisory: count Power, spend half without rolling, or roll on the Roll tab).
- **4 · Recover one Fellowship part** (Fellowship quality time — **one choice per camp**, `campCtx.fel`
  locks the step once used, `campFelDone`): un-scratch a chosen Fellowship power tag (or its scratched
  title) *or* renew a scratched relationship tag *or* **create / update a relationship tag** with a
  fellow Hero (pick an existing fellow or "＋ New fellow Hero…", write/rephrase the tag — `campSetRel`). **Reflect** filling Improve (3) opens the Improve
  development flow directly (`openDev`).
- A running "This camp" log; each action applies to the sheet immediately (`renderAll`).

### Journey montage (Phase 6) ✅
A guided overlay (`#journeyOverlay`, `openJourney`/`renderJourney`/`closeJourney`), opened from
the Scene card (**🧭 Journey montage…**) and the ☰ menu. Set a **destination** and a
**legs-to-arrival** box track (Limit 2–10, tap to set), a **⏳ time-passes** counter (the journey
clock), and a list of **Vignette Challenges** — each row has a **🎲** (closes the overlay and jumps
to the Roll tab for a Quick action) and a **✓** that clears the vignette and advances one leg
(strikes it through). Reaching the leg Limit shows **✓ Arrived at <dest>**. Persisted per hero in
`journey`; a **Reset journey** button clears it.

### Solo play-loop bridges (seamless flow) ✅
Cross-screen handoffs that close the solo loop without manual tab-hopping (all gated behind
**Solo Play Mode** where noted; no new state fields):
- **Roll → Consequence** — on a solo **7–9 / 6−** (action mode) the roll outcome shows a
  **🔮 Roll a Consequence** button that jumps to the Oracle's Consequences tool and pre-rolls
  (`oracleJump('conseq','or_cq')`).
- **Roll → journal** — the outcome shows **📓 Log to journal** (solo) that appends the dice
  result to the Oracle log (`logRollToJournal` → `oracleAdd`; `_lastRoll` holds the summary).
- **Oracle → Act** — the **Question** and **Conflict / Scene** tools carry an **⚔️ Act — go to
  Roll** button (`#or_toroll` → `showTab('roll')`).
- **Consequence → sheet** — the **Consequences** and **Challenge Action** results carry a
  **＋ Add as scene tag** button that pushes the specific line as a hindering scene story tag
  (`oracleApplyScene`, `_orLastApply`).
- **Scene board deep-links** — in solo, tapping **② Action** jumps to the Roll tab and
  **③ Consequences** jumps to the Oracle (the `#loopSeg` handler; passive/marker-only in normal play).

### The Oracle — solo & co-op play (supplement) ✅
A **🔮 Oracle tab** (`#panel-oracle`, `renderOracle`/`drawOracle`), gated behind a **Solo Play
Mode** ☰ menu toggle (`toggleSolo`, `litm-solo` localStorage key) — the tab is hidden in normal
play and revealed when solo mode is on. All seven oracles are interactive (the app rolls the
dice and shows the matching line, with a re-roll), driven by `LITM_DATA.oracle`:
- **Question** — Interpretive (roll d66 → symbol + meaning, plus the same roll's Attitude/Magical
  being/Terrain/Item sub-columns) and **Yes/No** (2d6 + a **± Power stepper** for tags swaying
  the answer; double-1/double-6 = Extreme No/Yes).
- **Conflict / Scene** — roll all 7 columns (Central Challenge, Role, Target, Location, Unfolding,
  Secondary, Story Tags) or re-roll any one; "Roll again" rows auto-reroll (loop-capped).
- **Premade Profile** — roll an area (d66) then a Creature/Person/Place (d6 → name + book page),
  plus a **Vignette** roller.
- **Profile Builder** — an **interactive worksheet** (`renderPB`/`pbAct`/`pbSummary`, transient
  `_or.pb`): Adventure/Greatness theme **steppers** → auto-computed Mighty-aspect count; **aspect
  tap-chips**; a start/middle/end **phase toggle** + **Roll CR** (d6; start=2-take-lower,
  end=2-take-higher, a 6 adds Might and rerolls); CR then auto-computes the **Limit caps**
  (hard CR+1 / medium CR / easy CR−1, each a type dropdown), **tags & status tiers** (= CR), and
  **Consequence tiers** (main = CR, lesser = ⌈CR/2⌉). A **Role** picker + **🎲 Roll a Threat**
  jump to the Challenge Action oracle. A live **📋 Profile** summary with **📓 Log to journal** and
  **👹 Add as foe status**. Each step's verbatim rules text is tucked into a collapsible **ℹ️ How
  this works** (`.pb-help`) so it's no longer a wall of text.
- **Challenge Action** — pick a Role (11) → roll d6 for its Threat/Consequence.
- **Consequences** — roll d66 → category + a d6 specific consequence.
- **Revelations** — pick Act I/II/III → roll d66 for the matching revelation.
Every roll is appended to a per-hero **Oracle log & journal** (`oracleLog`, `renderOracleLog`,
cap 80) with a free-text note box per entry; entries are deletable. Dice helpers `d6`/`d66` +
`d66idx`/`d66g12`/`d66g9` map rolls to the table groups.

### Roll (the headline feature) — rule-correct **2d6 + Power**
- Auto-collects every eligible tag from the sheet (theme titles, power tags, weakness tags,
  fellowship tags, backpack + scene story tags) and all active statuses.
- Tap a tag to count it: helpful (+1) → hindering (−1) → off. Weakness tags toggle as a −1.
- **Burn a tag** 🔥 — one helpful tag gives **+3** instead of +1 (and is flagged to scratch).
- **Status math** — only the single highest helpful and single highest hindering status count.
  **Foe statuses** (owner `'foe'`) show marked **👹** and count the same way *only when tapped*
  (helpful when a foe's condition works for your action, hindering when it's against you).
- **Might** segmented control: Extr. Imperiled −6 / Imperiled −3 / Matched / Favored +3 / Extr. Favored +6.
- **⚖️ Might helper (gap #2)** — a collapsible under the Might control: pick the **task's Might**
  (Origin/Adventure/Greatness) and the **Might you bring**, and the app computes the modifier
  (`(you−task)×3`, clamped ±6) and sets the dial. A manually-tapped Might clears the helper.
  When a Grimoire action with a Might note is loaded, the note is surfaced in the 🎬 panel.
- **Situational** ± stepper for any other foe/environment tags the Narrator invokes (incl. a
  group/Challenge's Might acting against you).
- **🤝 Help from other Heroes (Phase 5 — group/help)** — add ally-invoked tags that help or
  hinder your action; each row's value cycles **+1 → 🔥+3 → −1 → off** and feeds `computePower`
  (`helpTags` transient array, `renderHelp`/`addHelp`; cleared on hero switch).
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
  - **Grimoire-seeded suggestions (gap #3):** when an action is loaded (Phase B), the panel
    parses the action's **Success** text into one-tap effect buttons (`parseSuccessEffects`/
    `AG_FX`/`seedEffect`): each effect keyword maps to the right spend form pre-filled with a
    suggested tag/status name (CREATE/BESTOW→Backpack, ENHANCE→Status, ADVANCE→Progress, RESTORE→Reduce,
    DISRUPT/INFLUENCE/ATTACK/WEAKEN/SET BACK→Other/target, DISCOVER→instant −1). The form shows
    the remaining suggestions as quick-pick chips (`spSuggChips`). The full Success text stays
    available under a "Full Success text" sub-accordion. Extra Feats remain one-tap −1 buttons.
  - Helpers: `giveStatusTier`, `reduceStatusByAmt`, `scratchTagById`/`recoverTagById`/
    `scratchedTags`, `openSpend`/`doSpend`/`renderSpend`/`drawSpForm`. Form inputs persist
    across stepper re-renders (values stored on the form-state object).

### Rules tab — core player rules, collapsible (Phase 7) ✅
The Rules tab (`#panel-ref`, titled **📖 Rules**) holds **core player rules only** — all Action
Grimoire content lives in the 📜 Action Grimoire browser (a launch button + ☰ menu item open it).
Each `.ref-sec` is a **collapsible accordion** (tap the `<h3>` to toggle; `attachRefAccordion`
wires the headers, `filterRef` manages open/collapsed state). Collapsed by default except the
one marked `data-open` (**Getting started**). A **search box** (`filterRef`) expands and shows
only matching sections (matching the heading or any `.ref-row`), with a "no rules match" note.
Sections: **Getting started** (onboarding + tutorial button), **Counting Power**, **Might ·
Favored & Imperiled** (mechanic + the per-Might example table from `LITM_DATA.mightTable` via
`renderMightRef`), **Roll 2d6 + Power**, **Spending Power on Effects** (the Effect costs the
spender enforces — worked examples moved to the Grimoire), **Reactions**, **Statuses**, **Hero
Development**, **Quintessences** (all 18, via `renderQuintRef`), **Camping**, **🔮 Solo Play —
how to use the Oracle** (step-by-step loop: frame scene → ask Oracle → roll → spend Power →
Oracle for consequence → log it → camp; all seven Oracle tools described; journaling guide). `renderRefData`
builds the data-driven sections (`renderQuintRef` + `renderMightRef`) at runtime, then
`attachRefAccordion` + `filterRef`. The Core-Book's verbatim **worked examples** (`LITM_DATA.grimoire`,
grouped by scenario via `grimoireExamplesHTML`) now render **inside the Action Grimoire browser**.
*(The 5E crossover is deferred — it needs a source not reachable here; see Roadmap Phase 7.)*

### Tutorial — interactive guided tour + Gerrin walkthrough (Phase 7, reworked 2026-06-08) ✅
Opening the tutorial (**📖 Tutorial** ☰ menu item / the Getting-started button) now shows an
**intro** (`openTutorial`→`renderTutorialIntro`) with two choices:
- **▶ Play the guided tour (hands-on)** — the headline. A **coach-mark tour over the live app**
  (`#tourLayer` = a dim backdrop with a spotlight `#tourHole` + a `#tourCard` callout;
  `startTour`/`tourShow`/`tourPlace`/`tourReposition`/`finishTour`, steps in `TOUR_STEPS`). It
  **spins up the Gerrin ready-made Hero** (`heroFromPremade` off `LITM_DATA.premades`, flagged
  `_tour`), switches to him, and walks **15 steps** through a real action loop, switching tabs and
  driving the actual UI: meet his themes/tags → backpack → establish a **scene tag** → invoke
  Gerrin's *Stealthy step* + *Keen senses* on the Roll tab (Power = 2) → **"Your turn — roll!"**
  (the one gated moment; `tourOnRoll`, hooked at the end of `rollDice`, auto-advances after the
  dice settle) → read the outcome tiers → the **Spend panel** → statuses (gives `hidden-2`) →
  stacking & Limits → a **Progress** track → weakness/Improve & reactions → Milestones & Promise →
  wrap-up. Each step's `setup` is **idempotent** (guarded adds) so Back/Next is safe. The model is
  **mostly auto-driven** (the tour performs the taps/adds and explains) with the **roll** handed to
  the player. On **Finish/Quit** it restores the Hero you had open and offers **Keep Gerrin** /
  discard (`finishTour(keep)`); the spotlight passes clicks through (`pointer-events:none`) so the
  real buttons stay tappable. **No new localStorage key.**
- **📖 Read the Core Book walkthrough** — the original paginated reader (`renderTutorial`, data in
  `LITM_DATA.tutorial`): the 11-step Gerrin intro, Back/Next/Finish, "Step N of 11"; Back on step 1
  returns to the intro.

### Action Grimoire browser (supplement) ✅ COMPLETE
A searchable **browser overlay** (`#agOverlay`, `openAG`/`renderAG`/`closeAG`, `litmActionGrimoire()`)
for the standalone **Action Grimoire** supplement (a *separate book* from the Core Rulebook). Data
in `LITM_DATA.actionGrimoire` (from `_build/action-grimoire.json`): **each section is a collapsible
`<details>` accordion** (collapsed by default — the browser opens to a tidy list of section names),
and inside, **each action entry is its own collapsible card**. All prose (section intros, entry **explanations**, **Success** text, and the tutorial) is run
through a shared **`fmtText`** formatter — reflows the PDF's hard-wrapped lines into 1–2-sentence
paragraphs, promotes embedded sub-headings (ALL-CAPS / Title-Case) to styled `.fmt-h` headers,
bolds `Label:` prefixes and the rules keywords (CREATE/ENHANCE/DISRUPT/…), and turns `•` lines
into bullet lists. Opening an entry shows its **explanation** + the
**🎲 Use in a roll** button; everything else (action examples, Power **helps**/**hinders**, **Success**
effects, **Extra Feats**, **Consequences**, **Might**) is tucked behind a nested **More details**
sub-accordion (`.ag-more`, collapsed by default; auto-opened when a search matches inside it). A search
box filters across all entry text and auto-expands matches. Opened from the **📜 Open the Action
Grimoire** button at the top of the Rules tab and the **📜 Action Grimoire** ☰ menu item. The
browser also hosts the Core-Book's **worked examples** (`LITM_DATA.grimoire` via
`grimoireExamplesHTML`, grouped by scenario) as a pinned "Core Rulebook — Worked Examples" block.
Each action card also has a **🎲 Use in a roll** button that loads it into the roller (Phase B).
Prose/reference sections (**Common Consequences**, **General Considerations**) carry an `intro`
+ grouped `lists` (heading + items) instead of action entries, rendered as bulleted lists.
**Complete dataset** — all **19 leaf action sections (101 entries)** ordered by page (Crafting →
Direct/Tactical Attacks → Support/Movement/Defense → Information Gathering → Thievery → Survival
→ Navigating Danger → Recovery & Healing → the four Magic sections → Commerce → Community →
Influence & Intrigue → Fellowship) + the 2 prose sections. No new localStorage key. *(Next:
Phase B — the action→roll bridge.)*

### First-run onboarding & idiot-proofing (for zero-knowledge newcomers) ✅
Makes the app usable by someone who has never read the rules or played a solo RPG:
- **Welcome overlay** (`#welcomeOverlay`, `maybeWelcome`/`welcomeGo`/`welcomeDismiss`) — shown once
  (gated by `litm-seen`). Three starting points — **▶ Guided tour** (`startTour`), **📦 Ready-made
  Hero** (`newHero` → wizard), **✍️ Explore myself** — plus a **"I'm playing solo (no GM)"**
  checkbox that turns on Solo Play (reveals the Oracle) with a plain-language explanation, and a
  one-paragraph "how a turn works" loop.
- **Auto-expand "🎲 How to play"** (`#howtoPlay`) on the first visit only (via `maybeWelcome`).
- **Beginner banner** (`#newbieBanner`, `heroIsUntouched`/`updateNewbieBanner`) — on the Hero tab
  while the hero is still blank: "New here? ▶ Guided tour · 📦 Ready-made Hero"; auto-hides once any
  field/tag/name is filled (re-checked every `renderAll`).
- **Point-of-use ⓘ jargon hints** (`.infodot`, `explain(k)`, `JARGON` dict) on the worst terms —
  Power, Might, Promise, Quintessences, Statuses, Fellowship — tap to toast a one-line plain
  explanation. No new per-hero state (`litm-seen` is app-level).
- **"Play with me" coach** (`#coachBar` + `#coachDot`, `startCoach`/`coachSet`/`coachRenderState`/
  `coachStates`/`coachClose`/`coachResume`, `_coach` state machine) — the answer for "I won't read;
  just play." A fixed bottom bar that is a **persistent companion beside your real game — it never
  steps aside.** On "Let's play" it **sets a game up for you** (`coachSetup` — spins up Gerrin only if
  the hero is untouched, turns on Solo, frames a starter Thornwood scene; all non-destructive), walks
  hero → scene, then drops into a **`hub` state that loops the play cycle forever**: your turn → *Ask
  the Oracle* or *Take an action* (roll-gated via `coachOnRoll`, hooked at the end of `rollDice`) →
  **outcome-aware `resolve`** (win/mixed/lose branch tells you the exact next tap) → **▶ Next turn**
  back to the hub, indefinitely. Endings are an **opt-in `Wrap up` menu** (end scene / session-via-Camp
  / story-via-Quest→MoF) that always returns to the hub — it does **not** terminate the coaching. Two
  anti-stranding guarantees: gated steps always offer **Skip**, and closing the bar (✕) leaves a
  floating **❓ What do I do now?** button (`#coachDot`) that re-opens the coach **straight back into
  the live loop** (`coachResume` → `hub`, not the intro). Highlights the control to tap (`.coach-spot`).
  Launched from the Welcome overlay's primary button, ☰ menu, and the beginner banner. No new
  localStorage key.
- **Run-a-game guide** (`#playGuideOverlay`, `openPlayGuide`/`closePlayGuide`) — a single plain,
  sequential walkthrough of the whole arc a newcomer was missing: **▶ Starting** (hero → solo →
  frame a scene → ask the Oracle), **🔁 Sustaining** (the action loop + the "end every journal note
  with a new question" momentum trick), and **⏹️ Ending well** at three scopes (end a scene / end a
  session via Camp / end a story via Quest→Milestone→Moment of Fulfillment). Opened from the Welcome
  overlay, the ☰ menu, and the beginner banner. `.guide-phase`/`.guide-list`/`.guide-tip` CSS; no new
  state.

### Inline "How to use" help (per-tab) ✅
Each play tab carries a collapsible **native `<details class="howto">`** help block at the top of
the panel (zero JS, no new localStorage key, collapsed by default): **Hero** (two — a **🎲 How to
play** game-loop overview + a **❓ How to use this tab**), **Fellowship**, **Tracking**, **Roll**,
and **Oracle**. Each lists step-by-step bullets grouped under `.howto-body h4` sub-headings. Styling
in the `.howto` CSS block (near `.ref-sec`); markup hand-written in `_build/base.html`. The 📖 Rules
tab keeps the deep reference (searchable accordions); these are the quick per-screen primers.

### UI refresh — rulebook-faithful look (2026-10-01) — *styling only, no content changes*
Driven by a UX/UI audit; delivered in phases. Direction: **rulebook-faithful** (parchment, card-like themes,
ink-line icons), auto light/dark.
- **Phase 1 ✅ — tokens, font, icons, a11y.** Design tokens on `:root` (`--r-*` radius, `--sp-*` spacing,
  `--font-display`/`--font-body`, `--focus`, `--mixed*`, `--burn`, `--spot`, `--m-*` Might-badge colours with
  dark variants — replaces hard-coded `#fff5e0`/`#e8821e`/`#ffd76a`). **Cinzel** display font for headings,
  header title, outcome + Power numerals. **Emoji → SVG icons** at runtime: `iconize`/`iconizeText`/
  `startIconizer` (TreeWalker + `MutationObserver`) swap any `ICON_MAP` emoji in rendered text for
  `<svg class="ico"><use href="#i-…">`; inputs/textarea/select/option/`[data-noicon]` are skipped and the
  underlying text/data is untouched. `:focus-visible` outlines, `prefers-reduced-motion` kill-switch,
  ≥44px **hit-area halos** (`::after{inset:-8px}`) on pips/status boxes/tag buttons/infodots without
  changing the visual grid, small-text floor raised. `applyTheme` now also syncs `meta[name=theme-color]`.
- **Phase 2 ✅ — layout & navigation.** **Bottom tab bar** (`#nav.bottomnav`, moved out of `<header>`; SVG icon +
  label per tab, pill highlight, `--nav-h` reserves space; toast/update banner/coach bar/coach dot sit above it).
  **Header**: gradient (stays dark teal in dark mode), antler emblem (`#i-antler`), 2-line-clamped title, grouped
  undo/redo pill, save-dot tucked under the title, new **❓ help button** (`#helpBtn`). **Per-tab help sheet**
  (`#helpOverlay`, `openHelp`/`closeHelp`/`panelHowtos`): the panels' inline `details.howto` blocks are hidden
  and their content is cloned into a bottom sheet (❓ hidden on tabs without help). `showTab` now sets
  `body[data-tab]` and calls `uiTabChanged`. **Collapsible theme cards** (`themeSummary`/`themeIsOpen`,
  transient `_themeOpen` by theme id; first theme open by default so the tour's target is expanded): summary
  row = chevron, title, type · tag counts, Might badge, mini I/A/M track dots. Theme cards get a **Might-coloured
  top band** (`.mt-origin|adventure|greatness|any`); title input gets its own full row; **Remove theme** is a
  subdued red text button. **Sticky roll dock** (`#rollDock`, `dockRoll`, `startRollDock` IntersectionObserver
  on `#rollBtn`; live Power via `#dockPow` from `computePower`) and a **floating 🎲 button** (`#rollFab`) on
  Hero/Fellowship/Tracking that hides on scroll-down / input focus (`startFabAutoHide`) and during the coach.
- **Phase 3 ✅ — play visuals.** **SVG pip dice** (`PIPS`/`dieSVG`/`setDie`; `#die1/#die2` hold an SVG face,
  `data-v` = value, blank "?" before first roll) with a 3D **tumble** keyframe; **double 6** gets a gold glow
  (`.crit-win`), auto-miss **double 1** a red shake (`.crit-lose`). **Outcome banner** gains a tier icon (trophy /
  scale / triangle-alert; shield for a reaction success) and a slide-in. **Power** numeral pulses on change and
  turns green/red (`.pos`/`.neg`, also on the dock). Roll button has a pressable 3D edge. **Might** is one
  **colour-graded bar** (`.might-bar`, red → neutral → green; each button = big number + same name text).
  **Status boxes** deepen in green by tier (`data-t`), the Limit box carries a red marker. **Promise** pips are
  **stars** that fill gold (`--promise`). Burning tag's flame flickers. **Roll history** rows show mini pip dice +
  a win/mixed/lose colour edge (tier derived from the stored `big` text — no new stored field).
- **Phase 4 ✅ — atmosphere & motion.** Light **parchment**: cream `--card-bg` (`#fffcf5`), an SVG-noise paper
  texture (`--paper-noise`) + top mist radial tint on `body` (dark keeps tint only), a faint treeline silhouette on
  the header's bottom edge, card sheen + soft drop shadow, **corner ornaments** on non-theme cards, a fading rule
  after each card `h2`, stamped hatch on scratched tags. **Illustrated empty states** (`emptyHTML(icon,text)` —
  same text, dashed-ring icon above) for roll history, statuses, progress, journey vignettes, Oracle log.
  **Sheets** fade/slide up with a grab handle; **swipe down to close** (`startSheetSwipe` — dispatches a backdrop
  click on the overlay, so only overlays that already close on backdrop tap close, via their own handler);
  centred dialogs ≥600px. Menu icons sit in tiles; toast slides with a shadow; buttons/chips press-scale; panels
  fade in on tab switch. Wizard headings use the display font. Untyped `<input>`s (e.g. Oracle question) now get the
  standard field styling.

- **Audit R1 ✅ —** **Roll chips grouped by source** (`availableTags` now tags each entry with `grp`/`gl`/`gm`/`gi`:
  one group per theme (Might-coloured edge), Fellowship, Backpack, Scene, Statuses; header shows "N invoked") and
  **kind-tinted outlines** before selection (`.k-power|k-weak|k-story|k-storyh|k-status`). **Generated hero crest**
  (`heroCrestSVG`/`heroMight`/`heroInitials`/`CREST_COL`): initials on an SVG shield tinted by the dominant theme Might,
  shown in the Hero Card heading (`#heroCrest`) and roster rows — derived, no new state. **Progress tracks** render as
  one connected bar with a ⚑ goal box (`.prog-card`, `.done` ring). Fellowship card h3s match theme cards. Camp step
  headings are accent pills; all accordions use a rotating CSS chevron. **Night-ink dark mode**: light-on-dark paper
  noise + a seeded SVG **starfield** (`body.dark::before`, masked fade). **≥900px tablet grid**: Hero (Hero Card |
  Backpack, themes 2-up), Tracking & Fellowship 2-up, Roll = tag builder left / sticky Power+dice + history right
  (`.rl-build`/`.rl-dice`/`.rl-hist`), dock hidden; sheets 560px.

- **Audit R2 ✅ —** Roll dock also hides while `#outcomeBox`/`#spendBox` are in view (`_dockVis`). **Oracle picker** =
  2-col icon **tile grid** (`.or-tile`, 4-up ≥640px). **Oracle journal**: per-kind icon + time, multi-part results
  (`' | '`-joined) shown as labelled rows (`.orl-parts`) — same text. **Journey trail** (`journeyTrailSVG`): legs as
  waypoints on a winding SVG path (done segment solid, destination ⚑, bobbing location pin), tap/Enter a waypoint
  sets the leg. **Celebration burst** (`celebrate(el)`: gold dot/star particles + haptic, skipped under reduced
  motion) on double 6, Moment of Fulfillment, a progress track reaching its Limit, and journey arrival. **Spend
  panel** effects are icon tiles (`.sp-tiles`, 3-col). Foe status cards tinted. Wizard header uses the header
  gradient + display font.

- **Audit R3 ✅ —** Toast/update banner on a fixed dark-teal (dark-mode contrast fix); banner wider, hides FAB/dock
  (`body.has-upd`). **Keyboard-aware chrome** (`startKeyboardChrome`, touch only): `body.kb` hides bottom nav/FAB/dock/
  coach dot while a text field is focused. **Phone landscape** (≤500px tall): icon-only nav, 1-line title, tighter header.
  **Action Grimoire** open-section heading is sticky in the sheet. **Clamped card hints** (`clampHints`/`startHintClamp`,
  session-only `_hintOpen`): card `p.hint` ≥130 chars clamp to 2 lines with a more/less toggle — same text.
  **Print / PDF sheet** (☰ → `printSheet()`; `@media print`): Hero + Fellowship on paper, all themes expanded 2-up,
  chrome/buttons/hints hidden, tag colours kept (`print-color-adjust: exact`), placeholders blank. Thin themed
  scrollbars, teal selection/caret, Cinzel stepper numerals, Promise ⓘ no longer wraps.

- **Audit R4 ✅ —** **Dark-mode contrast**: primary fills use `--btn` (`#2c6b5e` in dark, ≥4.5:1 with white) for `.btn`,
  selected seg/tiles, FAB, coach dot/bar, guide phases; dark `--power` pill retuned. **Theme identity**: roman-numeral
  seal (`.ts-num`, Might-tinted) in each summary + faint **theme-type watermark** icon (`THEME_ICON`: 20 types → Lucide
  icons) on every theme card; **Expand all / Collapse all** bar (`.themes-bar`) above the themes. **Hero glance strip**
  (`#heroGlance`, `updateGlance` — called from `renderAll` and `save`): Promise stars · Fulfillments · active own
  statuses · scratched tags, plus jump chips (Hero/Backpack/Themes/Notes); sticky under the header (`--hdr-h` from
  `syncHeaderH`), blurred backdrop. **Relationships**: fellow's name as a display-font heading line above the tag.
  **Haptics** (`startHaptics`): 6ms tick on chips/pips/boxes/tiles/tabs (Android). **Launch splash** (`#splash`,
  `endSplash`): emblem + title over a mist gradient, ~1s fade, once per session (`sessionStorage litm-splashed`),
  skipped under reduced motion.

- **Audit R5 ✅ —** **Wizard**: display-font titles (wizard CSS `Georgia` → `var(--font-display)`); Ready-made cards show
  a generated crest (`heroCrestSVG` from the premade's name/themes) + tier badge (`.wz-tier`, the group label); preview
  gets a crest header and a gold-ruled pull-quote (`.wz-quote`); Trope cards show theme types with `THEME_ICON` icons
  (`.wz-tt`); selected-card glow + press scale. **Collapsed theme summary** adds the Quest as an italic 1-line
  (`.ts-quest`); title clamps to 2 lines, meta single-line, compact watermark. **Oracle**: results fade in with a
  blur-to-sharp "mist clears" (`.or-reveal`); **Yes/No** gets a stamped seal (`.yn-seal.yn-0…4`, text = the band
  answer's lead phrase) and tier colour (`setRes(html, cls)`), Extreme Yes triggers `celebrate`. Gold accent on
  Quintessences + Fulfillments. **Tablet**: Oracle = tools | sticky scrollable journal (≥1000px); Rules capped at 880px.

- **Audit R6 ✅ —** Coach dot / FAB / dock hide while any sheet, the wizard or the tour is open (`body:has(...)`).
  **☰ menu grouped** under Heroes · Play · Learn · Data & sharing · Settings (`.menu-grp`; same items/labels; Delete last,
  red). **Coach bar**: glowing **lantern guide** avatar (`#i-lantern`, custom) + speech-bubble text, slide-in on each state
  (`coachSet` adds `.bump`); dark ghost-button contrast fixed. **Scene art headers** (inline SVG, theme-aware): Camp =
  tent + flickering campfire + rising embers; Journey = ridgelines, drifting mist, dotted road to a waving flag. Camp
  inline field rows keep the button compact. **Status box pop** on tap (`_popKey`). **Rules section icons**
  (`attachRefAccordion` keyword map). Header title is a **hero-switcher** (opens roster). **Swipe a tag row left**
  (>64px) to toggle scratch (`startTagSwipe`; buttons unchanged, delete stays button-only). `▶` mapped to the play icon.

- **Audit R7 ✅ —** axe-core (WCAG 2 A/AA) pass on all tabs, light+dark: track pips get `aria-label`/`aria-pressed`;
  theme-type/status-Limit/progress-Limit selects get `aria-label`; scratch/delete tag buttons named; dice `role=img`;
  hidden roll dock is `inert`; dark "Expand all" contrast fixed. *Only remaining axe item: `meta-viewport`
  (`user-scalable=no`) — kept by owner decision.* **Theme reorder**: Move up / Move down buttons in each expanded
  theme (`.theme-move`, glow on the moved card). **Tag drag-reorder**: grip (`.tag-grip`, pointer events) on theme
  power/weakness and Backpack rows — lists expose `_arr`/`_re`, `startTagDrag` splices the array on drop (undoable);
  grip hidden for single rows and non-reorderable lists. New empty tag rows slide in (`_freshIds`); scratching a tag
  throws embers (`emberAt`). **Display settings** sheet (☰ → Settings → Display settings, `#uiOverlay`,
  `openUISettings`/`renderUISettings`/`setUIPref`/`applyUIPrefs`, key `litm-ui`): text size S/M/L/XL (`body.style.zoom`
  .93/1/1.1/1.2), theme Auto/Light/Dark (uses `litm-theme`), motion Follow device/Reduce (`body.rm` kill-switch; also
  honoured by `celebrate`/`emberAt`/splash), haptics On/Off (`body.no-hap`; `navigator.vibrate` wrapped).

- **Cross-link & rules pass ✅ (2026-10-07)** — wired the missing sheet ↔ roller ↔ camp links:
  **relationship tags** now appear on the Roll tab (group *Relationships*, lazy `id` migration in `availableTags`);
  **Fellowship power tags and relationship tags are single-use** — invoking one as helpful scratches it on roll
  (`single:true` → `_single` → `scratchTagById`, noted "Single-use — scratched"); a burned **Fellowship title** now
  actually scratches (`S.fellowship._titleScr`, excluded from the roller, recoverable). **Weakness invoked** → the
  outcome offers one-tap **⚑ Mark Improve — <theme>** per invoking theme (`_weakThs`, `data-markimp`; a 3rd mark
  opens the Improve flow). **Theme/Fellowship titles** show their scratched state on the sheet with a ✓
  scratch/recover toggle (`.title-scr`). `scratchedTags`/`recoverTagById` (Spend → Recover) include the Fellowship
  title + relationships. **Camp**: Rest no longer restores Fellowship tags (one Fellowship part per camp via step 4,
  which now also lists a scratched Fellowship title); Reflect → Improve 3 opens the development flow. Glance-strip
  status count links to Tracking. 4 new coverage entries. *Owner confirmed against the Core Rulebook (2026-10-07):
  Rest = personal theme + backpack tags only; Step 4 = one Fellowship choice (recover a Fellowship tag **or**
  create/update a relationship tag).* Step 4 now enforces that single choice and adds create/update.

### Redesign 2026-10 — Play-first, card-based, progressive disclosure ✅ (rules mechanics unchanged)
Owner brief: "too cluttered, too wordy, intimidating — be radical". Implemented all recommendations:
- **4-tab IA** — Play / Hero / Journal / Lore (+ Oracle in solo). `showTab` aliases `fellowship→hero` (+scroll to
  `#fellowCard`) and highlights **Play** while the ACT flow (`roll`) is open (`NAV_OF`). App now **starts on Play**.
- **Play stage** (`#playStage`, `renderStage`): misty landscape SVG, the scene's **stakes** as a display headline (or a
  "＋ What's at stake?" prompt → `focusStakes`), scene tags as pills, **status tokens** (round tier badges, foe = red,
  at-Limit ring; tap → `focusStatus`), a big **⚔ ACT** button (`startAct`) and quick tiles (Camp, Journey, Oracle
  [solo-only via `body.solo`], Journal). The Scene/Statuses/Progress/Scene-tags editing cards follow below.
- **ACT flow** (`panel-roll`): one step at a time on phones — **1 Tags · 2 Might · 3 Roll** (`#actSteps`, `.act-step[data-s]`,
  `actGo`, `body[data-act]`); the roll dock becomes the flow footer (Power + **Next ›**, `dockRoll`/`updateRollDock`);
  ≥900px shows all steps at once. Tour/coach spotlights auto-reveal the right step (`actRevealFor` in `tourPlace` /
  `coachSpot`); `rollDice` jumps to step 3. A full-screen **outcome flash** (`#outcomeFlash`: tier colour, icon, result,
  dice sum; tap/auto-dismiss) precedes the outcome + Spend panel. FAB → `startAct`.
- **Hero = identity + card deck**: `#heroIdent` (`renderHeroIdent`) — large crest with a **5-star Promise arc** (tap to
  set; same logic as the pips, opens MoF at 5), name, player, Promise/Fulfillments stats, Quintessences in a gold box,
  **✎ Edit sheet** toggle. **View mode** (default for built heroes; blank heroes open in Edit — `_editFor`): no form
  chrome — labels, add/delete/grip/move buttons, selects, empty rows/fields, theme notes and hints hidden; theme cards
  become a **horizontal swipe deck** (scroll-snap, `#deckDots`/`syncDeckDots`; 2-up grid ≥900px) with numeral seal,
  title, type, Might badge, tag pills, the Quest as an italic face line (`.ts-quest-face`), tracks and Special
  Improvements. Collapsing applies only in Edit mode. Hero Card form fields show in Edit mode only. Glance strip retired.
- **Hints → ⓘ** (`hintsToInfo`, `openInfo`): every card-level explanation paragraph (and `#rollHint`) is hidden and
  opened from an ⓘ on the card heading (existing jargon ⓘ now shows its jargon line + the card's paragraph). Same text.
- **Beginner / Full mode** (`litm-ui.mode`, `applyMode`, Display settings "Experience"): Beginner hides `.adv` — Might
  helper, Situational ±, Help from other Heroes, Add foe status, Progress card (shown anyway once a track exists,
  `.has`). Default: Beginner for first-run users, Full for existing users. Mechanics untouched.
- **Journal tab** (`renderJournal`, `#journalList`, filter All/Rolls/Oracle): one day-grouped timeline of rolls (pip dice,
  tier edge) and Oracle results (labelled rows, journal note, delete). Old Roll History / Oracle log cards hidden.
- **Lore tab** = Rules + tiles for Action Grimoire, Tutorial, Run-a-game guide, Play-with-me.
- **First run**: the Welcome sheet leads with a **hero gallery** (all 20 premade crests + "Build my own"); tapping one
  creates that Hero (`heroFromPremade`) and drops you on Play (`renderWcGallery`, deferred until `LITM_DATA` exists).
- **Header**: 👥 removed — the crest/emblem (`#hdrCrest`) and title open the roster.
- Verified: specs pass; tour/coach/wizard/camp/rest/cross-link scripted checks pass; axe clean except `meta-viewport`.

**Not changed (by design):** all text/rules content, data, state model, storage keys. Emoji remain in the
source (and in `title`/`placeholder`/`confirm()` text); only rendered text nodes are iconized.

### App-level
- **Multi-hero roster** (create / switch / delete).
- **Export / import** a hero as JSON.
- **Share / sync a Fellowship** — ☰ menu **Share Fellowship** writes a `{_litm:'fellowship',
  fellowship, relationships}` JSON file; **Import / sync Fellowship** reads one and (after a
  confirm) replaces this hero's Fellowship card + relationship table with the shared copy.
  `exportFellowship`/`importFellowship`, `#fellowFile`.
- **Undo / redo + autosave indicator** — ↶ / ↷ header buttons. `save()` snapshots `{roster,
  activeId}` (coalescing bursts within 1200 ms; stack capped at 40) into `_undo`; `undo`/`redo`
  swap snapshots via `_restore` (writes localStorage directly + `renderAll`). Hero-switch resets
  the baseline so navigation isn't an undo step. A header **save-dot** flashes "Saving…" → "✓ Saved".
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

### Phase 5 — Play-loop helpers (player-facing) ✅ DONE (2026-06-08)
Shipped as the **Action/Reaction toggle + burn-scratch + interactive Effect-spender** (see
Implemented Features → "Play loop").
- [x] **Reaction roller** — mode toggle; 10+ Power+1, 7–9 lessen only, 6− take as-is.
- [x] **Effect spender** — interactive "spend your Power" panel; deducts rulebook costs and
      applies results to the sheet (give/reduce status, add backpack tag, recover/scratch tag).
- [x] **Status apply/stack/reduce engine** wired to spending Power (`giveStatusTier` spills to
      the next free box; `reduceStatusByAmt` shifts marks left).
- [x] **Burn-on-roll** scratches the burned tag on roll confirm (`scratchTagById`).
- [x] **Group / help actions** (2026-06-08) — the **🤝 Help from other Heroes** section on the
      Roll tab lets the acting player add ally-invoked tags (each cycles +1 / 🔥+3 / −1 / off),
      combined into Power (`helpTags`/`renderHelp`). A foe **group/Challenge's Might** is entered
      via the Situational ± stepper (hint updated). Player-side; transient, cleared on hero switch.

### Phase 6 — Scene & session context (still player-side) ✅ DONE (2026-06-08)
Scene board + Camping/Sojourn shipped; only the Journey montage remains.
- [x] **Scene tracker** — current stakes, challenges/threats in view, and the game loop
      (Establish → Action → Consequences) as a lightweight selector. Shipped as the 🎬 Scene
      card on the Tracking tab (persisted in `sceneBoard`).
- [x] **Camping & Sojourn** wizard — expire story tags → establish place → 2 activities (3 with
      Consequences): **Rest** (un-scratch power tags + reduce statuses), **Reflect** (mark
      Improve), **Camp Action** (advisory); then recover a Fellowship power tag or renew a
      relationship tag. Shipped as `#campOverlay` (see Implemented Features → "Camping & Sojourn").
- [x] **Journey** montage helper (2026-06-08) — a guided overlay (`#journeyOverlay`,
      `openJourney`/`renderJourney`/`closeJourney`) opened from the Scene card + ☰ menu: set a
      **destination** and **legs-to-arrival** box track (Limit 2–10), a **⏳ time-passes** counter
      (the journey clock), and a list of **Vignette Challenges** — each with a 🎲 (jump to the Roll
      tab for a Quick action) and a ✓ that clears it and advances a leg. "✓ Arrived" at the Limit.
      Persisted per hero in `journey`.

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
- [x] Built-in **tutorial** ✅ (2026-06-06) — the Gerrin walkthrough; **reworked into a hands-on
      interactive guided tour** (2026-06-08). `openTutorial` now offers an intro with the **▶ guided
      tour** (a 15-step coach-mark tour over the live app that loads the Gerrin ready-made Hero and
      drives a real action loop — invoke tags, roll, spend Power, statuses, progress, development —
      then restores your Hero; `#tourLayer`/`TOUR_STEPS`/`startTour`/`finishTour`) and the original
      **📖 paginated reader** (`renderTutorial`, `LITM_DATA.tutorial`). *(Follow-up: optional
      auto-open on first run.)*
- [ ] **5E D&D crossover** quick-reference (class/race → theme-kit hints).
      *(Blocked: needs the notebook's crossover source.)*
- [x] ✅ **Action Grimoire supplement** browser (`#agOverlay`/`renderAG`) — the standalone book's
      full action catalog, searchable. **Complete** (2026-06-06, full PDF extraction via Gemini):
      all **19 leaf action sections (101 entries)** + the **Common Consequences** & **General
      Considerations** prose, in `_build/action-grimoire.json`.
- [x] ✅ **Phase B — action→roll bridge** (2026-06-06): each Grimoire action card has a **🎲 Use
      in a roll** button (`useAGAction`); it loads the action into `agAction` and jumps to the Roll
      tab, where a 🎬 panel (`#agRoll`/`renderAgRoll`) shows its Power **help/hinder suggestions as
      a tap-checklist** (each ticked = ±1 in `computePower`, alongside your real tags; no fuzzy
      matching). After a Success the spend panel is **seeded** with the action's **Success effects**
      (reference) + **Extra Feats** as one-tap −1-Power buttons; on a 7–9 / 6− the outcome lists the
      action's **Consequences**. A ✕ clears the loaded action. Transient (no persistence/localStorage).

### Phase 8 — Narrator-adjacent (optional / separate companion)
*Out of scope for a pure player app, but defined in the rules — consider a sibling Narrator
app rather than bloating this one (cf. the TOR2E Loremaster companion).* 
- [ ] **Challenge / adversary profiles** — Might-by-aspect, tags & statuses, Limits, Special
      Features, Vulnerabilities (e.g. the Winter Creature Pack: Wintershade, Mylings, icy
      crossings — already in the notebook).
- [ ] **Frames of Play** — *The Mountain* (single central Series Challenge) and *The
      Crossroads* (multiple evolving **Fronts**) campaign trackers.

### Cross-cutting / tech debt
- [x] **Share / sync a Fellowship** (2026-06-08) — ☰ **Share Fellowship** exports a
      `{_litm:'fellowship', fellowship, relationships}` JSON file; **Import / sync Fellowship**
      replaces this hero's Fellowship card + relationship table with it (`exportFellowship`/
      `importFellowship`).
- [x] PWA **update banner** ("New version ready — tap to update") posting `SKIP_WAITING` —
      done (2026-06-06). Reloads once on `controllerchange`; first install stays silent.
- [x] Per-status **custom Limit** (Challenges can have Limits 1–6; Heroes are always 5) —
      done (2026-06-06). `limit` field + selector; `statusLimit()` defaults legacy/unset to 5.
- [x] **Undo/redo + autosave indicator** (2026-06-08) — ↶/↷ header buttons over `{roster,activeId}`
      snapshots (coalesced, cap 40); a header save-dot flashes "Saving…" → "✓ Saved".
- [x] **Status owner — 🧍 Me vs 👹 Foe** (2026-06-09) — per-status owner + optional target; the
      Tracking list groups foe statuses by target; foe statuses show marked 👹 on the Roll tab and
      only count when tapped; the Spend panel can inflict a tracked foe status. A small step toward
      the Phase-8 Narrator/adversary side, kept player-side. (See Tracking → "Status owner".)

---

## How to verify locally
```bash
cd "Legend in the Mist"
python3 -m http.server 4178      # then open http://localhost:4178/index.html
```
Or just open `character-tracker.html` directly (`file://`) — it runs without a server; only
the service worker / install prompt needs http(s).

## Committed specs (`scripts/`) — run `bash scripts/test.sh`
Two dependency-free Node specs (built-ins only; no npm install) guard against opposite mistakes.
Both exit non-zero and **name the offenders**, so they work as a pre-commit hook / CI gate.
They are deterministic — **do not** wrap them in a retry loop.

- **`scripts/coverage.js`** (source document → code) + **`docs/coverage.json`** — checks the app still
  implements documented rules features. Fails if any `implemented`/`partial`/`unknown` entry's
  **marker** (a code substring that would vanish if the feature were removed) is missing from
  `character-tracker.html`, if an entry lacks `source`/`marker`, or if a non-`implemented` entry lacks a
  `note`. Prints per-status counts. **62 entries** (54 implemented / 3 partial / 4 deliberately-omitted
  / 1 unknown).
  - ⚠️ **`docs/coverage.json` is SEEDED from this CLAUDE.md, NOT verified against the Core Rulebook**
    (the rulebook text isn't in this repo). So `_meta.omissionDetectionActive=false`: a genuine rulebook
    requirement never written into the docs is *absent from the list and undetected*. This buys
    **regression** detection (an implemented feature losing its marker) but not **omission** detection.
    To make omission detection real, obtain the Core Rulebook and add entries section by section
    (new requirements start `unknown` until their marker is found). This proves a *mapping*, not
    correctness — a marker can exist while the code holds wrong values.
  - `partial` entries (each with a note): `quintessence-mechanics` (only Beyond Luck auto-encoded),
    `creation-theme-kits` (the one *Heirloom Longsword* artifact), `creation-general-store` (curated aid,
    not the verbatim book table). `deliberately-omitted`: Narrator challenge profiles, Frames of Play,
    bestiary, 5E crossover (all null-marker, Roadmap Phase 7/8). App-level features (roster, export,
    undo, PWA, onboarding) are intentionally **not** in coverage — they aren't rulebook requirements.
- **`scripts/reachability.js`** (code → user) — static analysis of `character-tracker.html` for
  shipped-but-unreachable surface. Six classes: **1** orphan functions, **2** inert controls (handler →
  undefined name), **3** broken `$()`/`getElementById` id refs, **4** broken `showTab` targets, **5**
  missing shipped files (sw precache / manifest icons / `<link>`/`<script src>`), **6** unopenable/
  unclosable overlays. Currently **all zero**.
  - **False-positive traps already handled** (don't re-investigate): runtime-assigned ids (`el.id='x'`)
    and ids emitted inside `innerHTML` template strings are collected into the id universe; concatenated
    ids (`'x-'+n`) are skipped (literal reads only); method-call tokens (`.click`/`.getElementById`) are
    in `BUILTINS`; **runtime-created overlays** (the wizard's `wzOverlay`, shown via a local var
    `ov.classList.add('show')` not a literal id — the "variable-reference not literal" trap) are treated
    as self-managed when their id is set via `.id='…'`.
  - **Known gaps** (documented, accepted): a purely-recursive orphan function references itself so it
    counts >1 and wouldn't be flagged; class 6 proves a programmatic show/hide path exists, not that a
    *visible* exit control renders (needs DOM). Deliberate exemptions go in the `EXEMPT` object **with a
    reason**; there are none at present.
  - **Proven to fail** (Step 3): breaking a marker makes coverage name `[outcome-tiers]` and exit 1;
    injecting an unreferenced `__ORPHAN_DEMO__` makes reachability name it under class 1 and exit 1.

## Conventions
- **Update this `CLAUDE.md` on every change** — features, Roadmap, and "Current state" stats
  must always reflect the live app. A change isn't done until the docs match (see the
  standing rule at the top of this file).
- Keep it **single-file, dependency-free, offline-first**.
- After any code edit: **mirror to `index.html`** and **bump `CACHE_VERSION`** in `sw.js`.
- Any rules content must be traceable to the Core Rulebook (use the NotebookLM notebook).
- Match the sibling **TOR2E Tracker** patterns (SW strategy, theming, localStorage shape).
