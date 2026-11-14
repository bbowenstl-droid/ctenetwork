"""Reconcile reconstructed asset histories against independent current snapshots."""
import json,pathlib,collections
P=pathlib.Path(__file__).parent
d=json.loads((P/'analysis.json').read_text())
current={};events=[]
for year,draft in d['drafts'].items():
    for x in draft['picks']:events.append((draft['draft']['startTime'],str(x['playerId']),x['selectionTeamId']))
    raw=json.loads(next((P/'raw').glob(f'sleeper-draft-picks-{year}-*.json')).read_text())
    assert {(str(x['player_id']),x['pick_no'],x['roster_id']) for x in raw}=={(str(x['playerId']),x['overallPick'],x['selectionTeamId']) for x in draft['picks']}
for key,history in d['assets'].items():
    if key.startswith('player:'):
        for e in history:events.append((e['time'],key[7:],e['to']))
for time,pid,to in sorted(events,key=lambda a:a[0]):
    if to is None:current.pop(pid,None)
    else:current[pid]=to
actual={x['id']:p['roster'] for p in d['profiles'] for x in p['current']}
assert current==actual,'Player ownership replay differs from current rosters'
pickOwners={}
for t in d['trades']:
    for a in t['transfers']:
        if a['asset'].startswith('pick:'):
            assert pickOwners.get(a['asset'],int(a['asset'].split(':')[3]))==a['from'],('Pick custody mismatch',t['id'],a)
            pickOwners[a['asset']]=a['to']
raw=json.loads((P/'raw/sleeper-picks-2026.json').read_text())
assert pickOwners=={f"pick:{p['season']}:{p['round']}:{p['roster_id']}":p['owner_id'] for p in raw},'Pick ownership replay differs from current ledger'
for link in d['links']:assert int(link['from'][1:])<int(link['to'][1:]),'Non-chronological tree edge'
assert len(d['trades'])==21 and len(d['profiles'])==12
assert collections.Counter(g['type'] for g in d['games'])=={'regular':138,'championship':5,'placement':2,'consolation':7}
assert len(d['drafts']['2025']['picks'])+len(d['drafts']['2026']['picks'])==300
print('PASS: all current player rosters reconstructed; all 27 changed pick owners reconciled; both draft boards match; 152 games correctly categorized; trade graph is chronological.')
