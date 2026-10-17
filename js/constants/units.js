// 单位定义
        const unitDefinitions = {
            // 人族
            shieldWarrior: {
                name: "盾兵",
                type: "human",
                health: 5,
                attackRange: 1,
                damage: 0,
                cost: 1,
                skills: ["特性-防御: 停止行动一回合后减免每次攻击的2点伤害"],
                desc: "防御型单位，能吸收伤害。",
                img: 'lib/img/units/盾兵.webp'
            },
            archer: {
                name: "弓箭手",
                type: "human",
                health: 3,
                attackRange: 3,
                damage: 2,
                cost: 3,
                skills: ["特性-精准射击: 攻击1/6概率造成2倍伤害"],
                desc: "远程攻击单位，攻击力较低但有几率造成双倍伤害。",
                img: 'lib/img/units/弓箭手.webp'
            },
            swordsman: {
                name: "刀兵",
                type: "human",
                health: 4,
                attackRange: 1,
                damage: 3,
                cost: 2,
                skills: ["特性-溅射: 对攻击目标1范围内敌方单位造成1点额外伤害"],
                desc: "近战攻击单位，攻击力较高，但溅射伤害较低。",
                img: 'lib/img/units/刀兵.webp'
            },
            
            // 暗影族
            shadowAssassin: {
                name: "暗影刺客",
                type: "shadow",
                health: 3,
                attackRange: 1,
                damage: 2,
                cost: 1,
                skills: ["特性-刺杀: 移动后可以攻击", "特性-敏捷：可以向后移动"],
                desc: "敏捷型单位，可以快速移动并攻击。",
                img: 'lib/img/units/暗影刺客.webp'
            },
            shadowMage: {
                name: "暗影法师",
                type: "shadow",
                health: 4,
                attackRange: 2,
                damage: 2,
                cost: 2,
                skills: ["技能-暗影移动: 与3格内队友交换位置"],
                desc: "辅助型单位，可以与队友交换位置。",
                img: 'lib/img/units/暗影法师.webp'
            },
            shadowLord: {
                name: "暗影领主",
                type: "shadow",
                health: 6,
                attackRange: 1,
                damage: 4,
                cost: 3,
                skills: ["技能-侵蚀: 使杀死的单位叛变为满血的己方单位，献祭一名己方的上场单位"],
                desc: "控制型单位，可以控制敌方单位。",
                img: 'lib/img/units/暗影领主.webp'
            },
            
            // 兽灵魔族
            wolf: {
                name: "狂暴狼",
                type: "beast",
                health: 4,
                attackRange: 1,
                damage: 2,
                cost: 2,
                skills: ["特性-野性冲锋: 如果攻击目标前方无单位则击退单位并造成1点额外伤害"],
                desc: "冲锋型单位，可以击退敌方单位并造成额外伤害。",
                img: 'lib/img/units/狂暴狼.webp'
            },
            minotaur: {
                name: "牛头战士",
                type: "beast",
                health: 7,
                attackRange: 1,
                damage: 3,
                cost: 2,
                skills: ["特性-笨重: 仅能向前移动", "技能-野性祝福: 本回合相邻己方单位攻击力+1，替代攻击"],
                desc: "笨重型单位，只能向前移动，但可以提升周围单位的攻击力。",
                img: 'lib/img/units/牛头战士.webp'
            },
            iceDragon: {
                name: "冰霜龙",
                type: "beast",
                health: 6,
                attackRange: 2,
                damage: 2,
                cost: 3,
                skills: ["特性-冰霜: 消耗1点充能点数并冰冻攻击目标1回合"],
                 freezeDuration: 2,
                 desc: "冰冻型单位，可以冰冻敌方单位。",
                 img: 'lib/img/units/冰霜龙.webp'
            },
            // 钢铁教父反攻单位
            techFatherRevenge: {
                name: "反攻巨像",
                type: "human",
                health: 15,
                attackRange: 2,
                damage: 100,
                cost: 0,
                skills: ["特性-反攻：基地被毁后生成，拥有极高攻击力"],
                desc: "反攻单位，基地被毁后生成，拥有极高的攻击力。",
                img: 'lib/img/units/反攻巨像.webp'
            },
            // 嗜血蝙蝠
            beastBat: {
                name: "嗜血蝙蝠",
                type: "beast",
                health: 3,
                attackRange: 1,
                damage: 1,
                cost: 1,
                skills: ["特性-嗜血狂欢: 攻击时增加1点血量上限并恢复全部血量"],
                desc: "攻击时提升血量上限并回满血的兽族单位。",
                img: 'https://via.placeholder.com/120x168?text=嗜血蝙蝠'
            },
            // 相位兽
            phaseBeast: {
                name: "相位兽",
                type: "shadow",
                health: 4,
                attackRange: 1,
                damage: 2,
                cost: 2,
                skills: ["特性-幽冥穿梭: 斜向移动，可以后退", "特性-相位护甲: 受到的所有伤害减半，向上取整"],
                desc: "可斜向移动且受伤减半的暗影族单位。",
                img: 'https://via.placeholder.com/120x168?text=相位兽'
            },
            // 圣光牧师
            lightPriest: {
                name: "圣光牧师",
                type: "human",
                health: 3,
                attackRange: 2,
                damage: 1,
                cost: 2,
                skills: ["技能-医疗: 技能按钮触发，治疗攻击范围内1位盟友2点血"],
                desc: "可远程治疗盟友的辅助型人族单位。",
                img: 'https://via.placeholder.com/120x168?text=圣光牧师'
            },
            skeleton: {
                name: "骷髅",
                type: "undead",
                health: 1,
                attackRange: 1,
                damage: 1,
                cost: 0,
                skills: [],
                desc: "亡灵法师复苏的骷髅兵。",
                img: 'lib/img/units/skeleton.webp'
            }
        };
        
        // 法术卡定义
        const spellDefinitions = {
            healPack: {
                name: "医疗包",
                type: "spell",
                cost: 1,
                effect: "选择一个己方单位，恢复3点生命值。（不可恢复大本营血量）",
                desc: "恢复己方单位生命值的卡牌。",
                img: 'lib/img/spells/医疗包.webp'
            },
            shieldCard: {
                name: "护盾卡",
                type: "spell",
                cost: 2,
                effect: "选择一个己方单位，添加1点护盾。（不可给大本营添加）",
                desc: "为己方单位添加护盾的卡牌。",
                img: 'lib/img/spells/护盾卡.webp'
            },
            drawCard: {
                name: "抽卡牌",
                type: "spell",
                cost: 2,
                effect: "抽取最多3张卡牌，手牌上限7张",
                desc: "抽取卡牌的卡牌。",
                img: 'lib/img/spells/抽卡牌.webp'
            },
            resetCard: {
                name: "重置卡",
                type: "spell",
                cost: 1,
                effect: "选择一个己方单位，将其从棋盘上移除，并重新加入到手牌中。该单位的所有状态将被重置。",
                desc: "重置己方单位状态的卡牌。",
                img: 'lib/img/spells/重置卡.webp'
            },
            frostNova: {
                name: "寒冰新星",
                type: "spell",
                cost: 3,
                effect: "冻结所有敌方单位3个行动回合（特殊敌人卡）",
                desc: "冻结敌方单位的卡牌。",
                img: 'lib/img/spells/寒冰新星.webp'
            },
            shadowCorrosion: {
                name: "暗影腐蚀",
                type: "spell",
                cost: 1,
                effect: "对手随机1张手牌的花费+1",
                desc: "使对手随机1张手牌的花费+1。",
                img: 'lib/img/spells/暗影腐蚀.webp'
            },
            necromancy: {
                name: "死灵术",
                type: "spell",
                cost: 2,
                effect: "敌方全部单位-1血，死亡单位变成骷髅",
                desc: "敌方全部单位-1血，死亡单位变成骷髅。",
                img: 'lib/img/spells/necromancy.webp'
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
    name: '锈刃强盗团 Lv1',
    exp: 1,   // 经验
    gold: 4,  // 金币
    desc: '一伙落魄的土匪，武器生锈但人数众多。',
    hp: 6,
    maxAp: 4,
    apPerTurn: 2,
    deck: ['swordsman','swordsman','shadowAssassin','wolf'],
    portrait: 'lib/img/enemies/rusty_bandits.webp'
  },
  {
    name: '暗影斥候 Lv1',
    exp: 1,
    gold: 3,
    desc: '神出鬼没的刺客，专挑落单者下手。',
    hp: 5,
    maxAp: 3,
    apPerTurn: 2,
    deck: ['shadowAssassin','shadowAssassin','shadowAssassin','shadowAssassin','shadowMage'],
    portrait: 'lib/img/enemies/shadow_scout.webp'
  },
  {
    name: '兽群冲锋 Lv1',
    exp: 1,
    gold: 3,
    desc: '野兽组成的冲锋队，速度极快。',
    hp: 8,
    maxAp: 5,
    apPerTurn: 2,
    deck: ['minotaur','minotaur','wolf','wolf','healPack','healPack'],
    portrait: 'lib/img/enemies/beast_charge.webp'
  },
  {
    name: '嗜血蝠群 Lv1',
    exp: 1,
    gold: 4,
    desc: '一群饥渴的变异蝙蝠，在黑暗中盘旋，等待猎物露出破绽。',
    hp: 5,
    maxAp: 4,
    apPerTurn: 2,
    deck: ['beastBat','beastBat','beastBat','beastBat','beastBat'],
    portrait: 'lib/img/enemies/bloodthirsty_bats.webp'
  },
  {
    name: '嗜血狂潮 Lv3',
    exp: 6,
    gold: 20,
    desc: '当这些蝙蝠成群出现时，天空都会变成血色。它们共享生命，越吸血越强大。',
    hp: 0,
    maxAp: 6,
    apPerTurn: 3,
    deck: ['beastBat','beastBat','beastBat','beastBat','wolf','shieldCard'],
    portrait: 'lib/img/enemies/bloodthirsty_frenzy.webp'
  },
  {
    name: '暗影追猎团 Lv2',
    exp: 3,
    gold: 7,
    desc: '这支由精英刺客组成的小队擅长标记猎物，一旦被他们盯上，至死方休。',
    hp: 8,
    maxAp: 6,
    apPerTurn: 3,
    deck: ['shadowAssassin','shadowAssassin','shadowMage','shadowLord','phaseBeast','drawCard'],
    portrait: 'lib/img/enemies/shadow_hunters.webp'
  },
  {
    name: '铁壁攻坚队 Lv2',
    exp: 3,
    gold: 8,
    desc: '重甲步兵与弓箭手的完美组合，像铁砧与铁锤般摧毁敌人。他们的阵型永远密不透风。',
    hp: 9,
    maxAp: 6,
    apPerTurn: 3,
    deck: ['shieldWarrior','shieldWarrior','archer','archer','shieldCard'],
    portrait: 'lib/img/enemies/iron_wall_squad.webp'
  },
  {
    name: '冰霜守望者 LV2',
    exp: 3,
    gold: 10,
    desc: '这些寒冰法师将战场变成他们的领域，每一步都让敌人离冻结更近。',
    hp: 8,
    maxAp: 6,
    apPerTurn: 3,
    deck: ['iceDragon','iceDragon','lightPriest','lightPriest','frostNova','frostNova'],
    portrait: 'lib/img/enemies/frost_watchers.webp'
  },
  {
    name: '暗影诅咒者 Lv3',
    exp: 6,
    gold: 17,
    desc: '这些暗影法师精通腐蚀魔法，能将敌人的战术逐渐瓦解。拖延越久，你的选择就越昂贵。',
    hp: 10,
    maxAp: 6,
    apPerTurn: 3,
    deck: ['shadowCorrosion','shadowCorrosion','phaseBeast','phaseBeast','shadowLord','shadowMage','shadowMage','shadowMage'],
    portrait: 'lib/img/enemies/shadow_curse.webp'
  },
  {
    name: '亡者之裔 Lv4',
    exp: 20,
    gold: 43,
    desc: '这些战士将死亡视为进化仪式。每倒下一位同伴，幸存者就会更加强大。',
    hp: 12,
    maxAp: 6,
    apPerTurn: 3,
    deck: ['beastBat','beastBat','beastBat','shadowAssassin','shadowAssassin','archer','shadowAssassin'],
    portrait: 'lib/img/enemies/scion_of_the_dead.webp'
  },
  {
    name: '亡灵法师 Lv3',
    exp: 6,
    gold: 22,
    desc: '死亡只是开始。每个倒下的战士都会成为他亡灵大军的新成员。',
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
    name: "幸运硬币",
    type: "item",
    desc: "据说能带来好运的硬币。后续可扩展道具效果。",
    img: 'lib/img/items/幸运硬币.webp'
  },
  timeHourglass: {
    name: "时间沙漏",
    type: "item",
    desc: "使用后可让己方多进行一回合。",
    img: 'lib/img/items/sand.webp'
  }
};
