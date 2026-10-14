const p=require('puppeteer-core');const sleep=ms=>new Promise(r=>setTimeout(r,ms));const O='/workspace/beast-tamer/screenshots/v3_';
(async()=>{const b=await p.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox']});const errs=[];
async function run(tag,vp,line){const pg=await b.newPage();await pg.setViewport(vp);
 pg.on('console',m=>{if(m.type()==='error')errs.push(tag+m.text())});pg.on('pageerror',e=>errs.push(tag+e.message));
 await pg.goto('http://127.0.0.1:18731/?v3',{waitUntil:'networkidle0'});await pg.click(`.line[data-l="${line}"]`);
 await pg.evaluate(()=>{__bt.S.hero.hp=__bt.S.hero.max=999;});
 await pg.keyboard.down('d');await sleep(1200);
 if(tag==='mobile'){for(let i=0;i<6;i++){await pg.screenshot({path:`/tmp/walk${i}.png`});await sleep(45);}}
 await sleep(4000);await pg.keyboard.up('d');await pg.screenshot({path:O+tag+'_early.png'});
 await pg.evaluate(()=>__bt.spawnAll());await sleep(250);await pg.screenshot({path:O+tag+'_enemies.png'});
 await pg.evaluate(()=>{__bt.S.wave=5;});await pg.keyboard.down('w');await sleep(9000);await pg.keyboard.up('w');await pg.screenshot({path:O+tag+'_mid.png'});
 await pg.evaluate(()=>__bt.endWave());await sleep(300);await pg.screenshot({path:O+tag+'_cards.png'});
 const hp=await pg.evaluate(()=>({x:__bt.S.hero.x,y:__bt.S.hero.y}));console.log(tag,hp);await pg.close();}
await run('mobile',{width:390,height:844,deviceScaleFactor:3,isMobile:true,hasTouch:true},'wolf');
await run('desktop',{width:1280,height:800},'eagle');
console.log('ERR',errs);await b.close();})();
