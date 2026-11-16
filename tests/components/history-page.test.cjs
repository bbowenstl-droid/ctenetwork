const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../../js/cte-history-page.js'), 'utf8');
const tick = () => new Promise(resolve => setImmediate(resolve));
function deferred() { let resolve, reject; const promise = new Promise((a,b) => {resolve=a;reject=b;});return {promise,resolve,reject}; }
function harness(requests) {
  const nodes = new Map();
  const node = id => {
    if (!nodes.has(id)) nodes.set(id, {value:'',hidden:false,textContent:'',innerHTML:'',querySelectorAll:()=>[],addEventListener(){}});
    return nodes.get(id);
  };
  node('scope').value='regular';
  const listeners = {};
  const location = {hash:'#trades',search:''};
  const config = {owners:{},league:{currentSeason:2026,seasons:{2026:{rosterOwnerMap:{}}}}};
  const window = {addEventListener:(name,fn)=>listeners[name]=fn};
  let calls=0;
  const context = {document:{getElementById:node,querySelectorAll:()=>[]},window,location,
    URLSearchParams,CTE_UI:{esc:String},CTE_LEAGUE_DATA:config,CTE_Sleeper:{},
    CTE2History:{games:()=>[],records:()=>({}),loadAssets:()=>requests[calls++].promise},
    CTE_StatsEngine:{loadAllSeasons:async()=>[{season:2026,completedWeek:9}]},
    fetch:async()=>({ok:true,json:async()=>({})})};
  vm.runInNewContext(source,context);
  return {node,change(hash){location.hash=hash;listeners.hashchange();},get calls(){return calls;}};
}
test('a failed trade request cannot replace another explorer’s status',async()=>{
  const request=deferred(),page=harness([request]);await tick();
  assert.equal(page.calls,1);
  page.change('#records');
  const status=page.node('labStatus').textContent;
  request.reject(new Error('offline'));await tick();
  assert.equal(page.node('labStatus').textContent,status);
  assert.equal(page.node('labRetry').hidden,true);
  assert.match(page.node('labOutput').innerHTML,/The record book/);
});
test('trade failure stops loading and retry recovers without a stale error button',async()=>{
  const first=deferred(),second=deferred(),page=harness([first,second]);await tick();
  first.reject(new Error('offline'));await tick();
  assert.match(page.node('labStatus').textContent,/offline/);
  assert.equal(page.node('labRetry').hidden,false);
  assert.match(page.node('labOutput').innerHTML,/unavailable/);
  page.node('labRetry').onclick();await tick();assert.equal(page.calls,2);
  second.resolve({coverage:'All weeks',retrievedAt:'2026-11-15T00:00:00Z',trades:[],issues:[]});await tick();
  assert.equal(page.node('labRetry').hidden,true);
  assert.match(page.node('labStatus').textContent,/0 completed trades/);
  assert.match(page.node('labOutput').innerHTML,/0 matching completed trades/);
});
