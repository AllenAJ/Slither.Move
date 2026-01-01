'use client';

import { useEffect, useRef, useState } from 'react';
import { SnakeGameEngine, GRID_WIDTH, GRID_HEIGHT, CELL_SIZE, Direction } from '../lib/game-engine';
import GameResults from './GameResults';
import { useGameWebSocket, AuthoritativeGameState } from '../hooks/useGameWebSocket';

interface SnakeGameProps {
  gameCreator: string;
  isPlayer1: boolean;
  walletAddress: string;
  isTwoPlayerMode?: boolean;
  onExit: () => void;
  onToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export default function SnakeGame({ gameCreator, isPlayer1, walletAddress, isTwoPlayerMode = false, onExit, onToast }: SnakeGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameEngine, setGameEngine] = useState<SnakeGameEngine | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(30);
  const timeRemainingRef = useRef<number>(30);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<number | null>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  
  // For Player 2: store the authoritative state received from Player 1
  const [syncedState, setSyncedState] = useState<AuthoritativeGameState | null>(null);

  const playerId = isPlayer1 ? 1 : 2;

  // WebSocket for real-time multiplayer
  const { connected, opponentConnected, opponentMoves, authoritativeState, sendMove, sendGameState } = useGameWebSocket({
    gameId: gameCreator,
    playerId,
    playerAddress: walletAddress,
    enabled: true,
  });

  // Player 2: Update synced state when receiving from Player 1
  useEffect(() => {
    if (!isPlayer1 && authoritativeState) {
      setSyncedState(authoritativeState);
      
      // Check if game is over from authoritative state
      if (authoritativeState.gameOver && !gameOver) {
        setWinner(authoritativeState.winner);
        setGameOver(true);
        
        if (authoritativeState.winner === playerId) {
          onToast('You won!', 'success');
        } else if (authoritativeState.winner === null) {
          onToast('It\'s a tie!', 'info');
        } else {
          onToast('You lost!', 'error');
        }
      }
    }
  }, [authoritativeState, isPlayer1, gameOver, playerId]);

  // Player 1: Apply opponent moves from WebSocket
  useEffect(() => {
    if (!isPlayer1 || !gameEngine || opponentMoves.length === 0) return;

    opponentMoves.forEach(move => {
      gameEngine.addInput(move.playerId, move.direction);
    });
  }, [opponentMoves, gameEngine, isPlayer1]);

  // Initialize game (only Player 1 runs the actual engine in two-player mode)
  useEffect(() => {
    const seed = gameCreator;
    const gameId = parseInt(gameCreator.slice(-8), 16);
    
    // Both players create an engine, but only Player 1's is authoritative in two-player mode
    const engine = new SnakeGameEngine(gameId, seed, isTwoPlayerMode);
    setGameEngine(engine);

    const modeText = isTwoPlayerMode ? 'two-player' : 'single-player';
    const roleText = isTwoPlayerMode ? (isPlayer1 ? ' (Host)' : ' (Client)') : '';
    onToast(`Game starting in ${modeText} mode${roleText}! Use arrow keys to move`, 'info');

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameCreator]);

  // Handle keyboard input
  useEffect(() => {
    if (gameOver) return;
    // Player 2 in two-player mode doesn't need local engine for input
    if (!isPlayer1 && isTwoPlayerMode && !gameEngine) return;
    if (isPlayer1 && !gameEngine) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      let direction: Direction | null = null;

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          direction = 'UP';
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          direction = 'DOWN';
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          direction = 'LEFT';
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          direction = 'RIGHT';
          break;
      }

      if (direction) {
        e.preventDefault();
        
        // Player 1: Add input to local engine
        // Player 2: Just send to Player 1 via WebSocket
        if (isPlayer1 && gameEngine) {
          gameEngine.addInput(playerId, direction);
        }
        
        // Both players broadcast their moves
        sendMove(direction);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameEngine, gameOver, playerId, isPlayer1, isTwoPlayerMode, sendMove]);

  // Game loop - Player 1 runs the game and broadcasts state
  useEffect(() => {
    if (!gameEngine || !canvasRef.current || gameOver) return;
    
    // In two-player mode, only Player 1 runs the game loop
    // Player 2 just renders the received state
    if (isTwoPlayerMode && !isPlayer1) {
      // Player 2: Render loop only (no game logic)
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const renderLoop = () => {
        if (syncedState) {
          renderState(ctx, syncedState);
          
          // Update timer from synced state
          const remaining = Math.ceil(syncedState.timeRemaining / 1000);
          if (timeRemainingRef.current !== remaining) {
            timeRemainingRef.current = remaining;
            setTimeRemaining(remaining);
          }
        }
        
        if (!gameOver) {
          animationFrameRef.current = requestAnimationFrame(renderLoop);
        }
      };

      animationFrameRef.current = requestAnimationFrame(renderLoop);

      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }

    // Player 1 (or single-player): Full game loop
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gameLoop = (timestamp: number) => {
      // Update game state
      gameEngine.update(timestamp);

      // Render
      render(ctx, gameEngine);

      // Update timer
      const remaining = Math.ceil(gameEngine.getTimeRemaining() / 1000);
      if (timeRemainingRef.current !== remaining) {
        timeRemainingRef.current = remaining;
        setTimeRemaining(remaining);
      }

      // Player 1 in two-player mode: Broadcast state to Player 2
      if (isTwoPlayerMode && isPlayer1) {
        const state = gameEngine.getState();
        sendGameState({
          player1: {
            body: state.player1.body,
            direction: state.player1.direction,
            score: state.player1.score,
            alive: state.player1.alive,
          },
          player2: {
            body: state.player2.body,
            direction: state.player2.direction,
            score: state.player2.score,
            alive: state.player2.alive,
          },
          apples: state.apples,
          timeRemaining: gameEngine.getTimeRemaining(),
          gameOver: gameEngine.isGameOver(),
          winner: gameEngine.getWinner(),
          inputs: state.inputs,
        });
      }

      // Check if game is over
      if (gameEngine.isGameOver()) {
        const winnerNum = gameEngine.getWinner();
        setWinner(winnerNum);
        setGameOver(true);
        
        if (winnerNum === playerId) {
          onToast('You won!', 'success');
        } else if (winnerNum === null) {
          onToast('It\'s a tie!', 'info');
        } else {
          onToast('You lost!', 'error');
        }
        return;
      }

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameEngine, gameOver, playerId, isPlayer1, isTwoPlayerMode, syncedState, sendGameState]);

  // Render function for Player 1's local engine
  const render = (ctx: CanvasRenderingContext2D, engine: SnakeGameEngine) => {
    const state = engine.getState();
    renderGameState(ctx, state.player1, state.player2, state.apples);
  };

  // Render function for Player 2's synced state
  const renderState = (ctx: CanvasRenderingContext2D, state: AuthoritativeGameState) => {
    renderGameState(ctx, state.player1, state.player2, state.apples);
  };

  // Common render function
  const renderGameState = (
    ctx: CanvasRenderingContext2D, 
    player1: any, 
    player2: any, 
    apples: any[]
  ) => {
    // Clear canvas
    ctx.fillStyle = '#050508'; // Dark background
    ctx.fillRect(0, 0, GRID_WIDTH * CELL_SIZE, GRID_HEIGHT * CELL_SIZE);

    // Draw grid
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 1;
    for (let x = 0; x <= GRID_WIDTH; x++) {
      ctx.beginPath();
      ctx.moveTo(x * CELL_SIZE, 0);
      ctx.lineTo(x * CELL_SIZE, GRID_HEIGHT * CELL_SIZE);
      ctx.stroke();
    }
    for (let y = 0; y <= GRID_HEIGHT; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * CELL_SIZE);
      ctx.lineTo(GRID_WIDTH * CELL_SIZE, y * CELL_SIZE);
      ctx.stroke();
    }

    // Draw apples
    apples.forEach(apple => {
      ctx.fillStyle = '#ff4444';
      ctx.shadowColor = '#ff4444';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(
        apple.x * CELL_SIZE + CELL_SIZE / 2,
        apple.y * CELL_SIZE + CELL_SIZE / 2,
        CELL_SIZE / 2 - 2,
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.shadowBlur = 0; // Reset shadow
      
      // Apple highlight
      ctx.fillStyle = '#ff8888';
      ctx.beginPath();
      ctx.arc(
        apple.x * CELL_SIZE + CELL_SIZE / 2 - 2,
        apple.y * CELL_SIZE + CELL_SIZE / 2 - 2,
        CELL_SIZE / 4,
        0,
        Math.PI * 2
      );
      ctx.fill();
    });

    // Draw player 1 snake (Neon Green)
    if (player1.alive) {
      player1.body.forEach((segment: any, index: number) => {
        ctx.fillStyle = index === 0 ? '#00FF9D' : '#00cc7d';
        ctx.shadowColor = '#00FF9D';
        ctx.shadowBlur = index === 0 ? 15 : 5;
        
        ctx.fillRect(
          segment.x * CELL_SIZE + 1,
          segment.y * CELL_SIZE + 1,
          CELL_SIZE - 2,
          CELL_SIZE - 2
        );
        ctx.shadowBlur = 0;
        
        // Draw eyes on head
        if (index === 0) {
          ctx.fillStyle = 'black';
          const eyeSize = 3;
          const eyeOffset = 4;
          ctx.fillRect(segment.x * CELL_SIZE + eyeOffset, segment.y * CELL_SIZE + eyeOffset, eyeSize, eyeSize);
          ctx.fillRect(segment.x * CELL_SIZE + CELL_SIZE - eyeOffset - eyeSize, segment.y * CELL_SIZE + eyeOffset, eyeSize, eyeSize);
        }
      });
    }

    // Draw player 2 snake (Neon Pink)
    if (player2.alive) {
      player2.body.forEach((segment: any, index: number) => {
        ctx.fillStyle = index === 0 ? '#FF00FF' : '#cc00cc';
        ctx.shadowColor = '#FF00FF';
        ctx.shadowBlur = index === 0 ? 15 : 5;

        ctx.fillRect(
          segment.x * CELL_SIZE + 1,
          segment.y * CELL_SIZE + 1,
          CELL_SIZE - 2,
          CELL_SIZE - 2
        );
        ctx.shadowBlur = 0;
        
        // Draw eyes on head
        if (index === 0) {
          ctx.fillStyle = 'black';
          const eyeSize = 3;
          const eyeOffset = 4;
          ctx.fillRect(segment.x * CELL_SIZE + eyeOffset, segment.y * CELL_SIZE + eyeOffset, eyeSize, eyeSize);
          ctx.fillRect(segment.x * CELL_SIZE + CELL_SIZE - eyeOffset - eyeSize, segment.y * CELL_SIZE + eyeOffset, eyeSize, eyeSize);
        }
      });
    }
  };

  if (gameOver && gameEngine) {
    return (
      <GameResults
        gameEngine={gameEngine}
        winner={winner}
        isPlayer1={isPlayer1}
        gameCreator={gameCreator}
        walletAddress={walletAddress}
        onExit={onExit}
        onToast={onToast}
      />
    );
  }

  // Get current state - use synced state for Player 2 in two-player mode
  const state = (!isPlayer1 && isTwoPlayerMode && syncedState) 
    ? syncedState 
    : gameEngine?.getState();
  
  // Get player-specific inputs
  const getPlayerInputs = (pId: number) => {
    if (!state?.inputs) return [];
    return state.inputs.filter((input: any) => input.playerId === pId).slice(-20) || [];
  };

  const player1Inputs = getPlayerInputs(1);
  const player2Inputs = getPlayerInputs(2);
  const gameHash = gameEngine?.generateGameHash().slice(0, 8) || '';

  return (
    <div className="min-h-screen flex flex-col gap-4 justify-center items-center p-4 bg-black">


      {/* Center Game Area */}
      <div className="flex flex-col gap-4">
        {/* Game Header */}
        <div className="w-full max-w-4xl">
        <div 
          className="bg-black/90 p-4 flex justify-between items-center border-t-2 border-b-2 border-neon-green"
          style={{
            boxShadow: '0 0 20px rgba(0, 255, 157, 0.2)'
          }}
        >
          <div className="flex gap-8 items-center">
            {/* WebSocket Status */}
            <div className="text-center">
              <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Link</div>
              <div className="text-sm flex gap-1 justify-center">
                <span className={`w-2 h-2 ${connected ? 'bg-neon-green shadow-[0_0_5px_#00FF9D]' : 'bg-red-500'}`}></span>
                <span className={`w-2 h-2 ${opponentConnected ? 'bg-neon-green shadow-[0_0_5px_#00FF9D]' : 'bg-gray-800'}`}></span>
              </div>
            </div>

            {/* Player 1 Score */}
            <div className="text-center">
              <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">P1 {isPlayer1 && '(YOU)'}</div>
              <div className="text-2xl font-black font-mono" style={{ color: '#00FF9D', textShadow: '0 0 10px rgba(0,255,157,0.5)' }}>
                {state?.player1.score || 0}<span className="text-gray-700 text-sm">/5</span>
              </div>
            </div>

            {/* Timer */}
            <div className="text-center min-w-[80px]">
              <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Time</div>
              <div className={`text-3xl font-black font-mono ${timeRemaining <= 10 ? 'text-neon-pink animate-pulse' : 'text-white'}`}>
                {timeRemaining}
              </div>
            </div>

            {/* Player 2 Score */}
            <div className="text-center">
              <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">P2 {!isPlayer1 && '(YOU)'}</div>
              <div className="text-2xl font-black font-mono" style={{ color: '#FF00FF', textShadow: '0 0 10px rgba(255,0,255,0.5)' }}>
                {state?.player2.score || 0}<span className="text-gray-700 text-sm">/5</span>
              </div>
            </div>
          </div>

          <button
            onClick={onExit}
            className="px-6 py-2 bg-red-900/20 border border-red-500 text-red-500 font-mono text-sm uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all"
          >
            Abort
          </button>
        </div>
      </div>

      {/* Game Canvas */}
      <div 
        className="game-canvas-container relative"
      >
        {/* CRT Scanline Effect Overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-10"></div>
        
        <canvas
          ref={canvasRef}
          width={GRID_WIDTH * CELL_SIZE}
          height={GRID_HEIGHT * CELL_SIZE}
          className="block"
        />
      </div>

        {/* Move History / Hash (Moved below canvas) */}
        <div className="w-full max-w-4xl grid grid-cols-2 gap-4">
            {/* Player 1 History */}
            <div 
              className="bg-black/80 rounded-none p-2 text-white border border-neon-green/30"
              style={{ boxShadow: '0 0 10px rgba(0, 255, 157, 0.1)' }}
            >
              <div className="flex justify-between items-center mb-2 border-b border-gray-800 pb-1">
                <div className="text-xs font-mono uppercase tracking-widest">
                    <span style={{ color: '#00FF9D' }}>P1</span> {isPlayer1 && '(YOU)'}
                </div>
                <div className="text-[10px] text-gray-500 font-mono">HASH: {gameHash}</div>
              </div>
              <div className="flex flex-wrap gap-1">
                {player1Inputs.slice(-14).map((input, idx) => (
                  <div
                    key={idx}
                    className="w-5 h-5 flex items-center justify-center font-bold text-[8px] border border-gray-800"
                    style={{
                      backgroundColor: input.direction === 'UP' || input.direction === 'DOWN' ? 'rgba(0, 255, 157, 0.2)' : 'rgba(255, 170, 0, 0.2)',
                      color: input.direction === 'UP' || input.direction === 'DOWN' ? '#00FF9D' : '#ffaa00'
                    }}
                  >
                    {input.direction[0]}
                  </div>
                ))}
              </div>
            </div>

            {/* Player 2 History */}
            <div 
              className="bg-black/80 rounded-none p-2 text-white border border-neon-pink/30"
              style={{ boxShadow: '0 0 10px rgba(255, 0, 255, 0.1)' }}
            >
              <div className="flex justify-between items-center mb-2 border-b border-gray-800 pb-1">
                <div className="text-xs font-mono uppercase tracking-widest">
                    <span style={{ color: '#FF00FF' }}>P2</span> {!isPlayer1 && '(YOU)'}
                </div>
                <div className="text-[10px] text-gray-500 font-mono">HASH: {gameHash}</div>
              </div>
              <div className="flex flex-wrap gap-1">
                {player2Inputs.slice(-14).map((input, idx) => (
                  <div
                    key={idx}
                    className="w-5 h-5 flex items-center justify-center font-bold text-[8px] border border-gray-800"
                    style={{
                      backgroundColor: input.direction === 'RIGHT' || input.direction === 'LEFT' ? 'rgba(255, 0, 255, 0.2)' : 'rgba(255, 170, 0, 0.2)',
                      color: input.direction === 'RIGHT' || input.direction === 'LEFT' ? '#FF00FF' : '#ffaa00'
                    }}
                  >
                    {input.direction[0]}
                  </div>
                ))}
              </div>
            </div>
        </div>

        {/* Controls */}
        <div className="w-full max-w-4xl text-center">
            <p className="text-xs text-gray-500 uppercase tracking-widest font-mono">
              <span className="text-neon-green">WASD / ARROWS</span> to Navigate • <span className="text-neon-pink">COLLISION</span> = TERMINATION
            </p>
        </div>
      </div>

      {/* Player 2 Moves Panel (Removed - now below) */}
    </div>
  );
}
