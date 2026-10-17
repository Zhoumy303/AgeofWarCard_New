const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGame } = require('./game-harness.cjs');

function client(player) {
    const h = loadGame({ seed: 31, search: `?room=regression&player=${player}` });
    assert.deepEqual(h.errors.map(error => error.message), []);
    h.evaluate(`
        isConnected=true; socket.readyState=1; gameState.aiPlayers=[false,false];
        function unit(type, player, row, col) {
            const def=unitDefinitions[type];
            const u={...def,type,player,row,col,id:Math.random(),maxHealth:def.health,
                hasMoved:false,hasAttacked:false,hasUsedSkill:false,bonusDamage:0,shield:0};
            gameState.units.push(u); gameState.board[row][col]=u; return u;
        }
    `);
    return h;
}

for (const player of [1, 2]) test(`player ${player} can move and attack after a JSON state round trip`, async () => {
    const h = client(player);
    const start = player === 1 ? 1 : 5, move = player === 1 ? 2 : 4;
    h.evaluate(`
        gameState.currentPlayer=${player}; gameState.phase='battle';
        gameState.selectedUnit=unit('shadowAssassin',${player},1,${start});
        unit('minotaur',${3-player},1,3);
        var serialized=JSON.parse(JSON.stringify(gameState)); serialized.aiPlayers=[true,true];
        handleServerMessage({type:'game_update',state:serialized});
    `);
    assert.equal(h.evaluate(`gameState.board[1][${start}]===gameState.units[0] && gameState.selectedUnit===gameState.units[0]`), true);
    assert.equal(h.evaluate('gameState.aiPlayers.every(ai=>!ai)'), true);
    await h.evaluate(`handleCellClick(1,${move})`);
    assert.equal(h.evaluate(`gameState.board[1][${move}]===gameState.units[0]`), true);
    await h.evaluate(`handleCellClick(1,${move})`);
    const pending = h.evaluate('handleCellClick(1,3)');
    for (let i=0;i<5;i++) await h.tick();
    await pending;
    assert.equal(h.evaluate('gameState.units[1].health'), 5);
    assert.deepEqual(h.errors.map(error=>error.message), []);
});

test('connected player 2 cannot operate player 1, and can act when the turn reaches player 2', async () => {
    const h = client(2);
    h.evaluate(`
        gameState.currentPlayer=1; gameState.phase='placement';
        gameState.players.forEach(p=>{p.hand=[{key:'necromancy',cost:2}];p.deck=['wolf'];p.actionPoints=6;});
        var own=unit('wolf',1,1,1); var enemy=unit('wolf',2,1,3);
    `);
    const before = h.evaluate('JSON.stringify(gameState)');
    h.evaluate(`handleCardClick(1,'necromancy'); handleDrawCard(); enterBattlePhase(); endTurn();`);
    await h.evaluate('handleCellClick(1,1)');
    assert.equal(h.evaluate('JSON.stringify(gameState)'), before);
    h.evaluate(`
        gameState.selectedSpell='necromancy';
        document.getElementById('use-spell-btn').disabled=false;
        document.getElementById('use-spell-btn').click();
    `);
    assert.equal(h.evaluate('enemy.health'), 4);
    h.evaluate(`gameState.currentPlayer=2; handleDrawCard();`);
    assert.equal(h.evaluate('gameState.players[1].actionPoints'), 5);
    assert.equal(h.evaluate('gameState.players[1].hand.length'), 2);
    h.evaluate('endTurn();');
    assert.equal(h.evaluate('gameState.currentPlayer'), 1);
    h.evaluate('isConnected=false;');
    assert.equal(h.evaluate('canLocalPlayerAct()'), true);
});

test('receiving a room state cancels queued local AI work', async () => {
    const h = client(1);
    h.evaluate(`
        gameState.aiPlayers=[true,false]; aiTurn();
        handleServerMessage({type:'game_state',state:JSON.parse(JSON.stringify(gameState))});
    `);
    const stopped = h.evaluate('JSON.stringify(gameState)');
    for (let i=0;i<20;i++) await h.tick();
    assert.equal(h.evaluate('JSON.stringify(gameState)'), stopped);
    assert.equal(h.evaluate('gameState.aiPlayers.every(ai=>!ai)'), true);
});
