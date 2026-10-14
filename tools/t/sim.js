const p=require('puppeteer-core');
(async()=>{const b=await p.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox']});const errs=[];
for(const line of ['wolf','bear','eagle'])for(let k=0;k<3;k++){const pg=await b.newPage();pg.on('pageerror',e=>errs.push(e.message));await pg.goto('http://127.0.0.1:18731/',{waitUntil:'networkidle0'});
 await pg.evaluate(l=>__bt.start(l),line);const r=await pg.evaluate(()=>__bt.sim(500,true));console.log(line,JSON.stringify(r));await pg.close();}
console.log(errs);await b.close();})();
