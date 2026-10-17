const fs = require('node:fs');
const crypto = require('node:crypto');
const { loadGame, snapshotSources } = require('./game-harness.cjs');

// The same AI and combat code as the browser, including virtual animation waits.
// This is a bounded diagnostic, not evidence that human matchups are balanced.
async function runGame(seed, mode = 'experience', character = 0, enemy = 0, sources, storyHpBonus = null, player2OpeningAP) {
    const h = loadGame({ seed, sources });
    // Fixed historical control: 3/3/4/6/8/11 HP. The comparison remains 3 vs 6
    // starting HP even after the production progression is adjusted.
    if (storyHpBonus !== null) h.evaluate(`Object.assign(LEVEL_MAX_HP, Object.fromEntries([3,3,4,6,8,11].map((hp,index)=>[index+1,hp+${Number(storyHpBonus)}])));`);
    if (mode === 'story') h.evaluate(`currentCharIdx=${character}; document.getElementById('btn-story-start').click(); startBattleWithEnemy(ENEMY_POOL[${enemy}]);`);
    if (player2OpeningAP !== undefined) h.evaluate(`gameState.players[1].actionPoints=${Number(player2OpeningAP)};`);
    h.evaluate('gameState.aiPlayers=[true,true]; aiTurn();');
    let lastTurn = -1, lastMaterial = '', quietTurns = 0, longestQuietTurns = 0;
    const result = await h.drainUntil(() => {
        const turn = h.evaluate('gameState.turnCount');
        if (turn !== lastTurn) {
            if (!h.evaluate('gameState.players.every(p=>p.hand.every(c=>typeof c === "object" && !!(unitDefinitions[c.key]||spellDefinitions[c.key])))')) h.errors.push(new Error('Invalid card object in playable hand'));
            const material = h.evaluate(`JSON.stringify({hp:gameState.players.map(p=>p.health),cards:gameState.players.map(p=>[p.deck.length,p.hand.length]),units:gameState.units.map(u=>[u.id,u.health,u.shield])})`);
            quietTurns = material === lastMaterial ? quietTurns + 1 : 0;
            longestQuietTurns = Math.max(longestQuietTurns, quietTurns);
            lastTurn = turn; lastMaterial = material;
        }
        return h.evaluate('gameState.gameOver || gameState.players.some(p=>p.health<=0)');
    }, { maxSteps: 15000, maxTurns: 160 });
    const state = h.evaluate(`({turns:gameState.turnCount,hp:gameState.players.map(p=>p.health),units:gameState.units.length,ap:gameState.players.map(p=>p.actionPoints)})`);
    const winner = state.hp[0] <= 0 ? 2 : state.hp[1] <= 0 ? 1 : null;
    const diagnostics = winner === null ? h.evaluate(`({units:gameState.units.map(u=>({type:u.type,player:u.player,row:u.row,col:u.col,hp:u.health,shield:u.shield})),players:gameState.players.map(p=>({hand:p.hand.map(c=>c.key),deck:p.deck.length,graveyard:p.graveyard.length})),frozen:gameState.frozenUnits,recentDecisions:gameState.aiLearning.currentGameDecisions.slice(-12)})`) : undefined;
    return { seed, mode, storyHpBonus, player2OpeningAP, ...(mode === 'story' ? { character, enemy } : {}), winner, ...state, ...result, longestQuietTurns, errors: h.errors.map(e => e.message), diagnostics };
}

function summarize(games) {
    const wins = games.filter(g => g.winner === 1).length;
    const finished = games.filter(g => g.winner !== null);
    return {
        games: games.length, player1Wins: wins, player2Wins: games.filter(g => g.winner === 2).length,
        unfinished: games.length - finished.length, errors: games.filter(g => g.errors.length).length,
        player1WinRateAmongFinished: finished.length ? +(wins / finished.length).toFixed(3) : null,
        averageHalfTurnsFinished: finished.length ? +(finished.reduce((sum,g)=>sum+g.turns,0)/finished.length).toFixed(1) : null,
        stopReasons: Object.fromEntries([...new Set(games.map(g=>g.reason))].map(reason=>[reason,games.filter(g=>g.reason===reason).length]))
    };
}

async function main() {
    const count = Number(process.argv[2] || 20);
    const mode = process.argv[3] || 'experience';
    const storyHpBonus = process.argv[5] === undefined ? null : Number(process.argv[5]);
    const started = Date.now();
    const sources = snapshotSources();
    const games = [];
    for (let i=0;i<count;i++) {
        if (mode === 'story-compare') {
            games.push(await runGame(i+1, 'story', i % 3, Math.floor(i/3) % 4, sources, 0));
            games.push(await runGame(i+1, 'story', i % 3, Math.floor(i/3) % 4, sources, 3));
        } else if (mode === 'experience-compare') {
            games.push(await runGame(i+1, 'experience', 0, 0, sources, 0, 2));
            games.push(await runGame(i+1, 'experience', 0, 0, sources, 0, 0));
        } else games.push(await runGame(i+1, mode, i % 3, Math.floor(i/3) % 4, sources, storyHpBonus));
        if (Date.now() - started > 120000) break;
    }
    const report = { generatedAt: new Date().toISOString(), sourceHash: crypto.createHash('sha256').update(JSON.stringify(sources)).digest('hex'), mode, storyHpBonus, elapsedMs: Date.now()-started, summary: summarize(games), games };
    if (mode === 'story') report.byCharacter = [0,1,2].map(character => ({ character, ...summarize(games.filter(g=>g.character===character)) }));
    if (mode === 'story-compare') report.comparison = [0,3].map(bonus => ({ storyHpBonus: bonus, ...summarize(games.filter(g=>g.storyHpBonus===bonus)), byCharacter: [0,1,2].map(character=>({character,...summarize(games.filter(g=>g.storyHpBonus===bonus&&g.character===character))})) }));
    if (mode === 'experience-compare') report.comparison = [2,0].map(ap => ({ player2OpeningAP: ap, ...summarize(games.filter(g=>g.player2OpeningAP===ap)) }));
    console.log(JSON.stringify(report, null, 2));
    if (process.argv[4]) fs.writeFileSync(process.argv[4], JSON.stringify(report, null, 2)+'\n');
    if (report.summary.errors) process.exitCode = 1;
}
if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });
module.exports = { runGame, summarize };
