const assert = require('node:assert/strict');
const path = require('node:path');
const { spawn } = require('node:child_process');
const WebSocket = require('../card_game_server/node_modules/ws');

async function main() {
    const server = spawn(process.execPath, ['server.js'], {
        cwd: path.join(__dirname, '../card_game_server'), windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe']
    });
    const clients = [];
    try {
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Local test server did not start')), 5000);
            server.stdout.once('data', () => { clearTimeout(timeout); resolve(); });
            server.stderr.once('data', chunk => { clearTimeout(timeout); reject(new Error(chunk.toString())); });
            server.once('error', reject);
        });
        const room = `codex-smoke-${process.pid}-${Date.now()}`;
        async function connect(player) {
            const socket = new WebSocket(`ws://127.0.0.1:3000?room=${room}&player=${player}`);
            clients.push(socket);
            const messages = [];
            socket.on('message', data => messages.push(JSON.parse(data.toString())));
            await new Promise((resolve, reject) => { socket.once('open', resolve); socket.once('error', reject); });
            return { socket, messages };
        }
        async function waitFor(messages, type) {
            const deadline = Date.now() + 2000;
            while (!messages.some(message => message.type === type)) {
                if (Date.now() >= deadline) throw new Error(`Missing ${type}`);
                await new Promise(resolve => setTimeout(resolve, 10));
            }
            return messages.find(message => message.type === type);
        }
        const first = await connect(1), second = await connect(2);
        assert.equal((await waitFor(first.messages, 'player_joined')).player, '2');
        const state = { currentPlayer: 2, turnCount: 3, test: room };
        first.socket.send(JSON.stringify({ type: 'game_action', state }));
        assert.deepEqual((await waitFor(first.messages, 'game_update')).state, state);
        assert.deepEqual((await waitFor(second.messages, 'game_update')).state, state);
        second.socket.send(JSON.stringify({ type: 'chat_message', message: '本地自动化测试' }));
        assert.equal((await waitFor(first.messages, 'chat_message')).message, '本地自动化测试');
        second.socket.close();
        assert.equal((await waitFor(first.messages, 'player_left')).player, '2');
        const rejoined = await connect(2);
        assert.deepEqual((await waitFor(rejoined.messages, 'game_state')).state, state);
        console.log('PASS: two-client join, state broadcast, chat, leave and reconnect snapshot');
    } finally {
        clients.forEach(socket => socket.terminate());
        server.kill();
    }
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
