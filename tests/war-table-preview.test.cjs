const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadGame } = require('./game-harness.cjs');

function englishBattle() {
    const root = path.resolve(__dirname, '..');
    const html = fs.readFileSync(path.join(root, 'game-en.html'), 'utf8');
    const sources = { 'game.html': html };
    for (const [, url] of html.matchAll(/<script[^>]*src=["']([^"']+)/gi)) {
        const file = url.split(/[?#]/)[0];
        sources[file] = fs.readFileSync(path.join(root, file), 'utf8');
    }
    const h = loadGame({ seed: 42, sources });
    h.document.getElementById('btn-experience').click();
    h.evaluate(`
        gameState.aiPlayers = [false, false];
        gameState.currentPlayer = 1;
        gameState.phase = 'battle';
        gameState.units = [];
        gameState.board = Array.from({ length: 5 }, () => Array(7).fill(null));
        gameState.frozenUnits = [];
        function forecastUnit(type, player, row, col, extra = {}) {
            const definition = unitDefinitions[type];
            const unit = { ...definition, type, player, row, col, id: 'forecast-' + gameState.units.length,
                health: 20, maxHealth: 20, hasMoved: false, hasAttacked: false, hasUsedSkill: false,
                lastTurnHasMoved: false, lastTurnHasAttacked: false, bonusDamage: 0, shield: 0, ...extra };
            gameState.units.push(unit);
            gameState.board[row][col] = unit;
            return unit;
        }
    `);
    assert.deepEqual(h.errors.map(error => error.message), []);
    return h;
}

async function compareWithAttack({ attacker = 'swordsman', target = 'minotaur', attackerState = {}, targetState = {}, frozen = false, blocked = false, base = false, roll = 0.9, critical = false }) {
    const h = englishBattle();
    h.evaluate(`
        var attacker = forecastUnit(${JSON.stringify(attacker)}, 1, 2, ${base ? 5 : 3}, ${JSON.stringify(attackerState)});
        var defender = ${base ? 'gameState.players[1]' : `forecastUnit(${JSON.stringify(target)}, 2, 2, 4, ${JSON.stringify(targetState)})`};
        ${base ? `Object.assign(defender, { health: 20, maxHealth: 20, ...${JSON.stringify(targetState)} });` : ''}
        ${frozen ? 'gameState.frozenUnits.push({ id: defender.id, player: 2, duration: 2 });' : ''}
        ${blocked ? "forecastUnit('minotaur', 2, 2, 5);" : ''}
        gameState.selectedUnit = attacker;
        updateUI();
        var randomCalls = 0;
        Math.random = () => { randomCalls++; return ${roll}; };
    `);
    const col = base ? 6 : 4;
    const before = h.evaluate('JSON.stringify(gameState)');
    const preview = JSON.parse(JSON.stringify(h.evaluate(`getPlayerAttackPreview(attacker, 2, ${col})`)));
    assert.ok(preview, 'legal attack has a forecast');
    const cell = h.document.querySelector(`.cell[data-row="2"][data-col="${col}"]`);
    cell.dispatchEvent({ type: 'mouseenter', pageX: 10, pageY: 10 });
    assert.equal(h.document.getElementById('selection-preview').hidden, false);
    assert.equal(h.evaluate('JSON.stringify(gameState)'), before, 'forecast and hover preserve all combat state');
    assert.equal(h.evaluate('randomCalls'), 0, 'forecast does not consume combat randomness');

    const healthBefore = h.evaluate('defender.health');
    const attack = h.evaluate(`attack(attacker, 2, ${col})`);
    const settled = await h.drainUntil(() => !h.evaluate('isAnimating'), { maxSteps: 20 });
    assert.equal(settled.reason, 'condition', 'attack animation settles');
    assert.equal(await attack, true, 'actual combat accepts the attack');
    const forecastDamage = Number(preview.damage.split('/')[critical ? 1 : 0]);
    assert.equal(healthBefore - h.evaluate('defender.health'), forecastDamage, 'forecast matches actual attack settlement');
    if (attacker === 'wolf') assert.equal(h.evaluate('defender.col'), blocked ? 4 : 5, 'actual push matches the forecast situation');
    if (attacker === 'archer') assert.equal(h.evaluate('randomCalls'), 1, 'only the actual attack rolls its critical chance');
    assert.deepEqual(h.errors.map(error => error.message), []);
}

test('forecasts match actual defense, shields, frozen bypass and phase armour', async () => {
    await compareWithAttack({ target: 'shieldWarrior', targetState: { shield: 1 } });
    await compareWithAttack({ target: 'shieldWarrior', targetState: { shield: 1 }, frozen: true });
    await compareWithAttack({ target: 'phaseBeast', targetState: { shield: 1 } });
    await compareWithAttack({ target: 'phaseBeast', targetState: { shield: 1 }, frozen: true });
});

test('forecasts match actual free or blocked wolf charge and Shadow Shift bonus', async () => {
    await compareWithAttack({ attacker: 'wolf' });
    await compareWithAttack({ attacker: 'wolf', blocked: true });
    await compareWithAttack({ attackerState: { shadowMoveBonus: true } });
});

test('both Archer forecast outcomes match actual normal and critical attacks', async () => {
    await compareWithAttack({ attacker: 'archer', target: 'phaseBeast', targetState: { shield: 1 }, roll: 0.9 });
    await compareWithAttack({ attacker: 'archer', target: 'phaseBeast', targetState: { shield: 1 }, roll: 0, critical: true });
});

test('base shield forecasts follow actual base rules, including Archer and Shadow Shift', async () => {
    await compareWithAttack({ base: true, targetState: { shield: 1 } });
    await compareWithAttack({ attacker: 'archer', base: true, targetState: { shield: 1 }, attackerState: { shadowMoveBonus: true }, roll: 0.9 });
    await compareWithAttack({ attacker: 'archer', base: true, targetState: { shield: 1 }, attackerState: { shadowMoveBonus: true }, roll: 0, critical: true });
});
