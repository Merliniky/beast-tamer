const p=require('puppeteer-core');const sleep=ms=>new Promise(r=>setTimeout(r,ms));const O='/workspace/beast-tamer/screenshots/v2_';
(async()=>{const b=await p.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox']});const errs=[];
async function run(tag,vp,line,recipe,evoId){const pg=await b.newPage();await pg.setViewport(vp);
 pg.on('console',m=>{if(m.type()==='error')errs.push(tag+m.text())});pg.on('pageerror',e=>errs.push(tag+e.message));
 await pg.goto('http://127.0.0.1:18731/',{waitUntil:'networkidle0'});await sleep(300);await pg.screenshot({path:O+tag+'_title.png'});
 await pg.click(`.line[data-l="${line}"]`);await pg.keyboard.down('d');await sleep(5000);await pg.keyboard.up('d');await pg.keyboard.down('s');await sleep(4000);await pg.keyboard.up('s');
 await pg.screenshot({path:O+tag+'_early.png'});
 await pg.evaluate(()=>{__bt.S.hero.hp=__bt.S.hero.max=999;});await pg.evaluate(()=>__bt.endWave());await sleep(300);await pg.screenshot({path:O+tag+'_cards.png'});
 await pg.evaluate(()=>__bt.chooseCard(2));
 await pg.evaluate(r=>__bt.setParts(r),recipe);await pg.evaluate(()=>__bt.endWave());await sleep(300);await pg.screenshot({path:O+tag+'_evo_choice.png'});
 await pg.evaluate(()=>{const i=__bt.S._cards.findIndex(c=>c.cls==='evo');__bt.chooseCard(i);});await sleep(350);await pg.screenshot({path:O+tag+'_evolution.png'});
 await pg.evaluate(()=>{__bt.S.hero.hp=__bt.S.hero.max=999;__bt.S.wave=4;__bt.S.elite=true;__bt.S.eliteDone=false;});
 await pg.keyboard.down('a');await sleep(4000);await pg.keyboard.up('a');await pg.keyboard.down('w');await sleep(8000);await pg.keyboard.up('w');await pg.screenshot({path:O+tag+'_mid.png'});
 await pg.evaluate(()=>__bt.openPanel());await sleep(200);await pg.screenshot({path:O+tag+'_panel.png'});
 console.log(tag,await pg.evaluate(()=>JSON.stringify({w:__bt.S.wave,en:__bt.S.enemies.length,k:__bt.S.kills})));await pg.close();}
await run('mobile',{width:390,height:844,deviceScaleFactor:3,isMobile:true,hasTouch:true},'wolf',{head:{k:'霜牙头'},limbL:{k:'冰爪'}});
await run('desktop',{width:1280,height:800},'bear',{trait:{k:'岩甲'},limbL:{lv:3},limbR:{lv:3},head:{lv:3}});
console.log('ERR',errs);await b.close();})();
