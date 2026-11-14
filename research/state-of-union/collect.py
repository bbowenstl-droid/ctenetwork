import json, urllib.request, concurrent.futures, pathlib, datetime
ROOT=pathlib.Path(__file__).parent/'raw'
BASE='https://api.sleeper.app/v1/'
jobs=[]
for season,lid,last in [(2025,'1255586541745475584',18),(2026,'1312109948305436672',10)]:
    for name,path in [('league',''),('users','/users'),('rosters','/rosters'),('drafts','/drafts'),('picks','/traded_picks'),('winners','/winners_bracket'),('losers','/losers_bracket')]:
        jobs.append((f'sleeper-{name}-{season}',f'league/{lid}{path}'))
    for w in range(1,last+1):
        for name in ['transactions','matchups']:
            jobs.append((f'sleeper-{name}-{season}-{w}',f'league/{lid}/{name}/{w}'))
def fetch(job):
    key,path=job
    with urllib.request.urlopen(BASE+path,timeout=40) as r: data=json.load(r)
    (ROOT/(key+'.json')).write_text(json.dumps(data))
    return key,len(data) if isinstance(data,list) else 'ok'
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
    for result in pool.map(fetch,jobs): print(*result)
extra=[]
for year in [2025,2026]:
    for d in json.loads((ROOT/f'sleeper-drafts-{year}.json').read_text()):
        extra.append((f'sleeper-draft-picks-{year}-{d["draft_id"]}',f'draft/{d["draft_id"]}/picks'))
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    for result in pool.map(fetch,extra): print(*result)
(ROOT/'retrieved.json').write_text(json.dumps({'retrieved_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'source':BASE,'requests':jobs+extra}))
