// server.js
const WebSocket = require('ws');
const http = require('http');

const server = http.createServer();
const wss = new WebSocket.Server({ server });

const rooms = new Map(); // 存储房间数据

wss.on('connection', (ws, req) => {
    // 解析URL参数
    const params = new URLSearchParams(req.url.split('?')[1]);
    const roomId = params.get('room') || 'default';
    const playerId = params.get('player') || '1';
    
    console.log(`玩家 ${playerId} 加入房间 ${roomId}`);
    
    // 初始化房间
    if (!rooms.has(roomId)) {
        rooms.set(roomId, {
            players: new Map(),
            gameState: null
        });
    }
    
    const room = rooms.get(roomId);
    
    // 存储玩家连接
    room.players.set(playerId, ws);
    
    // 通知其他玩家
    room.players.forEach((playerWs, id) => {
        if (id !== playerId) {
            playerWs.send(JSON.stringify({
                type: 'player_joined',
                player: playerId
            }));
        }
    });
    
    // 发送当前游戏状态给新玩家
    if (room.gameState) {
        ws.send(JSON.stringify({
            type: 'game_state',
            state: room.gameState
        }));
    }
    
    ws.on('message', (message) => {
        const data = JSON.parse(message);
        
        switch (data.type) {
            case 'game_action':
                // 更新房间游戏状态
                room.gameState = data.state;
                
                // 广播给所有玩家
                room.players.forEach((playerWs) => {
                    playerWs.send(JSON.stringify({
                        type: 'game_update',
                        state: room.gameState
                    }));
                });
                break;
                
            case 'chat_message':
                // 广播聊天消息
                room.players.forEach((playerWs, id) => {
                    if (id !== playerId) { // 不发送给自己
                        playerWs.send(JSON.stringify({
                            type: 'chat_message',
                            from: playerId,
                            message: data.message
                        }));
                    }
                });
                break;
        }
    });
    
    ws.on('close', () => {
        console.log(`玩家 ${playerId} 离开房间 ${roomId}`);
        room.players.delete(playerId);
        
        // 通知其他玩家
        room.players.forEach((playerWs, id) => {
            playerWs.send(JSON.stringify({
                type: 'player_left',
                player: playerId
            }));
        });
    });
});

server.listen(3000, () => {
    console.log('服务器已启动，监听端口 3000');
});