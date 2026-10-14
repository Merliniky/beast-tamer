"use strict";
const cv=document.getElementById("c"),cx=cv.getContext("2d"),$=id=>document.getElementById(id);
const DEBUG=new URLSearchParams(location.search).has("debug");
const AW=720,AH=1080; // 竞技场（世界单位≈手机CSS像素）
let W=0,H=0,DPR=1,Z=3;
function resize(){DPR=window.devicePixelRatio||1;W=innerWidth;H=innerHeight;cv.width=Math.round(W*DPR);cv.height=Math.round(H*DPR);
 const view=W>H?560:390; Z=Math.max(1,Math.round(W/view*DPR));} // 整数缩放，手机竖屏视野≈390宽
addEventListener("resize",resize);resize();
// ---------- assets ----------
const IMG={},WHITE={},OUT={};let MAN={};
function silhouette(im,col){const c=document.createElement("canvas");c.width=im.width;c.height=im.height;const g=c.getContext("2d");g.drawImage(im,0,0);g.globalCompositeOperation="source-in";g.fillStyle=col;g.fillRect(0,0,c.width,c.height);return c;}
function outlined(im,col){const s=silhouette(im,col),c=document.createElement("canvas");c.width=im.width+2;c.height=im.height+2;const g=c.getContext("2d");
 for(const[dx,dy]of[[0,1],[2,1],[1,0],[1,2]])g.drawImage(s,dx,dy);g.drawImage(im,1,1);return c;}
function loadAll(){return fetch("assets/manifest.json").then(r=>r.json()).then(m=>{MAN=m;return Promise.all(Object.keys(m).map(k=>new Promise(res=>{
 const im=new Image();im.onload=()=>{IMG[k]=im;WHITE[k]=silhouette(im,"#fff");OUT[k]=outlined(im,k.startsWith("hero")?"#fff6d0":ENEMIES[k]?"rgba(255,170,150,.75)":"rgba(210,230,255,.7)");res();};im.onerror=res;im.src="assets/"+m[k].file;})));});}
// ---------- audio ----------
let AC=null,lastSfx={};function audio(){if(!AC){try{AC=new (window.AudioContext||window.webkitAudioContext)();}catch(e){}}if(AC&&AC.state==="suspended")AC.resume();}
function tone(type,f1,f2,dur,vol,t0=0){const now=AC.currentTime+t0,o=AC.createOscillator(),g=AC.createGain();o.type=type;o.connect(g);g.connect(AC.destination);
 o.frequency.setValueAtTime(f1,now);o.frequency.exponentialRampToValueAtTime(f2,now+dur);g.gain.setValueAtTime(vol,now);g.gain.exponentialRampToValueAtTime(.001,now+dur);o.start(now);o.stop(now+dur+.02);}
function sfx(t){if(!AC)return;const now=AC.currentTime;if(lastSfx[t]&&now-lastSfx[t]<.05)return;lastSfx[t]=now;
 ({hit:()=>tone("square",420,140,.05,.05),bite:()=>tone("sawtooth",320,80,.08,.08),shoot:()=>tone("square",900,500,.04,.02),hurt:()=>tone("sawtooth",200,60,.18,.12),
  orb:()=>tone("sine",900,1400,.05,.03),lvl:()=>tone("square",500,1000,.12,.05),kill:()=>tone("triangle",240,90,.08,.06),mut:()=>tone("sine",400,1600,.22,.08),
  heavy:()=>{tone("triangle",150,40,.22,.2);const n=AC.createBufferSource(),b=AC.createBuffer(1,AC.sampleRate*.12,AC.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*(1-i/d.length);n.buffer=b;const g=AC.createGain();g.gain.value=.12;n.connect(g);g.connect(AC.destination);n.start();},
  evolve:()=>[523,659,784,1046,1318].forEach((f,i)=>tone("square",f,f,.28,.07,i*.08)),wave:()=>[392,523,659].forEach((f,i)=>tone("triangle",f,f,.2,.08,i*.1)),pick:()=>tone("sine",600,1200,.1,.08)})[t]?.();}
// ---------- helpers ----------
const rnd=(a,b)=>a+Math.random()*(b-a),pick=a=>a[Math.floor(Math.random()*a.length)],dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const WAVES=[30,35,40,45,50,55,60,60];
let S=null,state="title";
function newGame(line){const L=LINES[line],b=L.base;
 S={line,wave:0,wt:0,t:0,kills:0,hero:{x:AW/2,y:AH/2,vx:0,vy:0,hp:80,max:80,inv:0,face:1,anim:0,cd:0,spd:70,bolt:5,regen:.5,magnet:40},
  pet:{tier:1,form:"t1",el:"无",x:AW/2+20,y:AH/2,vx:0,vy:0,face:1,cd:0,st:"follow",tgt:null,tt:0,lvl:1,xp:0,kills:0,lean:null,z:0,hits:new Set(),evoT:0,isPet:true,
   parts:{head:{k:b.head,lv:1},limbL:{k:b.limb,lv:1},limbR:{k:b.limb,lv:1},trait:{k:b.trait,lv:1}}},
  enemies:[],tele:[],proj:[],parts:[],texts:[],orbs:[],rings:[],slashes:[],shake:0,hitstop:0,slowmo:0,flash:0,banner:null,spawnAcc:0,pendingEvo:null};
 startWave();}
function startWave(){S.wave++;S.wt=0;S.spawnAcc=0;S.elite=(S.wave%4===0);S.eliteDone=false;state="play";sfx("wave");
 S.banner={txt:`第 ${S.wave} 波`,sub:S.elite?"精英 石魔像 将会出现":`坚持 ${WAVES[S.wave-1]} 秒`,t:1.6,col:"#ffd76a"};
 if(S.pendingEvo){const f=S.pendingEvo;S.pendingEvo=null;evolve(f);}}
function formDef(p){const L=LINES[S.line];if(p.tier===1)return L.t1;return (p.tier===2?L.t2:L.t4).find(f=>f.id===p.form);}
// ---------- parts / evolution ----------
function slotKinds(slot){const L=LINES[S.line],s=new Set();L.t2.forEach(f=>f.req.forEach(r=>{if(r.slot===slot&&r.kind)s.add(r.kind);}));
 (L.t4||[]).forEach(f=>f.req.forEach(r=>{if(r.slot===slot&&r.kind)s.add(r.kind);}));return [...s];}
function reqOK(p,r){const sl=r.slot==="limb"?["limbL","limbR"]:[r.slot];let n=0;for(const s of sl){const q=p.parts[s];if((!r.kind||q.k===r.kind)&&(!r.minLv||q.lv>=r.minLv))n++;}return n>=(r.count||1);}
const score=(p,f)=>f.req.filter(r=>reqOK(p,r)).length/f.req.length;
const totalLv=p=>Object.values(p.parts).reduce((a,q)=>a+q.lv,0);
const fmtReq=r=>(r.kind||(r.slot==="limb"?"肢":SLOT_NAMES[r.slot]))+(r.minLv?` Lv${r.minLv}`:"")+((r.count||1)>1?` x${r.count}`:"");
const leanOf=k=>{const L=LINES[S.line];for(const f of L.t2)if(f.req.some(r=>r.kind===k))return f.id;for(const f of L.t4||[])if(f.req.some(r=>r.kind===k))return f.from;return null;};
function nextForms(p){const L=LINES[S.line];if(p.tier===1)return L.t2;if(p.tier===2)return (L.t4||[]).filter(f=>f.from===p.form);return [];}
function evoOptions(p){const fs=nextForms(p);if(!fs.length)return [];const ok=fs.filter(f=>f.req.every(r=>reqOK(p,r)));
 if(ok.length)return ok.slice(0,3);if(p.tier===1&&totalLv(p)>=10)return fs.map(f=>({f,s:score(p,f)+(p.lean===f.id?.5:0)+Math.random()*.05})).sort((a,b)=>b.s-a.s).slice(0,3).map(x=>x.f);return [];}
function goalText(p){const fs=nextForms(p);if(!fs.length)return p.tier===4?"已达终阶形态":"该形态的 T3/T4 进化将在正式版开放";
 if(evoOptions(p).length)return "✦ 可以进化！本波结束后选择进化方向";
 const best=fs.map(f=>({f,s:score(p,f)+(p.lean===f.id?.3:0)})).sort((a,b)=>b.s-a.s)[0].f;
 return `目标 ${best.name}：缺 ${best.req.filter(r=>!reqOK(p,r)).map(fmtReq).join("、")}`+(p.tier===1?` · 保底 ${totalLv(p)}/10`:"");}
const maxed=p=>Object.values(p.parts).every(q=>q.lv>=5);
function petXP(x){const p=S.pet;if(maxed(p)){S.hero.hp=Math.min(S.hero.max,S.hero.hp+x*.5);return;}p.xp+=x;let need=6+p.lvl*4;
 while(p.xp>=need&&!maxed(p)){p.xp-=need;p.lvl++;levelPart(p);need=6+p.lvl*4;}if(maxed(p))p.xp=0;}
function levelPart(p,forced){const W0={head:30,limbL:25,limbR:25,trait:20};const cand=Object.keys(W0).filter(s=>p.parts[s].lv<5);if(!cand.length)return;
 let slot=forced;if(!slot){let r=Math.random()*cand.reduce((a,s)=>a+W0[s],0);slot=cand[0];for(const s of cand){r-=W0[s];if(r<0){slot=s;break;}}}
 const q=p.parts[slot];q.lv=Math.min(5,q.lv+1);sfx("lvl");floatText(p.x,p.y-22,`${SLOT_NAMES[slot]}↑${q.lv}`,"#9f9");
 if(!forced&&Math.random()<(DEBUG?.5:.15))mutate(p,slot);}
function mutate(p,slot,kind){const kinds=slotKinds(slot.startsWith("limb")?"limb":slot);if(!kinds.length)return;
 let k=kind;if(!k){if(p.lean&&Math.random()<.65){const pr=kinds.filter(x=>leanOf(x)===p.lean);k=pr.length?pick(pr):pick(kinds);}else k=pick(kinds);}
 const q=p.parts[slot];if(q.k===k)return;q.k=k;q.mut=1;p.lean=leanOf(k)||p.lean;sfx("mut");floatText(p.x,p.y-30,`变异 ${k}`,"#f9c");burst(p.x,p.y-8,"#f9c",8,50);}
function evolve(f){const p=S.pet;p.tier=LINES[S.line].t2.includes(f)?2:4;p.form=f.id;p.el=f.el;p.evoT=1.2;S.slowmo=.8;S.flash=.45;S.shake=6;sfx("evolve");
 S.rings.push({x:p.x,y:p.y-10,r:3,life:.7,max:.7,col:EL_COLOR[f.el],grow:120});burst(p.x,p.y-10,EL_COLOR[f.el],40,140);burst(p.x,p.y-10,"#fff",20,90);
 S.banner={txt:`进化！${f.name}`,sub:p.tier===4?"终阶形态（演示捷径：跳过 T3）":`${LINES[S.line].t1.name} → ${f.name}`,t:2.2,col:EL_COLOR[f.el]};}
// ---------- fx ----------
function floatText(x,y,t,col){if(S.texts.length>30)S.texts.shift();S.texts.push({x,y,t,col,life:.8,vy:-22});}
function dmgText(e,d,crit){const tx=e.dt;if(tx&&tx.life>.45&&!crit){tx.v+=d;tx.t=String(Math.round(tx.v));tx.life=.8;return;}
 if(S.texts.length>30)S.texts.shift();const t={x:e.x+rnd(-3,3),y:e.y-e.h-2,v:d,t:String(Math.round(d))+(crit?"!":""),col:crit?"#ffd23a":"#fff",life:.8,vy:-20,small:!crit};S.texts.push(t);if(!crit)e.dt=t;}
function burst(x,y,col,n,sp){for(let i=0;i<n;i++){const a=Math.random()*6.283,v=rnd(sp*.3,sp);S.parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:rnd(.2,.5),col});}if(S.parts.length>500)S.parts.splice(0,S.parts.length-500);}
function damage(e,dmg,src,kb,o={}){if(e.dead)return;const def=ENEMIES[e.type];const crit=Math.random()<(o.crit??.08);dmg*=(crit?2:1)*(1-(def.armor||0));
 e.hp-=dmg;e.flash=.08;const a=Math.atan2(e.y-src.y,e.x-src.x),k=kb*(def.elite?.15:1);e.kx+=Math.cos(a)*k;e.ky+=Math.sin(a)*k;dmgText(e,dmg,crit);
 burst(e.x,e.y-e.h/2,o.col||"#fff",crit?6:3,60);if(o.heavy||crit){S.hitstop=Math.max(S.hitstop,o.heavy?.06:.03);S.shake=Math.max(S.shake,o.heavy?3:1.5);}
 if(o.slow)e.slow=1.5;if(o.burn)e.burn=2.5;
 if(e.hp<=0){e.dead=true;S.kills++;sfx("kill");burst(e.x,e.y-e.h/2,"#b55",8,80);
  const n=def.elite?12:def.xp;for(let i=0;i<Math.min(n,4);i++)S.orbs.push({x:e.x+rnd(-4,4),y:e.y+rnd(-4,4),v:n/Math.min(n,4)*(src.isPet?1.5:1),t:"xp"});
  if(def.elite||Math.random()<(DEBUG?.1:.015))S.orbs.push({x:e.x,y:e.y,t:"part"});else if(Math.random()<.03)S.orbs.push({x:e.x,y:e.y,t:"meat"});
  if(src.isPet)src.kills++;if(def.elite){S.shake=8;S.hitstop=.1;burst(e.x,e.y-15,"#cb8",40,150);}}}
// ---------- input ----------
const keys={};addEventListener("keydown",e=>{keys[e.key.toLowerCase()]=1;audio();});addEventListener("keyup",e=>keys[e.key.toLowerCase()]=0);
const joy={on:false,ox:0,oy:0,x:0,y:0,id:null};
cv.addEventListener("pointerdown",e=>{audio();joy.on=true;joy.id=e.pointerId;joy.ox=joy.x=e.clientX;joy.oy=joy.y=e.clientY;});
addEventListener("pointermove",e=>{if(joy.on&&e.pointerId===joy.id){joy.x=e.clientX;joy.y=e.clientY;}});
addEventListener("pointerup",e=>{if(e.pointerId===joy.id)joy.on=false;});addEventListener("pointercancel",()=>joy.on=false);
function inputDir(){let x=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0),y=(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0);
 if(joy.on){const dx=joy.x-joy.ox,dy=joy.y-joy.oy,m=Math.hypot(dx,dy);if(m>6){const k=Math.min(1,m/40);x=dx/m*k;y=dy/m*k;}}
 if(window.__dir){x=__dir.x;y=__dir.y;}const m=Math.hypot(x,y);if(m>1){x/=m;y/=m;}return{x,y};}
// ---------- update ----------
function nearest(p,maxD,ex){let b=null,bd=maxD;for(const e of S.enemies){if(e.dead||e===ex)continue;const d=dist(p,e);if(d<bd){bd=d;b=e;}}return b;}
function telegraph(type){const h=S.hero;let x,y,i=0;do{x=rnd(30,AW-30);y=rnd(40,AH-30);}while(Math.hypot(x-h.x,y-h.y)<140&&i++<20);S.tele.push({x,y,type,t:.8});}
function spawn(tl){const def=ENEMIES[tl.type],sc=1+.15*(S.wave-1)*(def.elite?1.5:1),img=IMG[tl.type];
 S.enemies.push({type:tl.type,x:tl.x,y:tl.y,hp:def.hp*sc,max:def.hp*sc,r:def.elite?16:Math.max(5,img.width*.32),h:img.height,kx:0,ky:0,flash:0,ph:Math.random()*6,face:1,slow:0,burn:0});}
function waveTypes(w){return [["slime","bat"],["slime","bat","mushroom"],["bat","mushroom","goblin"],["mushroom","goblin","skeleton"],["goblin","skeleton","wisp"],["skeleton","wisp","beetle","goblin"],["skeleton","wisp","beetle","goblin"],["wisp","beetle","skeleton","goblin"]][w-1];}
function update(dt){const h=S.hero,p=S.pet;S.t+=dt;S.wt+=dt;
 if(S.wt>=WAVES[S.wave-1]){endWave();return;}
 const d=inputDir();h.vx+=(d.x*h.spd-h.vx)*Math.min(1,14*dt);h.vy+=(d.y*h.spd-h.vy)*Math.min(1,14*dt);
 h.x=clamp(h.x+h.vx*dt,10,AW-10);h.y=clamp(h.y+h.vy*dt,16,AH-6);if(Math.abs(h.vx)>5)h.face=h.vx>0?1:-1;h.anim+=Math.hypot(h.vx,h.vy)*dt*.115;
 h.inv-=dt;h.hp=Math.min(h.max,h.hp+h.regen*dt);
 h.cd-=dt;if(h.cd<=0){const e=nearest(h,150);if(e){h.cd=1;const a=Math.atan2(e.y-e.h/2-h.y+12,e.x-h.x);S.proj.push({x:h.x,y:h.y-12,vx:Math.cos(a)*170,vy:Math.sin(a)*170,dmg:h.bolt,life:.9,col:"#9ef",src:h,r:2});sfx("shoot");}}
 // spawning with telegraph
 const rate=.5+S.wave*.25;S.spawnAcc+=rate*dt;while(S.spawnAcc>=1){S.spawnAcc--;if(S.enemies.length+S.tele.length<70){const n=Math.random()<.25?3:1;for(let i=0;i<n;i++)telegraph(pick(waveTypes(S.wave)));}}
 if(S.elite&&!S.eliteDone&&S.wt>8){S.eliteDone=true;telegraph("golem");S.banner={txt:"精英 石魔像！",sub:"",t:1.4,col:"#cb8"};}
 for(const t of S.tele){t.t-=dt;if(t.t<=0)spawn(t);}S.tele=S.tele.filter(t=>t.t>0);
 // enemies
 const grid=new Map(),cell=24;for(const e of S.enemies){const k=((e.x/cell)|0)*1000+((e.y/cell)|0);(grid.get(k)||grid.set(k,[]).get(k)).push(e);}
 for(const e of S.enemies){const def=ENEMIES[e.type];let sp=def.spd*(e.slow>0?.5:1);e.slow-=dt;e.ph+=dt;
  if(e.burn>0){e.burn-=dt;e.bt=(e.bt||0)-dt;if(e.bt<=0){e.bt=.5;damage(e,2,e,0,{col:"#f84",crit:0});}}
  let dx=h.x-e.x,dy=h.y-e.y,m=Math.hypot(dx,dy)||1;dx/=m;dy/=m;
  if(e.type==="bat"){const s=Math.sin(e.ph*6)*.6;[dx,dy]=[dx-dy*s,dy+dx*s];}if(e.type==="wisp"){const s=Math.sin(e.ph*2.5)*.8;[dx,dy]=[dx-dy*s,dy+dx*s];}
  if(e.type==="slime")sp*=.5+.9*Math.max(0,Math.sin(e.ph*4));
  let sx=0,sy=0;const gx=(e.x/cell)|0,gy=(e.y/cell)|0;
  for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++){const L=grid.get((gx+i)*1000+gy+j);if(!L)continue;for(const o of L){if(o===e)continue;const ex=e.x-o.x,ey=e.y-o.y,dd=Math.hypot(ex,ey),rr=e.r+o.r;if(dd<rr&&dd>0){sx+=ex/dd*(rr-dd);sy+=ey/dd*(rr-dd);}}}
  e.x=clamp(e.x+dx*sp*dt+sx*4*dt+e.kx*dt,6,AW-6);e.y=clamp(e.y+dy*sp*dt+sy*4*dt+e.ky*dt,10,AH-4);const f=Math.pow(.0005,dt);e.kx*=f;e.ky*=f;e.flash-=dt;e.face=dx>0?1:-1;
  if(m<e.r+6&&h.inv<=0){const dmg=Math.round(def.dmg*(1+.08*(S.wave-1)));h.hp-=dmg;h.inv=.85;S.shake=Math.max(S.shake,3);sfx("hurt");S.hurt=.35;floatText(h.x,h.y-30,"-"+dmg,"#f55");if(h.hp<=0){end(false);return;}}}
 petUpdate(dt);
 for(const q of S.proj){q.life-=dt;if(q.home){const e=nearest(q,100);if(e){const a=Math.atan2(e.y-q.y,e.x-q.x),v=Math.hypot(q.vx,q.vy);q.vx+=(Math.cos(a)*v-q.vx)*5*dt;q.vy+=(Math.sin(a)*v-q.vy)*5*dt;}}
  q.x+=q.vx*dt;q.y+=q.vy*dt;for(const e of S.enemies){if(e.dead)continue;if(Math.hypot(e.x-q.x,e.y-e.h/2-q.y)<e.r+q.r+2){damage(e,q.dmg,q.src,50,q.o||{col:q.col});q.life=0;sfx("hit");break;}}}
 S.proj=S.proj.filter(q=>q.life>0);S.enemies=S.enemies.filter(e=>!e.dead);
 for(const o of S.orbs){const m=dist(o,h);if(m<h.magnet){o.x+=(h.x-o.x)*8*dt;o.y+=(h.y-o.y)*8*dt;}if(m<8){o.done=1;
  if(o.t==="xp"){petXP(o.v);sfx("orb");}else if(o.t==="meat"){h.hp=Math.min(h.max,h.hp+10);floatText(h.x,h.y-30,"+10","#6f6");sfx("pick");}
  else{const sl=pick(["head","limbL","limbR","trait"]);mutate(p,sl);floatText(h.x,h.y-36,"拾取部件！","#f9c");sfx("pick");}}}
 S.orbs=S.orbs.filter(o=>!o.done);
 fxUpdate(dt);}
function fxUpdate(dt){for(const q of S.parts){q.x+=q.vx*dt;q.y+=q.vy*dt;q.vx*=.88;q.vy*=.88;q.life-=dt;}S.parts=S.parts.filter(q=>q.life>0);
 for(const t of S.texts){t.y+=t.vy*dt;t.vy*=.9;t.life-=dt;}S.texts=S.texts.filter(t=>t.life>0);
 for(const r of S.rings){r.life-=dt;r.r+=(r.grow||60)*dt;}S.rings=S.rings.filter(r=>r.life>0);
 for(const s of S.slashes)s.life-=dt;S.slashes=S.slashes.filter(s=>s.life>0);
 if(S.banner){S.banner.t-=dt;if(S.banner.t<=0)S.banner=null;}S.shake*=Math.pow(.002,dt);S.flash-=dt;S.hurt=(S.hurt||0)-dt;S.pet.evoT-=dt;}
function seek(c,x,y,spd,dt){const dx=x-c.x,dy=y-c.y,m=Math.hypot(dx,dy),tv=m>3?Math.min(spd,m*5):0;c.vx+=((m?dx/m*tv:0)-c.vx)*Math.min(1,10*dt);c.vy+=((m?dy/m*tv:0)-c.vy)*Math.min(1,10*dt);}
function petUpdate(dt){const p=S.pet,h=S.hero,L=LINES[S.line],col=EL_COLOR[p.el];p.cd-=dt;
 const mult=(p.tier===4?3:p.tier===2?1.8:1)*(1+(totalLv(p)-4)*.12);const o={col,crit:p.el==="暗"?.25:.1,slow:p.el==="冰",burn:p.el==="火"};
 const fx=h.x-h.face*16,fy=h.y+4,near=nearest(h,120);
 if(L.style==="dash"){if(p.st==="dash"){p.tt-=dt;const t=p.tgt;if(!t||t.dead||p.tt<=0)p.st="follow";else{const a=Math.atan2(t.y-p.y,t.x-p.x),sp=p.tier>1?220:180;p.vx=Math.cos(a)*sp;p.vy=Math.sin(a)*sp;
   if(dist(p,t)<t.r+6){damage(t,12*mult,p,140,o);sfx("bite");S.slashes.push({x:t.x,y:t.y-t.h/2,a:a,life:.15,col:p.el==="无"?"#fff":col,r:9});p.st="follow";p.cd=p.tier===4?.3:.5;p.vx*=-.3;p.vy*=-.3;
    if(p.el==="雷"){const t2=nearest(t,60,t);if(t2){damage(t2,6*mult,p,30,o);S.rings.push({x:t2.x,y:t2.y-t2.h/2,r:1,life:.15,max:.15,col:"#ff6",line:[t.x,t.y-t.h/2]});}}
    if(p.form==="ninetail")for(let k=0;k<3;k++){const a2=Math.random()*6.28;S.proj.push({x:p.x,y:p.y-8,vx:Math.cos(a2)*120,vy:Math.sin(a2)*120,dmg:5*mult,life:1.2,col:"#fc6",src:p,r:3,home:1,o});}}}}
  else{if(near&&p.cd<=0){p.st="dash";p.tgt=near;p.tt=.6;}seek(p,fx,fy,95,dt);}}
 else if(L.style==="swipe"){if(near){seek(p,near.x-p.face*4,near.y,68,dt);if(p.cd<=0&&dist(p,near)<near.r+16){p.cd=p.tier>1?1:1.25;const R=p.tier>1?30:24;p.face=near.x>p.x?1:-1;
   S.slashes.push({x:p.x+p.face*6,y:p.y-8,a:p.face>0?0:Math.PI,life:.2,col:p.el==="无"?"#fda":col,r:R,big:1});
   for(const e of S.enemies)if(!e.dead&&Math.hypot(e.x-(p.x+p.face*8),e.y-p.y)<R+e.r)damage(e,22*mult,p,260,{...o,heavy:true});sfx("heavy");}}else seek(p,fx,fy,90,dt);}
 else{p.z=12+Math.sin(S.t*4)*2;if(p.st==="dive"){p.tt-=dt;p.z=Math.max(0,p.z-10);
   for(const e of S.enemies)if(!e.dead&&!p.hits.has(e)&&dist(e,p)<e.r+7){p.hits.add(e);damage(e,16*mult,p,120,o);sfx("bite");S.slashes.push({x:e.x,y:e.y-e.h/2,a:Math.atan2(p.vy,p.vx),life:.12,col:"#fff",r:7});}if(p.tt<=0)p.st="follow";}
  else{seek(p,fx,fy,120,dt);if(near&&p.cd<=0){p.cd=p.tier>1?.55:.8;if(Math.random()<.45){p.st="dive";p.hits=new Set();p.tt=.4;const a=Math.atan2(near.y-p.y,near.x-p.x);p.vx=Math.cos(a)*230;p.vy=Math.sin(a)*230;}
    else{const n=p.tier>1?3:1;for(let k=0;k<n;k++){const a=Math.atan2(near.y-near.h/2-p.y+p.z,near.x-p.x)+(k-(n-1)/2)*.25;S.proj.push({x:p.x,y:p.y-p.z,vx:Math.cos(a)*190,vy:Math.sin(a)*190,dmg:9*mult,life:.7,col:p.el==="无"?"#eda":col,src:p,r:2,o});}sfx("shoot");}}}}
 p.x=clamp(p.x+p.vx*dt,8,AW-8);p.y=clamp(p.y+p.vy*dt,12,AH-4);if(Math.abs(p.vx)>8)p.face=p.vx>0?1:-1;if(dist(p,h)>220){p.x=h.x;p.y=h.y;}}
// ---------- waves & cards ----------
function endWave(){for(const e of S.enemies){burst(e.x,e.y-e.h/2,"#888",3,40);}S.enemies=[];S.tele=[];S.proj=[];
 let xp=0;for(const o of S.orbs)if(o.t==="xp")xp+=o.v;S.orbs=[];petXP(xp);
 if(S.wave>=WAVES.length){end(true);return;}
 const opts=evoOptions(S.pet);if(opts.length)showEvoCards(opts);else showCards();}
function cardHTML(c,i){return `<button class="card ${c.cls}" data-i="${i}">${c.img?`<img src="assets/${c.img}">`:""}<div><b>${c.title}</b><span>${c.desc}</span></div></button>`;}
function present(title,sub,cards){state="cards";$("cardT").textContent=title;$("cardS").textContent=sub;$("clist").innerHTML=cards.map(cardHTML).join("");$("cards").classList.remove("hidden");
 S._cards=cards;document.querySelectorAll(".card").forEach(b=>b.onclick=()=>chooseCard(+b.dataset.i));}
function chooseCard(i){const c=S._cards[i];$("cards").classList.add("hidden");c.fn();sfx("pick");if(state==="cards")startWave();}
function showEvoCards(opts){present("选择进化方向","伙伴满足进化条件！",opts.map(f=>({cls:"evo",img:MAN[f.spr].file,title:`${f.name}  <span class="tag">${f.el}</span>`,desc:f.req.map(fmtReq).join(" + "),
 fn:()=>{S.pendingEvo=f;}})));}
function showCards(){const p=S.pet,fs=nextForms(p),pool=[];
 const best=fs.length?fs.map(f=>({f,s:score(p,f)+(p.lean===f.id?.3:0)+Math.random()*.2})).sort((a,b)=>b.s-a.s)[0].f:null;
 // 1. 朝向目标的部件（定向变异）
 if(best){const miss=best.req.filter(r=>!reqOK(p,r));for(const r of miss){const sl=r.slot==="limb"?(p.parts.limbL.k===r.kind?"limbR":"limbL"):r.slot;
  if(r.kind)pool.push({cls:"part",img:MAN[best.spr].file,title:`部件：${r.kind}`,desc:`装到${SLOT_NAMES[sl]}（通往 ${best.name}）`,fn:()=>mutate(p,sl,r.kind)});
  else pool.push({cls:"part",title:`${SLOT_NAMES[sl]} 强化`,desc:`${SLOT_NAMES[sl]} 等级 +1（通往 ${best.name}）`,fn:()=>levelPart(p,sl)});}}
 // 2. 随机部件强化
 const up=Object.keys(SLOT_NAMES).filter(s=>p.parts[s].lv<5);if(up.length){const s=pick(up);pool.push({cls:"part",title:`${SLOT_NAMES[s]}·${p.parts[s].k} +1`,desc:`部件等级 ${p.parts[s].lv}→${p.parts[s].lv+1}，伙伴伤害提升`,fn:()=>levelPart(p,s)});}
 // 3. 英雄被动
 const hero=[{title:"坚韧",desc:"最大生命 +15 并回满",fn:()=>{S.hero.max+=15;S.hero.hp=S.hero.max;}},{title:"疾行",desc:"移动速度 +8%",fn:()=>S.hero.spd*=1.08},
  {title:"法杖精通",desc:"法杖伤害 +40%",fn:()=>S.hero.bolt*=1.4},{title:"自愈",desc:"生命回复 +0.4/秒",fn:()=>S.hero.regen+=.4},{title:"磁力",desc:"拾取范围 +40%",fn:()=>S.hero.magnet*=1.4}];
 pool.sort(()=>Math.random()-.5);const cards=pool.slice(0,2);while(cards.length<3){const c=pick(hero);if(!cards.includes(c))cards.push({...c,cls:"hero",title:"英雄 · "+c.title});}
 present(`第 ${S.wave} 波完成`,goalText(p),cards);}
// ---------- render ----------
let camX=0,camY=0;
function spr(key,x,y,face,o={}){const im=o.out?OUT[key]:(o.white?WHITE[key]:IMG[key]);if(!im)return;cx.save();cx.translate(Math.round(x),Math.round(y));if(face<0)cx.scale(-1,1);
 if(o.rot)cx.rotate(o.rot);if(o.sq)cx.scale(1+o.sq,1-o.sq);cx.drawImage(im,-Math.round(im.width/2),-im.height);cx.restore();}
function shadow(x,y,r){cx.fillStyle="rgba(0,0,0,.3)";cx.beginPath();cx.ellipse(Math.round(x),Math.round(y),r,Math.max(1.5,r*.4),0,0,6.283);cx.fill();}
let GC=null;
function GROUND(){if(GC)return GC;GC=document.createElement("canvas");GC.width=AW;GC.height=AH;const g=GC.getContext("2d");
 let seed=7;const r=()=>(seed=(seed*16807)%2147483647)/2147483647;
 g.fillStyle="#3d3833";g.fillRect(0,0,AW,AH);
 for(let i=0;i<9000;i++){const v=r();g.fillStyle=v<.5?"rgba(0,0,0,.07)":"rgba(255,240,220,.035)";g.fillRect(Math.floor(r()*AW),Math.floor(r()*AH),1+Math.floor(r()*2),1);}
 for(let i=0;i<40;i++){g.fillStyle="rgba(0,0,0,.035)";g.beginPath();g.ellipse(r()*AW,r()*AH,20+r()*50,10+r()*25,0,0,6.283);g.fill();}
 for(let i=0;i<90;i++){const x=Math.floor(r()*AW),y=Math.floor(r()*AH);g.fillStyle="rgba(120,110,100,.35)";g.fillRect(x,y,2+Math.floor(r()*2),2);g.fillStyle="rgba(0,0,0,.2)";g.fillRect(x,y+2,3,1);}
 for(let i=0;i<30;i++){let x=r()*AW,y=r()*AH;g.strokeStyle="rgba(0,0,0,.12)";g.lineWidth=1;g.beginPath();g.moveTo(x,y);for(let k=0;k<4;k++){x+=r()*14-7;y+=r()*10;g.lineTo(x,y);}g.stroke();}
 for(let i=0;i<25;i++){const x=Math.floor(r()*AW),y=Math.floor(r()*AH);g.fillStyle="rgba(110,120,90,.25)";g.fillRect(x,y,1,3);g.fillRect(x+2,y+1,1,2);}
 return GC;}
function render(){cx.setTransform(1,0,0,1,0,0);cx.imageSmoothingEnabled=false;cx.fillStyle="#1a1410";cx.fillRect(0,0,cv.width,cv.height);if(!S)return;
 const h=S.hero,vw=cv.width/Z,vh=cv.height/Z;
 const tx=vw>=AW+40?AW/2:clamp(h.x,vw/2-60,AW-vw/2+60),ty=vh>=AH+40?AH/2:clamp(h.y,vh/2-60,AH-vh/2+60);camX+=(tx-camX)*.2;camY+=(ty-camY)*.2;
 const sk=S.shake,ox=Math.round(camX-vw/2+(Math.random()-.5)*sk),oy=Math.round(camY-vh/2+(Math.random()-.5)*sk);cx.setTransform(Z,0,0,Z,-ox*Z,-oy*Z);
 cx.drawImage(GROUND(),0,0);
 cx.fillStyle="#26221f";cx.fillRect(-10,-10,AW+20,10);cx.fillRect(-10,AH,AW+20,10);cx.fillRect(-10,0,10,AH);cx.fillRect(AW,0,10,AH);
 cx.fillStyle="#2a1f16";cx.fillRect(-10,-10,AW+20,3);cx.fillStyle="#6b5640";cx.fillRect(0,-3,AW,3);
 for(const t of S.tele){cx.strokeStyle=`rgba(255,60,60,${.5+.5*Math.sin(t.t*30)})`;cx.lineWidth=1.5;const s=t.type==="golem"?10:4;cx.beginPath();cx.moveTo(t.x-s,t.y-s);cx.lineTo(t.x+s,t.y+s);cx.moveTo(t.x+s,t.y-s);cx.lineTo(t.x-s,t.y+s);cx.stroke();}
 for(const o of S.orbs){if(o.t==="xp"){cx.fillStyle="#5f8";cx.fillRect(Math.round(o.x)-1,Math.round(o.y)-2,2,3);}else if(o.t==="meat"){cx.fillStyle="#d55";cx.fillRect(o.x-2,o.y-3,4,3);}
  else{const b=Math.sin(S.t*6);cx.fillStyle="#f9c";cx.fillRect(o.x-3,o.y-6+b,6,6);cx.fillStyle="#fff";cx.fillRect(o.x-1,o.y-4+b,2,2);}}
 const ents=[];
 for(const e of S.enemies)ents.push([e.y,()=>{const def=ENEMIES[e.type];shadow(e.x,e.y,e.r);const bob=def.fly?-5+Math.sin(e.ph*8):0;const wk=def.fly?0:Math.abs(Math.sin(e.ph*9))*1.5;spr(e.type,e.x,e.y+bob-wk,-e.face,{white:e.flash>0,out:e.flash<=0,rot:def.fly||e.type==='slime'?0:Math.sin(e.ph*9)*.07,sq:e.type==="slime"?Math.sin(e.ph*8)*.12:0});
  if(def.elite){cx.fillStyle="#300";cx.fillRect(e.x-14,e.y-e.h-5,28,2);cx.fillStyle="#e33";cx.fillRect(e.x-14,e.y-e.h-5,28*Math.max(0,e.hp/e.max),2);}}]);
 const p=S.pet;ents.push([p.y,()=>{const f=formDef(p);shadow(p.x,p.y,8);if(p.evoT>0){cx.globalAlpha=.3*Math.min(1,p.evoT);cx.fillStyle=EL_COLOR[p.el];cx.beginPath();cx.arc(p.x,p.y-12,16+Math.sin(S.t*20)*2,0,6.283);cx.fill();cx.globalAlpha=1;}
  const ps=Math.hypot(p.vx,p.vy);p.wp=(p.wp||0)+ps*.0025;const pb=ps>8?Math.abs(Math.sin(p.wp*6.283))*1.5:0;spr(f.spr,p.x,p.y-(p.z||0)-pb,p.face,{white:p.evoT>.75,out:p.evoT<=.75,rot:ps>8&&LINES[S.line].style!=='fly'?Math.sin(p.wp*6.283)*.06:0});}]);
 ents.push([h.y,()=>{shadow(h.x,h.y,6);const mv=Math.hypot(h.vx,h.vy)>8,fr=mv?Math.floor(h.anim)%2:0,hb=mv?Math.abs(Math.sin(h.anim*Math.PI))*2:0;if(h.inv>0&&Math.floor(h.inv*20)%2)cx.globalAlpha=.4;spr("hero_"+fr,h.x,h.y+1-hb,h.face,{out:1,sq:mv?(hb-1)*.04:0,rot:mv?Math.sin(h.anim*Math.PI)*.05:0});cx.globalAlpha=1;
  cx.fillStyle="#200";cx.fillRect(Math.round(h.x)-10,Math.round(h.y)+3,20,3);cx.fillStyle=h.hp/h.max>.35?"#4e4":"#e44";cx.fillRect(Math.round(h.x)-9,Math.round(h.y)+4,Math.round(18*Math.max(0,h.hp/h.max)),1);}]);
 ents.sort((a,b)=>a[0]-b[0]).forEach(e=>e[1]());
 for(const q of S.proj){cx.fillStyle=q.col;cx.fillRect(Math.round(q.x)-1,Math.round(q.y)-1,3,3);cx.globalAlpha=.35;cx.fillRect(Math.round(q.x-q.vx*.02),Math.round(q.y-q.vy*.02),2,2);cx.globalAlpha=1;}
 for(const s of S.slashes){cx.globalAlpha=s.life/(s.big?.2:.15);cx.strokeStyle=s.col;cx.lineWidth=s.big?3:2;cx.beginPath();cx.arc(s.x,s.y,s.r*(1.3-s.life*2),s.a-1.1,s.a+1.1);cx.stroke();}cx.globalAlpha=1;
 for(const r of S.rings){cx.globalAlpha=Math.max(0,r.life/r.max);cx.strokeStyle=r.col;cx.lineWidth=1.5;cx.beginPath();if(r.line){cx.moveTo(r.line[0],r.line[1]);cx.lineTo(r.x,r.y);}else cx.arc(r.x,r.y,r.r,0,6.283);cx.stroke();}cx.globalAlpha=1;
 for(const q of S.parts){cx.globalAlpha=Math.min(1,q.life*4);cx.fillStyle=q.col;cx.fillRect(Math.round(q.x),Math.round(q.y),1,1);}cx.globalAlpha=1;
 cx.textAlign="center";for(const t of S.texts){cx.globalAlpha=Math.min(1,t.life*3);cx.font=`bold ${t.small?6:8}px monospace`;cx.fillStyle="#000";cx.fillText(t.t,Math.round(t.x)+.5,Math.round(t.y)+.5);cx.fillStyle=t.col;cx.fillText(t.t,Math.round(t.x),Math.round(t.y));}cx.globalAlpha=1;
 cx.setTransform(DPR,0,0,DPR,0,0);
 if(S.hurt>0){const g=cx.createRadialGradient(W/2,H/2,Math.min(W,H)*.35,W/2,H/2,Math.max(W,H)*.7);g.addColorStop(0,"rgba(255,0,0,0)");g.addColorStop(1,`rgba(255,0,0,${S.hurt})`);cx.fillStyle=g;cx.fillRect(0,0,W,H);}
 if(S.flash>0){cx.fillStyle=`rgba(255,255,255,${S.flash})`;cx.fillRect(0,0,W,H);}
 if(S.banner){const b=S.banner;cx.globalAlpha=Math.min(1,b.t*2);cx.textAlign="center";cx.font="bold 22px sans-serif";cx.fillStyle="#000";cx.fillText(b.txt,W/2+2,H*.22+2);cx.fillStyle=b.col;cx.fillText(b.txt,W/2,H*.22);cx.font="12px sans-serif";cx.fillStyle="#ddd";cx.fillText(b.sub,W/2,H*.22+20);cx.globalAlpha=1;}
 if(joy.on&&state==="play"){cx.strokeStyle="rgba(255,255,255,.3)";cx.lineWidth=2;cx.beginPath();cx.arc(joy.ox,joy.oy,40,0,6.283);cx.stroke();const dx=joy.x-joy.ox,dy=joy.y-joy.oy,m=Math.hypot(dx,dy),k=m>40?40/m:1;cx.fillStyle="rgba(255,255,255,.3)";cx.beginPath();cx.arc(joy.ox+dx*k,joy.oy+dy*k,15,0,6.283);cx.fill();}}
function hud(){const h=S.hero,p=S.pet,f=formDef(p);$("hpfill").style.width=Math.max(0,h.hp/h.max*100)+"%";$("hptext").textContent=`${Math.ceil(Math.max(0,h.hp))}/${h.max}`;
 $("timer").textContent=`第${S.wave}/${WAVES.length}波 ${Math.ceil(WAVES[S.wave-1]-S.wt)}s`;$("kills").textContent=`击杀 ${S.kills}`;
 $("teamBtn").textContent=`${f.name} ${maxed(p)?"MAX":"Lv"+p.lvl}`;$("goal").textContent=goalText(p);}
// ---------- UI ----------
function openPanel(){if(state!=="play")return;state="panel";$("panel").classList.remove("hidden");const p=S.pet,f=formDef(p);
 const xpNeed=6+p.lvl*4;$("plist").innerHTML=`<div class="comp"><img src="assets/${MAN[f.spr].file}"><div><div class="n">${f.name} <small>T${p.tier} · ${p.el} · ${maxed(p)?"部件已满级":"Lv"+p.lvl+" ("+Math.floor(p.xp)+"/"+xpNeed+")"} · 击杀${p.kills}</small></div>
 <div class="p">${Object.entries(p.parts).map(([s,q])=>`${SLOT_NAMES[s]}：<span class="${q.mut?"mut":""}">${q.k}</span> Lv${q.lv}/5`).join("<br>")}</div><div class="h">${goalText(p)}</div>
 <div class="h">可进化：${nextForms(p).map(f=>f.name+"（"+f.req.map(fmtReq).join("+")+"）").join("；")||"—"}</div></div></div>`;}
function closePanel(){$("panel").classList.add("hidden");if(state==="panel")state="play";last=performance.now();}
$("teamBtn").onclick=openPanel;$("closeP").onclick=closePanel;$("panel").addEventListener("click",e=>{if(e.target.id==="panel")closePanel();});
function end(win){state="end";$("hud").classList.add("hidden");$("end").classList.remove("hidden");$("endT").textContent=win?"胜利！":"倒下了…";
 $("endS").textContent=`到达第 ${S.wave} 波 · 击杀 ${S.kills} · 伙伴：${formDef(S.pet).name}`;}
$("again").onclick=()=>{$("end").classList.add("hidden");$("title").classList.remove("hidden");state="title";S=null;};
function buildTitle(){$("lines").innerHTML=Object.entries(LINES).map(([k,L])=>`<button class="line" data-l="${k}"><img src="assets/${MAN[L.t1.spr].file}">${L.name}<small>${L.desc}</small><small>${L.t2.map(f=>f.name).join(" ")}</small></button>`).join("");
 document.querySelectorAll(".line").forEach(b=>b.onclick=()=>{audio();start(b.dataset.l);});}
function start(l){newGame(l);camX=S.hero.x;camY=S.hero.y;$("title").classList.add("hidden");$("hud").classList.remove("hidden");last=performance.now();}
let last=performance.now();
function frame(now){let dt=Math.min(.05,(now-last)/1000);last=now;
 if(S&&state==="play"){if(S.hitstop>0){S.hitstop-=dt;dt=0;}if(S.slowmo>0){S.slowmo-=dt;dt*=.25;}if(dt>0)update(dt);if(S&&state==="play")hud();}
 else if(S&&state!=="title")fxUpdate(0);render();requestAnimationFrame(frame);}
loadAll().then(()=>{buildTitle();requestAnimationFrame(frame);});
window.__bt={spawnAll:()=>{const h=S.hero;Object.keys(ENEMIES).forEach((t,i)=>spawn({type:t,x:h.x-90+(i%4)*60,y:h.y-70+Math.floor(i/4)*140}));},get S(){return S},get state(){return state},start,openPanel,closePanel,chooseCard,endWave,
 setParts:(m)=>{for(const[s,v]of Object.entries(m))Object.assign(S.pet.parts[s],v);},
 sim:(sec,bot)=>{const log=[];for(let i=0;i<sec*30;i++){if(state==="cards"){const ev=S._cards.findIndex(c=>c.cls==="evo");chooseCard(ev>=0?ev:Math.floor(Math.random()*S._cards.length));log.push("w"+S.wave+" "+formDef(S.pet).name);}
  if(state!=="play")break;if(bot){const h=S.hero;let ax=(AW/2-h.x)*1e-5,ay=(AH/2-h.y)*1e-5;for(const e of S.enemies){const dx=h.x-e.x,dy=h.y-e.y,d2=dx*dx+dy*dy+1;if(d2<6000){ax+=dx/d2;ay+=dy/d2;}}const m=Math.hypot(ax,ay);window.__dir=m>0?{x:ax/m,y:ay/m}:null;}
  S.hitstop=0;S.slowmo=0;update(1/30);}window.__dir=null;return{state,wave:S.wave,hp:Math.round(S.hero.hp),kills:S.kills,pet:formDef(S.pet).name,lvl:S.pet.lvl,log};}};
