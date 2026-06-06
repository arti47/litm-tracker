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
Improvements). Re-run to refresh:

```bash
wc -lc character-tracker.html              # size + line count
grep CACHE_VERSION sw.js                    # service-worker cache version (bump on deploy)
grep -o "litm-[a-z0-9-]*" character-tracker.html | sort -u   # localStorage keys
```

As of last verification:
- **`character-tracker.html`**: ~1,622 lines / ~200 KB (includes the embedded Phase-2
  creation dataset, ~130 KB of it the `LITM_DATA` constant).
- **`sw.js` `CACHE_VERSION`**: `litm-v5` (bump on every deploy)
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
- `_build/wizard.js` — the self-contained creation-wizard module (injects its own CSS/DOM,
  hooks the "New Hero" buttons).
- `_build/parse_litm.py` — regenerates `litm-data.json` from the Core Book raw text (the
  NotebookLM `source_get_content` dump of *Legend In The Mist - Core Book.pdf*).
- `_build/inject.py` — **idempotent**: `base.html` + `litm-data.json` + `wizard.js` →
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
3. `<header>` — sticky title + 👥 roster + ☰ menu, then a 5-tab nav.
4. `<section.panel>` ×5 — **Hero / Fellowship / Tracking / Roll / Rules**.
5. Overlays — Menu sheet, Roster sheet, hidden import `<input type=file>`, toast.
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
  `litm-data.json`, `parse_litm.py`, `inject.py`.

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
  - `specials` — 20 types × Special Improvements {name, desc}. The Core Book lists **5** per
    type, but the parser currently recovers only **4** for five types (Personality, Influence,
    Destiny, Companion, Possessions) — see the Phase-3 data-gap follow-up. The picker shows
    whatever is present, so this is non-fatal but incomplete.
  - `tropes` — 28 × {name, themes[3], fourth[3], backpack[]}
  - `fellowshipKits` — 6 × {name, power[], weak[], quest}
  - `relationship` — relationship-tag examples grouped in 4 categories
  - `generalStore` — backpack item suggestions grouped in 6 categories

### State model (one hero)
```
{ id, playerName, heroName, promise(0–5), fulfillments, quintessences, notes,
  backpack:[{text,type:'story'|'hindering',scratched}],
  themes:[{type,title,power:[{text,scratched}],weak:[{text}],quest,improve,abandon,milestone,
           special(free-text notes),specials:[{name,desc}]}] ×4 (variable),
  fellowship:{…same shape as a theme…},
  relationships:[{name,tag,scratched}],
  statuses:[{name,boxes:[6×bool]}],
  scene:[{text,type,scratched}] }
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
- **Improve / Abandon / Milestone** tracks (3 pips each), per the development rules.
- **Special Improvements (Phase 3)** — a real **picker** (not free text): a 🔖 modal lists the
  improvements for the theme's type (from `LITM_DATA.specials`; 5 per type, 4 for five types
  pending re-extraction), each with its rulebook
  benefit; tap to add/remove (each once per theme). Chosen ones show as removable cards on the
  card; eligibility hint ("gain one when the Improve track fills"). A separate **Notes**
  free-text box preserves the old `special` field. Works the same on the Fellowship card.

### Fellowship
- A full shared theme card (type, title, single-use power tags, weakness, quest, tracks,
  special improvements).
- **Fellowship relationships** — name + single-use relationship tag per fellow Hero, scratchable.

### Tracking
- **Statuses** — named, with a **6-box tier track**. Tap to set/clear tier (clearing a box
  also clears boxes to its right). Highlights the current tier; **Limit 5** warning at tier
  5 (overcome) and tier 6 (killed/transformed).
- **Scene story tags** — environment/temporary tags; flip helpful/hindering; remove.

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
  - Double 6 = guaranteed Success; double 1 = guaranteed Consequences (regardless of Power).
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

### Rules tab (quick reference, all from the rulebook)
Counting Power · roll outcome tiers + special rolls · spending Power on Effects (exact costs)
· Reactions · statuses (tier/stack/reduce/Limit) · Hero development tracks · Camping summary.

### App-level
- **Multi-hero roster** (create / switch / delete).
- **Export / import** a hero as JSON.
- **Light/dark** theme (manual + auto), iOS safe-area aware, installable PWA, fully offline.

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

### Phase 3 — Theme Special Improvements & Quintessences (Special Improvements ✅ DONE 2026-06-06)
*Note: `LITM_DATA.specials` (20 types × ~5 Special Improvements; 5 types have 4 — see data-gap
follow-up) is already extracted and embedded. The Special-Improvements picker ships; the
**Quintessence** half is deferred — its
exact effect text isn't in `LITM_DATA` and couldn't be sourced from the Core Rulebook in this
environment (the NotebookLM notebook wasn't reachable). Paste the quintessence list + effects
to finish it.*
- [x] **Special Improvements** — each of the 20 theme types has exactly **5**; selectable
      (each once). Replaced the free-text box with a real **picker** (🔖 modal `#specialOverlay`,
      `openSpecialPicker`/`renderSpecialPicker`/`toggleSpecial`, data via `litmSpecials(type)`)
      that records the chosen improvement and its rule benefit on `theme.specials:[{name,desc}]`.
      Chosen ones render as removable cards; a Notes box preserves the legacy `special` string.
      Works on themes **and** the Fellowship card.
- [ ] **Quintessence** picker at a Moment of Fulfillment — ship the named list (Beyond Luck,
      Diligent Drudge, Fumbling Master, Jack of Many Lives, Magus Magnificent, Master of
      Craft, Master of the Little Things, Nine Lives, Old Hand, Pillar of Wisdom, The Bearer,
      The Common Hero, Virtuoso, Budding/Great Thaumaturge, …) with their effects.
      *(Blocked: needs Core-Book effect text — not yet in `LITM_DATA`.)*
- [ ] Encode *Beyond Luck* etc. into the roller (e.g., no auto-miss on double ones).
      *(Follows the Quintessence picker.)*
- [ ] *Data-gap follow-up:* re-extract the **5th** Special Improvement for **Personality,
      Influence, Destiny, Companion, Possessions** (parser dropped one each). Needs the Core
      Book raw text + a `parse_litm.py` tweak, then `inject.py`.

### Phase 4 — Theme Development automation
- [ ] Auto-prompt at the **3rd Improve** (gain improvement, reset track), **3rd Milestone**
      (theme evolves → mark Promise), **3rd Abandon** (theme replaced → mark Promise + trade
      parts for improvements).
- [ ] **Promise trading** helper — +1 Promise per power tag beyond 3, per weakness beyond 1,
      per Special Improvement traded; trigger Moment of Fulfillment on filling 5.
- [ ] **Quests & Transformations** guided flow (evolve vs replace: new title/type/Might,
      revise tags/quest, keep or trade Special Improvements).

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

### Phase 6 — Scene & session context (still player-side)
- [ ] **Scene tracker** — current stakes, Challenges in view, Threats pending; the game loop
      (Establish → Action → Consequences) as a lightweight checklist.
- [ ] **Camping & Sojourn** wizard — expire story tags → establish place → each Hero takes 2
      activities (3 with Consequences): **Rest** (recover statuses + scratched power tags),
      **Reflect** (mark Improve), **Camp Action** (count Power, spend half without rolling, or
      roll); then recover a Fellowship power tag or renew one relationship tag.
- [ ] **Journey** montage helper — Vignette Challenges resolved with Quick actions.

### Phase 7 — Reference & onboarding
- [ ] **Action Grimoire** browser — searchable example spends ("Climb a ledge", "Tame a
      beast", "Ask about a legend at a tavern", "Bandage an ally", "Resist a spell").
- [ ] **Might / Favored / Imperiled** explainer with the rulebook's action-Might table
      (Climb/Archery/Sneak/Craft/Heal at Origin/Adventure/Greatness).
- [ ] Built-in **tutorial** (the Gerrin deer-stalker walkthrough) as a first-run guide.
- [ ] **5E D&D crossover** quick-reference (class/race → theme-kit hints) — from the notebook's
      crossover source.

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
- [ ] PWA **update banner** ("new version — tap to update") posting `SKIP_WAITING` (the SW
      already supports the message; the page UI is not wired yet).
- [ ] Per-status **custom Limit** (Challenges can have Limits 1–6; Heroes are always 5).
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
