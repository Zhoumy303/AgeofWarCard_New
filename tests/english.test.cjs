const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { loadGame } = require('./game-harness.cjs');

const root = path.resolve(__dirname, '..');
function englishSources() {
    const sources = { 'game.html': fs.readFileSync(path.join(root, 'game-en.html'), 'utf8') };
    for (const [, source] of sources['game.html'].matchAll(/<script[^>]*src=["']([^"']+)/gi)) {
        const file = source.split(/[?#]/)[0];
        assert.ok(file.startsWith('js/en/'), `English page uses its own script: ${file}`);
        sources[file] = fs.readFileSync(path.join(root, file), 'utf8');
    }
    return sources;
}
function english(options = {}) {
    const h = loadGame({ seed: 42, sources: englishSources(), ...options });
    assert.deepEqual(h.errors.map(error => error.message), []);
    return h;
}
const plain = value => JSON.parse(JSON.stringify(value));
const noChinese = (value, label) => assert.doesNotMatch(String(value).replace('中文', ''), /[\u3400-\u9fff]/, label);

test('English page boots and renders the menu, match, help and save manager in English', () => {
    const h = english();
    assert.equal(h.document.querySelector('html').getAttribute('lang'), 'en');
    assert.equal(h.document.querySelectorAll('.cell').length, 35);
    noChinese(h.document.body.textContent, 'initial page text');
    h.document.getElementById('btn-experience').click();
    noChinese(h.document.body.textContent, 'quick match text');
    h.document.getElementById('help-btn').click();
    noChinese(h.document.getElementById('help-modal').textContent, 'help text');
    h.context.saveManager.show();
    noChinese(h.document.getElementById('save-manager-modal').textContent, 'save manager text');
    assert.deepEqual(h.errors.map(error => error.message), []);
});

test('all card, enemy, boss, character and event descriptions are English', () => {
    const h = english();
    const groups = plain(h.evaluate('[unitDefinitions, spellDefinitions, itemDefinitions, ENEMY_POOL, BOSSES, CHARACTERS, createEventDeck()]'));
    for (const group of groups) for (const value of Object.values(group)) {
        for (const field of ['name', 'desc', 'description', 'detail', 'effect', 'skills', 'action', 'job']) {
            noChinese(value[field] ?? '', `${value.name}: ${field}`);
        }
    }
    assert.deepEqual(new Set(groups.at(-1).map(event => event.type)), new Set([
        'Battle', 'Treasure', 'Crossroads', 'Shop', 'Spring', 'Tavern', 'Awakening', 'Quartermaster', 'Gift'
    ]));
});

const decks = [
    ['shieldWarrior', 'shieldWarrior', 'swordsman', 'swordsman', 'healPack'],
    ['shadowAssassin', 'shadowAssassin', 'shadowAssassin', 'shadowMage', 'resetCard'],
    ['wolf', 'minotaur', 'iceDragon', 'healPack']
];
for (let character = 0; character < decks.length; character++) {
    test(`English character ${character + 1} keeps its starter deck and enters a battle`, () => {
        const h = english();
        h.evaluate(`currentCharIdx = ${character}; document.getElementById('btn-story-start').click();`);
        assert.deepEqual(plain(h.evaluate('PREVIEW_CARDS.map(card => card.key)')), decks[character]);
        noChinese(h.document.getElementById('battle-preview-root').textContent, 'adventure screen');
        h.evaluate('startBattleWithEnemy(ENEMY_POOL[0]);');
        assert.equal(h.evaluate('gameState.players.every(player => player.hand.length === 3)'), true);
        const allCards = plain(h.evaluate('[...gameState.players[0].hand.map(card => card.key), ...gameState.players[0].deck]'));
        assert.deepEqual(allCards.sort(), [...decks[character]].sort());
        noChinese(h.document.querySelector('.game-container').textContent, 'story battle screen');
        assert.deepEqual(h.errors.map(error => error.message), []);
    });
}

test('the nine supplied originals remain intact and Shadow Lord uses its corrected face', () => {
    const art = {
        shieldWarrior: ['shield-warrior', '04F17F79D1B0C40A7A1F524849CE229FEC8A82EE9711AB4E98631A9C07F15536'],
        swordsman: ['swordsman', '8A6358BBDF112BFDEAE7CE71D404B2A1DACEA50CD952662D938124CB79B5849F'],
        archer: ['archer', 'EE17F342A25789651F916DAD1CC2AA27067E11185F17DAECF2CBF5EE3680BBEA'],
        shadowAssassin: ['shadow-assassin', 'ACA7FDE3B5E1B8EC7E732F57AD26EA618DE3453A1B57CC34F396D2F14E9E427A'],
        shadowMage: ['shadow-mage', 'A766ED0B4F5CE2C8A023F7F9657995A9D364A2FAE9C5FA3D855CA023B1EA8E3F'],
        shadowLord: ['shadow-lord', '93FEF600017092CA30D4908C5DEAF1F94C99B51BBA0DA348B95795FB0296CE64'],
        wolf: ['wolf', '0B3C47B3D5221871FD3B4263F9C394BBE82C0E12B8F760F5D4ACC4C9AABEA49E'],
        minotaur: ['minotaur', '5B5F7AD38E2593EBD02D204F79077562398193D9F0346ECCE4EC6308CA17930F'],
        iceDragon: ['ice-dragon', '450133379634F6ED4784C73F86102EDED4955047AC35B757E9DC30D586BF2C1B']
    };
    const h = english();
    for (const [key, [file, hash]] of Object.entries(art)) {
        const expected = `lib/img/cards-en/${file}.png`;
        assert.equal(h.evaluate(`unitDefinitions.${key}.img`), key === 'shadowLord' ? 'lib/img/cards-en/shadow-lord-corrected.png' : expected);
        assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root, expected))).digest('hex').toUpperCase(), hash, key);
    }
});

test('all 21 cards use full faces and pure hand art, and both items have local framed faces', () => {
    const h = english();
    h.document.getElementById('btn-experience').click();
    const cards = plain(h.evaluate('Object.entries({ ...unitDefinitions, ...spellDefinitions })'));
    assert.equal(cards.length, 21);
    const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    for (const [key, definition] of cards) {
        assert.ok(definition.img.startsWith('lib/img/cards-en/'), `${key}: framed face`);
        assert.ok(definition.handImg.startsWith('lib/img/'), `${key}: local hand artwork`);
        assert.equal(definition.handImg.startsWith('lib/img/cards-en/'), false, `${key}: hand excludes printed frame`);
        const face = fs.readFileSync(path.join(root, definition.img));
        assert.deepEqual(face.subarray(0, 8), pngSignature, `${key}: valid PNG face`);
        assert.ok(fs.statSync(path.join(root, definition.handImg)).size > 0, `${key}: hand artwork exists`);
        h.evaluate(`
            gameState.players[0].hand = [{ ...(unitDefinitions['${key}'] || spellDefinitions['${key}']), key: '${key}' }];
            gameState.selectedCard = null; selectedHandCard = null; inspectedCard = null; updateUI();
        `);
        const heldBefore = h.evaluate('JSON.stringify(gameState.players[0].hand)');
        const hand = h.document.getElementById('player1-hand');
        assert.equal(hand.querySelector('img').src, definition.handImg, `${key}: hand renders pure artwork`);
        hand.querySelector('.card').click();
        assert.equal(h.document.getElementById('selection-art').src, definition.img, `${key}: selection renders full face`);
        assert.equal(h.document.getElementById('selection-art').hidden, false);
        assert.equal(h.document.getElementById('view-card-art-btn').hidden, false);
        h.document.getElementById('view-card-art-btn').click();
        assert.equal(h.document.getElementById('card-art-image').src, definition.img, `${key}: viewer renders full face`);
        assert.equal(h.document.getElementById('card-art-modal').hidden, false);
        h.document.getElementById('close-card-art-btn').click();
        assert.equal(h.evaluate('JSON.stringify(gameState.players[0].hand)'), heldBefore, `${key}: inspection preserves card`);
    }
    const items = plain(h.evaluate('Object.entries(itemDefinitions)'));
    assert.equal(items.length, 2);
    for (const [key, definition] of items) {
        assert.ok(definition.img.startsWith('lib/img/cards-en/'), `${key}: framed item face`);
        assert.deepEqual(fs.readFileSync(path.join(root, definition.img)).subarray(0, 8), pngSignature, `${key}: valid PNG face`);
        for (const stat of ['cost', 'damage', 'health', 'attackRange']) assert.equal(definition[stat], undefined, `${key}: has no unit stats`);
    }
    assert.deepEqual(h.errors.map(error => error.message), []);
});

test('held cards with old saved image paths use current art while preserving modified live stats', () => {
    const h = english();
    h.document.getElementById('btn-experience').click();
    for (const key of ['shadowLord', 'healPack']) {
        const definition = plain(h.evaluate(`unitDefinitions['${key}'] || spellDefinitions['${key}']`));
        h.evaluate(`
            gameState.players[0].hand = [{ ...(unitDefinitions['${key}'] || spellDefinitions['${key}']), key: '${key}',
                img: 'lib/img/cards-en/shadow-lord.png', handImg: 'lib/img/cards-en/shadow-lord.png', cost: 4,
                ${key === 'shadowLord' ? 'damage: 7, health: 8,' : ''}
            }];
            gameState.selectedCard = null; selectedHandCard = null; inspectedCard = null; updateUI();
        `);
        const savedBefore = h.evaluate('JSON.stringify(gameState.players[0].hand)');
        const hand = h.document.getElementById('player1-hand');
        assert.equal(hand.querySelector('img').src, definition.handImg, `${key}: obsolete hand art ignored`);
        assert.equal(hand.querySelector('.card-cost').textContent, '4');
        hand.querySelector('.card').click();
        assert.equal(h.document.getElementById('selection-art').src, definition.img, `${key}: obsolete full art ignored`);
        assert.equal(h.document.querySelector('.selection-stat[data-label="AP"] strong').textContent, '4');
        if (key === 'shadowLord') {
            assert.equal(h.document.querySelector('.selection-stat[data-label="ATK"] strong').textContent, '7');
            assert.equal(h.document.querySelector('.selection-stat[data-label="HP"] strong').textContent, '8');
        }
        h.document.getElementById('view-card-art-btn').click();
        assert.equal(h.document.getElementById('card-art-image').src, definition.img);
        assert.match(h.document.getElementById('card-art-stats').textContent, /Cost 4 AP/);
        h.document.getElementById('close-card-art-btn').click();
        assert.equal(h.evaluate('JSON.stringify(gameState.players[0].hand)'), savedBefore, `${key}: saved object not rewritten`);
    }
    assert.deepEqual(h.errors.map(error => error.message), []);
});

test('English card stats, enemy stats, decks and progression match the Chinese game', () => {
    const cn = loadGame({ seed: 42 });
    const en = english();
    const snapshot = `({
        units: Object.fromEntries(Object.entries(unitDefinitions).map(([key, unit]) => [key, [unit.type, unit.health, unit.damage, unit.attackRange, unit.cost, unit.freezeDuration]])),
        spells: Object.fromEntries(Object.entries(spellDefinitions).map(([key, spell]) => [key, [spell.type, spell.cost]])),
        enemies: ENEMY_POOL.map(enemy => [enemy.exp, enemy.gold, enemy.hp, enemy.maxAp, enemy.apPerTurn, enemy.deck]),
        cardPool, LEVEL_EXP_REQUIREMENTS, LEVEL_MAX_HP
    })`;
    assert.deepEqual(plain(en.evaluate(snapshot)), plain(cn.evaluate(snapshot)));
});

test('English saves neither read nor overwrite Chinese progress, including save clearing', () => {
    const cn = loadGame({ seed: 42 });
    cn.evaluate("document.getElementById('btn-story-start').click(); saveSystem.saveData('aiLearningData', { marker: 'Chinese AI' });");
    const original = new Map(cn.storage);
    const h = english({ storage: cn.storage });
    assert.equal(h.evaluate("saveSystem.loadData('gameProgress')"), null);
    assert.equal(h.document.getElementById('btn-continue').disabled, true);
    h.evaluate("document.getElementById('btn-story-start').click(); PREVIEW_ROLE.gold = 13; saveStoryProgress();");
    assert.equal(h.evaluate("saveSystem.loadData('gameProgress').role.gold"), 13);
    assert.ok(h.storage.has('aow-en:gameProgress'));
    const reload = english({ storage: h.storage });
    reload.document.getElementById('btn-continue').click();
    assert.equal(reload.evaluate('PREVIEW_ROLE.gold'), 13);
    reload.context.saveManager.clearAllSaves();
    assert.equal(reload.storage.has('aow-en:gameProgress'), false);
    for (const [key, value] of original) assert.equal(reload.storage.get(key), value, `Chinese save preserved: ${key}`);
    reload.context.localStorage.key = index => [...reload.storage.keys()][index] ?? null;
    Object.defineProperty(reload.context.localStorage, 'length', { get: () => reload.storage.size });
    reload.evaluate("englishStorage.setItem('temporary', 'data'); englishStorage.clear();");
    assert.equal([...reload.storage.keys()].some(key => key.startsWith('aow-en:')), false);
    for (const [key, value] of original) assert.equal(reload.storage.get(key), value, `Chinese save preserved after clear: ${key}`);
});

test('the previous Chinese HTML, scripts and styles remain unchanged', () => {
    const hashes = JSON.parse(fs.readFileSync(path.join(__dirname, 'english-original-hashes.json'), 'utf8'));
    for (const [file, hash] of Object.entries(hashes)) {
        assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex').toUpperCase(), hash, file);
    }
});
