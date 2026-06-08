#!/usr/bin/env python3
"""Parse the LITM Character Pack markdown into _build/premades.json.

Source: the Character Pack (a separate supplement: 20 ready-made Heroes, each
with a tagline, flavor quote, 4 fully-built themes, a backpack, and example
actions). Run:

    python3 _build/parse_premades.py <character_pack.md> _build/premades.json
"""
import json, re, sys, os

# 20 theme types (proper case) — used to detect theme headings + map UPPER->proper.
TYPES = ['Circumstance','Devotion','Past','People','Personality','Skill or Trade','Trait',
         'Duty','Influence','Knowledge','Prodigious Ability','Relic','Uncanny Being',
         'Destiny','Dominion','Mastery','Monstrosity','Companion','Magic','Possessions']
TYPE_BY_UPPER = {t.upper(): t for t in TYPES}

# The six high-power, supernatural ready-mades (Adventure/Greatness beings).
POWERFUL = {'Bogomil','Daunt Of House Mattina','Gaelle','GlintFallow','Kinsi','Gullencry'}

SMALL = {'of','the','and','a','an','to','in','for'}

def titlecase(s):
    words = s.split()
    out = []
    for i, w in enumerate(words):
        lw = w.lower()
        if i > 0 and lw in SMALL:
            out.append(lw)
        else:
            out.append(w[:1].upper() + w[1:].lower())
    return ' '.join(out)

def split_tags(line):
    return [t.strip() for t in line.split(',') if t.strip()]

def parse_char(block):
    """block: text for one '## Name' character (without the leading '## ')."""
    lines = block.split('\n')
    name = lines[0].strip()
    c = {'name': name, 'tagline': '', 'quote': '', 'tier': '', 'themes': [],
         'backpack': [], 'examples': []}
    c['tier'] = 'powerful' if name in POWERFUL else 'dalesfolk'

    # tagline = first **...** line; quote = first > line.
    for ln in lines[1:]:
        s = ln.strip()
        if not c['tagline'] and s.startswith('**') and s.endswith('**'):
            c['tagline'] = titlecase(s.strip('*').strip())
            continue
        if not c['quote'] and s.startswith('>'):
            c['quote'] = s.lstrip('>').strip().strip('"').strip()
            break

    # Themes: split on theme-heading lines.
    th = None
    section = None  # None | 'backpack' | 'examples'
    head_re = re.compile(r'^\*\*([A-Z][A-Z \-]+?):\s*(.+?)\*\*$')
    for ln in lines:
        s = ln.strip()
        if s == '**BACKPACK**':
            section = 'backpack'; th = None; continue
        if s == '**EXAMPLE ACTIONS**':
            section = 'examples'; th = None; continue
        if section == 'backpack':
            if s and not s.startswith('*('):  # skip italic optional-rules note
                c['backpack'] = split_tags(s); section = None
            continue
        if section == 'examples':
            if s.startswith('*'):
                txt = re.sub(r'^\*\s*', '', s)
                txt = txt.replace('**', '')
                c['examples'].append(txt.strip())
            continue
        m = head_re.match(s)
        if m and m.group(1).strip() in TYPE_BY_UPPER:
            th = {'type': TYPE_BY_UPPER[m.group(1).strip()],
                  'title': titlecase(m.group(2).strip()),
                  'power': [], 'weak': '', 'advance': [], 'quest': '',
                  'desc': '', 'special': None}
            c['themes'].append(th)
            continue
        if th is None:
            continue
        # bullet fields inside a theme
        bm = re.match(r'^\*\s*\*\*(.+?)\*\*:\s*(.*)$', s)
        if not bm:
            continue
        label, val = bm.group(1).strip(), bm.group(2).strip()
        if label == 'Base Power Tags':
            th['power'] = split_tags(val)
        elif label.startswith('Weakness Tag'):
            th['weak'] = val
        elif label == 'New Power Tags':
            th['advance'] = split_tags(val)
        elif label == 'Quest':
            th['quest'] = val.strip('"').strip()
        elif label == 'Description':
            th['desc'] = val
        elif label.startswith('Special Improvement'):
            nm = label.split('-', 1)[1].strip() if '-' in label else label
            th['special'] = {'name': nm, 'desc': val}
    return c

def main():
    src = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
        os.path.dirname(__file__), 'character_pack.md')
    out = sys.argv[2] if len(sys.argv) > 2 else os.path.join(
        os.path.dirname(__file__), 'premades.json')
    text = open(src, encoding='utf-8').read()
    # Split into '## Name' blocks (ignore the leading COMMON RULES section under '##').
    parts = re.split(r'\n##\s+', text)
    chars = []
    for p in parts:
        head = p.split('\n', 1)[0].strip()
        if head.upper().startswith('COMMON RULES') or head.startswith('#'):
            continue
        if '### Themes' not in p:
            continue
        chars.append(parse_char(p))
    data = {'_source': 'LITM Character Pack supplement (20 ready-made Heroes)',
            'premades': chars}
    json.dump(data, open(out, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f'parsed {len(chars)} characters -> {out}')
    # quick sanity
    for c in chars:
        assert len(c['themes']) == 4, f"{c['name']}: {len(c['themes'])} themes"
        for t in c['themes']:
            assert t['power'] and t['weak'] and t['special'], f"{c['name']} / {t['title']}"
    print('sanity OK: all 4 themes w/ power+weak+special')

if __name__ == '__main__':
    main()
