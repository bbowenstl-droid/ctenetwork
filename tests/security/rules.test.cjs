const fs=require('node:fs');
const {initializeTestEnvironment,assertFails,assertSucceeds}=require('@firebase/rules-unit-testing');
const {ref,set,get}=require('firebase/database');
(async()=>{
 const env=await initializeTestEnvironment({projectId:'demo-cte-network',database:{host:'127.0.0.1',port:9000,rules:fs.readFileSync('../../security/participation.rules.json','utf8')}});
 try{
 const anon=env.unauthenticatedContext().database(),brendan=env.authenticatedContext('uid-b',{ownerId:'brendan'}).database(),jacob=env.authenticatedContext('uid-j',{ownerId:'jacob'}).database(),outsider=env.authenticatedContext('uid-x').database(),admin=env.authenticatedContext('uid-c',{ownerId:'brendan',commissioner:true}).database();
 const future=Date.now()+3600000,past=Date.now()-3600000,matchups=Object.fromEntries(Array.from({length:6},(_,i)=>[String(i+1),{a:'brendan',b:'jacob'}]));
 await env.withSecurityRulesDisabled(async c=>{await set(ref(c.database(),'v2'),{rounds:{open:{season:2026,week:10,lockAt:future,matchups},closed:{season:2026,week:9,lockAt:past,matchups}},polls:{open:{question:'Best move?',options:{a:'Yes',b:'No'},closeAt:future},closed:{question:'Closed',options:{a:'Yes',b:'No'},closeAt:past}}});});
 await assertFails(get(ref(anon,'v2/rounds')));await assertFails(get(ref(outsider,'v2/rounds')));
 await assertSucceeds(get(ref(brendan,'v2/rounds')));
 await assertSucceeds(set(ref(brendan,'v2/picks/open/brendan/1'),'brendan'));
 await assertFails(set(ref(jacob,'v2/picks/open/brendan/1'),'jacob'));
 await assertFails(set(ref(brendan,'v2/picks/open/brendan/1'),'mike'));
 await assertFails(set(ref(brendan,'v2/picks/open/brendan/7'),'brendan'));
 await assertFails(set(ref(brendan,'v2/picks/closed/brendan/1'),'brendan'));
 await assertFails(get(ref(jacob,'v2/picks/open/brendan')));await assertSucceeds(get(ref(brendan,'v2/picks/open/brendan')));
 await assertFails(get(ref(brendan,'v2/picks/open')));await assertSucceeds(get(ref(brendan,'v2/picks/closed')));

 // Round validation: exactly six numbered pairings, no unknown owner, no self-play.
 const withExtra={...matchups,7:{a:'brendan',b:'jacob'}};
 const missingSix=Object.fromEntries(Object.entries(matchups).filter(([id])=>id!=='6'));
 const badOwner={...matchups,1:{a:'not-an-owner',b:'jacob'}};
 const sameOwner={...matchups,1:{a:'brendan',b:'brendan'}};
 await assertFails(set(ref(admin,'v2/rounds/extra'),{season:2026,week:10,lockAt:future,matchups:withExtra}));
 await assertFails(set(ref(admin,'v2/rounds/missing'),{season:2026,week:10,lockAt:future,matchups:missingSix}));
 await assertFails(set(ref(admin,'v2/rounds/unknown'),{season:2026,week:10,lockAt:future,matchups:badOwner}));
 await assertFails(set(ref(admin,'v2/rounds/self'),{season:2026,week:10,lockAt:future,matchups:sameOwner}));
 await assertFails(set(ref(admin,'v2/rounds/extraprop'),{season:2026,week:10,lockAt:future,matchups,privateData:'nope'}));
 await assertFails(set(ref(admin,'v2/polls/bad-options'),{question:'Bad?',options:{a:'Yes',b:'No',e:'Unexpected'},closeAt:future}));
 await assertSucceeds(set(ref(admin,'v2/polls/good-options'),{question:'Valid?',options:{a:'Yes',b:'No',c:'Maybe'},closeAt:future}));
 await assertFails(set(ref(outsider,'v2/polls/new'),{question:'Bad?',options:{a:'Yes',b:'No'},closeAt:future}));
 await assertFails(set(ref(brendan,'v2/rounds/forged'),{season:2026,week:10,lockAt:future,matchups}));
 await assertSucceeds(set(ref(admin,'v2/rounds/new'),{season:2026,week:10,lockAt:future,matchups}));
 await assertFails(set(ref(admin,'v2/rounds/closed/lockAt'),future));
 // Once published, even commissioners cannot change matchup choices, lock time,
 // erase an open round or change a poll after votes could be cast.
 await assertFails(set(ref(admin,'v2/rounds/open/matchups/1/a'),'mike'));
 await assertFails(set(ref(admin,'v2/rounds/open'),null));
 await assertFails(set(ref(admin,'v2/polls/open/options/a'),'Changed'));
 await assertFails(set(ref(admin,'v2/polls/open'),null));
 await assertFails(set(ref(admin,'v2/polls/closed/closeAt'),future));

 await assertFails(set(ref(brendan,'v2/results/closed/1'),'brendan'));await assertSucceeds(set(ref(admin,'v2/results/closed/1'),'brendan'));await assertFails(set(ref(admin,'v2/results/open/1'),'brendan'));await assertFails(set(ref(admin,'v2/results/closed/1'),'mike'));
 await assertSucceeds(set(ref(brendan,'v2/votes/open/brendan'),'a'));await assertFails(set(ref(jacob,'v2/votes/open/brendan'),'b'));await assertFails(set(ref(brendan,'v2/votes/open/brendan'),'z'));await assertFails(set(ref(brendan,'v2/votes/closed/brendan'),'a'));
 await assertSucceeds(set(ref(brendan,'v2/comments/week10/brendan'),{text:'A receipt',updatedAt:Date.now()}));await assertFails(set(ref(jacob,'v2/comments/week10/brendan'),{text:'Forged',updatedAt:Date.now()}));await assertFails(set(ref(brendan,'v2/comments/week10/brendan'),{text:'x'.repeat(501),updatedAt:Date.now()}));await assertSucceeds(set(ref(admin,'v2/comments/week10/brendan'),null));
 await assertSucceeds(set(ref(brendan,'v2/reactions/week10/brendan'),'laugh'));await assertFails(set(ref(brendan,'v2/reactions/week10/brendan'),'bad'));await assertFails(set(ref(brendan,'v2/claims/uid-b/commissioner'),true));
 console.log('PASS participation rules: unauthenticated/unassigned denial, owner isolation, hidden picks, server locks, valid choices, commissioner-only results, immutable closed rounds, polls, moderation, size limits and role escalation denial.');
 }finally{await env.cleanup();}
})().catch(e=>{console.error(e);process.exitCode=1;});
