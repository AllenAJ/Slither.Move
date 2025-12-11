# SlitherMoney 🐍💰

A real-time multiplayer snake game built on the Movement Network where players stake MOVE tokens to compete in 30-second battles.

## Features

- 🎮 **Real-time Multiplayer** - WebSocket-powered snake battles
- 💰 **Stake-based Gaming** - Bet MOVE tokens, winner takes all
- 🔐 **Trustless Escrow** - Smart contract handles all payouts
- 🌐 **Multiple Wallet Support** - Privy social login or native Aptos wallets
- ⚡ **Fast Gameplay** - 30-second matches with instant results

## Tech Stack

- **Frontend**: Next.js 16 + React + Tailwind CSS
- **Blockchain**: Movement Network (Aptos-based)
- **Smart Contracts**: Move language
- **Wallet Integration**: Privy + Aptos Wallet Adapter
- **Real-time**: WebSocket (Socket.io)

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Movement CLI (for contract deployment)

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

Edit `.env.local` and add your Privy App ID:
```
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id_here
NEXT_PUBLIC_WS_URL=ws://localhost:3001
```

4. Start the development servers:
```bash
./start-all.sh
```

This will start:
- WebSocket server on port 3001
- Next.js app on port 3000

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Smart Contract

The game uses a Move smart contract deployed on Movement Testnet (Bardock).

Contract address: `0xf2fa21daeb741e9ea472603a1f4f0e189c3b9b0907a52128bc4e4218aaddb04b`

### Contract Functions

- `create_game(stake_amount)` - Create a new game with stake
- `join_game(game_creator)` - Join an existing game
- `submit_result(game_creator, score)` - Submit game results
- `claim_winnings(game_creator)` - Claim winnings after winning

## How to Play

1. **Connect Wallet** - Use Privy social login or Aptos wallet
2. **Create or Join Game** - Set your stake amount or join an opponent
3. **Play Snake** - Collect apples in a 30-second battle
4. **Claim Winnings** - Winner claims the full pot from the smart contract

### Game Rules

- 30-second matches
- Most apples collected wins
- Collision with walls or self = instant loss
- Draws return stakes to both players
- Single-player fallback if no opponent joins

## Project Structure

```
├── app/
│   ├── components/     # React components
│   ├── lib/           # Game engine & blockchain transactions
│   ├── hooks/         # Custom React hooks
│   └── page.tsx       # Main app page
├── server/            # WebSocket server
├── modules/           # Move smart contracts
│   └── sources/       # Contract source files
└── start-all.sh       # Start script
```

## Development

### Running Tests

```bash
npm test
```

### Building for Production

```bash
npm run build
npm start
```

### Deploying Smart Contracts

```bash
cd modules
movement move publish --named-addresses slither=default,counter=default --assume-yes
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE file for details

## Acknowledgments

- Built for the Movement Network Hackathon
- Powered by Movement Network and Aptos
- Wallet integration by Privy

## Support

For issues and questions, please open an issue on GitHub.

---

Built with ❤️ for the Movement Network Hackathon
