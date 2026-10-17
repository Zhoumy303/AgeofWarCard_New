        // 主菜单和剧情模式切换逻辑
        const mainMenu = document.getElementById('main-menu');
        const storyPanel = document.getElementById('story-select-panel');
        const btnStartStory = document.getElementById('btn-start-story');
        const btnExperience = document.getElementById('btn-experience');
        const btnExitStory = document.getElementById('btn-exit-story');
        const btnPrevChar = document.getElementById('btn-prev-character');
        const btnNextChar = document.getElementById('btn-next-character');
        const btnStoryStart = document.getElementById('btn-story-start');
        const characterPortrait = document.getElementById('character-portrait');
        const characterJob = document.getElementById('character-job');
        const characterDesc = document.getElementById('character-desc');

        // 占位人物数据
        const CHARACTERS = [
          {
            name: 'Fortress Guardian',
            job: 'Guardian',
            desc: 'Starting deck:\n- Shield Warrior ×2\n- Swordsman ×2\n- Healing Kit ×1',
            img: 'lib/img/player/fortress_guardian.webp'
          },
          {
            name: 'Shadow Hunter',
            job: 'Hunter',
            desc: 'Starting deck:\n- Shadow Assassin ×3\n- Shadow Mage ×1\n- Recall ×1',
            img: 'lib/img/player/shadow_hunter.webp'
          },
          {
            name: 'Beastmaster',
            job: 'Beastmaster',
            desc: 'Starting deck:\n- Raging Wolf ×1\n- Minotaur ×1\n- Frost Dragon ×1\n- Healing Kit ×1',
            img: 'lib/img/player/beastmaster.webp'
          }
        ];
        let currentCharIdx = 0;

        function updateCharacterPanel(idx) {
          const char = CHARACTERS[idx];
          characterPortrait.src = char.img;
          characterPortrait.alt = char.name;
          characterJob.textContent = `${char.name}`;
          characterDesc.textContent = char.job;
          const heroTabs = document.getElementById('hero-tabs');
          if (heroTabs) {
            heroTabs.innerHTML = '';
            CHARACTERS.forEach((hero, heroIdx) => {
              const tab = document.createElement('button');
              tab.type = 'button';
              tab.className = 'hero-tab' + (heroIdx === idx ? ' selected' : '');
              tab.setAttribute('aria-pressed', heroIdx === idx ? 'true' : 'false');
              tab.setAttribute('aria-label', hero.name);
              tab.innerHTML = `<img src="${hero.img}" alt=""><span>${hero.job}</span>`;
              tab.onclick = () => {
                currentCharIdx = heroIdx;
                updateCharacterPanel(heroIdx);
              };
              heroTabs.appendChild(tab);
            });
          }
          const startingDeck = document.getElementById('starting-deck');
          if (startingDeck) {
            const cards = CHARACTER_DECKS[idx].map(name => getUnitByName(name) || getSpellByName(name));
            startingDeck.innerHTML = `<h3>Starting deck <small>${cards.length} cards</small></h3><div class="starter-cards">${cards.map(card => `<div class="starter-card"><img src="${card.img}" alt="${card.name}"><span>${card.name}</span></div>`).join('')}</div>`;
          }
        }

        if (btnStartStory) btnStartStory.onclick = () => {
          mainMenu.style.display = 'none';
          storyPanel.style.display = 'flex';
          updateCharacterPanel(currentCharIdx);
        };
        if (btnExperience) btnExperience.onclick = () => {
          mainMenu.style.display = 'none';
          // 显示原体验内容
          document.querySelector('.game-container').style.display = '';
        };
        if (btnExitStory) btnExitStory.onclick = () => {
          storyPanel.style.display = 'none';
          mainMenu.style.display = 'flex';
        };
        if (btnPrevChar) btnPrevChar.onclick = () => {
          currentCharIdx = (currentCharIdx - 1 + CHARACTERS.length) % CHARACTERS.length;
          updateCharacterPanel(currentCharIdx);
        };
        if (btnNextChar) btnNextChar.onclick = () => {
          currentCharIdx = (currentCharIdx + 1) % CHARACTERS.length;
          updateCharacterPanel(currentCharIdx);
        };
        if (btnStoryStart) btnStoryStart.onclick = () => {
          cancelAITurn();
          window.selectedBoss = null;
          window._storyEnemyBattle = false;
          window._storyEnemyInfo = null;
          window._originPlayerDeck = null;
          window.PREVIEW_ITEMS = [];
          window.PREVIEW_ITEM_LIMIT = 1;
          gameState.players[0].items = [];
          gameState.players[0].itemLimit = 1;
          Object.assign(PREVIEW_ROLE, {
            level: 1, exp: 0, nextLevelExp: LEVEL_EXP_REQUIREMENTS[1],
            hp: LEVEL_MAX_HP[1], maxHp: LEVEL_MAX_HP[1], ap: 6, gold: 0
          });
          EVENT_DECK = createEventDeck();
          PREVIEW_EVENTS = EVENT_DECK.splice(0, 3);
          window.selectedEventIdx = 0;
          window.storyStarted = true;
          // 进入下一个场景，显示Battle预览界面
          storyPanel.style.display = 'none';
          // 更新PREVIEW_ROLE的立绘为当前选中的角色
          PREVIEW_ROLE.img = CHARACTERS[currentCharIdx].img;
          // 根据当前角色选择设置卡组
          PREVIEW_CARDS = CHARACTER_DECKS[currentCharIdx]
            .map(cardName => getUnitByName(cardName) || getSpellByName(cardName))
            .filter(card => {
              if (!card) console.warn('Undefined card in deck:', cardName);
              return !!card;
            });
          battlePreviewRoot.style.display = 'block';
          renderPreviewRole();
          renderPreviewEvents();
          showPreviewCardDetail(PREVIEW_EVENTS[selectedEventIdx]);
        };
        // 初始只显示主菜单，隐藏原体验内容和剧情面板
        window.addEventListener('DOMContentLoaded', function () {
          if (mainMenu) mainMenu.style.display = 'flex';
          if (storyPanel) storyPanel.style.display = 'none';
          const gameContainer = document.querySelector('.game-container');
          if (gameContainer) gameContainer.style.display = 'none';
          // 其余初始化
          if (initEventListeners) initEventListeners();
          if (initGame) initGame();
          updateContinueButton();
        });
        // 体验内容入口时显示原内容
        if (btnExperience) btnExperience.onclick = () => {
          mainMenu.style.display = 'none';
          const gameContainer = document.querySelector('.game-container');
          window.selectedBoss = null;
          window._storyEnemyBattle = false;
          window._storyEnemyInfo = null;
          gameState.aiPlayers = [Number(playerId) !== 1, Number(playerId) !== 2];
          initGame();
          if (gameContainer) gameContainer.style.display = '';
        };

        // 卡牌详情/Battle预览界面
        const battlePreviewRoot = document.getElementById('battle-preview-root');
        const btnPreviewBattle = document.getElementById('btn-preview-battle');
        const btnBackMain = document.getElementById('btn-back-main');
        const previewEventCards = document.getElementById('preview-event-cards');
        const previewCardImg = document.getElementById('preview-card-img');
        const previewCardName = document.getElementById('preview-card-name');
        const previewCardDesc = document.getElementById('preview-card-desc');
        const previewCardAction = document.getElementById('preview-card-action');
        const previewRoleImg = document.getElementById('preview-role-img');
        const previewHp = document.getElementById('preview-hp');
        const previewAp = document.getElementById('preview-ap');
        const previewGold = document.getElementById('preview-gold');
        const previewExpBar = document.getElementById('preview-exp-bar');
        const previewExpLabel = document.getElementById('preview-exp-label');
        const previewDeckCount = document.getElementById('preview-deck-count');
        const btnOpenCardList = document.getElementById('btn-open-card-list');
        const previewCardListModal = document.getElementById('preview-card-list-modal');
        const previewCardListContent = document.getElementById('preview-card-list-content');
        const btnCloseCardList = document.getElementById('btn-close-card-list');

        // 假数据
        const PREVIEW_ROLE = {
          img: 'lib/img/player/fortress_guardian.webp',
          level: 1,
          exp: 0,
          nextLevelExp: LEVEL_EXP_REQUIREMENTS[1],
          hp: LEVEL_MAX_HP[1],
          maxHp: LEVEL_MAX_HP[1],
          ap: 6,
          gold: 0
        };
        // 角色卡组配置
        const CHARACTER_DECKS = [
          // Guardian
          ['Shield Warrior','Shield Warrior','Swordsman','Swordsman','Healing Kit'],
          // Hunter
          ['Shadow Assassin','Shadow Assassin','Shadow Assassin','Shadow Mage','Recall'],
          // Beastmaster
          ['Raging Wolf','Minotaur','Frost Dragon','Healing Kit']
        ];
        let PREVIEW_CARDS = [];

        window.selectedEventIdx = 0;

        // 冒险在事件页自动保存；Battle中刷新会回到该场Battle之前。
        function saveStoryProgress() {
          if (!window.storyStarted || window._storyEnemyBattle || !PREVIEW_EVENTS.length) return;
          window.saveSystem.saveData('gameProgress', {
            character: currentCharIdx, role: PREVIEW_ROLE,
            cards: PREVIEW_CARDS.map(card => card.key),
            items: window.PREVIEW_ITEMS || [], itemLimit: window.PREVIEW_ITEM_LIMIT || 1,
            eventDeck: EVENT_DECK, events: PREVIEW_EVENTS, selectedEvent: window.selectedEventIdx
          });
          updateContinueButton();
        }

        function updateContinueButton() {
          const button = document.getElementById('btn-continue');
          const saved = window.saveSystem.loadData('gameProgress');
          button.disabled = !saved;
          button.title = 'Continue your adventure. Unfinished battles restart from the previous checkpoint.';
          const summary = document.getElementById('continue-hero-summary');
          if (summary) summary.textContent = saved ? `${CHARACTERS[saved.character]?.name || 'Adventure'} · Level ${saved.role?.level || 1}` : 'No adventure saved';
        }

        document.getElementById('btn-continue').onclick = () => {
          const saved = window.saveSystem.loadData('gameProgress');
          if (!saved || !Array.isArray(saved.cards) || !saved.events?.length) return;
          cancelAITurn();
          window.selectedBoss = null;
          window._storyEnemyBattle = false;
          window._storyEnemyInfo = null;
          currentCharIdx = saved.character;
          Object.assign(PREVIEW_ROLE, saved.role);
          PREVIEW_CARDS = saved.cards.map(key => {
            const definition = unitDefinitions[key] || spellDefinitions[key];
            return definition ? { ...definition, key } : null;
          }).filter(Boolean);
          window.PREVIEW_ITEMS = saved.items || [];
          window.PREVIEW_ITEM_LIMIT = saved.itemLimit || 1;
          gameState.players[0].itemLimit = saved.itemLimit || 1;
          EVENT_DECK = saved.eventDeck;
          PREVIEW_EVENTS = saved.events;
          window.selectedEventIdx = Math.min(saved.selectedEvent || 0, PREVIEW_EVENTS.length - 1);
          window.storyStarted = true;
          mainMenu.style.display = 'none';
          document.querySelector('.game-container').style.display = 'none';
          battlePreviewRoot.style.display = 'block';
          renderPreviewRole();
          renderPreviewEvents();
          showPreviewCardDetail(PREVIEW_EVENTS[window.selectedEventIdx]);
        };

        function renderPreviewRole() {
          previewRoleImg.src = PREVIEW_ROLE.img;
          const heroName = document.getElementById('preview-hero-name');
          if (heroName) heroName.textContent = CHARACTERS[currentCharIdx].name;
          previewRoleImg.alt = CHARACTERS[currentCharIdx].name;
          previewHp.textContent = `HP ${PREVIEW_ROLE.hp}/${PREVIEW_ROLE.maxHp}`;
          previewAp.textContent = `AP cap ${PREVIEW_ROLE.ap}`;
          previewGold.textContent = `Gold ${PREVIEW_ROLE.gold}`;
          previewExpBar.style.width = `${Math.round(PREVIEW_ROLE.exp / PREVIEW_ROLE.nextLevelExp * 100)}%`;
          previewExpLabel.textContent = PREVIEW_ROLE.level === 6 ? 'MAX' : `${PREVIEW_ROLE.exp}/${PREVIEW_ROLE.nextLevelExp}`;
          if (PREVIEW_ROLE.level === 6) previewExpBar.style.width = '100%';
          document.getElementById('preview-level').textContent = `Lv.${PREVIEW_ROLE.level}`;
          saveStoryProgress();
        }

        // 修正renderPreviewEvents，始终只显示3张事件卡
        function renderPreviewEvents() {
          window.selectedEventIdx = Math.max(0, Math.min(window.selectedEventIdx, PREVIEW_EVENTS.length - 1));
          previewDeckCount.textContent = `Events remaining: ${EVENT_DECK.length}`;
          previewEventCards.innerHTML = '';
          PREVIEW_EVENTS.forEach((ev, idx) => {
            const card = document.createElement('button');
            card.type = 'button';
            card.className = 'event-card-preview' + (idx === window.selectedEventIdx ? ' selected' : '');
            card.setAttribute('aria-pressed', idx === window.selectedEventIdx ? 'true' : 'false');
            // 如果是Battle事件，显示敌人名字
            let displayName = ev.name;
            let displayImg = ev.img;
            if (ev.type === 'Battle') {
              // 随机选一个敌人（但要保证和showEnemyEncounter一致）
              // 这里直接用desc里带的名字，或者用ENEMY_POOL随机一个
              // 但为了和showEnemyEncounter一致，应该在生成事件时就把敌人名字写进name
              displayName = ev.enemyName || ev.name;
              if (ev.enemyImg) displayImg = ev.enemyImg;
            }
            card.innerHTML = `<img src="${displayImg}" alt=""><span class="event-type">${ev.type}</span><h2>${displayName}</h2><p>Select to view this event</p>`;
            card.onclick = () => {
              window.selectedEventIdx = idx;
              renderPreviewEvents();
              showPreviewCardDetail(PREVIEW_EVENTS[window.selectedEventIdx]);
            };
            previewEventCards.appendChild(card);
          });
          if (window.storyStarted && PREVIEW_EVENTS.length === 0 && EVENT_DECK.length === 0) {
            showStoryWinModal();
          } else {
            saveStoryProgress();
          }
        }

        function showPreviewCardDetail(card) {
          if (!card) {
            previewCardImg.style.backgroundImage = '';
            previewCardName.textContent = 'Event complete';
            previewCardDesc.textContent = '';
            previewCardAction.disabled = true;
            return;
          }
          previewCardAction.disabled = false;
          previewCardImg.style.backgroundImage = `url('${card.img}')`;
          previewCardName.textContent = card.name;
          previewCardDesc.textContent = card.desc;
          previewCardAction.textContent = card.action;
        }

        function renderPreviewCardList() {
          previewCardListContent.innerHTML = '';
          PREVIEW_CARDS.forEach(card => {
            const div = document.createElement('div');
            div.className = 'adventure-card';
            div.innerHTML = `<img src="${(unitDefinitions[card.key] || spellDefinitions[card.key] || card).img}" style="width:110px;height:154px;border-radius:10px;box-shadow:0 4px 16px #0008;background:#222;object-fit:cover;object-position:center;"><div style="margin-top:10px;font-size:1.2em;">${card.name}</div><div style="font-size:1em;color:#8cf;">${card.type}</div>`;
            div.title = card.desc;
            previewCardListContent.appendChild(div);
          });
          // ====== 新增Item分组 ======
          const itemTitle = document.createElement('div');
          itemTitle.style = 'width:100%;font-size:1.3em;font-weight:bold;margin:24px 0 8px 0;color:#ffb400;';
          itemTitle.textContent = 'Items';
          previewCardListContent.appendChild(itemTitle);
          // 取当前角色/玩家的Item栏（预览模式用 PREVIEW_ITEMS，否则用主流程玩家items）
          let items = window.PREVIEW_ITEMS || [];
          if (!items.length) {
            const empty = document.createElement('div');
            empty.style = 'color:#888;font-size:1.1em;width:100%';
            empty.textContent = 'No items yet';
            previewCardListContent.appendChild(empty);
          } else {
            items.forEach(key => {
              const item = itemDefinitions[key] || {};
              const div = document.createElement('div');
              div.className = 'adventure-card';
              div.innerHTML = `<img src="${item.img}" style="width:110px;height:154px;border-radius:10px;box-shadow:0 4px 16px #0008;background:#222;object-fit:cover;object-position:center;"><div style="margin-top:10px;font-size:1.2em;">${item.name||key}</div><div style="font-size:1em;color:#ffb400;">Item</div>`;
              div.title = item.desc || '';
              previewCardListContent.appendChild(div);
            });
          }
        }

        if (btnPreviewBattle) btnPreviewBattle.onclick = () => {
          mainMenu.style.display = 'none';
          battlePreviewRoot.style.display = 'block';
          renderPreviewRole();
          renderPreviewEvents();
          showPreviewCardDetail(PREVIEW_EVENTS[window.selectedEventIdx]);
        };
        if (btnBackMain) btnBackMain.onclick = () => {
          saveStoryProgress();
          battlePreviewRoot.style.display = 'none';
          mainMenu.style.display = 'flex';
        };
        if (btnOpenCardList) btnOpenCardList.onclick = () => {
          renderPreviewCardList();
          previewCardListModal.style.display = 'flex';
        };
        if (btnCloseCardList) btnCloseCardList.onclick = () => {
          previewCardListModal.style.display = 'none';
        };
        // 预览界面初始隐藏
        if (battlePreviewRoot) battlePreviewRoot.style.display = 'none';

        // 经验获取与升级
        function gainExp(amount) {
          PREVIEW_ROLE.exp += amount;
          while (PREVIEW_ROLE.level < 6 && PREVIEW_ROLE.exp >= PREVIEW_ROLE.nextLevelExp) {
            PREVIEW_ROLE.exp -= PREVIEW_ROLE.nextLevelExp;
            levelUp();
          }
          renderPreviewRole && renderPreviewRole();
        }
        function levelUp() {
          const bonusHp = PREVIEW_ROLE.maxHp - LEVEL_MAX_HP[PREVIEW_ROLE.level];
          PREVIEW_ROLE.level++;
          PREVIEW_ROLE.nextLevelExp = LEVEL_EXP_REQUIREMENTS[PREVIEW_ROLE.level] || Infinity;
          PREVIEW_ROLE.maxHp = LEVEL_MAX_HP[PREVIEW_ROLE.level] + bonusHp;
          PREVIEW_ROLE.hp = PREVIEW_ROLE.maxHp; // 血量补满
          notifyPlayer(`Level up! You reached level ${PREVIEW_ROLE.level}.`);
        }

        // Battle胜利后回到预览界面并加经验
        function onEnemyBattleWin() {
          console.log('[onEnemyBattleWin] Processing battle victory');
          // 强制只显示预览界面，彻底隐藏Battle界面和胜利弹窗
          if (typeof battlePreviewRoot !== 'undefined') battlePreviewRoot.style.display = 'block';
          if (typeof mainMenu !== 'undefined') mainMenu.style.display = 'none';
          const gameContainer = document.querySelector('.game-container');
          if (gameContainer) gameContainer.style.display = 'none';
          const winnerModal = document.getElementById('winner-modal');
          if (winnerModal) winnerModal.style.display = 'none';
          // 加经验和金币（根据当前敌人）
          let exp = 0, gold = 0;
          if (window._storyEnemyInfo) {
            exp = window._storyEnemyInfo.exp ?? 0;
            gold = window._storyEnemyInfo.gold ?? 0;
            console.log('[onEnemyBattleWin] Enemy:', window._storyEnemyInfo);
          }
          PREVIEW_ROLE.hp = Math.max(1, gameState.players[0].health);
          gainExp(exp);
          PREVIEW_ROLE.gold = (PREVIEW_ROLE.gold || 0) + gold;
          renderPreviewRole && renderPreviewRole();
          // 清理标记
          window._storyEnemyBattle = false;
          window._storyEnemyInfo = null;
          // Recall组
          if (window._originPlayerDeck) {
            PREVIEW_CARDS = window._originPlayerDeck
              .map(name => getUnitByName(name) || getSpellByName(name))
              .filter(card => {
                if (!card) console.warn('Undefined card in deck:', name);
                return !!card;
              });
          } else {
            console.log('[onEnemyBattleWin] No original deck; keeping PREVIEW_CARDS');
          }
          renderPreviewCardList();
          // 删除当前Battle事件卡并补充新事件
          console.log('[onEnemyBattleWin] Selected event:', window.selectedEventIdx);
          console.log('[onEnemyBattleWin] Current event card:', PREVIEW_EVENTS[window.selectedEventIdx]);
          console.log('[onEnemyBattleWin] Events remaining:', EVENT_DECK.length);
          if (PREVIEW_EVENTS[window.selectedEventIdx] && PREVIEW_EVENTS[window.selectedEventIdx].type === 'Battle') {
            console.log('[onEnemyBattleWin] Removing battle event');
            const removedCard = PREVIEW_EVENTS.splice(window.selectedEventIdx, 1)[0];
            console.log('[onEnemyBattleWin] Removed event:', removedCard);
            if (EVENT_DECK.length > 0) {
              const newCard = EVENT_DECK.shift();
              PREVIEW_EVENTS.push(newCard);
              console.log('[onEnemyBattleWin] New event:', newCard);
            } else {
              console.log('[onEnemyBattleWin] No events remaining in deck');
            }
            console.log('[onEnemyBattleWin] Remaining preview events:', PREVIEW_EVENTS);
            renderPreviewEvents && renderPreviewEvents();
            // 确保selectedEventIdx在有效范围内
            if (window.selectedEventIdx >= PREVIEW_EVENTS.length) {
              window.selectedEventIdx = 0;
            }
            showPreviewCardDetail && showPreviewCardDetail(PREVIEW_EVENTS[window.selectedEventIdx]);
          } else {
            console.log('[onEnemyBattleWin] Current event is missing or is not a battle');
          }
        }

        // 恢复Treasure Reward弹窗
        function showTreasureRewardModal(unit, onAccept, onDecline) {
          let modal = document.getElementById('treasure-reward-modal');
          if (!modal) {
            modal = document.createElement('div');
            modal.id = 'treasure-reward-modal';
            modal.className = 'adventure-modal';
            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-modal', 'true');
            modal.style = 'position:fixed;left:0;top:0;width:100vw;height:100vh;z-index:5000;background:rgba(24,28,42,0.96);display:flex;align-items:center;justify-content:center;';
            modal.innerHTML = `
              <div style="background:#23263a;padding:48px 64px 36px 64px;border-radius:24px;min-width:340px;max-width:90vw;box-shadow:0 8px 48px #000b;text-align:center;">
                <div style="font-size:2em;font-weight:bold;margin-bottom:24px;">Treasure Reward</div>
                <img src="${unit.img}" style="width:120px;height:168px;border-radius:10px;box-shadow:0 4px 16px #0008;background:#222;object-fit:cover;object-position:center;"><div style="margin:18px 0 8px 0;font-size:1.3em;">${unit.name}</div>
                <div style="margin-bottom:32px;font-size:1.1em;color:#8cf;">Add this unit to your deck?</div>
                <button id="btn-accept-reward" style="padding:12px 36px;font-size:1.1em;background:#4af;color:#fff;border:none;border-radius:10px;margin-right:32px;">Accept</button>
                <button id="btn-decline-reward" style="padding:12px 36px;font-size:1.1em;background:#888;color:#fff;border:none;border-radius:10px;">Skip</button>
              </div>
            `;
            document.body.appendChild(modal);
          } else {
            modal.querySelector('img').src = unit.img;
            modal.querySelector('img').alt = unit.name;
            modal.querySelector('div:nth-child(3)').textContent = unit.name;
            modal.style.display = 'flex';
          }
          document.getElementById('btn-accept-reward').onclick = () => {
            modal.style.display = 'none';
            onAccept && onAccept();
          };
          document.getElementById('btn-decline-reward').onclick = () => {
            modal.style.display = 'none';
            onDecline && onDecline();
          };
        }

        // 恢复Treasure事件处理
        previewCardAction.onclick = function () {
          const card = PREVIEW_EVENTS[window.selectedEventIdx];
          if (!card) return;
          if (card.type === 'Treasure') {
            // 随机选一个普通Unit
            const rewardUnit = ALL_NORMAL_UNITS[Math.floor(Math.random() * ALL_NORMAL_UNITS.length)];
            showTreasureRewardModal(rewardUnit, () => {
              // Accept奖励，加入卡组
              const cardObj = getUnitByName(rewardUnit.key) || getSpellByName(rewardUnit.key);
              if (!cardObj) {
                notifyPlayer('Unknown card: ' + rewardUnit.key);
                PREVIEW_CARDS.push({ ...rewardUnit, type: 'Unit', desc: '', img: '', action: 'Battle' });
              } else {
                PREVIEW_CARDS.push(cardObj);
              }
              // 移除当前Treasure事件，补充新事件
              if (EVENT_DECK.length > 0) {
                PREVIEW_EVENTS.splice(window.selectedEventIdx, 1, EVENT_DECK.shift());
              } else {
                PREVIEW_EVENTS.splice(window.selectedEventIdx, 1);
              }
              renderPreviewEvents();
              showPreviewCardDetail(PREVIEW_EVENTS[window.selectedEventIdx]);
            }, () => {
              // Skip奖励，仅移除事件
              if (EVENT_DECK.length > 0) {
                PREVIEW_EVENTS.splice(window.selectedEventIdx, 1, EVENT_DECK.shift());
              } else {
                PREVIEW_EVENTS.splice(window.selectedEventIdx, 1);
              }
              renderPreviewEvents();
              showPreviewCardDetail(PREVIEW_EVENTS[window.selectedEventIdx]);
            });
          } else if (card.type === 'Crossroads') {
            handleCrossroadEvent();
          } else if (card.type === 'Shop') {
            showShopModal(card);
          } else if (card.type === 'Battle') {
            showEnemyEncounter(card); // 传递事件卡
          } else if (card.type === 'Spring') {
            showSpringModal(card);
          } else if (card.type === 'Tavern') {
            showTavernModal(card);
          } else if (card.type === 'Awakening') {
            showAwakeningModal(card);
          } else if (card.type === 'Quartermaster') {
            showQuartermasterModal(card);
          } else if (card.type === 'Gift') {
            showGiftModal(card);
          }
        };

        // Awakening Altar弹窗
        function showAwakeningModal(card) {
          let modal = document.getElementById('awakening-modal');
          if (!modal) {
            modal = document.createElement('div');
            modal.id = 'awakening-modal';
            modal.className = 'adventure-modal';
            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-modal', 'true');
            modal.style = 'position:fixed;left:0;top:0;width:100vw;height:100vh;z-index:5000;background:rgba(24,28,42,0.96);display:flex;align-items:center;justify-content:center;';
            modal.innerHTML = `
              <div style="background:#23263a;padding:48px 64px 36px 64px;border-radius:24px;min-width:420px;max-width:90vw;box-shadow:0 8px 48px #000b;text-align:center;">
                <div style="font-size:2em;font-weight:bold;margin-bottom:18px;">Awakening Altar</div>
                <div style="margin-bottom:18px;font-size:1.1em;color:#8cf;">Choose one reward:</div>
                <button id="btn-awaken-hp" style="padding:12px 36px;font-size:1.1em;background:#4af;color:#fff;border:none;border-radius:10px;margin:12px;">+2 maximum base HP</button>
                <button id="btn-awaken-bag" style="padding:12px 36px;font-size:1.1em;background:#ffb400;color:#fff;border:none;border-radius:10px;margin:12px;">+1 item slot</button>
                <button id="btn-awaken-ap" style="padding:12px 36px;font-size:1.1em;background:#8cf;color:#222;border:none;border-radius:10px;margin:12px;">+1 AP cap</button>
              </div>
            `;
            document.body.appendChild(modal);
          }
          modal.style.display = 'flex';
          document.getElementById('btn-awaken-hp').onclick = () => {
            PREVIEW_ROLE.maxHp += 2;
            PREVIEW_ROLE.hp = PREVIEW_ROLE.maxHp;
            renderPreviewRole && renderPreviewRole();
            closeAwakeningModal();
            finishEventAndNext();
          };
          document.getElementById('btn-awaken-bag').onclick = () => {
            window.PREVIEW_ITEM_LIMIT = (window.PREVIEW_ITEM_LIMIT || 1) + 1;
            notifyPlayer('Item capacity increased to ' + window.PREVIEW_ITEM_LIMIT + '.');
            closeAwakeningModal();
            finishEventAndNext();
          };
          document.getElementById('btn-awaken-ap').onclick = () => {
            PREVIEW_ROLE.ap += 1;
            renderPreviewRole && renderPreviewRole();
            closeAwakeningModal();
            finishEventAndNext();
          };
          function closeAwakeningModal() { modal.style.display = 'none'; }
        }

        // Quartermaster Tent弹窗
        function showQuartermasterModal(card) {
          let modal = document.getElementById('quartermaster-modal');
          if (!modal) {
            modal = document.createElement('div');
            modal.id = 'quartermaster-modal';
            modal.className = 'adventure-modal';
            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-modal', 'true');
            modal.style = 'position:fixed;left:0;top:0;width:100vw;height:100vh;z-index:5000;background:rgba(24,28,42,0.96);display:flex;align-items:center;justify-content:center;';
            modal.innerHTML = `
              <div style="background:#23263a;padding:48px 64px 36px 64px;border-radius:24px;min-width:420px;max-width:90vw;box-shadow:0 8px 48px #000b;text-align:center;">
                <div style="font-size:2em;font-weight:bold;margin-bottom:18px;">Quartermaster Tent</div>
                <div id="quartermaster-items" style="display:flex;gap:32px;justify-content:center;margin-bottom:24px;"></div>
                <div style="margin-bottom:18px;font-size:1.1em;color:#8cf;">Each item costs 5 gold. Your item slots are limited.</div>
                <button id="btn-leave-quartermaster" style="padding:10px 32px;font-size:1.1em;background:#888;color:#fff;border:none;border-radius:10px;margin-right:32px;">Leave</button>
                <button id="btn-close-quartermaster" style="padding:10px 32px;font-size:1.1em;background:#4af;color:#fff;border:none;border-radius:10px;">Close</button>
              </div>
            `;
            document.body.appendChild(modal);
          }
          if (!card.quartermasterItems) {
            card.quartermasterItems = [];
            const itemKeys = Object.keys(itemDefinitions || {}).filter(key => key === 'timeHourglass');
            while (card.quartermasterItems.length < 3 && itemKeys.length > 0) {
              const idx = Math.floor(Math.random() * itemKeys.length);
              const key = itemKeys.splice(idx, 1)[0];
              if (!card.quartermasterItems.includes(key)) card.quartermasterItems.push(key);
            }
          }
          function renderQuartermasterItems() {
            const itemsDiv = modal.querySelector('#quartermaster-items');
            itemsDiv.innerHTML = '';
            card.quartermasterItems.forEach(key => {
              const item = itemDefinitions[key];
              const div = document.createElement('div');
              div.className = 'adventure-card';
              div.innerHTML = `<img src="${item.img}" style="width:110px;height:154px;border-radius:10px;box-shadow:0 4px 16px #0008;background:#222;object-fit:cover;object-position:center;"><div style="margin-top:10px;font-size:1.2em;">${item.name}</div><div style="font-size:1em;color:#ffb400;">Item</div><div style="font-size:1em;color:#ff8;">Cost: 5 gold</div>`;
              div.onclick = () => {
                let items = window.PREVIEW_ITEMS || [];
                let limit = window.PREVIEW_ITEM_LIMIT || 1;
                if ((PREVIEW_ROLE.gold || 0) < 5) {
                  notifyPlayer('Not enough gold.');
                  return;
                }
                if (items.length >= limit) {
                  notifyPlayer('Your inventory is full.');
                  return;
                }
                PREVIEW_ROLE.gold -= 5;
                items.push(key);
                window.PREVIEW_ITEMS = items;
                notifyPlayer('Item received: ' + item.name);
                renderPreviewCardList && renderPreviewCardList();
                renderPreviewRole && renderPreviewRole();
                renderQuartermasterItems();
              };
              itemsDiv.appendChild(div);
            });
          }
          renderQuartermasterItems();
          modal.style.display = 'flex';
          document.getElementById('btn-leave-quartermaster').onclick = () => {
            modal.style.display = 'none';
            finishEventAndNext();
          };
          document.getElementById('btn-close-quartermaster').onclick = () => {
            modal.style.display = 'none';
          };
        }

        // Sage Gift弹窗
        function showGiftModal(card) {
          let modal = document.getElementById('gift-modal');
          if (!modal) {
            modal = document.createElement('div');
            modal.id = 'gift-modal';
            modal.className = 'adventure-modal';
            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-modal', 'true');
            modal.style = 'position:fixed;left:0;top:0;width:100vw;height:100vh;z-index:5000;background:rgba(24,28,42,0.96);display:flex;align-items:center;justify-content:center;';
            modal.innerHTML = `
              <div style="background:#23263a;padding:48px 64px 36px 64px;border-radius:24px;min-width:340px;max-width:90vw;box-shadow:0 8px 48px #000b;text-align:center;">
                <div style="font-size:2em;font-weight:bold;margin-bottom:24px;">Sage Gift</div>
                <img src="${itemDefinitions[card.item]?.img || ''}" style="width:120px;height:168px;border-radius:10px;box-shadow:0 4px 16px #0008;background:#222;object-fit:cover;object-position:center;"><div style="margin:18px 0 8px 0;font-size:1.3em;">${itemDefinitions[card.item]?.name || card.item}</div>
                <div style="margin-bottom:32px;font-size:1.1em;color:#8cf;">Item: ${itemDefinitions[card.item]?.desc || ''}</div>
                <button id="btn-accept-gift" style="padding:12px 36px;font-size:1.1em;background:#4af;color:#fff;border:none;border-radius:10px;margin-right:32px;">Claim</button>
                <button id="btn-decline-gift" style="padding:12px 36px;font-size:1.1em;background:#888;color:#fff;border:none;border-radius:10px;">Skip</button>
              </div>
            `;
            document.body.appendChild(modal);
          }
          modal.style.display = 'flex';
          document.getElementById('btn-accept-gift').onclick = () => {
            let items = window.PREVIEW_ITEMS || [];
            let limit = window.PREVIEW_ITEM_LIMIT || 1;
            if (items.length >= limit) {
              notifyPlayer('Your inventory is full. Free a slot to claim this item.');
              return;
            }
            items.push(card.item);
            window.PREVIEW_ITEMS = items;
            renderPreviewCardList && renderPreviewCardList();
            notifyPlayer('Item received: ' + (itemDefinitions[card.item]?.name || card.item));
            modal.style.display = 'none';
            finishEventAndNext();
          };
          document.getElementById('btn-decline-gift').onclick = () => {
            modal.style.display = 'none';
            finishEventAndNext();
          };
        }

        // 修正handleCrossroadEvent，先删除当前Crossroads卡再洗牌
        function handleCrossroadEvent() {
          // 删除当前Crossroads事件卡
          PREVIEW_EVENTS.splice(selectedEventIdx, 1);
          // 把剩余事件卡放回牌库
          EVENT_DECK.push(...PREVIEW_EVENTS);
          // 清空当前显示的事件卡
          PREVIEW_EVENTS.length = 0;
          // 重新洗牌整个事件牌库
          for (let i = EVENT_DECK.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [EVENT_DECK[i], EVENT_DECK[j]] = [EVENT_DECK[j], EVENT_DECK[i]];
          }
          EVENT_DECK = orderBattleEvents(EVENT_DECK);
          // 重新抽出三张新的事件卡
          for (let i = 0; i < 3 && EVENT_DECK.length > 0; i++) {
            PREVIEW_EVENTS.push(EVENT_DECK.shift());
          }
          selectedEventIdx = 0;
          renderPreviewEvents();
          showPreviewCardDetail(PREVIEW_EVENTS[selectedEventIdx]);
        }

        // 事件完成后移除当前事件卡并补充新事件
        function finishEventAndNext() {
          if (EVENT_DECK.length > 0) {
            PREVIEW_EVENTS.splice(selectedEventIdx, 1, EVENT_DECK.shift());
          } else {
            PREVIEW_EVENTS.splice(selectedEventIdx, 1);
          }
          renderPreviewEvents && renderPreviewEvents();
          showPreviewCardDetail && showPreviewCardDetail(PREVIEW_EVENTS[selectedEventIdx]);
          
          // 新增：如果PREVIEW_EVENTS已空，显示通关界面
          if (PREVIEW_EVENTS.length === 0) {
            showStoryWinModal();
          }
        }

        // 新增通关界面函数
        function showStoryWinModal() {
          window.storyStarted = false;
          window.saveSystem.deleteData('gameProgress');
          updateContinueButton();
          let modal = document.getElementById('story-win-modal');
          if (!modal) {
            modal = document.createElement('div');
            modal.id = 'story-win-modal';
            modal.className = 'adventure-modal';
            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-modal', 'true');
            modal.style = 'position:fixed;left:0;top:0;width:100vw;height:100vh;z-index:9999;background:rgba(24,28,42,0.97);display:flex;align-items:center;justify-content:center;';
            modal.innerHTML = `
              <div style="background:#23263a;padding:56px 80px 48px 80px;border-radius:32px;min-width:420px;max-width:90vw;box-shadow:0 8px 48px #000b;text-align:center;">
                <div style="font-size:2.5em;font-weight:bold;margin-bottom:24px;color:#ffb400;">Adventure complete!</div>
                <div style="font-size:1.3em;color:#fff;margin-bottom:32px;">You completed every adventure event. Thanks for playing!</div>
                <button id="btn-story-win-back" style="padding:16px 48px;font-size:1.2em;background:#4af;color:#fff;border:none;border-radius:12px;">Main Menu</button>
              </div>
            `;
            document.body.appendChild(modal);
          }
          modal.style.display = 'flex';
          document.getElementById('btn-story-win-back').onclick = () => {
            modal.style.display = 'none';
            // 可选：Main Menu逻辑
            if (typeof mainMenu !== 'undefined') mainMenu.style.display = 'flex';
            if (typeof battlePreviewRoot !== 'undefined') battlePreviewRoot.style.display = 'none';
          };
        }

        // 简化getRandomEvent，避免重复定义事件模板
        function getRandomEvent() {
          // 如果EVENT_DECK为空，重新创建事件牌库
          if (EVENT_DECK.length === 0) {
            EVENT_DECK = createEventDeck();
          }
          // 从事件牌库中取一张卡
          return EVENT_DECK.shift();
        }

        // 恢复showEnemyEncounter
        function showEnemyEncounter(eventCard) {
          console.log('[showEnemyEncounter] Showing encounter for event:', eventCard);
          // 优先用事件卡里的enemyName查找敌人，否则随机
          const enemy = ENEMY_POOL.find(e => e.name === eventCard.enemyName) || ENEMY_POOL[Math.floor(Math.random() * ENEMY_POOL.length)];
          console.log('[showEnemyEncounter] Enemy:', enemy);
          let modal = document.getElementById('enemy-encounter-modal');
          if (!modal) {
            modal = document.createElement('div');
            modal.id = 'enemy-encounter-modal';
            modal.className = 'adventure-modal';
            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-modal', 'true');
            modal.style = 'position:fixed;left:0;top:0;width:100vw;height:100vh;z-index:5000;background:rgba(24,28,42,0.96);display:flex;align-items:center;justify-content:center;';
            modal.innerHTML = `
              <div style="background:#23263a;padding:48px 64px 36px 64px;border-radius:24px;min-width:380px;max-width:90vw;box-shadow:0 8px 48px #000b;text-align:center;">
                <div style="font-size:2em;font-weight:bold;margin-bottom:18px;">Enemy Encounter</div>
                <img src="${enemy.portrait || ''}" alt="${enemy.name}" style="width:160px;height:220px;object-fit:cover;border-radius:12px;margin-bottom:12px;background:#222;box-shadow:0 2px 16px #0008;">
                <div style="font-size:1.5em;color:#f66;font-weight:bold;">${enemy.name}</div>
                <div style="margin:12px 0 18px 0;font-size:1.1em;color:#fff;">${enemy.desc}</div>
                <div style="margin-bottom:8px;font-size:1.1em;color:#8cf;">HP: ${enemy.hp} · AP cap: ${enemy.maxAp} · AP per turn: ${enemy.apPerTurn}</div>
                <div style="margin-bottom:18px;font-size:1.1em;color:#8cf;">Deck: ${enemy.deck.map(key => (unitDefinitions[key] || spellDefinitions[key])?.name || key).join(', ')}</div>
                <button id="btn-start-battle" style="padding:12px 48px;font-size:1.2em;background:#4af;color:#fff;border:none;border-radius:10px;">Battle</button>
                <button id="btn-close-enemy-modal" style="padding:12px 48px;font-size:1.2em;background:#888;color:#fff;border:none;border-radius:10px;margin-left:24px;">Close</button>
              </div>
            `;
            document.body.appendChild(modal);
          } else {
            modal.querySelector('div').innerHTML = `
              <div style=\"font-size:2em;font-weight:bold;margin-bottom:18px;\">Enemy Encounter</div>
              <img src=\"${enemy.portrait || ''}\" alt=\"${enemy.name}\" style=\"width:160px;height:220px;object-fit:cover;border-radius:12px;margin-bottom:12px;background:#222;box-shadow:0 2px 16px #0008;\">
              <div style=\"font-size:1.5em;color:#f66;font-weight:bold;\">${enemy.name}</div>
              <div style=\"margin:12px 0 18px 0;font-size:1.1em;color:#fff;\">${enemy.desc}</div>
              <div style=\"margin-bottom:8px;font-size:1.1em;color:#8cf;\">HP: ${enemy.hp} · AP cap: ${enemy.maxAp} · AP per turn: ${enemy.apPerTurn}</div>
              <div style=\"margin-bottom:18px;font-size:1.1em;color:#8cf;\">Deck: ${enemy.deck.map(key => (unitDefinitions[key] || spellDefinitions[key])?.name || key).join(', ')}</div>
              <button id=\"btn-start-battle\" style=\"padding:12px 48px;font-size:1.2em;background:#4af;color:#fff;border:none;border-radius:10px;\">Battle</button>
              <button id=\"btn-close-enemy-modal\" style=\"padding:12px 48px;font-size:1.2em;background:#888;color:#fff;border:none;border-radius:10px;margin-left:24px;\">Close</button>
            `;
            modal.style.display = 'flex';
          }
          document.getElementById('btn-start-battle').onclick = () => {
            console.log('[showEnemyEncounter] Starting battle with:', enemy);
            modal.style.display = 'none';
            startBattleWithEnemy(enemy);
          };
          document.getElementById('btn-close-enemy-modal').onclick = () => {
            modal.style.display = 'none';
          };
        }

        // ================== 剧情/预览模式专用：初始化玩家和AI卡组并进入Battle ==================
        function startBattleWithEnemy(enemy) {
          saveStoryProgress();
          cancelAITurn();
            window.inspectedCard = null;
            window.inspectedUnit = null;
          window.selectedBoss = null;
          gameState.gameOver = false;
          gameState.winner = null;
          gameState.hasRevengeGiant = false;
          gameState.extraTurnPlayer = null;
          gameState.healingUnit = null;
          gameState.erosionTarget = null;
          moving = 0;
          console.log('[startBattleWithEnemy] Starting battle with:', enemy);
          // 剧情/预览模式标记
          window._storyEnemyBattle = true;
          window._storyEnemyInfo = enemy; // 确保胜利时能获取到当前敌人
          console.log('[startBattleWithEnemy] Story battle state:', window._storyEnemyBattle, window._storyEnemyInfo);
          // 1. 重置游戏状态
          gameState.currentPlayer = 1;
          gameState.phase = 'placement';
          gameState.players[0].actionPoints = 2;
          gameState.players[1].actionPoints = 0;
          gameState.players[0].apPerTurn = 2;
          gameState.players[0].maxAp = PREVIEW_ROLE.ap;
          gameState.players[1].apPerTurn = enemy.apPerTurn || 2;
          gameState.players[1].maxAp = enemy.maxAp || 6;
          gameState.players[0].items = [...(window.PREVIEW_ITEMS || [])];
          gameState.players[0].itemLimit = window.PREVIEW_ITEM_LIMIT || 1;
          gameState.players[0].health = PREVIEW_ROLE.hp || 7;
          gameState.players[0].maxHealth = PREVIEW_ROLE.maxHp || 7;
          gameState.players[1].health = enemy.hp || 7;
          gameState.players[1].maxHealth = enemy.hp || 7;
          gameState.players[0].hand = [];
          gameState.players[1].hand = [];
          // 统一卡组初始化：都只用key并洗牌
          const playerDeck = PREVIEW_CARDS.map(card => card.key).filter(Boolean);
          const aiDeck = enemy.deck.map(key => key).filter(Boolean);
          gameState.players[0].deck = playerDeck.sort(() => Math.random() - 0.5);
          gameState.players[1].deck = aiDeck.sort(() => Math.random() - 0.5);
          gameState.players[0].graveyard = [];
          gameState.players[1].graveyard = [];
          gameState.players[0].shield = 0;
          gameState.players[1].shield = 0;
          gameState.board = Array(5).fill().map(() => Array(7).fill(null));
          gameState.units = [];
          gameState.frozenUnits = [];
          gameState.turnCount = 0;
          gameState.erosionMode = false;

          // 2. AI设置
          gameState.drawCount = 0;
          gameState.drawCost = 1;
          gameState.selectedCard = null;
          gameState.selectedUnit = null;
          gameState.selectedSpell = null;
          gameState.aiPlayers = [false, true];

          // 3. 抽三张手牌
          for (let i = 0; i < 3; i++) {
            drawCard(1);
            drawCard(2);
          }

          // 4. 切换界面
          document.querySelector('.game-container').style.display = '';
          if (typeof battlePreviewRoot !== 'undefined') battlePreviewRoot.style.display = 'none';

          // 5. 其余UI和状态
          createBoard && createBoard();
          updateUI && updateUI();
          updateAIButtonStates && updateAIButtonStates();

          // 6. AI回合
          if (gameState.aiPlayers[gameState.currentPlayer - 1]) {
            const delay = typeof getAIDelay === 'function' ? getAIDelay() : 500;
            setTimeout(() => {
              aiTurn && aiTurn();
            }, delay);
          }
          // 起手牌已经从牌库移出，不能再次填回整副卡组。
          console.log('[startBattleWithEnemy-END] Player deck:', gameState.players[0].deck);
          // 8. 强制设置右上角玩家2名称为敌人名+等级
          const player2Panel = document.querySelector('#player2-panel .player-header h2');
          if (player2Panel && enemy) {
            player2Panel.textContent = `${enemy.name}`;
          }
        }

        // ================== 恢复Shop系统 ==================
        function useTimeHourglass() {
          const player = gameState.players[0];
          if (!window._storyEnemyBattle || gameState.currentPlayer !== 1 || gameState.aiPlayers[0] ||
              gameState.gameOver || isAnimating || gameState.extraTurnPlayer === 1) return;
          const index = player.items.indexOf('timeHourglass');
          if (index < 0) return;
          player.items.splice(index, 1);
          window.PREVIEW_ITEMS = [...player.items];
          gameState.extraTurnPlayer = 1;
          updateUI();
        }

        // 修正：每个事件卡只在第一次进入时生成物品列表
        function showShopModal(card) {
          let modal = document.getElementById('shop-modal');
          if (!modal) {
            modal = document.createElement('div');
            modal.id = 'shop-modal';
            modal.className = 'adventure-modal';
            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-modal', 'true');
            modal.style = 'position:fixed;left:0;top:0;width:100vw;height:100vh;z-index:5000;background:rgba(24,28,42,0.96);display:flex;align-items:center;justify-content:center;';
            modal.innerHTML = `
              <div style="background:#23263a;padding:48px 64px 36px 64px;border-radius:24px;min-width:420px;max-width:90vw;box-shadow:0 8px 48px #000b;text-align:center;">
                <div style="font-size:2em;font-weight:bold;margin-bottom:18px;">Shop</div>
                <div id="shop-items" style="display:flex;gap:32px;justify-content:center;margin-bottom:24px;"></div>
                <button id="btn-leave-shop" style="padding:10px 32px;font-size:1.1em;background:#888;color:#fff;border:none;border-radius:10px;margin-right:32px;">Leave Shop</button>
                <button id="btn-close-shop" style="padding:10px 32px;font-size:1.1em;background:#4af;color:#fff;border:none;border-radius:10px;">Close</button>
              </div>
            `;
            document.body.appendChild(modal);
          }
          if (!card.shopItems) {
            card.shopItems = [];
            // 只允许部分卡牌/Spell出现在Shop
            const allowedShopKeys = [
              // Unit
              'shieldWarrior','archer','swordsman','shadowAssassin','shadowMage','wolf','minotaur',
              // Spell
              'healPack','shieldCard','drawCard','resetCard'
            ];
            const allKeys = allowedShopKeys.filter(key => (unitDefinitions[key] || spellDefinitions[key]));
            while (card.shopItems.length < 3 && allKeys.length > 0) {
              const idx = Math.floor(Math.random() * allKeys.length);
              const key = allKeys.splice(idx, 1)[0];
              if (!card.shopItems.includes(key)) card.shopItems.push(key);
            }
            // 记录价格（Unit和Spell均为15-30随机）
            card.shopItemPrices = {};
            card.shopItems.forEach(key => {
              card.shopItemPrices[key] = Math.floor(Math.random() * 16) + 15; // 15~30
            });
          }
          function renderShopItems() {
            const shopItemsDiv = modal.querySelector('#shop-items');
            shopItemsDiv.innerHTML = '';
            card.shopItems.forEach((key, i) => {
              let item, type, price;
              if (unitDefinitions[key]) {
                item = unitDefinitions[key];
                type = 'Unit';
                price = card.shopItemPrices[key];
              } else if (spellDefinitions[key]) {
                item = spellDefinitions[key];
                type = 'Spell';
                price = card.shopItemPrices[key];
              }
              if (!item) return;
              const div = document.createElement('div');
              div.className = 'adventure-card';
              div.innerHTML = `<img src="${item.img}" style="width:110px;height:154px;border-radius:10px;box-shadow:0 4px 16px #0008;background:#222;object-fit:cover;object-position:center;"><div style="margin-top:10px;font-size:1.2em;">${item.name}</div><div style="font-size:1em;color:#8cf;">${type}</div><div style="font-size:1em;color:#ff8;">Cost: ${price} gold</div>`;
              div.onclick = () => {
                if ((PREVIEW_ROLE.gold || 0) < price) {
                  notifyPlayer('Not enough gold.');
                  return;
                }
                PREVIEW_ROLE.gold -= price;
                notifyPlayer('Received: ' + item.name);
                // 购买后加入牌库（和Treasure一致）
                const cardObj = unitDefinitions[key] ? { ...unitDefinitions[key], key } : spellDefinitions[key] ? { ...spellDefinitions[key], key } : null;
                if (cardObj) {
                  PREVIEW_CARDS.push(cardObj);
                }
                // 购买后移除该商品
                card.shopItems.splice(i, 1);
                renderPreviewCardList && renderPreviewCardList();
                renderPreviewRole && renderPreviewRole();
                renderShopItems();
              };
              shopItemsDiv.appendChild(div);
            });
          }
          renderShopItems();
          modal.style.display = 'flex';
          document.getElementById('btn-leave-shop').onclick = () => {
            modal.style.display = 'none';
            finishEventAndNext();
          };
          document.getElementById('btn-close-shop').onclick = () => {
            modal.style.display = 'none';
          };
        }
        // ================== Quartermaster Tent ==================
        function showQuartermasterModal(card) {
          let modal = document.getElementById('quartermaster-modal');
          if (!modal) {
            modal = document.createElement('div');
            modal.id = 'quartermaster-modal';
            modal.className = 'adventure-modal';
            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-modal', 'true');
            modal.style = 'position:fixed;left:0;top:0;width:100vw;height:100vh;z-index:5000;background:rgba(24,28,42,0.96);display:flex;align-items:center;justify-content:center;';
            modal.innerHTML = `
              <div style="background:#23263a;padding:48px 64px 36px 64px;border-radius:24px;min-width:420px;max-width:90vw;box-shadow:0 8px 48px #000b;text-align:center;">
                <div style="font-size:2em;font-weight:bold;margin-bottom:18px;">Quartermaster Tent</div>
                <div id="quartermaster-items" style="display:flex;gap:32px;justify-content:center;margin-bottom:24px;"></div>
                <div style="margin-bottom:18px;font-size:1.1em;color:#8cf;">Each item costs 5 gold. Your item slots are limited.</div>
                <button id="btn-leave-quartermaster" style="padding:10px 32px;font-size:1.1em;background:#888;color:#fff;border:none;border-radius:10px;margin-right:32px;">Leave</button>
                <button id="btn-close-quartermaster" style="padding:10px 32px;font-size:1.1em;background:#4af;color:#fff;border:none;border-radius:10px;">Close</button>
              </div>
            `;
            document.body.appendChild(modal);
          }
          if (!card.quartermasterItems) {
            card.quartermasterItems = [];
            const itemKeys = Object.keys(itemDefinitions || {}).filter(key => key === 'timeHourglass');
            while (card.quartermasterItems.length < 3 && itemKeys.length > 0) {
              const idx = Math.floor(Math.random() * itemKeys.length);
              const key = itemKeys.splice(idx, 1)[0];
              if (!card.quartermasterItems.includes(key)) card.quartermasterItems.push(key);
            }
          }
          function renderQuartermasterItems() {
            const itemsDiv = modal.querySelector('#quartermaster-items');
            itemsDiv.innerHTML = '';
            card.quartermasterItems.forEach(key => {
              const item = itemDefinitions[key];
              const div = document.createElement('div');
              div.className = 'adventure-card';
              div.innerHTML = `<img src="${item.img}" style="width:110px;height:154px;border-radius:10px;box-shadow:0 4px 16px #0008;background:#222;object-fit:cover;object-position:center;"><div style="margin-top:10px;font-size:1.2em;">${item.name}</div><div style="font-size:1em;color:#ffb400;">Item</div><div style="font-size:1em;color:#ff8;">Cost: 5 gold</div>`;
              div.onclick = () => {
                let items = window.PREVIEW_ITEMS || [];
                let limit = window.PREVIEW_ITEM_LIMIT || 1;
                if ((PREVIEW_ROLE.gold || 0) < 5) {
                  notifyPlayer('Not enough gold.');
                  return;
                }
                if (items.length >= limit) {
                  notifyPlayer('Your inventory is full.');
                  return;
                }
                PREVIEW_ROLE.gold -= 5;
                items.push(key);
                window.PREVIEW_ITEMS = items;
                notifyPlayer('Item received: ' + item.name);
                renderPreviewCardList && renderPreviewCardList();
                renderPreviewRole && renderPreviewRole();
                renderQuartermasterItems();
              };
              itemsDiv.appendChild(div);
            });
          }
          renderQuartermasterItems();
          modal.style.display = 'flex';
          document.getElementById('btn-leave-quartermaster').onclick = () => {
            modal.style.display = 'none';
            finishEventAndNext();
          };
          document.getElementById('btn-close-quartermaster').onclick = () => {
            modal.style.display = 'none';
          };
        }

        // Spring事件处理
        function showSpringModal(card) {
          let modal = document.getElementById('spring-modal');
          if (!modal) {
            modal = document.createElement('div');
            modal.id = 'spring-modal';
            modal.className = 'adventure-modal';
            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-modal', 'true');
            modal.style = 'position:fixed;left:0;top:0;width:100vw;height:100vh;z-index:5000;background:rgba(24,28,42,0.96);display:flex;align-items:center;justify-content:center;';
            modal.innerHTML = `
              <div style="background:#23263a;padding:48px 64px 36px 64px;border-radius:24px;min-width:340px;max-width:90vw;box-shadow:0 8px 48px #000b;text-align:center;">
                <div style="font-size:2em;font-weight:bold;margin-bottom:24px;">Spring</div>
                <img src="${card.img}" style="width:120px;height:168px;border-radius:10px;box-shadow:0 4px 16px #0008;background:#222;object-fit:cover;object-position:center;"><div style="margin:18px 0 8px 0;font-size:1.3em;">${card.name}</div>
                <div style="margin-bottom:32px;font-size:1.1em;color:#8cf;">Restore 30% of your maximum base HP, rounded up?</div>
                <button id="btn-use-spring" style="padding:12px 36px;font-size:1.1em;background:#4af;color:#fff;border:none;border-radius:10px;margin-right:32px;">Use</button>
                <button id="btn-exit-spring" style="padding:12px 36px;font-size:1.1em;background:#888;color:#fff;border:none;border-radius:10px;">Back</button>
              </div>
            `;
            document.body.appendChild(modal);
          } else {
            modal.querySelector('img').src = card.img;
            modal.querySelector('img').alt = card.name;
            modal.style.display = 'flex';
          }
          document.getElementById('btn-use-spring').onclick = () => {
            modal.style.display = 'none';
            const healAmount = Math.ceil(PREVIEW_ROLE.maxHp * 0.3);
            PREVIEW_ROLE.hp = Math.min(PREVIEW_ROLE.hp + healAmount, PREVIEW_ROLE.maxHp);
            renderPreviewRole();
            // 删除当前Spring事件，补充新事件
            if (EVENT_DECK.length > 0) {
              PREVIEW_EVENTS.splice(selectedEventIdx, 1, EVENT_DECK.shift());
            } else {
              PREVIEW_EVENTS.splice(selectedEventIdx, 1);
            }
            renderPreviewEvents && renderPreviewEvents();
            showPreviewCardDetail && showPreviewCardDetail(PREVIEW_EVENTS[selectedEventIdx]);
          };
          document.getElementById('btn-exit-spring').onclick = () => {
            modal.style.display = 'none';
          };
        }

        // Tavern事件处理
        function showTavernModal(card) {
          let modal = document.getElementById('tavern-modal');
          if (!modal) {
            modal = document.createElement('div');
            modal.id = 'tavern-modal';
            modal.className = 'adventure-modal';
            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-modal', 'true');
            modal.style = 'position:fixed;left:0;top:0;width:100vw;height:100vh;z-index:5000;background:rgba(24,28,42,0.96);display:flex;align-items:center;justify-content:center;';
            modal.innerHTML = `
              <div style="background:#23263a;padding:48px 64px 36px 64px;border-radius:24px;min-width:420px;max-width:90vw;box-shadow:0 8px 48px #000b;text-align:center;">
                <div style="font-size:2em;font-weight:bold;margin-bottom:18px;">Tavern</div>
                <div id="tavern-cards" style="display:flex;flex-wrap:wrap;gap:16px;justify-content:center;margin-bottom:24px;"></div>
                <div style="margin-bottom:18px;font-size:1.1em;color:#8cf;">Remove a card from your deck for 1 gold.</div>
                <button id="btn-leave-tavern" style="padding:10px 32px;font-size:1.1em;background:#888;color:#fff;border:none;border-radius:10px;margin-right:32px;">Leave Tavern</button>
                <button id="btn-close-tavern" style="padding:10px 32px;font-size:1.1em;background:#4af;color:#fff;border:none;border-radius:10px;">Close</button>
              </div>
            `;
            document.body.appendChild(modal);
          }
          function renderTavernCards() {
            const tavernCardsDiv = modal.querySelector('#tavern-cards');
            tavernCardsDiv.innerHTML = '';
            PREVIEW_CARDS.forEach((card, index) => {
              const div = document.createElement('div');
              div.className = 'adventure-card';
              div.innerHTML = `<img src="${(unitDefinitions[card.key] || spellDefinitions[card.key] || card).img}" style="width:110px;height:154px;border-radius:10px;box-shadow:0 4px 16px #0008;background:#222;object-fit:cover;object-position:center;"><div style="margin-top:10px;font-size:1.2em;">${card.name}</div><div style="font-size:1em;color:#8cf;">${card.type}</div><button id="btn-discard-${index}" style="padding:6px 12px;font-size:1em;background:#f66;color:#fff;border:none;border-radius:8px;margin-top:8px;">Remove · 1 gold</button>`;
              div.title = card.desc;
              tavernCardsDiv.appendChild(div);
              document.getElementById(`btn-discard-${index}`).onclick = () => {
                if ((PREVIEW_ROLE.gold || 0) < 1) {
                  notifyPlayer('Not enough gold.');
                  return;
                }
                PREVIEW_ROLE.gold -= 1;
                PREVIEW_CARDS.splice(index, 1);
                renderTavernCards();
                renderPreviewCardList && renderPreviewCardList();
                renderPreviewRole && renderPreviewRole();
              };
            });
          }
          renderTavernCards();
          modal.style.display = 'flex';
          document.getElementById('btn-leave-tavern').onclick = () => {
            modal.style.display = 'none';
            // Leave Tavern时，删除当前Tavern事件卡并补充新事件
            if (PREVIEW_EVENTS[selectedEventIdx] && PREVIEW_EVENTS[selectedEventIdx].type === 'Tavern') {
              if (EVENT_DECK.length > 0) {
                PREVIEW_EVENTS.splice(selectedEventIdx, 1, EVENT_DECK.shift());
              } else {
                PREVIEW_EVENTS.splice(selectedEventIdx, 1);
              }
              renderPreviewEvents && renderPreviewEvents();
              showPreviewCardDetail && showPreviewCardDetail(PREVIEW_EVENTS[selectedEventIdx]);
            }
          };
          document.getElementById('btn-close-tavern').onclick = () => {
            modal.style.display = 'none';
          };
        }
