#!/usr/bin/env python3
"""Idempotent build: base.html + litm-data.json + wizard.js -> character-tracker.html
Also mirrors to index.html. Run from the project root."""
import json, sys, os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
B=os.path.join(ROOT,'_build')
base=open(os.path.join(B,'base.html'),encoding='utf-8').read()
data=json.load(open(os.path.join(B,'litm-data.json'),encoding='utf-8'))
# Quintessences are sourced from the Core Book via NotebookLM (not the PDF parser),
# so they live in their own file and are merged here — parse_litm.py can't clobber them.
qpath=os.path.join(B,'quintessences.json')
if os.path.exists(qpath):
    data['quintessences']=json.load(open(qpath,encoding='utf-8'))['quintessences']
# Special-Improvement override: the PDF parser drops the 5th entry for five theme types;
# these authoritative 5-each lists (from NotebookLM) replace them so the picker is complete.
spath=os.path.join(B,'specials-override.json')
if os.path.exists(spath):
    for k,v in json.load(open(spath,encoding='utf-8'))['specials'].items():
        data.setdefault('specials',{})[k]=v
# General Store — expanded curated backpack suggestions (a suggestions aid, not a rules table);
# kept in its own file so parse_litm.py's smaller hardcoded list can't clobber it.
gspath=os.path.join(B,'general-store.json')
if os.path.exists(gspath):
    data['generalStore']=json.load(open(gspath,encoding='utf-8'))['generalStore']
# Per-Might example-action table (Reference tab) — Core Book via NotebookLM.
mpath=os.path.join(B,'might-table.json')
if os.path.exists(mpath):
    data['mightTable']=json.load(open(mpath,encoding='utf-8'))['mightTable']
# Action Grimoire worked examples (Reference tab) — Core Book via NotebookLM.
gpath=os.path.join(B,'grimoire.json')
if os.path.exists(gpath):
    data['grimoire']=json.load(open(gpath,encoding='utf-8'))['grimoire']
# Gerrin tutorial walkthrough (tutorial overlay) — Core Book via NotebookLM.
tpath=os.path.join(B,'tutorial.json')
if os.path.exists(tpath):
    data['tutorial']=json.load(open(tpath,encoding='utf-8'))['tutorial']
# Action Grimoire supplement catalog (browser overlay) — separate book via NotebookLM.
agpath=os.path.join(B,'action-grimoire.json')
if os.path.exists(agpath):
    data['actionGrimoire']=json.load(open(agpath,encoding='utf-8'))['sections']
# The Oracle (solo/co-op play tables) — separate supplement.
orpath=os.path.join(B,'oracle.json')
if os.path.exists(orpath):
    odata=json.load(open(orpath,encoding='utf-8')); odata.pop('_source',None)
    data['oracle']=odata
# Character Pack — 20 ready-made Heroes (separate supplement).
ppath=os.path.join(B,'premades.json')
if os.path.exists(ppath):
    data['premades']=json.load(open(ppath,encoding='utf-8'))['premades']
wiz=open(os.path.join(B,'wizard.js'),encoding='utf-8').read()
datajs='const LITM_DATA = '+json.dumps(data,ensure_ascii=False,separators=(',',':'))+';\n'
block='\n/* ===== Phase 2: creation data + wizard ===== */\n'+datajs+wiz+'\n'
marker='// Service worker'
assert marker in base
out=base.replace(marker, block+'\n'+marker, 1)
# ---- UI refresh: embedded display font + inline SVG icon sprite ----
import base64, re
fpath=os.path.join(B,'fonts','cinzel-sub.woff2')   # Cinzel (OFL, _build/fonts/OFL-Cinzel.txt), Latin subset, wght 600-700
if '__CINZEL_WOFF2_B64__' in out:
    out=out.replace('__CINZEL_WOFF2_B64__', base64.b64encode(open(fpath,'rb').read()).decode())
icfg=json.load(open(os.path.join(B,'icons.json'),encoding='utf-8'))
names=sorted(set(icfg['map'].values())|set(icfg['custom'].keys())|set(icfg.get('extra',[])))
syms=[]
for n in names:
    if n in icfg['custom']: inner=icfg['custom'][n]
    else:
        svg=open(os.path.join(B,'icons',n+'.svg'),encoding='utf-8').read()
        inner=re.sub(r'\s+',' ',svg[svg.index('>',svg.index('<svg'))+1:svg.rindex('</svg>')]).strip()
    syms.append('<symbol id="i-'+n+'" viewBox="0 0 24 24">'+inner+'</symbol>')
sprite=('<svg xmlns="http://www.w3.org/2000/svg" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true">'
        '<!-- Lucide icons (ISC) --><defs>'+''.join(syms)+'</defs></svg>')
out=out.replace('<!--__ICON_SPRITE__-->', sprite, 1)
out=out.replace('/*__ICON_MAP__*/', 'const ICON_MAP = '+json.dumps(icfg['map'],ensure_ascii=False)+';', 1)
open(os.path.join(ROOT,'character-tracker.html'),'w',encoding='utf-8').write(out)
open(os.path.join(ROOT,'index.html'),'w',encoding='utf-8').write(out)
print('built character-tracker.html + index.html, bytes:', len(out))
