const p=require('puppeteer-core');
(async()=>{const b=await p.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox']});
for(const line of ['wolf','bear','eagle'])for(let k=0;k<2;k++){const pg=await b.newPage();await pg.goto('http://127.0.0.1:18731/',{waitUntil:'networkidle0'});
 await pg.evaluate(l=>__bt.start(l),line);const r=await pg.evaluate(()=>__bt.sim(600,true));console.log(line,JSON.stringify(r));await pg.close();}
await b.close();})();
