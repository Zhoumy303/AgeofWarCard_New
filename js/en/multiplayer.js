        // 连接参数
        const urlParams = new URLSearchParams(window.location.search);
        const roomId = urlParams.get('room') || 'default';
        const playerId = urlParams.get('player') || '1';
        
        // 设置UI显示
        document.getElementById('room-id').textContent = roomId;
        document.getElementById('player-id').textContent = playerId;
        
        // WebSocket连接
        let socket;
        let isConnected = false;

        function canLocalPlayerAct() {
            return !urlParams.has('room') || !isConnected || gameState.currentPlayer === Number(playerId);
        }
        
        function connectWebSocket() {
            // 单机模式无需服务器；只有显式房间链接才连接联机服务。
            if (!urlParams.has('room')) {
                document.getElementById('connection-status').textContent = 'Offline mode';
                document.getElementById('connection-status').style.color = '#8cf';
                return;
            }
            if (socket && socket.readyState < 2) return;
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const host = window.location.hostname || 'localhost';
            const wsUrl = `${protocol}//${host}:3000?room=${encodeURIComponent(roomId)}&player=${encodeURIComponent(playerId)}`;
            socket = new WebSocket(wsUrl);
            
            socket.onopen = () => {
                console.log('Connected to server');
                isConnected = true;
                document.getElementById('connection-status').textContent = 'Connected';
                document.getElementById('connection-status').style.color = 'green';
            };
            
            socket.onmessage = (event) => {
                const data = JSON.parse(event.data);
                handleServerMessage(data);
            };
            
            socket.onclose = () => {
                console.log('Connection closed');
                isConnected = false;
                document.getElementById('connection-status').textContent = 'Disconnected';
                document.getElementById('connection-status').style.color = 'red';
                // 尝试重新连接
                setTimeout(connectWebSocket, 3000);
            };
            
            socket.onerror = (error) => {
                console.error('WebSocket error:', error);
            };
        }
        
        function handleServerMessage(data) {
            switch (data.type) {
                case 'game_state':
                case 'game_update':
                    Object.assign(gameState, data.state);
                    // JSON会复制同一单位，恢复棋盘/选择与单位列表的共同引用。
                    const unitsById = new Map(gameState.units.map(unit => [unit.id, unit]));
                    gameState.board = gameState.board.map(row => row.map(unit => unit ? unitsById.get(unit.id) || null : null));
                    for (const key of ['selectedUnit', 'healingUnit', 'erosionTarget']) {
                        gameState[key] = gameState[key] ? unitsById.get(gameState[key].id) || null : null;
                    }
                    gameState.aiPlayers = [false, false];
                    cancelAITurn();
                    updateUI();
                    break;
                    
                case 'player_joined':
                    alert(`Player ${data.player} joined the game`);
                    break;
                    
                case 'player_left':
                    alert(`Player ${data.player} left the game`);
                    break;
                    
                case 'chat_message':
                    addChatMessage(data.from, data.message);
                    break;
            }
        }
        
        function sendGameAction() {
            if (!isConnected) return;
            
            socket.send(JSON.stringify({
                type: 'game_action',
                state: gameState
            }));
        }
        
        function sendChatMessage(message) {
            if (!isConnected) return;
            
            socket.send(JSON.stringify({
                type: 'chat_message',
                message: message,
                from: playerId
            }));
        }
        
        function addChatMessage(from, message) {
            const chat = document.getElementById('chat-messages');
            const msgElement = document.createElement('div');
            msgElement.textContent = `Player ${from}: ${message}`;
            chat.appendChild(msgElement);
            chat.scrollTop = chat.scrollHeight;
        }
        
        function sendChat() {
            const input = document.getElementById('chat-input');
            const message = input.value.trim();
            if (message) {
                sendChatMessage(message);
                addChatMessage(playerId, message);
                input.value = '';
            }
        }
