const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadGame } = require('./game-harness.cjs');

test('adventure deck and Tavern use current card faces without rewriting held cards', () => {
    const root = path.resolve(__dirname, '..');
    const sources = { 'game.html': fs.readFileSync(path.join(root, 'game-en.html'), 'utf8') };
    for (const [, source] of sources['game.html'].matchAll(/<script[^>]*src=["']([^"']+)/gi)) {
        const file = source.split(/[?#]/)[0];
        sources[file] = fs.readFileSync(path.join(root, file), 'utf8');
    }
    const h = loadGame({ seed: 42, sources });
    h.evaluate(`PREVIEW_CARDS = ['shadowLord', 'healPack'].map(key => ({
        ...(unitDefinitions[key] || spellDefinitions[key]), key,
        img: 'lib/img/obsolete-card.png', cost: 4, damage: 7
    }));`);
    const before = h.evaluate('JSON.stringify(PREVIEW_CARDS)');
    const expected = JSON.parse(h.evaluate("JSON.stringify(PREVIEW_CARDS.map(card => (unitDefinitions[card.key] || spellDefinitions[card.key]).img))"));
    h.evaluate('renderPreviewCardList(); showTavernModal({});');
    for (const id of ['preview-card-list-content', 'tavern-cards']) {
        assert.deepEqual(h.document.getElementById(id).querySelectorAll('img').map(img => img.src), expected, id);
    }
    assert.equal(h.evaluate('JSON.stringify(PREVIEW_CARDS)'), before);
    assert.deepEqual(h.errors.map(error => error.message), []);
});
