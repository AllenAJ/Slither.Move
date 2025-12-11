module slither::game_v2 {
    use std::signer;
    use aptos_framework::coin::{Self, Coin};
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::timestamp;

    /// Error codes
    const E_NOT_INITIALIZED: u64 = 1;
    const E_GAME_NOT_FOUND: u64 = 2;
    const E_INVALID_STAKE: u64 = 3;
    const E_GAME_FULL: u64 = 4;
    const E_NOT_PLAYER: u64 = 6;
    const E_ALREADY_SUBMITTED: u64 = 7;
    const E_NOT_READY_TO_CLAIM: u64 = 8;
    const E_UNAUTHORIZED: u64 = 9;
    const E_ALREADY_CLAIMED: u64 = 10;

    /// Game status constants
    const STATUS_WAITING: u8 = 0;
    const STATUS_ACTIVE: u8 = 1;
    const STATUS_COMPLETED: u8 = 2;
    const STATUS_CLAIMED: u8 = 3;

    /// Platform fee in basis points (100 = 1%)
    const PLATFORM_FEE_BPS: u64 = 200; // 2%
    const BPS_DENOMINATOR: u64 = 10000;

    /// Minimum stake amount (0.1 MOVE = 10000000 octas)
    const MIN_STAKE: u64 = 10000000;

    /// Game structure with escrow
    struct GameInfo has key {
        game_id: u64,
        player1: address,
        player2: address,
        stake_amount: u64,
        status: u8,
        winner: address,
        player1_score: u64,
        player2_score: u64,
        player1_submitted: bool,
        player2_submitted: bool,
        created_at: u64,
        escrow: Coin<AptosCoin>, // Holds both players' stakes
    }

    /// Registry to track game counter
    struct GameRegistry has key {
        next_game_id: u64,
        treasury: address,
    }

    /// Player statistics
    struct PlayerStats has key {
        games_played: u64,
        games_won: u64,
        total_won: u64,
    }

    /// Initialize the game registry
    public entry fun initialize(deployer: &signer) {
        let deployer_addr = signer::address_of(deployer);
        
        if (!exists<GameRegistry>(deployer_addr)) {
            move_to(deployer, GameRegistry {
                next_game_id: 1,
                treasury: deployer_addr,
            });
        };
    }

    /// Create a new game with escrow
    public entry fun create_game(
        player: &signer,
        stake_amount: u64,
        registry_addr: address
    ) acquires GameRegistry, GameInfo {
        assert!(stake_amount >= MIN_STAKE, E_INVALID_STAKE);
        assert!(exists<GameRegistry>(registry_addr), E_NOT_INITIALIZED);

        let player_addr = signer::address_of(player);
        
        // Delete old game if it exists
        if (exists<GameInfo>(player_addr)) {
            let GameInfo { 
                game_id: _, 
                player1: _, 
                player2: _, 
                stake_amount: _, 
                status: _, 
                winner: _, 
                player1_score: _, 
                player2_score: _, 
                player1_submitted: _, 
                player2_submitted: _,
                created_at: _,
                escrow: old_escrow,
            } = move_from<GameInfo>(player_addr);
            
            // Return any remaining escrow funds
            if (coin::value(&old_escrow) > 0) {
                coin::deposit(player_addr, old_escrow);
            } else {
                coin::destroy_zero(old_escrow);
            };
        };
        
        let registry = borrow_global_mut<GameRegistry>(registry_addr);
        let game_id = registry.next_game_id;
        registry.next_game_id = game_id + 1;

        // Withdraw stake and put in escrow
        let stake = coin::withdraw<AptosCoin>(player, stake_amount);

        // Create game info with escrow
        move_to(player, GameInfo {
            game_id,
            player1: player_addr,
            player2: @0x0,
            stake_amount,
            status: STATUS_WAITING,
            winner: @0x0,
            player1_score: 0,
            player2_score: 0,
            player1_submitted: false,
            player2_submitted: false,
            created_at: timestamp::now_microseconds(),
            escrow: stake,
        });

        // Initialize player stats if needed
        if (!exists<PlayerStats>(player_addr)) {
            move_to(player, PlayerStats {
                games_played: 0,
                games_won: 0,
                total_won: 0,
            });
        };
    }

    /// Join an existing game
    public entry fun join_game(
        player: &signer,
        game_creator: address,
    ) acquires GameInfo {
        let player_addr = signer::address_of(player);
        
        assert!(exists<GameInfo>(game_creator), E_GAME_NOT_FOUND);
        let game = borrow_global_mut<GameInfo>(game_creator);
        
        assert!(game.status == STATUS_WAITING, E_GAME_FULL);
        assert!(game.player2 == @0x0, E_GAME_FULL);
        assert!(game.player1 != player_addr, E_INVALID_STAKE);

        // Withdraw stake from player2 and add to escrow
        let stake = coin::withdraw<AptosCoin>(player, game.stake_amount);
        coin::merge(&mut game.escrow, stake);

        // Update game
        game.player2 = player_addr;
        game.status = STATUS_ACTIVE;

        // Initialize player stats if needed
        if (!exists<PlayerStats>(player_addr)) {
            move_to(player, PlayerStats {
                games_played: 0,
                games_won: 0,
                total_won: 0,
            });
        };
    }

    /// Submit game result
    public entry fun submit_result(
        player: &signer,
        game_creator: address,
        score: u64,
        won: bool,
    ) acquires GameInfo {
        let player_addr = signer::address_of(player);
        
        assert!(exists<GameInfo>(game_creator), E_GAME_NOT_FOUND);
        let game = borrow_global_mut<GameInfo>(game_creator);
        
        // Allow submission if game is ACTIVE or if it's WAITING and player is the creator (single-player mode)
        assert!(
            game.status == STATUS_ACTIVE || (game.status == STATUS_WAITING && game.player1 == player_addr),
            E_NOT_READY_TO_CLAIM
        );
        assert!(game.player1 == player_addr || game.player2 == player_addr, E_NOT_PLAYER);

        // Update player's submission
        if (game.player1 == player_addr) {
            assert!(!game.player1_submitted, E_ALREADY_SUBMITTED);
            game.player1_score = score;
            game.player1_submitted = true;
            if (won) {
                game.winner = player_addr;
            };
        } else {
            assert!(!game.player2_submitted, E_ALREADY_SUBMITTED);
            game.player2_score = score;
            game.player2_submitted = true;
            if (won) {
                game.winner = player_addr;
            };
        };

        // Complete game if both players submitted OR if single-player mode (no player2)
        if ((game.player1_submitted && game.player2_submitted) || 
            (game.player1_submitted && game.player2 == @0x0)) {
            if (game.winner == @0x0) {
                // Determine winner by score
                if (game.player2 == @0x0) {
                    // Single-player: player1 always wins if they submitted
                    game.winner = game.player1;
                } else if (game.player1_score > game.player2_score) {
                    game.winner = game.player1;
                } else if (game.player2_score > game.player1_score) {
                    game.winner = game.player2;
                };
            };
            game.status = STATUS_COMPLETED;
        };
    }

    /// Claim winnings - WINNER can claim directly from escrow!
    public entry fun claim_winnings(
        winner: &signer,
        game_creator: address,
        registry_addr: address,
    ) acquires GameInfo, GameRegistry, PlayerStats {
        let winner_addr = signer::address_of(winner);
        
        assert!(exists<GameInfo>(game_creator), E_GAME_NOT_FOUND);
        let game = borrow_global_mut<GameInfo>(game_creator);
        
        assert!(game.status == STATUS_COMPLETED, E_NOT_READY_TO_CLAIM);
        assert!(game.winner == winner_addr, E_UNAUTHORIZED);

        // Calculate payout
        let total_pot = coin::value(&game.escrow);
        let platform_fee = (total_pot * PLATFORM_FEE_BPS) / BPS_DENOMINATOR;
        let payout = total_pot - platform_fee;

        // Extract coins from escrow
        let payout_coin = coin::extract(&mut game.escrow, payout);
        let fee_coin = coin::extract(&mut game.escrow, platform_fee);

        // Transfer winnings to winner
        coin::deposit(winner_addr, payout_coin);

        // Transfer platform fee to treasury
        let registry = borrow_global<GameRegistry>(registry_addr);
        coin::deposit(registry.treasury, fee_coin);

        // Update player stats
        if (exists<PlayerStats>(winner_addr)) {
            let stats = borrow_global_mut<PlayerStats>(winner_addr);
            stats.games_won = stats.games_won + 1;
            stats.total_won = stats.total_won + payout;
        };

        // Mark as claimed
        game.status = STATUS_CLAIMED;
    }

    /// Cancel game if opponent doesn't join
    public entry fun cancel_game(
        player: &signer,
    ) acquires GameInfo {
        let player_addr = signer::address_of(player);
        
        assert!(exists<GameInfo>(player_addr), E_GAME_NOT_FOUND);
        let game = borrow_global_mut<GameInfo>(player_addr);
        
        assert!(game.status == STATUS_WAITING, E_NOT_READY_TO_CLAIM);
        assert!(game.player1 == player_addr, E_UNAUTHORIZED);

        // Return stake to player1
        let refund = coin::extract_all(&mut game.escrow);
        coin::deposit(player_addr, refund);

        // Mark as completed
        game.status = STATUS_COMPLETED;
    }

    #[view]
    public fun get_game(game_creator: address): (u64, address, address, u64, u8, address, u64, u64, bool, bool) acquires GameInfo {
        if (!exists<GameInfo>(game_creator)) {
            return (0, @0x0, @0x0, 0, 0, @0x0, 0, 0, false, false)
        };
        
        let game = borrow_global<GameInfo>(game_creator);
        (
            game.game_id,
            game.player1,
            game.player2,
            game.stake_amount,
            game.status,
            game.winner,
            game.player1_score,
            game.player2_score,
            game.player1_submitted,
            game.player2_submitted
        )
    }

    #[view]
    public fun get_player_stats(player: address): (u64, u64, u64) acquires PlayerStats {
        if (!exists<PlayerStats>(player)) {
            return (0, 0, 0)
        };
        
        let stats = borrow_global<PlayerStats>(player);
        (stats.games_played, stats.games_won, stats.total_won)
    }
}
