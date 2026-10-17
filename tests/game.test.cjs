const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGame } = require('./game-harness.cjs');

function fixture() {
    const h = loadGame({ seed: 42 });
    h.evaluate(`
        gameState.aiPlayers = [false, false];
        gameState.players.forEach(p => { p.hand = []; p.deck = []; p.actionPoints = 6; });
        gameState.drawCost = 1; gameState.drawCount = 0;
        function testUnit(type, player, row, col, extra = {}) {
            const def = unitDefinitions[type];
            const unit = { ...def, type, player, row, col, id: Math.random(), maxHealth: def.health,
                hasAttacked: false, hasMoved: false, hasUsedSkill: false,
                lastTurnHasAttacked: false, lastTurnHasMoved: false, bonusDamage: 0, shield: 0, ...extra };
            gameState.units.push(unit); gameState.board[row][col] = unit; return unit;
        }
        function testCard(key, player = 1, extra = {}) {
            const card = { ...(unitDefinitions[key] || spellDefinitions[key]), key, ...extra };
            gameState.players[player - 1].hand.push(card); return card;
        }
    `);
    return h;
}
async function settle(h, code) {
    let done = false, value, failure;
    Promise.resolve(h.evaluate(code)).then(result => { done = true; value = result; }, error => { done = true; failure = error; });
    for (let i = 0; !done && i < 100; i++) await h.tick();
    assert.equal(done, true, 'game operation must settle');
    if (failure) throw failure;
    return value;
}

test('all page scripts and initial load execute without errors', () => {
    const h = loadGame();
    assert.deepEqual(h.errors.map(e => e.message), []);
    assert.equal(h.document.querySelectorAll('.cell').length, 35);
    assert.equal(h.evaluate('gameState.players.every(p => p.hand.length === 3)'), true);
    assert.equal(h.evaluate('gameState.drawCount'), 0);
    assert.ok(h.context.saveManager);
});

test('both sides receive two AP for their first experience turn', () => {
    const h = loadGame();
    h.evaluate('gameState.aiPlayers=[false,false];');
    assert.equal(h.evaluate('gameState.players[0].actionPoints'), 2);
    h.evaluate('endTurn()');
    assert.equal(h.evaluate('gameState.currentPlayer'), 2);
    assert.equal(h.evaluate('gameState.players[1].actionPoints'), 2);
});

test('empty board click and unset swap mode are safe', async () => {
    const h = fixture();
    h.evaluate(`gameState.phase = 'battle';`);
    await settle(h, 'handleBattlePhaseClick(1, 1)');
    h.evaluate(`testUnit('swordsman', 1, 1, 1); updateUI();`);
    await settle(h, 'handleBattlePhaseClick(1, 1)');
});

test('paid draws cost 1, 1, then 2 AP; free starting or spell draws do not raise that price', () => {
    const h = fixture();
    h.evaluate(`gameState.players[0].deck = Array(10).fill('swordsman');`);
    h.evaluate('handleDrawCard()'); assert.equal(h.evaluate('gameState.players[0].actionPoints'), 5);
    h.evaluate('handleDrawCard()'); assert.equal(h.evaluate('gameState.players[0].actionPoints'), 4);
    h.evaluate('handleDrawCard()'); assert.equal(h.evaluate('gameState.players[0].actionPoints'), 2);
    assert.equal(h.evaluate('gameState.players[0].hand.length'), 3);
    h.evaluate(`gameState.drawCount = 0; gameState.drawCost = 1; testCard('drawCard'); applySpellEffect('drawCard');`);
    assert.equal(h.evaluate('gameState.drawCount'), 0);
    assert.equal(h.evaluate('gameState.drawCost'), 1);
});

test('full hands block paid draws without discarding cards or charging AP', () => {
    const h = fixture();
    h.evaluate(`gameState.aiPlayers[0] = true; for(let i=0;i<7;i++) testCard('swordsman'); gameState.players[0].deck=['wolf'];`);
    const before = h.evaluate('JSON.stringify(gameState.players[0])');
    h.evaluate('handleDrawCard()');
    assert.equal(h.evaluate('JSON.stringify(gameState.players[0])'), before);
    assert.equal(h.evaluate('gameState.drawCount'), 0);
});

test('deployment validates player, phase, base cells, card ownership and card-specific cost', () => {
    const h = fixture();
    h.evaluate(`testCard('swordsman', 1, {cost: 3});`);
    assert.equal(h.evaluate(`placeUnit(2, 'swordsman', 1, 5)`), false);
    assert.equal(h.evaluate(`placeUnit(1, 'swordsman', 2, 0)`), false);
    assert.equal(h.evaluate(`placeUnit(1, 'wolf', 1, 0)`), false);
    assert.equal(h.evaluate(`placeUnit(1, 'swordsman', 1, 0)`), true);
    assert.equal(h.evaluate('gameState.players[0].actionPoints'), 3);
    assert.equal(h.evaluate('gameState.players[0].hand.length'), 0);
    h.evaluate(`gameState.phase='battle'; testCard('wolf');`);
    assert.equal(h.evaluate(`placeUnit(1, 'wolf', 0, 0)`), false);
});

test('normal movement consumes the action; assassins can move then attack', async () => {
    const h = fixture();
    h.evaluate(`gameState.phase='battle'; var sword=testUnit('swordsman',1,1,1); var enemy=testUnit('minotaur',2,1,3);`);
    assert.equal(h.evaluate('moveUnit(sword,1,2)'), true);
    const hp = h.evaluate('enemy.health');
    assert.equal(await settle(h, 'attack(sword,1,3)'), false);
    assert.equal(h.evaluate('enemy.health'), hp);
    h.evaluate(`var assassin=testUnit('shadowAssassin',1,3,1); var victim=testUnit('minotaur',2,3,3);`);
    assert.equal(h.evaluate('moveUnit(assassin,3,2)'), true);
    assert.equal(await settle(h, 'attack(assassin,3,3)'), true);
    assert.equal(h.evaluate('victim.health'), h.evaluate("unitDefinitions.minotaur.health-2"));
});

test('attack legality matches Manhattan range and rejects own base, freeze and repeated attacks', async () => {
    const h = fixture();
    h.evaluate(`gameState.phase='battle'; var bat=testUnit('beastBat',1,1,1); var enemy=testUnit('minotaur',2,2,2);`);
    const hp = h.evaluate('bat.maxHealth');
    assert.equal(await settle(h, 'attack(bat,2,2)'), false);
    assert.equal(h.evaluate('bat.maxHealth'), hp, 'illegal attacks cannot grant bat growth');
    assert.equal(await settle(h, 'attack(bat,2,0)'), false);
    h.evaluate(`gameState.board[2][2]=null; enemy.row=1; enemy.col=2; gameState.board[1][2]=enemy; gameState.frozenUnits=[{id:bat.id,duration:2}];`);
    assert.equal(await settle(h, 'attack(bat,1,2)'), false);
    h.evaluate('gameState.frozenUnits=[];');
    assert.equal(await settle(h, 'attack(bat,1,2)'), true);
    const after = h.evaluate('bat.maxHealth');
    assert.equal(await settle(h, 'attack(bat,1,2)'), false);
    assert.equal(h.evaluate('bat.maxHealth'), after);
});

test('movement rejects occupied cells, base cells, backward moves and enemy control', () => {
    const h = fixture();
    h.evaluate(`gameState.phase='battle'; var unit=testUnit('swordsman',1,1,0); var blocker=testUnit('wolf',1,1,1);`);
    assert.equal(h.evaluate('moveUnit(unit,2,0)'), false);
    assert.equal(h.evaluate('moveUnit(unit,1,1)'), false);
    assert.equal(h.evaluate('moveUnit(blocker,1,0)'), false);
    h.evaluate('gameState.currentPlayer=2;');
    assert.equal(h.evaluate('moveUnit(unit,0,0)'), false);
});

test('spells require a held card, correct target owner and actual modified cost', () => {
    const h = fixture();
    h.evaluate(`var ally=testUnit('swordsman',1,1,1,{health:1}); var enemy=testUnit('swordsman',2,1,3,{health:1});`);
    assert.equal(h.evaluate(`applySpellEffect('healPack',ally)`), false);
    h.evaluate(`testCard('healPack',1,{cost:3});`);
    assert.equal(h.evaluate(`applySpellEffect('healPack',enemy)`), false);
    assert.equal(h.evaluate(`applySpellEffect('healPack',ally)`), true);
    assert.equal(h.evaluate('ally.health'), 4);
    assert.equal(h.evaluate('gameState.players[0].actionPoints'), 3);
    assert.equal(h.evaluate('gameState.players[0].hand.length'), 0);
});

test('AI spells spend the acting player AP and respect target ownership', () => {
    const h = fixture();
    h.evaluate(`var ally=testUnit('swordsman',1,1,1,{health:1}); var enemy=testUnit('swordsman',2,1,3,{health:1}); testCard('healPack',1,{cost:3});`);
    assert.equal(h.evaluate(`aiApplySpellEffect('healPack',enemy)`), false);
    assert.equal(h.evaluate(`aiApplySpellEffect('healPack',ally)`), true);
    assert.equal(h.evaluate('gameState.players[0].actionPoints'), 3);
    assert.equal(h.evaluate('gameState.players[1].actionPoints'), 6);
});

test('AI awaits attack damage before ending the turn and stops when toggled off', async () => {
    const h = fixture();
    h.evaluate(`gameState.phase='battle'; gameState.aiPlayers=[true,false]; testUnit('minotaur',1,1,1); testUnit('minotaur',2,1,2,{health:3}); updateUI(); aiTurn();`);
    const result = await h.drainUntil(() => h.evaluate('gameState.currentPlayer===2'), { maxSteps: 100 });
    assert.equal(result.reason, 'condition');
    assert.equal(h.evaluate('gameState.units.find(u=>u.player===2)?.health ?? 0'), 0);
    assert.equal(h.evaluate('isAnimating'), false);
    h.evaluate('toggleAI(2); toggleAI(2);');
    const turn = h.evaluate('gameState.turnCount');
    for (let i=0;i<10;i++) await h.tick();
    assert.equal(h.evaluate('gameState.turnCount'), turn);
});

for (let character=0;character<3;character++) test(`story character ${character+1} starts with valid cards and both sides draw three`, () => {
    const h = fixture();
    h.evaluate(`currentCharIdx=${character}; document.getElementById('btn-story-start').click();`);
    assert.equal(h.evaluate('PREVIEW_CARDS.length'), character === 2 ? 4 : 5);
    assert.equal(h.evaluate('PREVIEW_CARDS.every(c=>!!(unitDefinitions[c.key]||spellDefinitions[c.key]))'), true);
    h.evaluate('startBattleWithEnemy(ENEMY_POOL[0])');
    assert.equal(h.evaluate('gameState.players.every(p=>p.hand.length===3)'), true);
    assert.equal(h.evaluate('gameState.players.every(p=>p.hand.every(card=>typeof card === "object" && !!(unitDefinitions[card.key]||spellDefinitions[card.key])))'), true, 'starting cards must be usable card objects, not raw keys');
    assert.equal(h.evaluate('gameState.players[0].hand.length+gameState.players[0].deck.length'), character === 2 ? 4 : 5);
});

test('new story clears old resources and exhausted events finish cleanly', () => {
    const h = fixture();
    h.evaluate(`PREVIEW_ROLE.gold=99; PREVIEW_ROLE.level=5; gameState.players[0].items=['timeHourglass']; document.getElementById('btn-story-start').click();`);
    assert.equal(h.evaluate('PREVIEW_ROLE.gold'), 0);
    assert.equal(h.evaluate('PREVIEW_ROLE.level'), 1);
    assert.equal(h.evaluate('gameState.players[0].items.length'), 0);
    assert.doesNotThrow(() => h.evaluate(`EVENT_DECK=[]; PREVIEW_EVENTS=[{name:'宝箱',type:'宝箱'}]; selectedEventIdx=0; finishEventAndNext();`));
    assert.equal(h.evaluate('PREVIEW_EVENTS.length'), 0);
    assert.equal(h.document.getElementById('story-win-modal')?.style.display, 'flex');
});

test('save round-trip preserves Chinese, emoji, every base64 padding length and long payloads', () => {
    const h = fixture();
    for (let length=0;length<40;length++) {
        const data = { name: '纪元战争 🛡️🐉', text: '甲'.repeat(length), cards: ['暗影刺客'], number: length };
        h.context.testSaveData = data;
        assert.equal(h.evaluate('JSON.stringify(saveSystem.decrypt(saveSystem.encrypt(testSaveData)))'), JSON.stringify(data));
    }
    h.context.testSaveData = { text: '中文😀'.repeat(30000) };
    assert.equal(h.evaluate('JSON.stringify(saveSystem.decrypt(saveSystem.encrypt(testSaveData)))'), JSON.stringify(h.context.testSaveData));
});

test('story progress resumes the saved event checkpoint after reload', () => {
    const h = fixture();
    h.evaluate(`currentCharIdx=1; document.getElementById('btn-story-start').click(); PREVIEW_ROLE.gold=13; saveStoryProgress();`);
    const before = h.evaluate('JSON.stringify({role:PREVIEW_ROLE,cards:PREVIEW_CARDS,events:PREVIEW_EVENTS,deck:EVENT_DECK})');
    const reloaded = loadGame({ seed: 8, storage: h.storage });
    reloaded.document.getElementById('btn-continue').click();
    assert.equal(reloaded.evaluate('JSON.stringify({role:PREVIEW_ROLE,cards:PREVIEW_CARDS,events:PREVIEW_EVENTS,deck:EVENT_DECK})'), before);
});

test('adventure encounter levels progress from easy to hard across shuffled event slots', () => {
    const h = fixture();
    for (let i=0;i<30;i++) {
        const levels = h.evaluate(`createEventDeck().filter(card=>card.type==='战斗').map(card=>Number(card.name.match(/lv(\\d+)/i)[1]))`);
        assert.deepEqual([...levels], [...levels].sort((a,b)=>a-b));
        assert.equal(levels[0], 1);
        h.evaluate(`document.getElementById('btn-story-start').click(); handleCrossroadEvent();`);
        const remaining = h.evaluate(`[...PREVIEW_EVENTS,...EVENT_DECK].filter(card=>card.type==='战斗').map(card=>Number(card.name.match(/lv(\\d+)/i)[1]))`);
        assert.deepEqual([...remaining], [...remaining].sort((a,b)=>a-b));
    }
});

test('time hourglass consumes one item and grants exactly one extra turn', () => {
    const h = fixture();
    h.evaluate(`document.getElementById('btn-story-start').click(); startBattleWithEnemy(ENEMY_POOL[0]); gameState.aiPlayers=[false,false]; gameState.players[0].items=['timeHourglass'];`);
    h.evaluate('useTimeHourglass()');
    assert.equal(h.evaluate('gameState.players[0].items.length'), 0);
    h.evaluate('endTurn()');
    assert.equal(h.evaluate('gameState.currentPlayer'), 1);
    h.evaluate('endTurn()');
    assert.equal(h.evaluate('gameState.currentPlayer'), 2);
});

test('restarting during a pending AI action cancels the previous turn callbacks', async () => {
    const h = fixture();
    h.evaluate(`gameState.aiPlayers=[true,false]; testCard('shadowAssassin'); aiTurn(); gameState.aiPlayers=[false,false]; initGame();`);
    const before = h.evaluate('JSON.stringify(gameState)');
    for (let i=0;i<30;i++) await h.tick();
    assert.equal(h.evaluate('JSON.stringify(gameState)'), before);
});

test('simplified simulation completes and stops without changing the playable match or learned weights', async () => {
    const h = fixture();
    const before = h.evaluate('JSON.stringify(gameState)');
    h.evaluate(`document.getElementById('parallel-games').value='2'; startParallelTraining();`);
    const result = await h.drainUntil(() => h.evaluate('gamesCompleted>0'), { maxSteps: 3000 });
    assert.equal(result.reason, 'condition');
    h.evaluate('stopParallelTraining()');
    for (let i=0;i<30;i++) await h.tick();
    assert.equal(h.evaluate('parallelTrainingActive'), false);
    assert.equal(h.evaluate('JSON.stringify(gameState)'), before);
});

test('AI draw spells draw for the acting player and charge the modified card cost', () => {
    for (const player of [1, 2]) {
        const h = fixture();
        h.evaluate(`gameState.currentPlayer=${player}; gameState.players[${player-1}].deck=Array(3).fill('wolf'); testCard('drawCard',${player},{cost:3});`);
        assert.equal(h.evaluate(`aiApplySpellEffect('drawCard')`), true);
        assert.equal(h.evaluate(`gameState.players[${player-1}].hand.length`), 3);
        assert.equal(h.evaluate(`gameState.players[${player-1}].actionPoints`), 3);
        assert.equal(h.evaluate(`gameState.players[${2-player}].hand.length`), 0);
        assert.equal(h.evaluate(`gameState.players[${2-player}].actionPoints`), 6);
    }
});

test('enabling AI starts immediately, duplicate starts are ignored, disabling cancels pending work', async () => {
    const h = fixture();
    h.evaluate(`testCard('shadowAssassin'); toggleAI(1);`);
    assert.ok(h.timers.size > 0);
    const pending = h.timers.size;
    const beforeDuplicate = h.evaluate('JSON.stringify(gameState)');
    h.evaluate('aiTurn(); aiTurn();');
    assert.equal(h.timers.size, pending);
    assert.equal(h.evaluate('JSON.stringify(gameState)'), beforeDuplicate);
    h.evaluate('toggleAI(1);');
    const stopped = h.evaluate('JSON.stringify(gameState)');
    for (let i=0;i<30;i++) await h.tick();
    assert.equal(h.evaluate('JSON.stringify(gameState)'), stopped);
});

test('AI minotaur buffs an adjacent ally once without buffing itself or an enemy', () => {
    const h = fixture();
    h.evaluate(`gameState.phase='battle'; var caster=testUnit('minotaur',1,1,1); var ally=testUnit('swordsman',1,1,2); var enemy=testUnit('swordsman',2,0,1);`);
    assert.equal(h.evaluate('aiUseSkill(caster)'), true);
    assert.equal(h.evaluate('ally.bonusDamage'), 1);
    assert.equal(h.evaluate('caster.bonusDamage'), 0);
    assert.equal(h.evaluate('enemy.bonusDamage'), 0);
    assert.equal(h.evaluate('aiUseSkill(caster)'), false);
});

test('AI shadow mage swaps an ally and shadow lord spends a sacrifice for conversion', () => {
    const h = fixture();
    h.evaluate(`gameState.phase='battle'; var mage=testUnit('shadowMage',1,1,1); var ally=testUnit('swordsman',1,1,2);`);
    assert.equal(h.evaluate('aiUseSkill(mage)'), true);
    assert.equal(h.evaluate('mage.col'), 2);
    assert.equal(h.evaluate('ally.col'), 1);
    h.evaluate(`var lord=testUnit('shadowLord',1,3,3); var victim=testUnit('swordsman',2,3,4,{health:2});`);
    const before = h.evaluate('gameState.units.length');
    assert.equal(h.evaluate('aiUseSkill(lord)'), true);
    assert.equal(h.evaluate('victim.player'), 1);
    assert.equal(h.evaluate('victim.health'), h.evaluate('victim.maxHealth'));
    assert.equal(h.evaluate('gameState.units.length'), before-1);
});

test('simplified simulation records its turn limit as a draw instead of assigning a random winner', () => {
    const h = fixture();
    h.evaluate(`document.getElementById('parallel-games').value='1'; startParallelTraining(); var simulation=parallelGames[0]; simulation.state.turnCount=199; Object.values(simulation.state.players).forEach(p=>{p.hand=[];p.deck=[];}); processAITurn(simulation);`);
    assert.equal(h.evaluate('simulation.completed'), true);
    assert.equal(h.evaluate('simulation.winner'), null);
    assert.equal(h.evaluate('simulationDraws'), 1);
    h.evaluate('stopParallelTraining()');
});
