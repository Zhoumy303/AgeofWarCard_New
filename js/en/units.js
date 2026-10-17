// 单位定义
        const unitDefinitions = {
            // 人族
            shieldWarrior: {
                name: "Shield Warrior",
                type: "human",
                health: 5,
                attackRange: 1,
                damage: 0,
                cost: 1,
                skills: ["Trait: Defense — If this unit did not move or attack on its previous turn, reduce each hit by 2. Disabled while frozen."],
                desc: "A defensive unit that holds the front line.",
                img: 'lib/img/cards-en/shield-warrior.png',
                handImg: 'lib/img/units/盾兵.webp'
            },
            archer: {
                name: "Archer",
                type: "human",
                health: 3,
                attackRange: 3,
                damage: 2,
                cost: 3,
                skills: ["Trait: Precise Shot — Each attack has a 1 in 6 chance to deal double damage."],
                desc: "A ranged unit with a chance to deal double damage.",
                img: 'lib/img/cards-en/archer.png',
                handImg: 'lib/img/units/弓箭手.webp'
            },
            swordsman: {
                name: "Swordsman",
                type: "human",
                health: 4,
                attackRange: 1,
                damage: 3,
                cost: 2,
                skills: ["Trait: Splash — Deal 1 damage to other enemies orthogonally adjacent to the target."],
                desc: "A melee unit whose attacks also damage nearby enemies.",
                img: 'lib/img/cards-en/swordsman.png',
                handImg: 'lib/img/units/刀兵.webp'
            },
            
            // 暗影族
            shadowAssassin: {
                name: "Shadow Assassin",
                type: "shadow",
                health: 3,
                attackRange: 1,
                damage: 2,
                cost: 1,
                skills: ["Trait: Assassination — Can attack after moving.", "Trait: Agility — Can move backward."],
                desc: "A mobile fighter that can move and attack in one turn.",
                img: 'lib/img/cards-en/shadow-assassin.png',
                handImg: 'lib/img/units/暗影刺客.webp'
            },
            shadowMage: {
                name: "Shadow Mage",
                type: "shadow",
                health: 4,
                attackRange: 2,
                damage: 2,
                cost: 2,
                skills: ["Skill: Shadow Movement — Swap places with an ally within 3 spaces. Uses this unit's movement."],
                desc: "A support unit that repositions allies.",
                img: 'lib/img/cards-en/shadow-mage.png',
                handImg: 'lib/img/units/暗影法师.webp'
            },
            shadowLord: {
                name: "Shadow Lord",
                type: "shadow",
                health: 6,
                attackRange: 1,
                damage: 4,
                cost: 3,
                skills: ["Skill: Erosion — Target an adjacent enemy this unit could kill, then sacrifice another ally to convert the target at full HP. Replaces the attack."],
                desc: "A control unit that sacrifices allies to capture weakened enemies.",
                img: 'lib/img/cards-en/shadow-lord-corrected.png',
                handImg: 'lib/img/units/暗影领主.webp'
            },
            
            // 兽灵魔族
            wolf: {
                name: "Raging Wolf",
                type: "beast",
                health: 4,
                attackRange: 1,
                damage: 2,
                cost: 2,
                skills: ["Trait: Wild Charge — If the space behind the target is empty and is not a base, push it back 1 space and deal 1 extra damage."],
                desc: "A charging beast that pushes enemies back.",
                img: 'lib/img/cards-en/wolf.png',
                handImg: 'lib/img/units/狂暴狼.webp'
            },
            minotaur: {
                name: "Minotaur",
                type: "beast",
                health: 7,
                attackRange: 1,
                damage: 3,
                cost: 2,
                skills: ["Trait: Heavy — Can only move forward.", "Skill: Wild Blessing — Other orthogonally adjacent allies gain +1 attack this turn. Replaces this unit's attack."],
                desc: "A tough frontline unit that strengthens nearby allies.",
                img: 'lib/img/cards-en/minotaur.png',
                handImg: 'lib/img/units/牛头战士.webp'
            },
            iceDragon: {
                name: "Frost Dragon",
                type: "beast",
                health: 6,
                attackRange: 2,
                damage: 2,
                cost: 3,
                skills: ["Trait: Frost — After an attack, automatically spend 1 AP if available to freeze a surviving unit target for its next turn."],
                 freezeDuration: 2,
                 desc: "A ranged beast that damages and freezes enemies.",
                 img: 'lib/img/cards-en/ice-dragon.png',
                 handImg: 'lib/img/units/冰霜龙.webp'
            },
            // 钢铁教父反攻单位
            techFatherRevenge: {
                name: "Revenge Colossus",
                type: "human",
                health: 15,
                attackRange: 2,
                damage: 100,
                cost: 0,
                skills: ["Trait: Counterattack — Appears when the Iron Godfather's base is destroyed. Has extremely high attack."],
                desc: "The Iron Godfather's final defense after the base falls.",
                img: 'lib/img/cards-en/revenge-colossus.png',
                handImg: 'lib/img/card-art-en/revenge-colossus.png'
            },
            // 嗜血蝙蝠
            beastBat: {
                name: "Blood Bat",
                type: "beast",
                health: 3,
                attackRange: 1,
                damage: 1,
                cost: 1,
                skills: ["Trait: Blood Feast — On attack, gain 1 maximum HP and heal to full."],
                desc: "A beast that grows stronger and heals with every attack.",
                img: 'lib/img/cards-en/blood-bat.png',
                handImg: 'lib/img/card-art-en/blood-bat.png'
            },
            // 相位兽
            phaseBeast: {
                name: "Phase Beast",
                type: "shadow",
                health: 4,
                attackRange: 1,
                damage: 2,
                cost: 2,
                skills: ["Trait: Nether Step — Moves diagonally, including backward.", "Trait: Phase Armor — Halve incoming damage, rounding up."],
                desc: "A shadow creature with diagonal movement and damage resistance.",
                img: 'lib/img/cards-en/phase-beast.png',
                handImg: 'lib/img/card-art-en/phase-beast.png'
            },
            // 圣光牧师
            lightPriest: {
                name: "Light Priest",
                type: "human",
                health: 3,
                attackRange: 2,
                damage: 1,
                cost: 2,
                skills: ["Skill: Heal — Restore 2 HP to another ally within attack range. Replaces this unit's attack."],
                desc: "A human support unit that heals allies from a distance.",
                img: 'lib/img/cards-en/light-priest.png',
                handImg: 'lib/img/card-art-en/light-priest.png'
            },
            skeleton: {
                name: "Skeleton",
                type: "undead",
                health: 1,
                attackRange: 1,
                damage: 1,
                cost: 0,
                skills: [],
                desc: "An undead soldier raised by Necromancy.",
                img: 'lib/img/cards-en/skeleton.png',
                handImg: 'lib/img/card-art-en/skeleton.png'
            }
        };
        
        // 法术卡定义
        const spellDefinitions = {
            healPack: {
                name: "Healing Kit",
                type: "spell",
                cost: 1,
                effect: "Restore up to 3 HP to an injured ally. Cannot target bases.",
                desc: "Heal an injured ally.",
                img: 'lib/img/cards-en/healing-kit.png',
                handImg: 'lib/img/spells/医疗包.webp'
            },
            shieldCard: {
                name: "Shield",
                type: "spell",
                cost: 2,
                effect: "Give an unshielded ally 1 shield, reducing each hit by 1 while not frozen. Cannot target bases.",
                desc: "Protect an ally from incoming damage.",
                img: 'lib/img/cards-en/shield.png',
                handImg: 'lib/img/spells/护盾卡.webp'
            },
            drawCard: {
                name: "Reinforcements",
                type: "spell",
                cost: 2,
                effect: "Draw up to 3 cards. Maximum hand size: 7.",
                desc: "Add cards to your hand.",
                img: 'lib/img/cards-en/reinforcements.png',
                handImg: 'lib/img/spells/抽卡牌.webp'
            },
            resetCard: {
                name: "Recall",
                type: "spell",
                cost: 1,
                effect: "Return an allied unit to your hand and reset its stats and status.",
                desc: "Recall an ally for later deployment.",
                img: 'lib/img/cards-en/recall.png',
                handImg: 'lib/img/spells/重置卡.webp'
            },
            frostNova: {
                name: "Frost Nova",
                type: "spell",
                cost: 3,
                effect: "Freeze all enemy units for their next 3 turns. Enemy-exclusive card.",
                desc: "Freeze the opposing army.",
                img: 'lib/img/cards-en/frost-nova.png',
                handImg: 'lib/img/card-art-en/frost-nova.png'
            },
            shadowCorrosion: {
                name: "Shadow Corrosion",
                type: "spell",
                cost: 1,
                effect: "Increase the cost of a random card in the opponent's hand by 1.",
                desc: "Make a random enemy card more expensive.",
                img: 'lib/img/cards-en/shadow-corrosion.png',
                handImg: 'lib/img/card-art-en/shadow-corrosion.png'
            },
            necromancy: {
                name: "Necromancy",
                type: "spell",
                cost: 2,
                effect: "Deal 1 damage to every enemy unit. Non-skeleton units killed this way become allied Skeletons.",
                desc: "Damage all enemies and raise the fallen as allied Skeletons.",
                img: 'lib/img/cards-en/necromancy.png',
                handImg: 'lib/img/card-art-en/necromancy.png'
            }
        };
        
        // 卡牌池
        const cardPool = [
            'shieldWarrior', 'shieldWarrior', 'shieldWarrior', 'shieldWarrior',
            'archer', 'archer', 'archer', 'archer',
            'lightPriest', 'lightPriest', 'lightPriest', 'lightPriest',
            'swordsman', 'swordsman', 'swordsman', 'swordsman',
            'shadowAssassin', 'shadowAssassin', 'shadowAssassin', 'shadowAssassin',
            'shadowMage', 'shadowMage', 'shadowMage', 'shadowMage',
            'shadowLord', 'shadowLord',
            'phaseBeast', 'phaseBeast',
            'wolf', 'wolf', 'wolf', 'wolf',
            'minotaur', 'minotaur', 'minotaur', 'minotaur',
            'iceDragon', 'iceDragon',
            'beastBat', 'beastBat', 'beastBat',
            'healPack', 'healPack', 'healPack',
            'shieldCard', 'shieldCard',
            'drawCard', 'drawCard',
            'resetCard', 'resetCard'
        ];

// 敌人库定义
const ENEMY_POOL = [
  {
    name: "Rustblade Bandits Lv1",
    exp: 1,   // 经验
    gold: 4,  // 金币
    desc: "A ragged band of brigands. Their weapons are rusty, but they have strength in numbers.",
    hp: 6,
    maxAp: 4,
    apPerTurn: 2,
    deck: ['swordsman','swordsman','shadowAssassin','wolf'],
    portrait: 'lib/img/enemies/rusty_bandits.webp'
  },
  {
    name: "Shadow Scouts Lv1",
    exp: 1,
    gold: 3,
    desc: "Elusive assassins who prey on isolated targets.",
    hp: 5,
    maxAp: 3,
    apPerTurn: 2,
    deck: ['shadowAssassin','shadowAssassin','shadowAssassin','shadowAssassin','shadowMage'],
    portrait: 'lib/img/enemies/shadow_scout.webp'
  },
  {
    name: "Beast Charge Lv1",
    exp: 1,
    gold: 3,
    desc: "A fast-moving pack of beasts ready to charge.",
    hp: 8,
    maxAp: 5,
    apPerTurn: 2,
    deck: ['minotaur','minotaur','wolf','wolf','healPack','healPack'],
    portrait: 'lib/img/enemies/beast_charge.webp'
  },
  {
    name: "Blood Bat Swarm Lv1",
    exp: 1,
    gold: 4,
    desc: "Ravenous bats circle in the dark, waiting for an opening.",
    hp: 5,
    maxAp: 4,
    apPerTurn: 2,
    deck: ['beastBat','beastBat','beastBat','beastBat','beastBat'],
    portrait: 'lib/img/enemies/bloodthirsty_bats.webp'
  },
  {
    name: "Blood Frenzy Lv3",
    exp: 6,
    gold: 20,
    desc: "These swarms turn the sky red. Their shared bloodlust strengthens the entire flock.",
    hp: 0,
    maxAp: 6,
    apPerTurn: 3,
    deck: ['beastBat','beastBat','beastBat','beastBat','wolf','shieldCard'],
    portrait: 'lib/img/enemies/bloodthirsty_frenzy.webp'
  },
  {
    name: "Shadow Hunters Lv2",
    exp: 3,
    gold: 7,
    desc: "Elite assassins mark their prey and pursue it relentlessly.",
    hp: 8,
    maxAp: 6,
    apPerTurn: 3,
    deck: ['shadowAssassin','shadowAssassin','shadowMage','shadowLord','phaseBeast','drawCard'],
    portrait: 'lib/img/enemies/shadow_hunters.webp'
  },
  {
    name: "Ironwall Squad Lv2",
    exp: 3,
    gold: 8,
    desc: "Armored infantry and archers fight as hammer and anvil, holding an unbroken formation.",
    hp: 9,
    maxAp: 6,
    apPerTurn: 3,
    deck: ['shieldWarrior','shieldWarrior','archer','archer','shieldCard'],
    portrait: 'lib/img/enemies/iron_wall_squad.webp'
  },
  {
    name: "Frost Watchers Lv2",
    exp: 3,
    gold: 10,
    desc: "Frost mages claim the battlefield, freezing anyone who ventures too close.",
    hp: 8,
    maxAp: 6,
    apPerTurn: 3,
    deck: ['iceDragon','iceDragon','lightPriest','lightPriest','frostNova','frostNova'],
    portrait: 'lib/img/enemies/frost_watchers.webp'
  },
  {
    name: "Shadow Hexers Lv3",
    exp: 6,
    gold: 17,
    desc: "Masters of corrosive magic. The longer you delay, the more expensive your choices become.",
    hp: 10,
    maxAp: 6,
    apPerTurn: 3,
    deck: ['shadowCorrosion','shadowCorrosion','phaseBeast','phaseBeast','shadowLord','shadowMage','shadowMage','shadowMage'],
    portrait: 'lib/img/enemies/shadow_curse.webp'
  },
  {
    name: "Heirs of the Dead Lv4",
    exp: 20,
    gold: 43,
    desc: "These warriors see death as transformation. Every fallen ally strengthens the survivors.",
    hp: 12,
    maxAp: 6,
    apPerTurn: 3,
    deck: ['beastBat','beastBat','beastBat','shadowAssassin','shadowAssassin','archer','shadowAssassin'],
    portrait: 'lib/img/enemies/scion_of_the_dead.webp'
  },
  {
    name: "Necromancer Lv3",
    exp: 6,
    gold: 22,
    desc: "Death is only the beginning. Fallen warriors join a growing undead army.",
    hp: 7,
    maxAp: 6,
    apPerTurn: 3,
    deck: ['shadowAssassin','shadowAssassin','minotaur','minotaur','swordsman','swordsman','necromancy'],
    portrait: 'lib/img/enemies/necromancer.webp'
  }
];

// 道具定义
const itemDefinitions = {
  luckyCoin: {
    name: "Lucky Coin",
    type: "item",
    desc: "A keepsake said to bring good fortune. It has no gameplay effect yet.",
    img: 'lib/img/cards-en/lucky-coin.png'
  },
  timeHourglass: {
    name: "Time Hourglass",
    type: "item",
    desc: "Use to take an extra turn.",
    img: 'lib/img/cards-en/time-hourglass.png'
  }
};
