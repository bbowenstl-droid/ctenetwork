const fs=require('node:fs');
const {initializeTestEnvironment,assertFails,assertSucceeds}=require('@firebase/rules-unit-testing');
const {ref,set,get}=require('firebase/database');
(async()=>{
 const env=await initializeTestEnvironment({projectId:'demo-cte-network',database:{host:'127.0.0.1',port:9000,rules:fs.readFileSync(process.env.CTE_RULES||'../../security/participation.rules.json','utf8')}});
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
 await assertFails(set(ref(admin,'v2/rounds/fractional-season'),{season:2026.5,week:10,lockAt:future,matchups}));
 await assertFails(set(ref(admin,'v2/rounds/fractional-week'),{season:2026,week:10.5,lockAt:future,matchups}));
 // Once published, even commissioners cannot change matchup choices, lock time,
 // erase an open round or change a poll after votes could be cast.
 await assertFails(set(ref(admin,'v2/rounds/open/matchups/1/a'),'mike'));
 await assertFails(set(ref(admin,'v2/rounds/open'),null));
 await assertFails(set(ref(admin,'v2/polls/open/options/a'),'Changed'));
 await assertFails(set(ref(admin,'v2/polls/open'),null));
 await assertFails(set(ref(admin,'v2/polls/closed/closeAt'),future));

 await assertFails(set(ref(brendan,'v2/results/closed/1'),'brendan'));await assertSucceeds(set(ref(admin,'v2/results/closed/1'),'brendan'));await assertFails(set(ref(admin,'v2/results/open/1'),'brendan'));await assertFails(set(ref(admin,'v2/results/closed/1'),'mike'));await assertFails(set(ref(admin,'v2/results/closed/7'),'tie'));
 await assertSucceeds(set(ref(brendan,'v2/votes/open/brendan'),'a'));await assertFails(set(ref(jacob,'v2/votes/open/brendan'),'b'));await assertFails(set(ref(brendan,'v2/votes/open/brendan'),'z'));await assertFails(set(ref(brendan,'v2/votes/closed/brendan'),'a'));
 await assertSucceeds(set(ref(brendan,'v2/comments/lounge/brendan'),{text:'A receipt',updatedAt:Date.now()}));await assertFails(set(ref(jacob,'v2/comments/lounge/brendan'),{text:'Forged',updatedAt:Date.now()}));await assertFails(set(ref(brendan,'v2/comments/lounge/brendan'),{text:'x'.repeat(501),updatedAt:Date.now()}));await assertSucceeds(set(ref(admin,'v2/comments/lounge/brendan'),null));
 await assertSucceeds(set(ref(brendan,'v2/reactions/lounge/brendan'),'laugh'));await assertFails(set(ref(brendan,'v2/reactions/lounge/brendan'),'bad'));await assertFails(set(ref(brendan,'v2/claims/uid-b/commissioner'),true));
 // 2026-11-15 additions: former owners, claim type confusion, outsider/anonymous lounge and poll access.
 const jeremy=env.authenticatedContext('uid-old1',{ownerId:'jeremy'}).database(),tyler=env.authenticatedContext('uid-old2',{ownerId:'tyler'}).database();
 const stringAdmin=env.authenticatedContext('uid-s',{ownerId:'mike',commissioner:'true'}).database();
 await assertFails(set(ref(jeremy,'v2/picks/open/jeremy/1'),'brendan'));
 await assertFails(set(ref(tyler,'v2/votes/open/tyler'),'a'));
 await assertFails(set(ref(tyler,'v2/comments/lounge/tyler'),{text:'Former owner',updatedAt:Date.now()}));
 await assertFails(set(ref(jeremy,'v2/reactions/lounge/jeremy'),'fire'));
 await assertFails(set(ref(stringAdmin,'v2/rounds/string-claim'),{season:2026,week:11,lockAt:future,matchups}));
 await assertFails(set(ref(stringAdmin,'v2/results/closed/2'),'brendan'));
 await assertFails(set(ref(stringAdmin,'v2/comments/lounge/brendan'),null));
 for(const path of ['v2/polls','v2/votes','v2/results','v2/comments','v2/reactions'])await assertFails(get(ref(anon,path)));
 for(const path of ['v2/polls','v2/votes','v2/results','v2/comments','v2/reactions'])await assertFails(get(ref(outsider,path)));
 await assertFails(set(ref(outsider,'v2/votes/open/brendan'),'a'));
 await assertFails(set(ref(outsider,'v2/comments/lounge/outsider'),{text:'hi',updatedAt:Date.now()}));
 await assertFails(set(ref(anon,'v2/reactions/lounge/brendan'),'fire'));
 await assertFails(set(ref(brendan,'v2/comments/lounge/brendan'),{text:'Backdated',updatedAt:Date.now()-3600000}));
 await assertFails(set(ref(brendan,'v2/comments/bad thread!/brendan'),{text:'x',updatedAt:Date.now()}));
 await assertFails(set(ref(brendan,'v2/comments/week10/brendan'),{text:'Other thread',updatedAt:Date.now()}));await assertFails(set(ref(brendan,'v2/reactions/week10/brendan'),'fire'));await assertFails(set(ref(brendan,'v2/votes/open/brendan'),''));
 await assertFails(set(ref(jacob,'v2/comments/lounge/brendan'),null));
 await assertFails(set(ref(admin,'v2/polls/one-option'),{question:'One?',options:{a:'Only'},closeAt:future}));
 await assertFails(set(ref(admin,'v2/polls/past'),{question:'Past?',options:{a:'Yes',b:'No'},closeAt:past}));
 await assertFails(set(ref(admin,'v2/rounds/past-lock'),{season:2026,week:11,lockAt:past,matchups}));
 console.log('PASS participation rules: unauthenticated/unassigned denial, owner isolation, hidden picks, server locks, valid choices, commissioner-only results, immutable closed rounds, polls, lounge-only threads, blank-vote denial, moderation, size limits and role escalation denial; former owners, string-typed commissioner claims, outsider/anonymous lounge and poll access denied.');
 }finally{await env.cleanup();}
})().catch(e=>{console.error(e);process.exitCode=1;});
