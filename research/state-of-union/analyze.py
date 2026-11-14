import json,pathlib,collections,datetime,statistics
P=pathlib.Path(__file__).parent; R=P/'raw'
read=lambda name:json.loads((R/(name+'.json')).read_text())
G=json.loads((P/'games.json').read_text()); cfg=G['config']; games=G['games']
players=read('players') if (R/'players.json').exists() else read('players-used'); names={k:v.get('full_name') or ((v.get('first_name') or '')+' '+(v.get('last_name') or '')).strip() or k for k,v in players.items()}
owner=lambda rid,y=2026,w=1: ('jeremy' if y==2025 and int(rid)==7 and w<=3 else cfg['league']['seasons'][str(y)]['rosterOwnerMap'][str(rid)])
pn=lambda k:names.get(str(k),str(k))
pickkey=lambda p:f"pick:{p['season']}:{p['round']}:{p['roster_id']}"
assetlabel=lambda k: pn(k[7:]) if k.startswith('player:') else f"{k.split(':')[1]} round {k.split(':')[2]} · {owner(k.split(':')[3],int(k.split(':')[1]) if int(k.split(':')[1])<2027 else 2026).title()} franchise"
tx=[]; audit=[]
for y,last in [(2025,18),(2026,10)]:
 for w in range(1,last+1):
  rows=read(f'sleeper-transactions-{y}-{w}')
  ft=read(f'flaim-trades-{y}-{w}')['data']
  rawtr={t['transaction_id'] for t in rows if t['type']=='trade'}; flat={t['transaction_id'] for t in ft['transactions']}
  assert rawtr==flat,(y,w,rawtr,flat)
  audit.append({'season':y,'week':w,'transactions':len(rows),'trades':len(rawtr),'flaimMatches':True})
  for t in rows:t.update(season=y,week=w);tx.append(t)
assert len({t['transaction_id'] for t in tx})==len(tx)
tx.sort(key=lambda t:(t['status_updated'] or t['created'],t['transaction_id']))
trades=[];events=[]
for t in tx:
 if t['status']!='complete':continue
 ts=t['status_updated'] or t['created'];date=datetime.datetime.fromtimestamp(ts/1000,datetime.timezone.utc).astimezone(__import__('zoneinfo').ZoneInfo('America/Chicago')).strftime('%Y-%m-%d')
 tid=t['transaction_id'];ref=None
 if t['type']=='trade':
  ref='T'+str(len(trades)+1).zfill(2)
  transfers=[{'asset':'player:'+p,'from':t['drops'][p],'to':to} for p,to in (t['adds'] or {}).items()]
  transfers += [{'asset':pickkey(p),'from':p['previous_owner_id'],'to':p['owner_id']} for p in t['draft_picks']]
  for a in transfers:a['label']=assetlabel(a['asset'])
  trades.append({'id':ref,'providerId':tid,'date':date,'season':t['season'],'week':t['week'],'timestamp':ts,'teams':t['roster_ids'],'transfers':transfers})
  for a in transfers:events.append(dict(a,time=ts,date=date,type='trade',trade=ref,week=t['week']))
 else:
  for p,r in (t['drops'] or {}).items():events.append({'asset':'player:'+p,'from':r,'to':None,'time':ts,'date':date,'type':'drop','trade':None,'week':t['week']})
  for p,r in (t['adds'] or {}).items():events.append({'asset':'player:'+p,'from':None,'to':r,'time':ts,'date':date,'type':'pickup','trade':None,'week':t['week']})
drafts={y:read(f'flaim-draft-{y}')['data'] for y in [2025,2026]}
for y,d in drafts.items():
 for p in d['picks']:
  pk=f"pick:{y}:{p['round']}:{p['originalTeamId']}"; pid='player:'+str(p['playerId']);ts=d['draft']['startTime'];date=datetime.datetime.fromtimestamp(ts/1000,datetime.timezone.utc).astimezone(__import__('zoneinfo').ZoneInfo('America/Chicago')).strftime('%Y-%m-%d')
  events.append({'asset':pk,'convertedTo':pid,'label':p['playerName'],'from':p['selectionTeamId'],'to':p['selectionTeamId'],'type':'draft','time':ts,'date':date,'trade':None,'slot':f"{p['round']}.{p['selectionInRound']:02}"})
events.sort(key=lambda e:(e['time'],e['type']!='draft'))
# Track the most recent trade through uninterrupted custody, including pick conversion.
custody={};links=[]
for e in events:
 k=e['asset'];previous=custody.get(k)
 if e['type']=='draft':
  if previous and previous['to']==e['to']:custody[e['convertedTo']]=dict(previous,via=f"{e['slot']} {e['label']}")
  custody.pop(k,None)
 elif e['type']=='trade':
  if previous and previous['to']==e['from']:links.append({'from':previous['trade'],'to':e['trade'],'asset':assetlabel(k),'via':previous.get('via')})
  custody[k]=e
 else:custody.pop(k,None)
assets=collections.defaultdict(list)
for e in events:assets[e['asset']].append(e)
stats={};profiles=[]
for y in [2025,2026]:
 last=14 if y==2025 else 9;rows=read(f'flaim-standings-{y}')['data']['standings'];s={i:{'h2h':[0,0,0],'median':[0,0,0],'allplay':[0,0,0],'pf':0,'pa':0} for i in range(1,13)}
 for w in range(1,last+1):
  ms=read(f'sleeper-matchups-{y}-{w}');score=lambda r:r['custom_points'] if r.get('custom_points') is not None else r['points'];median=statistics.median([score(r) for r in ms])
  for r in ms:
   i=r['roster_id'];v=score(r);opp=next(x for x in ms if x['matchup_id']==r['matchup_id'] and x['roster_id']!=i);q=score(opp)
   s[i]['h2h'][0 if v>q else 1 if v<q else 2]+=1;s[i]['median'][0 if v>median else 1 if v<median else 2]+=1;s[i]['pf']+=v;s[i]['pa']+=q
   for x in ms:
    if x['roster_id']!=i:s[i]['allplay'][0 if v>score(x) else 1 if v<score(x) else 2]+=1
 for r in rows:
  a=s[r['rosterId']];assert a['h2h'][0]+a['median'][0]==r['wins'];assert a['h2h'][1]+a['median'][1]==r['losses'];assert abs(a['pf']-r['pointsFor'])<.02
  a.update(pf=round(a['pf'],2),pa=round(a['pa'],2),record=[r['wins'],r['losses'],r['ties']],finish=r['finalRank'],owner=owner(r['rosterId'],y,14))
 stats[y]=s
current={r['roster_id']:r for r in read('sleeper-rosters-2026')}
for rid in range(1,13):
 original=[p for p in drafts[2025]['picks'] if p['selectionTeamId']==rid];roster=current[rid]['players'];retained=[p['playerName'] for p in original if str(p['playerId']) in roster]
 pts=collections.Counter();starts=collections.Counter()
 for w in range(1,10):
  for m in read(f'flaim-matchups-2026-{w}')['data']['matchups']:
   for side in [m['home'],m['away']]:
    if side and side['rosterId']==rid:
     for p in side['starters']:
      if str(p.get('id','0'))=='0':continue
      n=p.get('name') or pn(p['id']);pts[n]+=p.get('points') or 0;starts[n]+=1
 future=[]
 changed={(p['season'],p['round'],p['roster_id']):p['owner_id'] for p in read('sleeper-picks-2026')}
 for y in range(2027,2030):
  for rnd in range(1,5):
   for origin in range(1,13):
    if changed.get((str(y),rnd,origin),origin)==rid:future.append({'year':y,'round':rnd,'original':origin})
 profiles.append({'roster':rid,'owner':owner(rid),'original':original,'retained':retained,'current':[{'id':p,'name':pn(p),'position':players.get(p,{}).get('position')} for p in roster], 'trades':[t['id'] for t in trades if rid in t['teams']],'rookies':[p for p in drafts[2026]['picks'] if p['selectionTeamId']==rid], 'production':[{'name':n,'points':round(v,2),'starts':starts[n]} for n,v in pts.most_common()], 'futurePicks':future})
used={p for t in tx for p in list((t['adds'] or {}))+list((t['drops'] or {}))}|{p for r in current.values() for p in r['players']}
for d in drafts.values():used.update(str(p['playerId']) for p in d['picks'])
subset={k:{'full_name':pn(k),'position':players.get(k,{}).get('position')} for k in used}
(R/'players-used.json').write_text(json.dumps(subset))
out={'cutoff':'2026-11-13','scoreCutoff':'2026 Week 9; 2025 through championship Week 17','audit':audit,'trades':trades,'links':links,'assets':dict(assets),'stats':stats,'profiles':profiles,'games':games,'ownerStats':G['owners'],'drafts':drafts,'names':{k:pn(k) for k in used},'transactionCount':len(tx),'completedTransactionCount':sum(t['status']=='complete' for t in tx)}
(P/'analysis.json').write_text(json.dumps(out,indent=2))
print('Trades',len(trades),'links',len(links),'transactions',len(tx))
for t in trades:print(t['id'],t['date'],' | '.join(f"{owner(a['from'],t['season'],t['week']).title()} → {owner(a['to'],t['season'],t['week']).title()}: {a['label']}" for a in t['transfers']))
print('LINKS',links)
print('STATS',json.dumps(stats))
print('RETAINED',[(p['owner'],len(p['retained']),p['retained']) for p in profiles])
