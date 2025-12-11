const WebSocket = require('ws');
const http = require('http');

const PORT = process.env.PORT || 3001;

// Create HTTP server
const server = http.createServer();

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Store active game rooms
const gameRooms = new Map();

// Store player connections
const playerConnections = new Map();

wss.on('connection', (ws) => {
  console.log('New client connected');
  
  let currentGameId = null;
  let currentPlayerId = null;

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      switch (data.type) {
        case 'JOIN_GAME':
          handleJoinGame(ws, data);
          break;
        
        case 'PLAYER_MOVE':
          handlePlayerMove(ws, data);
          break;
        
        case 'GAME_STATE':
          handleGameState(ws, data);
          break;
        
        case 'LEAVE_GAME':
          handleLeaveGame(ws, data);
          break;
        
        default:
          console.log('Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    if (currentGameId && currentPlayerId) {
      handleLeaveGame(ws, { gameId: currentGameId, playerId: currentPlayerId });
    }
  });

  function handleJoinGame(ws, data) {
    const { gameId, playerId, playerAddress } = data;
    
    currentGameId = gameId;
    currentPlayerId = playerId;

    // Create room if it doesn't exist
    if (!gameRooms.has(gameId)) {
      gameRooms.set(gameId, {
        players: new Map(),
        gameState: null,
      });
    }

    const room = gameRooms.get(gameId);
    
    // Add player to room
    room.players.set(playerId, {
      ws,
      playerAddress,
      connected: true,
    });

    playerConnections.set(ws, { gameId, playerId });

    console.log(`Player ${playerId} joined game ${gameId}`);

    // Notify all players in room
    broadcastToRoom(gameId, {
      type: 'PLAYER_JOINED',
      playerId,
      playerAddress,
      playerCount: room.players.size,
    });

    // Send current game state to new player if it exists
    if (room.gameState) {
      ws.send(JSON.stringify({
        type: 'GAME_STATE_UPDATE',
        gameState: room.gameState,
      }));
    }
  }

  function handlePlayerMove(ws, data) {
    const { gameId, playerId, direction, timestamp } = data;
    
    if (!gameRooms.has(gameId)) {
      console.error(`Game ${gameId} not found`);
      return;
    }

    // Broadcast move to all other players in the room
    broadcastToRoom(gameId, {
      type: 'PLAYER_MOVE',
      playerId,
      direction,
      timestamp,
    }, ws); // Exclude sender
  }

  function handleGameState(ws, data) {
    const { gameId, gameState } = data;
    
    if (!gameRooms.has(gameId)) {
      console.error(`Game ${gameId} not found`);
      return;
    }

    const room = gameRooms.get(gameId);
    room.gameState = gameState;

    // Broadcast game state to all players
    broadcastToRoom(gameId, {
      type: 'GAME_STATE_UPDATE',
      gameState,
    });
  }

  function handleLeaveGame(ws, data) {
    const { gameId, playerId } = data;
    
    if (!gameRooms.has(gameId)) {
      return;
    }

    const room = gameRooms.get(gameId);
    room.players.delete(playerId);

    console.log(`Player ${playerId} left game ${gameId}`);

    // Notify remaining players
    broadcastToRoom(gameId, {
      type: 'PLAYER_LEFT',
      playerId,
      playerCount: room.players.size,
    });

    // Clean up empty rooms
    if (room.players.size === 0) {
      gameRooms.delete(gameId);
      console.log(`Game room ${gameId} deleted (empty)`);
    }

    playerConnections.delete(ws);
  }

  function broadcastToRoom(gameId, message, excludeWs = null) {
    if (!gameRooms.has(gameId)) {
      return;
    }

    const room = gameRooms.get(gameId);
    const messageStr = JSON.stringify(message);

    room.players.forEach((player) => {
      if (player.ws !== excludeWs && player.ws.readyState === WebSocket.OPEN) {
        player.ws.send(messageStr);
      }
    });
  }
});

// Start server
server.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`);
  console.log(`ws://localhost:${PORT}`);
});

// Cleanup on exit
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  wss.close(() => {
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
});
