const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadGame, snapshotSources } = require('./game-harness.cjs');

function englishSources() {
    const root = path.resolve(__dirname, '..');
    const sources = { 'game.html': fs.readFileSync(path.join(root, 'game-en.html'), 'utf8') };
    for (const [, src] of sources['game.html'].matchAll(/<script[^>]*src=["']([^"']+)/gi)) {
        const file = src.split(/[?#]/)[0];
        sources[file] = fs.readFileSync(path.join(root, file), 'utf8');
    }
    return sources;
}

// Preserve card order and every unit rule flag. Strip presentation strings and
// normalize timestamp-based unit IDs to their positions in the unit array.
function battleSnapshot(harness) {
    return JSON.parse(harness.evaluate(`JSON.stringify((() => {
        const presentation = new Set(['name', 'desc', 'description', 'skills', 'img']);
        const unitIndex = id => gameState.units.findIndex(unit => unit.id === id);
        const cardKey = card => typeof card === 'string' ? card : card.key;
        const clean = value => Array.isArray(value) ? value.map(clean)
            : value && typeof value === 'object'
                ? Object.fromEntries(Object.entries(value).filter(([key]) => !presentation.has(key)).map(([key, child]) => [key, clean(child)]))
                : value;
        return {
            currentPlayer: gameState.currentPlayer, phase: gameState.phase,
            turnCount: gameState.turnCount, gameOver: gameState.gameOver,
            winner: gameState.winner, drawCount: gameState.drawCount,
            drawCost: gameState.drawCost, erosionMode: gameState.erosionMode,
            extraTurnPlayer: gameState.extraTurnPlayer,
            players: gameState.players.map(player => ({
                ...clean(player),
                hand: player.hand.map(card => ({ key: card.key, cost: card.cost })),
                deck: player.deck.map(cardKey),
                graveyard: player.graveyard.map(cardKey)
            })),
            units: gameState.units.map((unit, index) => ({ ...clean(unit), id: index })),
            board: gameState.board.map(row => row.map(unit => unit ? unitIndex(unit.id) : null)),
            frozenUnits: gameState.frozenUnits.map(frozen => ({ ...clean(frozen), id: unitIndex(frozen.id) }))
        };
    })())`));
}

async function playOpening(sources, seed) {
    const harness = loadGame({ sources, seed });
    // The original harness predates Storage.key/length; provide those browser
    // APIs here without changing the shared harness or the shipped scripts.
    Object.defineProperty(harness.context.localStorage, 'length', { get: () => harness.storage.size });
    harness.context.localStorage.key = index => [...harness.storage.keys()][index] ?? null;
    assert.deepEqual(harness.errors.map(error => error.message), [], 'The game must boot without errors.');
    harness.document.getElementById('btn-experience').click();
    harness.evaluate('gameState.aiPlayers = [true, true]; aiTurn();');
    const history = [];
    let lastTurn = -1;
    const result = await harness.drainUntil(() => {
        const turn = harness.evaluate('gameState.turnCount');
        if (turn !== lastTurn) {
            history.push(battleSnapshot(harness));
            lastTurn = turn;
        }
        return harness.evaluate('gameState.gameOver || gameState.turnCount >= 16');
    }, { maxSteps: 10000, maxTurns: 17 });
    assert.deepEqual(harness.errors.map(error => error.message), [], 'AI and animation timers must remain error-free.');
    assert.equal(result.reason, 'condition', 'Both AIs must continue through 16 half-turns or finish the match.');
    return { history, final: battleSnapshot(harness) };
}

const chinese = snapshotSources();
const english = englishSources();
for (const seed of [1, 2, 3, 4]) {
    test(`English translation preserves the Chinese AI opening, seed ${seed}`, async () => {
        const original = await playOpening(chinese, seed);
        const translated = await playOpening(english, seed);
        assert.deepEqual(translated, original, 'Localization must not change cards, resources, board positions, actions, or outcomes.');
    });
}
