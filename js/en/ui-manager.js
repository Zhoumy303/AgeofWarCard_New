// BOSS数据
const BOSSES = [
  {
    type: 'shadowCouncil',
    name: 'Shadow Council',
    description: 'An ever-growing shadow army',
    detail: '5 base HP. Recovers 1 AP and summons a Shadow Assassin each turn.',
  },
  {
    type: 'frostQueen',
    name: 'Frost Queen',
    description: 'Control the battlefield with frost',
    detail: 'Recovers 3 AP per turn. Your units have a 33% chance to freeze when moving. Uses the exclusive Frost Nova spell.',
  },
  {
    type: 'techFather',
    name: 'Iron Godfather',
    description: 'Human synergy and a powerful second phase',
    detail: 'Recovers 3 AP per turn. Nearby Human units strengthen one another. Summons a Revenge Colossus when the base is destroyed.',
  },
];

class UIManager {
  constructor(gameState) {
    this.gameState = gameState;
  }

  updateAll() {
    this.updatePlayerPanels();
    this.updateBoard();
    this.updatePhaseIndicator();
    this.updateControlButtons();
  }

  updatePhaseIndicator() {
    const phaseText = this.gameState.phase === 'placement' ? 'Deployment' : 'Battle';
    document.getElementById('phase-indicator').textContent = `Phase: ${phaseText}`;
  }

  updateControlButtons() {
    const phase = this.gameState.phase;
    document.getElementById('enter-battle-btn').style.display = 
      phase === 'placement' ? 'inline-block' : 'none';
    
    document.getElementById('use-spell-btn').style.display = 
      this.gameState.selectedSpell ? 'inline-block' : 'none';
  }
}

// 只在DOM加载后绑定按钮事件
window.addEventListener('DOMContentLoaded', function() {
  const openBossBtn = document.getElementById('open-boss-panel');
  if (openBossBtn) {
    openBossBtn.onclick = showLevelSelectPanel;
  }
});
