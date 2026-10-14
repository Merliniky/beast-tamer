const p=require('puppeteer-core');const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const OUT='/workspace/beast-tamer/screenshots/';
(async()=>{const b=await p.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
 const errs=[];
 async function run(tag,vp,line,shots){const pg=await b.newPage();await pg.setViewport(vp);
  pg.on('console',m=>{if(m.type()==='error')errs.push(tag+': '+m.text())});pg.on('pageerror',e=>errs.push(tag+': '+e.message));
  await pg.goto('http://127.0.0.1:18731/'+(shots.q||''),{waitUntil:'networkidle0'});await sleep(500);
  await pg.screenshot({path:OUT+tag+'_title.png'});
  await pg.click(`.line[data-l="${line}"]`);
  // move in circle with keys
  const keys=['d','s','a','w'];let ki=0;const mover=setInterval(async()=>{try{await pg.keyboard.up(keys[ki%4]);ki++;await pg.keyboard.down(keys[ki%4]);}catch(e){}},1500);
  await sleep(14000);await pg.screenshot({path:OUT+tag+'_early.png'});
  const st=await pg.evaluate(()=>{const S=__bt.S;return {t:S.t.toFixed(1),hp:S.hero.hp|0,kills:S.kills,n:S.comps.length,c:S.comps.map(c=>c.form+' L'+c.lvl+' '+Object.values(c.parts).map(p=>p.k+p.lv).join('/'))}});console.log(tag,'early',JSON.stringify(st));
  await pg.evaluate((l)=>{__bt.S.hero.hp=__bt.S.hero.max=9999;const id={wolf:'frost',bear:'armor',eagle:'thunder'}[l];__bt.evolve(0,id);},line);
  await sleep(450);await pg.screenshot({path:OUT+tag+'_evolution.png'});
  if(line==='wolf'){await sleep(2500);await pg.evaluate(()=>{__bt.addComp();__bt.evolve(1,'raptor');});await sleep(1500);await pg.evaluate(()=>{__bt.addComp();__bt.evolve(2,'velociraptor');});await sleep(400);await pg.screenshot({path:OUT+tag+'_t4_evolution.png'});
   await sleep(2000);await pg.evaluate(()=>{__bt.addComp();__bt.evolve(3,'flame');__bt.evolve(3,'ninetail');});}
  await sleep(2500);await pg.evaluate(()=>__bt.openPanel());await sleep(300);await pg.screenshot({path:OUT+tag+'_panel.png'});
  await pg.evaluate(()=>__bt.closePanel());await pg.evaluate(()=>__bt.skip(450));await sleep(15000);
  await pg.screenshot({path:OUT+tag+'_late.png'});
  const s2=await pg.evaluate(()=>({t:__bt.S.t|0,en:__bt.S.enemies.length,kills:__bt.S.kills,fps:0}));
  const fps=await pg.evaluate(()=>new Promise(r=>{let n=0,t0=performance.now();function f(){n++;if(performance.now()-t0<2000)requestAnimationFrame(f);else r(n/2)}requestAnimationFrame(f)}));
  console.log(tag,'late',JSON.stringify(s2),'fps',fps);clearInterval(mover);await pg.close();}
 await run('mobile',{width:390,height:844,deviceScaleFactor:3,isMobile:true,hasTouch:true},'wolf',{});
 await run('desktop',{width:1280,height:800},'bear',{});
 await run('desktop_eagle',{width:1280,height:800},'eagle',{});
 console.log('ERRORS',JSON.stringify(errs));await b.close();})();
