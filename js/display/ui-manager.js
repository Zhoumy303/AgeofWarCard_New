// BOSS数据
const BOSSES = [
  {
    type: 'shadowCouncil',
    name: '暗影议会',
    description: '持续召唤的暗影军团',
    detail: '基地生命5，每回合恢复1点行动点，并召唤一名暗影刺客。',
  },
  {
    type: 'frostQueen',
    name: '冰霜女王',
    description: '以冰冻控制战场',
    detail: '每回合恢复3点行动点；敌军移动时有30%概率冰冻，拥有专属法术寒冰新星。',
  },
  {
    type: 'techFather',
    name: '钢铁教父',
    description: '人族协同与第二阶段',
    detail: '每回合恢复3点行动点；邻近人族相互增益，基地被摧毁后生成反攻巨像。',
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
    const phaseText = this.gameState.phase === 'placement' ? '放置阶段' : '战斗阶段';
    document.getElementById('phase-indicator').textContent = `当前阶段: ${phaseText}`;
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
