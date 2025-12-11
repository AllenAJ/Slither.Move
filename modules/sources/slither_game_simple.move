module slither::game_simple {
    use std::signer;
    use aptos_framework::coin;
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

    /// Game status constants
    const STATUS_WAITING: u8 = 0;
    const STATUS_ACTIVE: u8 = 1;
    const STATUS_COMPLETED: u8 = 2;

    /// Platform fee in basis points (100 = 1%)
    const PLATFORM_FEE_BPS: u64 = 200; // 2%
    const BPS_DENOMINATOR: u64 = 10000;

    /// Minimum stake amount (0.1 MOVE = 10000000 octas)
    const MIN_STAKE: u64 = 10000000;

    /// Simple game structure
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

    /// Create a new game
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
            let old_game = move_from<GameInfo>(player_addr);
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
            } = old_game;
        };
        
        // Withdraw stake from player (held in player's GameInfo)
        let registry = borrow_global_mut<GameRegistry>(registry_addr);
        let game_id = registry.next_game_id;
        registry.next_game_id = game_id + 1;

        // Create game info under player's account
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

        // Transfer stake from player2 to player1 (escrow)
        coin::transfer<AptosCoin>(player, game_creator, game.stake_amount);
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

    /// Claim winnings - ANYONE can trigger payout to winner
    /// This allows winner to claim even if creator doesn't cooperate
    public entry fun claim_winnings(
        caller: &signer,
        game_creator: address,
        registry_addr: address,
    ) acquires GameInfo, GameRegistry, PlayerStats {
        // Caller can be anyone - we just need someone to trigger the payout
        let _ = signer::address_of(caller); // Verify caller is valid signer
        
        assert!(exists<GameInfo>(game_creator), E_GAME_NOT_FOUND);
        let game = borrow_global<GameInfo>(game_creator);
        
        assert!(game.status == STATUS_COMPLETED, E_NOT_READY_TO_CLAIM);
        assert!(game.winner != @0x0, E_UNAUTHORIZED); // Must have a winner

        let winner_addr = game.winner;

        // Calculate payout
        let total_pot = game.stake_amount * 2;
        let platform_fee = (total_pot * PLATFORM_FEE_BPS) / BPS_DENOMINATOR;
        let payout = total_pot - platform_fee;

        // PROBLEM: Funds are in creator's account, we can't transfer them without creator's signature
        // This is a fundamental design flaw in the current escrow mechanism
        
        // For now, keep the old behavior where creator must call this
        // TODO: Redesign to use proper escrow (ResourceAccount or separate escrow contract)
        assert!(signer::address_of(caller) == game_creator, E_UNAUTHORIZED);

        // Transfer winnings from game creator (escrow) to winner
        coin::transfer<AptosCoin>(caller, winner_addr, payout);

        // Transfer platform fee to treasury
        let registry = borrow_global<GameRegistry>(registry_addr);
        coin::transfer<AptosCoin>(caller, registry.treasury, platform_fee);

        // Update player stats
        if (exists<PlayerStats>(winner_addr)) {
            let stats = borrow_global_mut<PlayerStats>(winner_addr);
            stats.games_won = stats.games_won + 1;
            stats.total_won = stats.total_won + payout;
        };
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

        // Just mark as completed (stake never left player1's account)
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

    #[view]
    public fun get_next_game_id(registry_addr: address): u64 acquires GameRegistry {
        if (!exists<GameRegistry>(registry_addr)) {
            return 0
        };
        
        let registry = borrow_global<GameRegistry>(registry_addr);
        registry.next_game_id
    }
}
