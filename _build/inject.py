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
wiz=open(os.path.join(B,'wizard.js'),encoding='utf-8').read()
datajs='const LITM_DATA = '+json.dumps(data,ensure_ascii=False,separators=(',',':'))+';\n'
block='\n/* ===== Phase 2: creation data + wizard ===== */\n'+datajs+wiz+'\n'
marker='// Service worker'
assert marker in base
out=base.replace(marker, block+'\n'+marker, 1)
open(os.path.join(ROOT,'character-tracker.html'),'w',encoding='utf-8').write(out)
open(os.path.join(ROOT,'index.html'),'w',encoding='utf-8').write(out)
print('built character-tracker.html + index.html, bytes:', len(out))
