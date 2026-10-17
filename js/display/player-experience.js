// Human-facing guidance. Game actions and combat rules remain in game.html.
function getLocalPlayerId() {
    return new URLSearchParams(window.location.search).get('player') === '2' ? 2 : 1;
}

function setPlayerText(id, text) {
    const element = document.getElementById(id);
    if (element && element.textContent !== text) element.textContent = text;
}

let playerNoticeTimer;
function showPlayerNotice(message) {
    const notice = document.getElementById('game-notice');
    if (!notice) return;
    clearTimeout(playerNoticeTimer);
    notice.textContent = message;
    notice.classList.add('visible');
    playerNoticeTimer = setTimeout(() => {
        notice.textContent = '';
        notice.classList.remove('visible');
    }, 4500);
}

function cancelPlayerSelection() {
    gameState.selectedCard = null;
    gameState.selectedSpell = null;
    gameState.selectedUnit = null;
    gameState.healingUnit = null;
    gameState.erosionMode = false;
    gameState.erosionTarget = null;
    moving = 0;
    window.selectedHandCard = null;
    window.inspectedUnit = null;
    window.inspectedCard = null;
    clearHighlights();
    updateUI();
    renderPlayerExperience();
}

function setPlayerAction(id, reason, label) {
    const button = document.getElementById(id);
    if (!button) return;
    button.disabled = Boolean(reason);
    button.title = reason || label;
    button.setAttribute('aria-label', reason ? `${label}：${reason}` : label);
    button.setAttribute('aria-disabled', reason ? 'true' : 'false');
}

function getPlayerSkillReason(unit) {
    if (!unit) return '先选择一个己方单位';
    if (gameState.frozenUnits.some(f => f.id === unit.id)) return '该单位被冻结，本回合无法行动';
    if (unit.hasUsedSkill || unit.hasMoved || unit.hasAttacked) return '该单位本回合已经行动';
    const allies = gameState.units.filter(other => other !== unit && other.player === unit.player);
    const distance = other => Math.abs(other.row - unit.row) + Math.abs(other.col - unit.col);
    if (unit.type === 'lightPriest') return allies.some(other => distance(other) <= unit.attackRange && other.health < other.maxHealth) ? '' : '射程内没有受伤的友军';
    if (unit.type === 'shadowMage') return allies.some(other => distance(other) <= 3) ? '' : '三格内没有可交换的友军';
    if (unit.type === 'minotaur') return allies.some(other => distance(other) === 1) ? '' : '相邻位置没有可获得祝福的友军';
    if (unit.type === 'shadowLord') {
        if (!allies.length) return '需要另一名己方单位作为献祭';
        const targetExists = gameState.units.some(target => {
            if (target.player === unit.player || distance(target) > 1) return false;
            let damage = unit.damage + (unit.bonusDamage || 0);
            const frozen = gameState.frozenUnits.some(f => f.id === target.id);
            if (target.type === 'phaseBeast') damage = Math.ceil(damage / 2);
            if (target.type === 'shieldWarrior' && !frozen && !target.lastTurnHasMoved && !target.lastTurnHasAttacked) damage = Math.max(0, damage - 2);
            if (!frozen) damage = Math.max(0, damage - (target.shield || 0));
            return damage >= target.health;
        });
        return targetExists ? '' : '相邻位置没有可被侵蚀击败的敌人';
    }
    return '该单位没有主动技能；特性会自动生效';
}

function renderPlayerSelection(card, unit) {
    const definition = card ? { ...(unitDefinitions[card.key] || spellDefinitions[card.key]), ...card } : unit && unitDefinitions[unit.type];
    const art = document.getElementById('selection-art');
    const stats = document.getElementById('selection-stats');
    if (!stats || !art) return;
    stats.replaceChildren();
    const hasLocalArt = typeof definition?.img === 'string' && definition.img.startsWith('lib/');
    art.hidden = !hasLocalArt;
    art.onerror = () => { art.hidden = true; };
    if (hasLocalArt) {
        art.src = definition.img;
        art.alt = definition.name;
    } else {
        art.removeAttribute('src');
        art.alt = '';
    }
    setPlayerText('selection-title', definition?.name || '摧毁敌方大本营');
    if (!definition) {
        setPlayerText('selection-description', '点击手牌查看费用和能力，点击场上单位查看状态。选中后，跟随棋盘上的高亮格子行动。');
        return;
    }
    const values = card ? [`费用 ${card.cost} 行动`] : [unit.player === getLocalPlayerId() ? '己方单位' : '敌方单位'];
    if (definition.type !== 'spell') {
        values.push(`攻击 ${unit ? unit.damage + (unit.bonusDamage || 0) : definition.damage}`, `生命 ${unit ? `${unit.health}/${unit.maxHealth}` : definition.health}`, `射程 ${unit ? unit.attackRange : definition.attackRange}`);
        if (unit?.shield) values.push(`护盾 ${unit.shield}`);
        if (unit) values.push(gameState.frozenUnits.some(f => f.id === unit.id) ? '已冻结' : unit.hasAttacked ? '本回合已攻击' : unit.hasMoved ? ['shadowAssassin', 'techFatherRevenge'].includes(unit.type) ? '已移动 · 仍可攻击' : '本回合已移动' : '尚未行动');
    }
    values.forEach(value => {
        const stat = document.createElement('span');
        stat.className = 'selection-stat';
        stat.textContent = value;
        stats.appendChild(stat);
    });
    setPlayerText('selection-description', definition.type === 'spell' ? definition.effect : [definition.desc, ...(definition.skills || [])].filter(Boolean).join('\n'));
}

function renderPlayerExperience() {
    const local = getLocalPlayerId();
    const own = gameState.players[local - 1];
    const opponent = gameState.players[2 - local];
    const current = gameState.players[gameState.currentPlayer - 1];
    const mine = gameState.currentPlayer === local;
    const ai = Boolean(gameState.aiPlayers?.[gameState.currentPlayer - 1]);
    const waiting = gameState.gameOver ? '本局已经结束' : isAnimating ? '正在结算行动，请稍候' : !mine ? '等待对手完成回合' : ai ? '电脑正在为你托管' : '';
    const placement = gameState.phase === 'placement';
    const debug = Boolean(document.getElementById('debug-tools')?.open);
    document.body.dataset.localPlayer = String(local);
    document.body.dataset.turn = mine ? 'mine' : 'opponent';
    document.body.dataset.phase = gameState.phase;
    [1, 2].forEach(id => {
        const panel = document.getElementById(`player${id}-panel`);
        const friendly = id === local;
        if (panel) {
            panel.classList.toggle('friendly', friendly);
            panel.classList.toggle('enemy', !friendly);
            panel.classList.toggle('active', id === gameState.currentPlayer);
            panel.setAttribute('aria-label', friendly ? '你的状态' : '对手的状态');
            const name = friendly ? '你' : id === 2 && window._storyEnemyInfo ? window._storyEnemyInfo.name : id === 2 && window.selectedBoss ? window.selectedBoss.name : gameState.aiPlayers?.[id - 1] ? '电脑' : '对手';
            panel.querySelector('h2').textContent = name;
        }
        const hand = document.getElementById(`player${id}-hand`);
        if (hand) {
            hand.style.display = friendly || debug ? 'flex' : 'none';
            hand.setAttribute('aria-label', friendly ? '你的手牌' : '对手手牌（开发模式）');
            hand.dataset.owner = friendly ? 'mine' : 'opponent';
        }
    });
    // These count nodes belong to fixed player panels even when their visual order flips.
    setPlayerText('player-deck-count', String(gameState.players[0].deck.length));
    setPlayerText('opponent-deck-count', String(gameState.players[1].deck.length));
    const labels = document.querySelectorAll('.board-labels span');
    if (labels.length === 3) {
        labels[0].textContent = local === 1 ? '← 你的大本营' : '← 敌方大本营';
        labels[2].textContent = local === 1 ? '敌方大本营 →' : '你的大本营 →';
    }
    setPlayerText('opponent-hand-summary', `对手手牌 ${opponent.hand.length} 张`);
    setPlayerText('hand-title', `你的手牌 · ${own.hand.length}/7`);
    setPlayerText('hand-hint', waiting || (placement ? '点击选牌，再点击棋盘高亮位置。' : '本阶段只能查看手牌，下回合才能出牌。'));
    setPlayerText('round-label', `第 ${Math.floor(gameState.turnCount / 2) + 1} 轮`);
    setPlayerText('phase-indicator', placement ? '部署阶段' : '战斗阶段');
    setPlayerText('turn-label', gameState.gameOver ? gameState.winner === local ? '你获胜了' : '本局结束' : mine ? ai ? '电脑正在托管' : `你的回合 · ${placement ? '部署' : '行动'}` : '对手正在行动');

    const selectedHandCard = window.selectedHandCard;
    const heldCard = (mine || debug) && (current.hand.includes(selectedHandCard) && selectedHandCard.key === gameState.selectedCard ? selectedHandCard : current.hand.find(card => card.key === gameState.selectedCard));
    const selectedCard = heldCard && { ...(unitDefinitions[heldCard.key] || spellDefinitions[heldCard.key]), ...heldCard };
    const selectedUnit = gameState.selectedUnit;
    const inspectedCard = own.hand.includes(window.inspectedCard) || debug ? window.inspectedCard : null;
    const inspectedUnit = gameState.units.includes(window.inspectedUnit) ? window.inspectedUnit : null;
    const card = selectedCard || (!selectedUnit && inspectedCard);
    const unit = selectedUnit || (!card && inspectedUnit);
    renderPlayerSelection(card, unit);

    const drawReason = waiting || (!placement ? '只能在部署阶段抽牌' : own.hand.length >= 7 ? '手牌已满，最多保留 7 张' : !own.deck.length && !own.graveyard.length ? '牌库和墓地都已空' : own.actionPoints < gameState.drawCost ? `行动点不足：需要 ${gameState.drawCost} 点，当前 ${own.actionPoints} 点` : '');
    setPlayerAction('draw-card-btn', drawReason, `抽牌，花费 ${gameState.drawCost} 行动点`);
    setPlayerAction('enter-battle-btn', waiting || (!placement ? '已经进入战斗阶段' : ''), '部署完成，开始战斗');
    setPlayerAction('end-turn-btn', waiting, '结束回合');
    const skills = { shadowMage: '暗影移动', shadowLord: '暗影侵蚀', minotaur: '野性祝福', lightPriest: '医疗' };
    const skillButton = document.getElementById('skill-btn');
    const skillReason = waiting || (placement ? '只能在战斗阶段使用技能' : getPlayerSkillReason(selectedUnit));
    if (skillButton) {
        skillButton.style.display = selectedUnit && skills[selectedUnit.type] ? '' : 'none';
        skillButton.classList.remove('button-glowing');
        skillButton.textContent = selectedUnit ? skills[selectedUnit.type] || '使用技能' : '使用技能';
    }
    setPlayerAction('skill-btn', skillReason, skillButton?.textContent || '使用技能');
    setPlayerAction('use-spell-btn', waiting || (!placement ? '只能在部署阶段施法' : !selectedCard ? '先选择一张法术牌' : own.actionPoints < selectedCard.cost ? `行动点不足：需要 ${selectedCard.cost} 点` : ''), '施放所选法术');
    const cancel = document.getElementById('cancel-selection-btn');
    if (cancel) cancel.style.display = selectedCard || selectedUnit || inspectedCard || inspectedUnit ? '' : 'none';
    const endTurn = document.getElementById('end-turn-btn');
    if (endTurn) endTurn.classList.toggle('primary', !placement);

    let hint = waiting;
    if (!hint && gameState.healingUnit) hint = '医疗：点击高亮的受伤友军，恢复 2 点生命；按 Esc 取消。';
    else if (!hint && moving === 1) hint = '暗影移动：点击高亮友军交换位置；按 Esc 取消。';
    else if (!hint && gameState.erosionMode) hint = gameState.erosionTarget ? '侵蚀：点击高亮己方单位将其献祭，获得刚才选中的敌军。' : '侵蚀：点击可被击败的高亮敌军，再选择一名己方单位献祭。';
    else if (!hint && selectedCard) {
        if (own.actionPoints < selectedCard.cost) hint = `${selectedCard.name}需要 ${selectedCard.cost} 行动点，当前只有 ${own.actionPoints} 点。可换一张牌，或开始战斗。`;
        else if (selectedCard.type !== 'spell') hint = `已选择${selectedCard.name}：点击绿色格子部署，花费 ${selectedCard.cost} 行动点。`;
        else if (['drawCard', 'shadowCorrosion', 'necromancy', 'frostNova'].includes(selectedCard.key)) hint = `已选择${selectedCard.name}：点击“施放法术”，花费 ${selectedCard.cost} 行动点。`;
        else hint = `已选择${selectedCard.name}：点击高亮的己方单位施放，花费 ${selectedCard.cost} 行动点。`;
    } else if (!hint && selectedUnit) {
        let movable = false;
        let attackable = false;
        for (let row = 0; row < 5; row++) for (let col = 0; col < 7; col++) {
            movable ||= isCellMovable(selectedUnit, row, col);
            attackable ||= isCellAttackable(selectedUnit, row, col);
        }
        hint = movable && attackable ? '点击绿色格子移动，或点击红色目标攻击。普通单位本回合只能选择一种行动。' : attackable ? '点击红色目标攻击。' : movable ? '点击绿色格子移动，向敌方大本营推进。' : '该单位当前没有可移动或攻击的目标。可查看技能，或选择其他单位。';
    } else if (!hint && placement) {
        hint = own.hand.length ? `你有 ${own.actionPoints} 行动点。选择手牌部署单位或施法；准备好后，点击“开始战斗”。` : drawReason ? '暂时无法抽牌。点击“开始战斗”操作场上单位，或结束回合积攒行动点。' : '先抽一张牌，再选择手牌部署到己方区域。抽牌和出牌都需要行动点。';
    } else if (!hint) hint = gameState.units.some(u => u.player === local) ? '点击己方单位查看移动、攻击或技能。行动完成后，点击“结束回合”。' : '你还没有场上单位。结束回合后，在下一次部署阶段出牌。';
    setPlayerText('action-hint', hint);
}

function syncPlayerScreen() {
    const visible = id => {
        const element = document.getElementById(id);
        return element && element.style.display !== 'none';
    };
    document.body.dataset.screen = visible('main-menu') ? 'menu' : visible('story-select-panel') ? 'characters' : visible('battle-preview-root') ? 'adventure' : visible('level-select-panel') ? 'bosses' : 'battle';
}

function returnToPlayerMenu() {
    if (typeof autoPlayInterval !== 'undefined' && autoPlayInterval) stopAutoPlay();
    if (typeof parallelTrainingActive !== 'undefined' && parallelTrainingActive) stopParallelTraining();
    cancelAITurn();
    gameState.aiPlayers = [false, false];
    // A pending animation belongs to the abandoned battle, not to the next screen.
    gameState.board = gameState.board.map(row => row.slice());
    isAnimating = false;
    if (window._storyEnemyBattle && window.saveSystem?.loadData('gameProgress')) document.getElementById('btn-continue').click();
    window._storyEnemyBattle = false;
    window._storyEnemyInfo = null;
    cancelPlayerSelection();
    document.querySelector('.game-container').style.display = 'none';
    ['story-select-panel', 'battle-preview-root', 'level-select-panel', 'winner-modal', 'help-modal'].forEach(id => {
        const element = document.getElementById(id);
        if (element) element.style.display = 'none';
    });
    document.getElementById('main-menu').style.display = 'flex';
    updateContinueButton();
    syncPlayerScreen();
    document.getElementById('btn-experience')?.focus();
}

window.addEventListener('DOMContentLoaded', () => {
    const notice = document.getElementById('game-notice');
    if (notice) document.body.appendChild(notice);
    const help = document.getElementById('help-modal');
    let helpOpener;
    const closeHelp = () => {
        help.style.display = 'none';
        helpOpener?.focus();
    };
    document.getElementById('help-btn')?.addEventListener('click', event => {
        helpOpener = event.currentTarget;
        help.style.display = 'flex';
        document.getElementById('close-help-btn').focus();
    });
    document.getElementById('close-help-btn')?.addEventListener('click', closeHelp);
    help?.addEventListener('click', event => { if (event.target === help) closeHelp(); });
    document.getElementById('cancel-selection-btn')?.addEventListener('click', cancelPlayerSelection);
    document.getElementById('battle-menu-btn')?.addEventListener('click', returnToPlayerMenu);
    document.getElementById('debug-tools')?.addEventListener('toggle', renderPlayerExperience);
    document.addEventListener('keydown', event => {
        if (event.target?.matches?.('input, textarea, select, [contenteditable="true"]')) return;
        if (help && help.style.display !== 'none' && event.key === 'Tab') {
            event.preventDefault();
            document.getElementById('close-help-btn').focus();
        }
        if (event.key !== 'Escape') return;
        if (help && help.style.display !== 'none') closeHelp();
        else if (document.body.dataset.screen === 'battle') cancelPlayerSelection();
    });
    // Existing entrances update their own display styles; only observe screen roots.
    if (typeof MutationObserver !== 'undefined') {
        const observer = new MutationObserver(syncPlayerScreen);
        ['main-menu', 'story-select-panel', 'battle-preview-root', 'level-select-panel'].forEach(id => {
            const element = document.getElementById(id);
            if (element) observer.observe(element, { attributes: true, attributeFilter: ['style'] });
        });
    }
    const multiplayer = document.getElementById('multiplayer-panel');
    if (multiplayer && new URLSearchParams(window.location.search).has('room')) multiplayer.style.display = 'block';
    syncPlayerScreen();
    renderPlayerExperience();
});
