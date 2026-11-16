/* CTE Network 2.0 component renderers. No dependencies, no auto-mount, no network. */
(function(global){
  'use strict';
  const VALID_STATUS = new Set(['final','live','upcoming']);
  const safe = value => String(value == null ? '' : value).replace(/[&<>"']/g, ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const numeric = value => typeof value === 'number' && Number.isFinite(value);
  function status(value) {
    if (!VALID_STATUS.has(value)) throw new TypeError('Invalid matchup status');
    const label={final:'FINAL',live:'LIVE',upcoming:'UPCOMING'}[value];
    return '<span class="cte2-status cte2-status--'+value+'">'+label+'</span>';
  }
  function button({label,variant='secondary',href,disabled=false}={}) {
    if(!['primary','secondary','text'].includes(variant)) throw new TypeError('Invalid button variant');
    const klass='cte2-button cte2-button--'+variant;
    if(href != null) {
      const url=String(href);
      if(!/^(\/[^/]|\.?\.\/|https:\/\/)/.test(url)) throw new TypeError('Unsupported link URL');
      return '<a class="'+klass+'" href="'+safe(url)+'"'+(disabled?' aria-disabled="true" tabindex="-1"':'')+'>'+safe(label)+'</a>';
    }
    return '<button type="button" class="'+klass+'"'+(disabled?' disabled':'')+'>'+safe(label)+'</button>';
  }
  function card({title,description,variant='standard',content=''}={}) {
    if(!['standard','feature','stat','article'].includes(variant)) throw new TypeError('Invalid card variant');
    return '<section class="cte2-card cte2-card--'+variant+'"><h2 class="cte2-title">'+safe(title)+'</h2>'+(description?'<p class="cte2-dek">'+safe(description)+'</p>':'')+(content?'<div>'+safe(content)+'</div>':'')+'</section>';
  }
  function scoreboard({week,home,away,state}={}) {
    if(!VALID_STATUS.has(state)) throw new TypeError('Explicit final/live/upcoming state required');
    if(!home||!away) throw new TypeError('Two teams required');
    function team(t) {
      const score=state==='upcoming'||!numeric(t.score)?'—':t.score.toFixed(2);
      const pending=score==='—'?' cte2-scoreboard__score--pending':'';
      return '<div class="cte2-scoreboard__team"><span class="cte2-scoreboard__team-name">'+safe(t.name)+'</span><span class="cte2-scoreboard__score'+pending+'">'+score+'</span></div>';
    }
    return '<section class="cte2-card cte2-scoreboard" aria-label="Week '+safe(week)+' matchup"><div class="cte2-scoreboard__header"><span class="cte2-meta">WEEK '+safe(week)+'</span>'+status(state)+'</div>'+team(home)+team(away)+'</section>';
  }
  function table({headers=[],rows=[],numericColumns=[]}={}) {
    const nums=new Set(numericColumns);
    const cells=(items,tag)=>items.map((value,i)=>'<'+tag+(nums.has(i)?' class="cte2-number"':'')+'>'+safe(value)+'</'+tag+'>').join('');
    return '<div class="cte2-table-scroll" role="region" aria-label="Scrollable data table" tabindex="0"><table class="cte2-table"><thead><tr>'+cells(headers,'th')+'</tr></thead><tbody>'+rows.map(row=>{if(row.length!==headers.length)throw new TypeError('Row/header length mismatch');return '<tr>'+cells(row,'td')+'</tr>'}).join('')+'</tbody></table></div>';
  }
  function articleHeader({category,title,dek,byline,date}={}) {
    return '<header class="cte2-card cte2-card--article"><span class="cte2-kicker">'+safe(category)+'</span><h1 class="cte2-title">'+safe(title)+'</h1><p class="cte2-dek">'+safe(dek)+'</p><div class="cte2-meta">'+safe(byline)+(date?' · '+safe(date):'')+'</div></header>';
  }
  const api=Object.freeze({escapeHTML:safe,status,button,card,scoreboard,table,articleHeader});
  if(typeof module==='object' && module.exports)module.exports=api;
  else global.CTE2Components=api;
})(typeof window!=='undefined'?window:globalThis);
