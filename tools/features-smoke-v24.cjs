const { chromium } = require('playwright');

(async()=>{
  const browser=await chromium.launch({headless:true});
  const failures=[];
  const checks=[
    ['index.html','.home-feature-links','Game Day'],
    ['game-day.html','#scoreboard .game-day-card','Week'],
    ['changes.html','#changeFeed .change-item','What changed?'],
    ['news.html','#newsFilters .filter-chip','The league has receipts.'],
    ['rivalries.html','.rivalry-link','Some games count more.'],
    ['rivalry.html?id=father','.rivalry-timeline','Father Knows Best Bowl'],
    ['records.html','#recordCards .record-box','CTE Record Book.']
  ];
  for(const viewport of [{name:'iphone',width:390,height:844,isMobile:true},{name:'desktop',width:1440,height:900,isMobile:false}]){
    const context=await browser.newContext({viewport:{width:viewport.width,height:viewport.height},isMobile:viewport.isMobile});
    for(const [target,selector,text] of checks){
      const page=await context.newPage();
      const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))errors.push(m.text())});
      try{
        const response=await page.goto('http://127.0.0.1:8765/'+target,{waitUntil:'domcontentloaded',timeout:30000});
        if(!response||response.status()>=400)throw Error('HTTP '+response?.status());
        await page.waitForSelector(selector,{timeout:45000});
        await page.getByText(text,{exact:false}).first().waitFor({state:'visible',timeout:10000});
        const state=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+2,nav:!!document.querySelector('a[href="game-day.html"]'),bottom:innerWidth>820||!!document.querySelector('.app-bottom-nav')}));
        if(state.overflow||!state.nav||!state.bottom)throw Error(JSON.stringify(state));
        if(errors.length)throw Error(errors.join(' | '));
        console.log('PASS',viewport.name,target);
      }catch(err){failures.push(`${viewport.name} ${target}: ${err.message}`);console.error('FAIL',viewport.name,target,err.message)}finally{await page.close()}
    }
    await context.close();
  }
  await browser.close();
  if(failures.length){console.error('\n'+failures.join('\n'));process.exit(1)}
})();
