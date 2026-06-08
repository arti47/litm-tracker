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
wiz=open(os.path.join(B,'wizard.js'),encoding='utf-8').read()
datajs='const LITM_DATA = '+json.dumps(data,ensure_ascii=False,separators=(',',':'))+';\n'
block='\n/* ===== Phase 2: creation data + wizard ===== */\n'+datajs+wiz+'\n'
marker='// Service worker'
assert marker in base
out=base.replace(marker, block+'\n'+marker, 1)
open(os.path.join(ROOT,'character-tracker.html'),'w',encoding='utf-8').write(out)
open(os.path.join(ROOT,'index.html'),'w',encoding='utf-8').write(out)
print('built character-tracker.html + index.html, bytes:', len(out))
