#!/usr/bin/env python3
"""Parse the LITM Core Book raw text into clean creation-wizard data (JSON).
Extracts: themebooks (concept, power Qs, weakness Qs, quest ideas), theme kits
(name, power-tag options, weakness-tag options, quest), tropes, general store.
Input: the source_get_content dump of 'Legend In The Mist - Core Book.pdf'.
"""
import json, re, sys

SRC = sys.argv[1]
d = json.load(open(SRC)); C = d['content']

def clean(s):
    s = s.replace(' ',' ')
    s = re.sub(r'[ \t]+',' ', s)
    s = s.strip().strip('"').strip()
    return s

# ---- Type anchors (themebook page labels), in document order ----
TYPES = [
    ('Circumstance','Origin'),('Devotion','Origin'),('Past','Origin'),('People','Origin'),
    ('Personality','Origin'),('Skill or Trade','Origin'),('Trait','Origin'),
    ('Duty','Adventure'),('Influence','Adventure'),('Knowledge','Adventure'),
    ('Prodigious Ability','Adventure'),('Relic','Adventure'),('Uncanny Being','Adventure'),
    ('Destiny','Greatness'),('Dominion','Greatness'),('Mastery','Greatness'),('Monstrosity','Greatness'),
    ('Companion','Any'),('Magic','Any'),('Possessions','Any'),
]

# locate each "<Type>  \n\n<Might/Variable Might> Themebook" label position
anchors = []
for name,might in TYPES:
    pat = re.escape(name) + r'\s*\n\n(?:Origin|Adventure|Greatness|Variable Might) Themebook'
    m = re.search(pat, C)
    if not m:
        print('!! no anchor for', name, file=sys.stderr); continue
    anchors.append((name, might, m.start(), m.end()))

# ---- THEMEBOOKS: content precedes each type's Themebook label ----
# The themebook block for type T sits between the previous type page's "Theme Kits"
# header and T's "Themebook" label. We grab text ending at the label and parse
# Power Tag Questions / Weakness Tag Questions / Quest Ideas.
def parse_questions(block):
    out = {'powerQ':[], 'weakQ':[], 'questIdeas':[], 'concept':''}
    # concept = text before 'Power Tag Questions'
    mp = re.search(r'Power Tag Questions', block)
    if mp:
        concept = block[:mp.start()]
        # concept often has guiding questions; keep last paragraph-ish, trim noise
        concept = re.sub(r'https?://\S+','', concept)
        concept = re.sub(r'[0-9a-f]{8}-[0-9a-f-]{27,}','', concept)
        out['concept'] = clean(' '.join(concept.split('\n\n')[-6:]))[:600]
    # power questions: lines like 'A  text B  text ...' until Weakness Tag Questions
    seg = block
    pw = re.search(r'Power Tag Questions(.*?)Weakness Tag Questions(.*?)(Quest Ideas)(.*)', seg, re.S)
    if pw:
        pq, wq, _, qi = pw.group(1), pw.group(2), pw.group(3), pw.group(4)
        out['powerQ'] = split_lettered(pq)
        out['weakQ']  = split_lettered(wq)
        # quest ideas: up to next type label / 'Special Improvements' / 'Theme Kits'
        qi = re.split(r'Special Improvements|Theme Kits|\n\n[A-Z][A-Za-z ]+\s*\n\n(?:Origin|Adventure|Greatness|Variable)', qi)[0]
        frags = [clean(x) for x in re.split(r'\n\n', qi) if clean(x)]
        # merge wrapped fragments: a new idea starts with a capital; continuations are appended
        ideas=[]
        for fr in frags:
            if ideas and not re.match(r'[A-Z“\"]', fr):
                ideas[-1] = ideas[-1] + ' ' + fr
            elif ideas and not re.search(r'[\.!\?…]$', ideas[-1]):
                ideas[-1] = ideas[-1] + ' ' + fr
            else:
                ideas.append(fr)
        out['questIdeas'] = [i for i in ideas if len(i)>4][:6]
    return out

def split_lettered(txt):
    # items begin with 'X ' where X is a single capital letter, may span wrapped lines
    txt = ' '.join(l.strip() for l in txt.split('\n\n'))
    parts = re.split(r'(?<![A-Za-z])([A-Z])\s{1,3}(?=[A-Z(])', ' '+txt)
    items=[]
    # re.split with capture gives [pre, 'A', textA, 'B', textB, ...]
    it = iter(parts[1:])
    for letter in it:
        try: body = next(it)
        except StopIteration: break
        body = clean(body)
        if body: items.append(body)
    return items

themebooks = {}
for i,(name,might,s,e) in enumerate(anchors):
    start = anchors[i-1][3] if i>0 else 0
    block = C[start:s]
    themebooks[name] = parse_questions(block)

# ---- THEME KITS: blocks of  <UPPERCASE TYPE>\n\n<Kit Name>\n\n<power..>\n\n<weak..>\n\n<quest> ----
# They appear after each Themebook label. Collect per type by scanning the page region.
def split_options(lines):
    """Reassemble wrapped tag lines into a flat option list.
    A tag is comma-separated, but wraps across visual lines: a line that does NOT
    end with a comma or a closing quote continues onto the next line."""
    joined=''
    for ln in lines:
        ln=clean(ln)
        if not ln: continue
        if joined and not re.search(r'[,”"]$', joined):
            joined += ' ' + ln
        else:
            joined += (', ' if joined else '') + ln
    # ensure a boundary right after any closing-quote saying
    joined = re.sub(r'([”"])\s+(?=[^,])', r'\1, ', joined)
    return [clean(o) for o in joined.split(',') if clean(o)]

def parse_kits_region(region, typename, specialnames):
    up = typename.upper()
    # The uppercase TYPE marker delimits kit cards. It usually sits on its own line, but the
    # PDF sometimes glues it to the end of the previous kit's quest ("…world… KNOWLEDGE").
    # Match it as: whitespace + TYPE + optional spaces + blank line.
    MARK = r'\s'+re.escape(up)+r'\s*\n\n'
    # bound region: kits end at the earliest of (a) any Special Improvement name,
    # (b) an image URL, after the first kit marker appears.
    firstmark = re.search(MARK, region)
    if firstmark:
        tail = region[firstmark.end():]
        cuts=[]
        for sn in specialnames:
            mb=re.search(r'\n\s*'+re.escape(sn)+r'\s*:', tail)
            if mb: cuts.append(mb.start())
        mu=re.search(r'https?://', tail)
        if mu: cuts.append(mu.start())
        if cuts:
            region = region[:firstmark.end()+min(cuts)]
    kits=[]
    chunks = re.split(MARK, region)
    for ch in chunks[1:]:
        lines = [clean(x) for x in ch.split('\n\n')]
        lines = [x for x in lines if x!='']
        if not lines: continue
        kitname = lines[0]
        if kitname.lower().startswith(('comfort zone','theme kits','special improvements')): continue
        rest = [x for x in lines[1:] if 'http' not in x and x.lower() not in ('theme kits','special improvements')]
        # locate the quest = FIRST prose sentence after the tag lines: ends with . ! ? … (NOT a
        # quote saying, which ends with ”/"), low comma count. Trailing prose after it is dropped.
        # A quest is prose ending in bare terminal punctuation (. ! ? …); it may have several
        # commas ("Drink, dance, and dream, for today is all we have!"). Weakness/power tag
        # lines never end in terminal punctuation, and quoted power-sayings end in ”/" — so
        # those are excluded. Take the first such line (the quest sits after the tag boxes).
        # The quest is the LAST content line(s) and ends in terminal punctuation (. ! ? …) or a
        # closing quote ” (some quests are quoted sayings). Power-sayings also end in ” but sit
        # mid-list (weakness + quest follow them), so scanning from the END finds the quest.
        qend=None
        for j in range(len(rest)-1,0,-1):
            if re.search(r'[\.!\?…”"]$', rest[j]) and len(rest[j])>5:
                qend=j; break
        # walk back over a wrapped quest only when the current first quest line is a clear
        # continuation — i.e. it begins with a lowercase letter. A quest that begins a fresh
        # sentence (capital or opening quote) is single-line, so we never swallow weakness tags.
        qstart=qend
        if qend is not None:
            while qstart>1 and (qend-qstart)<2 and re.match(r'[a-z]', rest[qstart]):
                qstart-=1
        quest = ' '.join(rest[qstart:qend+1]) if qend is not None else ''
        taglines = rest[:qstart] if qstart is not None else rest
        # Power & weakness tags are in separate boxes, so a tag never wraps across the boundary
        # — the split always lands on a line break. The weakness box is the trailing line(s):
        # collect from the end until we have >=3 comma-items or 2 lines (covers wrapped weakness).
        wlines=[]; cnt=0
        for ln in reversed(taglines):
            wlines.insert(0,ln); cnt += ln.count(',')+1
            if cnt>=3 or len(wlines)>=2: break
        plines = taglines[:len(taglines)-len(wlines)]
        if plines:
            power=split_options(plines); weak=split_options(wlines)
        else:  # tiny kit fallback
            allo=split_options(taglines); power=allo[:-1] or allo; weak=allo[-1:] if len(allo)>1 else []
        kits.append({'name':kitname, 'power':power, 'weak':weak, 'quest':quest})
    return kits

# region for a type = from its Themebook label to the next type's themebook content start
themekits = {}
specials = {}
for i,(name,might,s,e) in enumerate(anchors):
    end = anchors[i+1][2] if i+1 < len(anchors) else (s+9000)
    region = C[e:end]
    # special improvements: 5 bulleted 'Name: desc' before 'Theme Kits'
    sp = re.search(r'(.*?)\nTheme Kits', region, re.S)
    spblock = sp.group(1) if sp else ''
    sps = re.findall(r'\n\s*([A-Z][A-Za-z\' ]+?):\s*(.+?)(?=\n\s*[A-Z][A-Za-z\' ]+?:|\Z)', spblock, re.S)
    specials[name] = [{'name':clean(a),'desc':clean(b)[:400]} for a,b in sps][:5]
    themekits[name] = parse_kits_region(region, name, [s['name'] for s in specials[name]])

# ---- TROPES ----
tropes=[]
# each trope: Name + flavor, then 'THEME KITS', 3 '(Type, page)', 'Choose One:', 3 options, 'Backpack: a, b, or c'
trope_iter = list(re.finditer(r'THEME KITS', C))
for m in trope_iter:
    head = C[max(0,m.start()-900):m.start()]
    tail = C[m.end():m.end()+900]
    # themes before 'Choose One'
    pre, _, post = tail.partition('Choose One')
    themes = re.findall(r'([A-Z][A-Za-z\'\[\] ]+?)\s*\(([A-Za-z ]+?),\s*page', pre)
    fourth = re.findall(r'([A-Z][A-Za-z\'\[\] ]+?)\s*\(([A-Za-z ]+?),\s*page', post)
    bp = re.search(r'Backpack:\s*(.+?)(?:\n\n|$)', post)
    if len(themes)!=3 or len(fourth)<2:  # not a trope (could be the general store sample)
        continue
    # trope name = leading Title-Case tokens (allowing particles) of the flavor block,
    # dropping the final capitalized token (which is the flavor sentence's first word).
    blocks=[clean(b) for b in head.split('\n\n') if clean(b)]
    name=''
    PART={'of','the','a','an','and','to','in','from','for','with',"o'"}
    if blocks:
        last=blocks[-1]
        toks=last.split(' ')
        keep=[]
        for t in toks:
            if re.match(r"[A-Z(\[]", t) or t.lower() in PART:
                keep.append(t)
            else:
                break
        # drop trailing particle(s) and the final capitalized token (flavor's first word)
        while keep and keep[-1].lower() in PART: keep.pop()
        if len(keep)>1: keep=keep[:-1]
        name=clean(' '.join(keep))
    def norm(t):
        t=clean(t)
        fix={'Skill Or Trade':'Skill or Trade'}
        return fix.get(t,t)
    tropes.append({
        'name':name,
        'themes':[{'tag':clean(a),'type':norm(b)} for a,b in themes[:3]],
        'fourth':[{'tag':clean(a),'type':norm(b)} for a,b in fourth[:3]],
        'backpack':[clean(x) for x in re.split(r',| or ', bp.group(1))] if bp else []
    })

# ---- TROPE NAME FIXES (parser truncations) ----
TROPE_FIX = {
 'Traveling':'Traveling Minstrel','Aspiring':'Aspiring Squire','Wandering':'Wandering Mystic',
 'River':'River Spirit','Hope of the':'Hope of the Realm','':'Cunning Shapeshifter',
 'Dread Vampire Blood.':'Dread Vampire',
}
KNOWN_TYPES={'Circumstance','Devotion','Past','People','Personality','Skill or Trade','Trait',
 'Duty','Influence','Knowledge','Prodigious Ability','Relic','Uncanny Being',
 'Destiny','Dominion','Mastery','Monstrosity','Companion','Magic','Possessions'}
for t in tropes:
    if t['name'] in TROPE_FIX: t['name']=TROPE_FIX[t['name']]
    # map magic sub-schools captured as types back to Magic
    for grp in (t['themes'],t['fourth']):
        for th in grp:
            if th['type'] not in KNOWN_TYPES:
                th['tag']=th['type']; th['type']='Magic'

# ---- FELLOWSHIP KITS ----
fstart = C.rfind('FELLOWSHIP', 0, 274200)
fstart = C.find('FELLOWSHIP  \n\nItinerant')
if fstart<0: fstart = C.find('Itinerant Sellswords')-14
fend = C.find('Chapter II', fstart)
fregion = '\n\nignore\n\n' + C[fstart:fend]
fkits = parse_kits_region(fregion, 'FELLOWSHIP', [])
fkits = [k for k in fkits if not k['name'].lower().startswith(('chapter','how to','theme kits','special'))][:8]

# ---- RELATIONSHIP TAGS (curated from RELATIONSHIP TAG EXAMPLES) ----
relationship = {
 'Warm feelings':['admiring','amusing','bosom buddies','childhood friends','flirty','friendly','in love','good company','have their back','like family','soulmates'],
 'Bad feelings':['angry','bad blood','cannot relate','cold to me','hatred','jealous','makes me sad','mocking','offended','prejudiced','resentful'],
 'Cooperation':['appreciative','coordinated','domineering','mentoring','protective','rival','submissive','supportive','work well together'],
 "It's complicated":['casual lovers','complicated past','leverage on them','indebted','indifferent','need them for…','pining','painful to watch','reminds me of…','shared history'],
}

# ---- GENERAL STORE SUGGESTIONS (curated from the General Store section) ----
generalStore = {
 'Light armor':['buff coat','gambeson','arming doublet','leather armor','boiled leather armor','hide armor','jack of plates','brigandine'],
 'Heavy armor':['cuirass','breastplate','chainmail','scale armor','plate armor','helm','greaves','pauldrons'],
 'Shields':['buckler','round shield','kite shield','tower shield','spiked roundshield'],
 'Weapons':['dagger','arming sword','longsword','greatsword','spear','mace','war axe','warhammer','quarterstaff','hunting bow','longbow','crossbow','sling','throwing knives'],
 'Gear':['rope and hook','torch','lantern','bedroll','cookware','tinderbox','tent','climbing gear','healer’s kit','traveler’s rations','waterskin','fishing tackle','steel trap','lockpicks','spyglass'],
 'Valuables':['bag of coins','precious gem','signet ring','fine cloak','artisanal necklace','map of the realm','letter of introduction'],
}

out = {
  'themebooks':themebooks,
  'themekits':themekits,
  'specials':specials,
  'tropes':tropes,
  'fellowshipKits':fkits,
  'relationship':relationship,
  'generalStore':generalStore,
}
json.dump(out, open(sys.argv[2],'w'), indent=1, ensure_ascii=False)
print('themebooks:',len(themebooks),'kits types:',sum(1 for k in themekits.values() if k),
      'total kits:',sum(len(v) for v in themekits.values()),
      'tropes:',len(tropes),'specials types:',sum(1 for v in specials.values() if v))
