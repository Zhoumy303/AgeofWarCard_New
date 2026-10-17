const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGame } = require('./game-harness.cjs');

function battle() {
    const h = loadGame({ seed: 17 });
    assert.deepEqual(h.errors.map(e => e.message), []);
    h.evaluate(`
        gameState.aiPlayers = [false, false];
        gameState.phase = 'battle';
        function unit(type, player, row, col, extra = {}) {
            const def = unitDefinitions[type];
            const u = { ...def, type, player, row, col, id: Math.random(), maxHealth: def.health,
                hasAttacked: false, hasMoved: false, hasUsedSkill: false, shield: 0,
                lastTurnHasAttacked: false, lastTurnHasMoved: false, bonusDamage: 0, ...extra };
            gameState.units.push(u); gameState.board[row][col] = u; return u;
        }
    `);
    return h;
}

test('phase armour permits chip damage and 3 damage penetrates armour plus one shield', () => {
    const h = battle();
    h.evaluate(`var target = unit('phaseBeast', 2, 1, 2); applyDamageToTarget(target, 1);`);
    assert.equal(h.evaluate('target.health'), 3);
    h.evaluate('target.health=4; applyDamageToTarget(target,3);');
    assert.equal(h.evaluate('target.health'), 2);
    h.evaluate('target.health=4; target.shield=1; applyDamageToTargetSilent(target,3);');
    assert.equal(h.evaluate('target.health'), 3);
});

test('shadow swap respects range, spends an action and cannot be repeated or used frozen', () => {
    const h = battle();
    h.evaluate(`var mage=unit('shadowMage',1,1,1); var ally=unit('wolf',1,1,4);`);
    assert.equal(h.evaluate('handleSwap(mage,1,4)'), true);
    assert.equal(h.evaluate('gameState.board[1][4]===mage && gameState.board[1][1]===ally'), true);
    assert.equal(h.evaluate('handleSwap(mage,1,1)'), false);
    h.evaluate('mage.hasMoved=false; gameState.frozenUnits=[{id:mage.id,duration:2}];');
    assert.equal(h.evaluate('handleSwap(mage,1,1)'), false);
});

test('priest healing is one action and targeting can be cancelled without spending it', async () => {
    const h = battle();
    h.evaluate(`var priest=unit('lightPriest',1,1,1); var ally=unit('minotaur',1,1,2,{health:2}); gameState.selectedUnit=priest; UseSkill();`);
    await h.evaluate('handleBattlePhaseClick(1,1)');
    assert.equal(h.evaluate('gameState.healingUnit===null && !priest.hasAttacked'), true);
    h.evaluate('UseSkill();');
    await h.evaluate('handleBattlePhaseClick(1,2)');
    assert.equal(h.evaluate('ally.health'), 4);
    assert.equal(h.evaluate('priest.hasAttacked'), true);
    h.evaluate('gameState.selectedUnit=priest; UseSkill();');
    await h.evaluate('handleBattlePhaseClick(1,2)');
    assert.equal(h.evaluate('ally.health'), 4);
});

test('erosion requires a lethal hit and a sacrifice; converted units cannot act immediately', () => {
    const h = battle();
    h.evaluate(`var lord=unit('shadowLord',1,1,1); var target=unit('phaseBeast',2,1,2,{health:3}); var ally=unit('wolf',1,2,1);`);
    assert.equal(h.evaluate('performErosion(lord,target,ally)'), false, 'armour prevents a lethal hit');
    h.evaluate('target.health=2;');
    assert.equal(h.evaluate('performErosion(lord,target,lord)'), false, 'cannot sacrifice the caster');
    assert.equal(h.evaluate('performErosion(lord,target,ally)'), true);
    assert.equal(h.evaluate('target.player===1 && target.health===target.maxHealth && target.hasAttacked && target.hasMoved'), true);
    assert.equal(h.evaluate('gameState.units.includes(ally)'), false);
    assert.equal(h.evaluate(`gameState.players[0].graveyard.includes('wolf')`), true);
    assert.equal(h.evaluate('lord.hasAttacked'), true);
});

test('shield warrior movement record survives the opposing turn', () => {
    const h = battle();
    h.evaluate(`var shield=unit('shieldWarrior',1,1,1,{hasMoved:true}); endTurn();`);
    assert.equal(h.evaluate('shield.lastTurnHasMoved'), true);
    h.evaluate('applyDamageToTarget(shield,2);');
    assert.equal(h.evaluate('shield.health'), 3);
    h.evaluate('endTurn();');
    assert.equal(h.evaluate('shield.lastTurnHasMoved'), true);
    h.evaluate('endTurn(); applyDamageToTarget(shield,2);');
    assert.equal(h.evaluate('shield.health'), 3, 'one full idle turn restores defence');
});

test('ice dragon freeze expires after exactly one opposing action turn', () => {
    const h = battle();
    h.evaluate(`var target=unit('wolf',2,1,4); gameState.frozenUnits=[{id:target.id,player:2,duration:2}]; endTurn();`);
    assert.equal(h.evaluate('isCellMovable(target,1,3)'), false);
    h.evaluate('endTurn();');
    assert.equal(h.evaluate('gameState.frozenUnits.length'), 0);
});

test('a held frost nova freezes opponents for three action turns and spends the actual card cost', () => {
    const h = battle();
    h.evaluate(`
        var enemy=unit('wolf',2,1,4); var ally=unit('wolf',1,1,1);
        gameState.phase='placement'; gameState.players[0].hand=[{key:'frostNova',cost:4}];
        gameState.players[0].actionPoints=6;
    `);
    assert.equal(h.evaluate(`applySpellEffect('frostNova')`), true);
    assert.equal(h.evaluate('gameState.players[0].actionPoints'), 2);
    assert.equal(h.evaluate('gameState.frozenUnits.length===1 && gameState.frozenUnits[0].id===enemy.id'), true);
    for (let turn = 0; turn < 3; turn++) {
        h.evaluate('endTurn();');
        assert.equal(h.evaluate('isCellMovable(enemy,1,3)'), false);
        h.evaluate('endTurn();');
    }
    assert.equal(h.evaluate('gameState.frozenUnits.length'), 0);
});

test('global spell button works without any friendly unit on the board', () => {
    const h = battle();
    h.evaluate(`
        gameState.phase='placement'; gameState.players[0].hand=[{key:'necromancy',cost:2}];
        gameState.players[0].actionPoints=3; var enemy=unit('wolf',2,1,4);
        handleCardClick(1,'necromancy');
    `);
    assert.equal(h.document.getElementById('use-spell-btn').style.display, 'inline-block');
    h.document.getElementById('use-spell-btn').click();
    assert.equal(h.evaluate('enemy.health'), 3);
    assert.equal(h.evaluate('gameState.players[0].actionPoints'), 1);
    assert.equal(h.evaluate('gameState.selectedSpell'), null);
});

test('an animation from a previous match cannot clear or damage the restarted board', async () => {
    const h = battle();
    h.evaluate(`var attacker=unit('swordsman',1,1,1); unit('wolf',2,1,2,{health:3}); updateUI();`);
    const pending = h.evaluate('attack(attacker,1,2)');
    assert.equal(h.evaluate('isAnimating'), true);
    h.evaluate(`initGame(); var fresh=unit('minotaur',2,1,2);`);
    for (let i=0;i<5;i++) await h.tick();
    await pending;
    assert.equal(h.evaluate('gameState.board[1][2]===fresh && gameState.units.includes(fresh)'), true);
    assert.equal(h.evaluate('fresh.health'), 7);
    assert.equal(h.evaluate('isAnimating'), false);
});

test('victory is settled once and leaves the completed board intact', () => {
    const h = battle();
    h.evaluate(`var survivor=unit('swordsman',1,1,4); gameState.players[1].health=0;`);
    assert.equal(h.evaluate('checkGameEnd()'), true);
    const gold = h.evaluate('gameState.players[0].gold');
    assert.equal(h.evaluate('gameState.gameOver && gameState.winner===1 && gameState.units.includes(survivor)'), true);
    assert.equal(h.evaluate('checkGameEnd()'), true);
    assert.equal(h.evaluate('gameState.players[0].gold'), gold);
    const turn = h.evaluate('gameState.turnCount');
    h.evaluate('endTurn();');
    assert.equal(h.evaluate('gameState.turnCount'), turn);
});

test('revenge giant spawns once, can leave the base and can be defeated', () => {
    const h = battle();
    h.evaluate(`window.selectedBoss={type:'techFather'}; gameState.players[1].health=0;`);
    assert.equal(h.evaluate('checkGameEnd()'), false);
    h.evaluate(`var giant=gameState.units.find(u=>u.type==='techFatherRevenge'); gameState.currentPlayer=2; moveUnit(giant,2,5);`);
    assert.equal(h.evaluate('checkGameEnd()'), false);
    assert.equal(h.evaluate(`gameState.units.filter(u=>u.type==='techFatherRevenge').length`), 1);
    h.evaluate('applyDamageToTarget(giant,100);');
    assert.equal(h.evaluate('checkGameEnd()'), true);
    assert.equal(h.evaluate('gameState.gameOver && gameState.winner===1'), true);
});
