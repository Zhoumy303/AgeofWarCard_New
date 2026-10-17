
        function notifyPlayer(message) {
            if (typeof showPlayerNotice === 'function') showPlayerNotice(message);
            else alert(message);
        }

        // ====== 辅助函数：通过中文名或英文key查找unitDefinitions/spellDefinitions，返回带key字段的对象 ======
        function getUnitByName(name) {
          for (const key in unitDefinitions) {
            if (unitDefinitions[key].name === name || key === name) {
              return { ...unitDefinitions[key], key };
            }
          }
          return null;
        }
        function getSpellByName(name) {
          for (const key in spellDefinitions) {
            if (spellDefinitions[key].name === name || key === name) {
              return { ...spellDefinitions[key], key };
            }
          }
          return null;
        }
        function getUnitKeyByName(name) {
          for (const key in unitDefinitions) {
            if (unitDefinitions[key].name === name || key === name) {
              return key;
            }
          }
          return null;
        }
        function getSpellKeyByName(name) {
          for (const key in spellDefinitions) {
            if (spellDefinitions[key].name === name || key === name) {
              return key;
            }
          }
          return null;
        }

        // ====== 升级与经验表 ======
        const LEVEL_EXP_REQUIREMENTS = {
          1: 2, // lv1->lv2
          2: 4, // lv2->lv3
          3: 7, // lv3->lv4
          4: 12, // lv4->lv5
          5: 21, // lv5->lv6
          6: Infinity // lv6为MAX
        };
        const LEVEL_MAX_HP = {
          1: 6,
          2: 6,
          3: 7,
          4: 9,
          5: 11,
          6: 14
        };

        // 恢复普通Unit定义
        const ALL_NORMAL_UNITS = [
          { key: 'Shield Warrior', name: 'Shield Warrior', img: 'lib/img/cards-en/shield-warrior.png' },
          { key: 'Swordsman', name: 'Swordsman', img: 'lib/img/cards-en/swordsman.png' },
          { key: 'Archer', name: 'Archer', img: 'lib/img/cards-en/archer.png' },
          { key: 'Shadow Assassin', name: 'Shadow Assassin', img: 'lib/img/cards-en/shadow-assassin.png' },
          { key: 'Shadow Mage', name: 'Shadow Mage', img: 'lib/img/cards-en/shadow-mage.png' },
          { key: 'Shadow Lord', name: 'Shadow Lord', img: 'lib/img/cards-en/shadow-lord.png' },
          { key: 'Raging Wolf', name: 'Raging Wolf', img: 'lib/img/cards-en/wolf.png' },
          { key: 'Minotaur', name: 'Minotaur', img: 'lib/img/cards-en/minotaur.png' },
          { key: 'Frost Dragon', name: 'Frost Dragon', img: 'lib/img/cards-en/ice-dragon.png' }
        ];

        // ========== 事件Deck初始化 ==========
        function orderBattleEvents(deck) {
          // 保留非Battle事件的随机位置，敌人按等级递进，避免初始角色直接遭遇终局敌人。
          const battles = deck.filter(card => card.type === 'Battle').sort((a, b) => {
            const level = card => Number(card.name.match(/Lv(\d+)/i)?.[1] || 1);
            return level(a) - level(b);
          });
          let index = 0;
          return deck.map(card => card.type === 'Battle' ? battles[index++] : card);
        }

        function createEventDeck() {
          const deck = [];
          // Battle牌
            const enemiesByLevel = {
                1: ENEMY_POOL.filter(e => e.name.includes('Lv1')),
                2: ENEMY_POOL.filter(e => e.name.includes('Lv2') || e.name.includes('LV2')),
                3: ENEMY_POOL.filter(e => e.name.includes('Lv3')),
                4: ENEMY_POOL.filter(e => e.name.includes('Lv4')),
            };
            function addUniqueEnemies(level, count) {
                const enemies = enemiesByLevel[level];
                const shuffled = [...enemies].sort(() => 0.5 - Math.random());
                const selected = shuffled.slice(0, count);
                selected.forEach(enemy => {
            deck.push({ name: enemy.name, type: 'Battle', desc: enemy.desc, img: enemy.portrait, action: 'Battle', enemyName: enemy.name, enemyImg: enemy.portrait });
                });
          }
            addUniqueEnemies(4, 1);
            addUniqueEnemies(3, 3);
            addUniqueEnemies(2, 3);
            addUniqueEnemies(1, 3);

          // 3张Treasure
          for (let i = 0; i < 3; i++) {
            deck.push({ name: 'Treasure', type: 'Treasure', desc: 'Claim a reward.', img: 'lib/img/events/chest.webp', action: 'Open' });
          }
          // 3张分岔路
          for (let i = 0; i < 3; i++) {
            deck.push({ name: 'Crossroads', type: 'Crossroads', desc: 'Take another path and reveal new events.', img: 'lib/img/events/crossroads.webp', action: 'Select' });
          }
          // 2张Shop
          for (let i = 0; i < 2; i++) {
            deck.push({ name: 'Shop', type: 'Shop', desc: 'Spend gold on units and spells.', img: 'lib/img/events/shop.webp', action: 'Enter' });
          }
          // 2张Spring
          for (let i = 0; i < 2; i++) {
            deck.push({ name: 'Spring', type: 'Spring', desc: 'Restore 30% of your maximum base HP, rounded up.', img: 'lib/img/events/healing_spring.webp', action: 'Approach' });
          }
          // 1张Tavern
          deck.push({ name: 'Tavern', type: 'Tavern', desc: 'Spend gold to remove unwanted cards from your deck.', img: 'lib/img/events/tavern.webp', action: 'Enter' });
          // ===== 新增事件卡 =====
          // Awakening Altar
          deck.push({ name: 'Awakening Altar', type: 'Awakening', desc: 'Choose one: +2 maximum base HP, +1 item slot, or +1 maximum AP.', img: 'lib/img/events/sacred_floating_altar.webp', action: 'Select' });
          // Quartermaster Tent
          deck.push({ name: 'Quartermaster Tent', type: 'Quartermaster', desc: 'Spend gold on useful items.', img: 'lib/img/events/tent.webp', action: 'Buy' });
          // Sage Gift
          deck.push({ name: 'Sage Gift', type: 'Gift', desc: 'Receive a Time Hourglass.', img: 'lib/img/events/wise_man_gift.webp', action: 'Claim', item: 'timeHourglass' });
          // ===== 新增事件卡结束 =====
          // 洗牌
          for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
          }
          return orderBattleEvents(deck);
        }
        // 全局事件Deck
        let EVENT_DECK = createEventDeck();
        let PREVIEW_EVENTS = EVENT_DECK.splice(0, 3);

        // 初始化游戏
        function initGame() {
            cancelAITurn();
            window.inspectedCard = null;
            window.inspectedUnit = null;
            window.selectedHandCard = null;
            // 重置游戏Status
            gameState.currentPlayer = 1;
            gameState.phase = 'placement';
            gameState.players[0].actionPoints = 2;
            gameState.players[1].actionPoints = 0; // 首次Enter回合时恢复到2，与先手相同
            gameState.players.forEach(player => {
                player.maxAp = 6;
                player.apPerTurn = 2;
            });
            gameState.drawCost = 1;
            gameState.drawCount = 0;
            gameState.selectedCard = null;
            gameState.selectedUnit = null;
            gameState.selectedSpell = null;
            gameState.players[0].health = 7;
            gameState.players[0].maxHealth = 7;
            gameState.players[1].health = 7;
            gameState.players[1].maxHealth = 7;
            gameState.players[0].hand = [];
            gameState.players[1].hand = [];
            gameState.players[0].deck = [];
            gameState.players[1].deck = [];
            gameState.players[0].graveyard = [];
            gameState.players[1].graveyard = [];
            gameState.players[0].shield = 0;
            gameState.players[1].shield = 0;
            gameState.board = Array(5).fill().map(() => Array(7).fill(null));
            gameState.units = [];
            gameState.frozenUnits = [];
            gameState.turnCount = 0;
            gameState.erosionMode = false;
            gameState.hasRevengeGiant = false;
            gameState.gameOver = false;
            gameState.winner = null;
            gameState.extraTurnPlayer = null;
            gameState.healingUnit = null;
            gameState.erosionTarget = null;
            moving = 0;
            
            // 保持当前的AI设置，除非是第一次初始化
            if (typeof gameState.aiPlayers === 'undefined') {
                gameState.aiPlayers = [false, !urlParams.has('room')];
            }
            if (urlParams.has('room')) gameState.aiPlayers = [false, false];
            
            // 重置AI学习系统的当前游戏决策记录
            if (gameState.aiLearning) {
                gameState.aiLearning.currentGameDecisions = [];
            }
            
            // AI学习系统
            gameState.aiLearning = loadAILearningData();
            
            // 重置所有Unit的Status属性（防止第二局游戏时Status残留）
            gameState.units.forEach(unit => {
                unit.hasMoved = false;
                unit.hasAttacked = false;
                unit.hasUsedSkill = false;
                unit.lastTurnHasMoved = false;
                unit.lastTurnHasAttacked = false;
                unit.bonusDamage = 0;
                unit.shield = 0; // 重置Shield
                // 重置HP值到最大值
                if (unit.maxHealth) {
                    unit.health = unit.maxHealth;
                }
                if (unit.shadowMoveBonus) {
                    delete unit.shadowMoveBonus;
                }
            });

            // 初始化牌组
            initDecks();
            console.log('[initGame/initDecks] Player deck:', gameState.players[0].deck);

            // 为Player 抽初始Hand
            for (let i = 0; i < 3; i++) {
                drawCard(1);
                drawCard(2);
            }

            // 创建游戏板
            createBoard();

            // 设置AI按钮初始Status
            updateAIButtonStates();

            // 隐藏胜利模态框
            document.getElementById('winner-modal').style.display = 'none';

            // 如果是Player 2，设置初始视角
            if (playerId === '2') {
                document.getElementById('player1-panel').style.order = 2;
                document.getElementById('player2-panel').style.order = 1;
            }

            // 更新AI学习UI
            updateAILearningUI();

            // 连接WebSocket
            connectWebSocket();
            
            // 如果当前Player 是AI，立即开始AI回合
            if (gameState.aiPlayers[gameState.currentPlayer - 1]) {
                aiLog(`Game initialized. AI player ${gameState.currentPlayer} begins.`);
                const delay = getAIDelay();
                setTimeout(() => {
                    aiTurn();
                }, delay); // 使用动态延迟
            }

            // BOSS挑战时将Player 2名称改为BOSS名称
            if (window.selectedBoss && window.selectedBoss.name) {
                document.querySelector('#player2-panel .player-header h2').textContent = window.selectedBoss.name;
                // BOSS为Shadow Council时Base血量5
                if (window.selectedBoss.type === 'shadowCouncil') {
                    gameState.players[1].health = 5;
                    gameState.players[1].maxHealth = 5;
                }
            } else {
                document.querySelector('#player2-panel .player-header h2').textContent = 'Player 2';
            }

            // 更新预览角色立绘
            if (typeof selectedCharacterIndex !== 'undefined' && CHARACTERS[selectedCharacterIndex]) {
                PREVIEW_ROLE.img = CHARACTERS[selectedCharacterIndex].img;
            }
            updateUI();
        }

        // 初始化牌组
        function initDecks() {
            // 洗牌
            const shuffledDeck = [...cardPool].sort(() => Math.random() - 0.5);
            // 平分牌组给两个Player 
            const half = Math.ceil(shuffledDeck.length / 2);
            gameState.players[0].deck = shuffledDeck.slice(0, half);
            gameState.players[1].deck = shuffledDeck.slice(half);
            console.log('[initDecks] Player deck:', gameState.players[0].deck);
            
            // BOSS机制：Shadow Council卡组只包含Shadow族和抽卡/Heal卡
            if (window.selectedBoss && window.selectedBoss.type === 'shadowCouncil') {
                // 只给Player 2（BOSS）特殊卡组
                gameState.players[0].deck = [...cardPool].sort(() => Math.random() - 0.5).slice(0, Math.ceil(cardPool.length / 2));
                const bossDeck = [];
                // 你可以根据需要调整数量
                for (let i = 0; i < 6; i++) bossDeck.push('shadowAssassin');
                for (let i = 0; i < 4; i++) bossDeck.push('shadowMage');
                for (let i = 0; i < 2; i++) bossDeck.push('shadowLord');
                for (let i = 0; i < 2; i++) bossDeck.push('drawCard');
                for (let i = 0; i < 2; i++) bossDeck.push('healPack');
                gameState.players[1].deck = bossDeck.sort(() => Math.random() - 0.5);
                return;
            }
            if (window.selectedBoss && window.selectedBoss.type === 'frostQueen') {
                gameState.players[0].deck = [...cardPool].sort(() => Math.random() - 0.5).slice(0, Math.ceil(cardPool.length / 2));
                const bossDeck = [];
                for (let i = 0; i < 5; i++) bossDeck.push('iceDragon');
                for (let i = 0; i < 5; i++) bossDeck.push('wolf');
                for (let i = 0; i < 5; i++) bossDeck.push('minotaur');
                for (let i = 0; i < 3; i++) bossDeck.push('frostNova');
                for (let i = 0; i < 3; i++) bossDeck.push('healPack');
                gameState.players[1].deck = bossDeck.sort(() => Math.random() - 0.5);
                return;
            }
            // 新增：Iron GodfatherBOSS只招募HumanUnit
            if (window.selectedBoss && window.selectedBoss.type === 'techFather') {
                gameState.players[0].deck = [...cardPool].sort(() => Math.random() - 0.5).slice(0, Math.ceil(cardPool.length / 2));
                const bossDeck = [];
                // 只加入HumanUnit
                for (let i = 0; i < 6; i++) bossDeck.push('shieldWarrior');
                for (let i = 0; i < 6; i++) bossDeck.push('archer');
                for (let i = 0; i < 6; i++) bossDeck.push('swordsman');
                for (let i = 0; i < 3; i++) bossDeck.push('healPack');
                for (let i = 0; i < 2; i++) bossDeck.push('shieldCard');
                for (let i = 0; i < 2; i++) bossDeck.push('drawCard');
                gameState.players[1].deck = bossDeck.sort(() => Math.random() - 0.5);
                return;
            }
        }

        // 创建游戏板
        function createBoard() {
            const boardElement = document.getElementById('game-board');
            boardElement.innerHTML = '';

            for (let row = 0; row < 5; row++) {
                for (let col = 0; col < 7; col++) {
                    const cell = document.createElement('button');
                    cell.type = 'button';
                    cell.className = 'cell';
                    cell.setAttribute('aria-label', `Row ${row + 1}, column ${col + 1}, empty`);

                    // 标记Base (第3行第1列和第7列)
                    if ((row === 2 && col === 0) || (row === 2 && col === 6)) {
                        if (!(row === 2 && col === 6 && window.selectedBoss && window.selectedBoss.type === 'techFather' && isTechFatherRevengeAlive())) {
                            cell.classList.add('base');
                            cell.textContent = 'Base';
                            // 显示BaseShield
                            const playerIndex = col === 0 ? 0 : 1;
                            const player = gameState.players[playerIndex];
                            if (player.shield > 0) {
                                const shield = document.createElement('div');
                                shield.className = 'shield-icon';
                                shield.textContent = `🛡️${player.shield}`;
                                cell.appendChild(shield);
                            }
                        }
                    }

                    // 设置数据属性
                    cell.dataset.row = row;
                    cell.dataset.col = col;

                    // 添加Click to 事件
                    cell.addEventListener('click', () => handleCellClick(row, col));

                    // 添加悬停事件用于显示工具提示
                    cell.addEventListener('mouseenter', (e) => showCellTooltip(e, row, col));
                    cell.addEventListener('mouseleave', hideTooltip);

                    boardElement.appendChild(cell);
                }
            }
        }

        // 抽卡
        function drawCard(playerId) {
            const playerIndex = playerId - 1;
            const player = gameState.players[playerIndex];

            // Hand上限对Player 和AI一致；抽卡Spell也只补到上限。
            if (player.hand.length >= 7) return false;

            // 检查牌组是否为空
            if (player.deck.length === 0) {
                // 如果墓地有牌，洗入牌组
                if (player.graveyard.length > 0) {
                    player.deck = [...player.graveyard];
                    player.graveyard = [];
                    shuffleArray(player.deck);
                    //alert("牌组已空，墓地牌洗回牌组，抽卡Cost增加1点");
                } else {
                    //alert("牌组已空!");
                    return false;
                }
            }

            // 1. 抽卡时，push对象副本
            const cardKey = player.deck.pop();
            let cardObj;
            if (cardKey in unitDefinitions) {
              cardObj = { ...unitDefinitions[cardKey], key: cardKey, cost: unitDefinitions[cardKey].cost };
            } else if (cardKey in spellDefinitions) {
              cardObj = { ...spellDefinitions[cardKey], key: cardKey, cost: spellDefinitions[cardKey].cost };
            } else {
              cardObj = { key: cardKey, cost: 0 };
            }
            player.hand.push(cardObj);

            // 重置新抽入Hand的Cost
            if (!player.handCardCosts) player.handCardCosts = {};
            player.handCardCosts[player.hand.length - 1] = undefined;

            return true;
        }

        // 放置Unit
        function placeUnit(playerId, unitType, row, col) {
            if (gameState.gameOver || gameState.phase !== 'placement' || playerId !== gameState.currentPlayer ||
                !unitDefinitions[unitType] || !Number.isInteger(row) || !Number.isInteger(col) || row < 0 || row >= 5 || col < 0 || col >= 7) return false;
            // 检查是否在己方区域
            const isPlayer1 = playerId === 1;
            const validCows = isPlayer1 ? [0, 1] : [5, 6]; // Player 1在前两列，Player 2在后两列

            if (!validCows.includes(col) || ((col == 0 || col == 6) && row == 2)) {
                notifyPlayer("Deploy units in your own starting area.");
                return false;
            }

            // 检查格子是否为空
            if (gameState.board[row][col] !== null) {
                notifyPlayer("This square is occupied.");
                return false;
            }

            // 检查Hand中是否有该卡
            const playerIndex = playerId - 1;
            const hand = gameState.players[playerIndex].hand;
            const selected = !gameState.aiPlayers[playerIndex] && gameState.selectedCard === unitType && window.selectedHandCard?.key === unitType && hand.includes(window.selectedHandCard)
                ? window.selectedHandCard : hand.find(card => card.key === unitType);
            const handIdx = hand.indexOf(selected);
            if (handIdx === -1) {
                notifyPlayer('That unit card is not in your hand.');
                return false;
            }
            const cardObj = gameState.players[playerIndex].hand[handIdx];
            // 检查AP点数是否足够
            if (gameState.players[playerIndex].actionPoints < cardObj.cost) {
                notifyPlayer('Not enough AP.');
                return false;
            }
            // 创建Unit
            const unitDef = unitDefinitions[unitType];
            const unit = {
                id: Date.now() + Math.random(),
                type: unitType,
                player: playerId,
                row,
                col,
                health: unitDef.health,
                maxHealth: unitDef.health,
                attackRange: unitDef.attackRange,
                damage: unitDef.damage,
                skills: unitDef.skills,
                hasAttacked: false,
                hasMoved: false,
                shield: 0,
                lastTurnHasAttacked: false,
                lastTurnHasMoved: false,
                bonusDamage: 0
            };
            // 更新游戏Status
            gameState.board[row][col] = unit;
            gameState.units.push(unit);
            gameState.players[playerIndex].actionPoints -= cardObj.cost;
            // 从Hand中移除
            gameState.players[playerIndex].hand.splice(handIdx, 1);
            sendGameAction();
            return true;
        }

        // 使用Spell
        function useSpell(spellType) {
            gameState.selectedSpell = spellType;
            updateUI();
        }

        // 处理SpellEffect
        function applySpellEffect(spellType, target) {
            const playerIndex = gameState.currentPlayer - 1;
            const player = gameState.players[playerIndex];
            const spellDef = spellDefinitions[spellType];
            const heldCard = !gameState.aiPlayers[playerIndex] && gameState.selectedCard === spellType && window.selectedHandCard?.key === spellType && player.hand.includes(window.selectedHandCard)
                ? window.selectedHandCard : player.hand.find(card => card.key === spellType);
            if (gameState.gameOver || gameState.phase !== 'placement' || !spellDef || !heldCard) return false;
            const cost = heldCard.cost;
            if (['healPack', 'shieldCard', 'resetCard'].includes(spellType) &&
                (!target || target.player !== gameState.currentPlayer || !gameState.units.includes(target))) return false;

            // 检查当前Player 的AP点数是否足够
            if (player.actionPoints < cost) {
                notifyPlayer("Not enough AP.");
                return false;
            }

            switch (spellType) {
                case 'healPack':
                    // Healing Kit: 恢复3点HP值
                    if (target.health < target.maxHealth) {
                        target.health = Math.min(target.health + 3, target.maxHealth);
                        player.actionPoints -= cost;

                        // 从Hand中移除
                        const cardIndex = player.hand.indexOf(heldCard);
                        if (cardIndex !== -1) {
                            player.hand.splice(cardIndex, 1);
                            player.graveyard.push(spellType);
                        }

                        sendGameAction();
                        return true;
                    } else {
                        notifyPlayer("This unit is already at full health.");
                        return false;
                    }

                case 'shieldCard':
                    // Shield: 只能给没有Shield的Unit加1点Shield
                    if (target.shield && target.shield >= 1) {
                        notifyPlayer('This unit already has a shield.');
                        return false;
                    }
                    target.shield = 1;
                    player.actionPoints -= cost;
                    // 从Hand中移除
                    const cardIndex = player.hand.indexOf(heldCard);
                    if (cardIndex !== -1) {
                        player.hand.splice(cardIndex, 1);
                        player.graveyard.push(spellType);
                    }
                    sendGameAction();
                    return true;

                case 'drawCard':
                    // Reinforcements: 抽取3张卡牌
                    player.actionPoints -= cost;

                    // 从Hand中移除
                    const cardIdx = player.hand.indexOf(heldCard);
                    if (cardIdx !== -1) {
                        player.hand.splice(cardIdx, 1);
                        player.graveyard.push(spellType);
                    }

                    for (let i = 0; i < 3; i++) {
                        drawCard(gameState.currentPlayer);
                    }

                    sendGameAction();
                    return true;

                case 'resetCard':
                    // Recall: 将Unit返回Hand
                    player.actionPoints -= cost;

                    // 从棋盘上移除
                    gameState.board[target.row][target.col] = null;
                    const unitIndex = gameState.units.findIndex(u => u.id === target.id);
                    if (unitIndex !== -1) {
                        gameState.units.splice(unitIndex, 1);
                    }

                    // 加入Hand
                    player.hand.push({ ...unitDefinitions[target.type], key: target.type, cost: unitDefinitions[target.type].cost });
                    gameState.frozenUnits = gameState.frozenUnits.filter(f => f.id !== target.id);

                    // 从Hand中移除Spell卡
                    const spellIndex = player.hand.indexOf(heldCard);
                    if (spellIndex !== -1) {
                        player.hand.splice(spellIndex, 1);
                        player.graveyard.push(spellType);
                    }

                    sendGameAction();
                    return true;
                case 'frostNova':
                    player.actionPoints -= cost;
                    // 冻结所有Enemy Unit3回合
                    gameState.units.forEach(unit => {
                        if (unit.player !== gameState.currentPlayer) {
                            gameState.frozenUnits.push({id: unit.id, player: unit.player, duration: 6});
                        }
                    });
                    // 从Hand中移除
                    const frostNovaCardIndex = player.hand.indexOf(heldCard);
                    if (frostNovaCardIndex !== -1) {
                        player.hand.splice(frostNovaCardIndex, 1);
                        player.graveyard.push(spellType);
                    }
                    if (!gameState.aiPlayers[playerIndex]) notifyPlayer('Frost Nova: all enemy units are frozen for 3 action turns.');
                    sendGameAction();
                    return true;
                case 'shadowCorrosion':
                    // Shadow Corrosion：对手随机1张HandCost+1（只影响那一张）
                    const opponentIdx = (gameState.currentPlayer === 1 ? 1 : 0);
                    const opponent = gameState.players[opponentIdx];
                    if (opponent.hand.length === 0) {
                        notifyPlayer('Shadow Corrosion needs an opponent with cards in hand.');
                        return false;
                    }
                    const randIdx = Math.floor(Math.random() * opponent.hand.length);
                    const cardObj = opponent.hand[randIdx];
                    const oldCost = cardObj.cost;
                    cardObj.cost = oldCost + 1;
                    console.log(`[Shadow Corrosion] Card ${cardObj.key}: cost ${oldCost} -> ${cardObj.cost}`);
                    player.actionPoints -= cost;
                    // 从Hand中移除
                    const corrosionIdx = player.hand.indexOf(heldCard);
                    if (corrosionIdx !== -1) {
                        player.hand.splice(corrosionIdx, 1);
                        player.graveyard.push(spellType);
                    }
                    if (!gameState.aiPlayers[playerIndex]) notifyPlayer('Shadow Corrosion: one random enemy card costs 1 more AP.');
                    sendGameAction();
                    return true;
                case 'necromancy':
                    // Necromancy: 先找出所有1血Enemy Unit，记录其位置和Type
                    const opponentPlayer = playerIndex === 0 ? 2 : 1;
                    const opponentUnits = gameState.units.filter(u => u.player === opponentPlayer);
                    const dyingUnits = opponentUnits.filter(u => u.health === 1 && u.type !== 'skeleton').map(u => ({row: u.row, col: u.col, player: u.player}));
                    if (opponentUnits.length > 0) {
                        for (const unit of opponentUnits) {
                            applyDamageToTarget(unit, 1);
                        }
                    }
                    // 1血被击杀的Unit原地生成Skeleton
                    for (const info of dyingUnits) {
                        // 检查该格是否为空（被击杀后）
                        if (!gameState.board[info.row][info.col]) {
                            const skeletonDef = unitDefinitions['skeleton'];
                            const skeleton = {
                                id: Date.now() + Math.random(),
                                type: 'skeleton',
                                player: gameState.currentPlayer, // 归施法者所有
                                row: info.row,
                                col: info.col,
                                health: skeletonDef.health,
                                maxHealth: skeletonDef.health,
                                attackRange: skeletonDef.attackRange,
                                damage: skeletonDef.damage,
                                skills: skeletonDef.skills,
                                hasAttacked: false,
                                hasMoved: false,
                                shield: 0,
                                lastTurnHasAttacked: false,
                                lastTurnHasMoved: false,
                                bonusDamage: 0
                            };
                            gameState.board[info.row][info.col] = skeleton;
                            gameState.units.push(skeleton);
                        }
                    }
                    // 从Hand中移除
                    const necroIdx = player.hand.indexOf(heldCard);
                    if (necroIdx !== -1) {
                        player.hand.splice(necroIdx, 1);
                        player.graveyard.push(spellType);
                    }
                    player.actionPoints -= cost;
                    sendGameAction();
                    return true;
            }

            return false;
        }

        // moveUnit
        function moveUnit(unit, newRow, newCol) {
            if (gameState.gameOver || isAnimating || gameState.phase !== 'battle' || unit.player !== gameState.currentPlayer ||
                !gameState.units.includes(unit) || !isCellMovable(unit, newRow, newCol)) return false;
            // 检查Unit是否已经move过
            if (unit.hasMoved) {
                notifyPlayer("This unit has already moved this turn.");
                return false;
            }

            // 检查是否被Frozen（无论归属）
            if (gameState.frozenUnits.some(f => f.id === unit.id)) {
                notifyPlayer("Frozen units cannot move.");
                return false;
            }

            // 更新游戏Status
            gameState.board[unit.row][unit.col] = null;
            gameState.board[newRow][newCol] = unit;
            unit.row = newRow;
            unit.col = newCol;
            unit.hasMoved = true;

            // Frost QueenBOSSFrozen领域判定
            if (window.selectedBoss && window.selectedBoss.type === 'frostQueen' && unit.player === 1) {
                if (Math.random() < 0.33) {
                    gameState.frozenUnits.push({id: unit.id, player: unit.player, duration: 3});
                    notifyPlayer('Frost Field: this unit is frozen for 3 turns.');
                }
            }

            sendGameAction();
            return true;
        }

        // ATK动画与伤害飘字
        let isAnimating = false;
        async function attackUnitWithAnimation(attacker, target, damage, attackFn) {
            const battleBoard = gameState.board;
            isAnimating = true;
            const board = document.getElementById('game-board');
            if (!board) { attackFn(); isAnimating = false; updateUI(); return; }
            const attackerCell = board.children[attacker.row * 7 + attacker.col];
            const targetCell = board.children[target.row * 7 + target.col];
            if (!attackerCell || !targetCell) { attackFn(); isAnimating = false; updateUI(); return; }
            const attackerDiv = attackerCell.querySelector('.unit');
            const targetDiv = targetCell.querySelector('.unit');
            if (!attackerDiv || !targetDiv) { attackFn(); isAnimating = false; updateUI(); return; }
            // 保存原始transform
            const baseTransform = '';
            attackerDiv.style.transform = baseTransform;
            const attackerRect = attackerDiv.getBoundingClientRect();
            const targetRect = targetDiv.getBoundingClientRect();
            const attackerCenter = {
                x: attackerRect.left + attackerRect.width / 2,
                y: attackerRect.top + attackerRect.height / 2
            };
            const targetCenter = {
                x: targetRect.left + targetRect.width / 2,
                y: targetRect.top + targetRect.height / 2
            };
            const dx = targetCenter.x - attackerCenter.x;
            const dy = targetCenter.y - attackerCenter.y;
            attackerDiv.classList.add('attack-animating');
            attackerDiv.style.transform = `${baseTransform} translate(${dx}px, ${dy}px)`;
            await new Promise(r => setTimeout(r, 350));
            if (gameState.board !== battleBoard) { isAnimating = false; updateUI(); return; }
            const dmgSpan = document.createElement('span');
            dmgSpan.className = 'damage-float';
            dmgSpan.textContent = `-${damage}`;
            targetDiv.appendChild(dmgSpan);
            setTimeout(() => dmgSpan.remove(), 900);
            attackerDiv.style.transform = baseTransform;
            await new Promise(r => setTimeout(r, 350));
            attackerDiv.classList.remove('attack-animating');
            attackerDiv.style.transform = baseTransform;
            if (gameState.board === battleBoard) attackFn();
            isAnimating = false;
            updateUI();
        }

        // ATK
        async function attack(attacker, targetRow, targetCol) {
            if (gameState.gameOver || isAnimating || gameState.phase !== 'battle' || attacker.player !== gameState.currentPlayer ||
                !gameState.units.includes(attacker) || !isCellAttackable(attacker, targetRow, targetCol)) return false;
            const target = gameState.board[targetRow][targetCol];
            const isBase = !target && targetRow === 2 && (targetCol === 0 || targetCol === 6);
            if (attacker.type === 'shadowLord' && gameState.erosionMode && !isBase) {
                return performErosion(attacker, target);
            }
            // 动画期间先占用本次AP，避免重复Click to 重复结算。
            attacker.hasAttacked = true;
            // 统一获取当前敌人名
            let currentEnemyName = '';
            if (window._storyEnemyInfo && window._storyEnemyInfo.name) {
                currentEnemyName = window._storyEnemyInfo.name;
            } else if (gameState && gameState.players && gameState.players[1] && gameState.players[1].enemyName) {
                currentEnemyName = gameState.players[1].enemyName;
            }
            // 嗜血狂潮Lv3特性：血之共鸣
            let isBloodFrenzy = currentEnemyName === 'Blood Frenzy Lv3';
            if (attacker.type === 'beastBat' && isBloodFrenzy && attacker.player === 2) {
                // 只有敌人为嗜血狂潮Lv3时，且是AI蝙蝠ATK才群体加血
                gameState.units.forEach(unit => {
                    if (unit.type === 'beastBat' && unit.player === attacker.player) {
                        unit.maxHealth = (unit.maxHealth || unit.health) + 1;
                        unit.health = unit.maxHealth;
                    }
                });
            } else if (attacker.type === 'beastBat') {
                // 普通Blood Bat
                attacker.maxHealth = (attacker.maxHealth || attacker.health) + 1;
                attacker.health = attacker.maxHealth;
                if (attacker.player === 2 && isBloodFrenzy) {
                    notifyPlayer('Blood Feast: the Blood Bat gains +1 maximum HP and heals to full.');
                }
            }
            
            // 执行普通ATK
            if (isBase) {
                // ATKBase
                const playerIndex = targetCol === 0 ? 0 : 1;
                const player = gameState.players[playerIndex];
                let damage = attacker.damage + (attacker.bonusDamage || 0);
                if (attacker.type === 'archer' && Math.floor(Math.random() * 6) === 0) {
                    damage *= 2;
                    // notifyPlayer("精准射击! 造成双倍伤害!");
                }
                if (player.shield > 0) {
                    const shieldDamage = Math.min(damage, player.shield);
                    player.shield -= shieldDamage;
                    damage -= shieldDamage;
                    // notifyPlayer(`Shield吸收了${shieldDamage}点伤害!`);
                }
                // 动画+结算
                await attackUnitWithAnimation(attacker, {row:targetRow,col:targetCol}, damage, () => {
                player.health -= damage;
                checkGameEnd();
                });
                updateUI();
            } else {
                let damage = attacker.damage + (attacker.bonusDamage || 0);
                if (attacker.type === 'archer' && Math.floor(Math.random() * 6) === 0) {
                    damage *= 2;
                    // notifyPlayer("精准射击! 造成双倍伤害!");
                }
                if (attacker.shadowMoveBonus) {
                    damage *= 2;
                    // notifyPlayer("Shadow ShiftEffect! 造成双倍伤害!");
                    delete attacker.shadowMoveBonus;
                }
                if (attacker.type === 'wolf') {
                    const newRow = attacker.row + (target.row - attacker.row) * 2;
                    const newCol = attacker.col + (target.col - attacker.col) * 2;
                    if (newRow >= 0 && newRow <= 4 && newCol >= 0 && newCol <= 6) {
                        if (gameState.board[newRow][newCol] == null && !(newRow === 2 && (newCol === 0 || newCol === 6))) {
                            damage += 1;
                            // notifyPlayer("野性冲锋! 造成额外1点伤害!");
                            gameState.board[target.row][target.col] = null;
                            target.row = newRow;
                            target.col = newCol;
                            gameState.board[newRow][newCol] = target;
                        }
                    }
                }
                // 动画+结算
                await attackUnitWithAnimation(attacker, target, damage, () => {
                if (attacker.type === 'swordsman') {
                    applyDamageToTarget(target, damage);
                    if (target.col > 0 && gameState.board[target.row][target.col - 1] && gameState.board[target.row][target.col - 1].player !== attacker.player) applyDamageToTarget(gameState.board[target.row][target.col - 1], 1);
                    if (target.col < 6 && gameState.board[target.row][target.col + 1] && gameState.board[target.row][target.col + 1].player !== attacker.player) applyDamageToTarget(gameState.board[target.row][target.col + 1], 1);
                    if (target.row > 0 && gameState.board[target.row - 1][target.col] && gameState.board[target.row - 1][target.col].player !== attacker.player) applyDamageToTarget(gameState.board[target.row - 1][target.col], 1);
                    if (target.row < 4 && gameState.board[target.row + 1][target.col] && gameState.board[target.row + 1][target.col].player !== attacker.player) applyDamageToTarget(gameState.board[target.row + 1][target.col], 1);
                } else {
                    applyDamageToTarget(target, damage);
                }
                if (attacker.type === 'iceDragon' && !isBase) {
                    if (gameState.units.includes(target) && gameState.players[attacker.player - 1].actionPoints > 0) {
                        gameState.players[attacker.player - 1].actionPoints -= 1;
                        gameState.frozenUnits.push({id: target.id, player: target.player, duration: 2});
                            // notifyPlayer("目标被Frozen了，2回合无法AP!");
                    }
                }
                });
            }

            // 标记为Attacked
            attacker.hasAttacked = true;
            checkGameEnd();
            sendGameAction();
            return true;
        }

        // 应用伤害到目标
        function applyDamageToTarget(target, damage) {
            // Phase Beast：伤害减半并向上取整，保留低ATKUnit的伤害。
            if (target.type === 'phaseBeast') {
                damage = Math.ceil(damage / 2);
            }
            const isFrozen = gameState.frozenUnits.some(f => f.id === target.id);
            // Shield Warrior的防御Skill：未动未攻且未被冻结时才防御
            if (target.type === 'shieldWarrior' && !isFrozen && !target.lastTurnHasAttacked && !target.lastTurnHasMoved) {
                damage = Math.max(0, damage - 2);
                // if (damage === 0) {
                //     notifyPlayer("Shield Warrior的防御减免了全部伤害!");
                // } else {
                //     notifyPlayer("Shield Warrior的防御减免了2点伤害!");
                // }
            }
            // Shield减伤：未被冻结时每点Shield减免1点伤害
            if (target.shield > 0 && !isFrozen) {
                const shieldReduce = Math.min(damage, target.shield);
                damage -= shieldReduce;
                // if (shieldReduce > 0) notifyPlayer(`Shield减免了${shieldReduce}点伤害!`);
            }
            if (damage > 0) {
                target.health -= damage;
                // notifyPlayer(`造成${damage}点伤害!`);
                // 检查Unit是否死亡
                if (target.health <= 0) {
                    // 正常死亡
                    const playerIndex = target.player - 1;
                    const player = gameState.players[playerIndex];

                    // 移除死亡Unit
                    gameState.board[target.row][target.col] = null;
                    const unitIndex = gameState.units.findIndex(u => u.id === target.id);
                    if (unitIndex !== -1) {
                        gameState.units.splice(unitIndex, 1);
                    }
                    if (target.type !== 'skeleton') {
                        player.graveyard.push(target.type);
                    }
                    gameState.frozenUnits = gameState.frozenUnits.filter(f => f.id !== target.id);
                    // Heirs of the Dead Lv4特性：每死亡一个己方Unit，场上剩余Unit增加1点ATK并且恢复1点HP值
                    let isWangZheLv4 = false;
                    if (window._storyEnemyInfo && window._storyEnemyInfo.name === 'Heirs of the Dead Lv4' && target.player === 2) {
                        isWangZheLv4 = true;
                    } else if (window.selectedBoss && window.selectedBoss.name === 'Heirs of the Dead Lv4' && target.player === 2) {
                        isWangZheLv4 = true;
                    }
                    if (isWangZheLv4) {
                        gameState.units.forEach(u => {
                            if (u.player === 2 && u.health > 0) {
                                u.damage = (u.damage || 0) + 1;
                                u.health = Math.min(u.maxHealth || 999, u.health + 1);
                            }
                        });
                        notifyPlayer('Last Will: surviving enemy units gain +1 ATK and restore 1 HP.');
                    }

                    // Undead法师被动：己方Unit死亡时，若场上存在"Necromancer Lv3"，则在原地生成一个Skeleton
                    if (window._storyEnemyInfo && window._storyEnemyInfo.name === 'Necromancer Lv3' && target.player === 2 && target.type !== 'skeleton') {
                        const skeletonDef = unitDefinitions['skeleton'];
                        const skeleton = {
                            id: Date.now() + Math.random(),
                            type: 'skeleton',
                            player: target.player,
                            row: target.row,
                            col: target.col,
                            health: skeletonDef.health,
                            maxHealth: skeletonDef.health,
                            attackRange: skeletonDef.attackRange,
                            damage: skeletonDef.damage,
                            skills: skeletonDef.skills,
                            hasAttacked: false,
                            hasMoved: false,
                            shield: 0,
                            lastTurnHasAttacked: false,
                            lastTurnHasMoved: false,
                            bonusDamage: 0
                        };
                        gameState.board[target.row][target.col] = skeleton;
                        gameState.units.push(skeleton);
                        // 不需要单独updateUI，后续操作会统一更新
                    }
                }
            }
        }

        // 应用伤害到目标（无提示）
        function applyDamageToTargetSilent(target, damage) {
            applyDamageToTarget(target, damage);
        }

        // 检查游戏是否结束
        function checkGameEnd() {
            if (gameState.gameOver) return true;
            let winner = null;

            if (gameState.players[0].health <= 0) {
                winner = 2;
            } else if (gameState.players[1].health <= 0) {
                // Iron GodfatherBOSS反攻机制
                if (window.selectedBoss && window.selectedBoss.type === 'techFather') {
                    // 检查基地格是否为空
                    if (!gameState.hasRevengeGiant) {
                        const unitDef = unitDefinitions['techFatherRevenge'];
                        const revengeUnit = {
                            id: Date.now() + Math.random(),
                            type: 'techFatherRevenge',
                            player: 2,
                            row: 2,
                            col: 6,
                            health: unitDef.health,
                            maxHealth: unitDef.health,
                            attackRange: unitDef.attackRange,
                            damage: unitDef.damage,
                            skills: unitDef.skills,
                            hasAttacked: false,
                            hasMoved: false,
                            shield: 0,
                            lastTurnHasAttacked: false,
                            lastTurnHasMoved: false,
                            bonusDamage: 0
                        };
                        gameState.board[2][6] = revengeUnit;
                        gameState.units.push(revengeUnit);
                        gameState.players[1].health = 0; // 防止重复生成
                        notifyPlayer('The Iron Godfather base is destroyed. The Revenge Colossus enters battle!');
                        gameState.hasRevengeGiant = true;
                    }
                    if (isTechFatherRevengeAlive()) return false;
                    winner = 1;
                } else {
                    winner = 1;
                }
            }

            if (winner) {
                gameState.gameOver = true;
                gameState.winner = winner;
                gameState.selectedUnit = null;
                gameState.selectedCard = null;
                gameState.selectedSpell = null;
                console.log(`Game over! Player ${winner} wins.`);
                // AI学习
                aiLearnFromGame(winner);
                showWinner(winner);

                //gameState.aiPlayers = [true, true];
                updateAIButtonStates();
                
                updateUI();
                return true;
            }

            return false;
        }

        // 显示胜利者
        function showWinner(winner) {
            const modal = document.getElementById('winner-modal');
            const winnerText = document.getElementById('winner-text');

            const localPlayer = Number(playerId) === 2 ? 2 : 1;
            winnerText.textContent = winner === localPlayer ? 'Victory! The enemy base has fallen.' : 'Defeat. Try another strategy.';
            modal.style.display = 'block';

            // 如果是BOSS挑战且Player 1胜利
            if (window.selectedBoss && winner === 1) {
                // 标记BOSSCleared
                if (!window.bossPassed) window.bossPassed = {};
                window.bossPassed[window.selectedBoss.name] = true;
            }
            // 新增：Player 1胜利奖励Gold
            if (winner === 1) {
                gameState.players[0].gold = (gameState.players[0].gold || 0) + 5;
                updateUI && updateUI();
                // 可选：弹窗提示
                //setTimeout(() => {
                //    notifyPlayer('胜利奖励：+5Gold！');
                //}, 300);
            }
            // 剧情模式胜利后自动回到剧情界面
            if (window._storyEnemyBattle && winner === 1) {
                console.log('[showWinner] Adventure victory: resolving rewards');
                setTimeout(() => {
                    modal.style.display = 'none';
                    console.log('[showWinner] Resolve adventure victory');
                    onEnemyBattleWin && onEnemyBattleWin();
                }, 800);
            }
            // 剧情模式失败，显示失败弹窗并回主菜单
            if (window._storyEnemyBattle && winner === 2) {
                setTimeout(() => {
                    modal.style.display = 'none';
                    showStoryFailModal();
                }, 800);
            }
        }

        // 新增剧情模式失败弹窗
        function showStoryFailModal() {
          window.storyStarted = false;
          window._storyEnemyBattle = false;
          window._storyEnemyInfo = null;
          englishStorage.removeItem('gameProgress');
          if (typeof updateContinueButton === 'function') updateContinueButton();
          let modal = document.getElementById('story-fail-modal');
          if (!modal) {
            modal = document.createElement('div');
            modal.id = 'story-fail-modal';
            modal.style = 'position:fixed;left:0;top:0;width:100vw;height:100vh;z-index:6000;background:rgba(24,28,42,0.96);display:flex;align-items:center;justify-content:center;';
            modal.innerHTML = `
              <div style="background:#23263a;padding:48px 64px 36px 64px;border-radius:24px;min-width:420px;max-width:90vw;box-shadow:0 8px 48px #000b;text-align:center;">
                <div style="font-size:2.2em;font-weight:bold;margin-bottom:18px;color:#ff5555;">Defeat</div>
                <div style="margin-bottom:24px;font-size:1.2em;color:#fff;">Your hero has fallen. Start a new adventure to try again.</div>
                <button id="btn-story-fail-exit" style="padding:14px 48px;font-size:1.3em;background:#4af;color:#fff;border:none;border-radius:12px;">Main menu</button>
              </div>
            `;
            document.body.appendChild(modal);
            }
          modal.style.display = 'flex';
          document.getElementById('btn-story-fail-exit').onclick = () => {
            modal.style.display = 'none';
            // Main menu
            if (typeof battlePreviewRoot !== 'undefined') battlePreviewRoot.style.display = 'none';
            if (typeof mainMenu !== 'undefined') mainMenu.style.display = 'flex';
            const gameContainer = document.querySelector('.game-container');
            if (gameContainer) gameContainer.style.display = 'none';
          };
        }

        // 处理格子Click to 
        function canHumanAct() {
            return canLocalPlayerAct() && gameState.currentPlayer === Number(playerId);
        }

        async function handleCellClick(row, col) {
            window.inspectedUnit = gameState.board[row][col];
            window.inspectedCard = null;
            if (!canHumanAct() || gameState.gameOver || isAnimating || gameState.aiPlayers[gameState.currentPlayer - 1]) {
                if (typeof renderPlayerExperience === 'function') renderPlayerExperience();
                return;
            }
            if (gameState.phase === 'placement') {
                handlePlacementPhaseClick(row, col);
            } else if (gameState.phase === 'battle') {
                await handleBattlePhaseClick(row, col);
            }

            updateUI();
        }

        // Deployment的Click to 处理
        function handlePlacementPhaseClick(row, col) {
            if (gameState.selectedCard) {
                // 检查是否是Spell卡
                if (gameState.selectedCard in spellDefinitions) {
                    // 如果是ReinforcementsSpell，Click to 棋盘无效
                    if (gameState.selectedCard === 'drawCard') {
                        return;
                    }
                    const cellContent = gameState.board[row][col];
                    const isBase = (row === 2 && col === 0) || (row === 2 && col === 6);

                    // Healing Kit不能用于Base
                    if (['healPack', 'shieldCard', 'resetCard'].includes(gameState.selectedCard) && isBase) {
                        notifyPlayer("This spell cannot target a base.");
                        return;
                    }

                    // 检查是否是己方Unit或Base
                    if (cellContent && cellContent.player === gameState.currentPlayer ||
                        (isBase && (col === 0 ? 1 : 2) === gameState.currentPlayer)) {

                        const success = applySpellEffect(gameState.selectedCard, cellContent || { row, col });
                        if (success) {
                            gameState.selectedCard = null;
                            gameState.selectedSpell = null;
                        }
                    } else {
                        notifyPlayer("Choose a valid friendly target for this spell.");
                    }
                } else {
                    // 尝试放置Unit
                    const success = placeUnit(gameState.currentPlayer, gameState.selectedCard, row, col);

                    if (success) {
                        gameState.selectedCard = null;
                    }
                }
            }
        }

        function handleSwap(assassin, targetRow, targetCol) {
            const targetUnit = gameState.board[targetRow]?.[targetCol];
            if (gameState.gameOver || gameState.phase !== 'battle' || assassin.player !== gameState.currentPlayer ||
                assassin.type !== 'shadowMage' || assassin.hasMoved || assassin.hasAttacked ||
                gameState.frozenUnits.some(f => f.id === assassin.id) || !targetUnit || targetUnit === assassin ||
                targetUnit.player !== assassin.player || Math.abs(assassin.row - targetRow) + Math.abs(assassin.col - targetCol) > 3 ||
                (targetRow === 2 && (targetCol === 0 || targetCol === 6))) return false;
            [assassin.row, targetUnit.row] = [targetUnit.row, assassin.row];
            [assassin.col, targetUnit.col] = [targetUnit.col, assassin.col];
            gameState.board[assassin.row][assassin.col] = assassin;
            gameState.board[targetUnit.row][targetUnit.col] = targetUnit;
            assassin.hasMoved = true;
            assassin.hasUsedSkill = true;
            sendGameAction();
            return true;
        }

        function performErosion(attacker, target, sacrifice) {
            if (gameState.gameOver || gameState.phase !== 'battle' || attacker.type !== 'shadowLord' ||
                attacker.player !== gameState.currentPlayer || attacker.hasMoved || attacker.hasAttacked ||
                gameState.frozenUnits.some(f => f.id === attacker.id) || !gameState.units.includes(target) ||
                target.player === attacker.player || Math.abs(attacker.row - target.row) + Math.abs(attacker.col - target.col) > 1) return false;
            let damage = attacker.damage + (attacker.bonusDamage || 0);
            const frozen = gameState.frozenUnits.some(f => f.id === target.id);
            if (target.type === 'phaseBeast') damage = Math.ceil(damage / 2);
            if (target.type === 'shieldWarrior' && !frozen && !target.lastTurnHasMoved && !target.lastTurnHasAttacked) damage = Math.max(0, damage - 2);
            if (!frozen) damage = Math.max(0, damage - (target.shield || 0));
            if (damage < target.health) return false;
            const allies = gameState.units.filter(u => u.player === attacker.player && u !== attacker);
            if (!allies.length) return false;
            if (!sacrifice) {
                gameState.erosionTarget = target;
                clearHighlights();
                allies.forEach(u => {
                    const cell = document.querySelector(`.cell[data-row="${u.row}"][data-col="${u.col}"]`);
                    if (cell) cell.classList.add('swappable');
                });
                if (!gameState.aiPlayers[attacker.player - 1]) notifyPlayer('Choose a friendly unit to sacrifice and complete Erosion.');
                return false;
            }
            if (!allies.includes(sacrifice)) return false;
            applyDamageToTarget(sacrifice, Infinity);
            target.player = attacker.player;
            target.health = target.maxHealth;
            target.shield = 0;
            target.bonusDamage = 0;
            target.hasMoved = true;
            target.hasAttacked = true;
            target.hasUsedSkill = true;
            gameState.frozenUnits = gameState.frozenUnits.filter(f => f.id !== target.id);
            attacker.hasAttacked = true;
            attacker.hasUsedSkill = true;
            gameState.erosionTarget = null;
            gameState.erosionMode = false;
            checkGameEnd();
            sendGameAction();
            return true;
        }

        function highlightSwapRange(unit,type) {
            // 新增橙色交换Range
            for (let row = 0; row < 5; row++) {
                for (let col = 0; col < 7; col++) {
                    // 计算与Unit的距离
                    const rowDiff = Math.abs(unit.row - row);
                    const colDiff = Math.abs(unit.col - col);
                    const distance = rowDiff + colDiff;

                    // 2格内的友方Unit
                    if (distance <= type &&
                        gameState.board[row][col]?.player === unit.player &&
                        gameState.board[row][col].id !== unit.id) {

                        const cell = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
                        cell.classList.add('swappable'); // 新增CSS类
                    }
                }
            }
        }

        //清除所有高亮
        function clearHighlights() {
            const cells = document.querySelectorAll('.cell');
            cells.forEach(cell => {
                cell.classList.remove('movable', 'attackable', 'swappable');
            });
        }

        //查看是否拥有Skill
        function CheckSkill(cellContent) {
            moving = 0;
            if (cellContent.type === 'shadowMage') {
                if (document.getElementById('skill-btn').classList.contains('button-glowing')) document.getElementById('skill-btn').classList.remove('button-glowing');
                document.getElementById('skill-btn').style.display = 'inline-block';
                document.getElementById('skill-btn').textContent = 'Shadow Shift';
            } else if (cellContent.type === 'minotaur') {
                if (document.getElementById('skill-btn').classList.contains('button-glowing')) document.getElementById('skill-btn').classList.remove('button-glowing');
                document.getElementById('skill-btn').style.display = 'inline-block';
                document.getElementById('skill-btn').textContent = 'Wild Blessing';
            } else if (cellContent.type === 'shadowLord') {
                if (document.getElementById('skill-btn').classList.contains('button-glowing')) document.getElementById('skill-btn').classList.remove('button-glowing');
                document.getElementById('skill-btn').style.display = 'inline-block';
                document.getElementById('skill-btn').textContent = 'Erosion';
                highlightErosionRange(cellContent,1);
            } else if (cellContent.type === 'lightPriest') {
                if (document.getElementById('skill-btn').classList.contains('button-glowing')) document.getElementById('skill-btn').classList.remove('button-glowing');
                document.getElementById('skill-btn').style.display = 'inline-block';
                document.getElementById('skill-btn').textContent = 'Heal';
            } else {
                if (document.getElementById('skill-btn').classList.contains('button-glowing')) document.getElementById('skill-btn').classList.remove('button-glowing');
                document.getElementById('skill-btn').style.display = 'none';
            }
        }

        //Skill使用
        function UseSkill() {
            const unit = gameState.selectedUnit;
            if (!canHumanAct() || !unit || gameState.gameOver || isAnimating || gameState.phase !== 'battle' ||
                gameState.aiPlayers[gameState.currentPlayer - 1] || unit.player !== gameState.currentPlayer ||
                unit.hasMoved || unit.hasAttacked || unit.hasUsedSkill || gameState.frozenUnits.some(f => f.id === unit.id)) return;
            gameState.healingUnit = null;
            gameState.erosionTarget = null;
            gameState.erosionMode = false;
            moving = 0;
            clearHighlights();
            if (unit.type === 'shadowMage') {
                moving = 1;
                highlightSwapRange(unit, 3);
            } else if (unit.type === 'minotaur') {
                gameState.units.forEach(ally => {
                    if (ally !== unit && ally.player === unit.player && Math.abs(ally.row - unit.row) + Math.abs(ally.col - unit.col) === 1) {
                        ally.bonusDamage = (ally.bonusDamage || 0) + 1;
                    }
                });
                unit.hasAttacked = true;
                unit.hasUsedSkill = true;
                gameState.selectedUnit = null;
                document.getElementById('skill-btn').style.display = 'none';
                sendGameAction();
                updateUI();
            } else if (unit.type === 'shadowLord') {
                gameState.erosionMode = true;
                highlightErosionRange(unit, 1);
            } else if (unit.type === 'lightPriest') {
                gameState.healingUnit = unit;
                gameState.units.forEach(ally => {
                    if (ally !== unit && ally.player === unit.player && ally.health < ally.maxHealth &&
                        Math.abs(ally.row - unit.row) + Math.abs(ally.col - unit.col) <= unit.attackRange) {
                        const cell = document.querySelector(`.cell[data-row="${ally.row}"][data-col="${ally.col}"]`);
                        if (cell) cell.classList.add('swappable');
                    }
                });
            }
            updateUI();
        }

        // Battle的Click to 处理
        async function handleBattlePhaseClick(row, col) {
            const cellContent = gameState.board[row][col];
            const selected = gameState.selectedUnit;
            if (selected && cellContent === selected && (gameState.healingUnit || gameState.erosionMode || moving === 1)) {
                gameState.healingUnit = null;
                gameState.erosionTarget = null;
                gameState.erosionMode = false;
                moving = 0;
                clearHighlights();
                highlightMovementAndAttackOptions(selected, selected.hasMoved);
                return;
            }
            let success = false;
            if (selected && gameState.healingUnit === selected) {
                if (cellContent && cellContent !== selected && cellContent.player === selected.player &&
                    cellContent.health < cellContent.maxHealth && !selected.hasAttacked &&
                    Math.abs(selected.row - row) + Math.abs(selected.col - col) <= selected.attackRange) {
                    cellContent.health = Math.min(cellContent.maxHealth, cellContent.health + 2);
                    selected.hasAttacked = true;
                    selected.hasUsedSkill = true;
                    success = true;
                }
            } else if (selected && gameState.erosionMode) {
                if (gameState.erosionTarget && cellContent?.player === selected.player) {
                    success = performErosion(selected, gameState.erosionTarget, cellContent);
                } else if (cellContent && cellContent.player !== selected.player) {
                    success = performErosion(selected, cellContent);
                }
            } else if (selected && moving === 1) {
                success = handleSwap(selected, row, col);
            } else if (cellContent && cellContent.player === gameState.currentPlayer) {
                clearHighlights();
                gameState.selectedUnit = null;
                if (!cellContent.hasAttacked && (!cellContent.hasMoved || cellContent.type === 'shadowAssassin' || cellContent.type === 'techFatherRevenge') &&
                    !gameState.frozenUnits.some(f => f.id === cellContent.id)) {
                    gameState.selectedUnit = cellContent;
                    CheckSkill(cellContent);
                    highlightMovementAndAttackOptions(cellContent, cellContent.hasMoved);
                }
                return;
            } else if (selected) {
                if (isCellAttackable(selected, row, col)) success = await attack(selected, row, col);
                else if (isCellMovable(selected, row, col)) success = moveUnit(selected, row, col);
            }
            if (success) {
                gameState.selectedUnit = null;
                gameState.healingUnit = null;
                gameState.erosionTarget = null;
                gameState.erosionMode = false;
                moving = 0;
                document.getElementById('skill-btn').style.display = 'none';
                clearHighlights();
                sendGameAction();
            }
        }

        // 高亮Can move和Can attack的格子
        function highlightMovementAndAttackOptions(unit, type) {
            for (let row = 0; row < 5; row++) {
                for (let col = 0; col < 7; col++) {

                    if (type == 0 && isCellMovable(unit, row, col)) {
                        const cell = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
                        if (cell) cell.classList.add('movable');
                    }

                    if (isCellAttackable(unit, row, col)) {
                        const cell = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
                        if (cell) cell.classList.add('attackable');
                    }
                }
            }
            
            if (unit.type === 'shadowLord' && gameState.erosionMode) {
                highlightErosionRange(unit, 1);
            }
        }

        // 检查格子是否Can move
        function isCellMovable(unit, row, col) {
            if (!unit || unit.hasMoved || unit.hasAttacked || gameState.frozenUnits.some(f => f.id === unit.id) ||
                !Number.isInteger(row) || !Number.isInteger(col) || row < 0 || row >= 5 || col < 0 || col >= 7 ||
                (row === 2 && (col === 0 || col === 6))) return false;
            // 检查格子是否为空
            if (gameState.board[row][col] !== null) return false;

            // 检查move距离
            const rowDiff = Math.abs(unit.row - row);
            const colDiff = Math.abs(unit.col - col);
            
            // 牛头人只能左右move
            if (unit.type === 'minotaur') {
                if (colDiff !== 1 || rowDiff !== 0) return false;
            } 

            // Phase Beast：只能斜向move一格
            if (unit.type === 'phaseBeast') {
                if (rowDiff === 1 && colDiff === 1) {
                    return gameState.board[row][col] === null;
                } else {
                    return false;
                }
            }
            else{
            // 检查move方向限制（除了低级Shadow）
                if (rowDiff + colDiff > 1 || (rowDiff === 0 && colDiff === 0)) return false;
            if (unit.type !== 'shadowAssassin') {
                const colDirection = col - unit.col;
                
                // Player 1的Unit不能向左move（col < unit.col）
                if (unit.player === 1 && colDirection < 0) {
                    return false;
                }
                
                // Player 2的Unit不能向右move（col > unit.col）
                if (unit.player === 2 && colDirection > 0) {
                    return false;
                    }
                }
            }

            return true;
        }

        // 检查格子是否Can attack
        function isCellAttackable(unit, row, col) {
            if (!unit || unit.hasAttacked || (unit.hasMoved && unit.type !== 'shadowAssassin' && unit.type !== 'techFatherRevenge') ||
                gameState.frozenUnits.some(f => f.id === unit.id) || !Number.isInteger(row) || !Number.isInteger(col) ||
                row < 0 || row >= 5 || col < 0 || col >= 7) return false;
            if (unit.damage + (unit.bonusDamage || 0) == 0) return false;

            const target = gameState.board[row][col];
            const isBase = !target && row === 2 && (col === 0 || col === 6);

            // 检查ATKRange
            const rowDiff = Math.abs(unit.row - row);
            const colDiff = Math.abs(unit.col - col);
            const distance = rowDiff + colDiff;

            // 检查是否是Enemy Unit或Enemy base
            if (isBase && distance <= unit.attackRange) {
                const basePlayer = col === 0 ? 1 : 2;
                return basePlayer !== unit.player && gameState.players[basePlayer - 1].health > 0;
            } else if (!target) {
                return false;
            } else if (target.player === unit.player) {
                return false;
            }

            // 如果是高级Shadow且处于侵蚀模式，检查是否可以侵蚀
            if (unit.type === 'shadowLord' && gameState.erosionMode) {
                const totalDamage = unit.damage + (unit.bonusDamage || 0);
                if (totalDamage >= target.health) {
                    return distance <= unit.attackRange;
                }
            }

            return distance <= unit.attackRange;
        }

        // 处理卡牌Select
        function handleCardClick(playerId, cardType, heldCard) {
            const hand = gameState.players[playerId - 1].hand;
            const chosenCard = hand.includes(heldCard) && heldCard.key === cardType ? heldCard : hand.find(card => card.key === cardType);
            window.inspectedCard = chosenCard;
            window.inspectedUnit = null;
            if (!canHumanAct() || gameState.gameOver || isAnimating || gameState.currentPlayer !== playerId || gameState.aiPlayers[playerId - 1]) {
                if (typeof renderPlayerExperience === 'function') renderPlayerExperience();
                return;
            }

            if (gameState.phase === 'placement') {
                if (gameState.selectedCard === cardType && window.selectedHandCard === chosenCard) {
                    gameState.selectedCard = null;
                    gameState.selectedSpell = null;
                    window.selectedHandCard = null;
                } else {
                    gameState.selectedCard = cardType;
                    window.selectedHandCard = chosenCard;
                    // 只允许选中Spell卡时设置selectedSpell
                    gameState.selectedSpell = cardType in spellDefinitions ? cardType : null;
                }
            }
            // 如果选中的是ReinforcementsSpell，不做后续操作（不Enter选Unit/基地流程）
            updateUI();
        }

        // data-skill
        function endTurn(event) {
            if (!canLocalPlayerAct() || gameState.gameOver || isAnimating || (event && (!canHumanAct() || gameState.aiPlayers[gameState.currentPlayer - 1]))) return;
            // 检查游戏是否已经结束
            if ((gameState.players[0].health <= 0 || gameState.players[1].health <= 0) && !(window.selectedBoss && window.selectedBoss.type === 'techFather' && isTechFatherRevengeAlive())) {
                console.log('Game over: turn switching stopped');
                return;
            }

            // 记录上一回合的APStatus，并重置本回合Status
            gameState.units.forEach(unit => {
                if (unit.player !== gameState.currentPlayer) return;
                unit.lastTurnHasAttacked = unit.hasAttacked;
                unit.lastTurnHasMoved = unit.hasMoved;
                unit.hasAttacked = false;
                unit.hasMoved = false;
                unit.hasUsedSkill = false; // 重置Skill使用Status
                unit.bonusDamage = 0; // Wild Blessing加成回合结束清零
                // 重置Shadow Shift加成
                if (unit.shadowMoveBonus) {
                    delete unit.shadowMoveBonus;
                }
            });

            //冻结机制修正：递减duration
            gameState.frozenUnits.forEach(f => {
                if (f.duration !== undefined) f.duration--;
            });
            // 过滤掉duration为0的，或（兼容老冻结）本方回合时无duration的
            gameState.frozenUnits = gameState.frozenUnits.filter(f => {
                if (f.duration !== undefined) return f.duration > 0;
                return f.player !== gameState.currentPlayer;
            });

            //取消Skill显示
            document.getElementById('skill-btn').style.display = 'none';

            // 切换Player 
            if (gameState.extraTurnPlayer === gameState.currentPlayer) {
                gameState.extraTurnPlayer = null;
            } else {
                gameState.currentPlayer = gameState.currentPlayer === 1 ? 2 : 1;
            }
            gameState.turnCount += 1;

            // 为当前Player 恢复AP点数（确保是数字）
            const playerIndex = gameState.currentPlayer - 1;
            const currentPlayer = gameState.players[playerIndex];
            const maxAP = currentPlayer.maxAp || 6;

            // BOSS机制：Shadow Council每回合只恢复1点AP点数
            if (window.selectedBoss && window.selectedBoss.type === 'shadowCouncil' && gameState.currentPlayer === 2) {
                currentPlayer.actionPoints = Math.min((parseInt(currentPlayer.actionPoints) || 0) + 1, maxAP);
            } else if(window.selectedBoss && window.selectedBoss.type === 'frostQueen' && gameState.currentPlayer === 2){
                // 确保AP是数字，然后增加2点，但不超过最大值6
                currentPlayer.actionPoints = Math.min((parseInt(currentPlayer.actionPoints) || 0) + 3, maxAP);
            } else if(window.selectedBoss && window.selectedBoss.type === 'techFather' && gameState.currentPlayer === 2){
                // Iron Godfather每回合恢复3点操作点数
                currentPlayer.actionPoints = Math.min((parseInt(currentPlayer.actionPoints) || 0) + 3, maxAP);
            } else {
                // Player 和AI都按各自apPerTurn恢复
                let apPerTurn = currentPlayer.apPerTurn || 2;
                let logEnemyName = '';
                // AI剧情/敌人分支
                if (gameState.currentPlayer === 2) {
                    if (window._storyEnemyInfo && window._storyEnemyInfo.apPerTurn) {
                        apPerTurn = window._storyEnemyInfo.apPerTurn;
                        logEnemyName = window._storyEnemyInfo.name || '';
                    } else if (window._storyEnemyBattle && window._storyEnemyBattle.enemyName) {
                        logEnemyName = window._storyEnemyBattle.enemyName;
                        const enemy = ENEMY_POOL.find(e => e.name === window._storyEnemyBattle.enemyName);
                        if (enemy && enemy.apPerTurn) apPerTurn = enemy.apPerTurn;
                    }
                }
                const beforeAP = parseInt(currentPlayer.actionPoints) || 0;
                currentPlayer.actionPoints = Math.min(beforeAP + apPerTurn, maxAP);
                console.log(`[AP recovery] Player ${gameState.currentPlayer}, per turn ${apPerTurn}, ${beforeAP} -> ${currentPlayer.actionPoints}`);
            }

            // 重置抽卡计数和Cost
            gameState.drawCount = 0;
            gameState.drawCost = 1;

            // 重置Select
            gameState.selectedCard = null;
            gameState.selectedUnit = null;
            gameState.selectedSpell = null;
            gameState.erosionMode = false;
            gameState.erosionTarget = null;
            gameState.healingUnit = null;
            moving = 0;
            clearHighlights();

            // 切换阶段
            gameState.phase = 'placement';

            // 如果是AI模式且轮到AIPlayer ，延迟执行AI回合
            if (gameState.aiPlayers[gameState.currentPlayer - 1]) {
                const delay = getAIDelay();
                setTimeout(() => {
                    aiTurn();
                }, delay); // 使用动态延迟
            }

            // BOSS机制：Shadow Council每回合自动召唤低级Shadow
            if (window.selectedBoss && window.selectedBoss.type === 'shadowCouncil' && gameState.currentPlayer === 2) {
                // Player 2的放置位置（右侧）
                const availablePositions = [];
                for (let row = 0; row < 5; row++) {
                    for (let col = 5; col <= 6; col++) {
                        if (gameState.board[row][col] === null && !(row === 2 && col === 6)) {
                            availablePositions.push({ row, col });
                        }
                    }
                }
                if (availablePositions.length > 0) {
                    // 随机选一个空位
                    const pos = availablePositions[Math.floor(Math.random() * availablePositions.length)];
                    // 直接召唤低级Shadow（shadowAssassin），不消耗AP点
                    const unitDef = unitDefinitions['shadowAssassin'];
                    const unit = {
                        id: Date.now() + Math.random(),
                        type: 'shadowAssassin',
                        player: 2,
                        row: pos.row,
                        col: pos.col,
                        health: unitDef.health,
                        maxHealth: unitDef.health,
                        attackRange: unitDef.attackRange,
                        damage: unitDef.damage,
                        skills: unitDef.skills,
                        hasAttacked: false,
                        hasMoved: false,
                        shield: 0,
                        lastTurnHasAttacked: false,
                        lastTurnHasMoved: false,
                        bonusDamage: 0
                    };
                    gameState.board[pos.row][pos.col] = unit;
                    gameState.units.push(unit);
                }
            }

            // 更新UI
            updateUI();

            sendGameAction();

            // Iron Godfather齐心协力结算（回合开始时）
            if(window.selectedBoss && window.selectedBoss.type === 'techFather' && gameState.currentPlayer === 2){
                // 先清零所有HumanUnit的bonusDamage
                gameState.units.forEach(unit => {
                    if(unit.player === 2 && unitDefinitions[unit.type].type === 'human'){
                        unit.bonusDamage = 0;
                    }
                });
                // 结算齐心协力
                gameState.units.forEach(unit => {
                    if(unit.player === 2 && unitDefinitions[unit.type].type === 'human'){
                        let bonus = 0;
                        for(let dr = -1; dr <= 1; dr++){
                            for(let dc = -1; dc <= 1; dc++){
                                if(dr === 0 && dc === 0) continue;
                                const nr = unit.row + dr;
                                const nc = unit.col + dc;
                                if(nr >= 0 && nr < 5 && nc >= 0 && nc < 7){
                                    const neighbor = gameState.board[nr][nc];
                                    if(neighbor && neighbor.player === 2 && unitDefinitions[neighbor.type].type === 'human'){
                                        bonus++;
                                    }
                                }
                            }
                        }
                        unit.bonusDamage = bonus;
                    }
                });
            }
        }

        // 处理抽卡
        function handleDrawCard() {
            if (!canHumanAct() || gameState.gameOver || isAnimating || gameState.phase !== 'placement' || gameState.aiPlayers[gameState.currentPlayer - 1]) return;
            const playerIndex = gameState.currentPlayer - 1;
            const player = gameState.players[playerIndex];
            const currentAP = parseInt(player.actionPoints) || 0;
            const cost = parseInt(gameState.drawCost) || 1;

            if (currentAP < cost) {
                notifyPlayer(`Requires ${cost} AP; you have ${currentAP}.`);
                return;
            }

            if (drawCard(gameState.currentPlayer)) {
                player.actionPoints = currentAP - cost; // 确保数字运算
                gameState.drawCount += 1;
                gameState.drawCost = gameState.drawCount < 2 ? 1 : 2;
                updateUI();
                sendGameAction();
            }
        }

        // AI抽卡逻辑
        function aiDrawCard() {
            const playerIndex = gameState.currentPlayer - 1; // 当前AIPlayer 
            const player = gameState.players[playerIndex];
            const currentAP = parseInt(player.actionPoints) || 0;
            const cost = parseInt(gameState.drawCost) || 1;

            // AI抽卡策略：如果Hand少于4张且AP力足够，就抽卡
            if (currentAP >= cost && player.hand.length < 4) {
                if (drawCard(gameState.currentPlayer)) {
                    player.actionPoints = currentAP - cost;
                    gameState.drawCount += 1;
                    gameState.drawCost = gameState.drawCount < 2 ? 1 : 2;
                    aiLog(`AI player ${gameState.currentPlayer} drew a card`);
                    // 立即更新UI显示抽卡结果
                    updateUI();
                    return true;
                }
            }
            return false;
        }

        // AI放置Unit和使用Spell逻辑
        function aiPlaceUnits() {
            const playerIndex = gameState.currentPlayer - 1; // 当前AIPlayer 
            const player = gameState.players[playerIndex];
            let currentAP = parseInt(player.actionPoints) || 0;

            if (currentAP === 0) {
                aiLog("AI has no AP; skipping deployment");
                return false;
            }

            // 先尝试抽卡
            if (aiDrawCard()) {
                currentAP = parseInt(player.actionPoints) || 0;
            }

            // 优先释放Frost Nova（在抽卡后，Spell和Unit放置前）
            if (window.selectedBoss && window.selectedBoss.type === 'frostQueen' && gameState.currentPlayer === 2) {
                if (player.hand.some(card => card.key === 'frostNova') && currentAP >= 3 && gameState.units.filter(u => u.player === 1).length >= 2) {
                    const frostNovaUsed = aiUseSpell('frostNova');
                    if (frostNovaUsed) {
                        updateUI();
                        aiLog('AI Frost Queen prioritizes Frost Nova');
                        return true;
                    }
                }
            }

            // 先尝试使用Spell卡
            const spellCards = player.hand.filter(cardObj => cardObj.key in spellDefinitions && currentAP >= cardObj.cost);
            if (spellCards.length > 0) {
                for (const cardObj of spellCards) {
                    const spellDef = spellDefinitions[cardObj.key];
                    if (currentAP < cardObj.cost) continue;
                    const success = aiUseSpell(cardObj.key);
                    if (success) {
                        aiLog(`AI cast ${spellDef.name}`);
                        currentAP -= cardObj.cost;
                        recordAIDecision('use_spell', {
                            spellType: cardObj.key,
                            cost: cardObj.cost,
                            actionPoints: currentAP,
                            handSize: player.hand.length
                        });
                        updateUI();
                        return true;
                    }
                }
            }

            // 尝试放置一个Unit
            // 重新获取当前Status
            currentAP = parseInt(player.actionPoints) || 0;
            if (currentAP === 0) {
                aiLog("AI has no AP; skipping deployment");
                return false;
            }

            // 重新获取可用位置
            const availablePositions = [];
            if (gameState.currentPlayer === 1) {
                // Player 1的放置位置（左侧）
                for (let row = 0; row < 5; row++) {
                    for (let col = 0; col <= 1; col++) {
                        if (gameState.board[row][col] === null && !(row === 2 && col === 0)) {
                            availablePositions.push({ row, col });
                        }
                    }
                }
            } else {
                for (let row = 0; row < 5; row++) {
                // Player 2的放置位置（右侧）
                    for (let col = 5; col <= 6; col++) {
                        if (gameState.board[row][col] === null && !(row === 2 && col === 6)) {
                            availablePositions.push({ row, col });
                        }
                    }
                }
            }

            if (availablePositions.length === 0) {
                aiLog("AI has no legal deployment square");
                return false;
            }

            // 重新获取Hand中的Unit卡
            const unitCards = player.hand.filter(cardObj => cardObj.key in unitDefinitions && currentAP >= cardObj.cost);
            if (unitCards.length === 0) {
                aiLog("AI has no playable unit cards");
                return false;
            }

            // 按Cost和重要性排序Unit卡
            unitCards.sort((a, b) => a.cost - b.cost); // Cost低优先
            // Select第一个可放置的Unit卡
            const cardObj = unitCards[0];
            // 随机Select一个可用位置
            const pos = availablePositions[Math.floor(Math.random() * availablePositions.length)];
            // 放置Unit
            const success = placeUnit(gameState.currentPlayer, cardObj.key, pos.row, pos.col);
                    if (success) {
                aiLog(`AI deploys ${cardObj.name || cardObj.key} for ${cardObj.cost} AP`);
                        updateUI();
                return true;
                    }
            return false;
        }

        // AI使用Spell
        function aiUseSpell(spellType) {
            switch (spellType) {
                case 'healPack':
                    // Healing Kit: 寻找需要heal的AIUnit
                    const damagedUnits = gameState.units.filter(unit => 
                        unit.player === gameState.currentPlayer && unit.health < unit.maxHealth
                    );
                    if (damagedUnits.length > 0) {
                        // 优先heal血量最低的Unit
                        damagedUnits.sort((a, b) => a.health - b.health);
                        const target = damagedUnits[0];
                        return aiApplySpellEffect(spellType, target);
                    }
                    return false;

                case 'shieldCard':
                    // Shield: 依次查找没有Shield的己方Unit（血量高优先）
                    const candidates = gameState.units
                        .filter(unit => unit.player === gameState.currentPlayer)
                        .sort((a, b) => b.health - a.health);
                    for (const unit of candidates) {
                        if (!unit.shield || unit.shield < 1) {
                            return aiApplySpellEffect(spellType, unit);
                        }
                    }
                    return false;

                case 'drawCard':
                    // Reinforcements: 直接使用
                    return aiApplySpellEffect(spellType, null);

                case 'resetCard':
                    // Recall: 重置血量低的Unit
                    const lowHealthUnits = gameState.units.filter(unit => 
                        unit.player === gameState.currentPlayer && unit.health < unit.maxHealth * 0.5
                    );
                    if (lowHealthUnits.length > 0) {
                        // 优先重置血量最低的Unit
                        lowHealthUnits.sort((a, b) => a.health - b.health);
                        const target = lowHealthUnits[0];
                        return aiApplySpellEffect(spellType, target);
                    }
                    return false;

                case 'frostNova':
                    if (!gameState.units.some(unit => unit.player !== gameState.currentPlayer)) return false;
                    return aiApplySpellEffect(spellType, null);

                case 'shadowCorrosion':
                    // AIShadow Corrosion：对手有Hand就打，否则不打（只影响那一张）
                    const aiOpponentIdx = (gameState.currentPlayer === 1 ? 1 : 0);
                    const aiOpponent = gameState.players[aiOpponentIdx];
                    if (aiOpponent.hand.length === 0) return false;
                    return aiApplySpellEffect('shadowCorrosion', null);

                case 'necromancy':
                    if (!gameState.units.some(unit => unit.player !== gameState.currentPlayer)) return false;
                    return aiApplySpellEffect(spellType, null);

                default:
                    return false;
            }
        }

        // AI与Player 共用Spell结算，Cost和卡牌归属保持一致。
        function aiApplySpellEffect(spellType, target) {
            return applySpellEffect(spellType, target);
        }

        let activeAITurn = null;

        function cancelAITurn() {
            activeAITurn = null;
        }

        function isAITurnActive(turn) {
            return turn && turn === activeAITurn && !gameState.gameOver &&
                turn.board === gameState.board && turn.player === gameState.currentPlayer &&
                turn.number === gameState.turnCount && gameState.aiPlayers[turn.player - 1];
        }

        // AI切换函数
        function toggleAI(playerId) {
            if (urlParams.has('room') && isConnected) return;
            const playerIndex = playerId - 1;
            gameState.aiPlayers[playerIndex] = !gameState.aiPlayers[playerIndex];
            
            // 更新按钮Status
            const button = document.getElementById(`ai-toggle-${playerId}`);
            if (gameState.aiPlayers[playerIndex]) {
                button.classList.add('active');
                button.textContent = '[AI on]';
            } else {
                button.classList.remove('active');
                button.textContent = '[AI]';
            }
            
            updateUI();
            if (gameState.currentPlayer === playerId) {
                if (gameState.aiPlayers[playerIndex]) aiTurn();
                else cancelAITurn();
            }
        }

        // 更新AI按钮Status
        function updateAIButtonStates() {
            for (let i = 1; i <= 2; i++) {
                const button = document.getElementById(`ai-toggle-${i}`);
                if (gameState.aiPlayers[i - 1]) {
                    button.classList.add('active');
                    button.textContent = '[AI on]';
                } else {
                    button.classList.remove('active');
                    button.textContent = '[AI]';
                }
            }
        }

        // 获取AI延迟时间
        function getAIDelay() {
            // 判断是否为AI vs AI模式
            const isAIVsAI = gameState.aiPlayers[0] && gameState.aiPlayers[1];
            return isAIVsAI ? 0 : 300; // AI vs AI时快速，Player  vs AI时保持原速度
        }

        // 判断是否应该输出详细日志
        function shouldLogDetailed() {
            // AI vs AI模式时不输出详细日志
            const isAIVsAI = gameState.aiPlayers[0] && gameState.aiPlayers[1];
            return !isAIVsAI;
        }

        // AI日志输出函数
        function aiLog(message, force = false) {
            if (force || shouldLogDetailed()) {
                console.log(message);
            }
        }

        // 评估ATK操作的评分
        function aiEvaluateAttackAction(unit) {
            let score = 0;
            const strategies = gameState.aiLearning.strategies;
            
            // 获取Can attack的目标
            const attackableTargets = [];
            for (let row = 0; row < 5; row++) {
                for (let col = 0; col < 7; col++) {
                    if (isCellAttackable(unit, row, col)) {
                        attackableTargets.push({ row, col });
                    }
                }
            }
            
            if (attackableTargets.length === 0) return 0;
            
            // 评估每个ATK目标的分数
            for (const target of attackableTargets) {
                const targetUnit = gameState.board[target.row][target.col];
                
                if (targetUnit && targetUnit.player !== unit.player) {
                    // ATKEnemy Unit
                    let targetScore = 0;
                    
                    // 基础分数：造成伤害
                    const damage = unit.damage + (unit.bonusDamage || 0);
                    targetScore += damage * strategies.attackPriority;
                    
                    // 击杀Enemy Unit额外奖励
                    if (damage >= targetUnit.health) {
                        targetScore += 20 * strategies.attackPriority;
                    }
                    
                    // ATK高威胁Unit（ATK力高的）额外奖励
                    targetScore += targetUnit.damage * 2 * strategies.attackPriority;
                    
                    // ATK低血量Unit额外奖励
                    if (targetUnit.health <= 2) {
                        targetScore += 10 * strategies.attackPriority;
                    }
                    
                    score = Math.max(score, targetScore);
                    
                } else if ((target.row === 2 && target.col === 0) || (target.row === 2 && target.col === 6)) {
                    // ATKBase
                    const basePlayer = target.col === 0 ? 1 : 2;
                    if (basePlayer !== unit.player) {
                        const damage = unit.damage + (unit.bonusDamage || 0);
                        let baseScore = damage * 3 * strategies.attackPriority; // ATKBase基础分数更高
                        
                        // 如果Base血量低，额外奖励
                        const playerIndex = basePlayer - 1;
                        const player = gameState.players[playerIndex];
                        if (player.health <= 3) {
                            baseScore += 50 * strategies.attackPriority; // 致命一击奖励
                        }
                        
                        score = Math.max(score, baseScore);
                    }
                }
            }
            
            return score;
        }

        // 评估move操作的评分
        function aiEvaluateMoveAction(unit) {
            let score = 0;
            const strategies = gameState.aiLearning.strategies;
            
            // 获取Can move的位置
            const movablePositions = [];
            for (let row = 0; row < 5; row++) {
                for (let col = 0; col < 7; col++) {
                    if (isCellMovable(unit, row, col)) {
                        movablePositions.push({ row, col });
                    }
                }
            }
            
            if (movablePositions.length === 0) return 0;
            
            // 评估每个move位置的分数
            for (const pos of movablePositions) {
                let posScore = 0;
                
                // 检查move后是否能ATK到Enemy Unit
                for (let row = 0; row < 5; row++) {
                    for (let col = 0; col < 7; col++) {
                        const target = gameState.board[row][col];
                        if (target && target.player !== unit.player) {
                            const distance = Math.abs(pos.row - row) + Math.abs(pos.col - col);
                            if (distance <= unitDefinitions[unit.type].attackRange) {
                                posScore += 15 * strategies.moveTowardsEnemy;
                                
                                // 如果目标血量低，额外加分
                                if (target.health <= 2) {
                                    posScore += 10 * strategies.attackPriority;
                                }
                            }
                        }
                    }
                }
                
                // 检查是否接近Enemy base
                const enemyBaseCol = unit.player === 1 ? 6 : 0;
                const distanceToBase = Math.abs(pos.row - 2) + Math.abs(pos.col - enemyBaseCol);
                if (distanceToBase <= 2) {
                    posScore += 20 * strategies.moveTowardsEnemy;
                }
                
                // 检查是否远离己方Base（向前推进）
                const ownBaseCol = unit.player === 1 ? 0 : 6;
                const distanceFromOwnBase = Math.abs(pos.row - 2) + Math.abs(pos.col - ownBaseCol);
                if (distanceFromOwnBase > 1) {
                    posScore += 5 * strategies.moveTowardsEnemy;
                }
                
                // 检查move后是否会被Enemy ATK（躲避伤害）
                let vulnerabilityScore = 0;
                for (let row = 0; row < 5; row++) {
                    for (let col = 0; col < 7; col++) {
                        const enemy = gameState.board[row][col];
                        if (enemy && enemy.player !== unit.player) {
                            const distance = Math.abs(pos.row - row) + Math.abs(pos.col - col);
                            if (distance <= unitDefinitions[enemy.type].attackRange) {
                                // 如果move后会被ATK，扣分
                                vulnerabilityScore -= enemy.damage * strategies.protectLowHealth;
                            }
                        }
                    }
                }
                posScore += vulnerabilityScore;
                
                score = Math.max(score, posScore);
            }
            
            return score;
        }

        // 按UnitType识别Skill；skills 保存的是展示用中文说明。
        function aiEvaluateSkillAction(unit) {
            const strategies = gameState.aiLearning.strategies;
            if (unit.type === 'minotaur') {
                return gameState.units.filter(target => target !== unit && target.player === unit.player &&
                    Math.abs(target.row - unit.row) + Math.abs(target.col - unit.col) === 1).length * 10 * strategies.rageSkill;
            }
            if (unit.type === 'shadowMage') return aiGetSwappableTargets(unit).length ? 8 * strategies.shadowMoveSkill : 0;
            if (unit.type === 'shadowLord') return aiCanUseSkill(unit) ? 25 * strategies.erosionSkill : 0;
            return 0;
        }

        // Shadow Mage只与三格内的友军交换。
        function aiGetSwappableTargets(unit) {
            return gameState.units.filter(target => target !== unit && target.player === unit.player &&
                Math.abs(target.row - unit.row) + Math.abs(target.col - unit.col) <= 3);
        }

        // AI回合管理：在AI回合开始时自动执行
        function aiTurn() {
            if (gameState.gameOver || !gameState.aiPlayers[gameState.currentPlayer - 1] || isAITurnActive(activeAITurn)) return;
            const turn = { board: gameState.board, player: gameState.currentPlayer, number: gameState.turnCount };
            activeAITurn = turn;
            // 检查游戏是否已经结束
            if ((gameState.players[0].health <= 0 || gameState.players[1].health <= 0) && !(window.selectedBoss && window.selectedBoss.type === 'techFather' && isTechFatherRevengeAlive())) {
                aiLog(`Game over: AI player ${gameState.currentPlayer} stops`);
                return;
            }

            const playerIndex = gameState.currentPlayer - 1; // 当前AIPlayer 
            const player = gameState.players[playerIndex];
            const currentAP = parseInt(player.actionPoints) || 0;

            aiLog(`=== AI player ${gameState.currentPlayer}: turn start ===`);
            aiLog(`AP: ${currentAP}`);
            aiLog(`Cards in hand: ${player.hand.length}`);
            aiLog(`Phase: ${gameState.phase}`);

            // 开始AI的逐步操作
            if (gameState.phase === 'battle') aiBattlePhase(turn);
            else aiStepByStepTurn(turn);
        }

        // AI逐步执行Turn actions
        function aiStepByStepTurn(turn) {
            if (!isAITurnActive(turn)) return;
            // 检查游戏是否已经结束
            if ((gameState.players[0].health <= 0 || gameState.players[1].health <= 0) && !(window.selectedBoss && window.selectedBoss.type === 'techFather' && isTechFatherRevengeAlive())) {
                aiLog(`Game over: AI player ${gameState.currentPlayer} stops`);
                return;
            }

            const playerIndex = gameState.currentPlayer - 1; // 当前AIPlayer 
            const player = gameState.players[playerIndex];
            const currentAP = parseInt(player.actionPoints) || 0;

            aiLog(`AI player ${gameState.currentPlayer} step: AP ${currentAP}, hand ${player.hand.length}`);

            // 第一步：抽卡
            if (aiDrawCard()) {
                const delay = getAIDelay();
                aiLog(`AI player ${gameState.currentPlayer} drew; next step in ${delay} ms`);
                setTimeout(() => {
                    aiStepByStepTurn(turn);
                }, delay);
                return;
            }

            // 第二步：放置Unit或使用Spell
            if (aiPlaceUnits()) {
                const delay = getAIDelay();
                aiLog(`AI player ${gameState.currentPlayer} played a card; next step in ${delay} ms`);
                setTimeout(() => {
                    aiStepByStepTurn(turn);
                }, delay);
                return;
            }

            // 第三步：EnterBattle
            aiLog(`AI player ${gameState.currentPlayer} finished deployment; entering battle`);
            aiEnterBattlePhase(turn);
        }

        // AI enters battle
        function aiEnterBattlePhase(turn) {
            if (!isAITurnActive(turn)) return;
            aiLog("AI enters battle");
            gameState.phase = 'battle';
            updateUI();
            
            // 延迟后开始AI的Battle操作
            const delay = getAIDelay();
            setTimeout(() => {
                aiBattlePhase(turn);
            }, delay);
        }

        // AIBattle操作
        function aiBattlePhase(turn) {
            if (!isAITurnActive(turn)) return;
            // 检查游戏是否已经结束
            if ((gameState.players[0].health <= 0 || gameState.players[1].health <= 0) && !(window.selectedBoss && window.selectedBoss.type === 'techFather' && isTechFatherRevengeAlive())) {
                aiLog(`Game over: AI player ${gameState.currentPlayer} stops`);
                return;
            }

            aiLog(`AI player ${gameState.currentPlayer} begins battle actions`);
            
            // 获取AI的Unit
            const aiUnits = gameState.units.filter(unit => unit.player === gameState.currentPlayer);
            const operableUnits = aiUnits.filter(unit => 
                !unit.hasAttacked && (!unit.hasMoved || unit.type === 'shadowAssassin' || unit.type === 'techFatherRevenge') &&
                !gameState.frozenUnits.some(f => f.id === unit.id)
            );

            if (operableUnits.length === 0) {
                aiLog("AI has no units that can act; ending turn");
                const delay = getAIDelay();
                setTimeout(() => {
                    aiEndTurn(turn);
                }, delay);
                return;
            }

            aiLog(`AI has ${operableUnits.length} units that can act`);
            
            // 更新UI显示当前Status
            updateUI();
            
            // 等待延迟后开始逐个操作Unit
            const delay = getAIDelay();
            setTimeout(() => {
                aiOperateUnits(operableUnits, 0, turn);
            }, delay);
        }

        // AI逐个操作Unit
        async function aiOperateUnits(units, index, turn) {
            if (!isAITurnActive(turn)) return;
            // 检查游戏是否已经结束
            if ((gameState.players[0].health <= 0 || gameState.players[1].health <= 0) && !(window.selectedBoss && window.selectedBoss.type === 'techFather' && isTechFatherRevengeAlive())) {
                aiLog(`Game over: AI player ${gameState.currentPlayer} stops`);
                return;
            }

            if (index >= units.length) {
                aiLog("AI finished all actions; ending turn");
                const delay = getAIDelay();
                setTimeout(() => {
                    aiEndTurn(turn);
                }, delay);
                return;
            }

            const unit = units[index];
            if (!gameState.units.includes(unit)) {
                aiOperateUnits(units, index + 1, turn);
                return;
            }
            aiLog(`AI unit: ${unitDefinitions[unit.type].name}`);

            // 牧师优先Skill
            if (unit.type === 'lightPriest' && !unit.hasUsedSkill) {
                // 寻找Range内受伤友军
                let bestTarget = null;
                let minHp = 9999;
                for (let row = 0; row < 5; row++) {
                    for (let col = 0; col < 7; col++) {
                        const target = gameState.board[row][col];
                        if (target && target.player === unit.player && target.id !== unit.id && target.health < (target.maxHealth || target.health)) {
                            const rowDiff = Math.abs(unit.row - row);
                            const colDiff = Math.abs(unit.col - col);
                            if (rowDiff + colDiff <= unit.attackRange && target.health < minHp) {
                                bestTarget = target;
                                minHp = target.health;
                            }
                        }
                    }
                }
                if (bestTarget) {
                    bestTarget.health = Math.min(bestTarget.maxHealth || bestTarget.health + 2, bestTarget.health + 2);
                    unit.hasUsedSkill = true;
                    unit.hasAttacked = true;
                    aiLog('AI priest restores 2 HP to an ally');
                    updateUI();
                    setTimeout(() => aiOperateUnits(units, index + 1, turn), getAIDelay());
                    return;
                }
            }

            // 获取所有可能的操作
            const canAttack = aiCanAttack(unit);
            const canMove = aiCanMove(unit);
            const canUseSkill = aiCanUseSkill(unit);
            
            // 计算每个操作的评分
            let attackScore = 0;
            let moveScore = 0;
            let skillScore = 0;
            
            if (canAttack) {
                attackScore = aiEvaluateAttackAction(unit);
            }
            
            if (canMove) {
                moveScore = aiEvaluateMoveAction(unit);
            }
            
            if (canUseSkill) {
                skillScore = aiEvaluateSkillAction(unit);
            }
            
            // 根据评分Select操作（添加一些随机性）
            const totalScore = attackScore + moveScore + skillScore;
            const attackProbability = totalScore > 0 ? attackScore / totalScore : 0.33;
            const skillProbability = totalScore > 0 ? skillScore / totalScore : 0.33;
            
            // 添加随机性，避免AI总是Select最高分的操作
            const randomFactor = Math.random();
            const cumulativeAttackProb = attackProbability;
            const cumulativeSkillProb = cumulativeAttackProb + skillProbability;
            
            if (canUseSkill && randomFactor >= cumulativeAttackProb && randomFactor < cumulativeSkillProb && skillScore > 0) {
                // Use skill
                aiUseSkill(unit);
                updateUI();
                aiLog(`AI ${unitDefinitions[unit.type].name} uses a skill (score: ${skillScore.toFixed(2)})`);
            } else if (canAttack && randomFactor < cumulativeAttackProb) {
                // ATK
                await aiAttackWithUnit(unit);
                updateUI();
                aiLog(`AI ${unitDefinitions[unit.type].name} attacks (score: ${attackScore.toFixed(2)})`);
            } else if (canMove) {
                // move
                await aiMoveUnit(unit);
                updateUI();
                aiLog(`AI moves ${unitDefinitions[unit.type].name} (score: ${moveScore.toFixed(2)})`);
            } else {
                aiLog(`AI ${unitDefinitions[unit.type].name} has no available action`);
            }
            
            if (!isAITurnActive(turn)) return;
            // 操作完这个Unit后，等待延迟再操作下一个Unit
            const delay = getAIDelay();
            setTimeout(() => {
                aiOperateUnits(units, index + 1, turn);
            }, delay);
        }

        // 检查AIUnit是否可以ATK
        function aiCanAttack(unit) {
            // 检查Unit是否已经ATK过
            if (unit.hasAttacked) {
                aiLog(`AI ${unitDefinitions[unit.type].name} has already attacked`);
                return false;
            }

            // 检查是否被Frozen
            if (gameState.frozenUnits.some(f => f.id === unit.id)) {
                aiLog(`AI ${unitDefinitions[unit.type].name} is frozen and cannot attack`);
                return false;
            }

            // 检查是否有Can attack的目标
            let hasAttackableTarget = false;
            for (let row = 0; row < 5; row++) {
                for (let col = 0; col < 7; col++) {
                    if (isCellAttackable(unit, row, col)) {
                        hasAttackableTarget = true;
                        break;
                    }
                }
                if (hasAttackableTarget) break;
            }
            
            if (!hasAttackableTarget) {
                aiLog(`AI ${unitDefinitions[unit.type].name} has no target in range`);
            }
            
            return hasAttackableTarget;
        }

        // 检查AIUnit是否可以move
        function aiCanMove(unit) {
            // 检查Unit是否已经move过
            if (unit.hasMoved) {
                return false;
            }

            // 检查是否被Frozen
            if (gameState.frozenUnits.some(f => f.id === unit.id)) {
                return false;
            }

            // 检查是否有Can move的位置
            for (let row = 0; row < 5; row++) {
                for (let col = 0; col < 7; col++) {
                    if (isCellMovable(unit, row, col)) {
                        return true;
                    }
                }
            }
            return false;
        }

        // 主动Skill替代本Unit本回合的AP。
        function aiCanUseSkill(unit) {
            if (unit.hasUsedSkill || unit.hasMoved || unit.hasAttacked || gameState.frozenUnits.some(f => f.id === unit.id)) return false;
            if (unit.type === 'minotaur') {
                return gameState.units.some(target => target !== unit && target.player === unit.player &&
                    Math.abs(target.row - unit.row) + Math.abs(target.col - unit.col) === 1);
            }
            if (unit.type === 'shadowMage') return aiGetSwappableTargets(unit).length > 0;
            if (unit.type === 'shadowLord') {
                return gameState.units.some(target => target !== unit && target.player === unit.player) &&
                    gameState.units.some(target => target.player !== unit.player &&
                        Math.abs(target.row - unit.row) + Math.abs(target.col - unit.col) === 1 &&
                        !target.shield && target.health <= unit.damage + (unit.bonusDamage || 0));
            }
            return false;
        }

        // 记录AI决策
        function recordAIDecision(decisionType, data) {
            const decision = {
                type: decisionType,
                data: data,
                turn: gameState.turnCount,
                phase: gameState.phase,
                timestamp: Date.now()
            };
            gameState.aiLearning.currentGameDecisions.push(decision);
        }

        // AI智能Select最佳move位置
        function aiSelectBestMovePosition(unit, movablePositions) {
            // 计算每个位置的分数
            const scoredPositions = movablePositions.map(pos => {
                let score = 0;
                
                // 检查move后是否能ATK到Enemy Unit
                for (let row = 0; row < 5; row++) {
                    for (let col = 0; col < 7; col++) {
                        const target = gameState.board[row][col];
                        if (target && target.player !== unit.player) {
                            // 计算move后到目标的距离
                            const distance = Math.abs(pos.row - row) + Math.abs(pos.col - col);
                            if (distance <= unitDefinitions[unit.type].attackRange) {
                                score += 10 * gameState.aiLearning.strategies.moveTowardsEnemy; // 应用学习权重
                                // 如果目标血量低，额外加分
                                if (target.health <= 2) {
                                    score += 5 * gameState.aiLearning.strategies.attackPriority;
                                }
                            }
                        }
                    }
                }
                
                // 检查是否接近Enemy base
                const enemyBaseCol = unit.player === 1 ? 6 : 0;
                const distanceToBase = Math.abs(pos.row - 2) + Math.abs(pos.col - enemyBaseCol);
                if (distanceToBase <= 2) {
                    score += 8 * gameState.aiLearning.strategies.moveTowardsEnemy; // 应用学习权重
                }
                
                // 检查是否远离己方Base（向前推进）
                const ownBaseCol = unit.player === 1 ? 0 : 6;
                const distanceFromOwnBase = Math.abs(pos.row - 2) + Math.abs(pos.col - ownBaseCol);
                if (distanceFromOwnBase > 1) {
                    score += 3 * gameState.aiLearning.strategies.moveTowardsEnemy; // 应用学习权重
                }
                
                return { ...pos, score };
            });
            
            // 按分数排序，Select最高分的位置
            scoredPositions.sort((a, b) => b.score - a.score);
            const selectedPosition = scoredPositions[0];
            
            // 记录决策
            recordAIDecision('move_position', {
                unitType: unit.type,
                unitPosition: { row: unit.row, col: unit.col },
                targetPosition: { row: selectedPosition.row, col: selectedPosition.col },
                score: selectedPosition.score,
                availablePositions: movablePositions.length
            });
            
            return selectedPosition;
        }

        // AImoveUnit
        async function aiMoveUnit(unit) {
            // 获取Can move的位置
            const movablePositions = [];
            for (let row = 0; row < 5; row++) {
                for (let col = 0; col < 7; col++) {
                    if (isCellMovable(unit, row, col)) {
                        movablePositions.push({ row, col });
                    }
                }
            }

            if (movablePositions.length > 0) {
                // 智能Selectmove位置
                const targetPos = aiSelectBestMovePosition(unit, movablePositions);
                const success = aiMoveUnitSilent(unit, targetPos.row, targetPos.col);
                if (success) {
                    aiLog(`AI moves ${unitDefinitions[unit.type].name} to (${targetPos.row}, ${targetPos.col})`);
                    // 新增：低级Shadow Shift后如果能ATK，必定ATK
                    if (unit.type === 'shadowAssassin' || unit.type === 'techFatherRevenge') {
                        // 检查是否有Can attack目标
                        let hasAttackableTarget = false;
                        for (let row = 0; row < 5; row++) {
                            for (let col = 0; col < 7; col++) {
                                if (isCellAttackable(unit, row, col)) {
                                    hasAttackableTarget = true;
                                    break;
                                }
                            }
                            if (hasAttackableTarget) break;
                        }
                        if (hasAttackableTarget) {
                            await aiAttackWithUnit(unit);
                            updateUI();
                            aiLog(`AI attacks immediately after Shadow Shift`);
                        }
                    }
                }
            }
        }

        // 与Player 共用move合法性，避免两套规则发生偏差。
        function aiMoveUnitSilent(unit, newRow, newCol) {
            return moveUnit(unit, newRow, newCol);
        }

        // AI智能Select最佳ATK目标
        function aiSelectBestAttackTarget(unit, attackableTargets) {
            // 分离Enemy Unit和Base
            const enemyUnits = [];
            const bases = [];
            
            for (const target of attackableTargets) {
                const targetUnit = gameState.board[target.row][target.col];
                if (targetUnit && targetUnit.player !== unit.player) {
                    enemyUnits.push({ ...target, unit: targetUnit });
                } else if ((target.row === 2 && target.col === 0) || (target.row === 2 && target.col === 6)) {
                    // Base
                    const basePlayer = target.col === 0 ? 1 : 2;
                    if (basePlayer !== unit.player) {
                        bases.push({ ...target, isBase: true, player: basePlayer });
                    }
                }
            }

            let selectedTarget;
            let decisionType = '';

            // 计算每个目标的评分
            const scoredTargets = [];
            
            // 评分Enemy Unit
            enemyUnits.forEach(target => {
                let score = 0;
                const strategies = gameState.aiLearning.strategies;
                
                // 基础分数：造成伤害
                const damage = unit.damage + (unit.bonusDamage || 0);
                score += damage * strategies.attackPriority;
                
                // 击杀Enemy Unit额外奖励
                if (damage >= target.unit.health) {
                    score += 20 * strategies.attackPriority;
                }
                
                // ATK高威胁Unit（ATK力高的）额外奖励
                score += target.unit.damage * 2 * strategies.attackPriority;
                
                // ATK低血量Unit额外奖励
                if (target.unit.health <= 2) {
                    score += 10 * strategies.attackPriority;
                }
                
                // 添加随机性
                score += (Math.random() - 0.5) * 5;
                
                scoredTargets.push({ ...target, score, type: 'enemy_unit' });
            });
            
            // 评分Base
            bases.forEach(target => {
                let score = 0;
                const strategies = gameState.aiLearning.strategies;
                
                const damage = unit.damage + (unit.bonusDamage || 0);
                score += damage * 3 * strategies.attackPriority; // ATKBase基础分数更高
                
                // 如果Base血量低，额外奖励
                const playerIndex = target.player - 1;
                const player = gameState.players[playerIndex];
                if (player.health <= 3) {
                    score += 50 * strategies.attackPriority; // 致命一击奖励
                }
                
                // 添加随机性
                score += (Math.random() - 0.5) * 5;
                
                scoredTargets.push({ ...target, score, type: 'base' });
            });
            
            // 按分数排序
            scoredTargets.sort((a, b) => b.score - a.score);
            
            if (scoredTargets.length > 0) {
                selectedTarget = scoredTargets[0];
                decisionType = selectedTarget.type === 'enemy_unit' ? 'attack_enemy_unit' : 'attack_base';
            } else {
                selectedTarget = attackableTargets[Math.floor(Math.random() * attackableTargets.length)];
                decisionType = 'random_attack';
            }

            // 记录决策
            recordAIDecision('attack_target', {
                unitType: unit.type,
                unitPosition: { row: unit.row, col: unit.col },
                targetPosition: { row: selectedTarget.row, col: selectedTarget.col },
                decisionType: decisionType,
                availableTargets: attackableTargets.length,
                selectedScore: selectedTarget.score || 0,
                skillBonus: unit.bonusDamage || 0,
                shadowMoveBonus: unit.shadowMoveBonus || false
            });

            return selectedTarget;
        }

        // AI用UnitATK
        async function aiAttackWithUnit(unit) {
            // 获取Can attack的目标
            const attackableTargets = [];
            for (let row = 0; row < 5; row++) {
                for (let col = 0; col < 7; col++) {
                    if (isCellAttackable(unit, row, col)) {
                        attackableTargets.push({ row, col });
                    }
                }
            }

            aiLog(`AI ${unitDefinitions[unit.type].name} at (${unit.row}, ${unit.col}) has ${attackableTargets.length} attack targets`);
            aiLog(`Range: ${unit.attackRange}, ATK: ${unit.damage}`);

            if (attackableTargets.length > 0) {
                // 智能SelectATK目标
                const target = aiSelectBestAttackTarget(unit, attackableTargets);

                const success = await aiAttackSilent(unit, target.row, target.col);
                if (success) {
                    const targetUnit = gameState.board[target.row][target.col];
                    if (targetUnit) {
                        aiLog(`AI ${unitDefinitions[unit.type].name} attacks ${unitDefinitions[targetUnit.type].name} at (${target.row}, ${target.col})`);
                    } else {
                        aiLog(`AI ${unitDefinitions[unit.type].name} attacks the base at (${target.row}, ${target.col})`);
                    }
                    
                    // 如果ATK成功且游戏结束，直接返回
                    if (gameState.players[0].health <= 0 || gameState.players[1].health <= 0) {
                        aiLog(`Game over after AI attack`);
                        return;
                    }
                } else {
                    aiLog(`AI attack failed its range or state check`);
                }
            } else {
                aiLog(`AI ${unitDefinitions[unit.type].name} has no attack target`);
            }
        }

        // AISkill沿用Player 的UnitType、目标限制和结算规则。
        function aiUseSkill(unit) {
            if (!aiCanUseSkill(unit)) return false;
            let success = false;
            if (unit.type === 'minotaur') {
                gameState.units.forEach(target => {
                    if (target !== unit && target.player === unit.player &&
                        Math.abs(target.row - unit.row) + Math.abs(target.col - unit.col) === 1) {
                        target.bonusDamage = (target.bonusDamage || 0) + 1;
                    }
                });
                unit.hasUsedSkill = true;
                unit.hasAttacked = true;
                success = true;
            } else if (unit.type === 'shadowMage') {
                const targets = aiGetSwappableTargets(unit);
                const enemyBaseCol = unit.player === 1 ? 6 : 0;
                targets.sort((a, b) => Math.abs(b.col - enemyBaseCol) - Math.abs(a.col - enemyBaseCol));
                success = handleSwap(unit, targets[0].row, targets[0].col);
            } else if (unit.type === 'shadowLord') {
                const sacrifices = gameState.units.filter(target => target !== unit && target.player === unit.player)
                    .sort((a, b) => unitDefinitions[a.type].cost - unitDefinitions[b.type].cost);
                const targets = gameState.units.filter(target => target.player !== unit.player)
                    .sort((a, b) => unitDefinitions[b.type].cost - unitDefinitions[a.type].cost);
                for (const target of targets) {
                    if (performErosion(unit, target, sacrifices[0])) { success = true; break; }
                }
            }
            if (success) {
                recordAIDecision('use_skill', { unitType: unit.type });
                sendGameAction();
            }
            return success;
        }

        // ATK返回Promise，调用者等待动画和伤害结算。
        function aiAttackSilent(attacker, targetRow, targetCol) {
            return attack(attacker, targetRow, targetCol);
        }

        // AIEnd turn
        function aiEndTurn(turn = activeAITurn) {
            if (!isAITurnActive(turn)) return;
            activeAITurn = null;
            if (autoPlayInterval && gameState.turnCount >= 200) {
                stopAutoPlay();
                if (gameState.currentPlayer === 2) endTurn();
                updateUI();
                alert('Autoplay stopped after 200 player turns without a winner. Take control or start a new match.');
                return;
            }
            endTurn();
        }

        // AISelect最佳放置位置
        function selectBestPosition(unitType, availablePositions) {
            const unitDef = unitDefinitions[unitType];
            
            // 根据UnitTypeSelect最佳位置
            switch (unitType) {
                case 'archer':
                case 'shadowMage':
                case 'shadowAssassin':
                    // 远程Unit优先放在后排（第4行）
                    const backRow = availablePositions.filter(pos => pos.row === 4);
                    if (backRow.length > 0) {
                        return backRow[Math.floor(Math.random() * backRow.length)];
                    }
                    break;
                    
                case 'swordsman':
                case 'shieldWarrior':
                case 'wolf':
                    // 近战Unit优先放在前排（第0行）
                    const frontRow = availablePositions.filter(pos => pos.row === 0);
                    if (frontRow.length > 0) {
                        return frontRow[Math.floor(Math.random() * frontRow.length)];
                    }
                    break;
                    
                case 'iceDragon':
                case 'minotaur':
                case 'shadowLord':
                    // 高级Unit优先放在中间行（第1-3行）
                    const middleRows = availablePositions.filter(pos => pos.row >= 1 && pos.row <= 3);
                    if (middleRows.length > 0) {
                        return middleRows[Math.floor(Math.random() * middleRows.length)];
                    }
                    break;
            }
            
            // 如果没有特定位置，优先SelectApproachBase的位置（第5列）
            const col5Positions = availablePositions.filter(pos => pos.col === 5);
            if (col5Positions.length > 0) {
                return col5Positions[Math.floor(Math.random() * col5Positions.length)];
            }
            
            // 最后随机Select
            return availablePositions[Math.floor(Math.random() * availablePositions.length)];
        }

        // 更新UI
        function updateUI() {
            if(isAnimating)return;
            // 检查游戏是否已经结束
            if ((gameState.players[0].health <= 0 || gameState.players[1].health <= 0) && !(window.selectedBoss && window.selectedBoss.type === 'techFather' && isTechFatherRevengeAlive())) {
                updateBoard();
                if (typeof renderPlayerExperience === 'function') renderPlayerExperience();
                return;
            }
            
            // 更新Player 信息
            document.getElementById('player1-health').textContent = gameState.players[0].health;
            document.getElementById('player2-health').textContent = gameState.players[1].health;

            document.getElementById('player1-health-fill').style.width =
                `${(gameState.players[0].health / gameState.players[0].maxHealth) * 100}%`;
            document.getElementById('player2-health-fill').style.width =
                `${(gameState.players[1].health / gameState.players[1].maxHealth) * 100}%`;

            // 分别显示两位Player 的操作点数
            document.getElementById('player1-action-points').textContent = gameState.players[0].actionPoints;
            document.getElementById('player2-action-points').textContent = gameState.players[1].actionPoints;

            // 更新Hand数量
            document.getElementById('player1-hand-count').textContent = gameState.players[0].hand.length;
            document.getElementById('player2-hand-count').textContent = gameState.players[1].hand.length;

            // 更新Hand显示 - 添加这行
            updateHandDisplay(1);
            updateHandDisplay(2);

            // 更新游戏板
            updateBoard();

            // 更新阶段显示
            const phaseIndicator = document.getElementById('phase-indicator');
            phaseIndicator.textContent = `Phase: ${gameState.phase === 'placement' ? 'Deployment' : 'Battle'}`;
            phaseIndicator.className = `phase-indicator ${gameState.phase === 'placement' ? 'placement-phase' : 'battle-phase'}`;

            // 更新抽卡按钮
            document.getElementById('draw-cost').textContent = gameState.drawCost;

            // 更新按钮Status
            document.getElementById('enter-battle-btn').style.display =
                gameState.phase === 'placement' ? 'inline-block' : 'none';

            document.getElementById('use-spell-btn').style.display =
                ['drawCard', 'shadowCorrosion', 'necromancy', 'frostNova'].includes(gameState.selectedSpell) ? 'inline-block' : 'none';

            // 高亮当前Player 面板
            document.getElementById('player1-panel').style.border =
                gameState.currentPlayer === 1 ? '2px solid gold' : 'none';
            document.getElementById('player2-panel').style.border =
                gameState.currentPlayer === 2 ? '2px solid gold' : 'none';

            // 禁用非当前Player 的按钮
            const aiActive = gameState.aiPlayers[gameState.currentPlayer - 1] || !canHumanAct();
            document.getElementById('end-turn-btn').disabled = aiActive || gameState.gameOver;
            document.getElementById('draw-card-btn').disabled = aiActive || gameState.gameOver || gameState.phase !== 'placement';
            document.getElementById('enter-battle-btn').disabled = aiActive || gameState.gameOver;
            document.getElementById('skill-btn').disabled = aiActive || gameState.gameOver;
            document.getElementById('use-spell-btn').disabled = aiActive || gameState.gameOver;
            const hourglassButton = document.getElementById('use-hourglass-btn');
            hourglassButton.style.display = window._storyEnemyBattle && gameState.players[0].items.includes('timeHourglass') ? '' : 'none';
            hourglassButton.disabled = aiActive || gameState.gameOver || gameState.currentPlayer !== 1 || gameState.extraTurnPlayer === 1;

            let revenge = null;
            if (window.selectedBoss && window.selectedBoss.type === 'techFather' && (revenge = gameState.units.find(u => u.type === 'techFatherRevenge' && u.player === 2))) {
                document.getElementById('player2-health').textContent = revenge.health;
                document.getElementById('player2-health-fill').style.width = `${(revenge.health / revenge.maxHealth) * 100}%`;
            } else {
                document.getElementById('player2-health').textContent = gameState.players[1].health;
                document.getElementById('player2-health-fill').style.width = `${(gameState.players[1].health / gameState.players[1].maxHealth) * 100}%`;
            }

            document.getElementById('player1-gold').textContent = gameState.players[0].gold || 0;
            document.getElementById('player2-gold').textContent = gameState.players[1].gold || 0;

            // Player 特性描述
            function getPlayerTraitDesc(playerIdx) {
                // Player 1无特性
                if (playerIdx === 0) return '';
                // Player 2（AI）剧情敌人特性
                let desc = '';
                if (window._storyEnemyInfo && window._storyEnemyInfo.name === 'Heirs of the Dead Lv4') {
                    desc = 'Last Will: when an ally dies, surviving allies gain +1 ATK and restore 1 HP.';
                } else if (window._storyEnemyInfo && window._storyEnemyInfo.name === 'Blood Frenzy Lv3') {
                    desc = 'Blood Resonance: all bats share the Blood Feast effect.';
                } else if (window._storyEnemyInfo && window._storyEnemyInfo.name === 'Necromancer Lv3') {
                    desc = 'Undead Revival: fallen allies return as Skeletons.';
                } else if (window._storyEnemyInfo && window._storyEnemyInfo.name) {
                    // 可扩展其他敌人特性
                    //desc = window._storyEnemyInfo.desc ? '特性：' + window._storyEnemyInfo.desc.split('。')[0] : '';
                }
                return desc;
            }
            // 刷新特性描述到指定span
            [1,2].forEach(pid => {
                const traitSpan = document.getElementById(`player${pid}-trait`);
                if (traitSpan) traitSpan.textContent = getPlayerTraitDesc(pid-1);
            });
            if (typeof renderPlayerExperience === 'function') renderPlayerExperience();
        }

        // 更新Hand显示
        function updateHandDisplay(playerId) {
            if(isAnimating)return;
            const handElement = document.getElementById(`player${playerId}-hand`);
            handElement.innerHTML = '';

            const playerIndex = playerId - 1;
            const player = gameState.players[playerIndex];

            player.hand.forEach((heldCard, idx) => {
                const cardObj = { ...(unitDefinitions[heldCard.key] || spellDefinitions[heldCard.key]), ...heldCard };
                const card = document.createElement('button');
                card.type = 'button';
                card.className = 'card';
                card.classList.add(cardObj.type || '');
                const kind = { human: 'Human', shadow: 'Shadow', beast: 'Beast', undead: 'Undead', spell: 'Spell' }[cardObj.type] || 'Unit';
                card.setAttribute('aria-label', `${cardObj.name}, ${cardObj.cost} AP, ${cardObj.type === 'spell' ? cardObj.effect : `ATK ${cardObj.damage}, HP ${cardObj.health}, range ${cardObj.attackRange}`}`);
                card.classList.toggle('unaffordable', gameState.phase === 'placement' && cardObj.cost > player.actionPoints);
                card.classList.toggle('view-only', gameState.phase !== 'placement' || gameState.currentPlayer !== playerId || !canHumanAct());
                card.title = cardObj.cost > player.actionPoints ? `Requires ${cardObj.cost} AP; you have ${player.actionPoints}` : 'Select to inspect this card';
                const art = document.createElement('span');
                art.className = 'card-art';
                const handImg = (unitDefinitions[cardObj.key] || spellDefinitions[cardObj.key])?.handImg || cardObj.handImg || cardObj.img;
                if (handImg && handImg.startsWith('lib/')) {
                    const img = document.createElement('img');
                    img.src = handImg;
                    img.alt = '';
                    img.addEventListener('error', () => { img.hidden = true; });
                    art.appendChild(img);
                } else {
                    art.textContent = (cardObj.name || cardObj.key).slice(0, 1);
                }
                card.appendChild(art);

                    const name = document.createElement('div');
                name.className = 'card-name';
                name.textContent = cardObj.name || cardObj.key;
                    card.appendChild(name);

                    const cost = document.createElement('div');
                cost.className = 'card-cost';
                cost.textContent = cardObj.cost;
                    card.appendChild(cost);
                const label = document.createElement('span');
                label.className = 'card-kind';
                label.textContent = kind;
                card.appendChild(label);
                const stats = document.createElement('span');
                stats.className = 'card-stats';
                if (cardObj.type === 'spell') {
                    const spellType = document.createElement('span');
                    spellType.className = 'card-stat-value';
                    spellType.textContent = 'Spell';
                    const spellCost = document.createElement('span');
                    spellCost.className = 'card-stat-value';
                    spellCost.textContent = `${cardObj.cost} AP`;
                    spellCost.setAttribute('aria-label', `Cost ${cardObj.cost} AP`);
                    stats.append(spellType, spellCost);
                } else {
                    [
                        ['ATK', cardObj.damage, '<path d="M14 2l4 0 0 4-10 9-3-3zM4 10l6 6M3 17l4-4"/>'],
                        ['HP', cardObj.health, '<path d="M10 17S2 12 2 6a4 4 0 018-1 4 4 0 018 1c0 6-8 11-8 11z"/>'],
                        ['Range', cardObj.attackRange, '<path d="M3 10h14M5 7l-3 3 3 3M15 7l3 3-3 3"/>']
                    ].forEach(([label, value, path]) => {
                        const stat = document.createElement('span');
                        stat.className = 'card-stat-value';
                        stat.setAttribute('aria-label', `${label} ${value}`);
                        stat.innerHTML = `<svg viewBox="0 0 20 20" aria-hidden="true">${path}</svg>`;
                        const number = document.createElement('span');
                        number.className = 'stat-number';
                        number.textContent = value;
                        stat.appendChild(number);
                        stats.appendChild(stat);
                    });
                }
                card.appendChild(stats);
                const description = document.createElement('span');
                description.className = 'card-description';
                description.textContent = cardObj.type === 'spell' ? cardObj.effect : cardObj.skills.join('; ').replace(/Trait:|Skill:/g, '');
                card.appendChild(description);

                // 添加悬停事件用于显示工具提示
                card.addEventListener('mouseenter', (e) => showCardTooltip(e, cardObj.key, heldCard));
                card.addEventListener('mouseleave', hideTooltip);

                // 高亮选中的卡牌
                if (gameState.currentPlayer === playerId &&
                    gameState.phase === 'placement' &&
                    gameState.selectedCard === cardObj.key && window.selectedHandCard === heldCard) {
                    card.classList.add('selected');
                }

                // 添加Click to 事件
                card.addEventListener('click', () => handleCardClick(playerId, cardObj.key, heldCard));
                card.setAttribute('aria-pressed', gameState.selectedCard === cardObj.key && window.selectedHandCard === heldCard && gameState.currentPlayer === playerId ? 'true' : 'false');

                handElement.appendChild(card);
            });
        }

        // 更新游戏板
        function updateBoard() {
            if(isAnimating)return;
            const cells = document.querySelectorAll('.cell');
            const localId = Number(playerId) === 2 ? 2 : 1;

            // 重置所有格子
            cells.forEach(cell => {
                cell.innerHTML = '';
                cell.classList.remove('highlight', 'frozen', 'base', 'friendly-base', 'enemy-base', 'movable', 'attackable', 'swappable', 'deployable', 'selected-cell');

                // 恢复Base文字
                const row = parseInt(cell.dataset.row);
                const col = parseInt(cell.dataset.col);
                cell.setAttribute('aria-label', `Row ${row + 1}, column ${col + 1}, empty`);
                cell.title = '';
                cell.onmouseenter = () => { if (typeof renderPlayerAttackPreview === 'function') renderPlayerAttackPreview(row, col); };
                cell.onmouseleave = () => { if (typeof renderPlayerAttackPreview === 'function') renderPlayerAttackPreview(); };
                cell.onfocus = cell.onmouseenter;
                cell.onblur = cell.onmouseleave;
                const coordinate = document.createElement('span');
                coordinate.className = 'cell-coordinate';
                coordinate.textContent = `${String.fromCharCode(65 + col)}${row + 1}`;
                cell.appendChild(coordinate);
                if ((row === 2 && col === 0) || (row === 2 && col === 6)) {
                    if (!(row === 2 && col === 6 && window.selectedBoss && window.selectedBoss.type === 'techFather' && isTechFatherRevengeAlive())) {
                        cell.classList.add('base');
                        const friendly = (col === 0 ? 1 : 2) === localId;
                        cell.classList.add(friendly ? 'friendly-base' : 'enemy-base');
                        const castle = document.createElement('span');
                        castle.className = 'base-icon';
                        castle.innerHTML = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M2 6h3V2h3v4h4V2h3v4h3v12H2zM7 18v-5a3 3 0 016 0v5M3 10h3M14 10h3"/></svg>';
                        cell.appendChild(castle);
                        const baseName = document.createElement('span');
                        baseName.className = 'base-name';
                        baseName.textContent = friendly ? 'Your base' : 'Enemy base';
                        cell.appendChild(baseName);
                        // 显示BaseShield
                        const playerIndex = col === 0 ? 0 : 1;
                        const player = gameState.players[playerIndex];
                        const baseHealth = document.createElement('span');
                        baseHealth.className = 'base-health';
                        baseHealth.textContent = `${Math.max(0, player.health)}`;
                        cell.appendChild(baseHealth);
                        cell.setAttribute('aria-label', `${baseName.textContent}, HP ${player.health}`);
                        if (player.shield > 0) {
                            const shield = document.createElement('div');
                            shield.className = 'shield-icon';
                            shield.textContent = `🛡️${player.shield}`;
                            cell.appendChild(shield);
                        }
                    }
                }
            });

            // 显示Unit
            gameState.units.forEach(unit => {
                const row = unit.row;
                const col = unit.col;
                const cell = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);

                if (cell) {

                    const unitElement = document.createElement('div');
                    unitElement.className = `unit ${unitDefinitions[unit.type].type}`;
                    unitElement.classList.add(unit.player === localId ? 'friendly' : 'enemy');
                    const frozen = gameState.frozenUnits.some(f => f.id === unit.id);
                    const canAct = !frozen && !unit.hasAttacked && (!unit.hasMoved || ['shadowAssassin', 'techFatherRevenge'].includes(unit.type));
                    unitElement.classList.add(canAct ? 'can-act' : 'spent');

                    if (unit.player === gameState.currentPlayer &&
                        gameState.phase === 'battle' &&
                        ((!unit.hasMoved && !unit.hasAttacked) || (unit.type === 'shadowAssassin' && !unit.hasAttacked))) {
                        unitElement.classList.add('unoperated');
                    }
                    // 检查是否被Frozen
                    if (gameState.frozenUnits.some(f => f.id === unit.id)) {
                        unitElement.classList.add('frozen');
                    }

                    const image = document.createElement('img');
                    image.className = 'unit-art';
                    image.src = unitDefinitions[unit.type].handImg || unitDefinitions[unit.type].img;
                    image.alt = '';
                    unitElement.appendChild(image);

                    const name = document.createElement('div');
                    name.className = 'unit-name';
                    name.textContent = unitDefinitions[unit.type].name;
                    unitElement.appendChild(name);

                    const stats = document.createElement('div');
                    stats.className = 'unit-stats';

                    const health = document.createElement('div');
                    health.className = 'unit-health';
                    health.innerHTML = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 17S2 12 2 6a4 4 0 018-1 4 4 0 018 1c0 6-8 11-8 11z"/></svg>';
                    const healthNumber = document.createElement('span');
                    healthNumber.className = 'stat-number';
                    healthNumber.textContent = unit.health;
                    health.appendChild(healthNumber);
                    health.setAttribute('aria-label', `HP ${unit.health}`);
                    health.dataset.value = unit.health;

                    const damage = document.createElement('div');
                    damage.className = 'unit-attack';
                    let bonus = unit.bonusDamage || 0;
                    damage.innerHTML = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M14 2l4 0 0 4-10 9-3-3zM4 10l6 6M3 17l4-4"/></svg>';
                    const damageNumber = document.createElement('span');
                    damageNumber.className = 'stat-number';
                    damageNumber.textContent = unit.damage + bonus;
                    damage.appendChild(damageNumber);
                    damage.setAttribute('aria-label', `ATK ${unit.damage + bonus}`);
                    damage.dataset.value = unit.damage + bonus;
                    const readyDot = document.createElement('span');
                    readyDot.className = 'unit-ready-dot';
                    readyDot.setAttribute('aria-hidden', 'true');
                    stats.appendChild(damage);
                    stats.appendChild(readyDot);
                    stats.appendChild(health);

                    // 显示Shield
                    if (unit.shield > 0) {
                        const shield = document.createElement('div');
                        shield.className = 'shield-icon';
                        shield.textContent = `🛡️${unit.shield}`;
                        unitElement.appendChild(shield);
                    }

                    const actions = document.createElement('span');
                    actions.className = 'unit-state';
                    actions.textContent = frozen ? 'Frozen' : !canAct ? 'Spent' : unit.hasMoved ? 'Can attack' : 'Ready';
                    unitElement.appendChild(actions);

                    unitElement.appendChild(stats);

                    cell.replaceChildren();
                    const coordinate = document.createElement('span');
                    coordinate.className = 'cell-coordinate';
                    coordinate.textContent = `${String.fromCharCode(65 + col)}${row + 1}`;
                    cell.appendChild(coordinate);
                    cell.appendChild(unitElement);
                    cell.setAttribute('aria-label', `${unit.player === localId ? 'Friendly ' : 'Enemy '}${unitDefinitions[unit.type].name}, row ${row + 1}, column ${col + 1}, HP ${unit.health}, ATK ${unit.damage + bonus}, ${actions.textContent}`);

                    // 高亮选中的Unit
                    if (gameState.selectedUnit && gameState.selectedUnit.id === unit.id) {
                        cell.classList.add('highlight');
                        cell.classList.add('selected-cell');
                    }

                }
            });
            renderBoardAffordances();
        }

        function renderBoardAffordances() {
            if (gameState.gameOver || isAnimating || !canHumanAct() || gameState.aiPlayers[gameState.currentPlayer - 1]) return;
            const player = gameState.players[gameState.currentPlayer - 1];
            const card = window.selectedHandCard?.key === gameState.selectedCard && player.hand.includes(window.selectedHandCard)
                ? window.selectedHandCard : player.hand.find(card => card.key === gameState.selectedCard);
            const unit = gameState.selectedUnit;
            document.querySelectorAll('.cell').forEach(cell => {
                const row = Number(cell.dataset.row), col = Number(cell.dataset.col);
                const target = gameState.board[row][col];
                let action = '';
                if (gameState.phase === 'placement' && card && card.cost <= player.actionPoints) {
                    if (unitDefinitions[card.key] && !target && !(row === 2 && (col === 0 || col === 6)) &&
                        (gameState.currentPlayer === 1 ? col < 2 : col > 4)) {
                        cell.classList.add('deployable');
                        action = 'deploy';
                    } else if (target?.player === gameState.currentPlayer &&
                        ((card.key === 'healPack' && target.health < target.maxHealth) ||
                         (card.key === 'shieldCard' && !target.shield) || card.key === 'resetCard')) {
                        cell.classList.add('swappable');
                        action = 'spell target';
                    }
                } else if (gameState.phase === 'battle' && unit) {
                    const distance = Math.abs(unit.row - row) + Math.abs(unit.col - col);
                    if (gameState.healingUnit) {
                        if (target && target !== unit && target.player === unit.player && target.health < target.maxHealth && distance <= unit.attackRange) action = 'heal';
                    } else if (moving === 1) {
                        if (target && target !== unit && target.player === unit.player && distance <= 3) action = 'swap';
                    } else if (gameState.erosionMode) {
                        if (gameState.erosionTarget) {
                            if (target && target !== unit && target.player === unit.player) action = 'sacrifice';
                        } else if (target && target.player !== unit.player && distance <= 1) {
                            let damage = unit.damage + (unit.bonusDamage || 0);
                            const frozen = gameState.frozenUnits.some(f => f.id === target.id);
                            if (target.type === 'phaseBeast') damage = Math.ceil(damage / 2);
                            if (target.type === 'shieldWarrior' && !frozen && !target.lastTurnHasMoved && !target.lastTurnHasAttacked) damage = Math.max(0, damage - 2);
                            if (!frozen) damage = Math.max(0, damage - (target.shield || 0));
                            if (damage >= target.health && gameState.units.some(ally => ally.player === unit.player && ally !== unit)) action = 'Erosion target';
                        }
                    } else {
                        if (isCellMovable(unit, row, col)) { cell.classList.add('movable'); action = 'move'; }
                        if (isCellAttackable(unit, row, col)) { cell.classList.add('attackable'); action = 'attack'; }
                    }
                    if (action && (gameState.healingUnit || moving === 1 || gameState.erosionMode)) cell.classList.add('swappable');
                }
                if (action) {
                    cell.title = `Click to ${action}`;
                    cell.setAttribute('aria-label', `${cell.getAttribute('aria-label')}, can ${action}`);
                    const marker = document.createElement('span');
                    marker.className = `cell-action ${action}`;
                    if (action === 'move') {
                        const direction = row < unit.row ? 'up' : row > unit.row ? 'down' : col < unit.col ? 'left' : 'right';
                        marker.classList.add(`move-${direction}`);
                        marker.textContent = { up: '↑', down: '↓', left: '←', right: '→' }[direction];
                    } else if (action === 'attack' && typeof getPlayerAttackPreview === 'function') {
                        const preview = getPlayerAttackPreview(unit, row, col);
                        marker.textContent = preview ? `−${preview.damage} HP` : 'Attack';
                    } else marker.textContent = action === 'deploy' ? `${card.cost} AP` : action;
                    marker.setAttribute('aria-hidden', 'true');
                    cell.appendChild(marker);
                }
            });
        }

        // 显示卡牌工具提示
        function showCardTooltip(e, cardKey, heldCard) {
            const tooltip = document.getElementById('tooltip');

            if (cardKey in unitDefinitions) {
                const unitDef = unitDefinitions[cardKey];

                tooltip.innerHTML = `
                                <strong>${unitDef.name}</strong><br>
                                HP: ${unitDef.health}<br>
                                ATK: ${unitDef.damage}<br>
                                Range: ${unitDef.attackRange}<br>
                                Cost: ${heldCard?.cost ?? unitDef.cost}<br>
                                ${unitDef.skills.join('<br>')}
                            `;
            } else if (cardKey in spellDefinitions) {
                const spellDef = spellDefinitions[cardKey];

                tooltip.innerHTML = `
                                <strong>${spellDef.name}</strong><br>
                                Type: Spell<br>
                                Cost: ${heldCard?.cost ?? spellDef.cost}<br>
                                Effect: ${spellDef.effect}
                            `;
            }

            tooltip.style.display = 'block';
            tooltip.style.left = `${e.pageX + 10}px`;
            tooltip.style.top = `${e.pageY + 10}px`;
        }

        // 显示Unit工具提示
        function showUnitTooltip(e, unit) {
            const tooltip = document.getElementById('tooltip');
            const unitDef = unitDefinitions[unit.type];

            let status = '';
            if (gameState.frozenUnits.some(f => f.id === unit.id)) {
                status = 'Status: Frozen (cannot act next turn)<br>';
            } else if (gameState.phase === 'battle') {
                status = `Status: ${unit.hasMoved ? 'Moved' : 'Can move'} / ${unit.hasAttacked ? 'Attacked' : 'Can attack'}<br>`;
            }

            tooltip.innerHTML = `
                            <strong>${unitDef.name}</strong><br>
                            Player : ${unit.player}<br>
                            HP: ${unit.health}/${unitDef.health}<br>
                            ATK: ${unit.damage}${unit.bonusDamage ? "+"+unit.bonusDamage : ""}<br>
                            Range: ${unitDef.attackRange}<br>
                            Shield: ${unit.shield}<br>
                            ${status}
                            Skill: ${unitDef.skills.join('<br>')}
                        `;

            tooltip.style.display = 'block';
            tooltip.style.left = `${e.pageX + 10}px`;
            tooltip.style.top = `${e.pageY + 10}px`;
        }

        // 显示格子工具提示
        function showCellTooltip(e, row, col) {
            const tooltip = document.getElementById('tooltip');
            const cellContent = gameState.board[row][col];

            if (cellContent) {
                showUnitTooltip(e, cellContent);
            } else if ((row === 2 && col === 0) || (row === 2 && col === 6)) {
                const playerIndex = col === 0 ? 0 : 1;
                const player = gameState.players[playerIndex];

                tooltip.innerHTML = `
                                <strong>Base</strong><br>
                                Player : ${playerIndex + 1}<br>
                                HP: ${player.health}/${player.maxHealth}<br>
                                Shield: ${player.shield}
                            `;
                tooltip.style.display = 'block';
                tooltip.style.left = `${e.pageX + 10}px`;
                tooltip.style.top = `${e.pageY + 10}px`;
            }
        }

        // 隐藏工具提示
        function hideTooltip() {
            document.getElementById('tooltip').style.display = 'none';
        }

        // 数组洗牌
        function shuffleArray(array) {
            for (let i = array.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [array[i], array[j]] = [array[j], array[i]];
            }
            return array;
        }

        // EnterBattle
        function enterBattlePhase() {
            if (!canHumanAct() || gameState.gameOver || isAnimating || gameState.aiPlayers[gameState.currentPlayer - 1]) return;
            gameState.phase = 'battle';
            gameState.selectedCard = null;
            gameState.selectedSpell = null;
            updateUI();
            sendGameAction();
        }

        // 修改高亮侵蚀Range函数，只显示上下左右
        function highlightErosionRange(unit, range) {
            for (let dr = -range; dr <= range; dr++) {
                for (let dc = -range; dc <= range; dc++) {
                    if (dr === 0 && dc === 0) continue;
                    // 只允许上下左右，不包括对角线
                    if (Math.abs(dr) + Math.abs(dc) !== 1) continue;
                    const row = unit.row + dr;
                    const col = unit.col + dc;
                    if (row >= 0 && row < 5 && col >= 0 && col < 7) {
                        const target = gameState.board[row][col];
                        if (target && target.player !== unit.player) {
                            const cell = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
                            if (cell) cell.classList.add('swappable');
                        }
                    }
                }
            }
        }

        function showLevelSelectPanel() {
            
            const panel = document.getElementById('level-select-panel');
            const bossList = document.getElementById('boss-list');
            const bossInfo = document.getElementById('boss-info');
            const startBtn = document.getElementById('start-boss-battle');
            const closeBtn = document.getElementById('close-boss-panel');
            let selectedBoss = null;

            // 渲染BOSS列表
            bossList.innerHTML = '';
            BOSSES.forEach((boss, idx) => {
            const bossDiv = document.createElement('button');
            bossDiv.type = 'button';
            bossDiv.className = 'boss-item';
            bossDiv.style.cursor = 'pointer';
            bossDiv.style.border = '2px solid #fff';
            bossDiv.style.borderRadius = '12px';
            bossDiv.style.padding = '24px 32px';
            bossDiv.style.background = 'rgba(30,30,30,0.9)';
            bossDiv.style.transition = 'border 0.2s, box-shadow 0.2s';
            bossDiv.innerHTML = `<div style='font-size:1.3em;font-weight:bold;'>${boss.name}</div><div style='margin-top:10px;'>${boss.description}</div>`;
            // 新增：显示Cleared
            if (window.bossPassed && window.bossPassed[boss.name]) {
                const passedTag = document.createElement('div');
                passedTag.textContent = 'Cleared';
                passedTag.style.color = '#0f0';
                passedTag.style.fontWeight = 'bold';
                passedTag.style.marginTop = '8px';
                bossDiv.appendChild(passedTag);
            }
            bossDiv.onclick = () => {
                // 选中样式
                Array.from(bossList.children).forEach(child => {
                child.style.border = '2px solid #fff';
                child.style.boxShadow = '';
                });
                bossDiv.style.border = '2px solid #4af';
                bossDiv.style.boxShadow = '0 0 16px #4af8';
                // 显示介绍
                bossInfo.innerHTML = `<b>${boss.name}</b><br>${boss.detail}`;
                selectedBoss = boss;
                startBtn.disabled = false;
            };
            bossList.appendChild(bossDiv);
            });

            // 挑战按钮
            startBtn.onclick = () => {
            if (!selectedBoss) return;
            panel.style.display = 'none';
            window._storyEnemyBattle = false;
            window._storyEnemyInfo = null;
            gameState.aiPlayers = [false, true];
            window.selectedBoss = selectedBoss; // 记录当前BOSS
            
            //alert("选完了哈")
            if (window.onBossSelected) window.onBossSelected(selectedBoss);
            initGame();
            };

            // 退出按钮
            closeBtn.onclick = () => {
            panel.style.display = 'none';
            closeBtn.onclick = () => {
                panel.style.display = 'none';
                document.querySelector('#player2-panel .player-header h2').textContent = 'Player 2';
            };
            };

            // 初始Status
            bossInfo.innerHTML = 'Select a boss to inspect its abilities.';
            startBtn.disabled = true;
            panel.style.display = 'block';
        }

        // 初始化事件监听
        function initEventListeners() {
            document.getElementById('end-turn-btn').addEventListener('click', endTurn);
            document.getElementById('skill-btn').addEventListener('click', UseSkill);
            document.getElementById('draw-card-btn').addEventListener('click', handleDrawCard);
            document.getElementById('enter-battle-btn').addEventListener('click', enterBattlePhase);
            document.getElementById('use-spell-btn').addEventListener('click', () => {
                if (!canHumanAct() || gameState.gameOver || isAnimating || gameState.aiPlayers[gameState.currentPlayer - 1]) return;
                if (gameState.selectedSpell) {
                    if (['drawCard', 'shadowCorrosion', 'necromancy', 'frostNova'].includes(gameState.selectedSpell)) {
                        if (applySpellEffect(gameState.selectedSpell)) {
                            gameState.selectedSpell = null;
                            gameState.selectedCard = null;
                        }
                        updateUI();
                    } else {
                        gameState.selectedCard = gameState.selectedSpell;
                        updateUI();
                    }
                }
            });
            document.getElementById('restart-btn').addEventListener('click', initGame);
            document.getElementById('open-boss-panel').addEventListener('click', showLevelSelectPanel);
            document.getElementById('auto-play-btn').addEventListener('click', startAutoPlay);
            document.getElementById('stop-auto-play-btn').addEventListener('click', stopAutoPlay);
            document.getElementById('open-story-panel').addEventListener('click', showStorySelectPanel);

            // 聊天输入框回车键Send
            document.getElementById('chat-input').addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    sendChat();
                }
            });
        }

        // 只统计真实人机对战。自弈不记为100%Win rate，也不随机扰动策略。
        function aiLearnFromGame(winner) {
            const learning = gameState.aiLearning;
            if (!learning || ![1, 2].includes(winner)) return;
            const aiCount = gameState.aiPlayers.filter(Boolean).length;
            if (aiCount === 1) {
                learning.gamesPlayed++;
                if (gameState.aiPlayers[winner - 1]) learning.gamesWon++;
            }
            learning.gameHistory.push({ winner, turns: gameState.turnCount, aiPlayers: [...gameState.aiPlayers] });
            learning.gameHistory = learning.gameHistory.slice(-50);
            learning.currentGameDecisions = [];
        }

        // 分析决策
        function analyzeDecisions(decisions, aiWon) {
            const stats = {
                attackDecisions: 0,
                moveDecisions: 0,
                spellDecisions: 0,
                placementDecisions: 0,
                skillDecisions: 0,
                rageSkillDecisions: 0,
                shadowMoveSkillDecisions: 0,
                erosionSkillDecisions: 0,
                totalDecisions: decisions.length
            };
            
            decisions.forEach(decision => {
                switch (decision.type) {
                    case 'attack_target':
                        stats.attackDecisions++;
                        break;
                    case 'move_position':
                        stats.moveDecisions++;
                        break;
                    case 'use_spell':
                        stats.spellDecisions++;
                        break;
                    case 'place_unit':
                        stats.placementDecisions++;
                        break;
                    case 'use_skill':
                        stats.skillDecisions++;
                        // 统计具体SkillType
                        if (decision.data.skillType === 'rage') {
                            stats.rageSkillDecisions++;
                        } else if (decision.data.skillType === 'shadowMove') {
                            stats.shadowMoveSkillDecisions++;
                        } else if (decision.data.skillType === 'erosion') {
                            stats.erosionSkillDecisions++;
                        }
                        break;
                }
            });
            
            return stats;
        }

        // 分析游戏结果
        function analyzeGameResults(winner, aiWon, gameStateParam = null) {
            // 使用传入的游戏Status或默认使用全局游戏Status
            const state = gameStateParam || gameState;
            
            const results = {
                damageDealt: 0,      // 对Enemy 造成的伤害
                damageTaken: 0,      // 受到的伤害
                unitsKilled: 0,      // 击杀的Enemy Unit数
                unitsLost: 0,        // 损失的己方Unit数
                baseDamage: 0,       // 对Enemy base造成的伤害
                baseDamageTaken: 0,  // 己方Base受到的伤害
                gameLength: state.turnCount,
                efficiency: 0        // 效率评分
            };
            
            // 分析游戏历史中的决策
            const decisions = state.aiLearning.currentGameDecisions;
            
            decisions.forEach(decision => {
                if (decision.type === 'attack_target') {
                    // 分析ATK决策的Effect
                    if (decision.data.decisionType === 'attack_enemy_unit') {
                        let damageMultiplier = 1;
                        // 检查是否有Skill加成
                        if (decision.data.skillBonus && decision.data.skillBonus > 0) {
                            damageMultiplier = 1.5; // Skill加成后的伤害
                        }
                        results.damageDealt += 2 * damageMultiplier; // ATKEnemy Unit
                        results.unitsKilled += 0.5 * damageMultiplier; // 可能击杀
                    } else if (decision.data.decisionType === 'attack_base') {
                        results.baseDamage += 3; // ATKBase
                    }
                } else if (decision.type === 'move_position') {
                    // move决策可能避免伤害
                    results.damageTaken -= 1; // move可能避免伤害
                } else if (decision.type === 'use_spell') {
                    // 分析Skill使用的Effect
                    switch (decision.data.skillType) {
                        case 'rage':
                            results.damageDealt += 3; // 狂暴Skill增加伤害
                            break;
                        case 'shadowMove':
                            results.damageDealt += 4; // Shadow Shift后伤害翻倍
                            results.unitsKilled += 1; // 可能击杀更多Unit
                            break;
                        case 'erosion':
                            results.unitsKilled += 2; // 侵蚀Skill直接消灭Unit
                            results.damageDealt += 5; // 高价值目标
                            break;
                    }
                } else if (decision.type === 'attack_target' && decision.data.shadowMoveBonus) {
                    // Shadow Shift后的ATK获得额外奖励
                    results.damageDealt += 3; // Shadow ShiftEffect
                    results.unitsKilled += 0.5; // 可能击杀
                }
            });
            
            // 计算效率评分
            if (aiWon) {
                results.efficiency = (results.damageDealt + results.baseDamage * 2) / Math.max(1, results.gameLength);
            } else {
                results.efficiency = -(results.damageTaken + results.baseDamageTaken * 2) / Math.max(1, results.gameLength);
            }
            
            return results;
        }

        // 更新Strategy weights
        function updateStrategyWeights(decisionStats, gameResults, learningRate) {
            const strategies = gameState.aiLearning.strategies;
            
            // 根据决策Type调整权重
            if (decisionStats.attackDecisions > 0) {
                const attackEffectiveness = gameResults.damageDealt / Math.max(1, decisionStats.attackDecisions);
                strategies.attackPriority += learningRate * attackEffectiveness * 0.1;
            }
            
            if (decisionStats.moveDecisions > 0) {
                const moveEffectiveness = Math.abs(gameResults.damageTaken) / Math.max(1, decisionStats.moveDecisions);
                strategies.moveTowardsEnemy += learningRate * moveEffectiveness * 0.1;
            }
            
            if (decisionStats.spellDecisions > 0) {
                strategies.spellUsage += learningRate * (decisionStats.spellDecisions / decisionStats.totalDecisions);
            }
            
            if (decisionStats.placementDecisions > 0) {
                strategies.aggressivePlacement += learningRate * (decisionStats.placementDecisions / decisionStats.totalDecisions);
            }
            
            // Skill使用奖励机制
            if (decisionStats.skillDecisions > 0) {
                const skillEffectiveness = gameResults.damageDealt / Math.max(1, decisionStats.skillDecisions);
                strategies.skillUsage += learningRate * skillEffectiveness * 0.15;
                
                // 根据SkillType调整特定Skill权重
                if (decisionStats.rageSkillDecisions > 0) {
                    const rageEffectiveness = gameResults.damageDealt / Math.max(1, decisionStats.rageSkillDecisions);
                    strategies.rageSkill += learningRate * rageEffectiveness * 0.2;
                }
                
                if (decisionStats.shadowMoveSkillDecisions > 0) {
                    const shadowMoveEffectiveness = gameResults.damageDealt / Math.max(1, decisionStats.shadowMoveSkillDecisions);
                    strategies.shadowMoveSkill += learningRate * shadowMoveEffectiveness * 0.25; // Shadow Shift后伤害翻倍
                }
                
                if (decisionStats.erosionSkillDecisions > 0) {
                    const erosionEffectiveness = gameResults.unitsKilled / Math.max(1, decisionStats.erosionSkillDecisions);
                    strategies.erosionSkill += learningRate * erosionEffectiveness * 0.3;
                }
            }
            
            // 根据游戏结果调整保护策略
            if (gameResults.damageTaken > 0) {
                strategies.protectLowHealth += learningRate * 0.05; // 受到伤害时加强保护策略
            }
            
            // 根据Base伤害调整策略
            if (gameResults.baseDamage > 0) {
                strategies.attackPriority += learningRate * 0.1; // 对Base造成伤害时加强ATK策略
            }
            
            // 根据效率评分调整整体策略
            if (gameResults.efficiency > 0) {
                // 效率高时，稍微加强所有策略
                Object.keys(strategies).forEach(key => {
                    strategies[key] += learningRate * 0.02;
                });
            } else {
                // 效率低时，稍微减弱所有策略
                Object.keys(strategies).forEach(key => {
                    strategies[key] -= learningRate * 0.01;
                });
            }
            
            // 确保权重在合理Range内
            Object.keys(strategies).forEach(key => {
                strategies[key] = Math.max(0.1, Math.min(3.0, strategies[key]));
            });
        }

        // 输出学习统计
        function outputLearningStats() {
            const learning = gameState.aiLearning;
            aiLog('=== AI statistics ===', true);
            aiLog(`Games played:  ${learning.gamesPlayed}`, true);
            aiLog(`Wins: ${learning.gamesWon}`, true);
            aiLog(`Win rate: ${(learning.gamesWon / learning.gamesPlayed * 100).toFixed(1)}%`, true);
            aiLog('Strategy weights:', true);
            Object.entries(learning.strategies).forEach(([key, value]) => {
                aiLog(`  ${key}: ${value.toFixed(3)}`, true);
            });
            aiLog('==================', true);
        }

        // 自动对弈系统
        let autoPlayInterval = null;
        let autoPlayCount = 0;
        const MAX_AUTO_PLAY_GAMES = 100; // 最大自动对弈局数

        // 并行训练系统
        let parallelTrainingActive = false;
        let parallelGames = [];
        let gamesCompleted = 0;
        let trainingStartTime = 0;
        let trainingStatsInterval = null;
        let totalTrainingGames = 0;
        let simulationDraws = 0;

        // Start autoplay
        function startAutoPlay() {
            if (urlParams.has('room') && isConnected) return;
            if (isAnimating) return;
            // 设置两个AIPlayer 
            gameState.aiPlayers = [true, true];
            updateAIButtonStates();
            
            // 显示停止按钮，隐藏开始按钮
            document.getElementById('auto-play-btn').style.display = 'none';
            document.getElementById('stop-auto-play-btn').style.display = 'inline-block';
            
            autoPlayCount = 1;
            autoPlayInterval = true; // 标记自动对弈正在进行
            console.log('Starting AI autoplay...');
            
            // 重新初始化游戏，确保AI设置生效
            initGame();
        }

        // Stop autoplay
        function stopAutoPlay() {
            autoPlayInterval = null;
            if (gameState.currentPlayer === 1) cancelAITurn();
            
            // 重置AIPlayer 设置
            gameState.aiPlayers = [false, true]; // 恢复默认设置：Player 1为人类，Player 2为AI
            updateAIButtonStates();
            
            // 显示开始按钮，隐藏停止按钮
            document.getElementById('auto-play-btn').style.display = 'inline-block';
            document.getElementById('stop-auto-play-btn').style.display = 'none';
            
            console.log('AI autoplay stopped');
        }

        // 开始下一局自动游戏
        function startNextAutoGame() {
            if (!autoPlayInterval) return;
            // 检查是否应该Stop autoplay
            if (autoPlayCount >= MAX_AUTO_PLAY_GAMES) {
                console.log(`Autoplay completed: ${autoPlayCount} games`);
                stopAutoPlay();
                return;
            }
            
            autoPlayCount++;
            console.log(`Starting autoplay game ${autoPlayCount}`);
            
            // 保持当前的AI设置，如果没有设置则默认为两个AI
            if (typeof gameState.aiPlayers === 'undefined') {
                gameState.aiPlayers = [true, true];
            }
            
            // 重新初始化游戏
            initGame();
            
            updateAIButtonStates();
        }

        // 修改showWinner函数以支持自动对弈
        const originalShowWinner = showWinner;
        showWinner = function(winner) {
            originalShowWinner(winner);
            
            // 只有autoPlayInterval为真时才自动下一局
            if (autoPlayInterval) {
                console.log('Autoplay: preparing next match');
                const delay = getAIDelay();
                const finishedBoard = gameState.board;
                setTimeout(() => {
                    if (!autoPlayInterval || gameState.board !== finishedBoard) return;
                    // 隐藏胜利模态框
                    const modal = document.getElementById('winner-modal');
                    if (modal) {
                        modal.style.display = 'none';
                    }
                    // 开始下一局
                    startNextAutoGame();
                }, delay); // 使用动态延迟
            } else {
                console.log('Manual mode: displaying match result');
            }
        };

        // AI学习数据持久化
        function loadAILearningData() {
            const savedData = window.saveSystem.loadData('aiLearningData');
            if (savedData) {
                try {
                    console.log('Loaded AI data:', savedData);
                    return savedData;
                } catch (error) {
                    console.error('Could not load AI data:', error);
                }
            }
            
            // 默认数据
            const defaultData = {
                gamesPlayed: 0,
                gamesWon: 0,
                strategies: {
                    attackPriority: 2.0,      // ATK优先级权重
                    moveTowardsEnemy: 1.0,    // 向Enemy move权重
                    protectLowHealth: 1.0,    // 保护低血量Unit权重
                    aggressivePlacement: 1.0, // 激进放置权重
                    defensivePlacement: 1.0,  // 防守放置权重
                    spellUsage: 1.0,          // Spell使用权重
                    skillUsage: 1.0,          // Skill使用权重
                    rageSkill: 1.0,           // 狂暴Skill权重
                    shadowMoveSkill: 1.0,     // Shadow ShiftSkill权重
                    erosionSkill: 1.0         // 侵蚀Skill权重
                },
                gameHistory: [],
                currentGameDecisions: []
            };
            
            console.log('Using default AI data');
            return defaultData;
        }

        function saveAILearningData() {
            try {
                const dataToSave = {
                    gamesPlayed: gameState.aiLearning.gamesPlayed,
                    gamesWon: gameState.aiLearning.gamesWon,
                    strategies: { ...gameState.aiLearning.strategies },
                    gameHistory: gameState.aiLearning.gameHistory.slice(-50), // 只保存最近50局的历史
                    currentGameDecisions: []
                };
                
                window.saveSystem.saveData('aiLearningData', dataToSave);
                console.log('Encrypted AI data saved');
            } catch (error) {
                console.error('Could not save AI data:', error);
            }
        }

        // 修改aiLearnFromGame函数以保存数据
        const originalAiLearnFromGame = aiLearnFromGame;
        aiLearnFromGame = function(winner) {
            originalAiLearnFromGame(winner);
            saveAILearningData(); // 每次学习后保存数据
            updateAILearningUI(); // 更新UI显示
        };

        // 添加重置AI学习数据的函数
        function resetAILearningData() {
            if (confirm('Reset AI statistics and strategy weights for the English edition?')) {
                window.saveSystem.deleteData('aiLearningData');
                gameState.aiLearning = loadAILearningData();
                console.log('AI statistics and strategy weights reset.');
                alert('AI statistics and strategy weights reset.');
            }
        }

        // 添加导出AI学习数据的函数
        function exportAILearningData() {
            const data = {
                timestamp: new Date().toISOString(),
                aiLearning: gameState.aiLearning
            };
            
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ai-learning-data-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            console.log('AI data exported');
        }

        // 添加导入AI学习数据的函数
        function importAILearningData() {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = function(e) {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        try {
                            const data = JSON.parse(e.target.result);
                            if (data.aiLearning) {
                                gameState.aiLearning = data.aiLearning;
                                saveAILearningData();
                                updateAILearningUI();
                                console.log('AI data imported.');
                                alert('AI data imported.');
                            } else {
                                alert('Invalid file format.');
                            }
                        } catch (error) {
                            console.error('Could not import AI data:', error);
                            alert('Import failed: invalid file format.');
                        }
                    };
                    reader.readAsText(file);
                }
            };
            input.click();
        }

        // 显示AI statistics
        function showAILearningStats() {
            const learning = gameState.aiLearning;
            const winRate = learning.gamesPlayed > 0 ? (learning.gamesWon / learning.gamesPlayed * 100).toFixed(1) : '0.0';
            
            let statsText = `=== AI statistics ===\n`;
            statsText += `Games played:  ${learning.gamesPlayed}\n`;
            statsText += `Wins: ${learning.gamesWon}\n`;
            statsText += `Win rate: ${winRate}%\n\n`;
            statsText += `Strategy weights:\n`;
            Object.entries(learning.strategies).forEach(([key, value]) => {
                statsText += `  ${key}: ${value.toFixed(3)}\n`;
            });
            statsText += `==================`;
            
            alert(statsText);
        }

        // 更新AI学习UI显示
        function updateAILearningUI() {
            const learning = gameState.aiLearning;
            const winRate = learning.gamesPlayed > 0 ? (learning.gamesWon / learning.gamesPlayed * 100).toFixed(1) : '0.0';
            
            document.getElementById('ai-games-played').textContent = learning.gamesPlayed;
            document.getElementById('ai-win-rate').textContent = winRate + '%';
            
            // 更新权重显示
            document.getElementById('weight-attack-priority').textContent = learning.strategies.attackPriority.toFixed(3);
            document.getElementById('weight-move-towards-enemy').textContent = learning.strategies.moveTowardsEnemy.toFixed(3);
            document.getElementById('weight-protect-low-health').textContent = learning.strategies.protectLowHealth.toFixed(3);
            document.getElementById('weight-aggressive-placement').textContent = learning.strategies.aggressivePlacement.toFixed(3);
            document.getElementById('weight-defensive-placement').textContent = learning.strategies.defensivePlacement.toFixed(3);
            document.getElementById('weight-spell-usage').textContent = learning.strategies.spellUsage.toFixed(3);
            document.getElementById('weight-skill-usage').textContent = learning.strategies.skillUsage.toFixed(3);
            document.getElementById('weight-rage-skill').textContent = learning.strategies.rageSkill.toFixed(3);
            document.getElementById('weight-shadow-move-skill').textContent = learning.strategies.shadowMoveSkill.toFixed(3);
            document.getElementById('weight-erosion-skill').textContent = learning.strategies.erosionSkill.toFixed(3);
        }

        // 并行训练函数
        function startParallelTraining() {
            if (parallelTrainingActive) return;
            const numGames = parseInt(document.getElementById('parallel-games').value) || 4;
            if (numGames < 1 || numGames > 10) {
                alert('Choose between 1 and 10 parallel games.');
                return;
            }

            parallelTrainingActive = true;
            gamesCompleted = 0;
            trainingStartTime = Date.now();
            parallelGames = [];
            simulationDraws = 0;

            console.log(`Starting ${numGames} parallel simulations`);

            // 创建多个游戏实例，每个实例使用不同的策略变体
            for (let i = 0; i < numGames; i++) {
                const gameInstance = createGameInstance(i);
                parallelGames.push(gameInstance);
                startGameInstance(gameInstance);
            }

            // 开始统计更新（更频繁地更新UI）
            trainingStatsInterval = setInterval(updateTrainingStats, 50);

            // 更新UI
            document.getElementById('active-games').textContent = numGames;
            
            // 切换按钮Status
            document.getElementById('start-parallel-btn').style.display = 'none';
            document.getElementById('stop-parallel-btn').style.display = 'inline-block';
        }

        function stopParallelTraining() {
            parallelTrainingActive = false;
            
            // 停止所有游戏实例
            parallelGames.forEach(instance => clearTimeout(instance.timer));
            parallelGames = [];

            // 停止统计更新
            if (trainingStatsInterval) {
                clearInterval(trainingStatsInterval);
                trainingStatsInterval = null;
            }

            console.log('Parallel simulations stopped');
            
            // 更新UI
            document.getElementById('active-games').textContent = '0';
            document.getElementById('games-per-second').textContent = '0';
            
            // 切换按钮Status
            document.getElementById('start-parallel-btn').style.display = 'inline-block';
            document.getElementById('stop-parallel-btn').style.display = 'none';
        }

        function createGameInstance(id) {
            return {
                id: id,
                state: {
                    currentPlayer: 1,
                    players: {
                        1: { hand: [], units: [], deck: [], health: 7, actionPoints: 2, shield: 0 },
                        2: { hand: [], units: [], deck: [], health: 7, actionPoints: 2, shield: 0 }
                    },
                    board: Array(5).fill().map(() => Array(7).fill(null)),
                    units: [],
                    turnCount: 0,
                    phase: 'placement',
                    aiPlayers: [true, true],
                    aiLearning: { currentGameDecisions: [] },
                    erosionMode: false
                },
                completed: false,
                player1Strategy: null,
                player2Strategy: null,
                player1Wins: 0,
                player2Wins: 0
            };
        }



        function startGameInstance(gameInstance) {
            if (!parallelTrainingActive) return;

            // 初始化游戏实例
            initGameInstance(gameInstance);
            
            // 开始AI回合
            gameInstance.timer = setTimeout(() => processAITurn(gameInstance), 0);
        }

        function initGameInstance(gameInstance) {
            const state = gameInstance.state;
            
            // 重置Player Status
            state.players[1].health = 7;
            state.players[2].health = 7;
            state.players[1].actionPoints = 2;
            state.players[2].actionPoints = 2;
            for (const player of Object.values(state.players)) {
                player.hand = [];
                player.shield = 0;
            }
            gameInstance.completed = false;
            // 清空棋盘和Unit
            state.board = Array(5).fill().map(() => Array(7).fill(null));
            state.units = [];
            state.turnCount = 0;
            state.phase = 'placement';
            state.currentPlayer = 1;
            
            // 初始化牌组（简化）
            const shuffledDeck = [...cardPool].sort(() => Math.random() - 0.5);
            const half = Math.ceil(shuffledDeck.length / 2);
            state.players[1].deck = shuffledDeck.slice(0, half);
            state.players[2].deck = shuffledDeck.slice(half);

            // 抽初始Hand
            for (let i = 0; i < 3; i++) {
                drawCardForInstance(state, 1);
                drawCardForInstance(state, 2);
            }
            
            // 清空当前游戏决策记录
            state.aiLearning.currentGameDecisions = [];
        }

        function drawCardForInstance(state, playerId) {
            const player = state.players[playerId];
            if (player.deck.length > 0) {
                const cardKey = player.deck.pop();
                let cardObj;
                if (cardKey in unitDefinitions) {
                  cardObj = { ...unitDefinitions[cardKey], key: cardKey, cost: unitDefinitions[cardKey].cost };
                } else if (cardKey in spellDefinitions) {
                  cardObj = { ...spellDefinitions[cardKey], key: cardKey, cost: spellDefinitions[cardKey].cost };
                } else {
                  cardObj = { key: cardKey, cost: 0 };
                }
                player.hand.push(cardObj);
            }
        }

        function processAITurn(gameInstance) {
            if (!parallelTrainingActive || gameInstance.completed || parallelGames[gameInstance.id] !== gameInstance) return;
            const state = gameInstance.state;
            executeAITurnForInstance(gameInstance);
            if (state.players[1].health <= 0 || state.players[2].health <= 0 || state.turnCount >= 200) {
                gameInstance.completed = true;
                gameInstance.winner = state.players[1].health <= 0 ? 2 : state.players[2].health <= 0 ? 1 : null;
                gamesCompleted++;
                totalTrainingGames++;
                if (gameInstance.winner === null) simulationDraws++;
                // 模拟规则不完整，绝不写入真实AIWin rate和策略。
                gameInstance.timer = setTimeout(() => {
                    if (!parallelTrainingActive || parallelGames[gameInstance.id] !== gameInstance) return;
                    const next = createGameInstance(gameInstance.id);
                    parallelGames[gameInstance.id] = next;
                    startGameInstance(next);
                }, 0);
                return;
            }
            gameInstance.timer = setTimeout(() => processAITurn(gameInstance), 0);
        }

        function executeAITurnForInstance(gameInstance) {
            const state = gameInstance.state;
            const player = state.players[state.currentPlayer];
            if (player.hand.length < 4 && player.deck.length && player.actionPoints >= 1) {
                drawCardForInstance(state, state.currentPlayer);
                player.actionPoints--;
            }
            while (true) {
                const card = player.hand.filter(card => card.key in unitDefinitions && card.cost <= player.actionPoints)
                    .sort((a, b) => a.cost - b.cost)[0];
                const positions = getPlacementPositions(state, state.currentPlayer);
                if (!card || !positions.length) break;
                const pos = positions[Math.floor(Math.random() * positions.length)];
                const definition = unitDefinitions[card.key];
                const unit = { ...definition, type: card.key, id: Date.now() + Math.random(), player: state.currentPlayer,
                    row: pos.row, col: pos.col, maxHealth: definition.health, movementRange: 1,
                    hasMoved: false, hasAttacked: false, hasUsedSkill: false, shield: 0 };
                state.board[pos.row][pos.col] = unit;
                state.units.push(unit);
                player.actionPoints -= card.cost;
                player.hand.splice(player.hand.indexOf(card), 1);
            }
            if (!checkBaseAttack(state)) {
                for (const unit of state.units.filter(unit => unit.player === state.currentPlayer)) {
                    if (unit.hasAttacked) continue;
                    if (hasAttackableTarget(state, unit) && unit.damage > 0) executeAttackAction(state, unit);
                    else if (hasMovablePosition(state, unit)) executeMoveAction(state, unit);
                }
            }
            state.currentPlayer = state.currentPlayer === 1 ? 2 : 1;
            state.players[state.currentPlayer].actionPoints = Math.min(6, state.players[state.currentPlayer].actionPoints + 2);
            state.turnCount++;
            state.units.forEach(unit => { unit.hasMoved = false; unit.hasAttacked = false; unit.hasUsedSkill = false; });
        }

        // 并行训练辅助函数
        function getPlacementPositions(state, playerId) {
            const positions = [];
            
            if (playerId === 1) {
                // Player 1的放置位置（左侧）
                for (let row = 0; row < 5; row++) {
                    for (let col = 0; col <= 1; col++) {
                        if (state.board[row][col] === null && !(row === 2 && col === 0)) {
                            positions.push({ row, col });
                        }
                    }
                }
            } else {
                // Player 2的放置位置（右侧）
                for (let row = 0; row < 5; row++) {
                    for (let col = 5; col <= 6; col++) {
                        if (state.board[row][col] === null && !(row === 2 && col === 6)) {
                            positions.push({ row, col });
                        }
                    }
                }
            }
            
            return positions;
        }

        function hasAttackableTarget(state, unit) {
            for (let row = 0; row < 5; row++) {
                for (let col = 0; col < 7; col++) {
                    const target = state.board[row][col];
                    if (target && target.player !== unit.player) {
                        const distance = Math.abs(unit.row - row) + Math.abs(unit.col - col);
                        if (distance <= unit.attackRange) {
                            return true;
                        }
                    }
                }
            }
            return false;
        }

        function hasMovablePosition(state, unit) {
            if (unit.hasMoved) return false;
            
            for (let row = 0; row < 5; row++) {
                for (let col = 0; col < 7; col++) {
                    if (state.board[row][col] === null) {
                        const distance = Math.abs(unit.row - row) + Math.abs(unit.col - col);
                        if (distance <= unit.movementRange) {
                            // 检查move方向限制（除了低级Shadow）
                            if (unit.type !== 'shadowAssassin') {
                                const colDirection = col - unit.col;
                                
                                // Player 1的Unit不能向左move
                                if (unit.player === 1 && colDirection < 0) {
                                    continue;
                                }
                                
                                // Player 2的Unit不能向右move
                                if (unit.player === 2 && colDirection > 0) {
                                    continue;
                                }
                            }
                            
                            return true;
                        }
                    }
                }
            }
            return false;
        }

        function hasUsableSkill(state, unit) {
            if (unit.hasUsedSkill || !unit.skills || unit.skills.length === 0) return false;
            
            for (const skill of unit.skills) {
                switch (skill) {
                    case 'rage':
                        return state.players[unit.player - 1].actionPoints >= 1;
                    case 'shadowMove':
                        return getSwappableTargets(state, unit).length > 0;
                    case 'erosion':
                        return state.erosionMode && hasAttackableTarget(state, unit);
                }
            }
            return false;
        }

        function getSwappableTargets(state, unit) {
            const targets = [];
            for (let row = 0; row < 5; row++) {
                for (let col = 0; col < 7; col++) {
                    const target = state.board[row][col];
                    if (target && target.player !== unit.player) {
                        const distance = Math.abs(unit.row - row) + Math.abs(unit.col - col);
                        if (distance <= 1) {
                            targets.push({ row, col, unit: target });
                        }
                    }
                }
            }
            return targets;
        }

        function evaluateAttackAction(state, unit, gameInstance) {
            let score = 0;
            const strategies = unit.player === 1 ? 
                (gameInstance.player1Strategy || gameState.aiLearning.strategies) :
                (gameInstance.player2Strategy || gameState.aiLearning.strategies);
            
            for (let row = 0; row < 5; row++) {
                for (let col = 0; col < 7; col++) {
                    const target = state.board[row][col];
                    if (target && target.player !== unit.player) {
                        const distance = Math.abs(unit.row - row) + Math.abs(unit.col - col);
                        if (distance <= unit.attackRange) {
                            score += 15 * strategies.attackPriority;
                            
                            if (target.health <= 2) {
                                score += 10 * strategies.attackPriority;
                            }
                        }
                    }
                }
            }
            
            return score;
        }

        function evaluateMoveAction(state, unit, gameInstance) {
            let score = 0;
            const strategies = unit.player === 1 ? 
                (gameInstance.player1Strategy || gameState.aiLearning.strategies) :
                (gameInstance.player2Strategy || gameState.aiLearning.strategies);
            
            for (let row = 0; row < 5; row++) {
                for (let col = 0; col < 7; col++) {
                    if (state.board[row][col] === null) {
                        const distance = Math.abs(unit.row - row) + Math.abs(unit.col - col);
                        if (distance <= unit.movementRange) {
                            // 检查move方向限制（除了低级Shadow）
                            if (unit.type !== 'shadowAssassin') {
                                const colDirection = col - unit.col;
                                
                                // Player 1的Unit不能向左move
                                if (unit.player === 1 && colDirection < 0) {
                                    continue;
                                }
                                
                                // Player 2的Unit不能向右move
                                if (unit.player === 2 && colDirection > 0) {
                                    continue;
                                }
                            }
                            
                            // 检查move后是否能ATK到更多目标
                            for (let r = 0; r < 5; r++) {
                                for (let c = 0; c < 7; c++) {
                                    const target = state.board[r][c];
                                    if (target && target.player !== unit.player) {
                                        const newDistance = Math.abs(row - r) + Math.abs(col - c);
                                        if (newDistance <= unit.attackRange) {
                                            score += 10 * strategies.moveTowardsEnemy;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            
            return score;
        }

        function evaluateSkillAction(state, unit, gameInstance) {
            let score = 0;
            const strategies = unit.player === 1 ? 
                (gameInstance.player1Strategy || gameState.aiLearning.strategies) :
                (gameInstance.player2Strategy || gameState.aiLearning.strategies);
            
            for (const skill of unit.skills) {
                switch (skill) {
                    case 'rage':
                        if (hasAttackableTarget(state, unit)) {
                            score += 25 * strategies.attackPriority * strategies.rageSkill;
                        }
                        break;
                    case 'shadowMove':
                        const swappableTargets = getSwappableTargets(state, unit);
                        if (swappableTargets.length > 0) {
                            score += 20 * strategies.shadowMoveSkill;
                        }
                        break;
                    case 'erosion':
                        if (state.erosionMode && hasAttackableTarget(state, unit)) {
                            score += 30 * strategies.erosionSkill;
                        }
                        break;
                }
            }
            
            return score * strategies.skillUsage;
        }

        function executeAttackAction(state, unit) {
            // 寻找最佳ATK目标
            let bestTarget = null;
            let bestScore = 0;
            
            for (let row = 0; row < 5; row++) {
                for (let col = 0; col < 7; col++) {
                    const target = state.board[row][col];
                    if (target && target.player !== unit.player) {
                        const distance = Math.abs(unit.row - row) + Math.abs(unit.col - col);
                        if (distance <= unit.attackRange) {
                            const score = target.health + target.damage * 2;
                            if (score > bestScore) {
                                bestScore = score;
                                bestTarget = { row, col, unit: target };
                            }
                        }
                    }
                }
            }
            
            if (bestTarget) {
                // 执行ATK
                const damage = unit.damage + (unit.bonusDamage || 0);
                bestTarget.unit.health -= damage;
                
                // 检查是否死亡
                if (bestTarget.unit.health <= 0) {
                    state.board[bestTarget.row][bestTarget.col] = null;
                    const unitIndex = state.units.findIndex(u => u.id === bestTarget.unit.id);
                    if (unitIndex !== -1) {
                        state.units.splice(unitIndex, 1);
                    }
                }
                
                unit.hasAttacked = true;
                
                // 记录决策
                state.aiLearning.currentGameDecisions.push({
                    type: 'attack_target',
                    data: {
                        unitType: unit.type,
                        targetType: bestTarget.unit.type,
                        targetPosition: { row: bestTarget.row, col: bestTarget.col },
                        decisionType: 'attack_enemy_unit',
                        damage: damage,
                        killed: bestTarget.unit.health <= 0
                    }
                });
            }
        }

        function executeMoveAction(state, unit) {
            // 寻找最佳move位置
            let bestPosition = null;
            let bestScore = -Infinity;
            
            for (let row = 0; row < 5; row++) {
                for (let col = 0; col < 7; col++) {
                    if (state.board[row][col] === null) {
                        const distance = Math.abs(unit.row - row) + Math.abs(unit.col - col);
                        if (distance === 1 && !(row === 2 && (col === 0 || col === 6))) {
                            // 检查move方向限制（除了低级Shadow）
                            if (unit.type !== 'shadowAssassin') {
                                const colDirection = col - unit.col;
                                
                                // Player 1的Unit不能向左move
                                if (unit.player === 1 && colDirection < 0) {
                                    continue;
                                }
                                
                                // Player 2的Unit不能向右move
                                if (unit.player === 2 && colDirection > 0) {
                                    continue;
                                }
                            }
                            
                            let score = -Math.abs(row - 2) - Math.abs(col - (unit.player === 1 ? 6 : 0));
                            
                            // 检查move后是否能ATK到更多目标
                            for (let r = 0; r < 5; r++) {
                                for (let c = 0; c < 7; c++) {
                                    const target = state.board[r][c];
                                    if (target && target.player !== unit.player) {
                                        const newDistance = Math.abs(row - r) + Math.abs(col - c);
                                        if (newDistance <= unit.attackRange) {
                                            score += 10;
                                        }
                                    }
                                }
                            }
                            
                            if (score > bestScore) {
                                bestScore = score;
                                bestPosition = { row, col };
                            }
                        }
                    }
                }
            }
            
            if (bestPosition) {
                // 执行move
                state.board[unit.row][unit.col] = null;
                state.board[bestPosition.row][bestPosition.col] = unit;
                unit.row = bestPosition.row;
                unit.col = bestPosition.col;
                unit.hasMoved = true;
                
                // 记录决策
                state.aiLearning.currentGameDecisions.push({
                    type: 'move_position',
                    data: {
                        unitType: unit.type,
                        fromPosition: { row: unit.row, col: unit.col },
                        toPosition: bestPosition
                    }
                });
            }
        }

        function checkBaseAttack(state) {
            // 检查是否有UnitATKBase
            for (const unit of state.units.filter(unit => unit.player === state.currentPlayer && !unit.hasAttacked && !unit.hasMoved && unit.damage > 0)) {
                const baseCol = unit.player === 1 ? 6 : 0;
                const distance = Math.abs(unit.row - 2) + Math.abs(unit.col - baseCol);
                
                if (distance <= unit.attackRange) {
                    unit.hasAttacked = true;
                    // ATKBase
                    const damage = unit.damage + (unit.bonusDamage || 0);
                    const targetPlayer = unit.player === 1 ? 2 : 1;
                    state.players[targetPlayer].health -= damage;
                    
                    // 记录决策
                    state.aiLearning.currentGameDecisions.push({
                        type: 'attack_target',
                        data: {
                            unitType: unit.type,
                            decisionType: 'attack_base',
                            damage: damage,
                            targetPlayer: targetPlayer
                        }
                    });
                    
                    // 检查游戏是否结束
                    if (state.players[targetPlayer].health <= 0) {
                        return true; // 游戏结束
                    }
                }
            }
            return false; // 游戏继续
        }

        function executeSkillAction(state, unit) {
            // 找到最佳Skill
            let bestSkill = null;
            let bestScore = 0;
            
            for (const skill of unit.skills) {
                let skillScore = 0;
                
                switch (skill) {
                    case 'rage':
                        if (hasAttackableTarget(state, unit)) {
                            skillScore = 25;
                        }
                        break;
                    case 'shadowMove':
                        const swappableTargets = getSwappableTargets(state, unit);
                        if (swappableTargets.length > 0) {
                            skillScore = 20;
                        }
                        break;
                    case 'erosion':
                        if (state.erosionMode && hasAttackableTarget(state, unit)) {
                            skillScore = 30;
                        }
                        break;
                }
                
                if (skillScore > bestScore) {
                    bestScore = skillScore;
                    bestSkill = skill;
                }
            }
            
            if (bestSkill) {
                // 执行Skill
                switch (bestSkill) {
                    case 'rage':
                        unit.bonusDamage = (unit.bonusDamage || 0) + 2;
                        state.players[unit.player - 1].actionPoints -= 1;
                        break;
                    case 'shadowMove':
                        const swappableTargets = getSwappableTargets(state, unit);
                        if (swappableTargets.length > 0) {
                            const target = swappableTargets[0];
                            // 交swap置
                            const tempRow = unit.row;
                            const tempCol = unit.col;
                            state.board[unit.row][unit.col] = target.unit;
                            state.board[target.row][target.col] = unit;
                            unit.row = target.row;
                            unit.col = target.col;
                            target.unit.row = tempRow;
                            target.unit.col = tempCol;
                            target.unit.shadowMoveBonus = true;
                        }
                        break;
                    case 'erosion':
                        // 寻找可以侵蚀的目标
                        for (let row = 0; row < 5; row++) {
                            for (let col = 0; col < 7; col++) {
                                const target = state.board[row][col];
                                if (target && target.player !== unit.player) {
                                    const distance = Math.abs(unit.row - row) + Math.abs(unit.col - col);
                                    if (distance <= unit.attackRange) {
                                        const totalDamage = unit.damage + (unit.bonusDamage || 0);
                                        if (totalDamage >= target.health) {
                                            // 直接消灭
                                            state.board[row][col] = null;
                                            const unitIndex = state.units.findIndex(u => u.id === target.id);
                                            if (unitIndex !== -1) {
                                                state.units.splice(unitIndex, 1);
                                            }
                                            break;
                                        }
                                    }
                                }
                            }
                        }
                        break;
                }
                
                unit.hasUsedSkill = true;
                
                // 记录决策
                state.aiLearning.currentGameDecisions.push({
                    type: 'use_skill',
                    data: {
                        unitType: unit.type,
                        skillType: bestSkill,
                        unitPosition: { row: unit.row, col: unit.col }
                    }
                });
            }
        }

        // 分析决策统计
        function analyzeDecisionStats(decisions) {
            const stats = {
                attackCount: 0,
                moveCount: 0,
                skillCount: 0,
                placementCount: 0,
                totalDecisions: decisions.length
            };
            
            decisions.forEach(decision => {
                switch (decision.type) {
                    case 'attack_target':
                        stats.attackCount++;
                        break;
                    case 'move_position':
                        stats.moveCount++;
                        break;
                    case 'use_skill':
                        stats.skillCount++;
                        break;
                    case 'place_unit':
                        stats.placementCount++;
                        break;
                }
            });
            
            return stats;
        }

        // 分析游戏结果
        function analyzeGameResults(winner, aiWon, state) {
            return {
                winner: winner,
                aiWon: aiWon,
                gameLength: state.turnCount,
                unitsPlaced: state.units.length,
                totalDamage: calculateTotalDamage(state)
            };
        }

        // 计算总伤害
        function calculateTotalDamage(state) {
            let totalDamage = 0;
            state.units.forEach(unit => {
                totalDamage += unit.damage + (unit.bonusDamage || 0);
            });
            return totalDamage;
        }

        // 更新Strategy weights
        function updateStrategyWeights(decisionStats, gameResults, learningRate) {
            const strategies = gameState.aiLearning.strategies;
            
            if (gameResults.aiWon) {
                // AI获胜，强化使用的策略
                if (decisionStats.attackCount > 0) {
                    strategies.attackPriority += learningRate * 0.1;
                }
                if (decisionStats.moveCount > 0) {
                    strategies.moveTowardsEnemy += learningRate * 0.1;
                }
                if (decisionStats.skillCount > 0) {
                    strategies.skillUsage += learningRate * 0.1;
                }
                if (decisionStats.placementCount > 0) {
                    strategies.aggressivePlacement += learningRate * 0.05;
                }
            } else {
                // AI失败，弱化使用的策略
                if (decisionStats.attackCount > 0) {
                    strategies.attackPriority -= learningRate * 0.05;
                }
                if (decisionStats.moveCount > 0) {
                    strategies.moveTowardsEnemy -= learningRate * 0.05;
                }
                if (decisionStats.skillCount > 0) {
                    strategies.skillUsage -= learningRate * 0.05;
                }
                if (decisionStats.placementCount > 0) {
                    strategies.aggressivePlacement -= learningRate * 0.025;
                }
            }
            
            // 确保权重在合理Range内
            Object.keys(strategies).forEach(key => {
                strategies[key] = Math.max(0.1, Math.min(3.0, strategies[key]));
            });
        }



        function updateTrainingStats() {
            if (!parallelTrainingActive) return;
            
            const elapsed = (Date.now() - trainingStartTime) / 1000;
            const gamesPerSecond = elapsed > 0 ? (gamesCompleted / elapsed).toFixed(1) : '0';
            
            // 更新训练统计UI
            document.getElementById('games-per-second').textContent = gamesPerSecond;
            document.getElementById('total-training-games').textContent = totalTrainingGames;
            document.getElementById('current-generation').textContent = simulationDraws;
            
        }

        // 1. 所有基地血量<=0的判定都要特判
        function isTechFatherRevengeAlive() {
            // 检查Revenge Colossus是否在场
            return gameState.units.some(u => u.type === 'techFatherRevenge' && u.player === 2);
        }

        // 修改所有 if (gameState.players[0].health <= 0 || gameState.players[1].health <= 0) 判定：
        // 例如：
        // if (gameState.players[0].health <= 0 || gameState.players[1].health <= 0) {
        //     ...
        // }
        // 改为：
        // if ((gameState.players[0].health <= 0 || gameState.players[1].health <= 0) && !(window.selectedBoss && window.selectedBoss.type === 'techFather' && isTechFatherRevengeAlive())) {
        //     ...
        // }
        // 在checkGameEnd中，Revenge Colossus被摧毁时判定Player 1胜利
        // 在Unit死亡判定处，若死亡Unit为Revenge Colossus，直接判定Player 1胜利
        // Revenge Colossus生成后，Player 2面板血条显示为该Unit血量
        // Revenge Colossus每回合自动向Player 1基地方向move，move后Can attack
        function autoMoveAndAttackRevenge() {
            if (!(window.selectedBoss && window.selectedBoss.type === 'techFather')) return;
            const revenge = gameState.units.find(u => u.type === 'techFatherRevenge' && u.player === 2);
            if (!revenge) return;
            // 只要没被冻结且没move/ATK，像AIUnit一样操作
            if (!gameState.frozenUnits.some(f => f.id === revenge.id)) {
                if (!revenge.hasMoved) {
                    aiMoveUnit(revenge);
                }
                if (!revenge.hasAttacked) {
                    aiAttackWithUnit(revenge);
                }
            }
        }
        // 在endTurn切换到Player 2时调用autoMoveAndAttackRevenge()

        // 在后面添加剧情模式面板函数预留
        function showStorySelectPanel() {
            cancelAITurn();
            gameState.gameOver = true;
            document.querySelector('.game-container').style.display = 'none';
            mainMenu.style.display = 'none';
            storyPanel.style.display = 'flex';
            updateCharacterPanel(currentCharIdx);
        }

