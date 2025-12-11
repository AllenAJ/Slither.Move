import { useEffect, useRef, useState, useCallback } from 'react';

interface PlayerMove {
  playerId: number;
  direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
  timestamp: number;
}

export interface AuthoritativeGameState {
  player1: {
    body: { x: number; y: number }[];
    direction: string;
    score: number;
    alive: boolean;
  };
  player2: {
    body: { x: number; y: number }[];
    direction: string;
    score: number;
    alive: boolean;
  };
  apples: { x: number; y: number }[];
  timeRemaining: number;
  gameOver: boolean;
  winner: number | null;
  inputs: any[];
}

interface UseGameWebSocketProps {
  gameId: string;
  playerId: number;
  playerAddress: string;
  enabled: boolean;
}

export function useGameWebSocket({ gameId, playerId, playerAddress, enabled }: UseGameWebSocketProps) {
  const ws = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [opponentMoves, setOpponentMoves] = useState<PlayerMove[]>([]);
  const [opponentConnected, setOpponentConnected] = useState(false);
  const [authoritativeState, setAuthoritativeState] = useState<AuthoritativeGameState | null>(null);

  const connect = useCallback(() => {
    if (!enabled || ws.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';
    console.log('[WebSocket] Connecting to:', wsUrl);

    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log('[WebSocket] Connected');
      setConnected(true);

      // Join game room
      socket.send(JSON.stringify({
        type: 'JOIN_GAME',
        gameId,
        playerId,
        playerAddress,
      }));
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'PLAYER_JOINED':
            console.log('[WebSocket] Player joined:', data.playerId);
            if (data.playerId !== playerId) {
              setOpponentConnected(true);
            }
            break;

          case 'PLAYER_LEFT':
            console.log('[WebSocket] Player left:', data.playerId);
            if (data.playerId !== playerId) {
              setOpponentConnected(false);
            }
            break;

          case 'PLAYER_MOVE':
            if (data.playerId !== playerId) {
              setOpponentMoves(prev => [...prev, {
                playerId: data.playerId,
                direction: data.direction,
                timestamp: data.timestamp,
              }]);
            }
            break;

          case 'GAME_STATE_UPDATE':
            // Player 2 receives authoritative state from Player 1
            if (playerId === 2 && data.gameState) {
              setAuthoritativeState(data.gameState);
            }
            break;

          default:
            console.log('[WebSocket] Unknown message:', data.type);
        }
      } catch (error) {
        console.error('[WebSocket] Error parsing message:', error);
      }
    };

    socket.onerror = (error) => {
      console.error('[WebSocket] Error:', error);
    };

    socket.onclose = () => {
      console.log('[WebSocket] Disconnected');
      setConnected(false);
      setOpponentConnected(false);

      // Attempt to reconnect after 3 seconds
      if (enabled) {
        setTimeout(() => {
          console.log('[WebSocket] Attempting to reconnect...');
          connect();
        }, 3000);
      }
    };

    ws.current = socket;
  }, [enabled, gameId, playerId, playerAddress]);

  const sendMove = useCallback((direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'PLAYER_MOVE',
        gameId,
        playerId,
        direction,
        timestamp: Date.now(),
      }));
    }
  }, [gameId, playerId]);

  const sendGameState = useCallback((gameState: AuthoritativeGameState) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'GAME_STATE',
        gameId,
        gameState,
      }));
    }
  }, [gameId]);

  const disconnect = useCallback(() => {
    if (ws.current) {
      // Only send if connection is open
      if (ws.current.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({
          type: 'LEAVE_GAME',
          gameId,
          playerId,
        }));
      }
      ws.current.close();
      ws.current = null;
    }
    setConnected(false);
    setOpponentConnected(false);
  }, [gameId, playerId]);

  useEffect(() => {
    if (enabled) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  return {
    connected,
    opponentConnected,
    opponentMoves,
    authoritativeState,
    sendMove,
    sendGameState,
    disconnect,
  };
}
