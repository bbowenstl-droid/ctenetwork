import json,pathlib,html,re,csv,io
P=pathlib.Path(__file__).parent; root=P.parent.parent
d=json.loads((P/'analysis.json').read_text());editorial=json.loads((P/'editorial.json').read_text())
d['editorial']=editorial
def inline(s):
 s=html.escape(s);s=re.sub(r'\*\*(.+?)\*\*',r'<strong>\1</strong>',s);s=re.sub(r'\*(.+?)\*',r'<em>\1</em>',s);return s
def markdown(s):
 blocks=s.strip().split('\n\n');out=[]
 for b in blocks:
  if b.startswith('|'):
   rows=[r for r in b.splitlines() if not re.match(r'^\|[\s:|\-]+$',r)];h='<div class="scroll"><table>'
   for i,r in enumerate(rows):h+='<tr>'+''.join(f'<{"th" if i==0 else "td"}>{inline(c.strip())}</{"th" if i==0 else "td"}>' for c in r.strip('|').split('|'))+'</tr>'
   out.append(h+'</table></div>')
  elif b.startswith('#'):
   for line in b.splitlines():
    m=re.match(r'^(#+) (.*)',line)
    if m:out.append(f'<h{len(m[1])}>{inline(m[2])}</h{len(m[1])}>')
  elif b.startswith('>'):out.append('<blockquote>'+inline(' '.join(line.lstrip('> ') for line in b.splitlines()))+'</blockquote>')
  else:out.append('<p>'+inline(b.replace('\n',' '))+'</p>')
 return '\n'.join(out)
rec=lambda a:'–'.join(map(str,a[:2]))+(('–'+str(a[2])) if a[2] else '')
md=(P/'feature.md').read_text()
profiles=['# CTE: Franchise Files','*Snapshot November 13, 2026. Scores through Week 9. Startup retention is current overlap, not uninterrupted custody.*']
for p in d['profiles']:
 rid=str(p['roster']);a=d['stats']['2025'][rid];b=d['stats']['2026'][rid]
 profiles += ['## '+p['owner'].title(),editorial['profiles'][p['owner']],f"| Measure | 2025 franchise | 2026 franchise |\n|---|---|---|\n| Combined W–L | {rec(a['record'])} | {rec(b['record'])} |\n| Head-to-head | {rec(a['h2h'])} | {rec(b['h2h'])} |\n| Median | {rec(a['median'])} | {rec(b['median'])} |\n| All-play | {rec(a['allplay'])} | {rec(b['allplay'])} |\n| Points per game | {a['pf']/14:.2f} | {b['pf']/9:.2f} |",f"**Startup selections on current roster ({len(p['retained'])}/21):** "+', '.join(p['retained']), '**Completed trades:** '+(', '.join(p['trades']) or 'None'), '**Current roster:** '+', '.join(a['name'] for a in p['current']), '**2026 draft selections:** '+', '.join(f"{a['round']}.{a['selectionInRound']:02} {a['playerName']}" for a in p['rookies']), '**2027–2029 picks:** '+', '.join(f"{a['year']} round {a['round']} ({d['profiles'][a['original']-1]['owner'].title()} franchise)" for a in p['futurePicks'])]
(P/'franchise-profiles.md').write_text('\n\n'.join(profiles))
ledger=['# CTE: Complete Trade Ledger','*21 completed trades. Dates are completion dates in Central time. See methodology for coverage and pending activity.*']
csvbuf=io.StringIO();writer=csv.writer(csvbuf);writer.writerow(['trade','completion_date_CT','sender_franchise','receiver_franchise','asset','provider_transaction_id'])
for i,t in enumerate(d['trades']):
 ledger+=['## '+t['id']+' · '+t['date'],'| Sender | Receiver | Asset |\n|---|---|---|\n'+'\n'.join('| '+d['profiles'][a['from']-1]['owner'].title()+' | '+d['profiles'][a['to']-1]['owner'].title()+' | '+a['label']+' |' for a in t['transfers']),editorial['tradeNotes'][i]]
 for a in t['transfers']:writer.writerow([t['id'],t['date'],d['profiles'][a['from']-1]['owner'],d['profiles'][a['to']-1]['owner'],a['label'],t['providerId']])
(P/'trade-ledger.md').write_text('\n\n'.join(ledger));(P/'trade-ledger.csv').write_text(csvbuf.getvalue())
template=(P/'template.html').read_text();feature=markdown(md)
out=template.replace('<!--FEATURE-->',feature).replace('/*DATA*/',json.dumps(d,separators=(',',':')).replace('</','<\\/')).replace('/*CSS*/',(P/'style.css').read_text()).replace('/*APP*/',(P/'app.js').read_text())
(root/'state-of-union.html').write_text(out)
(P/'complete-edition.md').write_text(md+'\n\n---\n\n'+'\n\n'.join(profiles)+'\n\n---\n\n'+'\n\n'.join(ledger))
print('Built',len(out),'bytes;',len((P/'complete-edition.md').read_text().split()),'words in complete edition')
