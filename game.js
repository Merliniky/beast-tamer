"use strict";
const cv=document.getElementById("c"),cx=cv.getContext("2d");
const $=id=>document.getElementById(id);
const Q=new URLSearchParams(location.search),DEBUG=Q.has("debug");
let W=0,H=0,DPR=1,ZOOM=2;
function resize(){DPR=Math.min(window.devicePixelRatio||1,3);W=innerWidth;H=innerHeight;cv.width=Math.round(W*DPR);cv.height=Math.round(H*DPR);
 ZOOM=Math.max(1.5,Math.min(3.2,Math.min(W,H)/170));}
addEventListener("resize",resize);resize();
const PLAYER_SPD=100;
// ---------- assets ----------
const IMG={},WHITE={};let MAN={};
function loadAll(){return fetch("assets/manifest.json").then(r=>r.json()).then(m=>{MAN=m;return Promise.all(Object.keys(m).map(k=>new Promise(res=>{
 const im=new Image();im.onload=()=>{IMG[k]=im;const c=document.createElement("canvas");c.width=im.width;c.height=im.height;const g=c.getContext("2d");
  g.drawImage(im,0,0);g.globalCompositeOperation="source-in";g.fillStyle="#fff";g.fillRect(0,0,c.width,c.height);WHITE[k]=c;res();};im.onerror=res;im.src="assets/"+m[k].file;})));});}
// ---------- audio ----------
let AC=null;function audio(){if(!AC){try{AC=new (window.AudioContext||window.webkitAudioContext)();}catch(e){}}if(AC&&AC.state==="suspended")AC.resume();}
let lastSfx={};
function sfx(type){if(!AC)return;const now=AC.currentTime;if(lastSfx[type]&&now-lastSfx[type]<0.04)return;lastSfx[type]=now;
 const o=AC.createOscillator(),g=AC.createGain();o.connect(g);g.connect(AC.destination);
 const P={hit:["square",420,120,.06,.08],bite:["sawtooth",300,80,.09,.1],heavy:["triangle",140,40,.25,.22],shoot:["square",900,500,.05,.03],
  hurt:["sawtooth",200,60,.2,.15],pick:["sine",600,1200,.12,.1],lvl:["square",500,1000,.15,.06],kill:["triangle",260,90,.1,.08],mut:["sine",400,1600,.25,.1]}[type];
 if(type==="evolve"){[523,659,784,1046,1318].forEach((f,i)=>{const o2=AC.createOscillator(),g2=AC.createGain();o2.type="square";o2.frequency.value=f;o2.connect(g2);g2.connect(AC.destination);
  g2.gain.setValueAtTime(.08,now+i*.08);g2.gain.exponentialRampToValueAtTime(.001,now+i*.08+.3);o2.start(now+i*.08);o2.stop(now+i*.08+.32);});o.disconnect();return;}
 if(!P)return;o.type=P[0];o.frequency.setValueAtTime(P[1],now);o.frequency.exponentialRampToValueAtTime(P[2],now+P[3]);
 g.gain.setValueAtTime(P[4],now);g.gain.exponentialRampToValueAtTime(.001,now+P[3]);o.start(now);o.stop(now+P[3]+.02);
 if(type==="heavy"){const n=AC.createBufferSource(),b=AC.createBuffer(1,AC.sampleRate*.15,AC.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*(1-i/d.length);
  n.buffer=b;const ng=AC.createGain();ng.gain.value=.15;n.connect(ng);ng.connect(AC.destination);n.start(now);}}
// ---------- state ----------
let S=null,state="title";
const rnd=(a,b)=>a+Math.random()*(b-a),pick=a=>a[Math.floor(Math.random()*a.length)],dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function newGame(line){S={line,t:0,kills:0,hero:{x:0,y:0,vx:0,vy:0,hp:100,max:100,inv:0,face:1,anim:0,cd:0},
 comps:[],enemies:[],proj:[],parts:[],texts:[],drops:[],rings:[],shake:0,hitstop:0,slowmo:0,flash:0,spawnAcc:0,nextElite:90,banner:null,eggT:0};
 addComp();addComp();state="play";}
function makeComp(){const L=LINES[S.line],b=L.base;
 return{form:"t1",tier:1,el:"无",x:S.hero.x+rnd(-20,20),y:S.hero.y+rnd(-20,20),vx:0,vy:0,face:1,cd:rnd(0,.5),st:"follow",tgt:null,tt:0,
  lvl:1,xp:0,kills:0,lean:null,parts:{head:{k:b.head,lv:1},limbL:{k:b.limb,lv:1},limbR:{k:b.limb,lv:1},trait:{k:b.trait,lv:1}},flash:0,evoT:0,z:0,hits:new Set(),isComp:true};}
function addComp(){if(S.comps.length>=6)return false;const c=makeComp();S.comps.push(c);c.slot=S.comps.length-1;return c;}
function formDef(c){const L=LINES[S.line];if(c.tier===1)return L.t1;return (c.tier===2?L.t2:L.t4).find(f=>f.id===c.form);}
// ---------- part / evolution logic ----------
function slotKinds(slot){const L=LINES[S.line],s=new Set();L.t2.forEach(f=>f.req.forEach(r=>{if(r.slot===slot&&r.kind)s.add(r.kind);}));
 if(L.extraMut&&L.extraMut[slot])L.extraMut[slot].forEach(k=>s.add(k));return [...s];}
function reqOK(c,r){const slots=r.slot==="limb"?["limbL","limbR"]:[r.slot];let n=0;
 for(const s of slots){const p=c.parts[s];if((!r.kind||p.k===r.kind)&&(!r.minLv||p.lv>=r.minLv))n++;}return n>=(r.count||1);}
function reqScore(c,f){return f.req.filter(r=>reqOK(c,r)).length/f.req.length;}
function totalLv(c){return Object.values(c.parts).reduce((a,p)=>a+p.lv,0);}
function nextHint(c){const L=LINES[S.line];
 if(c.tier===1){const best=L.t2.map(f=>({f,s:reqScore(c,f)})).sort((a,b)=>b.s-a.s)[0];
  const miss=best.f.req.filter(r=>!reqOK(c,r)).map(fmtReq);return `下一进化：${best.f.name}`+(miss.length?`（缺 ${miss.join("、")}）`:"（即将进化）")+` · 保底：部件总等级 ${totalLv(c)}/10`;}
 if(c.tier===2){const f=(L.t4||[]).find(f=>f.from===c.form);if(!f)return "T3/T4 进化将在正式版开放";
  const miss=f.req.filter(r=>!reqOK(c,r)).map(fmtReq);return `终阶演示：${f.name}`+(miss.length?`（缺 ${miss.join("、")}）`:"");}
 return "已达终阶";}
function fmtReq(r){const sn=r.slot==="limb"?"肢":SLOT_NAMES[r.slot];return (r.kind||sn)+(r.minLv?` Lv${r.minLv}`:"")+((r.count||1)>1?` x${r.count}`:"");}
function gainXP(c,x){c.xp+=x;let need=3+c.lvl*2;while(c.xp>=need){c.xp-=need;c.lvl++;levelPart(c);need=3+c.lvl*2;}}
function levelPart(c){const W0={head:30,limbL:25,limbR:25,trait:20};const cand=Object.keys(W0).filter(s=>c.parts[s].lv<5);
 if(!cand.length)return;let tot=cand.reduce((a,s)=>a+W0[s],0),r=Math.random()*tot,slot=cand[0];for(const s of cand){r-=W0[s];if(r<0){slot=s;break;}}
 const p=c.parts[slot];p.lv++;sfx("lvl");floatText(c.x,c.y-20,`${SLOT_NAMES[slot]} Lv${p.lv}`,"#9f9",10);
 const mutRate=(DEBUG?0.6:0.15)+(c.tier>1?0.1:0);
 if(Math.random()<mutRate){const kinds=slotKinds(slot==="limbL"||slot==="limbR"?"limb":slot);if(kinds.length){
  let k;if(c.lean&&Math.random()<.65){const pref=kinds.filter(x=>leanOf(x)===c.lean);k=pref.length?pick(pref):pick(kinds);}else k=pick(kinds);
  if(k!==p.k){p.k=k;p.mut=1;c.lean=leanOf(k)||c.lean;sfx("mut");floatText(c.x,c.y-32,`变异！${k}`,"#f9c",11);burst(c.x,c.y,"#f9c",10,60);}}}
 checkEvo(c);}
function leanOf(kind){const L=LINES[S.line];for(const f of L.t2)if(f.req.some(r=>r.kind===kind))return f.id;
 if(L.t4)for(const f of L.t4)if(f.req.some(r=>r.kind===kind))return f.from;return null;}
function checkEvo(c){const L=LINES[S.line];
 if(c.tier===1){let f=L.t2.find(f=>f.req.every(r=>reqOK(c,r)));
  if(!f&&totalLv(c)>=10){const sc=L.t2.map(f=>({f,s:reqScore(c,f)+(c.lean===f.id?.5:0)+Math.random()*.1})).sort((a,b)=>b.s-a.s);f=sc[0].f;}
  if(f)evolve(c,2,f);}
 else if(c.tier===2&&L.t4){const f=L.t4.find(f=>f.from===c.form&&f.req.every(r=>reqOK(c,r)));if(f)evolve(c,4,f);}}
function evolve(c,tier,f){c.tier=tier;c.form=f.id;c.el=f.el;c.evoT=1.2;S.slowmo=.9;S.flash=.5;S.shake=Math.max(S.shake,8);sfx("evolve");
 S.rings.push({x:c.x,y:c.y,r:4,life:.8,max:.8,col:EL_COLOR[f.el]});burst(c.x,c.y,EL_COLOR[f.el],50,180);burst(c.x,c.y,"#fff",25,120);
 S.banner={txt:`进化！${f.name}`,sub:tier===4?"终阶形态（演示捷径）":`${LINES[S.line].t1.name} → ${f.name}`,t:2.2,col:EL_COLOR[f.el]};
 if(tier===4&&c.parts.trait)c.parts.trait.mut=1;}
// ---------- fx ----------
function floatText(x,y,t,col,size){S.texts.push({x,y,t,col,size:size||9,life:.9,vy:-30});if(S.texts.length>120)S.texts.shift();}
function burst(x,y,col,n,sp){for(let i=0;i<n;i++){const a=Math.random()*6.283,v=rnd(sp*.3,sp);S.parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:rnd(.25,.6),col,sz:rnd(1,2.5)});}
 if(S.parts.length>700)S.parts.splice(0,S.parts.length-700);}
function damage(e,dmg,src,kb,opts={}){if(e.dead)return;const def=ENEMIES[e.type];let crit=Math.random()<(opts.crit||.08);dmg*=crit?2:1;dmg*=1-(def.armor||0);
 e.hp-=dmg;e.flash=.1;const a=Math.atan2(e.y-src.y,e.x-src.x),k=kb*(def.elite?.25:1);e.kx+=Math.cos(a)*k;e.ky+=Math.sin(a)*k;
 floatText(e.x+rnd(-4,4),e.y-e.r,Math.round(dmg)+(crit?"!":""),crit?"#ffd23a":"#fff",crit?12:9);burst(e.x,e.y,opts.col||"#fff",crit?8:4,90);
 if(opts.heavy||crit){S.hitstop=Math.max(S.hitstop,opts.heavy?.07:.035);S.shake=Math.max(S.shake,opts.heavy?5:2.5);}
 if(opts.slow)e.slow=1.5;if(opts.burn)e.burn=2.5;
 if(e.hp<=0){e.dead=true;S.kills++;sfx("kill");burst(e.x,e.y,"#a55",10,110);burst(e.x,e.y,"#ddd",6,70);
  if(src.isComp){src.kills++;gainXP(src,def.xp);}
  const eggChance=DEBUG?.2:(def.elite?1:.035);if(S.comps.length+S.drops.filter(d=>d.t==="egg").length<6&&Math.random()<eggChance)S.drops.push({t:"egg",x:e.x,y:e.y,life:30});
  else if(Math.random()<.04)S.drops.push({t:"meat",x:e.x,y:e.y,life:20});
  if(def.elite){S.shake=12;S.hitstop=.12;burst(e.x,e.y,"#cb8",60,200);}}}
// ---------- input ----------
const keys={};addEventListener("keydown",e=>{keys[e.key.toLowerCase()]=1;audio();});addEventListener("keyup",e=>keys[e.key.toLowerCase()]=0);
const joy={on:false,ox:0,oy:0,x:0,y:0,id:null};
cv.addEventListener("pointerdown",e=>{audio();joy.on=true;joy.id=e.pointerId;joy.ox=joy.x=e.clientX;joy.oy=joy.y=e.clientY;});
addEventListener("pointermove",e=>{if(joy.on&&e.pointerId===joy.id){joy.x=e.clientX;joy.y=e.clientY;}});
addEventListener("pointerup",e=>{if(e.pointerId===joy.id)joy.on=false;});addEventListener("pointercancel",()=>joy.on=false);
function inputDir(){let x=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0),y=(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0);
 if(joy.on){const dx=joy.x-joy.ox,dy=joy.y-joy.oy,m=Math.hypot(dx,dy);if(m>6){const k=Math.min(1,m/45);x=dx/m*k;y=dy/m*k;}}
 if(window.__dir){x=__dir.x;y=__dir.y;}const m=Math.hypot(x,y);if(m>1){x/=m;y/=m;}return{x,y};}
// ---------- update ----------
function nearestEnemy(p,maxD,excl){let b=null,bd=maxD;for(const e of S.enemies){if(e.dead||e===excl)continue;const d=dist(p,e);if(d<bd){bd=d;b=e;}}return b;}
function spawnEnemy(type){const a=Math.random()*6.283,R=Math.max(W,H)/ZOOM*.62+30,def=ENEMIES[type],sc=1+S.t/320;
 S.enemies.push({type,x:S.hero.x+Math.cos(a)*R,y:S.hero.y+Math.sin(a)*R,hp:def.hp*sc,max:def.hp*sc,r:def.r,kx:0,ky:0,flash:0,ph:Math.random()*6,slow:0,burn:0,face:1});}
function waveTypes(t){const L=["slime","bat"];if(t>50)L.push("mushroom");if(t>110)L.push("goblin");if(t>200)L.push("skeleton");if(t>290)L.push("wisp");if(t>360)L.push("beetle");
 if(t>240)L.splice(0,1);return L;}
function update(dt){const h=S.hero;S.t+=dt;
 if(S.t>=600){end(true);return;}
 // hero move with inertia
 const d=inputDir(),acc=12;h.vx+=(d.x*PLAYER_SPD-h.vx)*Math.min(1,acc*dt);h.vy+=(d.y*PLAYER_SPD-h.vy)*Math.min(1,acc*dt);
 h.x+=h.vx*dt;h.y+=h.vy*dt;if(Math.abs(h.vx)>5)h.face=h.vx>0?1:-1;h.anim+=Math.hypot(h.vx,h.vy)*dt*.08;
 h.inv-=dt;h.hp=Math.min(h.max,h.hp+.4*dt);
 // hero bolt
 h.cd-=dt;if(h.cd<=0){const e=nearestEnemy(h,170);if(e){h.cd=.85;const a=Math.atan2(e.y-h.y,e.x-h.x);S.proj.push({x:h.x,y:h.y-6,vx:Math.cos(a)*230,vy:Math.sin(a)*230,dmg:5,life:1,col:"#9ef",src:h,r:4});sfx("shoot");}}
 // spawn
 const rate=1.0+S.t/65;S.spawnAcc+=rate*dt;const types=waveTypes(S.t);
 while(S.spawnAcc>=1){S.spawnAcc--;if(S.enemies.length<260)spawnEnemy(pick(types));}
 if(S.t>=S.nextElite){S.nextElite+=90;spawnEnemy("golem");S.banner={txt:"精英 石魔像 来袭！",sub:"",t:1.8,col:"#cb8"};}
 // enemies
 const grid=new Map(),cell=32;for(const e of S.enemies){const k=((e.x/cell)|0)+","+((e.y/cell)|0);(grid.get(k)||grid.set(k,[]).get(k)).push(e);}
 for(const e of S.enemies){const def=ENEMIES[e.type];let sp=def.spd*(e.slow>0?.5:1);e.slow-=dt;e.ph+=dt;
  if(e.burn>0){e.burn-=dt;e.bt=(e.bt||0)-dt;if(e.bt<=0){e.bt=.5;damage(e,3,{x:e.x,y:e.y},0,{col:"#f84",crit:0});}}
  let dx=h.x-e.x,dy=h.y-e.y,m=Math.hypot(dx,dy)||1;dx/=m;dy/=m;
  if(e.type==="bat"){const s=Math.sin(e.ph*6)*.6;const ox=-dy*s,oy=dx*s;dx+=ox;dy+=oy;}
  if(e.type==="wisp"){const s=Math.sin(e.ph*2.5)*.9;dx+=-dy*s;dy+=dx*s*.3;}
  if(e.type==="slime"){sp*=.55+.9*Math.max(0,Math.sin(e.ph*4));}
  let sx=0,sy=0;const gx=(e.x/cell)|0,gy=(e.y/cell)|0;
  for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++){const L=grid.get((gx+i)+","+(gy+j));if(!L)continue;for(const o of L){if(o===e)continue;const ex=e.x-o.x,ey=e.y-o.y,dd=Math.hypot(ex,ey),rr=e.r+o.r;if(dd<rr&&dd>0){sx+=ex/dd*(rr-dd);sy+=ey/dd*(rr-dd);}}}
  e.x+=dx*sp*dt+sx*3*dt+e.kx*dt;e.y+=dy*sp*dt+sy*3*dt+e.ky*dt;e.kx*=Math.pow(.0008,dt);e.ky*=Math.pow(.0008,dt);e.flash-=dt;e.face=dx>0?1:-1;
  if(m<e.r+8&&h.inv<=0){h.hp-=def.dmg;h.inv=.7;S.shake=Math.max(S.shake,4);sfx("hurt");S.hurt=.35;floatText(h.x,h.y-20,"-"+def.dmg,"#f55",11);if(h.hp<=0){end(false);return;}}
  if(m>900)e.dead=true;}
 // companions
 const n=S.comps.length;
 S.comps.forEach((c,i)=>{const L=LINES[S.line],tierM=c.tier===4?2.6:c.tier===2?1.6:1,pm=1+(totalLv(c)-4)*.1,mult=tierM*pm,f=formDef(c),col=EL_COLOR[c.el];
  c.flash-=dt;c.evoT-=dt;c.cd-=dt;const ang=i/n*6.283+S.t*.3,fx=h.x+Math.cos(ang)*(28+n*3),fy=h.y+Math.sin(ang)*(22+n*2);
  const opt={col,crit:c.el==="暗"?.25:.1,slow:c.el==="冰",burn:c.el==="火",heavy:false};
  const near=nearestEnemy(c,L.style==="fly"?150:120);
  if(L.style==="dash"){const spd=c.tier===1?240:300;
   if(c.st==="dash"){c.tt-=dt;const t=c.tgt;if(!t||t.dead||c.tt<=0){c.st="follow";}else{const a=Math.atan2(t.y-c.y,t.x-c.x);c.vx=Math.cos(a)*spd;c.vy=Math.sin(a)*spd;
     if(dist(c,t)<t.r+8){damage(t,9*mult,c,180,opt);sfx("bite");c.st="follow";c.cd=c.tier===4?.35:.55;c.vx*=-.3;c.vy*=-.3;
      if(c.el==="雷"){const t2=nearestEnemy(t,70,t);if(t2){damage(t2,5*mult,c,40,opt);S.rings.push({x:t2.x,y:t2.y,r:2,life:.2,max:.2,col:"#ff6",line:[t.x,t.y]});}}
      if(c.tier===4&&c.form==="ninetail"){for(let k=0;k<3;k++){const a2=Math.random()*6.28;S.proj.push({x:c.x,y:c.y,vx:Math.cos(a2)*160,vy:Math.sin(a2)*160,dmg:6*mult,life:1.2,col:"#fc6",src:c,r:5,home:1,opt});}}}}}
   else{if(near&&c.cd<=0&&dist(near,h)<160){c.st="dash";c.tgt=near;c.tt=.6;}seek(c,fx,fy,140,dt);}
  }else if(L.style==="swipe"){if(near&&dist(near,h)<150){seek(c,near.x,near.y,95,dt);if(c.cd<=0&&dist(c,near)<34){c.cd=c.tier>1?1.2:1.5;const R=c.tier>1?42:34;
     S.rings.push({x:c.x+c.face*8,y:c.y,r:R*.4,life:.22,max:.22,col:c.el==="无"?"#fda":col,arc:c.face,R});
     for(const e of S.enemies)if(!e.dead&&Math.hypot(e.x-(c.x+c.face*10),e.y-c.y)<R+e.r)damage(e,23*mult,c,320,{...opt,heavy:true});sfx("heavy");}}
    else seek(c,fx,fy,120,dt);}
  else{c.z=10+Math.sin(S.t*4+i)*3;if(c.st==="dive"){c.tt-=dt;c.x+=c.vx*dt;c.y+=c.vy*dt;c.z=Math.max(0,c.z-8);
     for(const e of S.enemies)if(!e.dead&&!c.hits.has(e)&&dist(e,c)<e.r+10){c.hits.add(e);damage(e,13*mult,c,150,opt);sfx("bite");}if(c.tt<=0)c.st="follow";}
   else{seek(c,fx,fy-14,160,dt);if(near&&c.cd<=0){c.cd=c.tier>1?.8:1.1;if(Math.random()<.45){c.st="dive";c.hits=new Set();c.tt=.45;const a=Math.atan2(near.y-c.y,near.x-c.x);c.vx=Math.cos(a)*330;c.vy=Math.sin(a)*330;c.face=c.vx>0?1:-1;}
     else{const shots=c.tier>1?3:1;for(let k=0;k<shots;k++){const a=Math.atan2(near.y-c.y,near.x-c.x)+(k-(shots-1)/2)*.25;S.proj.push({x:c.x,y:c.y-c.z,vx:Math.cos(a)*260,vy:Math.sin(a)*260,dmg:7*mult,life:.8,col:c.el==="无"?"#eda":col,src:c,r:4,opt});}sfx("shoot");}}}}
  if(L.style!=="fly"||c.st!=="dive"){c.x+=c.vx*dt;c.y+=c.vy*dt;}if(Math.abs(c.vx)>8)c.face=c.vx>0?1:-1;
  if(dist(c,h)>400){c.x=h.x;c.y=h.y;}});
 // projectiles
 for(const p of S.proj){p.life-=dt;if(p.home){const e=nearestEnemy(p,120);if(e){const a=Math.atan2(e.y-p.y,e.x-p.x),v=Math.hypot(p.vx,p.vy);p.vx+=(Math.cos(a)*v-p.vx)*4*dt;p.vy+=(Math.sin(a)*v-p.vy)*4*dt;}}
  p.x+=p.vx*dt;p.y+=p.vy*dt;for(const e of S.enemies){if(e.dead)continue;if(Math.hypot(e.x-p.x,e.y-p.y)<e.r+p.r){damage(e,p.dmg,p.src,70,p.opt||{col:p.col});p.life=0;sfx("hit");break;}}}
 S.proj=S.proj.filter(p=>p.life>0);S.enemies=S.enemies.filter(e=>!e.dead);
 // drops
 for(const d of S.drops){d.life-=dt;const m=dist(d,h);if(m<60){d.x+=(h.x-d.x)*6*dt;d.y+=(h.y-d.y)*6*dt;}if(m<12){d.life=0;
  if(d.t==="egg"){const c=addComp();if(c){c.x=d.x;c.y=d.y;sfx("pick");S.banner={txt:`新伙伴！${LINES[S.line].t1.name}`,sub:`队伍 ${S.comps.length}/6`,t:1.5,col:"#9f9"};burst(d.x,d.y,"#ffd",25,120);}}
  else{h.hp=Math.min(h.max,h.hp+15);sfx("pick");floatText(h.x,h.y-20,"+15","#6f6",11);}}}
 S.drops=S.drops.filter(d=>d.life>0);
 for(const p of S.parts){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.9;p.vy*=.9;p.life-=dt;}S.parts=S.parts.filter(p=>p.life>0);
 for(const t of S.texts){t.y+=t.vy*dt;t.vy*=.92;t.life-=dt;}S.texts=S.texts.filter(t=>t.life>0);
 for(const r of S.rings){r.life-=dt;r.r+=(r.R?r.R*3:160)*dt;}S.rings=S.rings.filter(r=>r.life>0);
 if(S.banner){S.banner.t-=dt;if(S.banner.t<=0)S.banner=null;}
 S.shake*=Math.pow(.002,dt);S.flash-=dt;S.hurt=(S.hurt||0)-dt;}
function seek(c,x,y,spd,dt){const dx=x-c.x,dy=y-c.y,m=Math.hypot(dx,dy);const tv=m>4?Math.min(spd,m*4):0;const tx=m?dx/m*tv:0,ty=m?dy/m*tv:0;
 c.vx+=(tx-c.vx)*Math.min(1,8*dt);c.vy+=(ty-c.vy)*Math.min(1,8*dt);}
// ---------- render ----------
function spr(key,x,y,face,opt={}){const im=IMG[key];if(!im)return;const w=im.width*(opt.s||1),hh=im.height*(opt.s||1);
 cx.save();cx.translate(Math.round(x),Math.round(y));if(face<0)cx.scale(-1,1);if(opt.sq)cx.scale(1+opt.sq,1-opt.sq);
 cx.drawImage(opt.white?WHITE[key]:im,-w/2,-hh,w,hh);cx.restore();}
function shadow(x,y,r){cx.fillStyle="rgba(0,0,0,.28)";cx.beginPath();cx.ellipse(x,y,r,r*.4,0,0,6.283);cx.fill();}
let groundPat=null;
function render(){cx.setTransform(1,0,0,1,0,0);cx.imageSmoothingEnabled=false;cx.fillStyle="#2d4a1a";cx.fillRect(0,0,cv.width,cv.height);if(!S)return;
 const h=S.hero,sk=S.shake,ox=(Math.random()-.5)*sk,oy=(Math.random()-.5)*sk,Z=ZOOM*DPR;
 cx.setTransform(Z,0,0,Z,Math.round(cv.width/2-(h.x+ox)*Z),Math.round(cv.height/2-(h.y+oy)*Z));
 if(IMG.ground){if(!groundPat)groundPat=cx.createPattern(IMG.ground,"repeat");cx.fillStyle=groundPat;const vw=cv.width/Z,vh=cv.height/Z;cx.fillRect(h.x-vw/2-130,h.y-vh/2-130,vw+260,vh+260);}
 for(const d of S.drops){if(d.t==="egg"){const b=Math.sin(S.t*6)*2;shadow(d.x,d.y,6);cx.fillStyle="#fff3d0";cx.beginPath();cx.ellipse(d.x,d.y-7+b,5,7,0,0,6.283);cx.fill();
   cx.fillStyle=EL_COLOR["火"];cx.fillRect(d.x-3,d.y-9+b,2,2);cx.fillRect(d.x+1,d.y-5+b,2,2);cx.strokeStyle="#000";cx.lineWidth=1;cx.stroke();}
  else{cx.fillStyle="#d55";cx.fillRect(d.x-3,d.y-6,6,5);cx.fillStyle="#fee";cx.fillRect(d.x+2,d.y-5,3,2);}}
 const ents=[];for(const e of S.enemies)ents.push({y:e.y,f:()=>{const def=ENEMIES[e.type];shadow(e.x,e.y,e.r*.9);
   const bob=def.fly?-6+Math.sin(e.ph*8)*2:0,sq=e.type==="slime"?Math.sin(e.ph*8)*.12:0;spr(e.type,e.x,e.y+bob,-e.face,{white:e.flash>0,sq});
   if(def.elite){cx.fillStyle="#300";cx.fillRect(e.x-20,e.y-62,40,4);cx.fillStyle="#e33";cx.fillRect(e.x-20,e.y-62,40*Math.max(0,e.hp/e.max),4);}}});
 for(const c of S.comps)ents.push({y:c.y,f:()=>{const f=formDef(c);shadow(c.x,c.y,10);
   if(c.evoT>0){cx.globalAlpha=Math.min(1,c.evoT);cx.fillStyle=EL_COLOR[c.el];cx.beginPath();cx.arc(c.x,c.y-14,26+Math.sin(S.t*20)*3,0,6.283);cx.globalAlpha=.25*Math.min(1,c.evoT);cx.fill();cx.globalAlpha=1;}
   spr(f.spr,c.x,c.y-(c.z||0),c.face,{white:c.evoT>.8||c.flash>0});
   const lv=`Lv${c.lvl}`;cx.font="5px monospace";cx.fillStyle="#000";cx.fillText(lv,c.x-5,c.y+7);cx.fillStyle="#ffd76a";cx.fillText(lv,c.x-5.5,c.y+6.5);}});
 ents.push({y:h.y,f:()=>{shadow(h.x,h.y,8);const fr=Math.hypot(h.vx,h.vy)>10?Math.floor(h.anim)%4:0;
   if(h.inv>0&&Math.floor(h.inv*20)%2)cx.globalAlpha=.5;spr("hero_"+fr,h.x,h.y+1,h.face,{});cx.globalAlpha=1;}});
 ents.sort((a,b)=>a.y-b.y).forEach(e=>e.f());
 for(const p of S.proj){cx.fillStyle=p.col;cx.fillRect(p.x-2,p.y-2,4,4);cx.globalAlpha=.4;cx.fillRect(p.x-p.vx*.02-1.5,p.y-p.vy*.02-1.5,3,3);cx.globalAlpha=1;}
 for(const r of S.rings){cx.globalAlpha=Math.max(0,r.life/r.max);cx.strokeStyle=r.col;cx.lineWidth=r.R?3:2;cx.beginPath();
  if(r.line){cx.moveTo(r.line[0],r.line[1]);cx.lineTo(r.x,r.y);}else if(r.arc){const a0=r.arc>0?-1.2:Math.PI-1.2;cx.arc(r.x,r.y-8,r.r,a0,a0+2.4);}else cx.arc(r.x,r.y-10,r.r,0,6.283);cx.stroke();}cx.globalAlpha=1;
 for(const p of S.parts){cx.globalAlpha=Math.min(1,p.life*3);cx.fillStyle=p.col;cx.fillRect(p.x-p.sz/2,p.y-p.sz/2-6,p.sz,p.sz);}cx.globalAlpha=1;
 cx.textAlign="center";for(const t of S.texts){cx.globalAlpha=Math.min(1,t.life*2.5);cx.font=`bold ${t.size}px monospace`;cx.fillStyle="#000";cx.fillText(t.t,t.x+.7,t.y+.7);cx.fillStyle=t.col;cx.fillText(t.t,t.x,t.y);}cx.globalAlpha=1;
 // screen space
 cx.setTransform(DPR,0,0,DPR,0,0);
 if(S.hurt>0){const g=cx.createRadialGradient(W/2,H/2,Math.min(W,H)*.3,W/2,H/2,Math.max(W,H)*.7);g.addColorStop(0,"rgba(255,0,0,0)");g.addColorStop(1,`rgba(255,0,0,${S.hurt})`);cx.fillStyle=g;cx.fillRect(0,0,W,H);}
 if(S.flash>0){cx.fillStyle=`rgba(255,255,255,${S.flash*.9})`;cx.fillRect(0,0,W,H);}
 if(S.banner){const b=S.banner,a=Math.min(1,b.t*2);cx.globalAlpha=a;cx.textAlign="center";cx.font="bold 26px sans-serif";cx.fillStyle="#000";cx.fillText(b.txt,W/2+2,H*.3+2);cx.fillStyle=b.col;cx.fillText(b.txt,W/2,H*.3);
  cx.font="13px sans-serif";cx.fillStyle="#ddd";cx.fillText(b.sub,W/2,H*.3+22);cx.globalAlpha=1;}
 if(joy.on&&state==="play"){cx.strokeStyle="rgba(255,255,255,.35)";cx.lineWidth=3;cx.beginPath();cx.arc(joy.ox,joy.oy,45,0,6.283);cx.stroke();
  const dx=joy.x-joy.ox,dy=joy.y-joy.oy,m=Math.hypot(dx,dy),k=m>45?45/m:1;cx.fillStyle="rgba(255,255,255,.35)";cx.beginPath();cx.arc(joy.ox+dx*k,joy.oy+dy*k,18,0,6.283);cx.fill();}}
function hud(){const h=S.hero;$("hpfill").style.width=Math.max(0,h.hp/h.max*100)+"%";$("hptext").textContent=`${Math.ceil(Math.max(0,h.hp))}/${h.max}`;
 const r=Math.max(0,600-S.t);$("timer").textContent=`${Math.floor(r/60)}:${String(Math.floor(r%60)).padStart(2,"0")}`;$("kills").textContent=`击杀 ${S.kills}`;$("teamBtn").textContent=`伙伴 ${S.comps.length}/6`;}
// ---------- UI ----------
function openPanel(){if(state!=="play")return;state="panel";$("panel").classList.remove("hidden");
 $("plist").innerHTML=S.comps.map(c=>{const f=formDef(c);const ps=Object.entries(c.parts).map(([s,p])=>`${SLOT_NAMES[s]}:<span class="${p.mut?"mut":""}">${p.k}</span> Lv${p.lv}`).join(" · ");
  return `<div class="comp"><img src="assets/${MAN[f.spr].file}"><div><div class="n">${f.name} <small>T${c.tier} · ${c.el} · Lv${c.lvl} · 击杀${c.kills}</small></div><div class="p">${ps}</div><div class="h">${nextHint(c)}</div></div></div>`;}).join("");}
function closePanel(){$("panel").classList.add("hidden");if(state==="panel")state="play";last=performance.now();}
$("teamBtn").onclick=openPanel;$("closeP").onclick=closePanel;$("panel").addEventListener("click",e=>{if(e.target.id==="panel")closePanel();});
function end(win){state="end";$("hud").classList.add("hidden");$("end").classList.remove("hidden");$("endT").textContent=win?"胜利！":"倒下了…";
 const forms=S.comps.map(c=>formDef(c).name).join("、");$("endS").textContent=`存活 ${Math.floor(S.t/60)}分${Math.floor(S.t%60)}秒 · 击杀 ${S.kills} · 队伍：${forms}`;}
$("again").onclick=()=>{$("end").classList.add("hidden");$("title").classList.remove("hidden");state="title";};
function buildTitle(){$("lines").innerHTML=Object.entries(LINES).map(([k,L])=>`<button class="line" data-l="${k}"><img src="assets/${MAN[L.t1.spr].file}">${L.name}<small>${L.desc}</small><small>${L.t2.map(f=>f.name).join(" ")}</small></button>`).join("");
 document.querySelectorAll(".line").forEach(b=>b.onclick=()=>{audio();start(b.dataset.l);});}
function start(l){newGame(l);$("title").classList.add("hidden");$("hud").classList.remove("hidden");last=performance.now();}
// ---------- loop ----------
let last=performance.now();
function frame(now){let dt=Math.min(.05,(now-last)/1000);last=now;
 if(state==="play"&&S){if(S.hitstop>0){S.hitstop-=dt;dt=0;}if(S.slowmo>0){S.slowmo-=dt;dt*=.25;}if(dt>0)update(dt);if(state==="play")hud();}
 render();requestAnimationFrame(frame);}
loadAll().then(()=>{buildTitle();requestAnimationFrame(frame);});
// test hooks
window.__bt={get S(){return S},start,openPanel,closePanel,evolve:(i,id)=>{const c=S.comps[i],L=LINES[S.line];const f=L.t2.find(f=>f.id===id)||(L.t4||[]).find(f=>f.id===id);
 for(const r of f.req){const sl=r.slot==='limb'?['limbL','limbR'].slice(0,r.count||1):[r.slot];sl.forEach(s=>{if(r.kind){c.parts[s].k=r.kind;c.parts[s].mut=1;}if(r.minLv)c.parts[s].lv=Math.max(c.parts[s].lv,r.minLv);});}
 evolve(c,L.t2.includes(f)?2:4,f);},
 sim:(sec,bot)=>{const log=[];let evo=0;const st=performance.now();for(let i=0;i<sec*30&&state==='play';i++){if(bot){const h=S.hero;let ax=0,ay=0;for(const e of S.enemies){const dx=h.x-e.x,dy=h.y-e.y,d2=dx*dx+dy*dy+1;if(d2<9000){ax+=dx/d2;ay+=dy/d2;}}const m=Math.hypot(ax,ay);keys.d=keys.a=keys.w=keys.s=0;window.__dir=m>0?{x:ax/m,y:ay/m}:{x:Math.cos(S.t*.3),y:Math.sin(S.t*.3)};}
  S.hitstop=0;S.slowmo=0;update(1/30);S.comps.forEach(c=>{if(c.evoT>1.1&&!c.logged){c.logged=1;log.push(Math.round(S.t)+'s '+formDef(c).name);}if(c.evoT<0)c.logged=0;});}
 return {t:Math.round(S.t),state,hp:Math.round(S.hero.hp),kills:S.kills,n:S.comps.length,forms:S.comps.map(c=>formDef(c).name+'L'+c.lvl),log,en:S.enemies.length};},
 addComp:()=>addComp(),skip:t=>{S.t=t;S.nextElite=Math.max(S.nextElite,Math.ceil(t/90)*90);}};
