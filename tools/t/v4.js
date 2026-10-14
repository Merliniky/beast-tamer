const p=require('puppeteer-core');const sleep=ms=>new Promise(r=>setTimeout(r,ms));const O='/workspace/beast-tamer/screenshots/v4_';
(async()=>{const b=await p.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox']});const errs=[];
async function run(tag,vp,line){const pg=await b.newPage();await pg.setViewport(vp);
 pg.on('console',m=>{if(m.type()==='error')errs.push(tag+m.text())});pg.on('pageerror',e=>errs.push(tag+e.message));
 await pg.goto('http://127.0.0.1:18731/?v4',{waitUntil:'networkidle0'});await pg.click(`.line[data-l="${line}"]`);
 if(vp.hasTouch){await pg.touchscreen.touchStart(200,600);await pg.touchscreen.touchMove(240,620);await sleep(2500);await pg.screenshot({path:O+tag+'_joystick.png'});await pg.touchscreen.touchEnd();}
 else{await pg.keyboard.down('d');await sleep(2500);await pg.keyboard.up('d');}
 await sleep(4000);await pg.screenshot({path:O+tag+'_early.png'});
 await pg.evaluate(()=>{__bt.S.hero.hp=__bt.S.hero.max=200;__bt.S.hero.inv=0;const h=__bt.S.hero;__bt.spawnOne('skeleton',h.x+6,h.y);});
 await sleep(70);await pg.screenshot({path:O+tag+'_hurt.png'});
 await pg.evaluate(()=>{__bt.S.wave=5;__bt.S.hero.hp=__bt.S.hero.max=999;});await pg.keyboard.down('w');await sleep(4000);await pg.keyboard.up('w');await pg.keyboard.down('a');await sleep(5000);await pg.keyboard.up('a');
 await pg.screenshot({path:O+tag+'_mid.png'});
 await pg.evaluate(()=>__bt.endWave());await sleep(300);await pg.screenshot({path:O+tag+'_cards.png'});await pg.close();}
await run('mobile',{width:390,height:844,deviceScaleFactor:3,isMobile:true,hasTouch:true},'wolf');
await run('desktop',{width:1280,height:800},'bear');
console.log('ERR',errs);await b.close();})();
