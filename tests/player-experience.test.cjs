const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGame } = require('./game-harness.cjs');

function fixture(options = {}) {
    const h = loadGame({ seed: 42, ...options });
    assert.deepEqual(h.errors.map(error => error.message), []);
    h.document.getElementById('btn-experience').click();
    h.evaluate(`
        gameState.aiPlayers = [false, true];
        gameState.players.forEach(p => { p.hand = []; p.deck = ['wolf']; p.actionPoints = 6; });
        function uiUnit(type, player, row, col, extra = {}) {
            const def = unitDefinitions[type];
            const unit = { ...def, type, player, row, col, id: Math.random(), maxHealth: def.health,
                hasAttacked: false, hasMoved: false, hasUsedSkill: false,
                lastTurnHasAttacked: false, lastTurnHasMoved: false, bonusDamage: 0, shield: 0, ...extra };
            gameState.units.push(unit); gameState.board[row][col] = unit; return unit;
        }
        function uiCard(key, player = 1, extra = {}) {
            const card = { ...(unitDefinitions[key] || spellDefinitions[key]), key, ...extra };
            gameState.players[player - 1].hand.push(card); return card;
        }
        updateUI();
    `);
    return h;
}

const byId = (h, id) => h.document.getElementById(id);
const cell = (h, row, col) => h.document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
const firstCard = (h, player = 1) => byId(h, `player${player}-hand`).querySelector('.card');
const visible = element => {
    for (let node = element; node; node = node.parentNode) {
        if (node.hidden || node.style.display === 'none') return false;
    }
    return !!element;
};
async function click(h, element) {
    assert.ok(element, 'control exists');
    element.click();
    for (let count = 0; count < 8; count++) await Promise.resolve();
    for (let count = 0; h.evaluate('isAnimating') && count < 100; count++) await h.tick();
    assert.equal(h.evaluate('isAnimating'), false, 'input animation settles');
    assert.deepEqual(h.errors.map(error => error.message), []);
}

test('quick match exposes only your hand and keeps AI tools closed', async () => {
    const h = loadGame();
    await click(h, byId(h, 'btn-experience'));
    assert.ok(visible(h.document.querySelector('.game-container')));
    assert.equal(visible(byId(h, 'main-menu')), false);
    assert.equal(byId(h, 'debug-tools').open, false);
    assert.equal(visible(byId(h, 'player1-hand')), true);
    assert.equal(visible(byId(h, 'player2-hand')), false);
    assert.match(byId(h, 'opponent-hand-summary').textContent, /3/);
    assert.equal(h.document.querySelectorAll('.cell').every(node => node.tagName === 'BUTTON'), true);
    assert.equal(firstCard(h).tagName, 'BUTTON');
});

for (const player of [1, 2]) test(`room player ${player} keeps their identity and hand while the opponent acts`, async () => {
    const h = fixture({ search: `?room=ui-test&player=${player}` });
    h.evaluate(`
        isConnected = true; socket.readyState = 1; gameState.aiPlayers = [false, false];
        uiCard('swordsman', 1); uiCard('wolf', 2);
        gameState.currentPlayer = ${player}; updateUI();
    `);
    assert.equal(h.evaluate('getLocalPlayerId()'), player);
    assert.equal(visible(byId(h, `player${player}-hand`)), true);
    assert.equal(visible(byId(h, `player${3-player}-hand`)), false);
    assert.match(byId(h, `player${player}-panel`).querySelector('h2').textContent, /你|我方/);
    h.evaluate(`gameState.currentPlayer = ${3-player}; updateUI();`);
    assert.equal(visible(byId(h, `player${player}-hand`)), true);
    assert.equal(visible(byId(h, `player${3-player}-hand`)), false);
    const before = h.evaluate('JSON.stringify(gameState)');
    for (const id of ['draw-card-btn', 'enter-battle-btn', 'end-turn-btn']) {
        assert.equal(byId(h, id).disabled, true);
        await click(h, byId(h, id));
    }
    await click(h, firstCard(h, player));
    await click(h, cell(h, 1, player === 1 ? 0 : 6));
    assert.equal(h.evaluate('JSON.stringify(gameState)'), before);
});

test('selecting a card shows its real cost and only legal deployment cells; placement spends that cost', async () => {
    const h = fixture();
    h.evaluate(`uiCard('swordsman', 1, {cost:3}); uiUnit('wolf',1,0,0); updateUI();`);
    await click(h, firstCard(h));
    assert.equal(h.evaluate('gameState.selectedCard'), 'swordsman');
    assert.match(byId(h, 'selection-title').textContent, /刀兵/);
    assert.match(byId(h, 'selection-stats').textContent, /3/);
    assert.ok(byId(h, 'selection-description').textContent.length > 0);
    assert.ok(visible(byId(h, 'cancel-selection-btn')));
    const marked = h.document.querySelectorAll('.cell.deployable');
    assert.equal(marked.length, 8);
    for (const node of h.document.querySelectorAll('.cell')) {
        const row = Number(node.dataset.row), col = Number(node.dataset.col);
        const expected = col < 2 && !(row === 2 && col === 0) && !(row === 0 && col === 0);
        assert.equal(node.classList.contains('deployable'), expected, `deployment ${row},${col}`);
    }
    await click(h, cell(h, 1, 1));
    assert.equal(h.evaluate('gameState.board[1][1].type'), 'swordsman');
    assert.equal(h.evaluate('gameState.players[0].actionPoints'), 3);
    assert.equal(h.evaluate('gameState.players[0].hand.length'), 0);
    assert.equal(h.document.querySelectorAll('.deployable').length, 0);
});

test('unaffordable cards remain inspectable but never mark or allow deployment', async () => {
    const h = fixture();
    h.evaluate(`uiCard('swordsman', 1, {cost:4}); gameState.players[0].actionPoints=1; updateUI();`);
    await click(h, firstCard(h));
    assert.match(byId(h, 'selection-title').textContent, /刀兵/);
    assert.equal(h.document.querySelectorAll('.deployable').length, 0);
    assert.match(byId(h, 'action-hint').textContent, /不足|需要|还差/);
    await click(h, cell(h, 1, 1));
    assert.equal(h.evaluate('gameState.board[1][1]'), null);
    assert.equal(h.evaluate('gameState.players[0].actionPoints'), 1);
    assert.equal(h.alerts.length, 0, 'feedback does not block play with alert');
});

test('same-name units select and spend the clicked card rather than the first copy', async () => {
    const h = fixture();
    h.evaluate(`uiCard('swordsman',1,{cost:3}); uiCard('swordsman',1,{cost:2}); gameState.players[0].actionPoints=2; updateUI();`);
    firstCard(h).dispatchEvent({type:'mouseenter',pageX:10,pageY:10});
    assert.match(byId(h,'tooltip').textContent,/花费: 3/);
    await click(h,byId(h,'player1-hand').querySelectorAll('.card')[1]);
    assert.equal(h.document.querySelectorAll('.card.selected').length,1);
    assert.equal(byId(h,'player1-hand').querySelectorAll('.card')[1].getAttribute('aria-pressed'),'true');
    assert.match(byId(h,'selection-stats').textContent,/费用 2 行动/);
    assert.equal(h.document.querySelectorAll('.deployable').length,9);
    await click(h,cell(h,1,1));
    assert.equal(h.evaluate('gameState.board[1][1].type'),'swordsman');
    assert.equal(h.evaluate('gameState.players[0].actionPoints'),0);
    assert.equal(h.evaluate('gameState.players[0].hand.length'),1);
    assert.equal(h.evaluate('gameState.players[0].hand[0].cost'),3);
});

for (const key of ['healPack','necromancy']) test(`${key} spends the selected spell copy and retains its more expensive duplicate`, async () => {
    const h = fixture();
    h.evaluate(`uiCard('${key}',1,{cost:4}); uiCard('${key}',1,{cost:2}); gameState.players[0].actionPoints=2; var target=uiUnit('wolf',${key === 'healPack' ? 1 : 2},1,1,{health:1}); updateUI();`);
    await click(h,byId(h,'player1-hand').querySelectorAll('.card')[1]);
    assert.equal(h.document.querySelectorAll('.card.selected').length,1);
    assert.match(byId(h,'selection-stats').textContent,/费用 2 行动/);
    if (key === 'healPack') await click(h,cell(h,1,1));
    else {
        assert.equal(byId(h,'use-spell-btn').disabled,false);
        await click(h,byId(h,'use-spell-btn'));
    }
    assert.equal(h.evaluate('gameState.players[0].actionPoints'),0);
    assert.equal(h.evaluate('gameState.players[0].hand.length'),1);
    assert.equal(h.evaluate('gameState.players[0].hand[0].cost'),4);
    assert.equal(h.evaluate('gameState.players[0].graveyard.length'),1);
    if (key === 'healPack') assert.equal(h.evaluate('target.health'),4);
    else assert.equal(h.evaluate('gameState.units.includes(target)'),false);
});

test('AI takeover retains key-based spell selection instead of inheriting the human selected copy', async () => {
    const h = fixture();
    h.evaluate(`uiCard('healPack',1,{cost:3}); uiCard('healPack',1,{cost:2}); var target=uiUnit('wolf',1,1,1,{health:1}); updateUI();`);
    await click(h,byId(h,'player1-hand').querySelectorAll('.card')[1]);
    h.evaluate('gameState.aiPlayers[0]=true; aiApplySpellEffect("healPack",target);');
    assert.equal(h.evaluate('gameState.players[0].actionPoints'),3);
    assert.equal(h.evaluate('gameState.players[0].hand.length'),1);
    assert.equal(h.evaluate('gameState.players[0].hand[0].cost'),2);
});

test('cancel button and Escape clear pending choices without spending any resources', async () => {
    const h = fixture();
    h.evaluate(`uiCard('swordsman'); updateUI();`);
    for (const method of ['button', 'escape']) {
        await click(h, firstCard(h));
        assert.equal(h.document.querySelectorAll('.deployable').length, 9);
        if (method === 'button') await click(h, byId(h, 'cancel-selection-btn'));
        else h.document.dispatchEvent({ type:'keydown', key:'Escape' });
        assert.equal(h.evaluate('gameState.selectedCard'), null);
        assert.equal(h.document.querySelectorAll('.deployable').length, 0);
        assert.equal(h.evaluate('gameState.players[0].actionPoints'), 6);
        assert.equal(h.evaluate('gameState.players[0].hand.length'), 1);
    }
});

test('AI turn cannot be changed by the visible human controls', async () => {
    const h = fixture();
    h.evaluate(`uiCard('swordsman'); gameState.currentPlayer=2; updateUI();`);
    const before = h.evaluate('JSON.stringify(gameState)');
    assert.match(byId(h, 'action-hint').textContent, /等待|对手|电脑/);
    for (const id of ['draw-card-btn','enter-battle-btn','end-turn-btn','skill-btn','use-spell-btn']) {
        assert.equal(byId(h, id).disabled, true);
        await click(h, byId(h, id));
    }
    await click(h, firstCard(h));
    await click(h, cell(h, 1, 1));
    assert.equal(h.evaluate('JSON.stringify(gameState)'), before);
});

test('turning off the opponent AI does not give the local human control over that side', async () => {
    const h = fixture();
    h.evaluate(`gameState.aiPlayers=[false,false]; gameState.currentPlayer=2; gameState.phase='battle'; var enemy=uiUnit('wolf',2,1,4); updateUI();`);
    const before = h.evaluate('JSON.stringify(gameState)');
    await click(h,cell(h,1,4));
    await click(h,cell(h,1,3));
    assert.equal(h.evaluate('JSON.stringify(gameState)'),before);
    assert.equal(h.document.querySelectorAll('.movable, .attackable').length,0);
    assert.equal(byId(h,'end-turn-btn').disabled,true);
    h.evaluate(`gameState.phase='placement'; uiCard('wolf',2); updateUI();`);
    const beforePlacement = h.evaluate('JSON.stringify(gameState)');
    await click(h,firstCard(h,2));
    await click(h,cell(h,1,5));
    assert.equal(h.evaluate('JSON.stringify(gameState)'),beforePlacement);
});

for (const type of ['swordsman','shadowAssassin','phaseBeast','minotaur']) test(`${type} movement and attack highlights agree with executable rules`, async () => {
    const h = fixture();
    h.evaluate(`gameState.phase='battle'; var acting=uiUnit('${type}',1,1,2); uiUnit('wolf',2,2,2); uiUnit('wolf',1,0,2); updateUI();`);
    await click(h, cell(h, 1, 2));
    assert.equal(h.evaluate('gameState.selectedUnit===acting'), true);
    for (const node of h.document.querySelectorAll('.cell')) {
        const row = Number(node.dataset.row), col = Number(node.dataset.col);
        assert.equal(node.classList.contains('movable'), h.evaluate(`isCellMovable(acting,${row},${col})`), `move ${row},${col}`);
        assert.equal(node.classList.contains('attackable'), h.evaluate(`isCellAttackable(acting,${row},${col})`), `attack ${row},${col}`);
    }
    const move = h.document.querySelector('.movable');
    assert.ok(move, 'fixture offers at least one move');
    await click(h, move);
    assert.equal(h.evaluate('acting.row'), Number(move.dataset.row));
    assert.equal(h.evaluate('acting.col'), Number(move.dataset.col));
    assert.equal(h.evaluate('acting.hasMoved'), true);
    const currentCell = cell(h, Number(move.dataset.row), Number(move.dataset.col));
    if (type === 'shadowAssassin') {
        assert.match(currentCell.textContent, /可攻击/);
        await click(h,currentCell);
        assert.match(byId(h,'selection-stats').textContent,/仍可攻击/);
        await click(h,byId(h,'cancel-selection-btn'));
    }
    else assert.match(currentCell.textContent, /已行动/);
    assert.equal(h.document.querySelectorAll('.movable, .attackable').length, 0);
});

test('selecting an exhausted unit clears the previously active unit and all targets', async () => {
    const h = fixture();
    h.evaluate(`gameState.phase='battle'; uiUnit('swordsman',1,1,1); uiUnit('wolf',1,3,1,{hasMoved:true}); updateUI();`);
    await click(h, cell(h,1,1));
    assert.ok(h.document.querySelectorAll('.movable').length > 0);
    await click(h, cell(h,3,1));
    assert.equal(h.evaluate('gameState.selectedUnit'), null);
    assert.equal(h.document.querySelectorAll('.movable, .attackable').length, 0);
    assert.match(byId(h, 'selection-title').textContent, /狼/);
});

for (const scenario of [
    {name:'insufficient AP', setup:'gameState.players[0].actionPoints=0;', reason:/不足|需要|还差|行动点/},
    {name:'full hand', setup:"for(let i=0;i<7;i++) uiCard('wolf');", reason:/手牌.*满|7/},
    {name:'empty deck', setup:'gameState.players[0].deck=[];gameState.players[0].graveyard=[];', reason:/牌库.*空|无牌|没有.*牌|抽完/},
    {name:'battle phase', setup:"gameState.phase='battle';", reason:/部署|战斗/}
]) test(`draw control explains ${scenario.name} and a disabled click changes no state`, async () => {
    const h = fixture();
    h.evaluate(`${scenario.setup} updateUI();`);
    const button = byId(h,'draw-card-btn');
    assert.equal(button.disabled, true);
    assert.match(button.title + button.getAttribute('aria-label'), scenario.reason);
    const before = h.evaluate('JSON.stringify(gameState)');
    await click(h, button);
    assert.equal(h.evaluate('JSON.stringify(gameState)'), before);
});

test('healing target guidance updates immediately and highlights only wounded allies in range', async () => {
    const h = fixture();
    h.evaluate(`gameState.phase='battle'; var priest=uiUnit('lightPriest',1,1,1); var wounded=uiUnit('wolf',1,1,2,{health:1}); uiUnit('wolf',1,0,1); uiUnit('wolf',2,2,1,{health:1}); updateUI();`);
    await click(h, cell(h,1,1));
    await click(h, byId(h,'skill-btn'));
    assert.equal(h.evaluate('gameState.healingUnit===priest'), true);
    assert.match(byId(h,'action-hint').textContent,/治疗|受伤/);
    assert.equal(h.document.querySelectorAll('.swappable').length,1);
    assert.equal(cell(h,1,2).classList.contains('swappable'),true);
    await click(h,cell(h,1,2));
    assert.equal(h.evaluate('wounded.health'),3);
    assert.equal(h.evaluate('priest.hasUsedSkill'),true);
    assert.equal(h.document.querySelectorAll('.swappable').length,0);
});

test('erosion highlights lethal targets, then switches guidance to its sacrifice step', async () => {
    const h = fixture();
    h.evaluate(`gameState.phase='battle'; var lord=uiUnit('shadowLord',1,1,1); var victim=uiUnit('phaseBeast',2,1,2,{health:2}); uiUnit('phaseBeast',2,0,1,{health:3}); var sacrifice=uiUnit('wolf',1,3,1); updateUI();`);
    await click(h,cell(h,1,1));
    await click(h,byId(h,'skill-btn'));
    assert.equal(h.evaluate('gameState.erosionMode'),true);
    assert.equal(cell(h,1,2).classList.contains('swappable'),true);
    assert.equal(cell(h,0,1).classList.contains('swappable'),false,'armour makes this target survive');
    await click(h,cell(h,1,2));
    assert.equal(h.evaluate('gameState.erosionTarget===victim'),true);
    assert.match(byId(h,'action-hint').textContent,/献祭/);
    assert.equal(h.document.querySelectorAll('.swappable').length,1);
    assert.equal(cell(h,3,1).classList.contains('swappable'),true);
    await click(h,cell(h,3,1));
    assert.equal(h.evaluate('victim.player'),1);
    assert.equal(h.evaluate('gameState.units.includes(sacrifice)'),false);
    assert.equal(h.document.querySelectorAll('.swappable').length,0);
    assert.equal(h.alerts.length,0,'multi-step skills use non-blocking guidance');
});

test('cancelling a swap clears the skill mode and target highlights without using an action', async () => {
    const h = fixture();
    h.evaluate(`gameState.phase='battle'; var mage=uiUnit('shadowMage',1,1,1); uiUnit('wolf',1,1,3); updateUI();`);
    await click(h,cell(h,1,1));
    await click(h,byId(h,'skill-btn'));
    assert.equal(h.evaluate('moving'),1);
    assert.match(byId(h,'action-hint').textContent,/交换|换位/);
    assert.equal(h.document.querySelectorAll('.swappable').length,1);
    await click(h,byId(h,'cancel-selection-btn'));
    assert.equal(h.evaluate('moving'),0);
    assert.equal(h.evaluate('gameState.selectedUnit'),null);
    assert.equal(h.document.querySelectorAll('.swappable, .movable, .attackable').length,0);
    assert.equal(h.evaluate('mage.hasUsedSkill || mage.hasMoved || mage.hasAttacked'),false);
});

test('menu, help, adventure selection and continued progress remain navigable', async () => {
    const h = loadGame();
    await click(h,byId(h,'btn-experience'));
    await click(h,byId(h,'help-btn'));
    assert.ok(visible(byId(h,'help-modal')));
    await click(h,byId(h,'close-help-btn'));
    assert.equal(visible(byId(h,'help-modal')),false);
    await click(h,byId(h,'battle-menu-btn'));
    assert.ok(visible(byId(h,'main-menu')));
    await click(h,byId(h,'btn-start-story'));
    assert.ok(visible(byId(h,'story-select-panel')));
    await click(h,byId(h,'btn-next-character'));
    assert.equal(h.evaluate('currentCharIdx'),1);
    await click(h,byId(h,'btn-story-start'));
    assert.ok(visible(byId(h,'battle-preview-root')));
    h.evaluate('PREVIEW_ROLE.gold=13; saveStoryProgress();');
    const before = h.evaluate('JSON.stringify({role:PREVIEW_ROLE,cards:PREVIEW_CARDS,events:PREVIEW_EVENTS,deck:EVENT_DECK})');
    const reloaded = loadGame({ storage:h.storage });
    assert.equal(byId(reloaded,'btn-continue').disabled,false);
    await click(reloaded,byId(reloaded,'btn-continue'));
    assert.ok(visible(byId(reloaded,'battle-preview-root')));
    assert.equal(reloaded.evaluate('JSON.stringify({role:PREVIEW_ROLE,cards:PREVIEW_CARDS,events:PREVIEW_EVENTS,deck:EVENT_DECK})'),before);
});
