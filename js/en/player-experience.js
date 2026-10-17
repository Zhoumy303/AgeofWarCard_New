// Human-facing guidance. Game actions and combat rules remain in game.js.
function getLocalPlayerId() {
    return new URLSearchParams(window.location.search).get('player') === '2' ? 2 : 1;
}

function setPlayerText(id, text) {
    const element = document.getElementById(id);
    if (element && element.textContent !== text) element.textContent = text;
}

let playerNoticeTimer;
let closeCardArtwork;
function renderPlayerTurnReminder() {
    const notice = document.getElementById('game-notice');
    if (!notice || notice.classList.contains('visible')) return;
    const ready = document.body.dataset.screen === 'battle' && gameState.phase === 'battle' && canHumanAct() && !gameState.gameOver && !isAnimating;
    notice.textContent = ready ? 'Finish your actions before passing.' : '';
    notice.classList.toggle('turn-reminder', ready);
}

function showPlayerNotice(message) {
    const notice = document.getElementById('game-notice');
    if (!notice) return;
    clearTimeout(playerNoticeTimer);
    notice.textContent = message;
    notice.classList.remove('turn-reminder');
    notice.classList.add('visible');
    playerNoticeTimer = setTimeout(() => {
        notice.textContent = '';
        notice.classList.remove('visible');
        renderPlayerTurnReminder();
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
    button.setAttribute('aria-label', reason ? `${label}: ${reason}` : label);
    button.setAttribute('aria-disabled', reason ? 'true' : 'false');
}

function getPlayerSkillReason(unit) {
    if (!unit) return 'Select one of your units first';
    if (gameState.frozenUnits.some(f => f.id === unit.id)) return 'This unit is frozen and cannot act this turn';
    if (unit.hasUsedSkill || unit.hasMoved || unit.hasAttacked) return 'This unit has already acted this turn';
    const allies = gameState.units.filter(other => other !== unit && other.player === unit.player);
    const distance = other => Math.abs(other.row - unit.row) + Math.abs(other.col - unit.col);
    if (unit.type === 'lightPriest') return allies.some(other => distance(other) <= unit.attackRange && other.health < other.maxHealth) ? '' : 'No injured allies in range';
    if (unit.type === 'shadowMage') return allies.some(other => distance(other) <= 3) ? '' : 'No allies within 3 tiles to swap with';
    if (unit.type === 'minotaur') return allies.some(other => distance(other) === 1) ? '' : 'No adjacent allies to bless';
    if (unit.type === 'shadowLord') {
        if (!allies.length) return 'Requires another friendly unit to sacrifice';
        const targetExists = gameState.units.some(target => {
            if (target.player === unit.player || distance(target) > 1) return false;
            let damage = unit.damage + (unit.bonusDamage || 0);
            const frozen = gameState.frozenUnits.some(f => f.id === target.id);
            if (target.type === 'phaseBeast') damage = Math.ceil(damage / 2);
            if (target.type === 'shieldWarrior' && !frozen && !target.lastTurnHasMoved && !target.lastTurnHasAttacked) damage = Math.max(0, damage - 2);
            if (!frozen) damage = Math.max(0, damage - (target.shield || 0));
            return damage >= target.health;
        });
        return targetExists ? '' : 'No adjacent enemies that Erosion can defeat';
    }
    return 'This unit has no active skill; its traits apply automatically';
}

// A read-only forecast of the direct hit; never roll RNG or apply combat effects.
function getPlayerAttackPreview(attacker, row, col) {
    if (!attacker || attacker.player !== gameState.currentPlayer || !canHumanAct() || gameState.gameOver || isAnimating || gameState.phase !== 'battle' || gameState.healingUnit || moving === 1 || gameState.erosionMode || !isCellAttackable(attacker, row, col)) return null;
    const target = gameState.board[row][col];
    const base = !target && row === 2 && (col === 0 || col === 6);
    if (!target && !base) return null;
    const defender = base ? gameState.players[col === 0 ? 0 : 1] : target;
    const notes = [];
    const frozen = target && gameState.frozenUnits.some(f => f.id === target.id);
    let rawDamage = attacker.damage + (attacker.bonusDamage || 0);
    let charge = 0;
    if (!base && attacker.shadowMoveBonus) { rawDamage *= 2; notes.push('Shadow Shift doubles this hit.'); }
    if (!base && attacker.type === 'wolf') {
        const pushRow = attacker.row + (row - attacker.row) * 2;
        const pushCol = attacker.col + (col - attacker.col) * 2;
        if (pushRow >= 0 && pushRow < 5 && pushCol >= 0 && pushCol < 7 && !gameState.board[pushRow][pushCol] && !(pushRow === 2 && (pushCol === 0 || pushCol === 6))) {
            charge = 1;
            notes.push(`Wild Charge pushes the target to ${String.fromCharCode(65 + pushCol)}${pushRow + 1}.`);
        }
    }
    const mitigate = damage => {
        if (target?.type === 'phaseBeast') damage = Math.ceil(damage / 2);
        if (target?.type === 'shieldWarrior' && !frozen && !target.lastTurnHasMoved && !target.lastTurnHasAttacked) damage = Math.max(0, damage - 2);
        return Math.max(0, damage - (base || !frozen ? defender.shield || 0 : 0));
    };
    const normal = mitigate(rawDamage + charge);
    const critical = attacker.type === 'archer' ? mitigate(rawDamage * 2 + charge) : normal;
    const afterHit = damage => Math.max(0, defender.health - damage);
    const health = critical === normal ? `${defender.health} → ${afterHit(normal)} HP` : `${defender.health} → ${afterHit(normal)} HP (${afterHit(critical)} on critical)`;
    if (attacker.type === 'archer') notes.push('Precise Shot: 1 in 6 chance of a critical hit.');
    if (!base && attacker.type === 'swordsman') {
        const splash = gameState.units.filter(other => other !== target && other.player !== attacker.player && Math.abs(other.row - row) + Math.abs(other.col - col) === 1);
        if (splash.length) notes.push(`Splash: ${splash.map(other => unitDefinitions[other.type].name).join(', ')} receive a 1-damage hit before their defenses.`);
    }
    if (!base && attacker.type === 'iceDragon') notes.push(gameState.players[attacker.player - 1].actionPoints > 0 ? 'A surviving target is frozen; costs 1 AP.' : 'No AP available to freeze the target.');
    if (!base && (afterHit(normal) === 0 || afterHit(critical) === 0)) notes.push('HP after the direct hit. Death and revival traits resolve afterward.');
    return { name: base ? 'Enemy base' : unitDefinitions[target.type].name, health, damage: critical === normal ? String(normal) : `${normal}/${critical}`, notes: notes.join(' ') };
}

function renderPlayerAttackPreview(row, col) {
    const panel = document.getElementById('selection-preview');
    if (!panel) return;
    const preview = row === undefined ? null : getPlayerAttackPreview(gameState.selectedUnit, row, col);
    panel.hidden = !preview;
    panel.replaceChildren();
    if (!preview) return;
    const heading = document.createElement('strong');
    heading.textContent = 'Attack preview';
    const result = document.createElement('p');
    result.textContent = `${preview.name} · ${preview.health}`;
    const effects = document.createElement('small');
    effects.textContent = preview.notes || `Deal ${preview.damage} damage. No AP cost.`;
    panel.append(heading, result, effects);
}

function renderPlayerSelection(card, unit) {
    const currentDefinition = unitDefinitions[card?.key || unit?.type] || spellDefinitions[card?.key];
    const definition = card ? { ...currentDefinition, ...card, img: currentDefinition?.img || card.img } : currentDefinition;
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
    const artworkButton = document.getElementById('view-card-art-btn');
    if (artworkButton) {
        artworkButton.hidden = !definition?.img?.startsWith('lib/img/cards-en/');
        artworkButton.setAttribute('aria-label', `View ${definition?.name || 'selected'} card artwork`);
    }
    setPlayerText('selection-title', definition?.name || 'Destroy the enemy base');
    if (!definition) {
        setPlayerText('selection-kind', 'Tactical details');
        setPlayerText('selection-status', 'Choose a card or a unit');
        setPlayerText('selection-description', 'Select a card to see its cost and abilities, or a unit to see its status. Highlighted tiles show your available actions.');
        document.getElementById('selection-description').dataset.fullRules = '';
        return;
    }
    const kind = definition.type === 'spell' ? 'Spell' : `${({ human: 'Human', shadow: 'Shadow', beast: 'Beast', undead: 'Undead' })[definition.type] || 'Special'} · Unit`;
    setPlayerText('selection-kind', kind);
    const values = [];
    if (definition.type !== 'spell') {
        values.push([unit ? unit.damage + (unit.bonusDamage || 0) : definition.damage, 'ATK'], [unit ? `${unit.health}/${unit.maxHealth}` : definition.health, 'HP'], [unit ? unit.attackRange : definition.attackRange, 'RNG']);
    }
    values.push([unit ? '—' : definition.cost, 'AP']);
    values.forEach(([value, label]) => {
        const stat = document.createElement('span');
        stat.className = 'selection-stat';
        stat.dataset.label = label;
        const number = document.createElement('strong');
        number.textContent = value;
        const caption = document.createElement('small');
        caption.textContent = label;
        stat.append(number, caption);
        stats.appendChild(stat);
    });
    let state = '', stateClass = 'ready';
    if (unit) {
        const frozen = gameState.frozenUnits.some(f => f.id === unit.id);
        const exhausted = unit.hasAttacked || (unit.hasMoved && !['shadowAssassin', 'techFatherRevenge'].includes(unit.type));
        stateClass = frozen ? 'frozen' : exhausted ? 'spent' : 'ready';
        state = `${unit.player === getLocalPlayerId() ? '' : 'Enemy · '}${frozen ? 'Frozen · Cannot act this turn' : exhausted ? 'Spent this turn' : unit.hasMoved ? '✓ Moved · Can still attack' : '✓ Ready · Move or attack'}`;
        if (unit.shield) state += ` · Shield ${unit.shield}`;
        if (unit.shadowMoveBonus) state += ' · Next unit hit ×2';
        if (unit.hasUsedSkill) state += ' · Skill used';
        if (unit.player === getLocalPlayerId() && gameState.currentPlayer === unit.player && !frozen && !exhausted) state += ' · No AP cost';
    } else if (gameState.phase !== 'placement' || gameState.currentPlayer !== getLocalPlayerId()) {
        state = 'Inspect only · Play cards during your Deploy phase';
        stateClass = 'waiting';
    } else if (definition.cost > gameState.players[getLocalPlayerId() - 1].actionPoints) {
        state = `Requires ${definition.cost} AP · Available ${gameState.players[getLocalPlayerId() - 1].actionPoints}`;
        stateClass = 'unaffordable';
    } else state = definition.type === 'spell' ? 'Choose a highlighted target, or cast the spell below' : 'Choose a marked space to deploy';
    setPlayerText('selection-status', state);
    const status = document.getElementById('selection-status');
    if (status) status.className = `selection-context ${stateClass}`;
    const description = document.getElementById('selection-description');
    description.replaceChildren();
    description.dataset.fullRules = definition.type === 'spell' ? definition.effect : [definition.desc, ...(definition.skills || [])].filter(Boolean).join('\n');
    const rules = definition.type === 'spell' ? [`Effect — ${definition.effect}`] : definition.skills?.length ? definition.skills : [definition.desc];
    rules.forEach(rule => {
        const ability = document.createElement('section');
        ability.className = 'selection-ability';
        const parts = rule.match(/^(?:(?:Trait|Skill):\s*)?([^—]+)\s*—\s*(.*)$/);
        if (parts) {
            const title = document.createElement('h3');
            title.textContent = parts[1].trim();
            ability.appendChild(title);
        }
        const text = document.createElement('p');
        text.textContent = parts ? parts[2] : rule;
        ability.appendChild(text);
        description.appendChild(ability);
    });
}

function renderPlayerExperience() {
    const local = getLocalPlayerId();
    const own = gameState.players[local - 1];
    const opponent = gameState.players[2 - local];
    const current = gameState.players[gameState.currentPlayer - 1];
    const mine = gameState.currentPlayer === local;
    const ai = Boolean(gameState.aiPlayers?.[gameState.currentPlayer - 1]);
    const waiting = gameState.gameOver ? 'This battle has ended' : isAnimating ? 'Resolving action…' : !mine ? 'Waiting for your opponent' : ai ? 'Computer controls your turn' : '';
    const placement = gameState.phase === 'placement';
    const debug = Boolean(document.getElementById('debug-tools')?.open);
    document.body.dataset.localPlayer = String(local);
    document.body.dataset.turn = mine ? 'mine' : 'opponent';
    document.body.dataset.phase = gameState.phase;
    setPlayerText('local-ap', String(own.actionPoints));
    setPlayerText('local-ap-cap', String(own.maxAp || 6));
    setPlayerText('local-deck-count', String(own.deck.length));
    ['deploy', 'battle'].forEach(phase => {
        const marker = document.getElementById(`phase-${phase}`);
        if (marker) {
            marker.classList.toggle('active', phase === (placement ? 'deploy' : 'battle'));
            marker.classList.toggle('done', phase === 'deploy' && !placement);
            if (phase === (placement ? 'deploy' : 'battle')) marker.setAttribute('aria-current', 'step');
            else marker.removeAttribute('aria-current');
        }
    });
    [1, 2].forEach(id => {
        const panel = document.getElementById(`player${id}-panel`);
        const friendly = id === local;
        if (panel) {
            panel.classList.toggle('friendly', friendly);
            panel.classList.toggle('enemy', !friendly);
            panel.classList.toggle('active', id === gameState.currentPlayer);
            panel.setAttribute('aria-label', friendly ? 'Your status' : 'Opponent status');
            const name = friendly ? 'You' : id === 2 && window._storyEnemyInfo ? window._storyEnemyInfo.name : id === 2 && window.selectedBoss ? window.selectedBoss.name : gameState.aiPlayers?.[id - 1] ? 'Computer' : 'Opponent';
            panel.querySelector('h2').textContent = name;
        }
        const revenge = id === 2 && window.selectedBoss?.type === 'techFather' && gameState.units.find(unit => unit.type === 'techFatherRevenge' && unit.player === 2);
        setPlayerText(`player${id}-health-max`, String(revenge ? revenge.maxHealth : gameState.players[id - 1].maxHealth));
        const portrait = document.getElementById(`player${id}-portrait`);
        if (portrait) {
            portrait.src = id === 1 && window._storyEnemyBattle && typeof PREVIEW_ROLE !== 'undefined' ? PREVIEW_ROLE.img : id === 2 ? window._storyEnemyInfo?.portrait || window.selectedBoss?.portrait || 'lib/img/enemies/shadow_hunters.webp' : 'lib/img/player/fortress_guardian.webp';
            portrait.alt = panel?.querySelector('h2')?.textContent || (friendly ? 'You' : 'Opponent');
        }
        const hand = document.getElementById(`player${id}-hand`);
        if (hand) {
            hand.style.display = friendly || debug ? 'flex' : 'none';
            hand.setAttribute('aria-label', friendly ? 'Your hand' : 'Opponent hand (debug mode)');
            hand.dataset.owner = friendly ? 'mine' : 'opponent';
        }
    });
    // These count nodes belong to fixed player panels even when their visual order flips.
    setPlayerText('player-deck-count', String(gameState.players[0].deck.length));
    setPlayerText('opponent-deck-count', String(gameState.players[1].deck.length));
    const labels = document.querySelectorAll('.board-labels span');
    if (labels.length === 3) {
        labels[0].textContent = local === 1 ? '← Your base' : '← Enemy base';
        labels[2].textContent = local === 1 ? 'Enemy base →' : 'Your base →';
    }
    setPlayerText('opponent-hand-summary', `Opponent hand: ${opponent.hand.length}`);
    setPlayerText('hand-title', `Your hand · ${own.hand.length}/7`);
    setPlayerText('hand-hint', waiting || (placement ? 'Select a card, then a highlighted tile.' : 'Inspect only'));
    setPlayerText('round-label', `Round ${String(Math.floor(gameState.turnCount / 2) + 1).padStart(2, '0')}`);
    setPlayerText('phase-indicator', placement ? 'Deploy phase' : 'Battle phase');
    setPlayerText('turn-label', gameState.gameOver ? gameState.winner === local ? 'Victory' : 'Battle over' : mine ? ai ? 'Computer control' : 'Your turn' : 'Opponent turn');

    const selectedHandCard = window.selectedHandCard;
    const heldCard = (mine || debug) && (current.hand.includes(selectedHandCard) && selectedHandCard.key === gameState.selectedCard ? selectedHandCard : current.hand.find(card => card.key === gameState.selectedCard));
    const selectedCard = heldCard && { ...(unitDefinitions[heldCard.key] || spellDefinitions[heldCard.key]), ...heldCard };
    const selectedUnit = gameState.selectedUnit;
    const inspectedCard = own.hand.includes(window.inspectedCard) || debug ? window.inspectedCard : null;
    const inspectedUnit = gameState.units.includes(window.inspectedUnit) ? window.inspectedUnit : null;
    const card = selectedCard || (!selectedUnit && inspectedCard);
    const unit = selectedUnit || (!card && inspectedUnit);
    renderPlayerSelection(card, unit);
    renderPlayerAttackPreview();

    const drawReason = waiting || (!placement ? 'Draw cards during the Deploy phase' : own.hand.length >= 7 ? 'Your hand is full (7 cards maximum)' : !own.deck.length && !own.graveyard.length ? 'Your deck and graveyard are empty' : own.actionPoints < gameState.drawCost ? `Not enough AP: need ${gameState.drawCost}, have ${own.actionPoints}` : '');
    setPlayerAction('draw-card-btn', drawReason, `Draw a card for ${gameState.drawCost} AP`);
    setPlayerAction('enter-battle-btn', waiting || (!placement ? 'Already in the Battle phase' : ''), 'Finish deploying and start battle');
    const endTurnLabel = placement ? 'End turn without battle' : 'End turn';
    setPlayerText('end-turn-btn', endTurnLabel);
    setPlayerAction('end-turn-btn', waiting, endTurnLabel);
    const skills = { shadowMage: 'Shadow Shift', shadowLord: 'Erosion', minotaur: 'Wild Blessing', lightPriest: 'Heal' };
    const skillButton = document.getElementById('skill-btn');
    const skillReason = waiting || (placement ? 'Use skills during the Battle phase' : getPlayerSkillReason(selectedUnit));
    if (skillButton) {
        skillButton.style.display = selectedUnit && skills[selectedUnit.type] ? '' : 'none';
        skillButton.classList.remove('button-glowing');
        skillButton.textContent = selectedUnit ? skills[selectedUnit.type] || 'Use skill' : 'Use skill';
    }
    setPlayerAction('skill-btn', skillReason, skillButton?.textContent || 'Use skill');
    setPlayerAction('use-spell-btn', waiting || (!placement ? 'Cast spells during the Deploy phase' : !selectedCard ? 'Select a spell card first' : own.actionPoints < selectedCard.cost ? `Not enough AP: need ${selectedCard.cost}` : ''), 'Cast selected spell');
    const cancel = document.getElementById('cancel-selection-btn');
    if (cancel) cancel.style.display = selectedCard || selectedUnit || inspectedCard || inspectedUnit ? '' : 'none';
    const endTurn = document.getElementById('end-turn-btn');
    if (endTurn) endTurn.classList.toggle('primary', !placement);
    setPlayerText('enter-battle-btn', 'Start battle');

    let hint = waiting;
    if (!hint && gameState.healingUnit) hint = 'Heal: select a highlighted injured ally to restore 2 HP. Esc to cancel.';
    else if (!hint && moving === 1) hint = 'Shadow Shift: select a highlighted ally to swap positions. Esc to cancel.';
    else if (!hint && gameState.erosionMode) hint = gameState.erosionTarget ? 'Erosion: sacrifice a highlighted ally to recruit the chosen enemy.' : 'Erosion: select a highlighted enemy you can defeat, then an ally to sacrifice.';
    else if (!hint && selectedCard) {
        if (own.actionPoints < selectedCard.cost) hint = `${selectedCard.name} costs ${selectedCard.cost} AP; you have ${own.actionPoints}. Choose another card or start battle.`;
        else if (selectedCard.type !== 'spell') hint = `${selectedCard.name}: select a green tile to deploy for ${selectedCard.cost} AP.`;
        else if (['drawCard', 'shadowCorrosion', 'necromancy', 'frostNova'].includes(selectedCard.key)) hint = `${selectedCard.name}: select Cast spell to use it for ${selectedCard.cost} AP.`;
        else hint = `${selectedCard.name}: select a highlighted ally to cast for ${selectedCard.cost} AP.`;
    } else if (!hint && selectedUnit) {
        let movable = false;
        let attackable = false;
        for (let row = 0; row < 5; row++) for (let col = 0; col < 7; col++) {
            movable ||= isCellMovable(selectedUnit, row, col);
            attackable ||= isCellAttackable(selectedUnit, row, col);
        }
        hint = movable && attackable ? `${unitDefinitions[selectedUnit.type].name} · Choose a move or an attack` : attackable ? 'Select a red target to attack.' : movable ? 'Select a green tile to move toward the enemy base.' : 'No moves or attacks available. Check this unit’s skill or choose another unit.';
    } else if (!hint && placement) {
        hint = own.hand.length ? `You have ${own.actionPoints} AP. Play units or spells, then select Start battle.` : drawReason ? 'No draw available. Start battle to use your units, or end your turn to gain AP.' : 'Draw a card, then deploy it in your zone. Drawing and playing cards both cost AP.';
    } else if (!hint) hint = gameState.units.some(u => u.player === local) ? 'Select a friendly unit to move, attack, or use a skill. Select End turn when ready.' : 'You have no units on the board. End your turn, then play cards in your next Deploy phase.';
    setPlayerText('action-hint', hint);
    renderPlayerTurnReminder();
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

function setupCardArtworkViewer() {
    const panel = document.querySelector('.selection-panel');
    if (!panel) return;
    const button = document.createElement('button');
    button.id = 'view-card-art-btn';
    button.type = 'button';
    button.textContent = 'Enlarge card ↗';
    button.hidden = true;
    const footer = document.createElement('div');
    footer.className = 'selection-footer';
    const note = document.createElement('small');
    note.className = 'selection-live-note';
    note.textContent = 'Live values above';
    footer.append(button, note);
    panel.appendChild(footer);

    const modal = document.createElement('div');
    modal.id = 'card-art-modal';
    modal.hidden = true;
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'card-art-title');
    modal.innerHTML = `<div class="card-art-dialog">
        <header><h2 id="card-art-title"></h2><button type="button" id="close-card-art-btn">Close</button></header>
        <div class="card-art-content"><img id="card-art-image" alt=""><section class="card-art-rules">
            <p class="eyebrow">LIVE GAME RULES</p><p id="card-art-stats"></p><p id="card-art-description"></p>
            <p class="card-art-note">Printed card artwork. Live stats and rules shown here apply.</p>
        </section></div>
    </div>`;
    document.body.appendChild(modal);
    const close = document.getElementById('close-card-art-btn');
    closeCardArtwork = () => {
        modal.hidden = true;
        button.focus();
    };
    button.addEventListener('click', () => {
        const art = document.getElementById('selection-art');
        const image = document.getElementById('card-art-image');
        image.src = art.src;
        const name = window.AOW_I18N?.sourceAttribute(art, 'alt') || art.alt;
        image.alt = `${name} — printed card artwork`;
        setPlayerText('card-art-title', name);
        setPlayerText('card-art-stats', Array.from(document.getElementById('selection-stats').children).map(stat => {
            const value = stat.querySelector('strong')?.textContent;
            return value === undefined ? stat.textContent : stat.dataset.label === 'AP' ? `Cost ${value} AP` : `${stat.dataset.label} ${value}`;
        }).join(' · '));
        const description = document.getElementById('selection-description');
        setPlayerText('card-art-description', description.dataset.fullRules || description.textContent);
        modal.hidden = false;
        close.focus();
    });
    close.addEventListener('click', closeCardArtwork);
    modal.addEventListener('click', event => { if (event.target === modal) closeCardArtwork(); });
    modal.addEventListener('keydown', event => {
        if (event.key === 'Tab') {
            event.preventDefault();
            close.focus();
        }
    });
}

window.addEventListener('DOMContentLoaded', () => {
    setupCardArtworkViewer();
    const help = document.getElementById('help-modal');
    let helpOpener;
    const closeHelp = () => {
        help.style.display = 'none';
        helpOpener?.focus();
    };
    ['help-btn', 'menu-help-btn'].forEach(id => document.getElementById(id)?.addEventListener('click', event => {
        if (!help) return;
        helpOpener = event.currentTarget;
        help.style.display = 'flex';
        document.getElementById('close-help-btn').focus();
    }));
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
        if (document.getElementById('card-art-modal')?.hidden === false) closeCardArtwork();
        else if (help && help.style.display !== 'none') closeHelp();
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
