/* ============================================================
   Legend in the Mist — Hero Creation Wizard (Phase 2)
   Self-contained: injects CSS, builds its overlay, hooks "New Hero".
   Data: LITM_DATA (themebooks, themekits, specials, tropes,
   fellowshipKits, relationship, generalStore). Rules-faithful to the
   LITM Core Rulebook (extracted from the source PDF).
   ============================================================ */
(function(){
  "use strict";
  const D = (typeof LITM_DATA!=='undefined') ? LITM_DATA : {};
  const TYPE_ORDER = {
    Origin:['Circumstance','Devotion','Past','People','Personality','Skill or Trade','Trait'],
    Adventure:['Duty','Influence','Knowledge','Prodigious Ability','Relic','Uncanny Being'],
    Greatness:['Destiny','Dominion','Mastery','Monstrosity'],
    'Any Might':['Companion','Magic','Possessions']
  };
  const mightOf = (typeof MIGHT_OF!=='undefined') ? MIGHT_OF : {};

  // ---------- CSS ----------
  const css = `
  .wz-ov{position:fixed;inset:0;z-index:120;background:var(--bg);display:none;flex-direction:column}
  .wz-ov.show{display:flex}
  .wz-hd{position:sticky;top:0;background:var(--teal);color:#f3f7f2;padding:calc(var(--safe-top) + 10px) 12px 10px;display:flex;align-items:center;gap:10px;box-shadow:0 2px 8px var(--shadow)}
  .wz-hd .t{flex:1;font-family:Georgia,serif;font-weight:700;font-size:17px}
  .wz-x{background:rgba(255,255,255,.16);border:none;color:#fff;width:36px;height:36px;border-radius:9px;font-size:18px}
  .wz-prog{display:flex;gap:4px;padding:8px 12px;background:var(--bg-deep)}
  .wz-prog span{flex:1;height:4px;border-radius:2px;background:var(--border)}
  .wz-prog span.on{background:var(--teal)}
  .wz-body{flex:1;overflow-y:auto;padding:14px 12px calc(var(--safe-bot) + 100px);max-width:720px;margin:0 auto;width:100%}
  .wz-foot{position:fixed;bottom:0;left:0;right:0;display:flex;gap:10px;padding:12px 12px calc(var(--safe-bot) + 12px);background:var(--card-bg);border-top:1px solid var(--border);z-index:5}
  .wz-foot .btn{flex:1}
  .wz-h{font-family:Georgia,serif;color:var(--teal);font-size:20px;margin:0 0 4px}
  .wz-sub{color:var(--ink-soft);font-size:13px;margin:0 0 14px;line-height:1.45}
  .wz-card{background:var(--card-bg);border:1px solid var(--border);border-radius:13px;padding:14px;margin-bottom:12px;box-shadow:0 1px 3px var(--shadow)}
  .wz-pick{display:block;width:100%;text-align:left;background:var(--card-bg);border:1.5px solid var(--border);border-radius:12px;padding:13px;margin-bottom:10px;color:var(--ink)}
  .wz-pick:active{filter:brightness(.97)}
  .wz-pick.sel{border-color:var(--teal);box-shadow:0 0 0 1px var(--teal)}
  .wz-pick .nm{font-weight:700;font-size:16px;font-family:Georgia,serif}
  .wz-pick .meta{font-size:12px;color:var(--ink-soft);margin-top:3px}
  .wz-pick .fl{font-size:13px;color:var(--ink-soft);margin-top:6px;line-height:1.4}
  .chips{display:flex;flex-wrap:wrap;gap:7px;margin:8px 0}
  .chip{padding:8px 12px;border-radius:18px;border:1.5px solid var(--border);background:var(--card-bg);color:var(--ink);font-size:14px;font-weight:600}
  .chip.pw{background:var(--power);color:var(--power-ink);border-color:transparent}
  .chip.wk{background:var(--weak);color:var(--weak-ink);border-color:transparent}
  .chip.sel{box-shadow:0 0 0 2px var(--teal);}
  .chip.dim{opacity:.5}
  .wz-fld{display:block;margin:10px 0}
  .wz-fld>span{display:block;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;color:var(--ink-soft);margin-bottom:4px}
  .wz-fld input,.wz-fld textarea,.wz-fld select{width:100%;padding:9px 10px;border:1px solid var(--border);border-radius:9px;font-size:15px;font-family:inherit;background:var(--card-bg);color:var(--ink)}
  .qlist{margin:6px 0 0;padding-left:0;list-style:none}
  .qlist li{font-size:13px;color:var(--ink-soft);padding:3px 0 3px 18px;position:relative;line-height:1.4}
  .qlist li:before{content:"•";position:absolute;left:4px;color:var(--teal)}
  .qlist li b{color:var(--ink)}
  .wz-note{font-size:12px;color:var(--ink-soft);margin-top:6px}
  .wz-warn{background:var(--bad-bg);color:var(--bad);border-radius:8px;padding:8px 10px;font-size:13px;margin:8px 0}
  .seg2{display:flex;flex-wrap:wrap;gap:5px;margin:6px 0}
  .seg2 button{padding:7px 10px;border:1.5px solid var(--border);background:var(--card-bg);color:var(--ink);border-radius:8px;font-size:12px;font-weight:600}
  .seg2 button.on{background:var(--teal);color:#fff;border-color:var(--teal)}
  `;
  const st=document.createElement('style'); st.textContent=css; document.head.appendChild(st);

  // ---------- Overlay DOM ----------
  const ov=document.createElement('div'); ov.className='wz-ov'; ov.id='wzOverlay';
  ov.innerHTML=`<div class="wz-hd"><button class="wz-x" id="wzClose">✕</button><div class="t" id="wzTitle">New Hero</div></div>
    <div class="wz-prog" id="wzProg"></div>
    <div class="wz-body" id="wzBody"></div>
    <div class="wz-foot"><button class="btn ghost" id="wzBack">Back</button><button class="btn" id="wzNext">Next</button></div>`;
  document.body.appendChild(ov);
  const $b=()=>document.getElementById('wzBody');
  document.getElementById('wzClose').onclick=()=>{ if(confirm('Discard this new Hero?')) closeWizard(); };

  // ---------- Wizard state ----------
  let draft=null, path=null, ti=0, steps=[], stepIdx=0;
  function blank(){ return (typeof blankHero==='function')?blankHero():{themes:[]}; }

  function startCreator(){
    if(typeof closeOverlays==='function') closeOverlays();
    draft=blank();
    draft.heroName=''; draft.playerName=(typeof S!=='undefined'&&S?S.playerName:'')||'';
    draft.themes=[]; draft.relationships=[]; draft._fellowChosen=false;
    path=null; ti=0; stepIdx=0;
    ov.classList.add('show'); render();
  }
  window.startCreator=startCreator;
  function closeWizard(){ ov.classList.remove('show'); draft=null; }

  function buildSteps(){
    if(path==='premade'){ steps=['premade']; }
    else if(path==='simplest'){ steps=['name','store','fellowship']; }
    else if(path==='quickest'){ steps=['name','trope','t0','t1','t2','t3','store','fellowship']; }
    else { steps=['name','d0','d1','d2','d3','store','fellowship']; } // detailed
  }

  // ---------- Render dispatch ----------
  function render(){
    const body=$b(); body.scrollTop=0;
    if(!path){ renderPath(); document.getElementById('wzProg').innerHTML=''; setFoot(false,false); return; }
    buildSteps();
    const step=steps[stepIdx];
    // progress bar
    document.getElementById('wzProg').innerHTML=steps.map((s,i)=>`<span class="${i<=stepIdx?'on':''}"></span>`).join('');
    if(step==='premade') renderPremade();
    else if(step==='name') renderName();
    else if(step==='trope') renderTrope();
    else if(/^t\d$/.test(step)) renderKit(+step[1]);
    else if(/^d\d$/.test(step)) renderDetail(+step[1]);
    else if(step==='store') renderStore();
    else if(step==='fellowship') renderFellowship();
  }
  function setFoot(showBack,showNext,nextLabel){
    document.getElementById('wzBack').style.visibility=showBack?'visible':'hidden';
    const n=document.getElementById('wzNext');
    n.style.visibility=showNext?'visible':'hidden';
    n.textContent=nextLabel||'Next';
  }
  document.getElementById('wzBack').onclick=()=>{
    if(path==='premade' && draft && draft._pm!=null){ draft._pm=null; render(); return; }
    if(stepIdx>0){ stepIdx--; render(); } else { if(confirm('Discard this new Hero?')) closeWizard(); }
  };
  document.getElementById('wzNext').onclick=()=>nextStep();
  function nextStep(){
    if(stepIdx<steps.length-1){ stepIdx++; render(); }
    else commit();
  }

  // ---------- Step: path ----------
  function renderPath(){
    document.getElementById('wzTitle').textContent='New Hero';
    $b().innerHTML=`
      <h2 class="wz-h">How will you build your Hero?</h2>
      <p class="wz-sub">A Hero is four <b>themes</b>, each a set of tags + a Quest. Pick a method — you can edit everything afterward.</p>
      <button class="wz-pick" data-p="quickest"><div class="nm">⚡ Quickest — pick a Trope</div><div class="fl">Choose a ready-made recipe (3 themes + a 4th), then pick your tags from each theme's kit. Fastest way to a playable Hero.</div></button>
      <button class="wz-pick" data-p="detailed"><div class="nm">📖 Detailed — answer Themebooks</div><div class="fl">Build each theme by answering its themebook questions. Most thoughtful and personal.</div></button>
      <button class="wz-pick" data-p="simplest"><div class="nm">✍️ Simplest — free-form</div><div class="fl">Start with a blank sheet and write your four themes yourself.</div></button>
      ${(D.premades&&D.premades.length)?`<button class="wz-pick" data-p="premade"><div class="nm">📦 Ready-made — pick a pre-built Hero</div><div class="fl">Choose one of ${D.premades.length} fully-built Heroes from the Character Pack — themes, tags, Quests, Special Improvements, and backpack all done. Edit afterward.</div></button>`:''}`;
    $b().querySelectorAll('[data-p]').forEach(btn=>btn.onclick=()=>{
      path=btn.dataset.p; stepIdx=0;
      if(path==='premade'){ draft._pm=null; }
      draft.themes=[blankT(),blankT(),blankT(),blankT()];
      render();
    });
  }
  function blankT(){ return {id:uid(),type:'Skill or Trade',title:'',power:[],weak:[],quest:'',improve:0,abandon:0,milestone:0,special:'',specials:[]}; }

  // ---------- Step: premade (ready-made Hero) ----------
  function renderPremade(){
    document.getElementById('wzTitle').textContent='Ready-made Hero';
    const list=D.premades||[];
    // ----- list view (grouped by tier) -----
    if(draft._pm==null){
      setFoot(true,false);
      const groups=[
        ['dalesfolk','Dalesfolk Heroes','Ordinary folk of the Dales — a typical rustic-fantasy start (mostly Origin themes).'],
        ['powerful','Uncanny & Powerful Beings','High-power options — spirits, a revenant, a dragon. Check with your Narrator before choosing one.']
      ];
      let html=`<h2 class="wz-h">Pick a ready-made Hero</h2><p class="wz-sub">A fully-built Hero — four themes with tags, Quests, Special Improvements, and a packed backpack. Tap one to preview, then create. You can edit everything afterward on the sheet.</p>`;
      groups.forEach(([key,label,blurb])=>{
        const items=list.map((c,i)=>[c,i]).filter(([c])=>c.tier===key);
        if(!items.length) return;
        html+=`<div class="wz-fld" style="margin:14px 0 2px"><span>${esc(label)}</span></div><p class="wz-note" style="margin:0 0 8px">${esc(blurb)}</p>`;
        items.forEach(([c,i])=>{
          html+=`<button class="wz-pick" data-i="${i}"><div class="nm">${esc(c.name)}</div><div class="fl">${esc(c.tagline)}</div></button>`;
        });
      });
      $b().innerHTML=html;
      $b().querySelectorAll('[data-i]').forEach(b=>b.onclick=()=>{ draft._pm=+b.dataset.i; render(); });
      return;
    }
    // ----- preview view -----
    const c=list[draft._pm]; if(!c){ draft._pm=null; render(); return; }
    setFoot(true,true,'Create Hero ✓');
    let html=`<button class="wz-pick" id="wz_pmback" style="margin-bottom:12px;padding:9px 13px"><div class="nm" style="font-size:14px">← Choose a different Hero</div></button>`;
    html+=`<h2 class="wz-h">${esc(c.name)}</h2><p class="wz-sub">${esc(c.tagline)}</p>`;
    if(c.quote) html+=`<div class="wz-card" style="font-style:italic;color:var(--ink-soft);font-size:13px;line-height:1.55">“${esc(c.quote)}”</div>`;
    c.themes.forEach(t=>{
      html+=`<div class="wz-card">
        <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;color:var(--ink-soft)">${esc(t.type)} · ${esc(mightLabel(t.type))}</div>
        <div style="font-family:Georgia,serif;font-size:17px;font-weight:700;color:var(--teal);margin:2px 0 7px">${esc(t.title)}</div>
        <div class="chips">${t.power.map(p=>`<span class="chip pw">${esc(p)}</span>`).join('')}<span class="chip wk">${esc(t.weak)}</span></div>
        <div class="wz-note"><b>Quest:</b> ${esc(t.quest)}</div>
        <div class="wz-note" style="margin-top:5px"><b>Special — ${esc(t.special.name)}:</b> ${esc(t.special.desc)}</div>
        <div class="wz-note" style="margin-top:5px"><b>Advancement tags:</b> ${t.advance.map(esc).join(' · ')}</div>
      </div>`;
    });
    html+=`<div class="wz-card"><div class="wz-fld" style="margin-bottom:4px"><span>Backpack</span></div><div class="chips">${(c.backpack||[]).map(x=>`<span class="chip">${esc(x)}</span>`).join('')}</div></div>`;
    if(c.examples&&c.examples.length){
      html+=`<div class="wz-card"><div class="wz-fld" style="margin-bottom:4px"><span>Example actions</span></div><ul class="qlist">${c.examples.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`;
    }
    html+=`<p class="wz-note">Creating this Hero copies all of the above onto your sheet. Descriptions, advancement tags, the quote, and these example actions are saved to the Hero's notes for reference.</p>`;
    $b().innerHTML=html;
    document.getElementById('wz_pmback').onclick=()=>{ draft._pm=null; render(); };
  }
  function commitPremade(){
    const c=(D.premades||[])[draft._pm]; if(!c){ closeWizard(); return; }
    const hero=blank();
    hero.id=uid();
    hero.playerName=draft.playerName||'';
    hero.heroName=draft.heroName||c.name;
    hero.themes=c.themes.map(t=>({
      id:uid(), type:t.type, title:t.title,
      power:(t.power||[]).map(p=>({id:uid(),text:p,scratched:false})),
      weak:[{id:uid(),text:t.weak||''}],
      quest:t.quest||'', improve:0, abandon:0, milestone:0,
      special:'Background: '+(t.desc||'')+(t.advance&&t.advance.length?('\n\nAdvancement power tags (gain via Improve): '+t.advance.join(', ')):''),
      specials:t.special?[{name:t.special.name,desc:t.special.desc}]:[]
    }));
    while(hero.themes.length<4) hero.themes.push(emptyTheme());
    hero.backpack=(c.backpack||[]).map(x=>({id:uid(),text:x,type:'story',scratched:false}));
    if(!hero.backpack.length) hero.backpack=[{id:uid(),text:'',type:'story',scratched:false}];
    let notes=c.tagline||'';
    if(c.quote) notes+='\n\n“'+c.quote+'”';
    if(c.examples&&c.examples.length) notes+='\n\nExample actions:\n• '+c.examples.join('\n• ');
    hero.notes=notes;
    roster.push(hero); activeId=hero.id; S=hero;
    if(typeof save==='function') save();
    if(typeof renderAll==='function') renderAll();
    if(typeof showTab==='function') showTab('hero');
    closeWizard();
    if(typeof toast==='function') toast('Hero created — '+(hero.heroName||'unnamed'));
  }
  function mightLabel(type){
    const m=mightOf[type]||'';
    return ({origin:'Origin',adventure:'Adventure',greatness:'Greatness',any:'Any Might'})[m]||m;
  }

  // ---------- Step: name ----------
  function renderName(){
    document.getElementById('wzTitle').textContent='New Hero';
    setFoot(true,true);
    $b().innerHTML=`<h2 class="wz-h">Name your Hero</h2>
      <div class="wz-card">
        <label class="wz-fld"><span>Hero Name</span><input id="wz_hn" placeholder="e.g. Gerrin"></label>
        <label class="wz-fld"><span>Player Name</span><input id="wz_pn"></label>
      </div>
      <p class="wz-sub">${path==='quickest'?'Next: choose a Trope.':path==='detailed'?'Next: build each theme from its themebook.':'Next: a blank sheet — fill it in on the Hero tab.'}</p>`;
    const hn=document.getElementById('wz_hn'), pn=document.getElementById('wz_pn');
    hn.value=draft.heroName; pn.value=draft.playerName;
    hn.oninput=()=>draft.heroName=hn.value; pn.oninput=()=>draft.playerName=pn.value;
  }

  // ---------- Step: trope ----------
  function renderTrope(){
    document.getElementById('wzTitle').textContent='Choose a Trope';
    setFoot(true,true,'Skip / manual');
    const tropes=D.tropes||[];
    let html=`<h2 class="wz-h">Pick a Trope</h2><p class="wz-sub">A recipe of three themes plus a suggested fourth. Tap one — you'll fill in each theme next. Or tap "Skip / manual" to choose theme types yourself.</p>`;
    tropes.forEach((tr,i)=>{
      const ts=tr.themes.map(x=>x.type).join(' · ');
      html+=`<button class="wz-pick ${draft._trope===i?'sel':''}" data-i="${i}"><div class="nm">${esc(tr.name||'Trope '+(i+1))}</div><div class="meta">${esc(ts)} &nbsp;+ choose one: ${esc(tr.fourth.map(x=>x.type).join(' / '))}</div></button>`;
    });
    $b().innerHTML=html;
    $b().querySelectorAll('[data-i]').forEach(btn=>btn.onclick=()=>{
      const tr=tropes[+btn.dataset.i]; draft._trope=+btn.dataset.i; applyTrope(tr); nextStep();
    });
  }
  function applyTrope(tr){
    // themes 0..2 from trope.themes, theme 3 = first 'fourth' option (player can change type later)
    draft.themes=[];
    tr.themes.forEach(t=>draft.themes.push(themeFromKit(t.type,t.tag)));
    const f=tr.fourth[0]||{type:'Circumstance',tag:''};
    const fth=themeFromKit(f.type,f.tag); fth._fourthOpts=tr.fourth; draft.themes.push(fth);
    // suggested backpack
    draft._storeSug=tr.backpack||[];
  }
  function themeFromKit(type,kitName){
    const t=blankT(); t.type=type; t.title=kitName||'';
    const kit=findKit(type,kitName); t._kit=kit?kit.name:null;
    return t;
  }
  function findKit(type,name){
    const list=(D.themekits||{})[type]||[];
    if(!list.length) return null;
    if(name){ const m=list.find(k=>k.name.toLowerCase()===String(name).toLowerCase()); if(m) return m; }
    return null;
  }

  // ---------- Step: kit (quickest, per theme) ----------
  function renderKit(idx){
    ti=idx; const th=draft.themes[idx]||(draft.themes[idx]=blankT());
    document.getElementById('wzTitle').textContent=`Theme ${idx+1} of 4`;
    setFoot(true,true);
    const typeList=allTypes();
    let html=`<h2 class="wz-h">Theme ${idx+1}: ${esc(th.type)}</h2>`;
    // type selector
    html+=`<div class="wz-card"><label class="wz-fld"><span>Theme type</span><select id="wz_type">${typeOptions(th.type)}</select></label>`;
    html+=mightWarn(th.type);
    // kit selector for this type
    const kits=(D.themekits||{})[th.type]||[];
    if(kits.length){
      html+=`<label class="wz-fld"><span>Theme kit</span><select id="wz_kit"><option value="">— choose a kit —</option>${kits.map(k=>`<option value="${esc(k.name)}" ${th._kit===k.name?'selected':''}>${esc(k.name)}</option>`).join('')}</select></label>`;
    }
    html+=`</div><div id="wz_kitbox"></div>`;
    $b().innerHTML=html;
    const tsel=document.getElementById('wz_type');
    tsel.onchange=()=>{ th.type=tsel.value; th._kit=null; th.power=[];th.weak=[]; renderKit(idx); };
    const ksel=document.getElementById('wz_kit');
    if(ksel) ksel.onchange=()=>{ th._kit=ksel.value||null; th.power=[];th.weak=[]; th.title=th._kit||th.title; drawKitBox(th); };
    drawKitBox(th);
  }
  function drawKitBox(th){
    const box=document.getElementById('wz_kitbox'); if(!box) return;
    const kit=findKit(th.type,th._kit);
    let html='';
    html+=`<div class="wz-card"><label class="wz-fld"><span>Theme title (main power tag)</span><input id="wz_title" placeholder="e.g. Skilled with a Bow"></label>`;
    if(kit){
      html+=`<div class="wz-note">Pick <b>2 power tags</b> and <b>1 weakness</b> from the ${esc(kit.name)} kit (tap to toggle). Edit later on the sheet.</div>`;
      html+=`<div class="wz-fld"><span>Power tags · choose 2</span><div class="chips" id="wz_pw">`+
        kit.power.map(p=>`<button class="chip pw ${th.power.includes(p)?'sel':''}" data-p="${esc(p)}">${esc(p)}</button>`).join('')+`</div></div>`;
      html+=`<div class="wz-fld"><span>Weakness · choose 1</span><div class="chips" id="wz_wk">`+
        kit.weak.map(p=>`<button class="chip wk ${th.weak.includes(p)?'sel':''}" data-w="${esc(p)}">${esc(p)}</button>`).join('')+`</div></div>`;
    } else {
      html+=`<div class="wz-note">No kit selected — you can type tags directly on the sheet after creating, or choose a kit above.</div>`;
    }
    html+=`<label class="wz-fld"><span>Quest</span><input id="wz_quest" placeholder="A goal, belief, or journey…"></label></div>`;
    box.innerHTML=html;
    const ttl=document.getElementById('wz_title'); ttl.value=th.title||''; ttl.oninput=()=>th.title=ttl.value;
    const q=document.getElementById('wz_quest'); q.value=th.quest|| (kit?kit.quest:'') ||''; if(!th.quest&&kit)th.quest=kit.quest||''; q.oninput=()=>th.quest=q.value;
    box.querySelectorAll('[data-p]').forEach(b=>b.onclick=()=>{
      const p=b.dataset.p, i=th.power.indexOf(p);
      if(i>=0) th.power.splice(i,1); else { if(th.power.length>=2) th.power.shift(); th.power.push(p); }
      drawKitBox(th);
    });
    box.querySelectorAll('[data-w]').forEach(b=>b.onclick=()=>{
      const w=b.dataset.w; th.weak = th.weak.includes(w)?[]:[w]; drawKitBox(th);
    });
  }

  // ---------- Step: detailed (per theme, themebook) ----------
  function renderDetail(idx){
    ti=idx; const th=draft.themes[idx]||(draft.themes[idx]=blankT());
    if(!th.power.length) th.power=[{id:uid(),text:'',scratched:false},{id:uid(),text:'',scratched:false}];
    if(!th.weak.length) th.weak=[{id:uid(),text:''}];
    document.getElementById('wzTitle').textContent=`Theme ${idx+1} of 4`;
    setFoot(true,true);
    const tb=(D.themebooks||{})[th.type]||{};
    let html=`<h2 class="wz-h">Theme ${idx+1}: ${esc(th.type)} Themebook</h2>`;
    html+=`<div class="wz-card"><div class="wz-fld" style="margin-bottom:2px"><span>Choose this theme's themebook — ${allTypes().length} to pick from</span></div>`;
    html+=`<p class="wz-note" style="margin:0 0 6px">Tap a type to load its themebook. Each is a different set of questions; the highlighted one is selected.</p>`;
    html+=themebookChipsHTML(th.type);
    html+=mightWarn(th.type);
    if(tb.concept) html+=`<p class="wz-sub" style="margin:8px 0 0"><b>${esc(th.type)}:</b> ${esc(tb.concept)}</p>`;
    html+=`</div>`;
    // theme kits for this type — ready-made tags (optional)
    const kits=(D.themekits||{})[th.type]||[];
    if(kits.length){
      const kit=kits.find(k=>k.name===th._kit);
      html+=`<div class="wz-card"><div class="wz-fld" style="margin-bottom:2px"><span>Theme kit — ready-made tags (${kits.length} for ${esc(th.type)})</span></div>`;
      html+=`<p class="wz-note" style="margin:0 0 6px">Optional: pick a kit to drop in ready-made tags, then tweak using the questions below — or skip and write your own.</p>`;
      html+=`<select id="wz_dkit"><option value="">— choose a kit —</option>`+
        kits.map(k=>`<option value="${esc(k.name)}" ${th._kit===k.name?'selected':''}>${esc(k.name)}</option>`).join('')+`</select>`;
      if(kit){
        html+=`<div class="wz-fld" style="margin-top:8px"><span>Power tags · tap to add/remove</span><div class="chips">`+
          kit.power.map(p=>`<button class="chip pw ${th.power.some(x=>(x.text||'').trim().toLowerCase()===p.toLowerCase())?'sel':''}" data-kp="${esc(p)}">${esc(p)}</button>`).join('')+`</div></div>`;
        html+=`<div class="wz-fld"><span>Weakness tags · tap to add/remove</span><div class="chips">`+
          kit.weak.map(p=>`<button class="chip wk ${th.weak.some(x=>(x.text||'').trim().toLowerCase()===p.toLowerCase())?'sel':''}" data-kw="${esc(p)}">${esc(p)}</button>`).join('')+`</div></div>`;
        if(kit.quest) html+=`<p class="wz-note" style="margin:2px 0 0">Suggested Quest: “${esc(kit.quest)}” — fills the Quest box below if it's empty.</p>`;
      }
      html+=`</div>`;
    }
    // power tag questions
    if(tb.powerQ&&tb.powerQ.length){
      html+=`<div class="wz-card"><div class="wz-fld"><span>Power tag questions — answer to make tags</span><ul class="qlist">`+
        tb.powerQ.map((q,i)=>`<li><b>${String.fromCharCode(65+i)}.</b> ${esc(q)}</li>`).join('')+`</ul></div>`;
      html+=`<label class="wz-fld"><span>Theme title (main power tag)</span><input id="wz_title" placeholder="answer the first question"></label>`;
      th.power.forEach((p,i)=>{ html+=`<label class="wz-fld"><span>Power tag ${i+1}</span><input class="wz_pw" data-i="${i}" placeholder="power tag"></label>`; });
      html+=`<button class="addbtn" id="wz_addpw">＋ another power tag</button></div>`;
    }
    if(tb.weakQ&&tb.weakQ.length){
      html+=`<div class="wz-card"><div class="wz-fld"><span>Weakness tag questions</span><ul class="qlist">`+
        tb.weakQ.map((q,i)=>`<li><b>${String.fromCharCode(65+i)}.</b> ${esc(q)}</li>`).join('')+`</ul></div>`;
      th.weak.forEach((p,i)=>{ html+=`<label class="wz-fld"><span>Weakness tag ${i+1}</span><input class="wz_wk" data-i="${i}" placeholder="weakness tag"></label>`; });
      html+=`</div>`;
    }
    if(tb.questIdeas&&tb.questIdeas.length){
      html+=`<div class="wz-card"><div class="wz-fld"><span>Quest ideas</span><ul class="qlist">`+
        tb.questIdeas.map(q=>`<li>${esc(q)}</li>`).join('')+`</ul></div>`;
    }
    html+=`<label class="wz-fld"><span>Quest</span><input id="wz_quest" placeholder="A goal, belief, or journey…"></label></div>`;
    $b().innerHTML=html;
    $b().querySelectorAll('[data-tb]').forEach(b=>b.onclick=()=>{ if(th.type===b.dataset.tb) return; th.type=b.dataset.tb; th._kit=null; renderDetail(idx); });
    const dk=document.getElementById('wz_dkit');
    if(dk) dk.onchange=()=>{ const prevKit=th._kit; th._kit=dk.value||null; const k=kits.find(x=>x.name===th._kit);
      if(k){ // set the title to the kit name if empty, or if it still holds the previous kit's name (auto-set, not user-typed)
        if(!(th.title||'').trim() || (prevKit && th.title===prevKit)) th.title=k.name;
        if(!(th.quest||'').trim()) th.quest=k.quest||''; }
      renderDetail(idx); };
    $b().querySelectorAll('[data-kp]').forEach(b=>b.onclick=()=>{ toggleDetailTag(th,'power',b.dataset.kp); renderDetail(idx); });
    $b().querySelectorAll('[data-kw]').forEach(b=>b.onclick=()=>{ toggleDetailTag(th,'weak',b.dataset.kw); renderDetail(idx); });
    const ttl=document.getElementById('wz_title'); if(ttl){ ttl.value=th.title||''; ttl.oninput=()=>th.title=ttl.value; }
    const q=document.getElementById('wz_quest'); if(q){ q.value=th.quest||''; q.oninput=()=>th.quest=q.value; }
    $b().querySelectorAll('.wz_pw').forEach(inp=>{ inp.value=th.power[+inp.dataset.i].text||''; inp.oninput=()=>th.power[+inp.dataset.i].text=inp.value; });
    $b().querySelectorAll('.wz_wk').forEach(inp=>{ inp.value=th.weak[+inp.dataset.i].text||''; inp.oninput=()=>th.weak[+inp.dataset.i].text=inp.value; });
    const ap=document.getElementById('wz_addpw'); if(ap) ap.onclick=()=>{ th.power.push({id:uid(),text:'',scratched:false}); renderDetail(idx); };
  }

  // ---------- Step: general store ----------
  function renderStore(){
    document.getElementById('wzTitle').textContent='General Store';
    setFoot(true,true);
    const gs=D.generalStore||{};
    let html=`<h2 class="wz-h">Backpack</h2><p class="wz-sub">Every Hero begins with one <b>story tag</b> in their backpack — a packed item, asset, or prepared advantage. Pick or type one (add more later on the sheet).</p>`;
    html+=`<div class="wz-card"><label class="wz-fld"><span>Your starting tag</span><input id="wz_bp" placeholder="e.g. hunting bow"></label></div>`;
    if(draft._storeSug&&draft._storeSug.length){
      html+=`<div class="wz-card"><div class="wz-fld"><span>Suggested by your trope</span><div class="chips" id="wz_sug">`+
        draft._storeSug.map(s=>`<button class="chip" data-s="${esc(s)}">${esc(s)}</button>`).join('')+`</div></div></div>`;
    }
    Object.keys(gs).forEach(cat=>{
      html+=`<div class="wz-card"><div class="wz-fld"><span>${esc(cat)}</span><div class="chips wz-cat">`+
        gs[cat].map(s=>`<button class="chip" data-s="${esc(s)}">${esc(s)}</button>`).join('')+`</div></div></div>`;
    });
    $b().innerHTML=html;
    const bp=document.getElementById('wz_bp'); bp.value=draft._backpack||''; bp.oninput=()=>draft._backpack=bp.value;
    $b().querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>{ draft._backpack=b.dataset.s; bp.value=b.dataset.s; });
  }

  // ---------- Step: fellowship ----------
  function renderFellowship(){
    document.getElementById('wzTitle').textContent='Fellowship';
    setFoot(true,true,'Finish ✓');
    const fk=D.fellowshipKits||[];
    let html=`<h2 class="wz-h">The Fellowship</h2><p class="wz-sub">The shared theme binding your band of Heroes. Pick a starter kit or skip (you can build it later). Power tags here are single-use.</p>`;
    html+=`<button class="wz-pick ${draft._fellowKit==null?'sel':''}" data-k="none"><div class="nm">Skip for now</div><div class="fl">Leave the Fellowship blank — set it up later on the Fellowship tab.</div></button>`;
    fk.forEach((k,i)=>{
      html+=`<button class="wz-pick ${draft._fellowKit===i?'sel':''}" data-k="${i}"><div class="nm">${esc(k.name)}</div><div class="meta">${esc(k.power.slice(0,3).join(' · '))}…</div><div class="fl">${esc(k.quest||'')}</div></button>`;
    });
    // chosen-kit builder — pick which power/weakness tags you want
    if(draft._fellowKit!=null && fk[draft._fellowKit]){
      const k=fk[draft._fellowKit];
      if(!draft._fellowPower) draft._fellowPower=[];
      if(!draft._fellowWeak) draft._fellowWeak=[];
      html+=`<div class="wz-card"><div class="wz-fld" style="margin-bottom:2px"><span>Build the ${esc(k.name)} Fellowship</span></div>`;
      html+=`<p class="wz-note" style="margin:0 0 6px">Choose which tags you want — tap to add/remove. (Pick ~2–3 power and 1 weakness; edit later on the Fellowship tab.)</p>`;
      html+=`<label class="wz-fld"><span>Title</span><input id="wz_ftitle" placeholder="${esc(k.name)}"></label>`;
      html+=`<div class="wz-fld"><span>Power tags · tap to choose</span><div class="chips">`+
        k.power.map(p=>`<button class="chip pw ${draft._fellowPower.includes(p)?'sel':''}" data-fp="${esc(p)}">${esc(p)}</button>`).join('')+`</div></div>`;
      html+=`<div class="wz-fld"><span>Weakness tag · tap to choose</span><div class="chips">`+
        k.weak.map(p=>`<button class="chip wk ${draft._fellowWeak.includes(p)?'sel':''}" data-fw="${esc(p)}">${esc(p)}</button>`).join('')+`</div></div>`;
      html+=`<label class="wz-fld"><span>Quest</span><input id="wz_fquest" placeholder="${esc(k.quest||'')}"></label>`;
      html+=`</div>`;
    }
    // per-fellow relationship table
    if(!draft._rels) draft._rels=[];
    const rel=D.relationship||{};
    html+=`<div class="wz-card"><div class="wz-fld" style="margin-bottom:4px"><span>Fellowship relationships</span></div>
      <p class="wz-note" style="margin:0 0 8px">For each other Hero, a single-use relationship tag (renewed at camp). Add a row per fellow — or skip and add them later.</p>
      <div id="wz_relrows"></div>
      <button class="addbtn" id="wz_addrel">＋ Add fellow Hero</button>
      <div class="wz-fld" style="margin-top:10px"><span>Tag suggestions (tap to fill the last row)</span>`;
    for(const cat in rel){
      html+=`<div class="wz-note" style="margin:6px 0 2px;font-weight:700">${esc(cat)}</div><div class="seg2">`+
        rel[cat].map(r=>`<button data-r="${esc(r)}">${esc(r)}</button>`).join('')+`</div>`;
    }
    html+=`</div></div>`;
    $b().innerHTML=html;
    $b().querySelectorAll('[data-k]').forEach(btn=>btn.onclick=()=>{
      if(btn.dataset.k==='none'){ draft._fellowKit=null; }
      else { const i=+btn.dataset.k; if(draft._fellowKit!==i){ draft._fellowKit=i; const k=fk[i];
        draft._fellowTitle=k.name; draft._fellowQuest=k.quest||''; draft._fellowPower=[]; draft._fellowWeak=[]; } }
      renderFellowship();
    });
    const ft=document.getElementById('wz_ftitle'); if(ft){ ft.value=draft._fellowTitle||''; ft.oninput=()=>draft._fellowTitle=ft.value; }
    const fq=document.getElementById('wz_fquest'); if(fq){ fq.value=draft._fellowQuest||''; fq.oninput=()=>draft._fellowQuest=fq.value; }
    $b().querySelectorAll('[data-fp]').forEach(b=>b.onclick=()=>{ const a=draft._fellowPower, v=b.dataset.fp, i=a.indexOf(v); if(i>=0)a.splice(i,1); else a.push(v); renderFellowship(); });
    $b().querySelectorAll('[data-fw]').forEach(b=>b.onclick=()=>{ draft._fellowWeak = draft._fellowWeak.includes(b.dataset.fw)?[]:[b.dataset.fw]; renderFellowship(); });
    drawRelRows();
    document.getElementById('wz_addrel').onclick=()=>{ draft._rels.push({name:'',tag:''}); drawRelRows(); };
    $b().querySelectorAll('[data-r]').forEach(b=>b.onclick=()=>{
      if(!draft._rels.length) draft._rels.push({name:'',tag:''});
      draft._rels[draft._rels.length-1].tag=b.dataset.r; drawRelRows();
    });
  }
  function drawRelRows(){
    const w=document.getElementById('wz_relrows'); if(!w) return;
    w.innerHTML='';
    draft._rels.forEach((r,i)=>{
      const row=document.createElement('div'); row.style.cssText='display:flex;gap:6px;margin-bottom:6px';
      const nm=document.createElement('input'); nm.placeholder='Hero name'; nm.value=r.name; nm.style.cssText='flex:0 0 36%;padding:8px 9px;border:1px solid var(--border);border-radius:9px;background:var(--card-bg);color:var(--ink)';
      nm.oninput=()=>r.name=nm.value;
      const tg=document.createElement('input'); tg.placeholder='relationship tag'; tg.value=r.tag; tg.className='chip pw'; tg.style.cssText='flex:1;padding:8px 11px;border:none;border-radius:18px';
      tg.oninput=()=>r.tag=tg.value;
      const del=document.createElement('button'); del.textContent='✕'; del.style.cssText='width:34px;border:1px solid var(--border);border-radius:8px;background:var(--bg-deep);color:var(--ink-soft)';
      del.onclick=()=>{ draft._rels.splice(i,1); drawRelRows(); };
      row.append(nm,tg,del); w.appendChild(row);
    });
  }

  // ---------- helpers ----------
  function allTypes(){ return [].concat(...Object.values(TYPE_ORDER)); }
  function typeOptions(sel){
    let h='';
    for(const grp in TYPE_ORDER){ h+=`<optgroup label="${grp}">`+TYPE_ORDER[grp].map(t=>`<option ${t===sel?'selected':''}>${t}</option>`).join('')+`</optgroup>`; }
    return h;
  }
  // Detailed path: toggle a kit tag into a theme's power/weak list (fills an empty input first).
  function toggleDetailTag(th, field, text){
    const arr=th[field], key=text.trim().toLowerCase();
    const i=arr.findIndex(x=>(x.text||'').trim().toLowerCase()===key);
    if(i>=0){ arr.splice(i,1); }
    else {
      const empty=arr.find(x=>!(x.text||'').trim());
      if(empty){ empty.text=text; }
      else arr.push(field==='power'?{id:uid(),text:text,scratched:false}:{id:uid(),text:text});
    }
    if(field==='power' && !arr.length) arr.push({id:uid(),text:'',scratched:false});
    if(field==='weak'  && !arr.length) arr.push({id:uid(),text:''});
  }
  // Visible, tappable themebook picker (all 20 types grouped by Might) — used by the Detailed path.
  function themebookChipsHTML(sel){
    let h='';
    for(const grp in TYPE_ORDER){
      h+=`<div class="wz-note" style="margin:8px 0 3px;font-weight:700">${esc(grp)}</div><div class="chips">`+
        TYPE_ORDER[grp].map(t=>`<button class="chip ${t===sel?'sel':''}" data-tb="${esc(t)}">${esc(t)}</button>`).join('')+`</div>`;
    }
    return h;
  }
  function mightWarn(type){
    const m=mightOf[type];
    if(m==='adventure'||m==='greatness')
      return `<div class="wz-warn">⚠ ${type} is an <b>${m}</b>-Might theme. In a typical rustic-fantasy start, Heroes begin with mostly <b>Origin</b> themes. Check with your Narrator.</div>`;
    return '';
  }

  // ---------- commit ----------
  function commit(){
    if(path==='premade'){ commitPremade(); return; }
    // normalise tag shapes (quickest stores plain strings; sheet needs {text,scratched})
    const hero=blank();
    hero.id=uid();
    hero.playerName=draft.playerName||''; hero.heroName=draft.heroName||'';
    hero.themes=(draft.themes||[]).map(th=>normTheme(th));
    while(hero.themes.length<4) hero.themes.push(emptyTheme());
    // backpack
    hero.backpack=[{id:uid(),text:draft._backpack||'',type:'story',scratched:false}];
    // fellowship — use the player's chosen tags (fall back to the kit's first few if none picked)
    if(draft._fellowKit!=null && (D.fellowshipKits||[])[draft._fellowKit]){
      const k=D.fellowshipKits[draft._fellowKit];
      const pw=(draft._fellowPower&&draft._fellowPower.length)?draft._fellowPower:k.power.slice(0,3);
      const wk=(draft._fellowWeak&&draft._fellowWeak.length)?draft._fellowWeak:[k.weak[0]||''];
      hero.fellowship={ type:'Companion', title:(draft._fellowTitle||k.name),
        power:pw.map(t=>({id:uid(),text:t,scratched:false})),
        weak:wk.map(t=>({id:uid(),text:t})), quest:(draft._fellowQuest||k.quest||''),
        improve:0,abandon:0,milestone:0,special:'',specials:[] };
    }
    const rels=(draft._rels||[]).filter(r=>(r.name||'').trim()||(r.tag||'').trim());
    if(rels.length) hero.relationships=rels.map(r=>({id:uid(),name:r.name||'',tag:r.tag||'',scratched:false}));
    // store quintessences etc. already blank
    // hand off to the app
    roster.push(hero); activeId=hero.id; S=hero;
    if(typeof save==='function') save();
    if(typeof renderAll==='function') renderAll();
    if(typeof showTab==='function') showTab('hero');
    closeWizard();
    if(typeof toast==='function') toast('Hero created — '+(hero.heroName||'unnamed'));
  }
  function emptyTheme(){ return {id:uid(),type:'Skill or Trade',title:'',power:[{id:uid(),text:'',scratched:false},{id:uid(),text:'',scratched:false}],weak:[{id:uid(),text:''}],quest:'',improve:0,abandon:0,milestone:0,special:'',specials:[]}; }
  function normTheme(th){
    const out={id:th.id||uid(),type:th.type||'Skill or Trade',title:th.title||'',quest:th.quest||'',improve:0,abandon:0,milestone:0,special:'',specials:[]};
    const toTag=x=> (typeof x==='string')?{id:uid(),text:x,scratched:false}:{id:x.id||uid(),text:x.text||'',scratched:!!x.scratched};
    out.power=(th.power&&th.power.length?th.power:[]).map(toTag);
    out.weak =(th.weak&&th.weak.length?th.weak:[]).map(x=> (typeof x==='string')?{id:uid(),text:x}:{id:x.id||uid(),text:x.text||''});
    if(!out.power.length) out.power=[{id:uid(),text:'',scratched:false}];
    if(!out.weak.length) out.weak=[{id:uid(),text:''}];
    return out;
  }

  // ---------- hook the "New Hero" buttons ----------
  function rewire(){
    document.querySelectorAll('button').forEach(b=>{
      const t=(b.textContent||'').trim();
      if(/New Hero/i.test(t) && !b.classList.contains('wz-x')) b.onclick=startCreator;
    });
  }
  // initial + observe roster sheet (re-rendered dynamically)
  rewire();
  const ro=document.getElementById('rosterList');
  if(ro){ new MutationObserver(rewire).observe(ro,{childList:true}); }
})();
