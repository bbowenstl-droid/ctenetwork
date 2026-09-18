const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
(async () => {
  const browser = await chromium.launch({headless:true});
  const pages = ['index.html','game-day.html','changes.html','news.html','article.html?id=2026-preseason-bible','scores.html','standings.html','teams.html','team.html?owner=brendan','records.html','league-history.html','transactions.html','rivalries.html','rivalry.html?id=father','schedule.html','draft-central.html'];
  const output = path.join(process.cwd(),'design-review-screenshots');
  fs.mkdirSync(output,{recursive:true});
  const failures=[];
  for(const viewport of [{name:'iphone',width:390,height:844,isMobile:true,deviceScaleFactor:1},{name:'desktop',width:1440,height:900,isMobile:false,deviceScaleFactor:1}]){
    const context=await browser.newContext({viewport:{width:viewport.width,height:viewport.height},isMobile:viewport.isMobile,deviceScaleFactor:1});
    for(const target of pages){
      const page=await context.newPage();
      const name=target.split('?')[0].replace('.html','');
      try{
        const response=await page.goto('http://127.0.0.1:8765/'+target,{waitUntil:'domcontentloaded',timeout:25000});
        await page.waitForTimeout(1200);
        if(!response || response.status()>=400) throw Error('HTTP '+response?.status());
        const result=await page.evaluate(()=>({css:!![...document.styleSheets].find(s=>s.href?.includes('design-v23.css')),js:!!document.querySelector('script[src*="design-v23.js"]'),overflow:document.documentElement.scrollWidth>innerWidth+2,body:document.body.innerText.length}));
        if(!result.css||!result.js||result.overflow||result.body<20) throw Error(JSON.stringify(result));
        if(viewport.name==='iphone'){
          const nav=page.locator('.app-bottom-nav');
          if(await nav.count() && !await nav.isVisible()) throw Error('Bottom navigation not visible');
        }
        await page.screenshot({path:path.join(output,`${viewport.name}-${name}.png`),fullPage:true});
        console.log('PASS',viewport.name,target);
      }catch(err){failures.push(`${viewport.name} ${target}: ${err.message}`);console.error('FAIL',viewport.name,target,err.message)}
      finally{await page.close()}
    }
    await context.close();
  }
  await browser.close();
  if(failures.length){console.error(failures.join('\n'));process.exitCode=1}
})();
