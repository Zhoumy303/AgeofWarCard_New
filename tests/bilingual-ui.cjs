const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('C:/Users/Dr.m/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

// Disposable contexts only: do not use the player's browser profile or saved data.
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'output/ui-implementation/2026-10-11-bilingual');
const report = { checks: [], captures: [], untranslated: [], dialogs: [], pageErrors: [], failedRequests: [] };
async function check(name, fn) {
    try { await fn(); report.checks.push({ name, passed: true }); }
    catch (error) { report.checks.push({ name, passed: false, error: error.message }); }
    console.log(`${report.checks.at(-1).passed ? 'PASS' : 'FAIL'} ${name}`);
}
async function settle(page) {
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}
async function language(page, lang) {
    await page.locator(`#language-${lang}`).click();
    await page.waitForFunction(lang => document.documentElement.lang.startsWith(lang), lang);
    await settle(page);
    assert.equal(await page.evaluate(() => localStorage.getItem('aow-ui-language')), lang);
}
async function unchangedOnSwitch(page, snapshot, lang) {
    const before = await page.evaluate(snapshot);
    await language(page, lang);
    assert.equal(await page.evaluate(snapshot), before, 'Changing language must preserve game and adventure state');
}
async function untranslated(page, scope) {
    const values = await page.evaluate(selector => {
        const host = document.querySelector(selector);
        return [...host.querySelectorAll('*')].filter(el => el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden')
            .flatMap(el => [...el.childNodes].filter(node => node.nodeType === Node.TEXT_NODE).map(node => node.textContent.trim()))
            .filter(value => /[A-Za-z]{3}/.test(value) && !/^(AGE|WAR|AGE OF WAR|of|MAX|ATK|RNG|HP|AP|[A-G]\d|[\d /]+AP)$/i.test(value));
    }, scope);
    report.untranslated.push({ scope, values: [...new Set(values)] });
}
async function capture(page, name) {
    await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all([...document.images].map(img => img.decode().catch(() => {})));
    });
    await settle(page);
    const layout = await page.evaluate(() => {
        const visible = el => el?.getClientRects().length;
        const bounds = selector => {
            const el = document.querySelector(selector);
            if (!visible(el)) return null;
            const b = el.getBoundingClientRect();
            return { x: b.x, y: b.y, width: b.width, height: b.height, bottom: b.bottom, right: b.right };
        };
        return {
            language: document.documentElement.lang, width: innerWidth, height: innerHeight,
            documentWidth: document.documentElement.scrollWidth,
            missingImages: [...document.images].filter(img => img.src && visible(img) && !img.naturalWidth).map(img => img.getAttribute('src')),
            board: bounds('#game-board'), hand: bounds('.hand-section'), rail: bounds('#selection-panel'),
            switch: bounds('#language-zh'), switchGroup: bounds('.language-switcher'), nav: bounds('#battle-toolbar nav'), stage: bounds('.game-container')
        };
    });
    await page.screenshot({ path: path.join(output, name + '.png'), fullPage: true });
    report.captures.push({ name, ...layout });
    assert.ok(layout.documentWidth <= layout.width + 1, `${name}: horizontal overflow`);
    assert.deepEqual(layout.missingImages, [], `${name}: missing image`);
    assert.ok(layout.switch && layout.switch.x >= 0 && layout.switch.right <= layout.width + 1 && layout.switch.y >= 0, `${name}: language control visible at top right`);
    if (layout.nav) {
        const a = layout.nav, b = layout.switchGroup;
        assert.ok(a.right <= b.x || a.x >= b.right || a.bottom <= b.y || a.y >= b.bottom, `${name}: navigation and language switch do not overlap`);
    }
    if (layout.width >= 1000 && layout.board) {
        const scale = layout.stage.width / 1600;
        assert.ok(Math.abs(layout.board.width / scale - 1157) < 1, `${name}: board size remains the approved reference`);
        assert.ok(layout.hand.bottom <= layout.height + 1, `${name}: hand fits desktop viewport`);
    }
}
async function makePage(browser, viewport) {
    const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
    const page = await context.newPage();
    page.setDefaultTimeout(8000);
    page.on('pageerror', error => report.pageErrors.push({ viewport, message: error.message }));
    page.on('requestfailed', request => report.failedRequests.push({ viewport, url: request.url(), error: request.failure()?.errorText }));
    page.on('dialog', dialog => { report.dialogs.push(dialog.message()); return dialog.accept(); });
    await page.addInitScript(() => {
        let seed = 42;
        Math.random = () => {
            seed += 0x6D2B79F5;
            let n = seed;
            n = Math.imul(n ^ n >>> 15, n | 1);
            n ^= n + Math.imul(n ^ n >>> 7, n | 61);
            return ((n ^ n >>> 14) >>> 0) / 4294967296;
        };
    });
    await page.goto(pathToFileURL(path.join(root, 'game-en.html')).href);
    await page.waitForFunction(() => document.querySelectorAll('.cell').length === 35);
    await settle(page);
    return { page, context };
}
async function battleFixture(page) {
    await page.evaluate(() => {
        cancelAITurn(); cancelPlayerSelection();
        gameState.aiPlayers = [false, false];
        gameState.board = Array.from({ length: 5 }, () => Array(7).fill(null));
        gameState.units = []; gameState.frozenUnits = [];
        gameState.currentPlayer = 1; gameState.phase = 'placement';
        gameState.turnCount = 6; gameState.drawCount = 0; gameState.drawCost = 1; gameState.gameOver = false;
        gameState.players.forEach((p, i) => {
            p.health = i ? 5 : 7; p.maxHealth = 7; p.actionPoints = i ? 0 : 6; p.maxAp = 6;
            p.hand = []; p.graveyard = []; p.deck = ['shieldWarrior', 'wolf', 'swordsman'];
        });
        gameState.players[0].hand = ['shieldWarrior', 'swordsman', 'archer', 'shadowAssassin', 'healPack', 'shadowLord']
            .map(key => ({ ...(unitDefinitions[key] || spellDefinitions[key]), key }));
        const add = (type, player, row, col) => {
            const d = unitDefinitions[type];
            const u = { ...d, type, player, row, col, id: Math.random(), maxHealth: d.health, hasAttacked: false, hasMoved: false,
                hasUsedSkill: false, lastTurnHasAttacked: false, lastTurnHasMoved: false, bonusDamage: 0, shield: 0 };
            gameState.units.push(u); gameState.board[row][col] = u; return u;
        };
        window.qaSword = add('swordsman', 1, 2, 3);
        window.qaWolf = add('wolf', 2, 2, 4);
        add('minotaur', 2, 3, 4);
        add('shadowMage', 1, 1, 2);
        updateUI();
    });
    await settle(page);
}
const adventureState = () => JSON.stringify({ role: PREVIEW_ROLE, cards: PREVIEW_CARDS, events: PREVIEW_EVENTS, deck: EVENT_DECK, items: window.PREVIEW_ITEMS, idx: currentCharIdx });
async function adventureFixture(page) {
    await page.evaluate(() => {
        const events = createEventDeck();
        PREVIEW_EVENTS = ['Battle', 'Shop', 'Spring'].map(type => ({ ...events.find(event => event.type === type) }));
        EVENT_DECK = events.slice(3, 15); selectedEventIdx = 1; PREVIEW_ROLE.gold = 80; PREVIEW_ROLE.hp = 2;
        renderPreviewRole(); renderPreviewEvents(); showPreviewCardDetail(PREVIEW_EVENTS[1]);
    });
    await settle(page);
}
async function gameplay(browser) {
    const { page, context } = await makePage(browser, { width: 1600, height: 1000 });
    await check('Default English menu and persistent upper-right switch', async () => {
        assert.equal(await page.locator('#btn-experience').innerText(), 'Quick Match');
        assert.ok(await page.locator('#language-zh').isVisible());
        assert.ok(await page.locator('#language-en').isVisible());
    });
    await check('Menu Chinese, help and access labels translate', async () => {
        await language(page, 'zh');
        assert.match(await page.locator('#btn-experience').innerText(), /[\u4e00-\u9fff]/);
        await page.locator('#menu-help-btn').click();
        assert.match(await page.locator('#help-title').innerText(), /[\u4e00-\u9fff]/);
        assert.match(await page.locator('#close-help-btn').getAttribute('aria-label'), /[\u4e00-\u9fff]/);
        await untranslated(page, '#help-modal');
        await page.locator('#close-help-btn').click();
        await untranslated(page, '#main-menu');
        await capture(page, '01-menu-zh-1600x1000');
    });
    await page.locator('#btn-experience').click();
    await battleFixture(page);
    await page.locator('#player1-hand .card').nth(1).click();
    await check('Selected card, deployment prompts and titles translate without altering match', async () => {
        await settle(page);
        assert.match(await page.locator('#selection-title').innerText(), /[\u4e00-\u9fff]/);
        assert.match(await page.locator('#action-hint').innerText(), /[\u4e00-\u9fff]/);
        assert.match(await page.locator('#draw-card-btn').getAttribute('title'), /[\u4e00-\u9fff]/);
        const selected = await page.evaluate(() => gameState.selectedCard);
        await unchangedOnSwitch(page, () => JSON.stringify(gameState), 'en');
        assert.equal(await page.locator('#selection-title').innerText(), 'Swordsman');
        await unchangedOnSwitch(page, () => JSON.stringify(gameState), 'zh');
        assert.equal(await page.evaluate(() => gameState.selectedCard), selected);
        await untranslated(page, '.game-container');
    });
    await check('All 21 card names and rules are translated, canonical definitions retained', async () => {
        const definitions = await page.evaluate(() => JSON.stringify({ units: unitDefinitions, spells: spellDefinitions }));
        const failures = [];
        const keys = await page.evaluate(() => Object.keys({ ...unitDefinitions, ...spellDefinitions }));
        for (const key of keys) {
            await page.evaluate(key => renderPlayerSelection({ ...(unitDefinitions[key] || spellDefinitions[key]), key }, null), key);
            await settle(page);
            const values = await page.evaluate(key => ({
                name: document.getElementById('selection-title').textContent,
                desc: document.getElementById('selection-description').textContent,
                original: (unitDefinitions[key] || spellDefinitions[key]).name,
                image: document.getElementById('selection-art').getAttribute('src'),
                originalImage: (unitDefinitions[key] || spellDefinitions[key]).img,
                dataLabels: [...document.querySelectorAll('.selection-stat')].map(el => el.dataset.label)
            }), key);
            if (values.name === values.original || !/[\u4e00-\u9fff]/.test(values.desc)) failures.push(`${key}: ${values.name}, ${values.desc}`);
            assert.equal(values.image, values.originalImage);
            assert.ok(values.dataLabels.every(label => ['AP', 'ATK', 'HP', 'RNG'].includes(label)));
        }
        assert.deepEqual(failures, []);
        assert.equal(await page.evaluate(() => JSON.stringify({ units: unitDefinitions, spells: spellDefinitions })), definitions);
        await page.evaluate(() => renderPlayerExperience());
        await settle(page);
    });
    await check('Full printed art viewer rules and live stats translate', async () => {
        await page.locator('#view-card-art-btn').click(); await settle(page);
        assert.match(await page.locator('#card-art-title').innerText(), /[\u4e00-\u9fff]/);
        assert.match(await page.locator('#card-art-description').innerText(), /[\u4e00-\u9fff]/);
        await untranslated(page, '#card-art-modal');
        await page.keyboard.press('Escape');
    });
    await check('Chinese deployment executes and keeps original card keys', async () => {
        // Closing artwork preserves the card selection; a second click would cancel it.
        if (await page.evaluate(() => gameState.selectedCard !== 'swordsman')) await page.locator('#player1-hand .card').nth(1).click();
        const before = await page.evaluate(() => gameState.players[0].actionPoints);
        await page.locator('.cell[data-row="0"][data-col="1"]').click();
        assert.equal(await page.evaluate(() => gameState.board[0][1].type), 'swordsman');
        assert.equal(await page.evaluate(() => gameState.players[0].actionPoints), before - 2);
    });
    await page.locator('#enter-battle-btn').click();
    await page.locator('.cell[data-row="2"][data-col="3"]').click();
    await page.locator('.cell[data-row="2"][data-col="4"]').hover(); await settle(page);
    await check('Dynamic combat forecast remains translated after updates and language round trips', async () => {
        assert.match(await page.locator('#selection-preview').innerText(), /[\u4e00-\u9fff]/);
        const before = await page.evaluate(() => JSON.stringify(gameState));
        await language(page, 'en');
        await page.locator('.cell[data-row="2"][data-col="4"]').hover(); await settle(page);
        assert.match(await page.locator('#selection-preview').innerText(), /Attack preview/);
        await language(page, 'zh');
        await page.locator('.cell[data-row="2"][data-col="4"]').hover(); await settle(page);
        assert.equal(await page.evaluate(() => JSON.stringify(gameState)), before);
        await untranslated(page, '#selection-panel');
        await capture(page, '02-battle-zh-1600x1000');
        await page.locator('.cell[data-row="2"][data-col="4"]').click();
        await page.waitForFunction(() => !isAnimating);
        await settle(page);
        assert.equal(await page.evaluate(() => qaWolf.health), 1);
        assert.match(await page.locator('#end-turn-btn').innerText(), /[\u4e00-\u9fff]/);
    });
    await check('Boss and developer screens translate dynamically', async () => {
        await page.locator('.battle-menu-dropdown > summary').click();
        await page.locator('#open-boss-panel').click(); await settle(page);
        assert.match(await page.locator('#level-select-panel h1').innerText(), /[\u4e00-\u9fff]/);
        for (let index = 0; index < await page.locator('.boss-item').count(); index++) {
            await page.locator('.boss-item').nth(index).click(); await settle(page);
            await untranslated(page, '#boss-info');
        }
        await untranslated(page, '#level-select-panel');
        await page.locator('#close-boss-panel').click();
        await page.locator('.battle-menu-dropdown > summary').click();
        await page.locator('#battle-tools-btn').click(); await settle(page);
        assert.equal(await page.locator('#debug-tools').evaluate(el => el.open), true);
        await untranslated(page, '#debug-tools');
        await page.evaluate(() => { document.getElementById('debug-tools').open = false; }); await settle(page);
    });
    await check('Hero selection and deck survive Chinese/English round trips', async () => {
        await page.locator('.battle-menu-dropdown > summary').click();
        await page.locator('#battle-menu-btn').click();
        await page.locator('#btn-start-story').click();
        await page.locator('#btn-next-character').click(); await settle(page);
        const before = await page.evaluate(() => JSON.stringify({ idx: currentCharIdx, characters: CHARACTERS, decks: CHARACTER_DECKS }));
        assert.match(await page.locator('#character-job').innerText(), /[\u4e00-\u9fff]/);
        await language(page, 'en');
        assert.equal(await page.locator('#character-job').innerText(), 'Shadow Hunter');
        await language(page, 'zh');
        assert.equal(await page.evaluate(() => JSON.stringify({ idx: currentCharIdx, characters: CHARACTERS, decks: CHARACTER_DECKS })), before);
        await untranslated(page, '#story-select-panel');
        await capture(page, '03-hero-zh-1600x1000');
    });
    await page.locator('#btn-story-start').click(); await adventureFixture(page);
    await check('Adventure event types, resources and descriptions translate without changing checkpoint', async () => {
        assert.match(await page.locator('#preview-card-name').innerText(), /[\u4e00-\u9fff]/);
        assert.match(await page.locator('#preview-gold').innerText(), /[\u4e00-\u9fff]/);
        await unchangedOnSwitch(page, adventureState, 'en');
        await unchangedOnSwitch(page, adventureState, 'zh');
        await untranslated(page, '#battle-preview-root');
        await capture(page, '04-adventure-zh-1600x1000');
    });
    await check('Deck modal translates new dynamic content', async () => {
        await page.locator('#btn-open-card-list').click(); await settle(page);
        assert.match(await page.locator('#preview-card-list-modal h2').innerText(), /[\u4e00-\u9fff]/);
        await untranslated(page, '#preview-card-list-modal');
        await unchangedOnSwitch(page, adventureState, 'en'); await unchangedOnSwitch(page, adventureState, 'zh');
        await page.locator('#btn-close-card-list').click();
    });
    await check('Chinese shop, prices and purchase update dynamically', async () => {
        await page.locator('.event-card-preview').nth(1).click();
        await page.locator('#preview-card-action').click(); await settle(page);
        assert.match(await page.locator('#shop-modal').innerText(), /[\u4e00-\u9fff]/);
        await unchangedOnSwitch(page, adventureState, 'en'); await unchangedOnSwitch(page, adventureState, 'zh');
        const before = await page.evaluate(() => ({ gold: PREVIEW_ROLE.gold, count: PREVIEW_CARDS.length, price: PREVIEW_EVENTS[1].shopItemPrices[PREVIEW_EVENTS[1].shopItems[0]] }));
        await page.locator('#shop-items > div').first().click(); await settle(page);
        assert.equal(await page.evaluate(() => PREVIEW_ROLE.gold), before.gold - before.price);
        assert.equal(await page.evaluate(() => PREVIEW_CARDS.length), before.count + 1);
        await untranslated(page, '#shop-modal');
        await capture(page, '05-shop-zh-1600x1000');
        await page.locator('#btn-close-shop').click();
    });
    await check('Chinese spring action works and checkpoint survives Continue', async () => {
        await page.locator('.event-card-preview').nth(2).click();
        await page.locator('#preview-card-action').click(); await settle(page);
        assert.match(await page.locator('#spring-modal').innerText(), /[\u4e00-\u9fff]/);
        await untranslated(page, '#spring-modal');
        await page.locator('#btn-use-spring').click(); await settle(page);
        const before = await page.evaluate(adventureState);
        await page.locator('#btn-back-main').click();
        await page.locator('#btn-continue').click();
        assert.equal(await page.evaluate(adventureState), before);
    });
    await check('Chinese preference persists through reload and saved adventure restores in English', async () => {
        await page.locator('#btn-back-main').click();
        const checkpoint = await page.evaluate(() => JSON.stringify(window.saveSystem.loadData('gameProgress')));
        assert.notEqual(checkpoint, 'null');
        await page.reload(); await settle(page);
        assert.ok((await page.locator('#btn-experience').innerText()).match(/[\u4e00-\u9fff]/));
        assert.equal(await page.evaluate(() => localStorage.getItem('aow-ui-language')), 'zh');
        await language(page, 'en');
        assert.equal(await page.evaluate(() => JSON.stringify(window.saveSystem.loadData('gameProgress'))), checkpoint);
        await page.locator('#btn-continue').click(); await settle(page);
        assert.equal(await page.locator('#preview-gold').innerText(), await page.evaluate(() => `Gold ${PREVIEW_ROLE.gold}`));
    });
    await check('Save manager localizes labels and status without changing save types or data', async () => {
        await language(page, 'zh');
        const saved = await page.evaluate(() => JSON.stringify(window.saveSystem.loadData('gameProgress')));
        await page.evaluate(() => window.saveManager.show()); await settle(page);
        await page.locator('#export-save-type').selectOption('gameProgress');
        await untranslated(page, '#save-manager-modal');
        assert.match(await page.locator('#btn-export-save').innerText(), /[\u4e00-\u9fff]/);
        assert.match(await page.locator('#save-status').innerText(), /[\u4e00-\u9fff]/);
        const dialog = page.waitForEvent('dialog');
        await page.locator('#btn-validate-saves').click();
        assert.match((await dialog).message(), /[\u4e00-\u9fff]/);
        await language(page, 'en');
        assert.equal(await page.locator('#btn-export-save').innerText(), 'Export Save');
        assert.equal(await page.locator('#export-save-type').inputValue(), 'gameProgress');
        await language(page, 'zh');
        assert.equal(await page.evaluate(() => JSON.stringify(window.saveSystem.loadData('gameProgress'))), saved);
        await capture(page, '07-save-manager-zh-1600x1000');
        await page.locator('#btn-close-save-manager').click();
    });
    await context.close();
}
async function layouts(browser, viewport) {
    const { page, context } = await makePage(browser, viewport);
    const suffix = `${viewport.width}x${viewport.height}`;
    await page.locator('#btn-experience').click(); await battleFixture(page);
    await page.locator('#player1-hand .card').nth(1).click();
    await check(`English and Chinese battle fit ${suffix}`, async () => {
        await capture(page, `06-battle-en-${suffix}`);
        await unchangedOnSwitch(page, () => JSON.stringify(gameState), 'zh');
        await capture(page, `06-battle-zh-${suffix}`);
        if (viewport.width < 500) {
            const clipped = await page.locator('.cell-action.deploy').evaluateAll(markers => markers.filter(marker => {
                const range = document.createRange(); range.selectNodeContents(marker);
                const cell = marker.closest('.cell').getBoundingClientRect();
                return [...range.getClientRects()].some(text => text.left < cell.left - 1 || text.right > cell.right + 1 || text.top < cell.top - 1 || text.bottom > cell.bottom + 1);
            }).map(marker => marker.textContent));
            assert.deepEqual(clipped, [], 'Chinese deployment costs fit every marked mobile tile');
        }
        await page.evaluate(() => { updateUI(); }); await settle(page);
        assert.match(await page.locator('#selection-title').innerText(), /[\u4e00-\u9fff]/);
        for (let n = 0; n < 3; n++) { await language(page, 'en'); await language(page, 'zh'); }
        assert.match(await page.locator('#selection-title').innerText(), /[\u4e00-\u9fff]/);
    });
    await context.close();
}
(async () => {
    fs.mkdirSync(output, { recursive: true });
    const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
    try {
        await gameplay(browser);
        for (const viewport of [{ width: 1600, height: 1000 }, { width: 2559, height: 1423 }, { width: 800, height: 900 }, { width: 390, height: 844 }, { width: 320, height: 844 }]) await layouts(browser, viewport);
    } catch (error) { report.checks.push({ name: 'test harness completed', passed: false, error: error.stack }); }
    finally { await browser.close(); }
    fs.writeFileSync(path.join(output, 'qa-report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    if (report.checks.some(item => !item.passed) || report.pageErrors.length || report.failedRequests.length) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
