// 游戏状态

        const gameState = {
            currentPlayer: 1,
            phase: 'placement', // 'placement' or 'battle'
            actionPoints: 6,
            drawCost: 1,
            drawCount: 0,
            selectedCard: null,
            selectedUnit: null,
            selectedSpell: null,
            isAIMode: false, // AI模式标志
            players: [
                {
                    id: 1,
                    health: 7,
                    maxHealth: 7,
                    hand: [],
                    deck: ['shieldWarrior', 'shieldWarrior', 'swordsman', 'swordsman'],
                    graveyard: [],
                    basePosition: { row: 2, col: 0 }, // 第3行第1列 (0-based)
                    shield: 0,
                    items: [], // 道具栏，初始为空
                    itemLimit: 1, // 道具栏上限，初始为1
                    apPerTurn: 2 // 每回合恢复AP
                },
                {
                    id: 2,
                    health: 7,
                    maxHealth: 7,
                    hand: [],
                    deck: ['shieldWarrior', 'shieldWarrior', 'swordsman', 'swordsman'],
                    graveyard: [],
                    basePosition: { row: 2, col: 6 }, // 第3行第7列 (0-based)
                    shield: 0,
                    items: [], // 道具栏，初始为空
                    itemLimit: 1, // 道具栏上限，初始为1
                    apPerTurn: 2 // 每回合恢复AP
                }
            ],
            board: Array(5).fill().map(() => Array(7).fill(null)),
            units: [],
            frozenUnits: [], // 被冰冻的单位
            turnCount: 0,
            erosionMode: false
        };

let moving = 0;