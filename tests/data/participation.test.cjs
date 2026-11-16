const assert=require('node:assert/strict'),{leaderboard}=require('../../js/cte-participation-engine.js');
const rounds={w1:{matchups:{a:{a:'brendan',b:'jacob'},b:{a:'mike',b:'dan'},c:{a:'troy',b:'brett'}}}};
const result=leaderboard(rounds,{w1:{a:'brendan',b:'tie'}},{w1:{brendan:{a:'brendan',b:'dan',c:'troy',fake:'bad'},jacob:{a:'jacob'}}});
assert.deepEqual(result,[{owner:'brendan',correct:1,wrong:0,push:1,pending:1},{owner:'jacob',correct:0,wrong:1,push:0,pending:0}]);console.log('PASS pick’em grading: settled winners, pushes, pending results, invalid picks and ranking');
