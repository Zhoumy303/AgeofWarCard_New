const stage = document.getElementById('stage');
const params = new URLSearchParams(location.search);
if (params.get('export') === '1') document.body.classList.add('export');
const asset = path => '../../../' + path;
const paths = {
  crest:'<path d="M5 3l10 14M15 3L5 17M3 2l5 1-4 4M17 2l-5 1 4 4M7 13l-3 4M13 13l3 4"/>',
  heart:'<path d="M10 17S2 12 2 6a4 4 0 018-1 4 4 0 018 1c0 6-8 11-8 11z"/>',
  sword:'<path d="M14 2l4 0 0 4-10 9-3-3zM4 10l6 6M3 17l4-4"/>',
  range:'<path d="M3 10h14M5 7l-3 3 3 3M15 7l3 3-3 3"/>',
  mana:'<path d="M10 1l6 9-6 9-6-9zM10 1v18M4 10h12"/>',
  castle:'<path d="M2 6h3V2h3v4h4V2h3v4h3v12H2zM7 18v-5a3 3 0 016 0v5M3 10h3M14 10h3"/>',
  coin:'<circle cx="10" cy="10" r="8"/><circle cx="10" cy="10" r="5"/><path d="M8 7h4v6H8z"/>',
  book:'<path d="M10 5c-3-3-8-2-8-2v13s5-1 8 2c3-3 8-2 8-2V3s-5-1-8 2zM10 5v13"/>',
  check:'<path d="M3 10l5 5L17 5"/>',
  mouse:'<rect x="4" y="2" width="12" height="16" rx="5"/><path d="M10 2v6M4 8h12"/>'
};
const icon = name => '<svg viewBox="0 0 20 20" aria-hidden="true">' + paths[name] + '</svg>';
const heroes = [
  {name:'Fortress Guardian',image:'fortress_guardian',style:'Hold the front line.',deck:['shieldWarrior','shieldWarrior','swordsman','swordsman','healPack']},
  {name:'Shadow Hunter',image:'shadow_hunter',style:'Strike, then reposition.',deck:['shadowAssassin','shadowAssassin','shadowAssassin','shadowMage','resetCard']},
  {name:'Beastmaster',image:'beastmaster',style:'Lead a powerful frontline.',deck:['wolf','minotaur','iceDragon','healPack']}
];
const events = [
  {name:'Shadow Scouts',type:'Battle',image:'lib/img/enemies/shadow_scout.webp',caption:'An enemy lies ahead.',description:'Elusive assassins who prey on isolated targets. Inspect the enemy before entering battle.',action:'Inspect enemy'},
  {name:'Shop',type:'Shop',image:'lib/img/events/shop.webp',caption:'Cards for sale.',description:'Visit the merchant to see three cards for sale. Review each card and its price before you buy.',action:'Enter shop'},
  {name:'Healing Spring',type:'Spring',image:'lib/img/events/healing_spring.webp',caption:'Rest and recover.',description:'Visit the spring to recover health before the next encounter.',action:'Visit spring'}
];
const hand = ['shieldWarrior','swordsman','archer','shadowAssassin','healPack','shadowLord'];
function bar(right = '<button class="quiet" data-screen="menu">Menu</button><button class="quiet" data-screen="notes">Rules</button>') {
  return '<header class="topbar"><a class="wordmark" href="?screen=menu">' + icon('crest') + 'AGE OF WAR</a><div class="top-links">' + right + '</div></header>';
}
function menu() {
  stage.className = 'stage menu-screen';
  stage.innerHTML = '<div class="menu-content"><div class="title-ornament">' + icon('crest') + '</div><h1 class="game-title">AGE<span class="last"><span class="of">of</span>WAR</span></h1><div class="menu-list"><button class="menu-link active" data-screen="deploy">Quick Match</button><button class="menu-link" data-screen="hero">New Adventure</button><button class="menu-link" data-screen="adventure">Continue Adventure</button><small>Fortress Guardian · Lv. 1</small></div></div><div class="menu-sigil">HUMAN · SHADOW · BEAST</div><footer class="menu-footer"><button class="quiet" data-screen="notes">How to play</button></footer>';
}
function handCard(key,mode,selectedKey) {
  const d = CATALOG[key];
  const values = d.type === 'spell' ? '<span class="type">Spell</span><span>' + d.cost + ' AP</span>' : '<span>' + icon('sword') + d.damage + '</span><span>' + icon('heart') + d.health + '</span><span>' + icon('range') + d.attackRange + '</span>';
  const classes = ['hand-card',mode === 'deploy' && key === selectedKey ? 'selected' : '',mode === 'deploy' && d.cost > 2 ? 'unaffordable' : '',mode === 'battle' ? 'view-only' : ''].join(' ');
  return '<button class="' + classes + '" data-card="' + key + '" aria-label="' + d.name + ', ' + d.cost + ' AP"><img class="art" src="' + asset(d.handImg) + '" alt=""><span class="cost">' + d.cost + '</span><span class="card-caption">' + d.name + '</span><span class="card-values">' + values + '</span></button>';
}
function unit(key,enemy,selected,health) {
  const d=CATALOG[key];
  return '<div class="unit-stand ' + (enemy ? 'enemy ' : '') + (selected ? 'selected' : '') + '"><img src="' + asset(d.handImg) + '" alt="' + d.name + '"><span class="unit-label">' + d.name + '</span><div class="stand-stats"><span>' + icon('sword') + d.damage + '</span><span class="ready-dot"></span><span>' + icon('heart') + (health || d.health) + '</span></div></div>';
}
function base(enemy) {
  return '<div class="base ' + (enemy ? 'enemy' : '') + '">' + icon('castle') + '<div class="base-label">' + (enemy ? 'Enemy base' : 'Your base') + '</div><strong>' + (enemy ? '5' : '7') + '</strong></div>';
}
function sheet(key,mode,fromUnit) {
  const d=CATALOG[key],isSpell=d.type==='spell',unitSelected=fromUnit && key==='swordsman';
  const stats=isSpell ? [[d.cost,'AP']] : unitSelected ? [[d.damage,'ATK'],['3/4','HP'],[d.attackRange,'RNG'],['—','AP']] : [[d.cost,'AP'],[d.damage,'ATK'],[d.health,'HP'],[d.attackRange,'RNG']];
  const skills = key==='swordsman' ? ['Splash','Deal 1 damage to other enemies orthogonally adjacent to the target.'] : key==='shieldWarrior' ? ['Defense','If idle on its previous turn, this unit reduces each hit by 2.'] : key==='archer' ? ['Precise Shot','Each attack has a 1 in 6 chance to deal double damage.'] : key==='shadowAssassin' ? ['Assassination','Can attack after moving. Can also move backward.'] : key==='shadowLord' ? ['Erosion','Sacrifice another ally to capture an adjacent enemy this unit could kill.'] : ['Healing Kit','Restore up to 3 HP to an injured ally. Cannot target bases.'];
  const state = unitSelected ? 'Ready · Move or attack · No AP cost' : mode==='battle' ? 'Inspect only · Play cards during Deploy' : d.cost>2 ? 'Requires ' + d.cost + ' AP · Available 2' : isSpell ? 'Select an injured friendly unit' : 'Choose a marked space to deploy';
  const preview = unitSelected ? '<div class="damage-preview"><strong>Attack preview</strong><span>Raging Wolf &nbsp; 4 → 1 HP</span><small>Minotaur takes 1 splash damage.</small></div>' : '';
  return '<aside class="tactical-sheet ' + (unitSelected?'with-preview':'') + '"><h2>' + d.name + '</h2><div class="type-line">' + (isSpell ? 'Spell' : d.type[0].toUpperCase()+d.type.slice(1)+' · Unit') + '</div><img class="tactical-card" src="' + asset(d.img) + '" alt="' + d.name + ' printed card"><div class="live-stats">' + stats.map(([value,label])=>'<div><strong>'+value+'</strong><span>'+label+'</span></div>').join('') + '</div><div class="ability"><h3>'+skills[0]+'</h3><p>'+skills[1]+'</p></div><div class="selection-state">'+icon(d.cost>2&&mode==='deploy'?'mana':'check')+'<span>'+state+'</span></div>'+preview+'<div class="sheet-footer"><button data-enlarge="'+key+'">Enlarge card ↗</button><span>Live values above</span></div></aside>';
}
function battle(mode='deploy',selectedKey='swordsman',fromUnit=mode==='battle') {
  stage.className = 'stage table-screen ' + mode;
  stage.dataset.mode=mode;
  const units = {
    '1,2':['archer',false], '2,1':['shieldWarrior',false],
    '3,2':['shadowAssassin',false], '2,3':['swordsman',false], '2,4':['wolf',true],
    '3,4':['minotaur',true], '1,5':['shadowMage',true]
  };

  const canDeploy=mode==='deploy' && CATALOG[selectedKey].type!=='spell' && CATALOG[selectedKey].cost<=2;
  let cells='';
  for(let r=0;r<5;r++) for(let c=0;c<7;c++) {
    const key=r+','+c,u=units[key],isBase=r===2&&(c===0||c===6),sel=fromUnit&&r===2&&c===3,canMove=fromUnit&&mode==='battle'&&c===3&&(r===1||r===3),canAttack=fromUnit&&mode==='battle'&&r===2&&c===4;
    const deployment=canDeploy&&c<2&&!u&&!isBase;
    const content=isBase ? base(c===6) : u ? unit(u[0],u[1],sel,u[0]==='swordsman'?3:undefined) : '';
    cells+='<div class="tile '+(deployment?'deploy-space ':'')+(deployment&&r===3&&c===1?'deploy-focus ':'')+(canMove?(r===3?'move-space move-down ':'move-space '):'')+(canAttack?'attack-space ':'')+'" '+(mode==='battle'&&r===2&&c===3?'data-unit="swordsman"':'')+'><span class="coord">'+String.fromCharCode(65+c)+(r+1)+'</span>'+content+(deployment&&r===3&&c===1?'<span class="placement-label">Place here · '+CATALOG[selectedKey].cost+' AP</span>':'')+(canAttack?'<span class="target-tag">−3 HP</span>':'')+'</div>';
  }
  const instruction = mode==='deploy' ? (CATALOG[selectedKey].cost>2?'Not enough AP to play '+CATALOG[selectedKey].name:CATALOG[selectedKey].type==='spell'?'Choose a target for '+CATALOG[selectedKey].name:'Deploy '+CATALOG[selectedKey].name+' · '+CATALOG[selectedKey].cost+' AP') : fromUnit ? 'Swordsman · Choose a move or an attack' : 'Inspecting your hand · Cards can be played during Deploy';
  stage.innerHTML = bar()+'<div class="battle-status"><div class="side-status"><img src="'+asset('lib/img/player/fortress_guardian.webp')+'" alt=""><div><h2>You</h2><div class="hp">'+icon('heart')+'7 <small>/ 7 Base HP</small></div></div></div><div class="phase-status"><p class="round">ROUND 04 · YOUR TURN</p><div class="phase-steps"><span class="'+(mode==='deploy'?'active':'done')+'">Deploy</span><b>›</b><span class="'+(mode==='battle'?'active':'')+'">Battle</span></div></div><div class="side-status enemy"><img src="'+asset('lib/img/enemies/shadow_hunters.webp')+'" alt=""><div><h2>Computer</h2><div class="hp">'+icon('heart')+'5 <small>/ 7 Base HP</small></div><small>4 cards in hand</small></div></div></div><section class="board-frame"><div class="board-grid">'+cells+'</div><div class="board-files">'+['A','B','C','D','E','F','G'].map(l=>'<span>'+l+'</span>').join('')+'</div></section>'+sheet(selectedKey,mode,fromUnit)+'<div class="board-instruction"><span class="mouse-note">'+icon('mouse')+instruction+'</span><button class="quiet cancel" data-cancel>Cancel · Esc</button></div><div class="hand-area"><span class="hand-label">Your hand · 6 / 7'+(mode==='battle'?' &nbsp; · &nbsp; Inspect only':'')+'</span><div class="draw-stack"><div class="ap-display">'+icon('mana')+'2 <small>/ 6 AP</small></div><div class="deck-back">'+icon('crest')+'</div><span class="deck-count">18</span><button class="draw-button" '+(mode==='battle'?'disabled':'')+'>Draw <small>· 1 AP</small></button></div><div class="hand-cards">'+hand.map(k=>handCard(k,mode,fromUnit?'':selectedKey)).join('')+'</div></div><div class="phase-action"><button class="major" data-screen="'+(mode==='deploy'?'battle':'deploy')+'">'+(mode==='deploy'?'Start battle':'End turn')+' &nbsp; ›</button>'+(mode==='deploy'?'<button class="quiet secondary-turn">End turn without battle</button>':'<p>Finish your actions before passing.</p>')+'</div>';
}
function adventure(selected=1) {
  stage.className='stage table-screen';
  stage.innerHTML=bar()+'<div class="journey-status"><div class="hero-summary"><img src="'+asset('lib/img/player/fortress_guardian.webp')+'" alt=""><div><h2>Fortress Guardian</h2><p>Level 1 · 0 / 2 XP</p></div></div><div class="journey-resources"><span>'+icon('heart')+'6 <small>/ 6 HP</small></span><span>'+icon('mana')+'6 <small>AP cap</small></span><span>'+icon('coin')+'0 <small>gold</small></span></div><button class="quiet deck-link">'+icon('book')+' &nbsp; Deck & items</button></div><div class="journey-heading"><h1>Choose your next event</h1><p>21 events left in the deck</p></div><div class="event-spread">'+events.map((e,i)=>'<button class="event-card '+(selected===i?'selected':'')+'" data-event="'+i+'"><img src="'+asset(e.image)+'" alt=""><span class="event-type">'+e.type+'</span><h2>'+e.name+'</h2><p>'+e.caption+'</p></button>').join('')+'</div><section class="event-details"><div><h3>'+events[selected].name+'</h3><p>'+events[selected].description+'</p></div><button class="major">'+events[selected].action+' &nbsp; ›</button></section><div class="journey-save">'+icon('check')+'Progress saved after each completed event</div>';
}
function hero(index=0) {
  const h=heroes[index];
  stage.className='stage table-screen';
  stage.innerHTML=bar('<button class="quiet" data-screen="menu">Back to menu</button>')+'<img class="hero-art" src="'+asset('lib/img/player/'+h.image+'.webp')+'" alt="'+h.name+'"><div class="hero-selector"><h1>'+h.name+'</h1><p class="hero-role">'+h.style+'</p><div class="hero-tabs">'+heroes.map((v,i)=>'<button class="hero-tab '+(index===i?'selected':'')+'" data-hero="'+i+'" aria-label="'+v.name+'"><img src="'+asset('lib/img/player/'+v.image+'.webp')+'" alt=""><span class="hero-tab-name">'+['Guardian','Hunter','Beastmaster'][i]+'</span></button>').join('')+'</div><section class="starting-deck"><h2>Starting deck <small>'+h.deck.length+' cards</small></h2><div class="starter-cards">'+h.deck.map(k=>'<div class="starter-card"><img src="'+asset(CATALOG[k].img)+'" alt=""><span>'+CATALOG[k].name+'</span></div>').join('')+'</div></section><button class="major" data-screen="adventure">Begin adventure &nbsp; ›</button><p class="hero-start-note">Choose the army you want to lead.</p></div><div class="hero-caption">CHOOSE YOUR HERO</div>';
}
function notes() {
  stage.className='stage notes';
  stage.innerHTML='<h1>Age of War · UI 设计方案</h1><p class="intro">方向：把战场呈现为一张可阅读、可操作的实体战棋桌。沿用现有卡牌的棕铜边框与幻想插画；用材质和角色建立游戏身份，用文字和层级说明操作。此文件仅用于查看设计，战局、资源和存档均为展示示例。</p><div class="notes-grid"><section><h2>01　视觉与主次</h2><p>棋盘是最大对象，手牌第二，选中信息第三。菜单用一幅场景与纵向文字入口。旧铜只用在边缘、选中与阶段主按钮；纸色说明区与深色战场形成清楚分区。标题用衬线字体，说明和数字用易读字体，避免装饰字覆盖全界面。</p><div class="swatches"><span class="swatch" style="background:#18221e;color:#e1d7c2">墨绿桌面</span><span class="swatch" style="background:#826345;color:#e1d7c2">旧铜边缘</span><span class="swatch" style="background:#d2aa69">阶段主按钮</span><span class="swatch" style="background:#c9b996">选中说明</span></div></section><section><h2>02　对战阅读</h2><p>严格保持 7 列 × 5 行和左右中间格的基地。单位用角色肖像和底座数值识别，底座颜色说明归属。AP 与抽牌、手牌相邻；敌方手牌只显示数量。选中棋子时，说明区显示当前 HP／最大 HP；完整卡面的基础数值不代替实时属性。</p></section><section><h2>03　操作与反馈</h2><p>部署时只标记前两列的空格，基地格和占用格不亮。战斗时分别使用青绿落点、朱红目标与杏金选中框，并辅以形状和短句。主按钮固定位置，按阶段显示 Start battle 或 End turn。费用不足可查看卡牌，明确写出所需 AP。右侧可放大完整卡面，手牌保持纯插画。</p></section><section><h2>04　冒险与响应</h2><p>三个真实事件平铺，选中后在同一条说明区确认进入。英雄选择直接比较三头像与起始牌。商店、奖励和道具共用朴素面板。实施时，窄屏横向保留棋盘与手牌，选中信息改为可收起抽屉；竖屏另做布局，避免直接缩小桌面字号。</p></section></div><p class="notes-foot">此版是桌面视觉稿（1600 × 1000），包含主菜单、英雄选择、部署、攻击预览、冒险五个画面。预览按钮用于切换／检查设计；未接入抽牌、施法、战斗、存档或购买逻辑。按 Esc 关闭放大卡面。</p>';
}
let screen=params.get('screen')||'deploy';
function render(next) {
  screen=next;
  if(next==='menu') menu(); else if(next==='adventure') adventure(); else if(next==='hero') hero(); else if(next==='notes') notes(); else battle(next==='battle'?'battle':'deploy');
  scale();
}
function scale(){
  if(document.body.classList.contains('export'))return;
  const s=Math.min(innerWidth/1600,(innerHeight-56)/1000);
  stage.style.transform='scale('+s+')';
  const wrap=document.querySelector('.stage-wrap');
  wrap.style.width=1600*s+'px';wrap.style.height=1000*s+'px';
}
stage.addEventListener('click',e=>{
  const b=e.target.closest('[data-screen],[data-enlarge],[data-card],[data-event],[data-hero],[data-unit]');
  if(!b)return;
  if(b.dataset.screen){render(b.dataset.screen);history.replaceState(null,'','?screen='+b.dataset.screen);return;}
  if(b.dataset.hero!==undefined){hero(Number(b.dataset.hero));return;}
  if(b.dataset.event!==undefined){adventure(Number(b.dataset.event));return;}
  if(b.dataset.card){battle(screen,b.dataset.card,false);return;}
  if(b.dataset.unit){battle('battle','swordsman',true);return;}
  if(b.dataset.enlarge){const d=document.getElementById('full-card');d.querySelector('img').src=asset(CATALOG[b.dataset.enlarge].img);d.showModal();}
});
document.querySelector('.close-card').addEventListener('click',()=>document.getElementById('full-card').close());
window.addEventListener('resize',scale);
render(screen);

