const CATALOG = {
  "shieldWarrior": {
    "name": "Shield Warrior",
    "type": "human",
    "health": 5,
    "attackRange": 1,
    "damage": 0,
    "cost": 1,
    "skills": [
      "Trait: Defense — If this unit did not move or attack on its previous turn, reduce each hit by 2. Disabled while frozen."
    ],
    "desc": "A defensive unit that holds the front line.",
    "img": "lib/img/cards-en/shield-warrior.png",
    "handImg": "lib/img/units/盾兵.webp"
  },
  "archer": {
    "name": "Archer",
    "type": "human",
    "health": 3,
    "attackRange": 3,
    "damage": 2,
    "cost": 3,
    "skills": [
      "Trait: Precise Shot — Each attack has a 1 in 6 chance to deal double damage."
    ],
    "desc": "A ranged unit with a chance to deal double damage.",
    "img": "lib/img/cards-en/archer.png",
    "handImg": "lib/img/units/弓箭手.webp"
  },
  "swordsman": {
    "name": "Swordsman",
    "type": "human",
    "health": 4,
    "attackRange": 1,
    "damage": 3,
    "cost": 2,
    "skills": [
      "Trait: Splash — Deal 1 damage to other enemies orthogonally adjacent to the target."
    ],
    "desc": "A melee unit whose attacks also damage nearby enemies.",
    "img": "lib/img/cards-en/swordsman.png",
    "handImg": "lib/img/units/刀兵.webp"
  },
  "shadowAssassin": {
    "name": "Shadow Assassin",
    "type": "shadow",
    "health": 3,
    "attackRange": 1,
    "damage": 2,
    "cost": 1,
    "skills": [
      "Trait: Assassination — Can attack after moving.",
      "Trait: Agility — Can move backward."
    ],
    "desc": "A mobile fighter that can move and attack in one turn.",
    "img": "lib/img/cards-en/shadow-assassin.png",
    "handImg": "lib/img/units/暗影刺客.webp"
  },
  "shadowMage": {
    "name": "Shadow Mage",
    "type": "shadow",
    "health": 4,
    "attackRange": 2,
    "damage": 2,
    "cost": 2,
    "skills": [
      "Skill: Shadow Movement — Swap places with an ally within 3 spaces. Uses this unit's movement."
    ],
    "desc": "A support unit that repositions allies.",
    "img": "lib/img/cards-en/shadow-mage.png",
    "handImg": "lib/img/units/暗影法师.webp"
  },
  "shadowLord": {
    "name": "Shadow Lord",
    "type": "shadow",
    "health": 6,
    "attackRange": 1,
    "damage": 4,
    "cost": 3,
    "skills": [
      "Skill: Erosion — Target an adjacent enemy this unit could kill, then sacrifice another ally to convert the target at full HP. Replaces the attack."
    ],
    "desc": "A control unit that sacrifices allies to capture weakened enemies.",
    "img": "lib/img/cards-en/shadow-lord-corrected.png",
    "handImg": "lib/img/units/暗影领主.webp"
  },
  "wolf": {
    "name": "Raging Wolf",
    "type": "beast",
    "health": 4,
    "attackRange": 1,
    "damage": 2,
    "cost": 2,
    "skills": [
      "Trait: Wild Charge — If the space behind the target is empty and is not a base, push it back 1 space and deal 1 extra damage."
    ],
    "desc": "A charging beast that pushes enemies back.",
    "img": "lib/img/cards-en/wolf.png",
    "handImg": "lib/img/units/狂暴狼.webp"
  },
  "minotaur": {
    "name": "Minotaur",
    "type": "beast",
    "health": 7,
    "attackRange": 1,
    "damage": 3,
    "cost": 2,
    "skills": [
      "Trait: Heavy — Can only move forward.",
      "Skill: Wild Blessing — Other orthogonally adjacent allies gain +1 attack this turn. Replaces this unit's attack."
    ],
    "desc": "A tough frontline unit that strengthens nearby allies.",
    "img": "lib/img/cards-en/minotaur.png",
    "handImg": "lib/img/units/牛头战士.webp"
  },
  "iceDragon": {
    "name": "Frost Dragon",
    "type": "beast",
    "health": 6,
    "attackRange": 2,
    "damage": 2,
    "cost": 3,
    "skills": [
      "Trait: Frost — After an attack, automatically spend 1 AP if available to freeze a surviving unit target for its next turn."
    ],
    "freezeDuration": 2,
    "desc": "A ranged beast that damages and freezes enemies.",
    "img": "lib/img/cards-en/ice-dragon.png",
    "handImg": "lib/img/units/冰霜龙.webp"
  },
  "techFatherRevenge": {
    "name": "Revenge Colossus",
    "type": "human",
    "health": 15,
    "attackRange": 2,
    "damage": 100,
    "cost": 0,
    "skills": [
      "Trait: Counterattack — Appears when the Iron Godfather's base is destroyed. Has extremely high attack."
    ],
    "desc": "The Iron Godfather's final defense after the base falls.",
    "img": "lib/img/cards-en/revenge-colossus.png",
    "handImg": "lib/img/card-art-en/revenge-colossus.png"
  },
  "beastBat": {
    "name": "Blood Bat",
    "type": "beast",
    "health": 3,
    "attackRange": 1,
    "damage": 1,
    "cost": 1,
    "skills": [
      "Trait: Blood Feast — On attack, gain 1 maximum HP and heal to full."
    ],
    "desc": "A beast that grows stronger and heals with every attack.",
    "img": "lib/img/cards-en/blood-bat.png",
    "handImg": "lib/img/card-art-en/blood-bat.png"
  },
  "phaseBeast": {
    "name": "Phase Beast",
    "type": "shadow",
    "health": 4,
    "attackRange": 1,
    "damage": 2,
    "cost": 2,
    "skills": [
      "Trait: Nether Step — Moves diagonally, including backward.",
      "Trait: Phase Armor — Halve incoming damage, rounding up."
    ],
    "desc": "A shadow creature with diagonal movement and damage resistance.",
    "img": "lib/img/cards-en/phase-beast.png",
    "handImg": "lib/img/card-art-en/phase-beast.png"
  },
  "lightPriest": {
    "name": "Light Priest",
    "type": "human",
    "health": 3,
    "attackRange": 2,
    "damage": 1,
    "cost": 2,
    "skills": [
      "Skill: Heal — Restore 2 HP to another ally within attack range. Replaces this unit's attack."
    ],
    "desc": "A human support unit that heals allies from a distance.",
    "img": "lib/img/cards-en/light-priest.png",
    "handImg": "lib/img/card-art-en/light-priest.png"
  },
  "skeleton": {
    "name": "Skeleton",
    "type": "undead",
    "health": 1,
    "attackRange": 1,
    "damage": 1,
    "cost": 0,
    "skills": [],
    "desc": "An undead soldier raised by Necromancy.",
    "img": "lib/img/cards-en/skeleton.png",
    "handImg": "lib/img/card-art-en/skeleton.png"
  },
  "healPack": {
    "name": "Healing Kit",
    "type": "spell",
    "cost": 1,
    "effect": "Restore up to 3 HP to an injured ally. Cannot target bases.",
    "desc": "Heal an injured ally.",
    "img": "lib/img/cards-en/healing-kit.png",
    "handImg": "lib/img/spells/医疗包.webp"
  },
  "shieldCard": {
    "name": "Shield",
    "type": "spell",
    "cost": 2,
    "effect": "Give an unshielded ally 1 shield, reducing each hit by 1 while not frozen. Cannot target bases.",
    "desc": "Protect an ally from incoming damage.",
    "img": "lib/img/cards-en/shield.png",
    "handImg": "lib/img/spells/护盾卡.webp"
  },
  "drawCard": {
    "name": "Reinforcements",
    "type": "spell",
    "cost": 2,
    "effect": "Draw up to 3 cards. Maximum hand size: 7.",
    "desc": "Add cards to your hand.",
    "img": "lib/img/cards-en/reinforcements.png",
    "handImg": "lib/img/spells/抽卡牌.webp"
  },
  "resetCard": {
    "name": "Recall",
    "type": "spell",
    "cost": 1,
    "effect": "Return an allied unit to your hand and reset its stats and status.",
    "desc": "Recall an ally for later deployment.",
    "img": "lib/img/cards-en/recall.png",
    "handImg": "lib/img/spells/重置卡.webp"
  },
  "frostNova": {
    "name": "Frost Nova",
    "type": "spell",
    "cost": 3,
    "effect": "Freeze all enemy units for their next 3 turns. Enemy-exclusive card.",
    "desc": "Freeze the opposing army.",
    "img": "lib/img/cards-en/frost-nova.png",
    "handImg": "lib/img/card-art-en/frost-nova.png"
  },
  "shadowCorrosion": {
    "name": "Shadow Corrosion",
    "type": "spell",
    "cost": 1,
    "effect": "Increase the cost of a random card in the opponent's hand by 1.",
    "desc": "Make a random enemy card more expensive.",
    "img": "lib/img/cards-en/shadow-corrosion.png",
    "handImg": "lib/img/card-art-en/shadow-corrosion.png"
  },
  "necromancy": {
    "name": "Necromancy",
    "type": "spell",
    "cost": 2,
    "effect": "Deal 1 damage to every enemy unit. Non-skeleton units killed this way become allied Skeletons.",
    "desc": "Damage all enemies and raise the fallen as allied Skeletons.",
    "img": "lib/img/cards-en/necromancy.png",
    "handImg": "lib/img/card-art-en/necromancy.png"
  }
};
