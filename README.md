# SLITHER.MOVE

A high-stakes, real-time multiplayer snake game built on the Movement Network. Players stake MOVE tokens to compete in 30-second battles where the winner takes the entire pot.

## Core Features

- **Real-time Multiplayer**: Low-latency snake battles powered by WebSockets.
- **Stake-based Competition**: Competitive matchmaking where players wager MOVE tokens.
- **Trustless Escrow**: Smart contract-managed payouts ensuring security and transparency.
- **Hybrid Wallet Integration**: Support for both social logins via Privy and native Aptos/Movement wallets.
- **High-performance Gameplay**: Optimized 30-second matches designed for quick engagement.

## Tech Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS
- **Blockchain**: Movement Network (Bardock Testnet)
- **Smart Contracts**: Move Language
- **Wallet Infrastructure**: Privy, Aptos Wallet Adapter
- **Backend/Real-time**: Node.js, WebSocket (Socket.io)

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Movement CLI (for contract interaction/deployment)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/AllenAJ/Slither.git
cd Slither
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` to include your configuration:
```
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id_here
NEXT_PUBLIC_WS_URL=ws://localhost:3001
```

4. Start the development environment:
```bash
chmod +x start-all.sh
./start-all.sh
```

This command initializes:
- WebSocket server (Port 3001)
- Next.js application (Port 3000)

## Smart Contract Architecture

The application utilizes a Move smart contract deployed on the Movement Bardock Testnet.

**Contract Address**: `0xf2fa21daeb741e9ea472603a1f4f0e189c3b9b0907a52128bc4e4218aaddb04b`

### Primary Entry Functions

- `create_game(stake_amount)`: Initializes a new game lobby and locks the host's stake.
- `join_game(game_creator)`: Allows a challenger to join and match the stake.
- `submit_result(game_creator, score, won)`: Submits the verified game outcome.
- `claim_winnings(game_creator)`: Facilitates the trustless transfer of the pot to the winner.

## Gameplay Mechanics

1. **Authentication**: Connect via social account (Privy) or native wallet.
2. **Lobby Management**: Host a new session with a custom stake or join an existing challenger.
3. **The Arena**: Navigate the arena to collect apples while avoiding collisions and the opponent.
4. **Settlement**: The winner claims the aggregated stake directly from the smart contract.

### Game Rules
- 30-second time limit per match.
- Most apples collected determines the winner.
- Collisions with walls or the player's own body result in an immediate loss.
- In the event of a draw, stakes are returned to both participants.

## Project Structure

```
├── app/
│   ├── components/     # UI and Game components
│   ├── lib/           # Game engine and Move transaction logic
│   ├── hooks/         # Custom React hooks for WebSockets
│   └── page.tsx       # Main application entry point
├── server/            # WebSocket synchronization server
├── modules/           # Move smart contracts (sources and build files)
└── start-all.sh       # Unified startup script
```

## Development and Deployment

### Local Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm start
```

### Smart Contract Deployment
```bash
cd modules
movement move publish --named-addresses slither=default,counter=default --assume-yes
```

## Acknowledgments

- Developed for the Movement Network Hackathon.
- Infrastructure provided by Movement Labs and Aptos.
- Authentication powered by Privy.

---

Developed for the Movement Network Hackathon.
