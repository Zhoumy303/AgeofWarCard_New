const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { pathToFileURL } = require('node:url');
const { chromium } = require('C:/Users/Dr.m/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

// The browser context is disposable: these checks never read or write a user's browser profile.
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'output/ui-implementation/2026-10-11-refit');
const report = { checks: [], captures: [], pageErrors: [], failedRequests: [] };
const cell = (page, row, col) => page.locator(`.cell[data-row="${row}"][data-col="${col}"]`);
const state = (page, expression) => page.evaluate(expression);
async function check(name, fn) {
    try { await fn(); report.checks.push({ name, passed: true }); }
    catch (error) { report.checks.push({ name, passed: false, error: error.message }); }
    console.log(`${report.checks.at(-1).passed ? 'PASS' : 'FAIL'} ${name}`);
}
async function ready(page) {
    await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all([...document.images].map(img => img.decode().catch(() => {})));
    });
}
async function capture(page, name) {
    await ready(page);
    const layout = await page.evaluate(() => ({
        viewport: { width: innerWidth, height: innerHeight },
        document: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight },
        scrollY,
        screen: document.body.dataset.screen,
        missingImages: [...document.images].filter(img => img.getAttribute('src') && img.getClientRects().length && img.naturalWidth === 0).map(img => img.getAttribute('src')),
        controls: [...document.querySelectorAll('#game-board, .selection-panel, .hand-section, .action-area, #preview-event-cards, #preview-card-action, #btn-story-start')]
            .filter(el => el.getClientRects().length)
            .map(el => { const b = el.getBoundingClientRect(); return { id: el.id || el.className, x: b.x, y: b.y, width: b.width, height: b.height, bottom: b.bottom }; }),
        boardTiles: document.querySelectorAll('.cell').length,
        deployTiles: document.querySelectorAll('.deployable').length,
        moveTiles: document.querySelectorAll('.movable').length,
        attackTiles: document.querySelectorAll('.attackable').length,
        eventCards: document.querySelectorAll('.event-card-preview').length,
        phase: document.body.dataset.phase
    }));
    if (layout.screen === 'battle') layout.reference = await page.evaluate(() => {
        const stage = document.querySelector('.game-container').getBoundingClientRect();
        const scale = stage.width / 1600;
        const rect = selector => {
            const el = document.querySelector(selector);
            if (!el || !el.getClientRects().length) return null;
            const b = el.getBoundingClientRect();
            return { x:(b.x-stage.x)/scale, y:(b.y-stage.y)/scale, width:b.width/scale, height:b.height/scale };
        };
        return {
            scale, stage: { x:stage.x, y:stage.y, width:stage.width, height:stage.height },
            board:rect('#game-board'), rail:rect('#selection-panel'), unit:rect('.unit'),
            button:rect(document.querySelector('#enter-battle-btn')?.getClientRects().length ? '#enter-battle-btn' : '#end-turn-btn'),
            card:rect('#player1-hand .card'), face:rect('#selection-art'),
            notice:{bounds:rect('#game-notice'),text:document.getElementById('game-notice').textContent},
            statGaps:[...document.querySelectorAll('#player1-hand .card-stats')].map(el=>{
                const items=[...el.querySelectorAll('.card-stat-value')].map(item=>item.getBoundingClientRect());
                return items.slice(1).map((b,i)=>(b.left-items[i].right)/scale);
            }),
            art:[...document.querySelectorAll('.unit-art,#selection-art,.card-art img')].filter(el=>el.getClientRects().length).map(el=>({src:el.getAttribute('src'),width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height})),
            unitClipping:[...document.querySelectorAll('.unit')].map(el=>{
                const b=el.getBoundingClientRect(), c=el.closest('.cell').getBoundingClientRect();
                return b.left<c.left-.5 || b.right>c.right+.5 || b.top<c.top-.5 || b.bottom>c.bottom+.5;
            }),
            baseClipping:[...document.querySelectorAll('.base-health,.base-name,.base-icon')].map(el=>{
                const b=el.getBoundingClientRect(), c=el.closest('.cell').getBoundingClientRect();
                return b.left<c.left-.5 || b.right>c.right+.5 || b.top<c.top-.5 || b.bottom>c.bottom+.5;
            })
        };
    });
    await page.screenshot({ path: path.join(output, name + '.png'), fullPage: true });
    report.captures.push({ name, ...layout });
    assert.equal(layout.missingImages.length, 0, `${name}: missing artwork`);
    assert.ok(layout.document.width <= layout.viewport.width + 2, `${name}: horizontal overflow (${layout.document.width}px > ${layout.viewport.width}px)`);
    if (layout.viewport.width >= 1000 && layout.screen === 'battle') {
        const hand = layout.controls.find(control => control.id === 'hand-section');
        assert.ok(hand.bottom + layout.scrollY <= layout.viewport.height + 2, `${name}: hand extends below desktop viewport (${hand.bottom + layout.scrollY}px > ${layout.viewport.height}px)`);
        const close = (actual, expected, label) => assert.ok(Math.abs(actual-expected)<=1, `${name}: ${label} ${actual} != ${expected}`);
        for (const [element, expected] of Object.entries({board:{x:58,y:186,width:1157,height:544},rail:{x:1265,y:110,width:285,height:668},button:{x:1265,y:795,width:285,height:68}}))
            for (const [key,value] of Object.entries(expected)) close(layout.reference[element][key],value,`${element}.${key}`);
        if (layout.reference.unit) { close(layout.reference.unit.width,116,'unit.width'); close(layout.reference.unit.height,83,'unit.height'); }
        if (layout.reference.face) assert.ok([213,258].some(value=>Math.abs(layout.reference.face.height-value)<=1), `${name}: full card face has design height`);
        assert.ok(layout.reference.art.every(art=>art.width>0&&art.height>0),`${name}: artwork has visible area`);
        assert.ok(layout.reference.unitClipping.every(clipped=>!clipped),`${name}: unit not clipped by cell`);
        assert.ok(layout.reference.baseClipping.every(clipped=>!clipped),`${name}: base label, HP and castle fit cell`);
        assert.ok(layout.reference.statGaps.flat().every(gap=>gap>10),`${name}: hand stat values have clear spacing`);
        if (layout.phase==='battle') {
            assert.ok(layout.reference.notice.bounds,`${name}: turn reminder visible`);
            assert.match(layout.reference.notice.text,/Finish your actions before passing/);
        }
    }
}
async function makePage(browser, viewport) {
    const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
    const page = await context.newPage();
    page.setDefaultTimeout(7000);
    page.on('pageerror', error => report.pageErrors.push({ viewport, message: error.message }));
    page.on('requestfailed', request => report.failedRequests.push({ viewport, url: request.url(), error: request.failure()?.errorText }));
    page.on('dialog', dialog => dialog.accept());
    await page.addInitScript(() => {
        localStorage.clear();
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
    return { page, context };
}
async function battleFixture(page) {
    await page.evaluate(() => {
        cancelAITurn();
        cancelPlayerSelection();
        gameState.aiPlayers = [false, true];
        gameState.board = Array.from({ length: 5 }, () => Array(7).fill(null));
        gameState.units = [];
        gameState.frozenUnits = [];
        gameState.currentPlayer = 1;
        gameState.phase = 'placement';
        gameState.turnCount = 6;
        gameState.drawCount = 0;
        gameState.drawCost = 1;
        gameState.gameOver = false;
        gameState.players.forEach((player, i) => {
            player.health = i ? 5 : 7; player.maxHealth = 7;
            player.actionPoints = i ? 0 : 6; player.maxAp = 6;
            player.hand = []; player.graveyard = []; player.deck = Array.from({length:18},(_,n)=>['shieldWarrior', 'wolf', 'swordsman'][n%3]);
        });
        gameState.players[0].hand = ['shieldWarrior', 'swordsman', 'archer', 'shadowAssassin', 'healPack', 'shadowLord']
            .map(key => ({ ...(unitDefinitions[key] || spellDefinitions[key]), key }));
        gameState.players[1].hand = ['shieldWarrior','wolf','shadowMage','archer'].map(key=>({...unitDefinitions[key],key}));
        window.qaUnit = (type, player, row, col, extra = {}) => {
            const d = unitDefinitions[type];
            const u = { ...d, type, player, row, col, id: Math.random(), maxHealth: d.health,
                hasAttacked: false, hasMoved: false, hasUsedSkill: false,
                lastTurnHasAttacked: false, lastTurnHasMoved: false, bonusDamage: 0, shield: 0, ...extra };
            gameState.units.push(u); gameState.board[row][col] = u; return u;
        };
        window.qaSword = qaUnit('swordsman', 1, 2, 3, { health: 3 });
        qaUnit('shieldWarrior', 1, 2, 1);
        qaUnit('archer', 1, 1, 2);
        qaUnit('shadowAssassin', 1, 3, 2);
        window.qaWolf = qaUnit('wolf', 2, 2, 4);
        window.qaMino = qaUnit('minotaur', 2, 3, 4);
        qaUnit('shadowMage', 2, 1, 5);
        updateUI();
    });
}
async function adventureFixture(page) {
    await page.evaluate(() => {
        const events = createEventDeck();
        PREVIEW_EVENTS = ['Battle', 'Shop', 'Spring'].map(type => ({ ...events.find(event => event.type === type) }));
        EVENT_DECK = events.filter(event => !PREVIEW_EVENTS.some(chosen => chosen.type === event.type)).slice(0, 12);
        selectedEventIdx = 1;
        PREVIEW_ROLE.gold = 80;
        PREVIEW_ROLE.hp = 2;
        renderPreviewRole(); renderPreviewEvents(); showPreviewCardDetail(PREVIEW_EVENTS[1]);
    });
}
async function captures(browser, viewport) {
    const { page, context } = await makePage(browser, viewport);
    const suffix = `${viewport.width}x${viewport.height}`;
    if (!process.argv.includes('--battle-only')) {
        await check(`menu layout ${suffix}`, () => capture(page, `01-menu-${suffix}`));
        await page.locator('#btn-start-story').click();
        await check(`hero layout ${suffix}`, () => capture(page, `02-hero-${suffix}`));
        await page.locator('#btn-story-start').click();
        await adventureFixture(page);
        await check(`adventure layout ${suffix}`, () => capture(page, `05-adventure-${suffix}`));
        await page.locator('#btn-back-main').click();
    }
    await page.locator('#btn-experience').click();
    await battleFixture(page);
    await page.locator('#player1-hand .card').nth(1).click();
    await check(`deploy layout ${suffix}`, () => capture(page, `03-deploy-${suffix}`));
    await page.locator('#enter-battle-btn').click();
    await page.evaluate(()=>{gameState.players[0].actionPoints=2;updateUI();});
    await cell(page, 2, 3).click();
    await check(`attack target remains stable on hover ${suffix}`, async () => {
        const bounds = () => page.locator('#game-board').evaluate(el => {
            const b = el.getBoundingClientRect();
            return { top: b.top + scrollY, width: b.width, height: b.height };
        });
        const before = await bounds();
        await cell(page, 2, 4).hover();
        assert.ok((await page.locator('#selection-preview').textContent()).trim());
        assert.deepEqual(await bounds(), before, 'preview does not shift or resize the board');
    });
    await check(`attack layout ${suffix}`, () => capture(page, `04-attack-${suffix}`));
    await context.close();
}
async function gameplay(browser) {
    const { page, context } = await makePage(browser, { width: 1600, height: 1000 });
    await check('initial menu and disabled continue', async () => {
        assert.ok(await page.locator('#main-menu').isVisible());
        assert.ok(await page.locator('#btn-continue').isDisabled());
        assert.equal(await page.locator('.cell').count(), 35);
    });
    await page.locator('#btn-experience').click();
    await battleFixture(page);
    await check('draw spends AP and adds one card', async () => {
        const before = await state(page, '({ap:gameState.players[0].actionPoints,hand:gameState.players[0].hand.length})');
        await page.locator('#draw-card-btn').click();
        assert.equal(await state(page, 'gameState.players[0].actionPoints'), before.ap - 1);
        assert.equal(await state(page, 'gameState.players[0].hand.length'), before.hand + 1);
    });
    await check('hand uses pure art and details use full face', async () => {
        await page.locator('#player1-hand .card').nth(1).click();
        assert.equal(await state(page, `document.querySelector('#player1-hand .card:nth-child(2) img').getAttribute('src')`), await state(page, 'unitDefinitions.swordsman.handImg'));
        assert.equal(await page.locator('#selection-art').getAttribute('src'), await state(page, 'unitDefinitions.swordsman.img'));
        assert.equal(await page.locator('#selection-title').textContent(), 'Swordsman');
    });
    await check('full card viewer opens and Escape closes it', async () => {
        await page.locator('#view-card-art-btn').click();
        assert.ok(await page.locator('#card-art-modal').isVisible());
        assert.equal(await page.locator('#card-art-image').getAttribute('src'), await state(page, 'new URL(unitDefinitions.swordsman.img,location.href).href'));
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('#card-art-modal').isVisible(), false);
    });
    await check('all card details preserve artwork size and readable sections', async () => {
        const keys = await state(page, 'Object.keys({...unitDefinitions,...spellDefinitions})');
        report.detailCards = [];
        const failures = [];
        try {
            for (const key of keys) {
                await page.evaluate(key => renderPlayerSelection({...(unitDefinitions[key] || spellDefinitions[key]),key},null), key);
                await ready(page);
                const detail = await page.evaluate(() => {
                    const bounds = selector => { const el=document.querySelector(selector); if (!el?.getClientRects().length) return null; const b=el.getBoundingClientRect(); return {top:b.top,bottom:b.bottom,height:b.height,width:b.width}; };
                    const art=document.getElementById('selection-art');
                    return { art:bounds('#selection-art'), loaded:!art.getClientRects().length || art.naturalWidth>0, stats:bounds('#selection-stats'), description:bounds('#selection-description'), status:bounds('#selection-status'), footer:bounds('.selection-footer') };
                });
                report.detailCards.push({key,...detail});
                if (!detail.loaded) failures.push(`${key}: artwork not loaded`);
                if (detail.art && detail.art.height!==258) failures.push(`${key}: full card art shrinks to ${detail.art.height}`);
                if (detail.art && detail.art.bottom>detail.stats.top+1) failures.push(`${key}: art overlaps live stats`);
                if (detail.stats.bottom>detail.description.top+1) failures.push(`${key}: live stats overlap ability text`);
                if (detail.description.bottom>detail.status.top+1) failures.push(`${key}: ability text overlaps state`);
                if (detail.status.bottom>detail.footer.top+1) failures.push(`${key}: state overlaps card footer`);
            }
            assert.equal(failures.length,0,failures.join('; '));
        } finally { await page.evaluate(()=>renderPlayerExperience()); }
    });
    await check('resizing fits the battle canvas without changing the match', async () => {
        const before = await state(page,'JSON.stringify(gameState)');
        try {
            await page.setViewportSize({width:1920,height:1080});
            await page.waitForFunction(()=>Math.abs(document.querySelector('.game-container').getBoundingClientRect().width-1728)<1);
            const desktop = await page.locator('.game-container').boundingBox();
            assert.ok(Math.abs(desktop.x-96)<1);
            assert.ok(Math.abs(desktop.height-1080)<1);
            await page.setViewportSize({width:390,height:844});
            await page.waitForFunction(()=>getComputedStyle(document.querySelector('.game-container')).position!=='fixed');
            assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=390));
            assert.equal(await state(page,'JSON.stringify(gameState)'),before);
        } finally {
            await page.setViewportSize({width:1600,height:1000});
            await page.waitForFunction(()=>Math.abs(document.querySelector('.game-container').getBoundingClientRect().width-1600)<1);
        }
    });
    if (process.argv.includes('--battle-only')) { await context.close(); return; }
    await check('deployment highlights only empty friendly starting columns and spends cost', async () => {
        // Viewer Escape also cancels the selection; selecting again restores deploy targets.
        if (!await state(page, 'gameState.selectedCard')) await page.locator('#player1-hand .card').nth(1).click();
        const positions = await page.locator('.deployable').evaluateAll(cells => cells.map(c => [Number(c.dataset.row), Number(c.dataset.col)]));
        assert.ok(positions.length);
        assert.ok(positions.every(([r, c]) => c < 2 && !(r === 2 && c === 0)));
        const before = await state(page, '({ap:gameState.players[0].actionPoints,hand:gameState.players[0].hand.length})');
        await cell(page, 0, 1).click();
        assert.equal(await state(page, 'gameState.board[0][1].type'), 'swordsman');
        assert.equal(await state(page, 'gameState.players[0].actionPoints'), before.ap - 2);
        assert.equal(await state(page, 'gameState.players[0].hand.length'), before.hand - 1);
    });
    await check('battle phase blocks card play, exposes move and attack choices', async () => {
        await page.locator('#enter-battle-btn').click();
        assert.equal(await state(page, 'gameState.phase'), 'battle');
        assert.equal(await page.locator('#enter-battle-btn').isVisible(), false);
        assert.ok(await page.locator('#end-turn-btn').isVisible());
        assert.ok(await page.locator('#draw-card-btn').isDisabled());
        const before = await state(page, 'JSON.stringify(gameState.players[0].hand)');
        await page.locator('#player1-hand .card').first().click();
        assert.equal(await state(page, 'gameState.selectedCard'), null);
        assert.equal(await state(page, 'JSON.stringify(gameState.players[0].hand)'), before);
        await cell(page, 2, 3).click();
        assert.ok(await page.locator('.movable').count());
        assert.ok(await page.locator('.attackable').count());
    });
    await check('attack hover preview agrees with attack and splash outcome', async () => {
        const before = await state(page, '({wolf:qaWolf.health,mino:qaMino.health})');
        await cell(page, 2, 4).hover();
        assert.ok((await page.locator('#selection-preview').textContent()).trim(), 'hover renders attack preview');
        assert.match(await page.locator('#selection-preview').textContent(), /4 → 1 HP/);
        await cell(page, 2, 4).click();
        await page.waitForFunction(() => !isAnimating);
        assert.equal(await state(page, 'qaWolf.health'), before.wolf - 3);
        assert.equal(await state(page, 'qaMino.health'), before.mino - 1);
        assert.equal(await state(page, 'qaSword.hasAttacked'), true);
    });
    await check('move spends unit action and updates board location', async () => {
        await cell(page, 0, 1).click();
        await cell(page, 0, 2).click();
        await page.waitForFunction(() => !isAnimating);
        assert.equal(await state(page, 'gameState.board[0][2].hasMoved'), true);
        assert.equal(await state(page, 'gameState.board[0][1]'), null);
    });
    await check('End turn lets the computer act and returns control', async () => {
        const turn = await state(page, 'gameState.turnCount');
        await page.locator('#end-turn-btn').click();
        await page.waitForFunction(old => gameState.turnCount >= old + 2 && gameState.currentPlayer === 1 && !isAnimating, turn, { timeout: 45000 });
        assert.equal(await state(page, 'gameState.phase'), 'placement');
        assert.ok(await page.locator('#enter-battle-btn').isVisible());
    });
    await check('help opens and closes, then menu navigation works', async () => {
        await page.locator('#help-btn').click();
        assert.ok(await page.locator('#help-modal').isVisible());
        await page.locator('#close-help-btn').click();
        assert.equal(await page.locator('#help-modal').isVisible(), false);
        await page.locator('.battle-menu-dropdown > summary').click();
        await page.locator('#battle-menu-btn').click();
        assert.ok(await page.locator('#main-menu').isVisible());
    });
    await page.locator('#btn-start-story').click();
    await check('hero choice selects the correct starter deck', async () => {
        await page.locator('#btn-next-character').click();
        assert.equal(await state(page, 'currentCharIdx'), 1);
        await page.locator('#btn-story-start').click();
        assert.deepEqual(await state(page, 'PREVIEW_CARDS.map(card=>card.key)'), ['shadowAssassin','shadowAssassin','shadowAssassin','shadowMage','resetCard']);
        assert.ok(await page.locator('#battle-preview-root').isVisible());
        assert.equal(await page.locator('.event-card-preview').count(), 3);
    });
    await adventureFixture(page);
    await check('deck and items dialog opens and closes', async () => {
        await page.locator('#btn-open-card-list').click();
        assert.ok(await page.locator('#preview-card-list-modal').isVisible());
        assert.equal(await page.locator('#preview-card-list-content img').count(), 5);
        await page.locator('#btn-close-card-list').click();
        assert.equal(await page.locator('#preview-card-list-modal').isVisible(), false);
    });
    await check('shop purchases once with the displayed gold price', async () => {
        await page.locator('.event-card-preview').nth(1).click();
        await page.locator('#preview-card-action').click();
        assert.ok(await page.locator('#shop-modal').isVisible());
        const before = await state(page, '({gold:PREVIEW_ROLE.gold,count:PREVIEW_CARDS.length,price:PREVIEW_EVENTS[1].shopItemPrices[PREVIEW_EVENTS[1].shopItems[0]]})');
        await page.locator('#shop-items > div').first().click();
        assert.equal(await state(page, 'PREVIEW_ROLE.gold'), before.gold - before.price);
        assert.equal(await state(page, 'PREVIEW_CARDS.length'), before.count + 1);
        assert.equal(await page.locator('#shop-items > div').count(), 2);
        await capture(page, '06-shop-1600x1000');
        await page.locator('#btn-close-shop').click();
        assert.equal(await page.locator('#shop-modal').isVisible(), false);
    });
    await check('Spring heals by its stated amount and advances that event', async () => {
        await page.locator('.event-card-preview').nth(2).click();
        const before = await state(page, '({hp:PREVIEW_ROLE.hp,max:PREVIEW_ROLE.maxHp,deck:EVENT_DECK.length})');
        await page.locator('#preview-card-action').click();
        assert.ok(await page.locator('#spring-modal').isVisible());
        await capture(page, '07-spring-1600x1000');
        await page.locator('#btn-use-spring').click();
        assert.equal(await state(page, 'PREVIEW_ROLE.hp'), Math.min(before.max, before.hp + Math.ceil(before.max * .3)));
        assert.equal(await state(page, 'EVENT_DECK.length'), before.deck - 1);
        assert.equal(await page.locator('#spring-modal').isVisible(), false);
    });
    await check('Continue Adventure restores the saved event checkpoint', async () => {
        const before = await state(page, 'JSON.stringify({role:PREVIEW_ROLE,cards:PREVIEW_CARDS.map(c=>c.key),events:PREVIEW_EVENTS,deck:EVENT_DECK})');
        await page.locator('#btn-back-main').click();
        assert.ok(await page.locator('#btn-continue').isEnabled());
        await page.locator('#btn-continue').click();
        assert.equal(await state(page, 'JSON.stringify({role:PREVIEW_ROLE,cards:PREVIEW_CARDS.map(c=>c.key),events:PREVIEW_EVENTS,deck:EVENT_DECK})'), before);
        assert.ok(await page.locator('#battle-preview-root').isVisible());
    });
    await context.close();
}
(async () => {
    fs.mkdirSync(output, { recursive: true });
    await check('Chinese originals remain unchanged', async () => {
        const hashes = JSON.parse(fs.readFileSync(path.join(root, 'tests/english-original-hashes.json'), 'utf8'));
        for (const [file, hash] of Object.entries(hashes)) assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex').toUpperCase(), hash, file);
    });
    const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
    try {
        if (!process.argv.includes('--captures-only')) await gameplay(browser);
        for (const viewport of [{width:1600,height:1000}, {width:1920,height:1080}, {width:2559,height:1423}, {width:1280,height:800}, {width:390,height:844}]) await captures(browser, viewport);
    } catch (error) { report.checks.push({ name: 'test harness completed', passed: false, error: error.stack }); }
    finally { await browser.close(); }
    fs.writeFileSync(path.join(output, 'qa-report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ checks: report.checks, pageErrors: report.pageErrors, failedRequests: report.failedRequests, captures: report.captures.length }, null, 2));
    if (report.checks.some(check => !check.passed) || report.pageErrors.length || report.failedRequests.length) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
