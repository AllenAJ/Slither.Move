import { sha256 } from 'js-sha256';

export const GRID_WIDTH = 40;
export const GRID_HEIGHT = 30;
export const CELL_SIZE = 15;
export const GAME_DURATION = 30000; // 30 seconds in ms
export const APPLES_TO_WIN = 5;

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export interface Position {
  x: number;
  y: number;
}

export interface Snake {
  body: Position[];
  direction: Direction;
  nextDirection: Direction;
  score: number;
  alive: boolean;
}

export interface GameInput {
  timestamp: number;
  direction: Direction;
  playerId: number;
}

export interface GameState {
  player1: Snake;
  player2: Snake;
  apples: Position[];
  gameStartTime: number;
  gameEndTime: number;
  inputs: GameInput[];
  seed: string;
  gameId: number;
}

export class SnakeGameEngine {
  private state: GameState;
  private lastUpdateTime: number = 0;
  private updateInterval: number = 100; // Update every 100ms
  private initialized: boolean = false;
  private isTwoPlayerMode: boolean = false;

  constructor(gameId: number, seed: string, isTwoPlayerMode: boolean = false) {
    this.isTwoPlayerMode = isTwoPlayerMode;
    this.state = this.initializeGame(gameId, seed);
  }

  private initializeGame(gameId: number, seed: string): GameState {
    const now = Date.now();
    
    return {
      player1: {
        body: [
          { x: 10, y: 15 },
          { x: 9, y: 15 },
          { x: 8, y: 15 },
        ],
        direction: 'RIGHT',
        nextDirection: 'RIGHT',
        score: 0,
        alive: true,
      },
      player2: {
        body: [
          { x: 30, y: 15 },
          { x: 31, y: 15 },
          { x: 32, y: 15 },
        ],
        direction: 'LEFT',
        nextDirection: 'LEFT',
        score: 0,
        alive: true,
      },
      apples: [],
      gameStartTime: now,
      gameEndTime: now + GAME_DURATION,
      inputs: [],
      seed,
      gameId,
    };
  }

  public getState(): GameState {
    return this.state;
  }

  public addInput(playerId: number, direction: Direction): void {
    const input: GameInput = {
      timestamp: Date.now(),
      direction,
      playerId,
    };
    
    this.state.inputs.push(input);

    // Update next direction for the player
    if (playerId === 1) {
      if (this.isValidDirectionChange(this.state.player1.direction, direction)) {
        this.state.player1.nextDirection = direction;
      }
    } else {
      if (this.isValidDirectionChange(this.state.player2.direction, direction)) {
        this.state.player2.nextDirection = direction;
      }
    }
  }

  private isValidDirectionChange(current: Direction, next: Direction): boolean {
    // Can't reverse direction
    if (current === 'UP' && next === 'DOWN') return false;
    if (current === 'DOWN' && next === 'UP') return false;
    if (current === 'LEFT' && next === 'RIGHT') return false;
    if (current === 'RIGHT' && next === 'LEFT') return false;
    return true;
  }

  public update(currentTime: number): void {
    // Initialize lastUpdateTime on first call
    if (!this.initialized) {
      this.lastUpdateTime = currentTime;
      this.initialized = true;
      return;
    }

    if (currentTime - this.lastUpdateTime < this.updateInterval) {
      return;
    }

    this.lastUpdateTime = currentTime;

    // Check if game is over
    if (currentTime >= this.state.gameEndTime) {
      return;
    }

    // Spawn apples if needed
    while (this.state.apples.length < 3) {
      this.spawnApple();
    }

    // Update snakes
    if (this.state.player1.alive) {
      this.updateSnake(this.state.player1);
    }
    if (this.state.player2.alive) {
      this.updateSnake(this.state.player2);
    }

    // Check collisions
    this.checkCollisions();
  }

  private updateSnake(snake: Snake): void {
    // Update direction
    snake.direction = snake.nextDirection;

    // Calculate new head position
    const head = snake.body[0];
    let newHead: Position;

    switch (snake.direction) {
      case 'UP':
        newHead = { x: head.x, y: head.y - 1 };
        break;
      case 'DOWN':
        newHead = { x: head.x, y: head.y + 1 };
        break;
      case 'LEFT':
        newHead = { x: head.x - 1, y: head.y };
        break;
      case 'RIGHT':
        newHead = { x: head.x + 1, y: head.y };
        break;
    }

    // Add new head
    snake.body.unshift(newHead);

    // Check if ate apple
    const ateApple = this.checkAppleCollision(newHead);
    if (!ateApple) {
      // Remove tail if didn't eat apple
      snake.body.pop();
    } else {
      snake.score++;
    }
  }

  private checkAppleCollision(position: Position): boolean {
    const appleIndex = this.state.apples.findIndex(
      apple => apple.x === position.x && apple.y === position.y
    );

    if (appleIndex !== -1) {
      this.state.apples.splice(appleIndex, 1);
      return true;
    }

    return false;
  }

  private checkCollisions(): void {
    // Check wall collisions
    this.checkWallCollision(this.state.player1);
    this.checkWallCollision(this.state.player2);

    // Check self collisions
    this.checkSelfCollision(this.state.player1);
    this.checkSelfCollision(this.state.player2);

    // Check snake-to-snake collisions
    this.checkSnakeCollision(this.state.player1, this.state.player2);
    this.checkSnakeCollision(this.state.player2, this.state.player1);
  }

  private checkWallCollision(snake: Snake): void {
    if (!snake.alive) return;

    const head = snake.body[0];
    if (head.x < 0 || head.x >= GRID_WIDTH || head.y < 0 || head.y >= GRID_HEIGHT) {
      snake.alive = false;
    }
  }

  private checkSelfCollision(snake: Snake): void {
    if (!snake.alive) return;

    const head = snake.body[0];
    for (let i = 1; i < snake.body.length; i++) {
      if (head.x === snake.body[i].x && head.y === snake.body[i].y) {
        snake.alive = false;
        break;
      }
    }
  }

  private checkSnakeCollision(snake1: Snake, snake2: Snake): void {
    if (!snake1.alive || !snake2.alive) return;

    const head1 = snake1.body[0];
    
    // Check collision with other snake's body
    for (const segment of snake2.body) {
      if (head1.x === segment.x && head1.y === segment.y) {
        snake1.alive = false;
        break;
      }
    }
  }

  private spawnApple(): void {
    const appleIndex = this.state.apples.length;
    const inputsHash = this.state.inputs.map(i => `${i.playerId}${i.direction}${i.timestamp}`).join('');
    const position = this.generateApplePosition(appleIndex, inputsHash);
    
    // Make sure apple doesn't spawn on snakes
    const isOnSnake = this.isPositionOccupied(position);
    if (!isOnSnake) {
      this.state.apples.push(position);
    }
  }

  private generateApplePosition(appleIndex: number, inputsHash: string): Position {
    const hash = sha256(
      this.state.seed + 
      this.state.gameId + 
      appleIndex + 
      inputsHash
    );
    
    const x = parseInt(hash.slice(0, 8), 16) % GRID_WIDTH;
    const y = parseInt(hash.slice(8, 16), 16) % GRID_HEIGHT;
    
    return { x, y };
  }

  private isPositionOccupied(position: Position): boolean {
    // Check player 1
    for (const segment of this.state.player1.body) {
      if (segment.x === position.x && segment.y === position.y) {
        return true;
      }
    }

    // Check player 2
    for (const segment of this.state.player2.body) {
      if (segment.x === position.x && segment.y === position.y) {
        return true;
      }
    }

    return false;
  }

  public isGameOver(): boolean {
    const timeUp = Date.now() >= this.state.gameEndTime;
    const player1Won = this.state.player1.score >= APPLES_TO_WIN;
    const player2Won = this.state.player2.score >= APPLES_TO_WIN;
    
    // In single-player mode, only end if player1 dies or time up or wins
    if (!this.isTwoPlayerMode) {
      return timeUp || player1Won || !this.state.player1.alive;
    }
    
    // In two-player mode, end if both dead OR one player wins
    const bothDead = !this.state.player1.alive && !this.state.player2.alive;
    
    return timeUp || player1Won || player2Won || bothDead;
  }

  public getWinner(): number | null {
    if (!this.isGameOver()) return null;

    // Single-player mode
    if (!this.isTwoPlayerMode) {
      // Player 1 wins if they reached 5 apples
      if (this.state.player1.score >= APPLES_TO_WIN) return 1;
      // Player 1 loses if they died before reaching 5 apples
      if (!this.state.player1.alive) return null; // No winner in single-player death
      // Time ran out - player 1 wins if they have any score
      return this.state.player1.score > 0 ? 1 : null;
    }

    // Two-player mode
    // Check if someone reached 5 apples
    if (this.state.player1.score >= APPLES_TO_WIN) return 1;
    if (this.state.player2.score >= APPLES_TO_WIN) return 2;

    // Check if someone died (other player wins)
    if (!this.state.player1.alive && this.state.player2.alive) return 2;
    if (!this.state.player2.alive && this.state.player1.alive) return 1;

    // If both alive or both dead, use score
    if (this.state.player1.score > this.state.player2.score) return 1;
    if (this.state.player2.score > this.state.player1.score) return 2;

    // Tie
    return null;
  }

  public generateGameHash(): string {
    // Sort inputs by timestamp to ensure consistent ordering
    const sortedInputs = [...this.state.inputs].sort((a, b) => a.timestamp - b.timestamp);
    
    // Don't include timestamps in hash - they'll differ between clients
    // Just include the sequence of moves
    const inputsString = sortedInputs
      .map(i => `${i.playerId}:${i.direction}`)
      .join('|');
    
    const stateString = `${this.state.seed}|${this.state.gameId}|${inputsString}|${this.state.player1.score}|${this.state.player2.score}`;
    
    return sha256(stateString);
  }

  public getTimeRemaining(): number {
    return Math.max(0, this.state.gameEndTime - Date.now());
  }
}
